import assert from "node:assert/strict"
import { createHash } from "node:crypto"
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

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex")
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
mkdirSync(dirname(path), { recursive: true })
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
process.exit(exits[status] ?? 4)
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

  const runnerSha256 = sha256(await readFile(runnerPath))
  const controlSha256 = sha256(await readFile(join(repo, "control.txt")))
  return { root, repo, evidenceRoot, baseSha, headSha, runnerSha256, controlSha256 }
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
      sha256: fx.runnerSha256,
      result_contract: "local-agent-assessment-v1",
      plan_argv: ["plan", "--sha", "{head_sha}", "--pr", "{pr_number}"],
      run_argv: ["run", "--sha", "{head_sha}", "--pr", "{pr_number}", "--assessment-id", "{assessment_id}", ...extraRun],
    },
    integrity_files: [{ path: "control.txt", sha256: fx.controlSha256 }],
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
  spec.runner.sha256 = "0".repeat(64)
  const result = await runRepoPrAssessment(spec, {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "BLOCKED")
  assert.match(result.error, /pinned authority/)
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
