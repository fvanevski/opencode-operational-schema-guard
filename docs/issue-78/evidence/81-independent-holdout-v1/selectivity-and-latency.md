# Selectivity, quality, and latency — Issue #81 independent holdout (Phase B)

**Frozen inputs:** corrected corpus `524de3ff…` · signed case labels (14 valuable /
10 non-valuable) · original targets `17ffb605…` + signed ratification `3e958111…` ·
group-bound observations `5ccdb95b…` (3 records, 0 facts) · score `ba5305c8…`
(`case-matrices.json` in this packet carries the full row-level matrix).

## Three-path comparison (same 24 frozen source cases)

| Path | tp | fp | tn | fn | recall | precision |
|---|---|---|---|---|---|---|
| #75 heuristic baseline | 0 | 0 | 10 | 14 | 0.00 | n/a (no positives) |
| #79 broad capture | 14 | 8 | 2 | 0 | **1.00** | 0.636 (14/22) |
| #80 curator (this run) | — | — | — | — | n/a (no emissions) | **UNVERIFIED** (0 facts) |

- The 8 broad-capture false positives are the cohort's own negative controls
  (duplicate green re-runs ×3, initial writes ×2, notes write ×1, chatter ×2) plus
  the chatter/duplicate boundary cases; the two exclusion controls
  (`ho2-cred-fake` privacy, `ho2-wrong-scope` scope-fence) were **not** selected:
  `privacy_or_wrong_group_selected = []` → zero credential leakage, zero wrong-group,
  zero false-verified in the observed controls.
- **Held-out candidate recall 14/14 = 1.00 ≥ 0.85 target → PASS** (frozen, operator-
  adjudicated labels; `case_label_changes_from_provisional = 0`).
- **Durable grounded precision: `UNVERIFIED`** — zero receipt-bound model facts
  (empty denominator; recorded as `UNVERIFIED`, not an empty-set PASS). The known
  prior six transient EMITs from the historical development cohort are not hidden:
  they belong to a different cohort and are reported there, not merged into this
  denominator.
- **Usefulness-persisted fraction:** separate from grounded precision; `UNVERIFIED`
  this run (0 judged facts).

## Latency

| Metric | Value | Target | Status |
|---|---|---|---|
| Post-exit admission→terminal (first run) | 30 s (p95 over 3 records) | ≤ 900 s | PASS (admission window; not persistence latency — the run failed before any model call) |
| Model call latency | 0 successful calls | — | n/a |
| CPU capture (48 native envelopes vs native timestamps) | overall p50 8 ms, p95 15.5 s; user-turn p95 17 ms; tool/file-change p50/p95 0 ms | interactive context p95 ≤ 300 ms (installed) | the p95 tail is the assistant-turn stream-completion envelope-ordering artifact (native `completed` vs envelope emit), not interactive context latency; the installed-context gate remains `UNVERIFIED_UNTIL_INSTALLED` |
| Semantic recall (fresh installed client) | — | ≥ 0.80 | `UNVERIFIED_UNTIL_FRESH_CLIENT` (distinct later gate; a pre-merge probe is not a substitute) |

## Negative guardrails (observed controls)

- Credential-like token in the fixture is **invented/known-fake** (value withheld here);
  the native PRIVATE regex vetoed the prompt at capture, so `ho2-cred-fake` is a
  verified negative privacy control and was not staged.
- No real secrets were created or displayed in this packet.
- No credential leakage, wrong-group selection, or false-verified fact was observed.

## Dispositions (typed)

| Gate | Disposition |
|---|---|
| Held-out candidate recall ≥ 0.85 | **PASS** (1.00, frozen) |
| Durable grounded/authority/scope precision ≥ 0.90 | **UNVERIFIED** (0 receipt-bound facts; pending the authorized re-drain) |
| Useful-persisted fraction | **UNVERIFIED** (separate metric, 0 judged facts) |
| No privacy/wrong-group/false-verified leakage | **PASS** (observed controls) |
| Post-exit terminal p95 ≤ 900 s | **PASS** (30 s admission window; persistence latency to be re-measured on the re-drain's positive readback) |
| Interactive context p95 ≤ 300 ms (installed) | **UNVERIFIED_UNTIL_INSTALLED** |
| Fresh-client semantic recall ≥ 0.80 | **UNVERIFIED_UNTIL_FRESH_CLIENT** |
| Historical/production nonmutation | **PASS** (readback above) |
