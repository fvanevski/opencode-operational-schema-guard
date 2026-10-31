"""Request-keyed publication and terminal fence; no inference scheduler.

Disabled unless OPENVIKING_COMMIT_RECEIPT_DB names private durable local storage.
Every keyed producer/consumer uses the same cross-process operation lock. Terminal
sealing fences all future keyed Session replay; Task Store guards descendant work.
"""
from __future__ import annotations
import asyncio
from contextlib import asynccontextmanager
from contextvars import ContextVar
import fcntl
import json
import os
from pathlib import Path
import re
from openviking.storage.errors import LockAcquisitionError
from .receipt_protocol import ReceiptLedger, ReceiptConflict, canonical_digest, request_key

current_operation = ContextVar("commit_receipt_operation", default=None)

class CommitReceipts:
    def __init__(self, path):
        self.ledger = ReceiptLedger(path)
        self.lock_root = Path(path + ".locks")
        self.lock_root.mkdir(mode=0o700, exist_ok=True)
        with self.ledger._connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS receipt_bindings (request_key TEXT PRIMARY KEY, task_id TEXT UNIQUE NOT NULL, archive_uri TEXT NOT NULL)")

    def binding(self, key):
        with self.ledger._connect() as db:
            row = db.execute("SELECT * FROM receipt_bindings WHERE request_key=?", (key,)).fetchone()
            return dict(row) if row else None

    def key_for_task(self, task_id):
        with self.ledger._connect() as db:
            row=db.execute("SELECT request_key FROM receipt_bindings WHERE task_id=?",(task_id,)).fetchone()
            return row[0] if row else None

    async def queue_has_work(self, task_id):
        from openviking.storage.queuefs import get_queue_manager
        from openviking.service.task_work_index import extract_task_metadata
        manager=get_queue_manager()
        # Strict read of native QueueFS unacknowledged messages (pending AND
        # processing). Do not use the forgiving public snapshot fallback.
        for queue in manager._queues.values():
            await queue._ensure_initialized()
            data=await queue._async_agfs.read(queue.path+"/messages")
            rows=json.loads(data)
            if not isinstance(rows,list): raise RuntimeError("invalid QueueFS snapshot")
            status=await queue._read_backend_status()
            if len(rows)!=status["pending"]+status["processing"]:
                raise RuntimeError("QueueFS snapshot changed; retry reconciliation")
            for message in rows:
                metadata=extract_task_metadata(message)
                if metadata is not None and metadata.task_id==task_id: return True
        return False

    def bind(self, key, task_id, archive_uri):
        # Durable before the archive intent is written, never inferred by time/session.
        with self.ledger._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            old = db.execute("SELECT * FROM receipt_bindings WHERE request_key=?", (key,)).fetchone()
            if old and (old["task_id"] != task_id or old["archive_uri"] != archive_uri):
                db.execute("ROLLBACK"); raise ReceiptConflict("conflicting archive binding")
            db.execute("INSERT OR IGNORE INTO receipt_bindings VALUES (?,?,?)", (key,task_id,archive_uri))
            db.execute("COMMIT")

    def _try_lock(self, key, shared=False, lane="producer"):
        if re.fullmatch(r"[0-9a-f]{64}", key) is None:
            raise ValueError("invalid request key")
        if lane not in ("producer","parent"): raise ValueError("invalid fence lane")
        handle = open(self.lock_root/(key+"."+lane), "a+")
        try:
            fcntl.flock(handle, (fcntl.LOCK_SH if shared else fcntl.LOCK_EX) | fcntl.LOCK_NB)
            return handle
        except BlockingIOError:
            handle.close(); return None

    @asynccontextmanager
    async def fence(self, key, shared=False, lane="producer"):
        handle = None
        try:
            while handle is None:
                handle = self._try_lock(key,shared=shared,lane=lane)
                if handle is None: await asyncio.sleep(0.01)
            yield
        finally:
            if handle is not None: handle.close()

    async def submit(self, key, scope, generation, body, digest, call):
        if request_key(scope,generation) != key or canonical_digest(body) != digest:
            raise ReceiptConflict("request key or canonical payload mismatch")
        row, first = self.ledger.begin(key,scope,digest)
        if not first: return row
        async with self.fence(key):
            token = current_operation.set((self,key))
            try:
                result = await call()
                if (result.get("status") == "skipped" and result.get("archived") is False
                        and result.get("archive_uri") is None and not result.get("task_id")
                        and self.binding(key) is None):
                    # Actual commit_async returned under this fence, no archive
                    # was ever allocated, and duplicate submit cannot execute.
                    self.ledger.sealed_terminal(key,"skipped",backend_quiescence_verified=True)
                elif result.get("task_id"):
                    bound = self.binding(key)
                    if not bound or bound["task_id"] != result["task_id"]:
                        raise ReceiptConflict("actual task/archive binding missing")
                    self.ledger.accepted(key,result["task_id"])
            finally:
                current_operation.reset(token)
        return self.ledger.read(key)

    async def reconcile(self, key, session, tracker, *, allow_recovery=False):
        row = self.ledger.read(key)
        if row is None or row["state"] == "terminal": return row
        handle = self._try_lock(key)
        if handle is None: return row  # Still publishing or executing; NONTERMINAL.
        try:
            bound = self.binding(key)
            if not bound: return row  # No retrospective operation identity.
            scope = json.loads(row["scope_json"])
            if (scope["session_id"] != session.session_id or scope["account"] != session.ctx.account_id
                    or scope["user_id"] != session.ctx.user.user_id):
                raise ReceiptConflict("receipt/session owner mismatch")
            phase1 = await session._read_phase1_meta(bound["archive_uri"])
            message = phase1.get("queue_message", {})
            if (message.get("receipt_request_key") != key or message.get("task_id") != bound["task_id"]
                    or message.get("archive_uri") != bound["archive_uri"]): return row
            task = await tracker.get(bound["task_id"],account_id=scope["account"],user_id=scope["user_id"])
            if allow_recovery and phase1.get("status")=="ready" and (task is None or task.status.value=="pending"):
                # Resume ONLY the exact durably published operation. Never call
                # commit_async again or infer an archive from session/time.
                lease=None
                try:
                    archive_path=session._viking_fs._uri_to_path(bound["archive_uri"],ctx=session.ctx)
                    lease=await session._viking_fs._async_agfs.pathlock_acquire_exact(archive_path,timeout_secs=0.1)
                    queued=await self.queue_has_work(bound["task_id"])
                    if task is None:
                        task=await tracker.create("session_commit",resource_id=scope["session_id"],account_id=scope["account"],user_id=scope["user_id"],task_id=bound["task_id"])
                    if not queued and not await tracker.has_work(bound["task_id"],account_id=scope["account"],user_id=scope["user_id"]):
                        from openviking.storage.queuefs import get_queue_manager,QueueManager
                        from openviking.service.task_work_index import bind_task_context
                        with bind_task_context(bound["task_id"],scope["account"],scope["user_id"]):
                            await get_queue_manager().enqueue(QueueManager.SESSION_COMMIT,message)
                except LockAcquisitionError:
                    return row  # Native publication lease is not yet recoverable.
                finally:
                    if lease is not None: await session._viking_fs._async_agfs.pathlock_release(lease)
            if task is None: return row
            if task.resource_id != scope["session_id"]: return row
            if row["state"] == "preparing":
                row = self.ledger.accepted(key,bound["task_id"])
            status = task.status.value
            if status not in ("completed","failed","cancelled"): return row
            # Store-authoritative open work includes queued/requeued descendants.
            # Terminal Store tasks reject new register_work and late deliveries.
            if await tracker.has_work(bound["task_id"],account_id=scope["account"],user_id=scope["user_id"]): return row
            if tracker.has_active_producer(bound["task_id"]): return row
            if await self.queue_has_work(bound["task_id"]): return row
            done = await session._archives.file_exists(bound["archive_uri"],".done")
            failed = await session._archives.file_exists(bound["archive_uri"],".failed.json")
            if not (done if status == "completed" else failed): return row
            # No publication/parent worker can run under this same fence. Seal
            # before unlocking so every later keyed delivery is a no-op.
            return self.ledger.sealed_terminal(key,status,backend_quiescence_verified=True)
        finally:
            handle.close()

_runtime = None

def runtime():
    global _runtime
    path = os.environ.get("OPENVIKING_COMMIT_RECEIPT_DB")
    if not path: return None
    if _runtime is None or _runtime.ledger.path != path: _runtime = CommitReceipts(path)
    return _runtime

async def resume_fenced(session, message, call):
    key = getattr(message,"receipt_request_key","")
    if not key: return await call()
    owner = runtime()
    if owner is None: raise RuntimeError("Keyed queue delivery requires receipt owner")
    async with owner.fence(key,shared=True):
        row = owner.ledger.read(key); bound = owner.binding(key)
        if not row or not bound or bound["task_id"] != message.task_id or bound["archive_uri"] != message.archive_uri:
            raise ReceiptConflict("queue/receipt binding mismatch")
        scope = json.loads(row["scope_json"])
        if scope["account"] != session.ctx.account_id or scope["user_id"] != session.ctx.user.user_id or scope["session_id"] != session.session_id:
            raise ReceiptConflict("queue owner mismatch")
        if row["state"] == "terminal": return True
        async with owner.fence(key,lane="parent"):
            return await call()
