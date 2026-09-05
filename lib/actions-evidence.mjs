import { createHash } from "node:crypto"
import { lstat, readFile, realpath } from "node:fs/promises"

export const DISPATCH_SCHEMA = "ghdev-actions-dispatch-v1"
export const PROFILE_SCHEMA = "ghdev-actions-profile-v1"
export const EXECUTION_SCHEMA = "ghdev-actions-execution-v1"
export const RECEIPT_SCHEMA = "ghdev-actions-evidence-v1"
export const RUNNER_IMAGE_SCHEMA = "ghdev-runner-image-v1"
export const TRUSTED_WORKFLOW_PATH = ".github/workflows/ghdev-verify.yml"
export const TRUSTED_DEFAULT_REF = "refs/heads/main"
export const STATUS_CONTEXT = "local-host-verify"

const SHA_RE = /^[0-9a-f]{40}$/
const SHA256_RE = /^[0-9a-f]{64}$/
const PROFILE_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const RESULT_VALUES = new Set(["PASS", "FAIL", "BLOCKED", "STALE"])

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex")
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value))
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
  }
  return value
}

export function assertSha(value, field) {
  if (typeof value !== "string" || !SHA_RE.test(value)) throw new Error(`${field} must be a 40-character lowercase Git SHA`)
  return value
}

export function assertRepository(value, field = "repository") {
  if (typeof value !== "string" || !REPO_RE.test(value)) throw new Error(`${field} must be owner/name`)
  return value
}

export function assertPrNumber(value) {
  const number = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value
  if (!Number.isSafeInteger(number) || number < 1 || number > 2_147_483_647) throw new Error("pr_number must be a positive integer")
  return number
}

function assertRepoRelativePath(value, field, { prefix = false } = {}) {
  if (typeof value !== "string" || value.length < 1 || value.length > 256 || value.includes("\u0000") || value.includes("\\") || value.startsWith("/") || value.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`${field} contains an invalid repository-relative path`)
  }
  if (prefix && !value.endsWith("/")) throw new Error(`${field} prefixes must end with /`)
  if (!prefix && value.endsWith("/")) throw new Error(`${field} file paths must not end with /`)
  return value
}

export function validateDispatchInput(input, { allowedProfiles = ["repository-final-v1"] } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("dispatch input must be an object")
  const prNumber = assertPrNumber(input.pr_number)
  const expectedBaseSha = assertSha(input.expected_base_sha, "expected_base_sha")
  const expectedHeadSha = assertSha(input.expected_head_sha, "expected_head_sha")
  const expectedControllerSha = assertSha(input.expected_controller_sha, "expected_controller_sha")
  if (typeof input.profile !== "string" || !PROFILE_RE.test(input.profile) || !allowedProfiles.includes(input.profile)) {
    throw new Error(`profile must be one of: ${allowedProfiles.join(", ")}`)
  }
  return {
    schema_version: DISPATCH_SCHEMA,
    pr_number: prNumber,
    expected_base_sha: expectedBaseSha,
    expected_head_sha: expectedHeadSha,
    expected_controller_sha: expectedControllerSha,
    profile: input.profile,
  }
}

