# Issue #70 — Source-home evidence (Phase A)

Read-only source-home qualification of the `i1-integrated` package against
current host source identities, at the exact pre-publication head. No
host mutation, no deployment, no Graphiti write.

## A.1 Six synthetic source-home regression tests

Command:

```sh
python3 -m unittest discover -s docs/issue-70/source-home -p 'test_verify_source_home.py' -v
```

Result: **6/6 PASS** (`test_host_drift_rejected`, `test_missing_source_rejected`,
`test_outside_symlink_rejected`, `test_package_tampering_rejected`,
`test_positive_package_and_host`, `test_traversal_rejected`).

## A.2 Read-only package + installed-source preflight

Command (explicit current original source roots):

```sh
python3 docs/issue-70/source-home/verify_source_home.py \
  --package "$PWD/docs/issue-70/implementation/i1-integrated" \
  --host \
  --gate-root "$HOME/.local/share/openviking-commit-gate" \
  --v2-root "$HOME/.config/opencode/plugins/openviking-v2" \
  --backend-root "$HOME/.local/share/uv/tools/openviking/lib/python3.14/site-packages" \
  --shim "$HOME/.local/bin/openviking-agent-run"
```

Result:

```json
{"backend_patch_checks_deferred": 5, "candidate_checks": 23, "host_mutations": 0,
 "original_source_checks": 11, "package_checks": 41, "read_only": true, "status": "PASS"}
```

- 41 package checksums verified (SHA256SUMS).
- 23 candidate bytes verified against `candidate_sha256`.
- 11 authenticated original base hashes verified against the live installed
  sources (gate, V2 plugin, launcher shim, backend files, RAGFS native lib).
- 5 backend candidate hashes are **deferred** to isolated-patch verification
  (checked after applying `patches/backend.patch` in a disposable tree, below).
- The historical V1 repository root is **not** promoted as the V2 source:
  the installed V2 `index.mjs` (`6899822e…`) is a distinct authenticated base;
  the candidate V2 `index.mjs` (`f017a8f0…`) is the PR #71 byte.

## A.3 Isolated forward/reverse patch reconstruction

Command:

```sh
cd docs/issue-70/implementation/i1-integrated
python3 prepare_backend.py \
  --source-package "$HOME/.local/share/uv/tools/openviking/lib/python3.14/site-packages/openviking" \
  --output /tmp/opencode/issue70/recon/fwd
# reverse
cp -r /tmp/opencode/issue70/recon/fwd /tmp/opencode/issue70/recon/rev
( cd /tmp/opencode/issue70/recon/rev/backend \
  && patch -p1 -R -i "$OLDPWD/patches/backend.patch" )
```

Result: **FORWARD PASS** — all 7 patched backend files (5 modified + 2 new
`receipt_protocol.py`, `commit_receipts.py`) match `candidate_sha256` after the
patch. **REVERSE PASS** — reversing the patch restores all 5 modified files to
their `source_base_sha256` and removes the 2 new files. Reconstruction is
byte-identical in both directions.

## A.4 Offline V2 entrypoint preflight

Command:

```sh
node docs/issue-70/source-home/verify_v2_entrypoint.mjs /abs/disposable/packages
```

Result:

```json
{"result":"PASS","mode":"offline_module_import_only","plugin_id":"local.openviking-v2",
 "sibling_imports_present":true,"runtime_hooks_exercised":false,"inference_executed":false}
```

This proves module importability and the `id`/`setup` export contract against the
exact sibling layout (10 `openviking-context-v4` lib imports). It is an
import-shape preflight only; it does not run OpenCode.

## Source mapping / consumer notes

- The V2 plugin's `pluginRoot` is computed from `../openviking-context-v4/index.mjs`
  (a `new URL(...)` path string, not an import); the live V2 sibling carries that
  file retired as `index.mjs.v1-retired`, so the import graph depends only on the
  10 `lib/` modules, all present in the authenticated preserved V4 tree.
- Consumer paths (gate, V2 plugin, backend, launcher shim) all resolve within the
  disposable copies; no consumer points at the historical V1 root.

## Disposition

Source-home qualification **PASS**: the packaged Phase 1 implementation
corresponds to authenticated host sources, reconstructs byte-identically
forward and reverse, and leaves the historical V1 root unpromoted. This
establishes source-package compatibility only — not installed activation,
real Graphiti terminality, or merge/deploy authorization.
