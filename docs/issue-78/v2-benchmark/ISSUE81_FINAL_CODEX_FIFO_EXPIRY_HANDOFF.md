# Issue #81 — Final Codex shared-FIFO proof expiry remediation: exact-head evidence contract

CAMPAIGN=ISSUE81_FINAL_CODEX_FIFO_EXPIRY_V1
PRIMARY_AGENT=evidence
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=81
PR_NUMBER=89
IMPLEMENTATION_BRANCH=issue/81-source-recall-correction
IMPLEMENTATION_SHA=authenticate exact current full SHA from the operator kickoff; this document is in its Git tree
CODEX_REVIEWED_HEAD=eb20f06680e3558b67a54b2b288122efe2359eba
BASE_MAIN=9a27b73de882c0af6fec4d86de81945338611479
EVIDENCE_BRANCH=issue/81-recall-acceptance
EXPECTED_EVIDENCE_HEAD=1bdd4aae63b79a66c75fe12b6be979a6745df0f8
EVIDENCE_ROOT=docs/issue-78/evidence/81-final-codex-fifo-expiry-v1/
GROUP=development-knowledge
PROJECT=gh_mcp
WORKSPACE=/workspace/mcp_servers/gh_mcp

## Single task objective / context

This contract qualifies the **only new finding** from the second and FINAL manual Codex review on exact CODEX_REVIEWED_HEAD. The existing manual Codex review cap is 2/2 exhausted. Do not request another Codex review, open a new PR, or create a side campaign. Central has implemented the substantive fix and regression tests on the same PR #89.

Codex's source-supported P2 finding: an optional get_episodes started while an earlier Memory.search waited at most 70ms. The caller's Promise.race expired but the GraphitiMcp per-client FIFO still retained or later executed the abandoned 1200ms proof request. On overlapping prompts, a 410ms proof delayed the next sourced search until ~565ms, losing native context under the unchanged 300ms hook allowance. Direct-wait protection did NOT imply actual queue/transport cleanup.

Central correction:
- GraphitiMcp.call(name,args,{deadlineMs}) accepts an OPTIONAL, absolute performance.now() deadline. Existing two-argument callers are unchanged.
- The queued call checks expiration BEFORE ensure()/tools/call. Stale optional proofs never start after another prompt's slow search.
- When a proof starts within its deadline, an AbortSignal carries the remaining budget through ensure() and the real rpc() fetch. rpc() combines that signal with the original per-request 1200ms transport timeout; an expired proof aborts actual fetch, not only its waiter.
- The FIFO advances only after the transport settles/aborts; it never permits two simultaneous MCP calls. Responses that arrive after deadline cannot authorize an indexed fact.
- Memory.search provides the SAME combined 70ms optional-index/proof budget, now passed as a deadline to GraphitiMcp.call(), while retaining its caller-side fallback race. It never upgrades missing/wrong-group/unverified proof and never delays already-sourced legacy results beyond the optional budget.
- The source-group/UUID/native-ID proof, sourceContext omission, named/Issue/numeric/privacy gate, one-fact limit, 24 candidates, optional reranker, temporal preference, and 300ms native context allowance remain unchanged.

The previously qualified exposed **13/16** at source head a78ebb69926e9e4bc2e7d9c036d65501c911294e on 256 episodes, and 82/82 focused tests at the subsequent ranker-background head eb20f06680e3558b67a54b2b288122efe2359eba, are HISTORICAL, not new-head native acceptance. The original frozen 8/16, post-S06 native 9/16, and N02 FAIL_INJECTED cannot be modified. Human durable precision (126 operator-adjudicated facts, target >=0.90) and genuine native hook p95 remain UNVERIFIED.

## Boundary and allowed work

Primary local OpenCode **evidence** through existing OpenViking shim; CPU-only source/tests and small in-memory mocked transports. Use established local read-only Graphiti calls for one new source-bound 16+4 offline replay, if corpus state remains the same; no new model/embedding server, Graphiti write, curator drain, queue modification, deployment, or native fresh-process installation. The private evidence runner already exists; do not invent another stack.

FETCH the remote branch before any local object/worktree proof; check exact SHA/main/base/PR OPEN-DRAFT. Use a collision-free detached exact-head worktree without altering operator checkout/untracked files.

Allowed autonomous host corrections: bounded private scratch, shell/test-runner invocation and fixture-assembly mechanics. NOT allowed: source/test semantic edits, source-branch push, test weakening, producer-exit masking, altered expected source IDs/roster, programmatic human verdicts, migration, EX gate bypass, formal approval, merge, Issue #81 closure, PR creation, third manual Codex request.

Evidence branch ONE non-force evidence-only CAS commit at the path above if the expected evidence ref matches immediately before write; read back exact parent/changed paths/file digests.

## A. Exact source and adversarial concurrency qualification

1. Re-fetch GitHub authoritative PR #89/main and implementation ref; verify the EXACT kickoff SHA and this handoff's immutable blob. Compare CODEX_REVIEWED_HEAD..kickoff: only memory-core.mjs and memory-core.test.mjs plus this handoff, no protected control-plane changes. Independently read source, tests and Codex finding at discussion_r4499679347.
2. Reconfirm the unchanged relative scope: call(name,args) for nonoptional requests and the 1200ms transport timeout, shared-client FIFO, 70ms optional enrichment, 300ms hook, exact group/workspace/project/remote UUID and source binding.
3. Node syntax checks:
   node --check docs/issue-75/v2-candidate/memory-core.mjs
   node --check docs/issue-75/v2-candidate/memory-core.test.mjs
