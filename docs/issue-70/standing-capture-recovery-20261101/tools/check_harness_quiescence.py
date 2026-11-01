#!/usr/bin/env python3
"""Read-only process classifier for a Graphiti host-promotion preflight.

Does not replace canonical exclusive flock, backend scheduler-idle checks,
or durable OpenViking/Graphiti reconciliation.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path

ALIASES = {
    "codex": "codex", "opencode": "opencode", "agy": "agy",
    "antigravity": "agy", "opencode-desktop": "opencode-desktop",
    "opencode-deskto": "opencode-desktop", "opencode.AppImage": "opencode-desktop",
    "opencode.AppIma": "opencode-desktop", "ai.opencode.desktop": "opencode-desktop",
    "ai.opencode.des": "opencode-desktop",
}

def classify(comm: str, argv: list[str]) -> str:
    """Return active, helper, or unknown for a recognized agent process."""
    kind = ALIASES.get(comm)
    if kind is None:
        raise ValueError("classify only recognized process names")
    if not argv:
        return "unknown"
    if any(a.startswith("--type=") for a in argv):
        return "helper"
    if "crashpad" in Path(argv[0]).name:
        return "helper"
    # Match explicit exclusions in the merged gate's process detector.
    # Do not ignore codex exec, a plain interactive codex, or an unknown command.
    if kind == "codex" and len(argv) > 1 and argv[1] == "app-server":
        return "helper"
    if kind == "opencode" and len(argv) > 1 and argv[1] == "serve":
        return "helper"
    return "active"

def inspect(proc_root: Path) -> dict:
    if not proc_root.is_dir():
        raise RuntimeError("process filesystem unavailable")
    active, unknown, helpers = [], [], 0
    for proc in proc_root.iterdir():
        if not proc.name.isdigit():
            continue
        try:
            comm = (proc / "comm").read_text(encoding="utf-8").strip()
        except OSError:
            continue
        if comm not in ALIASES:
            continue
        try:
            raw = (proc / "cmdline").read_bytes()
            argv = [s.decode("utf-8", errors="replace") for s in raw.split(b"\0") if s]
        except OSError:
            argv = []
        cls = classify(comm, argv)
        # Do not disclose raw process arguments, which might include secrets.
        item = {"pid": int(proc.name), "comm": comm, "classification": cls}
        if cls == "active":
            active.append(item)
        elif cls == "unknown":
            unknown.append(item)
        else:
            helpers += 1
    return {
        "result": "BLOCKED" if active or unknown else "NO_INTERACTIVE_AGENT_IDENTIFIED",
        "active": sorted(active, key=lambda p: p["pid"]),
        "unknown": sorted(unknown, key=lambda p: p["pid"]),
        "ignored_noninteractive_helpers": helpers,
        "exclusive_lease_and_backend_idle_verified": False,
    }

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--proc-root", type=Path, default=Path("/proc"))
    args = parser.parse_args()
    try:
        result = inspect(args.proc_root)
        print(json.dumps(result, sort_keys=True))
        return 2 if result["result"] == "BLOCKED" else 0
    except (OSError, RuntimeError) as exc:
        print(json.dumps({"result": "UNVERIFIED", "error": str(exc)}, sort_keys=True))
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
