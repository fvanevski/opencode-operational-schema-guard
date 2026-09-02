import assert from "node:assert/strict"
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"
import {
  ASSESSMENT_NATIVE_RESULT_ROOT,
  LOCAL_ASSESSMENT_SCHEMA,
  parseRepoPrAssessmentSpec,
  runRepoPrAssessment,
} from "../lib/repo-pr-assessment.mjs"

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false })
  assert.equal(result.status, 0, `git ${args.join(" ")}\n${result.stderr}`)
  return result.stdout.trim()
}

const RUNNER_SOURCE = `#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { spawnSync } from "node:child_process"
const args = process.argv.slice(2)
const value = (flag) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
if (args[0] === "plan") process.exit(0)
if (args[0] !== "run") process.exit(4)
const assessmentId = value("--assessment-id")
const head = value("--sha")
const prNumber = Number(value("--pr"))
const status = value("--status") || "PASS"
const baseResult = spawnSync("git", ["rev-parse", "origin/main"], { encoding: "utf8", shell: false })
if (baseResult.status !== 0) process.exit(4)
const base = baseResult.stdout.trim()
const path = "/tmp/opencode/verify/results/" + assessmentId + "/assessment.json"
if (args.includes("--skip-evidence")) process.exit(0)
mkdirSync(dirname(path), { recursive: true })
if (args.includes("--malformed-evidence")) {
  writeFileSync(path, "{not-json\\n")
  process.exit(0)
}
const pass = status === "PASS"
writeFileSync(path, JSON.stringify({
  schema_version: "local-agent-assessment-v1",
  host_evidence_result: status,
  gate_decision: args.includes("--bad-gate") ? "PASS" : "NOT_EVALUATED",
  assessment_id: assessmentId,
  target_kind: "pr-head",
  pr_number: prNumber,
  requested_sha: args.includes("--mismatch-head") ? "f".repeat(40) : head,
  tested_sha: pass ? head : null,
  pr_head_start: pass ? head : null,
  pr_head_end: pass ? head : null,
  control_sha: pass ? base : null,
  control_ref_start: pass ? base : null,
  control_ref_end: pass ? base : null,
  cleanup: {
    services_removed: true,
    worktree_removed: true,
    materials_removed: !args.includes("--bad-cleanup"),
    failures: [],
  },
}) + "\\n")
const exits = { PASS: 0, FAIL: 1, BLOCKED: 2, STALE: 3, INFRA_ERROR: 4, ISOLATION_BREACH: 5 }
process.exit(args.includes("--exit-mismatch") ? 1 : (exits[status] ?? 4))
`

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "repo-owned-assessment-"))
  const remote = join(root, "remote.git")
  const repo = join(root, "repo")
  const evidenceRoot = join(root, "verify", "evidence")
  await mkdir(repo, { recursive: true })
  git(root, "init", "--bare", remote)
  git(repo, "init", "-b", "main")
  git(repo, "config", "user.name", "Assessment Test")
  git(repo, "config", "user.email", "assessment@example.com")
  git(repo, "remote", "add", "origin", remote)

  await mkdir(join(repo, "tools"), { recursive: true })
  const runnerPath = join(repo, "tools", "repository-owned-runner.mjs")
  await writeFile(runnerPath, RUNNER_SOURCE)
  await chmod(runnerPath, 0o755)
  await writeFile(join(repo, "control.txt"), "trusted-control\n")
  git(repo, "add", ".")
  git(repo, "commit", "-m", "base")
  const baseSha = git(repo, "rev-parse", "HEAD")
  git(repo, "push", "-u", "origin", "main")

  git(repo, "switch", "-c", "issue/native")
  await writeFile(join(repo, "feature.txt"), "candidate\n")
  git(repo, "add", "feature.txt")
  git(repo, "commit", "-m", "candidate")
  const headSha = git(repo, "rev-parse", "HEAD")
  git(repo, "push", "-u", "origin", "issue/native")
  git(root, "--git-dir", remote, "update-ref", "refs/pull/20/head", headSha)
  git(repo, "switch", "main")

  const runnerBlobSha = git(repo, "rev-parse", "HEAD:tools/repository-owned-runner.mjs")
  const controlBlobSha = git(repo, "rev-parse", "HEAD:control.txt")
  return { root, repo, evidenceRoot, baseSha, headSha, runnerBlobSha, controlBlobSha }
}

