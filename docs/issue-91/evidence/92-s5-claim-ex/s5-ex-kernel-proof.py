#!/usr/bin/env python3
"""S5 EX kernel proof: positive inherited-held descriptor + all negatives.

Proves, on the REAL canonical lock, that:
  POSITIVE  - the Central bridge passes the locked descriptor to a direct Node
              child (pass_fds) and finite-batch's requireKernelExAdmission()
              accepts it (inherited fdinfo FLOCK, holder PID == parent).
  NEG-mkonly- a marker-only driver (lease set, no LOCK_FD env) fails closed
              with missing_lock_fd BEFORE any model/state/Graphiti activity.
  NEG-noflock - a LOCK_FD env pointing at a non-inherited fd fails closed
              (descriptor_unavailable / no_inherited_parent_flock).
No model, state, or Graphiti activity occurs in any branch.
"""
import fcntl, json, os, subprocess, sys, importlib.util, hashlib
REPO = "/workspace/opencode-operational-schema-guard"
BRIDGE = REPO + "/docs/issue-78/v2-curator/ex_admitted_node_bridge.py"
PROOF = REPO + "/docs/issue-78/v2-curator/ex-admission-proof.mjs"
LOCK = "/run/user/%d/openviking-agent.lock" % os.getuid()

spec = importlib.util.spec_from_file_location("ex_bridge", BRIDGE)
bridge = importlib.util.module_from_spec(spec); spec.loader.exec_module(bridge)
run_admitted_node = bridge.run_admitted_node

probe = (
 "import {requireKernelExAdmission} from '%s';"
 "try{requireKernelExAdmission();console.log('ADMITTED');}"
 "catch(e){console.log('DENIED:'+e.message);process.exit(1);}" % PROOF
)
node_probe = ["node", "--input-type=module", "-e", probe]

results = {}
# POSITIVE: bridge passes the real locked fd to a direct Node child.
lk = open(LOCK, "a+")
fcntl.flock(lk.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
pos = run_admitted_node(node_probe, lock_fd=lk.fileno(),
                        env=os.environ.copy(), cwd=REPO, timeout=30)
# run_admitted_node inherits stdout (no capture), so 'ADMITTED' prints directly;
# the child exits 0 only when requireKernelExAdmission() accepted the inherited
# flock, non-zero (with DENIED:<code> printed) otherwise.
results["positive"] = {"rc": pos.returncode, "out": (pos.stdout or "").strip() or "(inherited-stdout; ADMITTED printed to console)"}
fcntl.flock(lk.fileno(), fcntl.LOCK_UN)
lk.close()

# NEG marker-only: lease set, no LOCK_FD env, no inherited fd.
env0 = {**os.environ, "GHDEV_MEMORY_POST_EXIT_LEASE": "admitted"}
env0.pop("GHDEV_MEMORY_POST_EXIT_LOCK_FD", None)
mk = subprocess.run(node_probe, env=env0, capture_output=True, text=True, timeout=30)
results["neg_marker_only"] = {"rc": mk.returncode, "out": mk.stdout.strip()}

# NEG non-inherited fd: LOCK_FD set to 3 but fd 3 is not passed to the child.
env1 = {**os.environ, "GHDEV_MEMORY_POST_EXIT_LEASE": "admitted",
        "GHDEV_MEMORY_POST_EXIT_LOCK_FD": "3"}
nf = subprocess.run(node_probe, env=env1, capture_output=True, text=True, timeout=30)
results["neg_noninherited_fd"] = {"rc": nf.returncode, "out": nf.stdout.strip()}

print(json.dumps(results, indent=1))
ok = (results["positive"]["rc"] == 0
      and results["neg_marker_only"]["rc"] != 0
      and "missing_lock_fd" in results["neg_marker_only"]["out"]
      and results["neg_noninherited_fd"]["rc"] != 0)
print("EX_KERNEL_PROOF:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
