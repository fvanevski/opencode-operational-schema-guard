/** Produce source-backed Graphiti nominations from successful local V2 reads.
 * This is only a nomination. The gate independently attests the Git record
 * under its configured source authority and decides whether to admit work.
 */
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { readFile, realpath, stat } from "node:fs/promises"
import { isAbsolute, relative, sep } from "node:path"

const exec = promisify(execFile)
const LIMIT = 65536
const NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const BRANCH = /^refs\/heads\/[A-Za-z0-9_./-]+$/
const HASH = /^[a-f0-9]{40}$/
const FORBIDDEN = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\bsk-[A-Za-z0-9]{16,}|\bgh[pousr]_[A-Za-z0-9]{20,}|Bearer\s+\S+|password\s*[:=])/i
const valid = (s) => typeof s === "string" && s.length > 0 && s.length <= 256
const shape = (x, keys) => x && typeof x === "object" && !Array.isArray(x) &&
  Object.keys(x).every((key) => keys.includes(key))
const within = (path, root) => path !== root &&
  !relative(root, path).startsWith(".." + sep) &&
  relative(root, path) !== ".." && !isAbsolute(relative(root, path))

async function git(repo, ...args) {
  const { stdout } = await exec("git", ["-c", "core.hooksPath=/dev/null", "-C", repo, ...args],
    { timeout: 2000, maxBuffer: LIMIT + 1024, encoding: "buffer", windowsHide: true })
  if (stdout.length > LIMIT) throw Error("oversized Git record")
  return stdout
}

/** Strictly sourced from the operator's existing Git policy; no agent-provided
 * repo, group, category or source content is accepted as authority.
 */
export async function proposalFromCompletedRead(event, {
  workspaceID, capturePolicy, sourcePolicyPath, now = () => new Date(), gitReader = git,
} = {}) {
  if (event?.tool !== "read" || event.status !== "completed" || !valid(event.sessionID) ||
      !valid(event.messageID) || !valid(event.id) || !capturePolicy?.enabled ||
      !capturePolicy.tools?.includes("read") || !capturePolicy.workspaces?.includes(workspaceID)) return null
  const input = event.input
  const display = event.result?.metadata?.display
  if (!shape(input, ["filePath", "offset", "limit"]) || !isAbsolute(input.filePath ?? "") ||
      (input.offset !== undefined && input.offset !== 1) || input.limit !== undefined ||
      display?.type !== "file" || display?.truncated !== false ||
      display.path !== input.filePath || event.result?.metadata?.truncated !== false ||
      !isAbsolute(sourcePolicyPath ?? "")) return null
  try {
    const source = JSON.parse(await readFile(sourcePolicyPath, "utf8"))
    if (source.enabled !== true || source.source_type !== "git-record-v1" ||
        source.production_activation !== true ||
        !Array.isArray(source.groups) || source.groups.length !== 1 ||
        !NAME.test(source.groups[0]) || !capturePolicy.groups.includes(source.groups[0]) ||
        !Array.isArray(source.categories) || !Array.isArray(source.workspaces) ||
        !source.workspaces.includes(workspaceID) || !isAbsolute(source.repository ?? "") ||
        !BRANCH.test(source.trusted_ref) ||
        !source.trusted_ref.split("/").slice(2).every(s => s && s !== "." && s !== "..") ||
        typeof source.source_prefix !== "string" ||
        !/^[A-Za-z0-9_./-]+$/.test(source.source_prefix) ||
        !source.source_prefix.split("/").every(s => s && s !== "." && s !== "..")) return null
    const root = await realpath(source.repository)
    if (root !== source.repository || root !== workspaceID) return null
    const path = await realpath(input.filePath)
    if (path !== input.filePath || !within(path, root)) return null
    const rel = relative(root, path).split(sep).join("/")
    if (!rel.startsWith(source.source_prefix + "/") || !rel.endsWith(".json") ||
        /(?:^|\/)(?:tests?|fixtures?)(?:\/|$)/i.test(rel)) return null
    const info = await stat(path)
    if (!info.isFile() || info.size < 1 || info.size > LIMIT) return null
    const sha = (await gitReader(root, "rev-parse", "--verify",
      source.trusted_ref + "^{commit}")).toString().trim()
    if (!HASH.test(sha)) return null
    const pinned = await gitReader(root, "show", sha + ":" + rel)
    if (pinned.length !== info.size || !pinned.equals(await readFile(path))) return null
    const record = JSON.parse(pinned.toString("utf8"))
    const fields = ["schema_version","workspace_id","group_id","category","episode_body","reference_time"]
    const exclusive = record?.category === "exclusive_state_transition"
    if (!shape(record, exclusive ? [...fields, "transition_contract"] : fields) ||
        record.schema_version !== 1 || record.workspace_id !== workspaceID ||
        record.group_id !== source.groups[0] ||
        !source.categories.includes(record.category) || !capturePolicy.categories.includes(record.category) ||
        typeof record.episode_body !== "string" || !record.episode_body.trim() ||
        Buffer.byteLength(record.episode_body) > LIMIT || FORBIDDEN.test(record.episode_body) ||
        !Number.isFinite(Date.parse(record.reference_time)) ||
        !/(?:Z|[+-]\d\d:\d\d)$/.test(record.reference_time)) return null
    const proposal = { group_id: source.groups[0], category: record.category,
      fact_ref: "git:" + sha + ":" + rel, observed_at: now().toISOString() }
    if (exclusive) {
      const contract = record.transition_contract
      if (!shape(contract, ["group_id","subject","predicate","transition"]) ||
          contract.group_id !== record.group_id ||
          !shape(contract.transition, ["from","to","effective_at"]) ||
          ![contract.subject,contract.predicate,contract.transition.from,contract.transition.to].every(valid) ||
          contract.transition.from === contract.transition.to ||
          !Number.isFinite(Date.parse(contract.transition.effective_at))) return null
      proposal.transition = {
        subject_ref: contract.subject, predicate: contract.predicate,
        outgoing_state_ref: contract.transition.from,
        incoming_state_ref: contract.transition.to,
        effective_at: contract.transition.effective_at,
      }
      proposal.effective_at = contract.transition.effective_at
    }
    return proposal
  } catch { return null }
}

