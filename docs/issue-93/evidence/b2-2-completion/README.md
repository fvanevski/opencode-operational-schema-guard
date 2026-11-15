# Issue #93 — B2.2 completion-bound qualification evidence packet

Sanitized, evidence-only snapshot of the one completion-bound B2.2
qualification on the issue/93 working head
(`4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4`).

The B2.2 candidate (semantic-only `now`-handling in `semantic-recall.mjs`,
`relevance.mjs` byte-identical to the pre-candidate strict control) PASSES the
development gate (N02 now abstains; all 15/18 positives preserved). The sealed
holdout, run ONCE after the dev pass, FAILS (1/4 positives, off-topic HN01).
Answer support is UNVERIFIED (cross-channel leakage).

## Members

- `b22-comparison.json` — unchanged strict (13/18), former semantic (15/18),
  B2.1 (15/18), B2.2 (15/18) on the identical frozen snapshot; zero positive
  loss, zero strict-only losses; N01–N05 baseline/B2.1/B2.2.
- `holdout-result.json` — the sealed 4/2 holdout run ONCE (1/4 positives,
  HN01 off-topic 4, HN02 secret 0) → HOLDOUT_FAILED.
- `native-qualification.json` — real-route assembled-model-input proof,
  ≥20 mixed native-hook timing (p95 299.77ms), separate search + get_episodes
  RTT, and the UNVERIFIED answer-support finding + operator-run command.
- `regression-receipts.json` — 10 focused suites (115 tests, 0 fail, true exit
  0) + project check/test gates.
- `command-shape-friction.json` — COMMAND_SHAPE_FRICTION block.
- `handback.md` — full typed handback with SHA identities.
- `SHA256SUMS` — manifest covering the members above.

## Privacy

Raw queries, expected fact/source/remote identities, the sealed holdout's raw
cases, model prompts/answers, and the isolated OpenCode project dirs live in the
PRIVATE scratch (`/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq/`) and are NOT
published. Only safe labels, digests, denominators, and the frozen snapshot
fingerprint are in this packet.

## Outcome

`RESULT=HOLDOUT_FAILED`. Development gate passed; the sealed holdout
under-recovers 3/4 positives and admits an off-topic negative. No production
change, no PR, no branch. A READY_FOR_FINAL_OPERATOR_RUN command for a clean
model-answer qualification is in `handback.md`.
