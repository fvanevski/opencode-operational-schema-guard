# Issue #93 — one bounded holdout evidence reconciliation (adjudication)

Authority: `docs/issue-93/LOCAL_AGENT_CONTRACT_HOLDOUT_ADJUDICATION.md`,
`docs/issue-93/CENTRAL_B2_2_HOLDOUT_ADJUDICATION.md`,
`docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md`.
Target head: `f6a94003622fcce6aa506d1ac275bfb8a0dad99b` (issue/93, authenticated).

## RESULT

`COMPARATOR_NOT_RECORDED` (BASELINE_COMPARATOR_NOT_RECORDED)

The once-only sealed 4/2 holdout was scored **only** by `holdout-run.mjs`, which
recorded, per positive, a **strict** Boolean and a **B2.2-semantic** Boolean, and
per negative only the **B2.2** injected count. The **original unchanged semantic
comparator (69014b7)** was **not evaluated or recorded on the holdout**. Every
original-semantic result file in the private packet (`baseline.mjs`,
`baseline2.mjs`, `candidate-compare.mjs`, `b22-compare.mjs`) is **development-
cohort only** (D01–D18, N01–N05); the holdout `H` is registered in those scripts
as `SEALED_NOT_RUN (registered, not scored here)`.

Consequence: the approved comparative gate — "nonnegative source-exact useful
support AND no new unsafe/off-topic injection **compared with current
semantic**" — **cannot be evaluated as PASS or FAIL** from the published
matrices alone. `PRE_EXPOSURE_ORIGINAL_SEMANTIC_COMPARATOR = false`.

The published `HOLDOUT_FAILED` disposition's two stated reasons are both
**relative claims that were unverifiable at publication time**:
- "3/4 source-exact positive loss" (H02/H03/H04) — requires a current-semantic
  positive baseline that was never recorded on the holdout.
- "HN01 new off-topic negative" — requires a current-semantic HN01 count that
  was never recorded on the holdout.

Absolute facts that ARE established: strict 0/4, B2.2 1/4 (H01 only),
HN01 (B2.2) = 4 off-topic facts, HN02 (B2.2) = 0 (secret fence holds).

## Post-exposure diagnostic (NOT a holdout qualification)

A permitted read-only reconstruction of the original-semantic (69014b7) baseline
on the already-exposed holdout was run on the same frozen transport. It
**reproduces the recorded B2.2 values exactly** (H01=T, H02–H04=F; HN01=4,
HN02=0), confirming transport reproducibility. The reconstructed original-semantic
baseline is:

| case | kind | original semantic (69014b7) | B2.2 (4bc169c) |
|------|------|------------------------------|----------------|
| H01  | paraphrase | source-exact T | T |
| H02  | paraphrase | source-exact F | F |
| H03  | temporal   | source-exact F | F |
| H04  | paraphrase | source-exact F | F |
| HN01 | offtopic   | 4 injected | 4 injected |
| HN02 | secret     | 0 (fence)  | 0 (fence)  |

Deltas (B2.2 vs original semantic): **no positive loss, no positive gain, no new
off-topic injection, secret fence intact.** On the exposed holdout, B2.2 is
**nonnegative (neutral)** relative to the original semantic.

This is labeled `POST_EXPOSURE_DIAGNOSTIC_NOT_HOLDOUT`: it establishes
arithmetic only. It does **not** re-qualify the holdout as untouched and does
**not** authorize a comparative PASS. See `diagnostic.json`.

## Provenance

- `dev_manifest_sha256` `3e799c46…` — **verified** (recomputed from private `dev-cohort.json`).
- `holdout_manifest_sha256` `3f9eaebb…` — **verified** (recomputed from private `holdout-cohort.json`).
- `snapshot_fingerprint` `dc597c69…` — **NOT reproduced** by the stored private
  `source-snapshot.json` fact pool (recomputes to a different digest). The source
  snapshot identity is therefore broken; this is a material provenance caveat
  that independently disallows a PASS on source/manifest provenance grounds.

## Boundaries honored

No production source, test, CI, Graphiti, ReviewStore, installed-config,
historical-manifest, or private-raw change. No new holdout, no replacement
cohort, no GPU model run, no PR/merge/deploy. One sanitized evidence-only
commit on the existing issue/93 branch. Raw queries, expected facts, source
UUID/source-ref maps, and stage traces remain private in
`/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq`.

## Remaining blockers (finite)

1. Original-semantic comparator was not recorded on the once-only holdout, so
   the comparative gate is UNVERIFIED (not PASS, not FAIL).
2. Source-snapshot provenance is broken (fingerprint mismatch), so even the
   post-exposure diagnostic arithmetic rests on a drifted snapshot.
3. Independent clean model-answer-use and full native acceptance remain
   pending (separate gate, UNVERIFIED).

A successor candidate or a fresh prospectively-sealed untouched holdout requires
Central planning and, for a changed standard, operator approval; neither is
initiated here.
