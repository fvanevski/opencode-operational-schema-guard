#!/usr/bin/env python3
"""Build precisely two reviewed Issue-70 receipt fixes in disposable scratch.

No installed source, services, Git refs, gate queue, credentials, or DB is modified.
Installed originals must match the previously qualified disabled host source.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

BASE_SHA256 = {
    "gate": "9d71ac50a3e9e2deb455395ecfb56cb4cacfb09aeadfbad5206ae1f143dcb878",
    "backend": "2775fae94e0ae7900b6f0f58dbc3fdf7f995a31e98dfcc2f79b5d9e81a611b92",
}
GATE_BEFORE = '''        api_key = os.environ.get("OPENVIKING_ROOT_API_KEY") or os.environ.get("OPENVIKING_API_KEY")
        if not api_key:
            raise RuntimeError("OPENVIKING_ROOT_API_KEY or OPENVIKING_API_KEY is required")
'''
GATE_AFTER = '''        # Receipt endpoints require backend-owner (ROOT) authorization. Legacy
        # tenant-scoped commits require the tenant key even when ROOT is present.
        # Select by the configured endpoint mode, never by env-var precedence.
        if self.cfg.receipts_enabled:
            api_key = os.environ.get("OPENVIKING_ROOT_API_KEY")
            required = "OPENVIKING_ROOT_API_KEY"
        else:
            api_key = os.environ.get("OPENVIKING_API_KEY")
            required = "OPENVIKING_API_KEY"
        if not api_key:
            raise RuntimeError(f"{required} is required for the configured commit mode")
'''
BACKEND_BEFORE = '''    if (set(scope) != {"account","user_id","actor_peer","session_id"}
            or not all(isinstance(v,str) and 0<len(v)<=256 for v in scope.values())
            or scope.get("session_id") != session_id
'''
BACKEND_AFTER = '''    if (not isinstance(scope, dict)
            or set(scope) != {"account","user_id","actor_peer","session_id"}
            or not all(isinstance(v, str) and
                       (0 <= len(v) <= 256 if k == "actor_peer" else 0 < len(v) <= 256)
                       for k, v in scope.items())
            or scope.get("session_id") != session_id
'''
def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def replace_once(source: str, before: str, after: str, name: str) -> str:
    count = source.count(before)
    if count != 1 or after in source:
        raise ValueError(f"{name}: expected exact unmodified context once (found={count})")
    result = source.replace(before, after)
    compile(result, f"<corrected-{name}>", "exec")
    return result

def prepare(gate: bytes, backend: bytes, *, require_pins: bool = True) -> dict[str, str]:
    original = {"gate": gate, "backend": backend}
    if require_pins:
        for key, raw in original.items():
            if sha(raw) != BASE_SHA256[key]:
                raise ValueError(f"{key}: installed source SHA-256 mismatch; stop without writing")
    gate_after = replace_once(gate.decode("utf-8"), GATE_BEFORE, GATE_AFTER, "gate")
    backend_after = replace_once(backend.decode("utf-8"), BACKEND_BEFORE, BACKEND_AFTER, "backend")
    return {"gate": gate_after, "backend": backend_after}

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--gate-original", type=Path, required=True)
    ap.add_argument("--backend-original", type=Path, required=True)
    ap.add_argument("--output", type=Path, required=True, help="new, absent, private scratch directory")
    args = ap.parse_args()
    originals = {"gate": args.gate_original.read_bytes(),
                 "backend": args.backend_original.read_bytes()}
    corrected = prepare(originals["gate"], originals["backend"])
    # Source validation completes before a single file is created.
    out = args.output
    if not out.parent.is_dir() or out.exists():
        raise SystemExit("output must be absent beneath an existing caller-owned private parent")
    out.mkdir(mode=0o700)
    paths = {"gate": "openviking_commit_gate.py", "backend": "sessions.py"}
    rows = []
    for key, filename in paths.items():
        dest = out / filename
        dest.write_bytes(corrected[key].encode("utf-8"))
        dest.chmod(0o600)
        rows.append({"component": key, "source_sha256": sha(originals[key]),
                     "candidate_sha256": sha(dest.read_bytes()), "file": filename})
    (out / "source-readback.json").write_text(json.dumps(
        {"contract": "issue70-receipt-fix-v1", "files": rows}, indent=2) + "\n")
    (out / "source-readback.json").chmod(0o600)
    print(json.dumps({"result": "DISPOSABLE_CANDIDATES_PREPARED", "output": str(out),
                      "files": rows}, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
