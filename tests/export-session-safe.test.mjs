import assert from "node:assert/strict"
import { constants } from "node:fs"
import { access, chmod, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import test from "node:test"

const wrapper = resolve("scripts/export-session-safe.mjs")

test("safe export entrypoint is directly executable", async () => {
  await assert.doesNotReject(() => access(wrapper, constants.X_OK))
})

async function fixture(directory, body) {
  const path = join(directory, "opencode-fixture")
  await writeFile(path, `#!/usr/bin/env node\n${body}\n`)
  await chmod(path, 0o700)
  return path
}

test("safe export uses file-backed stdout and validates a large session", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencode-safe-export-"))
  const binary = await fixture(directory, `const id=process.argv[3];const payload={info:{id},messages:[{parts:[{type:"reasoning",text:"x".repeat(600000)}]}]};process.stdout.write(JSON.stringify(payload));process.exit(0)`)
  const output = join(directory, "session.json")
  const result = spawnSync(process.execPath, [wrapper, "ses_fixture123", "--output", output], { encoding: "utf8", env: { ...process.env, OPENCODE_BIN: binary } })
  assert.equal(result.status, 0, result.stderr)
  const parsed = JSON.parse(await readFile(output, "utf8"))
  assert.equal(parsed.info.id, "ses_fixture123")
  assert.equal(parsed.messages[0].parts[0].text.length, 600000)
})

test("safe export rejects invalid JSON and leaves no target", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencode-safe-export-"))
  const binary = await fixture(directory, `process.stdout.write('{"info":{"id":"ses_fixture456"},"messages":[{"text":"truncated');process.exit(0)`)
  const output = join(directory, "session.json")
  const result = spawnSync(process.execPath, [wrapper, "ses_fixture456", "--output", output], { encoding: "utf8", env: { ...process.env, OPENCODE_BIN: binary } })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /invalid JSON/)
  await assert.rejects(() => access(output), /ENOENT/)
})
