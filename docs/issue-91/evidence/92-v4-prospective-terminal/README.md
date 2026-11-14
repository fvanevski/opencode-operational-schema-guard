# Issue #92 — Authorized final prospective v4 execution (terminal evidence-only)

`AUTHORIZATION=A3_V4_PROSPECTIVE_APPROVED` · PRIMARY_AGENT=Hermes (Build) · REPO=fvanevski/opencode-operational-schema-guard · BRANCH=work/91-memory-utility-r1
CURRENT_HEAD=`812ffe3c7162ad5b15830e02d79babf6b6dfc252` · EXECUTION_SOURCE_SHA=`a564d397bf66ec2f90db4f06f9cd43a0252ef9d7`
PRIVATE_MANIFEST_SHA256=`eed37ce1…` · LABEL_FREEZE_SHA256=`ee8f88f4…` · GRAPHITI_GROUP=`graphiti-adr92-a3-prospective-v4` · EXECUTION_COUNT=ONE
EVIDENCE_ROOT=`docs/issue-91/evidence/92-v4-prospective-terminal/`

The single authorized v4 inference was executed (one immutable model-call intent, 71 model calls,
batch `01b37e05…`), the queued Graphiti writes were settled by the reconcile-only path, and the
terminal fact-level scorecard was produced by the corrected `issue92-a3-score.mjs`. Evidence-only,
single commit, no PR/merge/deploy/#92 closure, no relabel, no inference replay.

## Result

`RESULT=A3_V4_PROSPECTIVE_FAIL`

- Valuable coverage **7/10** (0.70; Wilson 95% [0.397, 0.892]) — **below the ≥9/10 gate**.
  Missing valuable: v4-04 (FileFlows ABI), v4-06 (ffdeps reference capability), v4-10 (durable-segment
  sealing) — all deferred (not persisted).
- Grounded precision **1.00** (8/8; [0.676, 1.00]) — pass.
- Useful-among-grounded **0.875** (7/8; [0.529, 0.978]) — the point passes ≥0.75, but the gate also
  requires **≥8 independent useful facts**; only **7** independent useful facts persisted (the 8th
  episode is a duplicate of the v4-05 FFmpeg SSA/ASS constraint) → **gate fails on the independent-useful
  floor**.
- Authority/privacy breaches: **0** (pass). Terminal source integrity + independently-ratified labels: pass.

Two gates fail (valuable coverage, independent-useful floor); the run is a measured terminal FAIL,
mirroring the v3 terminal outcome. No cohort replacement, label regen, group clearing, or
ambiguous operation was performed.

## Files

| File | Purpose |
|------|---------|
| `a3-v4-scorecard.json` | Terminal fact-level scorecard (stats, Wilson 95% intervals, per-gate verdicts, covered targets). |
| `a3-v4-execution-provenance.json` | Execution source binding (a564d397 + 8 blobs), manifest/label digests, batch id, 71 model calls, reconcile-only corrective path, EX admission. |
| `a3-v4-remote-readback.json` | Positive `get_episodes` readback: 8/8 persisted content-hashes present as episode names (source index intact). |
| `a3-v4-fact-adjudications.json` | Independent source adjudication of all 8 persisted facts (grounded/useful/duplicate + source case + bounded rationale). |
| `a3-v4-authority-audit.json` | EX/replay/write/privacy/group/verified + `first_model_intent_at` (after ratification) + one-immutable-intent + reconcile-only. |
| `a3-v4-host-attempt-receipt.json` | Launcher attempt receipt (group, state, once-only). |
| `README.md`, `a3-command-shape-friction.md`, `a3-v4-handback.md` | Context, GHDEV-10 friction, consolidated terminal handback. |

Private (0600, host-side, referenced by digest) under
`/home/filip/.local/state/ghdev-graphiti-issue92/private/`: `issue92-a3-v4-{remote-readback,
fact-adjudications,authority-audit,ratification,corpus,corpus-historical}.json`.
