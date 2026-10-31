# Issue 70: integrated Phase 1 receipt and admission candidate

Isolated current-source implementation; no historical V1 runtime edit and no deployment. Central base: `c4714d33f30ce6f3aa81eac1c9caabcdefd6a3b9`. Preserved correction archive authenticated as `08442b4b6fc89173314cc0a48ef12982487fb42e38c6fc15e69173ed9fc3d00c`. Existing isolated work remains preserved.

## Behavior

The existing gate freezes account/user/peer/session, claimed generation, immutable request key and canonical submitted body/digest in the claim transaction before any backend POST. Later queued generations cannot change that attempt. Submitted attempts never blindly resend; historical unknowns receive no retrospective identity.

POST/GET `/api/v1/admin/commit_receipts/{session_id}/{request_key}` use native backend-owner authentication. The installed backend uses api_key mode, which deliberately strips tenant assertion headers. This explicitly scoped admin operation authenticates ROOT first, then constructs the immutable request tenant context. Ordinary tenant APIs retain their native authentication. The nomination credential cannot access receipts. Trusted-mode tenant assertions remain checked where that existing auth mode is used.

Central's first-writer receipt core and seven tests are unchanged. Durable reservation precedes actual Session.commit_async; duplicate requests return their receipt and contradictions return typed 409. Actual task/archive identity is journaled before archive publication, and request key/stable work ID travel in durable Phase 1 queue metadata. The native publication lease and per-operation producer fence cover archive ready, task registration and enqueue.

Reconciliation never guesses from session/time. It verifies that exact archive/key/task binding and acquires the native publication lease to finish registration/enqueue after publisher crash. It resumes only the recorded message, never commit_async. Native lease acquisition supplies the publication barrier; elapsed time is not a quiescence assertion. Queued and processing work are read through native SQLite QueueFS snapshots; changed, missing or inaccessible proof blocks release.

Session execution and TaskWork middleware, including descendants, use a shared producer fence. A separate parent lane serializes duplicate Session deliveries without deadlocking child work. Reconciliation acquires the exclusive fence and requires exact terminal task state, no open Store work, no active producer, no matching unacknowledged QueueFS message and the matching .done/.failed.json marker. Only then is release_proven sealed. Every later keyed delivery checks that durable seal under the fence before inference, including late physical replay. This adds an operation fence, not an inference scheduler.

Normal receipt GET is read-only with respect to recovery enqueue. Only explicit recover=true can resume missing QueueFS publication; the gate permits it under its exclusive lease after independent scheduler-idle checks and quiet grace. Contention and external activity reset that recovery grace. Existing-task observation/terminal proof does not self-deadlock on its own metrics.

The coordinator authenticates receipt key/scope/digest. TRACK adopts the real task; RELEASE resolves only the original generation, preserving newer generations and failure history; other evidence blocks. Existing exclusive global flock covers submissions, polls and terminal decisions. Independent work resumes through existing scheduler-idle and quiet-grace admission.

The common launcher remains the lease owner: flock -s --close. Its checker runs and execs the harness inside that lease. A sticky DB admission flag enables checks by default at the canonical queue path. An alternate path requires matching OPENVIKING_ADMISSION_DB. Old databases without activation preserve legacy lease behavior. Once activated, unresolved intents/attempts/memory work block compatible launchers after gate crash or config disablement. Installed Codex/OpenCode/AGY wrappers already call this common launcher and remain unchanged.

## Qualification

**136/136 checks pass**: original 98-check correction baseline (gate suite grown to 53 by the multi-unknown recovery regressions), unchanged I2 negative-path regression, seven unchanged Central receipt tests, five launcher tests and the actual-backend service suite (twenty runs: nine base service tests, the same nine rerun under the new MultiRequestAdmission subclass and two new multi-unknown admission tests — eleven distinct service checks). The service tests run actual installed Session, SessionService, TaskTracker, native API-key authentication and SQLite QueueFS in disposable subprocesses. Only model/extraction calls are CPU stubs. They pause after real archive publication/before registration and after registration/before enqueue, demonstrate empty task listings/idle metrics while gate and interactive admission remain blocked, then prove exact terminal reconciliation and unrelated work resumption.

The multi-unknown admission tests cover two distinct durable commit identities under the shared guard: a queued, non-executing task blocks recovery of a distinct ambiguous unknown (no enqueue, read-only polling only, launcher blocked); after the first identity reaches a verified terminal state the second undergoes exactly one authorized recovery (single recover=true GET, no duplicate enqueue/extraction); two simultaneously ambiguous unknowns stay fail-closed until backend-authoritative evidence restores one; backend restart preserves persistent QueueFS state and replay after the terminal seal is a no-op.

