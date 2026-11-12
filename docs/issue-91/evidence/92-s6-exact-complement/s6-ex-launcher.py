#!/usr/bin/env python3
"""S6 exactly-once, EX-gated, post-exit source-exact-complement qualification.

Runs ONE bounded job under the canonical EX flock, only after the interactive
harness exits, with quiet grace, scheduler-idle and production-drain
serialization:
  SOURCE-EXACT-COMPLEMENT EX-KERNEL - fresh disposable group
  graphiti-adr92-s6-exact-complement with the full 24 eligible source-cluster
  roster (original b2-sources.json identity), run ONCE with
  --finite-batch on --novelty-policy recall --source-recovery on
  --resilient-discovery on --claim-evidence on --source-exact-complement on
  --max-clusters 24 --max-candidates 72 --max-seconds 3600, chat-fast identity,
  no tuning file.

S6 EX integration: the Node driver is spawned as a DIRECT child of this Python
launcher through the Central ex_admitted_node_bridge.run_admitted_node bridge,
which (a) verifies THIS process holds the canonical flock, (b) passes the
actual locked descriptor to the child via subprocess pass_fds (no shell), and
(c) sets GHDEV_MEMORY_POST_EXIT_LEASE / GHDEV_MEMORY_POST_EXIT_LOCK_FD. The
child (finite-batch.mjs) independently re-verifies the inherited fdinfo FLOCK
(holder PID == this launcher) before any model/Graphiti activity. No model
inference or Graphiti write occurs from the interactive session.
A NEW once-only marker (.s6-ran) is used; no historical marker is re-armed.
Hermes is the supervisor and is NOT in the gate's process_names list, so it is
exempt from the harness-exit gate but still under the canonical flock,
scheduler-idle, unresolved-work and quiet-grace controls.
"""
import importlib.util
import hashlib
import json
import os
import sys
import time
from pathlib import Path

REPO = "/workspace/opencode-operational-schema-guard"
BRIDGE = REPO + "/docs/issue-78/v2-curator/ex_admitted_node_bridge.py"
BRIDGE_BLOB = "004188b1cdcd3a99956f20e581621eadc63c4663"
GATE_SOURCE = "/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py"
GATE_CONFIG = "/home/filip/.config/openviking/commit-gate.toml"
BASE = Path("/tmp/opencode/issue92-s6")
LOG = str(BASE / "s6-launcher.log")
MARKER = str(BASE / ".s6-ran")
RECEIPT = str(BASE / "s6-attempt-receipt.json")
STATE = str(BASE / "state" / "s6")
GROUP = "graphiti-adr92-s6-exact-complement"

JOBS = [
    ("source-exact-complement-proof", str(BASE / "s6-driver.mjs"), [STATE, GROUP]),
]
HARNESS_WAIT_MAX_S = 86400
GRAPHITI_ENDPOINT = "http://127.0.0.1:8766/mcp"


def log(msg):
    line = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + " " + msg
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")


def bridge_blob_ok():
    import subprocess
    blob = subprocess.run(["git", "-C", REPO, "hash-object", BRIDGE],
                          capture_output=True, text=True).stdout.strip()
    return blob, (blob == BRIDGE_BLOB)


def load_gate():
    location = Path(GATE_SOURCE).resolve(strict=True)
    sys.path.insert(0, str(location.parent))
    spec = importlib.util.spec_from_file_location("s6_gate", location)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    for name in ("Config", "Worker", "parse_vllm_metrics"):
        if not hasattr(module, name):
            raise RuntimeError("gate lacks " + name)
    return module


def observer(gate, cfg):
    o = object.__new__(gate.Worker)
    o.cfg = cfg
    return o


def harnesses_active(gate, cfg):
    return observer(gate, cfg)._active_harness_processes()