export function validateProfile(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) throw new Error("profile must be an object")
  if (profile.schema_version !== PROFILE_SCHEMA) throw new Error(`unsupported profile schema: ${profile.schema_version ?? "missing"}`)
  if (typeof profile.profile_id !== "string" || !PROFILE_RE.test(profile.profile_id)) throw new Error("invalid profile_id")
  if (!Number.isSafeInteger(profile.profile_version) || profile.profile_version < 1) throw new Error("profile_version must be a positive integer")
  if (!Array.isArray(profile.commands) || profile.commands.length < 1 || profile.commands.length > 16) throw new Error("commands must contain 1-16 entries")
  const ids = new Set()
  for (const command of profile.commands) {
    if (!command || typeof command !== "object" || Array.isArray(command)) throw new Error("command must be an object")
    if (typeof command.id !== "string" || !PROFILE_RE.test(command.id) || ids.has(command.id)) throw new Error("command ids must be unique bounded identifiers")
    ids.add(command.id)
    if (!Array.isArray(command.argv) || command.argv.length < 1 || command.argv.length > 16) throw new Error(`command ${command.id} must have 1-16 argv entries`)
    for (const arg of command.argv) {
      if (typeof arg !== "string" || arg.length < 1 || arg.length > 256 || arg.includes("\u0000") || arg.includes("\n") || arg.includes("\r")) {
        throw new Error(`command ${command.id} contains an invalid argv entry`)
      }
    }
    if (command.collect_test_totals !== undefined && command.collect_test_totals !== "node-tap") throw new Error(`unsupported test total collector for ${command.id}`)
  }
  for (const listField of ["candidate_fingerprint_paths", "trusted_control_paths"]) {
    if (!Array.isArray(profile[listField]) || profile[listField].length < 1) throw new Error(`${listField} must be a non-empty array`)
    for (const entry of profile[listField]) assertRepoRelativePath(entry, listField)
  }
  if (!Array.isArray(profile.trusted_control_prefixes)) throw new Error("trusted_control_prefixes must be an array")
  for (const entry of profile.trusted_control_prefixes) {
    if (typeof entry !== "string" || !entry.endsWith("/")) throw new Error("trusted_control_prefixes entries must end with /")
    assertRepoRelativePath(entry.slice(0, -1), "trusted_control_prefixes")
  }
  for (const listField of ["evidence_classes", "not_equivalent_to"]) {
    if (!Array.isArray(profile[listField])) throw new Error(`${listField} must be an array`)
    for (const entry of profile[listField]) {
      if (typeof entry !== "string" || entry.length < 1 || entry.length > 256 || entry.includes("\u0000")) throw new Error(`${listField} contains an invalid entry`)
    }
  }
  if (!profile.runner || typeof profile.runner !== "object" || Array.isArray(profile.runner)) throw new Error("runner contract missing")
  if (!Array.isArray(profile.runner.labels) || !profile.runner.labels.includes("self-hosted") || !profile.runner.labels.includes("ghdev-verify")) {
    throw new Error("runner labels must include self-hosted and ghdev-verify")
  }
  if (profile.runner.sandbox !== "bubblewrap-no-network-v1") throw new Error("unsupported runner sandbox")
  return profile
}

export function commandFingerprint(profile) {
  validateProfile(profile)
  return sha256Hex(canonicalJson({ schema_version: profile.schema_version, profile_id: profile.profile_id, profile_version: profile.profile_version, commands: profile.commands }))
}

export function evaluatePrIdentity(pr, dispatch, repository) {
  assertRepository(repository)
  if (!pr || typeof pr !== "object") return { admitted: false, result: "BLOCKED", reason: "PR_RESPONSE_INVALID" }
  if (pr.state !== "open") return { admitted: false, result: "BLOCKED", reason: "PR_NOT_OPEN", observed_base_sha: pr.base?.sha ?? null, observed_head_sha: pr.head?.sha ?? null }
  const baseSha = pr.base?.sha
  const headSha = pr.head?.sha
  const baseRef = pr.base?.ref
  const headRepo = pr.head?.repo?.full_name
  const number = pr.number
  if (number !== dispatch.pr_number) return { admitted: false, result: "BLOCKED", reason: "PR_NUMBER_MISMATCH" }
  if (headRepo !== repository) return { admitted: false, result: "BLOCKED", reason: "FORK_OR_FOREIGN_HEAD_DENIED", observed_base_sha: baseSha ?? null, observed_head_sha: headSha ?? null }
  if (baseRef !== "main") return { admitted: false, result: "BLOCKED", reason: "BASE_REF_NOT_MAIN", observed_base_sha: baseSha ?? null, observed_head_sha: headSha ?? null }
  if (baseSha !== dispatch.expected_base_sha || headSha !== dispatch.expected_head_sha) {
    return { admitted: false, result: "STALE", reason: "REMOTE_IDENTITY_CHANGED", observed_base_sha: baseSha ?? null, observed_head_sha: headSha ?? null }
  }
  return { admitted: true, result: "PASS", reason: "IDENTITY_MATCH", observed_base_sha: baseSha, observed_head_sha: headSha }
}

