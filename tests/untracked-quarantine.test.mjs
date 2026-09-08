import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { randomUUID } from "node:crypto"
import { createOperationGuard } from "../lib/operation-guard.mjs"
import {
  QuarantineBlockedError,
  receiptPath,
  runUntrackedQuarantine,
  UNTRACKED_QUARANTINE_SCHEMA,
  UNTRACKED_QUARANTINE_SPEC_ROOT,
} from "../lib/untracked-quarantine.mjs"

const HELPER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/untracked-quarantine.mjs"

function git(root, ...args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

async function repo() {
  const root = await mkdtemp(join(tmpdir(), "untracked-quarantine-test-"))
  git(root, "init", "-q")
  git(root, "config", "user.email", "guard@example.invalid")
  git(root, "config", "user.name", "Guard Test")
  await writeFile(join(root, "tracked.txt"), "tracked\n")
  git(root, "add", "tracked.txt")
  git(root, "commit", "-qm", "base")
  return root
}

function operationID(prefix = "uq") {
  return `${prefix}-${randomUUID()}`
}

function authority() {
  return { mode: "target", binding: "a".repeat(40) }
}

function inspectSpec(root, paths, id = operationID()) {
  return {
    schema_version: UNTRACKED_QUARANTINE_SCHEMA,
    action: "inspect",
    operation_id: id,
    workspace_root: root,
    authority: authority(),
    paths,
  }
}

async function inspectAndQuarantine(root, paths, id = operationID()) {
  const inspected = await runUntrackedQuarantine(inspectSpec(root, paths, id))
  const quarantined = await runUntrackedQuarantine({
    ...inspectSpec(root, paths, id),
    action: "quarantine",
    expected_workspace_sha256: inspected.workspace_sha256,
    expected_status_sha256: inspected.status_sha256,
    expected_paths_sha256: inspected.paths_sha256,
  })
  return { inspected, quarantined, id }
}

async function expectBlocked(action, pattern) {
  await assert.rejects(action, (error) => {
    assert.ok(error instanceof QuarantineBlockedError)
    if (pattern) assert.match(error.message, pattern)
    return true
  })
}

async function register(hooks, sessionID, agent = "build") {
  await hooks["chat.message"]({ sessionID, agent }, { message: {}, parts: [] })
}

async function message(hooks, sessionID, text) {
  await hooks["chat.message"]({ sessionID, agent: "build" }, { message: {}, parts: [{ type: "text", text }] })
}

async function before(hooks, sessionID, callID, command) {
  const output = { args: { command } }
  await hooks["tool.execute.before"]({ sessionID, callID, tool: "bash" }, output)
  return output
}

async function after(hooks, sessionID, callID, command, output = "ok", exit = 0) {
  const result = { title: "", output, metadata: { exit } }
  await hooks["tool.execute.after"]({ sessionID, callID, tool: "bash", args: { command } }, result)
  return result
}

async function continuity(hooks, sessionID) {
  const output = { context: [] }
  await hooks["experimental.session.compacting"]({ sessionID }, output)
  return output.context.join("\n")
}

test("typed quarantine removes only two exact untracked paths and restore reproduces them byte-for-byte", async () => {
  const root = await repo()
  await writeFile(join(root, "alpha.txt"), Buffer.from([0, 1, 2, 3, 255]))
  await mkdir(join(root, "outer", "nested"), { recursive: true })
  await writeFile(join(root, "outer", "nested", "beta.txt"), "beta\n")
  await chmod(join(root, "outer", "nested", "beta.txt"), 0o640)
  const beforeTracked = git(root, "diff", "--cached", "--binary") + git(root, "diff", "--binary")

  const { quarantined, id } = await inspectAndQuarantine(root, ["alpha.txt", "outer/nested"])
  assert.equal(git(root, "status", "--porcelain=v1", "--untracked-files=all"), "")
  assert.equal(git(root, "diff", "--cached", "--binary") + git(root, "diff", "--binary"), beforeTracked)

  const restored = await runUntrackedQuarantine({
    ...inspectSpec(root, ["alpha.txt", "outer/nested"], id),
    action: "restore",
    receipt_path: receiptPath(id),
    expected_receipt_sha256: quarantined.receipt_sha256,
  })
  assert.equal(restored.result, "PASS")
  assert.deepEqual(await readFile(join(root, "alpha.txt")), Buffer.from([0, 1, 2, 3, 255]))
  assert.equal(await readFile(join(root, "outer", "nested", "beta.txt"), "utf8"), "beta\n")
  assert.equal((await (await import("node:fs/promises")).stat(join(root, "outer", "nested", "beta.txt"))).mode & 0o777, 0o640)
  assert.match(git(root, "status", "--porcelain=v1", "--untracked-files=all"), /\?\? alpha\.txt[\s\S]*\?\? outer\/nested\/beta\.txt/)
})

test("tracked, staged, conflicted, ignored-only, escaping, overlapping, and special paths block before source removal", async () => {
  const trackedRoot = await repo()
  await writeFile(join(trackedRoot, "tracked.txt"), "changed\n")
  await expectBlocked(() => runUntrackedQuarantine(inspectSpec(trackedRoot, ["tracked.txt"])), /tracked|index|non-untracked/i)
  assert.equal(await readFile(join(trackedRoot, "tracked.txt"), "utf8"), "changed\n")

  const stagedRoot = await repo()
  await writeFile(join(stagedRoot, "staged.txt"), "new\n")
  git(stagedRoot, "add", "staged.txt")
  await expectBlocked(() => runUntrackedQuarantine(inspectSpec(stagedRoot, ["staged.txt"])), /tracked|index|non-untracked/i)
  assert.equal(await readFile(join(stagedRoot, "staged.txt"), "utf8"), "new\n")

  const conflictRoot = await repo()
  git(conflictRoot, "switch", "-qc", "left")
  await writeFile(join(conflictRoot, "tracked.txt"), "left\n")
  git(conflictRoot, "commit", "-qam", "left")
  git(conflictRoot, "switch", "-q", "master")
  await writeFile(join(conflictRoot, "tracked.txt"), "right\n")
  git(conflictRoot, "commit", "-qam", "right")
  const merge = spawnSync("git", ["-C", conflictRoot, "merge", "left"], { encoding: "utf8" })
  assert.notEqual(merge.status, 0)
  await expectBlocked(() => runUntrackedQuarantine(inspectSpec(conflictRoot, ["tracked.txt"])), /tracked|index|non-untracked/i)
  assert.match(await readFile(join(conflictRoot, "tracked.txt"), "utf8"), /<<<<<<<|>>>>>>>/)

  const ignoredRoot = await repo()
  await writeFile(join(ignoredRoot, ".gitignore"), "ignored.dat\n")
  git(ignoredRoot, "add", ".gitignore")
  git(ignoredRoot, "commit", "-qm", "ignore")
  await writeFile(join(ignoredRoot, "ignored.dat"), "keep\n")
  await expectBlocked(() => runUntrackedQuarantine(inspectSpec(ignoredRoot, ["ignored.dat"])), /non-untracked|untracked/i)
  assert.equal(await readFile(join(ignoredRoot, "ignored.dat"), "utf8"), "keep\n")

  const root = await repo()
  await writeFile(join(root, "ordinary"), "keep\n")
  await expectBlocked(() => runUntrackedQuarantine(inspectSpec(root, ["../ordinary"])), /escaping|repository-relative/i)
  await expectBlocked(() => runUntrackedQuarantine(inspectSpec(root, ["ordinary", "ordinary/child"])), /overlapping/i)
  assert.equal(await readFile(join(root, "ordinary"), "utf8"), "keep\n")

  await mkdir(join(root, "special"))
  await writeFile(join(root, "special", "ordinary.txt"), "ordinary\n")
  const fifo = join(root, "special", "pipe")
  const mkfifo = spawnSync("mkfifo", [fifo], { encoding: "utf8" })
  assert.equal(mkfifo.status, 0, mkfifo.stderr)
  await expectBlocked(() => runUntrackedQuarantine(inspectSpec(root, ["special"])), /special filesystem object/i)
})

test("non-UTF-8 descendant paths fail closed without lossy decoding", async () => {
  const root = await repo()
  await mkdir(join(root, "weird"))
  const rawPath = Buffer.concat([Buffer.from(`${root}/weird/`), Buffer.from([0xff, 0xfe])])
  await writeFile(rawPath, "opaque\n")
  await expectBlocked(() => runUntrackedQuarantine(inspectSpec(root, ["weird"])), /non-UTF-8 path bytes/)
})

test("dirty-state fingerprint drift and pre-existing mismatched quarantine data block with originals intact", async () => {
  const root = await repo()
  await writeFile(join(root, "first.txt"), "first\n")
  const id = operationID("drift")
  const inspected = await runUntrackedQuarantine(inspectSpec(root, ["first.txt"], id))
  await writeFile(join(root, "second.txt"), "second\n")
  await expectBlocked(() => runUntrackedQuarantine({
    ...inspectSpec(root, ["first.txt"], id),
    action: "quarantine",
    expected_workspace_sha256: inspected.workspace_sha256,
    expected_status_sha256: inspected.status_sha256,
    expected_paths_sha256: inspected.paths_sha256,
  }), /dirty-state.*changed/i)
  assert.equal(await readFile(join(root, "first.txt"), "utf8"), "first\n")

  const root2 = await repo()
  await writeFile(join(root2, "first.txt"), "first\n")
  const id2 = operationID("partial")
  const inspected2 = await runUntrackedQuarantine(inspectSpec(root2, ["first.txt"], id2))
  const opData = receiptPath(id2).replace(/receipt\.json$/, "data")
  await mkdir(opData, { recursive: true })
  await writeFile(join(opData, "first.txt"), "corrupt\n")
  await expectBlocked(() => runUntrackedQuarantine({
    ...inspectSpec(root2, ["first.txt"], id2),
    action: "quarantine",
    expected_workspace_sha256: inspected2.workspace_sha256,
    expected_status_sha256: inspected2.status_sha256,
    expected_paths_sha256: inspected2.paths_sha256,
  }), /existing quarantine data does not match/i)
  assert.equal(await readFile(join(root2, "first.txt"), "utf8"), "first\n")
})

test("receipt mismatch and restore overwrite both fail closed while quarantine evidence is retained", async () => {
  const root = await repo()
  await writeFile(join(root, "keep.txt"), "original\n")
  const { quarantined, id } = await inspectAndQuarantine(root, ["keep.txt"])
  await expectBlocked(() => runUntrackedQuarantine({
    ...inspectSpec(root, ["keep.txt"], id),
    action: "restore",
    receipt_path: receiptPath(id),
    expected_receipt_sha256: "f".repeat(64),
  }), /receipt SHA-256/i)
  assert.equal(await readFile(receiptPath(id), "utf8").then(() => true), true)

  await writeFile(join(root, "keep.txt"), "later\n")
  await expectBlocked(() => runUntrackedQuarantine({
    ...inspectSpec(root, ["keep.txt"], id),
    action: "restore",
    receipt_path: receiptPath(id),
    expected_receipt_sha256: quarantined.receipt_sha256,
  }), /refuses to overwrite/i)
  assert.equal(await readFile(join(root, "keep.txt"), "utf8"), "later\n")
  assert.equal(await readFile(receiptPath(id), "utf8").then(() => true), true)
})

test("pending exact-head guard admits only the exact typed helper and preserves authority/review/Verify generations", async () => {
  const root = await repo()
  await writeFile(join(root, "untracked.txt"), "keep\n")
  const stateDirectory = await mkdtemp(join(tmpdir(), "untracked-quarantine-state-"))
  const hooks = createOperationGuard({ directory: root, env: {}, stateDirectory })
  const session = "quarantine-guard"
  await register(hooks, session)
  const target = authority().binding
  await message(hooks, session, `REQUIRED EXACT HEAD: ${target}`)
  const beforeState = await continuity(hooks, session)
  assert.match(beforeState, new RegExp(`Authority: ${target}`))
  assert.match(beforeState, /mode: target/)
  assert.match(beforeState, /Edit generation: 0; Fresh-review generation: 0; Verify generation: 0/)

  await mkdir(UNTRACKED_QUARANTINE_SPEC_ROOT, { recursive: true })
  const id = operationID("guard")
  const specPath = join(UNTRACKED_QUARANTINE_SPEC_ROOT, `${id}.json`)
  await writeFile(specPath, `${JSON.stringify(inspectSpec(root, ["untracked.txt"], id))}\n`)
  const command = `${HELPER} --spec ${specPath}`
  await assert.doesNotReject(() => before(hooks, session, "typed-helper", command))
  await after(hooks, session, "typed-helper", command, "UNTRACKED_QUARANTINE_RESULT=PASS", 0)
  const afterState = await continuity(hooks, session)
  assert.match(afterState, new RegExp(`Authority: ${target}`))
  assert.match(afterState, /mode: target/)
  assert.match(afterState, /Edit generation: 0; Fresh-review generation: 0; Verify generation: 0/)

  for (const [index, unsafe] of [
    "rm -f untracked.txt",
    "mv untracked.txt /tmp/untracked.txt",
    "cp untracked.txt /tmp/untracked.txt",
    "git clean -fd",
    `git reset --hard ${target}`,
  ].entries()) {
    await assert.rejects(() => before(hooks, session, `generic-${index}`, unsafe), /exact-head admission is pending|pending exact-head|exact-head target/i, unsafe)
  }

  await assert.rejects(() => before(hooks, session, "malformed-helper", `${HELPER} --spec ${specPath} --extra`), /untracked-quarantine.*exactly|typed untracked/i)

  const wrongID = operationID("wrong")
  const wrongPath = join(UNTRACKED_QUARANTINE_SPEC_ROOT, `${wrongID}.json`)
  await writeFile(wrongPath, `${JSON.stringify({ ...inspectSpec(root, ["untracked.txt"], wrongID), authority: { mode: "target", binding: "b".repeat(40) } })}\n`)
  await assert.rejects(() => before(hooks, session, "wrong-authority", `${HELPER} --spec ${wrongPath}`), /authority.*does not match|persisted.*authority/i)
})
