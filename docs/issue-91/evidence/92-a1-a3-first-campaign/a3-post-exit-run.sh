#!/usr/bin/env bash
# Issue #92 A3 — single bounded POST-EXIT operator action.
# Run ONLY after the interactive OpenCode harness has exited (the drain gate
# fail-closes while a harness process is active). Executes the four two-arm
# drains SEQUENTIALLY, each under its own genuine EX admission via the
# EXISTING post-exit drain wrapper (no new daemon, no lease-gate bypass).
# Each arm writes only to its disposable fixture group + state root.
set -Eeuo pipefail
W=/tmp/opencode/issue92-a1-a3
BASE_SHA=c8eb5260f2b10832346234b1b5d0cf28302ffba8
CANDIDATE_SHA=270848aa108df22b9d12738cc6f4903ec45da9c1
GATE_SOURCE=/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py
GATE_CONFIG=/home/filip/.config/openviking/commit-gate.toml
EX_WRAPPER=/home/filip/.config/opencode/plugins/ghdev-graphiti-memory/docs/issue-75/v2-candidate/post-exit-drain.py
ENDPOINT=http://127.0.0.1:8766/mcp
MAX_SECONDS=600
export LOCAL_CURATOR_URL=http://127.0.0.1:8002/v1/chat/completions
export LOCAL_CURATOR_MODEL=chat-fast
export LOCAL_CURATOR_API_KEY=local

# Pin the exact code consumed by the already-seeded queues; a newly advanced
# evidence branch must not silently alter either baseline or candidate code.
check_worktree() {
  local dir="$1" expected="$2" actual
  [[ -f "$dir/docs/issue-78/v2-curator/curator-cli.mjs" ]] || {
    printf 'A3_BLOCKED: missing curator CLI at %s\n' "$dir" >&2; return 2;
  }
  actual="$(git -C "$dir" rev-parse --verify HEAD)" || return 2
  if [[ "$actual" != "$expected" ]]; then
    printf 'A3_BLOCKED: source mismatch in %s: got %s, expected %s\n' "$dir" "$actual" "$expected" >&2
    return 2
  fi
}
check_worktree "$W/baseline" "$BASE_SHA"
check_worktree "$W/candidate" "$CANDIDATE_SHA"

run_arm() {
  local name="$1" cli="$2" group="$3" state="$4"
  echo "=== A3 arm: ${name} (group ${group}) ==="
  local rc
  if python3 "$EX_WRAPPER" \
    --gate-source "$GATE_SOURCE" \
    --gate-config "$GATE_CONFIG" \
    --cli "$cli" \
    --group "$group" \
    --state-dir "$state" \
    --endpoint "$ENDPOINT" \
    --max-seconds "$MAX_SECONDS" \
    --lock-timeout 120; then
    rc=0
  else
    rc=$?
    printf 'A3_ABORT: arm=%s exit=%s; later arms NOT attempted. Preserve existing EX/Graphiti receipts.\n' "$name" "$rc" >&2
    return "$rc"
  fi
  printf '=== A3 arm %s exit=0 ===\n' "$name"
  # This is local review-store readback, NOT positive Graphiti membership proof.
  node "$cli" list --group "$group" --state-dir "$state" \
    | python3 -c 'import json,sys
d=json.load(sys.stdin)
if not isinstance(d,dict) or not isinstance(d.get("items"),list):
 raise SystemExit("A3_INVALID_REVIEW_READBACK")
for it in d["items"]:
 print(it["id"][:16],it["state"],it["decision"],it.get("utility_class"),it.get("remote_episode_uuid"))'
}

run_arm base-dev      "$W/baseline/docs/issue-78/v2-curator/curator-cli.mjs"  graphiti-curator-utility-development-r01 "$W/state/base-dev"
run_arm cand-dev      "$W/candidate/docs/issue-78/v2-curator/curator-cli.mjs" graphiti-curator-utility-development-r02 "$W/state/cand-dev"
run_arm base-holdout  "$W/baseline/docs/issue-78/v2-curator/curator-cli.mjs"  graphiti-curator-utility-holdout-r03     "$W/state/base-holdout"
run_arm cand-holdout  "$W/candidate/docs/issue-78/v2-curator/curator-cli.mjs" graphiti-curator-utility-holdout-r04     "$W/state/cand-holdout"
printf 'A3_DRAINS_COMPLETED: all four wrapper exits=0; remote terminal/source-index proof and operator fact adjudication remain separate.\n'
