import { createHash } from "node:crypto"
import { spawn, spawnSync } from "node:child_process"
import { constants } from "node:fs"
import { mkdir, lstat, open, readFile, realpath, stat, writeFile } from "node:fs/promises"
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path"

export const LOCAL_ASSESSMENT_SCHEMA = "opencode-local-assessment-v1"
export const ASSESSMENT_SPEC_ROOT = "/tmp/opencode/verify/assessments"
export const ASSESSMENT_WORKTREE_ROOT = "/tmp/opencode/verify/worktrees"
export const ASSESSMENT_EVIDENCE_ROOT = "/tmp/opencode/verify/evidence"
export const ASSESSMENT_NATIVE_RESULT_ROOT = "/tmp/opencode/verify/results"

const ASSESSMENT_ID = /^[a-z0-9][a-z0-9_-]{0,47}$/
const LOWER_SHA = /^[0-9a-f]{40}$/
const SHA256 = /^[0-9a-f]{64}$/
const REMOTE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const REF_PART = /^(?!-)(?!.*(?:^|\/)\.\.?($|\/))(?!.*\.\.)(?!.*@\{)(?!.*[~^:?*\[\\\s])[^\x00-\x20\x7f]+$/
const PLACEHOLDER = /\{([a-z_]+)\}/g
const ALLOWED_PLACEHOLDERS = new Set([
  "assessment_id",
  "base_sha",
  "evidence_path",
  "head_sha",
  "pr_number",
  "repo_root",
  "venv",
  "worktree",
])
const MAX_SPEC_BYTES = 65536
const MAX_RUNNER_ARGV = 256
const MAX_RUNNER_ARG_BYTES = 4096
const MAX_INTEGRITY_FILES = 32
const MAX_EVIDENCE_BYTES = 4 * 1024 * 1024
const GIT_MAX_BUFFER = 4 * 1024 * 1024
const RUNNER_EXECUTIONS = new Set(["gateway-owned", "repository-owned"])
const RUNNER_AUTHORITIES = new Set(["base", "head"])
const REPOSITORY_RESULT_CONTRACT = "local-agent-assessment-v1"
const NATIVE_RESULTS = new Set(["PASS", "FAIL", "BLOCKED", "STALE", "INFRA_ERROR", "ISOLATION_BREACH"])
const NATIVE_EXIT_CODES = new Map([
  ["PASS", 0],
  ["FAIL", 1],
  ["BLOCKED", 2],
  ["STALE", 3],
  ["INFRA_ERROR", 4],
  ["ISOLATION_BREACH", 5],
])

function assessmentError(message, kind = "BLOCKED") {
  const error = new Error(`repo-pr-assessment: ${message}`)
  error.assessmentKind = kind
  return error
}

function safeRelativePath(path, label) {
  if (typeof path !== "string" || path.length < 1 || path.length > 512 || isAbsolute(path) || /[\r\n\0]/.test(path)) {
    throw assessmentError(`${label} must be a bounded repository-relative path`)
  }
  const normalized = path.replaceAll("\\", "/")
  if (normalized === "." || normalized.startsWith("../") || normalized.includes("/../") || normalized.endsWith("/..")) {
    throw assessmentError(`${label} must stay inside the repository`)
  }
  return normalized.replace(/^\.\//, "")
}

function safeRefName(value, label) {
  if (typeof value !== "string" || value.length < 1 || value.length > 240 || !REF_PART.test(value) || value.endsWith(".") || value.endsWith("/")) {
    throw assessmentError(`${label} is not a bounded branch ref name`)
  }
  return value
}

function safeHeadRef(value, prNumber) {
  if (value === `refs/pull/${prNumber}/head`) return value
  if (typeof value === "string" && value.startsWith("refs/")) {
    throw assessmentError(`repository.head_ref may use only canonical refs/pull/${prNumber}/head or a branch name`)
  }
  return safeRefName(value, "repository.head_ref")
}

function headSourceRef(headRef) {
  return headRef.startsWith("refs/") ? headRef : `refs/heads/${headRef}`
}

function normalizeIntegrityFiles(value, { requirePins = false } = {}) {
  if (!Array.isArray(value) || value.length > MAX_INTEGRITY_FILES) {
    throw assessmentError(`integrity_files must contain at most ${MAX_INTEGRITY_FILES} entries`)
  }
  const entries = value.map((entry) => {
    if (typeof entry === "string") {
      if (requirePins) throw assessmentError("repository-owned integrity_files entries must pin blob_sha")
      return { path: safeRelativePath(entry, "integrity_files entry"), expectedBlobSha: undefined, expectedSha256: undefined }
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw assessmentError("integrity_files entries must be paths or {path, blob_sha, optional sha256} objects")
    }
    const path = safeRelativePath(entry.path, "integrity_files entry.path")
    if (requirePins && !LOWER_SHA.test(entry.blob_sha ?? "")) throw assessmentError(`integrity_files blob_sha is invalid for ${path}`)
    if (entry.blob_sha !== undefined && !LOWER_SHA.test(entry.blob_sha)) throw assessmentError(`integrity_files blob_sha is invalid for ${path}`)
    if (entry.sha256 !== undefined && !SHA256.test(entry.sha256)) throw assessmentError(`integrity_files sha256 is invalid for ${path}`)
    return { path, expectedBlobSha: entry.blob_sha, expectedSha256: entry.sha256 }
  })
  if (new Set(entries.map((entry) => entry.path)).size !== entries.length) {
    throw assessmentError("integrity_files must not contain duplicate paths")
  }
  if (requirePins && entries.length === 0) {
    throw assessmentError("repository-owned assessment requires pinned integrity_files")
  }
  return entries
}

function validateTemplateArgv(argv, label, { required = [] } = {}) {
  if (!Array.isArray(argv) || argv.length < 1 || argv.length > MAX_RUNNER_ARGV) {
    throw assessmentError(`${label} must contain 1-${MAX_RUNNER_ARGV} arguments`)
  }
  const seen = new Set()
  for (const [index, value] of argv.entries()) {
    if (typeof value !== "string" || value.length < 1 || value.length > MAX_RUNNER_ARG_BYTES || /[\r\n\0]/.test(value)) {
      throw assessmentError(`${label}[${index}] is not a bounded argument string`)
    }
    for (const match of value.matchAll(PLACEHOLDER)) {
      if (!ALLOWED_PLACEHOLDERS.has(match[1])) throw assessmentError(`${label}[${index}] uses unsupported placeholder {${match[1]}}`)
      seen.add(match[1])
    }
    const residue = value.replaceAll(PLACEHOLDER, "")
    if (/[{}]/.test(residue)) throw assessmentError(`${label}[${index}] contains malformed placeholder syntax`)
  }
  for (const placeholder of required) {
    if (!seen.has(placeholder)) throw assessmentError(`${label} must bind {${placeholder}}`)
  }
  return argv.slice()
}

export function parseRepoPrAssessmentSpec(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw assessmentError("spec root must be an object")
  if (value.schema_version !== LOCAL_ASSESSMENT_SCHEMA) throw assessmentError(`spec must use ${LOCAL_ASSESSMENT_SCHEMA}`)
  if (value.kind !== "repo-pr") throw assessmentError("spec kind must be repo-pr")
  if (!ASSESSMENT_ID.test(value.assessment_id ?? "")) throw assessmentError("assessment_id is invalid")
  if (!Number.isInteger(value.pr_number) || value.pr_number < 1 || value.pr_number > 2_147_483_647) throw assessmentError("pr_number must be a positive integer")

  const repository = value.repository
  if (!repository || typeof repository !== "object" || Array.isArray(repository)) throw assessmentError("repository must be an object")
  const remote = repository.remote ?? "origin"
  if (!REMOTE_NAME.test(remote)) throw assessmentError("repository.remote is invalid")
  if (typeof repository.base_ref === "string" && repository.base_ref.startsWith("refs/")) {
    throw assessmentError("repository.base_ref must be a branch name, not a full ref")
  }
  const baseRef = safeRefName(repository.base_ref, "repository.base_ref")
  const headRef = safeHeadRef(repository.head_ref, value.pr_number)
  const baseSha = repository.base_sha
  const headSha = repository.head_sha
  if (!LOWER_SHA.test(baseSha ?? "")) throw assessmentError("repository.base_sha must be 40 lowercase hexadecimal characters")
  if (!LOWER_SHA.test(headSha ?? "")) throw assessmentError("repository.head_sha must be 40 lowercase hexadecimal characters")

  const environment = value.environment ?? {}
  if (!environment || typeof environment !== "object" || Array.isArray(environment)) throw assessmentError("environment must be an object")
  let venv
  if (environment.venv !== undefined) {
    if (typeof environment.venv !== "string" || !isAbsolute(environment.venv) || environment.venv.length > 1024 || /[\r\n\0]/.test(environment.venv)) {
      throw assessmentError("environment.venv must be a bounded absolute path")
    }
    venv = resolve(environment.venv)
  }

  const runner = value.runner
  if (!runner || typeof runner !== "object" || Array.isArray(runner)) throw assessmentError("runner must be an object")
  const runnerPath = safeRelativePath(runner.path, "runner.path")
  const execution = runner.execution ?? "gateway-owned"
  if (!RUNNER_EXECUTIONS.has(execution)) throw assessmentError("runner.execution must be gateway-owned or repository-owned")
  const authority = runner.authority
  const runnerBlobSha = runner.blob_sha
  const runnerSha256 = runner.sha256
  const resultContract = runner.result_contract
  let planArgv
  let runArgv
  if (execution === "gateway-owned") {
    if (authority !== undefined || runnerBlobSha !== undefined || runnerSha256 !== undefined || resultContract !== undefined) {
      throw assessmentError("gateway-owned runner must not declare repository-owned authority fields")
    }
    const requiredAuthority = ["base_sha", "head_sha", "pr_number"]
    planArgv = runner.plan_argv === undefined ? undefined : validateTemplateArgv(runner.plan_argv, "runner.plan_argv", { required: requiredAuthority })
    if (planArgv?.some((arg) => arg.includes("{evidence_path}"))) throw assessmentError("runner.plan_argv must not bind {evidence_path}")
    runArgv = validateTemplateArgv(runner.run_argv, "runner.run_argv", { required: [...requiredAuthority, "evidence_path"] })
  } else {
    if (!RUNNER_AUTHORITIES.has(authority)) throw assessmentError("repository-owned runner.authority must be base or head")
    if (!LOWER_SHA.test(runnerBlobSha ?? "")) throw assessmentError("repository-owned runner.blob_sha must be 40 lowercase hexadecimal characters")
    if (runnerSha256 !== undefined && !SHA256.test(runnerSha256)) throw assessmentError("repository-owned runner.sha256 must be 64 lowercase hexadecimal characters")
    if (resultContract !== REPOSITORY_RESULT_CONTRACT) throw assessmentError(`repository-owned runner.result_contract must be ${REPOSITORY_RESULT_CONTRACT}`)
    planArgv = runner.plan_argv === undefined ? undefined : validateTemplateArgv(runner.plan_argv, "runner.plan_argv", { required: ["head_sha", "pr_number"] })
    runArgv = validateTemplateArgv(runner.run_argv, "runner.run_argv", { required: ["assessment_id", "head_sha", "pr_number"] })
    if ([...(planArgv ?? []), ...runArgv].some((arg) => arg.includes("{evidence_path}"))) {
      throw assessmentError("repository-owned runner argv must not bind {evidence_path}")
    }
  }
  if ([...(planArgv ?? []), ...runArgv].some((arg) => arg.includes("{venv}")) && !venv) {
    throw assessmentError("runner arguments bind {venv} but environment.venv is absent")
  }

  const normalizedIntegrity = normalizeIntegrityFiles(value.integrity_files ?? [], { requirePins: execution === "repository-owned" })

  return {
    schemaVersion: LOCAL_ASSESSMENT_SCHEMA,
    kind: "repo-pr",
    assessmentID: value.assessment_id,
    prNumber: value.pr_number,
    repository: { remote, baseRef, headRef, baseSha, headSha },
    environment: { venv },
    runner: { path: runnerPath, execution, authority, blobSha: runnerBlobSha, sha256: runnerSha256, resultContract, planArgv, runArgv },
    integrityFiles: normalizedIntegrity,
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex")
}

function inside(path, root) {
  const rel = relative(root, path)
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))
}

function git(repoRoot, args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    maxBuffer: GIT_MAX_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (result.error) throw assessmentError(`git ${args[0] ?? ""} failed to start (${result.error.code ?? result.error.message})`, "INFRA_ERROR")
  const code = result.status ?? 1
  const stdout = String(result.stdout ?? "").trim()
  const stderr = String(result.stderr ?? "").trim()
  if (code !== 0 && !allowFailure) throw assessmentError(`git ${args[0] ?? ""} failed (exit=${code}${stderr ? `; ${stderr}` : ""})`, "BLOCKED")
  return { code, stdout, stderr }
}

async function pathExists(path) {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (error?.code === "ENOENT") return false
    throw error
  }
}

function sanitizeSlug(repoRoot) {
  const raw = basename(repoRoot).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "")
  return (raw || "repo").slice(0, 48)
}

