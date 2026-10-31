"""Isolated Graphiti Core execution in its authenticated Python interpreter.

The coordinator retains its EX flock for the entire child process and its
readback. The subprocess performs direct awaited Graphiti Core ingestion and
returns a terminal result; no MCP queued acknowledgment is accepted.

Qualification-only target policy: a dedicated issue70_* graph is required.
Production target changes require a separately reviewed activation policy.
"""
from __future__ import annotations
import asyncio
from datetime import datetime
import json
import os
import sys

from graphiti_core_bridge import build_core_client,prepare_core_client,close_core_client,read_episode_by_uuid


async def run(request):
    group=request.get("group_id")
    if not isinstance(group,str) or not group.startswith("issue70_") or len(group)>128:
        raise ValueError("non-disposable graph target refused")
    if set(request)!={
        "name","episode_body","source_description","reference_time","group_id"}:
        raise ValueError("unexpected ingestion request fields")
    for key in ("name","episode_body","source_description"):
        value=request[key]
        if not isinstance(value,str) or not value or len(value.encode())>65536:
            raise ValueError("invalid bounded input")
    when=datetime.fromisoformat(request["reference_time"].replace("Z","+00:00"))
    if when.tzinfo is None:
        raise ValueError("reference time missing timezone")
    client=build_core_client(database=group)
    try:
        await prepare_core_client(client)
        result=await client.add_episode(
            name=request["name"],episode_body=request["episode_body"],
            source_description=request["source_description"],
            reference_time=when,group_id=group)
        uid=getattr(getattr(result,"episode",None),"uuid",None)
        if not isinstance(uid,str) or not uid:
            raise RuntimeError("no authoritative Graphiti episode UUID")
        stored=await read_episode_by_uuid(client,uid,group)
        if (stored is None or stored.uuid!=uid or stored.group_id!=group
            or stored.name!=request["name"] or stored.content!=request["episode_body"]):
            raise RuntimeError("exact graph readback mismatch")
        return {"episode_uuid":uid,"readback":{
            "uuid":stored.uuid,"group_id":stored.group_id,
            "name":stored.name,"content":stored.content}}
    finally:
        await close_core_client(client)


def main():
    try:
        raw=sys.stdin.buffer.read(65537)
        if not raw or len(raw)>65536:
            raise ValueError("invalid bounded request")
        request=json.loads(raw)
        value=asyncio.run(run(request))
        sys.stdout.write("ISSUE70_TERMINAL="+json.dumps(value,separators=(",",":"))+"\n")
        return 0
    except Exception:
        # Do not emit raw payload, source text, secrets, or graph stack traces.
        sys.stderr.write("Graphiti child did not produce a provable terminal receipt\n")
        return 1

if __name__=="__main__":
    raise SystemExit(main())
