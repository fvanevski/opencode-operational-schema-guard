# Issue #93 — source-bound-continuation evidence packet

Sanitized, evidence-only snapshot of the consolidated source-bound
qualification continuation on the issue/93 working head
(`5aa14fde42f47c7abfb144f550cdb6bcab6989bb`).

Measurement only. Does not certify source/remote authority and does NOT claim
final Issue #93 acceptance. No production selector change is staged.

## Members

- `scorecard.json` — corrected scorer output (issue93.scorecard.v1): issue-75
  frozen cases (5 positive, 2 negative) with `callback_latency` (native
  context-hook) and `graphiti_search_latency` (search RTT) separated.
- `native-context-hook.json` — real-plugin native context-hook entry-to-return
  (n=8, p95=224.952ms, within 300ms) and separate Graphiti search RTT
  (n=4, p95=156.659ms), in an isolated mock OpenCode session binding.
- `original-81-roster-recovery.json` — the #81 20-case (16+4) roster recovered
  as fingerprints with recorded 12/16 strict / 13/16 semantic baselines; raw
  body host-private -> fresh reproduction UNVERIFIED.
- `regression-receipts.json` — revised scorer + coherent semantic/memory/curator
  suites (98 tests, 0 fail).
- `command-shape-friction.json` — COMMAND_SHAPE_FRICTION block (records the
  node -e guard_annotation under-captured in the first campaign).
- `handback.md` — full typed handback with SHA identities, B2 disposition
  (INSUFFICIENT_SOURCE_EVIDENCE) and the minimum Central next steps.
- `SHA256SUMS` — manifest covering the members above.

## Privacy

The private stage-ledger input (raw queries, fact mapping, live UUID mapping)
and the raw #81 roster body are kept on host and are NOT published. No raw
source text, credentials, assembled model requests, or sensitive traces are in
this packet.

## Scoring (corrected instrument)

```
node --test docs/issue-93/score-stage-ledger.test.mjs
node docs/issue-93/score-stage-ledger.mjs --input <private-ledger> --output scorecard.json
```

`callback_latency` = native-context-hook samples only; `graphiti_search_latency`
= search RTT; `latency_provenance` = SELF_REPORTED_KINDS_REQUIRE_NATIVE_HOST_CORROBORATION.
Search RTT is never substituted for hook p95.
