# GHDEV Issue #81 — Codex P1/P2/P2 remediation, one exact-head host qualification

CAMPAIGN=ISSUE81_CODEX_REVIEW_REMEDIATION_V1
PRIMARY_AGENT=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=81
PR_NUMBER=89
IMPLEMENTATION_BRANCH=issue/81-source-recall-correction
IMPLEMENTATION_SHA=authenticate full exact GitHub SHA from operator kickoff; this complete contract must be in that tree
REVIEWED_DEFECT_HEAD=7a82f0099bd5c281a12d2377326e0671aa8d5b33
MAIN_BASE=9a27b73de882c0af6fec4d86de81945338611479
EVIDENCE_BRANCH=issue/81-recall-acceptance
EVIDENCE_EXPECTED_HEAD=7184cc0f8c9477989d5d731dfcfc8ea27caf4722
EVIDENCE_ROOT=docs/issue-78/evidence/81-codex-review-remediation-v1
GROUP=development-knowledge
PROJECT=gh_mcp
WORKSPACE=/workspace/mcp_servers/gh_mcp
GRAPHITI_ENDPOINT=http://127.0.0.1:8766/mcp

## Authority and outcome

One consolidated host-validation campaign of Central-owned source corrections to three independent Codex review findings. The complete Codex materialized review was COMMENTED at REVIEWED_DEFECT_HEAD with three unresolved comments, all adjudicated as blocking:
- P1 memory-core.mjs near 340: curated retriever rejects before remote search/proof resolves, causing unhandled rejection in strict Node;
- P2 near 348: optional 1200ms get_episodes can block an already-source-qualified legacy result past the native 300ms context allowance, even if remote proof has no relevance or is unavailable;
- P2 near 439: when a cross-encoder ranker is configured, 12 qualifying indexed records displace unsorted Graphiti results 13–24 before the reranker scores them.

Central committed all three source corrections and production-specific regressions on the existing PR branch:
1. The curated retrieval promise attaches fulfillment/rejection handlers immediately and degrades to empty candidates on failure.
2. The already-authorized legacy Graphiti source path is materialized first. Qualify curated candidate inventory before requesting remote proof; skip get_episodes when no relevant index candidates exist; optional local-index/proof wait is bounded to a **combined 70ms after the legacy path is ready**, never the 1200ms transport timeout. An unavailable/truncated/wrong-group remote proof NEVER authorizes indexed injection. A slow initial Graphiti query is not used as an arbitrary automatic ban on later fast positive indexed proof.
3. With a reranker, all 24 sourced Graphiti candidates are ranked/qualified ONCE before the 24-slot shared merge with at most 12 curated candidates, including semantic-choice admission; per-candidate scores and comparison background are reused by the final one-fact selector without issuing a second reranker HTTP call. Without a reranker, existing lexical index/Graphiti selection remains bounded and source-fenced.

These changes do not authorize changing legacy extraction, capture, curation/persistence, source identity, named/Issue/numeric/topical fences, 24-result selector capacity, 300ms actual hook allowance, group/workspace/project, legacy historical corpus or operator precision. This run must independently verify all assertions, not rely solely on Central summary.

Historical source-exact 13/16 (target >=13/16) was obtained in an exposed read-only offline replay at REVIEWED_DEFECT_HEAD's predecessor 5d6b285; a follow-up queue-only change was tested but not re-scored. All new source modifications invalidate treating that earlier score as exact-head PASS. Frozen original 8/16, post-S06 native 9/16, prior 12/16 and 13/16 remain immutable historical evidence. Human precision 126 items and actual hook p95 remain UNVERIFIED.

## Environment and permissions

Primary OpenCode Build with existing OpenViking shim, launched from a clean isolated exact-SHA worktree. Fetch live remote branch before checking objects/worktree. Preserve primary checkout and any untracked operator files.

