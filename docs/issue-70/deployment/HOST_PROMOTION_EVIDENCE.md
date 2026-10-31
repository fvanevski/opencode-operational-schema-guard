# Issue #70 / PR #73 — Disabled host promotion & verified deployment evidence

Status: **source-only installation complete; Graphiti capture disabled; fresh-process
independent acceptance PENDING external (post-Build) execution.** This is a
metadata-only evidence commit on the existing `issue/70-host-activation` branch.
It documents the deployed source identity and host state; it does **not** change any
host source bytes and does **not** authorize production Graphiti capture.

## Identities

| Field | Value |
| --- | --- |
| Approved runtime source SHA | `b126b6d415a3f8706e0c8c22b219cca2161a7465` |
| Approved runtime source tree | `dacb27120deef3e8bfa27b50222bf20cb60c450c` |
| PR/tooling head (orchestration) | `ae7803fb627d62390b2d05d84ebe9f5b495d784e` |
| PR base (merged main) | `4d4825b8151a1d8272af9da89701954d7ab27822` |
| Immutable release checkout | `/home/filip/.issue70-release/b126b6d4` (detached, pinned) |
| Release checkout HEAD/tree | `b126b6d4…` / `dacb2712…` (clean) |
| Diff approved-source → tooling | exactly 2 files: `docs/issue-70/deployment/PREMERGE_HOST_PROMOTION.md`, `docs/issue-70/deployment/verify_installed_sources.py` |

The installed Phase 2–4 Graphiti runtime is source-pinned to the immutable release
checkout; it is **not** a mutable PR worktree.

## Host component & service versions (current)

| Component | Identity |
| --- | --- |
| OpenCode | v2.2.5 (stock, `/home/filip/.opencode/bin/opencode`) |
| OpenViking backend | 0.5.2.1 (Python 3.14.7, uv-tools venv) |
| Graphiti Core | 0.31.2 (interpreter `/workspace/mcp_servers/graphiti/upstream/mcp_server/.venv`) |
| FalkorDB | live (container `graphiti-live-falkordb-1`, 127.0.0.1:6382) |
| Scheduler | ninfer-serve (127.0.0.1:8001), idle |
| Gate service | `openviking-commit-gate.service` (user) |
| Backend service | `openviking.service` (system; backend + vikingbot gateway) |

## Pre/post installation manifest (key files, sha256)

| File | Pre (installed base) | Post (installed candidate) |
| --- | --- | --- |
| gate `openviking_commit_gate.py` | `6ad48a93…` | `9d71ac50…` |
| gate `shared_work.py` | (absent) | `4543e71e…` |
| gate `graphiti_runtime_bootstrap.py` | (absent) | `d4cbd16d…` |
| gate `admission_exec.py` (shim) | (absent) | `08fc29d1…` |
| plugin `index.mjs` | `6899822e…` | `6ae7cf5d…` |
| plugin `candidate-capture.mjs` | (absent) | `335537a9…` |
| plugin `graphiti-recall.mjs` | (absent) | `084fae37…` |
| shim `openviking-agent-run` | `d22ca3f9…` | `29d4b108…` |
| backend `session/session.py` | `2cd71ec6…` | `6b876bdb…` |
| backend `server/app.py` | `bbd53faa…` | `eec7d629…` |
| backend `service/task_queue_middleware.py` | `cbfaea10…` | `a44bc784…` |
| backend `storage/queuefs/session_commit_msg.py` | `7b8922a2…` | `4959299b…` |
| backend `server/routers/sessions.py` | `4b0cb8b6…` | `2775fae9…` |
| backend `service/receipt_protocol.py` | (absent) | `da95cd9c…` |
| backend `service/commit_receipts.py` | (absent) | `aa90595a…` |
| config `commit-gate.toml` | `433ccedc…` | `425f0a7a…` (disabled-only correction) |

Full 33-entry map (owner/mode/action/backup) and the 15 runtime-critical verifier
mappings are in the private operator directory
`/home/filip/.issue70-promotion/evidence/install-map.json` and
`/home/filip/.issue70-promotion/readback/installed-map.json` (not on GitHub).

## Candidate reconstruction (newly executed, this campaign)

All three package patches proven byte-exact against the re-authenticated installed
bases in disposable copies:

- `patches/gate.patch` (`ef110f64`, 13 entries): forward (installed base `6ad48a93` +
  patch → 14-file candidate tree) **PASS**; reverse (candidate − patch → 3 base files,
  all patch-introduced files removed) **PASS**; no `.rej`/`.orig`.
- `patches/openviking-v2.patch` (`b0ee5faa`, 8 entries): forward **PASS**, reverse **PASS**.
- `patches/backend.patch` (`a03ab064`, 7 entries): forward **PASS** (5 patch-derived +
  2 new modules; all candidate digests match manifest), reverse **PASS**.

The five modified backend files are correctly treated as **patch-derived** (not
standalone repo files) by the readback verifier; the two new backend modules are
standalone `backend-new` files.

## Disabled effective configuration (newly executed)

