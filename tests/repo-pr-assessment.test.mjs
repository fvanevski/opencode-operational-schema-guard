import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { chmod, lstat, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"
import {
  LOCAL_ASSESSMENT_SCHEMA,
  assessmentBranchName,
  assessmentWorktreePath,
  parseRepoPrAssessmentSpec,
  runRepoPrAssessment,
} from "../lib/repo-pr-assessment.mjs"

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false })
  assert.equal(result.status, 0, `git ${args.join(" ")}\n${result.stderr}`)
  return result.stdout.trim()
}

function gitStatus(cwd) {
  return git(cwd, "status", "--porcelain=v1", "--untracked-files=normal")
}

async function exists(path) {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (error.code === "ENOENT") return false
    throw error
  }
}

const RUNNER_SOURCE = `#!/usr/bin/env node
import { appendFileSync, mkdirSync, renameSync, symlinkSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { spawn, spawnSync } from "node:child_process"
const args = process.argv.slice(2)
if (process.env.ASSESSMENT_TEST_LOG) appendFileSync(process.env.ASSESSMENT_TEST_LOG, args[0] + "\\n")
const runnerExitIndex = args.indexOf("--runner-exit")
if (runnerExitIndex >= 0) process.exit(Number(args[runnerExitIndex + 1]))
if (args[0] === "plan") {
  if (args.includes("--fail-plan")) process.exit(9)
  if (args.includes("--dirty-plan")) writeFileSync("plan-untracked.txt", "mutation\\n")
  if (args.includes("--hide-pin-mutation")) {
    writeFileSync(".python-version", "mutated\\n")
    spawnSync("git", ["update-index", "--assume-unchanged", ".python-version"], { shell: false })
  }
  if (args.includes("--surviving-plan-child")) {
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" })
    child.unref()
  }
  process.exit(0)
}
if (args[0] !== "run") process.exit(7)
const outputIndex = args.indexOf("--output")
if (outputIndex < 0 || !args[outputIndex + 1]) process.exit(8)
const output = args[outputIndex + 1]
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify({ HOST_EVIDENCE_RESULT: "PASS", GATE_DECISION: "NOT_EVALUATED", head: args[args.indexOf("--head") + 1], venv: args[args.indexOf("--venv") + 1] }) + "\\n")
if (args.includes("--mutate-head")) {
  const result = spawnSync("git", ["commit", "--allow-empty", "-m", "runner mutation"], { stdio: "inherit", shell: false })
  process.exit(result.status ?? 1)
}
if (args.includes("--dirty-worktree")) {
  writeFileSync("runner-untracked.txt", "mutation\\n")
}
if (args.includes("--surviving-run-child")) {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" })
  child.unref()
}
if (args.includes("--block-summary-write")) {
  mkdirSync(output.replace(/\\.runner\\.json$/, ".summary.json"))
}
if (args.includes("--replace-evidence-root")) {
  const root = dirname(output)
  const moved = root + ".moved"
  const replacement = root + ".replacement"
  renameSync(root, moved)
  mkdirSync(replacement)
  symlinkSync(replacement, root)
}
if (args.includes("--mutate-owner-dirty") && process.env.ASSESSMENT_OWNER_DIRTY_PATH) {
  writeFileSync(process.env.ASSESSMENT_OWNER_DIRTY_PATH, "mutated owner state\\n")
}
if (args.includes("--mutate-owner-dirty-b64") && process.env.ASSESSMENT_OWNER_DIRTY_PATH_B64) {
  writeFileSync(Buffer.from(process.env.ASSESSMENT_OWNER_DIRTY_PATH_B64, "base64"), "mutated owner raw path state\\n")
}
process.exit(0)
`

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "repo-pr-assessment-"))
  const remote = join(root, "remote.git")
  const repo = join(root, "repo")
  const worktreeRoot = join(root, "verify", "worktrees")
  const evidenceRoot = join(root, "verify", "evidence")
  const venv = join(root, "canonical-venv")
  const log = join(root, "runner.log")
  mkdirSyncCompat(repo)
  git(root, "init", "--bare", remote)
  git(repo, "init", "-b", "main")
  git(repo, "config", "user.name", "Assessment Test")
  git(repo, "config", "user.email", "assessment@example.com")
  git(repo, "remote", "add", "origin", remote)

  await mkdir(join(repo, "tools"), { recursive: true })
  await mkdir(join(repo, ".github", "ci"), { recursive: true })
  const runner = join(repo, "tools", "assessment-runner.mjs")
  await writeFile(runner, RUNNER_SOURCE)
  await chmod(runner, 0o755)
  await writeFile(join(repo, ".python-version"), "3.13\n")
  await writeFile(join(repo, ".github", "ci", "toolchain.txt"), "pytest 9.1.1\n")
  await writeFile(join(repo, "uv.lock"), "fixture-lock\n")
  await writeFile(join(repo, "base.txt"), "base\n")
  git(repo, "add", ".")
  git(repo, "commit", "-m", "base")
  const baseSha = git(repo, "rev-parse", "HEAD")
  git(repo, "push", "-u", "origin", "main")

  git(repo, "switch", "-c", "issue/phase5")
  await writeFile(join(repo, "feature.txt"), "first\n")
  git(repo, "add", "feature.txt")
  git(repo, "commit", "-m", "feature one")
  const staleSha = git(repo, "rev-parse", "HEAD")
  git(repo, "push", "-u", "origin", "issue/phase5")
  await writeFile(join(repo, "feature.txt"), "second\n")
  git(repo, "add", "feature.txt")
  git(repo, "commit", "-m", "feature two")
  const headSha = git(repo, "rev-parse", "HEAD")
  git(repo, "push", "origin", "issue/phase5")
  git(repo, "reset", "--hard", staleSha)
  git(repo, "switch", "main")

  await mkdir(join(venv, "bin"), { recursive: true })
  await writeFile(join(venv, "pyvenv.cfg"), "fixture = true\n")
  await symlink(process.execPath, join(venv, "bin", "python"))

  const spec = parseRepoPrAssessmentSpec({
    schema_version: LOCAL_ASSESSMENT_SCHEMA,
    kind: "repo-pr",
    assessment_id: `pr20-${Math.random().toString(16).slice(2, 10)}`,
    pr_number: 20,
    repository: {
      remote: "origin",
      base_ref: "main",
      base_sha: baseSha,
      head_ref: "issue/phase5",
      head_sha: headSha,
    },
    environment: { venv },
    runner: {
      path: "tools/assessment-runner.mjs",
      plan_argv: ["plan", "--base", "{base_sha}", "--head", "{head_sha}", "--pr", "{pr_number}", "--venv", "{venv}"],
      run_argv: ["run", "--base", "{base_sha}", "--head", "{head_sha}", "--pr", "{pr_number}", "--venv", "{venv}", "--output", "{evidence_path}"],
    },
    integrity_files: [".python-version", ".github/ci/toolchain.txt", "uv.lock"],
  })
  return { root, remote, repo, worktreeRoot, evidenceRoot, venv, log, baseSha, staleSha, headSha, spec }
}