CPU-only: source/diff inspection, test execution, scripted mocked Graphiti MCP transport, private 20-case frozen roster replay, source-index readback and sanitized evidence assembly.
Existing service-backed: serial, read-only search_memory_facts/get_episodes on loopback Graphiti; no new local LLM/model server, no persistence/mutation/curator drain. A configured reranker is optional and may be exercised only in bounded deterministic mocked transport; the effective host ranker=null replay must remain authenticated.
No native full GPU 20-case acceptance, production install, service restart, EX gate override, group rename or destructive cleanup.

Build may correct ordinary host shell, scratch path, adapter shape and private harness issues autonomously. NEVER modify/push Central production source or weaken tests/gates. A real substantive source defect is returned for Central on this same PR, not silently fixed by a local agent.

## Phase A — exact source and deterministic regressions

1. Authenticate remote main=MAIN_BASE, PR #89 remains OPEN/DRAFT and implementation ref equals kickoff full SHA. Fetch before local detached worktree creation. Authenticate the handoff file and source/test blobs. Verify diff from REVIEWED_DEFECT_HEAD to exact source is limited to the intended memory-core.mjs, relevance.mjs and memory-core.test.mjs plus THIS handoff, with 0 protected control-plane edits.
2. Read current CodeX inline review bodies at original exact SHA and inspect the actual implementation. Prove that source-index failure cannot produce a process-level unhandled rejection; the Promise rejecting before the awaited Graphiti call is handled when created. Preserve the absence of unchecked source authority for new candidates.
3. Run node --check against ALL changed/new .mjs code, then the complete directly implicated focused suites (not only the new individual tests):
   node --test \
     docs/issue-75/v2-candidate/memory-core.test.mjs \
     docs/issue-75/v2-candidate/relevance.test.mjs \
     docs/issue-75/v2-candidate/relevance-priority-regression.test.mjs \
     docs/issue-75/v2-candidate/relevance-observation-replay.test.mjs \
     docs/issue-75/v2-candidate/plugin-behavior.test.mjs \
     docs/issue-78/v2-curator/curated-recall-candidates.test.mjs \
     docs/issue-78/v2-curator/production-cutover.test.mjs \
     docs/issue-78/v2-benchmark/issue81-retrieval-feasibility.test.mjs \
     docs/issue-78/v2-benchmark/issue81-admission-audit.test.mjs
   Include other directly affected source-resolver/test consumers where current source shows a dependency. Capture actual TAP counts and raw producer exit separately, without tee/grep/RTK masking. Do not alter a failing assertion to make it green.
4. Explicit adversarial proofs required:
   - early rejection in indexed retrieval while first Graphiti call is pending >=60ms under strict unhandled-rejection behavior;
   - legacy positively sourced result with optional get_episodes rejection/stall >=400ms: same source result returns promptly (<270ms) and no index record without remote proof injects;
   - empty/irrelevant curated inventory: no get_episodes RPC at all, valid legacy result preserved;
   - a cold Graphiti search >245ms with fast positive remote episode proof still recovers index fact (optional budget measured after legacy source resolution);
   - reranker-enabled 24 Graphiti facts with semantically correct fact at #19 plus at least 12 qualified curated records: correct fact considered/selected, no >24 reranker documents, exactly ONE reranker invocation, final maxSelected=1; both orderings where applicable;
   - malformed/wrong-group/truncated episode list, absent remote UUID, secret and named/Issue/numeric fences retain fail-closed behavior;
   - multi-search shared-client FIFO and error-release invariants from prior gate remain intact.
5. Test any first-run setup differences or all-source import errors without editing production. The source-specific tests may reside under docs and are NOT automatically included in repository root npm test.

## Phase B — one complete actual-current exposed replay and bounded timing

