import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import test, { after as afterAll } from "node:test"
import { createOperationGuard } from "../lib/operation-guard.mjs"
import { ASSESSMENT_RESULT_SCHEMA } from "../lib/repo-pr-assessment.mjs"
import { assessmentTerminalOutput } from "../scripts/local-agent-assessment.mjs"

const ASSESSMENT_ROOT = "/tmp/opencode/verify/assessments"
const EVIDENCE_ROOT = "/tmp/opencode/verify/evidence"
const ASSESSMENT_RUNNER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs"
const RECONCILIATION_RUNNER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/reconcile-owner-base.mjs"
const generated = new Set()

function git(directory, args) {
  const result = spawnSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    timeout: 10_000,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0" },
  })
  assert.equal(result.status, 0, String(result.stderr || result.stdout || `git ${args.join(" ")} failed`))
  return String(result.stdout ?? "").trim()
}

async function authorityNotice(hooks, sessionID) {
  const output = { system: ["base system"] }
  await hooks["experimental.chat.system.transform"]({ sessionID }, output)
  return output.system.join("\n")
}

async function persistedSafety(stateDirectory, directory) {
  const key = createHash("sha256").update(resolve(directory)).digest("hex")
  return JSON.parse(await readFile(join(resolve(stateDirectory), `${key}.json`), "utf8"))
}

async function repositoryGuard(t, label, { remote = "https://github.com/fvanevski/firecrawl_skill.git" } = {}) {
  const root = await mkdtemp(join(tmpdir(), `target-authority-${label}-`))
  const directory = join(root, "workspace")
  const stateDirectory = join(root, "state")
  await mkdir(directory, { recursive: true })
  git(directory, ["init", "-q"])
  git(directory, ["config", "user.name", "Issue 59 Test"])
  git(directory, ["config", "user.email", "issue59@example.invalid"])
  git(directory, ["commit", "--allow-empty", "-m", "fixture"])
  git(directory, ["remote", "add", "origin", remote])
  const target = git(directory, ["rev-parse", "HEAD"]).toLowerCase()
  const hooks = createOperationGuard({ directory, env: {}, stateDirectory, pluginRoot: process.cwd() })
  const sessionID = `session-${label}`
  t.after(async () => rm(root, { recursive: true, force: true }))
  return { root, directory, stateDirectory, target, hooks, sessionID }
}

afterAll(async () => {
  await Promise.all([...generated].map((path) => rm(path, { force: true })))
})

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
  generated.add(path)
  return { path, sha256: createHash("sha256").update(bytes).digest("hex") }
}

function assessmentCommand(path) {
  return { command: `${ASSESSMENT_RUNNER} --spec ${path}` }
}

function reconciliationCommand(path, oldSha, base, target) {
  return { command: `${RECONCILIATION_RUNNER} --spec ${path} --expected-old-sha ${oldSha} --expected-base-sha ${base} --expected-target-sha ${target}` }
}

async function assessmentOutput({
  assessmentID,
  specSha256,
  base,
  target,
  observed = "a".repeat(40),
  result = "STALE",
  exit = 3,
  execution = "repository-owned",
  authority = "base",
  summaryOverrides = {},
  markerSchema = ASSESSMENT_RESULT_SCHEMA,
}) {
  await mkdir(EVIDENCE_ROOT, { recursive: true })
  const summaryPath = join(EVIDENCE_ROOT, `${assessmentID}.summary.json`)
  const summary = {
    schema_version: ASSESSMENT_RESULT_SCHEMA,
    assessment_id: assessmentID,
    expected_base_sha: base,
    expected_head_sha: target,
    spec_sha256: specSha256,
    base_ref: "main",
    runner_execution: execution,
    runner_authority: authority,
    owner_initial: { head: observed, branch: "main", status: "" },
    owner_final: { head: observed, branch: "main", status: "" },
    observed_base_sha: base,
    observed_head_sha: target,
    host_evidence_result: result,
    gate_decision: "NOT_EVALUATED",
    error: `repo-pr-assessment: repository-owned owner checkout is ${observed}, not pinned base authority ${base}`,
    ...summaryOverrides,
  }
  const summaryBytes = `${JSON.stringify(summary)}\n`
  await writeFile(summaryPath, summaryBytes)
  generated.add(summaryPath)
  const summarySha256 = createHash("sha256").update(summaryBytes).digest("hex")
  return {
    output: `OPERATIONAL_ASSESSMENT: schema=${markerSchema}; assessment_id=${assessmentID}; spec_sha256=${specSha256}; base_sha=${base}; target_sha=${target}; summary_sha256=${summarySha256}; summary=${summaryPath}\nHOST_EVIDENCE_RESULT=${result}\nGATE_DECISION=NOT_EVALUATED\n`,
    metadata: { exit },
  }
}

