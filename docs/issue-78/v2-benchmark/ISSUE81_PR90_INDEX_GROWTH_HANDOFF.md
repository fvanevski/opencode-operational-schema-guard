# Issue #81 / PR #90 — curated index growth correction: one host verification

CAMPAIGN=ISSUE81_PR90_INDEX_GROWTH_VERIFICATION
PRIMARY_AGENT=build
REPO=fvanevski/opencode-operational-schema-guard
ISSUE=81
PR=90 (existing draft; never create another)
BRANCH=issue/81-semantic-recall
INDEX_FIX_SOURCE_COMMIT=defb9da668cae03dcdbaa9255b7ed5cfdf296fd2
ROOT_MAIN_BASE=6e5695da91974447c718e99757bc8a84d9de3e9d
EXACT_KICKOFF_COMMIT=<full SHA in kickoff; must contain this document>
PRODUCTION_GROUP=development-knowledge
WORKSPACE=/workspace/mcp_servers/gh_mcp
PROJECT=gh_mcp
GRAPHITI=http://127.0.0.1:8766/mcp
EVIDENCE_ROOT=evidence/issue81-semantic-recall/index-growth-verification/

## Objective and existing evidence

One cohesive, read-only host verification of the Central-owned fix to the 288-episode blackout and 500-review single-page failure. The previously authenticated production group had 498 review records, 299 eligible persisted episodes, and returned zero curated-index rows for all 20 exposed queries. Frozen roster SHA256: `47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652`. Previous strict/semantic exposed result was 10/16 source-exact each; S03/S05/S07/S10/S13 index-inventory miss, S04 final-rank miss; negatives N01 semantic 1 irrelevant same-group fact, N02 3 same-group content-policy facts, N03/N04 zero. The 126-fact human precision worksheet still has 0/126 human verdicts. Do not replace these with inferred success.

## Scope and authority

- Primary Build in a fresh isolated exact-head worktree. Operator fetches and authenticates this document/branch. Do not reset or alter the previous worktree.
- CPU-only source/tests, private corpus lookup, local benchmark analysis and evidence scrubbing. Existing loopback Graphiti is **read only** (`initialize`, `search_memory_facts`, `get_episodes`), serialized. Existing embedding calls may use the resident GPU; do not start inference, TTS, curator, extra LLM, EX worker or a second service.
- No production plugin/config/unit changes, Graphiti mutation, remote writes/retries, queue drain, group migration, corpus/target edits, source/test/scorer semantics changes, PR creation, merge, review approval or issue closure.
- Agent may resolve routine shell, path, scratch, local report and invocation errors autonomously, including a bounded private probe adapter. Do not 'fix' a source-exact miss by substituting an expected source.
- Preserve the strict `relevance.mjs` baseline and security, native source, group, workspace, project, current remote episode, temporal/authority and privacy fences. No use of non-source-model hallucinations as evidence.

## Execute in one campaign