function mkdirSyncCompat(path) {
  const result = spawnSync("mkdir", ["-p", path], { shell: false })
  assert.equal(result.status, 0)
}

async function run(fx, spec = fx.spec) {
  const previous = process.env.ASSESSMENT_TEST_LOG
  process.env.ASSESSMENT_TEST_LOG = fx.log
  try {
    return await runRepoPrAssessment(spec, {
      repoRoot: fx.repo,
      worktreeRoot: fx.worktreeRoot,
      evidenceRoot: fx.evidenceRoot,
      specSha256: "c".repeat(64),
    })
  } finally {
    if (previous === undefined) delete process.env.ASSESSMENT_TEST_LOG
    else process.env.ASSESSMENT_TEST_LOG = previous
  }
}

test("stale same-name local PR branch is irrelevant to isolated exact-head assessment", async () => {
  const fx = await fixture()
  assert.equal(git(fx.repo, "rev-parse", "issue/phase5"), fx.staleSha)
  const result = await run(fx)
  assert.equal(result.host_evidence_result, "PASS", result.error)
  assert.equal(result.observed_head_sha, fx.headSha)
  assert.equal(result.assessed_head_sha, fx.headSha)
  assert.match(result.assessed_branch, /^opencode-assess\//)
  assert.equal(result.cleanup_result, "PASS")
  assert.equal(git(fx.repo, "rev-parse", "issue/phase5"), fx.staleSha)
  assert.equal(git(fx.repo, "branch", "--show-current"), "main")
  assert.equal(gitStatus(fx.repo), "")
  const branch = assessmentBranchName(fx.repo, fx.spec)
  const probe = spawnSync("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], { cwd: fx.repo, shell: false })
  assert.notEqual(probe.status, 0)
  assert.equal(await exists(assessmentWorktreePath(fx.repo, fx.spec, fx.worktreeRoot)), false)
})

test("remote authority mismatch fails STALE before worktree or runner execution", async () => {
  const fx = await fixture()
  const wrong = structuredClone(fx.spec)
  wrong.repository.headSha = "f".repeat(40)
  wrong.runner.planArgv = [...fx.spec.runner.planArgv]
  wrong.runner.runArgv = [...fx.spec.runner.runArgv]
  const result = await run(fx, wrong)
  assert.equal(result.host_evidence_result, "STALE")
  assert.equal(result.runner.plan, null)
  assert.equal(result.runner.run, null)
  assert.equal(await exists(assessmentWorktreePath(fx.repo, wrong, fx.worktreeRoot)), false)
  assert.equal(await exists(fx.log), false)
})

test("dirty owner workspace is preserved with an exact content fingerprint", async () => {
  const fx = await fixture()
  await writeFile(join(fx.repo, "owner-local.txt"), "untracked owner state\n")
  const before = { head: git(fx.repo, "rev-parse", "HEAD"), branch: git(fx.repo, "branch", "--show-current"), status: gitStatus(fx.repo) }
  const result = await run(fx)
  assert.equal(result.host_evidence_result, "PASS", result.error)
  const after = { head: git(fx.repo, "rev-parse", "HEAD"), branch: git(fx.repo, "branch", "--show-current"), status: gitStatus(fx.repo) }
  assert.deepEqual(after, before)
  assert.equal(result.owner_initial.fingerprint.length, 64)
  assert.equal(result.owner_final.fingerprint, result.owner_initial.fingerprint)
})

test("dirty owner byte mutation is detected even when porcelain status is unchanged", async () => {
  const fx = await fixture()
  const dirtyPath = join(fx.repo, "owner-local.txt")
  await writeFile(dirtyPath, "untracked owner state\n")
  const spec = structuredClone(fx.spec)
  spec.runner.runArgv.push("--mutate-owner-dirty")
  const previous = process.env.ASSESSMENT_OWNER_DIRTY_PATH
  process.env.ASSESSMENT_OWNER_DIRTY_PATH = dirtyPath
  try {
    const result = await run(fx, spec)
    assert.equal(result.owner_initial.status, result.owner_final.status)
    assert.notEqual(result.owner_initial.fingerprint, result.owner_final.fingerprint)
    assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
    assert.match(result.error, /exact preservation fingerprint changed/)
  } finally {
    if (previous === undefined) delete process.env.ASSESSMENT_OWNER_DIRTY_PATH
    else process.env.ASSESSMENT_OWNER_DIRTY_PATH = previous
  }
})

test("dirty owner mutation is detected for a filename containing invalid UTF-8 bytes", async () => {
  const fx = await fixture()
  const dirtyPath = Buffer.concat([Buffer.from(`${fx.repo}/owner-`), Buffer.from([0xff]), Buffer.from(".txt")])
  await writeFile(dirtyPath, "raw owner state\n")
  const spec = structuredClone(fx.spec)
  spec.runner.runArgv.push("--mutate-owner-dirty-b64")
  const previous = process.env.ASSESSMENT_OWNER_DIRTY_PATH_B64
  process.env.ASSESSMENT_OWNER_DIRTY_PATH_B64 = dirtyPath.toString("base64")
  try {
    const result = await run(fx, spec)
    assert.equal(result.owner_initial.status, result.owner_final.status)
    assert.notEqual(result.owner_initial.fingerprint, result.owner_final.fingerprint)
    assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
    assert.match(result.error, /exact preservation fingerprint changed/)
  } finally {
    if (previous === undefined) delete process.env.ASSESSMENT_OWNER_DIRTY_PATH_B64
    else process.env.ASSESSMENT_OWNER_DIRTY_PATH_B64 = previous
  }
})

test("assessment branch and worktree collisions fail closed and are never reclaimed", async () => {
  const fx = await fixture()
  const branch = assessmentBranchName(fx.repo, fx.spec)
  git(fx.repo, "branch", branch, fx.headSha)
  const result = await run(fx)
  assert.equal(result.host_evidence_result, "BLOCKED")
  assert.equal(git(fx.repo, "rev-parse", branch), fx.headSha)
  assert.equal(result.cleanup_result, "NOT_REQUIRED")
})

test("missing canonical venv is INFRA_ERROR and is never created or repaired", async () => {
  const fx = await fixture()
  const missing = join(fx.root, "does-not-exist", ".venv")
  const spec = structuredClone(fx.spec)
  spec.environment.venv = missing
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "INFRA_ERROR")
  assert.match(result.error, /canonical venv does not exist/)
  assert.equal(await exists(missing), false)
  assert.equal(result.cleanup_result, "PASS")
})

test("runner plan failure prevents run phase", async () => {
  const fx = await fixture()
  const spec = structuredClone(fx.spec)
  spec.runner.planArgv.push("--fail-plan")
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "FAIL")
  assert.equal(result.runner.plan.exit, 9)
  assert.equal(result.runner.run, null)
  assert.equal((await readFile(fx.log, "utf8")).trim(), "plan")
})

