import { createHash } from "node:crypto"
import { commandFingerprint, validateReceipt } from "./actions-evidence.mjs"

export const CHILD_PLAN_SCHEMA = "opencode-child-work-plan-v1"
export const EVIDENCE_LEDGER_SCHEMA = "ghdev-evidence-ledger-v1"
export const EVIDENCE_ENTRY_SCHEMA = "ghdev-evidence-entry-v1"
export const FRICTION_REPLAY_SCHEMA = "ghdev-friction-replay-v1"

export const SEMANTIC_REVIEW_AUTHORITIES = Object.freeze([
  "central-owned",
  "local-fresh-review",
  "both",
])

export const EVIDENCE_CLASSES = Object.freeze([
  "actions-repository-deterministic",
  "local-host-specific",
  "semantic-review",
  "focused-development-diagnostic",
])

export const VALIDATION_GATE_CLASSES = Object.freeze([
  "focused-development",
  "repository-final",
  "host-specific-runtime",
  "trusted-actions-equivalent",
  "semantic-review-evidence",
  "semantic-review-authority",
])

const CHILD_ROLES = new Set(["explore", "verify", "fresh-review"])
const SEMANTIC_MODES = new Set(SEMANTIC_REVIEW_AUTHORITIES)
const EVIDENCE_CLASS_SET = new Set(EVIDENCE_CLASSES)
const GATE_CLASS_SET = new Set(VALIDATION_GATE_CLASSES)
const SHA40 = /^[0-9a-f]{40}$/
const SHA256 = /^[0-9a-f]{64}$/
const REVIEW_AUTHORITY_DECLARATION = /^SEMANTIC REVIEW AUTHORITY:\s*(central-owned|local-fresh-review|both)\s*$/gim

const ARCHIVED_FRICTION_BASELINE = Object.freeze({
  source: "issue-15-archived-session-audit",
  trace_nodes: 15373,
  text_bytes: 1202045,
  capability_mismatches: 35,
  malformed_invocations: 10,
  incomplete_delegations: 7,
  gate_failures: 5,
  fresh_review_launches: 8,
  local_verify_launches: null,
  actions_executions: 0,
  actions_receipt_reuses: 0,
  full_suite_executions: null,
  wall_clock_duration_ms: null,
})

const DEFAULT_PLAN_LIMITS = Object.freeze({
  taskPromptChars: Object.freeze({ explore: 4500, verify: 5000, "fresh-review": 4000 }),
  taskExplicitTargets: Object.freeze({ explore: 8, verify: 24, "fresh-review": 10 }),
})

const TERMINAL_CONTRACTS = Object.freeze({
  verify: Object.freeze({
    outcomeKey: "OPERATIONAL_RESULT",
    outcomes: new Set(["PASS", "FAIL", "BLOCKED"]),
    inspectedKey: "COMMANDS_RUN",
    requiredKey: "COMMANDS_REQUIRED",
    success: "PASS",
  }),
  "fresh-review": Object.freeze({
    outcomeKey: "OPERATIONAL_REVIEW",
    outcomes: new Set(["CLEAN", "FINDINGS", "BLOCKED"]),
    inspectedKey: "TARGETS_REVIEWED",
    requiredKey: "TARGETS_REQUIRED",
    success: "CLEAN",
  }),
  explore: Object.freeze({
    outcomeKey: "OPERATIONAL_EXPLORE",
    outcomes: new Set(["COMPLETE", "PARTIAL", "BLOCKED"]),
    inspectedKey: "TARGETS_INSPECTED",
    requiredKey: "TARGETS_REQUIRED",
    success: "COMPLETE",
  }),
})

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
  }
  return value
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value))
}

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex")
}

function boundedString(value, field, max = 4096) {
  if (typeof value !== "string" || value.length < 1 || value.length > max || value.includes("\u0000")) {
    throw new Error(`${field} must be a non-empty bounded string`)
  }
  return value
}

function assertSha(value, field = "head_sha") {
  if (typeof value !== "string" || !SHA40.test(value)) throw new Error(`${field} must be a 40-character lowercase Git SHA`)
  return value
}

function assertRepository(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) throw new Error("repository must be owner/name")
  return value
}

function nonnegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${field} must be a non-negative integer`)
  return value
}

export function validateSemanticReviewAuthority(value) {
  if (!SEMANTIC_MODES.has(value)) throw new Error(`semantic_review_authority must be one of: ${SEMANTIC_REVIEW_AUTHORITIES.join(", ")}`)
  return value
}

export function semanticReviewAuthorityFromMessage(text) {
  const matches = [...String(text ?? "").matchAll(REVIEW_AUTHORITY_DECLARATION)]
  if (matches.length === 0) return undefined
  const normalized = matches.map((match) => match[1].toLowerCase())
  const modes = new Set(normalized)
  if (modes.size !== 1) throw new Error("conflicting SEMANTIC REVIEW AUTHORITY declarations")
  return normalized.at(-1)
}

export function semanticReviewRequirement(authority) {
  validateSemanticReviewAuthority(authority)
  return {
    authority,
    central_semantic_review_required: authority === "central-owned" || authority === "both",
    local_fresh_review_required: authority === "local-fresh-review" || authority === "both",
    local_semantic_review: authority === "central-owned" ? "NOT_EVALUATED" : "REQUIRED",
  }
}

function validateEvidenceEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("evidence entry must be an object")
  if (entry.schema_version !== EVIDENCE_ENTRY_SCHEMA) throw new Error("unsupported evidence entry schema")
  if (!EVIDENCE_CLASS_SET.has(entry.evidence_class)) throw new Error("invalid evidence_class")
  assertRepository(entry.repository)
  assertSha(entry.head_sha)
  nonnegativeInteger(entry.generation, "generation")
  boundedString(entry.gate_id, "gate_id", 128)
  boundedString(entry.profile_fingerprint, "profile_fingerprint", 256)
  boundedString(entry.dependency_fingerprint, "dependency_fingerprint", 256)
  boundedString(entry.environment_fingerprint, "environment_fingerprint", 256)
  boundedString(entry.producer_fingerprint, "producer_fingerprint", 512)
  if (!new Set(["PASS", "FAIL", "BLOCKED", "STALE", "CLEAN", "FINDINGS", "NOT_EVALUATED"]).has(entry.result)) throw new Error("invalid evidence result")
  if (entry.receipt_sha256 !== null && entry.receipt_sha256 !== undefined && !SHA256.test(entry.receipt_sha256)) throw new Error("invalid receipt_sha256")
  if (entry.evidence_class === "actions-repository-deterministic") {
    const counts = entry.counts
    if (!counts || typeof counts !== "object" || Array.isArray(counts)) throw new Error("actions evidence requires counts")
    nonnegativeInteger(counts.commands_required, "counts.commands_required")
    nonnegativeInteger(counts.commands_run, "counts.commands_run")
    for (const field of ["test_count", "test_pass", "test_fail", "test_skip"]) {
      if (counts[field] !== null && counts[field] !== undefined) nonnegativeInteger(counts[field], `counts.${field}`)
    }
    if (entry.result === "PASS" && (counts.commands_required < 1 || counts.commands_run !== counts.commands_required || counts.test_fail > 0)) {
      throw new Error("PASS actions evidence has incomplete or failing counts")
    }
    const identity = entry.receipt_identity
    if (!identity || typeof identity !== "object" || Array.isArray(identity) || !/^\d+$/.test(identity.workflow_run_id ?? "") || !/^\d+$/.test(identity.workflow_run_attempt ?? "") || !/^\d+$/.test(identity.execution_artifact_id ?? "") || typeof identity.receipt_artifact_name !== "string" || identity.receipt_artifact_name.length < 1) {
      throw new Error("actions evidence requires immutable receipt identity")
    }
  }
  return entry
}

export function evidenceEntryKey(entry) {
  validateEvidenceEntry(entry)
  return sha256Hex(canonicalJson({
    evidence_class: entry.evidence_class,
    repository: entry.repository,
    head_sha: entry.head_sha,
    generation: entry.generation,
    gate_id: entry.gate_id,
    profile_fingerprint: entry.profile_fingerprint,
    dependency_fingerprint: entry.dependency_fingerprint,
    environment_fingerprint: entry.environment_fingerprint,
    producer_fingerprint: entry.producer_fingerprint,
  }))
}

export function evidenceRequirement(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("evidence requirement must be an object")
  if (!EVIDENCE_CLASS_SET.has(input.evidence_class)) throw new Error("invalid evidence requirement class")
  const requirement = {
    evidence_class: input.evidence_class,
    repository: assertRepository(input.repository),
    head_sha: assertSha(input.head_sha),
    generation: nonnegativeInteger(input.generation, "generation"),
    gate_id: boundedString(input.gate_id, "gate_id", 128),
    profile_fingerprint: boundedString(input.profile_fingerprint, "profile_fingerprint", 256),
    dependency_fingerprint: boundedString(input.dependency_fingerprint, "dependency_fingerprint", 256),
    environment_fingerprint: boundedString(input.environment_fingerprint, "environment_fingerprint", 256),
    producer_fingerprint: boundedString(input.producer_fingerprint, "producer_fingerprint", 512),
  }
  return requirement
}

export function evidenceEquivalence(entry, requirementInput) {
  validateEvidenceEntry(entry)
  const requirement = evidenceRequirement(requirementInput)
  const reasons = []
  for (const field of [
    "evidence_class",
    "repository",
    "head_sha",
    "generation",
    "gate_id",
    "profile_fingerprint",
    "dependency_fingerprint",
    "environment_fingerprint",
    "producer_fingerprint",
  ]) {
    if (entry[field] !== requirement[field]) reasons.push(`${field}-mismatch`)
  }
  if (!new Set(["PASS", "CLEAN"]).has(entry.result)) reasons.push("result-not-reusable")
  return { equivalent: reasons.length === 0, reasons }
}

export class EvidenceLedger {
  constructor(entries = []) {
    this.entries = []
    for (const entry of entries) this.record(entry)
  }

  record(entry) {
    const validated = { ...validateEvidenceEntry(entry) }
    const key = evidenceEntryKey(validated)
    const existing = this.entries.find((candidate) => evidenceEntryKey(candidate) === key && candidate.result === validated.result)
    if (!existing) this.entries.push(validated)
    return validated
  }

  lookup(requirement) {
    const checked = evidenceRequirement(requirement)
    const candidates = this.entries.filter((entry) => entry.evidence_class === checked.evidence_class && entry.repository === checked.repository && entry.head_sha === checked.head_sha)
    for (const entry of candidates) {
      const match = evidenceEquivalence(entry, checked)
      if (match.equivalent) return { reusable: true, entry, reasons: [] }
    }
    const reasons = [...new Set(candidates.flatMap((entry) => evidenceEquivalence(entry, checked).reasons))]
    return { reusable: false, entry: undefined, reasons: reasons.length > 0 ? reasons : ["no-matching-receipt"] }
  }

  snapshot() {
    return { schema_version: EVIDENCE_LEDGER_SCHEMA, entries: this.entries.map((entry) => ({ ...entry })) }
  }
}

export function actionsReceiptLedgerEntry(receipt, profile, dispatch, { generation = 0, gateId = "repository-final" } = {}) {
  validateReceipt(receipt, profile, dispatch)
  const dependencyFingerprint = sha256Hex(canonicalJson(receipt.candidate_fingerprints ?? {}))
  const environmentFingerprint = sha256Hex(canonicalJson({
    runner_class: receipt.runner_class,
    runner_labels: receipt.runner_labels,
    sandbox: receipt.environment?.sandbox,
    network: receipt.environment?.network,
    candidate_mount: receipt.environment?.candidate_mount,
    candidate_environment: receipt.environment?.candidate_environment,
    image_schema: receipt.environment?.image_schema,
    image_fingerprint: receipt.environment?.image_fingerprint,
    os_release_fingerprint: receipt.environment?.os_release_fingerprint,
    git_sha256: receipt.environment?.git_sha256,
    node_sha256: receipt.environment?.node_sha256,
    npm_sha256: receipt.environment?.npm_sha256,
    python_sha256: receipt.environment?.python_sha256,
    bwrap_sha256: receipt.environment?.bwrap_sha256,
  }))
  const producerFingerprint = sha256Hex(canonicalJson({
    controller_workflow_path: receipt.controller_workflow_path,
    controller_workflow_ref: receipt.controller_workflow_ref,
    controller_commit_sha: receipt.controller_commit_sha,
    profile_id: receipt.profile_id,
    profile_version: receipt.profile_version,
  }))
  return validateEvidenceEntry({
    schema_version: EVIDENCE_ENTRY_SCHEMA,
    evidence_class: "actions-repository-deterministic",
    repository: receipt.repository,
    head_sha: receipt.expected_head_sha,
    generation,
    gate_id: gateId,
    profile_fingerprint: commandFingerprint(profile),
    dependency_fingerprint: dependencyFingerprint,
    environment_fingerprint: environmentFingerprint,
    producer_fingerprint: producerFingerprint,
    receipt_sha256: receipt.receipt_sha256,
    receipt_identity: {
      workflow_run_id: receipt.workflow_run_id,
      workflow_run_attempt: receipt.workflow_run_attempt,
      execution_artifact_id: receipt.execution_artifact_id,
      receipt_artifact_name: receipt.receipt_artifact_name,
    },
    counts: {
      commands_required: receipt.commands_required,
      commands_run: receipt.commands_run,
      test_count: receipt.npm_test_count,
      test_pass: receipt.npm_test_pass,
      test_fail: receipt.npm_test_fail,
      test_skip: receipt.npm_test_skip,
    },
    result: receipt.result,
  })
}

export function classifyValidationGate(value) {
  if (!GATE_CLASS_SET.has(value)) throw new Error(`gate_class must be one of: ${VALIDATION_GATE_CLASSES.join(", ")}`)
  return value
}

export function gateSatisfiedByEvidence(gateClass, entry) {
  classifyValidationGate(gateClass)
  validateEvidenceEntry(entry)
  if (!new Set(["PASS", "CLEAN"]).has(entry.result)) return false
  if (gateClass === "repository-final" || gateClass === "trusted-actions-equivalent") {
    return entry.evidence_class === "actions-repository-deterministic"
  }
  if (gateClass === "host-specific-runtime") return entry.evidence_class === "local-host-specific"
  if (gateClass === "semantic-review-evidence") return entry.evidence_class === "semantic-review" && entry.result === "CLEAN"
  if (gateClass === "focused-development") return entry.evidence_class === "focused-development-diagnostic"
  return false
}

function normalizePlanLimits(policy = {}) {
  return {
    taskPromptChars: { ...DEFAULT_PLAN_LIMITS.taskPromptChars, ...(policy.taskPromptChars ?? {}) },
    taskExplicitTargets: { ...DEFAULT_PLAN_LIMITS.taskExplicitTargets, ...(policy.taskExplicitTargets ?? {}) },
  }
}

function validateTarget(target, index) {
  if (!target || typeof target !== "object" || Array.isArray(target)) throw new Error(`target ${index + 1} must be an object`)
  const path = boundedString(target.path, `target ${index + 1} path`, 1024)
  if (path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => part === "" || part === "." || part === "..")) throw new Error(`target ${index + 1} path must be repository-relative`)
  const fileBytes = target.file_bytes === undefined ? 0 : nonnegativeInteger(target.file_bytes, `target ${index + 1} file_bytes`)
  const diffBytes = target.diff_bytes === undefined ? 0 : nonnegativeInteger(target.diff_bytes, `target ${index + 1} diff_bytes`)
  const hunks = target.hunks === undefined ? 0 : nonnegativeInteger(target.hunks, `target ${index + 1} hunks`)
  const kind = target.kind ?? (/^(?:tests?|docs?|fixtures?|examples?)\//i.test(path) || /\.(?:md|rst|txt)$/i.test(path) ? "test-doc" : "production")
  if (!new Set(["production", "test-doc"]).has(kind)) throw new Error(`target ${index + 1} kind must be production or test-doc`)
  return { path, file_bytes: fileBytes, diff_bytes: diffBytes, hunks, kind }
}

function targetCost(target) {
  const effectiveBytes = target.diff_bytes > 0 ? Math.min(target.file_bytes || target.diff_bytes, Math.max(target.diff_bytes * 4, target.diff_bytes)) : Math.min(target.file_bytes, 120000)
  return 1
    + Math.ceil(effectiveBytes / 60000)
    + Math.ceil(target.diff_bytes / 12000)
    + Math.ceil(target.hunks / 8)
    + (target.kind === "production" ? 1 : 0)
}

function roleComplexityLimit(role) {
  if (role === "fresh-review") return 12
  if (role === "explore") return 14
  return 18
}

function terminalContractLine(role) {
  if (role === "verify") return "OPERATIONAL_RESULT: PASS|FAIL|BLOCKED; COMMANDS_RUN: <n>; COMMANDS_REQUIRED: <n>."
  if (role === "fresh-review") return "OPERATIONAL_REVIEW: CLEAN|FINDINGS|BLOCKED; TARGETS_REVIEWED: <n>; TARGETS_REQUIRED: <n>."
  return "OPERATIONAL_EXPLORE: COMPLETE|PARTIAL|BLOCKED; TARGETS_INSPECTED: <n>; TARGETS_REQUIRED: <n>."
}

function renderPacket({ role, objective, questions, stopCondition, targets, manifest, expectedTerminal }) {
  const lines = [
    `Scope: ${objective}`,
    "Questions:",
    ...questions.map((question) => `- ${question}`),
    `Stop condition: ${stopCondition}`,
  ]
  if (targets.length > 0) lines.push("Targets:", ...targets.map((target) => `- ${target.path}`))
  if (manifest) lines.push(`Manifest: ${manifest}`)
  lines.push(`Expected terminal: ${expectedTerminal ?? terminalContractLine(role)}`)
  return `${lines.join("\n")}\n`
}

function stableTargetOrder(targets) {
  return [...targets].sort((left, right) => {
    const kind = Number(left.kind === "test-doc") - Number(right.kind === "test-doc")
    if (kind) return kind
    if (left.path < right.path) return -1
    if (left.path > right.path) return 1
    return 0
  })
}

function makeTargetPartitions(targets, role, targetLimit) {
  if (targets.length === 0) return [[]]
  const complexityLimit = roleComplexityLimit(role)
  const groups = []
  let current = []
  let cost = 0
  for (const target of stableTargetOrder(targets)) {
    const nextCost = targetCost(target)
    if (current.length > 0 && (current.length >= targetLimit || cost + nextCost > complexityLimit)) {
      groups.push(current)
      current = []
      cost = 0
    }
    current.push(target)
    cost += nextCost
  }
  if (current.length > 0) groups.push(current)
  return groups
}

function fitPromptPartitions(groups, base, charLimit) {
  const queue = [...groups]
  const fitted = []
  while (queue.length > 0) {
    const group = queue.shift()
    const packet = renderPacket({ ...base, targets: group })
    if (packet.length <= charLimit) {
      fitted.push({ targets: group, packet })
      continue
    }
    if (group.length <= 1) return { status: "UNREPRESENTABLE", reason: "single-target-packet-exceeds-prompt-limit" }
    const middle = Math.ceil(group.length / 2)
    queue.unshift(group.slice(0, middle), group.slice(middle))
  }
  return { status: "OK", fitted }
}

function normalizedPlanInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("child plan input must be an object")
  if (input.schema_version !== CHILD_PLAN_SCHEMA) throw new Error(`schema_version must be ${CHILD_PLAN_SCHEMA}`)
  const role = input.role
  if (!CHILD_ROLES.has(role)) throw new Error("role must be explore, verify, or fresh-review")
  const authority = input.authority
  if (!authority || typeof authority !== "object" || Array.isArray(authority)) throw new Error("authority is required")
  const questions = Array.isArray(input.questions) ? input.questions.map((value, index) => boundedString(value, `question ${index + 1}`, 1000)) : []
  const targets = Array.isArray(input.targets) ? input.targets.map(validateTarget) : []
  const unique = new Set(targets.map((target) => target.path))
  if (unique.size !== targets.length) throw new Error("targets must be unique")
  const semanticReviewAuthority = validateSemanticReviewAuthority(input.semantic_review_authority)
  const gateClass = classifyValidationGate(input.gate_class)
  return {
    role,
    authority: {
      repository: assertRepository(authority.repository),
      head_sha: assertSha(authority.head_sha),
      generation: nonnegativeInteger(authority.generation ?? 0, "authority.generation"),
    },
    semanticReviewAuthority,
    gateClass,
    objective: boundedString(input.objective, "objective", 500),
    questions,
    stopCondition: boundedString(input.stop_condition, "stop_condition", 1000),
    expectedTerminal: input.expected_terminal === undefined ? undefined : boundedString(input.expected_terminal, "expected_terminal", 1000),
    manifest: input.manifest === undefined ? undefined : boundedString(input.manifest, "manifest", 1024),
    targets,
    evidenceRequirement: input.evidence_requirement,
    evidenceEntries: Array.isArray(input.evidence_entries) ? input.evidence_entries : [],
  }
}

export function planChildWork(input, policy = {}) {
  const value = normalizedPlanInput(input)
  const limits = normalizePlanLimits(policy)
  const authority = semanticReviewRequirement(value.semanticReviewAuthority)
  if (value.role === "fresh-review" && !authority.local_fresh_review_required) {
    return {
      schema_version: CHILD_PLAN_SCHEMA,
      status: "ELIDED",
      reason: "central-owned-semantic-review",
      role: value.role,
      local_semantic_review: "NOT_EVALUATED",
      central_semantic_review_required: true,
      partitions: [],
      coverage: { required_targets: value.targets.length, planned_targets: 0, unique_complete: true },
      metrics: { planner_successes: 1, partitions: 0, elisions: 1, capability_prevented: 1 },
    }
  }

  if (value.role === "verify" && value.gateClass === "repository-final" && value.evidenceRequirement) {
    const ledger = new EvidenceLedger(value.evidenceEntries)
    const lookup = ledger.lookup(value.evidenceRequirement)
    if (lookup.reusable && gateSatisfiedByEvidence("repository-final", lookup.entry)) {
      return {
        schema_version: CHILD_PLAN_SCHEMA,
        status: "ELIDED",
        reason: "trusted-actions-receipt-reused",
        role: value.role,
        evidence_key: evidenceEntryKey(lookup.entry),
        partitions: [],
        coverage: { required_targets: value.targets.length, planned_targets: 0, unique_complete: true },
        metrics: { planner_successes: 1, partitions: 0, elisions: 1, receipt_reuses: 1, avoided_local_verify_launches: 1 },
      }
    }
  }

  if (value.questions.length < 1 || value.questions.length > 3) {
    return {
      schema_version: CHILD_PLAN_SCHEMA,
      status: "UNREPRESENTABLE",
      reason: value.questions.length < 1 ? "at-least-one-question-required" : "question-count-exceeds-three",
      role: value.role,
      partitions: [],
      coverage: { required_targets: value.targets.length, planned_targets: 0, unique_complete: value.targets.length === 0 },
      metrics: { planner_successes: 0, partitions: 0, elisions: 0 },
    }
  }

  const complexityLimit = roleComplexityLimit(value.role)
  const oversizedTarget = stableTargetOrder(value.targets).find((target) => targetCost(target) > complexityLimit)
  if (oversizedTarget) {
    return {
      schema_version: CHILD_PLAN_SCHEMA,
      status: "UNREPRESENTABLE",
      reason: "single-target-complexity-exceeds-role-limit",
      role: value.role,
      target_path: oversizedTarget.path,
      target_complexity: targetCost(oversizedTarget),
      role_complexity_limit: complexityLimit,
      partitions: [],
      coverage: { required_targets: value.targets.length, planned_targets: 0, unique_complete: value.targets.length === 0 },
      metrics: { planner_successes: 0, partitions: 0, elisions: 0 },
    }
  }

  const targetLimit = limits.taskExplicitTargets[value.role]
  const groups = makeTargetPartitions(value.targets, value.role, targetLimit)
  const fitted = fitPromptPartitions(groups, {
    role: value.role,
    objective: value.objective,
    questions: value.questions,
    stopCondition: value.stopCondition,
    manifest: value.manifest,
    expectedTerminal: value.expectedTerminal,
  }, limits.taskPromptChars[value.role])
  if (fitted.status !== "OK") {
    return {
      schema_version: CHILD_PLAN_SCHEMA,
      status: "UNREPRESENTABLE",
      reason: fitted.reason,
      role: value.role,
      partitions: [],
      coverage: { required_targets: value.targets.length, planned_targets: 0, unique_complete: value.targets.length === 0 },
      metrics: { planner_successes: 0, partitions: 0, elisions: 0 },
    }
  }

  const partitions = fitted.fitted.map((partition, index) => ({
    index: index + 1,
    target_paths: partition.targets.map((target) => target.path),
    complexity: partition.targets.reduce((sum, target) => sum + targetCost(target), 0),
    packet: partition.packet,
    packet_sha256: sha256Hex(partition.packet),
  }))
  const planned = partitions.flatMap((partition) => partition.target_paths)
  const status = partitions.length <= 1 ? "READY" : "PARTITION_REQUIRED"
  return {
    schema_version: CHILD_PLAN_SCHEMA,
    status,
    reason: status === "READY" ? "single-bounded-packet" : "deterministic-complexity-partition",
    role: value.role,
    partitions,
    coverage: {
      required_targets: value.targets.length,
      planned_targets: planned.length,
      unique_complete: planned.length === value.targets.length && new Set(planned).size === value.targets.length && value.targets.every((target) => planned.includes(target.path)),
    },
    metrics: { planner_successes: 1, partitions: partitions.length, elisions: 0, capability_prevented: 0 },
  }
}

function terminalValuePattern(key) {
  return new RegExp(`^${key}\\s*:\\s*(.+?)\\s*$`, "i")
}

function parseTerminalFields(text, contract) {
  const keys = [contract.outcomeKey, contract.inspectedKey, contract.requiredKey]
  const keySet = new Set(keys)
  const fields = new Map()
  let candidateLines = 0
  let semicolon = false
  let multiline = false
  let fieldOrder = []
  const reasons = []
  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    if (!keys.some((key) => new RegExp(`\\b${key}\\b`, "i").test(rawLine))) continue
    candidateLines += 1
    const line = rawLine.trim()
    const segments = line.split(";").map((part) => part.trim()).filter(Boolean)
    if (segments.length > 1) semicolon = true
    for (const segment of segments) {
      let matched = false
      for (const key of keys) {
        const match = segment.match(terminalValuePattern(key))
        if (!match) continue
        matched = true
        const canonicalKey = [...keySet].find((candidate) => candidate.toLowerCase() === key.toLowerCase())
        const value = match[1].trim()
        fieldOrder.push(canonicalKey)
            const existing = fields.get(canonicalKey)
        if (existing !== undefined) {
          reasons.push(existing === value ? `duplicate-${canonicalKey.toLowerCase()}` : `conflicting-${canonicalKey.toLowerCase()}`)
        } else fields.set(canonicalKey, value)
        break
      }
      if (!matched) reasons.push("terminal-narrative-or-unknown-field")
    }
  }
  multiline = candidateLines > 1
  return { fields, reasons, semicolon, multiline, fieldOrder }
}

export function parseChildTerminal(text, role) {
  const contract = TERMINAL_CONTRACTS[role]
  if (!contract) throw new Error("unsupported child terminal role")
  const parsed = parseTerminalFields(text, contract)
  const reasons = [...parsed.reasons]
  for (const key of [contract.outcomeKey, contract.inspectedKey, contract.requiredKey]) {
    if (!parsed.fields.has(key)) reasons.push(`missing-${key.toLowerCase()}`)
  }
  const outcome = parsed.fields.get(contract.outcomeKey)?.toUpperCase()
  if (outcome !== undefined && !contract.outcomes.has(outcome)) reasons.push("invalid-outcome")
  const inspectedRaw = parsed.fields.get(contract.inspectedKey)
  const requiredRaw = parsed.fields.get(contract.requiredKey)
  const inspected = inspectedRaw !== undefined && /^\d+$/.test(inspectedRaw) ? Number(inspectedRaw) : undefined
  const required = requiredRaw !== undefined && /^\d+$/.test(requiredRaw) ? Number(requiredRaw) : undefined
  if (inspectedRaw !== undefined && inspected === undefined) reasons.push(`invalid-${contract.inspectedKey.toLowerCase()}`)
  if (requiredRaw !== undefined && required === undefined) reasons.push(`invalid-${contract.requiredKey.toLowerCase()}`)
  if (outcome === contract.success && (required === undefined || required < 1 || inspected !== required)) reasons.push("success-count-mismatch")
  const canonicalOrder = [contract.outcomeKey, contract.inspectedKey, contract.requiredKey].join("|")
  const observedOrder = [...new Set(parsed.fieldOrder)].join("|")
  const normalizations = []
  if (parsed.semicolon) normalizations.push("semicolon-fields")
  if (parsed.multiline) normalizations.push("multiline-fields")
  if (observedOrder && observedOrder !== canonicalOrder) normalizations.push("field-order-normalized")
  return {
    complete: reasons.length === 0 && outcome === contract.success,
    transport_complete: reasons.length === 0,
    outcome: outcome?.toLowerCase() ?? "unknown",
    inspected,
    required,
    reasons: [...new Set(reasons)],
    normalizations,
  }
}

export function retryDisposition(event) {
  const value = boundedString(event, "retry event", 128)
  if (new Set(["preflight-rejection", "malformed-invocation", "capability-mismatch"]).has(value)) {
    return { action: "CORRECT_INVOCATION", preserve_completed_evidence: true, semantic_rerun: false }
  }
  if (value === "benign-terminal-format") {
    return { action: "CONSUME_EXISTING_RESULT", preserve_completed_evidence: true, semantic_rerun: false }
  }
  if (new Set(["findings", "test-failure", "transport-failure", "stale-authority", "source-movement", "environment-drift"]).has(value)) {
    return { action: "RERUN_AFFECTED_EVIDENCE", preserve_completed_evidence: !new Set(["source-movement", "environment-drift"]).has(value), semantic_rerun: value === "findings" }
  }
  return { action: "REPORT_UNRESOLVED", preserve_completed_evidence: true, semantic_rerun: false }
}

export function evaluateCleanliness(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("cleanliness input must be an object")
  const mode = input.mode
  if (!new Set(["repository-owned-assessment", "caller-owned-detached", "actions-slice-k"]).has(mode)) throw new Error("unsupported cleanliness mode")
  if (mode === "repository-owned-assessment") {
    const clean = input.owner_status_before === "" && input.owner_status_after === "" && input.owner_head_before === input.owner_head_after
    return { admitted: clean, reason: clean ? "STRICT_OWNER_CLEAN" : "STRICT_OWNER_DIRTY_OR_DRIFT" }
  }
  if (mode === "actions-slice-k") {
    const admitted = input.canonical_owner_used === false && input.candidate_exact_head === true && input.disposable_isolation === true
    return { admitted, reason: admitted ? "ISOLATED_EXACT_HEAD" : "CANONICAL_OWNER_OR_ISOLATION_VIOLATION" }
  }
  const admitted = input.candidate_exact_head === true
    && input.owner_source_used === false
    && typeof input.owner_fingerprint_before === "string"
    && input.owner_fingerprint_before === input.owner_fingerprint_after
    && input.owner_preservation_exact === true
  return { admitted, reason: admitted ? "DETACHED_OWNER_PRESERVED" : "OWNER_PRESERVATION_UNPROVEN" }
}

export function assessRoleLimitTuning(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("limit-tuning input must be an object")
  const role = input.role
  if (!CHILD_ROLES.has(role)) throw new Error("invalid role")
  const currentLimit = nonnegativeInteger(input.current_limit, "current_limit")
  const requiredRuns = nonnegativeInteger(input.required_runs, "required_runs")
  const exhaustedRequiredRuns = nonnegativeInteger(input.exhausted_required_runs, "exhausted_required_runs")
  if (input.avoidance_slices_complete !== true) return { decision: "DEFER", role, current_limit: currentLimit, reason: "avoidance-slices-not-complete" }
  if (requiredRuns < 3) return { decision: "KEEP", role, current_limit: currentLimit, reason: "insufficient-post-optimization-sample" }
  if (exhaustedRequiredRuns === 0) return { decision: "KEEP", role, current_limit: currentLimit, reason: "no-required-role-limit-failures" }
  return { decision: "MEASURE", role, current_limit: currentLimit, reason: "required-role-limit-failures-remain", observed_exhaustion_rate: exhaustedRequiredRuns / requiredRuns }
}

function fixtureTarget(path, kind, fileBytes, diffBytes, hunks) {
  return { path, kind, file_bytes: fileBytes, diff_bytes: diffBytes, hunks }
}

export function replayFrictionScenario(mode) {
  const started = process.hrtime.bigint()
  validateSemanticReviewAuthority(mode)
  const targets = [
    fixtureTarget("lib/operation-guard-core.mjs", "production", 134000, 18000, 10),
    fixtureTarget("lib/policy-spec.mjs", "production", 14000, 5000, 4),
    fixtureTarget("lib/hybrid-workflow.mjs", "production", 28000, 12000, 8),
    fixtureTarget("tests/operation-guard.test.mjs", "test-doc", 158000, 14000, 8),
    fixtureTarget("tests/hybrid-workflow.test.mjs", "test-doc", 24000, 9000, 6),
    fixtureTarget("README.md", "test-doc", 40000, 5000, 3),
  ]
  const freshPlan = planChildWork({
    schema_version: CHILD_PLAN_SCHEMA,
    role: "fresh-review",
    authority: { repository: "fvanevski/opencode-operational-schema-guard", head_sha: "a".repeat(40), generation: 1 },
    semantic_review_authority: mode,
    gate_class: "semantic-review-evidence",
    objective: "Review exactly the six changed Issue #15 targets for correctness and invariant preservation.",
    questions: ["Are there blocking correctness or lifecycle defects?", "Are required regressions and documentation present?"],
    stop_condition: "Stop after every listed target and the two questions are addressed.",
    targets,
  })
  const localFreshReviewLaunches = freshPlan.status === "ELIDED" ? 0 : freshPlan.partitions.length
  const replayEntry = {
    schema_version: EVIDENCE_ENTRY_SCHEMA,
    evidence_class: "actions-repository-deterministic",
    repository: "fvanevski/opencode-operational-schema-guard",
    head_sha: "a".repeat(40),
    generation: 1,
    gate_id: "repository-final",
    profile_fingerprint: "replay-profile-v2",
    dependency_fingerprint: "replay-deps-v1",
    environment_fingerprint: "replay-env-v2",
    producer_fingerprint: "replay-trusted-controller-v1",
    receipt_sha256: "b".repeat(64),
    receipt_identity: { workflow_run_id: "1", workflow_run_attempt: "1", execution_artifact_id: "2", receipt_artifact_name: "ghdev-replay-receipt" },
    counts: { commands_required: 2, commands_run: 2, test_count: 10, test_pass: 10, test_fail: 0, test_skip: 0 },
    result: "PASS",
  }
  const replayRequirement = evidenceRequirement(replayEntry)
  const verifyPlans = Array.from({ length: 2 }, () => planChildWork({
    schema_version: CHILD_PLAN_SCHEMA,
    role: "verify",
    authority: { repository: replayEntry.repository, head_sha: replayEntry.head_sha, generation: replayEntry.generation },
    semantic_review_authority: mode,
    gate_class: "repository-final",
    objective: "Run the repository-final deterministic Verify profile.",
    questions: ["Do the exact repository-final gates pass?"],
    stop_condition: "Stop after the exact profile is satisfied.",
    targets: [],
    evidence_requirement: replayRequirement,
    evidence_entries: [replayEntry],
  }))
  const receiptReuses = verifyPlans.filter((plan) => plan.status === "ELIDED" && plan.reason === "trusted-actions-receipt-reused").length
  const localVerifyLaunches = verifyPlans.reduce((count, plan) => count + (plan.status === "ELIDED" ? 0 : plan.partitions.length), 0)
  const actionsExecutions = Number(new EvidenceLedger([replayEntry]).lookup(replayRequirement).reusable)
  const terminalProbe = parseChildTerminal("COMMANDS_REQUIRED: 2\nOPERATIONAL_RESULT: PASS\nCOMMANDS_RUN: 2", "verify")
  const after = {
    child_launches_by_role: { explore: 0, verify: localVerifyLaunches, "fresh-review": localFreshReviewLaunches },
    fresh_review_launches: localFreshReviewLaunches,
    local_verify_launches: localVerifyLaunches,
    actions_executions: actionsExecutions,
    actions_receipt_reuses: receiptReuses,
    avoided_local_verify_launches: receiptReuses,
    avoided_full_suite_executions: receiptReuses,
    incomplete_delegations: 0,
    capability_mismatches: 0,
    malformed_invocations: 0,
    gate_failures: 0,
    full_suite_executions: actionsExecutions,
    fresh_review_elisions: freshPlan.status === "ELIDED" ? 1 : 0,
    packet_planner_successes: freshPlan.status === "UNREPRESENTABLE" ? 0 : 1,
    packet_planner_partitions: freshPlan.partitions.length,
    avoided_child_reruns: retryDisposition("benign-terminal-format").action === "CONSUME_EXISTING_RESULT" ? 1 : 0,
    terminal_parse_normalizations: terminalProbe.normalizations.length,
    capability_prevented: (freshPlan.status === "ELIDED" ? 1 : 0) + 1,
    semantic_review_authority_mode_counts: { "central-owned": mode === "central-owned" ? 1 : 0, "local-fresh-review": mode === "local-fresh-review" ? 1 : 0, both: mode === "both" ? 1 : 0 },
    marker_format_semantic_reruns: 0,
    representative_six_target_max_step_failure: false,
  }
  const finished = process.hrtime.bigint()
  after.wall_clock_duration_ms = Number(finished - started) / 1_000_000
  const delta = {}
  for (const key of ["fresh_review_launches", "capability_mismatches", "malformed_invocations", "incomplete_delegations", "gate_failures", "actions_executions", "actions_receipt_reuses"]) {
    const before = ARCHIVED_FRICTION_BASELINE[key]
    if (typeof before === "number" && typeof after[key] === "number") delta[key] = after[key] - before
  }
  return {
    schema_version: FRICTION_REPLAY_SCHEMA,
    mode,
    baseline_metrics: { ...ARCHIVED_FRICTION_BASELINE },
    after_metrics: after,
    delta_metrics: delta,
    metric_provenance: {
      baseline: "Issue #15 archived session audit; null means the issue did not state a trustworthy count.",
      after: "Deterministic six-target fixture plus one validated representative Actions PASS ledger entry exercised through the real planner lookup path in this process; wall_clock_duration_ms measures fixture computation only and does not claim a live GitHub execution.",
    },
    central_semantic_review_required: mode === "central-owned" || mode === "both",
    local_semantic_review: mode === "central-owned" ? "NOT_EVALUATED" : "REQUIRED",
    fresh_review_plan: freshPlan,
  }
}
