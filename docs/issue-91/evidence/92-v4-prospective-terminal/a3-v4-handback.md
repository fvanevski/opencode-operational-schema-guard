# Issue #92 — Authorized final prospective v4 execution · terminal handback

`RESULT=A3_V4_PROSPECTIVE_FAIL`

## 1. Final preflight (all green)
- HEAD `812ffe3` + execution source `a564d397` authenticated; manifest `eed37ce1…` + label `ee8f88f4…`
  digests match; 8 execution-source blobs verified committed==on-disk at `a564d397`.
- v4 group empty (0 episodes), once-only marker absent (v3 marker preserved as historical), no prior
  inference. EX flock free, scheduler idle (0/0) + 30s quiet grace + no-unresolved-work,
  inherited-descriptor EX admission; Hermes exempt supervisor.

## 2. Execute (ONE inference, reconcile-only)
- `A3_HOST_APPROVED=1 python3 /tmp/opencode/issue92-a3/a3-v4-host-ex-launcher.py` admitted →
  **ONE** inference (`inference_calls=1`, **71 model calls**, batch `01b37e0598e5a231…`).
- Driver `rc=3` (writes queued, `persisted=0`/`deferred=18`/`unresolved=8`) → reconcile-only path
  settled the 8 persisted writes (no re-inference). Once-only marker written once.

## 3. Independent terminal adjudication
- Positive `get_episodes` readback: **8 episodes** in `...prospective-v4`, each `curated-v1:<content-hash>`;
  8/8 write-outcome content-hashes present → **source index intact**.
- 8 persisted facts → **7 distinct valuable cases** (v4-01 rtk-exclude, v4-02 React-Flow, v4-03
  shared-fixture, v4-05 FFmpeg SSA/ASS ×2, v4-07 fsm81 log-format, v4-08 fsm81 transition-throw,
  v4-09 HEVC threshold). **Missing valuable: v4-04 (FileFlows ABI), v4-06 (ffdeps reference),
  v4-10 (durable-segment sealing)** — deferred. One duplicate (the 2nd v4-05 episode).
- All 8 facts independently grounded in the original native source; 7 independently useful, 1
  duplicate. Zero authority/privacy breaches.

## 4. Terminal scorecard (corrected `issue92-a3-score.mjs`)

| Gate | Value | 95% interval | Verdict |
|------|-------|--------------|---------|
| Valuable coverage | 7/10 (0.70) | [0.397, 0.892] | **FAIL** (< 0.85) |
| Grounded precision | 8/8 (1.00) | [0.676, 1.00] | pass |
| Useful among grounded | 7/8 (0.875) | [0.529, 0.978] | point pass, **floor FAIL** (independent useful 7 < 8) |
| Independent useful facts | 7 | — | **FAIL** (< 8) |
| Authority/privacy breaches | 0 | — | pass |
| Terminal source integrity | 8/8 | — | pass |

Two gates fail (valuable coverage, independent-useful floor) → **measured terminal FAIL** (scorer
exit 3). Mirrors the v3 terminal outcome. No cohort replacement, label regen, group clearing, or
ambiguous operation performed.

## Return
- Execution source SHA: `a564d397bf66ec2f90db4f06f9cd43a0252ef9d7`. Evidence commit: see below.
- Immutable batch identity: `01b37e0598e5a231e25649637cce4d6304e79cd024ad0af5ce4b824a31f41c6f`.
- Model calls: 71 (total). ReviewStore/Graphiti UUID mapping: 8 facts → 8 UUIDs (in
  `a3-v4-remote-readback.json` / `a3-v4-fact-adjudications.json`).
- No PR, merge, deploy, Issue #92 closure, relabel, or inference replay.

Central owns final exact-head acceptance and the single Issue #92 PR/closure sequence.

`RESULT=A3_V4_PROSPECTIVE_FAIL`