export function assessmentBranchName(repoRoot, spec) {
  const slug = sanitizeSlug(repoRoot)
  return `opencode-assess/${slug}-pr${spec.prNumber}-${spec.repository.headSha.slice(0, 12)}-${spec.assessmentID}`
}

export function assessmentWorktreePath(repoRoot, spec, worktreeRoot = ASSESSMENT_WORKTREE_ROOT) {
  const slug = sanitizeSlug(repoRoot)
  return join(worktreeRoot, `${slug}-pr${spec.prNumber}-${spec.repository.headSha.slice(0, 12)}-${spec.assessmentID}`)
}

function renderArgv(template, values) {
  return template.map((arg) => arg.replaceAll(PLACEHOLDER, (_, name) => {
    if (!(name in values) || values[name] === undefined) throw assessmentError(`placeholder {${name}} has no value`)
    return String(values[name])
  }))
}

function runProcess(executable, argv, cwd, environment) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, argv, {
      cwd,
      env: environment,
      shell: false,
      stdio: "inherit",
    })
    child.once("error", rejectPromise)
    child.once("exit", (code, signal) => resolvePromise({ code: code ?? 1, signal: signal ?? null }))
  })
}

async function ownerSnapshot(repoRoot) {
  const head = git(repoRoot, ["rev-parse", "HEAD"]).stdout.toLowerCase()
  const branch = git(repoRoot, ["branch", "--show-current"]).stdout
  const status = git(repoRoot, ["status", "--porcelain=v1", "--untracked-files=normal"]).stdout
  return { head, branch, status }
}

