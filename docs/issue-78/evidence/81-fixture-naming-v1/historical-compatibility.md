# Historical compatibility & nonmutation — Issue #81 naming slice

## Frozen cron benchmark re-score (offline, CPU-only)

Re-ran the existing `adjudicate.mjs score` interface with verified absolute
input paths (each input identified by its actual SHA-256) and a **new
write-once output path** (`--out … final-score-naming-v1.json`, `wx` flag):

| Input | SHA-256 (verified) | Private location |
| --- | --- | --- |
| Frozen corrected corpus | `524de3ff…e425863` | `<host-home>/.local/state/ghdev-graphiti-issue81/holdout81-64d32eb7/private/holdout-corpus-cron.json` |
| Signed case worksheet | `f6241a46…f9ceddb1` | `…/private/case-adjudication-cron.json` |
| Signed fact worksheet (complete adjudication) | `26c7692d…3095c98c` | `…/private/fact-adjudication-signed-redrain.json` (the `--adjudication` input) |
| Receipt-bound observations | `ab66cdbe…50b09b5ca3` | `…/private/holdout-observations-redrain.json` |
| Original target proposal | `17ffb605…a8c76f049` | `…/pkg/issue-78/v2-benchmark/targets.proposed.json` |
| Signed target ratification | `3e958111…1fbb8626a` | `…/private/target-ratification.json` |

Exit **0**. All input digests re-verified **after** scoring (unchanged).

## Required accounting — all met (new score)

| Metric | Required | Observed |
| --- | --- | --- |
| Candidate recall | 14/14 | 14/14 (`broad_capture` tp 14, fn 0, recall 1) |
| Candidate selected precision | 14/22 | 14/22 (tp 14, fp 8, precision 0.6363…) |
| Model decisions | 2 EMIT / 1 DEFER | `{"EMIT":2,"DEFER":1}` |
| Receipt-bound grounded precision | 2/2 | `remote_receipt_bound_model_facts=2`, `grounded_precision=1`, `proposed_fact_grounded_precision=1` |
| Useful persisted facts | 1/2 | `useful_facts=1` of `facts_human_judged=2` |
| False authority | 0 | 0 |
| Wrong scope | 0 | 0 |
| Privacy / wrong-group failures | 0 | `privacy_or_wrong_group_selected: []` |
| Changes to the 24 ratified source labels | 0 | `case_label_changes_from_provisional: 0`, `case_count=24`, `source_bytes_unchanged=true` |
| Semantic recall | UNVERIFIED | `UNVERIFIED_UNTIL_FRESH_CLIENT` |
| Context latency | UNVERIFIED | `UNVERIFIED_UNTIL_INSTALLED` |

Target gates (`operator_ratified`): `candidate_recall`, `grounded_precision`,
`no_privacy_wrong_group`, `no_false_authority`, `no_wrong_scope`,
`post_exit_latency` all **true**; no target, signature, label, or fact was
modified.

## Drift comparison

New score file SHA-256: `522f9285393f0e90ad36d623715faafd04a1d7a230cd8ed803412e61c4aa2c60`
— **byte-identical** to the previous accepted score
(`PREVIOUS_ACCEPTED_SCORE=522f9285…4aa2c60`). Zero drift: the naming diff
changed no scoring input bytes and the evaluator's qualification-group fence
(`permittedQualificationGroup`) preserves the exact legacy `cur81_dev` →
`cur81_holdout_*` / `cur81_dev_*` semantics for this frozen cohort.

## Old-group readback (read-only, group-scoped)

- **Historical cron-holdout episodes verified:**
  `cur81_holdout_cc5349fc` remote `get_episodes` returns exactly the two
  historical UUIDs `56b75c2c-e2f8-404f-baed-531ef76ce260` and
  `d4b8fff6-e89f-40c4-a81b-f3c2bf7723a1` — matching the local
  `_episode-index` entries exactly (re-verified after the re-score).
- **Production baseline:** `ghdev_gh_mcp` remote readback = 4 episodes
  (`81dd997d…`, `7211e2bd…`, `b3a21d33…`, `4126ba20…`) — unchanged before
  and after this slice's operations. The two local receipt files in
  `<host-home>/.local/state/ghdev-graphiti/ghdev_gh_mcp/`
  (`961923ff…`, `276bb0b2…`) are historical-receipt artifacts of an earlier
  DB generation; they were read, not modified.
- **Historical group baselines (remote episode counts):**
  `cur80_disposable` 1, `cur80_qual01` 1, `cur80_qual02` 1,
  `cur81_dev_ce555621` 9, `cur81_holdout_4c3ab514` 1,
  `cur81_native_a1f3c9d7` 12, `cur81_native_8cd61d76` 0 (staged only),
  `cur81_dev` 0 (local-only corpus scope). All consistent with the local
  `_episode-index` directories.

No legacy group was renamed to a descriptive ID; the frozen cohort, signed
worksheets, target ratification, and Graphiti receipts remain usable under
their exact historical machine IDs.

## Production nonmutation

- No Graphiti write/add_memory/clear/replay by this slice (read-only
  `get_episodes` only).
- No model calls, no GPU inference, no post-exit drain, no EX-gate change.
- Installed plugins and native capture configuration untouched.
- The only new persistent artifact is the write-once score file
  `final-score-naming-v1.json` in the campaign private directory
  (byte-identical content to the prior accepted score).