function makeSpec(fx, assessmentID, extraRun = []) {
  return parseRepoPrAssessmentSpec({
    schema_version: LOCAL_ASSESSMENT_SCHEMA,
    kind: "repo-pr",
    assessment_id: assessmentID,
    pr_number: 20,
    repository: {
      remote: "origin",
      base_ref: "main",
      base_sha: fx.baseSha,
      head_ref: "refs/pull/20/head",
      head_sha: fx.headSha,
    },
    runner: {
      execution: "repository-owned",
      authority: "base",
      path: "tools/repository-owned-runner.mjs",
      blob_sha: fx.runnerBlobSha,
      result_contract: "local-agent-assessment-v1",
      plan_argv: ["plan", "--sha", "{head_sha}", "--pr", "{pr_number}"],
      run_argv: ["run", "--sha", "{head_sha}", "--pr", "{pr_number}", "--assessment-id", "{assessment_id}", ...extraRun],
    },
    integrity_files: [{ path: "control.txt", blob_sha: fx.controlBlobSha }],
  })
}

async function cleanupFixture(fx, assessmentIDs) {
  for (const id of assessmentIDs) {
    await rm(join(ASSESSMENT_NATIVE_RESULT_ROOT, id), { recursive: true, force: true })
  }
  await rm(fx.root, { recursive: true, force: true })
}

test("repository-owned mode admits canonical PR refs without creating a gateway worktree", async (t) => {
  const fx = await fixture()
  const id = `pr20-native-${Math.random().toString(16).slice(2, 10)}`
  t.after(() => cleanupFixture(fx, [id]))
  const before = {
    head: git(fx.repo, "rev-parse", "HEAD"),
    branch: git(fx.repo, "branch", "--show-current"),
    status: git(fx.repo, "status", "--porcelain=v1", "--untracked-files=normal"),
  }
  const result = await runRepoPrAssessment(makeSpec(fx, id), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
    specSha256: "a".repeat(64),
  })
  assert.equal(result.host_evidence_result, "PASS", result.error)
  assert.equal(result.assessment_branch, null)
  assert.equal(result.assessment_worktree, null)
  assert.equal(result.observed_head_sha, fx.headSha)
  assert.equal(result.final_observed_head_sha, fx.headSha)
  assert.equal(result.native_host_evidence_result, "PASS")
  assert.equal(result.cleanup_result, "PASS")
  assert.equal(git(fx.repo, "branch", "--list", "opencode-assess/*"), "")
  const nativeBytes = await readFile(result.native_evidence_path)
  const canonicalBytes = await readFile(result.runner_evidence_path)
  assert.deepEqual(canonicalBytes, nativeBytes)
  assert.deepEqual(result.owner_final, result.owner_initial)
  assert.deepEqual({
    head: git(fx.repo, "rev-parse", "HEAD"),
    branch: git(fx.repo, "branch", "--show-current"),
    status: git(fx.repo, "status", "--porcelain=v1", "--untracked-files=normal"),
  }, before)
})

test("repository-owned mode preserves native host-result semantics", async (t) => {
  const fx = await fixture()
  const statuses = ["FAIL", "BLOCKED", "STALE", "INFRA_ERROR", "ISOLATION_BREACH"]
  const ids = statuses.map((status) => `pr20-${status.toLowerCase().replaceAll("_", "-")}-${Math.random().toString(16).slice(2, 8)}`)
  t.after(() => cleanupFixture(fx, ids))
  for (const [index, status] of statuses.entries()) {
    const result = await runRepoPrAssessment(makeSpec(fx, ids[index], ["--status", status]), {
      repoRoot: fx.repo,
      evidenceRoot: fx.evidenceRoot,
    })
    assert.equal(result.host_evidence_result, status, result.error)
    assert.equal(result.native_host_evidence_result, status)
  }
})

