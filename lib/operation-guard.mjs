import { createHash, randomUUID } from "node:crypto"
import { constants } from "node:fs"
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises"
import { join, relative, resolve } from "node:path"
import { createOperationGuard as createCoreOperationGuard } from "./operation-guard-core.mjs"
import { ASSESSMENT_EVIDENCE_ROOT, ASSESSMENT_RESULT_SCHEMA, loadAssessmentSpec } from "./repo-pr-assessment.mjs"

export * from "./operation-guard-core.mjs"

const LOCAL_ASSESSMENT_RUNNER_PATH = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs"
const OWNER_BASE_RECONCILIATION_PATH = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/reconcile-owner-base.mjs"
const LIFECYCLE_SCHEMA = "opencode-target-lifecycle-v1"
const SHA40 = /^[0-9a-f]{40}$/
const SHA256 = /^[0-9a-f]{64}$/
const ASSESSMENT_EXIT = Object.freeze({ PASS: 0, FAIL: 1, BLOCKED: 2, STALE: 3, INFRA_ERROR: 2, ISOLATION_BREACH: 4 })
const MAX_SUMMARY_BYTES = 1024 * 1024

function stripRtk(command) {
  return String(command ?? "").trim().replace(/^rtk\s+/, "")
}

function assessmentInvocation(command) {
  const parts = stripRtk(command).split(/\s+/)
  if (parts.length !== 3 || parts[0] !== LOCAL_ASSESSMENT_RUNNER_PATH || parts[1] !== "--spec") return undefined
  return { specPath: parts[2] }
}

function reconciliationInvocation(command) {
  const parts = stripRtk(command).split(/\s+/)
  if (
    parts.length !== 9
    || parts[0] !== OWNER_BASE_RECONCILIATION_PATH
    || parts[1] !== "--spec"
    || parts[3] !== "--expected-old-sha"
    || parts[5] !== "--expected-base-sha"
    || parts[7] !== "--expected-target-sha"
  ) return undefined
  return {
    specPath: parts[2],
    expectedOldSha: parts[4],
    expectedBaseSha: parts[6],
    expectedTargetSha: parts[8],
  }
}

function stateKey(directory) {
  return createHash("sha256").update(resolve(directory)).digest("hex")
}

function coreStatePath(stateDirectory, directory) {
  return join(resolve(stateDirectory), `${stateKey(directory)}.json`)
}

function lifecycleStatePath(stateDirectory, directory) {
  return join(resolve(stateDirectory), `${stateKey(directory)}.target-lifecycle.json`)
}

async function readJSON(path, label, { missing = undefined } = {}) {
  try {
    return JSON.parse(await readFile(path, "utf8"))
  } catch (error) {
    if (error?.code === "ENOENT") return missing
    throw new Error(`Operational schema guard: ${label} is unreadable or invalid (${error.code ?? error.message})`)
  }
}

async function readCoreAuthority(stateDirectory, directory) {
  let value
  try {
    value = await readJSON(coreStatePath(stateDirectory, directory), "workspace authority state", { missing: undefined })
  } catch {
    // The core owns corrupt-core-state recovery. Treat its authority as unavailable
    // here so the wrapper cannot mint a lifecycle capability from unreadable state.
    return undefined
  }
  if (!value) return undefined
  return {
    binding: typeof value.authorityBinding === "string" ? value.authorityBinding : undefined,
    mode: typeof value.authorityMode === "string" ? value.authorityMode : undefined,
    status: typeof value.authorityStatus === "string" ? value.authorityStatus : undefined,
    observedHead: typeof value.observedHead === "string" ? value.observedHead : undefined,
  }
}

function validateLifecycle(value) {
  if (!value) return undefined
  if (
    value.schema_version !== LIFECYCLE_SCHEMA
    || value.phase !== "owner-reconciliation"
    || !SHA40.test(value.target_sha ?? "")
    || !SHA40.test(value.base_sha ?? "")
    || !SHA40.test(value.owner_sha ?? "")
    || !SHA256.test(value.spec_sha256 ?? "")
    || typeof value.base_ref !== "string"
    || !value.base_ref
    || typeof value.assessment_id !== "string"
    || !value.assessment_id
    || typeof value.spec_path !== "string"
    || !value.spec_path
  ) throw new Error("Operational schema guard: persisted target lifecycle state is invalid; reconciliation remains fail-closed")
  return value
}

