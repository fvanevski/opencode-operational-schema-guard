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

**120/120 checks pass**: original 98-check correction baseline, unchanged I2 negative-path regression, seven unchanged Central receipt tests, five launcher tests and nine actual-backend service tests. The service tests run actual installed Session, SessionService, TaskTracker, native API-key authentication and SQLite QueueFS in disposable subprocesses. Only model/extraction calls are CPU stubs. They pause after real archive publication/before registration and after registration/before enqueue, demonstrate empty task listings/idle metrics while gate and interactive admission remain blocked, then prove exact terminal reconciliation and unrelated work resumption.

Cases also cover publisher crash/restart, persistent queue recovery, lost accepted response, duplicate/conflicting POST, physical late replay, a done marker while the worker remains active, queued cancellation, failure/newer generation, genuine no-archive skip, mismatched/inaccessible receipts and disabled legacy backend behavior. qualification.json retains sanitized commands, counts, output digests and selected fixture traces. Raw logs, credentials, databases, virtual environments and unrelated plugins are omitted.

Runs used a read-only root, private network and /tmp, and no GPU devices. Full patches reconstruct and reverse byte-identically. source-ownership.json records exact installed identities and unchanged source hashes. Live database byte invariance remains unverified; task commands did not modify live data.

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

## Disabled configuration and limits

Keep gate [worker] receipts_enabled=false and graphiti_enabled=false. Leave backend OPENVIKING_COMMIT_RECEIPT_DB unset; leave capture policy/token unset. Real Graphiti adapter stays disabled. Capture remains source-unverified structured nomination; no invented source verifier was added.

Later authorized activation must install the matching gate/protocol, backend patch/runtime and launcher/helper together, use private durable local receipt storage with one fence root shared by all applicable backend workers, and bind all launchers to the exact gate DB/global lease path. Default installed paths are retained; custom paths must match explicitly. Do not activate only part of the stack, omit the helper, erase the sticky flag or downgrade while keyed work remains. This is a local single-host admission contract. Protect storage and fences with the existing backend/gate owner trust.

Historical keyless unknowns and rare incomplete/unprovable operations intentionally remain blocked. Missing/corrupt receipts, archive metadata, task state, queue snapshots or an unavailable publication lease never establish nonacceptance. See ROLLBACK.md.

Real Graphiti terminal completion, ingestion, temporal post-write validation, recall, production rollout and fresh installed OpenCode activation remain separate later qualifications. Central owns independent review, source-home staging and PR decisions. No PR, merge or production activation occurred.