def main():
    if Path(MARKER).exists():
        log("MARKER_PRESENT: S6 campaign already ran; not re-executing (no replay)")
        print(json.dumps({"status": "already_ran", "marker": MARKER}))
        return 0
    bridge_blob, bridge_ok = bridge_blob_ok()
    if not bridge_ok:
        raise RuntimeError("S6_BRIDGE_BLOB_MISMATCH: %s != %s" % (bridge_blob, BRIDGE_BLOB))
    # Import the Central EX bridge from the verified repo path.
    spec = importlib.util.spec_from_file_location("s6_ex_bridge", BRIDGE)
    bridge = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bridge)
    run_admitted_node = bridge.run_admitted_node

    gate = load_gate()
    cfg = gate.Config.load(GATE_CONFIG)
    if not cfg.lock_file or not cfg.metrics_url or not cfg.process_names:
        raise RuntimeError("gate admission configuration incomplete")

    log("WAIT_FOR_HARNESS_EXIT: polling active harness processes")
    waited = 0
    while True:
        if not harnesses_active(gate, cfg):
            log("HARNESS_EXITED: no interactive harness process")
            break
        if waited >= HARNESS_WAIT_MAX_S:
            raise RuntimeError("harness still active after bounded wait")
        time.sleep(5)
        waited += 5

    import fcntl
    from types import SimpleNamespace
    import sqlite3

    def ro_conn():
        src = Path(cfg.database).resolve(strict=True)
        c = sqlite3.connect(src.as_uri() + "?mode=ro", uri=True, timeout=5)
        c.execute("PRAGMA query_only=ON")
        return c

    def canonical_unresolved():
        obs = object.__new__(gate.Worker)
        obs.cfg = cfg
        obs.db = SimpleNamespace(connect=lambda: ro_conn())
        try:
            return bool(obs._unresolved_graphiti_from_existing_db())
        except Exception:
            raise RuntimeError("canonical Graphiti state unverifiable")

    def observation():
        import urllib.request
        if harnesses_active(gate, cfg):
            raise RuntimeError("interactive harness re-appeared: cannot drain")
        if canonical_unresolved():
            raise RuntimeError("canonical Graphiti work unresolved: cannot drain")
        errors = []
        for url in (cfg.metrics_url, *cfg.metrics_fallback_urls):
            try:
                with urllib.request.urlopen(url, timeout=5) as r:
                    if r.status != 200:
                        raise RuntimeError("scheduler HTTP " + str(r.status))
                    payload = r.read().decode("utf-8", "replace")
                running, waiting = gate.parse_vllm_metrics(
                    payload, cfg.metrics_running, cfg.metrics_waiting)
            except Exception as exc:
                errors.append(str(exc))
                continue
            if running != 0 or waiting != 0:
                raise RuntimeError("scheduler busy (running/waiting nonzero)")
            return
        raise RuntimeError("scheduler idle not verified: " + "; ".join(errors))

    lock = Path(cfg.lock_file)
    lock.parent.mkdir(parents=True, exist_ok=True)
    with lock.open("a+") as handle:
        deadline = time.monotonic() + 1800
        while True:
            try:
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                log("EX_FLOCK_ACQUIRED: " + str(lock) + " fd=" + str(handle.fileno()))
                break
            except BlockingIOError:
                if time.monotonic() > deadline:
                    raise RuntimeError("EX lock held (production drain); bounded wait exhausted")
                time.sleep(1)
        admiss_deadline = time.monotonic() + 180
        while True:
            try:
                observation()
                break
            except RuntimeError as obs:
                if time.monotonic() > admiss_deadline:
                    raise
                log("ADMISSION_WAIT: " + str(obs) + "; bounded retry in 5s")
                time.sleep(5)
        grace = max(0.0, cfg.quiet_grace_seconds)
        log("QUIET_GRACE: %.0fs" % grace)
        time.sleep(grace)
        observation()
        log("EX_ADMISSION_PROVEN: harness-exit + quiet-grace + scheduler-idle + no-unresolved")

        env = os.environ.copy()
        results = {}
        reconcile_cmd = ["node",
         REPO + "/docs/issue-78/v2-curator/curator-cli.mjs",
         "reconcile-only", "--group", GROUP, "--state-dir", STATE,
         "--endpoint", GRAPHITI_ENDPOINT]
        for label, driver, args in JOBS:
            log("JOB_START: " + label)
            attempt = 1
            while True:
                proc = run_admitted_node(
                    ["node", driver] + args,
                    lock_fd=handle.fileno(),
                    env=env,
                    cwd=REPO,
                    timeout=3900)
                tail = (proc.stdout or "").strip().splitlines()[-1][:400] if proc.stdout else "(inherited-stdout; see s6-exact-complement-result.json)"
                log("JOB_%s attempt=%d rc=%d tail=%s" % (label.upper(), attempt, proc.returncode, tail))
                if proc.returncode == 0:
                    results[label] = {"rc": 0, "attempts": attempt}
                    break
                if proc.returncode == 3:
                    if attempt >= 6:
                        raise RuntimeError("job %s unresolved after bounded reconcile; "
                                           "run s6-reconcile-once.py for terminal settlement" % label)
                    rec = run_admitted_node(
                        reconcile_cmd,
                        lock_fd=handle.fileno(),
                        env=env,
                        cwd=REPO,
                        timeout=1800)
                    rectail = (rec.stdout or "").strip().splitlines()[-1][:400] if rec.stdout else "(inherited-stdout)"
                    log("RECONCILE_ONLY attempt=%d rc=%d tail=%s" % (attempt, rec.returncode, rectail))
                    if rec.returncode == 3:
                        log("RECONCILE_RC3_UNRESOLVED: remote visibility pending; bounded retry")
                        time.sleep(20)
                        attempt += 1
                        continue
                    if rec.returncode != 0:
                        raise RuntimeError("reconcile-only rc=%d (terminal); stderr=%s"
                                           % (rec.returncode, rec.stderr[-800:]))
                    time.sleep(20)
                    attempt += 1
                    continue
                raise RuntimeError("job %s rc=%d (terminal); stderr=%s"
                                   % (label, proc.returncode, proc.stderr[-800:]))
        summary = {"jobs": results, "completed_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                   "bridge_blob": bridge_blob, "group": GROUP, "state": STATE,
                   "graphiti_endpoint": GRAPHITI_ENDPOINT}
        if all(j["rc"] == 0 for j in results.values()):
            Path(MARKER).write_text(json.dumps(summary, indent=1) + "\n")
            os.chmod(MARKER, 0o600)
            Path(RECEIPT).write_text(json.dumps(summary, indent=1) + "\n")
            os.chmod(RECEIPT, 0o600)
            log("S6_SETTLED: job complete; marker + attempt receipt written")
        else:
            log("S6_INCOMPLETE: " + json.dumps(results))
        print(json.dumps(summary, indent=1))
        return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        log("FAIL_CLOSED: " + str(exc))
        print("FAIL_CLOSED: " + str(exc), file=sys.stderr)
        sys.exit(2)