export function detectSelfCertification(changedPaths, trustedControlPaths, trustedControlPrefixes = []) {
  if (!Array.isArray(changedPaths) || !Array.isArray(trustedControlPaths) || !Array.isArray(trustedControlPrefixes)) throw new Error("self-certification inputs must be arrays")
  const controls = new Set(trustedControlPaths)
  const conflicting = [...new Set(changedPaths.filter((path) => controls.has(path) || trustedControlPrefixes.some((prefix) => path.startsWith(prefix))))].sort()
  return { denied: conflicting.length > 0, conflicting_paths: conflicting }
}

export async function fingerprintFiles(root, paths) {
  const result = {}
  const rootReal = await realpath(root)
  const rootPrefix = `${rootReal}/`
  for (const relativePath of [...paths].sort()) {
    const url = new URL(relativePath, `file://${rootReal.endsWith("/") ? rootReal : `${rootReal}/`}`)
    try {
      const stat = await lstat(url)
      if (!stat.isFile()) throw new Error(`candidate fingerprint path must be a regular file: ${relativePath}`)
      const resolved = await realpath(url)
      if (!resolved.startsWith(rootPrefix)) throw new Error(`candidate fingerprint path escapes checkout: ${relativePath}`)
      const bytes = await readFile(resolved)
      result[relativePath] = sha256Hex(bytes)
    } catch (error) {
      if (error?.code === "ENOENT") result[relativePath] = "MISSING"
      else throw error
    }
  }
  return result
}

export function parseNodeTapTotals(output) {
  if (typeof output !== "string") return null
  const values = {}
  for (const key of ["tests", "pass", "fail", "skipped"]) {
    const matches = [...output.matchAll(new RegExp(`^# ${key} (\\d+)\\s*$`, "gm"))]
    if (matches.length) values[key] = Number(matches.at(-1)[1])
  }
  if (!["tests", "pass", "fail"].every((key) => Number.isSafeInteger(values[key]))) return null
  return { count: values.tests, pass: values.pass, fail: values.fail, skip: Number.isSafeInteger(values.skipped) ? values.skipped : 0 }
}

