import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test, { after as afterAll } from "node:test"
import { createOperationGuard } from "../lib/operation-guard.mjs"
import { ASSESSMENT_RESULT_SCHEMA } from "../lib/repo-pr-assessment.mjs"

const ASSESSMENT_ROOT = "/tmp/opencode/verify/assessments"
const EVIDENCE_ROOT = "/tmp/opencode/verify/evidence"
const ASSESSMENT_RUNNER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs"
const RECONCILIATION_RUNNER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/reconcile-owner-base.mjs"
const generated = new Set()

afterAll(async () => {
  await Promise.all([...generated].map((path) => rm(path, { force: true })))
})

async function message(hooks, sessionID, text) {
  await hooks["chat.message"]({ sessionID, agent: "build" }, { message: {}, parts: [{ type: "text", text }] })
}

async function before(hooks, sessionID, callID, args) {
  const output = { args }
  await hooks["tool.execute.before"]({ sessionID, callID, tool: "bash" }, output)
}

async function after(hooks, sessionID, callID, args, result) {
  const output = { title: "", output: "", metadata: {}, ...result }
  await hooks["tool.execute.after"]({ sessionID, callID, tool: "bash", args }, output)
  return output
}

async function compaction(hooks, sessionID) {
  const output = { context: [] }
  await hooks["experimental.session.compacting"]({ sessionID }, output)
  return output.context.join("\n")
}

function assessmentCommand(path) {
  return { command: `${ASSESSMENT_RUNNER} --spec ${path}` }
}

function reconciliationCommand(path, oldSha, base, target) {
  return { command: `${RECONCILIATION_RUNNER} --spec ${path} --expected-old-sha ${oldSha} --expected-base-sha ${base} --expected-target-sha ${target}` }
}

async function fixture(t, label) {
  const target = "d".repeat(40)
  const base = "b".repeat(40)
  const observed = "a".repeat(40)
  const assessmentID = `after-${label}-${Math.random().toString(16).slice(2, 8)}`.slice(0, 47)
  const stateDirectory = await mkdtemp(join(tmpdir(), `target-after-${label}-`))
  const directory = join(stateDirectory, "workspace")
  await mkdir(directory)
  const hooks = createOperationGuard({ directory, env: {}, stateDirectory })
  const sessionID = `session-${label}`

  const spec = {
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
    runner: {
      execution: "repository-owned",
      authority: "base",
      path: "tools/repository-owned-runner.mjs",
      blob_sha: "1".repeat(40),
      result_contract: "local-agent-assessment-v1",
      plan_argv: ["plan", "--sha", "{head_sha}", "--pr", "{pr_number}", "--workspace-root", "{workspace_root}"],
      run_argv: ["run", "--assessment-id", "{assessment_id}", "--sha", "{head_sha}", "--pr", "{pr_number}", "--workspace-root", "{workspace_root}"],
    },
    integrity_files: [{ path: "control.txt", blob_sha: "2".repeat(40) }],
  }

  await mkdir(ASSESSMENT_ROOT, { recursive: true })
  const specPath = join(ASSESSMENT_ROOT, `${assessmentID}.json`)
  const specBytes = `${JSON.stringify(spec)}\n`
  await writeFile(specPath, specBytes)
  generated.add(specPath)
  const specSha256 = createHash("sha256").update(specBytes).digest("hex")

  await message(hooks, sessionID, `REQUIRED EXACT HEAD: ${target}`)
  const proof = { command: "git rev-parse HEAD" }
  await before(hooks, sessionID, "proof", proof)
  await after(hooks, sessionID, "proof", proof, { output: `${observed}\n`, metadata: { exit: 0 } })

  t.after(async () => rm(stateDirectory, { recursive: true, force: true }))
  return { hooks, sessionID, target, base, observed, assessmentID, specPath, specSha256 }
}

function summaryDocument(f, result) {
  return {
    schema_version: "opencode-repo-pr-assessment-result-v1",
    assessment_id: f.assessmentID,
    expected_base_sha: f.base,
    expected_head_sha: f.target,
    spec_sha256: f.specSha256,
    base_ref: "main",
    runner_execution: "repository-owned",
    runner_authority: "base",
    owner_initial: { head: f.observed, branch: "main", status: "" },
    owner_final: { head: f.observed, branch: "main", status: "" },
    observed_base_sha: f.base,
    observed_head_sha: f.target,
    host_evidence_result: result,
    gate_decision: "NOT_EVALUATED",
    error: result === "STALE"
      ? `repo-pr-assessment: repository-owned owner checkout is ${f.observed}, not pinned base authority ${f.base}`
      : "repo-pr-assessment: runner failed",
  }
}