1. **Authenticate.** Refresh GitHub refs and PR #90. Verify remote branch == EXACT_KICKOFF_COMMIT, `main` == ROOT_MAIN_BASE or report STALE, and INDEX_FIX_SOURCE_COMMIT is its ancestor. Prove clean isolated worktree, repository source blobs and scope. Locate the existing frozen roster and private source-evidence packet by checksum; do not reconstruct missing private facts.
2. **Focused verification.** Run `node --check` for changed executables: `docs/issue-78/v2-curator/curated-recall-candidates.mjs`, `docs/issue-78/v2-candidate/plugin.mjs`, `docs/issue-75/v2-candidate/memory-core.mjs`, plus changed tests. Run one complete `node --test` invocation for `docs/issue-78/v2-curator/curated-recall-candidates.test.mjs`, `docs/issue-75/v2-candidate/semantic-recall.test.mjs`, `docs/issue-75/v2-candidate/semantic-memory-integration.test.mjs`, `docs/issue-75/v2-candidate/memory-core.test.mjs`, `docs/issue-75/v2-candidate/plugin-behavior.test.mjs`, and `docs/issue-78/v2-curator/production-cutover.test.mjs`. Do not trust root Actions `npm test` as focused coverage: the root 524-test profile is separate. Reuse exact-head Actions `npm run check` + `npm test` only if complete and successful; no unnecessary rerun.
3. **Verify real growth boundary.** Read existing production review counts, then invoke the corrected `curatedRecallCandidates` with exact group/workspace/project and both `strict`/`semantic` query arguments on original authenticated cases. Confirm that the index now returns source-verified, positive candidates rather than `[]` due to inventory size; prove hard group, source-class, local episode-index, and **fresh remote get_episodes** checks remain positive and that malformed/wrong-scope rows never enter the model. No production writes, even to repair unexpected local state.
4. **One serial exposed replay.** Reuse original 16 positive/4 negative queries and immutable expected source refs from the verified private roster. Use `docs/issue-78/v2-benchmark/issue81-semantic-replay.mjs` for paired strict/semantic `Memory.search`, and the unchanged `score-semantic-replay.mjs` scorecard. Run one invocation per query, preserve exact-source SHA256 comparisons, source category, temporal label and item rank. Record 16-case numerators, per-miss stage including S03/S05/S07/S10/S13 and S04, prior strict→semantic regression count, N01/N02 same-group irrelevant-context cost, and N03/N04 privacy/length 0/0. Preserve original comparison 10/16 and the separate historical 13/16; do not retroactively rewrite either. Target >=13/16 and >=90% human durable precision remain unmodified, and a miss is a FAIL/coverage gap, not a reason to tune the roster.
5. **Latency and precision.** Record index scan/lookup timings and total shadow `Memory.search` p50/p95/max with sample size and percentile definition; distinguish timeout/censoring. Native context-hook p95 is UNVERIFIED before deployment. Reuse the prepared private 126-item operator batch without reauthoring verdicts; give the operator the complete navigable batch when available for manual adjudication, but do not have the local agent sign, approximate, or fill human judgments. If none are supplied, HUMAN_PRECISION=PENDING_OPERATOR_REVIEW, 0/126. Reuse prior read-only CLI/portal findings; do not repeat live mutation or host-service campaigns.
6. **Publish once and hand back.** Produce a sanitized packet in EVIDENCE_ROOT: README, exact-source-and-tests, replay-matrix (20 entries; hashes, count, hit/rank, stage only), index-growth-and-safety, timing-and-quality, GHDEV-10 command-shape-friction, SHA256-MANIFEST. Raw queries, assertions, private reviews, UUID mappings, secrets and model requests remain host-private 0600. Verify manifest and sensitive-field absence. Before the sole allowed evidence commit, re-read exact remote head and require EXPLICIT kickoff SHA (or exact expected head after an authorized Central advancement). One non-force fast-forward evidence-only commit, read back parent/ref/path inventory/hashes, no changes to source/tests. If source correction is required, return reproduction; do not edit it locally.

## Typed consolidated handback

CAMPAIGN; RESULT=PASS_REVIEW_READY|PARTIAL|BLOCKED; SOURCE_HEAD; SOURCE_TREE; BASE_SHA; FOCUSED_TESTS (producer exits/counts); EXACT_HEAD_CI; REVIEW_RECORDS; ELIGIBLE_EPISODES; INDEX_RETURN_COUNTS_AND_PROOF; STRICT_SOURCE_EXACT; SEMANTIC_SOURCE_EXACT; POSITIVE_16_CASE_MATRIX; NEGATIVE_N01_N04; RETAINED_S04_OR_OTHER_MISSES; GROUP_SOURCE_PRIVACY=PASS|FAIL; INDEX_AND_SHADOW_TIMINGS; NATIVE_HOOK_P95=UNVERIFIED; HUMAN_PRECISION/VERDICTS; PORTAL_CLI_REUSE; PRODUCTION_MUTATIONS=none; EVIDENCE_COMMIT/PARENT/REMOTE_READBACK; COMMAND_SHAPE_FRICTION (full GHDEV-10 schema); CENTRAL_SOURCE_DEFECT_IF_ANY; NEXT=Central independent PR review and possible one cohesive source correction if evidence warrants.

Stop after this single campaign. Source-correct evidence establishes review readiness, **not** native fresh-process acceptance, installation, merge authorization or closure of #81/#78. A rollback-preserving merged-main deployment followed by a genuinely new client/native session remains separate under GHDEV-06.