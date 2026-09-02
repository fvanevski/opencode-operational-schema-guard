import assert from "node:assert/strict"
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"
import { rejectManagedEnvironmentPrefix } from "../scripts/verify-disposable.mjs"

const wrapper = resolve("scripts/verify-disposable.mjs")

function runWrapper(args, options) {
  return spawnSync(process.execPath, [wrapper, ...args], options)
}

async function fixture({ testExit = 0, badEnvironment = false } = {}) {
  const project = await mkdtemp(join(tmpdir(), "verify-disposable-"))
  const scripts = join(project, "scripts")
  const bin = join(project, "bin")
  await mkdir(scripts)
  await mkdir(bin)
  const helper = join(scripts, "disposable-test-services")
  const pytest = join(bin, "pytest")
  const log = join(project, "helper.log")
  const environment = badEnvironment
    ? "printf \"export UNSAFE_KEY='bad'\\n\""
    : [
        "printf \"export RESEARCH_STORE_TEST_DATABASE_URL='postgresql://127.0.0.1/test'\\n\"",
        "printf \"export RESEARCH_STORE_TEST_ALLOW_RESET='test'\\n\"",
        "printf \"export QDRANT_URL='http://127.0.0.1:55437'\\n\"",
        "printf \"export RESEARCH_STORE_TEST_QDRANT_URL='http://127.0.0.1:55437'\\n\"",
        "printf \"export RESEARCH_STORE_TEST_QDRANT_ALLOW_RESET='http://127.0.0.1:55437'\\n\"",
      ].join("\n")
  await writeFile(helper, `#!/bin/sh\nfor arg do action=$arg; done\nprintf '%s\\n' \"$action\" >> \"$HELPER_LOG\"\ncase \"$action\" in\n  up|env|reset-qdrant) ${environment} ;;\n  down) ;;\n  *) exit 3 ;;\nesac\n`)
  await writeFile(pytest, `#!/bin/sh\nprintf '%s|%s\\n' \"$RESEARCH_STORE_TEST_ALLOW_RESET\" \"$PYTHONDONTWRITEBYTECODE\"\nexit ${testExit}\n`)
  await chmod(helper, 0o755)
  await chmod(pytest, 0o755)
  return { project, helper, pytest, log }
}

test("wrapper parses exports without eval, runs the allowlisted gate, and cleans up", async () => {
  const files = await fixture()
  const result = runWrapper(["--namespace", "fault_case", "--start", "--down-after", "--", files.pytest, "-q"], {
    cwd: files.project,
    env: { ...process.env, HELPER_LOG: files.log },
    encoding: "utf8",
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout, "test|1\n")
  const log = await readFile(files.log, "utf8")
  assert.equal(log, "up\ndown\n")
})

test("attach mode reads an existing lifecycle environment without starting or stopping it", async () => {
  const files = await fixture()
  const result = runWrapper(["--namespace", "parent_owned", "--", files.pytest, "-q"], {
    cwd: files.project,
    env: { ...process.env, HELPER_LOG: files.log },
    encoding: "utf8",
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout, "test|1\n")
  assert.equal(await readFile(files.log, "utf8"), "env\n")
})

test("wrapper cleans up after a failing gate and propagates its status", async () => {
  const files = await fixture({ testExit: 7 })
  const result = runWrapper(["--namespace", "failure_case", "--start", "--down-after", "--", files.pytest], {
    cwd: files.project,
    env: { ...process.env, HELPER_LOG: files.log },
    encoding: "utf8",
  })
  assert.equal(result.status, 7, result.stderr)
  const log = await readFile(files.log, "utf8")
  assert.equal(log, "up\ndown\n")
})

test("wrapper rejects unexpected helper exports and arbitrary commands", async () => {
  const bad = await fixture({ badEnvironment: true })
  const badExport = runWrapper(["--namespace", "bad_export", "--", bad.pytest], {
    cwd: bad.project,
    env: { ...process.env, HELPER_LOG: bad.log },
    encoding: "utf8",
  })
  assert.equal(badExport.status, 2)
  assert.equal(await readFile(bad.log, "utf8"), "env\n")

  const arbitrary = runWrapper(["--namespace", "bad_command", "--", "/bin/sh", "-c", "true"], {
    cwd: bad.project,
    encoding: "utf8",
  })
  assert.equal(arbitrary.status, 2)
  assert.equal(await readFile(bad.log, "utf8"), "env\n")
})

test("wrapper explains that managed environment prefixes belong outside the delegated command", async () => {
  const files = await fixture()
  for (const prefix of [["env", "PYTHONDONTWRITEBYTECODE=1"], ["PYTHONDONTWRITEBYTECODE=1"]]) {
    assert.throws(
      () => rejectManagedEnvironmentPrefix([...prefix, files.pytest, "-q"]),
      /begin directly with the repository-pinned validation executable.*injects PYTHONDONTWRITEBYTECODE/s,
    )
  }
  await assert.rejects(() => readFile(files.log, "utf8"), /ENOENT/)
})

test("wrapper cannot reset or tear down services it did not start", async () => {
  const files = await fixture()
  for (const option of ["--reset-qdrant", "--down-after"]) {
    const result = runWrapper(["--namespace", "ownership_case", option, "--", files.pytest], {
      cwd: files.project,
      env: { ...process.env, HELPER_LOG: files.log },
      encoding: "utf8",
    })
    assert.equal(result.status, 2)
  }
  await assert.rejects(() => readFile(files.log, "utf8"), /ENOENT/)
})
