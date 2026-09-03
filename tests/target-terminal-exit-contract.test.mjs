import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { createOperationGuard } from "../lib/operation-guard.mjs"
import { ASSESSMENT_RESULT_SCHEMA } from "../lib/repo-pr-assessment.mjs"

const SPEC_ROOT = "/tmp/opencode/verify/assessments"
const EVIDENCE_ROOT = "/tmp/opencode/verify/evidence"
const RUNNER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs"

async function establishMismatch(hooks, sessionID, target, observed) {
  await hooks["chat.message"]({ sessionID, agent: "build" }, { message: {}, parts: [{ type: "text", text: `REQUIRED EXACT HEAD: ${target}` }] })
  const proof = { command: "git rev-parse HEAD" }
  await hooks["tool.execute.before"]({ sessionID, callID: "proof", tool: "bash" }, { args: proof })
  await hooks["tool.execute.after"]({ sessionID, callID: "proof", tool: "bash", args: proof }, { title: "", output: `${observed}\n`, metadata: { exit: 0 } })
}

async function continuity(hooks, sessionID) {
  const output = { context: [] }
  await hooks["experimental.session.compacting"]({ sessionID }, output)
  return output.context.join("\n")
}

async function runTerminalCase(t, result, exit) {
  const root = await mkdtemp(join(tmpdir(), `target-exit-${result.toLowerCase()}-`))
  const directory = join(root, "workspace")
  await mkdir(directory)
  t.after(() => rm(root, { recursive: true, force: true }))

  const target = "d".repeat(40)
  const observed = "a".repeat(40)
  const base = "b".repeat(40)
  const suffix = Math.random().toString(16).slice(2, 10)
  const assessmentID = `terminal-${result.toLowerCase()}-${suffix}`
  const specPath = join(SPEC_ROOT, `${assessmentID}.json`)
  const summaryPath = join(EVIDENCE_ROOT, `${assessmentID}.summary.json`)
  await mkdir(SPEC_ROOT, { recursive: true })
  await mkdir(EVIDENCE_ROOT, { recursive: true })
  t.after(() => rm(specPath, { force: true }))
  t.after(() => rm(summaryPath, { force: true }))

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
  const specBytes = `${JSON.stringify(spec)}\n`
  const specSha256 = createHash("sha256").update(specBytes).digest("hex")
  await writeFile(specPath, specBytes)
  const summary = {
    schema_version: ASSESSMENT_RESULT_SCHEMA,
    assessment_id: assessmentID,
    expected_base_sha: base,
    expected_head_sha: target,
    spec_sha256: specSha256,
    base_ref: "main",
    runner_execution: "repository-owned",
    runner_authority: "base",
    owner_initial: { head: observed, branch: "main", status: "" },
    host_evidence_result: result,
    gate_decision: "NOT_EVALUATED",
    error: `repo-pr-assessment: synthetic ${result}`,
  }
  const summaryBytes = `${JSON.stringify(summary)}\n`
  const summarySha256 = createHash("sha256").update(summaryBytes).digest("hex")
  await writeFile(summaryPath, summaryBytes)

  const hooks = createOperationGuard({ directory, env: {}, stateDirectory: root })
  const sessionID = `session-${result.toLowerCase()}-${suffix}`
  await establishMismatch(hooks, sessionID, target, observed)
  const args = { command: `${RUNNER} --spec ${specPath}` }
  await hooks["tool.execute.before"]({ sessionID, callID: "assessment", tool: "bash" }, { args })
  const output = {
    title: "",
    output: `OPERATIONAL_ASSESSMENT: schema=${ASSESSMENT_RESULT_SCHEMA}; assessment_id=${assessmentID}; spec_sha256=${specSha256}; base_sha=${base}; target_sha=${target}; summary_sha256=${summarySha256}; summary=${summaryPath}\nHOST_EVIDENCE_RESULT=${result}\nGATE_DECISION=NOT_EVALUATED\n`,
    metadata: { exit },
  }
  await hooks["tool.execute.after"]({ sessionID, callID: "assessment", tool: "bash", args }, output)
  assert.match(output.output, new RegExp(`ASSESSMENT_TERMINAL -> TARGET_RELEASED; result=${result}`))
  assert.match(await continuity(hooks, sessionID), /Authority: unbound/)
}

for (const [result, exit] of [
  ["PASS", 0],
  ["FAIL", 1],
  ["BLOCKED", 2],
  ["INFRA_ERROR", 2],
  ["ISOLATION_BREACH", 4],
]) {
  test(`public gateway ${result} exit ${exit} authenticates terminal target release`, async (t) => {
    await runTerminalCase(t, result, exit)
  })
}
