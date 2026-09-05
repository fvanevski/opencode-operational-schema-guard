import assert from "node:assert/strict"
import { constants } from "node:fs"
import { access, mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"

const script = new URL("../scripts/session-trace-assessment.mjs", import.meta.url).pathname
const root = "/tmp/opencode/verify/materials"

async function fixture(name, value) {
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(join(root, `${name}-`))
  const path = join(directory, "trace.json")
  await writeFile(path, typeof value === "string" ? value : JSON.stringify(value))
  return path
}

function run(path, sessionID = "ses_Synthetic123", extra = [], profile = "guard-friction-v1") {
  return spawnSync(process.execPath, [script, "--input", path, "--session-id", sessionID, "--profile", profile, ...extra], { encoding: "utf8" })
}

test("session trace assessment entrypoint is directly executable", async () => {
  await assert.doesNotReject(() => access(script, constants.X_OK))
})

test("assesses synthetic guard friction without executing shell-like trace data", async () => {
  const marker = join(tmpdir(), "trace-assessment-must-not-exist")
  const path = await fixture("pass", { info: { id: "ses_Synthetic123" }, messages: ["Operational schema guard", "DELEGATION INCOMPLETE", "CHILD_CAPABILITY_MISMATCH", "OPERATIONAL ADVISORY", "TERMINAL RETRY BREAKER", `touch ${marker}`, "pytest test_session_parser"] })
  const result = run(path)
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout.split("\n")[0])
  assert.deepEqual(report.metrics.guardBlocks, 1)
  assert.deepEqual(report.metrics.incompleteDelegations, 1)
  assert.deepEqual(report.metrics.capabilityMismatches, 1)
  assert.deepEqual(report.metrics.advisories, 1)
  assert.match(result.stdout, /OPERATIONAL_TRACE_RESULT: PASS/)
})

test("builds a redacted structured remediation audit from operational metadata", async () => {
  const secret = "do-not-copy-this-secret"
  const path = await fixture("remediation", {
    info: { id: "ses_Synthetic123", version: "1.18.25", title: secret },
    messages: [
      { info: { id: "msg_user", role: "user", time: { created: 1 } }, parts: [{ id: "prt_text", type: "text", text: `prompt ${secret}` }] },
      { info: { id: "msg_assistant", role: "assistant", time: { created: 2 } }, parts: [
        { id: "prt_reason", type: "reasoning", text: `reasoning ${secret}` },
        { id: "prt_task", type: "tool", callID: "call_task", tool: "Task", state: {
          status: "error",
          input: { prompt: secret, command: `publish ${secret}` },
          output: `output ${secret}`,
          error: `error ${secret}`,
          metadata: {
            sessionId: "ses_Child123",
            operationalSchema: {
              schemaVersion: "5.18.0",
              guardEvents: [{ rule: "child.capability.mismatch", code: "capability.mismatch", correctionCode: "USE_SUPPORTED_CAPABILITY" }],
              reasons: ["capability.mismatch"],
            },
          },
        } },
        { id: "prt_patch", type: "patch", hash: secret, files: [secret] },
      ] },
    ],
  })
  const result = run(path, "ses_Synthetic123", [], "remediation-audit-v1")
  assert.equal(result.status, 0, result.stderr)
  const serialized = result.stdout.split("\n")[0]
  const report = JSON.parse(serialized)
  assert.equal(report.schema_version, "opencode-session-audit-v1")
  assert.equal(report.summary.turns, 1)
  assert.equal(report.summary.event_counts.capability_mismatch, 1)
  assert.equal(report.events[0].evidence_source, "operational_schema")
  assert.deepEqual(report.events[0].correction_codes, ["USE_SUPPORTED_CAPABILITY"])
  assert.equal(report.causal_links[0].kind, "task_child_session")
  assert.deepEqual(report.remediation_candidates[0].evidence_refs, ["event-0001"])
  assert.ok(!serialized.includes(secret))
})

