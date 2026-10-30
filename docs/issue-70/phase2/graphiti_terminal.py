"""Coordinator-owned direct Graphiti Core completion. Disabled integration candidate.

Do not interpret MCP add_memory queue acknowledgments as terminal receipts.
Caller must hold existing gate flock; sticky unresolved rows protect restart.
"""
from __future__ import annotations
import asyncio
from dataclasses import dataclass
from datetime import datetime
import hashlib
import json
import time


class IngestConflict(ValueError): pass
class UnverifiedSource(ValueError): pass


def digest(value):
    data=json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False,allow_nan=False)
    return hashlib.sha256(data.encode()).hexdigest()


@dataclass(frozen=True)
class EpisodeEnvelope:
    # Only a source-authority resolver may construct this, never an LLM claim.
    work_key: str
    source_event_key: str
    group_id: str
    name: str
    episode_body: str
    source_description: str
    reference_time: datetime
    attestation_digest: str

    def validate(self):
        for field in ("work_key","source_event_key","group_id","name","episode_body",
                      "source_description","attestation_digest"):
            if not isinstance(getattr(self,field),str) or not getattr(self,field):
                raise UnverifiedSource("missing "+field)
        for value in (self.work_key,self.source_event_key,self.attestation_digest):
            if len(value)!=64 or any(c not in "0123456789abcdef" for c in value):
                raise UnverifiedSource("invalid immutable identity")
        if not isinstance(self.reference_time,datetime) or self.reference_time.tzinfo is None:
            raise UnverifiedSource("reference time must be timezone-aware")
        if len(self.episode_body.encode())>65536:
            raise UnverifiedSource("episode input limit")

    def payload_hash(self):
        self.validate()
        return digest((self.work_key,self.source_event_key,self.group_id,self.name,
                       self.episode_body,self.source_description,self.reference_time.isoformat(),
                       self.attestation_digest))


class IngestJournal:
    # Reuse the gate's SQLite connector and state DB: not a second store.
    def __init__(self,db):
        self.db=db
        with db.connect() as conn:
            conn.execute("""CREATE TABLE IF NOT EXISTS graphiti_ingest_receipts(
                work_key TEXT PRIMARY KEY, payload_digest TEXT NOT NULL,
                source_event_key TEXT NOT NULL, group_id TEXT NOT NULL,
                state TEXT NOT NULL, episode_uuid TEXT,
                error_code TEXT, updated_at REAL NOT NULL)""")

    def read(self,key):
        with self.db.connect() as conn:
            row=conn.execute("SELECT * FROM graphiti_ingest_receipts WHERE work_key=?",(key,)).fetchone()
            return dict(row) if row else None

    def reserve(self,ep):
        ep.validate()
        with self.db.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            old=conn.execute("SELECT * FROM graphiti_ingest_receipts WHERE work_key=?",(ep.work_key,)).fetchone()
            if old:
                if (old["payload_digest"]!=ep.payload_hash() or old["source_event_key"]!=ep.source_event_key
                        or old["group_id"]!=ep.group_id):
                    raise IngestConflict("contradictory source/group for reserved work")
                return old["state"]
            conn.execute("""INSERT INTO graphiti_ingest_receipts
                (work_key,payload_digest,source_event_key,group_id,state,updated_at)
                VALUES (?,?,?,?,'reserved',?)""",
                (ep.work_key,ep.payload_hash(),ep.source_event_key,ep.group_id,time.time()))
            return "reserved"

    def begin(self,key):
        with self.db.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            update=conn.execute("""UPDATE graphiti_ingest_receipts SET state='processing',updated_at=?
                WHERE work_key=? AND state='reserved'""",(time.time(),key))
            return update.rowcount==1

    def seal(self,key,uuid,*,awaited,readback):
        if awaited is not True or readback is not True or not uuid:
            raise ValueError("awaited extraction AND exact persisted graph readback required")
        with self.db.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            update=conn.execute("""UPDATE graphiti_ingest_receipts
                SET state='completed',episode_uuid=?,error_code=NULL,updated_at=?
                WHERE work_key=? AND state='processing'""",(uuid,time.time(),key))
            if update.rowcount!=1: raise IngestConflict("terminal identity conflict")

    def block(self,key,code):
        with self.db.connect() as conn:
            conn.execute("""UPDATE graphiti_ingest_receipts SET state='blocked_reconcile',
                error_code=?,updated_at=? WHERE work_key=? AND state IN ('reserved','processing')""",
                (code[:80],time.time(),key))

    def recover_restart(self):
        with self.db.connect() as conn:
            update=conn.execute("""UPDATE graphiti_ingest_receipts SET state='blocked_reconcile',
                error_code='owner_restart',updated_at=? WHERE state='processing'""",(time.time(),))
            return update.rowcount


class AwaitedCoreAdapter:
    # Owns exact graph results; never sends to Graphiti MCP's background queue.
    # Resolve callback MUST be backed by independent operator/source evidence.
    def __init__(self,db,*,resolve,client_factory,read_episode):
        self.journal=IngestJournal(db)
        self.resolve=resolve
        self.client_factory=client_factory
        self.read_episode=read_episode

    async def _execute(self,ep):
        client=self.client_factory()
        if asyncio.iscoroutine(client): client=await client
        # Deliberately omit uuid: upstream may read an EXISTING episode for uuid.
        result=await client.add_episode(
            name=ep.name,episode_body=ep.episode_body,
            source_description=ep.source_description,
            reference_time=ep.reference_time,group_id=ep.group_id)
        item=getattr(result,"episode",None)
        uuid=getattr(item,"uuid",None)
        if not isinstance(uuid,str) or not uuid: raise RuntimeError("missing real episode UUID")
        stored=await self.read_episode(client,uuid,ep.group_id)
        # UUID and group-scoped exact readback, NEVER ranked search.
        if not stored or any((getattr(stored,attr,None)!=value) for attr,value in (
            ("uuid",uuid),("group_id",ep.group_id),("name",ep.name),("content",ep.episode_body))):
            raise RuntimeError("episode readback does not bind to source")
        return uuid

    def submit(self,candidate):
        ep=self.resolve(candidate)
        if not isinstance(ep,EpisodeEnvelope): raise UnverifiedSource("no verified source record")
        ep.validate()
        if ep.group_id!=candidate.get("scope",{}).get("group_id"):
            raise UnverifiedSource("verified group scope mismatch")
        old=self.journal.reserve(ep)
        if old!="reserved" or not self.journal.begin(ep.work_key):
            return ep.work_key  # An existing accepted job must NOT re-execute.
        try:
            uuid=asyncio.run(self._execute(ep))
            self.journal.seal(ep.work_key,uuid,awaited=True,readback=True)
        except BaseException:
            self.journal.block(ep.work_key,"submission_or_persistence_ambiguous")
            raise
        return ep.work_key

    def poll(self,backend_identity):
        row=self.journal.read(backend_identity)
        if row and row["state"]=="completed" and row["episode_uuid"]:
            return {"backend_identity":backend_identity,"status":"completed",
                    "persisted":True,"episode_uuid":row["episode_uuid"]}
        return {"backend_identity":backend_identity,"status":"blocked_reconcile","persisted":False}
