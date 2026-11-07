# Issue #81 Codex Review Remediation — Review Disposition

Campaign: `ISSUE81_CODEX_REVIEW_REMEDIATION_V1`
Repository: `fvanevski/opencode-operational-schema-guard`
PR: #89 (OPEN/DRAFT), implementation branch `issue/81-source-recall-correction`
Exact source: `d0cb07562bfdd37021de653bcbe948e993e31883` (tree `eac99ee9bbf06ff0f0f535b243560a0d5138fe89`)
Reviewed defect head: `7a82f0099bd5c281a12d2377326e0671aa8d5b33`
Main base: `9a27b73de882c0af6fec4d86de81945338611479`

## Codex finding dispositions (against the exact source)

| Finding | Defect | Source correction | Regression proof | Disposition |
|---|---|---|---|---|
| P1 (comment 4498775396) | Curated retriever rejection unhandled while Graphiti search pending → process-level unhandled rejection in strict Node | `indexedWork` attaches fulfillment/rejection handlers at creation; degrades to `[]` | "early curated retriever rejection is safely handled during a slower Graphiti search" — PASS, exit 0 | FIXED_AND_REGRESSED |
| P2 slow-proof (comment 4498775401) | Optional 1200 ms `get_episodes` blocks already-sourced legacy results past the 300 ms hook allowance | Legacy path materialized first; optional enrichment bounded to a combined 70 ms window after legacy readiness; `get_episodes` only when a qualifying pre-proof shortlist exists and budget remains; immediate rejection handler | "slow optional proof cannot delay an otherwise sourced legacy result" (<270 ms), "optional remote proof is skipped when curated source inventory has no qualifying facts" (no RPC), "a slow initial Graphiti search does not discard fast positive indexed proof" — all PASS, exit 0 | FIXED_AND_REGRESSED |
| P2 reranker truncation (comment 4498775406) | 12 qualifying indexed records displaced unsorted Graphiti positions 13–24 before reranker scoring | `rankQualifiedForMerge` scores all 24 Graphiti candidates once pre-merge; scores/background cached and reused by the final one-fact selector (no second reranker HTTP call) | "reranker scores all 24 Graphiti facts before merging 12 indexed facts, only once" (input 24, calls 1, position-19 selection) — PASS, exit 0 | FIXED_AND_REGRESSED |

All three Codex findings are fixed in the exact source and regression-protected. The full directly implicated focused suite passes 78/78 (raw exit 0); `node --check` passes on all changed `.mjs`.

## Exposed 16+4 offline replay (one complete run, live read-only remote)

- Score: **12/16 exact-source PASS against the strict 13/16 gate — gate NOT met** (`HOST_CANDIDATE_READY=no`).
- Passing: S01, S02, S04, S06, S07, S08, S09, S11, S12, S14, S15, S16.
- Failing (all `FAIL_WRONG_SOURCE`): **S03, S05, S10, S13**.
- Negatives: N01/N03/N04 `PASS_NO_INJECTION`; N02 frozen `FAIL_INJECTED` (unchanged, separately classified same-group policy issue).
- S06 temporal precedence: selected fact carries `temporal: historical/superseded` and the exact expected source ref — protected.
- S10: exact commit-subject win NOT achieved; the selected curated-index row is a diagnostic-probe artifact (see below).
- Privacy/fences: no new unauthorized verified assertion, no wrong-group selection, no private-marker exposure (N03 clean), no unconfirmed-UUID selection; all selected sources resolved via legacy resolver or curated index with fresh remote proof.

### Attribution (A/B on the same live corpus)

The identical replay harness re-run against `7a82f00` (REVIEWED_DEFECT_HEAD) on the current 256-episode corpus produces **per-case identical** outcomes (12/16, same S10 selection). The Codex remediation therefore introduced **zero per-case delta**.

Earliest cause of the 13/16 → 12/16 delta (S10):
- The curated index grew 227 → 256 rows since the 13/16 snapshot at `5d6b285`.
- The new cohort contains an S10 diagnostic-probe artifact row (source `opencode:ses_e4d0f0410ffe30XXNAA9WFWqDx:tool:call_8f6609da8c549d83`, remote episode `625b58db-d872-4582-9c25-f2d0b5a5b874`) whose fact text embeds the S10 question and expected commit subject verbatim; it lexically displaces the exact expected tool-reported commit-subject source.
- S03/S05/S13 were already failing at the 13/16 snapshot (selector-policy gap, unchanged).

This is a **measured corpus-drift regression, not a defect in the Codex remediation**. Per the contract, the score below 13/16 stops host-candidate readiness; the drift is returned for Central disposition (e.g., probe-artifact curation hygiene and/or a bounded selector correction on the same PR), not silently reclassified as benign.

## Invariants preserved

- No production source modified by this campaign (evidence-only); no test weakened; no gate weakened.
- 24-result selector capacity, 300 ms actual hook allowance, group/workspace/project fences, legacy corpus and operator precision all untouched.
- Frozen historical snapshots (8/16, 9/16, 11/16, 12/16, 13/16) unchanged.
- HOOK_P95 = UNVERIFIED (300 ms remains binding); human precision 126 items = UNVERIFIED (operator-owned, PENDING_OPERATOR_ADJUDICATION).
- Latency (offline replay): d24 p95 163 ms, remote proof p95 30 ms, index read p95 59 ms, e2e Memory.search p95 209 ms; 0 index-read grace timeouts, 5 proof grace timeouts (proxy).

## Result

`HOST_CANDIDATE_READY=no` (12/16 < 13/16). Subject to Central exact-head rereview; no merge, no formal independent approval, no production deployment, no Issue #81 closure.
