import { createHash, randomUUID } from "node:crypto"
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises"
import { join, relative, resolve } from "node:path"
import { derivePrimaryContextPolicy } from "./context-policy.mjs"
import { DEFAULT_POLICY, EVIDENCE_ASSESSMENT_PATH, SCHEMA_VERSION } from "./policy-spec.mjs"
import {
  TODOWRITE_LEDGER_CONTRACT,
  TODO_LEDGER_SENTINEL,
  normalizeTodos,
  fingerprintTodos,
  nonterminalCount,
  renderReminder,
} from "./todo-ledger.mjs"

export { DEFAULT_POLICY, EVIDENCE_ASSESSMENT_PATH, SCHEMA_VERSION }

const PRIMARY_AGENTS = new Set(["plan", "build", "review", "research"])
const CHILD_AGENTS = new Set(["explore", "verify", "fresh-review"])
const EDIT_TOOLS = new Set(["edit", "write", "apply_patch", "multiedit"])
const INTERACTIVE_TOOLS = new Set(["question", "ask_question"])
const HEAD_CHANGING_GIT_SUBCOMMANDS = new Set(["checkout", "switch", "merge", "rebase", "reset", "commit", "cherry-pick", "pull", "revert", "am"])
const STAGING_DIRECTORY_PREFIX = /^\/tmp\/opencode\/(?:verify|review)\b/i
const STAGING_SHELL_COMMAND = /^(?:rtk\s+)?(?:mkdir(?:\s+-[A-Za-z0-9]+)*\s+[^\n]*\/tmp\/opencode\/|cp(?:\s+-[A-Za-z0-9]+)*\s+[^\n]*\/tmp\/opencode\/|rsync(?:\s+-[A-Za-z0-9]+)*\s+[^\n]*\/tmp\/opencode\/|git\s+worktree\s+(?:add|list|prune|remove)\b|git\s+switch\b|git\s+checkout\b)/i

function isStagingInvocation(tool, args, directory) {
  if (tool !== "bash" && tool !== "shell") return false
  const workdir = args?.workdir ? resolve(directory, args.workdir) : undefined
  if (workdir && STAGING_DIRECTORY_PREFIX.test(workdir)) return true
  const command = String(args?.command ?? "").trim()
  return STAGING_SHELL_COMMAND.test(command)
}
const NATIVE_RECON_TOOLS = new Set(["read", "grep", "glob"])
const HIGH_RISK_PATH = /(?:^|\/)(?:auth|security|permission|lifecycle|transaction|migration|provenance|terminal|release|deploy|config)(?:[._/-]|$)/i
const TEST_OR_DOC_PATH = /(?:^|\/)(?:tests?|docs?|fixtures?|examples?)(?:\/|$)|(?:\.md$|\.rst$|\.txt$)/i
const PATH_TOKEN = /(?:^|[\s`'"(])((?:\.{0,2}\/|\/)?(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_*?.-]*[A-Za-z0-9_*?-])(?=$|[\s`'"),:.!?;])/gm
const COMMON_PATH_ROOT = /^(?:src|test|tests|lib|scripts|docs|references|packages|schemas|examples|fixtures|\.github|\.venv[^/]*)$/i
const DISCOVERY_SIGNAL = /\b(?:unknown|trace|flow|call path|dependenc(?:y|ies)|reference(?:s|d)?|ownership|architecture|subsystem|cross-cutting|bug|issue|inspect|check|verify)\b/i
const SHELL_RECON_COMMAND = /^(?:rtk\s+)?(?:rg|grep|find|fd|cat|sed|head|tail|git\s+(?:grep|show|ls-files))\b/i
const SHELL_STATUS_PROBE = /^(?:rtk\s+)?(?:echo|printf)\b[^\n]*(?:\$\?|\b(?:exit[_ -]?(?:code|status)|status[_ -]?code)\b)/i
const AUTHORITY_LABEL = /(HEAD_SHA|EXPECTED_HEAD_SHA|EXPECTED_START_HEAD|REQUIRED_START_HEAD_SHA|AUTHORITATIVE_HEAD_SHA|FINAL_HEAD_SHA|PR_HEAD_SHA|CANDIDATE_SHA|REQUIRED(?:\s+EXACT|\s+STARTING)?\s+HEAD|EXPECTED(?:\s+BRANCH|\s+STARTING)?\s+HEAD|REQUIRED\s+PR\s+HEAD)\s*(?:=|:)?\s*[`'"\s]*([0-9a-f]{40})\b/gi
const VERIFY_ROOT = "/tmp/opencode/verify"
const VERIFY_MANIFEST_ROOT = "/tmp/opencode/verify/manifests"
const VERIFY_MATERIAL_ROOT = "/tmp/opencode/verify/materials"
const VERIFY_WORKTREE_ROOT = "/tmp/opencode/verify/worktrees"
const REVIEW_WORKTREE_ROOT = "/tmp/opencode/review/worktrees"
const TOOL_OUTPUT_ROOT = "/home/filip/.local/share/opencode/tool-output"
const VERIFY_WRAPPER_PATH = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-disposable.mjs"
const VERIFY_MANIFEST_RUNNER_PATH = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-manifest.mjs"
const LOCAL_ASSESSMENT_RUNNER_PATH = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs"
const OWNER_BASE_RECONCILIATION_PATH = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/reconcile-owner-base.mjs"
const LOCAL_ASSESSMENT_SPEC_ROOT = "/tmp/opencode/verify/assessments"
const WORKSPACE_IDENTITY_PATH = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/workspace-identity.mjs"

const TASK_EXECUTION_CONTRACTS = Object.freeze({
  verify: "Operational child contract: use one bare supported invocation per shell call, without operators, redirects, appended status probes, or wrapper substitutions. End exactly with OPERATIONAL_RESULT: PASS|FAIL|BLOCKED; COMMANDS_RUN: <n>; COMMANDS_REQUIRED: <n>.",
  "fresh-review": "Operational child contract: remain read-only and end exactly with OPERATIONAL_REVIEW: CLEAN|FINDINGS|BLOCKED; TARGETS_REVIEWED: <n>; TARGETS_REQUIRED: <n>.",
  explore: "Operational child contract: remain read-only and end exactly with OPERATIONAL_EXPLORE: COMPLETE|PARTIAL|BLOCKED; TARGETS_INSPECTED: <n>; TARGETS_REQUIRED: <n>.",
})

function emptySafetyState() {
  return {
    authorityBinding: undefined,
    authorityMode: undefined,
    authorityStatus: undefined,
    observedHead: undefined,
    admissionObservedHead: undefined,
    taskWorkspaceHead: undefined,
    taskWorkspaceHeadStatus: "unknown",
    editedPaths: new Set(),
    highRiskEdit: false,
    editGeneration: 0,
    reviewedGeneration: 0,
    verifiedGeneration: 0,
    campaignId: undefined,
    campaignBaseHead: undefined,
    campaignActive: false,
    campaignPublished: false,
  }
}

function bindSafetyState(state, safety) {
  state.safety = safety
  for (const key of ["authorityBinding", "authorityMode", "authorityStatus", "observedHead", "admissionObservedHead", "taskWorkspaceHead", "taskWorkspaceHeadStatus", "editedPaths", "highRiskEdit", "editGeneration", "reviewedGeneration", "verifiedGeneration", "campaignId", "campaignBaseHead", "campaignActive", "campaignPublished"]) {
    Object.defineProperty(state, key, {
      configurable: true,
      enumerable: true,
      get: () => safety[key],
      set: (value) => { safety[key] = value },
    })
  }
}

function serializedSafetyState(safety) {
  return {
    version: 4,
    authorityBinding: safety.authorityBinding,
    authorityMode: safety.authorityMode,
    authorityStatus: safety.authorityStatus,
    observedHead: safety.observedHead,
    admissionObservedHead: safety.admissionObservedHead,
    taskWorkspaceHead: safety.taskWorkspaceHead,
    taskWorkspaceHeadStatus: safety.taskWorkspaceHeadStatus,
    editedPaths: [...safety.editedPaths].sort(),
    highRiskEdit: Boolean(safety.highRiskEdit),
    editGeneration: Number(safety.editGeneration) || 0,
    reviewedGeneration: Number(safety.reviewedGeneration) || 0,
    verifiedGeneration: Number(safety.verifiedGeneration) || 0,
    campaignId: safety.campaignId,
    campaignBaseHead: safety.campaignBaseHead,
    campaignActive: Boolean(safety.campaignActive),
    campaignPublished: Boolean(safety.campaignPublished),
  }
}

function hydrateSafetyState(safety, persisted) {
  if (!persisted || ![1, 2, 3, 4].includes(persisted.version)) return
  safety.authorityBinding = typeof persisted.authorityBinding === "string" ? persisted.authorityBinding : undefined
  safety.authorityMode = persisted.version >= 2 && ["strict-start", "target"].includes(persisted.authorityMode) ? persisted.authorityMode : undefined
  safety.authorityStatus = persisted.version >= 2 && ["pending", "verified", "mismatch"].includes(persisted.authorityStatus)
    ? persisted.authorityStatus
    : (safety.authorityBinding ? "verified" : undefined)
  safety.observedHead = persisted.version >= 2 && typeof persisted.observedHead === "string" ? persisted.observedHead : undefined
  safety.admissionObservedHead = persisted.version >= 4 && typeof persisted.admissionObservedHead === "string"
    ? persisted.admissionObservedHead
    : (safety.authorityStatus === "verified" ? safety.observedHead : undefined)
  safety.taskWorkspaceHead = persisted.version >= 4 && typeof persisted.taskWorkspaceHead === "string" ? persisted.taskWorkspaceHead : undefined
  safety.taskWorkspaceHeadStatus = persisted.version >= 4 && persisted.taskWorkspaceHeadStatus === "proven" && safety.taskWorkspaceHead ? "proven" : "unknown"
  safety.editedPaths = new Set(Array.isArray(persisted.editedPaths) ? persisted.editedPaths.filter((path) => typeof path === "string") : [])
  safety.highRiskEdit = Boolean(persisted.highRiskEdit)
  safety.editGeneration = Number.isInteger(persisted.editGeneration) ? persisted.editGeneration : 0
  safety.reviewedGeneration = Number.isInteger(persisted.reviewedGeneration) ? persisted.reviewedGeneration : 0
  safety.verifiedGeneration = Number.isInteger(persisted.verifiedGeneration) ? persisted.verifiedGeneration : 0
  safety.campaignId = persisted.version >= 3 && typeof persisted.campaignId === "string" ? persisted.campaignId : undefined
  safety.campaignBaseHead = persisted.version >= 3 && typeof persisted.campaignBaseHead === "string" ? persisted.campaignBaseHead : safety.observedHead
  safety.campaignActive = persisted.version >= 3 ? Boolean(persisted.campaignActive) : safety.editGeneration > 0
  safety.campaignPublished = persisted.version >= 3 ? Boolean(persisted.campaignPublished) : false
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function policyFromEnv(env = process.env) {
  return {
    ...DEFAULT_POLICY,
    childToolCalls: {
      ...DEFAULT_POLICY.childToolCalls,
      explore: positiveInteger(env.OPENCODE_EXPLORE_TOOL_LIMIT, DEFAULT_POLICY.childToolCalls.explore),
    },
  }
}

export function policyFromConfig(config, env = process.env) {
  return {
    ...policyFromEnv(env),
    primaryContext: derivePrimaryContextPolicy(config),
  }
}

export function policyWithContextFailure(error, env = process.env) {
  const message = String(error?.message ?? error ?? "unknown context-policy initialization failure").trim()
  return {
    ...policyFromEnv(env),
    primaryContextError: message || "unknown context-policy initialization failure",
  }
}

function primaryContextPolicyForAgent(policy, agent) {
  const value = policy?.primaryContext?.[agent]
  return value && Number.isInteger(value.warningTokens) && Number.isInteger(value.hardLimitTokens) ? value : undefined
}

function stateFor(states, sessionID) {
  let state = states.get(sessionID)
  if (!state) {
    state = {
      agent: undefined,
      childCalls: new Set(),
      childInvocationCounts: new Map(),
      childTerminalReason: undefined,
      primaryReads: new Set(),
      primaryCallsSinceBoundary: 0,
      primaryBoundaryNoticeSent: false,
      taskPacketNotice: undefined,
      routingDebt: undefined,
      authorityChangeNotice: undefined,
      authorityAdmissionNotice: undefined,
      directValidations: 0,
      delegatedPackets: [],
      pendingTasks: new Map(),
      resumableTasks: new Map(),
      taskFailureNotice: undefined,
      observedPaths: new Set(),
      observedPathOverflow: false,
      lastAssistantFinish: undefined,
      assistantOutputByMessage: new Map(),
      lengthRecoveryPending: false,
      lastInputTokens: 0,
      contextNoticeSent: false,
      compactionRequested: false,
      childCallFingerprints: new Map(),
      childSuccessfulInvocations: new Set(),
      childCapabilityRejections: new Map(),
      childBudgetExhausted: false,
      guardEvents: [],
      advisoryNotices: [],
      todos: undefined,
      todoSource: undefined,
      todoFingerprint: undefined,
      todoReminderSkipNoted: false,
    }
    bindSafetyState(state, states.safety)
    states.set(sessionID, state)
  }
  return state
}

function countNumberedSections(prompt) {
  return (prompt.match(/^\s*(?:#{1,6}\s*)?\d+[.)]\s+/gm) ?? []).length
}

function parsePacketEnvelope(prompt) {
  const scope = prompt.match(/^Scope:\s*(.+)$/im)?.[1]?.trim()
  const stopCondition = prompt.match(/^Stop condition:\s*(.+)$/im)?.[1]?.trim()
  const lines = prompt.split(/\r?\n/)
  const questionsIndex = lines.findIndex((line) => /^Questions:\s*$/i.test(line.trim()))
  const questions = []
  if (questionsIndex >= 0) {
    for (const line of lines.slice(questionsIndex + 1)) {
      if (/^[A-Za-z][A-Za-z ]+:\s*/.test(line.trim())) break
      const match = line.match(/^\s*-\s+(.+)$/)
      if (match) questions.push(match[1].trim())
    }
  }
  const targetsIndex = lines.findIndex((line) => /^Targets:\s*$/i.test(line.trim()))
  const targets = []
  if (targetsIndex >= 0) {
    for (const line of lines.slice(targetsIndex + 1)) {
      if (/^[A-Za-z][A-Za-z -]+:\s*/.test(line.trim())) break
      const match = line.match(/^\s*-\s+(.+)$/)
      if (match) targets.push(match[1].trim())
    }
  }
  const manifests = [...String(prompt).matchAll(/^Manifest:\s*(\S+)\s*$/gim)].map((match) => match[1])
  return { scope, stopCondition, questions, targets, manifests }
}

function recordGuardEvent(state, rule, details = {}) {
  state.guardEvents.push({ rule, ...details })
  if (state.guardEvents.length > 20) state.guardEvents.shift()
}

function enqueueAdvisory(state, message, rule = "advisory", details = {}) {
  if (!state.advisoryNotices.includes(message)) state.advisoryNotices.push(message)
  const existing = state.guardEvents.find((event) => event.rule === rule && event.advisory === true)
  const observedCallCount = Number.isInteger(details.observedCallCount) ? details.observedCallCount : undefined
  if (existing) {
    existing.occurrenceCount = (Number.isInteger(existing.occurrenceCount) ? existing.occurrenceCount : 1) + 1
    if (observedCallCount !== undefined) {
      existing.firstObservedCallCount ??= observedCallCount
      existing.maxObservedCallCount = Math.max(existing.maxObservedCallCount ?? observedCallCount, observedCallCount)
    }
    if (Number.isInteger(details.threshold)) existing.threshold ??= details.threshold
    return
  }
  recordGuardEvent(state, rule, {
    advisory: true,
    occurrenceCount: 1,
    ...(observedCallCount === undefined ? {} : { firstObservedCallCount: observedCallCount, maxObservedCallCount: observedCallCount }),
    ...(Number.isInteger(details.threshold) ? { threshold: details.threshold } : {}),
  })
}

function taskScopeIdentity(type, prompt) {
  const scope = parsePacketEnvelope(String(prompt)).scope ?? ""
  const normalized = scope.toLowerCase().replace(/\s+/g, " ").trim()
  return createHash("sha256").update(`${String(type)}\0${normalized}`).digest("hex")
}

function taskIDFromFailure(value) {
  return String(value ?? "").match(/task[_ -]?id\s*:\s*([A-Za-z0-9_-]+)/i)?.[1]
}

function classifyTaskFailure(value) {
  const text = String(value ?? "")
  const deterministic = /\b(?:permission|denied|forbidden|operational schema guard|terminal retry breaker|budget|depth limit|maximum depth|unknown agent|not a valid agent|malformed|invalid|blocked|cancelled|canceled)\b/i
  const transient = /\b(?:network(?:_error)?|api connection|timed?\s*out|timeout|capacity|temporar(?:y|ily) unavailable|service unavailable|server error|overloaded|rate limit|connection (?:reset|closed|refused)|econn\w*|fetch failed|stream error|provider error|http\s*(?:408|429|500|502|503|504))\b/i
  if (deterministic.test(text)) return "deterministic"
  if (transient.test(text)) return "transient"
  return "unknown"
}

function taskFailureGuidance({ classification, taskID, task, resumed }) {
  if (classification === "transient" && taskID && !resumed) {
    return `OPERATIONAL GUARD: RESUMABLE TASK FAILURE. The failed ${task.type} child may be resumed exactly once with task_id=${taskID}, the same subagent_type, and the same one-line Scope. Do not duplicate the child's work in the parent and do not broaden or rename the Scope.`
  }
  const reason = resumed
    ? "the single bounded resume attempt is exhausted"
    : !taskID
      ? "OpenCode supplied no resumable task_id"
      : classification === "deterministic"
        ? "the failure is deterministic and must not be retried"
        : "the failure is not safely classified as transient"
  return `OPERATIONAL GUARD: TASK FAILURE IS NOT RESUMABLE (${reason}). Do not reuse task_id${taskID ? `=${taskID}` : ""}; report the blocker or create a fresh, independently justified packet only after correcting the cause.`
}

function clipped(value, limit) {
  const text = String(value ?? "").trim()
  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

function normalizeQuestionBlock(prompt, limit = 3) {
  const lines = String(prompt).split(/\r?\n/)
  const questionsIndex = lines.findIndex((line) => /^Questions:\s*$/i.test(line.trim()))
  if (questionsIndex < 0) return { prompt: String(prompt), removed: 0 }
  const questionIndexes = []
  for (let index = questionsIndex + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z][A-Za-z ]+:\s*/.test(lines[index].trim())) break
    if (/^\s*-\s+(.+)$/.test(lines[index])) questionIndexes.push(index)
  }
  if (questionIndexes.length <= limit) return { prompt: String(prompt), removed: 0 }
  const remove = new Set(questionIndexes.slice(limit))
  const removed = remove.size
  const kept = lines.filter((_, index) => !remove.has(index))
  const insertAt = kept.findIndex((line, index) => index > questionsIndex && /^Stop condition:\s*/i.test(line.trim()))
  kept.splice(insertAt >= 0 ? insertAt : questionsIndex + limit + 1, 0, `Deferred by operational guard: ${removed} additional question${removed === 1 ? "" : "s"}; unresolved and outside this child packet.`)
  return { prompt: kept.join("\n"), removed }
}