test("successful runner evidence is preserved and SHA-256 bound", async () => {
  const fx = await fixture()
  const result = await run(fx)
  assert.equal(result.host_evidence_result, "PASS", result.error)
  const bytes = await readFile(result.runner_evidence_path)
  const expected = createHash("sha256").update(bytes).digest("hex")
  assert.equal(result.runner_evidence_sha256, expected)
  assert.equal(result.runner_evidence_bytes, bytes.length)
  const summary = JSON.parse(await readFile(result.summary_path, "utf8"))
  assert.equal(summary.runner_evidence_sha256, expected)
  assert.equal(summary.spec_sha256, "c".repeat(64))
  assert.equal(summary.integrity[".python-version"].length, 64)
  assert.equal(summary.integrity[".github/ci/toolchain.txt"].length, 64)
  assert.equal(summary.integrity["uv.lock"].length, 64)
})

test("gateway-owned integrity blob pins are enforced at the assessed head", async () => {
  const fx = await fixture()
  const spec = structuredClone(fx.spec)
  spec.integrityFiles[0].expectedBlobSha = "0".repeat(40)
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "BLOCKED")
  assert.match(result.error, /Git blob does not match the pinned authority/)
  assert.equal(result.runner.plan, null)
  assert.equal(result.runner.run, null)
})

