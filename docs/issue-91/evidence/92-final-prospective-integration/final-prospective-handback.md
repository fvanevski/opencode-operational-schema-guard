# Issue #92 — Final prospective integration · terminal handback

`RESULT=FINAL_A3_READY_FOR_APPROVAL`

## Task 1 — Verify and integrate (all green)
- Required head `a564d397` fetched + ff'd. The corrected `issue92-a3-stage.mjs` now stages into the
  declared fresh group (`...prospective-v[2-9]`) with a new 3-test staging-isolation regression.
- Focused tests: stage **3/3**, A3-acceptance **12/12**, `npm run check` exit 0, `npm test`
  **524/524**. 8 execution-source blobs verified committed==on-disk at `a564d397`.
- The final v4 roster stages into its **own fresh group `graphiti-adr92-a3-prospective-v4` (27 native
  spans)**, not the populated historical v2 (13 v3 episodes).

## Task 2 — Final source-label review
- **v4-09 (fsm81 export, `msg_1a7f8ba3c001`)** is byte-identical to v3-10 `msg_1a801a723001`;
  **v4-10 (fsm81 terminal, `msg_1a7f06404001`)** is byte-identical to v3-09 `msg_1a7ef3f9a001`.
  Neither establishes a materially different technical predicate → **replaced**.
- Replacements (genuinely-unused, source-supported, privacy-clean, A1-capture-passing):
  - v4-09 → `msg_0bffbf941001` · `hevc_video_density_threshold_derived` (HEVC video-density threshold
    ~19-21 MiB/min, derived from Plex-library observation; 3 spans).
  - v4-10 → `msg_10750e113001` · `durable_segment_seal_before_deferred_commit` (a durable segment must
    be sealed before its deferred commit; 1 span).
- Sanitized 20-case roster (10 valuable + 10 controls, source-identity hashes + bounded quotations +
  temporal scope) in `task2-source-label-review.json`. No completed-implementation proof demanded for
  the reported design constraint.

## Task 3 — Freeze and prepare
- Final immutable pre-inference roster + label digest: manifest `eed37ce1e32895172687301e9713f0611704dbfc4bd0fde18c2dff1a517e1ddf`,
  label `ee8f88f4906d9c2be09359cd658dcbd4d3eb907b0ba8602b498a570daf9d9971`. Earlier v4 (fsm81 siblings)
  preserved as `issue92-a3-v4-corpus-historical.json`.
- Staged into fresh `state-v4` + **empty** `...prospective-v4` group (0 episodes, positive readback).
- EX bridge: negative preflight PASS (marker-only `missing_lock_fd` / non-inherited `wrong_inode`);
  Hermes exempt; once-only marker **absent** for state-v4; immutable source binding → `a564d397`
  (8 blobs). Scorer validates the freeze + **fails closed** at `insufficient_review_samples` (no
  simulated PASS); unchanged acceptance thresholds.
- Treatment: `--finite-batch on --novelty-policy recall --source-recovery on --resilient-discovery on
  --claim-evidence on --source-exact-complement on --balanced-dedup on --max-clusters 24
  --max-candidates 72 --max-seconds 3600` (chat-fast, unchanged).
- Ready-to-run (gated, **not executed**): `A3_HOST_APPROVED=1 python3 /tmp/opencode/issue92-a3/a3-v4-host-ex-launcher.py`.

## Return
- Tested SHA: `a564d397bf66ec2f90db4f06f9cd43a0252ef9d7`.
- Finalized source hash (manifest): `eed37ce1…`; label hash: `ee8f88f4…`.
- Corrected staging group: `graphiti-adr92-a3-prospective-v4` (27-span receipt); empty remote-group
  proof: 0 episodes.
- No model calls, Graphiti writes, historical deletion, new PR, merge, or Issue #92 closure.

The next Central review can approve the prepared prospective run immediately, without a further setup
or implementation handoff.

`RESULT=FINAL_A3_READY_FOR_APPROVAL`
