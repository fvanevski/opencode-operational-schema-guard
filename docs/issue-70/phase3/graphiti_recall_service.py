"""Bounded, read-only, source-attributed Graphiti recall service.

Separate Python process using the installed Graphiti venv. No OpenCode
interactive hook imports Graphiti or invokes an embedding/LLM model.

IMPORTANT: FalkorDriver.__init__ schedules CREATE INDEX when created in an
active event loop. Construct it synchronously BEFORE asyncio.run, and never
call build_indices_and_constraints(). The graph query is a literal read-only
Cypher statement with parameterized group and term and a bounded LIMIT.
"""
from __future__ import annotations
import asyncio
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import hmac
import json
import os
from pathlib import Path
import re
import sqlite3
import threading

MAX_REQUEST_BYTES=4096
TEXT=re.compile(r"^[^\x00-\x1f]{8,256}$")
GRAPH_SOURCE=re.compile(r"^git:[0-9a-f]{40}:[-\w./]+$")
FORBIDDEN=re.compile(r"password\s*[:=]|Bearer\s+\S+|-----BEGIN .*PRIVATE KEY-----",re.I)
STOP={"what","when","which","where","who","the","was","were","how","does",
      "did","and","for","from","with","about","is","are","now","have",
      "changed","history","relationship","previous","current","state"}

# No graph writes, no index creation, no ranked search.
READ_QUERY="""MATCH (a:Entity)-[r:RELATES_TO]->(b:Entity)
WHERE a.group_id = $group AND b.group_id = $group
  AND r.group_id = $group
  AND (toLower(a.name) CONTAINS $term OR toLower(b.name) CONTAINS $term)
RETURN a.name AS subject, b.name AS object, r.fact AS fact,
       r.episodes AS episode_ids, r.valid_at AS valid_at,
       r.invalid_at AS invalid_at
LIMIT 24"""


def term_for_query(query: str) -> str | None:
    if not isinstance(query,str) or not TEXT.fullmatch(query) or FORBIDDEN.search(query):
        return None
    tokens=re.findall(r"[A-Za-z0-9_-]{3,}",query.lower())
    viable=[x for x in tokens if x not in STOP]
    return max(viable,key=len)[:64] if viable else None


def episode_ids(value) -> list[str]:
    if isinstance(value,str):
        try: value=json.loads(value)
        except (ValueError,TypeError):return []
    if not isinstance(value,list):return []
    return list(dict.fromkeys(str(x) for x in value[:32]
                              if isinstance(x,(str,int))))


def episode_overflow(value) -> bool:
    if isinstance(value,str):
        try: value=json.loads(value)
        except (ValueError,TypeError):return True
    return not isinstance(value,list) or len(value)>32


def combined_validation(episodes,receipts,overflow=False):
    """Every provenance contributor participates; ordering cannot grant PASS."""
    refs=sorted({receipts[uid]["source_ref"] for uid in episodes
                 if uid in receipts})
    if not refs:return None
    approved=[receipts[uid] for uid in episodes if uid in receipts]
    exclusive=any(x["exclusive"] for x in approved)
    statuses=[x["validation_status"] for x in approved if x["exclusive"]]
    missing=overflow or len(approved)!=len(episodes)
    # An ordinary episode cannot silently assert validated exclusive state.
    mixed=exclusive and any(not x["exclusive"] for x in approved)
    if not exclusive:
        status="UNVERIFIED" if missing else "not_required"
    elif missing or mixed or len(refs)>16 or "UNVERIFIED" in statuses:
        status="UNVERIFIED"
    elif "INCONSISTENT" in statuses:
        status="INCONSISTENT"
    elif "INVALID_INPUT" in statuses:
        status="INVALID_INPUT"
    elif "INCOMPLETE" in statuses:
        status="INCOMPLETE"
    elif len(statuses)==len(episodes) and all(s=="PASS" for s in statuses):
        status="PASS"
    else:
        status="UNVERIFIED"
    # A missing record on an otherwise ordinary edge does not give the
    # caller a provenance-complete fact.
    if not exclusive and status=="UNVERIFIED":return None
    return {"source_ref":refs[0],"source_refs":refs[:16],
            "exclusive":exclusive,"validation_status":status}