test("uses tool errors only as medium-confidence fallback and ignores quoted prompt text", async () => {
  const path = await fixture("fallback", {
    info: { id: "ses_Synthetic123" },
    messages: [{ info: { id: "msg_user", role: "user", time: { created: 1 } }, parts: [
      { id: "quoted", type: "text", text: "CHILD_CAPABILITY_MISMATCH Operational schema guard" },
      { id: "failed", type: "tool", tool: "Task", callID: "call_failed", state: { status: "error", error: "CHILD_CAPABILITY_MISMATCH", output: "TERMINAL RETRY BREAKER", input: {} } },
    ] }],
  })
  const result = run(path, "ses_Synthetic123", [], "remediation-audit-v1")
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout.split("\n")[0])
  assert.equal(report.summary.events, 1)
  assert.equal(report.events[0].confidence, "medium")
  assert.equal(report.events[0].evidence_source, "tool_error")
  assert.equal(report.summary.event_counts.retry_advisory, 0)
})

test("classifies both publish-gate word orders and structured incomplete gate results", async () => {
  const path = await fixture("publish-and-gate-results", {
    info: { id: "ses_Synthetic123" },
    messages: [{ info: { id: "msg_assistant", role: "assistant", time: { created: 1 } }, parts: [
      { id: "publish_before", type: "tool", tool: "bash", callID: "call_publish_before", state: { status: "error", input: {}, error: "Operational schema guard: commit or push blocked by the publish gate." } },
      { id: "publish_after", type: "tool", tool: "bash", callID: "call_publish_after", state: { status: "error", input: {}, error: "Operational schema guard: multi-file changes require a CLEAN fresh-review before commit or push." } },
      { id: "foreign_permission", type: "tool", tool: "bash", callID: "call_foreign", state: { status: "error", input: {}, error: "The user permission layer blocked a matching git push rule." } },
      { id: "verify_missing", type: "tool", tool: "task", callID: "call_verify", state: { status: "completed", input: {}, metadata: { operationalSchema: { complete: false, reasons: ["verify-result-marker-missing"] } } } },
      { id: "review_missing", type: "tool", tool: "task", callID: "call_review", state: { status: "completed", input: {}, metadata: { operationalSchema: { complete: false, reasons: ["operational-review-marker-missing"] } } } },
    ] }],
  })
  const result = run(path, "ses_Synthetic123", [], "remediation-audit-v1")
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout.split("\n")[0])
  assert.equal(report.summary.occurrence_counts.publish_gate_block, 2)
  assert.equal(report.summary.occurrence_counts.gate_failure, 2)
  assert.ok(report.remediation_candidates.some((candidate) => candidate.kind === "publish_gate_friction"))
  assert.ok(report.remediation_candidates.some((candidate) => candidate.kind === "delegated_result_contract_gap"))
})

test("legacy metrics use structured occurrence counts and incomplete-result reasons", async () => {
  const path = await fixture("legacy-structured-counts", {
    info: { id: "ses_Synthetic123" },
    messages: [{ info: { id: "msg_task", role: "assistant" }, parts: [{
      id: "task", type: "tool", tool: "task", state: { status: "completed", output: "bounded handoff", metadata: { operationalSchema: {
        complete: false,
        reasons: ["verify-result-marker-missing"],
        guardEvents: [{ rule: "child-capability-mismatch", occurrenceCount: 3 }],
      } } },
    }] }],
  })
  const result = run(path)
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout.split("\n")[0])
  assert.equal(report.metrics.capabilityMismatches, 3)
  assert.equal(report.metrics.incompleteDelegations, 1)
})

