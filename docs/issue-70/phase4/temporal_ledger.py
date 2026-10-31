"""Durable post-write temporal validator disposition for Graphiti work.

One existing SQLite database owns candidate admission, immutable transition
contract, exact Graphiti terminal receipt, and the validator outcome. This
module NEVER retries an episode, modifies graph edges or invokes extraction.
"""
from __future__ import annotations
import hashlib
import json
import time

EXIT_DISPOSITIONS = {0:"PASS",1:"INCONSISTENT",2:"INCOMPLETE",3:"INVALID_INPUT"}
# Detailed dispositions the pinned read-only validator can return
# (run_transition live/in-memory modes), mapped to their exit classes.
# Every value is preserved; the ledger never re-derives a disposition.
VALIDATOR_DISPOSITIONS = {
    0:{"PASS"},
    1:{"TEMPORAL_CONFLICT","MISSING_STATE","INCORRECT_BOUNDARY","INCONSISTENT"},
    2:{"INCOMPLETE_EVIDENCE","INCOMPLETE"},3:{"INVALID_INPUT"},
}

def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(",",":"),
        ensure_ascii=False,allow_nan=False).encode()).hexdigest()

def validate_contract(value, group):
    if not isinstance(value,dict) or set(value)!={"group_id","subject","predicate","transition"}:
        raise ValueError("trusted transition contract shape")
    if value["group_id"] != group:
        raise ValueError("trusted transition contract group mismatch")
    if not all(isinstance(value[k],str) and 0<len(value[k])<=256
               for k in ("subject","predicate")):
        raise ValueError("invalid transition subject or predicate")
    t=value["transition"]
    if not isinstance(t,dict) or set(t)!={"from","to","effective_at"}:
        raise ValueError("trusted transition must declare both states and effective time")
    if not all(isinstance(t[k],str) and 0<len(t[k])<=256
               for k in ("from","to","effective_at")) or t["from"]==t["to"]:
        raise ValueError("invalid source-declared mutually exclusive states")
    from datetime import datetime
    when=datetime.fromisoformat(t["effective_at"].replace("Z","+00:00"))
    if when.tzinfo is None:
        raise ValueError("effective time must be timezone-aware")
    if len(json.dumps(value).encode())>4096:
        raise ValueError("transition exceeds size bound")
    return digest(value)

