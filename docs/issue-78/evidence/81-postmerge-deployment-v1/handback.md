# Issue #81 Post-Merge Deployment (ISSUE81_POSTMERGE_DEPLOYMENT_V1) — Operator Summary

**Result: PHASE_A_RESULT=PARTIAL** — disk promotion and all source/config/rollback
authentication PASS; live-service module activation is `SERVICE_ACTIVATION_PENDING_OPERATOR`
(the executing Build session is a client of the shared `opencode serve --service`
instance, so its restart is an operator action, not an unsafe self-restart).

## What was done

1. **Source authentication.** Controller checkout clean at merged main
   `9a27b73de882c0af6fec4d86de81945338611479` (tree `d0ec0894...`); origin/main
   re-verified via GitHub API at the same commit (no advance). Blob
   `35747ac8...` for `docs/issue-75/v2-candidate/relevance.mjs` authenticated at the
   merged commit; SHA-256 `9767486e...` matches the contract.
2. **Live installation.** Plugin root `/home/filip/.config/opencode/plugins/ghdev-graphiti-memory`
   (binary v2.2.5, shim `/home/filip/.local/lib/openviking-agent-shims/opencode`).
   Installed `relevance.mjs` was `8db95233...` (PRE_FIX) → eligible one-file promotion.
   Import graph: `issue-78/v2-candidate/plugin.mjs` (entry) → `issue-75/v2-candidate/plugin.mjs`
   → `./relevance.mjs` (also dynamically imported by `memory-core.mjs`); one file suffices,
   no duplicate plugin roots.
3. **Config preserved.** Generated `opencode.json` SHA-256 `ea7653be...` unchanged;
   bindings group=`development-knowledge`, workspace=`/workspace/mcp_servers/gh_mcp`,
   project=`gh_mcp`, capture=true, endpoint `http://127.0.0.1:8766/mcp`. No config
   migration required.
4. **Rollback captured** at
   `/home/filip/.local/state/ghdev-rollback/issue81-postmerge-v1-20261106T172421Z`
   (pre-bytes `8db95233...`, full pre tree manifest, config digests, service epoch,
   rollback instruction). Outside the live plugin dir.
5. **Focused tests at the merged commit:** `node --check` OK; `node --test`
   (relevance-priority-regression + relevance + relevance-observation-replay) =
   **17 pass / 0 fail, exit 0**. CI provenance: push-to-main run `42259430882`
   SUCCESS at the exact head.
6. **Atomic promotion:** staged bytes (git-show from the merged commit, same
   filesystem `/dev/nvme0n1p2`), SHA-256 verified, pre-bytes preserved, atomic
   `mv`, readback `9767486e...`. Full plugin-tree pre/post manifest diff: exactly
   one line changed (the promoted file).
7. **Service activation pending.** Affected service = bare process
   `opencode serve --service` PID 1907917 (started 2026-11-05 22:16:09, no unit).
   Restarting it kills this Build session (TCP client + MCP child processes), so the
   transition is returned to the operator:
   - **Operator one-command:** stop the serving instance and relaunch
     `/home/filip/.opencode/bin/opencode serve --service`
   - **Post-restart proof:** new PID/start time, new listener (`ss -tlnp`), plugin-load
     lines with no import errors in `/opt/filip/.local/share/opencode/log/opencode.log`,
     installed-file SHA-256 readback `9767486e...`.
8. **Frozen evidence authenticated.** Roster
   `47e141bd...` (16 positives + N01–N04); frozen results `57c78463...`
   (8/16 FAIL vs 13/16; N02 FAIL_INJECTED); precision packet
   `c110acd3...` (126 items; 103 assistant / 18 tool / 5 user; 126/126
   `human_verdict=null`). Private adjudication inventory generated
   (`3f62d11d...`), flagging items 55/79 (user interrogative), 62 (user
   instructional), 13/74 (user-stated), and 9 compound-proposition items.
   Targets: `targets.proposed.json` is `central_proposal` — governing
   human-ratified target UNVERIFIED.

## Observed results

- SOURCE_PROMOTION=PASS (8db95233 → 9767486e, atomic, verified)
- FOCUSED_TEST_RESULT=PASS (17/17, exit 0)
- MERGED_MAIN_CI_RESULT=PASS (run 42259430882, re-verified)
- CONFIG_PRESERVED=yes
- ROLLBACK_READY=yes, ROLLBACK_EXECUTED=no
- MODULE_ACTIVATION=UNVERIFIED (pending operator restart)
- SERVICE_HEALTH=PASS pre-restart (serve HTTP 200; Graphiti endpoint reachable;
  OpenViking gate active)
- UNEXPECTED_HOST_CHANGES=none (state-dir candidate events are normal live-capture
  activity of the running service, not deployment writes)

## Risks / stop boundary

- No fresh-process acceptance was run in this session (contract boundary).
- Precision stays UNVERIFIED until independent human verdicts are supplied.
- If the operator restart fails, restore from the rollback root (see ROLLBACK.md)
  and re-verify digests; the promotion is a single file.
- Issue #81 is **not** declared accepted.