async function trackedRegularFile(worktree, relativePath, label) {
  const tracked = git(worktree, ["ls-files", "--error-unmatch", "--", relativePath], { allowFailure: true })
  if (tracked.code !== 0) throw assessmentError(`${label} is not tracked at the assessed head`, "INFRA_ERROR")
  const requested = resolve(worktree, relativePath)
  if (!inside(requested, worktree)) throw assessmentError(`${label} escapes the assessment worktree`, "INFRA_ERROR")
  const info = await lstat(requested)
  if (info.isSymbolicLink() || !info.isFile()) throw assessmentError(`${label} must be a tracked regular non-symlink file`, "INFRA_ERROR")
  const canonical = await realpath(requested)
  if (!inside(canonical, worktree)) throw assessmentError(`${label} resolves outside the assessment worktree`, "INFRA_ERROR")
  return { path: canonical, sha256: sha256(await readFile(canonical)) }
}

async function validateVenv(venv) {
  if (!venv) return undefined
  let info
  try {
    info = await stat(venv)
  } catch (error) {
    if (error?.code === "ENOENT") throw assessmentError(`canonical venv does not exist (${venv})`, "INFRA_ERROR")
    throw error
  }
  if (!info.isDirectory()) throw assessmentError(`canonical venv is not a directory (${venv})`, "INFRA_ERROR")
  const canonical = await realpath(venv)
  const python = join(canonical, "bin", "python")
  const pythonInfo = await stat(python).catch((error) => {
    throw assessmentError(`canonical venv Python is unavailable (${error.code ?? error.message})`, "INFRA_ERROR")
  })
  if (!pythonInfo.isFile() || (pythonInfo.mode & 0o111) === 0) throw assessmentError("canonical venv Python is not a regular executable target", "INFRA_ERROR")
  return { requested: venv, canonical, python }
}

