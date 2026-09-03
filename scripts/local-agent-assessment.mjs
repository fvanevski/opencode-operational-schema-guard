#!/usr/bin/env node

import { createHash } from "node:crypto"
import { resolve } from "node:path"
import { ASSESSMENT_SPEC_ROOT, loadAssessmentSpec, runRepoPrAssessment } from "../lib/repo-pr-assessment.mjs"

export function parseAssessmentArgs(argv) {
  if (argv.length !== 2 || argv[0] !== "--spec") {
    throw new Error(`usage: local-agent-assessment.mjs --spec ${ASSESSMENT_SPEC_ROOT}/<name>.json`)
  }
  const specPath = argv[1]
  if (typeof specPath !== "string" || resolve(specPath) !== specPath || !specPath.startsWith(`${ASSESSMENT_SPEC_ROOT}/`) || !specPath.endsWith(".json") || /[*?\[\]{}\r\n\0]/.test(specPath)) {
    throw new Error(`local-agent-assessment: spec must be one concrete .json file under ${ASSESSMENT_SPEC_ROOT}`)
  }
  return { specPath }
}

export function assessmentSummarySha256(result) {
  if (!result || typeof result !== "object" || typeof result.summary_path !== "string" || result.summary_path.length === 0) return null
  const { summary_path: _summaryPath, exit_code: _exitCode, ...summary } = result
  return createHash("sha256").update(`${JSON.stringify(summary, null, 2)}\n`).digest("hex")
}

export async function runAssessment(argv = process.argv.slice(2)) {
  const { specPath } = parseAssessmentArgs(argv)
  const loaded = await loadAssessmentSpec(specPath)
  let result
  switch (loaded.spec.kind) {
    case "repo-pr":
      result = await runRepoPrAssessment(loaded.spec, { specSha256: loaded.sha256 })
      break
    default:
      throw new Error(`local-agent-assessment: unsupported assessment kind ${loaded.spec.kind}`)
  }
  const summarySha256 = assessmentSummarySha256(result)
  process.stdout.write(`OPERATIONAL_ASSESSMENT: schema=${result.schema_version}; assessment_id=${result.assessment_id}; spec_sha256=${loaded.sha256}; base_sha=${result.expected_base_sha}; target_sha=${result.expected_head_sha}; summary_sha256=${summarySha256 ?? "unavailable"}; summary=${result.summary_path}\n`)
  process.stdout.write(`HOST_EVIDENCE_RESULT=${result.host_evidence_result}\n`)
  process.stdout.write(`GATE_DECISION=${result.gate_decision}\n`)
  return result.exit_code
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = await runAssessment()
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 2
  }
}
