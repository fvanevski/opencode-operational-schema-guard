import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { createOperationGuard } from "../lib/operation-guard.mjs"

const ASSESSMENT_ROOT = "/tmp/opencode/verify/assessments"
const ASSESSMENT_RUNNER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs"
const RECONCILIATION_RUNNER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/reconcile-owner-base.mjs"

async function message(hooks, sessionID, text) {
  await hooks["chat.message"]({ sessionID, agent: "build" }, { message: {}, parts: [{ type: "text", text }] })
}

async function register(hooks, sessionID) {
  await hooks["chat.message"]({ sessionID, agent: "build" }, { message: {}, parts: [] })
}

async function before(hooks, sessionID, callID, args) {
  const output = { args }
  await hooks["tool.execute.before"]({ sessionID, callID, tool: "bash" }, output)
  return output
}

async function after(hooks, sessionID, callID, args, output = {}) {
  const result = { title: "", output: "", metadata: {}, ...output }
  await hooks["tool.execute.after"]({ sessionID, callID, tool: "bash", args }, result)
  return result
}

async function compaction(hooks, sessionID) {
  const output = { context: [] }
  await hooks["experimental.session.compacting"]({ sessionID }, output)
  return output.context.join("\n")
}

function makeSpec({ assessmentID, base, target, execution = "repository-owned", authority = "base" }) {
  const runner = execution === "repository-owned"
    ? {
        execution,
        authority,
        path: "tools/repository-owned-runner.mjs",
        blob_sha: "1".repeat(40),
        result_contract: "local-agent-assessment-v1",
        plan_argv: ["plan", "--sha", "{head_sha}", "--pr", "{pr_number}", "--workspace-root", "{workspace_root}"],
        run_argv: ["run", "--assessment-id", "{assessment_id}", "--sha", "{head_sha}", "--pr", "{pr_number}", "--workspace-root", "{workspace_root}"],
      }
    : {
        path: "tools/gateway-runner.mjs",
        plan_argv: ["plan", "--base", "{base_sha}", "--sha", "{head_sha}", "--pr", "{pr_number}"],
        run_argv: ["run", "--base", "{base_sha}", "--sha", "{head_sha}", "--pr", "{pr_number}", "--output", "{evidence_path}"],
      }
  return {
    schema_version: "opencode-local-assessment-v1",
    kind: "repo-pr",
    assessment_id: assessmentID,
    pr_number: 7,
    repository: {
      remote: "origin",
      base_ref: "main",
      base_sha: base,
      head_ref: "refs/pull/7/head",
      head_sha: target,
    },
    runner,
    integrity_files: execution === "repository-owned" ? [{ path: "control.txt", blob_sha: "2".repeat(40) }] : [],
  }
}

async function writeSpec(spec) {
  await mkdir(ASSESSMENT_ROOT, { recursive: true })
  const path = join(ASSESSMENT_ROOT, `${spec.assessment_id}.json`)
  const bytes = `${JSON.stringify(spec)}\n`
  await writeFile(path, bytes)
  return { path, sha256: createHash("sha256").update(bytes).digest("hex") }
}

function assessmentCommand(path) {
  return { command: `${ASSESSMENT_RUNNER} --spec ${path}` }
}

function reconciliationCommand(path, oldSha, base, target) {
  return { command: `${RECONCILIATION_RUNNER} --spec ${path} --expected-old-sha ${oldSha} --expected-base-sha ${base} --expected-target-sha ${target}` }
}

function assessmentOutput({ assessmentID, specSha256, base, target, result = "STALE", exit = 3 }) {
  return {
    output: `OPERATIONAL_ASSESSMENT: schema=opencode-local-assessment-v1; assessment_id=${assessmentID}; spec_sha256=${specSha256}; base_sha=${base}; target_sha=${target}; summary=/tmp/opencode/verify/evidence/${assessmentID}.summary.json\nHOST_EVIDENCE_RESULT=${result}\nGATE_DECISION=NOT_EVALUATED\n`,
    metadata: { exit },
  }
}

function reconciliationOutput({ assessmentID, specSha256, oldSha, base, target }) {
  return {
    output: `OPERATIONAL_OWNER_RECONCILIATION: PASS; schema=opencode-owner-base-reconciliation-v1; assessment_id=${assessmentID}; spec_sha256=${specSha256}; expected_old_sha=${oldSha}; base_sha=${base}; head_sha=${target}; branch=main\nOWNER_BASE_RECONCILIATION_RESULT=PASS\n`,
    metadata: { exit: 0 },
  }
}

