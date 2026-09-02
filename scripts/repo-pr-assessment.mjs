#!/usr/bin/env node

import { resolve } from "node:path"
import { ASSESSMENT_SPEC_ROOT, loadAssessmentSpec, runRepoPrAssessment } from "../lib/repo-pr-assessment.mjs"

export function parseRepoAssessmentArgs(argv) {
  if (argv.length !== 2 || argv[0] !== "--spec") {
    throw new Error(`usage: repo-pr-assessment.mjs --spec ${ASSESSMENT_SPEC_ROOT}/<name>.json`)
  }
  const path = argv[1]
  if (typeof path !== "string" || resolve(path) !== path || !path.startsWith(`${ASSESSMENT_SPEC_ROOT}/`) || !path.endsWith(".json") || /[*?\[\]{}\r\n\0]/.test(path)) {
    throw new Error(`repo-pr-assessment: spec must be one concrete .json file under ${ASSESSMENT_SPEC_ROOT}`)
  }
  return { specPath: path }
}

export async function runRepoAssessmentCli(argv = process.argv.slice(2)) {
  const { specPath } = parseRepoAssessmentArgs(argv)
  const loaded = await loadAssessmentSpec(specPath)
  const result = await runRepoPrAssessment(loaded.spec, { specSha256: loaded.sha256 })
  process.stdout.write(`OPERATIONAL_ASSESSMENT: schema=${result.schema_version}; assessment_id=${result.assessment_id}; summary=${result.summary_path}\n`)
  process.stdout.write(`HOST_EVIDENCE_RESULT=${result.host_evidence_result}\n`)
  process.stdout.write(`GATE_DECISION=${result.gate_decision}\n`)
  return result.exit_code
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = await runRepoAssessmentCli()
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 2
  }
}
