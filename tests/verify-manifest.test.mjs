import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

const runner = new URL("../scripts/verify-manifest.mjs", import.meta.url).pathname
const root = "/tmp/opencode/verify/manifests"

async function manifest(body) {
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(join(root, "v512-test-"))
  const path = join(directory, "commands.json")
  await writeFile(path, `${JSON.stringify(body)}\n`)
  return path
}

test("typed manifest runner executes argv without a shell and reports integrity", async () => {
  const repository = await mkdtemp(join(tmpdir(), "verify-manifest-repo-"))
  execFileSync("git", ["init", "-q", repository])
  const path = await manifest({
    schema_version: "opencode-verify-manifest-v1",
    commands: [
      { label: "status", argv: ["git", "status", "--short"] },
      { label: "head", argv: ["git", "rev-parse", "--git-dir"] },
    ],
  })
  const result = spawnSync(process.execPath, [runner, "--manifest", path], { cwd: repository, encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /OPERATIONAL_MANIFEST:.*commands=2/)
  assert.match(result.stdout, /OPERATIONAL_MANIFEST_RESULT: PASS; COMMANDS_REQUIRED: 2; COMMANDS_FAILED: 0; SHA256: [0-9a-f]{64}/)
})

test("typed manifest runner rejects writes, shell payloads, and root escapes", async () => {
  for (const argv of [
    ["ruff", "check", "src", "--fix"],
    ["ruff", "format", "src"],
    ["sh", "-c", "echo unsafe"],
    ["git", "commit", "-m", "unsafe"],
    ["pytest", "-q\nrm -rf x"],
  ]) {
    const path = await manifest({ schema_version: "opencode-verify-manifest-v1", commands: [{ argv }] })
    const result = spawnSync(process.execPath, [runner, "--manifest", path], { encoding: "utf8" })
    assert.equal(result.status, 2, `${argv.join(" ")} unexpectedly passed`)
  }
  const outside = join(await mkdtemp(join(tmpdir(), "manifest-outside-")), "commands.json")
  await writeFile(outside, JSON.stringify({ schema_version: "opencode-verify-manifest-v1", commands: [{ argv: ["git", "status"] }] }))
  const escaped = spawnSync(process.execPath, [runner, "--manifest", outside], { encoding: "utf8" })
  assert.equal(escaped.status, 2)
  assert.match(escaped.stderr, /under \/tmp\/opencode\/verify\/manifests/)
})
