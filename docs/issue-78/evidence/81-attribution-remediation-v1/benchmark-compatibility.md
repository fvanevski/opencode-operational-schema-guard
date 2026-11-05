# Frozen benchmark compatibility — Issue #81 (Phase 5)

Re-scoring of the frozen corrected cron cohort under the corrected evaluator
(`evaluate.mjs` at `8dcdf199…`), via the existing `adjudicate.mjs score`
interface. All inputs identified by **actual SHA-256**, all paths absolute.

## Input identities (verified by hash, private campaign dir)

| Input | SHA-256 | Private location |
| --- | --- | --- |
| Frozen corrected corpus | `524de3ff…e425863` | `<host-home>/.local/state/ghdev-graphiti-issue81/holdout81-64d32eb7/private/holdout-corpus-cron.json` |
| Signed case worksheet (historical case labels) | `f6241a46…f9ceddb1` | `…/private/case-adjudication-cron.json` |
| Signed fact worksheet (complete adjudication: 24 case labels + fact verdicts) | `26c7692d…3095c98c` | `…/private/fact-adjudication-signed-redrain.json` |
| Receipt-bound observations | `ab66cdbe…50b09b5ca3` | `…/private/holdout-observations-redrain.json` |
| Original target proposal | `17ffb605…a8c76f049` | `…/pkg/issue-78/v2-benchmark/targets.proposed.json` (byte-identical to the worktree repo copy) |
| Signed target ratification | `3e958111…1fbb8626a` | `…/private/target-ratification.json` |

The signed fact worksheet is the complete `issue81-operator-adjudication`
document (`OPERATOR_RATIFIED`) and is the `--adjudication` input, matching the
authority binding recorded by the historical redrain score.

## Score invocation (exact CLI shape, write-once new output)

```
node docs/issue-78/v2-benchmark/adjudicate.mjs score \
  --corpus <abs>/private/holdout-corpus-cron.json \
  --expected-corpus-sha256 524de3ff36877442c6dc4e75edf5da9f317ba1c2e25e267b117233514e425863 \
  --adjudication <abs>/private/fact-adjudication-signed-redrain.json \
  --expected-adjudication-sha256 26c7692ddb32b8483e80c43f5cd9b93d2977d7a06e6cdaca4e581bd43095c98c \
  --proposal <abs>/pkg/issue-78/v2-benchmark/targets.proposed.json \
  --expected-proposal-sha256 17ffb60515f5f96f2d546fd3abf951d0bc008325e38d83145ec4f75a8c76f049 \
  --target-ratification <abs>/private/target-ratification.json \
  --expected-target-ratification-sha256 3e9581114047ac7416f6014a0dd6a57304dc5e5784efe39b176ced61fbb8626a \
  --observations <abs>/private/holdout-observations-redrain.json \
  --out <abs>/private/final-score-attribution-v1.json
```

Exit **0**; output written once (flag `wx`) to the **new** path
`final-score-attribution-v1.json`.

## Unchanged quality accounting (required values all met)

| Metric | Required | Observed |
| --- | --- | --- |
| Candidate recall | 14/14 | 14/14 (`recall=1`, tp 14, fn 0) |
| Candidate precision | 14/22 | 14/22 (`0.6363…`, tp 14, fp 8) |
| Model decisions | 2 EMIT, 1 DEFER | `{"EMIT":2,"DEFER":1}` |
| Receipt-bound facts | 2 | `remote_receipt_bound_model_facts=2` |
| Human-grounded/authority/scope-correct facts | 2/2 | 2/2 (`grounded_precision=1`, `proposed_fact_grounded_precision=1`) |
| Useful persisted facts | 1/2 | `useful_facts=1` (of 2 judged) |
| False authority | 0 | 0 |
| Wrong scope | 0 | 0 |
| Privacy / wrong-group selection | none | `privacy_or_wrong_group_selected: []` |
| Operator case-label changes | 0 | `case_label_changes_from_provisional: 0` |

Target gate (`operator_ratified`): `candidate_recall`, `grounded_precision`,
`no_privacy_wrong_group`, `no_false_authority`, `no_wrong_scope`,
`post_exit_latency` all **true**; `semantic_recall`
`UNVERIFIED_UNTIL_FRESH_CLIENT`, `context_latency`
`UNVERIFIED_UNTIL_INSTALLED` (unchanged gates). No targets, signatures,
labels, or Graphiti facts were modified to recover a PASS.

## Telemetry distinctions (corrected evaluator)

- **Persisted-only latency series** `post_exit_persisted_ms`: population 2
  (the two persisted terminal-readback EMIT records; p50 33172 ms, p95 58239 ms),
  reported **separately** from the all-terminal `post_exit_ms` series
  (population 3, including the DEFER record at 2822 ms). The existing
  terminal-latency acceptance gate is unchanged.
- **Missing per-record model usage**: no record carries
  `prompt_tokens`/`completion_tokens`/`model_ms`, so the score reports
  `tokens: {count: 0}`, `tokens_total: null` and `model_ms: {count: 0}` —
  explicit missing/unknown, **not** fictitious zero consumption.
- **Host-journal aggregate usage preserved separately**: the campaign-run
  journal block of the observations records `model_ms_total: 2334`,
  `prompt_tokens: 6548`, `completion_tokens: 564` (3 model calls, 0 errors).
  These aggregates are retained as host-journal evidence only and are **not**
  distributed across individual model observations.

## Before / after artifacts

| Artifact | SHA-256 | Status |
| --- | --- | --- |
| Historical redrain score `final-score-redrain.json` | `c0fcb599…39116e645b823` | preserved unchanged (historical evidence) |
| Fresh post-correction score `final-score-attribution-v1.json` | `522f9285…4aa2c60` | new distinct artifact (this campaign) |

No numerical acceptance result drifted: every required metric equals the
historical redrain accounting, now produced by the corrected evaluator with the
separated persisted-only latency series and explicit missing-telemetry
semantics.
