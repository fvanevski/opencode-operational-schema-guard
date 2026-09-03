import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { assessmentSummarySha256, assessmentTerminalOutput, parseAssessmentArgs } from "../scripts/local-agent-assessment.mjs"
import { ASSESSMENT_RESULT_SCHEMA, LOCAL_ASSESSMENT_SCHEMA, loadAssessmentSpec, parseRepoPrAssessmentSpec } from "../lib/repo-pr-assessment.mjs"

const ROOT = "/tmp/opencode/verify/assessments"

function spec() {
  return {
    schema_version: LOCAL_ASSESSMENT_SCHEMA,
    kind: "repo-pr",
    assessment_id: "pr20-remediation",
    pr_number: 20,
    repository: {
      remote: "origin",
      base_ref: "main",
      base_sha: "a".repeat(40),
      head_ref: "issue/phase5",
      head_sha: "b".repeat(40),
    },
    environment: { venv: "/workspace/project/.venv" },
    runner: {
      path: ".github/ci/assessment.py",
      plan_argv: ["plan", "pr", "--base-sha", "{base_sha}", "--expected-head-sha", "{head_sha}", "--pr-number", "{pr_number}", "--venv", "{venv}"],
      run_argv: ["run", "pr", "--base-sha", "{base_sha}", "--expected-head-sha", "{head_sha}", "--pr-number", "{pr_number}", "--venv", "{venv}", "--output", "{evidence_path}"],
    },
    integrity_files: [".python-version", ".github/ci/toolchain.txt", "uv.lock"],
  }
}

test("local assessment entrypoint accepts only one concrete typed-spec path", () => {
  assert.deepEqual(parseAssessmentArgs(["--spec", `${ROOT}/pr20.json`]), { specPath: `${ROOT}/pr20.json` })
  for (const argv of [
    ["--spec", `${ROOT}/*.json`],
    ["--spec", `${ROOT}/../escape.json`],
    ["--spec", `${ROOT}/pr20.json`, "--extra"],
    ["--sha", "a".repeat(40), "--assessment-id", "legacy"],
  ]) {
    assert.throws(() => parseAssessmentArgs(argv), /usage|concrete|under/)
  }
})

test("public assessment marker hashes the exact persisted summary serialization", () => {
  const result = {
    schema_version: ASSESSMENT_RESULT_SCHEMA,
    assessment_id: "summary-hash",
    expected_base_sha: "a".repeat(40),
    expected_head_sha: "b".repeat(40),
    host_evidence_result: "STALE",
    gate_decision: "NOT_EVALUATED",
    summary_path: "/tmp/opencode/verify/evidence/summary-hash.summary.json",
    exit_code: 3,
  }
  const { summary_path: _summaryPath, exit_code: _exitCode, ...summary } = result
  const expected = createHash("sha256").update(`${JSON.stringify(summary, null, 2)}\n`).digest("hex")
  assert.equal(result.schema_version, ASSESSMENT_RESULT_SCHEMA)
  assert.equal(assessmentSummarySha256(result), expected)
  assert.equal(assessmentSummarySha256({ ...result, summary_path: null }), null)
  assert.equal(
    assessmentTerminalOutput(result, "c".repeat(64)),
    `OPERATIONAL_ASSESSMENT: schema=${ASSESSMENT_RESULT_SCHEMA}; assessment_id=summary-hash; spec_sha256=${"c".repeat(64)}; base_sha=${"a".repeat(40)}; target_sha=${"b".repeat(40)}; summary_sha256=${expected}; summary=/tmp/opencode/verify/evidence/summary-hash.summary.json\nHOST_EVIDENCE_RESULT=STALE\nGATE_DECISION=NOT_EVALUATED\n`,
  )
})

test("repo-pr assessment schema is project-neutral and authority-bound", () => {
  const parsed = parseRepoPrAssessmentSpec(spec())
  assert.equal(parsed.kind, "repo-pr")
  assert.equal(parsed.repository.headRef, "issue/phase5")
  assert.equal(parsed.runner.path, ".github/ci/assessment.py")
  assert.deepEqual(parsed.integrityFiles, [
    { path: ".python-version", expectedBlobSha: undefined, expectedSha256: undefined },
    { path: ".github/ci/toolchain.txt", expectedBlobSha: undefined, expectedSha256: undefined },
    { path: "uv.lock", expectedBlobSha: undefined, expectedSha256: undefined },
  ])

  const missingHead = spec()
  missingHead.runner.run_argv = missingHead.runner.run_argv.filter((arg) => arg !== "{head_sha}")
  assert.throws(() => parseRepoPrAssessmentSpec(missingHead), /must bind \{head_sha\}/)

  const arbitraryRoot = spec()
  arbitraryRoot.runner.path = "/tmp/runner"
  assert.throws(() => parseRepoPrAssessmentSpec(arbitraryRoot), /repository-relative/)

  const sideEffectPlan = spec()
  sideEffectPlan.runner.plan_argv.push("{evidence_path}")
  assert.throws(() => parseRepoPrAssessmentSpec(sideEffectPlan), /must not bind \{evidence_path\}/)

  const fullBaseRef = spec()
  fullBaseRef.repository.base_ref = "refs/heads/main"
  assert.throws(() => parseRepoPrAssessmentSpec(fullBaseRef), /base_ref must be a branch name/)

  const wrongCanonicalPrRef = spec()
  wrongCanonicalPrRef.repository.head_ref = "refs/pull/21/head"
  assert.throws(() => parseRepoPrAssessmentSpec(wrongCanonicalPrRef), /canonical refs\/pull\/20\/head/)
})


test("assessment spec loader rejects symlinked specs before parsing", async () => {
  const root = await mkdtemp(join(tmpdir(), "opencode-assessment-spec-"))
  const specs = join(root, "assessments")
  await mkdir(specs)
  const target = join(root, "target.json")
  await writeFile(target, JSON.stringify(spec()))
  const link = join(specs, "linked.json")
  await symlink(target, link)
  await assert.rejects(() => loadAssessmentSpec(link, specs), /non-symlink/)
})