async function readLifecycle(stateDirectory, directory) {
  return validateLifecycle(await readJSON(lifecycleStatePath(stateDirectory, directory), "target lifecycle state", { missing: undefined }))
}

async function writeLifecycle(stateDirectory, directory, value) {
  const root = resolve(stateDirectory)
  await mkdir(root, { recursive: true, mode: 0o700 })
  const path = lifecycleStatePath(stateDirectory, directory)
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`
  let handle
  try {
    handle = await open(temporary, "wx", 0o600)
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8")
    await handle.sync()
    await handle.close()
    handle = undefined
    await rename(temporary, path)
  } catch (error) {
    if (handle) await handle.close().catch(() => {})
    await unlink(temporary).catch(() => {})
    throw error
  }
}

async function clearLifecycle(stateDirectory, directory) {
  await unlink(lifecycleStatePath(stateDirectory, directory)).catch((error) => {
    if (error?.code !== "ENOENT") throw error
  })
}

function inside(path, root) {
  const rel = relative(resolve(root), resolve(path))
  return rel === "" || (rel !== ".." && !rel.startsWith("../") && !rel.startsWith("..\\"))
}

async function readAssessmentSummary(path) {
  if (typeof path !== "string" || !path.endsWith(".summary.json") || !inside(path, ASSESSMENT_EVIDENCE_ROOT)) return undefined
  let handle
  try {
    handle = await open(resolve(path), constants.O_RDONLY | constants.O_NOFOLLOW)
    const info = await handle.stat()
    if (!info.isFile() || info.size < 2 || info.size > MAX_SUMMARY_BYTES) return undefined
    const bytes = await handle.readFile()
    return {
      document: JSON.parse(bytes.toString("utf8")),
      sha256: createHash("sha256").update(bytes).digest("hex"),
    }
  } catch {
    return undefined
  } finally {
    await handle?.close().catch(() => {})
  }
}

function uniqueMatch(text, expression) {
  const matches = [...String(text ?? "").matchAll(expression)]
  return matches.length === 1 ? matches[0] : undefined
}

async function assessmentEvidence(output) {
  const text = String(output?.output ?? "")
  const marker = uniqueMatch(text, /^OPERATIONAL_ASSESSMENT: schema=([^;\n]+); assessment_id=([^;\n]+); spec_sha256=([0-9a-f]{64}); base_sha=([0-9a-f]{40}); target_sha=([0-9a-f]{40}); summary_sha256=([0-9a-f]{64}); summary=([^\n]+)\s*$/gm)
  const terminal = uniqueMatch(text, /^HOST_EVIDENCE_RESULT=(PASS|FAIL|BLOCKED|STALE|INFRA_ERROR|ISOLATION_BREACH)\s*$/gm)
  const gate = uniqueMatch(text, /^GATE_DECISION=(NOT_EVALUATED)\s*$/gm)
  if (!marker || !terminal || !gate) return undefined
  const result = terminal[1]
  if (Number(output?.metadata?.exit) !== ASSESSMENT_EXIT[result]) return undefined
  const snapshot = await readAssessmentSummary(marker[7])
  const summary = snapshot?.document
  if (
    !summary
    || snapshot.sha256 !== marker[6]
    || summary.schema_version !== ASSESSMENT_RESULT_SCHEMA
    || summary.assessment_id !== marker[2]
    || summary.expected_base_sha !== marker[4]
    || summary.expected_head_sha !== marker[5]
    || summary.spec_sha256 !== marker[3]
    || summary.host_evidence_result !== result
    || summary.gate_decision !== "NOT_EVALUATED"
  ) return undefined
  return {
    schema: marker[1],
    assessmentID: marker[2],
    specSha256: marker[3],
    baseSha: marker[4],
    targetSha: marker[5],
    summarySha256: marker[6],
    summaryPath: marker[7],
    result,
    summary,
  }
}

function reconciliationEvidence(output) {
  const text = String(output?.output ?? "")
  const marker = uniqueMatch(text, /^OPERATIONAL_OWNER_RECONCILIATION: PASS; schema=([^;\n]+); assessment_id=([^;\n]+); spec_sha256=([0-9a-f]{64}); expected_old_sha=([0-9a-f]{40}); base_sha=([0-9a-f]{40}); head_sha=([0-9a-f]{40}); branch=([^;\n\s]+)\s*$/gm)
  const result = uniqueMatch(text, /^OWNER_BASE_RECONCILIATION_RESULT=(PASS)\s*$/gm)
  if (!marker || !result || Number(output?.metadata?.exit) !== 0) return undefined
  return {
    schema: marker[1],
    assessmentID: marker[2],
    specSha256: marker[3],
    expectedOldSha: marker[4],
    baseSha: marker[5],
    targetSha: marker[6],
    branch: marker[7],
  }
}

function assessmentMatchesPending(evidence, pending, authority) {
  return Boolean(
    evidence
    && authority?.mode === "target"
    && authority.binding === pending.targetSha
    && evidence.schema === ASSESSMENT_RESULT_SCHEMA
    && evidence.assessmentID === pending.assessmentID
    && evidence.specSha256 === pending.specSha256
    && evidence.baseSha === pending.baseSha
    && evidence.targetSha === pending.targetSha
  )
}

function ownerBaseStaleOwnerSha(evidence, pending, authority) {
  const summary = evidence?.summary
  const ownerInitial = summary?.owner_initial
  const ownerFinal = summary?.owner_final
  const ownerSha = ownerInitial?.head
  const observedHead = authority?.observedHead
  if (!SHA40.test(ownerSha ?? "")) return undefined
  if (SHA40.test(observedHead ?? "") && observedHead !== ownerSha) return undefined
  const expectedError = `repo-pr-assessment: repository-owned owner checkout is ${ownerSha}, not pinned base authority ${pending.baseSha}`
  return Boolean(
    evidence?.result === "STALE"
    && pending.reconcilable
    && summary?.runner_execution === "repository-owned"
    && summary?.runner_authority === "base"
    && summary?.base_ref === pending.baseRef
    && ownerInitial?.branch === pending.baseRef
    && ownerInitial?.status === ""
    && ownerFinal?.head === ownerSha
    && ownerFinal?.branch === ownerInitial.branch
    && ownerFinal?.status === ownerInitial.status
    && summary?.observed_base_sha === pending.baseSha
    && summary?.observed_head_sha === pending.targetSha
    && summary?.error === expectedError
  ) ? ownerSha : undefined
}

function reconciliationMatchesPending(evidence, pending, authority, lifecycle) {
  return Boolean(
    evidence
    && authority?.mode === "target"
    && authority.binding === pending.targetSha
    && lifecycle
    && lifecycle.target_sha === pending.targetSha
    && lifecycle.base_sha === pending.baseSha
    && lifecycle.base_ref === pending.baseRef
    && lifecycle.owner_sha === pending.expectedOldSha
    && lifecycle.spec_sha256 === pending.specSha256
    && lifecycle.assessment_id === pending.assessmentID
    && lifecycle.spec_path === pending.specPath
    && evidence.schema === "opencode-owner-base-reconciliation-v1"
    && evidence.assessmentID === pending.assessmentID
    && evidence.specSha256 === pending.specSha256
    && evidence.expectedOldSha === pending.expectedOldSha
    && evidence.baseSha === pending.baseSha
    && evidence.targetSha === pending.targetSha
    && evidence.branch === pending.baseRef
  )
}

function sanitizedAssessmentOutput(output) {
  return {
    ...output,
    output: String(output?.output ?? "").replace(/^HOST_EVIDENCE_RESULT=/gm, "UNTRUSTED_HOST_EVIDENCE_RESULT="),
  }
}

function sanitizedReconciliationOutput(output) {
  return {
    ...output,
    output: String(output?.output ?? "").replace(/^OWNER_BASE_RECONCILIATION_RESULT=/gm, "UNTRUSTED_OWNER_BASE_RECONCILIATION_RESULT="),
  }
}

function appendLifecycleNotice(output, notice) {
  if (!output) return
  const text = String(output.output ?? "")
  output.output = `${text}${text && !text.endsWith("\n") ? "\n" : ""}${notice}`
}

function headChangingGit(command) {
  const normalized = stripRtk(command)
  return /^git\s+(?:(?:-C\s+\S+\s+)?)(?:checkout|switch|merge|rebase|reset|commit|cherry-pick|pull|revert|am|worktree\s+add)\b/.test(normalized)
}

export function createOperationGuard(options = {}) {
  const core = createCoreOperationGuard(options)
  const stateDirectory = options.stateDirectory
  const directory = options.directory ?? process.cwd()
  if (!stateDirectory) return core

  const pendingAssessments = new Map()
  const pendingReconciliations = new Map()
  const key = (input) => `${String(input?.sessionID ?? "")}\0${String(input?.callID ?? "")}`

  return {
    ...core,

    "chat.message": async (input, output) => {
      await core["chat.message"]?.(input, output)
      const authority = await readCoreAuthority(stateDirectory, directory)
      const lifecycle = await readLifecycle(stateDirectory, directory)
      if (lifecycle && (authority?.mode !== "target" || authority.binding !== lifecycle.target_sha)) {
        await clearLifecycle(stateDirectory, directory)
      }
    },

    "tool.execute.before": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase()
      const command = tool === "bash" || tool === "shell" ? String(output?.args?.command ?? "") : ""
      const assessment = assessmentInvocation(command)
      const reconciliation = reconciliationInvocation(command)
      const authority = command ? await readCoreAuthority(stateDirectory, directory) : undefined
      const lifecycle = command ? await readLifecycle(stateDirectory, directory) : undefined

      if (lifecycle && authority?.mode === "target" && authority.binding === lifecycle.target_sha && headChangingGit(command) && !reconciliation) {
        throw new Error(`Operational schema guard: target ${lifecycle.target_sha} is in OWNER_RECONCILIATION. Owner HEAD movement is restricted to the exact authenticated reconcile-owner-base.mjs capability until that lifecycle is consumed or target authority changes.`)
      }

      if (assessment && authority?.mode === "target" && authority.binding) {
        if (lifecycle?.target_sha === authority.binding) {
          throw new Error(`Operational schema guard: target ${authority.binding} already has an authenticated owner-base STALE assessment awaiting exact reconciliation; complete that reconciliation or declare a different exact target.`)
        }
        const loaded = await loadAssessmentSpec(assessment.specPath).catch((error) => {
          throw new Error(`Operational schema guard: target assessment spec preflight failed (${error.message})`)
        })
        if (loaded.spec.repository.headSha !== authority.binding) {
          throw new Error(`Operational schema guard: assessment spec target ${loaded.spec.repository.headSha} does not match persisted exact-head target ${authority.binding}.`)
        }
        pendingAssessments.set(key(input), {
          specPath: assessment.specPath,
          specSha256: loaded.sha256,
          assessmentID: loaded.spec.assessmentID,
          baseRef: loaded.spec.repository.baseRef,
          baseSha: loaded.spec.repository.baseSha,
          targetSha: loaded.spec.repository.headSha,
          reconcilable: loaded.spec.runner.execution === "repository-owned" && loaded.spec.runner.authority === "base",
        })
      }

      if (reconciliation) {
        if (authority?.mode !== "target" || !authority.binding) {
          throw new Error("Operational schema guard: owner-base reconciliation requires a persisted exact-head target authority.")
        }
        if (!lifecycle || lifecycle.target_sha !== authority.binding) {
          throw new Error("Operational schema guard: owner-base reconciliation is not admitted by a generic target mismatch or arbitrary STALE result; the same exact repository-owned/base-authority assessment must first prove the clean-owner-behind-base STALE condition.")
        }
        const loaded = await loadAssessmentSpec(reconciliation.specPath).catch((error) => {
          throw new Error(`Operational schema guard: reconciliation spec preflight failed (${error.message})`)
        })
        if (
          reconciliation.specPath !== lifecycle.spec_path
          || loaded.sha256 !== lifecycle.spec_sha256
          || loaded.spec.assessmentID !== lifecycle.assessment_id
          || loaded.spec.repository.baseRef !== lifecycle.base_ref
          || loaded.spec.repository.baseSha !== lifecycle.base_sha
          || loaded.spec.repository.headSha !== lifecycle.target_sha
          || loaded.spec.runner.execution !== "repository-owned"
          || loaded.spec.runner.authority !== "base"
          || reconciliation.expectedOldSha !== lifecycle.owner_sha
          || reconciliation.expectedBaseSha !== lifecycle.base_sha
          || reconciliation.expectedTargetSha !== lifecycle.target_sha
        ) {
          throw new Error("Operational schema guard: owner-base reconciliation does not match the authenticated STALE assessment identity, spec bytes, owner SHA, base ref/SHA, and persisted target.")
        }
        if (SHA40.test(authority.observedHead ?? "") && reconciliation.expectedOldSha !== authority.observedHead) {
          throw new Error(`Operational schema guard: reconciliation old-owner SHA ${reconciliation.expectedOldSha} does not match the currently proven owner HEAD ${authority.observedHead}. Re-prove the owner HEAD before retrying.`)
        }
        pendingReconciliations.set(key(input), {
          specPath: reconciliation.specPath,
          specSha256: loaded.sha256,
          assessmentID: loaded.spec.assessmentID,
          expectedOldSha: reconciliation.expectedOldSha,
          baseRef: loaded.spec.repository.baseRef,
          baseSha: reconciliation.expectedBaseSha,
          targetSha: reconciliation.expectedTargetSha,
        })
      }

      try {
        await core["tool.execute.before"]?.(input, output)
      } catch (error) {
        if (command && /reconcile-owner-base\.mjs/.test(String(error?.message ?? "")) && !lifecycle) {
          error.message = `${error.message} Owner-base reconciliation remains blocked until the same exact target assessment proves the clean-owner-behind-base STALE condition.`
        }
        throw error
      }
    },

    "tool.execute.after": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase()
      const command = tool === "bash" || tool === "shell" ? String(input?.args?.command ?? "") : ""
      const assessment = assessmentInvocation(command)
      const reconciliation = reconciliationInvocation(command)

      if (assessment) {
        const pending = pendingAssessments.get(key(input))
        pendingAssessments.delete(key(input))
        if (!pending) {
          const authority = await readCoreAuthority(stateDirectory, directory)
          if (authority?.mode === "target" && authority.binding) {
            const sanitized = sanitizedAssessmentOutput(output)
            await core["tool.execute.after"]?.(input, sanitized)
            if (output) {
              output.output = String(sanitized.output ?? "").replace(/^UNTRUSTED_HOST_EVIDENCE_RESULT=/gm, "HOST_EVIDENCE_RESULT=")
            }
            appendLifecycleNotice(output, `OPERATIONAL_TARGET_LIFECYCLE: REJECTED assessment terminal without matching admitted before-state; target=${authority.binding}; target remains bound`)
            return
          }
        }
        if (pending) {
          const authority = await readCoreAuthority(stateDirectory, directory)
          const evidence = await assessmentEvidence(output)
          if (!assessmentMatchesPending(evidence, pending, authority)) {
            const original = String(output?.output ?? "")
            const sanitized = sanitizedAssessmentOutput(output)
            await core["tool.execute.after"]?.(input, sanitized)
            if (output) output.output = original
            appendLifecycleNotice(output, `OPERATIONAL_TARGET_LIFECYCLE: REJECTED unauthenticated assessment terminal evidence; target=${pending.targetSha}; target remains bound`)
            return
          }

          const staleOwnerSha = evidence.result === "STALE" ? ownerBaseStaleOwnerSha(evidence, pending, authority) : undefined
          if (evidence.result === "STALE" && !staleOwnerSha) {
            const sanitized = sanitizedAssessmentOutput(output)
            await core["tool.execute.after"]?.(input, sanitized)
            if (output) {
              output.output = String(sanitized.output ?? "").replace(/^UNTRUSTED_HOST_EVIDENCE_RESULT=/gm, "HOST_EVIDENCE_RESULT=")
            }
            await clearLifecycle(stateDirectory, directory)
            appendLifecycleNotice(output, `OPERATIONAL_TARGET_LIFECYCLE: ASSESSMENT_TERMINAL -> TARGET_BOUND; result=STALE; reconciliation=not-admitted; target=${pending.targetSha}`)
            return
          }

          await core["tool.execute.after"]?.(input, output)
          if (evidence.result === "STALE") {
            await writeLifecycle(stateDirectory, directory, {
              schema_version: LIFECYCLE_SCHEMA,
              phase: "owner-reconciliation",
              target_sha: pending.targetSha,
              base_ref: pending.baseRef,
              base_sha: pending.baseSha,
              owner_sha: staleOwnerSha,
              spec_sha256: pending.specSha256,
              assessment_id: pending.assessmentID,
              spec_path: pending.specPath,
            })
            appendLifecycleNotice(output, `OPERATIONAL_TARGET_RECONCILIATION: admitted; target=${pending.targetSha}; base=${pending.baseSha}; owner=${staleOwnerSha}; spec_sha256=${pending.specSha256}`)
          } else {
            await clearLifecycle(stateDirectory, directory)
          }
          return
        }
      }

      if (reconciliation) {
        const pending = pendingReconciliations.get(key(input))
        pendingReconciliations.delete(key(input))
        if (!pending) {
          const authority = await readCoreAuthority(stateDirectory, directory)
          if (authority?.mode === "target" && authority.binding) {
            const sanitized = sanitizedReconciliationOutput(output)
            await core["tool.execute.after"]?.(input, sanitized)
            if (output) {
              output.output = String(sanitized.output ?? "").replace(/^UNTRUSTED_OWNER_BASE_RECONCILIATION_RESULT=/gm, "OWNER_BASE_RECONCILIATION_RESULT=")
            }
            appendLifecycleNotice(output, `OPERATIONAL_TARGET_LIFECYCLE: REJECTED reconciliation result without matching admitted before-state; target=${authority.binding}; target remains bound`)
            return
          }
        }
        if (pending) {
          const authority = await readCoreAuthority(stateDirectory, directory)
          const lifecycle = await readLifecycle(stateDirectory, directory)
          const evidence = reconciliationEvidence(output)
          if (!reconciliationMatchesPending(evidence, pending, authority, lifecycle)) {
            const original = String(output?.output ?? "")
            const sanitized = sanitizedReconciliationOutput(output)
            await core["tool.execute.after"]?.(input, sanitized)
            if (output) output.output = original
            appendLifecycleNotice(output, `OPERATIONAL_TARGET_LIFECYCLE: REJECTED unauthenticated reconciliation success evidence; target=${pending.targetSha}; target remains bound`)
            return
          }

          await core["tool.execute.after"]?.(input, output)
          await clearLifecycle(stateDirectory, directory)
          return
        }
      }

      await core["tool.execute.after"]?.(input, output)
      if (command) {
        const authority = await readCoreAuthority(stateDirectory, directory).catch(() => undefined)
        const lifecycle = await readLifecycle(stateDirectory, directory).catch(() => undefined)
        if (authority?.mode === "target" && authority.binding && !lifecycle && /OPERATIONAL_AUTHORITY:\s*mismatch/.test(String(output?.output ?? ""))) {
          appendLifecycleNotice(output, "OPERATIONAL_TARGET_LIFECYCLE: owner-base reconciliation is not yet admitted; run the exact target assessment first and use the helper only after authenticated evidence proves the clean-owner-behind-pinned-base STALE condition")
        }
      }
    },

    "experimental.session.compacting": async (input, output) => {
      await core["experimental.session.compacting"]?.(input, output)
      const lifecycle = await readLifecycle(stateDirectory, directory).catch(() => undefined)
      if (lifecycle) {
        output.context.push(`Target lifecycle: OWNER_RECONCILIATION; target=${lifecycle.target_sha}; base_ref=${lifecycle.base_ref}; base=${lifecycle.base_sha}; owner=${lifecycle.owner_sha}; assessment_id=${lifecycle.assessment_id}; spec_sha256=${lifecycle.spec_sha256}.`)
      }
    },

    dispose: async () => {
      pendingAssessments.clear()
      pendingReconciliations.clear()
      await core.dispose?.()
    },
  }
}