def receipt_sources(db_path: str, group_id: str, ids: list[str]) -> dict:
    """Only independently attested completed receipts are recall authority."""
    out={}
    if not ids:return out
    uri=Path(db_path).resolve().as_uri().replace("file://","file:") + "?mode=ro"
    # sqlite3 URI must target the existing file; never initialize a state DB.
    with sqlite3.connect(uri,uri=True,timeout=1) as conn:
        conn.row_factory=sqlite3.Row
        has_results=conn.execute("""SELECT 1 FROM sqlite_master WHERE
            type='table' AND name='temporal_validation_results'""").fetchone() is not None
        has_active=conn.execute("""SELECT 1 FROM sqlite_master WHERE
            type='table' AND name='temporal_validator_active'""").fetchone() is not None
        has_digest=(has_results and "validator_sha256" in {
            r["name"] for r in conn.execute("PRAGMA table_info(temporal_validation_results)")})
        temporal_select=(
            """tv.state AS temporal_state,tv.exit_code AS temporal_exit,
               tv.validator_sha256 AS result_validator_sha"""
            if has_digest else """NULL AS temporal_state,NULL AS temporal_exit,
               NULL AS result_validator_sha""")
        temporal_select += (",va.validator_sha256 AS active_validator_sha"
                            if has_active else ",NULL AS active_validator_sha")
        temporal_join=(
            """LEFT JOIN temporal_validation_results tv
              ON tv.work_key=gi.work_key AND tv.episode_uuid=gi.episode_uuid"""
            if has_digest else "")
        if has_active:
            temporal_join+=" LEFT JOIN temporal_validator_active va ON va.singleton=1"
        query=f"""SELECT gi.episode_uuid, mw.candidate_json,
            {temporal_select}
            FROM graphiti_ingest_receipts gi
            JOIN memory_work mw ON mw.work_key=gi.work_key
            JOIN memory_source_attestations att ON att.work_key=gi.work_key
            {temporal_join}
            WHERE gi.group_id=? AND gi.state='completed'
              AND mw.status='completed' AND att.source_authority LIKE 'git-record-v1:%'
              AND gi.episode_uuid IN (""" + ",".join("?" for _ in ids) + ")"
        for row in conn.execute(query,(group_id,*ids)):
            try:
                candidate=json.loads(row["candidate_json"])
                ref=candidate["fact_ref"]
                if (GRAPH_SOURCE.fullmatch(ref) and
                        candidate["scope"]["group_id"]==group_id):
                    exclusive=candidate["category"]=="exclusive_state_transition"
                    statuses={0:"PASS",1:"INCONSISTENT",2:"INCOMPLETE",3:"INVALID_INPUT"}
                    status=(statuses.get(row["temporal_exit"],"UNVERIFIED")
                            if row["temporal_state"]=="done"
                               and row["result_validator_sha"] is not None
                               and row["result_validator_sha"]==row["active_validator_sha"]
                            else "UNVERIFIED")
                    out[row["episode_uuid"]]={"source_ref":ref,
                        "exclusive":exclusive,
                        "validation_status":status if exclusive else "not_required"}
            except (KeyError,ValueError,TypeError):continue
    return out


def format_rows(rows, receipts, group_id: str, *,limit=4) -> list[dict]:
    facts=[]
    # Aggregate identical returned facts/temporal intervals before assigning
    # one disposition. Otherwise duplicate graph edges can reintroduce
    # provenance-order dependence even when each edge is reconciled.
    grouped={}
    for row in rows[:24]:
        name=row.get("fact")
        if not isinstance(name,str) or not name or len(name)>512 or FORBIDDEN.search(name):
            continue
        key=(name,str(row.get("valid_at") or ""),str(row.get("invalid_at") or ""))
        state=grouped.setdefault(key,{"episodes":[],"overflow":False})
        ids=episode_ids(row.get("episode_ids"))
        state["overflow"]|=episode_overflow(row.get("episode_ids"))
        for uid in ids:
            if uid not in state["episodes"]:
                state["episodes"].append(uid)
    for key,state in grouped.items():
        if not state["episodes"]:continue
        merged=combined_validation(state["episodes"],receipts,
                                   overflow=state["overflow"])
        if merged is None:continue
        name,valid_at,invalid_at=key
        facts.append({"group_id":group_id,"fact":name,**merged,
          "valid_at":valid_at[:64],"invalid_at":invalid_at[:64]})
        if len(facts)>=max(1,min(8,limit)):break
    return facts


