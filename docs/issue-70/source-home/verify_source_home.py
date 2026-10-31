#!/usr/bin/env python3
"""Issue #70 read-only source-home preflight; never installs or deploys."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys

HEX64 = re.compile(r"[0-9a-f]{64}\Z")

class PreflightError(ValueError):
    pass

def hash_file(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1048576), b""):
            h.update(chunk)
    return h.hexdigest()

def confined(root, relative):
    rel = PurePosixPath(relative)
    if rel.is_absolute() or not rel.parts or ".." in rel.parts:
        raise PreflightError(f"unsafe relative path: {relative!r}")
    try:
        base = root.resolve(strict=True)
        source = root.joinpath(*rel.parts)
        target = source.resolve(strict=True)
    except OSError as exc:
        raise PreflightError(f"required file missing: {relative}") from exc
    if not target.is_relative_to(base) or not source.is_file():
        raise PreflightError(f"unsafe or non-file source: {relative}")
    return source

def source_manifest(package):
    try:
        data = json.loads(confined(package, "source-base-manifest.json").read_text())
        if not isinstance(data["files"], list):
            raise ValueError("files must be a list")
    except (ValueError, KeyError, TypeError) as exc:
        raise PreflightError("invalid source-base-manifest.json") from exc
    return data["files"]

def check_package(package):
    lines = confined(package, "SHA256SUMS").read_text().splitlines()
    if not lines: raise PreflightError("empty SHA256SUMS")
    seen = set()
    for line in lines:
        if len(line) < 67 or line[64:66] != "  " or not HEX64.fullmatch(line[:64]):
            raise PreflightError("invalid SHA256SUMS entry")
        rel = line[66:]
        if rel in seen: raise PreflightError(f"duplicate checksum: {rel}")
        seen.add(rel)
        if hash_file(confined(package, rel)) != line[:64]:
            raise PreflightError(f"checksum mismatch: {rel}")
    verified, deferred = 0, 0
    for row in source_manifest(package):
        component, name, expected = row["component"], row["path"], row["candidate_sha256"]
        if not HEX64.fullmatch(expected):
            raise PreflightError(f"invalid candidate digest: {component}/{name}")
        if component in ("gate", "openviking-v2", "shim"):
            rel = f"candidate/{component}/{name}"
        elif component == "backend":
            if row.get("source_base_sha256") is not None:
                deferred += 1
                continue # Checked after isolated patch via prepare_backend.py.
            rel = f"backend-new/{name}"
        else:
            raise PreflightError(f"unknown component: {component}")
        if hash_file(confined(package, rel)) != expected:
            raise PreflightError(f"candidate mismatch: {rel}")
        verified += 1
    return {"package_checks":len(lines), "candidate_checks":verified,
            "backend_patch_checks_deferred":deferred}


# These runtime dependencies are read by the patched backend but do not
# appear as modified files in source-base-manifest.json. Their byte identity
# is nevertheless part of the tested publication/terminal-receipt contract.
REQUIRED_BACKEND_DEPENDENCIES = frozenset({
    "openviking/service/task_tracker.py",
    "openviking/service/session_service.py",
    "openviking/lib/ragfs_python.abi3.so",
})

def check_backend_dependencies(package, backend, originals):
    """Validate recorded native/unmodified backend code against the explicit root."""
    try:
        data = json.loads(confined(package, "source-ownership.json").read_text())
        sources = data["installed_sources"]
        if not isinstance(sources, list):
            raise ValueError("installed_sources must be a list")
    except (ValueError, TypeError, KeyError) as exc:
        raise PreflightError("invalid source-ownership.json") from exc
    seen = set()
    checked = 0
    for record in sources:
        if not isinstance(record, dict):
            raise PreflightError("malformed installed-source record")
        original_path = record.get("path")
        if not isinstance(original_path, str):
            raise PreflightError("invalid installed-source path")
        marker = "/site-packages/"
        if marker not in original_path:
            continue
        relative = original_path.split(marker, 1)[1]
        if not relative.startswith("openviking/") or relative in seen:
            raise PreflightError("unmapped or duplicate backend dependency")
        seen.add(relative)
        expected = record.get("sha256")
        if not isinstance(expected, str) or not HEX64.fullmatch(expected):
            raise PreflightError(f"invalid recorded dependency digest: {relative}")
        if relative in originals and originals[relative] != expected:
            raise PreflightError(f"conflicting backend source authorities: {relative}")
        if hash_file(confined(backend, relative)) != expected:
            raise PreflightError(f"backend dependency drift: {relative}")
        checked += 1
    missing = REQUIRED_BACKEND_DEPENDENCIES - seen
    if missing:
        raise PreflightError("unrecorded backend dependencies: " + ", ".join(sorted(missing)))
    return checked

def check_host(package, gate, v2, backend, shim):
    roots = {"gate":gate,"openviking-v2":v2,"backend":backend}
    checked = 0
    for row in source_manifest(package):
        expected = row.get("source_base_sha256")
        if expected is None: continue
        if not HEX64.fullmatch(expected):
            raise PreflightError(f"invalid original digest: {row['path']}")
        if row["component"] == "shim":
            if row["path"] != "openviking-agent-run" or not shim.is_file():
                raise PreflightError("unmapped or absent original shim")
            path = shim
        else:
            root = roots.get(row["component"])
            if root is None: raise PreflightError("unmapped original source component")
            path = confined(root, row["path"])
        if hash_file(path) != expected:
            raise PreflightError(f"original source mismatch: {row['component']}/{row['path']}")
        checked += 1
    originals = {
        row["path"]: row["source_base_sha256"]
        for row in source_manifest(package)
        if row["component"] == "backend" and row.get("source_base_sha256") is not None
    }
    dependencies = check_backend_dependencies(package, backend, originals)
    return {"original_source_checks":checked, "backend_dependency_checks":dependencies,
            "host_mutations":0}

def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--package", type=Path, required=True)
    p.add_argument("--host", action="store_true")
    p.add_argument("--gate-root", type=Path)
    p.add_argument("--v2-root", type=Path)
    p.add_argument("--backend-root", type=Path, help="site-packages directory")
    p.add_argument("--shim", type=Path, help="installed common launcher executable")
    a = p.parse_args(argv)
    try:
        result = check_package(a.package)
        if a.host:
            if not all([a.gate_root,a.v2_root,a.backend_root,a.shim]):
                raise PreflightError("host mode requires all four explicit source roots")
            result.update(check_host(a.package,a.gate_root,a.v2_root,a.backend_root,a.shim))
        print(json.dumps({"status":"PASS","read_only":True,**result},sort_keys=True))
        return 0
    except (PreflightError,OSError,KeyError,TypeError) as exc:
        print(json.dumps({"status":"BLOCKED","reason":str(exc)},sort_keys=True),file=sys.stderr)
        return 2

if __name__ == "__main__": sys.exit(main())
