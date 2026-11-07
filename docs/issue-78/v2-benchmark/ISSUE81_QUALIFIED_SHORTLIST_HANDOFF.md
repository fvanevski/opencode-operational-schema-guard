# Issue #81 — Complete Build handoff: qualified Graphiti + curated-index shortlist

CAMPAIGN=ISSUE81_QUALIFIED_SHORTLIST_V1
LOCAL_AGENT_PRIMARY=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=81
PR_NUMBER=89
IMPLEMENTATION_BRANCH=issue/81-source-recall-correction
IMPLEMENTATION_SHA=retrieve and prove exact remote head containing this document; operator kickoff pins the full SHA
CONTROLLER_BASE_SHA=9a27b73de882c0af6fec4d86de81945338611479
PRIOR_CENTRAL_SOURCE_SHA=690b48d695ed4ad87e63e8fcd9b775da8568c6e2
EVIDENCE_BRANCH=issue/81-recall-acceptance
EVIDENCE_EXPECTED_HEAD=53df326e5d9540275ac4f92fd57ff1a5c30828e6
EVIDENCE_ROOT=docs/issue-78/evidence/81-qualified-shortlist-v1
GROUP=development-knowledge
PROJECT=gh_mcp
WORKSPACE=/workspace/mcp_servers/gh_mcp
GRAPHITI_ENDPOINT=http://127.0.0.1:8766/mcp

## One-campaign objective

Independently validate the latest Central-authored, source-bound recall fix on existing draft PR #89 and return one complete implementation-readiness packet. Earlier fixed measurements: 8/16 original frozen; 9/16 native after S06; 11/16 offline on the previous PR #89 head. New offline results are exposed diagnostics, NOT independent native acceptance. Required source-correct >=13/16, zero wrong-group/secret/false-verified, original one-fact output and 300 ms context allowance. Human durable precision (126 items) remains UNVERIFIED pending operator adjudication.

The Central change repairs the verified shortlist bug: the old split retained only raw Graphiti candidates 1-12 (discarding a relevant result at index 19) and up to 12 index candidates ranked before mandatory relevance checks. The replacement applies the existing source-aware relevance/identity/temporal admission before shortlisting, retains up to 24 candidates across Graphiti and independently source-qualified, fresh-remote-confirmed curated index, and prevents arbitrary index ordering from consuming the candidate budget. Contextual evidence is NEVER a new injected fact. With an optional independent reranker, retain complete bounded Graphiti candidates to preserve supported semantic-choice admission. Existing hard numeric/Issue/name, source/group/workspace/project, remote membership, source-strength/privacy and one-fact/timeout guards still apply.

Do not redesign ranking, invent semantic aliases, change the ratified target, or split this into multiple campaigns.

## Allowed and forbidden authority

ALLOWED: detached clean worktree materialized from the exact fetched PR head; host source/config readback; focused Node tests and already-supported deterministic checks; serial, read-only Graphiti MCP queries; private 0600 source-bound adapter and one exposed 16-positive/4-negative offline Memory.search replay; one bounded fresh process trace only if needed for specific hook timing and safe under the canonical OpenViking lease; read-only curator/episode index; disposable harness fixes, diagnostics and sanitized evidence assembly; at most ONE evidence-only commit on the existing evidence branch after exact-head CAS preflight.

FORBIDDEN: any semantic production source/relevance/test weakening, implementation branch push, changed production plugin/config/service, Graphiti add/delete/retry/queue mutation/group migration, EX lease bypass or detached workaround, source-index authority upgrade without remote proof, PR merge/create, issue closure, frozen result rewriting, AI filling human precision verdicts. Unexpected owner working-copy files must be preserved. Routine shell/output parsing and private harness corrections are autonomous, not a reason to stop.

CPU-only: worktree, Node/unit tests, source resolver/index readback, private offline replay and evidence. Existing service-backed, GPU-embedding capable: serial Graphiti get_episodes/search_memory_facts. Native GPU/model-backed: only if a bounded hook telemetry validation is truly needed, can be run safely after the Build harness releases the EX lease, and uses a genuinely fresh OpenViking-managed client. Do NOT launch a 20-case native acceptance campaign against an unmerged source.

