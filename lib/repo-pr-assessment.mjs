import { createHash } from "node:crypto"
import { spawn, spawnSync } from "node:child_process"
import { constants } from "node:fs"
import { mkdir, lstat, open, readFile, realpath, rm, stat, unlink, writeFile } from "node:fs/promises"
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const LOCAL_ASSESSMENT_SCHEMA = "opencode-local-assessment-v1"
export const ASSESSMENT_SPEC_ROOT = "/tmp/opencode/verify/assessments"
export const ASSESSMENT_WORKTREE_ROOT = "/tmp/opencode/verify/worktrees"
export const ASSESSMENT_EVIDENCE_ROOT = "/tmp/opencode/verify/evidence"
export const ASSESSMENT_NATIVE_RESULT_ROOT = "/tmp/opencode/verify/results"
export const ASSESSMENT_CONTROL_WORKTREE_ROOT = "/tmp/opencode/control-worktrees"
export const ASSESSMENT_RESERVATION_ROOT = "/tmp/opencode/assessment-reservations"

const RUNNER_SUPERVISOR = fileURLToPath(new URL("../scripts/repo-pr-runner-supervisor.py", import.meta.url))
const SUPERVISOR_DESCENDANTS = 240
const SUPERVISOR_CONTROL_MUTATION = 241
const SUPERVISOR_SETUP_ERROR = 242

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

export function assessmentControlWorktreePath(repoRoot, spec, controlRoot = ASSESSMENT_CONTROL_WORKTREE_ROOT) {
  const slug = sanitizeSlug(repoRoot)
  return join(controlRoot, `${slug}-pr${spec.prNumber}-${spec.repository.headSha.slice(0, 12)}-${spec.assessmentID}`)
}

async function gitCommonDirectory(repoRoot) {
  const raw = git(repoRoot, ["rev-parse", "--git-common-dir"]).stdout
  const requested = isAbsolute(raw) ? raw : resolve(repoRoot, raw)
  return realpath(requested).catch((error) => {
    throw assessmentError(`Git common directory is unavailable (${error.code ?? error.message})`, "INFRA_ERROR")
  })
}

function cloneRepositoryOwnedControlSnapshot(ownerRoot, controlWorktree, authoritySha, remoteName) {
  const remoteURL = git(ownerRoot, ["remote", "get-url", remoteName]).stdout
  if (!remoteURL) throw assessmentError(`repository remote ${remoteName} has no URL`, "BLOCKED")
  git(ownerRoot, ["clone", "--shared", "--no-checkout", "--origin", remoteName, ".", controlWorktree])
  git(controlWorktree, ["remote", "set-url", remoteName, remoteURL])
  git(controlWorktree, ["checkout", "--detach", authoritySha])
}

function renderArgv(template, values) {
  return template.map((arg) => arg.replaceAll(PLACEHOLDER, (_, name) => {
    if (!(name in values) || values[name] === undefined) throw assessmentError(`placeholder {${name}} has no value`)
    return String(values[name])
  }))
}

