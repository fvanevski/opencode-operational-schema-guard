import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

const schema = JSON.parse(readFileSync(new URL("./memory-candidate-v1.schema.json", import.meta.url), "utf8"))
const categories = new Set(schema.properties.category.enum)
const forbidden = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk-[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|Bearer\s+\S+|password\s*[:=])|\bfixtures?\/|\btests?\/|\.(?:log|trace)\b)/i
const hex = /^[0-9a-f]{64}$/
const id = (x, max = 256) => typeof x === "string" && x.length > 0 && x.length <= max
const timestamp = (x) => typeof x === "string" && !Number.isNaN(Date.parse(x)) && /(?:Z|[+-]\d\d:\d\d)$/.test(x)
const exact = (x, keys) => x && typeof x === "object" && !Array.isArray(x) && Object.keys(x).every((key) => keys.includes(key))
const canonical = (x) => Array.isArray(x) ? x.map(canonical) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, canonical(x[key])])) : x
const hash = (value) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")
const digest = (...parts) => hash(parts)

export function validateCandidate(x) {
  if (!exact(x, Object.keys(schema.properties))) return false
  if (x.schema_version !== 1 || !hex.test(x.event_id) || !categories.has(x.category)) return false
  if (!exact(x.source, Object.keys(schema.properties.source.properties)) || x.source.system !== "opencode-v2" || !id(x.source.session_id) || !id(x.source.event_id)) return false
  if (x.source.message_id !== undefined && !id(x.source.message_id)) return false
  if (x.source.tool_event_id !== undefined && !id(x.source.tool_event_id)) return false
  if (x.source.cursor_id !== undefined && !id(x.source.cursor_id)) return false
  if (!exact(x.scope, ["workspace_id", "group_id"]) || !id(x.scope.workspace_id) || !id(x.scope.group_id)) return false
  if (!timestamp(x.observed_at) || (x.effective_at !== undefined && !timestamp(x.effective_at))) return false
  if (!exact(x.authority, ["basis", "confidence", "evidence_ref"]) || !schema.properties.authority.properties.basis.enum.includes(x.authority.basis) || !Number.isFinite(x.authority.confidence) || x.authority.confidence < 0 || x.authority.confidence > 1) return false
  if (x.authority.evidence_ref !== undefined && (!id(x.authority.evidence_ref, 512) || !/^[-\w./:@]+$/.test(x.authority.evidence_ref))) return false
  if (!id(x.policy_revision, 128) || !schema.properties.destination.enum.includes(x.destination) || !id(x.fact_ref, 512)) return false
  if (x.logical_digest !== undefined && !hex.test(x.logical_digest)) return false
  if (x.category === "exclusive_state_transition") {
    const t = x.transition
    if (!exact(t, Object.keys(schema.properties.transition.properties)) || !t || ![t.subject_ref, t.predicate, t.outgoing_state_ref, t.incoming_state_ref].every((v) => id(v)) || !timestamp(t.effective_at)) return false
  } else if (x.transition !== undefined) return false
  return !forbidden.test(JSON.stringify(x))
}

export function loadCapturePolicy(path) {
  if (!path) return null
  try {
    const policy = JSON.parse(readFileSync(path, "utf8"))
    if (policy.enabled !== true || !id(policy.revision, 128) || !Array.isArray(policy.workspaces) || !Array.isArray(policy.groups) || !Array.isArray(policy.categories) || !Array.isArray(policy.tools)) return null
    if (![policy.workspaces, policy.groups, policy.categories, policy.tools].every((items) => items.length > 0 && items.length <= 64 && items.every((item) => id(item)))) return null
    return policy
  } catch { return null }
}

