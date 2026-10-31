"""Cross-process admission qualification: two independently executing processes.

Process A is a gate producer with an admitted Graphiti operation and a durable
processing identity. Process B is the coordinator after Graphiti has been
disabled, with an unrelated OpenViking request pending. Both processes use one
disposable SQLite database and one shared lock file; the real ``flock`` path
(``Worker._try_exclusive_lock`` plus blocking ``fcntl.flock``) and the real
launcher admission helper (``admission_exec.py`` under ``flock -s``) are
exercised, not mocked return values.

Boundaries:
  1. A holds the shared coordinator's exclusive inference resource while its
     operation remains active; B must not admit OpenViking inference.
  2. A's work is ambiguous / A exits without authoritative terminal proof;
     B remains blocked even though Graphiti is disabled and metrics are idle.
  3. B initially observes no unresolved producer, A transitions to processing
     before B obtains its exclusive lock; B's in-lock recheck prevents admission.
  4. A completes with authoritative terminal evidence and becomes quiescent;
     a subsequent B admission proceeds after ordinary quiet-grace and lease
     conditions.
  5. A legacy disabled-mode database without Graphiti state retains normal
     OpenViking progress (no optional table is created).

The acceptance target is the process/SQLite/lease interlock, not extraction
quality, so a deterministic CPU-side producer fixture is used: B's scheduler
metrics are an idle (0, 0) fixture and no scheduler-occupancy evidence is
invented. A's Graphiti work uses the durable SQLite work identity only.

Run as the parent suite:  /usr/bin/python3 -m unittest test_cross_process_admission -v
Run as a child:           /usr/bin/python3 <this file> <role> <args...>
Emit sanitized result:    /usr/bin/python3 <this file> --emit-result <path>
"""
import fcntl
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GATE = ROOT / "implementation" / "i1-integrated" / "candidate" / "gate"
ADMISSION_HELPER = ROOT / "implementation" / "i1-integrated" / "candidate" / "shim" / "admission_exec.py"
PYTHON = "/usr/bin/python3"

sys.path.insert(0, str(GATE / "tests"))
sys.path.insert(0, str(GATE))
from test_gate import gate  # noqa: E402
from test_shared_work import candidate as base_candidate  # noqa: E402

RESULTS: list[dict] = []


def _record(name: str, **facts) -> None:
    RESULTS.append({"boundary": name, **facts})


def _config(root: str, *, database: str, lock_file: str, graphiti_enabled: bool,
           quiet_grace_seconds: float = 0.0) -> "gate.Config":
    return gate.Config(
        listen_host="127.0.0.1", listen_port=0, backend_host="127.0.0.1", backend_port=1,
        metrics_url="http://127.0.0.1:1/metrics", lock_file=lock_file, database=database,
        drain_enabled=True, quiet_grace_seconds=quiet_grace_seconds, poll_seconds=0.05,
        task_poll_seconds=0.05, task_timeout_seconds=1, request_timeout_seconds=1,
        max_commit_body_bytes=65536, retry_base_seconds=1, retry_max_seconds=10,
        process_names=(), graphiti_enabled=graphiti_enabled, receipts_enabled=False,
    )


def _item(tag: str) -> dict:
    return base_candidate("xproc-" + tag)


def _gate_source_identity() -> dict:
    src = (GATE / "openviking_commit_gate.py").read_bytes()
    return {
        "gate_source": str(GATE / "openviking_commit_gate.py"),
        "gate_source_sha256": hashlib.sha256(src).hexdigest(),
    }


def _child_identity(db: str, lock: str) -> dict:
    return {"db": str(Path(db).resolve()), "lock": str(Path(lock).resolve())}


def _write_signal(control: Path, name: str) -> None:
    (control / name).write_text("1\n")


