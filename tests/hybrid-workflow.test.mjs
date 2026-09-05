import test from "node:test"
import assert from "node:assert/strict"
import {
  CHILD_PLAN_SCHEMA,
  EVIDENCE_ENTRY_SCHEMA,
  EvidenceLedger,
  assessRoleLimitTuning,
  canonicalJson,
  evidenceEquivalence,
  evaluateCleanliness,
  gateSatisfiedByEvidence,
  parseChildTerminal,
  planChildWork,
  replayFrictionScenario,
  retryDisposition,
  semanticReviewAuthorityFromMessage,
  semanticReviewRequirement,
  sha256Hex,
} from "../lib/hybrid-workflow.mjs"

const HEAD = "a".repeat(40)
const BASE_ENTRY = Object.freeze({
  schema_version: EVIDENCE_ENTRY_SCHEMA,
  evidence_class: "actions-repository-deterministic",
  repository: "fvanevski/opencode-operational-schema-guard",
  head_sha: HEAD,
  generation: 3,
  gate_id: "repository-final",
  profile_fingerprint: "profile-v2",
  dependency_fingerprint: "deps-1",
  environment_fingerprint: "env-2",
  producer_fingerprint: "controller-main-1",
  receipt_sha256: "b".repeat(64),
  receipt_identity: {
    workflow_run_id: "1001",
    workflow_run_attempt: "1",
    execution_artifact_id: "2001",
    receipt_artifact_name: "ghdev-receipt-1001",
  },
  counts: {
    commands_required: 2,
    commands_run: 2,
    test_count: 10,
    test_pass: 10,
    test_fail: 0,
    test_skip: 0,
  },
  result: "PASS",
})

const REQUIREMENT = Object.freeze({
  evidence_class: BASE_ENTRY.evidence_class,
  repository: BASE_ENTRY.repository,
  head_sha: BASE_ENTRY.head_sha,
  generation: BASE_ENTRY.generation,
  gate_id: BASE_ENTRY.gate_id,
  profile_fingerprint: BASE_ENTRY.profile_fingerprint,
  dependency_fingerprint: BASE_ENTRY.dependency_fingerprint,
  environment_fingerprint: BASE_ENTRY.environment_fingerprint,
  producer_fingerprint: BASE_ENTRY.producer_fingerprint,
})

function planInput(overrides = {}) {
  return {
    schema_version: CHILD_PLAN_SCHEMA,
    role: "fresh-review",
    authority: { repository: BASE_ENTRY.repository, head_sha: HEAD, generation: 3 },
    semantic_review_authority: "local-fresh-review",
    gate_class: "semantic-review-evidence",
    objective: "Review only the explicit Issue #15 changed targets.",
    questions: ["Are the changed invariants correct?"],
    stop_condition: "Stop when all explicit targets are addressed.",
    targets: [
      { path: "lib/a.mjs", kind: "production", file_bytes: 50000, diff_bytes: 8000, hunks: 4 },
      { path: "lib/b.mjs", kind: "production", file_bytes: 50000, diff_bytes: 8000, hunks: 4 },
    ],
    ...overrides,
  }
}

test("semantic review authority is exact, typed, and conflict rejecting", () => {
  assert.equal(semanticReviewAuthorityFromMessage("SEMANTIC REVIEW AUTHORITY: central-owned"), "central-owned")
  assert.equal(semanticReviewAuthorityFromMessage("SEMANTIC REVIEW AUTHORITY: CENTRAL-OWNED"), "central-owned")
  assert.equal(semanticReviewAuthorityFromMessage("prose central-owned"), undefined)
  assert.throws(() => semanticReviewAuthorityFromMessage("SEMANTIC REVIEW AUTHORITY: central-owned\nSEMANTIC REVIEW AUTHORITY: both"), /conflicting/)
  assert.deepEqual(semanticReviewRequirement("central-owned"), {
    authority: "central-owned",
    central_semantic_review_required: true,
    local_fresh_review_required: false,
    local_semantic_review: "NOT_EVALUATED",
  })
})

test("Central-owned mode deterministically elides Fresh-review without minting CLEAN", () => {
  const result = planChildWork(planInput({ semantic_review_authority: "central-owned" }))
  assert.equal(result.status, "ELIDED")
  assert.equal(result.reason, "central-owned-semantic-review")
  assert.equal(result.partitions.length, 0)
  assert.equal(result.local_semantic_review, "NOT_EVALUATED")
  assert.equal(result.central_semantic_review_required, true)
})