function normalizeNumberedSections(prompt, limit) {
  if (!limit) return { prompt: String(prompt), changed: 0 }
  let seen = 0
  let changed = 0
  const normalized = String(prompt).replace(/^(\s*)(#{1,6}\s*)?\d+[.)]\s+(.+)$/gm, (line, indent, _heading, title) => {
    seen += 1
    if (seen <= limit) return line
    changed += 1
    return `${indent}Supporting context: ${title}`
  })
  return { prompt: normalized, changed }
}

export function normalizeTaskPacket(args, policy = DEFAULT_POLICY) {
  const normalized = { ...(args ?? {}) }
  const type = String(normalized.subagent_type ?? "")
  if (!CHILD_AGENTS.has(type)) return { args: normalized, normalizations: [] }
  const normalizations = []

  const description = String(normalized.description ?? "").trim()
  if (description.length > 160) {
    normalized.description = clipped(description, 160)
    normalizations.push("description-truncated")
  }

  let prompt = String(normalized.prompt ?? "")
  if (prompt.length > policy.taskPromptChars[type]) {
    normalized.prompt = prompt
    return { args: normalized, normalizations }
  }
  const envelope = parsePacketEnvelope(prompt)
  if (!envelope.scope && !envelope.stopCondition && envelope.questions.length === 0 && prompt.trim() && prompt.length <= 1200) {
    const firstLine = prompt.split(/\r?\n/).find((line) => line.trim())?.trim() ?? description ?? `Bounded ${type} task`
    const scope = clipped(description || firstLine, Math.min(300, policy.taskScopeChars))
    prompt = `Scope: ${scope}\nQuestions:\n- Inspect the bounded scope described below and return only conclusions and evidence references.\nStop condition: Stop when this bounded question is answered.\n\nSupporting context: ${prompt.trim()}`
    normalizations.push("packet-envelope-inferred")
  }

  const currentEnvelope = parsePacketEnvelope(prompt)
  if (currentEnvelope.scope?.length > policy.taskScopeChars) {
    prompt = prompt.replace(/^Scope:\s*(.+)$/im, `Scope: ${clipped(currentEnvelope.scope, policy.taskScopeChars)}`)
    normalizations.push("scope-truncated")
  }

  const questionResult = normalizeQuestionBlock(prompt)
  prompt = questionResult.prompt
  if (questionResult.removed > 0) normalizations.push(`questions-deferred:${questionResult.removed}`)

  const sectionResult = normalizeNumberedSections(prompt, policy.taskNumberedSections[type])
  prompt = sectionResult.prompt
  if (sectionResult.changed > 0) normalizations.push(`numbered-sections-normalized:${sectionResult.changed}`)

  const contract = TASK_EXECUTION_CONTRACTS[type]
  if (contract && !prompt.includes("Operational child contract:")) {
    const marker = type === "verify" ? "OPERATIONAL_RESULT:" : type === "fresh-review" ? "OPERATIONAL_REVIEW:" : "OPERATIONAL_EXPLORE:"
    const markerAlreadyPresent = prompt.includes(marker)
    const addition = markerAlreadyPresent ? contract.slice(0, contract.indexOf(" End exactly with")) : contract
    if (prompt.length + addition.length + 2 <= policy.taskPromptChars[type]) {
      prompt = `${prompt.trimEnd()}\n\n${addition}`
    }
  }

  normalized.prompt = prompt
  return { args: normalized, normalizations }
}

export function extractPaths(text, directory) {
  const paths = new Set()
  for (const match of text.matchAll(PATH_TOKEN)) {
    const candidate = normalizePathCandidate(match[1])
    if (!candidate) continue
    paths.add(resolve(directory, candidate))
  }
  return paths
}

function normalizePathCandidate(value) {
  const candidate = String(value ?? "").replace(/[.!?;:]+$/g, "")
  if (!candidate || candidate.includes("://")) return undefined
  const parts = candidate.split("/").filter(Boolean)
  if (parts.length < 2 || parts.some((part) => part.startsWith("--"))) return undefined
  const explicit = /^(?:\/|\.\.?\/)/.test(candidate)
  const commonRoot = COMMON_PATH_ROOT.test(parts[0])
  const fileLikeLeaf = /(?:^\.[A-Za-z0-9_-]+$|\.[A-Za-z0-9_-]{1,16}$)/.test(parts.at(-1))
  if (!explicit && !commonRoot && !fileLikeLeaf) return undefined
  return candidate
}

function isInsideDirectory(path, directory) {
  const rel = relative(resolve(directory), resolve(path))
  return rel === "" || (rel !== ".." && !rel.startsWith("../") && !rel.startsWith("..\\"))
}

function boundedWorkspacePaths(text, directory, limit) {
  return workspacePathBatch(text, directory, limit).paths
}

function workspacePathBatch(text, directory, limit) {
  const paths = new Set()
  let overflow = false
  for (const path of extractPaths(text, directory)) {
    if (!isInsideDirectory(path, directory)) continue
    if (paths.size >= limit) {
      overflow = true
      continue
    }
    paths.add(path)
  }
  return { paths, overflow }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
  }
  return value
}

function invocationFingerprint(tool, args) {
  if (tool === "bash" || tool === "shell") {
    const command = String(args?.command ?? "").trim().replace(/\s+/g, " ")
      .replace(/^rtk\s+/, "")
      .replace(/^((?:env\s+)?(?:(?:[A-Za-z_][A-Za-z0-9_]*=\S+)\s+)*)rtk\s+/, "$1")
    return `${tool}:${JSON.stringify(stableValue({ command, timeout: args?.timeout }))}`
  }
  return `${tool}:${JSON.stringify(stableValue(args ?? {}))}`
}

function shellReconCommand(args) {
  const command = String(args?.command ?? "").trim()
  return SHELL_RECON_COMMAND.test(command) ? command : undefined
}

function shellReconTargets(args, directory) {
  const command = shellReconCommand(args)
  if (!command) return new Set()
  const paths = boundedWorkspacePaths(command, directory, 8)
  if (paths.size > 0) return paths
  const hash = createHash("sha256").update(command.replace(/\s+/g, " ")).digest("hex").slice(0, 16)
  return new Set([`shell-recon:${hash}`])
}

function hasUnquotedShellOperator(command) {
  let quote = undefined
  let escaped = false
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === "\\" && quote !== "'") {
      escaped = true
      continue
    }
    if (quote) {
      if (char === quote) quote = undefined
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      continue
    }
    if (char === "\n" || char === ";" || char === "|" || char === ">" || char === "<" || char === "`") return true
    if (char === "&") return true
    if (char === "$" && command[index + 1] === "(") return true
  }
  return false
}

function messageText(output) {
  return (output?.parts ?? []).filter((part) => part?.type === "text").map((part) => String(part.text ?? "")).join("\n")
}

function extractAuthorityDeclaration(text) {
  const matches = [...String(text).matchAll(AUTHORITY_LABEL)]
  const match = matches.at(-1)
  if (!match) return undefined
  const label = match[1]
  const binding = match[2].toLowerCase()
  const mode = /EXPECTED_START_HEAD|REQUIRED_START_HEAD_SHA|REQUIRED\s+STARTING\s+HEAD|EXPECTED\s+STARTING\s+HEAD/i.test(label)
    ? "strict-start"
    : "target"
  return { binding, mode, label }
}

function resetForAuthorityChange(state, previous, next) {
  state.primaryReads.clear()
  state.delegatedPackets = []
  state.directValidations = 0
  state.reviewedGeneration = 0
  state.verifiedGeneration = 0
  state.primaryCallsSinceBoundary = 0
  state.primaryBoundaryNoticeSent = false
  state.routingDebt = undefined
  state.authorityChangeNotice = `OPERATIONAL GUARD: exact-head authority changed from ${previous} to ${next}. Prior-head validation and delegated coverage are superseded. Re-establish identity from scratch in this session; compaction preserves this authority boundary.`
}

function beginAuthorityAdmission(state, declaration) {
  const changed = state.authorityBinding !== declaration.binding
  if (changed && state.authorityBinding) resetForAuthorityChange(state, state.authorityBinding, declaration.binding)
  state.authorityBinding = declaration.binding
  if (changed || state.authorityMode !== declaration.mode || !state.authorityStatus) {
    state.authorityMode = declaration.mode
    state.authorityStatus = "pending"
    state.observedHead = undefined
    state.admissionObservedHead = undefined
    state.taskWorkspaceHead = undefined
    state.taskWorkspaceHeadStatus = "unknown"
  }
  state.authorityAdmissionNotice = declaration.mode === "strict-start"
    ? `OPERATIONAL GUARD: strict starting-head admission requires one bare native \`git rev-parse HEAD\` proving ${declaration.binding}. A mismatch blocks checkout, merge, edits, commit, and push until the user supplies new authority.`
    : `OPERATIONAL GUARD: exact-head target ${declaration.binding} is pending. For repository PR host evidence, use local-agent-assessment.mjs with one typed spec so the gateway preserves the owner checkout. Otherwise establish an authorized disposable worktree at exactly this SHA and prove it there with one bare native \`git rev-parse HEAD\`.`
}

function releaseTargetAuthority(state) {
  if (state.authorityMode !== "target") return false
  state.authorityBinding = undefined
  state.authorityMode = undefined
  state.authorityStatus = undefined
  state.observedHead = undefined
  state.admissionObservedHead = undefined
  state.authorityAdmissionNotice = undefined
  state.authorityMismatchFeedback = undefined
  return true
}

function targetRecoveryGuidance(binding) {
  return `For repository PR host evidence, run ${LOCAL_ASSESSMENT_RUNNER_PATH} --spec <absolute-spec-path>; the gateway owns exact-head fetch, isolation, proof, and cleanup without moving the owner checkout. If a repository-owned base-authority assessment is STALE only because the clean owner base branch is behind its pinned base, use ${OWNER_BASE_RECONCILIATION_PATH} --spec <absolute-spec-path> --expected-old-sha <40-lowercase-owner-sha> --expected-base-sha <40-lowercase-base-sha> --expected-target-sha ${binding}; that typed helper alone may fast-forward the owner to the explicitly/spec-pinned base after fresh exact authority checks. For caller-owned validation in an authorized disposable worktree, run one bare git worktree add --detach <absolute-disposable-path> ${binding}, set subsequent tool workdir to that path, and run one separate bare git rev-parse HEAD proof there. Use git switch --detach only when the user explicitly permits moving the current checkout.`
}

function coalesceSystemMessages(output) {
  if (!Array.isArray(output?.system)) return
  const messages = output.system.map((message) => String(message ?? "").trim()).filter(Boolean)
  output.system.splice(0, output.system.length, ...(messages.length > 0 ? [messages.join("\n\n")] : []))
}

function authorityMismatchNotice(state) {
  // Target mismatches deliberately have no proactive system augmentation.
  // v5.8-v5.9 duplicated the recovery contract on every fresh request and
  // could exhaust reasoning before the first tool call. Target recovery is
  // instead emitted once in proof output or a rejected mutation error.
  if (state.authorityMode === "target") return undefined
  return `OPERATIONAL GUARD: STRICT STARTING-HEAD ADMISSION BLOCKED. Observed HEAD ${state.observedHead ?? "unknown"} does not equal ${state.authorityBinding}. Do not checkout, switch, create a worktree, merge, edit, commit, or push unless the user supplies new authority.`
}