async function mismatchedGuard(t, label, { target = "d".repeat(40), observed = "a".repeat(40) } = {}) {
  const stateDirectory = await mkdtemp(join(tmpdir(), `target-lifecycle-${label}-`))
  const directory = join(stateDirectory, "workspace")
  await mkdir(directory)
  const hooks = createOperationGuard({ directory, env: {}, stateDirectory })
  const sessionID = `session-${label}`
  await message(hooks, sessionID, `REQUIRED EXACT HEAD: ${target}`)
  const proof = { command: "git rev-parse HEAD" }
  await before(hooks, sessionID, "proof", proof)
  await after(hooks, sessionID, "proof", proof, { output: `${observed}\n`, metadata: { exit: 0 } })
  t.after(async () => rm(stateDirectory, { recursive: true, force: true }))
  return { hooks, sessionID, stateDirectory, directory, target, observed }
}

test("cross-target assessment spec is rejected before execution", async (t) => {
  const f = await mismatchedGuard(t, "cross-target")
  const base = "b".repeat(40)
  const wrongTarget = "e".repeat(40)
  const spec = makeSpec({ assessmentID: `cross-${Math.random().toString(16).slice(2, 8)}`, base, target: wrongTarget })
  const written = await writeSpec(spec)
  t.after(() => rm(written.path, { force: true }))
  await assert.rejects(() => before(f.hooks, f.sessionID, "assessment", assessmentCommand(written.path)), /does not match persisted exact-head target/)
  assert.match(await compaction(f.hooks, f.sessionID), new RegExp(`Authority: ${f.target}`))
})

test("generic target mismatch cannot invoke owner reconciliation before authenticated STALE", async (t) => {
  const f = await mismatchedGuard(t, "pre-stale")
  const base = "b".repeat(40)
  const spec = makeSpec({ assessmentID: `pre-stale-${Math.random().toString(16).slice(2, 8)}`, base, target: f.target })
  const written = await writeSpec(spec)
  t.after(() => rm(written.path, { force: true }))
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "reconcile", reconciliationCommand(written.path, f.observed, base, f.target)),
    /not admitted by a generic target mismatch.*authenticated STALE/s,
  )
  assert.match(await compaction(f.hooks, f.sessionID), new RegExp(`Authority: ${f.target}`))
})

test("authenticated repository-owned base STALE persists exact reconciliation identity across plugin restart", async (t) => {
  const f = await mismatchedGuard(t, "stale-restart")
  const base = "b".repeat(40)
  const assessmentID = `stale-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  t.after(() => rm(written.path, { force: true }))
  const command = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", command)
  const stale = await after(f.hooks, f.sessionID, "assessment", command, assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target }))
  assert.match(stale.output, /ASSESSMENT_TERMINAL -> OWNER_RECONCILIATION/)
  assert.match(stale.output, /OPERATIONAL_TARGET_RECONCILIATION: admitted/)

  const restarted = createOperationGuard({ directory: f.directory, env: {}, stateDirectory: f.stateDirectory })
  await register(restarted, "session-restarted")
  const continuity = await compaction(restarted, "session-restarted")
  assert.match(continuity, new RegExp(`Authority: ${f.target}`))
  assert.match(continuity, new RegExp(`Target lifecycle: OWNER_RECONCILIATION; target=${f.target}; base=${base}; owner=${f.observed}`))
  await assert.doesNotReject(() => before(restarted, "session-restarted", "reconcile", reconciliationCommand(written.path, f.observed, base, f.target)))
})

test("forged or cross-identity assessment terminal evidence never releases target or admits reconciliation", async (t) => {
  const cases = [
    ["wrong-hash", ({ sha256 }) => ({ specSha256: "f".repeat(64), target: undefined, assessmentID: undefined, exit: undefined })],
    ["wrong-target", () => ({ target: "e".repeat(40) })],
    ["wrong-id", () => ({ assessmentID: "other-assessment" })],
    ["wrong-exit", () => ({ exit: 0 })],
  ]
  for (const [name, mutate] of cases) {
    const f = await mismatchedGuard(t, `forged-${name}`)
    const base = "b".repeat(40)
    const assessmentID = `forge-${name}-${Math.random().toString(16).slice(2, 6)}`.slice(0, 47)
    const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
    t.after(() => rm(written.path, { force: true }))
    const command = assessmentCommand(written.path)
    await before(f.hooks, f.sessionID, `assessment-${name}`, command)
    const delta = mutate({ sha256: written.sha256 })
    const out = assessmentOutput({
      assessmentID: delta.assessmentID ?? assessmentID,
      specSha256: delta.specSha256 ?? written.sha256,
      base,
      target: delta.target ?? f.target,
      result: "STALE",
      exit: delta.exit ?? 3,
    })
    const result = await after(f.hooks, f.sessionID, `assessment-${name}`, command, out)
    assert.match(result.output, /REJECTED unauthenticated assessment terminal evidence/)
    assert.doesNotMatch(result.output, /ASSESSMENT_TERMINAL -> OWNER_RECONCILIATION/)
    assert.match(await compaction(f.hooks, f.sessionID), new RegExp(`Authority: ${f.target}`))
    await assert.rejects(
      () => before(f.hooks, f.sessionID, `reconcile-${name}`, reconciliationCommand(written.path, f.observed, base, f.target)),
      /not admitted by a generic target mismatch.*authenticated STALE/s,
    )
  }
})

test("missing terminal evidence remains fail-closed and does not admit reconciliation", async (t) => {
  const f = await mismatchedGuard(t, "interrupted")
  const base = "b".repeat(40)
  const assessmentID = `interrupt-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  t.after(() => rm(written.path, { force: true }))
  const command = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", command)
  const result = await after(f.hooks, f.sessionID, "assessment", command, { output: "dispatcher interrupted before typed evidence", metadata: { exit: 2 } })
  assert.match(result.output, /REJECTED unauthenticated assessment terminal evidence/)
  assert.match(await compaction(f.hooks, f.sessionID), new RegExp(`Authority: ${f.target}`))
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "reconcile", reconciliationCommand(written.path, f.observed, base, f.target)),
    /not admitted by a generic target mismatch.*authenticated STALE/s,
  )
})

