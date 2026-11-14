# Limitations — Issue #92 A1–A3 first campaign

## Sample / unverified
- **INSUFFICIENT_SAMPLE** for the ≥75% usefulness-among-grounded-persisted
  estimate: the ≥8 independently-judged, receipt-backed, grounded
  candidate-facts floor is unattained in-harness by design (the model-backed
  drain is a post-exit operator action; the interactive harness owns the shared
  EX lease and must not run model extraction). No zero denominator is relabeled
  PASS. The CPU-only capture/validator results are complete and descriptive.
- `GATE_GROUNDEDNESS=unverified`: requires the post-exit model run plus
  operator fact adjudication (grounded/authority/scope/useful verdicts).
- `GRAPHITI_TERMINAL_EVIDENCE=none_yet`: disposable episode UUID + group +
  source-index readback is produced post-exit.

## Small sample
- The new gh_mcp holdout is 20 cases (10 valuable) — an operational descriptive
  floor, NOT a statistical power claim. Wilson 95% intervals are wide
  (e.g. cron capture precision 14/22 → [0.43, 0.80]).
- The gh_mcp holdout `native_event` is reconstructed from stored adapted
  candidate events (the ` (live capture group ...)` annotation is stripped from
  the source handle for staging; `source_locator_sha256` and
  `native_event_text_sha256` bind the original provenance). This is a
  reconstruction fidelity limit, not a source-exactness limit for the capture
  path (which re-derives excerpts from the reconstructed native events).

## Misses / residual
- The #81 57-case development corpus is sealed by SHA
  (`22ae11e6...`); only its result files are on this host, so the paired CPU
  evaluation reuses the two on-host #81 holdout corpora (cron 24, webvtt 20)
  as development material rather than re-instantiating the 57-case bytes.
- Post-exit model tokens/latency and persisted-fact counts are pending the
  operator action.
- Residual sample uncertainty remains even after the post-exit run until
  operator fact adjudication completes; semantic recall stays
  `UNVERIFIED_UNTIL_FRESH_CLIENT` (a distinct installed-native receipt, out of
  scope for this campaign).

## Not done (by design / authority)
- No PR, merge, or issue closure; no production deployment; no source-remote
  update (evidence-only commit only).
- Trusted Actions `repository-final-v1` receipt is `central_pending`
  (Central dispatches at the final source head).
- #93 (recall-ranking) and #94 (performance) are explicitly out of scope.