async function realWrapperAssessmentOutput({ assessmentID, specSha256, base, target, observed }) {
  await mkdir(EVIDENCE_ROOT, { recursive: true })
  const summaryPath = join(EVIDENCE_ROOT, `${assessmentID}.summary.json`)
  const result = {
    schema_version: ASSESSMENT_RESULT_SCHEMA,
    assessment_id: assessmentID,
    expected_base_sha: base,
    expected_head_sha: target,
    spec_sha256: specSha256,
    base_ref: "main",
    runner_execution: "repository-owned",
    runner_authority: "base",
    owner_initial: { head: observed, branch: "main", status: "" },
    owner_final: { head: observed, branch: "main", status: "" },
    observed_base_sha: base,
    observed_head_sha: target,
    host_evidence_result: "STALE",
    gate_decision: "NOT_EVALUATED",
    error: `repo-pr-assessment: repository-owned owner checkout is ${observed}, not pinned base authority ${base}`,
    summary_path: summaryPath,
    exit_code: 3,
  }
  const { summary_path: _summaryPath, exit_code: _exitCode, ...summary } = result
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`)
  generated.add(summaryPath)
  return { output: assessmentTerminalOutput(result, specSha256), metadata: { exit: 3 } }
}

function reconciliationOutput({ assessmentID, specSha256, oldSha, base, target, branch = "main" }) {
  return {
    output: `OPERATIONAL_OWNER_RECONCILIATION: PASS; schema=opencode-owner-base-reconciliation-v1; assessment_id=${assessmentID}; spec_sha256=${specSha256}; expected_old_sha=${oldSha}; base_sha=${base}; head_sha=${target}; branch=${branch}\nOWNER_BASE_RECONCILIATION_RESULT=PASS\n`,
    metadata: { exit: 0 },
  }
}

async function mismatchedGuard(t, label, { target = "d".repeat(40), observed = "a".repeat(40), proveObserved = true } = {}) {
  const stateDirectory = await mkdtemp(join(tmpdir(), `target-lifecycle-${label}-`))
  const directory = join(stateDirectory, "workspace")
  await mkdir(directory)
  const hooks = createOperationGuard({ directory, env: {}, stateDirectory })
  const sessionID = `session-${label}`
  await message(hooks, sessionID, `REQUIRED EXACT HEAD: ${target}`)
  if (proveObserved) {
    const proof = { command: "git rev-parse HEAD" }
    await before(hooks, sessionID, "proof", proof)
    await after(hooks, sessionID, "proof", proof, { output: `${observed}\n`, metadata: { exit: 0 } })
  }
  t.after(async () => rm(stateDirectory, { recursive: true, force: true }))
  return { hooks, sessionID, stateDirectory, directory, target, observed }
}

test("LF and CRLF backslash continuations are accepted identically by exact assessment and reconciliation layers", async (t) => {
  for (const [name, eol] of [["lf", "\n"], ["crlf", "\r\n"]]) {
    const f = await mismatchedGuard(t, `continued-${name}`)
    const base = "b".repeat(40)
    const assessmentID = `continued-${name}-${Math.random().toString(16).slice(2, 8)}`
    const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
    const assessment = { command: `${ASSESSMENT_RUNNER} \\${eol}  --spec ${written.path}` }
    await assert.doesNotReject(() => before(f.hooks, f.sessionID, "assessment", assessment))
    const stale = await after(f.hooks, f.sessionID, "assessment", assessment, await assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target, observed: f.observed }))
    assert.match(stale.output, /ASSESSMENT_TERMINAL -> OWNER_RECONCILIATION/)
    assert.match(await compaction(f.hooks, f.sessionID), /Target lifecycle: OWNER_RECONCILIATION/)

    const reconciliation = {
      command: [
        `${RECONCILIATION_RUNNER} \\`,
        `  --spec ${written.path} \\`,
        `  --expected-old-sha ${f.observed} \\`,
        `  --expected-base-sha ${base} \\`,
        `  --expected-target-sha ${f.target}`,
      ].join(eol),
    }
    await assert.doesNotReject(() => before(f.hooks, f.sessionID, "reconcile", reconciliation))
    const reconciled = await after(f.hooks, f.sessionID, "reconcile", reconciliation, reconciliationOutput({ assessmentID, specSha256: written.sha256, oldSha: f.observed, base, target: f.target }))
    assert.match(reconciled.output, /OWNER_RECONCILIATION -> TARGET_RELEASED/)
    assert.match(await compaction(f.hooks, f.sessionID), /Authority: unbound/)
  }
})

test("malformed multiline assessment cannot mint lifecycle and malformed reconciliation cannot consume it", async (t) => {
  const f = await mismatchedGuard(t, "malformed-multiline")
  const base = "b".repeat(40)
  const assessmentID = `malformed-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  for (const [index, command] of [
    `${ASSESSMENT_RUNNER}\n--spec ${written.path}`,
    `${ASSESSMENT_RUNNER} --spec ${written.path}\n`,
    `\n${ASSESSMENT_RUNNER} --spec ${written.path}`,
  ].entries()) {
    await assert.rejects(() => before(f.hooks, f.sessionID, `malformed-assessment-${index}`, { command }), /one bare invocation/)
    assert.doesNotMatch(await compaction(f.hooks, f.sessionID), /Target lifecycle: OWNER_RECONCILIATION/)
  }
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "premature-reconcile", reconciliationCommand(written.path, f.observed, base, f.target)),
    /not admitted by a generic target mismatch.*clean-owner-behind-base STALE/s,
  )

  const assessment = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", assessment)
  await after(f.hooks, f.sessionID, "assessment", assessment, await assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target, observed: f.observed }))
  assert.match(await compaction(f.hooks, f.sessionID), /Target lifecycle: OWNER_RECONCILIATION/)

  for (const [index, command] of [
    `${RECONCILIATION_RUNNER} \\ \n --spec ${written.path} --expected-old-sha ${f.observed} --expected-base-sha ${base} --expected-target-sha ${f.target}`,
    `${RECONCILIATION_RUNNER} --spec ${written.path} --expected-old-sha ${f.observed} --expected-base-sha ${base} --expected-target-sha ${f.target}\n`,
  ].entries()) {
    await assert.rejects(() => before(f.hooks, f.sessionID, `malformed-reconcile-${index}`, { command }), /one bare invocation/)
    assert.match(await compaction(f.hooks, f.sessionID), /Target lifecycle: OWNER_RECONCILIATION/)
  }

  const exactReconciliation = reconciliationCommand(written.path, f.observed, base, f.target)
  await before(f.hooks, f.sessionID, "exact-reconcile", exactReconciliation)
  await after(f.hooks, f.sessionID, "exact-reconcile", exactReconciliation, reconciliationOutput({ assessmentID, specSha256: written.sha256, oldSha: f.observed, base, target: f.target }))
  assert.match(await compaction(f.hooks, f.sessionID), /Authority: unbound/)
})

