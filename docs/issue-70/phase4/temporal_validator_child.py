"""Use the existing qualified graphiti_temporal_validator.run_transition API.

Child is run in the authenticated Graphiti Python environment. This module
does not reimplement temporal reconciliation, inspect history heuristically,
repair graph edges, or run Graphiti extraction.
"""
from __future__ import annotations
import asyncio
import importlib.util
import hashlib
import json
from pathlib import Path
import sys

def main():
    try:
        if len(sys.argv)!=3 or not Path(sys.argv[1]).is_file():
            raise ValueError("exact existing temporal validator path required")
        expected=sys.argv[2]
        path=Path(sys.argv[1])
        actual=hashlib.sha256(path.read_bytes()).hexdigest()
        if len(expected)!=64 or expected!=actual:
            raise ValueError("validator script content does not match active pin")
        raw=sys.stdin.buffer.read(8193)
        if not raw or len(raw)>8192:raise ValueError("bounded contract required")
        contract=json.loads(raw)
        spec=importlib.util.spec_from_file_location("graphiti_temporal_validator",sys.argv[1])
        if not spec or not spec.loader:raise ValueError("validator import unavailable")
        validator=importlib.util.module_from_spec(spec)
        sys.modules["graphiti_temporal_validator"]=validator
        spec.loader.exec_module(validator)
        result,exit_code=asyncio.run(validator.run_transition(contract))
        if type(exit_code) is not int or exit_code not in (0,1,2,3):
            raise ValueError("unsupported validator result")
        # Keep the subprocess response bounded and source/edge-ID focused.
        output={"validator_sha256":actual,
                "exit":exit_code,"disposition":result.get("disposition"),
                "mode":result.get("mode"),"coverage":result.get("coverage"),
                "findings":result.get("findings",[])[:16]}
        payload=json.dumps(output,ensure_ascii=False,separators=(",",":"))
        if len(payload.encode())>16384:raise ValueError("oversized validator report")
        print("ISSUE70_VALIDATION="+payload)
        return 0
    except BaseException:
        # No raw payload, tracebacks, graph facts or credentials to stderr.
        sys.stderr.write("Temporal validation unavailable; result unverified\n")
        return 1

if __name__=="__main__":raise SystemExit(main())
