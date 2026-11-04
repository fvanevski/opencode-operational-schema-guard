# Issue #81 — updated evaluator regressions at exact head `a4c9e76a6d60179b2555fb3836207b65f99d174d`

## Setup

- Fresh disposable detached worktree `/tmp/opencode/issue81-qual/eval81-a4c9e76a` at the exact required source head `a4c9e76a6d60179b2555fb3836207b65f99d174d` (verified: `git rev-parse HEAD` == required SHA; remote `origin/issue/81` == same SHA pre-test).
- New commits under test (on top of the first-campaign evidence commit `289821f`):
  - `3d4404b` fix holdout gate ordering + bind disposable model observations to real group-specific event identities (absorbs the first-campaign `source.patch`),
  - `ccdce0c` sealed-holdout tool category + qualification-group identity binding,
  - `a4c9e76` gate durable precision on model-origin persisted source-index readback.

## Suite results (exact head, clean tree)

- `node --check evaluate.mjs` → OK.
- `node --test evaluate.test.mjs` → **8/9 pass, 1 fail** (exit 1).

### Failing test (bench-only fixture mismatch, diagnosed)

- Test: `qualification group does not rewrite frozen labels or silently rebind event IDs`
- Failure: `INVALID_BENCHMARK:qualification_scope_mismatch`
- Diagnosis: the test fixture's corpus scope uses base group `issue81_dev`, while the new rebind rule in `evaluate.mjs` (from `3d4404b`) admits observations only when the corpus base group is exactly `cur81_dev` (the campaign's real dev-scope group) and the observation group matches `cur81_dev_<8-hex>`. The fixture group never matched, so the legitimate rebind path was rejected.
- Disposition: **bench-only fixture alignment**, not a product-semantic change. With the fixture group aligned to `cur81_dev` (scratch copy only, verified 9/9 pass), all 9 tests pass. The proposed one-line patch is returned as `source-patch-v2-evaluate-test-fixture.patch` (NOT pushed; product source unchanged on the branch).
- Alternative (rejected here, for Central): broaden the implementation rule to any base group — that is a semantic gate change and out of bench-only scope.

## Regression guards (frozen corpus reused, labels unchanged)

1. **No-observation scoring** of the frozen development corpus (SHA-256 `22ae11e64a7a9c443d6f13a79c363115a28b43a27620e5383449bfe32d9fb5b4`) with the updated evaluator reproduces the first-campaign metrics **exactly**: baseline `TP3/FP1/TN19/FN34` (recall .0811), broad capture `TP27/FP6/TN14/FN10` (recall .7297), privacy/wrong-group selected = ∅. No methodology drift from the evaluator update.
2. **Model-observation scoring** (`observations.json` built from the real cur81 review store + `usage.jsonl`, group-specific deterministic event identities, `origin=model`): 13 records — 9 EMIT / 3 DEFER / 1 SKIP, `invalid_model_or_source_decisions=0`, 9/9 EMIT facts receipt-bound to persisted remote episodes with verified source index; `grounded_precision=null` (correctly withheld pending `operator_adjudicated` fact verdicts — the new durable-precision gate works as specified: queued/deferred/operator-seeded facts cannot satisfy it).
3. **Sealed holdout untouched**: `holdout.json` (SHA-256 `f904411e51d0bd9674b7f756f3df5bf44452ca8f63362d75102ceb9df677fce4`) still refuses scoring with `INVALID_BENCHMARK:unadjudicated_holdout` (exit 1, no output written) under the updated gate ordering. Not scored, not altered.
4. **Scope-binding regression**: the new `qualification_scope_mismatch` / `qualification_source_identity_mismatch` checks fired correctly in the unit suite (8 passing tests cover them); the single observed misfire is the fixture-group mismatch above.

## Artifacts

- `development-results-v2-noobs.json` — updated evaluator, no observations (regression baseline).
- `development-results-v2.json` — updated evaluator + real model observations (curator section populated).
- `observations.json` — the observation file (case IDs, group-specific event IDs, decisions, usage, receipts; no raw transcripts).