function lengthRecoveryNotice(state) {
  if (!state.lengthRecoveryPending) return undefined
  if (state.authorityBinding && state.authorityStatus === "mismatch") {
    if (state.authorityMode === "target") {
      return `OPERATIONAL GUARD: BOUNDED LENGTH RECOVERY. Preserve the owner checkout. ${targetRecoveryGuidance(state.authorityBinding)} Perform only the already-authorized route; do not restate the plan.`
    }
    return "OPERATIONAL GUARD: BOUNDED LENGTH RECOVERY. The prior primary response exhausted its output budget without visible text or a tool call. This is a strict starting-head mismatch: do not reason through reconciliation or call a tool; report the mismatch concisely and request new user authority."
  }
  return "OPERATIONAL GUARD: BOUNDED LENGTH RECOVERY. The prior primary response exhausted its output budget without visible text or a tool call. Do not restate the plan or repeat broad analysis. Immediately perform one already-established, permitted next action; if none exists, return a concise blocker."
}

function canonicalGitSegment(raw) {
  return canonicalValidationSegment(raw).replace(/^git\s+(?:-C\s+\S+\s+)?/, "git ")
}

function shellWordTokens(value) {
  const tokens = []
  let token = ""
  let tokenStarted = false
  let quote
  let escaped = false
  const flush = () => {
    if (tokenStarted) tokens.push(token)
    token = ""
    tokenStarted = false
  }
  for (const char of String(value)) {
    if (escaped) {
      token += char
      tokenStarted = true
      escaped = false
    } else if (char === "\\" && quote !== "'") {
      escaped = true
    } else if (quote) {
      if (char === quote) quote = undefined
      else {
        token += char
        tokenStarted = true
      }
    } else if (char === "'" || char === '"') {
      quote = char
      tokenStarted = true
    } else if (/\s/.test(char)) {
      flush()
    } else {
      token += char
      tokenStarted = true
    }
  }
  if (escaped) token += "\\"
  flush()
  return tokens
}

function canonicalGitCommandSegment(raw) {
  const segment = canonicalValidationSegment(raw)
  const tokens = shellWordTokens(segment)
  if (tokens[0]?.toLowerCase() !== "git") return segment
  const valuedOptions = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--super-prefix", "--config-env", "--attr-source"])
  const flagOptions = new Set(["-p", "-P", "--paginate", "--no-pager", "--bare", "--literal-pathspecs", "--glob-pathspecs", "--noglob-pathspecs", "--icase-pathspecs", "--no-optional-locks", "--no-replace-objects", "--no-lazy-fetch", "--exec-path", "--html-path", "--man-path", "--info-path", "--version", "--help"])
  let index = 1
  while (index < tokens.length) {
    const token = tokens[index]
    if (valuedOptions.has(token)) {
      index += 2
      continue
    }
    if (/^--(?:git-dir|work-tree|namespace|super-prefix|config-env|attr-source|exec-path|list-cmds)=/.test(token)) {
      index += 1
      continue
    }
    if (flagOptions.has(token)) {
      index += 1
      continue
    }
    if (token === "--") {
      index += 1
      break
    }
    break
  }
  const remaining = tokens.slice(index)
  if (remaining[0]?.startsWith("-")) {
    const mutatorIndex = remaining.findIndex((token) => HEAD_CHANGING_GIT_SUBCOMMANDS.has(token.toLowerCase()) || ["update-ref", "symbolic-ref", "bisect", "push", "worktree"].includes(token.toLowerCase()))
    if (mutatorIndex > 0) return `git ${remaining.slice(mutatorIndex).join(" ")}`
  }
  return `git ${remaining.join(" ")}`.trimEnd()
}

function exactHeadProofOnly(command) {
  const segments = shellSegments(command).map(canonicalGitSegment)
  return segments.length === 1 && /^git\s+rev-parse\s+HEAD$/.test(segments[0])
}

function authorityTargetingCommand(command, binding) {
  const escaped = binding.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const target = new RegExp(`^git\\s+(?:checkout\\s+(?:--quiet\\s+)?--detach|switch\\s+(?:--quiet\\s+)?--detach)\\s+${escaped}$`)
  const worktree = new RegExp(`^git\\s+worktree\\s+add\\s+(?:--detach\\s+)?\\S+\\s+${escaped}$`)
  const segments = shellSegments(command).map(canonicalGitSegment)
  return segments.length === 1 && (target.test(segments[0]) || worktree.test(segments[0]))
}

function authorityMutationCommand(command) {
  return headChangingCommand(command) || shellSegments(command).some((raw) => /^git\s+(?:worktree\s+add|push)(?=\s|$)/i.test(canonicalGitCommandSegment(raw)))
}

function headChangingCommand(command) {
  return shellSegments(command).some((raw) => {
    const segment = canonicalGitCommandSegment(raw)
    const match = segment.match(/^git\s+(\S+)(?:\s+(.*))?$/i)
    if (!match) return false
    const subcommand = match[1].toLowerCase()
    const args = String(match[2] ?? "").trim()
    if (HEAD_CHANGING_GIT_SUBCOMMANDS.has(subcommand)) return true
    if (subcommand === "update-ref") return Boolean(args && !/^(?:--help|-h)$/.test(args))
    if (subcommand === "symbolic-ref") {
      if (/(?:^|\s)--delete(?:\s|$)/.test(args)) return true
      const positional = args.split(/\s+/).filter((value) => value && !value.startsWith("-"))
      return positional.length >= 2
    }
    if (subcommand === "bisect") return /^(?:start|good|bad|new|old|skip|reset|run)(?:\s|$)/i.test(args)
    return false
  })
}

function admissionSummary(state) {
  return {
    schemaVersion: SCHEMA_VERSION,
    authorityBinding: state.authorityBinding,
    authorityMode: state.authorityMode,
    authorityStatus: state.authorityStatus,
    observedHead: state.admissionObservedHead ?? state.observedHead,
    admissionObservedHead: state.admissionObservedHead,
    taskWorkspaceHead: state.taskWorkspaceHeadStatus === "proven" ? state.taskWorkspaceHead : undefined,
    taskWorkspaceHeadStatus: state.taskWorkspaceHeadStatus,
  }
}

function observedHeadFromOutput(output) {
  return String(output ?? "").split(/\r?\n/).map((line) => line.trim().toLowerCase()).find((line) => /^[0-9a-f]{40}$/.test(line))
}

function workspaceIdentityCommand(command) {
  if (hasUnquotedShellOperator(String(command))) return false
  const segments = shellSegments(command)
  if (segments.length !== 1) return false
  const normalized = String(segments[0]).trim().replace(/^rtk\s+/, "")
  const tokens = normalized.split(/\s+/)
  if (tokens[0] !== WORKSPACE_IDENTITY_PATH) return false
  for (let index = 1; index < tokens.length;) {
    const flag = tokens[index]
    if (flag === "--fetch") { index += 1; continue }
    if (flag === "--check-bin" && /^\/[A-Za-z0-9._/+@%:=,-]+$/.test(tokens[index + 1] ?? "")) { index += 2; continue }
    if (flag === "--base" && /^[0-9a-f]{40}$/.test(tokens[index + 1] ?? "")) { index += 2; continue }
    return false
  }
  return true
}

function workspaceIdentityHead(command, output) {
  if (!workspaceIdentityCommand(command)) return undefined
  const text = String(output ?? "")
  const heads = [...text.matchAll(/^\[Git\] HEAD SHA:\s*([0-9a-f]{40})\s*$/gim)]
  return heads.length === 1 ? heads[0][1].toLowerCase() : undefined
}

function cleanWorkspaceIdentity(command, output) {
  const head = workspaceIdentityHead(command, output)
  if (!head) return undefined
  const text = String(output ?? "")
  const worktrees = [...text.matchAll(/^\[Git\] Worktree Status:\s*CLEAN\s*$/gim)]
  const diffs = [...text.matchAll(/^\[Git\] Diff Check:\s*CLEAN\s*$/gim)]
  const clean = worktrees.length === 1 && diffs.length === 1 && !/UNKNOWN|DIRTY|ISSUES FOUND/i.test(text)
  return clean && head ? head : undefined
}

function taskError(message, code = "invalid") {
  const actions = {
    invalid: "FIX_PACKET_ENVELOPE",
    "known-exact-lookup": "HANDLE_PRIMARY_EXACT_LOOKUP",
    "partition-required": "SPLIT_OR_STAGE_MANIFEST",
    "verify-plan-invalid": "REBUILD_VERIFY_MANIFEST",
    "child-capability-mismatch": "REPACKET_FOR_CHILD_CAPABILITY",
    "resume-not-admitted": "START_FRESH_OR_REPORT_BLOCKER",
    "resume-exhausted": "REPORT_TASK_BLOCKER",
    "resume-type-mismatch": "PRESERVE_RESUME_TYPE",
    "resume-scope-mismatch": "PRESERVE_RESUME_SCOPE",
  }
  const error = new Error(`Operational schema guard rejected Task packet: ${message} OPERATIONAL_PACKET_ACTION: ${actions[code] ?? "FIX_PACKET"}.`)
  error.code = code
  return error
}

function capabilityCorrectionCode(message) {
  const text = String(message ?? "")
  if (/remote authority refresh|git fetch|git pull|remote update/i.test(text)) return "PRIMARY_OWNS_REMOTE_REFRESH"
  if (/external path|cannot access|outside (?:the )?(?:workspace|allowed)|external directory/i.test(text)) return "REMOVE_EXTERNAL_TARGET"
  if (/wrapper|verify-disposable|local assessment|session trace assessment/i.test(text)) return "USE_SUPPORTED_WRAPPER"
  if (/\bls\b|listing|discover|glob|path derivation/i.test(text)) return "USE_BUILTIN_DISCOVERY"
  return "USE_SUPPORTED_CAPABILITY"
}

function correctionMarker(code) {
  return `OPERATIONAL_CORRECTION: ${code};`
}

