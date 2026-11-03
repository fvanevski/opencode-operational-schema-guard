# Issue #80: one consolidated recovery and closure Build campaign

Repository: fvanevski/opencode-operational-schema-guard
Branch: issue/79
Source authority: exact 40-character SHA in Central kickoff, authenticated after fetch.
Previous campaign: docs/issue-78/v2-curator/LOCAL_AGENT_CONTRACT_CLOSURE.md.
This file supersedes only the previous unresolved-write handling, not the already-completed acceptance or safety constraints.
Agent: OpenCode Build. One integrated campaign, including post-exit continuation. No PR.

## Mission

Close the two outstanding local review records correctly, preserve the original evidence, and finish the existing #80 closure-v1 packet. The original automatic systemd admission, native capture, source-bound operator approval, first real Graphiti readback, and browser/vision baseline are already proven. DO NOT rerun these large campaigns.

The outstanding records are:
- FAILED-ASYNCHRONOUS-PROCESSING CANDIDATE: cur80_qual01, d1ebf82a9eaf5b524c0ec2bf5a22626bebd5fbe1b96a9949da71bbf9e2aefb1b, last local state queued revision 4; operator qualification origin; 7 native event IDs. It has no matching remote Graphiti episode.
- CONFIRMED REMOTE SUCCESS: cur80_qual01, 924eee7a7f9760926f72280a8947c9e71b24de3766b6a642e8a85ccd133c0812, last local state queued revision 3; curator origin; exact remote group/name UUID 26299f65-f48c-45c1-abf0-9c7d521b1a03.
- Graphiti queue: exactly two starts, first async failure 2026-11-03 14:31:31 PST with Expecting value: line 1 column 1 (char 0), second async success 14:31:39. Logs say episode None; mapping of the first failure to the operator record is FIFO-order INFERENCE, not direct UUID-level proof. No third processing start in user-supplied logs.
- User disabled the disposable ghdev-curator80-qual01.path and stopped only ghdev-curator80-qual01.service. systemd showed failed state for the latter; shared mcp-mux.service remained active. Re-verify service PID/lock status before proceeding. The shared Graphiti worker is an mcp-mux child and MUST NOT be stopped.
- Prior cur80_disposable episode 27a67cb8-c880-40ea-af99-e5722dfc8693 has 3 nodes/2 extracted edges and correct source indexing. It is read-only reference evidence, not a new write target.

## Authority

LOCAL_AGENT_PRIMARY=build
SOURCE_GITHUB_WRITE=forbidden
EVIDENCE_GITHUB_WRITE=one evidence-only fast-forward commit on issue/79
EVIDENCE_PATH=docs/issue-78/evidence/80-closure-v1/
CREATE_PR=no
MERGE=no
CLOSE_ISSUE=no
PRODUCTION_ACTIVATION=no
PRODUCTION_GRAPHITI_MUTATION=no
SHARED_MCP_MUX_STOP_OR_RESTART=no
CANONICAL_OPENVIKING_GATE_MUTATION=no
LOCAL_SOURCE_EDITS=only bounded root-cause corrections in implicated #80 files/tests, uncommitted, full source.patch for Central. Do not redesign authority semantics.
HOST_DISPOSABLE_MUTATIONS=allowed after exact evidence checks, including local review repair, private user units, native source capture and portal reviews.
NO_FORCE_PUSH; NO_REPLAY_FAILED_EPISODE; NO_UNADMITTED_LLM; NO_BYPASS_OF_TESTS_OR_SOURCE_FENCES.

Use native git/systemctl/journalctl/MCP readbacks as authority for mutable state; Serena for semantic navigation, Probe only as supplemental, RTK for routine summaries but raw outputs for critical evidence, and OpenViking only for historic context.

## Phase A: source and CPU preflight

Verify clean detached worktree at kickoff SHA; origin/issue/79 matches. Preserve old /workspace/opencode-issue80-closure and private continuation files. Check current OpenCode/Graphiti/provider/gate versions and installed unit command bindings without modifying any global config or secrets.

