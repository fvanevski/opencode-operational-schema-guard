#!/usr/bin/env python3
"""S6 terminal corrective reconciliation (read-only, no model replay, no new
Graphiti add_memory).

The S6 driver settled with approved facts submitted to Graphiti in `queued`
state (delayed remote visibility). This helper, under a fresh canonical EX
flock, runs the admitted `reconcile-only` path (positive get_episodes readback
of the S6 group) until all records are positively `persisted` with distinct
valid UUIDs, bounded-retrying on rc=3 (remote visibility pending). It then
does an explicit read-only Graphiti get_episodes readback and cross-checks the
ReviewStore persisted UUID set against the remote episode UUID set
(positive per-fact UUID continuity). It never replays model calls and never
issues a new write. Writes s6-reconcile-receipt.json.
"""
import importlib.util
import json
import os
import sys
import time
from pathlib import Path

REPO = "/workspace/opencode-operational-schema-guard"
BRIDGE = REPO + "/docs/issue-78/v2-curator/ex_admitted_node_bridge.py"
GATE_SOURCE = "/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py"
GATE_CONFIG = "/home/filip/.config/openviking/commit-gate.toml"
BASE = Path("/tmp/opencode/issue92-s6")
LOG = str(BASE / "s6-reconcile.log")
STATE = str(BASE / "state" / "s6")
GROUP = "graphiti-adr92-s6-exact-complement"
GRAPHITI_ENDPOINT = "http://127.0.0.1:8766/mcp"
RECEIPT = str(BASE / "s6-reconcile-receipt.json")


def log(msg):
    line = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + " " + msg
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")


def load_gate():
    location = Path(GATE_SOURCE).resolve(strict=True)
    sys.path.insert(0, str(location.parent))
    spec = importlib.util.spec_from_file_location("s6r_gate", location)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def read_store_persisted_uuids():
    import glob
    files = glob.glob(STATE + "/curation-v1/" + GROUP + "/*.json")
    uuids = []
    for f in files:
        b = os.path.basename(f)[:-5]
        if b.startswith("_"):
            continue
        r = json.load(open(f))
        if r.get("state") == "persisted" and r.get("remote_episode_uuid"):
            uuids.append(r["remote_episode_uuid"])
    return sorted(set(uuids))


def main():
    spec = importlib.util.spec_from_file_location("s6r_bridge", BRIDGE)
    bridge = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bridge)
    run_admitted_node = bridge.run_admitted_node

    gate = load_gate()
    cfg = gate.Config.load(GATE_CONFIG)
    import fcntl
    env = os.environ.copy()
    reconcile_cmd = ["node", REPO + "/docs/issue-78/v2-curator/curator-cli.mjs",
                     "reconcile-only", "--group", GROUP, "--state-dir", STATE,
                     "--endpoint", GRAPHITI_ENDPOINT]
    # Read-only Graphiti get_episodes readback of the S6 group (admitted EX).
    probe_out = str(BASE / "s6-graphiti-readback.json")
    graphiti_probe = (
        "import{writeFile}from'node:fs/promises';"
        "const {GraphitiMcp}=await import('%s');"
        "const g=new GraphitiMcp('%s',{timeoutMs:15000});"
        "const r=await g.call('get_episodes',{group_ids:[%s],max_episodes:1000});"
        "const eps=(r.episodes||[]).map(e=>e.uuid||e.id);"
        "await writeFile(%s,JSON.stringify({group:%s,remote_episode_count:eps.length,"
        "remote_episode_uuids:eps}));process.exit(0);"
    ) % (REPO + "/docs/issue-75/v2-candidate/memory-core.mjs",
         GRAPHITI_ENDPOINT, json.dumps(GROUP), json.dumps(probe_out), json.dumps(GROUP))
    probe_cmd = ["node", "--input-type=module", "-e", graphiti_probe]

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
                    raise RuntimeError("EX lock held; bounded wait exhausted")
                time.sleep(1)
        admiss_deadline = time.monotonic() + 180
        while True:
            try:
                import urllib.request
                for url in (cfg.metrics_url, *cfg.metrics_fallback_urls):
                    with urllib.request.urlopen(url, timeout=5) as r:
                        payload = r.read().decode("utf-8", "replace")
                    running, waiting = gate.parse_vllm_metrics(
                        payload, cfg.metrics_running, cfg.metrics_waiting)
                    if running == 0 and waiting == 0:
                        break
                    raise RuntimeError("scheduler busy (running/waiting nonzero)")
                break
            except RuntimeError as e:
                if time.monotonic() > admiss_deadline:
                    raise
                log("ADMISSION_WAIT: " + str(e) + "; retry in 5s")
                time.sleep(5)
        grace = max(0.0, cfg.quiet_grace_seconds)
        log("QUIET_GRACE: %.0fs" % grace)
        time.sleep(grace)
        log("RECONCILE_ADMISSION_PROVEN")

        attempt = 1
        while True:
            rec = run_admitted_node(reconcile_cmd, lock_fd=handle.fileno(),
                                    env=env, cwd=REPO, timeout=1800)
            tail = (rec.stdout or "").strip().splitlines()[-1][:400] if rec.stdout else "(inherited-stdout)"
            log("RECONCILE_ONLY attempt=%d rc=%d tail=%s" % (attempt, rec.returncode, tail))
            if rec.returncode == 0:
                log("RECONCILE_SETTLED rc=0")
                break
            if rec.returncode == 3:
                if attempt >= 6:
                    raise RuntimeError("reconcile unresolved after bounded attempts")
                log("RECONCILE_RC3: delayed remote visibility; bounded retry")
                time.sleep(20)
                attempt += 1
                continue
            raise RuntimeError("reconcile-only rc=%d (terminal); stderr=%s"
                               % (rec.returncode, rec.stderr[-800:] if rec.stderr else ""))

        # Explicit read-only Graphiti readback + UUID cross-check (admitted EX).
        gp = run_admitted_node(probe_cmd, lock_fd=handle.fileno(),
                               env=env, cwd=REPO, timeout=120)
        remote = json.loads(Path(probe_out).read_text()) if Path(probe_out).exists() else {"remote_episode_count": 0, "remote_episode_uuids": []}
        store_uuids = read_store_persisted_uuids()
        remote_set = set(remote.get("remote_episode_uuids", []))
        store_set = set(store_uuids)
        missing_remote = sorted(store_set - remote_set)
        extra_remote = sorted(remote_set - store_set)
        uuid_exact = (store_set == remote_set)
        summary = {
            "group": GROUP, "state": STATE, "endpoint": GRAPHITI_ENDPOINT,
            "reconcile_attempts": attempt,
            "store_persisted_uuid_count": len(store_set),
            "remote_episode_count": remote.get("remote_episode_count", 0),
            "store_persisted_uuids": store_uuids,
            "remote_episode_uuids": sorted(remote_set),
            "uuid_exact_match": uuid_exact,
            "missing_in_remote": missing_remote,
            "extra_in_remote": extra_remote,
            "unresolved": 0,
            "completed_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        Path(RECEIPT).write_text(json.dumps(summary, indent=1) + "\n")
        os.chmod(RECEIPT, 0o600)
        log("RECONCILE_RECEIPT: store=%d remote=%d uuid_exact=%s missing=%d extra=%d"
            % (len(store_set), remote.get("remote_episode_count", 0), uuid_exact,
               len(missing_remote), len(extra_remote)))
        print(json.dumps(summary, indent=1))
        return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        log("FAIL_CLOSED: " + str(exc))
        print("FAIL_CLOSED: " + str(exc), file=sys.stderr)
        sys.exit(2)