test("cross-target assessment spec is rejected before execution", async (t) => {
  const f = await mismatchedGuard(t, "cross-target")
  const written = await writeSpec(makeSpec({ assessmentID: `cross-${Math.random().toString(16).slice(2, 8)}`, base: "b".repeat(40), target: "e".repeat(40) }))
  await assert.rejects(() => before(f.hooks, f.sessionID, "assessment", assessmentCommand(written.path)), /does not match persisted exact-head target/)
  assert.match(await compaction(f.hooks, f.sessionID), new RegExp(`Authority: ${f.target}`))
})

test("generic target mismatch cannot invoke owner reconciliation before authenticated owner-base STALE", async (t) => {
  const f = await mismatchedGuard(t, "pre-stale")
  const base = "b".repeat(40)
  const written = await writeSpec(makeSpec({ assessmentID: `pre-stale-${Math.random().toString(16).slice(2, 8)}`, base, target: f.target }))
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "reconcile", reconciliationCommand(written.path, f.observed, base, f.target)),
    /not admitted by a generic target mismatch.*clean-owner-behind-base STALE/s,
  )
  assert.match(await compaction(f.hooks, f.sessionID), new RegExp(`Authority: ${f.target}`))
})

test("real gateway result schema admits owner-base STALE from authenticated summary without pre-seeded core observedHead", async (t) => {
  const f = await mismatchedGuard(t, "real-schema-no-core-head", { proveObserved: false })
  const base = "b".repeat(40)
  const assessmentID = `real-schema-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  const command = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", command)
  const stale = await after(f.hooks, f.sessionID, "assessment", command, await realWrapperAssessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target, observed: f.observed }))
  assert.match(stale.output, /ASSESSMENT_TERMINAL -> OWNER_RECONCILIATION/)
  assert.match(stale.output, new RegExp(`OPERATIONAL_TARGET_RECONCILIATION: admitted; target=${f.target}; base=${base}; owner=${f.observed}`))
  const continuity = await compaction(f.hooks, f.sessionID)
  assert.match(continuity, new RegExp(`Target lifecycle: OWNER_RECONCILIATION; target=${f.target}; base_ref=main; base=${base}; owner=${f.observed}`))
})

test("input-spec schema in a public assessment result marker is rejected as unauthenticated terminal evidence", async (t) => {
  const f = await mismatchedGuard(t, "old-marker-schema")
  const base = "b".repeat(40)
  const assessmentID = `old-marker-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  const command = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", command)
  const stale = await after(f.hooks, f.sessionID, "assessment", command, await assessmentOutput({
    assessmentID,
    specSha256: written.sha256,
    base,
    target: f.target,
    observed: f.observed,
    markerSchema: "opencode-local-assessment-v1",
  }))
  assert.match(stale.output, /REJECTED unauthenticated assessment terminal evidence/)
  assert.doesNotMatch(stale.output, /OPERATIONAL_TARGET_RECONCILIATION: admitted/)
})

test("summary owner identity must agree with a separately proven core observedHead when one exists", async (t) => {
  const f = await mismatchedGuard(t, "core-head-cross-check")
  const base = "b".repeat(40)
  const summaryOwner = "c".repeat(40)
  const assessmentID = `owner-cross-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  const command = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", command)
  const stale = await after(f.hooks, f.sessionID, "assessment", command, await assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target, observed: summaryOwner }))
  assert.match(stale.output, /ASSESSMENT_TERMINAL -> TARGET_BOUND; result=STALE; reconciliation=not-admitted/)
  assert.doesNotMatch(stale.output, /OPERATIONAL_TARGET_RECONCILIATION: admitted/)
})

test("missing or changed owner-final identity prevents a STALE terminal from minting reconciliation authority", async (t) => {
  const cases = [
    ["missing", undefined],
    ["head", { head: "c".repeat(40), branch: "main", status: "" }],
    ["branch", { head: "a".repeat(40), branch: "other", status: "" }],
    ["dirty", { head: "a".repeat(40), branch: "main", status: " M changed.txt" }],
  ]
  for (const [name, ownerFinal] of cases) {
    const f = await mismatchedGuard(t, `owner-final-${name}`)
    const base = "b".repeat(40)
    const assessmentID = `owner-final-${name}-${Math.random().toString(16).slice(2, 8)}`
    const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
    const command = assessmentCommand(written.path)
    await before(f.hooks, f.sessionID, "assessment", command)
    const stale = await after(f.hooks, f.sessionID, "assessment", command, await assessmentOutput({
      assessmentID,
      specSha256: written.sha256,
      base,
      target: f.target,
      observed: f.observed,
      summaryOverrides: { owner_final: ownerFinal },
    }))
    assert.match(stale.output, /ASSESSMENT_TERMINAL -> TARGET_BOUND; result=STALE; reconciliation=not-admitted/, name)
    assert.doesNotMatch(stale.output, /OPERATIONAL_TARGET_RECONCILIATION: admitted/, name)
  }
})

test("same-SHA strict-start declaration cannot escape persisted target owner-reconciliation lifecycle", async (t) => {
  const f = await mismatchedGuard(t, "same-sha-strict-keeps-lifecycle")
  const base = "b".repeat(40)
  const assessmentID = `same-sha-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  const assessment = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", assessment)
  await after(f.hooks, f.sessionID, "assessment", assessment, await assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target, observed: f.observed }))
  assert.match(await compaction(f.hooks, f.sessionID), /Target lifecycle: OWNER_RECONCILIATION/)

  await message(f.hooks, f.sessionID, `REQUIRED STARTING HEAD SHA: ${f.target}`)
  const continuity = await compaction(f.hooks, f.sessionID)
  assert.match(continuity, new RegExp(`Authority: ${f.target}`))
  assert.match(continuity, /mode: target/)
  assert.match(continuity, /Target lifecycle: OWNER_RECONCILIATION/)
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "reconcile", reconciliationCommand(written.path, f.observed, base, f.target)))
})

