import assert from "node:assert/strict"
import { chmod, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"
import { collectWorkspaceIdentity, parseIdentityArgs } from "../scripts/workspace-identity.mjs"

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

test("workspace identity parses a strict shell-free argument surface", () => {
  const sha = "a".repeat(40)
  assert.deepEqual(parseIdentityArgs(["--fetch", "--base", sha, "--check-bin", "/usr/bin/git"]), {
    fetch: true,
    base: sha,
    checkBins: ["/usr/bin/git"],
  })
  assert.throws(() => parseIdentityArgs(["--base", "HEAD"]), /40-character/)
  assert.throws(() => parseIdentityArgs(["--check-bin", "/usr/bin/git;echo"]), /shell-neutral/)
  assert.throws(() => parseIdentityArgs(["--check-bin", "/tmp/tool*"]), /shell-neutral/)
  assert.throws(() => parseIdentityArgs(["--unknown"]), /workspace-identity/)
})

test("workspace identity reports exact Git state without a shell", async () => {
  const root = await mkdtemp(join(tmpdir(), "workspace-identity-"))
  git(root, "init", "-b", "main")
  git(root, "config", "user.name", "Test")
  git(root, "config", "user.email", "test@example.com")
  await writeFile(join(root, "tracked.txt"), "one\n")
  git(root, "add", "tracked.txt")
  git(root, "commit", "-m", "base")
  const head = git(root, "rev-parse", "HEAD")
  const helper = join(root, "version-helper")
  await writeFile(helper, "#!/bin/sh\nprintf 'helper 1.0\\n'\n")
  await chmod(helper, 0o755)
  const previous = process.cwd()
  process.chdir(root)
  try {
    const report = collectWorkspaceIdentity(["--base", head, "--check-bin", helper])
    assert.match(report, new RegExp(`\\[Git\\] HEAD SHA: ${head}`))
    assert.match(report, /\[Git\] Branch: main/)
    assert.match(report, /\[Git\] Worktree Status: \bDIRTY\b/)
    assert.match(report, /\[Git\] Diff Check: CLEAN/)
    assert.match(report, /\[OK\].*helper 1\.0/)
  } finally {
    process.chdir(previous)
  }
})

test("workspace identity implementation contains no execSync shell-string path", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../scripts/workspace-identity.mjs", import.meta.url), "utf8"))
  assert.doesNotMatch(source, /\bexecSync\s*\(/)
  assert.match(source, /spawnSync\(/)
  assert.match(source, /shell:\s*false/)
})
