#!/usr/bin/env python3
"""Host-local A3 EX-gated prospective launcher (PREPARED - NOT RUN).

Runs the A3 prospective treatment on the fresh group graphiti-adr92-a3-prospective-v2
under the canonical EX flock (harness-exit + quiet-grace + scheduler-idle +
no-unresolved), once-only, no replay. GATED: A3_HOST_APPROVED=1 required after
Central approves the S6 exposed result + the ratified A3 v2 freeze. Uses the
0a009e8-bound host driver. Writes a3-host-attempt-receipt.json + a once-only marker.
"""
import importlib.util, json, os, sys, time, subprocess
from pathlib import Path

REPO = "/workspace/opencode-operational-schema-guard"
BRIDGE = REPO + "/docs/issue-78/v2-curator/ex_admitted_node_bridge.py"
BRIDGE_BLOB = "004188b1cdcd3a99956f20e581621eadc63c4663"
GATE_SOURCE = "/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py"
GATE_CONFIG = "/home/filip/.config/openviking/commit-gate.toml"
BASE = Path("/tmp/opencode/issue92-a3")
LOG = str(BASE / "a3-host-launcher.log")
MARKER = str(BASE / ".a3-host-ran")
RECEIPT = str(BASE / "a3-host-attempt-receipt.json")
STATE = str(BASE / "state-v3")
GROUP = "graphiti-adr92-a3-prospective-v2"
GRAPHITI_ENDPOINT = "http://127.0.0.1:8766/mcp"
GATE_APPROVAL = os.environ.get("A3_HOST_APPROVED", "0") == "1"


def log(msg):
    line = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + " " + msg
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")


def main():
    if not GATE_APPROVAL:
        log("A3_HOST_GATED: A3_HOST_APPROVED not set; launcher preflight only, no inference")
        print(json.dumps({"status": "gated", "note": "set A3_HOST_APPROVED=1 after Central approves S6 exposed result + ratified A3 v2 freeze"}))
        return 0
    if Path(MARKER).exists():
        log("MARKER_PRESENT: A3 host already ran; not re-executing (no replay)")
        return 0
    import fcntl, urllib.request
    spec = importlib.util.spec_from_file_location("a3_bridge", BRIDGE)
    bridge = importlib.util.module_from_spec(spec); spec.loader.exec_module(bridge)
    run_admitted_node = bridge.run_admitted_node
    blob = subprocess.run(["git", "-C", REPO, "hash-object", BRIDGE], capture_output=True, text=True).stdout.strip()
    if blob != BRIDGE_BLOB:
        raise RuntimeError("A3_HOST_BRIDGE_BLOB_MISMATCH: %s" % blob)
    sys.path.insert(0, str(Path(GATE_SOURCE).parent))
    gspec = importlib.util.spec_from_file_location("a3_gate", Path(GATE_SOURCE).resolve())
    gate = importlib.util.module_from_spec(gspec); sys.modules[gspec.name] = gate; gspec.loader.exec_module(gate)
    cfg = gate.Config.load(GATE_CONFIG)
    def harnesses_active():
        o = object.__new__(gate.Worker); o.cfg = cfg; return o._active_harness_processes()
    def observation():
        if harnesses_active():
            raise RuntimeError("interactive harness re-appeared")
        for url in (cfg.metrics_url, *cfg.metrics_fallback_urls):
            try:
                with urllib.request.urlopen(url, timeout=5) as r:
                    payload = r.read().decode("utf-8", "replace")
                running, waiting = gate.parse_vllm_metrics(payload, cfg.metrics_running, cfg.metrics_waiting)
            except Exception:
                continue
            if running != 0 or waiting != 0:
                raise RuntimeError("scheduler busy (running/waiting nonzero)")
            return
        raise RuntimeError("scheduler idle not verified")
    lock = Path(cfg.lock_file)
    with lock.open("a+") as handle:
        deadline = time.monotonic() + 1800
        while True:
            try:
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                log("EX_FLOCK_ACQUIRED fd=" + str(handle.fileno())); break
            except BlockingIOError:
                if time.monotonic() > deadline:
                    raise RuntimeError("EX lock held; bounded wait exhausted")
                time.sleep(1)
        ad = time.monotonic() + 180
        while True:
            try:
                observation(); break
            except RuntimeError as e:
                if time.monotonic() > ad:
                    raise
                log("ADMISSION_WAIT: %s; retry 5s" % e); time.sleep(5)
        grace = max(0.0, cfg.quiet_grace_seconds)
        log("QUIET_GRACE %.0fs" % grace); time.sleep(grace)
        observation(); log("EX_ADMISSION_PROVEN")
        env = os.environ.copy()
        driver = ["node", str(BASE / "a3-host-driver.mjs"), STATE, GROUP]
        proc = run_admitted_node(driver, lock_fd=handle.fileno(), env=env, cwd=REPO, timeout=3900)
        log("A3_HOST_DRIVER rc=%d" % proc.returncode)
        reconcile_cmd = ["node", REPO + "/docs/issue-78/v2-curator/curator-cli.mjs",
                         "reconcile-only", "--group", GROUP, "--state-dir", STATE, "--endpoint", GRAPHITI_ENDPOINT]
        attempt = 1
        while True:
            if proc.returncode == 0:
                break
            if proc.returncode == 3 and attempt < 6:
                rec = run_admitted_node(reconcile_cmd, lock_fd=handle.fileno(), env=env, cwd=REPO, timeout=1800)
                log("A3_HOST_RECONCILE_ONLY rc=%d" % rec.returncode)
                if rec.returncode == 3:
                    time.sleep(20); attempt += 1; continue
                if rec.returncode == 0:
                    proc = run_admitted_node(driver, lock_fd=handle.fileno(), env=env, cwd=REPO, timeout=3900)
                    attempt += 1; continue
                raise RuntimeError("A3_HOST reconcile rc=%d" % rec.returncode)
            raise RuntimeError("A3_HOST driver rc=%d (terminal)" % proc.returncode)
        summary = {"jobs": {"a3-host-prospective": {"rc": proc.returncode, "attempts": attempt}},
                   "completed_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                   "bridge_blob": blob, "group": GROUP, "state": STATE,
                   "graphiti_endpoint": GRAPHITI_ENDPOINT,
                   "source_head": "40412563f1e3f914ad4a77fc113b64036be3ae77"}
        Path(MARKER).write_text(json.dumps(summary, indent=1) + "\n"); os.chmod(MARKER, 0o600)
        Path(RECEIPT).write_text(json.dumps(summary, indent=1) + "\n"); os.chmod(RECEIPT, 0o600)
        log("A3_HOST_SETTLED")
        print(json.dumps(summary, indent=1))
        return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        log("FAIL_CLOSED: " + str(exc)); print("FAIL_CLOSED: " + str(exc), file=sys.stderr); sys.exit(2)