async function readEvidenceSnapshot(path, allowedRoot) {
  const root = await realpath(resolve(allowedRoot)).catch((error) => {
    throw assessmentError(`runner evidence root is unavailable (${error.code ?? error.message})`, "INFRA_ERROR")
  })
  let handle
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  } catch (error) {
    if (error?.code === "ENOENT") return undefined
    throw assessmentError(`runner evidence cannot be opened as a no-follow file (${error.code ?? error.message})`, "INFRA_ERROR")
  }
  try {
    const info = await handle.stat()
    if (!info.isFile()) throw assessmentError("runner evidence must be a regular non-symlink file", "INFRA_ERROR")
    if (info.size > MAX_EVIDENCE_BYTES) throw assessmentError(`runner evidence exceeds ${MAX_EVIDENCE_BYTES} bytes`, "INFRA_ERROR")
    const canonical = await realpath(`/proc/self/fd/${handle.fd}`).catch((error) => {
      throw assessmentError(`opened runner evidence cannot be resolved (${error.code ?? error.message})`, "INFRA_ERROR")
    })
    if (!inside(canonical, root)) throw assessmentError("runner evidence escaped the bounded evidence root", "INFRA_ERROR")
    const raw = await handle.readFile()
    if (raw.length > MAX_EVIDENCE_BYTES) throw assessmentError(`runner evidence snapshot exceeds ${MAX_EVIDENCE_BYTES} bytes`, "INFRA_ERROR")
    return { raw, bytes: raw.length, sha256: sha256(raw) }
  } finally {
    await handle.close()
  }
}

function refreshRemoteAuthority(repoRoot, spec) {
  git(repoRoot, [
    "fetch",
    "--no-tags",
    spec.repository.remote,
    `+refs/heads/${spec.repository.baseRef}:refs/remotes/${spec.repository.remote}/${spec.repository.baseRef}`,
  ])
  const observedBase = git(repoRoot, [
    "rev-parse",
    "--verify",
    `refs/remotes/${spec.repository.remote}/${spec.repository.baseRef}^{commit}`,
  ]).stdout.toLowerCase()
  git(repoRoot, ["fetch", "--no-tags", spec.repository.remote, headSourceRef(spec.repository.headRef)])
  const observedHead = git(repoRoot, ["rev-parse", "--verify", "FETCH_HEAD^{commit}"]).stdout.toLowerCase()
  return { observedBase, observedHead }
}

function requireRemoteAuthority(repoRoot, spec) {
  const observed = refreshRemoteAuthority(repoRoot, spec)
  if (observed.observedBase !== spec.repository.baseSha || observed.observedHead !== spec.repository.headSha) {
    throw assessmentError(`remote authority mismatch (base=${observed.observedBase}; head=${observed.observedHead})`, "STALE")
  }
  return observed
}

async function pinnedRepositoryFile(repoRoot, authoritySha, relativePath, expectedBlobSha, expectedSha256, label) {
  const file = await trackedRegularFile(repoRoot, relativePath, label)
  if (expectedSha256 !== undefined && file.sha256 !== expectedSha256) {
    throw assessmentError(`${label} sha256 does not match the pinned authority`, "BLOCKED")
  }
  if (expectedBlobSha !== undefined) {
    const raw = git(repoRoot, ["ls-tree", authoritySha, "--", relativePath]).stdout
    const lines = raw ? raw.split("\n") : []
    if (lines.length !== 1) throw assessmentError(`${label} does not resolve exactly at the authority SHA`, "BLOCKED")
    const [metadata, listedPath] = lines[0].split("\t")
    const parts = metadata?.split(/\s+/) ?? []
    if (listedPath !== relativePath || parts.length !== 3 || !["100644", "100755"].includes(parts[0]) || parts[1] !== "blob") {
      throw assessmentError(`${label} is not a regular Git blob at the authority SHA`, "BLOCKED")
    }
    if (parts[2] !== expectedBlobSha) throw assessmentError(`${label} Git blob does not match the pinned authority`, "BLOCKED")
    const workingBlob = git(repoRoot, ["hash-object", "--", relativePath]).stdout
    if (workingBlob !== expectedBlobSha) throw assessmentError(`${label} working bytes differ from the pinned authority`, "STALE")
  }
  return file
}

function nativeEvidencePath(spec) {
  return join(ASSESSMENT_NATIVE_RESULT_ROOT, spec.assessmentID, "assessment.json")
}

function nativeStatusForExit(code) {
  for (const [status, expected] of NATIVE_EXIT_CODES.entries()) {
    if (expected === code) return status
  }
  return undefined
}

