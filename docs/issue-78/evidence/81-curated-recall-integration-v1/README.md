# Issue #81 — source-authorized curated recall integration: consolidated evidence packet

- **Campaign:** `ISSUE81_CURATED_RECALL_INTEGRATION_V1`
- **Repository:** `fvanevski/opencode-operational-schema-guard`
- **Issue / PR:** #81 / #89 (draft, kept draft)
- **Controlling handoff:** `docs/issue-78/v2-benchmark/ISSUE81_CURATED_RECALL_INTEGRATION_HANDOFF.md` at the exact head
- **Implementation branch:** `issue/81-source-recall-correction`
- **Exact head:** `bcab0311b8c7c0486ebe931b0a024a88cd47adc7` (tree `2ad8055d1a00d77dc80641fec6aefd1461a3e3a8`)
- **Controller base / remote main:** `9a27b73de882c0af6fec4d86de81945338611479` (verified equal)
- **Evidence branch:** `issue/81-recall-acceptance` at base `5edffd7378459474267fb7d4529590a4aaae3f67`
- **Production scope:** group `development-knowledge`, workspace `/workspace/mcp_servers/gh_mcp`, project `gh_mcp`
- **Graphiti endpoint:** `http://127.0.0.1:8766/mcp` (read-only `get_episodes` / `search_memory_facts`)

## Result summary

| Axis | Result |
|---|---|
| Exact-head source + focused suites | 51/52 pass; 1 staged production test fails (substantive source-selection defect, reported to Central, not repaired locally) |
| Trusted exact-head Actions receipts | `local-host-verify` PASS (receipt `c24b79d588f5`), `node-contract` PASS |
| Remote persistence proof | 214/214 persisted index UUIDs confirmed in the live episode list; **all five** previously-missing expected UUIDs (S03/S05/S07/S10/S13) present; architecture **not** blocked |
| Host index recheck | 358 records / 214 persisted unique UUIDs (grown from 274/165); perms 700/600, owner 1000 |
| Latency (serial, n=1) | get_episodes first 60 ms / warm 32 ms; d24 search first 143 ms / warm 138 ms; curated resolve 50 ms; combined stage 37 ms; `HOOK_P95=UNVERIFIED`; 300 ms allowance unchanged |
| Negative controls | 12/12 fail-closed controls pass; MCP calls serial; N02 frozen `FAIL_INJECTED` preserved |
| One-pass exposed offline replay (staged `Memory.search`) | **11/16 exact-source** (frozen 8/16 and 9/16 unchanged); 0 regressions vs 9/16; threshold 13/16 **not met** |
| Residual earliest stage | selector shortlist/eligibility stage (retrieval + index admission succeed for all five residuals) |
| Human-grounded precision (126 facts) | packet available, original hash intact, all agent verdicts null → **UNVERIFIED** |
| PR #89 | **not source-review-ready** pending ONE bounded Central correction (see `central-disposition.md`) |

## Files

| File | Content |
|---|---|
| `exact-head-source-tests.json` | Phase A: remote authentication, diff scope, syntax checks, focused-suite result with failure analysis, trusted receipts, context-fence projection |
| `remote-persistence-and-latency.json` | Phase B: live episode-list proof (5/5 expected), host-index recheck, serial latency measurements |
| `sixteen-case-offline-matrix.json` | Phase C: 20-case exposed offline replay matrix with per-case selection, frozen 9/16 labels, new status, score and residual stage diagnosis |
| `negative-controls-and-authority.json` | Phase B.9: 12 fail-closed controls, serial MCP verification, negative case outcomes, authority verdicts |
| `central-disposition.md` | The decision packet for Central: defect, bounded correction proposal, readiness verdict |
| `command-shape-friction.json` | Full canonical command-shape friction ledger |

## Sanitization

No question text, original transcripts, private worksheets, model traces, credentials or operator-specific text are included. Case IDs, episode UUIDs, source references (native `opencode:` handles), counts, statuses and hashes are the published evidence surface. The 126-fact operator worksheet and all raw traces remain host-private.

## Immutables preserved

Frozen roster SHA256 `47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652`; frozen Phase A 8/16; frozen post-S06 native 9/16; N02 `FAIL_INJECTED`; 126-fact worksheet SHA256 `9f9152cc1a5c0defc616dcced2869d30aa21738f78d698a5b8b2777659b7b56c` (packet sidecar `c110acd3bcc9fa6e62f347c285bd61fd542e2a826634fa1134bac78a1f204e52`).