test("explicit strict-start authority declaration supersedes an incompatible persisted owner-reconciliation lifecycle", async (t) => {
  const f = await mismatchedGuard(t, "explicit-strict-supersedes-lifecycle")
  const base = "b".repeat(40)
  const assessmentID = `supersede-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  const assessment = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", assessment)
  await after(f.hooks, f.sessionID, "assessment", assessment, await assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target, observed: f.observed }))
  assert.match(await compaction(f.hooks, f.sessionID), /Target lifecycle: OWNER_RECONCILIATION/)

  const next = "e".repeat(40)
  await message(f.hooks, f.sessionID, `REQUIRED STARTING HEAD SHA: ${next}`)
  const continuity = await compaction(f.hooks, f.sessionID)
  assert.match(continuity, new RegExp(`Authority: ${next}`))
  assert.match(continuity, /mode: strict-start/)
  assert.doesNotMatch(continuity, /Target lifecycle: OWNER_RECONCILIATION/)
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "stale-reconcile", reconciliationCommand(written.path, f.observed, base, f.target)),
    /available only for exact-head target authority|requires a persisted exact-head target authority/,
  )
})

test("authority away-and-back invalidates an in-flight assessment admission from the prior epoch", async (t) => {
  const f = await mismatchedGuard(t, "assessment-epoch-reuse")
  const base = "b".repeat(40)
  const assessmentID = `assessment-epoch-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  const assessment = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "old-assessment", assessment)

  const alternate = "e".repeat(40)
  await message(f.hooks, f.sessionID, `REQUIRED STARTING HEAD SHA: ${alternate}`)
  await message(f.hooks, f.sessionID, `REQUIRED EXACT HEAD: ${f.target}`)

  const stale = await after(f.hooks, f.sessionID, "old-assessment", assessment, await assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target, observed: f.observed }))
  assert.match(stale.output, /REJECTED assessment terminal without matching admitted before-state/)
  const continuity = await compaction(f.hooks, f.sessionID)
  assert.match(continuity, new RegExp(`Authority: ${f.target}`))
  assert.match(continuity, /mode: target/)
  assert.doesNotMatch(continuity, /Target lifecycle: OWNER_RECONCILIATION/)
})

test("authority away-and-back invalidates an old reconciliation admission even if the same lifecycle identity is recreated", async (t) => {
  const f = await mismatchedGuard(t, "reconciliation-epoch-reuse")
  const base = "b".repeat(40)
  const assessmentID = `reconciliation-epoch-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  const assessment = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment-old", assessment)
  await after(f.hooks, f.sessionID, "assessment-old", assessment, await assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target, observed: f.observed }))
  const reconciliation = reconciliationCommand(written.path, f.observed, base, f.target)
  await before(f.hooks, f.sessionID, "reconcile-old", reconciliation)

  const alternate = "e".repeat(40)
  await message(f.hooks, f.sessionID, `REQUIRED STARTING HEAD SHA: ${alternate}`)
  await message(f.hooks, f.sessionID, `REQUIRED EXACT HEAD: ${f.target}`)

  await before(f.hooks, f.sessionID, "assessment-new", assessment)
  await after(f.hooks, f.sessionID, "assessment-new", assessment, await assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target, observed: f.observed }))
  assert.match(await compaction(f.hooks, f.sessionID), /Target lifecycle: OWNER_RECONCILIATION/)

  const staleReconciliation = await after(f.hooks, f.sessionID, "reconcile-old", reconciliation, reconciliationOutput({ assessmentID, specSha256: written.sha256, oldSha: f.observed, base, target: f.target }))
  assert.match(staleReconciliation.output, /REJECTED reconciliation result without matching admitted before-state/)
  const continuity = await compaction(f.hooks, f.sessionID)
  assert.match(continuity, new RegExp(`Authority: ${f.target}`))
  assert.match(continuity, /Target lifecycle: OWNER_RECONCILIATION/)

  const exactReconciliation = reconciliationCommand(written.path, f.observed, base, f.target)
  await before(f.hooks, f.sessionID, "reconcile-new", exactReconciliation)
  const reconciled = await after(f.hooks, f.sessionID, "reconcile-new", exactReconciliation, reconciliationOutput({ assessmentID, specSha256: written.sha256, oldSha: f.observed, base, target: f.target }))
  assert.match(reconciled.output, /OWNER_RECONCILIATION -> TARGET_RELEASED/)
})

test("authenticated owner-base STALE persists exact reconciliation identity across plugin restart and blocks alternate HEAD movement", async (t) => {
  const f = await mismatchedGuard(t, "stale-restart")
  const base = "b".repeat(40)
  const assessmentID = `stale-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  const command = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", command)
  const stale = await after(f.hooks, f.sessionID, "assessment", command, await assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target, observed: f.observed }))
  assert.match(stale.output, /ASSESSMENT_TERMINAL -> OWNER_RECONCILIATION/)
  assert.match(stale.output, /OPERATIONAL_TARGET_RECONCILIATION: admitted/)
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "detach-target", { command: `git switch --detach ${f.target}` }),
    /is in OWNER_RECONCILIATION.*restricted to the exact authenticated reconcile-owner-base/m,
  )

  const restarted = createOperationGuard({ directory: f.directory, env: {}, stateDirectory: f.stateDirectory })
  await register(restarted, "session-restarted")
  const continuity = await compaction(restarted, "session-restarted")
  assert.match(continuity, new RegExp(`Authority: ${f.target}`))
  assert.match(continuity, new RegExp(`Target lifecycle: OWNER_RECONCILIATION; target=${f.target}; base_ref=main; base=${base}; owner=${f.observed}`))
  await assert.doesNotReject(() => before(restarted, "session-restarted", "reconcile", reconciliationCommand(written.path, f.observed, base, f.target)))
})

