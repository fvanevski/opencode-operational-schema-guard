import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { constants } from "node:fs"
import { chmod, lstat, mkdir, mkdtemp, open, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import test from "node:test"
import {
  ASSESSMENT_CONTROL_WORKTREE_ROOT,
  ASSESSMENT_REPOSITORY_RUNTIME_ROOT,
  ASSESSMENT_RESERVATION_ROOT,
  LOCAL_ASSESSMENT_SCHEMA,
  assessmentControlWorktreePath,
  assessmentRepositoryRuntimePath,
  parseRepoPrAssessmentSpec,
  runRepoPrAssessment,
} from "../lib/repo-pr-assessment.mjs"

const RUNNER_SUPERVISOR = fileURLToPath(new URL("../scripts/repo-pr-runner-supervisor.py", import.meta.url))

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false })
  assert.equal(result.status, 0, `git ${args.join(" ")}\n${result.stderr}`)
  return result.stdout.trim()
}

const PYTHON_HELPER_SOURCE = `MARKER = "descriptor-import-ok"\n`

const PYTHON_RUNNER_SOURCE = `#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import pathlib
import subprocess
import sys

from repository_owned_helper import MARKER

args = sys.argv[1:]
if not args or args[0] not in {"plan", "run"}:
    raise SystemExit(4)
if args[0] == "plan":
    raise SystemExit(0)

def value(flag: str) -> str:
    index = args.index(flag)
    return args[index + 1]

assessment_id = value("--assessment-id")
head = value("--sha")
pr_number = int(value("--pr"))
repo_root = value("--repo")
workspace_root = value("--workspace-root")
os.chdir("/tmp")
base = subprocess.check_output(["git", "-C", repo_root, "rev-parse", "origin/main"], text=True).strip()
path = pathlib.Path(workspace_root) / "results" / assessment_id / "assessment.json"
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps({
    "schema_version": "local-agent-assessment-v1",
    "host_evidence_result": "PASS",
    "gate_decision": "NOT_EVALUATED",
    "assessment_id": assessment_id,
    "target_kind": "pr-head",
    "pr_number": pr_number,
    "requested_sha": head,
    "tested_sha": head,
    "pr_head_start": head,
    "pr_head_end": head,
    "control_sha": base,
    "control_ref_start": base,
    "control_ref_end": base,
    "cleanup": {"services_removed": True, "worktree_removed": True, "materials_removed": True, "failures": []},
    "descriptor_import_marker": MARKER,
    "repo_root": repo_root,
}) + "\\n")
raise SystemExit(0)
`