## A. Exact authority and source tests

1. Read this full contract and the centrally changed files at the fetched exact branch head. Authenticate current GitHub PR #89 head/base, remote main, tree and diff. If PR moved from kickoff SHA, report STALE; never silently switch to the new head. Work in an isolated worktree without resetting the primary checkout.
2. Re-read the preceding immutable evidence packet at commit 53df326e5d9540275ac4f92fd57ff1a5c30828e6; its 51/52 focused-suite failure, 11/16 offline result, 214/214 live UUID matches, and source/timing readbacks are the control population.
3. Inspect the new exact-head implementation and independently check:
   - received Graphiti fact 13–24 is usable, fact 25 is excluded;
   - mandatory relevance/issue/numeric/name/privacy gates precede the **source-index** candidate shortlist, not after it;
   - Graphiti and curated candidates share 24 total final selector slots; no expansion beyond authorized bound;
   - only 1 fact is selected by default; provenance, group, project, workspace and remote episode must remain exact;
   - sourceContext (excerpt), remoteEpisodeUuid, workspace, project and group are not emitted in final model context;
   - Graphiti MCP calls are SERIAL; local disk read may overlap the one in-flight remote query;
   - optional reranker still supports bounded semantic-choice paraphrases and degrades safely on failure;
   - no new extraction, curation, mutation or direct model service path.
4. Run node --check against every changed/new .mjs module. Run the exact focused set:
   node --test \
     docs/issue-78/v2-curator/curated-recall-candidates.test.mjs \
     docs/issue-75/v2-candidate/relevance.test.mjs \
     docs/issue-75/v2-candidate/relevance-priority-regression.test.mjs \
     docs/issue-75/v2-candidate/relevance-observation-replay.test.mjs \
     docs/issue-75/v2-candidate/memory-core.test.mjs \
     docs/issue-75/v2-candidate/plugin-behavior.test.mjs \
     docs/issue-78/v2-curator/production-cutover.test.mjs \
     docs/issue-78/v2-benchmark/issue81-retrieval-feasibility.test.mjs
   Include directly affected source-resolution/curator tests if needed. Capture true process exits and actual TAP counts; do not hide producer failure behind tee/grep.
5. Reuse exact-head CI and trusted Verify if complete. Do not duplicate the whole repository suite just to create another receipt. Never call all tests PASS when an additional directly relevant test fails.

## B. Fresh positive remote authority

6. Verify current installed config and the curated root:
   /home/filip/.local/state/ghdev-graphiti,
   group development-knowledge, project gh_mcp, workspace /workspace/mcp_servers/gh_mcp. The previous snapshot had 358 review records and 214 persisted remote UUIDs; report any drift, do not assume this count remains fixed.
7. MCP get_episodes group_ids=[development-knowledge], max_episodes=1000. Require structurally complete, untruncated, group-pure positive UUID readback before counting a curated record as remotely eligible. Preserve exact native-id evidence-class/source-index receipt; do not equate local persisted receipt with current remote identity.
8. Confirm every previously missing expected UUID (S03/S05/S07/S10/S13) remains remote-positive when testing. If remote proof is unavailable, preserve it as a BLOCKED source-authority observation; do not substitute local confidence.

## C. One complete exposed offline Memory.search replay

