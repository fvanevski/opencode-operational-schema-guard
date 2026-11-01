#!/usr/bin/env python3
"""One-shot post-harness Graphiti drain, NOT a second scheduler.
Use the installed OpenViking gate's own Config, parser, process classifier and
canonical shared EX lock; hold it through remote episode persistence readback.
This is designed to run only after the interactive agent process exits.
"""
import argparse
import fcntl
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

def load_gate(filename):
    location = Path(filename).resolve(strict=True)
    sys.path.insert(0, str(location.parent))
    spec = importlib.util.spec_from_file_location("issue75_existing_gate", location)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load installed gate")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    for name in ("Config", "Worker", "parse_vllm_metrics"):
        if not hasattr(module, name):
            raise RuntimeError("installed gate lacks expected interface " + name)
    return module

def observation(gate, config):
    # Reuse the installed gate's own definitions, not an independently invented
    # process denylist or metrics dialect.
    observer = object.__new__(gate.Worker)
    observer.cfg = config
    harnesses = observer._active_harness_processes()
    if harnesses:
        raise RuntimeError("interactive harness active/unknown: cannot drain")
    errors = []
    for url in (config.metrics_url, *config.metrics_fallback_urls):
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if response.status != 200:
                    raise RuntimeError("scheduler HTTP " + str(response.status))
                payload = response.read().decode("utf-8", "replace")
            running, waiting = gate.parse_vllm_metrics(
                payload, config.metrics_running, config.metrics_waiting)
            if running != 0 or waiting != 0:
                raise RuntimeError("scheduler busy (running/waiting nonzero)")
            return
        except Exception as exc:
            errors.append(str(exc))
    raise RuntimeError("scheduler idle not verified: " + "; ".join(errors))

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--gate-source", required=True,
                   help="actual installed gate Python source, authenticated before use")
    p.add_argument("--gate-config", required=True,
                   help="actual current gate TOML, read-only")
    p.add_argument("--cli", required=True,
                   help="candidate memory-cli.mjs in isolated source checkout")
    p.add_argument("--group", required=True)
    p.add_argument("--state-dir", required=True)
    p.add_argument("--endpoint", required=True)
    p.add_argument("--max-seconds", type=int, default=600)
    args = p.parse_args()
    if not 5 <= args.max_seconds <= 3600:
        p.error("max-seconds must be between 5 and 3600")
    gate = load_gate(args.gate_source)
    cfg = gate.Config.load(args.gate_config)
    if not cfg.lock_file or not cfg.metrics_url or not cfg.process_names:
        raise RuntimeError("gate admission configuration incomplete")
    lock = Path(cfg.lock_file)
    lock.parent.mkdir(parents=True, exist_ok=True)
    with lock.open("a+") as handle:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("shared agent/gate lease held; do not bypass")
        observation(gate, cfg)
        grace = max(0, cfg.quiet_grace_seconds)
        time.sleep(grace)
        observation(gate, cfg)
        env = os.environ.copy()
        env["GHDEV_MEMORY_POST_EXIT_LEASE"] = "admitted"
        cmd = [
            "node", str(Path(args.cli).resolve(strict=True)), "drain",
            "--group", args.group, "--state-dir", args.state_dir,
            "--endpoint", args.endpoint, "--max-seconds", str(args.max_seconds)
        ]
        print("EX admission proven; invoking candidate drain with lock retained",
              flush=True)
        result = subprocess.run(cmd, env=env, check=False,
                                timeout=args.max_seconds + 45)
        return result.returncode

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print("FAIL_CLOSED: " + str(exc), file=sys.stderr)
        sys.exit(2)
