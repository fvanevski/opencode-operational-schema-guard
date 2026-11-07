# Issue #81 — Complete Build handoff: corpus drift and tool-question echo

CAMPAIGN=ISSUE81_QUERY_ECHO_DRIFT_V1
PRIMARY_AGENT=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=81
PR_NUMBER=89
IMPLEMENTATION_BRANCH=issue/81-source-recall-correction
IMPLEMENTATION_SHA=the exact full GitHub SHA supplied in the operator kickoff; this document must exist in that immutable tree
PRE_FIX_HEAD=d0cb07562bfdd37021de653bcbe948e993e31883
MAIN_BASE=9a27b73de882c0af6fec4d86de81945338611479
EVIDENCE_BRANCH=issue/81-recall-acceptance
EVIDENCE_EXPECTED_HEAD=b60355ebd5600f63c08c30838de51721e645325b
EVIDENCE_ROOT=docs/issue-78/evidence/81-query-echo-drift-v1
GROUP=development-knowledge
WORKSPACE=/workspace/mcp_servers/gh_mcp
PROJECT=gh_mcp
MCP_URL=http://127.0.0.1:8766/mcp

## Objective, evidence and Central-owned policy

Run ONE bounded host qualification of the Central-authored general anti-echo source correction on the existing draft PR #89. No subcampaigns, new PRs or benchmark tuning. At PRE_FIX_HEAD the complete focused tests passed 78/78 and all three previously identified Codex P1/P2/P2 defects were regression-protected. The new live corpus produced 12/16 source-correct exposed offline, below the fixed >=13/16 requirement. Comparison with the previous Codex-reviewed implementation on the SAME 256-episode corpus yielded the same 12/16 outcomes, supporting corpus drift, NOT the Codex remediation, as the cause. The earlier 13/16 on a 227-episode corpus remains historical and may not be treated as current-head acceptance.

The identified S10 contaminant was a persisted, source-indexed, remotely present TOOL diagnostic record whose asserted text contains the FULL frozen S10 question and expected answer text. A tool output that merely echoes a question and its putative expected answer is not independent evidence that the answer is correct, even when native-source provenance and remote persistence are authentic.

Central's new production change in issue-75 relevance.mjs is conservative and general:
- toolQuestionEcho detects tool-origin native source observations whose fact assertion contains a normalized full current question, requiring at least 5 words and 24 characters.
- Both shortlistQualifiedCandidates and final relevanceFilter/reranker admission apply the same exclusion. No known case name, source ref, target UUID, commit SHA or benchmark expected answer is hardcoded.
- Genuine tool results without a full-question echo, user or assistant observations, and every original named/Issue/numeric/topical/private/group/source eligibility fence retain their prior contracts.
- Persisted curation reviews and Graphiti episodes remain untouched. The suspect record may require a later operator review; this run is NOT authorized to edit, delete, rebind or quarantine it.
- The 24-candidate bound, one-fact output, serial MCP, bounded optional remote membership proof, temporal scope and 300ms native context allowance remain unchanged.

S03/S05/S13 have separately proven named-entity gaps and must NOT be rescued by entity-policy relaxation. N02 remains frozen FAIL_INJECTED, independently classified as a same-group content-policy miss, not a cross-group leak. The 126-fact human precision adjudication remains operator-owned and UNVERIFIED.

## Environment and permissions

Run Build through existing OpenViking-managed shim. FETCH exact branch ref first, prove GitHub head/base/tree/contract, then create a noncolliding isolated detached worktree at that exact SHA. Do not reset, clean, switch or modify the owner's primary checkout/untracked files.

CPU: review source and Node tests, inspect read-only current curation index, authenticate private roster, run one serial existing private Memory.search replay, assemble sanitized report. Read-only service backed: the existing localhost Graphiti get_episodes/search_memory_facts. Do not start a GPU model, curator, worker, server, new runner, or fresh native 20-case acceptance.
Allowed: scoped private scratch/adapter and mechanical shell fixes, focused tests, bounded current-state readback, one sanitized evidence commit under EVIDENCE_ROOT on EVIDENCE_BRANCH after exact CAS.
Forbidden: implementation-branch writes, production source or semantic test edits, acceptance/fixture weakening, source-ID blocklist, installed plugin/config/service changes, Graphiti or curation CRUD, EX lease bypass, PR creation/merge, issue closure, human verdict edits and broad host-wide recursive searches.

## Phase A — exact identity, source inspection and tests

1. Authenticate current remote main=MAIN_BASE, PR #89 OPEN/DRAFT and branch at the EXACT kickoff SHA. Read this contract and inspect the complete PRE_FIX_HEAD-to-head diff. Require only relevance.mjs, relevance.test.mjs, memory-core.test.mjs and this handoff changed; zero protected control-plane edits. Read source, not just commit summaries.
2. Confirm the new question-echo predicate is source-type- and query-content-based, not based on the S10 expected source or on a frozen case ID. Confirm it is used in the shortlist AND final ranking, including the configured reranker path; it cannot admit a previously ineligible fact, reveal context excerpts or weaken source/group/safeText.
3. Run node --check on all changed .mjs files. Run the complete directly implicated suite, retaining literal producer exit/TAP totals:
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
   Add only directly dependent source tests if needed. No masked producer exit, test skip/weakening, or redundant broad npm suite. Central obtains trusted Actions Verify at exact SHA separately.