test("forged or cross-identity assessment terminal evidence never releases target or admits reconciliation", async (t) => {
  const cases = [
    ["wrong-hash", () => ({ marker: { specSha256: "f".repeat(64) } })],
    ["wrong-target", () => ({ marker: { target: "e".repeat(40) } })],
    ["wrong-id", () => ({ marker: { assessmentID: "other-assessment" } })],
    ["wrong-exit", () => ({ marker: { exit: 0 } })],
    ["wrong-summary-hash", () => ({ summaryOverrides: { spec_sha256: "f".repeat(64) } })],
  ]
  for (const [name, mutate] of cases) {
    const f = await mismatchedGuard(t, `forged-${name}`)
    const base = "b".repeat(40)
    const assessmentID = `forge-${name}-${Math.random().toString(16).slice(2, 6)}`.slice(0, 47)
    const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
    const command = assessmentCommand(written.path)
    await before(f.hooks, f.sessionID, `assessment-${name}`, command)
    const mutation = mutate()
    const marker = mutation.marker ?? {}
    const result = await after(f.hooks, f.sessionID, `assessment-${name}`, command, await assessmentOutput({
      assessmentID: marker.assessmentID ?? assessmentID,
      specSha256: marker.specSha256 ?? written.sha256,
      base,
      target: marker.target ?? f.target,
      observed: f.observed,
      exit: marker.exit ?? 3,
      summaryOverrides: mutation.summaryOverrides ?? {},
    }))
    assert.match(result.output, /REJECTED unauthenticated assessment terminal evidence/)
    assert.doesNotMatch(result.output, /ASSESSMENT_TERMINAL -> OWNER_RECONCILIATION/)
    assert.match(await compaction(f.hooks, f.sessionID), new RegExp(`Authority: ${f.target}`))
    await assert.rejects(
      () => before(f.hooks, f.sessionID, `reconcile-${name}`, reconciliationCommand(written.path, f.observed, base, f.target)),
      /not admitted by a generic target mismatch.*clean-owner-behind-base STALE/s,
    )
  }
})

