# Reproducibility — Issue #81 native-source audit

Read-only commands and helpers used, the source identities they bind to, and
the bounded results. No Graphiti write, no curator drain, no queue mutation, no
EX lease bypass, no new native session, and no re-run of the acceptance
campaign were performed.

## 1. Source identities (all verified)

| Artifact | Identity |
| --- | --- |
| Merged main | `b39e1ff7d950075273fc2dab7206c5f8a17add70`, tree `7c5486fefc12063c70c5839d63a300c630c925d0` |
| Working branch head (evidence parent) | `b58bde911a8a4f4aa1856315dc363f1fbaa68837` |
| Operator packet (126 items) | SHA-256 `c110acd3bcc9fa6e62f347c285bd61fd542e2a826634fa1134bac78a1f204e52` |
| Phase A worksheet | SHA-256 `9f9152cc1a5c0defc616dcced2869d30aa21738f78d698a5b8b2777659b7b56c` |
| As-of snapshot | SHA-256 `c8d5053c16ac7a07447c71d0bb5e7c4ce665940cdba3263119bdb25d6524ef37` |
| Recall roster | SHA-256 `47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652` |
| Curation store | `/home/filip/.local/state/ghdev-graphiti/curation-v1/development-knowledge` (237 records; 140 persisted; 140 `_episode-index` files) |

All three pinned SHA-256 identities (operator packet, worksheet, snapshot) were
re-hashed and matched. The 126 packet `record_id`s all resolve to present
curation records.

## 2. Helpers (executed, read-only)

- `helpers/bind-source-events.py` — binds the 126 facts to their source events
  and computes UTF-8 byte offsets; writes `fact-source-bindings.jsonl`,
  `native-event-source-evidence.jsonl`, `source-match-reproduction.json`,
  `authority-temporal-review.json`, `full-matrix.json`.
- `helpers/build-recall-diagnostics.py` — joins the frozen Phase B results to
  the curation store; writes `recall-case-diagnostics.json`.

Both are deterministic parsers/joiners. They issue **no** Graphiti calls and do
not implement a second retrieval path.

## 3. Bounded results

- **126/126** facts = `EXACT_NATIVE_SOURCE_MATCH`; byte offsets verified
  (`source_text_bytes[start:end] == assertion_bytes`) for all 126.
- **8** facts are verbatim in the single *displayed* packet excerpt
  ({11, 38, 47, 70, 75, 79, 80, 124}); the other **118** are verbatim in a
  non-displayed source event of the same record (records carry 2–8 source
  events). This explains "only 8 independently matchable against the displayed
  excerpt."
- **1** item (60) has two qualifying events (the assertion appears in two
  tool-outcome events); the source-ref-consistent event is the authoritative one.
- Evidence classes: 103 assistant / 18 tool / 5 user. Roles and native
  timestamps are independently present for all 126 (role from `event.kind`,
  timestamp from `events[].observed_at`).
- **Seven** wrong-source cases (S01, S03–S07, S10): the injected source is a
  different-but-related persisted fact with legitimate provenance (none shares
  an assertion/episode with its expected source).
- **S13**: absent GHDEV block; censored-or-no-match; missing-source-index ruled
  out (expected episode `009974d2-…` is in `_episode-index`).
- **N02**: injected fact is in the active `development-knowledge` group
  (not `ghdev_gh_mcp`); a correctly-grouped, undesired topic-relevance
  admission, not a cross-group leak.

## 4. Unavailable evidence (stated honestly)

- The **full Graphiti `search_memory_facts` returned fact set** for each prompt
  is **not** persisted in the frozen Phase B traces (only the selected injected
  fact and the expected fact are recoverable). The per-prompt returned
  `episodes[]` arrays are therefore **not directly observable** here.
- The **300 ms `Promise.race` disposition** for S13 is **not** separately
  recorded; an absent block is observationally indistinguishable from a
  timeout without plugin modification (per `native-context-latency.json`).
- **Human `human_verdict`** fields for all 126 facts are null (awaiting
  operator adjudication); no human-certified grounded precision is computed.

These gaps are recorded as `UNVERIFIED` in `recall-case-diagnostics.json` and
`diagnostic-summary.md`; they are not filled by inference.

## 5. How to re-run

```bash
# from an authenticated checkout of the evidence branch
python3 docs/issue-78/evidence/81-native-source-audit-v1/helpers/bind-source-events.py
python3 docs/issue-78/evidence/81-native-source-audit-v1/helpers/build-recall-diagnostics.py
```

Both scripts read the frozen operator packet and the private curation store
(paths recorded above) and regenerate the JSONL/JSON evidence deterministically.