async function readRepositoryOwnedEvidence(path, spec, runExit) {
  const snapshot = await readEvidenceSnapshot(path, ASSESSMENT_NATIVE_RESULT_ROOT)
  if (!snapshot) throw assessmentError("repository-owned runner did not create its typed evidence file", "INFRA_ERROR")
  const raw = snapshot.raw
  let document
  try {
    document = JSON.parse(raw.toString("utf8"))
  } catch (error) {
    throw assessmentError(`repository-owned evidence is not strict JSON (${error.message})`, "INFRA_ERROR")
  }
  if (!document || typeof document !== "object" || Array.isArray(document)) throw assessmentError("repository-owned evidence root must be an object", "INFRA_ERROR")
  if (document.schema_version !== spec.runner.resultContract) throw assessmentError("repository-owned evidence schema mismatch", "INFRA_ERROR")
  if (document.assessment_id !== spec.assessmentID || document.target_kind !== "pr-head" || document.pr_number !== spec.prNumber || document.requested_sha !== spec.repository.headSha) {
    throw assessmentError("repository-owned evidence identity does not match the assessment spec", "INFRA_ERROR")
  }
  if (document.gate_decision !== "NOT_EVALUATED") throw assessmentError("repository-owned evidence must preserve GATE_DECISION=NOT_EVALUATED", "INFRA_ERROR")
  if (!NATIVE_RESULTS.has(document.host_evidence_result)) throw assessmentError("repository-owned evidence has an unsupported host result", "INFRA_ERROR")
  if (NATIVE_EXIT_CODES.get(document.host_evidence_result) !== runExit) throw assessmentError("repository-owned runner exit code contradicts typed evidence", "INFRA_ERROR")

  if (document.host_evidence_result === "PASS") {
    for (const [field, expected] of [
      ["tested_sha", spec.repository.headSha],
      ["pr_head_start", spec.repository.headSha],
      ["pr_head_end", spec.repository.headSha],
      ["control_sha", spec.repository.baseSha],
      ["control_ref_start", spec.repository.baseSha],
      ["control_ref_end", spec.repository.baseSha],
    ]) {
      if (document[field] !== expected) throw assessmentError(`repository-owned PASS evidence has mismatched ${field}`, "STALE")
    }
    const cleanup = document.cleanup
    if (!cleanup || cleanup.services_removed !== true || cleanup.worktree_removed !== true || cleanup.materials_removed !== true || !Array.isArray(cleanup.failures) || cleanup.failures.length !== 0) {
      throw assessmentError("repository-owned PASS evidence lacks complete cleanup proof", "ISOLATION_BREACH")
    }
  }

  const cleanup = document.cleanup
  const cleanupPass = Boolean(
    cleanup &&
    cleanup.services_removed === true &&
    cleanup.worktree_removed === true &&
    cleanup.materials_removed === true &&
    Array.isArray(cleanup.failures) &&
    cleanup.failures.length === 0
  )
  return { ...snapshot, document, cleanupPass }
}

function summaryExit(result) {
  if (result === "PASS") return 0
  if (result === "FAIL") return 1
  if (result === "STALE") return 3
  if (result === "ISOLATION_BREACH") return 4
  return 2
}