export function validateTaskPacket(args, policy = DEFAULT_POLICY) {
  const type = String(args?.subagent_type ?? "")
  if (!CHILD_AGENTS.has(type)) return
  const prompt = String(args?.prompt ?? "")
  const description = String(args?.description ?? "")
  if (!description.trim()) throw taskError("description is required.")
  if (description.length > 160) throw taskError("description exceeds 160 characters.")
  if (!prompt.trim()) throw taskError("prompt is required.")
  const envelope = parsePacketEnvelope(prompt)
  if (!envelope.scope || !envelope.stopCondition || envelope.questions.length === 0) {
    throw taskError('prompt must contain a packet envelope with "Scope:", a "Questions:" bullet list, and "Stop condition:".')
  }
  if (envelope.scope.length > policy.taskScopeChars) {
    throw taskError(`Scope exceeds ${policy.taskScopeChars} characters.`)
  }
  if (envelope.questions.length > 3) {
    throw taskError(`prompt has ${envelope.questions.length} investigative questions; limit is 3.`)
  }
  const charLimit = policy.taskPromptChars[type]
  if (prompt.length > charLimit) {
    throw taskError(`${type} prompt is ${prompt.length} characters; limit is ${charLimit}.`, "partition-required")
  }
  const sectionLimit = policy.taskNumberedSections[type]
  if (sectionLimit) {
    const sections = countNumberedSections(prompt)
    if (sections > sectionLimit) {
      throw taskError(`${type} prompt has ${sections} numbered investigative sections; limit is ${sectionLimit}.`)
    }
  }
  const targetLimit = policy.taskExplicitTargets[type]
  const explicitTargets = envelope.targets
  const targets = explicitTargets.length > 0
    ? new Set(explicitTargets.map((target, index) => target.toLowerCase().startsWith("resolve:") ? `resolve:${index}` : [...extractPaths(target, "/")][0] ?? `target:${index}`))
    : extractPaths(prompt, "/")
  if (type === "explore" && targets.size > 0 && targets.size <= 4 && !DISCOVERY_SIGNAL.test(prompt)) {
    throw taskError(`Explore packet is a known exact ${targets.size}-path lookup without a discovery signal; handle it directly in the primary agent unless delegated-path reopening is already exhausted.`, "known-exact-lookup")
  }
  if (targets.size > targetLimit) {
    const preview = [...targets].slice(0, targetLimit + 2).map((path) => path.replace(/^\//, "")).join(", ")
    throw taskError(`${type} prompt names ${targets.size} filesystem targets; limit is ${targetLimit}. Parsed targets: ${preview}${targets.size > targetLimit + 2 ? ", …" : ""}.`, "partition-required")
  }
}

function shellSegments(command) {
  const segments = []
  let current = ""
  let quote
  let escaped = false
  const flush = () => {
    if (current.trim()) segments.push(current.trim())
    current = ""
  }
  for (let index = 0; index < String(command).length; index += 1) {
    const char = String(command)[index]
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === "\\" && quote !== "'") {
      current += char
      escaped = true
      continue
    }
    if (quote) {
      current += char
      if (char === quote) quote = undefined
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      current += char
      continue
    }
    if (char === "\n" || char === ";" || char === "|") {
      flush()
      if (char === "|" && String(command)[index + 1] === "|") index += 1
      continue
    }
    if (char === "&" && String(command)[index + 1] === "&") {
      flush()
      index += 1
      continue
    }
    current += char
  }
  flush()
  return segments
}

function canonicalValidationSegment(raw) {
  let segment = String(raw).trim()
  segment = segment.replace(/^rtk\s+/, "")
  segment = segment.replace(/^env\s+/, "")
  segment = segment.replace(/^(?:(?:[A-Za-z_][A-Za-z0-9_]*=(?:'[^']*'|"[^"]*"|\S+))\s+)*/, "")
  segment = segment.replace(/^rtk\s+/, "")
  while (/^uv\s+run\s+/.test(segment)) segment = segment.replace(/^uv\s+run\s+/, "")
  segment = segment.replace(/^rtk\s+/, "")
  segment = segment.replace(/^(?:\S*\/)?python(?:3(?:\.\d+)?)?\s+-m\s+/, "")
  segment = segment.replace(/^(?:\S*\/)+(ruff|pytest|pyrefly|mypy)\b/, "$1")
  return segment
}

function childResultLimit(type, policy) {
  return policy.childResultChars[type] ?? DEFAULT_POLICY.childResultChars[type]
}

function childResultHealth(output, type, childSessionID, childState, policy) {
  const text = String(output?.output ?? "")
  const metadata = output?.metadata ?? {}
  const reasons = []
  if (metadata.truncated) reasons.push("metadata-truncated")
  if (text.length > childResultLimit(type, policy)) reasons.push("child-result-oversized")
  if (/^\s*(?:[*_`#>-]+\s*)?maximum steps(?: for this agent)?(?: have been)? reached\b/im.test(text)) reasons.push("child-max-steps")
  if (/^\s*(?:[*_`#>-]+\s*)?output was truncated\b/im.test(text)) reasons.push("child-output-truncated")
  if (!text.trim() || /^\s*(?:<task\b[^>]*>\s*)?<task_result>\s*<\/task_result>(?:\s*<\/task>)?\s*$/i.test(text)) reasons.push("child-result-empty")
  if (childState?.lastAssistantFinish && childState.lastAssistantFinish !== "stop") {
    reasons.push(`child-finish-${childState.lastAssistantFinish}`)
  }
  if (!childSessionID) {
    reasons.push("child-session-unknown")
  } else if (!childState?.lastAssistantFinish) {
    reasons.push("child-finish-unknown")
  }
  // Tool-call budgets are advisory; only actual transport/result defects make a handoff incomplete.
  if (childState?.childTerminalReason) reasons.push("child-terminal-breaker")
  return { healthy: reasons.length === 0, reasons, text }
}

function verificationOutcome(text) {
  const pattern = /^OPERATIONAL_RESULT:\s*(PASS|FAIL|BLOCKED)\s*;\s*COMMANDS_RUN:\s*(\d+)\s*;\s*COMMANDS_REQUIRED:\s*(\d+)\s*$/gim
  const matches = [...String(text).matchAll(pattern)]
  if (matches.length === 0) {
    return { outcome: "unknown", commandsRun: undefined, commandsRequired: undefined, reasons: ["verify-result-marker-missing"] }
  }
  const match = matches.at(-1)
  const outcome = match[1].toLowerCase()
  const commandsRun = Number.parseInt(match[2], 10)
  const commandsRequired = Number.parseInt(match[3], 10)
  const reasons = []
  if (outcome !== "pass") reasons.push(`verify-outcome-${outcome}`)
  if (outcome === "pass" && (commandsRequired < 1 || commandsRun !== commandsRequired)) {
    reasons.push("verify-command-count-mismatch")
  }
  return { outcome, commandsRun, commandsRequired, reasons }
}

function boundedOutcome(text, { marker, outcomes, inspectedLabel, requiredLabel }) {
  const pattern = new RegExp(`^${marker}:\\s*(${outcomes.join("|")})\\s*;\\s*${inspectedLabel}:\\s*(\\d+)\\s*;\\s*${requiredLabel}:\\s*(\\d+)\\s*$`, "gim")
  const matches = [...String(text).matchAll(pattern)]
  if (matches.length === 0) return { outcome: "unknown", inspected: undefined, required: undefined, reasons: [`${marker.toLowerCase().replaceAll("_", "-")}-marker-missing`] }
  const match = matches.at(-1)
  const outcome = match[1].toLowerCase()
  const inspected = Number.parseInt(match[2], 10)
  const required = Number.parseInt(match[3], 10)
  const reasons = []
  if (outcome !== outcomes[0].toLowerCase()) reasons.push(`${marker.toLowerCase().replaceAll("_", "-")}-outcome-${outcome}`)
  if (outcome === outcomes[0].toLowerCase() && (required < 1 || inspected !== required)) reasons.push(`${marker.toLowerCase().replaceAll("_", "-")}-count-mismatch`)
  return { outcome, inspected, required, reasons }
}

function reviewOutcome(text) {
  return boundedOutcome(text, { marker: "OPERATIONAL_REVIEW", outcomes: ["CLEAN", "FINDINGS", "BLOCKED"], inspectedLabel: "TARGETS_REVIEWED", requiredLabel: "TARGETS_REQUIRED" })
}

function exploreOutcome(text) {
  return boundedOutcome(text, { marker: "OPERATIONAL_EXPLORE", outcomes: ["COMPLETE", "PARTIAL", "BLOCKED"], inspectedLabel: "TARGETS_INSPECTED", requiredLabel: "TARGETS_REQUIRED" })
}

function validationCount(command) {
  return shellSegments(command).reduce((count, raw) => {
    const segment = canonicalValidationSegment(raw)
    const direct = /^(?:pytest|pyrefly|mypy|npm\s+(?:(?:run\s+)?test|run\s+check)|pnpm\s+(?:(?:run\s+)?test|run\s+check)|yarn\s+(?:test|check)|cargo\s+test|go\s+test)\b/.test(segment)
    const ruff = /^ruff\s+(?:check\b(?![^\n]*--fix\b)|format\b[^\n]*--check\b)/.test(segment)
    const gitCheck = /^git\s+diff\s+--check\b/.test(segment)
    const xargs = /^xargs\b[^\n]*\b(?:pytest|pyrefly|mypy|ruff\s+check)\b/.test(segment)
    return count + Number(direct || ruff || gitCheck || xargs)
  }, 0)
}

function shellMutationReason(command) {
  for (const raw of shellSegments(command)) {
    const segment = canonicalValidationSegment(raw)
    if (/^ruff\s+check\b[^\n]*--fix\b/.test(segment)) return "ruff-fix"
    if (/^ruff\s+format\b(?![^\n]*--check\b)/.test(segment)) return "ruff-format-write"
    if (/^(?:sed\b[^\n]*\s-[A-Za-z]*i\S*|perl\b[^\n]*\s-[A-Za-z0-9]*i[A-Za-z0-9]*\b|patch\b|apply_patch\b|git\s+(?:apply|merge|rebase|cherry-pick|restore|reset|clean)(?=\s|$)|git\s+checkout\s+--(?:\s|$)|tee\b|cp\b|mv\b|install\b|rsync\b|touch\b|mkdir\b|rm\b|ln\b|truncate\b|chmod\b|chown\b)/.test(segment)) return "shell-file-mutation"
    if (/^(?:npm|pnpm|yarn|pip|pip3)\s+(?:install|add|remove|uninstall|update)\b/.test(segment)) return "dependency-mutation"
  }
  if (hasUnquotedFileRedirection(command)) return "shell-redirection"
  return undefined
}

function hasUnquotedFileRedirection(command) {
  let quote
  let escaped = false
  const text = String(command)
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === "\\" && quote !== "'") {
      escaped = true
      continue
    }
    if (quote) {
      if (char === quote) quote = undefined
      continue
    }
    if (char === "'" || char === '"') quote = char
    else if (char === ">") {
      const target = text.slice(index + 1).replace(/^>\s*/, "").trimStart()
      if (target.startsWith("&") || target.startsWith("/dev/null")) continue
      return true
    }
  }
  return false
}

function hasUnquotedNonTemporaryFileRedirection(command) {
  let quote
  let escaped = false
  const text = String(command)
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (escaped) { escaped = false; continue }
    if (char === "\\" && quote !== "'") { escaped = true; continue }
    if (quote) { if (char === quote) quote = undefined; continue }
    if (char === "'" || char === '"') { quote = char; continue }
    if (char !== ">") continue
    const remainder = text.slice(index + 1).replace(/^>\s*/, "").trimStart()
    if (remainder.startsWith("&") || remainder.startsWith("/dev/null")) continue
    const match = remainder.match(/^(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/)
    const target = match?.[1] ?? match?.[2] ?? match?.[3]
    if (target?.startsWith("/tmp/")) continue
    return true
  }
  return false
}

function workspaceMutationReason(command) {
  const reason = shellMutationReason(command)
  if (reason === "shell-redirection" && !hasUnquotedNonTemporaryFileRedirection(command)) return undefined
  return reason
}

function containsPublishCommand(command) {
  return shellSegments(command).some((raw) => {
    const segment = canonicalGitCommandSegment(raw)
    return /^git\s+(?:commit|push)\b/i.test(segment)
  })
}

function editPath(args, directory) {
  const value = args?.filePath ?? args?.path
  return typeof value === "string" && value ? resolve(directory, value) : undefined
}

function isReconTool(tool) {
  return NATIVE_RECON_TOOLS.has(tool) || tool.includes("serena") || tool.includes("probe")
}

function isReconInvocation(tool, args) {
  return isReconTool(tool) || ((tool === "bash" || tool === "shell") && Boolean(shellReconCommand(args)))
}

function reconPaths(tool, args, directory) {
  if ((tool === "bash" || tool === "shell") && shellReconCommand(args)) return shellReconTargets(args, directory)
  if (!isReconTool(tool)) return new Set()
  const values = [args?.filePath, args?.path, args?.relative_path, args?.relativePath]
  const paths = new Set()
  for (const value of values) {
    if (typeof value !== "string" || !value.trim() || value.includes("://")) continue
    paths.add(resolve(directory, value))
  }
  return paths
}

function requiresIndependentGates(state, policy) {
  if (!state.campaignActive) return false
  const productionPaths = [...state.editedPaths].filter((path) => !TEST_OR_DOC_PATH.test(path))
  return state.highRiskEdit || productionPaths.length >= policy.reviewFileThreshold
}

function resetCampaign(state, observedHead = state.observedHead) {
  state.editedPaths.clear()
  state.highRiskEdit = false
  state.editGeneration = 0
  state.reviewedGeneration = 0
  state.verifiedGeneration = 0
  state.campaignId = undefined
  state.campaignBaseHead = observedHead
  state.campaignActive = false
  state.campaignPublished = false
}

function recordImplementationEdit(state, path, { highRisk = false } = {}) {
  if (!state.campaignActive) {
    state.campaignActive = true
    state.campaignId = randomUUID()
    state.campaignBaseHead = state.observedHead
    state.campaignPublished = false
  }
  state.campaignPublished = false
  if (path) {
    state.editedPaths.add(path)
    state.highRiskEdit ||= HIGH_RISK_PATH.test(path)
  }
  state.highRiskEdit ||= highRisk
  state.editGeneration += 1
  state.directValidations = 0
  state.primaryReads.clear()
  state.primaryCallsSinceBoundary = 0
  state.primaryBoundaryNoticeSent = false
}

function invocationOwnedByWorkspace(tool, args, directory) {
  if (EDIT_TOOLS.has(tool)) {
    const path = editPath(args, directory)
    return Boolean(path && isInsideDirectory(path, directory))
  }
  if (tool !== "bash" && tool !== "shell") return true
  const workdir = args?.workdir ? resolve(directory, args.workdir) : resolve(directory)
  if (!isInsideDirectory(workdir, directory)) return false
  if (workspaceIdentityCommand(String(args?.command ?? ""))) return true
  const paths = extractPaths(String(args?.command ?? ""), workdir)
  return paths.size === 0 || [...paths].some((path) => isInsideDirectory(path, directory))
}

function completeDelegationBoundary(state) {
  state.primaryReads.clear()
  state.directValidations = 0
  state.primaryCallsSinceBoundary = 0
  state.primaryBoundaryNoticeSent = false
}

function workspaceStatePath(stateDirectory, directory) {
  if (!stateDirectory) return undefined
  const key = createHash("sha256").update(resolve(directory)).digest("hex")
  return join(resolve(stateDirectory), `${key}.json`)
}

function createSafetyStore(stateDirectory, directory, safety) {
  const path = workspaceStatePath(stateDirectory, directory)
  let loaded = !path
  let pending = Promise.resolve()
  return {
    path,
    async load() {
      if (loaded) return
      loaded = true
      try {
        hydrateSafetyState(safety, JSON.parse(await readFile(path, "utf8")))
      } catch (error) {
        if (error?.code !== "ENOENT") {
          safety.highRiskEdit = true
          safety.editGeneration = Math.max(1, safety.editGeneration)
          safety.reviewedGeneration = 0
          safety.verifiedGeneration = 0
          safety.campaignActive = true
          safety.campaignId ||= randomUUID()
          safety.campaignBaseHead ||= safety.observedHead
          safety.campaignPublished = false
          safety.persistenceWarning = `workspace safety state could not be loaded (${error.code ?? error.name ?? "invalid-state"}); commit and push remain fail-closed until Fresh-review and Verify pass`
        }
      }
    },
    async save() {
      if (!path) return
      const snapshot = `${JSON.stringify(serializedSafetyState(safety), null, 2)}\n`
      pending = pending.then(async () => {
        await mkdir(resolve(stateDirectory), { recursive: true, mode: 0o700 })
        const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`
        let handle
        try {
          handle = await open(temporary, "wx", 0o600)
          await handle.writeFile(snapshot, "utf8")
          await handle.sync()
          await handle.close()
          handle = undefined
          await rename(temporary, path)
          safety.persistenceWarning = undefined
        } catch (error) {
          if (handle) await handle.close().catch(() => {})
          await unlink(temporary).catch(() => {})
          throw error
        }
      })
      await pending
    },
  }
}

function boundedExactRange(tool, args) {
  if (tool !== "read") return false
  const offset = Number(args?.offset)
  const limit = Number(args?.limit)
  return Number.isInteger(offset) && offset >= 0 && Number.isInteger(limit) && limit >= 1 && limit <= 200
}

function canRerouteExhaustedExactLookup(state, prompt, directory, policy) {
  const targets = extractPaths(prompt, directory)
  return [...targets].some((target) => state.delegatedPackets.some((packet) => packet.paths.has(target) && packet.reopened.size >= policy.parentReopenLimit))
}

function presentationOnlySegment(raw) {
  const segment = canonicalValidationSegment(raw)
  return /^(?:echo|printf)\b/.test(segment) && !/[`]|\$\(|\$\?/.test(segment)
}

function shellStatements(command) {
  const statements = []
  let current = ""
  let quote
  let escaped = false
  const flush = () => {
    if (current.trim()) statements.push(current.trim())
    current = ""
  }
  for (let index = 0; index < String(command).length; index += 1) {
    const char = String(command)[index]
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === "\\" && quote !== "'") {
      current += char
      escaped = true
      continue
    }
    if (quote) {
      current += char
      if (char === quote) quote = undefined
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      current += char
      continue
    }
    if (char === "\n" || char === ";") {
      flush()
      continue
    }
    if (char === "&" && String(command)[index + 1] === "&") {
      flush()
      index += 1
      continue
    }
    if (char === "|" && String(command)[index + 1] === "|") {
      flush()
      index += 1
      continue
    }
    current += char
  }
  flush()
  return statements
}

function primaryShellSegments(command) {
  return shellStatements(withoutHeredocBodies(command)).filter((segment) => !presentationOnlySegment(segment))
}

function withoutHeredocBodies(command) {
  const lines = String(command).split(/\r?\n/)
  const kept = []
  let delimiter
  for (const line of lines) {
    if (delimiter) {
      if (line.trim() === delimiter) delimiter = undefined
      continue
    }
    kept.push(line)
    const match = line.match(/<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/)
    if (match) delimiter = match[1]
  }
  return kept.join("\n")
}

function planCommandLines(text) {
  const commandStart = /^(?:(?:[-*]|\d+[.)])\s*)?(?:`{1,3})?(?:rtk\s+|env\s+|[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*(?:(?:\/[^\s`]+\/|\.venv[^\s`]*\/bin\/)(?:verify-disposable\.mjs|verify-manifest\.mjs|local-agent-assessment\.mjs|workspace-identity\.mjs|session-trace-assessment\.mjs|python(?:3(?:\.\d+)?)?|pytest|ruff|pyrefly|mypy)\b|scripts\/disposable-test-services\b|git\s|python(?:3(?:\.\d+)?)?\s|pytest\s|ruff\s|pyrefly\s|mypy\s|npm\s|pnpm\s|yarn\s|cargo\s|go\s|ls(?:\s|$)|grep\s|rg\s)/i
  const commands = []
  let commandsSection = false
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^(?:[-*]|\d+[.)])\s*/, "")
    if (/^Commands:\s*$/i.test(rawLine.trim())) {
      commandsSection = true
      continue
    }
    if (commandsSection && /^[A-Za-z][A-Za-z -]+:\s*/.test(rawLine.trim())) commandsSection = false
    const candidates = commandsSection ? [line] : []
    const command = candidates.find((candidate) => commandStart.test(candidate))
    if (command) commands.push(command.replace(/^`+|`+$/g, "").trim())
  }
  return commands
}

function stripRtk(command) {
  return String(command).trim().replace(/^rtk\s+/, "")
}

function gitCapabilityError(type, command) {
  const normalized = stripRtk(command)
  if (!/^git\s/.test(normalized)) return undefined
  if (/^git\s+-C\s+/.test(normalized)) {
    return `${type} command uses unsupported git -C syntax (${command}). Set the tool workdir to the repository and begin the command with the read-only Git subcommand.`
  }
  if (/^git\s+(?:fetch|pull|remote\s+update)\b/.test(normalized)) {
    return `${type} cannot refresh remote refs (${command}); remote authority refresh is primary-owned and must complete before delegation.`
  }
  const verbs = type === "verify"
    ? /^(?:status|diff|rev-parse|branch\s+--show-current|log|show|ls-files)\b/
    : /^(?:status|diff|rev-parse|branch\s+--show-current|log|show|ls-files|grep|merge-base)\b/
  if (!verbs.test(normalized.replace(/^git\s+/, ""))) return `${type} command is outside the read-only Git capability set (${command}).`
  return undefined
}

function verifyCommandCapabilityError(command) {
  const wrapperError = verifyDisposableCommandError(command)
  if (wrapperError) return wrapperError
  const normalized = stripRtk(command)
  const traceAssessmentError = sessionTraceAssessmentCommandError(command)
  if (traceAssessmentError) return traceAssessmentError
  if (normalized.startsWith(`${EVIDENCE_ASSESSMENT_PATH} `)) return undefined
  const localAssessmentError = localAssessmentCommandError(command)
  if (localAssessmentError) return localAssessmentError
  if (normalized.startsWith(`${LOCAL_ASSESSMENT_RUNNER_PATH} `)) return undefined
  if (normalized.startsWith(`${VERIFY_MANIFEST_RUNNER_PATH} --manifest `)) return undefined
  if (SHELL_STATUS_PROBE.test(normalized)) return undefined
  if (normalized.startsWith(`${VERIFY_WRAPPER_PATH} `)) return undefined
  const gitError = gitCapabilityError("verify", command)
  if (gitError || /^git\s/.test(normalized)) return gitError
  if (/^(?:ls|grep|rg)\b/.test(normalized)) {
    return `Verify shell discovery command is unsupported (${command}). Use built-in read/grep/glob, allowlisted git ls-files, or a staged /tmp/opencode/verify manifest.`
  }
  if (/^(?:\/[^\s]+\/|\.\/?[^\s]*\/)?python(?:3(?:\.\d+)?)?\s+-m\s+pytest\b/.test(normalized)) {
    return `Verify direct Python-module pytest spelling is unsupported (${command}). Use the repository-pinned pytest executable, or wrap an external interpreter with ${VERIFY_WRAPPER_PATH}.`
  }
  const permitted = [
    /^(?:env\s+)?PYTHONDONTWRITEBYTECODE=1\s+(?:\.venv[^/\s]*\/bin\/)?(?:pytest|ruff|pyrefly|mypy)\b/,
    /^(?:\.venv[^/\s]*\/bin\/)?(?:pytest|ruff|pyrefly|mypy)\b/,
    /^\.venv[^/\s]*\/bin\/python\s+-m\s+pyrefly\b/,
    /^uv\s+run\s+(?:rtk\s+)?(?:pytest|ruff|pyrefly|mypy)\b/,
    /^(?:mypy|npm(?:\s+run)?\s+(?:test|check)|pnpm(?:\s+run)?\s+test|yarn\s+test|cargo\s+test|go\s+test)\b/,
  ]
  if (permitted.some((pattern) => pattern.test(normalized))) return undefined
  return `Verify command is not in the declared child capability set (${command}). Use a documented pinned executable or the disposable wrapper.`
}

function reviewCommandCapabilityError(type, command) {
  const normalized = stripRtk(command)
  const traceAssessmentError = sessionTraceAssessmentCommandError(command)
  if (traceAssessmentError) return traceAssessmentError
  if ((type === "explore" || type === "fresh-review") && normalized.startsWith(`${EVIDENCE_ASSESSMENT_PATH} `)) return undefined
  const gitError = gitCapabilityError(type, command)
  if (gitError || /^git\s/.test(normalized)) return gitError
  return `${type} shell command is not in the declared read-only capability set (${command}). Use built-in read/grep/glob or an allowlisted read-only Git command.`
}

function delegatedWrapperPaths(commands) {
  const paths = new Set()
  for (const command of commands) {
    const match = stripRtk(command).match(/^\/home\/filip\/\.config\/opencode\/plugins\/operational-schema-v5\/scripts\/verify-disposable\.mjs\b[^\n]*?\s--\s+(.+)$/)
    if (!match) continue
    for (const path of extractPaths(match[1], "/")) paths.add(path)
  }
  return paths
}

function childExternalPathError(type, prompt, directory, commands) {
  const wrapperPaths = type === "verify" ? delegatedWrapperPaths(commands) : new Set()
  for (const path of extractPaths(prompt, directory)) {
    if (isInsideDirectory(path, directory)) continue
    if ((type === "explore" || type === "fresh-review") && (isInsideDirectory(path, REVIEW_WORKTREE_ROOT) || isInsideDirectory(path, VERIFY_ROOT) || isInsideDirectory(path, TOOL_OUTPUT_ROOT))) continue
    if ((type === "explore" || type === "fresh-review") && path === EVIDENCE_ASSESSMENT_PATH) continue
    if (type === "verify" && (isInsideDirectory(path, VERIFY_ROOT) || isInsideDirectory(path, REVIEW_WORKTREE_ROOT) || isInsideDirectory(path, TOOL_OUTPUT_ROOT) || path === VERIFY_WRAPPER_PATH || path === VERIFY_MANIFEST_RUNNER_PATH || path === LOCAL_ASSESSMENT_RUNNER_PATH || path === EVIDENCE_ASSESSMENT_PATH || wrapperPaths.has(path))) continue
    return `${type} packet names external path ${path}, which the child cannot access. Stage typed Verify inputs under ${VERIFY_MANIFEST_ROOT}, ${VERIFY_MATERIAL_ROOT}, or ${VERIFY_WORKTREE_ROOT}; use the harness review root ${REVIEW_WORKTREE_ROOT}; or keep the prerequisite in the primary.`
  }
  return undefined
}

async function verifyPlanTexts(args) {
  const prompt = String(args?.prompt ?? "")
  const texts = [prompt]
  const manifests = parsePacketEnvelope(prompt).manifests
  if (manifests.length > 1) throw taskError("Verify packet must name at most one Manifest.", "verify-plan-invalid")
  for (const reference of manifests) {
    const path = resolve("/", reference)
    if (!isInsideDirectory(path, VERIFY_MANIFEST_ROOT) || !path.endsWith(".json")) {
      throw taskError(`Verify Manifest must be a .json file under ${VERIFY_MANIFEST_ROOT}.`, "verify-plan-invalid")
    }
    try {
      const content = await readFile(path, "utf8")
      if (content.length > 32768) throw taskError(`Verify manifest ${path} exceeds 32768 characters.`, "verify-plan-invalid")
      let manifest
      try {
        manifest = JSON.parse(content)
      } catch (error) {
        throw taskError(`Verify manifest ${path} is not strict JSON (${error.message}).`, "verify-plan-invalid")
      }
      if (manifest?.schema_version !== "opencode-verify-manifest-v1" || !Array.isArray(manifest.commands) || manifest.commands.length < 1 || manifest.commands.length > 32) {
        throw taskError(`Verify manifest ${path} must use opencode-verify-manifest-v1 with 1-32 commands.`, "verify-plan-invalid")
      }
      const rendered = []
      for (const [index, entry] of manifest.commands.entries()) {
        if (!entry || !Array.isArray(entry.argv) || entry.argv.length < 1 || entry.argv.length > 512 || entry.argv.some((value) => typeof value !== "string" || /[\r\n\0]/.test(value))) {
          throw taskError(`Verify manifest ${path} command ${index + 1} has invalid argv.`, "verify-plan-invalid")
        }
        if (entry.argv[0] === "rtk" || entry.argv[0] === "env" || /^[A-Za-z_][A-Za-z0-9_]*=/.test(entry.argv[0])) {
          throw taskError(`Verify manifest ${path} command ${index + 1} must begin directly with an allowlisted executable, not ${entry.argv[0]}.`, "verify-plan-invalid")
        }
        const command = entry.argv.join(" ")
        const capabilityError = verifyCommandCapabilityError(command)
        if (capabilityError) throw taskError(`Verify manifest ${path} command ${index + 1}: ${capabilityError}`, "verify-plan-invalid")
        rendered.push(command)
      }
      texts.push(`Commands:\n${rendered.join("\n")}`)
    } catch (error) {
      if (error?.message?.startsWith("Operational schema guard")) throw error
      throw taskError(`Verify manifest ${path} is not readable (${error.code ?? error.message}).`, "verify-plan-invalid")
    }
  }
  return texts
}

function verifyDisposableCommandError(command) {
  const wrapper = String(command).match(/(?:^|\s)(?:\S*\/)?verify-disposable\.mjs\b[^\n]*?\s--\s+(.+)$/)
  if (!wrapper) return undefined
  const delegated = wrapper[1].trim()
  if (!/^(?:env\s+|[A-Za-z_][A-Za-z0-9_]*=\S+\s+|rtk\s+|node\s+)/.test(delegated)) return undefined
  return `Verify disposable wrapper must begin directly with the repository-pinned executable after --, not "${delegated.split(/\s+/).slice(0, 2).join(" ")}". The wrapper injects PYTHONDONTWRITEBYTECODE and helper environment itself; remove env, assignments, RTK, or node prefixes.`
}

function localAssessmentCommandError(command) {
  const raw = String(command)
  const normalized = stripRtk(raw)
  if (!normalized.startsWith(LOCAL_ASSESSMENT_RUNNER_PATH)) return undefined
  if (hasUnquotedShellOperator(raw) || shellSegments(raw).length !== 1) {
    return `Local assessment must be one bare invocation with no shell operators.`
  }
  const parts = normalized.split(/\s+/)
  if (
    parts.length !== 3
    || parts[0] !== LOCAL_ASSESSMENT_RUNNER_PATH
    || parts[1] !== "--spec"
    || !isInsideDirectory(parts[2], LOCAL_ASSESSMENT_SPEC_ROOT)
    || !parts[2].endsWith(".json")
    || /[*?\[\]{}]/.test(parts[2])
  ) {
    return `Local assessment must use exactly ${LOCAL_ASSESSMENT_RUNNER_PATH} --spec ${LOCAL_ASSESSMENT_SPEC_ROOT}/<file>.json.`
  }
  return undefined
}

function localAssessmentInvocation(command) {
  const normalized = stripRtk(command)
  if (!normalized.startsWith(LOCAL_ASSESSMENT_RUNNER_PATH) || localAssessmentCommandError(command)) return undefined
  return { specPath: normalized.split(/\s+/)[2] }
}

function ownerBaseReconciliationCommandError(command) {
  const raw = String(command)
  const normalized = stripRtk(raw)
  if (!normalized.startsWith(OWNER_BASE_RECONCILIATION_PATH)) return undefined
  if (hasUnquotedShellOperator(raw) || shellSegments(raw).length !== 1) {
    return `Owner-base reconciliation must be one bare invocation with no shell operators.`
  }
  const parts = normalized.split(/\s+/)
  if (
    parts.length !== 9
    || parts[0] !== OWNER_BASE_RECONCILIATION_PATH
    || parts[1] !== "--spec"
    || !isInsideDirectory(parts[2], LOCAL_ASSESSMENT_SPEC_ROOT)
    || !parts[2].endsWith(".json")
    || /[*?\[\]{}]/.test(parts[2])
    || parts[3] !== "--expected-old-sha"
    || !/^[0-9a-f]{40}$/.test(parts[4])
    || parts[5] !== "--expected-base-sha"
    || !/^[0-9a-f]{40}$/.test(parts[6])
    || parts[7] !== "--expected-target-sha"
    || !/^[0-9a-f]{40}$/.test(parts[8])
  ) {
    return `Owner-base reconciliation must use exactly ${OWNER_BASE_RECONCILIATION_PATH} --spec ${LOCAL_ASSESSMENT_SPEC_ROOT}/<file>.json --expected-old-sha <40-lowercase-sha> --expected-base-sha <40-lowercase-sha> --expected-target-sha <40-lowercase-sha>.`
  }
  return undefined
}

function ownerBaseReconciliationInvocation(command) {
  const normalized = stripRtk(command)
  if (!normalized.startsWith(OWNER_BASE_RECONCILIATION_PATH) || ownerBaseReconciliationCommandError(command)) return undefined
  const parts = normalized.split(/\s+/)
  return { specPath: parts[2], expectedOldSha: parts[4], expectedBaseSha: parts[6], expectedTargetSha: parts[8] }
}

function assessmentTerminalResult(text) {
  const matches = [...String(text ?? "").matchAll(/^HOST_EVIDENCE_RESULT=(PASS|FAIL|BLOCKED|STALE|INFRA_ERROR|ISOLATION_BREACH)\s*$/gm)]
  return matches.at(-1)?.[1]
}

function ownerBaseReconciliationResult(text) {
  if (!/^OWNER_BASE_RECONCILIATION_RESULT=PASS\s*$/m.test(String(text ?? ""))) return undefined
  const match = String(text ?? "").match(/^OPERATIONAL_OWNER_RECONCILIATION: PASS;[^\n]*\bbase_sha=([0-9a-f]{40});[^\n]*$/m)
  return match ? { baseSha: match[1] } : undefined
}

function sessionTraceAssessmentCommandError(command) {
  const normalized = stripRtk(command)
  if (!normalized.startsWith(EVIDENCE_ASSESSMENT_PATH)) return undefined
  const parts = normalized.split(/\s+/)
  if (
    parts.length !== 7
    || parts[0] !== EVIDENCE_ASSESSMENT_PATH
    || parts[1] !== "--input"
    || !isInsideDirectory(parts[2], VERIFY_MATERIAL_ROOT)
    || !parts[2].endsWith(".json")
    || /[*?\[\]{}]/.test(parts[2])
    || parts[3] !== "--session-id"
    || !/^ses_[A-Za-z0-9]+$/.test(parts[4])
    || parts[5] !== "--profile"
    || !new Set(["guard-friction-v1", "remediation-audit-v1"]).has(parts[6])
  ) return `Session trace assessment must use exactly ${EVIDENCE_ASSESSMENT_PATH} --input ${VERIFY_MATERIAL_ROOT}/<file>.json --session-id ses_<id> --profile guard-friction-v1|remediation-audit-v1.`
  return undefined
}

async function validateVerifyPlan(args) {
  if (String(args?.subagent_type ?? "") !== "verify") return
  const texts = await verifyPlanTexts(args)
  for (const line of texts.flatMap((text) => String(text).split("\n").map((value) => value.trim()))) {
    if (!stripRtk(line).startsWith(LOCAL_ASSESSMENT_RUNNER_PATH)) continue
    const error = localAssessmentCommandError(line)
    if (error) throw taskError(error, "verify-plan-invalid")
  }
  const commands = texts.flatMap(planCommandLines)
  const fingerprints = new Set()
  for (const command of commands) {
    const fingerprint = invocationFingerprint("bash", { command })
    if (fingerprints.has(fingerprint)) throw taskError(`Verify plan repeats an equivalent command (${command}). Successful empty output is still success; do not retry it.`, "verify-plan-invalid")
    fingerprints.add(fingerprint)
    const wrapperError = verifyDisposableCommandError(command)
    if (wrapperError) throw taskError(wrapperError, "verify-plan-invalid")
  }
  const ownerWrapper = commands.some((command) => /verify-disposable\.mjs\b[^\n]*--down-after\b/.test(command))
  const standaloneDown = commands.some((command) => /(?:^|\s)(?:scripts\/)?disposable-test-services\b[^\n]*\bdown\b/.test(command))
  if (ownerWrapper && standaloneDown) {
    throw taskError("Verify plan redundantly requests standalone disposable-service cleanup after an owner wrapper with --down-after; the wrapper teardown is the cleanup proof.", "verify-plan-invalid")
  }
}

export async function validateChildPlan(args, directory = process.cwd()) {
  const type = String(args?.subagent_type ?? "")
  if (!CHILD_AGENTS.has(type)) return
  const texts = type === "verify" ? await verifyPlanTexts(args) : [String(args?.prompt ?? "")]
  const commands = texts.flatMap(planCommandLines)
  if (type === "verify") await validateVerifyPlan(args)
  for (const command of commands) {
    const error = type === "verify" ? verifyCommandCapabilityError(command) : reviewCommandCapabilityError(type, command)
    if (error) throw taskError(`CHILD_CAPABILITY_MISMATCH: ${error}`, "child-capability-mismatch")
  }
  const pathError = childExternalPathError(type, texts.join("\n"), directory, commands)
  if (pathError) throw taskError(`CHILD_CAPABILITY_MISMATCH: ${pathError}`, "child-capability-mismatch")
}

function childInvocationCapabilityError(type, tool, args, directory) {
  const command = tool === "bash" || tool === "shell" ? String(args?.command ?? "") : undefined
  if (command) {
    const error = type === "verify" ? verifyCommandCapabilityError(command) : reviewCommandCapabilityError(type, command)
    if (error) return error
  }
  return childExternalPathError(type, JSON.stringify(args ?? {}), directory, command ? [command] : [])
}

// --- todo-ledger guard (deterministic state visibility + reinforcement only) ---
// These helpers never rewrite todo status/content/ids, never infer semantic
// completion, and never continue the model. Hydration is fail-open.

// Authoritative lazy readback of a session's todos from the OpenCode client.
// Any missing client/method or thrown call yields undefined so the model turn
// and idle path are never blocked.
async function hydrateSessionTodos(client, sessionID) {
  if (!client?.session?.todo) return undefined
  try {
    const result = await client.session.todo({ path: { id: sessionID } })
    const list = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.todos)
          ? result.todos
          : undefined
    return list === undefined ? undefined : normalizeTodos(list)
  } catch {
    return undefined
  }
}

// Reconcile the per-session cache from a successful native todowrite. The
// validated args.todos are authoritative; the plugin never rewrites them.
function observeTodoWrite(state, args) {
  const todos = args?.todos
  if (!Array.isArray(todos)) return
  state.todos = normalizeTodos(todos)
  state.todoSource = "write"
}

// Reconcile the per-session cache from the independent todo.updated signal.
function observeTodoUpdated(state, event) {
  const todos = event?.properties?.todos
  if (!Array.isArray(todos)) return
  state.todos = normalizeTodos(todos)
  state.todoSource = "event"
}

// A session is primary when its tracked agent is a primary agent, or when the
// session record has no parent. Child/subagent sessions are suppressed from
// the user-facing idle toast; unknown primary-ness fails closed (no toast).
async function isPrimarySession(state, client, sessionID) {
  if (CHILD_AGENTS.has(state.agent)) return false
  if (PRIMARY_AGENTS.has(state.agent)) return true
  if (client?.session?.get) {
    try {
      const info = await client.session.get({ path: { id: sessionID } })
      const parentID = info?.parentID ?? info?.parent_id
      return !parentID
    } catch {
      return false
    }
  }
  return false
}

async function notifyTodoLedgerWarning(client, count) {
  if (!client?.tui?.showToast) return
  try {
    await client.tui.showToast({
      body: {
        title: "Operational todo ledger",
        message: `Todo ledger still has ${count} nonterminal item(s). Reconcile todo status before treating the session as complete.`,
        variant: "warning",
      },
    })
  } catch {
    // A warning must never block or crash the idle path; fail open.
  }
}

// Idle refresh: readback the ledger, detect primary-ness, and emit one bounded
// warning for a stale nonterminal primary ledger, deduplicated by fingerprint.
async function maybeWarnIdle(states, client, sessionID) {
  const state = stateFor(states, sessionID)
  const fresh = await hydrateSessionTodos(client, sessionID)
  if (fresh !== undefined) {
    state.todos = fresh
    state.todoSource = "hydrated"
  }
  if (state.todos === undefined) return
  const count = nonterminalCount(state.todos)
  const fingerprint = fingerprintTodos(state.todos)
  if (count === 0 || !(await isPrimarySession(state, client, sessionID))) {
    state.todoFingerprint = fingerprint
    return
  }
  if (fingerprint === state.todoFingerprint) return
  state.todoFingerprint = fingerprint
  await notifyTodoLedgerWarning(client, count)
}

// Per-turn reminder injection. Appends the bounded reminder to the existing
// primary system element in place (never adding a second element), and lazily
// hydrates an unknown ledger from the client. Fail-open throughout.
async function injectTodoLedgerReminder(input, output, states, client) {
  const sessionID = input?.sessionID
  if (!sessionID || !Array.isArray(output?.system)) return
  const state = states.get(sessionID)
  if (!state) return
  if (state.todos === undefined) {
    state.todos = await hydrateSessionTodos(client, sessionID)
    if (state.todos !== undefined) state.todoSource = "hydrated"
  }
  const reminder = state.todos === undefined ? undefined : renderReminder(state.todos)
  if (reminder === undefined) return
  const first = output.system[0]
  if (typeof first !== "string" || first.trim().length === 0) {
    if (!state.todoReminderSkipNoted) {
      state.todoReminderSkipNoted = true
      recordGuardEvent(state, "todo-reminder-skipped", { reason: "no-primary-system-string", terminal: false })
    }
    return
  }
  output.system[0] = first.endsWith("\n") ? `${first}${reminder}` : `${first}\n\n${reminder}`
}

export function createOperationGuard({ directory = process.cwd(), env = process.env, policy = policyFromEnv(env), stateDirectory, client } = {}) {
  const states = new Map()
  states.safety = emptySafetyState()
  const safetyStore = createSafetyStore(stateDirectory, directory, states.safety)
  const bypass = env.OPENCODE_OPERATION_GUARD_BYPASS === "1"

  return {
    "tool.definition": async (input, output) => {
      if (String(input?.toolID ?? "").toLowerCase() !== "todowrite") return
      if (typeof output?.description === "string" && output.description.includes(TODO_LEDGER_SENTINEL)) return
      const base = String(output?.description ?? "").trim()
      // Append the contract only; the parameter schema is intentionally untouched.
      output.description = base ? `${base}\n\n${TODOWRITE_LEDGER_CONTRACT}` : TODOWRITE_LEDGER_CONTRACT
    },

    "chat.message": async (input, output) => {
      await safetyStore.load()
      const state = stateFor(states, input.sessionID)
      if (input.agent) state.agent = input.agent
      let declaration
      if (PRIMARY_AGENTS.has(state.agent)) {
        declaration = extractAuthorityDeclaration(messageText(output))
        if (declaration) beginAuthorityAdmission(state, declaration)
      }
      if (declaration) await safetyStore.save()
    },

    "chat.params": async (input, output) => {
      const limit = policy.childGenerationTokens[input.agent]
      if (limit) output.maxOutputTokens = Math.min(output.maxOutputTokens ?? limit, limit)
      const state = states.get(input.sessionID)
      if (PRIMARY_AGENTS.has(input.agent) && state?.lengthRecoveryPending) {
        output.maxOutputTokens = Math.min(output.maxOutputTokens ?? 1024, 1024)
      }
    },

    "experimental.chat.system.transform": async (input, output) => {
      try {
        if (!input.sessionID) return
        const state = states.get(input.sessionID)
        if (!state) return
        if (PRIMARY_AGENTS.has(state.agent)) {
          if (state.authorityChangeNotice) {
            output.system.push(state.authorityChangeNotice)
            state.authorityChangeNotice = undefined
          }
          if (state.authorityAdmissionNotice) {
            output.system.push(state.authorityAdmissionNotice)
            state.authorityAdmissionNotice = undefined
          }
          if (state.authorityBinding && state.authorityStatus === "mismatch") {
            const mismatch = authorityMismatchNotice(state)
            if (mismatch) output.system.push(mismatch)
          }
          const recovery = lengthRecoveryNotice(state)
          if (recovery) {
            output.system.push(recovery)
            state.lengthRecoveryPending = false
          }
          if (states.safety.persistenceWarning) {
            output.system.push(`OPERATIONAL GUARD: ${states.safety.persistenceWarning}.`)
          }
          if (state.taskPacketNotice) {
            output.system.push(state.taskPacketNotice)
            state.taskPacketNotice = undefined
          }
          if (state.taskFailureNotice) {
            output.system.push(state.taskFailureNotice)
            state.taskFailureNotice = undefined
          }
          if (state.routingDebt) {
            output.system.push(`OPERATIONAL ADVISORY: routing debt (${state.routingDebt}). Prefer a smaller Explore packet when it will reduce context, but continue directly when the next action is already bounded.`)
          }
          if (state.advisoryNotices.length > 0) output.system.push(...state.advisoryNotices.splice(0))
          const contextBudget = primaryContextPolicyForAgent(policy, state.agent)
          if (contextBudget && state.lastInputTokens >= contextBudget.warningTokens && !state.contextNoticeSent) {
            output.system.push(`OPERATIONAL GUARD: primary input context is ${state.lastInputTokens} tokens; initialization-derived warning=${contextBudget.warningTokens}; model=${contextBudget.model}. Remain in this session and yield normally so OpenCode can compact and auto-continue. Do not write a session-close handoff and do not ask the user to start another primary session. Route only already-bounded noisy work while waiting for compaction.`)
            state.contextNoticeSent = true
            state.compactionRequested = true
          }
          if (state.primaryCallsSinceBoundary >= policy.primaryOperationWarning && !state.primaryBoundaryNoticeSent) {
            output.system.push(`OPERATIONAL GUARD: ${state.primaryCallsSinceBoundary} primary tool calls have accumulated without an edit or successful delegation boundary. Partition the remaining work now; delegate any still-broad reconnaissance or multi-gate validation before continuing.`)
            state.primaryBoundaryNoticeSent = true
          }
          return
        }
        if (!CHILD_AGENTS.has(state.agent)) return
        if (state.advisoryNotices.length > 0) output.system.push(...state.advisoryNotices.splice(0))
        const limit = policy.childToolCalls[state.agent]
        const used = state.childCalls.size
        if (state.childTerminalReason) {
          output.system.push(`OPERATIONAL GUARD: TERMINAL RETRY BREAKER ACTIVE (${state.childTerminalReason}). Do not call any tool. Return a concise BLOCKED/FAIL handoff now with the role-specific OPERATIONAL_RESULT, OPERATIONAL_REVIEW, or OPERATIONAL_EXPLORE marker and actual counts.`)
        } else if (used >= limit) {
          output.system.push(`OPERATIONAL ADVISORY: ${state.agent} has used ${used}/${limit} expected tool calls. Synthesize if the question is answered; otherwise continue only with the smallest necessary call.`)
        } else if (used >= Math.max(1, limit - 4)) {
          output.system.push(`OPERATIONAL GUARD: ${limit - used} ${state.agent} tool calls remain. Stop reconnaissance and synthesize before the budget is exhausted.`)
        }
      } finally {
        // This plugin must remain last. Strict chat templates accept exactly one
        // leading system message, so collapse all earlier plugin augmentation.
        coalesceSystemMessages(output)
        // Reinforce the todo ledger on the collapsed primary element without
        // adding a second system-message element.
        await injectTodoLedgerReminder(input, output, states, client)
      }
    },

    "experimental.session.compacting": async (input, output) => {
      await safetyStore.load()
      const state = stateFor(states, input.sessionID)
      const safety = serializedSafetyState(states.safety)
      output.context.push([
        "## Operational schema continuity",
        "Continue in this same session after compaction; do not emit a session-close handoff or ask for a new primary session.",
        `Workspace: ${resolve(directory)}`,
        `Authority: ${safety.authorityBinding ?? "unbound"}`,
        `Authority admission: ${safety.authorityStatus ?? "not-required"}; mode: ${safety.authorityMode ?? "none"}; observed HEAD: ${safety.observedHead ?? "unknown"}.`,
        `Edit generation: ${safety.editGeneration}; Fresh-review generation: ${safety.reviewedGeneration}; Verify generation: ${safety.verifiedGeneration}.`,
        `High-risk edit: ${safety.highRiskEdit}; edited paths: ${safety.editedPaths.slice(0, 12).join(", ") || "none"}.`,
        `Routing debt: ${state.routingDebt ?? "none"}; direct validations in packet: ${state.directValidations}; primary calls since boundary: ${state.primaryCallsSinceBoundary}.`,
        "A commit or push remains blocked whenever the persisted review/verify generations trail the edit generation.",
      ].join("\n"))
      state.compactionRequested = false
    },

    "experimental.compaction.autocontinue": async (_input, output) => {
      output.enabled = true
    },

    "tool.execute.before": async (input, output) => {
      if (bypass) return
      await safetyStore.load()
      const state = stateFor(states, input.sessionID)
      const tool = String(input.tool ?? "").toLowerCase()

      if (policy.primaryContextError) {
        throw new Error(`Operational schema guard: context policy initialization failed closed (${policy.primaryContextError}). No tools are admitted in this plugin process; correct the live configuration and start a genuinely fresh OpenCode process.`)
      }

      const contextBudget = PRIMARY_AGENTS.has(state.agent) ? primaryContextPolicyForAgent(policy, state.agent) : undefined
      if (contextBudget && state.lastInputTokens >= contextBudget.hardLimitTokens) {
        state.compactionRequested = true
        throw new Error(`Operational schema guard: emergency context ceiling reached ${state.lastInputTokens} tokens at initialization-derived model input limit ${contextBudget.hardLimitTokens} (${contextBudget.model}), indicating native compaction has not completed. Call no more tools, do not write a handoff, and end this turn concisely; OpenCode must compact and auto-continue this same session.`)
      }

      if (INTERACTIVE_TOOLS.has(tool)) {
        const questions = output.args?.questions
        const hasQuestion = Array.isArray(questions) && questions.some((question) => typeof question?.question === "string" && question.question.trim().length > 0)
        if (!hasQuestion) {
          const correctionCode = "RESPOND_OR_ASK_NONEMPTY"
          recordGuardEvent(state, "malformed-interactive-invocation", { tool, correctionCode, terminal: false })
          throw new Error(`Operational schema guard: ${correctionMarker(correctionCode)} ${tool} requires at least one question. If the final response is ready, answer directly in this turn; otherwise issue one non-empty question. This rejects only the malformed invocation.`)
        }
      }

      if (tool === "task") {
        const normalized = normalizeTaskPacket(output.args, policy)
        output.args = normalized.args
        try {
          validateTaskPacket(output.args, policy)
          await validateChildPlan(output.args, directory)
        } catch (error) {
          if (error?.code === "known-exact-lookup" && canRerouteExhaustedExactLookup(state, String(output.args?.prompt ?? ""), directory, policy)) {
            normalized.normalizations.push("exact-lookup-rerouted-after-reopen-exhaustion")
          } else {
          if (error?.code === "partition-required" && String(output.args?.subagent_type ?? "") === "explore") {
            state.routingDebt = "rejected broad Explore packet requires partitioning"
          }
          state.taskPacketNotice = `OPERATIONAL GUARD: the previous Task packet failed preflight. Rebuild it before retrying: one-line Scope, 1-3 Questions, Stop condition; target limits are Explore ${policy.taskExplicitTargets.explore}, Verify ${policy.taskExplicitTargets.verify}, Fresh-review ${policy.taskExplicitTargets["fresh-review"]}. Put larger Verify path/command sets in /tmp/opencode/verify/<packet>/ manifests.`
          throw error
          }
        }
        state.taskPacketNotice = undefined
        const type = String(output.args?.subagent_type ?? "")
        const prompt = String(output.args?.prompt ?? "")
        const scopeIdentity = taskScopeIdentity(type, prompt)
        const resumeTaskID = String(output.args?.task_id ?? "").trim() || undefined
        if (resumeTaskID) {
          const resumable = state.resumableTasks.get(resumeTaskID)
          if (!resumable) {
            throw taskError(`task_id ${resumeTaskID} is not an admitted resumable failure in this parent session. OpenCode silently creates a fresh child for unknown IDs, so this invocation is blocked fail-closed.`, "resume-not-admitted")
          }
          if (!resumable.resumeAllowed || resumable.attempts >= 1) {
            throw taskError(`task_id ${resumeTaskID} has exhausted its single bounded resume attempt.`, "resume-exhausted")
          }
          if (resumable.type !== type) {
            throw taskError(`task_id ${resumeTaskID} belongs to ${resumable.type}, not ${type}. Resume must preserve subagent_type.`, "resume-type-mismatch")
          }
          if (resumable.scopeIdentity !== scopeIdentity) {
            throw taskError(`task_id ${resumeTaskID} does not match this normalized Scope. Resume must preserve the original one-line Scope exactly apart from case and whitespace.`, "resume-scope-mismatch")
          }
          resumable.attempts += 1
          resumable.resumeAllowed = false
        }
        state.pendingTasks.set(input.callID, {
          type,
          prompt,
          scopeIdentity,
          resumeTaskID,
          normalizations: normalized.normalizations,
          provenance: admissionSummary(state),
        })
        return
      }

      if (CHILD_AGENTS.has(state.agent)) {
        const capabilityError = childInvocationCapabilityError(state.agent, tool, output.args, directory)
        if (capabilityError) {
          const fingerprint = invocationFingerprint(tool, output.args)
          const rejections = state.childCapabilityRejections.get(fingerprint) ?? 0
          const correctionCode = capabilityCorrectionCode(capabilityError)
          state.childCapabilityRejections.set(fingerprint, rejections + 1)
          recordGuardEvent(state, "child-capability-mismatch", { tool, fingerprint, attempt: rejections + 1, terminal: false, correctionCode })
          throw new Error(`Operational schema guard: OPERATIONAL_CHILD_BLOCK: PERMISSION; capability=${state.agent}; replacement_required=true; ${correctionMarker(correctionCode)} ${capabilityError} This rejects only the unsafe invocation and does not consume the normal child tool budget.`)
        }
        if (state.childTerminalReason) {
          throw new Error(`Operational schema guard: TERMINAL RETRY BREAKER ACTIVE (${state.childTerminalReason}). All further tools are blocked; return the required final handoff now.`)
        }
        const fingerprint = invocationFingerprint(tool, output.args)
        const attempts = state.childInvocationCounts.get(fingerprint) ?? 0
        if (attempts >= policy.childDuplicateInvocationLimit) {
          enqueueAdvisory(state, `OPERATIONAL ADVISORY: repeated failed ${tool} invocation. Change the approach if the failure is unchanged.`, "child-duplicate-failed")
        }
        state.childInvocationCounts.set(fingerprint, attempts + 1)
        state.childCallFingerprints.set(input.callID, fingerprint)
        if (state.childSuccessfulInvocations.has(fingerprint)) {
          recordGuardEvent(state, "child-successful-duplicate", { tool, fingerprint, attempt: attempts + 1, terminal: false })
          throw new Error(`Operational schema guard: this ${tool} invocation already completed successfully. Empty command output is success when OPERATIONAL_STATUS reports exit=0; do not rerun it.`)
        }
        if ((tool === "bash" || tool === "shell") && hasUnquotedShellOperator(String(output.args?.command ?? ""))) {
          const key = `shell-shape:${fingerprint}`
          const rejections = state.childCapabilityRejections.get(key) ?? 0
          state.childCapabilityRejections.set(key, rejections + 1)
          recordGuardEvent(state, "child-shell-shape", { tool, fingerprint, attempt: rejections + 1, terminal: false, correctionCode: "SPLIT_TO_BARE_CALLS" })
          throw new Error(`Operational schema guard: ${correctionMarker("SPLIT_TO_BARE_CALLS")} child shell calls must be one bare allowlisted invocation. Do not append ; echo, &&, pipes, redirects, command substitutions, or another command; OpenCode already records the exit status in tool metadata. This rejects only the malformed invocation.`)
        }
        if ((tool === "bash" || tool === "shell") && SHELL_STATUS_PROBE.test(String(output.args?.command ?? "").trim())) {
          throw new Error("Operational schema guard: standalone echo/printf exit-status probes are redundant and blocked. Read the preceding tool call's recorded status; do not spend another tool call reconstructing `$?`.")
        }
        if (state.agent === "verify" && (tool === "bash" || tool === "shell")) {
          const wrapperError = verifyDisposableCommandError(String(output.args?.command ?? ""))
          if (wrapperError) throw new Error(`Operational schema guard: ${wrapperError}`)
        }
        const limit = policy.childToolCalls[state.agent]
        if (!state.childCalls.has(input.callID) && state.childCalls.size >= limit) {
          state.childBudgetExhausted = true
          enqueueAdvisory(state, `OPERATIONAL ADVISORY: ${state.agent} exceeded the expected ${limit}-call budget; continue only if another call is necessary to answer the delegated question.`, "child-tool-budget-advisory", { observedCallCount: state.childCalls.size + 1, threshold: limit })
        }
        state.childCalls.add(input.callID)
        if (state.agent !== "verify") {
          for (const path of reconPaths(tool, output.args, directory)) state.observedPaths.add(path)
        }
        return
      }

      if (!PRIMARY_AGENTS.has(state.agent)) return

      const authorityPending = state.authorityBinding && state.authorityStatus !== "verified"
      const authorityCommand = tool === "bash" || tool === "shell" ? String(output.args?.command ?? "") : ""
      const localAssessmentError = authorityCommand ? localAssessmentCommandError(authorityCommand) : undefined
      if (localAssessmentError) throw new Error(`Operational schema guard: ${localAssessmentError}`)
      const reconciliationError = authorityCommand ? ownerBaseReconciliationCommandError(authorityCommand) : undefined
      if (reconciliationError) throw new Error(`Operational schema guard: ${reconciliationError}`)
      const reconciliationInvocation = authorityCommand ? ownerBaseReconciliationInvocation(authorityCommand) : undefined
      if (reconciliationInvocation && state.authorityBinding && state.authorityMode !== "target") {
        throw new Error("Operational schema guard: owner-base reconciliation is available only for exact-head target authority; strict starting-head mismatches still require new user authority.")
      }
      if (reconciliationInvocation && state.authorityMode === "target" && reconciliationInvocation.expectedTargetSha !== state.authorityBinding) {
        throw new Error(`Operational schema guard: owner-base reconciliation target ${reconciliationInvocation.expectedTargetSha} does not match persisted exact-head target ${state.authorityBinding}.`)
      }
      if (authorityPending && EDIT_TOOLS.has(tool) && invocationOwnedByWorkspace(tool, output.args, directory)) {
        const path = editPath(output.args, directory)
        const externalTemporaryPath = path && isInsideDirectory(path, "/tmp") && !isInsideDirectory(path, directory)
        if (!externalTemporaryPath) {
          throw new Error(`Operational schema guard: exact-head admission is ${state.authorityStatus} for ${state.authorityBinding}. Prove the required HEAD before editing; a strict-start mismatch requires new user authority.`)
        }
      }
      if (authorityPending && authorityCommand) {
        const mutation = authorityMutationCommand(authorityCommand) || Boolean(workspaceMutationReason(authorityCommand)) || containsPublishCommand(authorityCommand)
        const allowedTarget = state.authorityMode === "target" && authorityTargetingCommand(authorityCommand, state.authorityBinding)
        if (state.authorityMode === "strict-start" && !exactHeadProofOnly(authorityCommand) && /git\s+rev-parse\s+HEAD/i.test(authorityCommand)) {
          throw new Error(`Operational schema guard: strict starting-head proof must be one bare native git rev-parse HEAD invocation so the observed SHA is unambiguous. Required HEAD: ${state.authorityBinding}.`)
        }
        if (mutation && invocationOwnedByWorkspace(tool, output.args, directory) && !allowedTarget) {
          throw new Error(`Operational schema guard: exact-head admission is ${state.authorityStatus} (${state.authorityMode}) for ${state.authorityBinding}. ${state.authorityMode === "strict-start" ? "Checkout, merge, worktree, edit, commit, and push are blocked until a bare git rev-parse HEAD matches; a mismatch requires new user authority." : targetRecoveryGuidance(state.authorityBinding)}`)
        }
      }
      if (!EDIT_TOOLS.has(tool) && !INTERACTIVE_TOOLS.has(tool) && !isStagingInvocation(tool, output.args, directory) && state.primaryCallsSinceBoundary >= policy.primaryOperationHardLimit) {
        enqueueAdvisory(state, `OPERATIONAL ADVISORY: ${state.primaryCallsSinceBoundary} primary calls have accumulated. Partition remaining broad work when that will reduce context.`, "primary-operation-advisory")
      }

      const command = tool === "bash" || tool === "shell" ? String(output.args?.command ?? "") : ""
      const mutationReason = command ? workspaceMutationReason(command) : undefined
      const validations = command ? validationCount(command) : 0
      const publish = command ? containsPublishCommand(command) : false
      if (command) {
        if (/(?:^|[;&|]\s*)(?:bash|sh)\s+\/tmp\/[a-zA-Z0-9_.-]+\.sh/i.test(command)) {
          throw new Error("Operational schema guard: executing generated temporary shell scripts (e.g., /tmp/*.sh) is strictly prohibited to prevent operational-guard evasion. Execute commands directly in the shell or use the mandated node helpers.")
        }

        const segments = primaryShellSegments(command)
        if (segments.length > policy.primaryShellSegmentLimit) {
          const preview = segments.slice(0, 6).map((segment, index) => `${index + 1}:${clipped(segment, 80)}`).join(" | ")
          enqueueAdvisory(state, `OPERATIONAL ADVISORY: shell packet has ${segments.length} substantive commands (expected ${policy.primaryShellSegmentLimit}); consider splitting at ${preview}.`, "primary-shell-advisory")
        }
        if (validations > 0 && state.directValidations + validations > policy.primaryValidationLimit) {
          enqueueAdvisory(state, `OPERATIONAL ADVISORY: direct validation count exceeds ${policy.primaryValidationLimit}; use Verify when it will isolate noisy multi-gate output.`, "primary-validation-advisory")
        }
        if (publish && (mutationReason || requiresIndependentGates(state, policy))) {
          if (mutationReason || state.reviewedGeneration < state.editGeneration) {
            throw new Error(`Operational schema guard: multi-file, shell-mutating, or high-risk production changes require a CLEAN fresh-review after the latest content edit before commit or push. editGeneration=${state.editGeneration}; reviewedGeneration=${state.reviewedGeneration}; verifiedGeneration=${state.verifiedGeneration}. Fresh-review and Verify may run in either order.`)
          }
          if (state.verifiedGeneration < state.editGeneration) {
            throw new Error(`Operational schema guard: multi-file, shell-mutating, or high-risk production changes require a PASS Verify after the latest content edit before commit or push. editGeneration=${state.editGeneration}; reviewedGeneration=${state.reviewedGeneration}; verifiedGeneration=${state.verifiedGeneration}. Fresh-review and Verify may run in either order; a content-neutral commit does not create a new edit generation.`)
          }
        }
      }

      if (state.routingDebt && isReconInvocation(tool, output.args)) {
        enqueueAdvisory(state, "OPERATIONAL ADVISORY: a prior broad Explore packet was rejected; keep direct reconnaissance bounded or submit a smaller packet.", "routing-debt-advisory")
      }

      if (isReconInvocation(tool, output.args)) {
        for (const path of reconPaths(tool, output.args, directory)) {
          for (const packet of [...state.delegatedPackets].reverse()) {
            if (!packet.paths.has(path) || packet.reopened.has(path)) continue
            if (packet.reopened.size >= policy.parentReopenLimit) {
              if (boundedExactRange(tool, output.args) && packet.exactRangeReopens < policy.parentExactRangeReopenLimit) {
                packet.exactRangeReopens += 1
                packet.reopened.add(path)
                break
              }
              enqueueAdvisory(state, `OPERATIONAL ADVISORY: parent reopened ${packet.reopened.size} child-covered paths; prefer a narrow follow-up if more coverage is needed.`, "parent-reopen-advisory")
              packet.reopened.add(path)
              break
            }
            packet.reopened.add(path)
            break
          }
          if (!state.primaryReads.has(path) && state.primaryReads.size >= policy.primaryReadHardLimit) {
            enqueueAdvisory(state, `OPERATIONAL ADVISORY: ${state.primaryReads.size} unique reconnaissance targets inspected; delegate only if remaining mapping is still broad.`, "primary-read-advisory")
          }
          state.primaryReads.add(path)
        }
      }

      let implementationBoundary = false
      if (EDIT_TOOLS.has(tool)) {
        const path = editPath(output.args, directory)
        if (invocationOwnedByWorkspace(tool, output.args, directory)) {
          recordImplementationEdit(state, path)
          implementationBoundary = true
          await safetyStore.save()
        } else {
          enqueueAdvisory(state, `OPERATIONAL ADVISORY: external edit ${path ?? "unknown"} is outside workspace authority and was not added to this campaign.`, "external-edit-unattested")
        }
      }

      if (mutationReason && !isStagingInvocation(tool, output.args, directory)) {
        if (invocationOwnedByWorkspace(tool, output.args, directory)) {
          recordImplementationEdit(state, undefined, { highRisk: true })
          implementationBoundary = true
          await safetyStore.save()
        } else enqueueAdvisory(state, "OPERATIONAL ADVISORY: external shell mutation is outside workspace authority and was not attested by this campaign.", "external-mutation-unattested")
      }
      if (command && invocationOwnedByWorkspace(tool, output.args, directory) && headChangingCommand(command)) {
        state.taskWorkspaceHead = undefined
        state.taskWorkspaceHeadStatus = "unknown"
        await safetyStore.save()
      }
      if (validations > 0) state.directValidations += validations
      if (!implementationBoundary) state.primaryCallsSinceBoundary += 1
    },

    "tool.execute.after": async (input, output) => {
      if (bypass) return
      const state = stateFor(states, input.sessionID)
      const tool = String(input.tool ?? "").toLowerCase()

      if (PRIMARY_AGENTS.has(state.agent) && (tool === "bash" || tool === "shell")) {
        const command = String(input.args?.command ?? "")
        const assessment = localAssessmentInvocation(command)
        const terminal = assessment ? assessmentTerminalResult(output?.output) : undefined
        if (terminal && state.authorityMode === "target") {
          if (terminal === "STALE") {
            output.output = `${String(output.output ?? "")}${String(output.output ?? "").endsWith("\n") ? "" : "\n"}OPERATIONAL_TARGET_LIFECYCLE: ASSESSMENT_TERMINAL -> OWNER_RECONCILIATION; target=${state.authorityBinding}`
          } else if (releaseTargetAuthority(state)) {
            output.output = `${String(output.output ?? "")}${String(output.output ?? "").endsWith("\n") ? "" : "\n"}OPERATIONAL_TARGET_LIFECYCLE: ASSESSMENT_TERMINAL -> TARGET_RELEASED; result=${terminal}`
          }
          await safetyStore.save()
        }

        const reconciliation = ownerBaseReconciliationInvocation(command)
        const reconciliationResult = reconciliation && Number(output?.metadata?.exit) === 0 ? ownerBaseReconciliationResult(output?.output) : undefined
        if (reconciliationResult) {
          state.taskWorkspaceHead = reconciliationResult.baseSha
          state.taskWorkspaceHeadStatus = "proven"
          if (releaseTargetAuthority(state)) {
            output.output = `${String(output.output ?? "")}${String(output.output ?? "").endsWith("\n") ? "" : "\n"}OPERATIONAL_TARGET_LIFECYCLE: OWNER_RECONCILIATION -> TARGET_RELEASED; base=${reconciliationResult.baseSha}`
          }
          await safetyStore.save()
        }
      }

      if (tool === "task") {
        const task = state.pendingTasks.get(input.callID)
        if (!task) return
        // OpenCode's internal command/Task path invokes this hook with an
        // undefined result before publishing the terminal ToolPart error.
        // Preserve the pending record for that event and never mask the
        // provider's original failure by mutating an absent output object.
        if (!output) return
        state.pendingTasks.delete(input.callID)
        const childSessionID = output?.metadata?.sessionId ?? output?.metadata?.sessionID
        const childState = childSessionID ? states.get(childSessionID) : undefined
        const health = childResultHealth(output, task.type, childSessionID, childState, policy)
        if (task.resumeTaskID && childSessionID !== task.resumeTaskID) {
          health.healthy = false
          health.reasons.push("resume-session-mismatch")
        }
        const normalizationPrefix = task.normalizations.length > 0
          ? `OPERATIONAL GUARD: Task packet normalized before launch (${task.normalizations.join(", ")}). Scope and the first three questions were authoritative; deferred items remain unresolved.\n\n`
          : ""
        if (!health.healthy) {
          const limit = childResultLimit(task.type, policy)
          const boundedText = health.text.length > limit ? `${health.text.slice(0, limit)}\n\n[child result clipped by operational guard]` : health.text
          output.metadata = { ...(output.metadata ?? {}), operationalSchema: { ...task.provenance, complete: false, transportComplete: false, boundaryReset: false, outcome: "unknown", preflightNormalizations: task.normalizations, guardEvents: childState?.guardEvents ?? [], reasons: health.reasons } }
          output.output = `${normalizationPrefix}OPERATIONAL GUARD: DELEGATION INCOMPLETE (${health.reasons.join(", ")}). Do not treat this child result as authoritative completion and do not repeat its broad reconnaissance in the parent. Split unresolved questions into smaller fresh child packets.\n\n${boundedText}`
          return
        }

        if (task.resumeTaskID) state.resumableTasks.delete(task.resumeTaskID)

        if (task.type === "verify") {
          const result = verificationOutcome(health.text)
          const complete = result.reasons.length === 0
          output.metadata = {
            ...(output.metadata ?? {}),
            operationalSchema: {
              ...task.provenance,
              complete,
              transportComplete: true,
              boundaryReset: complete,
              outcome: result.outcome,
              commandsRun: result.commandsRun,
              commandsRequired: result.commandsRequired,
              pathCount: 0,
              preflightNormalizations: task.normalizations,
              guardEvents: childState?.guardEvents ?? [],
              reasons: result.reasons,
            },
          }
          if (complete) {
            state.verifiedGeneration = state.editGeneration
            completeDelegationBoundary(state)
            await safetyStore.save()
            if (normalizationPrefix) output.output = `${normalizationPrefix}${health.text}`
          } else {
            output.output = `${normalizationPrefix}OPERATIONAL GUARD: VERIFICATION GATE NOT SATISFIED (${result.reasons.join(", ")}). The child transport completed, but only an explicit PASS with matching nonzero command counts can satisfy Verify.\n\n${health.text}`
          }
          return
        }

        const result = task.type === "fresh-review" ? reviewOutcome(health.text) : exploreOutcome(health.text)
        const complete = result.reasons.length === 0
        const pathLimit = policy.delegatedPathLimit[task.type]
        const handoffBatch = workspacePathBatch(String(output.output ?? ""), directory, pathLimit)
        const paths = handoffBatch.paths
        for (const path of childState?.observedPaths ?? []) {
          if (paths.size >= pathLimit) break
          if (isInsideDirectory(path, directory)) paths.add(path)
        }
        if (complete) {
          state.delegatedPackets.push({ type: task.type, paths, reopened: new Set(), exactRangeReopens: 0 })
          completeDelegationBoundary(state)
          if (task.type === "explore") state.routingDebt = undefined
          if (task.type === "fresh-review") {
            state.reviewedGeneration = state.editGeneration
            await safetyStore.save()
          }
        }
        output.metadata = { ...(output.metadata ?? {}), operationalSchema: { ...task.provenance, complete, transportComplete: true, boundaryReset: complete, outcome: result.outcome, targetsInspected: result.inspected, targetsRequired: result.required, pathCount: paths.size, pathOverflow: handoffBatch.overflow || Boolean(childState?.observedPathOverflow), preflightNormalizations: task.normalizations, guardEvents: childState?.guardEvents ?? [], reasons: result.reasons } }
        if (complete) {
          if (normalizationPrefix) output.output = `${normalizationPrefix}${output.output}`
        } else {
          output.output = `${normalizationPrefix}OPERATIONAL GUARD: ${task.type === "fresh-review" ? "REVIEW GATE" : "EXPLORATION BOUNDARY"} NOT SATISFIED (${result.reasons.join(", ")}). Retain the bounded evidence, but do not treat the delegated scope as complete.\n\n${health.text}`
        }
        return
      }

      // A successful native todowrite is an authoritative ledger transition;
      // reconcile the per-session cache from its validated args without
      // rewriting them.
      if (tool === "todowrite") observeTodoWrite(state, input.args)

      if (PRIMARY_AGENTS.has(state.agent) && (tool === "bash" || tool === "shell") && Number(output?.metadata?.exit) === 0) {
        const command = String(input.args?.command ?? "")
        const ownedInvocation = invocationOwnedByWorkspace(tool, input.args, directory)
        if (ownedInvocation && containsPublishCommand(command) && state.campaignActive) {
          state.campaignPublished = true
          await safetyStore.save()
        }
        const identityHead = ownedInvocation ? workspaceIdentityHead(command, output.output) : undefined
        if (identityHead) {
          state.taskWorkspaceHead = identityHead
          state.taskWorkspaceHeadStatus = "proven"
          await safetyStore.save()
        }
        const cleanHead = ownedInvocation ? cleanWorkspaceIdentity(command, output.output) : undefined
        if (cleanHead && state.campaignActive && state.campaignPublished && cleanHead !== state.campaignBaseHead) {
          resetCampaign(state, cleanHead)
          state.observedHead = cleanHead
          output.output = `${String(output.output ?? "")}${String(output.output ?? "").endsWith("\n") ? "" : "\n"}OPERATIONAL_CAMPAIGN: closed; head=${cleanHead}`
          await safetyStore.save()
        }
        const proof = exactHeadProofOnly(command)
        if (proof) {
          const observed = observedHeadFromOutput(output.output)
          state.taskWorkspaceHead = observed
          state.taskWorkspaceHeadStatus = observed ? "proven" : "unknown"
          if (state.authorityBinding) {
            state.observedHead = observed
            state.authorityStatus = observed === state.authorityBinding ? "verified" : "mismatch"
            if (state.authorityStatus === "verified") state.admissionObservedHead = observed
          }
          output.metadata = { ...(output.metadata ?? {}), operationalSchema: { ...(output.metadata?.operationalSchema ?? {}), ...admissionSummary(state) } }
          if (state.authorityBinding) {
            output.output = `${String(output.output ?? "")}${String(output.output ?? "").endsWith("\n") ? "" : "\n"}OPERATIONAL_AUTHORITY: ${state.authorityStatus}; required=${state.authorityBinding}; observed=${observed ?? "unresolved"}; mode=${state.authorityMode}`
            if (state.authorityStatus === "mismatch" && state.authorityMode === "target") {
              output.output += `\nOPERATIONAL_NEXT: ${targetRecoveryGuidance(state.authorityBinding)}`
            }
          }
          await safetyStore.save()
        }
      }

      if (CHILD_AGENTS.has(state.agent) && tool !== "bash" && tool !== "shell") {
        const fingerprint = state.childCallFingerprints.get(input.callID)
        if (fingerprint) state.childSuccessfulInvocations.add(fingerprint)
      }

      if (CHILD_AGENTS.has(state.agent) && (tool === "bash" || tool === "shell")) {
        const exit = Number(output?.metadata?.exit)
        if (exit === 0) {
          const fingerprint = state.childCallFingerprints.get(input.callID)
          if (fingerprint) state.childSuccessfulInvocations.add(fingerprint)
          if (!String(output.output ?? "").trim()) {
            output.output = "OPERATIONAL_STATUS: completed; exit=0; output=empty"
          }
        }
      }

      if (CHILD_AGENTS.has(state.agent) && state.agent !== "verify" && isReconInvocation(tool, input.args)) {
        const limit = policy.delegatedPathLimit[state.agent]
        const batch = workspacePathBatch(String(output.output ?? ""), directory, limit)
        state.observedPathOverflow ||= batch.overflow
        for (const path of batch.paths) {
          if (state.observedPaths.size >= limit) break
          state.observedPaths.add(path)
        }
        return
      }

      if (!PRIMARY_AGENTS.has(state.agent) || !isReconInvocation(tool, input.args)) return
      if (state.primaryReads.size === policy.primaryReadWarning) {
        output.output = `${String(output.output ?? "")}\n\nOPERATIONAL GUARD: ROUTING CHECKPOINT. This primary work packet has now read ${state.primaryReads.size} unique files. If the remaining path is not already known and bounded, delegate it to a fresh Explore child before reading further.`
      }
    },

    event: async ({ event }) => {
      if (event?.type === "message.part.updated") {
        const part = event?.properties?.part
        const sessionID = part?.sessionID ?? part?.sessionId
        const messageID = part?.messageID ?? part?.messageId
        if (sessionID && messageID) {
          const state = stateFor(states, sessionID)
          const evidence = state.assistantOutputByMessage.get(messageID) ?? { text: false, tool: false }
          if (part?.type === "text" && String(part?.text ?? "").trim()) evidence.text = true
          if (/^tool(?:$|-)/.test(String(part?.type ?? ""))) evidence.tool = true
          state.assistantOutputByMessage.set(messageID, evidence)

          const tool = String(part?.tool ?? part?.name ?? "").toLowerCase()
          const status = String(part?.state?.status ?? "").toLowerCase()
          const callID = part?.callID ?? part?.callId
          if (PRIMARY_AGENTS.has(state.agent) && tool === "task" && status === "error" && callID) {
            const task = state.pendingTasks.get(callID)
            if (task) {
              state.pendingTasks.delete(callID)
              const rawError = part?.state?.error?.message ?? part?.state?.error ?? part?.error?.message ?? part?.error ?? ""
              const taskID = taskIDFromFailure(rawError)
              const classification = classifyTaskFailure(rawError)
              const resumed = Boolean(task.resumeTaskID)
              if (resumed) state.resumableTasks.delete(task.resumeTaskID)
              if (classification === "transient" && taskID && !resumed) {
                state.resumableTasks.set(taskID, {
                  type: task.type,
                  scopeIdentity: task.scopeIdentity,
                  attempts: 0,
                  resumeAllowed: true,
                })
              }
              state.taskFailureNotice = taskFailureGuidance({ classification, taskID, task, resumed })
            }
          }
        }
        return
      }
      if (event?.type === "message.updated") {
        const info = event?.properties?.info
        const sessionID = info?.sessionID ?? info?.sessionId
        if (sessionID && info?.role === "assistant" && info?.finish) {
          const state = stateFor(states, sessionID)
          state.lastAssistantFinish = String(info.finish)
          const messageID = info?.id
          const evidence = messageID ? state.assistantOutputByMessage.get(messageID) : undefined
          state.lengthRecoveryPending = PRIMARY_AGENTS.has(state.agent)
            && String(info.finish) === "length"
            && !evidence?.text
            && !evidence?.tool
          if (messageID) state.assistantOutputByMessage.delete(messageID)
          const inputTokens = Number(info?.tokens?.input)
          if (Number.isFinite(inputTokens) && inputTokens >= 0) {
            state.lastInputTokens = inputTokens
            const contextBudget = primaryContextPolicyForAgent(policy, state.agent)
            if (!contextBudget || inputTokens < contextBudget.warningTokens) {
              state.contextNoticeSent = false
              state.compactionRequested = false
            }
          }
        }
        return
      }
      if (event?.type === "todo.updated") {
        const sessionID = event?.properties?.sessionID
        if (sessionID) observeTodoUpdated(stateFor(states, sessionID), event)
        return
      }
      if (event?.type === "session.idle") {
        const sessionID = event?.properties?.sessionID
        if (sessionID) await maybeWarnIdle(states, client, sessionID)
        return
      }
      if (event?.type === "session.deleted") {
        const sessionID = event?.properties?.info?.id ?? event?.properties?.sessionID
        if (sessionID) states.delete(sessionID)
      }
    },
    dispose: () => {
      // Drop all per-session caches; the guard holds no cross-session ledger.
      for (const sessionID of states.keys()) states.delete(sessionID)
    },
  }
}
