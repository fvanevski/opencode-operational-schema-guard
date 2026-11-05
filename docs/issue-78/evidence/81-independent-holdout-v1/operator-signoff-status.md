# Operator sign-off status — Issue #81 independent holdout (Phase B)

**Campaign:** `ISSUE81_INDEPENDENT_HOLDOUT` · tag `64d32eb7` · PR #83 (draft)

## Sign-offs on record (digests; signed bytes remain private 0600)

| Attestation | Status | Digest / record | When (UTC) |
|---|---|---|---|
| Target ratification (original thresholds, unchanged) | `OPERATOR_RATIFIED` | `target-ratification.json` SHA `3e9581114047ac7416f6014a0dd6a57304dc5e5784efe39b176ced61fbb8626a` (proposal `17ffb605…` verified against committed worktree bytes) | 2026-11-04T21:37:19Z |
| Pre-result operator case review (roster + 24 labels + independence) | `A_RATIFY_ALL_24_AS_PROPOSED` (14 valuable / 10 non-valuable; cohort judged substantively independent) | `operator-case-review-cron.json` (private) | 2026-11-04T23:35:39Z |
| Case worksheet (labels + `source_checked` + first-person confirmation) | `OPERATOR_RATIFIED` (signed worksheet bound to corrected corpus `524de3ff…`) | `case-adjudication-cron.json` SHA `f6241a46ce66f2d3d29b1eb4f81f31cb498472c6d03db5b65307cfc8f9ceddb1` | 2026-11-04T23:43:36Z |
| Fact review (Phase B; 0 model facts) | `FACTS_A_ACCEPT_EMPTY_FACT_SET` — empty first-run fact set accepted; durable grounded precision `UNVERIFIED`; no fact verdicts fabricated | `operator-fact-review-cron.json` (private record) | 2026-11-05T00:01:09Z |
| Single bounded re-drain authorization | **authorized** (7 conditions, all prepared; see `curator-graphiti.md`) | `operator-fact-review-cron.json` | 2026-11-05T00:01:09Z |
| Fact-signed worksheet (original labels verbatim, 0 fact verdicts) | `OPERATOR_RATIFIED` | `fact-adjudication-cron.json` SHA `19f21b9db8e2a2ebda7a76f9d300bf1b35093d286c745a8c0a36ebcde587d59b` | 2026-11-05T00:01:09Z |

## Pending (explicitly not signed)

1. **Re-drain execution** — one operator-initiated post-exit start of the existing
   unit (`systemctl --user start ghdev81-holdout-cc5349fc.service`) after all
   inference-holding harnesses have exited.
2. **Fresh fact verdicts** — if the re-drain emits and persists model facts, a new
   consolidated private fact-review packet (actual assertions + excerpts + provenance)
   requires a single operator adjudication; the current 0-fact sign-off does not cover
   them.
3. **Fresh installed-client semantic recall** (≥ 0.80) and **interactive context
   latency** (p95 ≤ 300 ms) — distinct later gates on an installed client; not
   substitutable by this campaign's offline measurements.
4. **Central gates** — exact-head independent PR review (Central-owned), late Codex
   if available, authorized merge, main CI, and final #81/#78 closure (Central).

## Boundaries honored

No new PR, no merge, no issue closure, no production deployment, no EX-gate edits,
no model replay, no Graphiti writes, no sealed-holdout relabeling, no source remote
update. One sanitized evidence-only commit on `issue/81` (this packet) is the sole
permitted remote mutation.