export function validateExecutionRecord(record, profile, dispatch) {
  validateProfile(profile)
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("execution record must be an object")
  if (record.schema_version !== EXECUTION_SCHEMA) throw new Error(`unsupported execution schema: ${record.schema_version ?? "missing"}`)
  if (record.repository !== record.repository?.trim()) throw new Error("repository has surrounding whitespace")
  assertRepository(record.repository)
  if (record.pr_number !== dispatch.pr_number) throw new Error("execution pr_number mismatch")
  for (const [field, expected] of [["expected_base_sha", dispatch.expected_base_sha], ["expected_head_sha", dispatch.expected_head_sha], ["controller_commit_sha", dispatch.expected_controller_sha]]) {
    assertSha(record[field], field)
    if (record[field] !== expected) throw new Error(`${field} mismatch`)
  }
  for (const field of ["observed_base_sha_initial", "observed_head_sha_initial", "observed_controller_sha_initial"]) assertSha(record[field], field)
  if (record.observed_base_sha_initial !== dispatch.expected_base_sha || record.observed_head_sha_initial !== dispatch.expected_head_sha || record.observed_controller_sha_initial !== dispatch.expected_controller_sha) throw new Error("execution remote/controller identity mismatch")
  for (const field of ["observed_candidate_head_initial", "observed_candidate_head_final"]) {
    if (record[field] !== null) assertSha(record[field], field)
  }
  if (record.commands_run > 0 || record.result === "PASS" || record.result === "FAIL") {
    if (record.observed_candidate_head_initial !== dispatch.expected_head_sha || record.observed_candidate_head_final !== dispatch.expected_head_sha) throw new Error("candidate checkout identity mismatch")
  }
  if (record.controller_workflow_path !== TRUSTED_WORKFLOW_PATH) throw new Error("controller workflow path mismatch")
  if (record.controller_workflow_ref !== TRUSTED_DEFAULT_REF) throw new Error("controller workflow ref mismatch")
  if (record.profile_id !== profile.profile_id || record.profile_version !== profile.profile_version) throw new Error("profile identity mismatch")
  if (record.command_fingerprint !== commandFingerprint(profile)) throw new Error("command fingerprint mismatch")
  if (!RESULT_VALUES.has(record.result)) throw new Error("invalid execution result")
  if (!Number.isSafeInteger(record.commands_required) || record.commands_required !== profile.commands.length) throw new Error("commands_required mismatch")
  if (!Number.isSafeInteger(record.commands_run) || record.commands_run < 0 || record.commands_run > record.commands_required) throw new Error("invalid commands_run")
  if (!Array.isArray(record.per_command_exit) || record.per_command_exit.length !== record.commands_run) throw new Error("per_command_exit length mismatch")
  const expectedIds = profile.commands.slice(0, record.commands_run).map((command) => command.id)
  const observedIds = record.per_command_exit.map((entry) => entry?.id)
  if (canonicalJson(expectedIds) !== canonicalJson(observedIds)) throw new Error("commands were not executed in profile order exactly once")
  for (const entry of record.per_command_exit) {
    const hasExit = Number.isSafeInteger(entry.exit) && entry.exit >= 0 && entry.exit <= 255
    const hasSignal = entry.exit === null && typeof entry.signal === "string" && /^[A-Z0-9]+$/.test(entry.signal)
    if (!hasExit && !hasSignal) throw new Error("invalid command termination evidence")
    if (hasExit && entry.signal !== null && entry.signal !== undefined) throw new Error("exited command must not carry a signal")
  }
  if (record.result === "FAIL") {
    if (record.commands_run < 1 || !Number.isSafeInteger(record.per_command_exit.at(-1).exit) || record.per_command_exit.at(-1).exit === 0 || record.per_command_exit.slice(0, -1).some((entry) => entry.exit !== 0)) throw new Error("FAIL requires the first nonzero profile command exit")
  }
  if (record.block_reason === "COMMAND_TERMINATED_WITHOUT_EXIT") {
    const final = record.per_command_exit.at(-1)
    if (record.result !== "BLOCKED" || !final || final.exit !== null || typeof final.signal !== "string") throw new Error("command signal block reason conflicts with termination evidence")
  }
  if (record.result === "BLOCKED") {
    if (typeof record.block_reason !== "string" || !/^[A-Z0-9_]{3,64}$/.test(record.block_reason)) throw new Error("BLOCKED requires a bounded block_reason")
  } else if (record.block_reason !== null) throw new Error("non-BLOCKED execution must have null block_reason")
  if (typeof record.worktree_clean_final !== "boolean" || typeof record.workspace_cleanup_final !== "boolean") throw new Error("cleanup booleans missing")
  if (record.runner_class !== "self-hosted-supported-linux") throw new Error("runner class mismatch")
  if (canonicalJson(record.runner_labels) !== canonicalJson(profile.runner.labels)) throw new Error("runner labels mismatch")
  if (!record.environment || typeof record.environment !== "object" || Array.isArray(record.environment)) throw new Error("environment missing")
  if (record.environment.sandbox !== profile.runner.sandbox) throw new Error("sandbox mismatch")
  const executionStarted = record.commands_run > 0 || record.result === "PASS" || record.result === "FAIL"
  if (executionStarted) {
    if (record.environment.network !== "unshared") throw new Error("candidate network was not unshared")
    if (record.environment.candidate_mount !== "read-only") throw new Error("candidate source was not read-only")
    if (record.environment.candidate_environment !== "clearenv-allowlist") throw new Error("candidate environment was not sanitized")
    if (!record.environment.image_fingerprint || !SHA256_RE.test(record.environment.image_fingerprint)) throw new Error("environment image fingerprint missing")
    if (record.environment.image_schema !== profile.runner.image_schema) throw new Error("environment image schema mismatch")
    if (!record.environment.image_id || !record.environment.base_image_digest || !/^sha256:[0-9a-f]{64}$/.test(record.environment.base_image_digest)) throw new Error("environment image provenance missing")
    for (const field of ["actions_runner_version", "node_version", "npm_version", "bwrap_version"]) {
      const value = record.environment[field]
      if (typeof value !== "string" || value.length < 1 || value.length > 128 || value.includes("\n") || value.includes("\r")) throw new Error(`bounded ${field} provenance missing`)
    }
    if (!new Set(["ubuntu", "debian"]).has(record.environment.os_id) || typeof record.environment.os_version_id !== "string" || record.environment.os_version_id.length < 1 || record.environment.os_version_id.length > 64) throw new Error("supported Linux userspace provenance missing")
    for (const field of ["os_release_fingerprint", "node_sha256", "npm_sha256", "bwrap_sha256"]) {
      if (typeof record.environment[field] !== "string" || !SHA256_RE.test(record.environment[field])) throw new Error(`${field} missing`)
    }
    if (!record.candidate_fingerprints || typeof record.candidate_fingerprints !== "object" || Array.isArray(record.candidate_fingerprints)) throw new Error("candidate fingerprints missing")
    for (const path of profile.candidate_fingerprint_paths) {
      const value = record.candidate_fingerprints[path]
      if (value !== "MISSING" && (typeof value !== "string" || !SHA256_RE.test(value))) throw new Error(`candidate fingerprint missing for ${path}`)
    }
  }
  if (!record.execution_identity || typeof record.execution_identity !== "string" || record.execution_identity.length > 256) throw new Error("execution identity missing")
  if (record.result === "PASS") {
    if (record.commands_run !== record.commands_required || record.per_command_exit.some((entry) => entry.exit !== 0 || (entry.signal !== null && entry.signal !== undefined))) throw new Error("PASS requires all commands exactly once with zero exits")
    if (!record.worktree_clean_final || !record.workspace_cleanup_final) throw new Error("PASS requires clean source and workspace cleanup")
    const collector = profile.commands.find((command) => command.collect_test_totals === "node-tap")
    if (collector) {
      for (const key of ["npm_test_count", "npm_test_pass", "npm_test_fail", "npm_test_skip"]) {
        if (!Number.isSafeInteger(record[key]) || record[key] < 0) throw new Error(`PASS requires ${key}`)
      }
      if (record.npm_test_fail !== 0 || record.npm_test_pass + record.npm_test_fail + record.npm_test_skip > record.npm_test_count) throw new Error("inconsistent npm test totals")
    }
  }
  return record
}

