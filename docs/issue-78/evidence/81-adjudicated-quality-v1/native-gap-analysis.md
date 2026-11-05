# Issue #81 — Native Gap Analysis

## No-thinking (probe) vs default (holdout)

| Dimension | Probe (none/768) | Holdout (unchanged default) |
|---|---|---|
| Policy | `reasoning_effort=none`, `max_tokens=768` (opt-in, curator-only) | no `reasoning_effort` override, `max_tokens=1600` (unchanged #80 default) |
| Tokens | 7,991 total (5 calls) | 6,044 total (2,913 prompt + 1,677 completion + 1,454 reasoning; 3 calls) |
| Model time | 2.394 s (5 calls) | 6.219 s (3 calls) |
| Decisions | 5/5 valid | 3/3 valid (1 EMIT / 1 SKIP / 1 DEFER) |
| Graphiti writes | 0 (model-only probe) | 1 persisted episode |
| Reasoning metadata | provider-reported 0 in all 5 | provider-reported 1,454 reasoning tokens |

The probe demonstrated that disabling thinking cuts tokens ~40% and model time ~89% with all decisions still valid. The three changed EMIT assertions were independently source-grounded and operator-accepted. The opt-in policy is **curator-only**: it left the global LiteLLM/NInfer defaults untouched.

## Why the holdout used the default, not none/768

The LiteLLM `chat-fast` group gained `extra_body.enable_thinking=true` at 08:18 (after the 07:48–08:00 probe). With `drop_params=false`, a `reasoning_effort=none` request then conflicts (`reasoning_effort conflicts with enable_thinking`, HTTP 400). Per the campaign rule — "use the curator-only none/768 policy **only if** the observed provider settings support it; **otherwise retain the unchanged default**" — the holdout re-drain used the unchanged default. This is a provider-setting change, not a product defect; the opt-in policy machinery (`model-policy.mjs` / `curator-cli.mjs validate-config`) is unchanged and still valid when the provider settings permit it.

## Native host capture gap

Stock V2 native capture does not expose shell stdout/exit as a durable fact, so some `tool`/`error_fix` valuable events are not independently verifiable and remain UNVERIFIED rather than invented. The evaluator keeps `candidate_recall` as event-selection recall (not durable precision) and keeps durable precision null until every EMIT has a persisted episode + source-index + human fact verdict. No threshold was reweighted and no missing shell stdout was invented.

## Fresh-client gap (out of scope here)

`semantic_recall`, `context_p95`, and installed-fresh-native acceptance are `UNVERIFIED_UNTIL_FRESH_CLIENT` / `UNVERIFIED_UNTIL_INSTALLED` by construction. This packet is review-ready evidence for the single #81 PR; the installed fresh-native gate runs after merged-main under `POST_MERGE_FRESH_NATIVE_PLAN.md`.
