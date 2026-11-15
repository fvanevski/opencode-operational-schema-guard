# Issue #93 — first-host-campaign evidence packet

Sanitized, evidence-only snapshot of the first consolidated B1/B3 diagnostic
campaign on the issue/93 working branch (tested source
`bfa6cbed805f79bae4d675c94206dc9315b6acec`, source base
`25ca82a70b968cd6102a0f02980ea2a34d82ebd9`).

This packet contains MEASUREMENT ONLY. It does not certify source authority or
remote membership, and it does not claim final Issue #93 acceptance.

## Members

- `scorecard.json` — output of `docs/issue-93/score-stage-ledger.mjs` over a
  private stage-ledger (7-case issue-75 frozen subset: S01-S05 positive,
  N01/N02 negative; 3 measured Graphiti callbacks). Contains synthetic labels
  (S01..N02, f1..f4) and aggregate numbers only.
- `native-observations.json` — read-only native Graphiti observations
  (group, fact counts, per-query latency, callback summary). Raw fact text and
  fact/episode UUIDs retained on host only.
- `regression-receipts.json` — focused regression suite commands, exits, and
  test counts (94 tests, 0 fail).
- `command-shape-friction.json` — COMMAND_SHAPE_FRICTION block.
- `handback.md` — full handback with SHA identities, B1 stage loss, measured
  results, B2 decision, and the proposed minimum selector contract.
- `SHA256SUMS` — manifest covering the members above.

## Privacy

The private stage-ledger input (queries, fact mapping, live UUID mapping) is
kept on host and is NOT published. No raw source text, credentials, assembled
model prompts, or sensitive traces are in this packet.

## Scoring

```
node --test docs/issue-93/score-stage-ledger.test.mjs
node docs/issue-93/score-stage-ledger.mjs --input <private-ledger> --output scorecard.json
```

Scorecard aggregate numbers are meaningful only alongside the native
observations and regression receipts in this packet.