export function buildReceipt({ execution, profile, dispatch, observedBaseFinal, observedHeadFinal, observedControllerFinal, finalIdentityResult = "PASS", finalIdentityReason = "IDENTITY_MATCH", workflowRunId, workflowRunAttempt, executionArtifactId, receiptArtifactName }) {
  validateExecutionRecord(execution, profile, dispatch)
  assertSha(observedBaseFinal, "observed_base_sha_final")
  assertSha(observedHeadFinal, "observed_head_sha_final")
  assertSha(observedControllerFinal, "observed_controller_sha_final")
  if (!RESULT_VALUES.has(finalIdentityResult) || finalIdentityResult === "FAIL") throw new Error("invalid final identity result")
  if (typeof finalIdentityReason !== "string" || !/^[A-Z0-9_]{3,64}$/.test(finalIdentityReason)) throw new Error("invalid final identity reason")
  const finalReasonByResult = {
    PASS: new Set(["IDENTITY_MATCH"]),
    STALE: new Set(["REMOTE_IDENTITY_CHANGED", "CONTROLLER_REF_MOVED"]),
    BLOCKED: new Set(["PR_RESPONSE_INVALID", "PR_NOT_OPEN", "PR_NUMBER_MISMATCH", "FORK_OR_FOREIGN_HEAD_DENIED", "BASE_REF_NOT_MAIN"]),
  }
  if (!finalReasonByResult[finalIdentityResult].has(finalIdentityReason)) throw new Error("final identity reason conflicts with result")
  const authorityMoved = observedBaseFinal !== dispatch.expected_base_sha || observedHeadFinal !== dispatch.expected_head_sha || observedControllerFinal !== dispatch.expected_controller_sha
  if ((finalIdentityResult === "PASS") !== !authorityMoved && finalIdentityResult !== "BLOCKED") throw new Error("final identity result conflicts with observed remote/controller identity")
  if (finalIdentityReason === "CONTROLLER_REF_MOVED" && observedControllerFinal === dispatch.expected_controller_sha) throw new Error("controller movement reason conflicts with observed controller identity")
  const result = finalIdentityResult === "STALE" ? "STALE" : finalIdentityResult === "BLOCKED" ? "BLOCKED" : execution.result
  const receipt = {
    schema_version: RECEIPT_SCHEMA,
    repository: execution.repository,
    pr_number: dispatch.pr_number,
    expected_base_sha: dispatch.expected_base_sha,
    observed_base_sha_initial: execution.observed_base_sha_initial,
    observed_base_sha_final: observedBaseFinal,
    expected_head_sha: dispatch.expected_head_sha,
    observed_head_sha_initial: execution.observed_head_sha_initial,
    observed_head_sha_final: observedHeadFinal,
    observed_candidate_head_initial: execution.observed_candidate_head_initial,
    observed_candidate_head_final: execution.observed_candidate_head_final,
    controller_workflow_path: execution.controller_workflow_path,
    controller_workflow_ref: execution.controller_workflow_ref,
    controller_commit_sha: execution.controller_commit_sha,
    observed_controller_sha_initial: execution.observed_controller_sha_initial,
    observed_controller_sha_final: observedControllerFinal,
    profile_id: execution.profile_id,
    profile_version: execution.profile_version,
    command_fingerprint: execution.command_fingerprint,
    candidate_fingerprints: execution.candidate_fingerprints,
    runner_class: execution.runner_class,
    runner_labels: execution.runner_labels,
    environment: execution.environment,
    commands_required: execution.commands_required,
    commands_run: execution.commands_run,
    per_command_exit: execution.per_command_exit,
    npm_test_count: execution.npm_test_count ?? null,
    npm_test_pass: execution.npm_test_pass ?? null,
    npm_test_fail: execution.npm_test_fail ?? null,
    npm_test_skip: execution.npm_test_skip ?? null,
    worktree_clean_final: execution.worktree_clean_final,
    workspace_cleanup_final: execution.workspace_cleanup_final,
    workflow_run_id: String(workflowRunId),
    workflow_run_attempt: String(workflowRunAttempt),
    execution_artifact_id: String(executionArtifactId),
    receipt_artifact_name: receiptArtifactName,
    execution_identity: execution.execution_identity,
    evidence_class: "actions-repository-deterministic",
    semantic_review: "NOT_EVALUATED",
    host_specific_evidence: "NOT_EVALUATED",
    execution_result: execution.result,
    execution_block_reason: execution.block_reason,
    final_identity_result: finalIdentityResult,
    final_identity_reason: finalIdentityReason,
    block_reason: result === "BLOCKED" ? (finalIdentityResult === "BLOCKED" ? "FINAL_PR_IDENTITY_BLOCKED" : execution.block_reason) : null,
    result,
  }
  if (!/^\d+$/.test(receipt.execution_artifact_id)) throw new Error("execution_artifact_id must be numeric")
  if (typeof receipt.receipt_artifact_name !== "string" || receipt.receipt_artifact_name.length < 1 || receipt.receipt_artifact_name.length > 255) throw new Error("receipt_artifact_name invalid")
  receipt.receipt_sha256 = receiptDigest(receipt)
  return receipt
}