def _wait_signal(control: Path, name: str, timeout: float = 60.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if (control / name).exists():
            return True
        time.sleep(0.05)
    return False


# ---------------------------------------------------------------------------
# Child role: process A (the gate producer with a durable Graphiti work row)
# ---------------------------------------------------------------------------

def run_a(db_path: str, lock_path: str, control: str, out_path: str, scenario: str) -> int:
    control = Path(control)
    db = gate.QueueDB(db_path)
    cfg = _config(control, database=db_path, lock_file=lock_path, graphiti_enabled=True)
    worker = gate.Worker(cfg, db, threading.Event())
    shared = worker.shared
    item = _item("a-" + scenario)
    work = shared.enqueue(item)
    with db.connect() as conn:
        conn.execute("UPDATE memory_work SET status='queued' WHERE work_key=?", (work["work_key"],))
    key = work["work_key"]
    try:
        if scenario == "hold":
            row = shared.claim(key, "lease-proc-a")
            shared.processing(key, row["attempt_generation"], key)
            handle = worker._try_exclusive_lock()
            if handle is None:
                return 4
            _write_signal(control, "a-holding")
            if not _wait_signal(control, "release", 60.0):
                return 3
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
            handle.close()
        elif scenario == "transition":
            # W stays queued (no unresolved producer yet) while A holds the
            # exclusive lock; the transition happens only on the go signal.
            handle = worker._try_exclusive_lock()
            if handle is None:
                return 4
            _write_signal(control, "a-queued-lock")
            if not _wait_signal(control, "go-transition", 60.0):
                return 3
            row = shared.claim(key, "lease-proc-a")
            shared.processing(key, row["attempt_generation"], key)
            _write_signal(control, "a-processed")
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
            handle.close()
        elif scenario == "ambiguous":
            row = shared.claim(key, "lease-proc-a")
            shared.processing(key, row["attempt_generation"], key)
            _write_signal(control, "a-ambiguous")
            # The producer process dies without authoritative terminal proof.
            return 1
        elif scenario == "complete":
            row = shared.claim(key, "lease-proc-a")
            shared.processing(key, row["attempt_generation"], key)
            shared.finish(key, row["attempt_generation"], key, "completed")
            _write_signal(control, "a-complete")
        else:
            return 64
    except Exception:
        return 2
    out = {
        "role": "a", "scenario": scenario, "pid": os.getpid(), "work_key": key,
        "status": _final_status(db, key), "exit": 0,
        **_child_identity(db_path, lock_path), **_gate_source_identity(),
    }
    Path(out_path).write_text(json.dumps(out, indent=2) + "\n")
    return 0


def _final_status(db, key: str) -> str:
    with db.connect() as conn:
        row = conn.execute("SELECT status FROM memory_work WHERE work_key=?", (key,)).fetchone()
    return row["status"] if row else "absent"


# ---------------------------------------------------------------------------
# Child role: process B (coordinator after Graphiti was disabled)
# ---------------------------------------------------------------------------

def run_b(db_path: str, lock_path: str, control: str, out_path: str, scenario: str, grace: str = "0") -> int:
    control = Path(control)
    db = gate.QueueDB(db_path)
    cfg = _config(control, database=db_path, lock_file=lock_path, graphiti_enabled=False,
                  quiet_grace_seconds=float(grace))
    worker = gate.Worker(cfg, db, threading.Event())
    assert worker.shared is None  # disabled mode never migrates Graphiti state
    # Deterministic CPU-side idle scheduler fixture: the interlock, not the
    # scheduler, is the acceptance target. No occupancy evidence is invented.
    worker._metrics = lambda: (0, 0)
    worker._active_harness_processes = lambda: []
    db.enqueue({"account": "a", "user_id": "u", "actor_peer": "p"},
               "ov-xproc-" + scenario, 0, {}, "cross-process")
    intent_state = lambda: db.list_rows()[0]["state"]
    out = {
        "role": "b", "scenario": scenario, "pid": os.getpid(),
        **_child_identity(db_path, lock_path), **_gate_source_identity(),
    }
    try:
        if scenario == "tick":
            admitted = worker.tick()
            out.update({"admitted": admitted, "state": worker.admission_status()["state"],
                        "intent_state": intent_state()})
        elif scenario == "grace":
            calls = []
            worker._process = lambda row: (calls.append(str(row["session_id"])), db.complete(row))
            first = worker.tick()
            first_state = worker.admission_status()["state"]
            time.sleep(float(grace) + 0.1)
            second = worker.tick()
            out.update({"first": first, "first_state": first_state, "second": second,
                        "processed": calls, "intent_state": intent_state()})
        elif scenario == "seq":
            pre = worker._unresolved_graphiti_from_existing_db()
            _write_signal(control, "b-prelock")
            fd = open(lock_path, "a+", encoding="utf-8")
            fcntl.flock(fd.fileno(), fcntl.LOCK_EX)  # blocks while A holds the lease
            post = worker._unresolved_graphiti_from_existing_db()  # in-lock recheck
            fcntl.flock(fd.fileno(), fcntl.LOCK_UN)
            fd.close()
            admitted = worker.tick()
            out.update({"pre_lock_unresolved": pre, "in_lock_unresolved": post,
                        "admitted_after_recheck": admitted,
                        "state": worker.admission_status()["state"],
                        "intent_state": intent_state()})
        elif scenario == "helper":
            rc = _run_admission_helper(lock_path, db_path, ["--required"])
            out.update({"helper_exit": rc[0], "helper_stderr": rc[1]})
        elif scenario == "helper-legacy":
            rc = _run_admission_helper(lock_path, db_path, ["--legacy-compatible"])
            out.update({"helper_exit": rc[0], "helper_stderr": rc[1]})
        else:
            return 64
    except Exception as exc:
        out.update({"error": f"{type(exc).__name__}: {exc}"})
        Path(out_path).write_text(json.dumps(out, indent=2) + "\n")
        return 2
    out["exit"] = 0
    Path(out_path).write_text(json.dumps(out, indent=2) + "\n")
    return 0


def _run_admission_helper(lock_path: str, db_path: str, flags: list) -> tuple:
    cmd = ["/usr/bin/flock", "-s", "--close", lock_path,
           PYTHON, str(ADMISSION_HELPER), "--database", db_path, *flags, "--", "/bin/true"]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return proc.returncode, proc.stderr.strip()


# ---------------------------------------------------------------------------
# Parent: the five boundary tests
# ---------------------------------------------------------------------------

class CrossProcessAdmissionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.control = self.root / "control"
        self.control.mkdir()
        self.db = str(self.root / "queue.sqlite3")
        self.lock = str(self.root / "agent.lock")
        self.children: list[subprocess.Popen] = []

    def tearDown(self):
        for child in self.children:
            if child.poll() is None:
                child.kill()
                child.wait(timeout=5)
        self.tmp.cleanup()

    def spawn(self, argv: list, log_name: str) -> subprocess.Popen:
        with open(self.root / (log_name + ".log"), "wb") as log:
            # Popen duplicates the fd; the parent handle may close immediately.
            proc = subprocess.Popen([PYTHON, str(Path(__file__).resolve()), *argv],
                                    stdout=log, stderr=subprocess.STDOUT, cwd=str(self.root))
        self.children.append(proc)
        return proc

    def out(self, name: str) -> dict:
        return json.loads((self.root / (name + ".out.json")).read_text())

    def exit_clean(self, proc: subprocess.Popen, expect: int = 0) -> int:
        rc = proc.wait(timeout=90)
        self.assertEqual(rc, expect, "child exit code mismatch")
        return rc

    def assert_same_identity(self, *outs: dict) -> None:
        dbs = {o["db"] for o in outs}
        locks = {o["lock"] for o in outs}
        sources = {o["gate_source_sha256"] for o in outs}
        self.assertEqual(len(dbs), 1, "database path diverged between processes")
        self.assertEqual(len(locks), 1, "lock path diverged between processes")
        self.assertEqual(len(sources), 1, "gate source diverged between processes")

    # 1. A holds the exclusive inference resource; B must not admit.
    def test_a_holds_exclusive_lease_b_must_not_admit(self):
        a = self.spawn(["a", self.db, self.lock, str(self.control),
                        str(self.root / "a.out.json"), "hold"], "a")
        self.assertTrue(_wait_signal(self.control, "a-holding"))
        # The shared lease is genuinely held: a non-blocking SH flock fails.
        probe = open(self.lock, "a+", encoding="utf-8")
        with self.assertRaises(BlockingIOError):
            fcntl.flock(probe.fileno(), fcntl.LOCK_SH | fcntl.LOCK_NB)
        probe.close()
        b = self.spawn(["b", self.db, self.lock, str(self.control),
                        str(self.root / "b.out.json"), "tick"], "b")
        self.exit_clean(b)
        _write_signal(self.control, "release")
        self.exit_clean(a)
        bo, ao = self.out("b"), self.out("a")
        self.assertEqual(bo["state"], "blocked_reconcile")
        self.assertFalse(bo["admitted"])
        self.assertEqual(bo["intent_state"], "pending")
        self.assertEqual(ao["status"], "processing")
        self.assert_same_identity(bo, ao)
        _record("a_holds_exclusive_lease_b_must_not_admit",
                b_state=bo["state"], b_admitted=bo["admitted"],
                a_status=ao["status"],
                shared_db_identity=bo["db"], shared_lock_identity=bo["lock"],
                same_identity_across_processes=True)

    # 2. A dies with ambiguous work; B (a restarted coordinator) stays blocked.
    def test_ambiguous_exit_keeps_b_blocked(self):
        a = self.spawn(["a", self.db, self.lock, str(self.control),
                        str(self.root / "a.out.json"), "ambiguous"], "a")
        self.assertTrue(_wait_signal(self.control, "a-ambiguous"))
        self.exit_clean(a, expect=1)  # producer death without terminal proof
        b = self.spawn(["b", self.db, self.lock, str(self.control),
                        str(self.root / "b.out.json"), "tick"], "b")
        self.exit_clean(b)
        h = self.spawn(["b", self.db, self.lock, str(self.control),
                        str(self.root / "h.out.json"), "helper"], "h")
        self.exit_clean(h)
        bo, ho = self.out("b"), self.out("h")
        self.assertEqual(bo["state"], "blocked_reconcile")
        self.assertFalse(bo["admitted"])
        self.assertEqual(bo["intent_state"], "pending")
        self.assertEqual(ho["helper_exit"], 75)
        self.assertIn("OPENVIKING_ADMISSION=blocked_reconcile", ho["helper_stderr"])
        self.assert_same_identity(bo, ho)
        _record("ambiguous_exit_keeps_b_blocked",
                b_state=bo["state"], launcher_exit=ho["helper_exit"],
                launcher_mark=ho["helper_stderr"],
                shared_db_identity=bo["db"], shared_lock_identity=bo["lock"])

    # 3. TOCTOU: A transitions to processing while B waits for the lock.
    def test_in_lock_recheck_catches_transition(self):
        a = self.spawn(["a", self.db, self.lock, str(self.control),
                        str(self.root / "a.out.json"), "transition"], "a")
        self.assertTrue(_wait_signal(self.control, "a-queued-lock"))
        b = self.spawn(["b", self.db, self.lock, str(self.control),
                        str(self.root / "b.out.json"), "seq"], "b")
        self.assertTrue(_wait_signal(self.control, "b-prelock"))
        _write_signal(self.control, "go-transition")  # A claims + processing, releases
        self.exit_clean(b)
        self.exit_clean(a)
        bo, ao = self.out("b"), self.out("a")
        self.assertFalse(bo["pre_lock_unresolved"])
        self.assertTrue(bo["in_lock_unresolved"])
        self.assertFalse(bo["admitted_after_recheck"])
        self.assertEqual(bo["state"], "blocked_reconcile")
        self.assertEqual(bo["intent_state"], "pending")
        self.assertEqual(ao["status"], "processing")
        self.assert_same_identity(bo, ao)
        _record("in_lock_recheck_catches_transition",
                pre_lock_unresolved=bo["pre_lock_unresolved"],
                in_lock_unresolved=bo["in_lock_unresolved"],
                b_state=bo["state"],
                shared_db_identity=bo["db"], shared_lock_identity=bo["lock"])

    # 4. Authoritative terminal evidence: B may admit after quiet grace.
    def test_terminal_evidence_allows_b_after_grace(self):
        a = self.spawn(["a", self.db, self.lock, str(self.control),
                        str(self.root / "a.out.json"), "complete"], "a")
        self.assertTrue(_wait_signal(self.control, "a-complete"))
        self.exit_clean(a)
        b = self.spawn(["b", self.db, self.lock, str(self.control),
                        str(self.root / "b.out.json"), "grace", "1"], "b")
        self.exit_clean(b)
        h = self.spawn(["b", self.db, self.lock, str(self.control),
                        str(self.root / "h.out.json"), "helper"], "h")
        self.exit_clean(h)
        bo, ao, ho = self.out("b"), self.out("a"), self.out("h")
        self.assertFalse(bo["first"])
        self.assertEqual(bo["first_state"], "quiet_grace")
        self.assertTrue(bo["second"])
        self.assertEqual(bo["processed"], ["ov-xproc-grace"])
        self.assertEqual(ao["status"], "completed")
        self.assertEqual(ho["helper_exit"], 0)  # launcher execs the command
        self.assert_same_identity(bo, ao, ho)
        _record("terminal_evidence_allows_b_after_grace",
                b_first_state=bo["first_state"], b_second_admitted=bo["second"],
                a_status=ao["status"], launcher_exit=ho["helper_exit"],
                interactive_launcher_admission="PASS",
                shared_db_identity=bo["db"], shared_lock_identity=bo["lock"])

    # 5. Legacy disabled database without Graphiti state stays available.
    def test_legacy_disabled_db_without_graphiti_state(self):
        other = self.root / "legacy"
        other.mkdir()
        db2, lock2 = str(other / "queue.sqlite3"), str(other / "agent.lock")
        b = self.spawn(["b", db2, lock2, str(self.control),
                        str(self.root / "lb.out.json"), "grace", "0"], "lb")
        self.exit_clean(b)
        h = self.spawn(["b", db2, lock2, str(self.control),
                        str(self.root / "lh.out.json"), "helper-legacy"], "lh")
        self.exit_clean(h)
        with sqlite3.connect("file:" + db2 + "?mode=ro", uri=True) as conn:
            tables = {r[0] for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertNotIn("memory_work", tables)  # no migration in disabled mode
        bo, ho = self.out("lb"), self.out("lh")
        self.assertTrue(bo["second"])
        self.assertEqual(ho["helper_exit"], 0)
        self.assert_same_identity(bo, ho)
        _record("legacy_disabled_db_without_graphiti_state",
                b_second_admitted=bo["second"],
                memory_work_table_created=False,
                launcher_exit=ho["helper_exit"],
                shared_db_identity=bo["db"], shared_lock_identity=bo["lock"])


def _emit_result(path: str) -> None:
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(CrossProcessAdmissionTests)
    result = unittest.TestResult()
    suite.run(result)
    summary = {
        "suite": "cross-process-admission",
        "ran": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "status": "PASS" if (result.testsRun > 0 and not result.failures
                             and not result.errors) else "FAIL",
        "processes": "two independently executing python3 processes per boundary "
                     "(gate producer + disabled-mode coordinator) sharing one "
                     "disposable SQLite database and one lock file",
        "scheduler_fixture": "deterministic idle (0,0) CPU-side metrics; no "
                             "scheduler-occupancy evidence invented",
        "real_paths_exercised": [
            "Worker._try_exclusive_lock (fcntl.flock EX, non-blocking)",
            "blocking fcntl.flock EX on the shared lock file",
            "flock -s --close + admission_exec.py launcher helper",
        ],
        "gate_source_sha256": _gate_source_identity()["gate_source_sha256"],
        "boundaries": RESULTS,
    }
    if result.failures or result.errors:
        for case, _ in result.failures + result.errors:
            print(f"FAILURE: {case}")
    Path(path).write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({k: summary[k] for k in ("status", "ran", "failures", "errors")}, indent=2))
    sys.exit(0 if summary["status"] == "PASS" else 1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--emit-result":
        _emit_result(sys.argv[2])
    elif len(sys.argv) > 1 and sys.argv[1] in ("a", "b"):
        role, db, lock, control, out = sys.argv[1:6]
        extra = sys.argv[6:]
        if role == "a":
            sys.exit(run_a(db, lock, control, out, extra[0] if extra else "hold"))
        sys.exit(run_b(db, lock, control, out, extra[0] if extra else "tick",
                       extra[1] if len(extra) > 1 else "0"))
    else:
        unittest.main()
