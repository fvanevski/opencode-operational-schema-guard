#!/usr/bin/env bash
# Issue #92 A3 — single bounded POST-EXIT operator action.
# Run ONLY after the interactive OpenCode harness has exited (the drain gate
# fail-closes while a harness process is active). Executes the four two-arm
# drains SEQUENTIALLY, each under its own genuine EX admission via the
# EXISTING post-exit drain wrapper (no new daemon, no lease-gate bypass).
# Each arm writes only to its disposable fixture group + state root.
set -u
W=/tmp/opencode/issue92-a1-a3
GATE_SOURCE=/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py
GATE_CONFIG=/home/filip/.config/openviking/commit-gate.toml
EX_WRAPPER=/home/filip/.config/opencode/plugins/ghdev-graphiti-memory/docs/issue-75/v2-candidate/post-exit-drain.py
ENDPOINT=http://127.0.0.1:8766/mcp
MAX_SECONDS=600
export LOCAL_CURATOR_URL=http://127.0.0.1:8002/v1/chat/completions
export LOCAL_CURATOR_MODEL=chat-fast
export LOCAL_CURATOR_API_KEY=local

run_arm() {
  local name="$1" cli="$2" group="$3" state="$4"
  echo "=== A3 arm: ${name} (group ${group}) ==="
  python3 "$EX_WRAPPER" \
    --gate-source "$GATE_SOURCE" \
    --gate-config "$GATE_CONFIG" \
    --cli "$cli" \
    --group "$group" \
    --state-dir "$state" \
    --endpoint "$ENDPOINT" \
    --max-seconds "$MAX_SECONDS" \
    --lock-timeout 120
  local rc=$?
  echo "=== A3 arm ${name} exit=${rc} ==="
  # Per-arm readback (non-replay): record terminal states + remote UUIDs.
  node "$cli" list --group "$group" --state-dir "$state" 2>/dev/null \
    | python3 -c 'import json,sys
try:
 d=json.load(sys.stdin)
 for it in d.get("items",[]):
  print(it["id"][:16],it["state"],it["decision"],it.get("utility_class"),it.get("remote_episode_uuid"))
except Exception as e:
 print("list readback unavailable:",e)'
}

run_arm base-dev      "$W/baseline/docs/issue-78/v2-curator/curator-cli.mjs"  graphiti-curator-utility-development-r01 "$W/state/base-dev"
run_arm cand-dev      "$W/candidate/docs/issue-78/v2-curator/curator-cli.mjs" graphiti-curator-utility-development-r02 "$W/state/cand-dev"
run_arm base-holdout  "$W/baseline/docs/issue-78/v2-curator/curator-cli.mjs"  graphiti-curator-utility-holdout-r03     "$W/state/base-holdout"
run_arm cand-holdout  "$W/candidate/docs/issue-78/v2-curator/curator-cli.mjs" graphiti-curator-utility-holdout-r04     "$W/state/cand-holdout"
echo "=== A3 two-arm post-exit campaign complete ==="