const RUNNER_SOURCE = `#!/usr/bin/env node
import { existsSync, mkdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { spawn, spawnSync } from "node:child_process"
const args = process.argv.slice(2)
const value = (flag) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
if (args[0] === "plan") {
  if (args.includes("--kill-supervisor")) {
    process.kill(process.ppid, "SIGKILL")
    process.exit(0)
  }
  if (args.includes("--surviving-plan-child")) {
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { detached: true, stdio: "ignore" })
    child.unref()
  }
  process.exit(0)
}
if (args[0] !== "run") process.exit(4)
const assessmentId = value("--assessment-id")
const head = value("--sha")
const prNumber = Number(value("--pr"))
const workspaceRoot = value("--workspace-root")
const status = value("--status") || "PASS"
const baseResult = spawnSync("git", ["rev-parse", "origin/main"], { encoding: "utf8", shell: false })
if (baseResult.status !== 0) process.exit(4)
const base = baseResult.stdout.trim()
const path = workspaceRoot + "/results/" + assessmentId + "/assessment.json"
if (args.includes("--skip-evidence")) process.exit(0)
const preEvidenceBarrier = value("--pre-evidence-barrier")
if (preEvidenceBarrier) {
  writeFileSync(preEvidenceBarrier + ".ready", "ready\\n")
  const waitState = new Int32Array(new SharedArrayBuffer(4))
  const deadline = Date.now() + 10000
  while (!existsSync(preEvidenceBarrier + ".release")) {
    if (Date.now() >= deadline) process.exit(4)
    Atomics.wait(waitState, 0, 0, 10)
  }
}
mkdirSync(dirname(path), { recursive: true })
if (args.includes("--malformed-evidence")) {
  writeFileSync(path, "{not-json\\n")
  process.exit(0)
}
let controlWriteBlocked = null
if (args.includes("--probe-control-write")) {
  try {
    writeFileSync("control.txt", "forbidden-control-write\\n")
  } catch (error) {
    if (error?.code !== "EACCES" && error?.code !== "EPERM") throw error
    controlWriteBlocked = true
  }
  if (controlWriteBlocked !== true) process.exit(4)
}
let nativeGitWorktreeProbe = false
if (args.includes("--native-git-worktree")) {
  const probe = workspaceRoot + "/worktrees/" + assessmentId + "-native-probe"
  const added = spawnSync("git", ["worktree", "add", "--detach", probe, head], { encoding: "utf8", shell: false })
  if (added.status !== 0) process.exit(4)
  const removed = spawnSync("git", ["worktree", "remove", "--force", probe], { encoding: "utf8", shell: false })
  if (removed.status !== 0) process.exit(4)
  nativeGitWorktreeProbe = true
}
let reservationDeleteBlocked = null
if (args.includes("--probe-reservation-delete")) {
  try {
    rmSync("/tmp/opencode/assessment-reservations/.opencode-reservation-" + assessmentId)
  } catch (error) {
    if (error?.code !== "EACCES" && error?.code !== "EPERM") throw error
    reservationDeleteBlocked = true
  }
  if (reservationDeleteBlocked !== true) process.exit(4)
}
let ownerGitWriteBlocked = null
const ownerGitWriteProbe = value("--probe-owner-git-write")
if (ownerGitWriteProbe) {
  try {
    writeFileSync(ownerGitWriteProbe, "forbidden-owner-git-write\\n")
  } catch (error) {
    if (error?.code !== "EACCES" && error?.code !== "EPERM") throw error
    ownerGitWriteBlocked = true
  }
  if (ownerGitWriteBlocked !== true) process.exit(4)
}
let externalAssessmentWriteBlocked = null
const externalAssessmentWriteProbe = value("--probe-external-assessment-write")
if (externalAssessmentWriteProbe) {
  try {
    writeFileSync(externalAssessmentWriteProbe, "forbidden-cross-assessment-write\\n")
  } catch (error) {
    if (error?.code !== "EACCES" && error?.code !== "EPERM") throw error
    externalAssessmentWriteBlocked = true
  }
  if (externalAssessmentWriteBlocked !== true) process.exit(4)
}
const pass = status === "PASS"
const evidence = JSON.stringify({
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
  control_write_blocked: controlWriteBlocked,
  native_git_worktree_probe: nativeGitWorktreeProbe,
  reservation_delete_blocked: reservationDeleteBlocked,
  owner_git_write_blocked: ownerGitWriteBlocked,
  external_assessment_write_blocked: externalAssessmentWriteBlocked,
}) + "\\n"
if (args.includes("--symlink-evidence")) {
  const target = path + ".target"
  writeFileSync(target, evidence)
  symlinkSync(target, path)
} else if (args.includes("--oversized-evidence")) {
  writeFileSync(path, evidence + " ".repeat(4 * 1024 * 1024))
} else {
  writeFileSync(path, evidence)
}
if (args.includes("--move-pr-head")) {
  const remoteResult = spawnSync("git", ["remote", "get-url", "origin"], { encoding: "utf8", shell: false })
  if (remoteResult.status !== 0) process.exit(4)
  const moved = spawnSync("git", ["--git-dir", remoteResult.stdout.trim(), "update-ref", "refs/pull/" + prNumber + "/head", base], { encoding: "utf8", shell: false })
  if (moved.status !== 0) process.exit(4)
}
if (args.includes("--symlink-evidence-dir")) {
  const evidenceDir = dirname(path)
  const moved = evidenceDir + ".moved"
  const replacement = evidenceDir + ".replacement"
  renameSync(evidenceDir, moved)
  mkdirSync(replacement)
  writeFileSync(replacement + "/assessment.json", evidence)
  symlinkSync(replacement, evidenceDir)
}
if (args.includes("--surviving-run-child")) {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { detached: true, stdio: "ignore" })
  child.unref()
}
if (args.includes("--dirty-owner")) writeFileSync("owner-mutated.txt", "mutation\\n")
if (args.includes("--break-owner-index")) writeFileSync(".git/index", "broken-index\\n")
const replaceRoot = value("--replace-evidence-root")
if (replaceRoot) {
  const moved = replaceRoot + ".moved"
  const replacement = replaceRoot + ".replacement"
  renameSync(replaceRoot, moved)
  mkdirSync(replacement)
  symlinkSync(replacement, replaceRoot)
}
const barrier = value("--barrier")
if (barrier) {
  writeFileSync(barrier + ".ready", "ready\\n")
  const waitState = new Int32Array(new SharedArrayBuffer(4))
  const deadline = Date.now() + 10000
  while (!existsSync(barrier + ".release")) {
    if (Date.now() >= deadline) process.exit(4)
    Atomics.wait(waitState, 0, 0, 10)
  }
}
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
  const pythonRunnerPath = join(repo, "tools", "repository-owned-runner.py")
  await writeFile(pythonRunnerPath, PYTHON_RUNNER_SOURCE)
  await chmod(pythonRunnerPath, 0o755)
  await writeFile(join(repo, "tools", "repository_owned_helper.py"), PYTHON_HELPER_SOURCE)
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
  const pythonRunnerBlobSha = git(repo, "rev-parse", "HEAD:tools/repository-owned-runner.py")
  const pythonHelperBlobSha = git(repo, "rev-parse", "HEAD:tools/repository_owned_helper.py")
  const controlBlobSha = git(repo, "rev-parse", "HEAD:control.txt")
  return { root, remote, repo, evidenceRoot, baseSha, headSha, runnerBlobSha, pythonRunnerBlobSha, pythonHelperBlobSha, controlBlobSha }
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
      plan_argv: ["plan", "--sha", "{head_sha}", "--pr", "{pr_number}", "--workspace-root", "{workspace_root}"],
      run_argv: ["run", "--sha", "{head_sha}", "--pr", "{pr_number}", "--assessment-id", "{assessment_id}", "--workspace-root", "{workspace_root}", ...extraRun],
    },
    integrity_files: [{ path: "control.txt", blob_sha: fx.controlBlobSha }],
  })
}

function makePythonSpec(fx, assessmentID) {
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
      path: "tools/repository-owned-runner.py",
      blob_sha: fx.pythonRunnerBlobSha,
      result_contract: "local-agent-assessment-v1",
      plan_argv: ["plan", "--sha", "{head_sha}", "--pr", "{pr_number}", "--repo", "{repo_root}", "--workspace-root", "{workspace_root}"],
      run_argv: ["run", "--sha", "{head_sha}", "--pr", "{pr_number}", "--assessment-id", "{assessment_id}", "--repo", "{repo_root}", "--workspace-root", "{workspace_root}"],
    },
    integrity_files: [
      { path: "control.txt", blob_sha: fx.controlBlobSha },
      { path: "tools/repository_owned_helper.py", blob_sha: fx.pythonHelperBlobSha },
    ],
  })
}

async function exists(path) {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (error?.code === "ENOENT") return false
    throw error
  }
}

async function coordinateBarrier(barrier, action) {
  const ready = `${barrier}.ready`
  const release = `${barrier}.release`
  const deadline = Date.now() + 10000
  while (!(await exists(ready))) {
    if (Date.now() >= deadline) throw new Error(`barrier was not reached: ${barrier}`)
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5))
  }
  await action()
  await writeFile(release, "release\n")
}

async function cleanupFixture(fx, assessmentIDs) {
  for (const id of assessmentIDs) {
    await rm(join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, id), { recursive: true, force: true })
    await rm(join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, `${id}.moved`), { recursive: true, force: true })
    await rm(join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, `${id}.replacement`), { recursive: true, force: true })
    await rm(join(ASSESSMENT_RESERVATION_ROOT, `.opencode-reservation-${id}`), { force: true })
  }
  await rm(fx.root, { recursive: true, force: true })
  const controlEntries = await readdir(ASSESSMENT_CONTROL_WORKTREE_ROOT).catch((error) => error?.code === "ENOENT" ? [] : Promise.reject(error))
  for (const entry of controlEntries) {
    if (assessmentIDs.some((id) => entry.endsWith(`-${id}`))) {
      await rm(join(ASSESSMENT_CONTROL_WORKTREE_ROOT, entry), { recursive: true, force: true })
    }
  }
}

test("repository-owned supervisor deterministically reaps an ordinary long-lived descendant", async () => {
  const root = await mkdtemp(join(tmpdir(), "repo-owned-supervisor-reap-"))
  const runnerPath = join(root, "runner.mjs")
  await writeFile(runnerPath, `#!/usr/bin/env node\nimport { spawn } from "node:child_process"\nconst child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { detached: true, stdio: "ignore" })\nchild.unref()\n`)
  await chmod(runnerPath, 0o755)
  const runnerHandle = await open(runnerPath, constants.O_RDONLY)
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = spawnSync("/usr/bin/python3", [RUNNER_SUPERVISOR, "--cwd", root, "--status-fd", "4", "--", "probe"], {
        encoding: "utf8",
        shell: false,
        stdio: ["ignore", "pipe", "pipe", runnerHandle.fd, "pipe"],
      })
      assert.equal(result.status, 240, `attempt=${attempt + 1}\n${result.stderr}`)
      assert.equal(JSON.parse(result.output[4].trim()).kind, "descendants")
    }
  } finally {
    await runnerHandle.close()
    await rm(root, { recursive: true, force: true })
  }
})

