# Issue #81 — qualified shortlist: consolidated evidence packet

- **Campaign:** `ISSUE81_QUALIFIED_SHORTLIST_V1`
- **Repository:** `fvanevski/opencode-operational-schema-guard`
- **Issue / PR:** #81 / #89 (draft, kept draft)
- **Controlling handoff:** `docs/issue-78/v2-benchmark/ISSUE81_QUALIFIED_SHORTLIST_HANDOFF.md` at the exact head
- **Implementation branch:** `issue/81-source-recall-correction`
- **Exact head:** `0a62d220edd5d7f814dbb736f51e373ade2d0e89` (tree `ccf903e097ad260c3f2da424da6e047647c36b1a`), subject `docs(graphiti): stage full exact-head Issue 81 qualified-shortlist host contract`
- **Controller base / remote main:** `9a27b73de882c0af6fec4d86de81945338611479` (verified equal)
- **Prior Central source SHA:** `690b48d695ed4ad87e63e8fcd9b775da8568c6e2` (diff to head is the staged contract document only)
- **Evidence branch:** `issue/81-recall-acceptance` at base `53df326e5d9540275ac4f92fd57ff1a5c30828e6`
- **Production scope:** group `development-knowledge`, workspace `/workspace/mcp_servers/gh_mcp`, project `gh_mcp`
- **Graphiti endpoint:** `http://127.0.0.1:8766/mcp` (read-only `get_episodes` / `search_memory_facts`, serial)

## Result summary

| Axis | Result |
|---|---|
| Exact-head source + focused suites | 58/58 pass, exit 0 (previously-failing "facts 13–24" test now passes); `node --check` 7/7 |
| Trusted exact-head receipts | `node-contract` PASS at head (run `42292380304`); repository-final Verify PASS at base (run `42292452449`); focused benchmark suites covered locally, not duplicated |
| Remote persistence proof | **219/219** persisted index UUIDs confirmed in the live episode list (untruncated, group-pure); **all five** previously-missing expected UUIDs (S03/S05/S07/S10/S13) present; architecture **not** blocked |
| Host index recheck | 366 records / 219 persisted unique UUIDs (grown from 358/214); perms 700/600, owner filip |
| One-pass exposed offline replay (staged `Memory.search`) | **12/16 exact-source** (frozen 8/16 and 9/16 unchanged; control 11/16 unchanged); **S07 recovered**; 0 regressions; threshold 13/16 **not met** |
| Residual earliest stage | Relevance/selector policy: S03/S05/S13 below the 0.34 topical floor (or named-term fence); S10 complete metric tie resolved by index order to a same-session sibling |
| Negative controls | N01/N03/N04 `PASS_NO_INJECTION`; N02 frozen `FAIL_INJECTED` preserved; structural fail-closed 7/7; no source-context leak; MCP serial |
| Latency (serial, n=20 e2e) | e2e p50 187 ms / p95 257 ms / max 526 ms (one transient N01 spike); d24 search p50 152 ms; `get_episodes` warm p50 23 ms; curated scan p50 34 ms; 300 ms fence unchanged; `HOOK_P95=UNVERIFIED` |
| Human-grounded precision (126 facts) | worksheet SHA256 `9f9152cc…` intact, `PENDING_OPERATOR_ADJUDICATION`, all verdicts null → **UNVERIFIED** |
| PR #89 | **NOT host-review-ready** pending ONE bounded Central selector-policy correction (see `central-disposition.md`) |

## Files

| File | Content |
|---|---|
| `source-and-tests.json` | Phase A: remote authentication, staged-change scope, A.3 implementation checklist, syntax checks, focused-suite result, trusted receipts |
| `candidate-shortlist-replay.json` | Phase C: 20-case exposed offline replay matrix (per-case candidate/shortlist counts and order, exact selected/expected identities, score, residual stage diagnosis) |
| `remote-authority-and-latency.json` | Phase B/D: live episode-list proof (5/5 expected, 219/219), host-index recheck, installed-config readback, serial latency measurements |
| `negative-and-fence-readback.json` | Phase C.13: negative case outcomes, secret/wrong-group/false-verified status, source-context leak status, structural fail-closed controls, serial MCP verification |
| `central-disposition.md` | The decision packet for Central: residual defects, bounded correction scope, readiness verdict |
| `command-shape-friction.json` | Full canonical command-shape friction ledger |

## Sanitization

No question text, original transcripts, private worksheets, model traces, credentials or operator-specific text are included. Case IDs, episode UUIDs, source references (native `opencode:` handles), counts, statuses and hashes are the published evidence surface. Raw prompts, fact texts and private replay logs remain host-private (0600, outside Git).

## Immutables preserved

Frozen roster SHA256 `47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652` (re-verified this campaign); frozen Phase A 8/16; frozen post-S06 native 9/16; control campaign 11/16; N02 `FAIL_INJECTED`; 126-fact worksheet SHA256 `9f9152cc1a5c0defc616dcced2869d30aa21738f78d698a5b8b2777659b7b56c`.