6. Reauthenticate the immutable frozen source and input roster (16 positives + 4 negatives) SHA256 47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652. Do not modify prompts, expected sources or historical packets.
7. Authenticate current effective config/root/group/workspace/project and curated source index. Perform fresh, read-only, serial Graphiti get_episodes; require complete, group-pure positive remote evidence before any curated candidate is treated as injectible. The prior snapshot had 227 eligible episodes, but the corpus may grow. Report present cohort and any drift; do not rely on stored receipt alone.
8. Run ONE entire exposed **Memory.search** 16+4 private offline replay from the exact staged source, with true remote reads and curated resolver, ranker=null matching the effective host setting. This is needed because the optional proof timing change can affect candidate availability even with unchanged selector rules. Report exact source refs and UUIDs per case, which candidate pool selected each source, all failures, S06 temporal precedence, and S10 exact commit-subject victory. Do not equate semantically equivalent sibling facts with exact source PASS.
9. Separately verify a deterministic ranker-enabled fake transport scenario: full Graphiti set, source identity, exact group and fresh proof, 12+ curated competitors, position-19 semantic choice, score cache and one-call counter. No live reranker/LLM benchmark required unless the installed current effective config explicitly enables it (in that case stop and report scope drift).
10. Report exact-source numerator /16 and strict 13/16 gate without retroactively changing historical snapshots; N01/N03/N04 NO_INJECTION and frozen N02 FAIL_INJECTED unchanged. Any new unauthorized verified assertion, wrong group, private-marker exposure or selection of an unconfirmed UUID is independently blocking.
11. Record real p50/p95/max (n and quantile method) separately for Graphiti d24, remote proof, index read, total Memory.search and the optional 70ms grace/timed-out fraction. Source/pre-fetch timings are NOT native hook-start/end p95. Instrument actual native hook only if already supported by the current host and safe without production install; otherwise HOOK_P95=UNVERIFIED and 300ms remains binding.
12. Treat genuine timeout/fallback omissions as measured regression, not silently reclassifying them as benign. If source-score falls below 13/16, identify exact cases and earliest cause, and STOP with one complete handback. If it passes, mark HOST_CANDIDATE_READY=yes subject to Central exact-head rereview and any late Codex review within the PR lifetime budget.

## Phase C — one sanitized evidence publication

13. Revalidate existing 126-item operator packet and ratified grounded precision >=0.90 read-only. All human verdicts remain operator-owned; HUMAN_PRECISION=UNVERIFIED, no AI adjudication/worksheet write.
14. Assemble ONE self-contained sanitized packet under EVIDENCE_ROOT on EVIDENCE_BRANCH. Suggested files:
   README.md
   source-and-focused-tests.json
   codex-p1-p2-p2-regressions.json
   sixteen-case-offline-replay.json
   remote-authority-and-latency.json
   review-disposition.md
   command-shape-friction.json
   SHA256-MANIFEST.txt
   No raw private queries/assertions/excerpts, messages, credentials, operator worksheets or host secrets in Git; retain private full evidence at 0600/0700.
15. Immediately before GitHub publication, fetch EVIDENCE_BRANCH and require EVIDENCE_EXPECTED_HEAD exactly (or STOP STALE, preserve scratch). At most ONE non-force evidence-only commit, no new PR or implementation push; read back ref, parent, exact file inventory and all manifest digests.
16. Return ONE complete handback: CAMPAIGN/RESULT; exact source/head/base/tree/diff; all focused tests/count/exits; 3 Codex finding dispositions against exact source; strict unhandled rejection / slow proof / 24+12 ranked proof including one reranker-call count; 16+4 exact source matrix, score, S06/S10/N02 and privacy/fences; remote group/provenance counts; p50/p95/max and HOOK_P95; 126 precision status; remaining failure modes and risks including queued late remote operations, review readiness; evidence commit/parent/readback; full GHDEV-10 command shape friction and unexpected host changes.

No merge, no formal independent approval, no production deployment, no Issue #81 closure. Stop after publishing the packet and returning one handback. Central will independently rereview the new exact head and consider Codex manual request 2/2 ONLY when otherwise clean; the first manual request at the reviewed old SHA already consumed one slot.

## Delivery

This GitHub file is the complete authoritative execution contract. Operator-facing ChatGPT reply contains only a short kickoff with repository, branch, exact commit and this path. Do NOT treat the short kickoff as the complete instruction source.
