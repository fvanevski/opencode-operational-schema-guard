import fcntl,os,sqlite3,subprocess,sys,tempfile,threading,time,unittest
from pathlib import Path
from dataclasses import replace
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"candidate/gate"))
import openviking_commit_gate as gate

class LauncherAdmission(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);self.runtime=self.root/"runtime";self.runtime.mkdir()
        self.dbpath=self.root/"gate.sqlite";self.db=gate.QueueDB(str(self.dbpath))
        self.helper=ROOT/"candidate/shim/admission_exec.py"
    def check(self,required=True):
        return subprocess.run([sys.executable,str(self.helper),"--database",str(self.dbpath),"--required" if required else "--legacy-compatible","--","/usr/bin/true"],capture_output=True,text=True)
    def activate(self):
        with self.db.connect() as db:db.execute("UPDATE admission_contract SET required=1")
    def test_disabled_legacy_and_sticky_activation_without_environment_opt_in(self):
        self.db.enqueue({"account":"a","user_id":"u","actor_peer":"p"},"s",0,{},"test")
        self.db.claim(self.db.next_ready());self.db.mark_unknown_claims()
        self.assertEqual(self.check(required=False).returncode,0) # Historical lease-only compatibility.
        self.activate();self.assertEqual(self.check(required=False).returncode,75)
        self.assertEqual(self.check(required=True).returncode,75)
    def test_missing_or_inaccessible_schema_is_fail_closed_when_required(self):
        self.dbpath.unlink()
        self.assertEqual(self.check().returncode,75)
        self.assertEqual(self.check(required=False).returncode,0)
    def test_pre_post_crash_is_protected_before_backend_side_effect(self):
        self.activate();self.db.enqueue({"account":"a","user_id":"u","actor_peer":"p"},"s",0,{},"test")
        row=self.db.claim(self.db.next_ready())
        self.assertEqual(self.db.attempt(row)["submitted"],0)
        self.assertEqual(self.check().returncode,75)
        self.db.mark_unknown_claims();self.assertEqual(self.check().returncode,75)
        sys.path.insert(0,str(ROOT/"candidate/gate/tests"))
        from test_gate import config
        worker=gate.Worker(replace(config(str(self.root)),database=str(self.dbpath),receipts_enabled=True,drain_enabled=True,process_names=()),self.db,threading.Event())
        worker._recovery_quiet_since=time.monotonic()-100
        worker._try_exclusive_lock=lambda:None
        self.assertFalse(worker.tick())
        self.assertIsNone(worker._recovery_quiet_since)  # Contention restarts quiet grace.
    def test_memory_ambiguous_work_blocks_interactive_after_gate_releases_os_lock(self):
        self.activate()
        with self.db.connect() as db:
            db.execute("CREATE TABLE memory_work (status TEXT)")
            db.execute("INSERT INTO memory_work VALUES ('blocked_reconcile')")
        self.assertEqual(self.check().returncode,75)
    def test_shared_lease_is_retained_across_checker_and_harness_exec(self):
        self.activate()
        script=self.root/"harness.sh";started=self.root/"started";release=self.root/"release"
        script.write_text('#!/bin/sh\ntouch "'+str(started)+'"\nwhile [ ! -f "'+str(release)+'" ]; do sleep 0.02; done\n');script.chmod(0o755)
        env={**os.environ,"XDG_RUNTIME_DIR":str(self.runtime),"OPENVIKING_ADMISSION_DB":str(self.dbpath),"OPENVIKING_ADMISSION_HELPER":str(self.helper)}
        proc=subprocess.Popen([str(ROOT/"candidate/shim/openviking-agent-run"),str(script)],env=env)
        try:
            end=time.monotonic()+3
            while not started.exists() and time.monotonic()<end:time.sleep(.01)
            self.assertTrue(started.exists())
            with (self.runtime/"openviking-agent.lock").open('a+') as other:
                with self.assertRaises(BlockingIOError):fcntl.flock(other,fcntl.LOCK_EX|fcntl.LOCK_NB)
        finally:release.touch();proc.wait(timeout=3)
        with (self.runtime/"openviking-agent.lock").open('a+') as other:fcntl.flock(other,fcntl.LOCK_EX|fcntl.LOCK_NB)

if __name__=='__main__':unittest.main()
