# GHDEV-10 — command-shape friction log (final prospective integration)

## 1. Stage.mjs hard-pin now accepts the declared fresh group
- Corrected at `issue92-a3-stage.mjs:27` to `^graphiti-adr92-a3-prospective-v[2-9][0-9]*$`. The v4
  roster therefore stages into `...prospective-v4` (its own fresh group), not the populated historical
  `...v2` (13 v3 episodes). New `issue92-a3-stage.test.mjs` (3 tests) pins fresh-group isolation +
  staging identity.

## 2. Staging fails `queue_not_empty` if the state root is not fully fresh
- `issue92-a3-stage.mjs` requires `state/<root>/candidate-events-v1/<group>` to be empty and no prior
  staged receipt. `rm -rf state-v4 && mkdir -p state-v4` before staging (removing only the top-level
  `*.json` is not enough).

## 3. Roster control predicates must be non-null strings (length ≥ 8)
- `issue92-a3-acceptance.mjs` `case_source_or_label` requires `typeof c.label.predicate==='string'`
  and length ≥ 8 for **every** case. Controls carry descriptive string predicates
  (e.g. `control_meta_weather_question`).

## 4. A1 native-capture floor: short/`[GHDEV_GRAPHITI_CONTEXT]`/chatter turns yield 0 events
- `fromPromptCandidates` (admitted) drops turns matching `PRIVATE` (secrets), `SELF`
  (`[GHDEV_GRAPHITI_CONTEXT]` / `[OPENVIKING_CONTEXT]` / `Source reference: opencode:`), `CHATTER`
  (short acks), or < 24-char surviving excerpts. The fsm81 auth decisions (`api_key=*** tokens) and
  the `[GHDEV_GRAPHITI_CONTEXT]` recaps are all dropped. Replacement findings were chosen to pass the
  capture (HEVC threshold → 3 spans; durable-segment constraint → 1 span).

## 5. v4-09 / v4-10 were same-predicate siblings of v3-10 / v3-09
- `msg_1a7f8ba3c001` (fsm81 export) is byte-identical to v3-10 `msg_1a801a723001`;
  `msg_1a7f06404001` (fsm81 terminal) is byte-identical to v3-09 `msg_1a7ef3f9a001`. Not materially
  different → replaced with genuinely-unused source-supported findings (Task 2).

## 6. Scorer pre-inference shape is strict
- The scorer requires `ratification.schema==='issue92-a3-ratification-v1'`, `manifest_sha256`
  (not `private_manifest_sha256`), a 20-element `cases` array each with `source_sha256`/`predicate`/
  `valuable` + four review flags true, `independent_reviewer`, `completed_at`; and the authority
  template needs `first_model_intent_at` (after `completed_at`) + `first_model_intent_receipt_sha256`.
  Satisfied → the scorer fails closed at `insufficient_review_samples` (exit 1, no simulated PASS).