async function assessmentResult(f, { result = "STALE", exit = 3 } = {}) {
  await mkdir(EVIDENCE_ROOT, { recursive: true })
  const summaryPath = join(EVIDENCE_ROOT, `${f.assessmentID}.summary.json`)
  const summary = summaryDocument(f, result)
  const summaryBytes = `${JSON.stringify(summary)}\n`
  await writeFile(summaryPath, summaryBytes)
  generated.add(summaryPath)
  const summarySha256 = createHash("sha256").update(summaryBytes).digest("hex")
  return {
    output: `OPERATIONAL_ASSESSMENT: schema=${ASSESSMENT_RESULT_SCHEMA}; assessment_id=${f.assessmentID}; spec_sha256=${f.specSha256}; base_sha=${f.base}; target_sha=${f.target}; summary_sha256=${summarySha256}; summary=${summaryPath}\nHOST_EVIDENCE_RESULT=${result}\nGATE_DECISION=NOT_EVALUATED\n`,
    metadata: { exit },
  }
}

function reconciliationResult(f) {
  return {
    output: `OPERATIONAL_OWNER_RECONCILIATION: PASS; schema=opencode-owner-base-reconciliation-v1; assessment_id=${f.assessmentID}; spec_sha256=${f.specSha256}; expected_old_sha=${f.observed}; base_sha=${f.base}; head_sha=${f.target}; branch=main\nOWNER_BASE_RECONCILIATION_RESULT=PASS\n`,
    metadata: { exit: 0 },
  }
}

test("assessment after-event without matching admitted before-state cannot release target authority", async (t) => {
  const f = await fixture(t, "assessment")
  const command = assessmentCommand(f.specPath)

  const result = await after(f.hooks, f.sessionID, "assessment-without-before", command, await assessmentResult(f, { result: "FAIL", exit: 1 }))

  assert.match(result.output, /REJECTED assessment terminal without matching admitted before-state/)
  assert.doesNotMatch(result.output, /ASSESSMENT_TERMINAL -> TARGET_RELEASED/)
  assert.doesNotMatch(result.output, /ASSESSMENT_TERMINAL -> OWNER_RECONCILIATION/)
  assert.match(await compaction(f.hooks, f.sessionID), new RegExp(`Authority: ${f.target}`))
})

test("reconciliation after-event without matching admitted before-state cannot consume lifecycle or release target", async (t) => {
  const f = await fixture(t, "reconciliation")
  const assessment = assessmentCommand(f.specPath)
  await before(f.hooks, f.sessionID, "assessment", assessment)
  const stale = await after(f.hooks, f.sessionID, "assessment", assessment, await assessmentResult(f))
  assert.match(stale.output, /OPERATIONAL_TARGET_RECONCILIATION: admitted/)

  const reconciliation = reconciliationCommand(f.specPath, f.observed, f.base, f.target)
  const result = await after(f.hooks, f.sessionID, "reconciliation-without-before", reconciliation, reconciliationResult(f))

  assert.match(result.output, /REJECTED reconciliation result without matching admitted before-state/)
  assert.doesNotMatch(result.output, /OWNER_RECONCILIATION -> TARGET_RELEASED/)
  const continuity = await compaction(f.hooks, f.sessionID)
  assert.match(continuity, new RegExp(`Authority: ${f.target}`))
  assert.match(continuity, /Target lifecycle: OWNER_RECONCILIATION/)
})

test("assessment summary pathname substitution cannot change an authenticated terminal cause", async (t) => {
  const f = await fixture(t, "summary-substitution")
  const assessment = assessmentCommand(f.specPath)
  await before(f.hooks, f.sessionID, "assessment", assessment)
  const terminal = await assessmentResult(f)

  const summaryPath = join(EVIDENCE_ROOT, `${f.assessmentID}.summary.json`)
  const substituted = {
    ...summaryDocument(f, "STALE"),
    observed_base_sha: undefined,
    observed_head_sha: undefined,
    error: `repo-pr-assessment: remote authority mismatch (base=${"c".repeat(40)}; head=${f.target})`,
  }
  await writeFile(summaryPath, `${JSON.stringify(substituted)}\n`)

  const result = await after(f.hooks, f.sessionID, "assessment", assessment, terminal)
  assert.match(result.output, /REJECTED unauthenticated assessment terminal evidence/)
  assert.doesNotMatch(result.output, /ASSESSMENT_TERMINAL -> OWNER_RECONCILIATION/)
  assert.doesNotMatch(result.output, /TARGET_RELEASED/)
  assert.match(await compaction(f.hooks, f.sessionID), new RegExp(`Authority: ${f.target}`))
})