function runProcess(executable, argv, cwd, environment, {
  executableHandle,
  cwdHandle,
  gitHandle,
  writeRoots = [],
  watchRoot,
  watchPaths = [],
} = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const supervised = executableHandle !== undefined
    const descriptorCwd = supervised && cwdHandle !== undefined
    const supervisorArgv = supervised ? [
      RUNNER_SUPERVISOR,
      ...(descriptorCwd ? ["--cwd-fd", "4"] : ["--cwd", cwd]),
      ...writeRoots.flatMap((path) => ["--write-root", path]),
      ...(watchRoot ? ["--watch-root", watchRoot] : []),
      ...watchPaths.flatMap((path) => ["--watch", path]),
      "--",
      ...argv,
    ] : argv
    const supervisedStdio = ["inherit", "inherit", "inherit", executableHandle?.fd]
    if (descriptorCwd) supervisedStdio.push(cwdHandle.fd)
    if (gitHandle !== undefined) supervisedStdio.push(gitHandle.fd)
    const child = spawn(supervised ? "/usr/bin/python3" : executable, supervisorArgv, {
      cwd,
      env: environment,
      shell: false,
      stdio: supervised ? supervisedStdio : "inherit",
    })
    child.once("error", rejectPromise)
    child.once("exit", (rawCode, signal) => {
      const code = rawCode ?? 1
      if (supervised && code === SUPERVISOR_DESCENDANTS) {
        resolvePromise({ code: 0, signal: signal ?? null, survivingDescendants: true, controlMutation: false, supervisorError: false })
        return
      }
      if (supervised && code === SUPERVISOR_CONTROL_MUTATION) {
        resolvePromise({ code: 0, signal: signal ?? null, survivingDescendants: false, controlMutation: true, supervisorError: false })
        return
      }
      if (supervised && code === SUPERVISOR_SETUP_ERROR) {
        resolvePromise({ code: 1, signal: signal ?? null, survivingDescendants: false, controlMutation: false, supervisorError: true })
        return
      }
      resolvePromise({ code, signal: signal ?? null, survivingDescendants: false, controlMutation: false, supervisorError: false })
    })
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

async function openAdmittedExecutable(path, expectedSha256, label) {
  let handle
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  } catch (error) {
    throw assessmentError(`${label} cannot be opened as an admitted no-follow executable (${error.code ?? error.message})`, "INFRA_ERROR")
  }
  try {
    const info = await handle.stat()
    if (!info.isFile() || (info.mode & 0o111) === 0) throw assessmentError(`${label} admitted descriptor is not a regular executable file`, "INFRA_ERROR")
    const bytes = await handle.readFile()
    const actualSha256 = sha256(bytes)
    if (actualSha256 !== expectedSha256) throw assessmentError(`${label} descriptor bytes differ from the admitted runner`, "ISOLATION_BREACH")
    return handle
  } catch (error) {
    await handle.close().catch(() => {})
    throw error
  }
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

async function anchorDirectory(path, label, { create = false } = {}) {
  const requested = resolve(path)
  if (create) await mkdir(requested, { recursive: true })
  let handle
  try {
    handle = await open(requested, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)
  } catch (error) {
    throw assessmentError(`${label} cannot be opened as a no-follow directory (${error.code ?? error.message})`, "INFRA_ERROR")
  }
  try {
    const info = await handle.stat()
    if (!info.isDirectory()) throw assessmentError(`${label} must be a directory`, "INFRA_ERROR")
    const canonical = await realpath(`/proc/self/fd/${handle.fd}`).catch((error) => {
      throw assessmentError(`${label} opened directory cannot be resolved (${error.code ?? error.message})`, "INFRA_ERROR")
    })
    if (canonical !== requested) throw assessmentError(`${label} must not traverse symlinked path components`, "INFRA_ERROR")
    return { requested, canonical, dev: info.dev, ino: info.ino, handle, fdPath: `/proc/self/fd/${handle.fd}` }
  } catch (error) {
    await handle.close().catch(() => {})
    throw error
  }
}

async function anchorRepositoryOwnedEvidenceRoots(evidenceRoot) {
  const evidenceAnchor = await anchorDirectory(evidenceRoot, "repository-owned evidence root", { create: true })
  try {
    const nativeAnchor = await anchorDirectory(ASSESSMENT_NATIVE_RESULT_ROOT, "repository-owned native-result root", { create: true })
    return { evidenceAnchor, nativeAnchor }
  } catch (error) {
    await evidenceAnchor.handle.close().catch(() => {})
    throw error
  }
}

async function anchorRepositoryOwnedResources(repoRoot, evidenceRoot) {
  const ownerAnchor = await anchorDirectory(repoRoot, "owner repository root")
  try {
    const { evidenceAnchor, nativeAnchor } = await anchorRepositoryOwnedEvidenceRoots(evidenceRoot)
    try {
      const reservationAnchor = await anchorDirectory(ASSESSMENT_RESERVATION_ROOT, "repository-owned reservation root", { create: true })
      return { ownerAnchor, evidenceAnchor, nativeAnchor, reservationAnchor }
    } catch (error) {
      await nativeAnchor.handle.close().catch(() => {})
      await evidenceAnchor.handle.close().catch(() => {})
      throw error
    }
  } catch (error) {
    await ownerAnchor.handle.close().catch(() => {})
    throw error
  }
}

async function revalidateDirectoryAnchor(anchor, label) {
  let info
  try {
    info = await lstat(anchor.requested)
  } catch (error) {
    throw assessmentError(`${label} pathname became unavailable (${error.code ?? error.message})`, "ISOLATION_BREACH")
  }
  if (info.isSymbolicLink() || !info.isDirectory() || info.dev !== anchor.dev || info.ino !== anchor.ino) {
    throw assessmentError(`${label} pathname no longer identifies the admitted directory`, "ISOLATION_BREACH")
  }
  const canonical = await realpath(anchor.requested).catch((error) => {
    throw assessmentError(`${label} pathname cannot be resolved (${error.code ?? error.message})`, "ISOLATION_BREACH")
  })
  if (canonical !== anchor.canonical) throw assessmentError(`${label} canonical identity changed during assessment`, "ISOLATION_BREACH")
}

function anchoredChildPath(anchor, relativePath, label = "anchored path") {
  return join(anchor.fdPath, safeRelativePath(relativePath, label))
}

async function anchoredPathExists(anchor, relativePath) {
  try {
    await lstat(anchoredChildPath(anchor, relativePath))
    return true
  } catch (error) {
    if (error?.code === "ENOENT") return false
    throw error
  }
}

async function reserveNativeAssessmentID(anchor, assessmentID) {
  const relativePath = `.opencode-reservation-${assessmentID}`
  const path = anchoredChildPath(anchor, relativePath, "native result reservation")
  let handle
  try {
    handle = await open(
      path,
      constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | constants.O_NOFOLLOW,
      0o600,
    )
  } catch (error) {
    if (error?.code === "EEXIST") throw assessmentError(`native result reservation already exists (${relativePath})`, "BLOCKED")
    throw assessmentError(`native result reservation could not be created (${error.code ?? error.message})`, "INFRA_ERROR")
  }
  try {
    const info = await handle.stat()
    if (!info.isFile()) throw assessmentError("native result reservation is not a regular file", "INFRA_ERROR")
    await handle.writeFile(`${process.pid}\n`, { encoding: "utf8" })
    return { relativePath, handle, dev: info.dev, ino: info.ino }
  } catch (error) {
    await handle.close().catch(() => {})
    await unlink(path).catch(() => {})
    throw error
  }
}

async function revalidateNativeAssessmentReservation(anchor, reservation) {
  let info
  try {
    info = await lstat(anchoredChildPath(anchor, reservation.relativePath, "native result reservation"))
  } catch (error) {
    throw assessmentError(`native result reservation became unavailable (${error.code ?? error.message})`, "ISOLATION_BREACH")
  }
  if (info.isSymbolicLink() || !info.isFile() || info.dev !== reservation.dev || info.ino !== reservation.ino) {
    throw assessmentError("native result reservation identity changed during assessment", "ISOLATION_BREACH")
  }
}

async function releaseNativeAssessmentReservation(anchor, reservation) {
  await revalidateNativeAssessmentReservation(anchor, reservation)
  const path = anchoredChildPath(anchor, reservation.relativePath, "native result reservation")
  try {
    await unlink(path)
  } catch (error) {
    throw assessmentError(`native result reservation could not be released (${error.code ?? error.message})`, "ISOLATION_BREACH")
  } finally {
    await reservation.handle.close().catch(() => {})
  }
}

async function readEvidenceSnapshot(anchor, relativePath) {
  const safe = safeRelativePath(relativePath, "runner evidence path")
  const parts = safe.split("/")
  const directoryHandles = []
  let parent = anchor.fdPath
  try {
    for (const part of parts.slice(0, -1)) {
      let directoryHandle
      try {
        directoryHandle = await open(join(parent, part), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)
      } catch (error) {
        if (error?.code === "ENOENT") return undefined
        throw assessmentError(`runner evidence parent cannot be opened as a no-follow directory (${error.code ?? error.message})`, "INFRA_ERROR")
      }
      const info = await directoryHandle.stat()
      if (!info.isDirectory()) {
        await directoryHandle.close().catch(() => {})
        throw assessmentError("runner evidence parent must be a real directory", "INFRA_ERROR")
      }
      directoryHandles.push(directoryHandle)
      parent = `/proc/self/fd/${directoryHandle.fd}`
    }
    let handle
    try {
      handle = await open(join(parent, parts.at(-1)), constants.O_RDONLY | constants.O_NOFOLLOW)
    } catch (error) {
      if (error?.code === "ENOENT") return undefined
      throw assessmentError(`runner evidence cannot be opened as a no-follow file (${error.code ?? error.message})`, "INFRA_ERROR")
    }
    try {
      const info = await handle.stat()
      if (!info.isFile()) throw assessmentError("runner evidence must be a regular non-symlink file", "INFRA_ERROR")
      if (info.size > MAX_EVIDENCE_BYTES) throw assessmentError(`runner evidence exceeds ${MAX_EVIDENCE_BYTES} bytes`, "INFRA_ERROR")
      const raw = await handle.readFile()
      if (raw.length > MAX_EVIDENCE_BYTES) throw assessmentError(`runner evidence snapshot exceeds ${MAX_EVIDENCE_BYTES} bytes`, "INFRA_ERROR")
      return { raw, bytes: raw.length, sha256: sha256(raw) }
    } finally {
      await handle.close()
    }
  } finally {
    for (const handle of directoryHandles.reverse()) await handle.close().catch(() => {})
  }
}

async function recoverAnchoredPath(anchor, relativePath, label) {
  const currentRoot = await realpath(anchor.fdPath).catch((error) => {
    throw assessmentError(`${label} anchored directory has no recoverable pathname (${error.code ?? error.message})`, "INFRA_ERROR")
  })
  if (currentRoot.endsWith(" (deleted)")) throw assessmentError(`${label} anchored directory was unlinked and has no durable pathname`, "INFRA_ERROR")
  return join(currentRoot, safeRelativePath(relativePath, label))
}

async function writeAnchoredFile(anchor, relativePath, bytes, label) {
  const path = anchoredChildPath(anchor, relativePath, label)
  await writeFile(path, bytes, { flag: "wx", mode: 0o600 }).catch((error) => {
    throw assessmentError(`${label} could not be materialized (${error.code ?? error.message})`, "INFRA_ERROR")
  })
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

async function readRepositoryOwnedEvidence(nativeAnchor, relativePath, spec, runExit) {
  const snapshot = await readEvidenceSnapshot(nativeAnchor, relativePath)
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

async function writeSummary(anchor, relativePath, summary) {
  await writeAnchoredFile(anchor, relativePath, `${JSON.stringify(summary, null, 2)}\n`, "outer summary")
}

async function revalidatePinnedInputs(repoRoot, authoritySha, runnerPath, runnerExpectedSha256, runnerExpectedBlobSha, integrityFiles, expectedIntegrity, labelPrefix) {
  const runner = await pinnedRepositoryFile(repoRoot, authoritySha, runnerPath, runnerExpectedBlobSha, undefined, `${labelPrefix} runner.path`)
  if (runnerExpectedSha256 !== undefined && runner.sha256 !== runnerExpectedSha256) {
    throw assessmentError(`${labelPrefix} runner bytes changed after admission`, "ISOLATION_BREACH")
  }
  for (const entry of integrityFiles) {
    const pinned = await pinnedRepositoryFile(repoRoot, authoritySha, entry.path, entry.expectedBlobSha, entry.expectedSha256, `${labelPrefix} integrity file ${entry.path}`)
    if (expectedIntegrity?.[entry.path] !== undefined && pinned.sha256 !== expectedIntegrity[entry.path]) {
      throw assessmentError(`${labelPrefix} integrity file ${entry.path} changed after admission`, "ISOLATION_BREACH")
    }
  }
}

async function runRepositoryOwnedRepoPrAssessment(spec, {
  repoRoot: requestedRepoRoot = process.cwd(),
  evidenceRoot = ASSESSMENT_EVIDENCE_ROOT,
  specSha256,
} = {}) {
  const repositoryRoot = git(requestedRepoRoot, ["rev-parse", "--show-toplevel"]).stdout
  const repoRoot = await realpath(repositoryRoot)
  const { ownerAnchor, evidenceAnchor, nativeAnchor, reservationAnchor } = await anchorRepositoryOwnedResources(repoRoot, evidenceRoot)
  const initialOwner = await ownerSnapshot(ownerAnchor.fdPath)
  const nativeEvidencePathname = nativeEvidencePath(spec)
  const nativeEvidenceRelative = join(spec.assessmentID, "assessment.json")
  const evidenceRelative = `${spec.assessmentID}.runner.json`
  const summaryRelative = `${spec.assessmentID}.summary.json`
  const evidencePath = join(evidenceRoot, evidenceRelative)
  const summaryPath = join(evidenceRoot, summaryRelative)
  const authoritySha = spec.runner.authority === "head" ? spec.repository.headSha : spec.repository.baseSha
  const controlWorktree = assessmentControlWorktreePath(repoRoot, spec)
  const values = {
    assessment_id: spec.assessmentID,
    base_sha: spec.repository.baseSha,
    evidence_path: nativeEvidencePathname,
    head_sha: spec.repository.headSha,
    pr_number: spec.prNumber,
    repo_root: "/proc/self/fd/4",
    venv: spec.environment.venv,
    worktree: undefined,
  }
  let runnerHandle
  let nativeReservation
  let returnedSummaryPath = null
  let controlWorktreeCreated = false
  let controlRoot
  let controlGitCommon
  let controlAnchor
  let controlGitAnchor
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
    control_snapshot_worktree: controlWorktree,
    control_snapshot_cleanup: "NOT_CREATED",
    native_result_reservation: null,
    native_result_reservation_cleanup: "NOT_CREATED",
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
    if (await anchoredPathExists(evidenceAnchor, summaryRelative)) throw assessmentError(`summary path already exists (${summaryPath})`, "BLOCKED")
    if (await anchoredPathExists(evidenceAnchor, evidenceRelative)) throw assessmentError(`runner evidence path already exists (${evidencePath})`, "BLOCKED")
    if (await anchoredPathExists(nativeAnchor, spec.assessmentID)) throw assessmentError(`native runner result directory already exists (${join(ASSESSMENT_NATIVE_RESULT_ROOT, spec.assessmentID)})`, "BLOCKED")
    nativeReservation = await reserveNativeAssessmentID(reservationAnchor, spec.assessmentID)
    summary.native_result_reservation = nativeReservation.relativePath
    summary.native_result_reservation_cleanup = "PENDING"

    const observed = requireRemoteAuthority(ownerAnchor.fdPath, spec)
    summary.observed_base_sha = observed.observedBase
    summary.observed_head_sha = observed.observedHead
    if (initialOwner.head !== authoritySha) throw assessmentError(`repository-owned owner checkout is ${initialOwner.head}, not pinned ${spec.runner.authority} authority ${authoritySha}`, "STALE")
    if (initialOwner.status !== "") throw assessmentError("repository-owned owner checkout must be clean", "BLOCKED")
    if (await pathExists(controlWorktree)) throw assessmentError(`control snapshot path already exists (${controlWorktree})`, "BLOCKED")

    await mkdir(ASSESSMENT_CONTROL_WORKTREE_ROOT, { recursive: true })
    cloneRepositoryOwnedControlSnapshot(ownerAnchor.fdPath, controlWorktree, authoritySha, spec.repository.remote)
    controlWorktreeCreated = true
    controlRoot = await realpath(controlWorktree)
    const controlHead = git(controlRoot, ["rev-parse", "HEAD"]).stdout.toLowerCase()
    const controlStatus = git(controlRoot, ["status", "--porcelain=v1", "--untracked-files=normal"]).stdout
    if (controlHead !== authoritySha || controlStatus !== "") {
      throw assessmentError("repository-owned control snapshot is not the exact clean authority checkout", "ISOLATION_BREACH")
    }
    controlGitCommon = await gitCommonDirectory(controlRoot)
    if (!inside(controlGitCommon, controlRoot)) {
      throw assessmentError("repository-owned control snapshot Git metadata escaped the disposable snapshot", "ISOLATION_BREACH")
    }
    controlAnchor = await anchorDirectory(controlRoot, "repository-owned control snapshot root")
    controlGitAnchor = await anchorDirectory(controlGitCommon, "repository-owned control Git metadata")
    summary.control_snapshot_head_sha = controlHead
    summary.control_snapshot_git_common_dir = controlGitCommon

    const venv = await validateVenv(spec.environment.venv)
    if (venv) {
      summary.canonical_venv = venv
      values.venv = venv.canonical
    }

    const runner = await pinnedRepositoryFile(controlAnchor.fdPath, authoritySha, spec.runner.path, spec.runner.blobSha, spec.runner.sha256, "runner.path")
    const runnerInfo = await stat(runner.path)
    if ((runnerInfo.mode & 0o111) === 0) throw assessmentError("runner.path is not executable", "INFRA_ERROR")
    summary.runner_sha256 = runner.sha256
    runnerHandle = await openAdmittedExecutable(runner.path, summary.runner_sha256, "runner.path")
    for (const entry of spec.integrityFiles) {
      const pinned = await pinnedRepositoryFile(controlAnchor.fdPath, authoritySha, entry.path, entry.expectedBlobSha, entry.expectedSha256, `integrity file ${entry.path}`)
      summary.integrity[entry.path] = pinned.sha256
    }

    const environment = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
    delete environment.LOCAL_AGENT_ASSESSMENT_ALLOWED_ROOT
    delete environment.OPENCODE_OPERATION_GUARD_BYPASS
    const writeRoots = [...new Set([dirname(nativeAnchor.canonical), evidenceAnchor.canonical, "/proc/self/fd/5", "/dev/null"])]
    const watchPaths = [spec.runner.path, ...spec.integrityFiles.map((entry) => entry.path)]

    if (spec.runner.planArgv) {
      const planArgv = renderArgv(spec.runner.planArgv, values)
      let planResult
      try {
        planResult = await runProcess(runner.path, planArgv, controlRoot, environment, {
          executableHandle: runnerHandle,
          cwdHandle: controlAnchor.handle,
          gitHandle: controlGitAnchor.handle,
          writeRoots,
          watchRoot: "/proc/self/fd/4",
          watchPaths,
        })
      } catch (error) {
        throw assessmentError(`runner plan failed to start (${error.code ?? error.message})`, "INFRA_ERROR")
      }
      summary.runner.plan = { exit: planResult.code, signal: planResult.signal }
      if (planResult.supervisorError) throw assessmentError("repository-owned runner supervisor failed during plan", "INFRA_ERROR")
      if (planResult.survivingDescendants) throw assessmentError("repository-owned runner plan left surviving descendants", "ISOLATION_BREACH")
      if (planResult.controlMutation) throw assessmentError("repository-owned control snapshot changed during plan", "ISOLATION_BREACH")
      if (planResult.signal) throw assessmentError(`runner plan terminated by signal ${planResult.signal}`, "INFRA_ERROR")
      if (planResult.code !== 0) {
        throw assessmentError(`runner plan failed (exit=${planResult.code})`, nativeStatusForExit(planResult.code) ?? "INFRA_ERROR")
      }
      const afterPlanOwner = await ownerSnapshot(ownerAnchor.fdPath)
      if (afterPlanOwner.head !== initialOwner.head || afterPlanOwner.branch !== initialOwner.branch || afterPlanOwner.status !== initialOwner.status) {
        throw assessmentError("repository-owned runner plan changed owner checkout HEAD/branch/status", "ISOLATION_BREACH")
      }
      await revalidateDirectoryAnchor(ownerAnchor, "owner repository root")
      requireRemoteAuthority(ownerAnchor.fdPath, spec)
      await revalidateDirectoryAnchor(evidenceAnchor, "repository-owned evidence root")
      await revalidateDirectoryAnchor(nativeAnchor, "repository-owned native-result root")
      await revalidateNativeAssessmentReservation(reservationAnchor, nativeReservation)
      if (await anchoredPathExists(nativeAnchor, spec.assessmentID)) throw assessmentError("repository-owned runner plan materialized the reserved native result directory", "ISOLATION_BREACH")
      await revalidateDirectoryAnchor(controlAnchor, "repository-owned control snapshot root")
      await revalidateDirectoryAnchor(controlGitAnchor, "repository-owned control Git metadata")
      await revalidatePinnedInputs(controlAnchor.fdPath, authoritySha, spec.runner.path, summary.runner_sha256, spec.runner.blobSha, spec.integrityFiles, summary.integrity, "repository-owned post-plan")
    }

    await revalidateDirectoryAnchor(evidenceAnchor, "repository-owned evidence root")
    await revalidateDirectoryAnchor(nativeAnchor, "repository-owned native-result root")
    await revalidateNativeAssessmentReservation(reservationAnchor, nativeReservation)
    if (await anchoredPathExists(nativeAnchor, spec.assessmentID)) throw assessmentError("repository-owned native result directory appeared before run", "ISOLATION_BREACH")
    await revalidateDirectoryAnchor(ownerAnchor, "owner repository root")
    await revalidateDirectoryAnchor(controlAnchor, "repository-owned control snapshot root")
    await revalidateDirectoryAnchor(controlGitAnchor, "repository-owned control Git metadata")
    await revalidatePinnedInputs(controlAnchor.fdPath, authoritySha, spec.runner.path, summary.runner_sha256, spec.runner.blobSha, spec.integrityFiles, summary.integrity, "repository-owned pre-run")
    const runArgv = renderArgv(spec.runner.runArgv, values)
    let runResult
    try {
      runResult = await runProcess(runner.path, runArgv, controlRoot, environment, {
        executableHandle: runnerHandle,
        cwdHandle: controlAnchor.handle,
        gitHandle: controlGitAnchor.handle,
        writeRoots,
        watchRoot: "/proc/self/fd/4",
        watchPaths,
      })
    } catch (error) {
      throw assessmentError(`runner run failed to start (${error.code ?? error.message})`, "INFRA_ERROR")
    }
    summary.runner.run = { exit: runResult.code, signal: runResult.signal }
    if (runResult.supervisorError) throw assessmentError("repository-owned runner supervisor failed during run", "INFRA_ERROR")
    if (runResult.survivingDescendants) throw assessmentError("repository-owned runner run left surviving descendants", "ISOLATION_BREACH")
    if (runResult.controlMutation) throw assessmentError("repository-owned control snapshot changed during run", "ISOLATION_BREACH")
    if (runResult.signal) throw assessmentError(`runner run terminated by signal ${runResult.signal}`, "INFRA_ERROR")

    await revalidateDirectoryAnchor(evidenceAnchor, "repository-owned evidence root")
    await revalidateDirectoryAnchor(nativeAnchor, "repository-owned native-result root")
    await revalidateNativeAssessmentReservation(reservationAnchor, nativeReservation)
    await revalidateDirectoryAnchor(controlAnchor, "repository-owned control snapshot root")
    await revalidateDirectoryAnchor(controlGitAnchor, "repository-owned control Git metadata")
    const evidence = await readRepositoryOwnedEvidence(nativeAnchor, nativeEvidenceRelative, spec, runResult.code)
    await writeAnchoredFile(evidenceAnchor, evidenceRelative, evidence.raw, "canonical runner evidence")
    summary.runner_evidence_sha256 = evidence.sha256
    summary.runner_evidence_bytes = evidence.bytes
    summary.native_schema_version = evidence.document.schema_version
    summary.native_host_evidence_result = evidence.document.host_evidence_result
    summary.native_gate_decision = evidence.document.gate_decision
    summary.cleanup_result = evidence.cleanupPass ? "PASS" : "FAILED"
    summary.host_evidence_result = evidence.document.host_evidence_result

    const finalObserved = requireRemoteAuthority(ownerAnchor.fdPath, spec)
    summary.final_observed_base_sha = finalObserved.observedBase
    summary.final_observed_head_sha = finalObserved.observedHead
  } catch (error) {
    summary.host_evidence_result = error?.assessmentKind ?? "INFRA_ERROR"
    summary.error = String(error?.message ?? error)
  } finally {
    await runnerHandle?.close().catch(() => {})
    runnerHandle = undefined

    if (nativeReservation) {
      try {
        await releaseNativeAssessmentReservation(reservationAnchor, nativeReservation)
        summary.native_result_reservation_cleanup = "PASS"
      } catch (error) {
        summary.native_result_reservation_cleanup = "FAILED"
        summary.host_evidence_result = error?.assessmentKind ?? "ISOLATION_BREACH"
        summary.error = String(error?.message ?? error)
        await nativeReservation.handle.close().catch(() => {})
      }
      nativeReservation = undefined
    }

    if (controlWorktreeCreated) {
      try {
        const cleanupTarget = controlRoot ?? controlWorktree
        if (controlAnchor) await revalidateDirectoryAnchor(controlAnchor, "repository-owned control snapshot root")
        if (controlGitAnchor) await revalidateDirectoryAnchor(controlGitAnchor, "repository-owned control Git metadata")
        const cleanupRepo = controlAnchor?.fdPath ?? cleanupTarget
        const controlHead = git(cleanupRepo, ["rev-parse", "HEAD"], { allowFailure: true })
        const controlStatus = git(cleanupRepo, ["status", "--porcelain=v1", "--untracked-files=normal"], { allowFailure: true })
        if (controlHead.code !== 0 || controlHead.stdout.toLowerCase() !== authoritySha || controlStatus.code !== 0 || controlStatus.stdout !== "") {
          summary.control_snapshot_cleanup = "PRESERVED_IDENTITY_CHANGED"
          summary.host_evidence_result = "ISOLATION_BREACH"
          summary.error = "repo-pr-assessment: repository-owned control snapshot identity or cleanliness changed"
        } else {
          await rm(cleanupTarget, { recursive: true, force: false })
          if (await pathExists(cleanupTarget)) {
            summary.control_snapshot_cleanup = "FAILED"
            summary.host_evidence_result = "ISOLATION_BREACH"
            summary.error = "repo-pr-assessment: repository-owned control snapshot cleanup left the disposable snapshot present"
          } else {
            summary.control_snapshot_cleanup = "PASS"
          }
        }
      } catch (error) {
        summary.control_snapshot_cleanup = "FAILED"
        summary.host_evidence_result = "ISOLATION_BREACH"
        summary.error = `repo-pr-assessment: repository-owned control snapshot cleanup failed (${error.code ?? error.message})`
      }
    }

    await controlGitAnchor?.handle.close().catch(() => {})
    await controlAnchor?.handle.close().catch(() => {})

    const finalOwner = await ownerSnapshot(ownerAnchor.fdPath).catch((error) => ({ error: error.message }))
    summary.owner_final = finalOwner
    if (finalOwner.error) {
      summary.host_evidence_result = "INFRA_ERROR"
      summary.error = `repo-pr-assessment: final owner workspace proof failed (${finalOwner.error})`
    } else if (finalOwner.head !== initialOwner.head || finalOwner.branch !== initialOwner.branch || finalOwner.status !== initialOwner.status) {
      summary.host_evidence_result = "ISOLATION_BREACH"
      summary.error = "repo-pr-assessment: owner workspace HEAD/branch/status changed during repository-owned assessment"
    }
    try {
      await revalidateDirectoryAnchor(ownerAnchor, "owner repository root")
    } catch (error) {
      summary.host_evidence_result = error?.assessmentKind ?? "ISOLATION_BREACH"
      summary.error = String(error?.message ?? error)
    }
    if (summary.host_evidence_result === "PASS" && summary.cleanup_result !== "PASS") {
      summary.host_evidence_result = "ISOLATION_BREACH"
      summary.error = `repo-pr-assessment: repository-owned native cleanup did not complete (${summary.cleanup_result})`
    }
    if (summary.host_evidence_result === "PASS" && summary.control_snapshot_cleanup !== "PASS") {
      summary.host_evidence_result = "ISOLATION_BREACH"
      summary.error = `repo-pr-assessment: repository-owned control snapshot cleanup did not complete (${summary.control_snapshot_cleanup})`
    }
    if (summary.host_evidence_result === "PASS" && summary.native_result_reservation_cleanup !== "PASS") {
      summary.host_evidence_result = "ISOLATION_BREACH"
      summary.error = `repo-pr-assessment: repository-owned native result reservation cleanup did not complete (${summary.native_result_reservation_cleanup})`
    }
    for (const [anchor, label] of [[evidenceAnchor, "repository-owned evidence root"], [nativeAnchor, "repository-owned native-result root"]]) {
      try {
        await revalidateDirectoryAnchor(anchor, label)
      } catch (error) {
        summary.host_evidence_result = error?.assessmentKind ?? "ISOLATION_BREACH"
        summary.error = String(error?.message ?? error)
      }
    }
    try {
      returnedSummaryPath = await recoverAnchoredPath(evidenceAnchor, summaryRelative, "outer summary")
      summary.runner_evidence_path = await recoverAnchoredPath(evidenceAnchor, evidenceRelative, "canonical runner evidence")
      summary.native_evidence_path = await recoverAnchoredPath(nativeAnchor, nativeEvidenceRelative, "native runner evidence")
    } catch (error) {
      returnedSummaryPath = null
      summary.runner_evidence_path = null
      summary.native_evidence_path = null
      summary.host_evidence_result = error?.assessmentKind ?? "INFRA_ERROR"
      summary.error = String(error?.message ?? error)
    }
    await writeSummary(evidenceAnchor, summaryRelative, summary).catch((error) => {
      returnedSummaryPath = null
      summary.host_evidence_result = "INFRA_ERROR"
      summary.error = String(error?.message ?? error)
    })
    await reservationAnchor.handle.close().catch(() => {})
    await ownerAnchor.handle.close().catch(() => {})
    await nativeAnchor.handle.close().catch(() => {})
    await evidenceAnchor.handle.close().catch(() => {})
  }

  return { ...summary, summary_path: returnedSummaryPath, exit_code: summaryExit(summary.host_evidence_result) }
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
  let evidenceAnchor
  let runnerHandle
  let returnedSummaryPath = null
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
    evidenceAnchor = await anchorDirectory(evidenceRoot, "gateway-owned evidence root", { create: true })
    if (await anchoredPathExists(evidenceAnchor, `${spec.assessmentID}.summary.json`)) throw assessmentError(`summary path already exists (${summaryPath})`, "BLOCKED")
    if (await anchoredPathExists(evidenceAnchor, `${spec.assessmentID}.runner.json`)) throw assessmentError(`runner evidence path already exists (${evidencePath})`, "BLOCKED")
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
    runnerHandle = await openAdmittedExecutable(runner.path, summary.runner_sha256, "runner.path")
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
        planResult = await runProcess(runner.path, planArgv, worktree, environment, { executableHandle: runnerHandle, isolateProcessGroup: true })
      } catch (error) {
        throw assessmentError(`runner plan failed to start (${error.code ?? error.message})`, "INFRA_ERROR")
      }
      summary.runner.plan = { exit: planResult.code, signal: planResult.signal }
      if (planResult.survivingDescendants) {
        cleanupSafe = false
        throw assessmentError("gateway-owned runner plan left surviving descendants", "ISOLATION_BREACH")
      }
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
      await revalidateDirectoryAnchor(evidenceAnchor, "gateway-owned evidence root")
      try {
        await revalidatePinnedInputs(worktree, spec.repository.headSha, spec.runner.path, summary.runner_sha256, undefined, spec.integrityFiles, summary.integrity, "gateway-owned post-plan")
      } catch (error) {
        cleanupSafe = false
        throw error
      }
    }

    await revalidateDirectoryAnchor(evidenceAnchor, "gateway-owned evidence root")
    try {
      await revalidatePinnedInputs(worktree, spec.repository.headSha, spec.runner.path, summary.runner_sha256, undefined, spec.integrityFiles, summary.integrity, "gateway-owned pre-run")
    } catch (error) {
      cleanupSafe = false
      throw error
    }
    const runArgv = renderArgv(spec.runner.runArgv, values)
    let runResult
    try {
      runResult = await runProcess(runner.path, runArgv, worktree, environment, { executableHandle: runnerHandle, isolateProcessGroup: true })
    } catch (error) {
      throw assessmentError(`runner run failed to start (${error.code ?? error.message})`, "INFRA_ERROR")
    }
    summary.runner.run = { exit: runResult.code, signal: runResult.signal }
    if (runResult.survivingDescendants) {
      cleanupSafe = false
      throw assessmentError("gateway-owned runner run left surviving descendants", "ISOLATION_BREACH")
    }
    await revalidateDirectoryAnchor(evidenceAnchor, "gateway-owned evidence root")
    const evidence = await readEvidenceSnapshot(evidenceAnchor, `${spec.assessmentID}.runner.json`)
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
    if (finalOwner.error) {
      summary.host_evidence_result = "INFRA_ERROR"
      summary.error = `repo-pr-assessment: final owner workspace proof failed (${finalOwner.error})`
    } else if (finalOwner.head !== initialOwner.head || finalOwner.branch !== initialOwner.branch || finalOwner.status !== initialOwner.status) {
      summary.host_evidence_result = "ISOLATION_BREACH"
      summary.error = "repo-pr-assessment: owner workspace HEAD/branch/status changed during isolated assessment"
    }
    if (summary.host_evidence_result === "PASS" && summary.cleanup_result !== "PASS") {
      summary.host_evidence_result = "ISOLATION_BREACH"
      summary.error = `repo-pr-assessment: assessment cleanup did not complete (${summary.cleanup_result})`
    }
    if (evidenceAnchor) {
      try {
        await revalidateDirectoryAnchor(evidenceAnchor, "gateway-owned evidence root")
      } catch (error) {
        summary.host_evidence_result = error?.assessmentKind ?? "ISOLATION_BREACH"
        summary.error = String(error?.message ?? error)
      }
      try {
        returnedSummaryPath = await recoverAnchoredPath(evidenceAnchor, `${spec.assessmentID}.summary.json`, "outer summary")
        summary.runner_evidence_path = await recoverAnchoredPath(evidenceAnchor, `${spec.assessmentID}.runner.json`, "runner evidence")
      } catch (error) {
        returnedSummaryPath = null
        summary.runner_evidence_path = null
        summary.host_evidence_result = error?.assessmentKind ?? "INFRA_ERROR"
        summary.error = String(error?.message ?? error)
      }
      await writeSummary(evidenceAnchor, `${spec.assessmentID}.summary.json`, summary).catch((error) => {
        returnedSummaryPath = null
        summary.host_evidence_result = "INFRA_ERROR"
        summary.error = String(error?.message ?? error)
        if (!terminalError) terminalError = assessmentError(summary.error, "INFRA_ERROR")
      })
      await evidenceAnchor.handle.close().catch(() => {})
    }
    await runnerHandle?.close().catch(() => {})
  }

  return { ...summary, summary_path: returnedSummaryPath, exit_code: summaryExit(summary.host_evidence_result) }
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