4. Adversarial tests must prove: full-query tool echo is excluded at BOTH ranking stages and cannot be reinstated by a high reranker score; a genuine tool-reported commit subject remains eligible; candidate input order does not reverse this; mere topical similarity is not a full echo; a short query is not treated as a full echo; message/user observations are not indiscriminately rejected; source/Issue/numeric/named/private/remote-group fences, shared-MCP FIFO and prior Codex P1/P2/P2 regressions still pass.
5. Inspect the staged end-to-end Memory.search fake transport regression with two remotely verified curated TOOL records (one legitimate subject, one exact question echo). Expect only the legitimate source, one output fact, no sourceContext/remoteEpisodeUuid output, and correct read-only Graphiti operation sequence. A failure blocks replay/readiness; return the unaltered defect to Central.

## Phase B — one exposed 16+4 replay, current authority and provenance inspection

6. Reauthenticate frozen 16-positive/four-negative roster SHA256:
   47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652
   plus original expected source refs/UUIDs; never edit or reinterpret the frozen questions or labels.
7. Read current effective group/project/workspace and scoped curation root /home/filip/.local/state/ghdev-graphiti. Previous readback had 256 persisted index records and 256 group-pure Graphiti episodes. Obtain fresh, untruncated, group-pure remote get_episodes before treating ANY curated episode as remotely current. Report live drift, no guess about continued membership.
8. Inspect READ-ONLY the single suspect S10 record for remote episode UUID 625b58db-d872-4582-9c25-f2d0b5a5b874 and the independently sourced expected commit-subject record. Report ONLY sanitized fields: origin, event kind, evidence class, native tool versus message, source-ref/index match, single-fact/persisted status, and whether the fact contains the full frozen S10 question under exact production normalization. Keep all raw private text and original records on host. If the record is not a tool-origin full question echo, report this as EVIDENCE_CONFLICT rather than manufacturing a PASS.
9. Run ONE full source-bound serial Memory.search replay of S01-S16 and N01-N04 using current exact source, the original authenticated private runner, ranker=null from current effective config, read-only Graphiti and live-positive curated index. No manual source injection, keyword workaround, or relevanceFilter-only replacement.
10. For S10 verify: current contaminant presence, predicate true/false, rejection at shortlist/final selector, genuine expected subject retained, actual selected episode/source and exact match. Report all cases strictly by original expected IDs; preserve S06 historical/superseded, S03/S05/S13 named-identity failures, N01/N03/N04 no-injection, N02 original FAIL_INJECTED. No wrong-group/secret/unconfirmed-UUID injection or false verification.
11. Record new exact-source score /16 and strict >=13/16 gate. Keep previous 8/16, 9/16, 12/16 and 13/16 scores historical. If below threshold or new regression, return earliest real cause and stop; do not tune to expected case IDs.
12. Measure serial Graphiti d24, index scan, remote proof, optional 70ms grace, total Memory.search p50/p95/max with sample counts and quantile convention. HOOK_P95 remains UNVERIFIED unless actual native context start/end measured by supported tools. The 300ms Promise.race is unchanged. Keep transient spikes and queue head-of-line risk explicit.
13. Read-only reverify the original 126-fact grounded-precision packet/ratified >=0.90 target; all human verdict fields must remain null, HUMAN_PRECISION=UNVERIFIED. Do not perform AI adjudication.

## Phase C — one evidence-only publication and handback

14. Publish ONE sanitized packet under EVIDENCE_ROOT, suggested README.md, source-and-tests.json, tool-echo-authority.json, sixteen-case-replay.json, timing-and-precision.json, central-disposition.md, command-shape-friction.json and SHA256-MANIFEST.txt. Never publish raw prompts/assertions/excerpts/messages, source files containing private content, credentials, human worksheet or host logs; retain privately at 0600/0700.
15. Immediately before GitHub write, re-fetch EVIDENCE_BRANCH and require EVIDENCE_EXPECTED_HEAD. One non-force evidence-only commit at most; independently read back branch ref, parent, changed paths and manifest hashes. STOP STALE on a moved head; no force/rebase/new PR.
16. Return ONE complete handback with exact SHA/tree/base; source/test blob hashes and TAP counts/exits; live 16+4 source matrix and strict gate; provenance/echo predicate booleans and S10 selected vs expected; current remote index/episode count; S06/N02, privacy/authority; p50/p95/max/HOOK_P95; human precision state; current/remaining hygiene risk; one evidence commit/parent/readback; canonical GHDEV-10 command-shape friction including any guard rejection and producer exit; unexpected host changes and final readiness boundary.

## Stop and next boundary

If source tests green and current exposed score >=13/16 with no regression: report HOST_CANDIDATE_READY=yes for Central's FRESH exact-head independent rereview only, not native acceptance or merge. If failure: report exact source-backed blocker with no further campaign. No destructive curation edit, reclassification, Graphiti delete, production installation, second Codex request, formal approval or Issue #81 closure. STOP after the consolidated handback.

This GitHub file is the full authoritative local-agent handoff; the operator-facing kickoff must be brief and reference repository, branch, full SHA and this path only.