test("repository-owned mode rejects mismatched native evidence identity and gate semantics", async (t) => {
  const fx = await fixture()
  const ids = [
    `pr20-bad-head-${Math.random().toString(16).slice(2, 8)}`,
    `pr20-bad-gate-${Math.random().toString(16).slice(2, 8)}`,
  ]
  t.after(() => cleanupFixture(fx, ids))
  const badHead = await runRepoPrAssessment(makeSpec(fx, ids[0], ["--mismatch-head"]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(badHead.host_evidence_result, "INFRA_ERROR")
  assert.match(badHead.error, /evidence identity/)

  const badGate = await runRepoPrAssessment(makeSpec(fx, ids[1], ["--bad-gate"]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(badGate.host_evidence_result, "INFRA_ERROR")
  assert.match(badGate.error, /GATE_DECISION/)
})

test("repository-owned PASS requires complete native cleanup proof", async (t) => {
  const fx = await fixture()
  const id = `pr20-bad-cleanup-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const result = await runRepoPrAssessment(makeSpec(fx, id, ["--bad-cleanup"]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.error, /cleanup proof/)
})

test("repository-owned execution enforces pinned runner and control-plane hashes before invocation", async (t) => {
  const fx = await fixture()
  const id = `pr20-bad-pin-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const spec = makeSpec(fx, id)
  spec.runner.blobSha = "0".repeat(40)
  const result = await runRepoPrAssessment(spec, {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "BLOCKED")
  assert.match(result.error, /pinned authority/)
})

test("repository-owned mode fails closed on missing, malformed, or exit-inconsistent evidence", async (t) => {
  const fx = await fixture()
  const cases = [
    ["skip", ["--skip-evidence"], /did not create/],
    ["malformed", ["--malformed-evidence"], /not strict JSON/],
    ["exit-mismatch", ["--exit-mismatch"], /exit code contradicts/],
  ]
  const ids = cases.map(([name]) => `pr20-${name}-${Math.random().toString(16).slice(2, 8)}`)
  t.after(() => cleanupFixture(fx, ids))
  for (const [index, [, argv, pattern]] of cases.entries()) {
    const result = await runRepoPrAssessment(makeSpec(fx, ids[index], argv), {
      repoRoot: fx.repo,
      evidenceRoot: fx.evidenceRoot,
    })
    assert.equal(result.host_evidence_result, "INFRA_ERROR")
    assert.match(result.error, pattern)
  }
})

test("repository-owned head authority supports an explicitly pinned reviewed bootstrap checkout", async (t) => {
  const fx = await fixture()
  const id = `pr20-head-authority-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  git(fx.repo, "switch", "issue/native")
  const spec = makeSpec(fx, id)
  spec.runner.authority = "head"
  const result = await runRepoPrAssessment(spec, {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "PASS", result.error)
  assert.equal(result.runner_authority, "head")
  assert.equal(result.owner_initial.head, fx.headSha)
})

test("repository-owned schema does not require a venv, base-sha argv, or evidence-path argv", async () => {
  const fx = await fixture()
  const id = `pr20-schema-${Math.random().toString(16).slice(2, 8)}`
  try {
    const spec = makeSpec(fx, id)
    assert.equal(spec.environment.venv, undefined)
    assert.equal(spec.runner.runArgv.includes("{base_sha}"), false)
    assert.equal(spec.runner.runArgv.includes("{evidence_path}"), false)
    assert.equal(spec.repository.headRef, "refs/pull/20/head")
  } finally {
    await cleanupFixture(fx, [id])
  }
})
