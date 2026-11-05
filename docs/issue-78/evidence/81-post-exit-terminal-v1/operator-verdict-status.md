# Issue #81 — Operator-verdict status (81-post-exit-terminal-v1)

Private review materials are assembled on the host and **not** published to GitHub (private source text and
operator signatures stay local).

| Packet | Location (host, private) | Status | SHA-256 |
|---|---|---|---|
| Packet 1 (source-case labels) | `…/terminal81-a1f3c9/operator-decision-packet-1.md` | **READY_FOR_OPERATOR_REVIEW** | `54fca993c0b27d7e6611c4fa43301eefabdafad6daa486d877fbddbc5fd265bb` |
| Packet 2 (durable fact-level verdicts) | `…/terminal81-a1f3c9/operator-decision-packet-2.md` | **READY_FOR_OPERATOR_REVIEW** | `d2f3251d8881a6830049ad378c82447d547420cd14b3ea03446cf450645f3be7` |

## What each packet contains

- **Packet 1** — 12 dev + 5 holdout source cases: verbatim source text (private), capture status, provisional
  labels, recommended dispositions, the single dev FN root-cause (defect #2), and the recommended verdict
  summary. AI-prepared; **no AI-signed verdicts**.
- **Packet 2** — the 13 persisted durable facts (12 dev + 1 holdout), grouped by common issue (5 groups):
  verbatim assertion, cited native source excerpt, context, source class, event identity, terminal Graphiti
  UUID, extracted node/relationship, temporal qualification, and an independent
  grounding/usefulness/authority/scope assessment with a recommended verdict. AI-prepared; **no AI-signed
  verdicts; silence is not approval.**

## Operator decisions still pending (block final ratification)

1. Ratify/correct the 12 dev + 5 holdout source-case labels (packet 1).
2. Sign/correct the 13 durable-fact verdicts (packet 2), including the transient-vs-durable boundary for the
   Group-2 test outcomes and F12.
3. Ratify the targets (≥0.85 candidate recall, ≥0.90 grounded precision).
4. Accept the bounded-repair recommendation for defect #2 (and acknowledge defect #1) as a minimal diff to Central.
5. Confirm the blind holdout's single fact (F13) and its 4/4 provisional recall.

**Until the operator signs, `RATIFIED_QUALITY` remains UNVERIFIED (pending operator ratification).** The
measured numerators/denominators are recorded in `quality-results.md`.