test("STALE from a non-reconcilable assessment remains target-bound without creating owner reconciliation authority", async (t) => {
  for (const [name, execution, authority] of [["gateway", "gateway-owned", undefined], ["head", "repository-owned", "head"]]) {
    const f = await mismatchedGuard(t, `nonrecon-${name}`)
    const base = "b".repeat(40)
    const assessmentID = `nonrecon-${name}-${Math.random().toString(16).slice(2, 6)}`
    const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target, execution, authority }))
    t.after(() => rm(written.path, { force: true }))
    const command = assessmentCommand(written.path)
    await before(f.hooks, f.sessionID, "assessment", command)
    const stale = await after(f.hooks, f.sessionID, "assessment", command, assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target }))
    assert.match(stale.output, /OPERATIONAL_TARGET_RECONCILIATION: not-admitted/)
    assert.match(await compaction(f.hooks, f.sessionID), new RegExp(`Authority: ${f.target}`))
  }
})

test("reconciliation release requires exact stale spec hash and old/base/target result identity", async (t) => {
  const mutations = [
    ["hash", (value) => ({ ...value, specSha256: "f".repeat(64) })],
    ["old", (value) => ({ ...value, oldSha: "c".repeat(40) })],
    ["base", (value) => ({ ...value, base: "c".repeat(40) })],
    ["target", (value) => ({ ...value, target: "e".repeat(40) })],
  ]
  for (const [name, mutate] of mutations) {
    const f = await mismatchedGuard(t, `recon-forge-${name}`)
    const base = "b".repeat(40)
    const assessmentID = `recon-${name}-${Math.random().toString(16).slice(2, 6)}`
    const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
    t.after(() => rm(written.path, { force: true }))
    const assessment = assessmentCommand(written.path)
    await before(f.hooks, f.sessionID, "assessment", assessment)
    await after(f.hooks, f.sessionID, "assessment", assessment, assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target }))

    const reconciliation = reconciliationCommand(written.path, f.observed, base, f.target)
    await before(f.hooks, f.sessionID, "reconcile", reconciliation)
    const forged = mutate({ assessmentID, specSha256: written.sha256, oldSha: f.observed, base, target: f.target })
    const result = await after(f.hooks, f.sessionID, "reconcile", reconciliation, reconciliationOutput(forged))
    assert.match(result.output, /REJECTED unauthenticated reconciliation success evidence/)
    const continuity = await compaction(f.hooks, f.sessionID)
    assert.match(continuity, new RegExp(`Authority: ${f.target}`))
    assert.match(continuity, /Target lifecycle: OWNER_RECONCILIATION/)
  }
})

test("exact authenticated reconciliation consumes stale capability and releases target", async (t) => {
  const f = await mismatchedGuard(t, "recon-pass")
  const base = "b".repeat(40)
  const assessmentID = `recon-pass-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  t.after(() => rm(written.path, { force: true }))
  const assessment = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", assessment)
  await after(f.hooks, f.sessionID, "assessment", assessment, assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target }))

  const reconciliation = reconciliationCommand(written.path, f.observed, base, f.target)
  await before(f.hooks, f.sessionID, "reconcile", reconciliation)
  const result = await after(f.hooks, f.sessionID, "reconcile", reconciliation, reconciliationOutput({ assessmentID, specSha256: written.sha256, oldSha: f.observed, base, target: f.target }))
  assert.match(result.output, /OWNER_RECONCILIATION -> TARGET_RELEASED/)
  const continuity = await compaction(f.hooks, f.sessionID)
  assert.match(continuity, /Authority: unbound/)
  assert.doesNotMatch(continuity, /Target lifecycle: OWNER_RECONCILIATION/)
})
