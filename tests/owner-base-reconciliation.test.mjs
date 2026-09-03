import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { reconcileOwnerBase } from "../lib/owner-base-reconciliation.mjs"
import { runRepoPrAssessment } from "../lib/repo-pr-assessment.mjs"
import { parseReconciliationArgs } from "../scripts/reconcile-owner-base.mjs"

function git(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false })
  if (!allowFailure && result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
  return { code: result.status ?? 1, stdout: String(result.stdout ?? "").trim() }
}

const RUNNER_SOURCE = `#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { spawnSync } from "node:child_process"
const args = process.argv.slice(2)
const value = (flag) => args[args.indexOf(flag) + 1]
if (args[0] === "plan") process.exit(0)
if (args[0] !== "run") process.exit(4)
const assessmentId = value("--assessment-id")
const head = value("--sha")
const prNumber = Number(value("--pr"))
const workspaceRoot = value("--workspace-root")
const baseResult = spawnSync("git", ["rev-parse", "origin/main"], { encoding: "utf8", shell: false })
if (baseResult.status !== 0) process.exit(4)
const base = baseResult.stdout.trim()
const path = workspaceRoot + "/results/" + assessmentId + "/assessment.json"
mkdirSync(dirname(path), { recursive: true })
writeFileSync(path, JSON.stringify({
  schema_version: "local-agent-assessment-v1",
  host_evidence_result: "PASS",
  gate_decision: "NOT_EVALUATED",
  assessment_id: assessmentId,
  target_kind: "pr-head",
  pr_number: prNumber,
  requested_sha: head,
  tested_sha: head,
  pr_head_start: head,
  pr_head_end: head,
  control_sha: base,
  control_ref_start: base,
  control_ref_end: base,
  cleanup: { services_removed: true, worktree_removed: true, materials_removed: true, failures: [] },
}) + "\\n")
process.exit(0)
`

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "owner-base-reconcile-"))
  const remote = join(root, "remote.git")
  const seed = join(root, "seed")
  const owner = join(root, "owner")
  const specs = join(root, "specs")
  git(root, ["init", "--bare", remote])
  git(root, ["init", "-b", "main", seed])
  git(seed, ["config", "user.email", "test@example.invalid"])
  git(seed, ["config", "user.name", "Operational Schema Test"])
  await mkdir(join(seed, "tools"), { recursive: true })
  await writeFile(join(seed, "tools", "repository-owned-runner.mjs"), RUNNER_SOURCE)
  await chmod(join(seed, "tools", "repository-owned-runner.mjs"), 0o755)
  await writeFile(join(seed, "control.txt"), "trusted-control\n")
  await writeFile(join(seed, "base.txt"), "old\n")
  git(seed, ["add", "."])
  git(seed, ["commit", "-m", "old base"])
  const oldSha = git(seed, ["rev-parse", "HEAD"]).stdout
  const runnerBlobSha = git(seed, ["rev-parse", "HEAD:tools/repository-owned-runner.mjs"]).stdout
  const controlBlobSha = git(seed, ["rev-parse", "HEAD:control.txt"]).stdout
  git(seed, ["remote", "add", "origin", remote])
  git(seed, ["push", "-u", "origin", "main"])
  await writeFile(join(seed, "base.txt"), "new\n")
  git(seed, ["commit", "-am", "new base"])
  const baseSha = git(seed, ["rev-parse", "HEAD"]).stdout
  git(seed, ["push", "origin", "main"])
  git(seed, ["switch", "-c", "feature", oldSha])
  await writeFile(join(seed, "feature.txt"), "candidate\n")
  git(seed, ["add", "feature.txt"])
  git(seed, ["commit", "-m", "candidate"])
  const headSha = git(seed, ["rev-parse", "HEAD"]).stdout
  git(seed, ["push", "origin", "feature"])
  git(root, ["--git-dir", remote, "update-ref", "refs/pull/7/head", headSha])
  git(root, ["clone", remote, owner])
  git(owner, ["config", "user.email", "test@example.invalid"])
  git(owner, ["config", "user.name", "Operational Schema Test"])
  git(owner, ["checkout", "main"])
  git(owner, ["reset", "--hard", oldSha])
  await mkdir(specs)
  const specPath = join(specs, "assessment.json")
  const spec = {
    schema_version: "opencode-local-assessment-v1",
    kind: "repo-pr",
    assessment_id: `reconcile-test-${Math.random().toString(16).slice(2, 10)}`,
    pr_number: 7,
    repository: { remote: "origin", base_ref: "main", base_sha: baseSha, head_ref: "refs/pull/7/head", head_sha: headSha },
    runner: {
      execution: "repository-owned",
      authority: "base",
      path: "tools/repository-owned-runner.mjs",
      blob_sha: runnerBlobSha,
      result_contract: "local-agent-assessment-v1",
      plan_argv: ["plan", "--sha", "{head_sha}", "--pr", "{pr_number}", "--workspace-root", "{workspace_root}"],
      run_argv: ["run", "--assessment-id", "{assessment_id}", "--sha", "{head_sha}", "--pr", "{pr_number}", "--workspace-root", "{workspace_root}"],
    },
    integrity_files: [{ path: "control.txt", blob_sha: controlBlobSha }],
  }
  return { root, remote, seed, owner, specs, specPath, spec, oldSha, baseSha, headSha }
}

