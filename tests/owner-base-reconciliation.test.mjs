import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { reconcileOwnerBase } from "../lib/owner-base-reconciliation.mjs"
import { parseReconciliationArgs } from "../scripts/reconcile-owner-base.mjs"

function git(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false })
  if (!allowFailure && result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
  return { code: result.status ?? 1, stdout: String(result.stdout ?? "").trim() }
}

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
  await writeFile(join(seed, "base.txt"), "old\n")
  git(seed, ["add", "base.txt"])
  git(seed, ["commit", "-m", "old base"])
  const oldSha = git(seed, ["rev-parse", "HEAD"]).stdout
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
    assessment_id: "reconcile-test",
    pr_number: 7,
    repository: { remote: "origin", base_ref: "main", base_sha: baseSha, head_ref: "feature", head_sha: headSha },
    runner: {
      execution: "repository-owned",
      authority: "base",
      path: "scripts/local-agent-assessment",
      blob_sha: "1".repeat(40),
      result_contract: "local-agent-assessment-v1",
      run_argv: ["run", "--assessment-id", "{assessment_id}", "--sha", "{head_sha}", "--pr", "{pr_number}", "--workspace-root", "{workspace_root}"],
    },
    integrity_files: [{ path: "scripts/control.py", blob_sha: "2".repeat(40) }],
  }
  return { root, remote, seed, owner, specs, specPath, spec, oldSha, baseSha, headSha }
}

async function writeSpec(path, spec) {
  await writeFile(path, `${JSON.stringify(spec)}\n`)
}

test("public reconciliation argv is exact and destination-free", () => {
  const spec = "/tmp/opencode/verify/assessments/pr7.json"
  const sha = "a".repeat(40)
  assert.deepEqual(parseReconciliationArgs(["--spec", spec, "--expected-old-sha", sha]), { specPath: spec, expectedOldSha: sha })
  for (const argv of [
    ["--spec", spec, "--expected-old-sha", sha, "--destination", "b".repeat(40)],
    ["--spec", "/tmp/opencode/verify/assessments/*.json", "--expected-old-sha", sha],
    ["--spec", spec, "--expected-old-sha", "short"],
  ]) assert.throws(() => parseReconciliationArgs(argv))
})

test("trusted-base reconciliation advances only exact clean old main to pinned base", async () => {
  const f = await fixture()
  const canonicalSpec = "/tmp/opencode/verify/assessments/reconcile-owner-base-success.json"
  await mkdir("/tmp/opencode/verify/assessments", { recursive: true })
  await writeSpec(canonicalSpec, f.spec)
  const result = await reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: f.oldSha, cwd: f.owner })
  assert.equal(result.owner_head_after, f.baseSha)
  assert.equal(result.branch, "main")
  assert.equal(result.owner_clean_after, true)
  assert.equal(git(f.owner, ["rev-parse", "HEAD"]).stdout, f.baseSha)
  assert.equal(git(f.owner, ["status", "--porcelain=v1"]).stdout, "")
})

test("dirty owner and wrong expected old SHA fail before reconciliation", async () => {
  const f = await fixture()
  const canonicalSpec = "/tmp/opencode/verify/assessments/reconcile-owner-base-preconditions.json"
  await mkdir("/tmp/opencode/verify/assessments", { recursive: true })
  await writeSpec(canonicalSpec, f.spec)
  await writeFile(join(f.owner, "dirty.txt"), "dirty\n")
  await assert.rejects(() => reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: f.oldSha, cwd: f.owner }), /must be clean/)
  await writeFile(join(f.owner, "dirty.txt"), "", { flag: "w" })
  git(f.owner, ["clean", "-fd"])
  await assert.rejects(() => reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: "f".repeat(40), cwd: f.owner }), /not expected old SHA/)
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
  await assert.rejects(() => reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: f.oldSha, cwd: f.owner }), (error) => error.reconciliationKind === "STALE" && /remote authority mismatch/.test(error.message))
  assert.equal(git(f.owner, ["rev-parse", "HEAD"]).stdout, f.oldSha)
})

test("non-fast-forward pinned base and non-base authority are rejected", async () => {
  const f = await fixture()
  const canonicalSpec = "/tmp/opencode/verify/assessments/reconcile-owner-base-nonff.json"
  await mkdir("/tmp/opencode/verify/assessments", { recursive: true })
  const divergent = structuredClone(f.spec)
  divergent.repository.base_sha = f.headSha
  divergent.repository.head_sha = f.baseSha
  divergent.repository.head_ref = "main"
  divergent.repository.base_ref = "feature"
  await writeSpec(canonicalSpec, divergent)
  await assert.rejects(() => reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: f.oldSha, cwd: f.owner }), /owner branch.*not pinned base branch/)

  const headAuthority = structuredClone(f.spec)
  headAuthority.runner.authority = "head"
  await writeSpec(canonicalSpec, headAuthority)
  await assert.rejects(() => reconcileOwnerBase({ specPath: canonicalSpec, expectedOldSha: f.oldSha, cwd: f.owner }), /base runner authority/)
})