9. Reuse the same frozen 16-positive/4-negative roster (SHA256 47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652), exact prompt/expected episode/source identity and unchanged original snapshots. Use the staged Memory.search plus the full scope-bound curatedCandidateRetriever and actual positive remote readback (or exact snapshot backed by this campaign's validated remote list). Do not merely call relevanceFilter with hypothetical candidates and report that as integrated recall.
10. Execute cases serially with immutable input identities. Account for natural corpus growth; report current snapshot vs frozen native distinction.
11. For each of S01–S16 and N01–N04 report original/native verdict, incoming Graphiti fact count and source UUIDs, eligible Graphiti candidate count/order, eligible curated candidate count/order, combined 24-slot shortlist, final selected source UUID/ref and evidence class, and why expected source passed or failed. Keep raw prompts/facts privately.
12. Score exact-source only against frozen expected identities. Record separately proposition-equivalent alternate sources, NOT as automatic PASS. Preserve 9 preexisting source-correct cases and S01/S04 recovered cases. S06 historical/temporal source preference must remain correct. The target is >=13/16, but no tuning to frozen identifiers/answers is authorized.
13. Negative cases N01/N03/N04: NO_INJECTION. N02 retains historical FAIL_INJECTED and same-group policy status, without claiming new cross-group leakage. Any new secret/wrong-group/false-verified source disclosure is an independent BLOCKER. If replay is still below 13/16, identify the earliest remaining failure for each case with exact source provenance, without starting another exploratory campaign.

## D. Timings and stop boundaries

14. Measure first-call vs warm serial Graphiti search and remote proof, curated scan/resolve, and the joined Memory.search end-to-end. State n, quantile definition and censored cases. Current previous probes observed first 143 ms search, first 60 ms remote proof, and 50 ms curation, but those are distinct operations, NOT an accepted native-hook measurement.
15. Preserve the unchanged 300 ms native context Promise.race. If hooked timing is available, report native hook p50/p95. If it is unavailable, report HOOK_P95=UNVERIFIED; never substitute startup-to-first-model-request or only MCP timing. A consistently slow candidate or failed injection within 300 ms is a release blocker, not authorization to raise the bound.
16. Only if a precise fresh-session hook trace is necessary and safe, stage one minimal bounded operator-run after the Build harness exits. It remains within this SAME campaign, not another handoff. No EX bypass, manual queue reset, synthetic service/controller, or competing GPU model work.
17. Human durable precision: authenticate existing private 126-item packet/worksheet and ratified thresholds. Preserve human_verdict=null; report readiness, no AI-generated signatures/verdicts. Independent review remains separate from this host qualification.

## E. Evidence and one-shot handback

18. Publish ONE self-contained sanitized packet under EVIDENCE_ROOT on EVIDENCE_BRANCH with concise artifacts:
   README.md
   source-and-tests.json
   candidate-shortlist-replay.json
   remote-authority-and-latency.json
   negative-and-fence-readback.json
   central-disposition.md
   command-shape-friction.json
   SHA256-MANIFEST.txt
   Record case-level UUIDs/source identities and per-stage counts, but not private prompts/full fact text/raw model messages/user review worksheet/secrets. Private raw logs are 0600 outside Git.
19. Immediately before Git write reauthenticate remote evidence branch head equals EVIDENCE_EXPECTED_HEAD. If it advanced, retain packet and STOP publication STALE rather than rebase/force or duplicate commit. Allow only one non-force evidence commit, parent exact old evidence SHA. Read back ref/commit/parent/file inventory/full manifest hashes. Do not modify the implementation branch, start another PR, merge or close #81.
20. Return one complete handback:
   CAMPAIGN, RESULT, exact source SHA/tree/blobs/diff; focused tests/count/process exits; trusted Verify receipt; remote proof counts and all five missing UUIDs; candidate budget/eligibility proof; complete 16+4 cases with exact selected/expected source identities; PASS count/16 and strict 13/16 verdict; negative controls and source-context leak status; S06 and S01/S04 regressions; Graphiti/index/total latency p50/p95/n and HOOK_P95 or UNVERIFIED; 126 human status; precise remaining root cause; PR89_READINESS=YES|NO; evidence commit/parent/remote readback; canonical COMMAND_SHAPE_FRICTION (requested/effective shape, source and classification of any rewriting, actual effect), unexpected host changes, stop boundary.
21. If 13/16 is reached in the exposed offline replay with tests/fences pass, report PR89_HOST_REVIEW_READY=yes, but DO NOT claim native acceptance or authorization to deploy. Central independently reviews exact SHA before merge; fresh native acceptance still follows approved deployment. If <13/16 or tests fail, return the smallest correct source-level remaining defect for Central, without another side campaign.

## Final constraints
No scoring-rule changes, test disabling, silent source equality promotion, secret leakage, EX lease bypass or production changes. Complete the whole available task with autonomy over ordinary local tooling and fixture adaptation; return only one complete handback.

The complete GitHub file is authoritative. The ChatGPT/operator kickoff merely identifies this branch/SHA/path and must not reproduce this detailed contract.