class Reader:
    def __init__(self, *,group_id,db_path,falkor_host="127.0.0.1",falkor_port=6382):
        self.group_id=group_id
        self.db_path=db_path
        self.falkor_host=falkor_host
        self.falkor_port=falkor_port

    def query(self, text, limit):
        term=term_for_query(text)
        if not term:return []
        # Construct outside any running event loop so FalkorDriver does NOT
        # schedule index creation: a recall operation must never mutate graph.
        from graphiti_core.driver.falkordb_driver import FalkorDriver
        driver=FalkorDriver(host=self.falkor_host,port=self.falkor_port,database=self.group_id)
        if getattr(driver,"_init_task",None) is not None:
            raise RuntimeError("unexpected Falkor index-initialization task during read-only recall")
        async def read():
            try:
                output=await asyncio.wait_for(driver.execute_query(
                    READ_QUERY,group=self.group_id,term=term),timeout=2.0)
                return output[0] if isinstance(output,tuple) else output
            finally:
                await driver.close()
        records=asyncio.run(read())
        if not isinstance(records,list):return []
        ids=list({id for row in records if isinstance(row,dict)
                  for id in episode_ids(row.get("episode_ids"))})[:96]
        approved=receipt_sources(self.db_path,self.group_id,ids)
        return format_rows(records,approved,self.group_id,limit=limit)


def serve(*,bind_host,port,group_id,token,reader):
    if bind_host!="127.0.0.1" or not token or len(token)<16:
        raise ValueError("local-only recall listener with operator secret required")
    semaphore=threading.BoundedSemaphore(value=2)
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def respond(self,status,payload):
            raw=json.dumps(payload,separators=(",",":")).encode()
            self.send_response(status)
            self.send_header("Content-Type","application/json")
            self.send_header("Cache-Control","no-store")
            self.send_header("Content-Length",str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        def do_POST(self):
            if self.path!="/v1/recall":
                return self.respond(404,{"error":"not found"})
            auth=self.headers.get("Authorization","")
            if not hmac.compare_digest(auth,"Bearer "+token):
                return self.respond(403,{"error":"forbidden"})
            length=self.headers.get("Content-Length","")
            if not length.isdecimal() or not 1<=int(length)<=MAX_REQUEST_BYTES:
                return self.respond(413,{"error":"request too large"})
            if not semaphore.acquire(blocking=False):
                return self.respond(429,{"error":"recall busy"})
            try:
                payload=json.loads(self.rfile.read(int(length)))
                if not isinstance(payload,dict) or set(payload)!={"group_id","query","limit"}:
                    return self.respond(400,{"error":"invalid recall payload"})
                if payload["group_id"]!=group_id or type(payload["limit"]) is not int:
                    return self.respond(403,{"error":"group not approved"})
                if term_for_query(payload["query"]) is None:
                    return self.respond(200,{"group_id":group_id,"facts":[]})
                facts=reader.query(payload["query"],max(1,min(8,payload["limit"])))
                return self.respond(200,{"group_id":group_id,"facts":facts})
            except Exception:
                # Graph/SQLite errors fail closed; never emit raw query or DB data.
                return self.respond(503,{"error":"recall temporarily unavailable"})
            finally:
                semaphore.release()
    server=ThreadingHTTPServer((bind_host,port),Handler)
    server.serve_forever(poll_interval=0.2)


if __name__=="__main__":
    # Operator must provide an explicit group and existing durable gate DB.
    group=os.environ.get("GRAPHITI_RECALL_GROUP","")
    db=os.environ.get("GRAPHITI_RECALL_GATE_DB","")
    token=os.environ.get("GRAPHITI_RECALL_TOKEN","")
    if not re.fullmatch(r"[-A-Za-z0-9_]{1,128}",group) or not db or not Path(db).is_file():
        raise SystemExit("explicit recall group and existing gate DB required")
    serve(bind_host="127.0.0.1",port=int(os.environ.get("GRAPHITI_RECALL_PORT","9091")),
          group_id=group,token=token,reader=Reader(group_id=group,db_path=db,
            falkor_port=int(os.environ.get("GRAPHITI_RECALL_FALKOR_PORT","6382"))))
