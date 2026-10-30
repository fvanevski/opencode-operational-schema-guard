# Issue #70: I1 unknown-commit quiescence decision (2026-10-30)

**Disposition: still blocked.** This is a source-backed acceptance contract, not a production fix, and is not an independent review of the second local correction archive (not uploaded into Central's runtime).

## Verified upstream ordering (not host installation authority)

Inspected `volcengine/OpenViking@230aa7e2b82636479c1862ed91796ff1386c60b2`, `openviking/session/session.py`:

- Lines 1653–1664 allocate the intended `task_id` and put it in `SessionCommitMsg`.
- Lines 1665–1744 publish the Phase 1 archive, including `phase1.queue_message`, and establish an archive publication lease.
- Lines 1795–1843 then create the TaskTracker entry and enqueue the durable QueueFS work **outside the Session lock**.
- Lines 1845–1854 release the separate archive publication lease.
- Lines 1241–1285 and 1910–1975 contain queue/archive recovery and terminal artifact logic, including `.done` and `.failed.json`.

A published archive with an empty task list and idle scheduler can precede **future** inference. Conversely, a visible TaskTracker entry may still precede QueueFS enqueue. Zero running/waiting counters and an empty list of tasks are **not** proof of terminal completion, nonacceptance, or future quiescence.

## Required invariant

An ambiguous OpenViking commit stays `unknown` and must not be blindly resubmitted. New global memory inference may be admitted only after a request-identity-bound backend observation establishes that the ambiguous work is terminal or guaranteed never to start inference later. The guarantee must cover any HTTP request still executing, archive publication, task registration, QueueFS enqueue/replay, active worker, and crash recovery.

Do not infer safe release from metrics-idle, no current task listing, elapsed timeout, a mere `phase1.ready` marker, archive existence, or an administrator clearing the queue row. A SQLite `unknown` entry blocks the gate, but alone cannot prevent a separate interactive harness governed only by the released OS `flock` from starting. Reconciliation and cross-process admission must share an effective fence.

## Smallest safe resolution path

1. Keep the original durable source-event/attempt/scope identity. No auto-retry and no invented task ID.
2. Authenticate the **installed host backend** source, storage and API. If available, resolve a matching archive's `phase1.queue_message.task_id` by a source/request identity stronger than session ID or recent timestamp.
3. Verify a **server-authoritative publication barrier** covering task creation and QueueFS enqueue; do not assume a client-side archive read can acquire or imitate the internal pathlock.
4. Observe durable task, persistent queue and terminal work markers for that exact operation, including worker termination and absence of pending retry/replay. Distinguish release of unrelated admissions from permission to retry the original commit.
5. If no matching archive exists, require a backend-guaranteed nonacceptance/fencing result. An HTTP timeout or missing archive may still represent an in-progress request that later publishes and enqueues.
6. If existing backend state cannot prove these properties, add a narrowly scoped **durable request-keyed receipt/reconciliation API** in the actual backend ownership layer. It must atomically bind request identity before side effects and provide terminal or authoritative never-scheduled readback. Do not construct another scheduler.
7. Until this is demonstrated, retain the safety block. Do not weaken the negative-path tests merely to improve availability.

This is a conditional engineering direction, not evidence that the current installed backend exposes the necessary lock or metadata.

## Mandatory service-backed counterexamples

| Trace | Expected |
|---|---|
| Archive published, task not registered, scheduler idle | **BLOCK** |
| Task created but QueueFS not enqueued | **BLOCK** |
| Timeout before archive, original HTTP request still active | **BLOCK** |
| Queued or replayable Phase 2, no current running tasks | **BLOCK** |
| `.failed` present but worker may still run/replay | **BLOCK** |
| Mismatched archive/task owner, group, or generation | **BLOCK** |
| Process restart during publication/enqueue | **BLOCK until authoritative outcome** |
| Verified exact terminal result and no future execution | Release unrelated admission; never duplicate original |
| Backend-guaranteed no-side-effect rejection and no late execution | Reconcile safe nonacceptance |
| Interactive harness launch during unresolved work | **BLOCK using a shared effective fence** |

A faithful test must pause *after archive publication and before task creation*, show an empty task list and zero inference metrics, then demonstrate that neither the gate nor a compatible interactive harness starts conflicting inference. Resume or restart backend processing and release only after matched terminal evidence.

The 98 checks in the 2026-10-30 correction handback are reported, not centrally reproduced. New archive path `/home/filip/issue70-phase1-n3BNR6J9/issue70-phase1-correction.tar.gz`, claimed SHA-256 `08442b4b6fc89173314cc0a48ef12982487fb42e38c6fc15e69173ed9fc3d00c`, is not mounted in Central. **Do not promote or merge corrected implementation without reading that archive and current source-base identities.** Real Graphiti ingestion remains disabled; its separate terminal boundary remains unqualified.