test("Actions-covered repository-final Verify is elided and receipt is reused", () => {
  const result = planChildWork(planInput({
    role: "verify",
    semantic_review_authority: "central-owned",
    gate_class: "repository-final",
    evidence_requirement: REQUIREMENT,
    evidence_entries: [BASE_ENTRY],
  }))
  assert.equal(result.status, "ELIDED")
  assert.equal(result.reason, "trusted-actions-receipt-reused")
  assert.equal(result.metrics.avoided_local_verify_launches, 1)
})

test("evidence ledger is exact-head and provenance sensitive", () => {
  const ledger = new EvidenceLedger([BASE_ENTRY])
  assert.equal(ledger.lookup(REQUIREMENT).reusable, true)
  assert.equal(ledger.lookup({ ...REQUIREMENT, head_sha: "c".repeat(40) }).reusable, false)
  assert.equal(ledger.lookup({ ...REQUIREMENT, environment_fingerprint: "env-3" }).reusable, false)
  assert.equal(ledger.lookup({ ...REQUIREMENT, producer_fingerprint: "controller-main-2" }).reusable, false)
  assert.equal(evidenceEquivalence({ ...BASE_ENTRY, result: "FAIL" }, REQUIREMENT).equivalent, false)
  assert.equal(evidenceEquivalence({ ...BASE_ENTRY, receipt_identity: { ...BASE_ENTRY.receipt_identity, workflow_run_id: "1002" } }, REQUIREMENT).equivalent, true)
  assert.equal(gateSatisfiedByEvidence("repository-final", BASE_ENTRY), true)
  assert.equal(gateSatisfiedByEvidence("host-specific-runtime", BASE_ENTRY), false)
  assert.equal(gateSatisfiedByEvidence("semantic-review-evidence", BASE_ENTRY), false)
})

test("planner output is deterministic and partitions a representative large review with complete unique coverage", () => {
  const targets = Array.from({ length: 6 }, (_, index) => ({
    path: `lib/target-${index}.mjs`,
    kind: "production",
    file_bytes: 120000,
    diff_bytes: 24000,
    hunks: 12,
  }))
  const input = planInput({ targets })
  const first = planChildWork(input, { taskExplicitTargets: { "fresh-review": 10 }, taskPromptChars: { "fresh-review": 4000 } })
  const second = planChildWork(input, { taskExplicitTargets: { "fresh-review": 10 }, taskPromptChars: { "fresh-review": 4000 } })
  assert.equal(first.status, "PARTITION_REQUIRED")
  assert.equal(first.coverage.unique_complete, true)
  assert.equal(first.coverage.planned_targets, 6)
  assert.ok(first.partitions.length > 1)
  assert.equal(canonicalJson(first), canonicalJson(second))
  assert.equal(sha256Hex(first.partitions[0].packet), first.partitions[0].packet_sha256)
})

test("planner returns UNREPRESENTABLE instead of silently dropping excess questions", () => {
  const result = planChildWork(planInput({ questions: ["q1", "q2", "q3", "q4"] }))
  assert.equal(result.status, "UNREPRESENTABLE")
  assert.equal(result.reason, "question-count-exceeds-three")
})

test("terminal parser accepts semicolon, multiline, whitespace, and field-order normalization", () => {
  const semicolon = parseChildTerminal("OPERATIONAL_RESULT: PASS; COMMANDS_RUN: 2; COMMANDS_REQUIRED: 2", "verify")
  const multiline = parseChildTerminal("COMMANDS_REQUIRED: 2\nOPERATIONAL_RESULT: PASS\nCOMMANDS_RUN: 2", "verify")
  assert.equal(semicolon.complete, true)
  assert.equal(multiline.complete, true)
  assert.ok(multiline.normalizations.includes("multiline-fields"))
  assert.ok(multiline.normalizations.includes("field-order-normalized"))
})

