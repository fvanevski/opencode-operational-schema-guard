"""Fail-closed disposable gate-path preflight for issue #70 host qualification.

Prevents Config.load's intentional production default paths from silently
being selected by a malformed disposable test TOML. No service is started.
"""
from __future__ import annotations
from pathlib import Path
import sys
import tomllib

def validate_disposable_config(config_path, root):
    root=Path(root).resolve(strict=True)
    source=Path(config_path).resolve(strict=True)
    if not root.is_dir() or not source.is_file() or not source.is_relative_to(root):
        raise ValueError("disposable config file must be within existing test root")
    conf=tomllib.loads(source.read_text())
    gate=conf.get("gate")
    if not isinstance(gate,dict):
        raise ValueError("disposable config must declare [gate] explicitly")
    for key in ("database","lock_file"):
        value=gate.get(key)
        if not isinstance(value,str) or not value.startswith("/"):
            raise ValueError("disposable [gate] "+key+" must be absolute and explicit")
        dest=Path(value).resolve(strict=False)
        if not dest.is_relative_to(root) or dest==root:
            raise ValueError("disposable [gate] "+key+" escapes test root")
        if dest.is_symlink():
            raise ValueError("disposable path is a symlink")
    worker=conf.get("worker")
    if isinstance(worker,dict) and worker.get("graphiti_enabled") is True:
        group=worker.get("graphiti_group","")
        if not isinstance(group,str) or not group.startswith("issue70_"):
            raise ValueError("disposable graph group required")
    return {"root":str(root),"database":str(Path(gate["database"]).resolve()),
            "lock_file":str(Path(gate["lock_file"]).resolve())}

if __name__=="__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: safe_test_paths.py CONFIG_TOML DISPOSABLE_ROOT")
    try:
        validate_disposable_config(sys.argv[1],sys.argv[2])
    except (OSError,ValueError,tomllib.TOMLDecodeError) as exc:
        raise SystemExit("BLOCKED: disposable gate path preflight failed") from exc
    print("DISPOSABLE_CONFIG=PASS")