Cases also cover publisher crash/restart, persistent queue recovery, lost accepted response, duplicate/conflicting POST, physical late replay, a done marker while the worker remains active, queued cancellation, failure/newer generation, genuine no-archive skip, mismatched/inaccessible receipts and disabled legacy backend behavior. qualification.json retains sanitized commands, counts, output digests and selected fixture traces. Raw logs, credentials, databases, virtual environments and unrelated plugins are omitted.

Runs used a read-only root, private network and /tmp, and no GPU devices. Full patches reconstruct and reverse byte-identically. source-ownership.json records exact installed identities and unchanged source hashes. Live database byte invariance remains unverified; task commands did not modify live data.

## Phase 2 admission-safety update

The gate candidate now enforces the disabled-Graphiti admission invariants (see
`docs/issue-70/phase2/INDEPENDENT_REVIEW_30061C9.md` and
`ADMISSION_INTERLEAVING.md`):

- Switching `graphiti_enabled` off does not erase unresolved Graphiti work:
  the sticky `admission_contract` activation is retained, and `Worker.tick`
  reads existing `memory_work` states `admitted`/`processing`/`blocked_reconcile`
  even when the feature is disabled.
- The initial state inspection is repeated as a decisive recheck while holding
  the exclusive resource flock, so a coordinator claiming a queued Graphiti job
  while another worker waits for the lease cannot be admitted into OpenViking
  inference.
- A missing optional `memory_work` table in a genuinely legacy database
  creates no migration and does not block ordinary use; an existing
  malformed/unreadable state table fails closed (`graphiti_state_unverifiable`).
- A terminal Graphiti record does not indefinitely block later OpenViking
  work; blocked-reconcile rows reconcile only on authoritative terminal
  evidence. The same physical SQLite database and lock identity govern both
  backend classes and the launcher helper.

The gate suite is now **59 tests** (53 previously qualified + six staged
disabled-state regressions in `tests/test_shared_work.py`, plus one fixture
repair in `tests/test_dual_metrics.py` whose mock database now models the
disabled-mode recheck's `connect()` context-manager contract on a legacy
database). A focused two-process qualification
(`docs/issue-70/phase2/test_cross_process_admission.py`, 5 boundaries)
exercises the real `flock` path and the real launcher admission helper across
independently executing processes over one disposable SQLite database and one
lock file; deterministic idle CPU-side scheduler metrics are used, and no
scheduler-occupancy evidence is invented. Sanitized outcome:
`docs/issue-70/phase2/results/cross_process_admission_result.json`.

`patches/gate.patch` was regenerated from the complete current candidate
against the authenticated installed gate source (now twelve file entries,
including the previously unlisted `tests/test_multi_unknown_recovery.py` and
the repaired `tests/test_dual_metrics.py`) and proven byte-exact in both
directions, including cleanup of patch-introduced files on reverse. The full
isolated runner total is now **142 checks** (136 + six gate tests) with all
other suite counts unchanged.

## Phase 3 automatic capture and read-only recall update

The package now includes the Phase 3 integrated candidate (branch
`issue/70-automatic-recall`, based on the Phase 2 source-only commit
`56e5d908e9d401791d2bbff09b271f2ec4ec8a16`):

- `candidate/gate/graphiti_runtime_bootstrap.py`: explicit opt-in `serve()`
  composition. Requires a reviewed `phase3` runtime directory, an operator
  source policy, one exact authorized group, the operator-named Graphiti
  0.31.2-compatible interpreter and a disposable `issue70_*` graph. It
  refuses any policy that lists the `exclusive_state_transition` category
  (automatic exclusive-state ingestion stays disabled by startup policy).
- `candidate/gate/shared_work.py` / `openviking_commit_gate.py`:
  `SharedWorkQueue.auto_admit()` — with graphiti enabled and an installed
  authenticated Git resolver, at most two deferred candidates per tick are
  independently verified against immutable Git objects and promoted through
  `admit_attested`; malformed or rejected sources stay deferred.
- `docs/issue-70/phase3/` (source-pinned, no install-root copy):
  `git_source_authority.py` (independent `GitFactResolver`),
  `graphiti_process_transport.py` (one awaited Graphiti child under the gate's
  exclusive inference lease, bounded JSON over stdin),
  `graphiti_core_worker.py` (runs in the operator's Graphiti venv, awaits
  `add_episode`, exact persisted readback, client closed before the terminal
  record) and `graphiti_recall_service.py` (localhost-only, bearer-protected,
  read-only bounded Cypher; the Falkor driver is constructed outside any
  running event loop so no implicit index task is scheduled).
- `candidate/openviking-v2/graphiti-recall.mjs` + `index.mjs` recall wiring:
  bounded (max 8 items / 2400 chars), intent-triggered, duplicate-suppressing
  context injection after the original OpenViking hybrid context; no Graphiti
  call in the V2 hook invokes an LLM or embedding model; a missing policy,
  endpoint, timeout or wrong group yields no graph injection. Exclusive-state
  facts without validator proof render `[CURRENT STATE UNVERIFIED /
  CONFLICTED]`. The capture observer additionally accepts the installed
  OpenCode 2.2.5 `session.tool.input.started` tool-event shape and fails
  closed on unknown tool names.

