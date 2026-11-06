# Recall Evaluator Analysis — Issue #81

Distinguishes actual retrieval defects from exact-source scoring strictness.
The original 8/16 FAIL is **preserved unchanged**; this is a diagnostic
counterfactual only.

## 1. How the frozen evaluator scores a positive case

A positive case PASSes only when the injected `[GHDEV_GRAPHITI_CONTEXT]` fact's
**exact** `source_ref` (and therefore episode) equals the roster's
`expected_source_ref` / `expected_episode_uuid`. From
`semantic-recall-results.json`, `source_correct` is a strict equality check on
the injected source ref vs the expected source ref; `verdict=PASS` requires
`source_correct=true`.

This is an **exact-source** gate, not a "any verified source supporting the
proposition" gate.

## 2. The seven wrong-source cases under the exact-source gate

For every one of S01, S03, S04, S05, S06, S07, S10:

- The injected source is a **real persisted fact** with legitimate native
  provenance (verified in the curation store; see
  `recall-case-diagnostics.json`).
- The injected fact is **topically related** to the prompt but is a
  **different assertion** from the expected one (none of the seven share an
  assertion or episode with their expected source).
- The frozen evaluator therefore marks them `INJECTED_WRONG_SOURCE`.

## 3. Retrieval defect vs scoring strictness

| Dimension | Finding |
| --- | --- |
| Is the injected source legitimate? | Yes — a persisted, source-grounded, native-id fact in the correct group. |
| Is the injected fact the *exact* expected proposition? | No — it is a related but distinct proposition. |
| Is this a provenance-binding defect? | Not purely. `memory-core.mjs:366` correctly picks a resolvable source for the retrieved fact; the topical offset originates in the semantic search returning a related (not exact) fact. |
| Is the evaluator over-constrained? | Yes — it demands one exact `source_ref`/episode. A related verified source often supports a *nearby* proposition, so the exact-source gate is stricter than "any verified source for the same proposition." |

**Counterfactual (does NOT change the 8/16 score):** if the evaluator credited
a topically-related, verified, same-group source as acceptable, some of the
seven would flip to PASS. But several (e.g. S05, S04) inject a *less specific*
topology fact than the expected one (e.g. "per-group graphs" vs
"development-knowledge has 353 nodes"), so even a lenient gate would not credit
every case. The exact-source gate is a *contributing* cause, not the sole cause.

## 4. What is preserved

- **Semantic recall: 8/16, FAIL** (required ≥ 13/16) — unchanged.
- **N02: FAIL_INJECTED** — unchanged.
- **Human grounded precision: UNVERIFIED** — the 126-item `human_verdict`
  fields are all null (awaiting operator adjudication); no human-certified
  grounded precision is computed here.
- **Episode integrity: 140/140** (last host report) — unchanged
  (`graph-and-curator-readback.json`: before=140, after=140, no loss).
- **Installed source: merged main `b39e1ff7…`** — unchanged.

No retrieval defect is *demonstrated* by the evidence that requires a code
change; the seven cases are best characterized as **semantic recall returning a
related-but-different fact**, surfaced as a failure by the **exact-source
scoring strictness**. See `proposed-correction-contract.md` for the minimal
candidate correction (scoring-policy only), and `diagnostic-summary.md` for the
disposition.