4. Focused full suite preserving actual exit and TAP:
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
   Include directly implicated consumer tests only if a demonstrated new dependency requires it. Do not modify failures into PASS.
5. Independently exercise both REGRESSIONS using actual GraphitiMcp/Memory modules:
   **Queued-expiry:** First search ends promptly and queues optional get_episodes while second native fact search runs ~155ms. The first caller times out after 70ms; a third new prompt is queued. The expired proof must never start (zero corresponding get_episodes network calls), third fact query starts promptly, remote maxActive=1, FIFO and exactly-once calls maintained.
   **Active-abort:** An optional proof starts and would otherwise take ~410ms; use a fetchImpl that observes the actual AbortSignal from GraphitiMcp.rpc(). Verify it aborts within the approximately 70ms grace, then another prompt starts without waiting the full 410ms, remote maxActive=1, no index admission from canceled/missing proof, and exactly one abort (no retry).
   Confirm real fetch signal reaches both initialize/actual tools/call when applicable; no release of FIFO while a transport is still active. A fake graphiti.call that simply returns immediately is insufficient.
6. Reconfirm original Codex P1/P2/P2 tests, semantic background anti-echo test, named/Issue/numeric/remote/fail-closed privacy tests, error-release and normal two-argument Graphiti RPC semantics. No cross-session concurrency workaround that permits parallel MCP transport.
7. One OPTIONAL read-only get_status/short serial Graphiti smoke only if needed to confirm host transport, not an intentional raw concurrency assault on production. Preserve all source/group/secret fences.

## B. One current-head source-correct offline qualification, bounded latency

8. If the test suite is green, reauthenticate the frozen 16 positive/four negative private roster SHA256 47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652, private original expected episode and source refs, group development-knowledge, workspace and project. Treat the 13/16 preceding-head result as historical; no extra tuning.
9. Re-read effective installed host config and ranker=null; verify fresh current group-pure/untruncated get_episodes and source-index persisted UUID overlap. Last snapshot 256 live episodes and records. Report growth without changing targets or inferred authority.
10. Execute ONE complete exposed serial Memory.search replay S01–S16 + N01–N04 with exact staged source, live READ-ONLY Graphiti and native-source-verified curated candidate resolver. This is a CPU/service-backed offline regression of the modified proof scheduling, NOT stock-V2 fresh-process native acceptance.
11. Require the strict originally ratified exact-source >=13/16; S06 historical/superseded source, S10 genuine commit subject, S03/S05/S13 named-identity guard, N01/N03/N04 no injection, N02 historical FAIL_INJECTED, zero new private/wrong-group/unconfirmed episode/false-verified assertion. No case-specific source exceptions or score relabeling.
12. Capture p50/p95/max and n for d24 search, optional proof, source-index, full Memory.search; record percentage canceled/expired or skipped and whether multiple prompts can queue (with synthetic control only). Native HOOK_P95=UNVERIFIED unless actual hook boundaries were measured through authorized native instrumentation, and never replace with offline total.
13. Re-authenticate original 126-item operator human worksheet and target >=0.90; do not adjudicate or alter it; HUMAN_PRECISION=UNVERIFIED.

## C. One sanitized evidence packet

14. Prepare ONE sanitized packet under EVIDENCE_ROOT with README.md, source-and-tests.json, fifo-expiry-and-abort-regressions.json, exposed-16-plus-4-replay.json, remote-proof-and-latency.json, review-disposition.md, command-shape-friction.json, SHA256-MANIFEST.txt. Keep private raw questions/assertions/excerpts/native IDs/worksheets/logs/credentials on host 0600/0700. Do not publish raw user/developer content.
15. Before committing, require remote EVIDENCE_BRANCH exact EXPECTED_EVIDENCE_HEAD. One non-force evidence-only commit, re-read remote ref/parent/path diff and verify all SHA256 manifest entries. A race is STALE, no force/rebase or repeated write.
16. Return one handback: CAMPAIGN/RESULT; exact head/tree/base; source+test blobs; all focused test counts/exits; queued-proof skip and active-fetch cancellation timing/call order/maxActive, no source authorization from abandoned proof; 16+4 exact-source source IDs and strict score; current corpus and remote authority; hook/precision statuses; earlier Codex issue 3 dispositions and current P2; evidence commit/parent/readback; GHDEV-10 actual command shapes, guards/exits, and unexpected host changes.

## Decision boundary

If the actual deadline/abort regressions and full source test suite PASS, current exposed recall >=13/16, safety/provenance checks PASS, return HOST_REVIEW_READY=yes **for a fresh Central exact-head rereview**, not GitHub approval, merge, installation, native final acceptance or closure. If a test fails or score falls below target, give the one earliest factual blocker, do not stage another campaign or alter selectors. Manual Codex requests 2/2 consumed; no further request without explicit operator authorization.

This GitHub file is the COMPLETE authoritative agent contract. The user/operator sees only a short kickoff with full exact branch SHA and this file path.