async function writeSpec(path, spec) {
  await writeFile(path, `${JSON.stringify(spec)}\n`)
}

test("public reconciliation argv is exact, identity-bound, and destination-free", () => {
  const spec = "/tmp/opencode/verify/assessments/pr7.json"
  const oldSha = "a".repeat(40)
  const baseSha = "b".repeat(40)
  const targetSha = "c".repeat(40)
  const argv = ["--spec", spec, "--expected-old-sha", oldSha, "--expected-base-sha", baseSha, "--expected-target-sha", targetSha]
  assert.deepEqual(parseReconciliationArgs(argv), { specPath: spec, expectedOldSha: oldSha, expectedBaseSha: baseSha, expectedTargetSha: targetSha })
  for (const invalid of [
    [...argv, "--destination", "d".repeat(40)],
    ["--spec", "/tmp/opencode/verify/assessments/*.json", "--expected-old-sha", oldSha, "--expected-base-sha", baseSha, "--expected-target-sha", targetSha],
    ["--spec", spec, "--expected-old-sha", "short", "--expected-base-sha", baseSha, "--expected-target-sha", targetSha],
    ["--spec", spec, "--expected-old-sha", oldSha, "--expected-base-sha", "short", "--expected-target-sha", targetSha],
    ["--spec", spec, "--expected-old-sha", oldSha, "--expected-base-sha", baseSha, "--expected-target-sha", "short"],
  ]) assert.throws(() => parseReconciliationArgs(invalid))
})

test("trusted-base reconciliation advances exact clean old main and admits the repository-owned gateway", async () => {
  const f = await fixture()
  const canonicalSpec = `/tmp/opencode/verify/assessments/${f.spec.assessment_id}.json`
  const evidenceRoot = join(f.root, "evidence")
  await mkdir("/tmp/opencode/verify/assessments", { recursive: true })
  await writeSpec(canonicalSpec, f.spec)
  const result = await reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: f.oldSha, expectedBaseSha: f.baseSha, expectedTargetSha: f.headSha, cwd: f.owner })
  assert.equal(result.owner_head_after, f.baseSha)
  assert.equal(result.branch, "main")
  assert.equal(result.owner_clean_after, true)
  assert.equal(git(f.owner, ["rev-parse", "HEAD"]).stdout, f.baseSha)
  assert.equal(git(f.owner, ["status", "--porcelain=v1"]).stdout, "")
  const gateway = await runRepoPrAssessment(f.spec, { repoRoot: f.owner, evidenceRoot, specSha256: result.spec_sha256 })
  assert.equal(gateway.host_evidence_result, "PASS", gateway.error)
  assert.equal(gateway.owner_initial.head, f.baseSha)
  assert.equal(gateway.observed_head_sha, f.headSha)
})

