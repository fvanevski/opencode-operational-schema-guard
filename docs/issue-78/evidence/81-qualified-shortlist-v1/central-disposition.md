# Central disposition — Issue #81 qualified shortlist (PR #89)

Campaign `ISSUE81_QUALIFIED_SHORTLIST_V1` · exact head `0a62d220edd5d7f814dbb736f51e373ade2d0e89` · tree `ccf903e097ad260c3f2da424da6e047647c36b1a` · controller base `9a27b73de882c0af6fec4d86de81945338611479`

## 1. Findings

1. **The Central-staged correction is verified at the exact head.** The eligibility-aware shortlist (`shortlistQualifiedCandidates` over both the Graphiti and curated-index pools before the shared 24-slot bound) plus the preserved complete 24-fact reranker input behave as staged: the previously failing `memory-core.test.mjs` "facts 13–24" test now **passes** (focused suite 58/58, exit 0; `node --check` 7/7; exact-head `node-contract` CI PASS at run `42292380304`).
2. **Remote authority is fully positive.** Live read-only `get_episodes` (group `development-knowledge`, `max_episodes=1000`) returned 219 unique, group-pure, well-formed, untruncated UUIDs — **219/219** persisted index UUIDs confirmed, **all five** previously-missing expected episodes (S03/S05/S07/S10/S13) remote-present. Host index grew 358/214 → 366/219 (reported, not ignored; frozen roster SHA256 `47e141bd…` unchanged).
3. **One-pass exposed offline replay of the staged `Memory.search`: 12/16 exact-source** (S01, S02, S04, S06, **S07**, S08, S09, S11, S12, S14, S15, S16). **S07 recovered** — the bounded correction's predicted rescue (eligible index candidate previously truncated by the 12-row shortlist). **Zero regressions** vs the control 11/16; frozen 8/16 and 9/16 untouched. Threshold **13/16 not met** (12 < 13).
4. **Residual root causes (earliest stage, exact provenance)** — all four residuals succeed at retrieval and index admission; the failure is in the relevance/selector policy stage:
   - **S03** (`082fe673…`, assistant-reported): expected index candidate present (pool position 154/219) but **relevance-ineligible** — direct overlap 2 terms/0.222 and linked (fact+sourceContext) 3 terms/**0.333**, both below the 0.34 topical floor.
   - **S05** (`1a20d974…`, assistant-reported): expected candidate present (position 145) but **relevance-ineligible** — direct 2/0.333; linked raw overlap 3/0.500 fails the **named-term/independent-topic fence** in the linked evaluation.
   - **S10** (`0de3cdc8…`, tool-reported): expected candidate present (position 197), **eligible** (3/0.500) and inside the 24-slot combined shortlist (position 4), but in a **complete metric tie** with a same-session sibling tool call (`call_0485ce2600ec5dba`, also 3/0.500) whose combined position is earlier; the **index-order tie-break selects the sibling** (a same-session alternate source — recorded, not an automatic PASS).
   - **S13** (`009974d2…`, assistant-reported): expected candidate present (position 110) but **relevance-ineligible** — direct 2/0.333 and linked 2/0.333, below the 0.34 topical floor.
   - **No candidate-budget, remote-proof, group-fence, serial-ordering or one-fact defect** remains in the staged source.
5. **Negative controls and fences:** N01/N03/N04 `PASS_NO_INJECTION`; N02 frozen `FAIL_INJECTED` preserved (identical source to control). Structural fail-closed checks all pass (truncated/absent remote listing → abstention; wrong group excluded; private assertions rejected; index always remote-fenced). **No source-context leak** (no `sourceContext`/`remoteEpisodeUuid`/`workspace`/`project`/`group` in emitted entries or `formatContext`).
6. **Latency:** joined `Memory.search` e2e n=20 — p50 187 ms, p95 257 ms, max 526 ms (single transient N01 sample from a 497 ms search spike; reprobe 148–195 ms). d24 search p50 152 ms; `get_episodes` warm p50 23 ms; curated scan p50 34 ms. 300 ms `Promise.race` fence unchanged. `HOOK_P95=UNVERIFIED` (native hook telemetry not exposed on the CPU-only path; no fresh-session trace staged — not necessary for this verdict).
7. **Human-grounded precision:** 126-fact worksheet authenticated (SHA256 `9f9152cc…` intact, 126 rows, `adjudication_status=PENDING_OPERATOR_ADJUDICATION`, ratified threshold 0.90, **all human verdicts null/absent** → **UNVERIFIED**; no AI signatures or verdicts generated).

## 2. Readiness verdict

- **PR #89 is NOT host-review-ready at `0a62d22…`:** the exposed offline replay scores **12/16** against the fixed **13/16** semantic source-correct threshold (exact-source only; no proposition-equivalence auto-PASS). Tests and fences pass; the remainder is a **selector-policy gap**, not a source defect in the staged correction.
- **Smallest correct source-level remaining defect for Central** (same PR #89, no side campaign):
  1. **Topical floor proximity (S03/S13):** linked source-context admission scores 0.333 vs the 0.34 floor — the context excerpt rescues the lexical count (2→3 terms) but not the score threshold. A bounded policy decision is required (e.g., whether a linked source-context contribution may satisfy the topical floor at all, or a distinct (smaller) linked-admission threshold) — Central's selector-policy scope, not an agent rewrite.
  2. **Named-term fence in linked evaluation (S05):** the linked (fact+excerpt) evaluation drops a sufficient-overlap candidate on the named-term/independent-topic fence; decide whether named terms must be satisfied by the fact alone or may be satisfied by the linked context.
  3. **Complete-tie break (S10):** equal metrics between a candidate and a same-session sibling are resolved by combined index order; a deterministic, source-stable tie-break (e.g., episode-UUID order, or the candidate whose source session matches the query's provenance scope) would select the expected source without changing any fence.
- If a subsequent bounded Central correction reaches ≥13/16 with tests/fences green, `PR89_HOST_REVIEW_READY=yes` may be reported; **native acceptance and deployment authorization still follow the approved merge/deployment process** and remain separate from this host qualification.

## 3. Not done, per contract

No production source edit by the agent (staged source replayed, not modified); no deploy, merge, new PR, Issue #81 closure, or frozen-result rewrite; no new full native GPU campaign; no human-verdict invention; implementation branch untouched (evidence published only on `issue/81-recall-acceptance`); draft status of PR #89 preserved.

## 4. Stop boundary observed

No hard-stop condition triggered: candidate source provenance unambiguous; no live wrong-group/secret exposure; positive remote episode identity proven (219/219); immutable benchmark inputs unchanged; 300 ms fence intact; one transient latency outlier measured, not waived. The single below-threshold replay score is the binding remainder and is returned to Central as the smallest source-level defect list above.