test("repository-owned supervisor reaps an adopted double-fork daemon via the procfs parent graph", async () => {
  const root = await mkdtemp(join(tmpdir(), "repo-owned-supervisor-double-fork-"))
  const runnerPath = join(root, "runner.py")
  await writeFile(runnerPath, `#!/usr/bin/env python3\nimport ctypes\nimport os\nimport time\nfirst = os.fork()\nif first == 0:\n    os.setsid()\n    second = os.fork()\n    if second == 0:\n        name = b"daemon-" + bytes([0xFF])\n        ctypes.CDLL(None).prctl(15, ctypes.c_char_p(name), 0, 0, 0)\n        time.sleep(30)\n        os._exit(0)\n    os._exit(0)\nos.waitpid(first, 0)\n`)
  await chmod(runnerPath, 0o755)
  const runnerHandle = await open(runnerPath, constants.O_RDONLY)
  try {
    const result = spawnSync("/usr/bin/python3", [RUNNER_SUPERVISOR, "--cwd", root, "--status-fd", "4", "--", "probe"], {
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "pipe", runnerHandle.fd, "pipe"],
    })
    assert.equal(result.status, 240, result.stderr)
    assert.equal(JSON.parse(result.output[4].trim()).kind, "descendants")
  } finally {
    await runnerHandle.close()
    await rm(root, { recursive: true, force: true })
  }
})