test("legacy friction metrics expose child launches, planner provenance, elisions, and terminal normalization", async () => {
  const path = await fixture("issue15-routing-metrics", {
    info: { id: "ses_Synthetic123" },
    messages: [{ info: { id: "msg_task", role: "assistant" }, parts: [
      {
        id: "fresh", type: "tool", tool: "task", state: {
          status: "completed",
          input: { subagent_type: "fresh-review" },
          metadata: { sessionId: "ses_Fresh123", operationalSchema: {
            complete: true,
            planning: { status: "READY", partitionCount: 1 },
            terminalNormalizations: ["multiline-fields", "field-order-normalized"],
          } },
        },
      },
      {
        id: "verify", type: "tool", tool: "task", state: {
          status: "completed",
          input: { subagent_type: "verify" },
          metadata: { sessionId: "ses_Verify123", operationalSchema: {
            complete: true,
            planning: { status: "READY", partitionCount: 1 },
            terminalNormalizations: [],
          } },
        },
      },
      {
        id: "elided", type: "tool", tool: "task", state: {
          status: "error",
          input: { subagent_type: "fresh-review" },
          error: "Fresh-review is elided by explicit central-owned semantic-review authority. OPERATIONAL_PACKET_ACTION: HONOR_SEMANTIC_REVIEW_AUTHORITY.",
        },
      },
      {
        id: "partitioned", type: "tool", tool: "task", state: {
          status: "error",
          input: { subagent_type: "fresh-review" },
          error: "deterministic planner returned PARTITION_REQUIRED: deterministic-complexity-partition",
        },
      },
    ] }],
  })
  const result = run(path)
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout.split("\n")[0])
  assert.equal(report.metrics.freshReviewLaunches, 1)
  assert.equal(report.metrics.verifyLaunches, 1)
  assert.equal(report.metrics.exploreLaunches, 0)
  assert.equal(report.metrics.plannerSuccesses, 2)
  assert.equal(report.metrics.plannerPartitions, 2)
  assert.equal(report.metrics.terminalNormalizations, 2)
  assert.equal(report.metrics.freshReviewElisions, 1)
  assert.equal(report.metrics.plannerPreventedLaunches, 1)
  assert.equal(report.metrics.capabilityPrevented, 2)
})

test("remediation audit classifies deterministic role elision and planner partition boundaries", async () => {
  const path = await fixture("issue15-routing-audit", {
    info: { id: "ses_Synthetic123" },
    messages: [{ info: { id: "msg_task", role: "assistant", time: { created: 1 } }, parts: [
      { id: "elided", type: "tool", tool: "task", callID: "call_elided", state: { status: "error", input: { subagent_type: "fresh-review" }, error: "Fresh-review is elided. OPERATIONAL_PACKET_ACTION: HONOR_SEMANTIC_REVIEW_AUTHORITY." } },
      { id: "partitioned", type: "tool", tool: "task", callID: "call_partitioned", state: { status: "error", input: { subagent_type: "fresh-review" }, error: "deterministic planner returned PARTITION_REQUIRED because deterministic-complexity-partition applies." } },
    ] }],
  })
  const result = run(path, "ses_Synthetic123", [], "remediation-audit-v1")
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout.split("\n")[0])
  assert.equal(report.summary.event_counts.role_elision, 1)
  assert.equal(report.summary.event_counts.planner_partition, 1)
  assert.ok(report.remediation_candidates.some((candidate) => candidate.kind === "prevented_unnecessary_delegation"))
  assert.ok(report.remediation_candidates.some((candidate) => candidate.kind === "deterministic_partition_boundary"))
})

