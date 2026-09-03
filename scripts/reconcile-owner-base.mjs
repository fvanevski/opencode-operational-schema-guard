#!/usr/bin/env node

import { resolve } from "node:path"
import { ASSESSMENT_SPEC_ROOT } from "../lib/repo-pr-assessment.mjs"
import { OWNER_BASE_RECONCILIATION_SCHEMA, reconcileOwnerBase } from "../lib/owner-base-reconciliation.mjs"

const LOWER_SHA = /^[0-9a-f]{40}$/

export function parseReconciliationArgs(argv) {
  if (argv.length !== 8 || argv[0] !== "--spec" || argv[2] !== "--expected-old-sha" || argv[4] !== "--expected-base-sha" || argv[6] !== "--expected-target-sha") {
    throw new Error(`usage: reconcile-owner-base.mjs --spec ${ASSESSMENT_SPEC_ROOT}/<name>.json --expected-old-sha <40-lowercase-sha> --expected-base-sha <40-lowercase-sha> --expected-target-sha <40-lowercase-sha>`)
  }
  const specPath = argv[1]
  const expectedOldSha = argv[3]
  const expectedBaseSha = argv[5]
  const expectedTargetSha = argv[7]
  if (
    typeof specPath !== "string"
    || resolve(specPath) !== specPath
    || !specPath.startsWith(`${ASSESSMENT_SPEC_ROOT}/`)
    || !specPath.endsWith(".json")
    || /[*?\[\]{}\r\n\0]/.test(specPath)
  ) throw new Error(`reconcile-owner-base: spec must be one concrete .json file under ${ASSESSMENT_SPEC_ROOT}`)
  for (const [label, value] of [["expected old owner SHA", expectedOldSha], ["expected pinned base SHA", expectedBaseSha], ["expected target SHA", expectedTargetSha]]) {
    if (!LOWER_SHA.test(value ?? "")) throw new Error(`reconcile-owner-base: ${label} must be 40 lowercase hexadecimal characters`)
  }
  return { specPath, expectedOldSha, expectedBaseSha, expectedTargetSha }
}

export async function runReconciliation(argv = process.argv.slice(2), { cwd = process.cwd() } = {}) {
  const { specPath, expectedOldSha, expectedBaseSha, expectedTargetSha } = parseReconciliationArgs(argv)
  const result = await reconcileOwnerBase({ specPath, expectedOldSha, expectedBaseSha, expectedTargetSha, cwd })
  process.stdout.write(`OPERATIONAL_OWNER_RECONCILIATION: PASS; schema=${OWNER_BASE_RECONCILIATION_SCHEMA}; assessment_id=${result.assessment_id}; expected_old_sha=${result.expected_old_sha}; base_sha=${result.pinned_base_sha}; head_sha=${result.pinned_head_sha}; branch=${result.branch}\n`)
  process.stdout.write("OWNER_BASE_RECONCILIATION_RESULT=PASS\n")
  return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = await runReconciliation()
  } catch (error) {
    const kind = error?.reconciliationKind ?? "BLOCKED"
    process.stderr.write(`OWNER_BASE_RECONCILIATION_RESULT=${kind}\n${error.message}\n`)
    process.exitCode = kind === "STALE" ? 3 : kind === "INFRA_ERROR" ? 4 : kind === "ISOLATION_BREACH" ? 5 : 2
  }
}
