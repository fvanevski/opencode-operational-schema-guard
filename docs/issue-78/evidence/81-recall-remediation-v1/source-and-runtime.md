# Issue #81 — Source and Runtime Identity (81-recall-remediation-v1)

## Source under test (staged candidate)

- **Repo:** `fvanevski/opencode-operational-schema-guard`
- **Branch:** `issue/81` (draft PR #83)
- **Tested exact head:** `7b7d62685993e56e2b71b77846a6a0c1092d7d01`
- **Base:** `d7c32f503eaa4cf4c52bb055b434e0ac71b76f45`
- **Disposable detached worktree:** `/tmp/opencode/issue81-qual/terminal81-a1f3c9/worktree` (created at the exact head; developer worktrees untouched)
- Staged production source: `docs/issue-78/v2-candidate/{events,plugin,queue}.mjs`, `docs/issue-78/v2-curator/core.mjs`, `docs/issue-78/v2-benchmark/{evaluate,stage-holdout,adjudicate}.mjs`.
- Product source was **not** modified in the worktree. Two demonstrated Central source defects were verified with minimal patches on a **separate** scratch tree (`scratch-evalfix`), not applied to the worktree.

## Frozen corpora (SHA-pinned, immutable)

| Corpus | SHA-256 | Cases | Notes |
|---|---|---|---|
| Historical dev (issue #75) | `22ae11e6…fb5b4` | 57 | labels unchanged, reused |
| Historical exposed holdout | `f904411e…fce4` | 9 | NOT scored, NOT reused as blind |
| Prospective dev (this campaign) | `d3822a30…f0cd7` | 12 | real-native, provisional labels |
| Prospective independent holdout (this campaign) | `2435236a…bed2a` | 5 | real-native, blind, provisional labels |

## Native V2 runtime identity

- **Binary:** OpenCode V2.2.5 at `/home/filip/.opencode/bin/opencode`, invoked through the installed shim `/home/filip/.local/lib/openviking-agent-shims/opencode` (`opencode --version` → `v2.2.5`).
- **Candidate plugin load route:** disposable native-loader package `native-plugin/` re-exports the worktree `plugin.mjs` and times the `session.context` hook. Loaded via `OPENCODE_CONFIG` → `native-config.json` (dev group `cur81_native_a1f3c9d7`) and `native-config-holdout.json` (independent holdout group `cur81_native_holdout_a1f3c9`).
- **Isolation:** dedicated temporary group, workspace (`native-ws/fsm81`) and state root (`state/`); production `ghdev_gh_mcp` and earlier `cur81_*` groups untouched.
- **Model:** `local/chat-fast` → LiteLLM `127.0.0.1:8002` → NInfer `127.0.0.1:8001` (Qwen3.8-27B NVFP4). `chat-fast` is non-thinking (`enable_thinking=false`, no `reasoningEffort` client field).
- **Graphiti MCP:** `127.0.0.1:8766/mcp` (live).
- **Interactive capture latency:** dev n=166 p50=0ms p95=2ms; independent holdout n=114 p50=0ms p95=2ms (target ≤300ms → PASS).

## Two demonstrated Central source defects (verified, bounded repair)

Both were found via source-first native capture and verified with a minimal patch + failing regression on `scratch-evalfix` (78/78 pass). Neither is a silent product push; both are recommended as a minimal complete diff to Central.

1. **Defect #1 — `evaluate.mjs` qualification-group identity.** In a *distinct* qualification group, a non-binding `source_event_ids` receipt throws `missing_candidate:<case>` instead of `qualification_source_identity_mismatch`. Fix: compute `qualifying = observations?.scope && observations.scope.group !== corpus.scope.group` and, when `!matching.length`, fail with `qualification_source_identity_mismatch` when `requested.size && qualifying`, else `missing_candidate:<case>`. Regression: `evaluate.test.mjs` (1 test) — RED on staged source, GREEN on scratch.
2. **Defect #2 — `events.mjs` `promptText()` multi-line native prompts.** Native JSON-wrapped user prompts with a raw newline inside the wrapper are not strict JSON; the staged `JSON.parse` throws and the **whole** long message is lost. Fix: escape control chars (`\u0000-\u001f` → `\uXXXX`) before retrying `JSON.parse`. Regression: `long-multiline.test.mjs` (RED on staged, GREEN on scratch). This is the sole dev recall FN (the code+prose case): staged dev recall 0.8333 → patched 1.0000.

## Source invariants (16/16 pass, `logs/invariant-probe.json`)

Whole-source secret/SELF veto at the tail, ≤6 spans, each span ≤900 chars, every excerpt an exact substring, `opencode:<ses>:message:<id>:span:<offset>` handle format, long-prompt-requires-native-message-ID, short-prompt session-scoped fallback, deterministic distinct event IDs, queue dedup on re-stage, cross-scope forged-group rejection, `user-stated` (never `verified`) evidence class, `read` tool produces **no** `file_change` receipt (distinct, not substituted), `edit` produces a tool-reported `file_change`, and the 1100-char excerpt bound.
