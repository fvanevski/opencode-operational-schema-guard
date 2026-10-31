"""Bounded sync transport to the EXISTING read-only temporal validator.

Invoked by the original gate's worker under its coordinator lease, AFTER a
durable Graphiti persistence receipt exists. Never invokes Graphiti extraction.
"""
from __future__ import annotations
import json
from pathlib import Path
import subprocess

class ValidatorUnavailable(RuntimeError):pass

def make_runner(*,python,child,validator_path,timeout=120):
    for path in (python,child,validator_path):
        if not isinstance(path,str) or not Path(path).is_absolute() or not Path(path).is_file():
            raise ValueError("absolute existing validated executable source paths required")
    timeout=max(1,min(300,timeout))
    def run(contract):
        raw=json.dumps(contract,sort_keys=True,separators=(",",":")).encode()
        if len(raw)>8192:raise ValidatorUnavailable("oversized contract")
        try:
            proc=subprocess.run([python,child,validator_path],input=raw,
                capture_output=True,timeout=timeout,check=False)
        except (OSError,subprocess.TimeoutExpired) as exc:
            raise ValidatorUnavailable("validator process not confirmed") from exc
        if proc.returncode!=0 or len(proc.stdout)>16384:
            raise ValidatorUnavailable("validator did not return bounded result")
        lines=[line.removeprefix("ISSUE70_VALIDATION=")
            for line in proc.stdout.decode(errors="replace").splitlines()
            if line.startswith("ISSUE70_VALIDATION=")]
        if len(lines)!=1:raise ValidatorUnavailable("missing unique validator report")
        try:
            data=json.loads(lines[0])
            if not isinstance(data,dict) or set(data)!={"exit","disposition","mode","coverage","findings"}:
                raise ValueError("validator response shape")
            return data
        except ValueError as exc:
            raise ValidatorUnavailable("invalid validator report") from exc
    return run