`qualification-phase3.json` records the one-campaign evidence: identity
preflights, CPU suites (phase3 22, phase2 28, gate 66, ov2 15, launcher 5,
actual-backend 20), the integrated CPU host process (Git nomination →
deferred → verified → queued), the real separate-interpreter Graphiti run
against a fresh disposable `issue70_p3_real` graph (episode
`7eb5dc00-ef29-460f-bd43-68462bf3794b`, EX lease held during the child,
duplicate idempotency, failing-child `blocked_reconcile`), the read-only
recall qualification (graph state sha256 invariant before/after, all
negative cases) and the temporal boundary record. Phase 2 real-Graphiti and
temporal results are reused only at their original committed identities
(`docs/issue-70/phase2/results/`, hashes in `source-base-manifest.json`).

`patches/gate.patch` (thirteen file entries) and `patches/openviking-v2.patch`
(eight file entries) were regenerated against the authenticated installed
bases and proven byte-exact forward and reverse, including cleanup of
patch-introduced files. `patches/backend.patch` is unchanged from Phase 2.

## Reproduction

Use a Python environment matching the authenticated OpenViking/native RAGFS installation, Python 3.14 for gate tests, Node, patch and bwrap. The optional queue tests use requirements-phase1.txt; disabled gate startup is also tested with jsonschema deliberately unavailable. No dependency was installed into the protected host.

```sh
rtk proxy python3 prepare_backend.py --source-package /path/to/installed/openviking --output /new/disposable/issue70
ISSUE70_PHASE1_CANDIDATE=/path/to/preserved/candidate \
ISSUE70_VALIDATOR_PYTHON=/path/to/validator/python \
OPENVIKING_TEST_PYTHON=/path/to/openviking/python \
rtk proxy python3 /new/disposable/issue70/run_qualification.py
```

The preparer only writes a new directory, authenticates modified backend bases, copies the package into that isolated tree, applies the bounded patch and verifies final hashes. It does not copy a host installation into the repository. The preserved Phase 1 dependency sources supply unchanged legacy/compaction/offline-validator tests. Standalone native tests run with python3 tests/test_i1_service.py -v; launcher tests use python3 tests/test_launcher_admission.py -v. Do not use production storage for fixtures.

Phase 3 CPU suites run from the checkout root with the exact contract
PYTHONPATH:

```sh
PYTHONPATH="$PWD/docs/issue-70/phase2:$PWD/docs/issue-70/phase3:$PWD/docs/issue-70/implementation/i1-integrated/candidate/gate:$PWD/docs/issue-70/implementation/i1-integrated/candidate/gate/tests" \
  python3 -m unittest discover -s docs/issue-70/phase3 -p 'test_*.py'
node --test docs/issue-70/implementation/i1-integrated/candidate/openviking-v2/tests/graphiti-recall.test.mjs
```

The real separate-interpreter Graphiti run and the read-only recall service
require the operator's Graphiti venv, a disposable FalkorDB graph named
`issue70_*`, a disposable gate database/lock, and localhost LLM/embedder
endpoints; they are qualification-only and never activate the live gate
(see `docs/issue-70/phase3/INTEGRATION_CONTRACT.md`).

## Disabled configuration and limits

Keep gate [worker] receipts_enabled=false and graphiti_enabled=false. Leave backend OPENVIKING_COMMIT_RECEIPT_DB unset; leave capture policy/token unset. Real Graphiti adapter stays disabled. Capture remains source-unverified structured nomination; no invented source verifier was added.

Later authorized activation must install the matching gate/protocol, backend patch/runtime and launcher/helper together, use private durable local receipt storage with one fence root shared by all applicable backend workers, and bind all launchers to the exact gate DB/global lease path. Default installed paths are retained; custom paths must match explicitly. Do not activate only part of the stack, omit the helper, erase the sticky flag or downgrade while keyed work remains. This is a local single-host admission contract. Protect storage and fences with the existing backend/gate owner trust.

Historical keyless unknowns and rare incomplete/unprovable operations intentionally remain blocked. Missing/corrupt receipts, archive metadata, task state, queue snapshots or an unavailable publication lease never establish nonacceptance. See ROLLBACK.md.

Real Graphiti terminal completion, ingestion and read-only recall are now qualified on disposable graphs only (Phase 3, this package); the automatic exclusive-state category stays disabled by bootstrap policy until a durable post-write validator outcome can be keyed by work/episode, and production rollout, exclusive-state recall and fresh installed OpenCode activation remain separate later qualifications. Central owns independent review, source-home staging and PR decisions. No PR, merge or production activation occurred.
