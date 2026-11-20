#!/usr/bin/env python3
"""Bounded OpenCode/curator maintenance window for GHDEV #108.

The persistent service's own SH flock remains UNCHANGED. A separate loopback
ingress fence switches to fail-closed before native/scheduler quiescence checks,
then we stop the backend before the curator obtains canonical EX. The fence
remains closed through curation and backend restart.

A durable restart fence prevents service startup after interrupted/uncertain
maintenance. This is a reversible availability trade-off, not request-level
admission and not an excuse to cancel a busy native session.
"""
from __future__ import annotations

import argparse
import base64
from contextlib import contextmanager
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.request
import uuid

SCHEMA = "ghdev-idle-window-v1"
ALLOWED_STATES = {"idle", "preparing", "stopping", "stopped", "draining", "unsafe", "starting"}

class Blocked(RuntimeError):
    pass


def _read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _read_config(path: Path):
    st=path.lstat()
    if not path.is_file() or path.is_symlink() or st.st_uid!=os.getuid() or st.st_mode & 0o077:
        raise Blocked("unsafe owner-only window configuration")
    return _read_json(path)


def _safe_journal(path: Path):
    try:
        s = path.lstat()
    except FileNotFoundError:
        return None
    if not path.is_file() or path.is_symlink() or s.st_uid != os.getuid() or s.st_mode & 0o077:
        raise Blocked("unsafe maintenance journal identity/permissions")
    obj = _read_json(path)
    if not isinstance(obj, dict) or obj.get("schema") != SCHEMA or obj.get("state") not in ALLOWED_STATES:
        raise Blocked("invalid maintenance journal: fail closed")
    return obj


def check_start(path: Path):
    journal = _safe_journal(path)
    if journal is not None and journal["state"] not in ("idle", "starting"):
        raise Blocked("maintenance fence active: service start denied")
    return True


def _write_journal(path: Path, state: str, attempt: str, reason: str):
    if state not in ALLOWED_STATES:
        raise ValueError("unknown journal state")
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    current = _safe_journal(path)
    if current is not None and current["state"] not in ALLOWED_STATES:
        raise Blocked("journal cannot be updated")
    content = json.dumps({"schema":SCHEMA, "state":state, "attempt":attempt,
                          "reason":reason, "time":time.time()}, sort_keys=True) + "\n"
    tmp = path.with_name(path.name + "." + attempt + ".new")
    fd = os.open(tmp, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content); f.flush(); os.fsync(f.fileno())
        os.replace(tmp, path)
        parent_fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try: os.fsync(parent_fd)
        finally: os.close(parent_fd)
    finally:
        if tmp.exists(): tmp.unlink()


