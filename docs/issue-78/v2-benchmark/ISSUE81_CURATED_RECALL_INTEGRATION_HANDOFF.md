# Issue #81: source-authorized curated recall integration — complete local Build contract

CAMPAIGN=ISSUE81_CURATED_RECALL_INTEGRATION_V1
PRIMARY_AGENT=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=81
PR_NUMBER=89
IMPLEMENTATION_BRANCH=issue/81-source-recall-correction
IMPLEMENTATION_SHA=read exact GitHub branch head at kickoff, verify it contains this contract
CONTROLLER_BASE=9a27b73de882c0af6fec4d86de81945338611479
EVIDENCE_BRANCH=issue/81-recall-acceptance
EVIDENCE_BASE=5edffd7378459474267fb7d4529590a4aaae3f67
EVIDENCE_ROOT=docs/issue-78/evidence/81-curated-recall-integration-v1
PRODUCTION_GROUP=development-knowledge
PRODUCTION_PROJECT=gh_mcp
PRODUCTION_WORKSPACE=/workspace/mcp_servers/gh_mcp
GRAPHITI_ENDPOINT=http://127.0.0.1:8766/mcp

## Authority and objective

Central made the product-level decision: a positively persisted curated source index is a supplemental candidate inventory, NOT independent remote or factual authority. In the draft source, a candidate is injectible only with a same-request Graphiti get_episodes positive UUID + exact group readback, existing scope-bound curation status, native-ID source-strength, one fact, unchanged source/identity/privacy fences, and unchanged one-fact output. Stale local receipts or inferred cross-group membership cannot satisfy remote proof.

The staged source implements this decision, adds generic port/causal answer-type preference and bounded source-linked context matching. Source context may help admission but is never injected as a fact. It remains a DRAFT, subject to host authority, native performance and independent review.

One consolidated host campaign must produce all evidence needed for Central to decide whether to finalize PR #89 or perform a last bounded same-PR change. Do not launch fresh separate diagnostic projects.

Known history: original frozen 8/16, post-S06 native 9/16, previous 24-depth offline 9/16, and read-only fallback probe locally recovered S07 only. The 13/16 source-correct threshold is fixed; S06 and other passing cases must not regress. Precision 126 human verdicts remain UNVERIFIED. N02 remains a frozen negative FAIL_INJECTED, separately classified same-group policy issue.

## Environment and autonomy
- Build primary in ordinary OpenViking shim, source/run from an exact-source isolated worktree. Fetch implementation ref before local object/worktree proof. Do not reset/rebase/clean owner's primary checkout.
- CPU-only source, Node tests, static checks, curated local 165-fact index, private replay and sanitized publication.
- Existing Graphiti MCP 8766 for READ-ONLY get_episodes/search_memory_facts. Remote/embedding services may use host GPU; do not launch new models or modify service.
- Host reads and disposable scripts are allowed; standard shell/Node/JSON adapter corrections autonomous. Narrow repair of private runner code allowed. A discovered substantive source-selection or security defect belongs to Central, not a pretext for an agent-authored implementation rewrite.
- No Graphiti add/delete, curation mutation, generated/base config edits, production plugin deployment, service restarts, EX bypass, issue closure, merge, another PR, new full native GPU campaign or human-verdict invention.
- Never reinterpret a remote episode *absence* as proven deletion if the backend returned a truncated/partial listing. It means no positive proof for this request and requires abstention.

## Phase A — exact source and contract checks

1. Authenticate exact remote PR #89 head and base SHA; read this full contract and source files in the pinned worktree. Confirm main remains CONTROLLER_BASE and PR is draft. Verify Source diff only on existing Issue #75/78 module/tests/handoff and no protected control-plane edits.
2. Syntax-check changed JS modules and run these focused suites (plus directly implicated tests):
   node --test docs/issue-78/v2-curator/curated-recall-candidates.test.mjs docs/issue-75/v2-candidate/relevance.test.mjs docs/issue-75/v2-candidate/relevance-priority-regression.test.mjs docs/issue-75/v2-candidate/relevance-observation-replay.test.mjs docs/issue-75/v2-candidate/memory-core.test.mjs docs/issue-75/v2-candidate/plugin-behavior.test.mjs docs/issue-78/v2-curator/production-cutover.test.mjs
3. Verify no source-context excerpt enters formatContext or emitted result, no unverified authority upgrade, no alternate group read. Capture real process exit and actual count.
4. Use the current exact-head trusted repository-final-v1 Actions receipt if available. Do not duplicate a covered trusted suite in Build. Central will dispatch/read the trusted workflow if necessary.

## Phase B — live positive remote proof and latency

