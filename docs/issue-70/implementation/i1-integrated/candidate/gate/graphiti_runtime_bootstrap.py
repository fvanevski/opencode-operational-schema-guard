"""Explicit, opt-in Graphiti Core runtime wiring for the existing gate.

No separate inference scheduler: the gate Worker owns EX flock + SQLite.
Graphiti Core runs only as an awaited subprocess in its configured Python
environment and only against a disposable issue70_* graph during qualification.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import sys


def build_runtime(cfg,db):
    if not cfg.graphiti_enabled:
        return None,None
    root=Path(cfg.graphiti_runtime_dir)
    if not root.is_absolute() or not root.is_dir() or root.name!="phase3":
        raise RuntimeError("explicit reviewed phase3 runtime directory required")
    phase2=root.parent/"phase2"
    if not (phase2/"graphiti_terminal.py").is_file():
        raise RuntimeError("matching Phase 2 completion implementation unavailable")
    policy_path=Path(cfg.graphiti_source_policy)
    python=Path(cfg.graphiti_core_python)
    child=root/"graphiti_core_worker.py"
    if (not policy_path.is_absolute() or not policy_path.is_file()
            or not python.is_absolute() or not python.is_file()
            or not child.is_file()):
        raise RuntimeError("exact Graphiti policy/interpreter/child source required")
    policy=json.loads(policy_path.read_text())
    if policy.get("enabled") is not True or policy.get("source_type")!="git-record-v1":
        raise RuntimeError("source authority requires operator opt-in")
    if policy.get("groups") != [cfg.graphiti_group]:
        raise RuntimeError("one exact authorized Graphiti group per gate runtime required")
    if not cfg.graphiti_group.startswith("issue70_"):
        raise RuntimeError("non-disposable Graphiti graph requires separate activation review")
    if "exclusive_state_transition" in policy.get("categories",[]):
        raise RuntimeError("automatic exclusive-state ingestion requires integrated validator disposition")
    # Python's import boundary is explicitly operator-specified; the gate and
    # Git/Graphiti modules must be source-pinned by the deployment manifest.
    sys.path.insert(0,str(phase2))
    sys.path.insert(0,str(root))
    from graphiti_terminal import AwaitedCoreAdapter
    from git_source_authority import GitFactResolver
    from graphiti_process_transport import (make_process_client_factory,
                                            read_process_episode)
    from shared_work import work_key,source_key
    resolver=GitFactResolver(policy=policy,work_key_fn=work_key,source_key_fn=source_key)
    factory=make_process_client_factory(
        python=str(python),worker=str(child),group=cfg.graphiti_group,
        timeout_seconds=cfg.task_timeout_seconds)
    adapter=AwaitedCoreAdapter(
        db,resolve=resolver,
        identity_fn=lambda c:(work_key(c),source_key(c)),
        client_factory=factory,read_episode=read_process_episode)
    return adapter,resolver