class TemporalLedger:
    def __init__(self, db):
        self.db=db
        with db.connect() as conn:
            conn.execute("""CREATE TABLE IF NOT EXISTS temporal_transition_contracts(
                work_key TEXT PRIMARY KEY, group_id TEXT NOT NULL,
                contract_json TEXT NOT NULL, contract_digest TEXT NOT NULL,
                attestation_digest TEXT NOT NULL DEFAULT '',
                bound_at REAL NOT NULL DEFAULT 0)""")
            conn.execute("""CREATE TABLE IF NOT EXISTS temporal_validation_results(
                work_key TEXT PRIMARY KEY, episode_uuid TEXT NOT NULL,
                contract_digest TEXT NOT NULL, state TEXT NOT NULL,
                exit_code INTEGER, disposition TEXT,
                result_digest TEXT, details_json TEXT,
                attempts INTEGER NOT NULL DEFAULT 0,
                updated_at REAL NOT NULL)""")

    def status_for_episode(self,episode_uuid,group):
        with self.db.connect() as conn:
            row=conn.execute("""SELECT r.state,r.exit_code,r.disposition,c.group_id
                FROM temporal_validation_results r
                JOIN temporal_transition_contracts c ON c.work_key=r.work_key
                WHERE r.episode_uuid=? AND c.group_id=?""",(episode_uuid,group)).fetchone()
        if row is None or row["state"]!="done":
            return "UNVERIFIED"
        return EXIT_DISPOSITIONS.get(row["exit_code"],"UNVERIFIED")

    def bind_completed(self,work_key):
        """Receipt can complete before validation; always recover by work key.

        This method does no inference and cannot manufacture graph success:
        BOTH backend and typed coordinator terminal evidence must exist.
        During the worker's processing state, the coordinator is not yet
        completed, so the exact backend journal receipt is sufficient there.
        """
        with self.db.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            row=conn.execute("""SELECT c.contract_json,c.contract_digest,c.group_id,
                i.episode_uuid,i.state AS ingest_state,i.group_id AS ingest_group
                FROM temporal_transition_contracts c
                JOIN graphiti_ingest_receipts i ON i.work_key=c.work_key
                WHERE c.work_key=?""",(work_key,)).fetchone()
            if row is None or row["ingest_state"]!="completed" or not row["episode_uuid"] or row["group_id"]!=row["ingest_group"]:
                return None
            contract=json.loads(row["contract_json"])
            if validate_contract(contract,row["group_id"])!=row["contract_digest"]:
                raise ValueError("durable transition contract changed")
            episode_uuid=row["episode_uuid"]
            prior=conn.execute("SELECT * FROM temporal_validation_results WHERE work_key=?",
                               (work_key,)).fetchone()
            if prior:
                if prior["episode_uuid"]!=episode_uuid or prior["contract_digest"]!=row["contract_digest"]:
                    raise ValueError("changed temporal episode/contract identity")
            else:
                conn.execute("""INSERT INTO temporal_validation_results(
                    work_key,episode_uuid,contract_digest,state,updated_at)
                    VALUES (?,?,?,'pending',?)""",
                    (work_key,episode_uuid,row["contract_digest"],time.time()))
            return contract,episode_uuid

    def evaluate(self,work_key,runner,*,max_attempts=2):
        result=self.bind_completed(work_key)
        if result is None:return "UNVERIFIED"
        contract,uid=result
        with self.db.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            row=conn.execute("SELECT * FROM temporal_validation_results WHERE work_key=?",
                             (work_key,)).fetchone()
            if row["state"]=="done":
                return EXIT_DISPOSITIONS[row["exit_code"]]
            if row["attempts"]>=max_attempts:
                return "UNVERIFIED"
            # A process may die after this durable transition. This is a
            # READ-ONLY validator; retrying validation is safe and bounded.
            changed=conn.execute("""UPDATE temporal_validation_results SET
                state='running',attempts=attempts+1,updated_at=?
                WHERE work_key=? AND state IN ('pending','running','unverified')""",
                (time.time(),work_key))
            if changed.rowcount!=1:return "UNVERIFIED"
        value=None
        try:
            specified=json.loads(json.dumps(contract))
            specified["transition"]["episode_uuid"]=uid
            value=runner(specified)
            exit_code=value["exit"]
            disposition=value["disposition"]
            if (type(exit_code) is not int or exit_code not in EXIT_DISPOSITIONS
                    or disposition not in VALIDATOR_DISPOSITIONS[exit_code]):
                raise ValueError("invalid validator exit/disposition pair")
            if value.get("mode")!="live":
                raise ValueError("validator did not execute live graph query")
            # Store bounded source/edge IDs and diagnostic codes only;
            # never a graph transcript or full raw tool response.
            findings=value.get("findings",[])
            if not isinstance(findings,list):raise ValueError("invalid findings")
            safe=[]
            for f in findings[:16]:
                if not isinstance(f,dict):continue
                item={"type":str(f.get("type",""))[:64]}
                if f.get("state") is not None:
                    item["state"]=str(f["state"])[:128]
                if f.get("detail"):
                    item["detail"]=str(f["detail"])[:128]
                edges=f.get("edges")
                if isinstance(edges,list):
                    item["edges"]=[str(e)[:64] for e in edges[:8]
                                   if isinstance(e,str)]
                for k in ("code","edge_id","source_id","episode_uuid"):
                    if k in f and isinstance(f[k],(str,int)):
                        item[k]=str(f[k])[:128]
                safe.append(item)
            details={"coverage":str(value.get("coverage",""))[:128],"findings":safe}
            packed=json.dumps(details,separators=(",",":"))
            if len(packed)>4096:raise ValueError("validator result too large")
            with self.db.connect() as conn:
                conn.execute("BEGIN IMMEDIATE")
                conn.execute("""UPDATE temporal_validation_results SET state='done',
                    exit_code=?,disposition=?,result_digest=?,details_json=?,updated_at=?
                    WHERE work_key=? AND state='running'""",
                    (exit_code,disposition,digest(value),packed,time.time(),work_key))
            return EXIT_DISPOSITIONS[exit_code]
        except Exception:
            # Graphiti ingestion remains completed. Never silently claim
            # validation success or re-execute Graphiti after validator error.
            with self.db.connect() as conn:
                conn.execute("""UPDATE temporal_validation_results
                    SET state='unverified',updated_at=? WHERE work_key=?
                    AND state='running'""",(time.time(),work_key))
            return "UNVERIFIED"

class TemporalCheckingAdapter:
    """Wraps the EXISTING durable Core adapter; no second work scheduler."""

    def __init__(self,core,db,validator_runner):
        self.core=core
        self.ledger=TemporalLedger(db)
        self.validator_runner=validator_runner
        self.db=db

    def submit(self,candidate):
        return self.core.submit(candidate)

    def poll(self,backend_identity):
        receipt=self.core.poll(backend_identity)
        if (receipt.get("status")!="completed" or receipt.get("persisted") is not True
                or receipt.get("backend_identity")!=backend_identity):
            return receipt
        with self.db.connect() as conn:
            contract=conn.execute("""SELECT 1 FROM temporal_transition_contracts
                WHERE work_key=?""",(backend_identity,)).fetchone()
            row=conn.execute("""SELECT candidate_json FROM memory_work
                WHERE work_key=?""",(backend_identity,)).fetchone()
        if row and json.loads(row["candidate_json"]).get("category")=="exclusive_state_transition":
            if not contract:
                # Missing bound contract is not authority for completion.
                return {"backend_identity":backend_identity,
                        "status":"blocked_reconcile","persisted":False}
            # Completed graph persistence is independent of validator result.
            # Read-only validation errors are durable UNVERIFIED, not re-ingest.
            self.ledger.evaluate(backend_identity,self.validator_runner)
        return receipt