test("detects an empty interactive call and its premature finalization sequence without exposing text", async () => {
  const secret = "private-final-packet-details"
  const path = await fixture("empty-interactive", {
    info: { id: "ses_Synthetic123", version: "1.18.25" },
    messages: [
      { info: { id: "msg_compaction", role: "user", time: { created: 1 } }, parts: [{ id: "part_compaction", type: "compaction", auto: true }] },
      { info: { id: "msg_assistant", role: "assistant", time: { created: 2 } }, parts: [
        { id: "part_reason", type: "reasoning", text: `Now compose the final packet ${secret}` },
        { id: "part_text", type: "text", text: "All checks passed; the final handoff is ready." },
        { id: "part_question", type: "tool", tool: "question", callID: "call_empty", state: { status: "error", input: { questions: [] }, error: `dismissed ${secret}` } },
        { id: "part_finish", type: "step-finish", reason: "tool-calls" },
      ] },
      { info: { id: "msg_user_retry", role: "user", time: { created: 3 } }, parts: [{ id: "part_retry", type: "text", text: `compose the final packet ${secret}` }] },
    ],
  })
  const result = run(path, "ses_Synthetic123", [], "remediation-audit-v1")
  assert.equal(result.status, 0, result.stderr)
  const serialized = result.stdout.split("\n")[0]
  const report = JSON.parse(serialized)
  assert.equal(report.summary.event_counts.malformed_invocation, 1)
  assert.equal(report.summary.event_counts.premature_turn_termination, 1)
  assert.equal(report.summary.remediation_candidates, 2)
  assert.deepEqual(report.events[0].reason_codes, ["empty_interactive_questions"])
  assert.deepEqual(report.events[0].correction_codes, ["RESPOND_OR_ASK_NONEMPTY"])
  assert.equal(report.events[0].evidence_source, "trace_structure")
  assert.equal(report.events[1].evidence_source, "trace_sequence")
  assert.ok(report.events[1].reason_codes.includes("user_completion_retry"))
  assert.deepEqual(report.causal_links, [{ kind: "malformed_interactive_termination", from: "event-0001", to: "event-0002", confidence: "high" }])
  assert.ok(!report.diagnostics.some((item) => item.code === "unknown_part_type"))
  assert.ok(!serialized.includes(secret))
})

test("legacy friction metrics ignore quoted guard prose and count authoritative tool errors", async () => {
  const path = await fixture("legacy-authoritative", {
    info: { id: "ses_Synthetic123" },
    messages: [
      { info: { id: "msg_reason", role: "assistant" }, parts: [{ id: "reason", type: "reasoning", text: "Operational schema guard was already handled." }] },
      { info: { id: "msg_errors", role: "assistant" }, parts: [
        { id: "error_one", type: "tool", tool: "bash", state: { status: "error", input: {}, error: "Operational schema guard: first" } },
        { id: "error_two", type: "tool", tool: "bash", state: { status: "error", input: {}, error: "Operational schema guard: second" } },
      ] },
    ],
  })
  const result = run(path)
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout.split("\n")[0])
  assert.equal(report.metrics.guardBlocks, 2)
})

test("does not infer premature termination across assistant recovery or post-tool final text", async () => {
  const emptyQuestion = (id) => ({ id, type: "tool", tool: "question", callID: `call_${id}`, state: { status: "error", input: { questions: [{ question: "  " }] }, error: "dismissed" } })
  const path = await fixture("noncausal-interactive", {
    info: { id: "ses_Synthetic123" },
    messages: [
      { info: { id: "msg_first", role: "assistant", time: { created: 1 } }, parts: [
        { id: "first_text", type: "text", text: "I will compose the final packet." }, emptyQuestion("first_question"), { id: "first_finish", type: "step-finish", reason: "tool-calls" },
      ] },
      { info: { id: "msg_recovery", role: "assistant", time: { created: 2 } }, parts: [{ id: "recovery_text", type: "text", text: "Final packet delivered." }, { id: "recovery_finish", type: "step-finish", reason: "stop" }] },
      { info: { id: "msg_later_user", role: "user", time: { created: 3 } }, parts: [{ id: "later_text", type: "text", text: "write the final answer for another task" }] },
      { info: { id: "msg_second", role: "assistant", time: { created: 4 } }, parts: [
        { id: "second_text", type: "text", text: "I will compose the final packet." }, emptyQuestion("second_question"),
        { id: "post_tool_text", type: "text", text: "Here is the completed final packet." }, { id: "second_finish", type: "step-finish", reason: "tool-calls" },
      ] },
      { info: { id: "msg_immediate_user", role: "user", time: { created: 5 } }, parts: [{ id: "immediate_text", type: "text", text: "compose the final packet" }] },
    ],
  })
  const result = run(path, "ses_Synthetic123", [], "remediation-audit-v1")
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout.split("\n")[0])
  assert.equal(report.summary.event_counts.malformed_invocation, 2)
  assert.equal(report.summary.event_counts.premature_turn_termination, 0)
  assert.ok(report.events.every((event) => event.reason_codes.includes("blank_interactive_questions")))
})