test("missing terminal evidence remains fail-closed and does not admit reconciliation", async (t) => {
  const f = await mismatchedGuard(t, "interrupted")
  const base = "b".repeat(40)
  const assessmentID = `interrupt-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  const command = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", command)
  const result = await after(f.hooks, f.sessionID, "assessment", command, { output: "dispatcher interrupted before typed evidence", metadata: { exit: 2 } })
  assert.match(result.output, /REJECTED unauthenticated assessment terminal evidence/)
  assert.match(await compaction(f.hooks, f.sessionID), new RegExp(`Authority: ${f.target}`))
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "reconcile", reconciliationCommand(written.path, f.observed, base, f.target)),
    /not admitted by a generic target mismatch.*clean-owner-behind-base STALE/s,
  )
})

test("remote-authority and non-base STALE results remain target-bound without minting owner reconciliation authority", async (t) => {
  for (const name of ["remote-stale", "head-authority"]) {
    const f = await mismatchedGuard(t, `nonrecon-${name}`)
    const base = "b".repeat(40)
    const assessmentID = `nonrecon-${name}-${Math.random().toString(16).slice(2, 6)}`.slice(0, 47)
    const execution = "repository-owned"
    const authority = name === "head-authority" ? "head" : "base"
    const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target, execution, authority }))
    const command = assessmentCommand(written.path)
    await before(f.hooks, f.sessionID, "assessment", command)
    const overrides = name === "remote-stale"
      ? { observed_base_sha: undefined, observed_head_sha: undefined, error: `repo-pr-assessment: remote authority mismatch (base=${"c".repeat(40)}; head=${f.target})` }
      : {}
    const stale = await after(f.hooks, f.sessionID, "assessment", command, await assessmentOutput({
      assessmentID,
      specSha256: written.sha256,
      base,
      target: f.target,
      observed: f.observed,
      execution,
      authority,
      summaryOverrides: overrides,
    }))
    assert.match(stale.output, /ASSESSMENT_TERMINAL -> TARGET_BOUND; result=STALE; reconciliation=not-admitted/)
    assert.doesNotMatch(stale.output, /ASSESSMENT_TERMINAL -> OWNER_RECONCILIATION/)
    assert.doesNotMatch(stale.output, /OPERATIONAL_TARGET_RECONCILIATION: admitted/)
    const continuity = await compaction(f.hooks, f.sessionID)
    assert.match(continuity, new RegExp(`Authority: ${f.target}`))
    assert.doesNotMatch(continuity, /Target lifecycle: OWNER_RECONCILIATION/)
    await assert.doesNotReject(() => before(f.hooks, f.sessionID, "assessment-again", command))
  }
})

test("divergent clean-owner STALE remains target-bound and permits corrected same-target reassessment", async (t) => {
  const f = await mismatchedGuard(t, "divergent-owner-stale", { proveObserved: false })
  const base = "b".repeat(40)
  const assessmentID = `divergent-owner-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  const command = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", command)
  const stale = await after(f.hooks, f.sessionID, "assessment", command, await assessmentOutput({
    assessmentID,
    specSha256: written.sha256,
    base,
    target: f.target,
    observed: f.observed,
    summaryOverrides: {
      error: `repo-pr-assessment: repository-owned owner checkout ${f.observed} is not an ancestor of pinned base authority ${base}`,
    },
  }))
  assert.match(stale.output, /ASSESSMENT_TERMINAL -> TARGET_BOUND; result=STALE; reconciliation=not-admitted/)
  assert.doesNotMatch(stale.output, /OPERATIONAL_TARGET_RECONCILIATION: admitted/)
  const continuity = await compaction(f.hooks, f.sessionID)
  assert.match(continuity, new RegExp(`Authority: ${f.target}`))
  assert.doesNotMatch(continuity, /Target lifecycle: OWNER_RECONCILIATION/)
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "assessment-again", command))
})

test("reconciliation release requires exact stale spec hash and old/base/target/branch result identity", async (t) => {
  const mutations = [
    ["hash", (value) => ({ ...value, specSha256: "f".repeat(64) })],
    ["old", (value) => ({ ...value, oldSha: "c".repeat(40) })],
    ["base", (value) => ({ ...value, base: "c".repeat(40) })],
    ["target", (value) => ({ ...value, target: "e".repeat(40) })],
    ["branch", (value) => ({ ...value, branch: "other" })],
  ]
  for (const [name, mutate] of mutations) {
    const f = await mismatchedGuard(t, `recon-forge-${name}`)
    const base = "b".repeat(40)
    const assessmentID = `recon-${name}-${Math.random().toString(16).slice(2, 6)}`
    const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
    const assessment = assessmentCommand(written.path)
    await before(f.hooks, f.sessionID, "assessment", assessment)
    await after(f.hooks, f.sessionID, "assessment", assessment, await assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target, observed: f.observed }))

    const reconciliation = reconciliationCommand(written.path, f.observed, base, f.target)
    await before(f.hooks, f.sessionID, "reconcile", reconciliation)
    const forged = mutate({ assessmentID, specSha256: written.sha256, oldSha: f.observed, base, target: f.target, branch: "main" })
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
  const assessment = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", assessment)
  await after(f.hooks, f.sessionID, "assessment", assessment, await assessmentOutput({ assessmentID, specSha256: written.sha256, base, target: f.target, observed: f.observed }))

  const reconciliation = reconciliationCommand(written.path, f.observed, base, f.target)
  await before(f.hooks, f.sessionID, "reconcile", reconciliation)
  const result = await after(f.hooks, f.sessionID, "reconcile", reconciliation, reconciliationOutput({ assessmentID, specSha256: written.sha256, oldSha: f.observed, base, target: f.target }))
  assert.match(result.output, /OWNER_RECONCILIATION -> TARGET_RELEASED/)
  const continuity = await compaction(f.hooks, f.sessionID)
  assert.match(continuity, /Authority: unbound/)
  assert.doesNotMatch(continuity, /Target lifecycle: OWNER_RECONCILIATION/)
})

test("authenticated non-STALE terminal summary releases only its exact target", async (t) => {
  const f = await mismatchedGuard(t, "terminal-pass")
  const base = "b".repeat(40)
  const assessmentID = `terminal-${Math.random().toString(16).slice(2, 8)}`
  const written = await writeSpec(makeSpec({ assessmentID, base, target: f.target }))
  const assessment = assessmentCommand(written.path)
  await before(f.hooks, f.sessionID, "assessment", assessment)
  const result = await after(f.hooks, f.sessionID, "assessment", assessment, await assessmentOutput({
    assessmentID,
    specSha256: written.sha256,
    base,
    target: f.target,
    observed: f.observed,
    result: "FAIL",
    exit: 1,
    summaryOverrides: { error: "repo-pr-assessment: runner plan failed" },
  }))
  assert.match(result.output, /ASSESSMENT_TERMINAL -> TARGET_RELEASED; result=FAIL/)
  assert.match(await compaction(f.hooks, f.sessionID), /Authority: unbound/)
})