async function writeSummary(path, summary) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(summary, null, 2)}\n`, { flag: "wx", mode: 0o600 })
}

async function runRepositoryOwnedRepoPrAssessment(spec, {
  repoRoot: requestedRepoRoot = process.cwd(),
  evidenceRoot = ASSESSMENT_EVIDENCE_ROOT,
  specSha256,
} = {}) {
  const repositoryRoot = git(requestedRepoRoot, ["rev-parse", "--show-toplevel"]).stdout
  const repoRoot = await realpath(repositoryRoot)
  const initialOwner = await ownerSnapshot(repoRoot)
  const nativeEvidencePathname = nativeEvidencePath(spec)
  const evidencePath = join(evidenceRoot, `${spec.assessmentID}.runner.json`)
  const summaryPath = join(evidenceRoot, `${spec.assessmentID}.summary.json`)
  const authoritySha = spec.runner.authority === "head" ? spec.repository.headSha : spec.repository.baseSha
  const values = {
    assessment_id: spec.assessmentID,
    base_sha: spec.repository.baseSha,
    evidence_path: nativeEvidencePathname,
    head_sha: spec.repository.headSha,
    pr_number: spec.prNumber,
    repo_root: repoRoot,
    venv: spec.environment.venv,
    worktree: undefined,
  }
  const summary = {
    schema_version: "opencode-repo-pr-assessment-result-v1",
    assessment_id: spec.assessmentID,
    kind: spec.kind,
    pr_number: spec.prNumber,
    repository_root: repoRoot,
    remote: spec.repository.remote,
    base_ref: spec.repository.baseRef,
    head_ref: spec.repository.headRef,
    expected_base_sha: spec.repository.baseSha,
    expected_head_sha: spec.repository.headSha,
    spec_sha256: specSha256 ?? null,
    assessment_branch: null,
    assessment_worktree: null,
    runner_execution: spec.runner.execution,
    runner_authority: spec.runner.authority,
    runner_path: spec.runner.path,
    owner_initial: initialOwner,
    host_evidence_result: "BLOCKED",
    gate_decision: "NOT_EVALUATED",
    runner: { plan: null, run: null },
    integrity: {},
    native_evidence_path: nativeEvidencePathname,
    runner_evidence_path: evidencePath,
    runner_evidence_sha256: null,
    runner_evidence_bytes: null,
    cleanup_result: "NOT_REQUIRED",
  }

  try {
    if (await pathExists(summaryPath)) throw assessmentError(`summary path already exists (${summaryPath})`, "BLOCKED")
    if (await pathExists(evidencePath)) throw assessmentError(`runner evidence path already exists (${evidencePath})`, "BLOCKED")
    if (await pathExists(nativeEvidencePathname)) throw assessmentError(`native runner evidence path already exists (${nativeEvidencePathname})`, "BLOCKED")

    const observed = requireRemoteAuthority(repoRoot, spec)
    summary.observed_base_sha = observed.observedBase
    summary.observed_head_sha = observed.observedHead
    if (initialOwner.head !== authoritySha) throw assessmentError(`repository-owned runner checkout is ${initialOwner.head}, not pinned ${spec.runner.authority} authority ${authoritySha}`, "STALE")
    if (initialOwner.status !== "") throw assessmentError("repository-owned runner checkout must be clean", "BLOCKED")

    const venv = await validateVenv(spec.environment.venv)
    if (venv) {
      summary.canonical_venv = venv
      values.venv = venv.canonical
    }

    const runner = await pinnedRepositoryFile(repoRoot, authoritySha, spec.runner.path, spec.runner.blobSha, spec.runner.sha256, "runner.path")
    const runnerInfo = await stat(runner.path)
    if ((runnerInfo.mode & 0o111) === 0) throw assessmentError("runner.path is not executable", "INFRA_ERROR")
    summary.runner_sha256 = runner.sha256
    for (const entry of spec.integrityFiles) {
      const pinned = await pinnedRepositoryFile(repoRoot, authoritySha, entry.path, entry.expectedBlobSha, entry.expectedSha256, `integrity file ${entry.path}`)
      summary.integrity[entry.path] = pinned.sha256
    }

    const environment = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
    delete environment.LOCAL_AGENT_ASSESSMENT_ALLOWED_ROOT
    delete environment.OPENCODE_OPERATION_GUARD_BYPASS

    if (spec.runner.planArgv) {
      const planArgv = renderArgv(spec.runner.planArgv, values)
      let planResult
      try {
        planResult = await runProcess(runner.path, planArgv, repoRoot, environment)
      } catch (error) {
        throw assessmentError(`runner plan failed to start (${error.code ?? error.message})`, "INFRA_ERROR")
      }
      summary.runner.plan = { exit: planResult.code, signal: planResult.signal }
      if (planResult.signal) throw assessmentError(`runner plan terminated by signal ${planResult.signal}`, "INFRA_ERROR")
      if (planResult.code !== 0) {
        throw assessmentError(`runner plan failed (exit=${planResult.code})`, nativeStatusForExit(planResult.code) ?? "INFRA_ERROR")
      }
      const afterPlanOwner = await ownerSnapshot(repoRoot)
      if (afterPlanOwner.head !== initialOwner.head || afterPlanOwner.branch !== initialOwner.branch || afterPlanOwner.status !== initialOwner.status) {
        throw assessmentError("repository-owned runner plan changed owner checkout HEAD/branch/status", "ISOLATION_BREACH")
      }
      requireRemoteAuthority(repoRoot, spec)
    }

    const runArgv = renderArgv(spec.runner.runArgv, values)
    let runResult
    try {
      runResult = await runProcess(runner.path, runArgv, repoRoot, environment)
    } catch (error) {
      throw assessmentError(`runner run failed to start (${error.code ?? error.message})`, "INFRA_ERROR")
    }
    summary.runner.run = { exit: runResult.code, signal: runResult.signal }
    if (runResult.signal) throw assessmentError(`runner run terminated by signal ${runResult.signal}`, "INFRA_ERROR")

    const evidence = await readRepositoryOwnedEvidence(nativeEvidencePathname, spec, runResult.code)
    await mkdir(evidenceRoot, { recursive: true })
    await writeFile(evidencePath, evidence.raw, { flag: "wx", mode: 0o600 }).catch((error) => {
      throw assessmentError(`could not materialize canonical runner evidence (${error.code ?? error.message})`, "INFRA_ERROR")
    })
    summary.runner_evidence_sha256 = evidence.sha256
    summary.runner_evidence_bytes = evidence.bytes
    summary.native_schema_version = evidence.document.schema_version
    summary.native_host_evidence_result = evidence.document.host_evidence_result
    summary.native_gate_decision = evidence.document.gate_decision
    summary.cleanup_result = evidence.cleanupPass ? "PASS" : "FAILED"
    summary.host_evidence_result = evidence.document.host_evidence_result

    const finalObserved = requireRemoteAuthority(repoRoot, spec)
    summary.final_observed_base_sha = finalObserved.observedBase
    summary.final_observed_head_sha = finalObserved.observedHead
  } catch (error) {
    summary.host_evidence_result = error?.assessmentKind ?? "INFRA_ERROR"
    summary.error = String(error?.message ?? error)
  } finally {
    const finalOwner = await ownerSnapshot(repoRoot).catch((error) => ({ error: error.message }))
    summary.owner_final = finalOwner
    if (!finalOwner.error && (finalOwner.head !== initialOwner.head || finalOwner.branch !== initialOwner.branch || finalOwner.status !== initialOwner.status)) {
      summary.host_evidence_result = "ISOLATION_BREACH"
      summary.error = "repo-pr-assessment: owner workspace HEAD/branch/status changed during repository-owned assessment"
    }
    if (summary.host_evidence_result === "PASS" && summary.cleanup_result !== "PASS") {
      summary.host_evidence_result = "ISOLATION_BREACH"
      summary.error = `repo-pr-assessment: repository-owned native cleanup did not complete (${summary.cleanup_result})`
    }
    await writeSummary(summaryPath, summary).catch((error) => {
      summary.host_evidence_result = "INFRA_ERROR"
      summary.error = `repo-pr-assessment: could not write summary (${error.code ?? error.message})`
    })
  }

  return { ...summary, summary_path: summaryPath, exit_code: summaryExit(summary.host_evidence_result) }
}

export async function runRepoPrAssessment(specInput, {
  repoRoot: requestedRepoRoot = process.cwd(),
  worktreeRoot = ASSESSMENT_WORKTREE_ROOT,
  evidenceRoot = ASSESSMENT_EVIDENCE_ROOT,
  specSha256,
} = {}) {
  const spec = specInput?.schemaVersion === LOCAL_ASSESSMENT_SCHEMA ? specInput : parseRepoPrAssessmentSpec(specInput)
  if (spec.runner.execution === "repository-owned") {
    return runRepositoryOwnedRepoPrAssessment(spec, { repoRoot: requestedRepoRoot, evidenceRoot, specSha256 })
  }
  const repositoryRoot = git(requestedRepoRoot, ["rev-parse", "--show-toplevel"]).stdout
  const repoRoot = await realpath(repositoryRoot)
  const initialOwner = await ownerSnapshot(repoRoot)
  const branchName = assessmentBranchName(repoRoot, spec)
  const worktree = assessmentWorktreePath(repoRoot, spec, worktreeRoot)
  const evidencePath = join(evidenceRoot, `${spec.assessmentID}.runner.json`)
  const summaryPath = join(evidenceRoot, `${spec.assessmentID}.summary.json`)
  const values = {
    assessment_id: spec.assessmentID,
    base_sha: spec.repository.baseSha,
    evidence_path: evidencePath,
    head_sha: spec.repository.headSha,
    pr_number: spec.prNumber,
    venv: spec.environment.venv,
    worktree,
  }

  const summary = {
    schema_version: "opencode-repo-pr-assessment-result-v1",
    assessment_id: spec.assessmentID,
    kind: spec.kind,
    pr_number: spec.prNumber,
    repository_root: repoRoot,
    remote: spec.repository.remote,
    base_ref: spec.repository.baseRef,
    head_ref: spec.repository.headRef,
    expected_base_sha: spec.repository.baseSha,
    expected_head_sha: spec.repository.headSha,
    spec_sha256: specSha256 ?? null,
    assessment_branch: branchName,
    assessment_worktree: worktree,
    runner_path: spec.runner.path,
    owner_initial: initialOwner,
    host_evidence_result: "BLOCKED",
    gate_decision: "NOT_EVALUATED",
    runner: { plan: null, run: null },
    integrity: {},
    runner_evidence_path: evidencePath,
    runner_evidence_sha256: null,
    runner_evidence_bytes: null,
    cleanup_result: "NOT_REQUIRED",
  }

  let worktreeCreated = false
  let cleanupSafe = true
  let terminalError
  try {
    if (await pathExists(summaryPath)) throw assessmentError(`summary path already exists (${summaryPath})`, "BLOCKED")
    if (await pathExists(evidencePath)) throw assessmentError(`runner evidence path already exists (${evidencePath})`, "BLOCKED")
    if (await pathExists(worktree)) throw assessmentError(`assessment worktree path already exists (${worktree})`, "BLOCKED")
    const existingBranch = git(repoRoot, ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`], { allowFailure: true })
    if (existingBranch.code === 0) throw assessmentError(`assessment branch already exists (${branchName})`, "BLOCKED")

    const observed = requireRemoteAuthority(repoRoot, spec)
    summary.observed_base_sha = observed.observedBase
    summary.observed_head_sha = observed.observedHead

    await mkdir(worktreeRoot, { recursive: true })
    await mkdir(evidenceRoot, { recursive: true })
    git(repoRoot, ["worktree", "add", "-b", branchName, worktree, spec.repository.headSha])
    worktreeCreated = true

    const assessedHead = git(worktree, ["rev-parse", "HEAD"]).stdout.toLowerCase()
    const assessedBranch = git(worktree, ["branch", "--show-current"]).stdout
    const assessedStatus = git(worktree, ["status", "--porcelain=v1", "--untracked-files=normal"]).stdout
    summary.assessed_head_sha = assessedHead
    summary.assessed_branch = assessedBranch
    summary.assessed_initial_status = assessedStatus
    if (assessedHead !== spec.repository.headSha || assessedBranch !== branchName || assessedStatus !== "") {
      throw assessmentError("isolated worktree admission did not produce the exact clean named checkout", "ISOLATION_BREACH")
    }

    const venv = await validateVenv(spec.environment.venv)
    if (venv) {
      summary.canonical_venv = venv
      values.venv = venv.canonical
    }

    const runner = await trackedRegularFile(worktree, spec.runner.path, "runner.path")
    const runnerInfo = await stat(runner.path)
    if ((runnerInfo.mode & 0o111) === 0) throw assessmentError("runner.path is not executable", "INFRA_ERROR")
    summary.runner_sha256 = runner.sha256
    for (const integrityEntry of spec.integrityFiles) {
      const entry = await pinnedRepositoryFile(
        worktree,
        spec.repository.headSha,
        integrityEntry.path,
        integrityEntry.expectedBlobSha,
        integrityEntry.expectedSha256,
        `integrity file ${integrityEntry.path}`,
      )
      summary.integrity[integrityEntry.path] = entry.sha256
    }

    const environment = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
    delete environment.LOCAL_AGENT_ASSESSMENT_ALLOWED_ROOT
    delete environment.OPENCODE_OPERATION_GUARD_BYPASS

    if (spec.runner.planArgv) {
      const planArgv = renderArgv(spec.runner.planArgv, values)
      let planResult
      try {
        planResult = await runProcess(runner.path, planArgv, worktree, environment)
      } catch (error) {
        throw assessmentError(`runner plan failed to start (${error.code ?? error.message})`, "INFRA_ERROR")
      }
      summary.runner.plan = { exit: planResult.code, signal: planResult.signal }
      if (planResult.signal || planResult.code !== 0) {
        throw assessmentError(`runner plan failed (exit=${planResult.code}; signal=${planResult.signal ?? "none"})`, "FAIL")
      }
      const postPlanHead = git(worktree, ["rev-parse", "HEAD"]).stdout.toLowerCase()
      const postPlanBranch = git(worktree, ["branch", "--show-current"]).stdout
      const postPlanStatus = git(worktree, ["status", "--porcelain=v1", "--untracked-files=normal"]).stdout
      summary.assessed_post_plan_head_sha = postPlanHead
      summary.assessed_post_plan_branch = postPlanBranch
      summary.assessed_post_plan_status = postPlanStatus
      if (postPlanHead !== spec.repository.headSha || postPlanBranch !== branchName || postPlanStatus !== "") {
        cleanupSafe = false
        throw assessmentError("assessment runner plan changed the isolated checkout identity or cleanliness", "ISOLATION_BREACH")
      }
    }

    const runArgv = renderArgv(spec.runner.runArgv, values)
    let runResult
    try {
      runResult = await runProcess(runner.path, runArgv, worktree, environment)
    } catch (error) {
      throw assessmentError(`runner run failed to start (${error.code ?? error.message})`, "INFRA_ERROR")
    }
    summary.runner.run = { exit: runResult.code, signal: runResult.signal }
    const evidence = await readEvidenceSnapshot(evidencePath, evidenceRoot)
    if (evidence) {
      summary.runner_evidence_sha256 = evidence.sha256
      summary.runner_evidence_bytes = evidence.bytes
    }
    if (runResult.signal || runResult.code !== 0) throw assessmentError(`runner run failed (exit=${runResult.code}; signal=${runResult.signal ?? "none"})`, "FAIL")
    if (!evidence) throw assessmentError("runner exited successfully without creating the declared evidence file", "INFRA_ERROR")

    const finalAssessedHead = git(worktree, ["rev-parse", "HEAD"]).stdout.toLowerCase()
    const finalAssessedBranch = git(worktree, ["branch", "--show-current"]).stdout
    const finalAssessedStatus = git(worktree, ["status", "--porcelain=v1", "--untracked-files=normal"]).stdout
    summary.assessed_final_head_sha = finalAssessedHead
    summary.assessed_final_branch = finalAssessedBranch
    summary.assessed_final_status = finalAssessedStatus
    if (finalAssessedHead !== spec.repository.headSha || finalAssessedBranch !== branchName || finalAssessedStatus !== "") {
      cleanupSafe = false
      throw assessmentError("assessment runner changed the isolated checkout identity or cleanliness", "ISOLATION_BREACH")
    }
    const finalObserved = requireRemoteAuthority(repoRoot, spec)
    summary.final_observed_base_sha = finalObserved.observedBase
    summary.final_observed_head_sha = finalObserved.observedHead
    summary.host_evidence_result = "PASS"
  } catch (error) {
    terminalError = error
    summary.host_evidence_result = error?.assessmentKind ?? "INFRA_ERROR"
    summary.error = String(error?.message ?? error)
  } finally {
    if (worktreeCreated && cleanupSafe) {
      const branchHead = git(repoRoot, ["rev-parse", `refs/heads/${branchName}`], { allowFailure: true })
      if (branchHead.code === 0 && branchHead.stdout.toLowerCase() === spec.repository.headSha) {
        const removed = git(repoRoot, ["worktree", "remove", "--force", worktree], { allowFailure: true })
        if (removed.code === 0) {
          const deleted = git(repoRoot, ["branch", "-D", branchName], { allowFailure: true })
          summary.cleanup_result = deleted.code === 0 ? "PASS" : "FAILED"
        } else {
          summary.cleanup_result = "FAILED"
        }
      } else {
        summary.cleanup_result = "PRESERVED_IDENTITY_CHANGED"
        cleanupSafe = false
      }
    } else if (worktreeCreated) {
      summary.cleanup_result = "PRESERVED_ISOLATION_BREACH"
    }

    const finalOwner = await ownerSnapshot(repoRoot).catch((error) => ({ error: error.message }))
    summary.owner_final = finalOwner
    if (!finalOwner.error && (finalOwner.head !== initialOwner.head || finalOwner.branch !== initialOwner.branch || finalOwner.status !== initialOwner.status)) {
      summary.host_evidence_result = "ISOLATION_BREACH"
      summary.error = "repo-pr-assessment: owner workspace HEAD/branch/status changed during isolated assessment"
    }
    if (summary.host_evidence_result === "PASS" && summary.cleanup_result !== "PASS") {
      summary.host_evidence_result = "ISOLATION_BREACH"
      summary.error = `repo-pr-assessment: assessment cleanup did not complete (${summary.cleanup_result})`
    }
    await writeSummary(summaryPath, summary).catch((error) => {
      summary.host_evidence_result = "INFRA_ERROR"
      summary.error = `repo-pr-assessment: could not write summary (${error.code ?? error.message})`
      if (!terminalError) terminalError = assessmentError(`could not write summary (${error.code ?? error.message})`, "INFRA_ERROR")
    })
  }

  return { ...summary, summary_path: summaryPath, exit_code: summaryExit(summary.host_evidence_result) }
}

