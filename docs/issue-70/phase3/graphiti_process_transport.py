"""Explicit separate-interpreter Graphiti Core transport, under the GATE lock.

No second scheduler, no detached service, no queue ack. The gate's
AwaitedCoreAdapter owns the durable work key/receipt. This transport only
returns after the isolated Graphiti venv child has performed exact readback.
"""
from __future__ import annotations
import asyncio
import json
import os
from pathlib import Path
from types import SimpleNamespace

class ChildTerminalUnverified(RuntimeError):pass

class ProcessCoreClient:
    def __init__(self, *,python,worker,group,timeout_seconds=600,env=None):
        if not Path(python).is_file() or not Path(worker).is_file():
            raise ValueError("exact Graphiti interpreter/worker paths required")
        if not isinstance(group,str) or not group.startswith("issue70_"):
            raise ValueError("qualification graph only; production requires a separate reviewed policy")
        self.python=python
        self.worker=worker
        self.group=group
        self.timeout_seconds=max(1,min(3600,timeout_seconds))
        self.env=env
        self._persisted=None

    async def add_episode(self, **kwargs):
        if kwargs.get("group_id")!=self.group:
            raise ChildTerminalUnverified("source and target group conflict")
        request={k:v.isoformat() if hasattr(v,"isoformat") else v for k,v in kwargs.items()}
        required={"name","episode_body","source_description","reference_time","group_id"}
        if not required.issubset(request) or set(request)-required-{"custom_extraction_instructions"}:
            raise ChildTerminalUnverified("unsupported episode parameter shape")
        instruction=request.get("custom_extraction_instructions")
        if instruction is not None and (not isinstance(instruction,str)
                or not instruction.strip() or len(instruction.encode())>2048):
            raise ChildTerminalUnverified("invalid bounded extraction instruction")
        raw=json.dumps(request,separators=(",",":"),ensure_ascii=False).encode()
        if len(raw)>65536:raise ChildTerminalUnverified("request exceeds child input bound")
        child=await asyncio.create_subprocess_exec(
            self.python,self.worker,
            stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,env=self.env)
        try:
            stdout,stderr=await asyncio.wait_for(child.communicate(raw),timeout=self.timeout_seconds)
        except BaseException:
            if child.returncode is None:
                child.kill()
                await child.wait()
            raise
        if child.returncode!=0 or len(stdout)>131072:
            raise ChildTerminalUnverified("Graphiti child did not return proven terminal success")
        found=[s.removeprefix("ISSUE70_TERMINAL=") for s in stdout.decode(errors="replace").splitlines()
               if s.startswith("ISSUE70_TERMINAL=")]
        if len(found)!=1:
            raise ChildTerminalUnverified("missing unique child terminal record")
        try:
            outcome=json.loads(found[0])
            uid=outcome["episode_uuid"]
            stored=outcome["readback"]
            if not isinstance(uid,str) or not uid or set(stored)!={"uuid","group_id","name","content"}:
                raise ValueError("invalid child terminal")
            if (stored["uuid"]!=uid or stored["group_id"]!=request["group_id"]
                    or stored["name"]!=request["name"] or stored["content"]!=request["episode_body"]):
                raise ValueError("exact readback/source mismatch")
        except (ValueError,KeyError,TypeError) as exc:
            raise ChildTerminalUnverified("invalid child terminal identity") from exc
        self._persisted=SimpleNamespace(**stored)
        return SimpleNamespace(episode=SimpleNamespace(uuid=uid))

    async def read_episode(self, uid, group):
        # The trusted child already retrieved exact UUID/group in its own
        # graph transaction and returned only after awaiting that readback.
        if (self._persisted is None or self._persisted.uuid!=uid
            or self._persisted.group_id!=group):
            raise ChildTerminalUnverified("graph readback unavailable")
        return self._persisted


def make_process_client_factory(*,python,worker,group,timeout_seconds=600,env=None):
    def factory():
        return ProcessCoreClient(python=python,worker=worker,group=group,
                                 timeout_seconds=timeout_seconds,env=env)
    return factory

async def read_process_episode(client,uid,group):
    return await client.read_episode(uid,group)
