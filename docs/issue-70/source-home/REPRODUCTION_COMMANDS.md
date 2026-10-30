# Issue #70 — Phase 1 source-home + fresh-process reproduction commands

Sanitized, host-bound reproduction sequence for the consolidated Phase 1
qualification. All disposable artifacts live under a throwaway tree
(example: `/tmp/opencode/issue70/smoke`); nothing writes to the live
`~/.config/opencode` or `~/.local` runtime.

## A. Source-home regression + read-only preflight

```sh
# six synthetic source-home tests
python3 -m unittest discover \
  -s docs/issue-70/source-home \
  -p 'test_verify_source_home.py' -v

# read-only package + installed-source preflight (fails on drift)
python3 docs/issue-70/source-home/verify_source_home.py \
  --package "$PWD/docs/issue-70/implementation/i1-integrated" \
  --host \
  --gate-root "$HOME/.local/share/openviking-commit-gate" \
  --v2-root "$HOME/.config/opencode/plugins/openviking-v2" \
  --backend-root "$HOME/.local/share/uv/tools/openviking/lib/python3.14/site-packages" \
  --shim "$HOME/.local/bin/openviking-agent-run"
```

## A. Isolated forward/reverse patch reconstruction

```sh
cd docs/issue-70/implementation/i1-integrated
# forward: authenticate installed backend bases, build disposable patched tree
python3 prepare_backend.py \
  --source-package "$HOME/.local/share/uv/tools/openviking/lib/python3.14/site-packages/openviking" \
  --output /tmp/opencode/issue70/prep
# reverse: prove the patch reverses byte-identically to the authenticated bases
cp -r /tmp/opencode/issue70/prep /tmp/opencode/issue70/rev
( cd /tmp/opencode/issue70/rev/backend \
  && patch -p1 -R -i "$PWD/patches/backend.patch" )
# each reversed file must match source_base_sha256 in source-base-manifest.json
```

## B1. Disposable sibling plugin tree + offline entrypoint preflight

```sh
SMOKE=/tmp/opencode/issue70/smoke
mkdir -p "$SMOKE"/{packages,config,project,home,state,data,cache}
cp -r docs/issue-70/implementation/i1-integrated/candidate/openviking-v2 \
      "$SMOKE/packages/openviking-v2"
# authenticated preserved V4 sibling dependency (exact relative layout)
cp -r <authenticated openviking-context-v4 tree> "$SMOKE/packages/openviking-context-v4"

# offline import-shape preflight (no OpenCode, no inference)
node docs/issue-70/source-home/verify_v2_entrypoint.mjs "$SMOKE/packages"
```

## B2. Private stock-V2 fresh process (isolated HOME/XDG, CPU stub, no inference)

```sh
# disposable V2 config: local plugin dir entry + CPU stub provider (no production endpoint)
cat > "$SMOKE/config/opencode.json" <<'JSON'
{ "model":"smoke/stub",
  "provider":{ "smoke":{ "npm":"@ai-sdk/openai-compatible",
    "options":{"baseURL":"http://127.0.0.1:<stub-port>/v1","apiKey":"stub"},
    "models":{"stub":{"limit":{"context":8192,"input":8192,"output":8192}} } } },
  "compaction":{"auto":true},
  "plugins":["file:///$SMOKE/packages/openviking-v2"] }
JSON
cat > "$SMOKE/config/openviking-config.json" <<'JSON'
{ "runtime":{"dataDir":"$SMOKE/data/openviking"},
  "mcp":{"enabled":false}, "repoContext":{"enabled":false}, "debug":true }
JSON

cd "$SMOKE/project"
env HOME="$SMOKE/home" \
    XDG_CONFIG_HOME="$SMOKE/config" XDG_DATA_HOME="$SMOKE/data" \
    XDG_STATE_HOME="$SMOKE/state" XDG_CACHE_HOME="$SMOKE/cache" \
    OPENCODE_CONFIG_DIR="$SMOKE/config" \
    OPENCODE_CONFIG_PROJECT_DISABLE=1 \
    OPENCODE_DISABLE_MODELS_FETCH=1 OPENCODE_DISABLE_AUTOUPDATE=1 \
    OPENVIKING_URL="http://127.0.0.1:<dead-port>" \
    OPENVIKING_PLUGIN_CONFIG="$SMOKE/config/openviking-config.json" \
    OPENVIKING_DEBUG=1 OPENVIKING_HYBRID_RECALL=off \
    PHASE_B_OV_EVENT_TRACE="$SMOKE/state/event-trace.jsonl" \
/home/filip/.opencode/bin/opencode run --standalone --auto \
    --log-level debug --print-logs --model smoke/stub \
    -s ses_issue70_smoke_compact "First turn."
# a second run on the same session triggers native auto-compaction
```

Notes:
- `<stub-port>` is a local deterministic OpenAI-compatible HTTP stub that
  returns bounded filler for normal turns and a `##`-templated summary for
  compaction requests (verified against the 2.2.4 compaction template check).
- `<dead-port>` is a port with **no listener**, so baseline recall/capture
  reach no production target.
- A `enabled:false` config run separately proves the no-op startup path.

## C. Protected-surface invariance

```sh
# capture before/after SHA-256 of the live gate, V2 plugin, launcher shim,
# and live queue.sqlite3 (hash + mtime); a PASS requires byte-identical values
sha256sum \
  ~/.local/share/openviking-commit-gate/openviking_commit_gate.py \
  ~/.config/opencode/plugins/openviking-v2/index.mjs \
  ~/.local/bin/openviking-agent-run \
  ~/.local/state/openviking-commit-gate/queue.sqlite3
```
