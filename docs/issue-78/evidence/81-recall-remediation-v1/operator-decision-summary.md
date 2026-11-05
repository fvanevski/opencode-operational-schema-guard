# Issue #81 — Operator Decision Summary (81-recall-remediation-v1)

**Scrubbed.** This file carries only verdict counts and case identities. The verbatim source text and human signatures remain in the private packet on the host (`operator-decision-packet-1.md`, `operator-decision-packet-2.md`), never in GitHub.

## Packet 1 — source-case labels (status: READY_FOR_OPERATOR_REVIEW)

The AI prepared recommendations; **no verdicts are AI-signed.** The operator must ratify or edit.

| Split | Cases | Valuable (provisional) | Captured | Not captured | Recommended |
|---|---|---|---|---|---|
| development | 12 | 6 | 8 | 4 | 6 valuable accepted; 2 FPs (chatter-probe, duplicate) reviewed; 1 FN (code+prose) root-caused to defect #2 |
| independent holdout (blind) | 5 | 4 | 4 | 1 | 4 valuable accepted; 1 secret control correctly vetoed (0 leakage) |

- **Privacy/wrong-group leakage:** 0 (secret-late dev + secret holdout both whole-source vetoed).
- **Recommended bounded repair:** defect #2 (`events.mjs` `promptText()` multi-line JSON repair) as a minimal complete diff to Central, with its focused regression. Defect #1 (`evaluate.mjs` qualification-group identity) likewise.
- **Targets:** ≥0.85 candidate recall, ≥0.90 grounded precision (central_proposal → pending operator ratification).

## Packet 2 — durable fact-level verdicts (status: PENDING post-exit drain)

Assembled **after** the bounded post-exit model/Graphiti drain (chat-fast) produces real extracted episodes/edges. For each proposed durable fact: verbatim proposed fact, quoted native cited span, omitted context, actual graph episode/relationship, current/historical status, and useful/factuality/authority/scope rationale. The operator is not asked to locate Graphiti records manually. **Not yet generated** — depends on the drain completing post-exit.

## Denominators that the verdicts affect

- **candidate_recall** (≥0.85): dev 6/6 valuable if defect #2 repaired (staged 5/6 = 0.8333).
- **durable_grounded_precision** (≥0.90): model-EMIT durable facts judged grounded/authority-correct/scope-correct, over adjudicated facts, with a real terminal Graphiti readback.

## Consequences of the decisions

- **Ratify labels + repair →** dev recall target met (1.0000); holdout stays blind (1.0000 provisional); durable precision finalizes post-drain.
- **Defer the repair →** dev recall remains 0.8333 (target FAIL); the candidate is a partial-acceptance result with an honest negative.
- **Operator unavailable →** campaign returns `READY_FOR_OPERATOR_REVIEW` with the complete briefing; no verdicts leaked or invented.