/** Correlate actual execute.before/after identity. Git inspection and enqueue
 * happen in a bounded background task, never on the interactive hook path.
 */
export function createReadSourceProducer({ workspaceID, capturePolicyPath,
  sourcePolicyPath, observer, policyLoader, makeProposal = proposalFromCompletedRead,
  maxPending = 8 } = {}) {
  const started = new Map()
  const pending = new Set()
  const stats = { deferred: 0, failed: 0 }
  const key = event => JSON.stringify([event?.sessionID,event?.id])
  const before = event => {
    if (event?.tool !== "read" || !valid(event.sessionID) ||
        !valid(event.messageID) || !valid(event.id)) return
    started.set(key(event), { messageID:event.messageID, path:event.input?.filePath })
    if (started.size > 1024) { started.delete(started.keys().next().value); stats.deferred++ }
  }
  const after = event => {
    const prior = started.get(key(event))
    started.delete(key(event))
    if (!prior || event?.tool !== "read" || event.status !== "completed" ||
        prior.messageID !== event.messageID || prior.path !== event.input?.filePath) return
    if (pending.size >= Math.max(1, Math.min(64, maxPending))) { stats.deferred++; return }
    const task = Promise.resolve().then(async () => {
      const policy = policyLoader(capturePolicyPath)
      if (!policy) return
      const proposal = await makeProposal(event, { workspaceID,
        capturePolicy:policy, sourcePolicyPath })
      if (proposal) await observer.fromCompletedHook(event, proposal)
    }).catch(() => { stats.failed++ }).finally(() => pending.delete(task))
    pending.add(task)
  }
  return { before, after, flush:() => Promise.allSettled([...pending]),
    status:() => ({ ...stats, pending:pending.size, started:started.size }) }
}
