#!/usr/bin/env python3
"""Fail-closed, read-only check for stock-V2 plugin callbacks from a fresh run.

Does NOT infer actual model routing/compaction, launch-admission compliance,
backend health, or graph non-mutation. These need separate receipts.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

LOADED = re.compile(r"loading plugin.{0,250}openviking-v2", re.IGNORECASE)
EVENTS = {
    "session.execution.succeeded",
    "session.idle",
    "session.execution.failed",
    "session.compaction.started",
    "session.compaction.ended",
    "session.compacted",
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_owned(path: Path) -> str:
    if not path.is_absolute() or not path.is_file() or path.is_symlink():
        raise ValueError(f"missing or unsafe absolute regular file: {path}")
    if path.stat().st_size > 10 * 1024 * 1024:
        raise ValueError(f"trace file exceeds bounded size: {path}")
    return path.read_text(encoding="utf-8")


def check(native_log: Path, plugin_trace: Path) -> dict:
    raw_log = read_owned(native_log)
    raw_trace = read_owned(plugin_trace)
    load_lines = [line for line in raw_log.splitlines() if LOADED.search(line)]
    events = []
    context = 0
    for n, line in enumerate(raw_trace.splitlines(), start=1):
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"invalid JSONL record at line {n}") from error
        if not isinstance(obj, dict):
            raise ValueError(f"non-object trace record at line {n}")
        kind = obj.get("type")
        if kind == "context":
            context += 1
        if kind in EVENTS and obj.get("session") is True:
            events.append(kind)
    if not load_lines:
        raise ValueError("no native installed openviking-v2 loading evidence")
    if not context:
        raise ValueError("no installed openviking-v2 context hook callback evidence")
    if not events:
        raise ValueError("no installed openviking-v2 subscribed session-event evidence")
    return {
        "result": "PASS",
        "scope": "native_plugin_load_context_hook_event_subscriber_only",
        "native_log_sha256": sha256(native_log),
        "plugin_trace_sha256": sha256(plugin_trace),
        "plugin_load_events": len(load_lines),
        "context_callbacks": context,
        "subscribed_session_events": len(events),
        "event_types": sorted(set(events)),
        "compaction_event_observed": any("compact" in e for e in events),
        "model_stub_route_verified": False,
        "admission_lease_verified": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--native-log", required=True, type=Path)
    parser.add_argument("--plugin-trace", required=True, type=Path)
    args = parser.parse_args()
    try:
        result = check(args.native_log, args.plugin_trace)
    except (ValueError, OSError, UnicodeError) as error:
        print(f"ISSUE70_FRESH_TRACE=FAIL {error}", file=sys.stderr)
        return 1
    print("ISSUE70_FRESH_TRACE=PASS")
    print(json.dumps(result, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
