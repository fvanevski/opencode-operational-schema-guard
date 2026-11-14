# Issue #92 — ADR exposed-cohort first-loss causal resolution

**Status:** Central-owned diagnostic; one cohesive local host-evidence qualification. Evidence-only.
**Authority:** `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md`; immutable prospective result at `94cb32364e2115502f5bdde00b46735ac7bb112c`.
**Scoring HEAD (this diagnostic):** `f1ce23038223a864c66c058155b65bb2eb760dea` (branch `work/91-memory-utility-r1`).
**Source base:** `c8eb5260f2b10832346234b1b5d0cf28302ffba8`. **Failed candidate:** `a684667a6eefa2dc19f29755bed0c3048874721d`.
**Frozen cohort:** private `/tmp/opencode/issue92-adr-qual/freeze.json`; SHA-256 `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f` (authenticated). 24 clusters, 27 targets, 16 valuable.
**Cohort status:** already-revealed development data. This diagnostic does not revise the `INSUFFICIENT_SAMPLE` + selection/retention/baseline-preservation FAIL scorer result.

## Method

1. **Authenticate** the frozen cohort (SHA-256 match) and the four-arm private ReviewStore records under `/tmp/opencode/issue92-adr-qual/state/{t1,t2}-{base,cand}/curation-v1/`.
2. **Recover the raw model decisions** directly from the curation records: each record stores the model's structured `decision`, `reason`, `utility_class` (candidate only) and `facts[]`. These are the model's own outputs persisted at curation time — not the scorecard's `discovered` boolean, not a status flag, not a log line. The raw JSON response is therefore **available** for all 4 arms (no `RAW_MODEL_UNAVAILABLE`).
3. **Replay** each recovered response through the scoring-HEAD `validateModelDecision` (`docs/issue-78/v2-curator/core.mjs`) using the centrally staged `adr-causal-audit.mjs`, with independent source-linked `model_fact_indices` and independently verified four-surface terminal receipts.
4. **Adjudicate** the first observed loss stage per valuable target, separating machine-observed state from reviewer inference, and preserve the transient/repetition/privacy negative controls.

Command used (CPU, read-only):
`node docs/issue-91/adr-acceptance/adr-causal-audit.mjs analyze <PRIVATE_ORIGINAL_FREEZE_JSON> <PRIVATE_CAUSAL_BUNDLE_JSON>` → disposition `COMPLETE`, all 4 runs `reviewed_targets=16`.

## Model-decision ground truth (machine-observed)

Per-arm raw-decision counts over all 24 eligible clusters (the 25th t2-cand record is a non-valuable duplicate cluster, excluded from the 16-target matrix):

| run | EMIT | DEFER | SKIP |
|---|---|---|---|
| t1/baseline | 15 | 9 | 0 |
| t1/candidate | 2 | 0 | 22 |
| t2/baseline | 10 | 13 | 1 |
| t2/candidate | 3 | 0 | 22 |

Valuable-target first-loss stages (16 targets; `causal-result.json` is the sanitized machine output):

| target | cand.t1 | cand.t2 | base.t1 | base.t2 |
|---|---|---|---|---|
| graphiti_0312_py313_falkordb_smoke | MODEL_SKIP | MODEL_SKIP | VALIDATOR_REJECTED* | VALIDATOR_REJECTED* |
| graphiti_0312_mcp_tools_only | MODEL_SKIP | MODEL_SKIP | VALIDATOR_REJECTED* | VALIDATOR_REJECTED* |
| graphiti_llm_param_readonly_audit | REMOTE_TARGET_PRESERVED | REMOTE_TARGET_PRESERVED | VALIDATOR_REJECTED* | VALIDATOR_REJECTED* |
| graphiti_live_mcp_no_openviking | MODEL_SKIP | MODEL_SKIP | VALIDATOR_REJECTED* | MODEL_DEFER |
| graphiti_temporal_memory_live_test | MODEL_SKIP | MODEL_SKIP | VALIDATOR_REJECTED* | MODEL_DEFER |
| graphiti_temporal_validation_skill | REMOTE_TARGET_PRESERVED | REMOTE_TARGET_PRESERVED | VALIDATOR_REJECTED* | VALIDATOR_REJECTED* |
| sphinx_dict_str_str_param_render_defect | MODEL_SKIP | MODEL_SKIP | MODEL_DEFER | MODEL_DEFER |
| sphinx_9230_dict_param_render_variant | MODEL_SKIP | MODEL_SKIP | MODEL_DEFER | MODEL_DEFER |
| sphinx_14182_rst_header_rows | MODEL_SKIP | MODEL_SKIP | VALIDATOR_REJECTED* | MODEL_DEFER |
| sphinx_ascii_rst_header_rows | MODEL_SKIP | MODEL_SKIP | MODEL_DEFER | MODEL_DEFER |
| django_add_filter_lazy_string_typeerror | MODEL_SKIP | MODEL_SKIP | VALIDATOR_REJECTED* | VALIDATOR_REJECTED* |
| django_lazy_proxy_string_concat | MODEL_SKIP | MODEL_SKIP | VALIDATOR_REJECTED* | VALIDATOR_REJECTED* |
| django_add_filter_lazy_string_variant | MODEL_SKIP | MODEL_SKIP | VALIDATOR_REJECTED* | VALIDATOR_REJECTED* |
| pylint_short_verbose_expects_arg | MODEL_SKIP | MODEL_SKIP | VALIDATOR_REJECTED* | VALIDATOR_REJECTED* |
| pylint_6386_verbose_flag_negative | MODEL_SKIP | MODEL_SKIP | VALIDATOR_REJECTED* | MODEL_DEFER |
| pylint_verbose_v_arg_expected | MODEL_SKIP | MODEL_SKIP | VALIDATOR_REJECTED* | MODEL_DEFER |

