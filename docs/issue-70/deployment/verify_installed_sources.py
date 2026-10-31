#!/usr/bin/env python3
"""Read-only source/installed-file verification for Issue #70 stock-V2 promotion.

This is NOT an installer. It never changes live files, configs or service state.
Pass a host-generated mapping JSON whose destination paths are independently
authenticated by the Build/operator deployment plan.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tomllib

PACKAGE = Path("docs/issue-70/implementation/i1-integrated")
REVIEWED_SHA = "b126b6d415a3f8706e0c8c22b219cca2161a7465"
REVIEWED_TREE = "dacb27120deef3e8bfa27b50222bf20cb60c450c"
# A PASS requires all installable runtime-critical members, not merely one
# cherry-picked matching file. Installed test files are optional.
CRITICAL = {
    "gate": ("openviking_commit_gate.py", "shared_work.py",
             "graphiti_runtime_bootstrap.py"),
    "openviking-v2": ("index.mjs", "candidate-capture.mjs",
                      "graphiti-recall.mjs"),
    "shim": ("openviking-agent-run", "admission_exec.py"),
    "backend": ("openviking/session/session.py",
                "openviking/server/app.py",
                "openviking/service/task_queue_middleware.py",
                "openviking/storage/queuefs/session_commit_msg.py",
                "openviking/server/routers/sessions.py",
                "openviking/service/receipt_protocol.py",
                "openviking/service/commit_receipts.py"),
}



def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for data in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(data)
    return h.hexdigest()


def git(repo: Path, *args: str) -> str:
    value = subprocess.run(["git", "-C", str(repo), *args], check=True,
                           capture_output=True, text=True)
    return value.stdout.strip()


def exact_source_map(manifest: dict) -> dict[str, str]:
    result: dict[str, str] = {}
    for entry in manifest["files"]:
        component = entry["component"]
        rel = entry["path"]
        if component in ("gate", "openviking-v2"):
            source = PACKAGE / "candidate" / component / rel
        elif component == "backend":
            source = PACKAGE / "backend-new" / rel
        elif component == "shim":
            source = PACKAGE / "candidate" / "shim" / rel
        else:
            raise ValueError(f"unknown source component {component}")
        result[source.as_posix()] = entry["candidate_sha256"]
    for key in ("phase2_evidence", "phase3_evidence", "phase4_evidence"):
        for entry in manifest[key]["files"]:
            path = entry["path"]
            previous = result.get(path)
            if previous is not None and previous != entry["sha256"]:
                raise ValueError(f"manifest identity conflict: {path}")
            result[path] = entry["sha256"]
    return result


def checked_file(path: Path) -> Path:
    if not path.is_absolute() or not path.is_file() or path.is_symlink():
        raise ValueError(f"missing, relative or symlink file: {path}")
    return path


def verify(plan_path: Path) -> dict:
    plan = json.loads(checked_file(plan_path).read_text())
    repo = Path(plan["reviewed_checkout"])
    if not repo.is_absolute() or not repo.is_dir() or repo.is_symlink():
        raise ValueError("reviewed checkout must be an absolute real directory")
    if git(repo, "rev-parse", "HEAD") != REVIEWED_SHA:
        raise ValueError("checkout is not the approved source commit")
    if git(repo, "rev-parse", f"{REVIEWED_SHA}^{{tree}}") != REVIEWED_TREE:
        raise ValueError("approved Git tree does not match")
    if git(repo, "status", "--porcelain"):
        raise ValueError("reviewed source checkout contains local changes")
    package = json.loads((repo / PACKAGE / "source-base-manifest.json").read_text())
    allowed = exact_source_map(package)
    patches = {entry["path"]: entry["sha256"] for entry in package["patches"]}
    for filename in ("gate.patch", "openviking-v2.patch", "backend.patch"):
        rel = f"patches/{filename}"
        if digest(checked_file(repo / PACKAGE / rel)) != patches[rel]:
            raise ValueError(f"package patch identity mismatch: {rel}")
    mappings = plan.get("mappings")
    if not isinstance(mappings, list) or not mappings:
        raise ValueError("nonempty verified file mappings required")
    required = {
        (PACKAGE / ("backend-new" if component == "backend" else "candidate") /
         (component if component != "backend" else "") / name).as_posix()
        for component, names in CRITICAL.items() for name in names
    }
    if not required.issubset({r.get("source") for r in mappings if isinstance(r,dict)}):
        raise ValueError("host file mappings omit runtime-critical source members")
    seen_sources: set[str] = set()
    seen_targets: set[str] = set()
    files = []
    for row in mappings:
        source = row["source"]
        target = checked_file(Path(row["installed"]))
        if (not isinstance(source, str) or source not in allowed
                or source in seen_sources or str(target) in seen_targets):
            raise ValueError("unlisted, duplicate or inconsistent source/target")
        seen_sources.add(source)
        seen_targets.add(str(target))
        candidate = repo / source
        expected = allowed[source]
        # Five existing backend files are generated by applying the pinned
        # backend.patch to the authenticated installed base. Only the two
        # new backend modules exist as standalone backend-new source files.
        # In that case the manifest's candidate digest is authoritative
        # after the patch identity and forward/reverse rehearsal are proven
        # separately in the promotion record.
        backend_patch_member = source.startswith((PACKAGE / "backend-new").as_posix()+"/") and not candidate.exists()
        if not backend_patch_member:
            candidate = checked_file(candidate)
            if not candidate.resolve().is_relative_to(repo.resolve()):
                raise ValueError("source escaped reviewed checkout")
            actual_source = digest(candidate)
            if actual_source != expected:
                raise ValueError(f"committed source digest mismatch for {source}")
        actual_installed = digest(target)
        if actual_installed != expected:
            raise ValueError(f"installed digest mismatch for {source}")
        files.append({"source": source, "source_sha256": expected,
                      "installed": str(target), "installed_sha256": actual_installed,
                      "source_kind": "backend_patch_derived" if backend_patch_member else "committed_file",
                      "mode": oct(target.stat().st_mode & 0o777)})
    cfg = checked_file(Path(plan["gate_toml"]))
    with cfg.open("rb") as stream:
        values = tomllib.load(stream)
    worker = values.get("worker", {})
    if not isinstance(worker, dict):
        raise ValueError("worker config must be a TOML table")
    for key in ("graphiti_enabled", "graphiti_production_approved"):
        if key not in worker:
            if plan.get("false_defaults_verified") is not True:
                raise ValueError(f"missing {key}; parser false default unverified")
        elif worker[key] is not False:
            raise ValueError(f"{key} is not explicitly disabled")
    policy = plan.get("operator_policy_json")
    if policy is not None:
        raw = json.loads(checked_file(Path(policy)).read_text())
        if raw.get("production_activation") is True:
            raise ValueError("operator capture activation is enabled")
    return {
        "result": "PASS",
        "reviewed_source_sha": REVIEWED_SHA,
        "reviewed_source_tree": REVIEWED_TREE,
        "candidate_and_installed_files_checked": len(files),
        "gate_config_sha256": digest(cfg),
        "graphiti_enabled": False,
        "graphiti_production_approved": False,
        "operator_production_activation": False if policy is not None else "not_configured",
        "files": files,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()
    try:
        result = verify(args.plan)
    except (OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError,
            json.JSONDecodeError, tomllib.TOMLDecodeError) as exc:
        print(f"ISSUE70_INSTALL_READBACK=FAIL {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    serialized = json.dumps(result, sort_keys=True, indent=2) + "\n"
    if args.output is not None:
        # This writes only a caller-selected private RECEIPT file, never live state.
        args.output.write_text(serialized)
    print("ISSUE70_INSTALL_READBACK=PASS")
    print(serialized)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
