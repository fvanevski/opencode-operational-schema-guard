"""Isolated Graphiti Core execution in its authenticated Python interpreter.

The coordinator retains its EX flock for the entire child process and its
readback. The subprocess performs direct awaited Graphiti Core ingestion and
returns a terminal result; no MCP queued acknowledgment is accepted.

Disposable targets are issue70_* by default. Any non-disposable target
must match the independently configured parent process group and require an
explicit --allow-production-group flag from the reviewed gate bootstrap.
"""
from __future__ import annotations
import asyncio
from datetime import datetime
import json
import os
import sys
from pathlib import Path

# In the qualified source package, phase2 and phase3 are sibling directories.
# The host bundle must preserve that relative import identity.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "phase2"))

from graphiti_core_bridge import build_core_client,prepare_core_client,close_core_client,read_episode_by_uuid
from graphiti_process_transport import allowed_group


async def run(request, *, expected_group=None, production_approved=False):
    group=request.get("group_id")
    if (not isinstance(request,dict)
            or not allowed_group(group,production_approved=production_approved)
            or (expected_group is not None and group!=expected_group)):
        raise ValueError("unapproved or mismatched graph target")
    required={"name","episode_body","source_description","reference_time","group_id"}
    if not required.issubset(request) or set(request)-required-{"custom_extraction_instructions"}:
        raise ValueError("unexpected ingestion request fields")
    instructions=request.get("custom_extraction_instructions")
    if instructions is not None and (not isinstance(instructions,str)
            or not instructions.strip() or len(instructions.encode())>2048):
        raise ValueError("invalid bounded extraction instructions")
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
            reference_time=when,group_id=group,
            **({"custom_extraction_instructions":instructions}
               if instructions is not None else {}))
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
        import argparse
        parser=argparse.ArgumentParser()
        parser.add_argument("--expected-group",default=None)
        parser.add_argument("--allow-production-group",action="store_true")
        args=parser.parse_args()
        # A bare child invocation remains restricted to disposable groups.
        if args.allow_production_group and not args.expected_group:
            raise ValueError("production target must be bound to an exact group")
        raw=sys.stdin.buffer.read(65537)
        if not raw or len(raw)>65536:
            raise ValueError("invalid bounded request")
        request=json.loads(raw)
        value=asyncio.run(run(request,expected_group=args.expected_group,
                          production_approved=args.allow_production_group))
        sys.stdout.write("ISSUE70_TERMINAL="+json.dumps(value,separators=(",",":"))+"\n")
        return 0
    except Exception:
        # Do not emit raw payload, source text, secrets, or graph stack traces.
        sys.stderr.write("Graphiti child did not produce a provable terminal receipt\n")
        return 1

if __name__=="__main__":
    raise SystemExit(main())
