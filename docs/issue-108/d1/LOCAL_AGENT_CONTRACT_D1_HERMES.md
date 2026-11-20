<<< LOCAL_AGENT_CONTRACT_BEGIN >>>

# GHDEV #108 | D1 authenticated ingress/EX service integration

**Supervisor:** Hermes, external to the OpenCode shared lease. Use a fresh native OpenCode `build` primary only for already-admitted, bounded host work when the service is available; otherwise Hermes may perform host-bound CPU-only validation directly. No extra harness is needed for the post-exit EX step.

**Objective:** integrate Central-authored ingress fence plus bounded stop/EX/restart coordinator **from the exact issue-108 branch**, exercise the key concurrency/crash invariants in isolated host fixtures, and return one manifest-verified evidence packet. Do not develop new architecture or a new curator controller. One existing PR only.

- Repository: `fvanevski/opencode-operational-schema-guard`.
- Accepted base: `main@47cf1cd3ed5155d2907bfd7595fec616e817712e`.
- Working branch and exact head: use the SHA supplied in Central's kickoff; reread the remote ref before any integration.
- Implementation directory: `docs/issue-108/d1/`.
- Installed guard V10 SHA-256: `a18edc96f7c5d1d32493d47d4e387a46a3e7aca20727c4f5b9b3130291fd764d`.
- Curator group: `development-knowledge`; authoritative MCP: `127.0.0.1:8766`; graph: `graphiti_live`, group attribute `development-knowledge` (397/397 historically proved).

## A. Exact source and authority intake

Fetch the issue-108 branch, prove exact remote SHA/tree, and create a collision-safe scratch checkout. Keep all occupied worktrees untouched. Read **the complete Central architecture document and these sources/tests/unit fragments**, not just the handoff header. Authenticate current installed launcher, gate, curator, service unit, source hashes and queue. Read current native OpenCode `/session/status` behavior and current session/client connection transport from the installed runtime; determine which requests may continue native activity after an HTTP response, and whether the status API can distinguish them.

Reconcile any changed host source identity, missing writable unit property, or native-transport incompatibility before installation. Do not change the central source pins to fit an unauthenticated host change. Resolve routine command syntax and systemd/property issues independently.

## B. Deterministic and disposable integration (required)

Run Central's `idle_window.py` Python tests and `ingress_fence.mjs` Node loopback tests, syntax checks, and focused manual negative probes in isolated scratch. The tests must preserve: journal fail-closed and crash restart, HTTP request admitted before fence is honored until response exit, new request/upgrade denied while fenced, safe un-fence only after canonical curator terminal result, no stop while native/Graphiti/scheduler activity is detectable, no ambiguous remote replay, and service restart denied during an uncertain EX window.

Run a **disposable** OpenCode server (different ports and isolated HOME/XDG storage, no live plugins or production credentials) through a disposable ingress fence if its launch contracts support it; check the actual `/session/status`, streaming/SSE, request auth and native client attachment. Do not use this as evidence that production graph/model behavior executed.

The configured candidate uses a private backend at 49375 and the existing client endpoint 49374. Prove that every production consumer uses the front endpoint, or report a blocker before any live cutover. A direct private-backend client bypass, untracked service-side background inference, or long-lived connected request that prevents EX requires evidence and a bounded Central decision, not an improvisation that drops the lock or excludes active work.

## C. Host activation scope and safety boundary

**Default: readiness only.** Preserve the current healthy production service/EX/Graphiti/OV and do not install live units, change listening ports or run production curator in this branch-validation phase. If a previous explicit Central approval has already authorized the exact reviewed/merged candidate to be promoted, apply the controlled cutover described in the architecture document. Do not treat a draft PR as deployment authorization.

For the later authorized cutover, preserve exact unit/source rollback, stop only a proven-idle existing service, install the two controller files, owner-only config and systemd user-unit/drop-in/timer, activate gateway then backend, verify authentic native client/guard/lease, **then** rearm `ghdev-curator-prod.path` and `.timer`. Do not activate watcher before the ingress fence and backend are qualified.

A natural post-exit test must cover a genuine queued source or a valid SKIP/DEFER and no unresolved submission, plus one concurrently arriving request receiving a bounded 503 and succeeding on retry after EX. If EX uncertainty or a journal `unsafe` state appears, do not force service restart or reset the journal; preserve evidence and stop that unsafe branch.

## D. Evidence and handback

Return a sanitized, digest-verified `.tar.gz` with immutable source/host config identities, tests/exit codes, proxy response/stream/WebSocket traces with secrets removed, native busy-versus-idle verification, EX and restart simulation results, service/port inventory, rollback and exact remaining blockers. No raw credentials, full native session transcript, SQLite bytes, provider bodies, Graphiti episode text or private prompts.

```
RESULT=PASS|PARTIAL|BLOCKED
MAIN_SHA=<40hex>
WORK_BRANCH_SHA=<40hex>
WORK_BRANCH_TREE=<40hex>
SOURCE_SHA256_CONTROLLER=<64hex>
SOURCE_SHA256_GATEWAY=<64hex>
LOCAL_TESTS=<counts/exits>
DISPOSABLE_NATIVE_COMPATIBILITY=PASS|PARTIAL|FAIL
NATIVE_BACKGROUND_QUIESCENCE=PASS|FAIL|UNVERIFIED
FENCED_HTTP_UPGRADE_SSE=PASS|FAIL|UNVERIFIED
JOURNAL_CRASH_AND_START_FENCE=PASS|FAIL
CANONICAL_EX_PRESERVATION=PASS|FAIL|UNVERIFIED
DIRECT_BACKEND_BYPASS=NONE_OBSERVED|PRESENT|UNVERIFIED
LIVE_MUTATION=NONE|BOUNDED_AUTHORIZED|UNEXPECTED
CURRENT_SERVICE_HEALTH=PASS|FAIL
CURATOR_PATH_TIMER_STATE=<actual>
PRODUCTION_LEDGER_SQLITE_GRAPHITI_UNCHANGED=PASS|FAIL|UNVERIFIED
READY_FOR_CENTRAL_EXACT_HEAD_REVIEW=yes|no
EVIDENCE_ARCHIVE_PATH=<absolute>
EVIDENCE_ARCHIVE_SHA256=<64hex>
EVIDENCE_ARCHIVE_BYTES=<integer>
COMMAND_SHAPE_FRICTION=<canonical GHDEV-10 structured fields>
```

Local permissions: resolve ordinary scratch execution, unit-feature and connection-shape problems, and record exact alternatives. Do **not** replace Central's program logic, modify production source, alter native permission policy, change OpenViking/EX lock semantics, requeue unknown remote submissions, force Graphiti ingestion, rewrite the 397 persisted remote mappings, restore SQLite, add a new PR or close issues. A material invariant failure goes back to Central with exact source and a focused regression proposal, not a silent work-around.

Return one complete packet. Retain prior #108 acceptance receipts; do not rerun broad model-quality, hook-p95, Graphiti backend identity, or capacity campaigns.

<<< LOCAL_AGENT_CONTRACT_END >>>