test("dirty owner and wrong expected old SHA fail before reconciliation", async () => {
  const f = await fixture()
  const canonicalSpec = "/tmp/opencode/verify/assessments/reconcile-owner-base-preconditions.json"
  await mkdir("/tmp/opencode/verify/assessments", { recursive: true })
  await writeSpec(canonicalSpec, f.spec)
  await writeFile(join(f.owner, "dirty.txt"), "dirty\n")
  await assert.rejects(() => reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: f.oldSha, expectedBaseSha: f.baseSha, expectedTargetSha: f.headSha, cwd: f.owner }), /must be clean/)
  await writeFile(join(f.owner, "dirty.txt"), "", { flag: "w" })
  git(f.owner, ["clean", "-fd"])
  await assert.rejects(() => reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: "f".repeat(40), expectedBaseSha: f.baseSha, expectedTargetSha: f.headSha, cwd: f.owner }), /not expected old SHA/)
  await assert.rejects(() => reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: f.oldSha, expectedBaseSha: "f".repeat(40), expectedTargetSha: f.headSha, cwd: f.owner }), /does not match expected base/)
  await assert.rejects(() => reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: f.oldSha, expectedBaseSha: f.baseSha, expectedTargetSha: "f".repeat(40), cwd: f.owner }), /does not match expected target/)
  assert.equal(git(f.owner, ["rev-parse", "HEAD"]).stdout, f.oldSha)
})

test("moved remote base or head fails stale without owner mutation", async () => {
  const f = await fixture()
  const canonicalSpec = "/tmp/opencode/verify/assessments/reconcile-owner-base-remote-stale.json"
  await mkdir("/tmp/opencode/verify/assessments", { recursive: true })
  await writeSpec(canonicalSpec, f.spec)
  git(f.seed, ["switch", "main"])
  await writeFile(join(f.seed, "later.txt"), "later\n")
  git(f.seed, ["add", "later.txt"])
  git(f.seed, ["commit", "-m", "later main"])
  git(f.seed, ["push", "origin", "main"])
  await assert.rejects(() => reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: f.oldSha, expectedBaseSha: f.baseSha, expectedTargetSha: f.headSha, cwd: f.owner }), (error) => error.reconciliationKind === "STALE" && /remote authority mismatch/.test(error.message))
  assert.equal(git(f.owner, ["rev-parse", "HEAD"]).stdout, f.oldSha)
})

test("non-fast-forward pinned base and non-base authority are rejected", async () => {
  const f = await fixture()
  const canonicalSpec = "/tmp/opencode/verify/assessments/reconcile-owner-base-nonff.json"
  await mkdir("/tmp/opencode/verify/assessments", { recursive: true })

  git(f.seed, ["switch", "--orphan", "divergent-main"])
  git(f.seed, ["rm", "-rf", "."])
  await writeFile(join(f.seed, "divergent.txt"), "divergent\n")
  git(f.seed, ["add", "divergent.txt"])
  git(f.seed, ["commit", "-m", "divergent main"])
  const divergentSha = git(f.seed, ["rev-parse", "HEAD"]).stdout
  git(f.seed, ["push", "--force", "origin", `${divergentSha}:refs/heads/main`])
  const divergent = structuredClone(f.spec)
  divergent.repository.base_sha = divergentSha
  await writeSpec(canonicalSpec, divergent)
  await assert.rejects(() => reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: f.oldSha, expectedBaseSha: divergentSha, expectedTargetSha: f.headSha, cwd: f.owner }), /is not an ancestor of pinned base/)
  assert.equal(git(f.owner, ["rev-parse", "HEAD"]).stdout, f.oldSha)

  git(f.root, ["--git-dir", f.remote, "update-ref", "refs/heads/main", f.baseSha])
  const headAuthority = structuredClone(f.spec)
  headAuthority.runner.authority = "head"
  await writeSpec(canonicalSpec, headAuthority)
  await assert.rejects(() => reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: f.oldSha, expectedBaseSha: f.baseSha, expectedTargetSha: f.headSha, cwd: f.owner }), /base runner authority/)
})
