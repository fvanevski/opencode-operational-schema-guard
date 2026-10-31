"""Bounded sync transport to the EXISTING read-only temporal validator.

Invoked by the original gate's worker under its coordinator lease, AFTER a
durable Graphiti persistence receipt exists. Never invokes Graphiti extraction.
"""
from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path
import subprocess

class ValidatorUnavailable(RuntimeError):pass

def make_runner(*,python,child,validator_path,validator_sha256,timeout=120):
    for path in (python,child,validator_path):
        if not isinstance(path,str) or not Path(path).is_absolute() or not Path(path).is_file():
            raise ValueError("absolute existing validated executable source paths required")
    if not isinstance(validator_sha256,str) or re.fullmatch(r"[0-9a-f]{64}",validator_sha256) is None:
        raise ValueError("exact pinned validator digest required")
    if hashlib.sha256(Path(validator_path).read_bytes()).hexdigest()!=validator_sha256:
        raise ValueError("configured validator bytes differ from expected digest")
    timeout=max(1,min(300,timeout))
    def run(contract):
        if hashlib.sha256(Path(validator_path).read_bytes()).hexdigest()!=validator_sha256:
            raise ValidatorUnavailable("validator identity changed before invocation")
        raw=json.dumps(contract,sort_keys=True,separators=(",",":")).encode()
        if len(raw)>8192:raise ValidatorUnavailable("oversized contract")
        try:
            proc=subprocess.run([python,child,validator_path,validator_sha256],input=raw,
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
            if not isinstance(data,dict) or set(data)!={"exit","disposition","mode","coverage","findings","validator_sha256"}:
                raise ValueError("validator response shape")
            if data["validator_sha256"]!=validator_sha256:
                raise ValueError("validator executed identity mismatch")
            return data
        except ValueError as exc:
            raise ValidatorUnavailable("invalid validator report") from exc
    return run
