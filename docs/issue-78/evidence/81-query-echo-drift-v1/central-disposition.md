# Issue #81 Query-Echo Corpus-Drift Qualification — Central Disposition

Campaign: `ISSUE81_QUERY_ECHO_DRIFT_V1`
Repository: `fvanevski/opencode-operational-schema-guard`
PR: #89 (OPEN/DRAFT), implementation branch `issue/81-source-recall-correction`
Exact source: `a78ebb69926e9e4bc2e7d9c036d65501c911294e` (tree `6f212db7bce72f8f92e7429edc65d33e41433e6f`)
Pre-fix head: `d0cb07562bfdd37021de653bcbe948e993e31883`
Main base: `9a27b73de882c0af6fec4d86de81945338611479`

## The correction

Central's general anti-echo source change in `docs/issue-75/v2-candidate/relevance.mjs`
adds `toolQuestionEcho(query, item)`: a query-dependent admission guard that rejects
source-anchored TOOL observations whose fact assertion contains the normalized full
current question (>= 5 words / >= 24 chars after normalization). It is applied at BOTH
the pre-merge shortlist stage (`shortlistQualifiedCandidates`) and the final shared
admission loop (`rankedCandidates`, used by `relevanceFilter` and the reranker path
`rankQualifiedForMerge`), so a high reranker score cannot reinstate an echo. The
predicate is source-type- and query-content-based: no S10 case ID, source ref, target
UUID, commit SHA or expected answer is hardcoded. It is exclusion-only and changes no
fence, bound, output shape, serial-MCP, temporal or 300 ms contract.

## Verification

- Syntax: `node --check` passes on all changed `.mjs` (v26.13.0).
- Focused suite: **81/81 PASS, raw exit 0** (78 pre-fix + 3 new echo tests).
- Adversarial: echo excluded at both stages and not reinstated by a top reranker score;
  genuine tool-reported commit subject remains eligible; input order invariance;
  topical similarity is not an echo; short queries not echoes; message/user observations
  not rejected; named/Issue/numeric/topical/private/remote-group fences, shared-MCP FIFO
  and all prior Codex P1/P2/P2 regressions pass.
- Staged end-to-end `Memory.search` fake transport with two remotely verified curated
  TOOL records (one legitimate subject, one exact question echo): only the legitimate
  source is output, one fact, no `sourceContext`/`remoteEpisodeUuid` in output,
  read-only operation sequence `[search_memory_facts, get_episodes]` — PASS.

## S10 contaminant (read-only)

The suspect persisted record (remote episode `625b58db-d872-4582-9c25-f2d0b5a5b874`,
source `opencode:ses_e4d0f0410ffe30XXNAA9WFWqDx:tool:call_8f6609da8c549d83`) is a
tool-origin, tool-reported, single-fact persisted curation record whose fact contains
the FULL frozen S10 question under exact production normalization — a confirmed
tool-origin full question echo (`toolQuestionEcho = true`), not an EVIDENCE_CONFLICT.
The independently sourced expected commit-subject record
(`0de3cdc8-07ff-46a5-a0bc-ed7f9bc5e47b`,
`opencode:ses_e50efdb27ffep7alMZaj9wkl3x:tool:call_1e0445fde85fa221`) is a genuine
non-echo tool observation (predicate false) and is retained.

## Exposed 16+4 replay (one complete run, live read-only remote)

- Fresh pre-replay `get_episodes`: **256 episodes, group-pure, untruncated, live drift 0**
  (previous readback 256). Curation index: 256 rows, single group.
- **Score: 13/16 exact-source — strict >= 13/16 gate MET** (`HOST_CANDIDATE_READY=yes`
  subject to Central's FRESH exact-head independent rereview; not native acceptance).
- PASS: S01, S02, S04, S06, S07, S08, S09, **S10 (newly rescued by the anti-echo
  exclusion)**, S11, S12, S14, S15, S16.
- FAIL (all `FAIL_WRONG_SOURCE`, unchanged from the prior 12/16 run): **S03, S05, S13**
  — the separately proven named-entity gaps; not rescued by entity-policy relaxation.
- Negatives: N01/N03/N04 `PASS_NO_INJECTION`; **N02 frozen `FAIL_INJECTED`**
  (same-group content-policy miss, not a cross-group leak).
- S06: temporal precedence preserved (`historical/superseded`, exact source match).
- S10: contaminant present + predicate true + shortlist excludes contaminant + shortlist
  retains expected + selected source == expected source (exact match).
- Privacy/authority: no wrong-group, no private-marker exposure, no unconfirmed-UUID
  selection, no false verification.

## Latency / precision

- p50/p95/max (ms): d24 search 149/170/259 (n=18); remote proof 25/29/35 (n=17);
  index read 37/50/56 (n=20); e2e Memory.search 187/203/312 (n=20).
- 70 ms grace: 0 index-read timeouts, 2 proof timeouts (proxy). One transient e2e
  spike (312 ms) and shared-client queue head-of-line risk remain explicit.
- HOOK_P95 = UNVERIFIED (300 ms remains binding).
- 126-fact human precision packet revalidated read-only (as-of snapshot hash matches;
  all human verdict fields unpopulated): **HUMAN_PRECISION = UNVERIFIED**,
  `PENDING_OPERATOR_ADJUDICATION`, no AI adjudication.

## Result and boundary

`HOST_CANDIDATE_READY=yes` for Central's FRESH exact-head independent rereview only —
NOT native acceptance, merge, deployment, second Codex request, formal approval or
Issue #81 closure. No destructive curation edit, reclassification, Graphiti delete,
production installation. The S10 suspect record may require a later operator review;
this run did not edit, delete, rebind or quarantine it. Historical scores
(8/16, 9/16, 12/16, 13/16) remain unchanged. STOP after this consolidated handback.
