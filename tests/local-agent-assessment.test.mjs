import assert from "node:assert/strict"
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { parseAssessmentArgs } from "../scripts/local-agent-assessment.mjs"
import { LOCAL_ASSESSMENT_SCHEMA, loadAssessmentSpec, parseRepoPrAssessmentSpec } from "../lib/repo-pr-assessment.mjs"

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

test("repo-pr assessment schema is project-neutral and authority-bound", () => {
  const parsed = parseRepoPrAssessmentSpec(spec())
  assert.equal(parsed.kind, "repo-pr")
  assert.equal(parsed.repository.headRef, "issue/phase5")
  assert.equal(parsed.runner.path, ".github/ci/assessment.py")
  assert.deepEqual(parsed.integrityFiles, [
    { path: ".python-version", expectedSha256: undefined },
    { path: ".github/ci/toolchain.txt", expectedSha256: undefined },
    { path: "uv.lock", expectedSha256: undefined },
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
