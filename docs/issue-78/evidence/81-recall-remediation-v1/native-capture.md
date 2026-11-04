# Issue #81 — Native V2 Capture Evidence (81-recall-remediation-v1)

Real stock-OpenCode-V2.2.5 capture through the candidate plugin in an **isolated** workspace/group/state root (not production `ghdev_gh_mcp`). No reconstructed SQLite substituted for real events; the private native store (`~/.local/share/opencode/opencode.db`, `session_message`) is the source of the prompt texts.

## Sessions and groups

| Group | Session | Events staged | Purpose |
|---|---|---|---|
| `cur81_native_a1f3c9d7` | `ses_e5811b72dffeHsBS4pVp98BgX7` | 30 | dev native turns (long decision, code+prose, secret-late, SELF, shell fail→fix→pass, out-of-ws read, duplicate, chatter, historical, superseded) |
| `cur81_native_a1f3c9d7` | `ses_e580b2363ffe2137nXSJ4rKWS9` | 66 | early holdout turns (superseded by the independent group below) |
| `cur81_native_holdout_a1f3c9` | `ses_e58011dbcffe6BQFG72bafKK8c` | 51 | **independent blind holdout** (fresh workspace `native-ws-holdout/fsm81`, disjoint group) |
| `cur81_native_p81a1f3c9` | `ses_e580da4c6ffeTf37kcEYgWxW0z` | 14 | patched-source (defect #2) demonstration: the multi-line narrative span is now captured |

## Real admitted prompt / tool identities (dev group)

Captured `user_turn` events bind native message IDs (`source_strength: native-id`):
- `msg_1a7ef3f9a…` long decision (1292 chars) → **2 spans**
- `msg_1a7ef64ae…` code+prose (1397 chars, raw newline) → **0 spans on staged source** (defect #2); **captured on patched source**
- `msg_1a7ef7df2…` secret-late (1230 chars) → **0 spans** (whole-source `PRIVATE` veto on `api_key=sk-live-…`)
- `msg_1a7ef9581…` SELF `[GHDEV_GRAPHITI_CONTEXT]` → **0 spans** (SELF veto)
- `msg_1a7efaded…` shell (267) → 1 span
- `msg_1a7f031fc…` out-of-workspace read (189) → 1 span (user-stated; `read` produces **no** `file_change`)
- `msg_1a7f06404…` duplicate of the long decision (1292) → 2 spans (known duplicate)
- `msg_1a7f34850…` historical (277) → 1 span; `msg_1a7f37606…` superseded (249) → 1 span
- Chatter `ok` (2 chars) → 0 spans (below threshold)

`file_change` receipts: `edit`/`write`/`apply_patch` only (21 across the dev group). `tool_outcome` receipts: shell `execute.after` (11). No source-class inflation: `read` stays a distinct observation, never a `file_change`.

## Safe exclusions (privacy / SELF / scope / read-only)

- **Privacy:** secret-late and the independent-holdout secret (`api_key=sk-hold-…`) are whole-source vetoed → 0 spans, 0 leakage.
- **SELF:** `[GHDEV_GRAPHITI_CONTEXT]` / `[OPENVIKING_CONTEXT]` markers veto → 0 spans.
- **Wrong-group:** queue rejects a forged cross-scope group (invariant probe check 11).
- **Read-only:** out-of-workspace `read` is captured as a `user_turn` observation only; no raw file contents persisted, no `file_change`.

## Multi-span binding + span identity

A single long native message yields up to 6 bounded contiguous ≤900-char spans, each with a distinct event ID computed from the exact `opencode:<ses>:message:<id>:span:<offset>` handle. The long decision and its duplicate each produced 2 spans; the independent-holdout `h1c` (1128 chars) produced 2 spans. Real model observation receipts must bind **each** cited span event ID (contract §6).

## Interactive capture latency

dev n=166 p50=0ms p95=2ms; independent holdout n=114 p50=0ms p95=2ms (target ≤300ms → PASS). No interactive model call, Graphiti write, or speculative prompt admission during capture.

## Source span loss

Sole span loss under the staged source is the code+prose message (defect #2, multi-line JSON wrapper). All other long messages are fully span-covered. The patched-source group `cur81_native_p81a1f3c9` demonstrates the recovery.
