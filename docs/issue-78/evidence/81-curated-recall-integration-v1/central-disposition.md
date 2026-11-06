# Central disposition — Issue #81 curated-recall integration (PR #89)

Campaign `ISSUE81_CURATED_RECALL_INTEGRATION_V1` · exact head `bcab0311b8c7c0486ebe931b0a024a88cd47adc7` · tree `2ad8055d1a00d77dc80641fec6aefd1461a3e3a8`

## 1. Findings

1. **One staged production test fails at the exact head** (`docs/issue-75/v2-candidate/memory-core.test.mjs`, "native sourced recall may use facts 13-24 but not an out-of-bound remote result", `51/52` in the contract-literal focused suite). The staged `Memory.search` builds `combined = [...candidates.slice(0,12), ...indexedCandidates.slice(0,12)]`, so the Graphiti fact path is truncated to the first 12 *received* facts before ranking; a relevant fact at received position 13–24 (the test's position 19) can never be selected. The co-staged test encodes the intended "facts 13–24 usable" behavior, so the defect is a **substantive source-selection defect in the staged source**, not a harness mismatch. Left un-repaired locally per contract (production code/test changes require a Central-staged new exact head).
2. **Remote persistence is proven.** The live read-only `get_episodes` (group `development-knowledge`, `max_episodes=1000`) returned 214 unique, group-pure, well-formed UUIDs — 100% of the 214 persisted index UUIDs, including all five previously-missing expected episodes (S03 `082fe673…`, S05 `1a20d974…`, S07 `7dcfa76f…`, S10 `0de3cdc8…`, S13 `009974d2…`). The architecture is **not blocked**; the host index grew 274→358 records (165→214 persisted) and the frozen roster is unchanged.
3. **One-pass exposed offline replay of the staged `Memory.search` scores 11/16 exact-source** (S01 and S04 recovered; S03/S05/S07/S10/S13 residual), with **zero regressions** against the frozen 9/16 and the frozen 8/16 untouched. Threshold 13/16 is **not met**.
4. **Residual root cause (earliest stage, all five cases):** remote d24 fact search does not return the five expected episodes, so recovery depends on the index path; index **admission succeeds** for all five, and the failure is in the **selector shortlist/eligibility stage**:
   - S07: expected candidate is eligible but ranked 26th in the 214-row index shortlist → truncated by the 12-row shortlist.
   - S03/S05/S13: expected candidates are ranked 34th/16th/13th and are additionally relevance-ineligible (direct *and* linked) → truncated and/or fenced.
   - S10: expected candidate is eligible and ranked 1st, tied at score 30.5 with a wrong-source candidate; the tie resolves by fact-string `localeCompare` → wrong source wins.
5. **Fail-closed behavior verified** (12/12 controls): wrong group, missing remote UUID, malformed/truncated remote listing, private assertions, missing/weak source references, remote outage — all yield zero eligible index facts; MCP calls are serial; N02 remains the frozen `FAIL_INJECTED` same-group content-policy miss with no new wrong-group/secret/false-verified admission.
6. **Latency:** all stages well under the unchanged 300 ms allowance (get_episodes 60/32 ms first/warm; d24 search 143/138 ms; curated resolve 50 ms; combined 37 ms). `HOOK_P95=UNVERIFIED` (native hook start/end not exposed by this probe).
7. **Human-grounded precision:** 126-fact worksheet/packet available with original hashes intact and all agent verdicts null → **UNVERIFIED** (operator-only, no new review campaign run).

## 2. Proposed ONE bounded Central source correction (same PR #89)

**Target:** the selector shortlist stage in `Memory.search` (`docs/issue-75/v2-candidate/memory-core.mjs`) — the earliest stage at which all five residuals fail.

**Bounded change (single, fence-preserving):** make the index-candidate shortlist *eligibility-aware* within the existing `MAX_AUTOMATIC_CANDIDATES=24` selector cap: rank `indexedCandidates` by (direct-or-linked relevance eligibility first, then the existing `lexRank` order, then fact string), and shortlist the top eligible rows up to the cap instead of truncating the raw `lexRank` top-12. No change to remote proof, group/scope fences, one-fact output, evidence-class handling, the 300 ms allowance, or the `relevanceSignals` policy itself. This directly rescues S07 (eligible, ranked 26th) and the shortlist-truncation component of S03/S05/S13, and leaves the S10 lexical tie-break and the S03/S05/S13 eligibility-fence misses as separately scoped selector-policy questions for a subsequent bounded round if the score is still short.

**Co-staged test alignment:** the same correction pass must also satisfy the co-staged failing test ("facts 13–24 usable") — i.e., the Graphiti fact path should be shortlisted by relevance order (or the 12+12 split replaced by a single cap-bounded eligible-aware shortlist) so that received positions 13–24 remain selectable while the hard 24 cap and the out-of-bound exclusion (position 25 dropped) are preserved.

**Expected effect (bounded, not a promise):** S07 recoverable in the exposed offline replay; the other residuals require the eligibility/tie-break policy decisions, which are Central's, not an agent rewrite. If, after the bounded correction, the exposed score is still < 13/16, PR #89 stays draft with that remainder classified as selector-policy scope.

## 3. Readiness verdict

- **PR #89 is NOT source-review-ready** at `bcab0311…`: the co-staged test fails against the co-staged source, and the exposed offline score is 11/16 against the fixed 13/16 threshold.
- Recommended: Central stages the bounded correction above as the next exact head on `issue/81-source-recall-correction`; a subsequent one-pass exposed replay (same frozen roster, same read-only remote proof discipline) re-scores. Host proof + quality/latency + independent exact-head review all remain binding before merge.
- **Not done, per contract:** no production source edit by the agent, no deploy, no merge, no new PR, no Issue #81 closure, no new full native GPU campaign, no human-verdict invention. Draft status of PR #89 preserved.

## 4. Stop boundary observed

No hard-stop condition triggered: candidate source provenance unambiguous; no live wrong-group/secret exposure; positive remote episode identity proven; immutable benchmark inputs unchanged; deployed host source/config compatible; no gate/lease interference. Ordinary limitations (one unavailable timing signal `HOOK_P95`, one failing staged test) are reported as measured, not as scope expansion.
