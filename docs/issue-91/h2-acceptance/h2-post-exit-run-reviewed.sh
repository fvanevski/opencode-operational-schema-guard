#!/usr/bin/env bash
# Issue #92 H2: one-shot, four-arm real model/Graphiti qualification.
# Operator host shell ONLY after the interactive harnesses have exited.
# Existing post-exit-drain.py exclusively owns EX admission and quiet-grace.
set -Eeuo pipefail

: "${H2_BASE_WORKTREE:?required absolute path to exact main detached worktree}"
: "${H2_CAND_WORKTREE:?required absolute path to exact candidate detached worktree}"
: "${H2_STATE_ROOT:?required absolute path to preseeded H2 disposable state root}"
: "${H2_RATIFICATION:?required path to private ratification JSON}"
: "${H2_FREEZE_MANIFEST:?required path to frozen original manifest}"
: "${H2_RATIFICATION_SHA256:?required exact SHA-256 ratification bytes from preflight}"
: "${H2_SCORE_CLI:?required path to centrally staged h2-acceptance.mjs}"
: "${H2_EX_WRAPPER:?required installed post-exit-drain.py}"
: "${H2_GATE_SOURCE:?required existing installed gate python}"
: "${H2_GATE_CONFIG:?required existing installed gate config}"

H2_G_BASE_DEV="${H2_G_BASE_DEV:-graphiti-curator-utility-development-r05}"
H2_G_CAND_DEV="${H2_G_CAND_DEV:-graphiti-curator-utility-development-r06}"
H2_G_BASE_HOLDOUT="${H2_G_BASE_HOLDOUT:-graphiti-curator-utility-holdout-r07}"
H2_G_CAND_HOLDOUT="${H2_G_CAND_HOLDOUT:-graphiti-curator-utility-holdout-r08}"
BASE_DEV_STATE="${H2_BASE_DEV_STATE:-$H2_STATE_ROOT/base-dev}"
CAND_DEV_STATE="${H2_CAND_DEV_STATE:-$H2_STATE_ROOT/cand-dev}"
BASE_HOLDOUT_STATE="${H2_BASE_HOLDOUT_STATE:-$H2_STATE_ROOT/base-holdout}"
CAND_HOLDOUT_STATE="${H2_CAND_HOLDOUT_STATE:-$H2_STATE_ROOT/cand-holdout}"
for group in "$H2_G_BASE_DEV" "$H2_G_CAND_DEV"; do
 [[ "$group" =~ ^graphiti-curator-utility-development-r[0-9]{2}$ ]] || { echo 'H2_BLOCKED: invalid development group' >&2; exit 2; }
done
for group in "$H2_G_BASE_HOLDOUT" "$H2_G_CAND_HOLDOUT"; do
 [[ "$group" =~ ^graphiti-curator-utility-holdout-r[0-9]{2}$ ]] || { echo 'H2_BLOCKED: invalid holdout group' >&2; exit 2; }
done
[[ $(printf '%s\n' "$H2_G_BASE_DEV" "$H2_G_CAND_DEV" "$H2_G_BASE_HOLDOUT" "$H2_G_CAND_HOLDOUT" | sort -u | wc -l) == 4 ]] || { echo 'H2_BLOCKED: group collision' >&2; exit 2; }
BASE_SHA=c8eb5260f2b10832346234b1b5d0cf28302ffba8
CAND_SHA=270848aa108df22b9d12738cc6f4903ec45da9c1
GRAPHITI_ENDPOINT=http://127.0.0.1:8766/mcp
export LOCAL_CURATOR_URL=http://127.0.0.1:8002/v1/chat/completions
export LOCAL_CURATOR_MODEL=chat-fast
export LOCAL_CURATOR_API_KEY=local
# Explicitly prevent environment inheritance from changing frozen model policy.
unset GHDEV_CURATOR_REASONING_EFFORT GHDEV_CURATOR_MAX_TOKENS

