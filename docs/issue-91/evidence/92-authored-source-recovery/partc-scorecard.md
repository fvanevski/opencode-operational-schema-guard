# Part C — Exposed functional qualification scorecard

Group: `graphiti-adr92-exposed-authored-r1` (fresh, empty pre-run; 0 episodes)
Driver: `r1-exposed-functional` | HEAD `11c37c6` | single inference (reconcile-only, no re-inference)
EX: `EX_FLOCK_ACQUIRED` → `EX_ADMISSION_PROVEN` (inherited fdinfo FLOCK, holder PID == parent)
Outcome: `LAUNCHER_EXIT=0` → `R1_HOST_SETTLED` (reconcile-only, inference_calls=1)

## Model metrics
- candidates 9, approved 4, deferred 5
- model_calls 22 (support 4, utility 7, discovery 8, specificity 2, arbitration 1); model_errors 0
- prompt_tokens 31436, completion_tokens 2568
- driver_elapsed_ms 87604 (~88s)
- batch_id `8300f890…af91c9e`; snapshot `6162c0df…`; tuning `8d671d06…`

## Per-fact usefulness (persisted → valuable slot)
| Fact | Case | Predicate | Kind | Verdict |
|---|---|---|---|---|
| 1 | i92-v4-07 | fsm81_log_format_design_decision (Option C logging) | architecture | USEFUL — authored, source-backed |
| 2 | i92-v4-05 | ffmpeg_disposition_ssa_codec_resolved | implementation | USEFUL — authored, source-backed |
| 3 | i92-v4-08 | fsm81_transition_throw_terminal_entries | blocker | USEFUL — authored, source-backed |
| 4 | i92-v4-09 | hevc_video_density_threshold_derived | blocker | USEFUL — authored, source-backed |

- Valuable persisted: **4/4**; Control false positives: **0**.
- Retrieval usefulness: all 4 retrievable as Graphiti episodes (UUIDs present).

## Duplicate suppression
- 4 distinct facts, 4 distinct source refs, 4 distinct write-outcome UUIDs → no dupes.

## UUID reconciliation
- 4 write_outcomes (queued) → `reconciled_persisted=4`, `unresolved=0`; remote readback confirms 4 episodes with UUIDs.

## Model refusal stages
- 0 model_errors, 0 refusals; no fallback-to-defer without a recorded stage.

## Missed valuable cases (honest, non-fail)
6 valuable not persisted: i92-v4-01, v4-02, v4-03, **v4-04**, **v4-06**, **v4-10**.
The three Part B targets (v4-04 FileFlows ABI, v4-06 ffdeps ref, v4-10 durable-segment sealing) are among them — consistent with Part B's diagnosis that their staged excerpts contained only `<openviking-context>` blocks (no authored text), so no source-backed candidate was available to approve. This is the expected loss stage, not a treatment defect.