export function receiptDigest(receipt) {
  const copy = { ...receipt }
  delete copy.receipt_sha256
  return sha256Hex(canonicalJson(copy))
}

export function validateReceipt(receipt, profile, dispatch) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) throw new Error("receipt must be an object")
  if (receipt.schema_version !== RECEIPT_SCHEMA) throw new Error("unsupported receipt schema")
  if (!RESULT_VALUES.has(receipt.result)) throw new Error("invalid receipt result")
  if (receipt.receipt_sha256 !== receiptDigest(receipt)) throw new Error("receipt digest mismatch")
  if (!RESULT_VALUES.has(receipt.execution_result)) throw new Error("invalid receipt execution_result")
  validateExecutionRecord({ ...receipt, schema_version: EXECUTION_SCHEMA, result: receipt.execution_result, block_reason: receipt.execution_block_reason }, profile, dispatch)
  assertSha(receipt.observed_base_sha_final, "observed_base_sha_final")
  assertSha(receipt.observed_head_sha_final, "observed_head_sha_final")
  if (!new Set(["PASS", "BLOCKED", "STALE"]).has(receipt.final_identity_result)) throw new Error("invalid final_identity_result")
  if (typeof receipt.final_identity_reason !== "string" || !/^[A-Z0-9_]{3,64}$/.test(receipt.final_identity_reason)) throw new Error("invalid final_identity_reason")
  const allowedFinalReasons = {
    PASS: new Set(["IDENTITY_MATCH"]),
    STALE: new Set(["REMOTE_IDENTITY_CHANGED", "CONTROLLER_REF_MOVED"]),
    BLOCKED: new Set(["PR_RESPONSE_INVALID", "PR_NOT_OPEN", "PR_NUMBER_MISMATCH", "FORK_OR_FOREIGN_HEAD_DENIED", "BASE_REF_NOT_MAIN"]),
  }
  if (!allowedFinalReasons[receipt.final_identity_result].has(receipt.final_identity_reason)) throw new Error("final identity reason conflicts with result")
  assertSha(receipt.observed_controller_sha_initial, "observed_controller_sha_initial")
  assertSha(receipt.observed_controller_sha_final, "observed_controller_sha_final")
  if (receipt.observed_controller_sha_initial !== dispatch.expected_controller_sha) throw new Error("receipt initial controller identity mismatch")
  const authorityMoved = receipt.observed_base_sha_final !== dispatch.expected_base_sha || receipt.observed_head_sha_final !== dispatch.expected_head_sha || receipt.observed_controller_sha_final !== dispatch.expected_controller_sha
  if (receipt.final_identity_result === "PASS" && authorityMoved) throw new Error("PASS final identity conflicts with observed remote/controller movement")
  if (receipt.final_identity_result === "STALE" && !authorityMoved) throw new Error("STALE final identity requires observed authority movement")
  if (receipt.final_identity_reason === "CONTROLLER_REF_MOVED" && receipt.observed_controller_sha_final === dispatch.expected_controller_sha) throw new Error("controller movement reason conflicts with observed controller identity")
  const expectedResult = receipt.final_identity_result === "STALE" ? "STALE" : receipt.final_identity_result === "BLOCKED" ? "BLOCKED" : receipt.execution_result
  if (receipt.result !== expectedResult) throw new Error("receipt final result conflicts with execution/final identity")
  if (!/^\d+$/.test(receipt.workflow_run_id ?? "") || !/^\d+$/.test(receipt.workflow_run_attempt ?? "")) throw new Error("receipt workflow run identity missing")
  if (receipt.repository !== receipt.repository?.trim()) throw new Error("receipt repository whitespace")
  assertRepository(receipt.repository)
  if (receipt.pr_number !== dispatch.pr_number) throw new Error("receipt pr_number mismatch")
  if (receipt.expected_base_sha !== dispatch.expected_base_sha || receipt.expected_head_sha !== dispatch.expected_head_sha) throw new Error("receipt expected identity mismatch")
  if (receipt.controller_commit_sha !== dispatch.expected_controller_sha) throw new Error("receipt controller mismatch")
  if (receipt.profile_id !== profile.profile_id || receipt.profile_version !== profile.profile_version || receipt.command_fingerprint !== commandFingerprint(profile)) throw new Error("receipt profile mismatch")
  if (!/^\d+$/.test(receipt.execution_artifact_id ?? "")) throw new Error("receipt execution artifact identity missing")
  if (typeof receipt.receipt_artifact_name !== "string" || receipt.receipt_artifact_name.length < 1) throw new Error("receipt artifact name missing")
  if (receipt.evidence_class !== "actions-repository-deterministic" || receipt.semantic_review !== "NOT_EVALUATED" || receipt.host_specific_evidence !== "NOT_EVALUATED") throw new Error("receipt evidence-class boundary mismatch")
  const expectedBlockReason = receipt.result !== "BLOCKED"
    ? null
    : receipt.final_identity_result === "BLOCKED"
      ? "FINAL_PR_IDENTITY_BLOCKED"
      : receipt.execution_block_reason
  if (receipt.block_reason !== expectedBlockReason) throw new Error("receipt block_reason conflicts with execution/final identity")
  if (receipt.result === "BLOCKED" && (typeof receipt.block_reason !== "string" || !/^[A-Z0-9_]{3,64}$/.test(receipt.block_reason))) throw new Error("BLOCKED receipt requires block_reason")
  if (receipt.result === "PASS") {
    if (receipt.observed_base_sha_initial !== dispatch.expected_base_sha || receipt.observed_base_sha_final !== dispatch.expected_base_sha) throw new Error("PASS base identity mismatch")
    if (receipt.observed_head_sha_initial !== dispatch.expected_head_sha || receipt.observed_head_sha_final !== dispatch.expected_head_sha) throw new Error("PASS head identity mismatch")
    if (receipt.observed_controller_sha_initial !== dispatch.expected_controller_sha || receipt.observed_controller_sha_final !== dispatch.expected_controller_sha) throw new Error("PASS controller identity mismatch")
    if (receipt.observed_candidate_head_initial !== dispatch.expected_head_sha || receipt.observed_candidate_head_final !== dispatch.expected_head_sha) throw new Error("PASS candidate checkout identity mismatch")
    if (receipt.commands_run !== receipt.commands_required || receipt.per_command_exit.some((entry) => entry.exit !== 0 || (entry.signal !== null && entry.signal !== undefined))) throw new Error("PASS command evidence incomplete")
    if (!receipt.worktree_clean_final || !receipt.workspace_cleanup_final) throw new Error("PASS cleanup evidence incomplete")
  }
  return receipt
}

export function statusForResult(result) {
  if (result === "PASS") return { state: "success", description: "Exact-head repository Verify PASS" }
  if (result === "FAIL") return { state: "failure", description: "Exact-head repository Verify FAIL" }
  if (result === "STALE") return { state: "error", description: "Exact-head repository Verify STALE" }
  return { state: "error", description: "Exact-head repository Verify BLOCKED" }
}