export async function loadAssessmentSpec(specPath, specRoot = ASSESSMENT_SPEC_ROOT) {
  const requested = resolve(specPath)
  const root = await realpath(resolve(specRoot)).catch((error) => {
    throw assessmentError(`assessment spec root is unavailable (${error.code ?? error.message})`, "INFRA_ERROR")
  })
  if (!inside(requested, root) || !requested.endsWith(".json")) throw assessmentError(`spec must be a .json file under ${root}`)
  const requestedInfo = await lstat(requested).catch((error) => {
    throw assessmentError(`spec is not readable (${error.code ?? error.message})`)
  })
  if (!requestedInfo.isFile() || requestedInfo.isSymbolicLink()) throw assessmentError("spec must be a regular non-symlink file")
  const canonical = await realpath(requested).catch((error) => {
    throw assessmentError(`spec cannot be resolved (${error.code ?? error.message})`)
  })
  if (!inside(canonical, root)) throw assessmentError("spec resolves outside the allowed assessment root")
  const info = await lstat(canonical)
  if (!info.isFile() || info.isSymbolicLink()) throw assessmentError("spec must resolve to a regular non-symlink file")
  if (info.size > MAX_SPEC_BYTES) throw assessmentError(`spec exceeds ${MAX_SPEC_BYTES} bytes`)
  const bytes = await readFile(canonical)
  let value
  try {
    value = JSON.parse(bytes.toString("utf8"))
  } catch (error) {
    throw assessmentError(`spec is not strict JSON (${error.message})`)
  }
  return { path: canonical, sha256: sha256(bytes), spec: parseRepoPrAssessmentSpec(value) }
}
