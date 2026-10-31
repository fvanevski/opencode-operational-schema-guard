"""Explicit, opt-in Graphiti Core runtime wiring for the existing gate.

No separate inference scheduler: the gate Worker owns EX flock + SQLite.
Graphiti Core runs only as an awaited subprocess in its configured Python
environment and only against a disposable issue70_* graph during qualification.
"""
from __future__ import annotations
import hashlib
import json
import os
import re
from pathlib import Path
import sys


class LazyCoreAdapter:
    """Expose the exact scoped client factory immediately while deferring the
    concrete core adapter (and its durable journal/ledger tables) until the
    first real submit or poll.

    A positive production setup must not create optional Graphiti tables in
    the gate database at startup; table creation follows the first durable
    work, preserving the legacy-database non-intrusion invariant.
    """

    def __init__(self, build, client_factory, *, exposes_retry, db):
        self._build = build
        self._adapter = None
        self.db = db
        self.client_factory = client_factory
        if exposes_retry:
            self.retry_pending = self._retry_pending

    def _real(self):
        if self._adapter is None:
            self._adapter = self._build()
        return self._adapter

    def _retry_pending(self, *, max_items=1):
        # The worker checks read-only retries on every idle tick. Without
        # this guard, that check alone creates Graphiti/temporal tables even
        # though no episode was ever nominated or submitted.
        if self._adapter is None:
            with self.db.connect() as conn:
                exists=conn.execute("""SELECT 1 FROM sqlite_master
                    WHERE type='table' AND name='temporal_validation_results'""").fetchone()
            if exists is None:
                return 0
        return self._real().retry_pending(max_items=max_items)

    def submit(self, candidate):
        return self._real().submit(candidate)

    def poll(self, backend_identity):
        return self._real().poll(backend_identity)


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
    # The policy helper lives in the operator-selected, reviewed Phase 3 tree.
    # Make that path importable before using it in the target preflight.
    sys.path.insert(0,str(root))
    from graphiti_process_transport import allowed_group
    production_group=not cfg.graphiti_group.startswith("issue70_")
    if not allowed_group(cfg.graphiti_group,
                         production_approved=cfg.graphiti_production_approved):
        raise RuntimeError("unapproved Graphiti target group")
    if production_group:
        if (cfg.graphiti_production_approved is not True
                or policy.get("production_activation") is not True):
            raise RuntimeError("non-disposable graph requires explicit operator production authorization")
    elif cfg.graphiti_production_approved or policy.get("production_activation") is True:
        raise RuntimeError("disposable qualification must not inherit production activation")
    exclusive="exclusive_state_transition" in policy.get("categories",[])
    if exclusive:
        validator_path=Path(cfg.graphiti_validator_path)
        if (not validator_path.is_absolute() or not validator_path.is_file()):
            raise RuntimeError("automatic exclusive-state ingestion requires exact existing validator script")
        expected=cfg.graphiti_validator_sha256
        if (not re.fullmatch(r"[0-9a-f]{64}",expected)
                or hashlib.sha256(validator_path.read_bytes()).hexdigest()!=expected):
            raise RuntimeError("temporal validator source has no matching operator-pinned SHA-256")
        phase4=root.parent/"phase4"
        if not (phase4/"temporal_ledger.py").is_file():
            raise RuntimeError("durable temporal ledger implementation unavailable")
    else:
        phase4=None
        # The currently selected nonexclusive policy must not reuse a
        # historical exclusive validator identity from a previous runtime.
        with db.connect() as conn:
            found=conn.execute("""SELECT 1 FROM sqlite_master WHERE
                type='table' AND name='temporal_validator_active'""").fetchone()
            if found:
                conn.execute("DELETE FROM temporal_validator_active WHERE singleton=1")
    # Python's import boundary is explicitly operator-specified; the gate and
    # Git/Graphiti modules must be source-pinned by the deployment manifest.
    sys.path.insert(0,str(phase2))
    if phase4 is not None:
        sys.path.insert(0,str(phase4))
    from graphiti_terminal import AwaitedCoreAdapter
    from git_source_authority import GitFactResolver
    from graphiti_process_transport import (make_process_client_factory,
                                            read_process_episode)
    from shared_work import work_key,source_key
    resolver=GitFactResolver(policy=policy,work_key_fn=work_key,source_key_fn=source_key)
    factory=make_process_client_factory(
        python=str(python),worker=str(child),group=cfg.graphiti_group,
        timeout_seconds=cfg.task_timeout_seconds,
        production_approved=production_group and cfg.graphiti_production_approved)
    run_validation=None
    if exclusive:
        from temporal_validator_transport import make_runner
        # The operator-pinned validator identity is verified EAGERLY: a
        # drifted or missing validator fails bootstrap before any durable
        # temporal state is created.
        run_validation=make_runner(
            python=str(python),
            child=str(phase4/"temporal_validator_child.py"),
            validator_path=str(validator_path),
            validator_sha256=expected)
        # Select validator authority exactly once during bootstrap.
        # The singleton is durable even on a fresh gate DB, so a newer
        # runtime revokes earlier validators BEFORE any deferred adapter
        # can initialize. Ledger constructors must never alter this choice.
        # No Graphiti ingestion/temporal-result tables are initialized here.
        from temporal_ledger import select_active_validator
        select_active_validator(db,expected)
    def build_core():
        core=AwaitedCoreAdapter(
            db,resolve=resolver,
            identity_fn=lambda c:(work_key(c),source_key(c)),
            client_factory=factory,read_episode=read_process_episode)
        if exclusive:
            from temporal_ledger import TemporalCheckingAdapter
            return TemporalCheckingAdapter(core,db,run_validation,
                                           validator_sha256=expected)
        return core
    # Table creation in the gate database follows the first durable work,
    # never a positive production startup.
    adapter=LazyCoreAdapter(build_core,factory,exposes_retry=exclusive,db=db)
    return adapter,resolver
