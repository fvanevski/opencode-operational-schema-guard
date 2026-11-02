"""Reconstruct only in a newly-created disposable tree; no live writes."""
import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess
import tempfile

p = argparse.ArgumentParser()
p.add_argument("--backend", required=True)
p.add_argument("--gate", required=True)
a = p.parse_args()
here = pathlib.Path(__file__).resolve().parent
roots = {"openviking": pathlib.Path(a.backend).resolve(), "gate": pathlib.Path(a.gate).resolve()}
pins = json.loads((here / "SOURCE_PINS.json").read_text())["files"]

# Determine if inputs are base or deployed
is_deployed = False
first_item = next(item for item in pins if item["base_sha256"] is not None)
kind, rel = first_item["path"].split("/", 1)
first_file = roots[kind] / rel
if hashlib.sha256(first_file.read_bytes()).hexdigest() == first_item["deployed_sha256"]:
    is_deployed = True

out = pathlib.Path(tempfile.mkdtemp(prefix="issue75-reproduce-"))
candidate = out / "host-candidate"

if is_deployed:
    for item in pins:
        kind, rel = item["path"].split("/", 1)
        f = roots[kind] / rel
        assert hashlib.sha256(f.read_bytes()).hexdigest() == item["deployed_sha256"], f
    for kind, root in roots.items():
        shutil.copytree(root, candidate / kind, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    # Verify reverse patch produces exact base_sha256
    subprocess.run(["patch", "-R", "-p1", "-i", str(here / "SOURCE.diff")], cwd=candidate, check=True)
    for item in pins:
        p_file = candidate / item["path"]
        if item["base_sha256"] is None:
            assert not p_file.exists(), p_file
        else:
            assert hashlib.sha256(p_file.read_bytes()).hexdigest() == item["base_sha256"], p_file
    # Forward patch back to candidate
    subprocess.run(["patch", "-p1", "-i", str(here / "SOURCE.diff")], cwd=candidate, check=True)
    for item in pins:
        p_file = candidate / item["path"]
        assert hashlib.sha256(p_file.read_bytes()).hexdigest() == item["candidate_sha256"], p_file
else:
    for item in pins:
        kind, rel = item["path"].split("/", 1)
        f = roots[kind] / rel
        if item["base_sha256"] is None:
            assert not f.exists(), f
        else:
            assert hashlib.sha256(f.read_bytes()).hexdigest() == item["base_sha256"], f
    for kind, root in roots.items():
        shutil.copytree(root, candidate / kind, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    subprocess.run(["patch", "-p1", "-i", str(here / "SOURCE.diff")], cwd=candidate, check=True)
    for item in pins:
        p_file = candidate / item["path"]
        assert hashlib.sha256(p_file.read_bytes()).hexdigest() == item["candidate_sha256"], p_file

shutil.copytree(here / "tests", out / "tests")
shutil.copytree(here / "service-integration", out / "service-integration")
(out / "service-integration/backend").symlink_to(candidate, target_is_directory=True)
cand_dir = out / "service-integration/candidate"
cand_dir.mkdir(parents=True, exist_ok=True)
(cand_dir / "gate").symlink_to(candidate / "gate", target_is_directory=True)

# Link authenticated issue-70 fixtures from repository source
i1_candidate = here.parents[2] / "issue-70/implementation/i1-integrated/candidate"
if i1_candidate.exists():
    for name in ("shim", "openviking-v2"):
        src = i1_candidate / name
        if src.exists() and not (cand_dir / name).exists():
            (cand_dir / name).symlink_to(src, target_is_directory=True)

print(out)