test("gateway-owned post-plan revalidation catches hidden pinned-input mutation", async () => {
  const fx = await fixture()
  const spec = structuredClone(fx.spec)
  spec.runner.planArgv.push("--hide-pin-mutation")
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.error, /integrity file \.python-version changed after admission/)
  assert.equal(result.runner.run, null)
  assert.equal(result.cleanup_result, "PRESERVED_ISOLATION_BREACH")
  const worktree = assessmentWorktreePath(fx.repo, spec, fx.worktreeRoot)
  assert.equal(await exists(worktree), true)
  git(fx.repo, "worktree", "remove", "--force", worktree)
  git(fx.repo, "branch", "-D", assessmentBranchName(fx.repo, spec))
})

test("gateway-owned runner exits cannot collide with supervisor status codes", async () => {
  for (const code of [240, 241, 242, 243]) {
    const fx = await fixture()
    const spec = structuredClone(fx.spec)
    spec.runner.planArgv.push("--runner-exit", String(code))
    const result = await run(fx, spec)
    assert.equal(result.host_evidence_result, "FAIL", `runner exit ${code}: ${result.error}`)
    assert.equal(result.runner.plan.exit, code)
    assert.equal(result.runner.run, null)
    assert.equal(result.cleanup_result, "PASS")
  }
})

test("gateway-owned run exit 241 remains a runner failure after evidence creation", async () => {
  const fx = await fixture()
  const spec = structuredClone(fx.spec)
  spec.runner.runArgv.push("--runner-exit", "241")
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "FAIL", result.error)
  assert.equal(result.runner.run.exit, 241)
  assert.equal(result.cleanup_result, "PASS")
})

test("gateway-owned plan descendants cannot survive into the run boundary", async () => {
  const fx = await fixture()
  const spec = structuredClone(fx.spec)
  spec.runner.planArgv.push("--surviving-plan-child")
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.error, /plan left surviving descendants/)
  assert.equal(result.runner.run, null)
  assert.equal(result.cleanup_result, "PRESERVED_ISOLATION_BREACH")
  const worktree = assessmentWorktreePath(fx.repo, spec, fx.worktreeRoot)
  assert.equal(await exists(worktree), true)
  git(fx.repo, "worktree", "remove", "--force", worktree)
  git(fx.repo, "branch", "-D", assessmentBranchName(fx.repo, spec))
})

