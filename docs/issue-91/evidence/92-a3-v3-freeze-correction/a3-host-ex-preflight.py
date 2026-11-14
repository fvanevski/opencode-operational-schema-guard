#!/usr/bin/env python3
"""A3 host-local EX preflight: NEGATIVE proof that a marker-only launch cannot
call model/Graphiti. Reuses the canonical bridge + proof on the real lock.

  POSITIVE     - inherited locked fd (pass_fds) -> requireKernelExAdmission ADMITTED.
  NEG-mkonly   - marker-only (lease set, no inherited fd) -> fails closed
                 missing_lock_fd BEFORE any model/state/Graphiti activity.
  NEG-noflock  - non-inherited LOCK_FD -> fails closed.
No model, state, or Graphiti activity occurs in any branch.
"""
import fcntl, json, os, subprocess, sys, importlib.util
REPO = "/workspace/opencode-operational-schema-guard"
BRIDGE = REPO + "/docs/issue-78/v2-curator/ex_admitted_node_bridge.py"
PROOF = REPO + "/docs/issue-78/v2-curator/ex-admission-proof.mjs"
LOCK = "/run/user/%d/openviking-agent.lock" % os.getuid()
OUT = "/tmp/opencode/issue92-a3/a3-host-ex-preflight.json"

spec = importlib.util.spec_from_file_location("ex_bridge", BRIDGE)
bridge = importlib.util.module_from_spec(spec); spec.loader.exec_module(bridge)
run_admitted_node = bridge.run_admitted_node
probe = ("import {requireKernelExAdmission} from '%s';"
 "try{requireKernelExAdmission();console.log('ADMITTED');}"
 "catch(e){console.log('DENIED:'+e.message);process.exit(1);}" % PROOF)
node_probe = ["node", "--input-type=module", "-e", probe]
results = {}
lk = open(LOCK, "a+")
fcntl.flock(lk.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
pos = run_admitted_node(node_probe, lock_fd=lk.fileno(), env=os.environ.copy(), cwd=REPO, timeout=30)
results["positive"] = {"rc": pos.returncode, "out": (pos.stdout or "").strip() or "(inherited-stdout; ADMITTED)"}
fcntl.flock(lk.fileno(), fcntl.LOCK_UN); lk.close()
env0 = {**os.environ, "GHDEV_MEMORY_POST_EXIT_LEASE": "admitted"}
env0.pop("GHDEV_MEMORY_POST_EXIT_LOCK_FD", None)
mk = subprocess.run(node_probe, env=env0, capture_output=True, text=True, timeout=30)
results["neg_marker_only"] = {"rc": mk.returncode, "out": mk.stdout.strip()}
env1 = {**os.environ, "GHDEV_MEMORY_POST_EXIT_LEASE": "admitted", "GHDEV_MEMORY_POST_EXIT_LOCK_FD": "3"}
nf = subprocess.run(node_probe, env=env1, capture_output=True, text=True, timeout=30)
results["neg_noninherited_fd"] = {"rc": nf.returncode, "out": nf.stdout.strip()}
results["proof"] = "marker-only launch fails closed (missing_lock_fd) -> no model/Graphiti call without admitted inherited EX fd"
ok = (results["positive"]["rc"] == 0
      and results["neg_marker_only"]["rc"] != 0
      and "missing_lock_fd" in results["neg_marker_only"]["out"]
      and results["neg_noninherited_fd"]["rc"] != 0)
results["verdict"] = "PASS" if ok else "FAIL"
import os as _os
with open(OUT, "w") as f:
    _os.chmod(OUT, 0o600)
    f.write(json.dumps(results, indent=1) + "\n")
print(json.dumps(results, indent=1))
sys.exit(0 if ok else 1)
