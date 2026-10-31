# Issue 70 — Codex P2 backend-dependency remediation qualification

Qualification of the Central correction on `issue/70` that closes Codex's P2
finding (PR #71 head `a055754`, thread `PRRT_kwDOULzk_M6yJ8Qa`): the host
source preflight now verifies **all** recorded `/site-packages/openviking/`
backend dependencies (native RAGFS, TaskTracker, SessionService and the rest),
not only the modified files in `source-base-manifest.json`.

Bounded, read-only verification. No production source, memory, backend,
capture candidate, live graph, or protected service was modified.

## A.1 Expanded 10-test source-home regression suite

```sh
python3 -m unittest discover -s docs/issue-70/source-home -p 'test_verify_source_home.py' -v
```

Result: **10/10 PASS**. The six original checks plus the four Codex-P2
regressions: `test_native_library_drift_rejected`,
`test_unmodified_task_tracker_drift_rejected`,
`test_missing_recorded_runtime_dependency_rejected`,
`test_original_and_recorded_backend_conflict_rejected`.

## A.2 Read-only package + installed-source preflight (real installed files)

```sh
python3 docs/issue-70/source-home/verify_source_home.py \
  --package "$PWD/docs/issue-70/implementation/i1-integrated" \
  --host \
  --gate-root "$HOME/.local/share/openviking-commit-gate" \
  --v2-root "$HOME/.config/opencode/plugins/openviking-v2" \
  --backend-root "$HOME/.local/share/uv/tools/openviking/lib/python3.14/site-packages" \
  --shim "$HOME/.local/bin/openviking-agent-run"
```

Result (Phase 1 package at `9120c69`):

```json
{"backend_dependency_checks": 8, "backend_patch_checks_deferred": 5,
 "candidate_checks": 23, "host_mutations": 0, "original_source_checks": 11,
 "package_checks": 41, "read_only": true, "status": "PASS"}
```

- `backend_dependency_checks: 8` — the new Codex-P2 field. All 8 recorded
  `/site-packages/openviking/` dependencies are now byte-verified against the
  live host (previously only the manifest-listed modified files were checked).
- `original_source_checks: 11`, `package_checks: 41`, `candidate_checks: 23`
  unchanged from the prior Phase 1 qualification.

## A.3 Protected-dependency drift detection (disposable copy)

A disposable copy of the 8 recorded dependencies was made under
`/tmp/opencode/issue70-disposable` (the 31 MB native `.so` copied, not
hardlinked; live site-packages untouched). The unmodified copy PASSES.
Appending a drift marker to **each** required protected dependency and
re-running the preflight:

| dependency mutated (disposable copy) | preflight result |
| --- | --- |
| `openviking/service/task_tracker.py` | `BLOCKED: backend dependency drift` |
| `openviking/service/session_service.py` | `BLOCKED: backend dependency drift` |
| `openviking/lib/ragfs_python.abi3.so` | `BLOCKED: backend dependency drift` |

After restoring each file the preflight PASSES again. Omission of a recorded
dependency and a recorded-vs-original digest conflict are rejected by the
dedicated regression tests (A.1).

## A.4 Installed dependency identity vs source records

All 8 installed dependencies match their `source-ownership.json` recorded
SHA-256 (live read, `--backend-root` site-packages):

```
openviking/service/task_tracker.py            f823631dcf5001fd00f752ecab9a57870fec4096bb26064a5c39684d919a680e
openviking/service/session_service.py         a05d70990f22c7086844a1ccfbdf5b31df8671f5d098e7ba7a9b7a31559e4bf7
openviking/lib/ragfs_python.abi3.so          3177275b4948b57713b86eebb07d3cf45bb0c90bfdc14bd368b97efa3676a65e
openviking/server/app.py                      MATCH
openviking/server/routers/sessions.py         MATCH
openviking/service/task_queue_middleware.py   MATCH
openviking/session/session.py                 MATCH
openviking/storage/queuefs/session_commit_msg.py MATCH
```

No unexpected drift was observed; expected checksums were **not** updated.
The three protected dependencies' live hashes above are preserved as-is.

## Disposition

Codex P2 remediation **QUALIFIED** on `issue/70` at `9120c69`:
- 10/10 synthetic regressions pass,
- the read-only `--host` preflight now enforces all 8 recorded backend
  dependencies and PASSes against the current installed host,
- each protected dependency's drift is detected and BLOCKs the preflight,
- the real installed dependencies match the source records exactly.

This is a bounded source-package qualification of the P2 fix. It is **not**
formal PR #71 approval, does not resolve Codex's review thread, and confers no
merge/deploy authorization. PR #71 remains a draft for Central's independent
exact-head adjudication.