Run:
1. node --check individually for core.mjs, worker.mjs, curator-cli.mjs, terminal-recovery.mjs, terminal-recovery-cli.mjs, portal-server.mjs.
2. node --test docs/issue-78/v2-curator/terminal-recovery.test.mjs docs/issue-78/v2-curator/curator.test.mjs docs/issue-78/v2-curator/portal-api.test.mjs docs/issue-78/v2-curator/graph-evidence.test.mjs docs/issue-78/v2-curator/graph-preview.test.mjs docs/issue-78/v2-curator/activation/render-qualification.test.mjs docs/issue-78/v2-curator/activation/prepare-review.test.mjs.
3. node --test docs/issue-78/v2-candidate/candidate.test.mjs plus the four accepted #75 memory-core/plugin-behavior/relevance/relevance-observation tests.
4. python3 -m unittest discover -s docs/issue-75/v2-candidate -p test_post_exit_drain.py -v; python3 -m py_compile docs/issue-75/v2-candidate/post-exit-drain.py; git diff --check.
5. In docs/issue-78/v2-curator/portal, npm ci; npm run check; npm run build.
Return exact exit codes and test counts. Do not suppress or relax failures.

## Phase B: existing cur80_qual01 terminal processing recovery (CPU/read-only MCP)

The staged terminal-recovery-cli.mjs obtains ACTUAL user-journal entries from mcp-mux.service and does a strictly scoped get_episodes positive readback. Dry-run is default; it does not mutate state. It requires disposable path stopped and disabled, disposable service stopped with MainPID=0, mcp-mux active, two queued source reviews in exact order/revision, two group processing starts with first failed and second succeeded, and exactly the one expected remote success identity. It refuses unexpected activity, absent evidence, missing group source or changed revision. No LLM or Graphiti writes.

First obtain the exact state root from the already-installed unit ExecStart with systemctl --user cat ghdev-curator80-qual01.service, and verify it refers exclusively to the private cur80_qual01 group. Set STATE_ROOT to this authenticated absolute directory; do not guess it from the documentation.

Dry-run command from repo root:

node docs/issue-78/v2-curator/terminal-recovery-cli.mjs \
  --group cur80_qual01 \
  --state-dir "$STATE_ROOT" \
  --endpoint http://127.0.0.1:8766/mcp \
  --unit ghdev-curator80-qual01 \
  --since '2026-11-03 14:19:00' \
  --failed d1ebf82a9eaf5b524c0ec2bf5a22626bebd5fbe1b96a9949da71bbf9e2aefb1b \
  --failed-revision 4 \
  --success 924eee7a7f9760926f72280a8947c9e71b24de3766b6a642e8a85ccd133c0812 \
  --success-revision 3 \
  --success-uuid 26299f65-f48c-45c1-abf0-9c7d521b1a03

If and only if dry-run reports READY_FOR_OPERATOR_ATTESTATION with exact identities, original sources and queue evidence intact, run the SAME command with --apply --ack-anonymous-order. The task authorization covers this clearly labeled disposable local recovery, not a new Graphiti submission. This acknowledges that failed review attribution is inferred from anonymous FIFO order. Confirm successful remote review now locally persisted, source-index and wrong-workspace fence; failed operator review now failed_extraction with original facts/events and SHA-256 journal evidence. Its source remains ineligible for recall and MUST NOT be resubmitted or silently re-labeled DEFER. Repeated apply must be rejected as stale.

Use actual read-only graph-readback and CLI/portal to show the successful UUID, extracted entities/edges and the failure state. A previous failed asynchronous task could have partial graph effects: do not claim no effects or change Graphiti to erase them. If dry-run fails, diagnose the specific mismatch; never force the two transitions.

## Phase C: one distinct, real GUI-positive check (only remaining #80 acceptance gap)

The first actual operator-approved review reached queued and then failed Graphiti extraction, so it does NOT satisfy the GUI criterion of DEFER -> approve -> persisted.

Perform one focused additional native V2 capture and portal approval from a NEW eligible real-source cluster in a fresh disposable cur80_qual02 group. Do not repeat or replay the failed assertion, event ID or episode. It must have real native source IDs, an explicitly labeled operator-prepared DEFER, one source-grounded edit-and-approve, revision CAS, no Graphiti/model work during interactive harness, genuinely automatic post-exit gate admission, a unique confirmed persisted Graphiti UUID and a final real browser graph/status refresh. Keep it a modest separate assertion that is not semantically identical to the failed claim. Reuse already-accepted screenshots, filters, access-control and old graph tests rather than re-running the entire portal campaign. The original qual01 curator result already proves a real native LLM-approved episode; there is no need for a second synthetic model benchmark.