test("repository-owned supervisor stays bound to admitted control descriptors across pathname substitution", async () => {
  const root = await mkdtemp(join(tmpdir(), "repo-owned-supervisor-anchor-"))
  const control = join(root, "control")
  const moved = join(root, "control-admitted")
  await mkdir(control)
  const runnerPath = join(control, "runner.mjs")
  await writeFile(runnerPath, `#!/usr/bin/env node\nimport { readFileSync } from "node:fs"\nconsole.log(readFileSync("control.txt", "utf8").trim())\n`)
  await chmod(runnerPath, 0o755)
  await writeFile(join(control, "control.txt"), "trusted-control\n")
  const runnerHandle = await open(runnerPath, constants.O_RDONLY)
  const controlHandle = await open(control, constants.O_RDONLY | constants.O_DIRECTORY)
  try {
    await rename(control, moved)
    await mkdir(control)
    await writeFile(join(control, "control.txt"), "substituted-control\n")
    const result = spawnSync("/usr/bin/python3", [
      RUNNER_SUPERVISOR,
      "--cwd-fd", "4",
      "--status-fd", "5",
      "--watch-root", "/proc/self/fd/4",
      "--watch", "control.txt",
      "--write-root", "/dev/null",
      "--",
      "probe",
    ], {
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "pipe", runnerHandle.fd, controlHandle.fd, "pipe"],
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.output[5].trim()).kind, "runner")
    assert.equal(result.stdout.trim(), "trusted-control")
    assert.equal(await readFile(join(control, "control.txt"), "utf8"), "substituted-control\n")
    assert.equal(await readFile(join(moved, "control.txt"), "utf8"), "trusted-control\n")
  } finally {
    await runnerHandle.close()
    await controlHandle.close()
    await rm(root, { recursive: true, force: true })
  }
})

test("repository-owned supervisor binds Landlock write authority to inherited descriptors across pathname substitution", async () => {
  const root = await mkdtemp(join(tmpdir(), "repo-owned-supervisor-landlock-fd-"))
  const admitted = join(root, "runtime")
  const moved = join(root, "runtime-admitted")
  const replacement = admitted
  const runnerPath = join(root, "runner.mjs")
  await mkdir(admitted)
  await writeFile(runnerPath, `#!/usr/bin/env node\nimport { writeFileSync } from "node:fs"\nconst args = process.argv.slice(2)\nconst value = (flag) => args[args.indexOf(flag) + 1]\nwriteFileSync(value("--allowed"), "admitted\\n")\nlet blocked = false\ntry {\n  writeFileSync(value("--blocked"), "replacement\\n")\n} catch (error) {\n  if (error?.code !== "EACCES" && error?.code !== "EPERM") throw error\n  blocked = true\n}\nif (!blocked) process.exit(7)\n`)
  await chmod(runnerPath, 0o755)
  const runnerHandle = await open(runnerPath, constants.O_RDONLY)
  const runtimeHandle = await open(admitted, constants.O_RDONLY | constants.O_DIRECTORY)
  try {
    await rename(admitted, moved)
    await mkdir(replacement)
    const result = spawnSync("/usr/bin/python3", [
      RUNNER_SUPERVISOR,
      "--cwd", root,
      "--status-fd", "5",
      "--write-fd", "4",
      "--write-root", "/dev/null",
      "--",
      "--allowed", join(moved, "allowed"),
      "--blocked", join(replacement, "blocked"),
    ], {
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "pipe", runnerHandle.fd, runtimeHandle.fd, "pipe"],
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.output[5].trim()).kind, "runner")
    assert.equal(await readFile(join(moved, "allowed"), "utf8"), "admitted\n")
    assert.equal(await exists(join(replacement, "blocked")), false)
  } finally {
    await runnerHandle.close()
    await runtimeHandle.close()
    await rm(root, { recursive: true, force: true })
  }
})

