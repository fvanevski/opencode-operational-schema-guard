# Issue #93 — candidate-qualification evidence packet

Sanitized, evidence-only snapshot of the one consolidated B2 candidate
qualification on the issue/93 working head
(`e53dbbfd4b1ee153a0562547e03d0210aae57629`).

The Central semantic-abstention candidate suppresses the France off-topic
(N01) and preserves all source-exact positives, but does NOT suppress the second
predeclared off-topic (N02). The development gate FAILS at N02, so the sealed
holdout and the live model-answer campaign are NOT run.

## Members

- `candidate-comparison.json` — unchanged strict (13/18), previous semantic
  (15/18), and Central candidate (15/18) on the identical frozen snapshot;
  no positive losses, no strict-only losses; N01–N05 pre→candidate.
- `n02-diagnosis.json` — the verified root cause of the N02 off-topic injection
  (weak single-token "now" anchoring) and the bounded `CENTRAL_NEXT_FIX`.
- `regression-receipts.json` — Central's new semantic-abstention regression
  (8/8) + 9 relevant existing suites (112 tests total, 0 fail, true exit 0).
- `command-shape-friction.json` — COMMAND_SHAPE_FRICTION block.
- `handback.md` — full typed handback with SHA identities.
- `SHA256SUMS` — manifest covering the members above.

## Privacy

Raw queries, expected fact/source/remote identities, the sealed holdout's raw
cases, and the N02 fact-level detail live in the PRIVATE scratch
(`/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq/`) and are NOT published.
Only safe labels, digests, denominators, and the frozen snapshot fingerprint are
in this packet.

## Dev gate outcome

`RESULT=DEV_FAILED_N02`. `CENTRAL_NEXT_FIX` (add `now` to the `COMMON`
stopword set in `relevance.mjs`, verified source-safe) is returned for Central
to stage as ONE new candidate; no local production change was committed (the
temp stopword verification was reverted clean).