Existing shared inference gate and systemd user units remain authoritative. The updated Python wrapper can continue late readback polling while retaining exclusive admission. A terminal extraction failure again is a typed blocker, never grounds for another automatic retry. One additional attempt is sufficient; do not multiply fixture/drain cycles merely to force green. Diagnose current provider JSON-decoding origin if achievable with bounded sanitized logs; cause is unverified without more evidence. Do not inspect/store raw private model responses in GitHub.

Pre-exit Build prepares the private continuation receipt, then exits OpenCode so the automatic post-exit unit can admit the real drain. Inspect terminal systemd/Graphiti state from a separate ordinary terminal before launching resumed Build; resumed Build completes this SAME campaign without another Central handoff. No manual drain counts as automatic PASS.

## Phase D: one final evidence packet

Reuse and accurately date/identify existing earlier pre-exit results at SOURCE_START_SHA 719e266746a798413a14ced9fecf0b2f958f48a6: 32+32+26 tests, tsc/Vite PASS, real Playwright/vision 480px+desktop screenshots, original operator approval and graph preview, pre-exit fail-closed path, genuine post-exit automatic EX admission, and 2-task log outcomes. New tests are attached separately to the NEW kickoff SHA. No retrospective claim that earlier tests exercised new source.

Publish a single sanitized docs/issue-78/evidence/80-closure-v1 packet: manifest.json, handback.md, cpu-tests.md, graphiti-extraction.json, activation-postexit.md, portal-real-state.md, terminal-extraction-recovery.md, command-shape-friction.md, source.patch (empty only if no uncommitted source edits), and only a few redacted real screenshots. Include exact source/event/review/remote UUIDs, journal digest, chronological INFERENCE limitation, successful source-index proof, no Graphiti replay, graph node/edge counts, model calls/time, terminal service status, and original-vs-current SHA provenance. No tokens, full private logs, unredacted screenshots, transcripts, internal credentials or raw model text.

Only after all EX/remote writes are terminal, disable/stop and remove ONLY agent-owned disposable user systemd units. Preserve durable state and evidence; never touch mcp-mux.service or canonical OpenViking gate.

Read remote issue/79 exact SHA immediately before the ONE evidence-only push; require it equals kickoff SHA, stage only packet paths, inspect diff/staged names, commit without touching source, push non-force HEAD:refs/heads/issue/79, read back exact new ref and hashes. If branch moved return STALE without a merge/rebase/overwrite. No PR/merge/close/production activation.

Typed handback:
RESULT=PASS|PARTIAL|BLOCKED_UNRESOLVED|BLOCKED_HOST|STALE|READY_FOR_POST_EXIT_OPERATOR_RUN
SOURCE_START_SHA=<full exact>
SOURCE_TESTED_SHA=<full exact plus diff hash>
EVIDENCE_COMMIT_SHA=<full exact or none>
CPU_TESTS=<counts/exits>; PORTAL_BUILD=<tsc/vite exits>
QUAL01_LOCAL_FINAL=<failed ID state and success UUID/state/revision/index>
QUEUE_PROOF=<group processing count, journal sha256, FIFO attribution inferred>
NO_REPLAY=<Graphiti write count for recovery and duplicate-guard evidence>
GRAPH_READBACK=<exact UUID and actual node/edge source metadata>
NEW_REAL_PORTAL_POSITIVE=<source -> DEFER -> approve -> queued -> persisted or explicit gap>
AUTOMATIC_ADMISSION=<pre/post-exit timestamps, terminal result>
SERVICE_TOPOLOGY=<disposable user units, mcp-mux healthy, shared gate>
SOURCE_CHANGES=<none or complete patch>; PRODUCTION_MUTATION=none
GITHUB_MUTATION=<one evidence-only commit max>
KNOWN_GAPS=<typed>; NEXT=<Central review or material blocker>
COMMAND_SHAPE_FRICTION=<canonical ledger, even if encountered=no>

Escalate only a material group/authority/privacy breach, nonunique remote identity, unsafe shared worker, live EX lease ambiguity, or semantic source change requiring Central. Routine disposable argument, test, Playwright, unit and environment fixes stay in this same Build campaign. No further micro-handoffs.