// Only structured metadata from an operator-allowlisted completed tool is considered.
// No transcript, tool body, model proposal, or compaction context is parsed.
export function candidateFromToolEvent(event, policy, workspaceID) {
  if (!policy?.enabled || event?.type !== "session.tool.success" || event.data?.executed !== true) return null
  const data = event.data
  if (!id(workspaceID) || !policy.workspaces.includes(workspaceID) || !policy.tools.includes(data.name)) return null
  const proposal = data.metadata?.memory_candidate_v1
  if (!proposal || typeof proposal !== "object") return null
  if (!policy.groups.includes(proposal.group_id) || !policy.categories.includes(proposal.category)) return null
  if (!id(data.sessionID) || !id(data.assistantMessageID) || !id(data.id)) return null
  // A tool result can nominate an opaque fact reference, but cannot choose its
  // own source event identity. Native tool completion authenticates execution,
  // not the truth of metadata. No V2 fact-attestation interface is available.
  const source = { system: "opencode-v2", session_id: data.sessionID, message_id: data.assistantMessageID, tool_event_id: data.id, event_id: data.id, cursor_id: data.assistantMessageID }
  const factRef = proposal.fact_ref
  if (!id(factRef, 512) || !/^[-\w./:@]+$/.test(factRef)) return null
  const candidate = {
    schema_version: 1,
    event_id: digest("memory-source-event-v1", workspaceID, source.system, source.session_id, source.event_id),
    source,
    scope: { workspace_id: workspaceID, group_id: proposal.group_id },
    observed_at: proposal.observed_at,
    category: proposal.category,
    authority: { basis: "agent_candidate", confidence: 0 },
    policy_revision: policy.revision,
    destination: "graphiti",
    fact_ref: factRef,
  }
  // All proposed times and transitions remain unverified; the gate defers them.
  if (proposal.effective_at !== undefined) candidate.effective_at = proposal.effective_at
  if (proposal.transition !== undefined) candidate.transition = proposal.transition
  candidate.logical_digest = hash(candidate)
  return validateCandidate(candidate) ? candidate : null
}

export async function enqueueCandidate(candidate, { url, token, timeoutMs = 200 }) {
  if (!validateCandidate(candidate) || !id(token, 4096) || !/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) return false
  try {
    const result = await fetch(`${url}/__commit_gate/memory_candidates`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(candidate), signal: AbortSignal.timeout(timeoutMs),
    })
    return result.status === 202
  } catch { return false }
}

// Optional delivery is bounded and independent of the baseline subscription.
// Interruption, queue overflow, timeout or missing Called loses/defer this proposal;
// no exactly-once delivery claim is made. Replays retain source identity.
export function createCaptureObserver({ workspaceID, policyPath, url, token, policyLoader = loadCapturePolicy, enqueue = enqueueCandidate, maxPending = 8, timeoutMs = 200 }) {
  const calls = new Map()
  const pending = new Map()
  const stats = { deferred: 0, failed: 0 }
  const observe = async (event) => {
    try {
      const data = event?.data
      if (!id(data?.sessionID) || !id(data.id)) return null
      const key = JSON.stringify([data.sessionID, data.id])
      if (event.type === "session.tool.input.started" || event.type === "session.tool.called") {
        // OpenCode 2.2.5 delivers the tool name on session.tool.input.started;
        // a future version may also repeat it on session.tool.called. Record
        // the trusted name when present; without it the allowlist cannot be
        // applied and the nomination fails closed.
        const toolName = typeof data.name === "string" ? data.name : ""
        if (toolName && id(toolName)) {
          calls.set(key, toolName)
          if (calls.size > 1024) { calls.delete(calls.keys().next().value); stats.deferred++ }
        }
        return null
      }
      if (event.type !== "session.tool.success" && event.type !== "session.tool.failed") return null
      const name = calls.get(key)
      calls.delete(key)
      if (event.type !== "session.tool.success" || !name) return null
      const candidate = candidateFromToolEvent({ ...event, data: { ...data, name } }, policyLoader(policyPath), workspaceID)
      if (!candidate) return null
      if (pending.has(candidate.event_id)) return candidate.event_id
      if (pending.size >= Math.max(1, Math.min(64, maxPending))) { stats.deferred++; return null }
      // enqueueCandidate aborts its actual network operation on timeout. Do not
      // release a slot until the operation settles, including injected senders.
      const task = Promise.resolve().then(() => enqueue(candidate, { url, token, timeoutMs }))
        .then((ok) => { if (!ok) stats.failed++ }, () => { stats.failed++ })
        .finally(() => pending.delete(candidate.event_id))
      pending.set(candidate.event_id, task)
      return candidate.event_id
    } catch { stats.failed++; return null }
  }
  // Tests/owners may drain explicitly; the event loop never awaits this.
  observe.flush = () => Promise.allSettled([...pending.values()])
  observe.status = () => ({ ...stats, pending: pending.size, calls: calls.size })
  return observe
}