test("verified target still rejects malformed compound HEAD proofs and routes Firecrawl recovery", async (t) => {
  const f = await repositoryGuard(t, "verified-compound")
  await message(f.hooks, f.sessionID, `REQUIRED EXACT HEAD: ${f.target}`)
  const initialProof = { command: "git rev-parse HEAD" }
  await before(f.hooks, f.sessionID, "initial-proof", initialProof)
  const verified = await after(f.hooks, f.sessionID, "initial-proof", initialProof, { output: `${f.target}\n`, metadata: { exit: 0 } })
  assert.match(verified.output, /OPERATIONAL_AUTHORITY: verified/)

  const beforeDuplicate = await persistedSafety(f.stateDirectory, f.directory)
  await message(f.hooks, f.sessionID, `REQUIRED EXACT HEAD: ${f.target}`)
  const afterDuplicate = await persistedSafety(f.stateDirectory, f.directory)
  assert.equal(afterDuplicate.authorityEpoch, beforeDuplicate.authorityEpoch)
  assert.equal(afterDuplicate.authorityStatus, "verified")
  const notice = await authorityNotice(f.hooks, f.sessionID)
  assert.match(notice, new RegExp(`exact-head target ${f.target} remains verified`))
  assert.doesNotMatch(notice, /is pending/)

  const rejectedWorktree = join(f.root, "rejected-worktree")
  const compoundSetup = { command: `git worktree add --detach ${rejectedWorktree} ${f.target} && git rev-parse HEAD` }
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "compound-setup", compoundSetup),
    (error) => {
      assert.match(error.message, /OPERATIONAL_CORRECTION: SPLIT_TARGET_ADMISSION/)
      assert.match(error.message, /OPERATIONAL_RESOURCE: kind=command-shape; repository=fvanevski\/firecrawl_skill; correction=SPLIT_TARGET_ADMISSION;/)
      assert.match(error.message, /section=exact-target-disposable-worktree/)
      return true
    },
  )
  await assert.rejects(() => access(rejectedWorktree), { code: "ENOENT" })
  assert.doesNotMatch(git(f.directory, ["worktree", "list", "--porcelain"]), new RegExp(rejectedWorktree.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))

  await assert.rejects(
    () => before(f.hooks, f.sessionID, "compound-cd", { command: `cd ${f.directory} && git rev-parse HEAD` }),
    /OPERATIONAL_CORRECTION: SET_WORKDIR_AND_PROVE_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "compound-pipe", { command: "git rev-parse HEAD | cat" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )

  const staleProof = { command: "git rev-parse HEAD" }
  await before(f.hooks, f.sessionID, "stale-proof", staleProof)
  const stale = await after(f.hooks, f.sessionID, "stale-proof", staleProof, { output: `${f.target}\n`, metadata: { exit: 0 } })
  assert.match(stale.output, /OPERATIONAL_AUTHORITY_PROOF: STALE/)
  assert.match(stale.output, /current_status=verified/)
  assert.equal((await persistedSafety(f.stateDirectory, f.directory)).authorityStatus, "verified")

  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "ordinary-read", { command: "git status --short" }))
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "ancestor-read", { command: "git rev-parse HEAD~1" }))
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "log-search", { command: "git log -S'git rev-parse HEAD' --oneline -1" }))
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "text-search", { command: "rg 'git rev-parse HEAD' ." }))
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "quoted-substitution-search", { command: "rg '$(git rev-parse HEAD)' ." }))
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "quoted-process-substitution-search", { command: "rg '<(git rev-parse HEAD)' ." }))
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "executable-substitution", { command: "printf '%s\\n' $(git rev-parse HEAD)" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "process-substitution", { command: "cat <(git rev-parse HEAD)" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "subshell-proof", { command: "(git rev-parse HEAD)" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "group-proof", { command: "{ git rev-parse HEAD; }" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "if-proof", { command: "if git rev-parse HEAD; then true; fi" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "shell-wrapper-proof", { command: "sh -c 'git rev-parse HEAD'" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "env-wrapper-proof", { command: "env -i git rev-parse HEAD" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "env-split-wrapper-proof", { command: "env -S 'git rev-parse HEAD'" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "command-wrapper-proof", { command: "command -p git rev-parse HEAD" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "exec-wrapper-proof", { command: "exec -a guard-proof /usr/bin/git rev-parse HEAD" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "absolute-git-proof", { command: "/usr/bin/git rev-parse HEAD" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "git-c-proof", { command: `git -C ${f.directory} rev-parse HEAD` }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "wrapped-git-c-proof", { command: `command -p /usr/bin/git -C ${f.directory} rev-parse HEAD` }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  const wrappedOtherHead = f.target === "f".repeat(40) ? "e".repeat(40) : "f".repeat(40)
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "shell-wrapper-checkout-proof", { command: `sh -c 'git switch --detach ${wrappedOtherHead} && git rev-parse HEAD'` }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "absolute-shell-wrapper-checkout-proof", { command: `sh -c '/usr/bin/git switch --detach ${wrappedOtherHead} && /usr/bin/git rev-parse HEAD'` }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "eval-proof", { command: "eval 'git rev-parse HEAD'" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "literal-proof-argument", { command: "printf '%s\\n' 'git rev-parse HEAD'" }))
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "wrapped-literal-proof-argument", { command: "env -i printf '%s\\n' 'git rev-parse HEAD'" }))
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "array-literal", { command: "proof_words=(git rev-parse HEAD)" }))
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "brace-arguments", { command: "printf '%s\\n' { git rev-parse HEAD }" }))
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "quoted-heredoc", { command: "cat <<'EOF'\ngit rev-parse HEAD\n$(git rev-parse HEAD)\nEOF" }))
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "commented-substitution", { command: "printf '%s\\n' ok # $(git rev-parse HEAD)" }))
  await assert.doesNotReject(() => before(f.hooks, f.sessionID, "commented-proof-text", { command: "printf '%s\\n' ok # git rev-parse HEAD; git rev-parse HEAD" }))
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "expandable-heredoc-substitution", { command: "cat <<EOF\n$(git rev-parse HEAD)\nEOF" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "proof-after-comment-line", { command: "printf '%s\\n' ok # comment\ngit rev-parse HEAD" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "fake-comment-heredoc", { command: "printf '%s\\n' ok # <<'EOF'\n$(git rev-parse HEAD)\nEOF" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
})

test("duplicate same-target declarations preserve truthful pending and mismatch state without epoch churn", async (t) => {
  const pending = await repositoryGuard(t, "duplicate-pending")
  await message(pending.hooks, pending.sessionID, `REQUIRED EXACT HEAD: ${pending.target}`)
  const pendingBefore = await persistedSafety(pending.stateDirectory, pending.directory)
  await message(pending.hooks, pending.sessionID, `REQUIRED EXACT HEAD: ${pending.target}`)
  const pendingAfter = await persistedSafety(pending.stateDirectory, pending.directory)
  assert.equal(pendingAfter.authorityEpoch, pendingBefore.authorityEpoch)
  assert.equal(pendingAfter.authorityStatus, "pending")
  const pendingNotice = await authorityNotice(pending.hooks, pending.sessionID)
  assert.match(pendingNotice, /is pending/)
  assert.doesNotMatch(pendingNotice, /remains (?:verified|mismatched)/)
  await assert.rejects(
    () => before(pending.hooks, pending.sessionID, "pending-compound", { command: `git worktree add --detach ${join(pending.root, "pending-worktree")} ${pending.target} && git rev-parse HEAD` }),
    /OPERATIONAL_CORRECTION: SPLIT_TARGET_ADMISSION/,
  )
  await assert.rejects(
    () => before(pending.hooks, pending.sessionID, "pending-env-proof", { command: "env -i git rev-parse HEAD" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )

  const mismatch = await repositoryGuard(t, "duplicate-mismatch")
  const boundTarget = mismatch.target === "f".repeat(40) ? "e".repeat(40) : "f".repeat(40)
  await message(mismatch.hooks, mismatch.sessionID, `REQUIRED EXACT HEAD: ${boundTarget}`)
  const mismatchProof = { command: "git rev-parse HEAD" }
  await before(mismatch.hooks, mismatch.sessionID, "mismatch-proof", mismatchProof)
  const mismatchResult = await after(mismatch.hooks, mismatch.sessionID, "mismatch-proof", mismatchProof, { output: `${mismatch.target}\n`, metadata: { exit: 0 } })
  assert.match(mismatchResult.output, /OPERATIONAL_AUTHORITY: mismatch/)
  const mismatchBefore = await persistedSafety(mismatch.stateDirectory, mismatch.directory)
  await message(mismatch.hooks, mismatch.sessionID, `REQUIRED EXACT HEAD: ${boundTarget}`)
  const mismatchAfter = await persistedSafety(mismatch.stateDirectory, mismatch.directory)
  assert.equal(mismatchAfter.authorityEpoch, mismatchBefore.authorityEpoch)
  assert.equal(mismatchAfter.authorityStatus, "mismatch")
  const mismatchNotice = await authorityNotice(mismatch.hooks, mismatch.sessionID)
  assert.match(mismatchNotice, new RegExp(`exact-head target ${boundTarget} remains mismatched`))
  assert.doesNotMatch(mismatchNotice, /is pending|remains verified/)
  await assert.rejects(
    () => before(mismatch.hooks, mismatch.sessionID, "mismatch-compound", { command: `git worktree add --detach ${join(mismatch.root, "mismatch-worktree")} ${boundTarget} && git rev-parse HEAD` }),
    /OPERATIONAL_CORRECTION: SPLIT_TARGET_ADMISSION/,
  )
  await assert.rejects(
    () => before(mismatch.hooks, mismatch.sessionID, "mismatch-command-proof", { command: "command -p /usr/bin/git rev-parse HEAD" }),
    /OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD/,
  )
})

test("verified strict-start authority also keeps one-bare-command HEAD proof enforcement", async (t) => {
  const f = await repositoryGuard(t, "strict-start-compound")
  await message(f.hooks, f.sessionID, `REQUIRED STARTING HEAD: ${f.target}`)
  const initialProof = { command: "git rev-parse HEAD" }
  await before(f.hooks, f.sessionID, "strict-proof", initialProof)
  const verified = await after(f.hooks, f.sessionID, "strict-proof", initialProof, { output: `${f.target}\n`, metadata: { exit: 0 } })
  assert.match(verified.output, /OPERATIONAL_AUTHORITY: verified/)
  await assert.rejects(
    () => before(f.hooks, f.sessionID, "strict-compound", { command: `cd ${f.directory} && git rev-parse HEAD` }),
    /OPERATIONAL_CORRECTION: SET_WORKDIR_AND_PROVE_HEAD/,
  )
  const staleProof = { command: "git rev-parse HEAD" }
  await before(f.hooks, f.sessionID, "strict-stale", staleProof)
  const stale = await after(f.hooks, f.sessionID, "strict-stale", staleProof, { output: `${f.target}\n`, metadata: { exit: 0 } })
  assert.match(stale.output, /OPERATIONAL_AUTHORITY_PROOF: STALE/)
  assert.match(stale.output, /current_status=verified/)
})