`/home/filip/.config/openviking/commit-gate.toml` now carries explicit
`graphiti_enabled = false` and `graphiti_production_approved = false` (disabled-only
correction; diff is the 5-line insertion only). Parser acceptance proven for both the
explicit-false path and the missing-key false-default path. No operator Git source
policy is configured (`operator_production_activation = not_configured`). No
production capture group or eligible-workspace policy was introduced.

## Service restart / readback (newly executed)

- Pre-fix processes quiesced: gate PID 1697 (user service stop), backend PID 21779 +
  vikingbot gateway PID 22607 (system service stop; graceful 143, clean close of
  queue/vector/RAGFS/gateway per journal).
- All 5 component swaps done via same-filesystem rename (atomic), then services
  restarted: backend PID 1075613 + gateway PID 1076015, gate PID 1075959 (all started
  2026-10-31 10:34 PDT).
- Post-swap readback: **all 15 runtime-critical installed files** match the approved
  candidate digests via `verify_installed_sources.py` (Central tooling) —
  `ISSUE70_INSTALL_READBACK=PASS` (receipt
  `/home/filip/.issue70-promotion/readback/source-readback.json`,
  sha256 `32eeb12972547d9b1679b61cdb133b0d14dc9ff33a93aa0bdea34816f22fc485`).
- Live health: backend `/health=200`, gate `/__commit_gate/health` ok with
  `admission.state=harness_active` (Build opencode holds the shared flock → fail-closed,
  expected). No pre-fix runtime remains.

## New-process acceptance

**PENDING_EXTERNAL_EXECUTION.** The genuine independent fresh-process OpenCode V2 run
cannot execute while the Build harness holds the shared admission lease. An operator-
ready, self-contained script is staged at
`/home/filip/.issue70-promotion/evidence/fresh-process-acceptance.sh` (bash -n clean;
all path refs valid) and must be run **after Build releases the lease**:

```bash
bash /home/filip/.issue70-promotion/evidence/fresh-process-acceptance.sh
```

It launches a fresh `opencode run` in a collision-free disposable HOME/XDG/project with
the real installed plugins (stub model, no live inference), re-runs the installed
source/config readback, checks gate health + legacy status, shared-admission/scheduler
fail-closed behavior, disabled-Graphiti behavior, and confirms no new FalkorDB graph.
Read-only public behavior only; no live Graphiti write.

Executed in this campaign (read-only, service-safe):
- Offline stock-V2 entrypoint + V4 sibling import: **PASS**
  (`verify_v2_entrypoint.mjs`; `plugin_id=local.openviking-v2`,
  `sibling_imports_present=true`). The installed `index.mjs` preserves all ten
  `openviking-context-v4/lib/…` imports.
- Installed source/config readback (15/15 runtime-critical): **PASS**.
- Live gate health + legacy admission status: **PASS** (fail-closed under active harness).

## Protected-state preservation

Gate `queue.sqlite3` read-only throughout (no rows written): `memory_work=0`,
`intents=1249`, `failed_tasks=12`, `admission_contract=1` (sticky, preserved),
`graphiti_ingest_receipts=0`. FalkorDB live graph count unchanged at **27** before and
after (no unrequested Graphiti capture). Credentials, session state, QueueFS, receipt
identities and the live `graphiti_live` graph were not touched.

## Rollback

Complete pre-image backups staged at
`/home/filip/.issue70-promotion/backups/20261031T1740Z/` (gate, plugin, shim, 5 backend
bases, config) with `SHA256SUMS-backup.txt`; quarantined live originals under
`…/quarantine/`. Rollback = reverse the 5 swaps (rename back) + restore config;
admission contract and durable work are preserved, not erased. Not used (no failure).

## Historical vs newly executed test classifications

- **Historical (not re-run this campaign):** the real Graphiti/GPU disposable
  qualification (episode `1f5ba3bf…`, group `hostact_iso_group`) and prior CPU suites
  (phase2/3/4, gate 59/59, etc.) remain attributed to their original tested SHAs in
  `qualification-host-activation.json`.
- **Newly executed this campaign:** patch forward/reverse byte-exactness (all 3
  patches), readback-helper positive/negative fixture qualification, installed
  source/config readback (15/15), disabled-config parser acceptance, offline V2
  entrypoint + V4 sibling check, service restart + live health readback, FalkorDB
  no-new-capture check.
- **Pending:** genuine fresh-process OpenCode V2 acceptance (external, post-Build).

## Deviations / defects / repairs

- `openviking.service` user-bus stop timed out (system-bus D-Bus); completed via
  `sudo systemctl stop` — graceful 143, no data loss.
- No source, config, rollback or process preconditions failed; no host layout drift
  (all 5 installed bases matched the manifest exactly; `INSTALLED_BASE_DRIFT=none`).
- No new PR, no merge, no release, no Issue #70 closure, no production Graphiti
  activation.

## Sensitive-data note

No API keys, tokens, raw user memory, session contents, or full DB copies are stored
in this record. Private operator artifacts (journal, backups, full install map,
verifier receipts) remain under `/home/filip/.issue70-promotion/` (mode 700), not on
GitHub.