test("repository-owned descriptor execution preserves Python sibling imports", async (t) => {
  const fx = await fixture()
  const id = `pr20-python-fd-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const result = await runRepoPrAssessment(makePythonSpec(fx, id), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "PASS", result.error)
  const evidence = JSON.parse(await readFile(result.runner_evidence_path, "utf8"))
  assert.equal(evidence.descriptor_import_marker, "descriptor-import-ok")
  assert.match(evidence.repo_root, /^\/proc\/\d+\/cwd$/)
})

test("repository-owned mode preserves a pre-existing control snapshot collision", async (t) => {
  const fx = await fixture()
  const id = `pr20-control-collision-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const spec = makeSpec(fx, id)
  const controlWorktree = assessmentControlWorktreePath(fx.repo, spec)
  await mkdir(controlWorktree, { recursive: true })
  await writeFile(join(controlWorktree, "sentinel"), "pre-existing\n")
  const result = await runRepoPrAssessment(spec, {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "BLOCKED")
  assert.match(result.error, /control snapshot path already exists/)
  assert.equal(await readFile(join(controlWorktree, "sentinel"), "utf8"), "pre-existing\n")
})

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
  assert.equal(result.control_snapshot_cleanup, "PASS")
  assert.equal(await exists(result.control_snapshot_worktree), false)
  assert.equal(git(fx.repo, "branch", "--list", "opencode-assess/*"), "")
  const nativeBytes = await readFile(result.native_evidence_path)
  const canonicalBytes = await readFile(result.runner_evidence_path)
  assert.deepEqual(canonicalBytes, nativeBytes)
  const acceptedHash = createHash("sha256").update(canonicalBytes).digest("hex")
  assert.equal(result.runner_evidence_sha256, acceptedHash)
  assert.equal(result.runner_evidence_bytes, canonicalBytes.length)
  assert.deepEqual(result.owner_final, result.owner_initial)
  assert.deepEqual({
    head: git(fx.repo, "rev-parse", "HEAD"),
    branch: git(fx.repo, "branch", "--show-current"),
    status: git(fx.repo, "status", "--porcelain=v1", "--untracked-files=normal"),
  }, before)
})

