# Issue #81 — first integrated qualification campaign handback

## Result

`PARTIAL_READY_FOR_POST_EXIT` — the CPU benchmark, corpus freeze, pre-exit EX exclusion, disposable wake arming, and portal/CLI focused acceptance are complete and evidence-archived. Real model curation + Graphiti persistence are admitted **only after** the active Build harness exits (canonical EX lease); the disposable drain unit is armed and will process the staged cohort automatically.

## Exact results

- Source: disposable worktree at `7922f31bdba125bac5a5f8a1380386ea15adda54` (branch `issue/81`); one bench-only evaluator fix applied locally and returned as `source.patch` (not pushed).
- Staged source checks: `node --check evaluate.mjs` OK; `evaluate.test.mjs` 6/6; `candidate.test.mjs` 15/15; `curator.test.mjs` 31/31; `graph-evidence.test.mjs` 5/5; `terminal-recovery.test.mjs` 6/6; `portal-api.test.mjs` 1/1; `render-qualification.test.mjs` 2/2; `memory-core.test.mjs` 9/9; `test_post_exit_drain.py` 13/13. **88/88 pass.**
- Corpora (pinned before scoring): dev 57 cases SHA-256 `22ae11e64a7a9c443d6f13a79c363115a28b43a27620e5383449bfe32d9fb5b4`; sealed holdout 9 cases SHA-256 `f904411e51d0bd9674b7f756f3df5bf44452ca8f63362d75102ceb9df677fce4` (NOT SCORED).
- Development split (gold_complete=true, 57 cases): baseline #75 `TP3/FP1/TN19/FN34` (recall 0.081); #79 broad capture `TP27/FP6/TN14/FN10` (recall 0.730 — below the unratified 0.85 central-proposal target); privacy/wrong-group selected = ∅.
- Pre-exit EX: `FAIL_CLOSED` (exit 2, "shared agent/gate lease held; bounded wait exhausted") with zero model calls and zero cur81 episodes; exclusive lease verifiably not acquirable while the harness is active.
- Armed wake: `ghdev-curator81-qual.path` (active) + `ghdev-curator81-qual.service` (Restart=on-failure, 30s), running the accepted `post-exit-drain.py` + instrumented drain CLI; 33 candidate events staged in `cur81_dev_ce555621`.
- Portal/CLI: see `portal-acceptance.md` (401/403/200 auth+origin surface on the real cur81 binding, queue 33 visible; full DEFER→SKIP lifecycle with 409 no-replay lockout and preview node/edge distinction on a disposable root).
- Production invariant control: `ghdev_gh_mcp` = 4 episodes, last updated `2026-11-03T01:47:36.450687+00:00`, identical to pre-campaign baseline; shared `mcp-mux`/gate/credential state untouched.

## Known gaps / evidence classes

- `MODEL_CURATOR`: no model decisions measured yet (0 by construction pre-exit). Final EMIT/DEFER/SKIP counts, tokens, and latency come from the post-exit drain (`usage.jsonl` + review store) and must be read back before the campaign is closed. If the model defers every case, that is a measured deficit to report, not a substitute seed.
- `GRAPHITI`: typed unresolved pre-exit (0 cur81 episodes). Positive acceptance requires the post-exit authenticated `get_episodes` readback (UUID/name match, exact native source index, ≥1 real extracted entity+relationship, zero duplicates).
- Shell stdout/exit observations are not persisted by this host build; corpus cases omit them (documented, not invented). 19 dev cases are `reconstructed_from_sanitized_receipt` (accepted #79 frozen controls) and 3 are `reconstructed_fixture`.
- Source-vs-host limits: evaluator metrics are computed from the frozen corpus; they do not by themselves prove installed fresh-native recall (that is the later installed acceptance gate).

## Accepted #79/#80 reuse

- #79 frozen samples used only as historical development controls with original labels; #79 capture logic and #75 selector tested on identical inputs.
- #80 `model.mjs`/`ReviewStore`/`CandidateQueue`/`curator-cli.mjs` + accepted Python EX gate wrapper used unchanged; #80 35/35 and 26/26 browser evidence reused as invariant controls (not re-run).
- The #80 terminal-recovery CLI accepts only `cur80_*` groups/units by design; the no-replay lockout invariant was therefore demonstrated through the portal API revision CAS (409), which is the same control surface.

## COMMAND_SHAPE_FRICTION (GHDEV-10 ledger)

| # | event | class | attribution | effect |
|---|---|---|---|---|
| 1 | `edit` tool multi-line `oldString` match failures on `evaluate.mjs` (exact od-verified content) | interface_discovery | agent tool | worked via scratch `node` patch script (`patch-eval.mjs`); patch preserved as `source.patch` |
| 2 | `write` tool truncated long `build-corpus.mjs` content twice | interface_discovery | agent tool | completed via heredoc appends; final file verified by hash |
| 3 | zsh `fuser`/glob scan of lock holders timed out (120s) | interface_discovery | host/tool | replaced with `/proc` fd-scan for lock holders |
| 4 | early SQLite `session_id` prefixes were truncated display values → "user prompt not found" | agent command | agent | fixed by re-querying full IDs |
| 5 | `echo ===` parsed by zsh as a command (`== not found`) in compound commands (two minor non-zero exits) | shell shape | agent | cosmetic; separators quoted thereafter |
| 6 | MCP `get_episodes` called with `group_id` (string) returned "No episodes found" for the production group | interface_discovery | agent | resolved by the accepted `memory-core` route using `group_ids` list form; production baseline then confirmed 4 episodes |

No guard rejections, no RTK shape loss, no masked producer failures; all acceptance-bearing commands' exit statuses were preserved.

## Post-harness automatic receipt (operator continuation)

1. Exit the Build harness (this session). The armed `ghdev-curator81-qual.service` retry loop (30s) will admit under EX at the next wake and drain the 33-event cohort.
2. Observe: `systemctl --user status ghdev-curator81-qual.service`; `journalctl --user -u ghdev-curator81-qual.service --no-pager`; `/home/filip/.local/state/ghdev-graphiti-issue81/usage.jsonl`; review store states via `curator-cli.mjs status/list` (group `cur81_dev_ce555621`, state dir `/home/filip/.local/state/ghdev-graphiti-issue81/qual81`).
3. Authenticated `get_episodes` readback for `cur81_dev_ce555621` (positive acceptance criteria in `graphiti-readback.json`); re-confirm `ghdev_gh_mcp` invariant (4 episodes).
4. Then — and only then — stop/disable/remove **only** the `ghdev-curator81-*` units, leave production services and old episodes untouched, and record the terminal states (a failed/unknown extraction stays inspectable).