test("terminal parser rejects conflicts, missing fields, incidental marker prose, and incomplete counts", () => {
  assert.equal(parseChildTerminal("OPERATIONAL_RESULT: PASS\nOPERATIONAL_RESULT: FAIL\nCOMMANDS_RUN: 2\nCOMMANDS_REQUIRED: 2", "verify").complete, false)
  assert.ok(parseChildTerminal("OPERATIONAL_RESULT: PASS\nOPERATIONAL_RESULT: PASS\nCOMMANDS_RUN: 2\nCOMMANDS_REQUIRED: 2", "verify").reasons.includes("duplicate-operational_result"))
  assert.equal(parseChildTerminal("OPERATIONAL_RESULT: PASS\nCOMMANDS_RUN: 2", "verify").complete, false)
  assert.ok(parseChildTerminal("I think OPERATIONAL_RESULT: PASS is likely\nCOMMANDS_RUN: 2\nCOMMANDS_REQUIRED: 2", "verify").reasons.includes("terminal-narrative-or-unknown-field"))
  assert.ok(parseChildTerminal("OPERATIONAL_REVIEW: CLEAN\nTARGETS_REVIEWED: 1\nTARGETS_REQUIRED: 2", "fresh-review").reasons.includes("success-count-mismatch"))
})

test("retry semantics preserve orthogonal completed evidence for correction-only defects", () => {
  for (const event of ["preflight-rejection", "malformed-invocation", "capability-mismatch", "benign-terminal-format"]) {
    const result = retryDisposition(event)
    assert.equal(result.preserve_completed_evidence, true)
    assert.equal(result.semantic_rerun, false)
  }
  assert.equal(retryDisposition("source-movement").preserve_completed_evidence, false)
  assert.equal(retryDisposition("findings").semantic_rerun, true)
})

test("cleanliness policy keeps repository-owned strict, admits proven detached preservation, and forbids Slice-K canonical owner authority", () => {
  assert.equal(evaluateCleanliness({ mode: "repository-owned-assessment", owner_status_before: " M file", owner_status_after: " M file", owner_head_before: HEAD, owner_head_after: HEAD }).admitted, false)
  assert.equal(evaluateCleanliness({ mode: "caller-owned-detached", candidate_exact_head: true, owner_source_used: false, owner_fingerprint_before: "x", owner_fingerprint_after: "x", owner_preservation_exact: true }).admitted, true)
  assert.equal(evaluateCleanliness({ mode: "actions-slice-k", canonical_owner_used: true, candidate_exact_head: true, disposable_isolation: true }).admitted, false)
  assert.equal(evaluateCleanliness({ mode: "actions-slice-k", canonical_owner_used: false, candidate_exact_head: true, disposable_isolation: true }).admitted, true)
})

test("role-limit tuning is evidence-based and preserves existing limits when optimized runs do not exhaust", () => {
  assert.equal(assessRoleLimitTuning({ role: "fresh-review", current_limit: 24, required_runs: 8, exhausted_required_runs: 0, avoidance_slices_complete: true }).decision, "KEEP")
  assert.equal(assessRoleLimitTuning({ role: "fresh-review", current_limit: 24, required_runs: 8, exhausted_required_runs: 1, avoidance_slices_complete: false }).decision, "DEFER")
  assert.equal(assessRoleLimitTuning({ role: "fresh-review", current_limit: 24, required_runs: 8, exhausted_required_runs: 1, avoidance_slices_complete: true }).decision, "MEASURE")
})

test("friction replay proves Central-led zero local Fresh-review/Verify and preserved local-Fresh-review control path", () => {
  const central = replayFrictionScenario("central-owned")
  assert.equal(central.after_metrics.fresh_review_launches, 0)
  assert.equal(central.after_metrics.local_verify_launches, 0)
  assert.equal(central.after_metrics.actions_executions, 1)
  assert.ok(central.after_metrics.actions_receipt_reuses > 0)
  assert.equal(central.after_metrics.capability_mismatches, 0)
  assert.equal(central.after_metrics.malformed_invocations, 0)
  assert.equal(central.after_metrics.terminal_parse_normalizations, 2)
  assert.equal(central.baseline_metrics.fresh_review_launches, 8)
  assert.equal(central.delta_metrics.capability_mismatches, -35)
  assert.ok(central.after_metrics.wall_clock_duration_ms >= 0)
  assert.equal(central.local_semantic_review, "NOT_EVALUATED")
  assert.equal(central.central_semantic_review_required, true)

  const local = replayFrictionScenario("local-fresh-review")
  assert.ok(local.after_metrics.fresh_review_launches > 0)
  assert.equal(local.after_metrics.local_verify_launches, 0)
  assert.equal(local.after_metrics.representative_six_target_max_step_failure, false)
  assert.equal(local.after_metrics.marker_format_semantic_reruns, 0)
  assert.equal(local.fresh_review_plan.coverage.unique_complete, true)
})