test("repository-owned sandbox denies control and owner-Git writes while preserving native Git worktree lifecycle", async (t) => {
  const fx = await fixture()
  const id = `pr20-sandbox-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const ownerGitProbe = join(fx.repo, ".git", `owner-write-probe-${id}`)
  await writeFile(ownerGitProbe, "owner-git-metadata\n")
  const result = await runRepoPrAssessment(makeSpec(fx, id, [
    "--probe-control-write",
    "--native-git-worktree",
    "--probe-owner-git-write",
    ownerGitProbe,
  ]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "PASS", result.error)
  assert.equal(result.control_snapshot_cleanup, "PASS")
  const evidence = JSON.parse(await readFile(result.runner_evidence_path, "utf8"))
  assert.equal(evidence.control_write_blocked, true)
  assert.equal(evidence.native_git_worktree_probe, true)
  assert.equal(evidence.owner_git_write_blocked, true)
  assert.equal(await readFile(ownerGitProbe, "utf8"), "owner-git-metadata\n")
  assert.equal(await readFile(join(fx.repo, "control.txt"), "utf8"), "trusted-control\n")
})

test("repository-owned Landlock grant cannot write another assessment runtime or canonical evidence", async (t) => {
  const fx = await fixture()
  const id = `pr20-runtime-isolation-${Math.random().toString(16).slice(2, 8)}`
  const foreignID = `foreign-${Math.random().toString(16).slice(2, 8)}`
  t.after(async () => {
    await cleanupFixture(fx, [id])
    await rm(join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, foreignID), { recursive: true, force: true })
  })
  const foreignRuntime = join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, foreignID)
  await mkdir(foreignRuntime, { recursive: true })
  const foreignRuntimeSentinel = join(foreignRuntime, "sentinel")
  await writeFile(foreignRuntimeSentinel, "foreign-runtime\n")
  const canonicalSentinel = join(fx.evidenceRoot, "foreign-summary.json")
  await mkdir(fx.evidenceRoot, { recursive: true })
  await writeFile(canonicalSentinel, "foreign-summary\n")

  const runtimeResult = await runRepoPrAssessment(makeSpec(fx, id, ["--probe-external-assessment-write", foreignRuntimeSentinel]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(runtimeResult.host_evidence_result, "PASS", runtimeResult.error)
  let evidence = JSON.parse(await readFile(runtimeResult.runner_evidence_path, "utf8"))
  assert.equal(evidence.external_assessment_write_blocked, true)
  assert.equal(await readFile(foreignRuntimeSentinel, "utf8"), "foreign-runtime\n")

  const secondID = `pr20-evidence-isolation-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [secondID]))
  const evidenceResult = await runRepoPrAssessment(makeSpec(fx, secondID, ["--probe-external-assessment-write", canonicalSentinel]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(evidenceResult.host_evidence_result, "PASS", evidenceResult.error)
  evidence = JSON.parse(await readFile(evidenceResult.runner_evidence_path, "utf8"))
  assert.equal(evidence.external_assessment_write_blocked, true)
  assert.equal(await readFile(canonicalSentinel, "utf8"), "foreign-summary\n")
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

test("repository-owned mode fails closed on missing, malformed, symlinked, oversized, or exit-inconsistent evidence", async (t) => {
  const fx = await fixture()
  const cases = [
    ["skip", ["--skip-evidence"], /did not create/],
    ["malformed", ["--malformed-evidence"], /not strict JSON/],
    ["symlink", ["--symlink-evidence"], /no-follow file/],
    ["oversized", ["--oversized-evidence"], /exceeds 4194304 bytes/],
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

test("repository-owned mode preserves a pre-existing per-assessment runtime collision", async (t) => {
  const fx = await fixture()
  const id = `pr20-runtime-collision-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const spec = makeSpec(fx, id)
  const runtime = assessmentRepositoryRuntimePath(spec)
  await mkdir(runtime, { recursive: true })
  await writeFile(join(runtime, "sentinel"), "pre-existing-runtime\n")
  const result = await runRepoPrAssessment(spec, {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "BLOCKED")
  assert.match(result.error, /repository-owned runtime path already exists/)
  assert.equal(await readFile(join(runtime, "sentinel"), "utf8"), "pre-existing-runtime\n")
  assert.equal(result.runner.plan, null)
  assert.equal(result.runner.run, null)
})

test("repository-owned mode atomically refuses an already reserved assessment identity", async (t) => {
  const fx = await fixture()
  const id = `pr20-native-reserved-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  await mkdir(ASSESSMENT_RESERVATION_ROOT, { recursive: true })
  await writeFile(join(ASSESSMENT_RESERVATION_ROOT, `.opencode-reservation-${id}`), "competing-assessment\n")
  const result = await runRepoPrAssessment(makeSpec(fx, id), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "BLOCKED")
  assert.match(result.error, /native result reservation already exists/)
  assert.equal(result.runner.plan, null)
  assert.equal(result.runner.run, null)
})

test("repository-owned runner cannot delete the gateway-only reservation token", async (t) => {
  const fx = await fixture()
  const id = `pr20-native-reservation-probe-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const result = await runRepoPrAssessment(makeSpec(fx, id, ["--probe-reservation-delete"]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "PASS", result.error)
  const evidence = JSON.parse(await readFile(result.runner_evidence_path, "utf8"))
  assert.equal(evidence.reservation_delete_blocked, true)
})

test("repository-owned kernel reservation prevents duplicate identity across reservation-root replacement", async (t) => {
  const fx = await fixture()
  const id = `pr20-kernel-reservation-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const barrier = join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, id, `pre-evidence-${id}`)
  const movedRoot = `${ASSESSMENT_RESERVATION_ROOT}.${id}.moved`
  const secondEvidenceRoot = join(fx.root, "second-evidence")
  let secondResult
  const firstPromise = runRepoPrAssessment(makeSpec(fx, id, ["--pre-evidence-barrier", barrier]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  const attack = coordinateBarrier(barrier, async () => {
    assert.equal(await exists(join(fx.evidenceRoot, `${id}.summary.json`)), true)
    await rename(ASSESSMENT_RESERVATION_ROOT, movedRoot)
    await mkdir(ASSESSMENT_RESERVATION_ROOT)
    secondResult = await runRepoPrAssessment(makeSpec(fx, id), {
      repoRoot: fx.repo,
      evidenceRoot: secondEvidenceRoot,
    })
  })
  const firstResult = await firstPromise
  await attack
  try {
    assert.equal(secondResult.host_evidence_result, "BLOCKED")
    assert.match(secondResult.error, /kernel assessment reservation already exists/)
    assert.equal(secondResult.summary_path, null)
    assert.equal(firstResult.host_evidence_result, "ISOLATION_BREACH")
    assert.match(firstResult.error, /reservation root pathname/)
  } finally {
    await rm(ASSESSMENT_RESERVATION_ROOT, { recursive: true, force: true })
    await rm(join(movedRoot, `.opencode-reservation-${id}`), { force: true })
    await rename(movedRoot, ASSESSMENT_RESERVATION_ROOT).catch(() => {})
  }
})

test("repository-owned mode requires the reservation identity through evidence admission", async (t) => {
  const fx = await fixture()
  const id = `pr20-native-reservation-delete-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const barrier = join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, id, `barrier-${id}`)
  const attack = coordinateBarrier(barrier, async () => {
    await rm(join(ASSESSMENT_RESERVATION_ROOT, `.opencode-reservation-${id}`))
  })
  const result = await runRepoPrAssessment(makeSpec(fx, id, ["--barrier", barrier]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  await attack
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.error, /native result reservation became unavailable/)
  assert.equal(result.runner_evidence_sha256, null)
})

test("repository-owned uncertain supervisor reaping preserves reservation and control forensic state", async (t) => {
  const fx = await fixture()
  const id = `pr20-reap-uncertain-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const spec = makeSpec(fx, id)
  spec.runner.planArgv.push("--kill-supervisor")
  const result = await runRepoPrAssessment(spec, {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "INFRA_ERROR")
  assert.match(result.error, /could not prove descendant reaping during plan/)
  assert.equal(result.native_result_reservation_cleanup, "PRESERVED_CONTAINMENT_UNCERTAIN")
  assert.equal(result.kernel_assessment_reservation_cleanup, "PRESERVED_CONTAINMENT_UNCERTAIN")
  assert.equal(result.control_snapshot_cleanup, "PRESERVED_CONTAINMENT_UNCERTAIN")
  assert.equal(await exists(join(ASSESSMENT_RESERVATION_ROOT, `.opencode-reservation-${id}`)), true)
  assert.equal(await exists(result.control_snapshot_worktree), true)
})

test("repository-owned mode never follows a substituted assessment-id directory", async (t) => {
  const fx = await fixture()
  const id = `pr20-dir-swap-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const result = await runRepoPrAssessment(makeSpec(fx, id, ["--symlink-evidence-dir"]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "INFRA_ERROR")
  assert.match(result.error, /parent cannot be opened as a no-follow directory/)
})

test("repository-owned plan descendants cannot survive into the run boundary", async (t) => {
  const fx = await fixture()
  const id = `pr20-plan-child-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const spec = makeSpec(fx, id)
  spec.runner.planArgv.push("--surviving-plan-child")
  const result = await runRepoPrAssessment(spec, {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.error, /plan left surviving descendants/)
  assert.equal(result.runner.run, null)
})

test("repository-owned run descendants terminalize before native evidence acceptance", async (t) => {
  const fx = await fixture()
  const id = `pr20-run-child-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const result = await runRepoPrAssessment(makeSpec(fx, id, ["--surviving-run-child"]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.error, /run left surviving descendants/)
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

test("repository-owned evidence-root replacement by an external writer is an isolation breach with recoverable summary", async (t) => {
  const fx = await fixture()
  const id = `pr20-root-replace-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const barrier = join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, id, `barrier-${id}`)
  const attack = coordinateBarrier(barrier, async () => {
    const moved = `${fx.evidenceRoot}.moved`
    const replacement = `${fx.evidenceRoot}.replacement`
    await rename(fx.evidenceRoot, moved)
    await mkdir(replacement)
    await symlink(replacement, fx.evidenceRoot)
  })
  const result = await runRepoPrAssessment(makeSpec(fx, id, ["--barrier", barrier]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  await attack
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.error, /evidence root pathname/)
  assert.match(result.summary_path, /\.moved\/[^/]+\.summary\.json$/)
  const summary = JSON.parse(await readFile(result.summary_path, "utf8"))
  assert.equal(summary.host_evidence_result, "ISOLATION_BREACH")
})

test("repository-owned external control mutation is detected even when bytes are restored", async (t) => {
  const fx = await fixture()
  const id = `pr20-control-race-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const barrier = join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, id, `barrier-${id}`)
  const spec = makeSpec(fx, id, ["--barrier", barrier])
  const controlWorktree = assessmentControlWorktreePath(fx.repo, spec)
  const attack = coordinateBarrier(barrier, async () => {
    const controlPath = join(controlWorktree, "control.txt")
    const original = await readFile(controlPath)
    await writeFile(controlPath, "substituted-control\n")
    await writeFile(controlPath, original)
  })
  const result = await runRepoPrAssessment(spec, { repoRoot: fx.repo, evidenceRoot: fx.evidenceRoot })
  await attack
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.error, /control snapshot changed during run/)
})

test("repository-owned cleanup never deletes a substituted control-snapshot pathname", async (t) => {
  const fx = await fixture()
  const id = `pr20-control-cleanup-swap-${Math.random().toString(16).slice(2, 8)}`
  const barrier = join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, id, `barrier-${id}`)
  const spec = makeSpec(fx, id, ["--barrier", barrier])
  const controlWorktree = assessmentControlWorktreePath(fx.repo, spec)
  const movedControl = `${controlWorktree}.moved`
  t.after(async () => {
    await cleanupFixture(fx, [id])
    await rm(movedControl, { recursive: true, force: true })
  })
  const attack = coordinateBarrier(barrier, async () => {
    await rename(controlWorktree, movedControl)
    await mkdir(controlWorktree)
    await writeFile(join(controlWorktree, "replacement-sentinel"), "do-not-delete\n")
  })
  const result = await runRepoPrAssessment(spec, { repoRoot: fx.repo, evidenceRoot: fx.evidenceRoot })
  await attack
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.equal(await readFile(join(controlWorktree, "replacement-sentinel"), "utf8"), "do-not-delete\n")
  assert.equal(await exists(movedControl), true)
  assert.notEqual(result.control_snapshot_cleanup, "PASS")
})

test("repository-owned final owner-proof failure is INFRA_ERROR", async (t) => {
  const fx = await fixture()
  const id = `pr20-owner-proof-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const barrier = join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, id, `barrier-${id}`)
  const attack = coordinateBarrier(barrier, async () => {
    await writeFile(join(fx.repo, ".git", "index"), "broken-index\n")
  })
  const result = await runRepoPrAssessment(makeSpec(fx, id, ["--barrier", barrier]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  await attack
  assert.equal(result.host_evidence_result, "INFRA_ERROR")
  assert.match(result.error, /final owner workspace proof failed/)
})

test("repository-owned external owner mutation is an isolation breach even with native PASS evidence", async (t) => {
  const fx = await fixture()
  const id = `pr20-dirty-owner-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const barrier = join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, id, `barrier-${id}`)
  const attack = coordinateBarrier(barrier, async () => {
    await writeFile(join(fx.repo, "owner-mutated.txt"), "mutation\n")
  })
  const result = await runRepoPrAssessment(makeSpec(fx, id, ["--barrier", barrier]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  await attack
  assert.equal(result.native_host_evidence_result, "PASS")
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.error, /owner workspace HEAD\/branch\/status changed/)
})

test("repository-owned owner-root replacement cannot substitute the final proof", async (t) => {
  const fx = await fixture()
  const id = `pr20-owner-root-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const barrier = join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, id, `barrier-${id}`)
  const movedRepo = `${fx.repo}.moved`
  const attack = coordinateBarrier(barrier, async () => {
    await rename(fx.repo, movedRepo)
    await mkdir(fx.repo)
  })
  const result = await runRepoPrAssessment(makeSpec(fx, id, ["--barrier", barrier]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  await attack
  assert.equal(result.host_evidence_result, "ISOLATION_BREACH")
  assert.match(result.error, /owner repository root pathname/)
})

test("repository-owned mode detects external canonical PR-head movement at the final authority boundary", async (t) => {
  const fx = await fixture()
  const id = `pr20-moving-head-${Math.random().toString(16).slice(2, 8)}`
  t.after(() => cleanupFixture(fx, [id]))
  const barrier = join(ASSESSMENT_REPOSITORY_RUNTIME_ROOT, id, `barrier-${id}`)
  const attack = coordinateBarrier(barrier, async () => {
    git(fx.root, "--git-dir", fx.remote, "update-ref", "refs/pull/20/head", fx.baseSha)
  })
  const result = await runRepoPrAssessment(makeSpec(fx, id, ["--barrier", barrier]), {
    repoRoot: fx.repo,
    evidenceRoot: fx.evidenceRoot,
  })
  await attack
  assert.equal(result.native_host_evidence_result, "PASS")
  assert.equal(result.host_evidence_result, "STALE")
  assert.match(result.error, /remote authority mismatch/)
})

test("repository-owned schema does not require a venv, base-sha argv, or evidence-path argv", async () => {
  const fx = await fixture()
  const id = `pr20-schema-${Math.random().toString(16).slice(2, 8)}`
  try {
    const spec = makeSpec(fx, id)
    assert.equal(spec.environment.venv, undefined)
    assert.equal(spec.runner.runArgv.includes("{base_sha}"), false)
    assert.equal(spec.runner.runArgv.includes("{evidence_path}"), false)
    assert.equal(spec.runner.runArgv.includes("{workspace_root}"), true)
    assert.equal(spec.repository.headRef, "refs/pull/20/head")
  } finally {
    await cleanupFixture(fx, [id])
  }
})