test("classifies the plugin's real structured guard rule vocabulary", async () => {
  const rules = [
    ["child-successful-duplicate", "duplicate_success_block"],
    ["child-shell-shape", "malformed_invocation"],
    ["child-duplicate-failed", "retry_advisory"],
    ["primary-shell-advisory", "routing_advisory"],
    ["primary-validation-advisory", "routing_advisory"],
    ["primary-read-advisory", "routing_advisory"],
    ["external-edit-unattested", "provenance_advisory"],
    ["external-mutation-unattested", "provenance_advisory"],
  ]
  const path = await fixture("real-rules", {
    info: { id: "ses_Synthetic123" },
    messages: [{ info: { id: "msg_rules", role: "assistant", time: { created: 1 } }, parts: [{
      id: "part_rules", type: "tool", tool: "task", callID: "call_rules", state: { status: "completed", input: {}, metadata: { operationalSchema: {
        schemaVersion: "5.17.0", guardEvents: rules.map(([rule]) => ({ rule })),
      } } },
    }] }],
  })
  const result = run(path, "ses_Synthetic123", [], "remediation-audit-v1")
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout.split("\n")[0])
  for (const [, category] of rules) assert.ok(report.events.some((event) => event.category === category), category)
  assert.equal(report.summary.occurrence_counts.routing_advisory, 3)
  assert.equal(report.summary.occurrence_counts.provenance_advisory, 2)
  assert.ok(!report.remediation_candidates.some((candidate) => candidate.evidence_refs.some((reference) => report.events.find((event) => event.event_id === reference)?.category === "provenance_advisory")))
})

test("preserves coalesced advisory occurrence counts without duplicating evidence", async () => {
  const path = await fixture("coalesced-advisory", {
    info: { id: "ses_Synthetic123" },
    messages: [{ info: { id: "msg_budget", role: "assistant", time: { created: 1 } }, parts: [{
      id: "part_budget", type: "tool", tool: "task", state: { status: "completed", metadata: { operationalSchema: {
        schemaVersion: "5.19.0",
        guardEvents: [{ rule: "child-tool-budget-advisory", advisory: true, occurrenceCount: 16, threshold: 18, firstObservedCallCount: 19, maxObservedCallCount: 34 }],
      } } },
    }] }],
  })
  const result = run(path, "ses_Synthetic123", [], "remediation-audit-v1")
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout.split("\n")[0])
  assert.equal(report.summary.event_counts.routing_advisory, 1)
  assert.equal(report.summary.occurrence_counts.routing_advisory, 16)
  assert.equal(report.events[0].occurrence_count, 16)
})

test("reports completed nonzero exits as diagnostics without fabricating guard friction", async () => {
  const secret = "private-command-output"
  const path = await fixture("nonzero-exit", {
    info: { id: "ses_Synthetic123" },
    messages: [{ info: { id: "msg_exit", role: "assistant", time: { created: 1 } }, parts: [
      { id: "part_failed", type: "tool", tool: "bash", state: { status: "completed", input: { command: secret }, output: secret, metadata: { exit: 128 } } },
      { id: "part_passed", type: "tool", tool: "bash", state: { status: "completed", input: { command: secret }, output: secret, metadata: { exit: 0 } } },
    ] }],
  })
  const result = run(path, "ses_Synthetic123", [], "remediation-audit-v1")
  assert.equal(result.status, 0, result.stderr)
  const serialized = result.stdout.split("\n")[0]
  const report = JSON.parse(serialized)
  assert.equal(report.summary.events, 0)
  assert.equal(report.summary.remediation_candidates, 0)
  assert.deepEqual(report.diagnostics, [{ code: "nonzero_tool_exit", message_id: "msg_exit", part_id: "part_failed", tool: "bash", exit_code: 128 }])
  assert.ok(!serialized.includes(secret))
})

