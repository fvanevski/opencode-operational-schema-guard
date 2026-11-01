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
import socket
from urllib.parse import urlparse
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
        except Exception as exc:
            errors.append(str(exc))
            continue
        if running != 0 or waiting != 0:
            raise RuntimeError("scheduler busy (running/waiting nonzero)")
        return
    raise RuntimeError("scheduler idle not verified: " + "; ".join(errors))

def acquire_gate_lock(handle, timeout_seconds):
    # Wait only for the canonical existing flock. Never bypass a held lease.
    deadline = time.monotonic() + timeout_seconds
    while True:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            return
        except BlockingIOError:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise RuntimeError('shared agent/gate lease held; bounded wait exhausted')
            time.sleep(min(0.25, remaining))


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
    p.add_argument("--lock-timeout", type=float, default=120)
    args = p.parse_args()
    if not 5 <= args.max_seconds <= 3600:
        p.error("max-seconds must be between 5 and 3600")
    if not 0 <= args.lock_timeout <= 600:
        p.error("lock-timeout must be between 0 and 600 seconds")
    gate = load_gate(args.gate_source)
    cfg = gate.Config.load(args.gate_config)
    if not cfg.lock_file or not cfg.metrics_url or not cfg.process_names:
        raise RuntimeError("gate admission configuration incomplete")
    lock = Path(cfg.lock_file)
    lock.parent.mkdir(parents=True, exist_ok=True)
    with lock.open("a+") as handle:
        acquire_gate_lock(handle, args.lock_timeout)
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
        try:
            result = subprocess.run(cmd, env=env, check=False,
                                    timeout=args.max_seconds + 45)
            exit_code = result.returncode
        except subprocess.TimeoutExpired:
            exit_code = 3
        if exit_code == 0:
            return 0
        # Graphiti add_memory ACKs asynchronously. On nonterminal timeout,
        # releasing EX might admit an agent while already-queued extraction
        # wakes later. Fail closed: require the operator to quiesce the
        # isolated MCP worker, NOT simply to acknowledge the error.
        print("UNRESOLVED: holding exclusive lease. Stop the disposable Graphiti "
              "MCP worker and confirm its listener is closed before resuming "
              "interactive agents.", file=sys.stderr, flush=True)
        parsed = urlparse(args.endpoint)
        if parsed.hostname not in ('127.0.0.1', 'localhost', '::1'):
            raise RuntimeError('unsafe Graphiti endpoint in quiescence check')
        while True:
            try:
                answer = input('After stopping ONLY the disposable Graphiti worker, '
                               'type VERIFY_STOPPED to check listener: ').strip()
            except EOFError:
                # No unattended unlock of an unknown remote extraction job.
                while True:
                    time.sleep(3600)
            if answer != 'VERIFY_STOPPED':
                continue
            try:
                with socket.create_connection((parsed.hostname, parsed.port or 80), timeout=2):
                    print('Graphiti endpoint still live: EX retained', file=sys.stderr)
                    continue
            except ConnectionRefusedError:
                print('Graphiti endpoint refused connection; preserve unresolved '
                      'journal and service logs for reconciliation.', file=sys.stderr)
                return exit_code
            except OSError as exc:
                print('Graphiti listener state uncertain: ' + str(exc) +
                      '; EX retained', file=sys.stderr)

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print("FAIL_CLOSED: " + str(exc), file=sys.stderr)
        sys.exit(2)
