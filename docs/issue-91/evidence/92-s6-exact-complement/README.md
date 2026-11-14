# Issue #92 — S6 source-exact-complement exposed case + prospective A3 freeze (evidence-only)

PRIMARY_AGENT=Hermes (build) · REPO=fvanevski/opencode-operational-schema-guard · BRANCH=work/91-memory-utility-r1

Controlling contract: `docs/issue-91/adr-acceptance/ISSUE92_S6_FINAL_EXPOSED_AND_A3_FREEZE_HERMES.md`
REQUIRED_HEAD (source) = `9cf811ef875efbf97b78d9d500aac1b31be88567`

This directory is a **sanitized, evidence-only** publication. It records one fresh S6
exposed treatment, its terminal Graphiti UUID reconciliation, the 16+11 source-grounded
scorecard, the current A1 raw-native capture measurement, and the auditable prospective A3
`gh_mcp-development-v2` cohort freeze. No raw session text, model tokens, or credential
material is committed. The complete private A3 case-level manifest (with native event text)
is retained at `/home/filip/.local/state/ghdev-graphiti-issue92/private/issue92-a3-v2-corpus.json`
and is referenced here only by digest.

## Result

`RESULT=FUNCTIONAL_REMEDIATION_REQUIRED` (A3 cohort frozen and ready for Central review)

- S6 exposed treatment **settled**: 19 distinct persisted durable facts
  (10 claim lane + 9 complement lane), 31 deferred, **0 unresolved**.
- Terminal Graphiti reconciliation **uuid_exact_match=true**: 19 store UUIDs == 19 remote
  episodes, 0 unresolved, no ambiguous writes, no S1–S5 group mutation.
- 16+11 source-grounded scorecard: S6 valuable coverage **8/16** (S5 was 6/16; S2/S3
  baseline 9/16) — it **recovers the S5 regression `sp8`** (rst_header_rows) and surfaces
  `g2` (graphiti llm-param, baseline had 0 graphiti) via 9 independent source-exact
  complement facts, but does **not** recover `py2`/`py3`, so it lands 1 below baseline.
  11/11 controls inspected; 2 nonvaluable facts persisted (mild pollution).
- A1 current raw-native opportunity: **1,423** raw user turns → **1,033** admitted
  (admission rate 0.726; drops size=44, privacy=279, chatter=67).
- A3 `gh_mcp-development-v2` prospective cohort **frozen and auditable**: 20 cases
  (10 valuable + 10 controls), private manifest + sanitized roster, label-freeze digest,
  zero nonoverlap with the B3 24-cluster and the gh_mcp 20-case corpora. A3 group
  `graphiti-adr92-a3-prospective-v2` is empty (0 episodes); A3 EX launcher / reconciliation /
  scoring machinery is prepared and preflighted but **not run** (gated on Central approval).

## Files

| File | Purpose |
|------|---------|
| `s6-execution-provenance.json` | Source binding: exact HEAD + per-file blob SHAs at the authenticated source head. |
| `s6-ex-kernel-proof.py` / `ex-kernel-proof-output.txt` | Canonical EX flock positive/negative admission proof (inherited fd → admitted; marker-only → `missing_lock_fd`; non-inherited → `wrong_inode`). |
| `s6-driver.mjs` | EX-kernel driver: source-binding guard + one `runAdmittedFiniteBatch` (S6 complement flags). |
| `s6-stage.mjs` | CPU-only queue seeding of the 24 authenticated corpus events into the fresh S6 group. |
| `s6-ex-launcher.py` | EX-gated launcher: flock admission (harness-exit + quiet-grace + scheduler-idle + no-unresolved), once-only marker, bounded reconcile-only retry. |
| `s6-launcher.log` | Actual EX admission + job/reconcile timeline (settled on attempt 5). |
| `s6-exact-complement-result.json` | Driver result: 19 persisted / 31 deferred / 0 unresolved + model-call metrics. |
| `s6-reconcile-once.py` | Read-only terminal reconcile + Graphiti readback + UUID cross-check. |
| `s6-reconcile-receipt.json` | Terminal reconciliation receipt (`uuid_exact_match=true`, 19==19). |
| `s6-graphiti-readback.json` | Independent remote episode-UUID readback for the S6 group. |
| `s6-scorecard.json` | Full 16 valuable + 11 control source-grounded scorecard (claim vs complement lanes). |
| `s6-a1-raw-native.json` | Current A1 raw-native capture-opportunity + admission measurement. |
| `s6-attempt-receipt.json` | Once-only attempt receipt (bridge blob, group, state, rc, attempts). |
| `a3_exclusion_sets.json` | B3 24-cluster + gh_mcp 20-case session/message exclusion sets. |
| `a3-v2-sanitized-roster.json` | A3 v2 sanitized hash roster + label-freeze digest + nonoverlap proof (digests only, no raw text). |
| `a3-v2-stage.mjs` | CPU-only seeding of the 20-case v2 cohort into the empty A3 group. |
| `a3-v2-driver.mjs` | A3 EX-kernel driver (S6 complement flags; source-bound; gated). |
| `a3-v2-ex-launcher.py` | A3 EX-gated launcher (prepared; runs only under `A3_CENTRAL_APPROVED=1`). |
| `a3-v2-scorer.mjs` | A3 prospective scorer (≥85% valuable coverage, ≥90% grounded precision, ≥75% useful over ≥8 independent facts, Wilson 95% intervals). |
| `a3-v2-launcher.log` | A3 launcher gated preflight (no inference). |
| `s6-command-shape-friction.md` | GHDEV-10 command-shape friction log. |
| `s6-handback.md` | Consolidated handback (source/evidence SHAs, tests, EX proofs, reconciliation, scorecard, A1, A3 roster, retrieval findings, no-replay verification). |