test("reports format drift without reproducing unknown part payloads", async () => {
  const path = await fixture("diagnostics", {
    info: { id: "ses_Synthetic123" },
    messages: [{ info: { id: "msg_unknown", role: "assistant" }, parts: [
      { id: "new_part", type: "future-sensitive-private-part", payload: "private" },
      { id: "schema", type: "tool", tool: "Task", state: { status: "completed", metadata: { operationalSchema: { schemaVersion: "private-4.2.0" } } } },
    ] }],
  })
  const result = run(path, "ses_Synthetic123", [], "remediation-audit-v1")
  assert.equal(result.status, 0, result.stderr)
  const serialized = result.stdout.split("\n")[0]
  const report = JSON.parse(serialized)
  assert.ok(report.diagnostics.some((item) => item.code === "unknown_part_type"))
  assert.ok(report.diagnostics.some((item) => item.code === "unknown_operational_schema_version"))
  assert.ok(report.diagnostics.some((item) => item.code === "missing_message_time"))
  assert.ok(!serialized.includes("private"))
})

test("rejects unsupported remediation profile spellings", async () => {
  const valid = await fixture("profile", { info: { id: "ses_Synthetic123" }, messages: [] })
  const result = spawnSync(process.execPath, [script, "--input", valid, "--session-id", "ses_Synthetic123", "--profile", "remediation-audit-v2"], { encoding: "utf8" })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /unsupported profile/)
})

test("rejects wrong identity, malformed JSON, and extra flags", async () => {
  const valid = await fixture("identity", { info: { id: "ses_Synthetic123" }, messages: [] })
  assert.notEqual(run(valid, "ses_Other123").status, 0)
  const malformed = await fixture("malformed", "{")
  assert.notEqual(run(malformed).status, 0)
  assert.notEqual(run(valid, "ses_Synthetic123", ["--extra"]).status, 0)
})

test("rejects symlink inputs and material-root escapes", async () => {
  await mkdir(root, { recursive: true })
  const outside = await fixture("target", { info: { id: "ses_Synthetic123" }, messages: [] })
  const link = join(root, `link-${process.pid}-${Date.now()}.json`)
  await symlink(outside, link)
  assert.notEqual(run(link).status, 0)
  const outsideRoot = join(tmpdir(), `outside-trace-${process.pid}.json`)
  await writeFile(outsideRoot, JSON.stringify({ info: { id: "ses_Synthetic123" }, messages: [] }))
  assert.notEqual(run(outsideRoot).status, 0)
})

test("rejects spoofed identity and primitive roots and isolates metrics to the requested export messages", async () => {
  const spoofed = await fixture("spoofed", { info: { id: "ses_Other123" }, messages: ["ses_Synthetic123 Operational schema guard"] })
  assert.notEqual(run(spoofed).status, 0)
  const primitive = await fixture("primitive", "\"ses_Synthetic123\"")
  assert.notEqual(run(primitive).status, 0)
  const isolated = await fixture("isolated", {
    info: { id: "ses_Synthetic123" },
    messages: ["OPERATIONAL ADVISORY"],
    otherSessions: [{ info: { id: "ses_Other123" }, messages: ["Operational schema guard", "Operational schema guard"] }],
  })
  const result = run(isolated)
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout.split("\n")[0])
  assert.equal(report.metrics.advisories, 1)
  assert.equal(report.metrics.guardBlocks, 0)
})
