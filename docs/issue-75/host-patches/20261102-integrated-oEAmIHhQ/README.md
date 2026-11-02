# Issue 75 integrated recovery host patches

Status: **DEPLOYED_AND_VERIFIED**. Deployed atomically to the live host following quiescence, WAL-consistent database snapshotting, and rollback rehearsal.

`SOURCE.diff` is the complete unified diff over pinned installed OpenViking 0.5.3 (`site-packages/openviking`) and the gate daemon (`openviking-commit-gate`). It matches the exact 7 deployed files whose hashes and locations are recorded in `SOURCE_PINS.json`.

### Changes Deployed
1. **`openviking/server/app.py`**: Mounts admin commit receipt lookup and binding router.
2. **`openviking/server/routers/sessions.py`**: Adds `/api/v1/admin/commit_receipts/binding/{session_id}` and `/{session_id}/{request_key}` routes. Implements worker pre-claim binding validation via internal verified worker headers (`X-OpenViking-Account`, `X-OpenViking-User`) and requires pinned server owner (`OPENVIKING_GATE_ROOT_OWNER`) for unadorned ROOT credentials (fails closed with 503).
3. **`openviking/session/session.py`**: Preserves keyed receipt lookup and commit state integration.
4. **`openviking/storage/queuefs/session_commit_msg.py`**: Keyed commit receipt metadata integrity.
5. **`gate/admission_hold.py`**: Introduces default-closed `recovery_hold` singleton table and `repair_rejected` atomic repair CAS function with `rejection_repairs` audit trail.
6. **`gate/openviking_commit_gate.py`**: SQL triggers (`hold_intent_claim`, `hold_attempt_submit`, `hold_attempt_insert`) that enforce durable hold; pre-claim identity validation preventing unauthenticated latching; worker claim binding verification.
7. **`gate/shared_work.py`**: Shared publication fencing across worker ticks, direct processing, and receipt recovery.

### Host Operations Completed
- Services were cleanly quiesced with 0 pending tasks.
- SQLite databases (`queue.sqlite3` and `commit_receipts.sqlite3`) backed up to WAL-consistent preimages with verified restore rehearsals.
- `recovery_hold` initialized in `queue.sqlite3` (`singleton=1, held=1, owner="issue75-integrated-oEAmIHhQ"`).
- Target rejected commit repaired under canonical EX lock (`repair_rejected`): intent transitioned to `state='dead'`, attempt latched `resolved=1`, recorded in `rejection_repairs` audit table.
- All 1,326 other intents and 84 attempts remain unchanged.
- All 7 files deployed atomically. Services restored and verified healthy on ports 1933 and 1934 with durable hold active.
- Graphiti reasoning model think-tag sanitization applied in `run_graphiti.py`. Extraction campaign fully qualified with 3 nodes and 3 edges materialized, indexed, and recalled under budget.
