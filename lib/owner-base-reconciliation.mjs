import { spawnSync } from "node:child_process"
import { realpath } from "node:fs/promises"
import { loadAssessmentSpec } from "./repo-pr-assessment.mjs"

export const OWNER_BASE_RECONCILIATION_SCHEMA = "opencode-owner-base-reconciliation-v1"

const LOWER_SHA = /^[0-9a-f]{40}$/
const GIT_MAX_BUFFER = 4 * 1024 * 1024

function reconciliationError(message, kind = "BLOCKED") {
  const error = new Error(`owner-base-reconciliation: ${message}`)
  error.reconciliationKind = kind
  return error
}

function git(repoRoot, args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    maxBuffer: GIT_MAX_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (result.error) throw reconciliationError(`git ${args[0] ?? ""} failed to start (${result.error.code ?? result.error.message})`, "INFRA_ERROR")
  const code = result.status ?? 1
  const stdout = String(result.stdout ?? "").trim()
  const stderr = String(result.stderr ?? "").trim()
  if (code !== 0 && !allowFailure) throw reconciliationError(`git ${args[0] ?? ""} failed (exit=${code}${stderr ? `; ${stderr}` : ""})`, "BLOCKED")
  return { code, stdout, stderr }
}

function ownerSnapshot(repoRoot) {
  const head = git(repoRoot, ["rev-parse", "--verify", "HEAD^{commit}"]).stdout.toLowerCase()
  const branchResult = git(repoRoot, ["symbolic-ref", "--quiet", "--short", "HEAD"], { allowFailure: true })
  const branch = branchResult.code === 0 ? branchResult.stdout : null
  const status = git(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]).stdout
  return { head, branch, status }
}

function headSourceRef(headRef) {
  return headRef.startsWith("refs/") ? headRef : `refs/heads/${headRef}`
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
    throw reconciliationError(`remote authority mismatch (base=${observed.observedBase}; head=${observed.observedHead})`, "STALE")
  }
  return observed
}

export async function reconcileOwnerBase({ specPath, expectedOldSha, cwd = process.cwd() }) {
  if (!LOWER_SHA.test(expectedOldSha ?? "")) throw reconciliationError("expected old owner SHA must be 40 lowercase hexadecimal characters")
  const loaded = await loadAssessmentSpec(specPath)
  const spec = loaded.spec
  if (spec.runner.execution !== "repository-owned" || spec.runner.authority !== "base") {
    throw reconciliationError("spec must select repository-owned execution with base runner authority")
  }

  const discoveredRoot = git(cwd, ["rev-parse", "--show-toplevel"]).stdout
  const repoRoot = await realpath(discoveredRoot).catch((error) => {
    throw reconciliationError(`repository root cannot be resolved (${error.code ?? error.message})`, "INFRA_ERROR")
  })
  const before = ownerSnapshot(repoRoot)
  if (before.branch !== spec.repository.baseRef) {
    throw reconciliationError(`owner branch is ${before.branch ?? "detached"}, not pinned base branch ${spec.repository.baseRef}`)
  }
  if (before.head !== expectedOldSha) {
    throw reconciliationError(`owner checkout is ${before.head}, not expected old SHA ${expectedOldSha}`, "STALE")
  }
  if (before.status !== "") throw reconciliationError("owner checkout must be clean")

  const observedBefore = requireRemoteAuthority(repoRoot, spec)
  const ancestor = git(repoRoot, ["merge-base", "--is-ancestor", expectedOldSha, spec.repository.baseSha], { allowFailure: true })
  if (ancestor.code !== 0) {
    throw reconciliationError(`expected old SHA ${expectedOldSha} is not an ancestor of pinned base ${spec.repository.baseSha}`)
  }

  const immediate = ownerSnapshot(repoRoot)
  if (immediate.branch !== before.branch || immediate.head !== before.head || immediate.status !== before.status) {
    throw reconciliationError("owner checkout changed before fast-forward", "STALE")
  }

  if (expectedOldSha !== spec.repository.baseSha) {
    git(repoRoot, ["merge", "--ff-only", spec.repository.baseSha])
  }

  const after = ownerSnapshot(repoRoot)
  if (after.branch !== spec.repository.baseRef || after.head !== spec.repository.baseSha || after.status !== "") {
    throw reconciliationError(`post-write owner proof failed (branch=${after.branch ?? "detached"}; head=${after.head}; clean=${after.status === ""})`, "ISOLATION_BREACH")
  }
  const observedAfter = requireRemoteAuthority(repoRoot, spec)

  return {
    schema_version: OWNER_BASE_RECONCILIATION_SCHEMA,
    assessment_id: spec.assessmentID,
    spec_sha256: loaded.sha256,
    repository_root: repoRoot,
    branch: after.branch,
    expected_old_sha: expectedOldSha,
    pinned_base_sha: spec.repository.baseSha,
    pinned_head_sha: spec.repository.headSha,
    observed_base_sha_before: observedBefore.observedBase,
    observed_head_sha_before: observedBefore.observedHead,
    observed_base_sha_after: observedAfter.observedBase,
    observed_head_sha_after: observedAfter.observedHead,
    owner_head_after: after.head,
    owner_clean_after: true,
  }
}