5. Via existing GraphitiMcp call get_episodes with group_ids=["development-knowledge"] and max_episodes=1000. Inspect actual supported schema, returned count, unique UUIDs, group id, error/truncation and expected five episode UUIDs. No GET /mcp health shortcut. Read-only only.
6. Use the same host source index previously authenticated: /home/filip/.local/state/ghdev-graphiti; 274 review records and 165 sourced persisted UUIDs in the previous snapshot. Recheck current exact scope, file perms, native-id indexed-review match. A changed current snapshot is reported, not ignored.
7. Determine whether remote get_episodes returns the expected UUIDs. If not, distinguish API result incompleteness from actual remote deletion. Never promote an unconfirmed UUID into the candidate set. If current MCP response is not able to prove continued remote presence for useful records, the architecture is BLOCKED. Do not replace proof with local stored status alone.
8. Verify Graphiti MCP operations are SERIAL across search_memory_facts then get_episodes; only local disk-index reading may overlap remote IO. Earlier S16 host evidence documents concurrent Graphiti call instability. Measure serial and warm-versus-first-request latency of get_episodes, Graphiti d24 search and curated read/resolve separately and as a combined stage; do not introduce competing Graphiti MCP calls. Report actual hook start-to-end if the native hook exposes it; otherwise HOOK_P95=UNVERIFIED. The 300ms Promise.race timeout stays unchanged. This is not permission to raise it.
9. Verify positive readback and fully fail-closed negative behavior for wrong group, missing remote UUID, malformed remote result, private assertions and missing/weak source references. A missing caller-proven group/remote receipt is zero eligible index facts, not a fallback to stored local confidence.

## Phase C — complete one-pass exposed qualification

10. Reuse the exact private frozen input roster and 20 expected source identities (16 positives, four negatives); do not commit question text, original transcripts, private worksheet or model traces.
11. Run one complete deterministic source-bound offline replay of the staged Memory.search (not just relevanceFilter) against the real private index and actual read-only remote Graphiti episode list. The native source+index authority logic must be exercised, including Graphiti candidate retrieval and one-selected-fact admission.
12. Report for each case: candidate from Graphiti, candidate from remote-confirmed index, named/numeric/source scope, optional linked context, selected exact UUID/ref, whether proposition-equivalent but source-different, original 9/16 status, and new exposed diagnostic status. Do not rewrite frozen data or count a live git/tool answer as Graphiti memory recall.
13. Special attention S01/S03/S04/S05/S07/S10/S13 and N01-N04. Preserve S06 historical precedence. N02 policy false positive stays frozen FAIL_INJECTED; new wrong-group/secret/false-verified event is an independent blocking safety defect.
14. Report whether the hypothetical exact-source score meets >=13/16 without regression to any original passing case; if not, identify earliest remaining stage, propose ONE bounded Central source correction on the SAME PR, and stop without a new exploratory campaign. The agent is not authorized to invent/rewrite ranking architecture.
15. Where current source/probe logs expose an interface mismatch (case schema, callback parameters, path), correct the private harness or disposable test projection autonomously. Production code/test changes require a Central-staged new exact head, not local semantic edits.

## Phase D — review and evidence

16. Verify the 126-fact precision worksheet/ratification packet remains available (all agent verdicts null) and report its original hash, not a new review campaign. Human grounded precision remains UNVERIFIED.
17. Produce ONE sanitized evidence packet under EVIDENCE_ROOT with a practical small file inventory:
  README.md
  exact-head-source-tests.json
  remote-persistence-and-latency.json
  sixteen-case-offline-matrix.json
  negative-controls-and-authority.json
  central-disposition.md
  command-shape-friction.json
  SHA256-MANIFEST.txt
   Full private prompts, raw traces, credentials, user-specific text, and operator worksheet remain host private.
18. Re-read the evidence branch head immediately before Git write; require EVIDENCE_BASE unless Central explicitly updated it. Commit at most once, only in EVIDENCE_ROOT, non-force, read back parent, branch ref and file content digest manifest. No source branch mutation, PR creation/merge, production install or issue closure.
19. Return one consolidated handback containing: CAMPAIGN; exact SHA/tree and source file digests; tests and failures; remote proof counts for 165 source records and five missing UUIDs; latency n/p50/p95 methodology and first-run classification; source-authority result; per-case selection with exact source IDs and false-admissions; new exposed offline count/16 and unchanged frozen 8/16+9/16; precision status; remaining root cause; whether PR #89 is source-review-ready; evidence commit/parent/remote readback; full canonical COMMAND_SHAPE_FRICTION, unexpected host changes, and stop boundary.

## Hard stop and escalation
Stop on ambiguous candidate source provenance, live wrong-group/secret exposure, failure to prove positive remote episode identity, altered immutable benchmark input, incompatible deployed host source/config, or unsafe gate/lease interference. An ordinary recall miss, private harness formatting problem or one unavailable timing signal is a measured limitation, not grounds for expanding scope.

Do not declare PR #89 production-ready solely because tests pass. Host proof + quality/latency + independent exact-head review all remain binding before merge. Keep the existing PR draft; finish with one complete handback and stop.

## Operator kickoff
The complete authoritative instructions are in this GitHub file at the exact working-branch commit. The ChatGPT/operator-visible kickoff must be short and refer to this path, not reproduce this contract.