@contextmanager
def _owner_lock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(path, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        st = os.fstat(fd)
        if st.st_uid != os.getuid() or st.st_mode & 0o077:
            raise Blocked("unsafe coordinator lock")
        try: fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as e: raise Blocked("another maintenance coordinator active") from e
        yield
    finally:
        os.close(fd)


def _sha256(path: str):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _assert_identities(cfg):
    for path, expected in cfg["pinned_files"].items():
        if not Path(path).is_file() or _sha256(path) != expected:
            raise Blocked("source/config identity mismatch: " + path)


def _assert_config(cfg):
    required = ("journal", "coordinator_lock", "service_unit", "service_port", "service_url", "ingress_status_url",
                "status_argv", "drain_argv", "gate_source", "gate_config", "pinned_files")
    if any(k not in cfg for k in required): raise Blocked("missing coordinator configuration")
    if (cfg["service_unit"] != "opencode-serve.service" or
        cfg["service_url"] != "http://127.0.0.1:49375" or
        cfg["service_port"] != 49375 or
        cfg["ingress_status_url"] != "http://127.0.0.1:49374/__ghdev_ingress/status") :
        raise Blocked("unexpected shared-service identity")
    if not isinstance(cfg["pinned_files"],dict) or not cfg["pinned_files"]:
        raise Blocked("source pins required")
    for key in ("status_argv", "drain_argv"):
        if not isinstance(cfg[key],list) or not cfg[key] or any(not isinstance(x,str) for x in cfg[key]):
            raise Blocked("invalid argv list")
    if (not Path(cfg["status_argv"][0]).is_absolute() or
        Path(cfg["status_argv"][0]).name not in ("node", "nodejs") or
        cfg["drain_argv"][0] != "/usr/bin/python3"):
        raise Blocked("unexpected tool argv")


def _run(argv, *, timeout=None):
    return subprocess.run(argv, check=False, capture_output=True, text=True, timeout=timeout)


class Host:
    def __init__(self, cfg): self.cfg = cfg
    def active(self):
        p = _run(["/usr/bin/systemctl", "--user", "show", self.cfg["service_unit"],
                  "--property=ActiveState", "--property=MainPID"], timeout=15)
        if p.returncode: raise Blocked("service state read unavailable")
        d = dict(x.strip().split("=",1) for x in p.stdout.splitlines() if "=" in x)
        return d.get("ActiveState"), d.get("MainPID")
    def status(self):
        p = _run(self.cfg["status_argv"], timeout=25)
        if p.returncode: raise Blocked("curator read-only status unavailable")
        try: data = json.loads(p.stdout)
        except (ValueError, TypeError) as e: raise Blocked("invalid curator status") from e
        if not isinstance(data,dict) or data.get("group")!="development-knowledge":
            raise Blocked("curator group mismatch")
        queue = data.get("queue",{}).get("counts",{})
        reviews = data.get("counts",{})
        if not isinstance(queue,dict) or not isinstance(reviews,dict): raise Blocked("invalid curation counts")
        for name,count in {**queue, **reviews}.items():
            if not isinstance(count,int) or count<0: raise Blocked("invalid curation count")
        # Only actionable known-local work starts a maintenance window. A
        # deferred/duplicate record is not permission to replay or retry it.
        return any(queue.get(k,0)>0 for k in ("new", "reserved")) or any(
            reviews.get(k,0)>0 for k in ("approved", "retry_authorized", "queued", "submission_unknown"))
    def ingress(self, *, expect_fenced):
        try:
            with urllib.request.urlopen(self.cfg["ingress_status_url"],timeout=5) as r:
                if r.status!=200: raise Blocked("ingress fence status HTTP non-200")
                body=json.loads(r.read(4096))
        except (OSError,ValueError,TimeoutError) as e:
            raise Blocked("ingress fence unavailable") from e
        if (not isinstance(body,dict) or body.get("schema")!="ghdev-ingress-fence-v1" or
            not isinstance(body.get("pid"),int) or body["pid"]<=0 or
            type(body.get("active")) is not int or body["active"]<0 or
            type(body.get("blocked")) is not bool):
            raise Blocked("ingress fence response invalid")
        if body["blocked"] != expect_fenced or body["active"]!=0:
            raise Blocked("inference ingress not quiescent/fenced")
    def sessions_idle(self):
        password = os.environ.get("OPENCODE_PASSWORD", "")
        if not password: raise Blocked("service auth absent; session state unverifiable")
        token = base64.b64encode(("opencode:"+password).encode()).decode()
        req = urllib.request.Request(self.cfg["service_url"]+"/session/status",
                                     headers={"Authorization":"Basic "+token})
        try:
            with urllib.request.urlopen(req, timeout=8) as r:
                if r.status != 200: raise Blocked("native status HTTP non-200")
                body = json.loads(r.read(1024*1024))
        except (OSError, ValueError, TimeoutError) as e:
            raise Blocked("native status unavailable") from e
        if not isinstance(body,dict): raise Blocked("native status shape invalid")
        for state in body.values():
            if not isinstance(state,dict) or state.get("type") not in ("idle",):
                raise Blocked("native session not proven idle")
    def gate_idle(self):
        # Same class, state rules and metrics parser as the authenticated
        # existing EX gate/curator. This does NOT acquire/release EX.
        source = self.cfg["gate_source"]
        spec = importlib.util.spec_from_file_location("gh108_gate_reader", source)
        if spec is None or spec.loader is None: raise Blocked("gate source unavailable")
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name]=module
        spec.loader.exec_module(module)
        from types import SimpleNamespace
        import sqlite3
        gate_cfg=module.Config.load(self.cfg["gate_config"])
        checker=object.__new__(module.Worker)
        checker.cfg=gate_cfg
        def ro_connection():
            from contextlib import contextmanager
            @contextmanager
            def opened():
                uri=Path(gate_cfg.database).resolve(strict=True).as_uri()+"?mode=ro"
                with sqlite3.connect(uri,uri=True,timeout=5) as conn:
                    conn.execute("PRAGMA query_only=ON")
                    yield conn
            return opened()
        checker.db=SimpleNamespace(connect=ro_connection)
        if checker._active_harness_processes(): raise Blocked("interactive harness present")
        if checker._unresolved_graphiti_from_existing_db(): raise Blocked("unresolved Graphiti gate state")
        running, waiting = checker._metrics()
        if running != 0 or waiting != 0: raise Blocked("inference scheduler busy")
    def stop(self):
        p=_run(["/usr/bin/systemctl","--user","stop",self.cfg["service_unit"]],timeout=45)
        if p.returncode: raise Blocked("service stop failed: " + str(p.returncode))
    def start(self):
        p=_run(["/usr/bin/systemctl","--user","start",self.cfg["service_unit"]],timeout=50)
        if p.returncode: raise Blocked("service restart failed: " + str(p.returncode))
    def listener_down(self):
        with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            return sock.connect_ex(("127.0.0.1",int(self.cfg["service_port"]))) != 0
    def drain(self):
        # Canonical existing post-exit wrapper obtains/holds EX and decides
        # whether a remote result is terminal. Never reimplement its semantics.
        return subprocess.run(self.cfg["drain_argv"], check=False).returncode
    def listener_up(self):
        with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            return sock.connect_ex(("127.0.0.1",int(self.cfg["service_port"]))) == 0