\* **Replay artifact, not a historical rejection.** The scoring-HEAD validator newly requires a per-response `utility_class` for EMIT (`utility_class_required`, `core.mjs:245-247`). The baseline arm ran the older curator `c8eb5260`, whose model output predates that field, so its EMIT facts fail the *current* validator on replay. Historically those facts **were** persisted (terminal four-surface proof exists): baseline preserved **11/16** valuable targets in t1 and **7/16** in t2. The `VALIDATOR_REJECTED` label therefore reflects validator evolution between the two arms, not a rejection that occurred in the original campaign.

## First-loss quantification

- **Candidate:** 14/16 valuable targets = `MODEL_SKIP` (both trials); 2/16 = `REMOTE_TARGET_PRESERVED` (`graphiti_llm_param_readonly_audit`, `graphiti_temporal_validation_skill`), each with four-surface terminal proof.
- **Baseline:** retained the same corpus — 11/16 (t1) and 7/16 (t2) valuable targets preserved with terminal proof; the remainder `MODEL_DEFER`.
- **Paired loss (t1):** 9 valuable targets preserved by baseline and `MODEL_SKIP`ped by candidate: graphiti_0312_py313_falkordb_smoke, graphiti_0312_mcp_tools_only, graphiti_live_mcp_no_openviking, graphiti_temporal_memory_live_test, sphinx_14182_rst_header_rows, django_add_filter_lazy_string_typeerror, django_lazy_proxy_string_concat, pylint_short_verbose_expects_arg, pylint_6386_verbose_flag_negative.

All 16 valuable sources were **captured and model-visible** (24 eligible captured; 1 privacy control dropped). No `SOURCE_NOT_VISIBLE`, no `RAW_MODEL_UNAVAILABLE`.

## Negative / safety controls (preserved)

