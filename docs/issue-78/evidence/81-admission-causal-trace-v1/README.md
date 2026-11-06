# Issue #81 — admission-cause and tie-break trace: consolidated evidence packet

- **Campaign:** `ISSUE81_ADMISSION_CAUSAL_TRACE_V1`
- **Repository:** `fvanevski/opencode-operational-schema-guard`
- **Issue / PR:** #81 / #89 (draft, kept draft)
- **Controlling handoff:** `docs/issue-78/v2-benchmark/ISSUE81_ADMISSION_CAUSAL_TRACE_HANDOFF.md` at the exact head
- **Implementation branch:** `issue/81-source-recall-correction`
- **Exact head (authenticated):** `57d25648bb73f86de84009e3f4ead98897d29370`
- **Controller base / remote main:** `9a27b73de882c0af6fec4d86de81945338611479` (verified equal)
- **Pre-diagnostic source head (prior packet):** `0a62d220edd5d7f814dbb736f51e373ade2d0e89`
- **Evidence branch:** `issue/81-recall-acceptance` at base `93ed977d5000f0caf02be1d01aa63ab4b1112635`
- **Production scope:** group `development-knowledge`, workspace `/workspace/mcp_servers/gh_mcp`, project `gh_mcp`
- **Graphiti endpoint:** `http://127.0.0.1:8766/mcp` (read-only; used only for host-snapshot reconfirmation where noted)

## Result summary

| Axis | Result |
|---|---|
| Exact-head source + focused suites | `node --check` 2/2; staged focused suite **23/24 pass, exit 1** — one staged-test regex case-sensitivity defect (`/Invalid|Unsafe/` vs thrown `Missing/invalid source-bound ...`); the private-fact rejection itself works; no production behavior change |
| Diagnostic purity | CPU-only, literal imports only (node:fs/promises, node:crypto, node:path, node:url + staged relevance/memory-core functions); no remote calls, no mutation; output carries digests, reason codes, booleans and counts only |
| One pure trace | `issue81-admission-audit.mjs --input <private adapter>` exit 0; adapter 0600 in 0700 scratch, SHA256 `d34726830e...`; roster SHA256 `47e141bd...` re-verified; private inputs byte-unchanged (pre/post digests) |
| S03 / S05 / S13 | First *actual* rejection predicate is **NAMED_IDENTITY** (named-term fence) in both the direct and linked evaluations — NOT the 0.34 topical floor (`topical=true`, `scoreFloor034Applied=false`). Linked-fallback prerequisite met; the missing named term is absent from the native excerpt as well |
| S10 | **Complete metric tie** (3/0.500 on all sort keys) between same-session sibling tool sources; selection flips with input order → **INPUT_ORDER_AMBIGUITY**; stated propositions independently inspected and distinguishable (expected states the commit change; observed is a setup command) |
| Diagnostic cross-check | `explainRelevanceAdmission().admitted` equals shortlist membership for all 8 candidate objects (0 mismatches); pairwise selector outcomes match the trace |
| Scores | 12/16 exposed offline and 9/16 post-S06 native **unchanged** (no new full replay launched); frozen 8/16 and control 11/16 untouched; S06 temporal preference protected; N02 frozen FAIL_INJECTED preserved |
| `HOOK_P95` | UNVERIFIED (no fresh native hook telemetry staged) |
| Human precision | UNVERIFIED (126-fact worksheet adjudication still pending operator) |

## Files

| File | Content |
|---|---|
| `admission-reason-matrix.json` | Per-case reason codes, identity-match booleans, overlap counts/scores, linked-fallback status, pairwise order outcomes, digests |
| `s10-tie-authority.json` | S10 complete-tie metrics, pairwise shortlist/selector outcomes, proposition-class distinction, tie-break note |
| `central-diagnostic-disposition.md` | The decision packet for Central: causal findings + one bounded correction proposal with negative regressions |
| `command-shape-friction.json` | Canonical command-shape friction ledger |
| `SHA256-MANIFEST.txt` | Packet file digests |

## Sanitization

No question text, raw fact assertions, event excerpts, credentials, operator worksheets or human-precision verdicts are included. Case IDs, episode UUIDs, evidence classes, source-ref SHA-256 digests, query SHA-256 digests, overlap counts/scores, reason codes and boolean identity-match flags are the published evidence surface. The private adapter (0600) and complete local logs remain host-private (outside Git).

## Immutables preserved

Frozen roster SHA256 `47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652` (re-verified this campaign); frozen Phase A 8/16; frozen post-S06 native 9/16; control campaign 11/16; exposed offline 12/16; N02 `FAIL_INJECTED`; 126-fact worksheet SHA256 `9f9152cc1a5c0defc616dcced2869d30aa21738f78d698a5b8b2777659b7b56c`; no production recall policy, threshold, output shape, native timeout or test gate changed by this campaign.