def run_cycle(cfg, host: Host, *, sleep=time.sleep):
    journal=Path(cfg["journal"])
    coordinator=Path(cfg["coordinator_lock"])
    with _owner_lock(coordinator):
        check_start(journal)
        _assert_identities(cfg)
        if not host.status(): return "no_work"
        active,pid=host.active()
        if active!="active" or not pid or pid=="0": raise Blocked("shared service not active")
        # No inference ingress may be accepted AFTER this atomic write.
        # The proxy admits/records any concurrent earlier request in its
        # active count, which we wait to drain before service stop.
        host.ingress(expect_fenced=False)
        attempt=uuid.uuid4().hex
        _write_journal(journal,"preparing",attempt,"ingress fenced before quiescence")
        try:
            host.ingress(expect_fenced=True)
            host.sessions_idle(); host.gate_idle()
            sleep(float(cfg.get("quiet_seconds",30)))
            host.ingress(expect_fenced=True)
            host.sessions_idle(); host.gate_idle()
            if not host.status():
                _write_journal(journal,"idle",attempt,"work settled before stop")
                return "work_settled"
            _write_journal(journal,"stopping",attempt,"service stop requested")
            host.stop()
            state, stopped_pid=host.active()
            if state!="inactive" or stopped_pid not in ("0","") or not host.listener_down():
                raise Blocked("service stop not proven; EX forbidden")
            _write_journal(journal,"stopped",attempt,"listener and process down")
            # Confirm all inference-capable external workers settled before
            # releasing the original service SH and entering canonical EX.
            host.gate_idle()
            _write_journal(journal,"draining",attempt,"canonical EX worker in progress")
            result=host.drain()
            if result not in (0,4):
                raise Blocked("curator not terminal-safe; do not restart server")
            host.gate_idle()  # canonical remote uncertainty check must be clear
            # EX child returned and released its lock. Keep ingress fenced
            # while the backend restarts, then reopen only after its health.
            _write_journal(journal,"starting",attempt,"EX terminal; backend restart")
            host.start()
            state,pid=host.active()
            if state!="active" or pid in ("0","") or not host.listener_up():
                raise Blocked("server did not return after terminal EX")
            host.ingress(expect_fenced=True)
            _write_journal(journal,"idle",attempt,"canonical EX and backend healthy")
            return "completed" if result==0 else "safe_local_retry"
        except BaseException as exc:
            # Before stop is requested, source and native work are unchanged;
            # it is safe to reopen ingress after a failed preflight. Once we
            # request stop, failure/crash must retain the durable fence.
            state=_safe_journal(journal)["state"]
            if state=="preparing":
                _write_journal(journal,"idle",attempt,"preflight deferred; EX not attempted")
            elif state!="idle":
                _write_journal(journal,"unsafe",attempt,str(exc)[:200])
            raise


def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("mode",choices=("run","check-start"))
    p.add_argument("--config",required=True)
    args=p.parse_args(argv)
    try:
        cfg=_read_config(Path(args.config)); _assert_config(cfg)
        if args.mode=="check-start":
            check_start(Path(cfg["journal"])); return 0
        result=run_cycle(cfg,Host(cfg))
        print("GH108_IDLE_WINDOW="+result,flush=True)
        return 0
    except Blocked as e:
        print("GH108_IDLE_WINDOW_BLOCKED: "+str(e),file=sys.stderr,flush=True)
        return 75
    except Exception as e:
        print("GH108_IDLE_WINDOW_FAILED: "+type(e).__name__+": "+str(e)[:160],file=sys.stderr,flush=True)
        return 75

if __name__=="__main__": sys.exit(main())
