# GHDEV-10 — command-shape friction log (balanced recovery + completion campaign)

## 1. `issue92-a3-stage.mjs` hard-pins the group to `...prospective-v2`
- Line 27: `if(group!=='graphiti-adr92-a3-prospective-v2') die('unapproved_group')`. A fresh v4
  cohort therefore stages under the **v2** group name (the only accepted name). v2 now holds the 13
  v3 episodes, so it is **not empty**; a fresh `...prospective-v4` group is empty (0 episodes). The
  gated v4 inference group must be resolved by Central (clear v2, or update the stage.mjs hard-pin
  to a fresh empty group). This is a Central source invariant, not a Build-side defect.

## 2. Staging fails `queue_not_empty` if the state root is not fully fresh
- The stage.mjs requires `state/<root>/candidate-events-v1/<group>` to be empty and no prior
  `a3-v2-staged.json`. Removing only the top-level `*.json` is not enough — the `candidate-events-v1`
  subdirectory must be removed. Fix: `rm -rf state-v4 && mkdir -p state-v4` before staging.

## 3. Roster control predicates must be non-null strings (length ≥ 8)
- `issue92-a3-acceptance.mjs` `case_source_or_label` requires `typeof c.label.predicate==='string'`
  and `c.label.predicate.length>=8` for **every** case, including controls. The v4 roster initially
  set control `predicate=null` → `case_source_or_label` fail. Fixed by giving each control a
  descriptive string predicate (e.g. `control_meta_weather_question`).

## 4. Ratification + authority shapes are strict
- The scorer requires `ratification.schema==='issue92-a3-ratification-v1'`,
  `manifest_sha256` (not `private_manifest_sha256`), `label_freeze_sha256`, `group`,
  `independent_reviewer` (non-empty), `completed_at` (parseable), and a `cases` array of 20 each
  carrying `source_sha256`/`predicate`/`valuable` + `original_source_reviewed`/`temporal_scope_
  reviewed`/`privacy_reviewed`/`label_confirmed` all true. The authority template needs
  `first_model_intent_at` (parseable, after `completed_at`) + `first_model_intent_receipt_sha256`
  (valid 64-hex). The v4 pre-inference templates now satisfy the shape, so the scorer fails closed
  at `insufficient_review_samples` (exit 1, no simulated PASS) — the intended pre-inference state.

## 5. Native-capture floor drops very short controls
- `fromPromptCandidates` (admitted) yields 0 events for 22-char turns (e.g. `git status
  --porcelain`), which the native-source module rejects (`capture_privacy_or_bounds`). The v4
  controls were re-chosen to be ≥ 26 chars so each yields 1–6 native events.

## 6. A3 batch-id transcription error (carried, not rewritten)
- The terminal A3 handback recorded batch `226621f6…`; the immutable receipts (`_active.json`,
  driver result, provenance) all agree on `6287a0ee…`. Reconciled in `b-a3-diagnosis.json`; the
  historical scorecard was not rewritten.