validate_dir() {
  local dirname="$1" expected="$2" actual
  [[ "${dirname}" = /* && -d "$dirname" ]] || { echo 'H2_BLOCKED: worktree path invalid' >&2;return 2; }
  actual="$(git -C "$dirname" rev-parse --verify HEAD)"
  [[ "$actual" == "$expected" ]] || { echo "H2_BLOCKED: worktree $dirname at $actual not $expected" >&2; return 2; }
  [[ -z "$(git -C "$dirname" status --porcelain)" ]] || { echo "H2_BLOCKED: dirty $dirname" >&2;return 2; }
  [[ -f "$dirname/docs/issue-78/v2-curator/curator-cli.mjs" ]] || { echo 'H2_BLOCKED: CLI missing' >&2;return 2; }
}
validate_dir "$H2_BASE_WORKTREE" "$BASE_SHA"
validate_dir "$H2_CAND_WORKTREE" "$CAND_SHA"
[[ "${H2_STATE_ROOT}" = /* && -d "$H2_STATE_ROOT" ]] || { echo 'H2_BLOCKED: state root missing' >&2;exit 2; }
[[ "$H2_RATIFICATION_SHA256" =~ ^[a-f0-9]{64}$ ]] || { echo 'H2_BLOCKED: ratification SHA invalid' >&2;exit 2; }
actual="$(sha256sum "$H2_RATIFICATION" | cut -d ' ' -f 1)"
[[ "$actual" == "$H2_RATIFICATION_SHA256" ]] || { echo 'H2_BLOCKED: ratification changed' >&2;exit 2; }
expected_freeze="$(node -e 'const fs=require("fs"); process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).freeze_manifest_sha256)' "$H2_RATIFICATION")"
actual_freeze="$(sha256sum "$H2_FREEZE_MANIFEST" | cut -d ' ' -f 1)"
[[ "$expected_freeze" == "$actual_freeze" ]] || { echo 'H2_BLOCKED: frozen manifest changed' >&2;exit 2; }
node "$H2_SCORE_CLI" preflight "$H2_RATIFICATION"

check_seed() {
  local name="$1" cli="$2" group="$3" expected="$4" state="$5"
  [[ -d "$state" ]] || { echo "H2_BLOCKED: missing $name state" >&2;return 2; }
  node "$cli" status --group "$group" --state-dir "$state" | node -e '
let text="";process.stdin.setEncoding("utf8");process.stdin.on("data",x=>text+=x);
process.stdin.on("end",()=>{
 try{const s=JSON.parse(text),expected=Number(process.argv[1]);
 if(s.group!==process.argv[2]||s.review_count!==0||s.queue?.counts?.new!==expected||s.queue?.total!==expected)
   throw Error("expected untouched queue of "+expected+" and no prior reviews");
 console.log("H2_PRESEEDED_ARM_OK",s.group,"new="+expected);
 }catch(e){console.error("H2_BLOCKED: seed preflight:",e.message);process.exitCode=2;}
 });' "$expected" "$group"
}
BASE_CLI="$H2_BASE_WORKTREE/docs/issue-78/v2-curator/curator-cli.mjs"
CAND_CLI="$H2_CAND_WORKTREE/docs/issue-78/v2-curator/curator-cli.mjs"
check_seed base-dev "$BASE_CLI" "$H2_G_BASE_DEV" 24 "$BASE_DEV_STATE"
check_seed cand-dev "$CAND_CLI" "$H2_G_CAND_DEV" 24 "$CAND_DEV_STATE"
check_seed base-holdout "$BASE_CLI" "$H2_G_BASE_HOLDOUT" 30 "$BASE_HOLDOUT_STATE"
check_seed cand-holdout "$CAND_CLI" "$H2_G_CAND_HOLDOUT" 30 "$CAND_HOLDOUT_STATE"

run_arm() {
  local name="$1" cli="$2" group="$3" state="$4"
  printf '=== H2 arm %s group=%s ===\n' "$name" "$group"
  local rc
  if python3 "$H2_EX_WRAPPER" \
    --gate-source "$H2_GATE_SOURCE" --gate-config "$H2_GATE_CONFIG" \
    --cli "$cli" --group "$group" --state-dir "$state" \
    --endpoint "$GRAPHITI_ENDPOINT" --max-seconds 600 --lock-timeout 120; then
    rc=0
  else
    rc=$?
    printf 'H2_ABORT arm=%s exit=%s; preserve remote work and EX reconciliation\n' "$name" "$rc" >&2
    return "$rc"
  fi
  printf '=== H2 arm %s exit=0 ===\n' "$name"
  node "$cli" status --group "$group" --state-dir "$state"
}
run_arm base-dev "$BASE_CLI" "$H2_G_BASE_DEV" "$BASE_DEV_STATE"
run_arm cand-dev "$CAND_CLI" "$H2_G_CAND_DEV" "$CAND_DEV_STATE"
run_arm base-holdout "$BASE_CLI" "$H2_G_BASE_HOLDOUT" "$BASE_HOLDOUT_STATE"
run_arm cand-holdout "$CAND_CLI" "$H2_G_CAND_HOLDOUT" "$CAND_HOLDOUT_STATE"
printf '%s\n' 'H2_ALL_DRAIN_EXITS_ZERO: terminal remote proof and independent blinded fact adjudication still required'