test("gateway-owned run descendants terminalize before evidence acceptance", async () => {
  const fx = await fixture()
  const spec = structuredClone(fx.spec)
  spec.runner.runArgv.push("--surviving-run-child")
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.error, /run left surviving descendants/)
  assert.equal(result.cleanup_result, "PRESERVED_ISOLATION_BREACH")
  const worktree = assessmentWorktreePath(fx.repo, spec, fx.worktreeRoot)
  assert.equal(await exists(worktree), true)
  git(fx.repo, "worktree", "remove", "--force", worktree)
  git(fx.repo, "branch", "-D", assessmentBranchName(fx.repo, spec))
})

test("gateway-owned evidence-root replacement is an isolation breach", async () => {
  const fx = await fixture()
  const spec = structuredClone(fx.spec)
  spec.runner.runArgv.push("--replace-evidence-root")
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.error, /evidence root pathname/)
  assert.match(result.summary_path, /\.moved\/[^/]+\.summary\.json$/)
  const summary = JSON.parse(await readFile(result.summary_path, "utf8"))
  assert.equal(summary.host_evidence_result, "ISOLATION_BREACH")
})

test("gateway-owned mode returns INFRA_ERROR when the outer summary cannot be written", async () => {
  const fx = await fixture()
  const spec = structuredClone(fx.spec)
  spec.runner.runArgv.push("--block-summary-write")
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "INFRA_ERROR")
  assert.match(result.error, /outer summary could not be materialized/)
  assert.equal(result.summary_path, null)
  assert.equal(result.exit_code, 2)
})

test("cleanup never touches unrelated local branches", async () => {
  const fx = await fixture()
  git(fx.repo, "branch", "developer/keep-me", fx.baseSha)
  const result = await run(fx)
  assert.equal(result.host_evidence_result, "PASS", result.error)
  assert.equal(git(fx.repo, "rev-parse", "developer/keep-me"), fx.baseSha)
})

test("assessment runner identity mutation is detected and preserved for investigation", async () => {
  const fx = await fixture()
  const spec = structuredClone(fx.spec)
  spec.runner.runArgv.push("--mutate-head")
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.equal(result.cleanup_result, "PRESERVED_ISOLATION_BREACH")
  assert.equal(await exists(assessmentWorktreePath(fx.repo, spec, fx.worktreeRoot)), true)
  const branch = assessmentBranchName(fx.repo, spec)
  assert.notEqual(git(fx.repo, "rev-parse", branch), fx.headSha)
  git(fx.repo, "worktree", "remove", "--force", assessmentWorktreePath(fx.repo, spec, fx.worktreeRoot))
  git(fx.repo, "branch", "-D", branch)
})


test("assessment runner uncommitted mutation is detected and preserved for investigation", async () => {
  const fx = await fixture()
  const spec = structuredClone(fx.spec)
  spec.runner.runArgv.push("--dirty-worktree")
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.assessed_final_status, /runner-untracked\.txt/)
  assert.equal(result.cleanup_result, "PRESERVED_ISOLATION_BREACH")
  const worktree = assessmentWorktreePath(fx.repo, spec, fx.worktreeRoot)
  assert.equal(await exists(worktree), true)
  git(fx.repo, "worktree", "remove", "--force", worktree)
  git(fx.repo, "branch", "-D", assessmentBranchName(fx.repo, spec))
})


test("runner plan mutation blocks run and preserves the isolated checkout", async () => {
  const fx = await fixture()
  const spec = structuredClone(fx.spec)
  spec.runner.planArgv.push("--dirty-plan")
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.equal(result.runner.run, null)
  assert.match(result.assessed_post_plan_status, /plan-untracked\.txt/)
  assert.equal(result.cleanup_result, "PRESERVED_ISOLATION_BREACH")
  const worktree = assessmentWorktreePath(fx.repo, spec, fx.worktreeRoot)
  git(fx.repo, "worktree", "remove", "--force", worktree)
  git(fx.repo, "branch", "-D", assessmentBranchName(fx.repo, spec))
})

test("canonical venv path is passed to the repository runner", async () => {
  const fx = await fixture()
  const link = join(fx.root, "venv-link")
  await symlink(fx.venv, link)
  const spec = structuredClone(fx.spec)
  spec.environment.venv = link
  const result = await run(fx, spec)
  assert.equal(result.host_evidence_result, "PASS", result.error)
  const evidence = JSON.parse(await readFile(result.runner_evidence_path, "utf8"))
  assert.equal(evidence.venv, fx.venv)
  assert.equal(result.canonical_venv.canonical, fx.venv)
})