- 11 non-valuable targets (transient/repetition): **0** preserved by the candidate in either trial → high precision (the candidate's 2 persisted targets are both valuable, 2/2).
- Privacy-control source: `captured=false`, `model_visible=false`, `drop_reason=ineligible_source` in all four arms.
- No injected-memory-context, wrong-group, or sensitive material reached the model (capture ledger covers all 25 refs; the ineligibly-dropped control is the only non-eligible source).

## Dominant causal mechanism

**MODEL_SKIP of source-available, independently supportable durable claims.** The candidate model saw every valuable source but classified mixed task/test clusters as `utility_class=transient_result` and returned `SKIP` with `facts:[]`, discarding the durable atomic claim embedded in the cluster. Its free-text `reason` fields are consistent across the 14 skipped targets: each characterizes the cluster as a transient/one-off task, test, or bug-description context lacking durable architectural value (exact reason text is private; only the `transient_result` utility class and `SKIP` decision are recorded here).

The 2 targets the candidate *did* retain are exactly the ones whose source framing is an **explicit user-stated durable constraint** (the model's own `reason` for those two clusters cites an explicit operator/user constraint; exact text is private). The model extracts a durable claim only when the source framing is already explicitly durable; it does not recover a durable atomic claim (a specific defect, constraint, negative finding, procedure) embedded in a task/test framing.

**Not the cause:** the 25–450-character exact-source extraction constraint did **not** bind here — the model `SKIP`ped *before* any extraction, so no span was ever derived. The durable claims are demonstrably extractable (the baseline EMIT'd the same sources), and there was no validator rejection and no persistence failure for the `SKIP`ped targets.

### Why the candidate over-SKIPs (source-backed)

The candidate prompt (`a684667a`, `core.mjs` `modelPrompt`) added two controls the baseline prompt (`c8eb5260`) lacked, and both push the decision toward `SKIP`:

1. **Utility gate:** "Only the FIRST FIVE classes can justify an automatic EMIT" — `transient_result` is *not* one of the five, so a cluster the model reads as task/test context is forced to `SKIP` rather than `EMIT`.
2. **Stronger transient-SKIP guidance:** "Transient green test counts, one-off command success, incidental status, redundant excerpts, obsolete failures … are not durable just because verbatim" + "SKIP unequivocally low-value/repeated/stale facts."

Together these make the model assign `transient_result` to the whole cluster from its dominant task/test framing and `SKIP`, without applying the prompt's own recall instruction to "inspect EACH source excerpt for independently source-supported … root causes, useful negatives, and procedures." The recall instruction is present but out-weighted by the transient framing.

## Central remediation decision packet

**Dominant mechanism:** model `SKIP` (14/16 valuable targets, both trials), paired against baseline retention of the same sources.

**Smallest appropriate substantive source correction (Central-owned; not implemented here):** a targeted **recall-conscious decision-structure change** to the candidate `modelPrompt` in `docs/issue-78/v2-curator/core.mjs`, so that a source-supported durable atomic claim inside a mixed task/test cluster is `EMIT`ed (with a durable `utility_class` and an `evidence_span`) instead of the cluster being `SKIP`ped as `transient_result`.

- **Implicated symbol:** `modelPrompt(cluster)` in `docs/issue-78/v2-curator/core.mjs` (candidate arm). The over-firing guidance is the utility-gate sentence ("Only the FIRST FIVE classes can justify an automatic EMIT") combined with the transient-SKIP sentences; the under-used counterweight is the "inspect EACH source excerpt … preserve up to THREE independently useful exact supporting spans" instruction.
- **Violated invariant (ADR §5 / decision test):** a genuinely useful, safe, attributable development finding must not be denied upstream merely because it appears inside a transiently-framed task/test cluster.
- **Supported causal examples:** the 9 paired t1 targets (above) and the 14 candidate `MODEL_SKIP` rows in `causal-result.json`; the 2 retained targets show the model *can* EMIT an explicit durable constraint.
- **Expected behavior:** the 14 `MODEL_SKIP` valuable targets become `EMIT` with a durable `utility_class` and a host-derived 25–450-char `evidence_span`; the 2 already-preserved targets stay preserved; the 11 transient/repetition controls and the privacy control remain `SKIP`/dropped (no pollution).
- **Focus, not a rewrite:** keep the hard source/privacy/temporal gates and the 25–450 exact-source evidence rule intact; change only the *decision* policy so `SKIP` fires when **no** excerpt supports a durable atomic claim, not when the cluster's dominant framing is transient. Do not relax grounding, temporal authority, or privacy to manufacture retention.

### Focused regression criteria (for Central's correction)

1. On the exposed 24-cluster corpus, the 14 candidate-`MODEL_SKIP` valuable targets yield a source-supported `EMIT` (durable `utility_class`, valid `evidence_span`); assert `validateModelDecision` ok for each.
2. The 11 non-valuable transient/repetition targets and the ineligibly-dropped privacy control remain non-persisted (pollution bounded).
3. The 2 already-preserved targets remain preserved with four-surface terminal proof.
4. `SKIP`/`DEFER`/`EMIT` decision + `facts:[]` invariants (`core.mjs` `validateDecision`) still hold; no new `unsupported_claim_text` / `model_assertion_not_source_extract` rejections.
5. Re-run `adr-causal-audit.mjs` on a fresh exposed replay: candidate `MODEL_SKIP` count over the 16 valuable targets drops materially while `REMOTE_TARGET_PRESERVED` rises, with the negative controls unchanged.

## What was NOT done

- No new prospective qualification, no new holdout, no PR, no merge, no production activation, no Graphiti data purge.
- No new model campaign was run: the original raw decisions were recoverable, so the bounded `d1` replay (`adr-private-trace.mjs`) was **not needed**.
- No local rewrite of the production curator prompt, validator, capture policy, or scorer.
- The prior scorer result remains `INSUFFICIENT_SAMPLE` overall and FAIL for selection/retention/baseline-useful-preservation.

## Artifacts

- `causal-result.json` — sanitized `issue92-adr-exposed-causal-result-v1` output (target IDs, stages, reason codes, hashes only; no source text, session IDs, or raw model replies).
- `freeze-identity.json` — frozen-cohort identity, source commits, and raw-response digest sets (hashes only).
