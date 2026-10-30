"""Actual installed backend integration in disposable subprocesses, CPU-only."""
import concurrent.futures,hashlib,json,os,subprocess,sys,tempfile,threading,time,unittest,urllib.request,urllib.error
from dataclasses import replace
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"candidate/gate"))
import openviking_commit_gate as gate
from receipt_protocol import canonical_digest,request_key
PYTHON=os.environ.get("OPENVIKING_TEST_PYTHON","/home/filip/.local/share/uv/tools/openviking/bin/python")
SCOPE={"account":"a","user_id":"u","actor_peer":"p","session_id":"s"}
HEADERS={"Authorization":"Bearer disposable-root","X-OpenViking-Account":"a","X-OpenViking-User":"u","X-OpenViking-Actor-Peer":"p"}

def wait_for(check,timeout=8):
    end=time.monotonic()+timeout
    while time.monotonic()<end:
        if check():return
        time.sleep(.02)
    raise AssertionError("disposable backend deadline" + ("\n"+ (CURRENT_ROOT/"backend-private.log").read_text()[-7000:] if 'CURRENT_ROOT' in globals() else ""))

class I1Service(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        global CURRENT_ROOT
        self.root=Path(self.tmp.name);CURRENT_ROOT=self.root;self.backend=self.root/"backend";self.backend.mkdir()
        self.proc=None;self.log=None;self.addCleanup(self.stop)
        self.env_patch=unittest.mock.patch.dict(os.environ,{"OPENVIKING_ROOT_API_KEY":"disposable-root"}) if hasattr(unittest,'mock') else None
        from unittest import mock
        self.env_patch=mock.patch.dict(os.environ,{"OPENVIKING_ROOT_API_KEY":"disposable-root"});self.env_patch.start();self.addCleanup(self.env_patch.stop)
        self.runtime=self.root/"runtime";self.runtime.mkdir()
        self.cfg=gate.Config(listen_host="127.0.0.1",listen_port=0,backend_host="127.0.0.1",backend_port=1,metrics_url="",lock_file=str(self.runtime/"openviking-agent.lock"),database=str(self.root/"gate.sqlite"),drain_enabled=True,quiet_grace_seconds=0,poll_seconds=.01,task_poll_seconds=.01,task_timeout_seconds=.08,request_timeout_seconds=.5,max_commit_body_bytes=65536,retry_base_seconds=1,retry_max_seconds=10,process_names=(),receipts_enabled=True)
        self.db=gate.QueueDB(self.cfg.database)
    def stop(self,kill=False):
        if self.proc is not None and self.proc.poll() is None:
            self.proc.kill() if kill else self.proc.terminate()
            self.proc.wait(timeout=5)
        self.proc=None
        if self.log:self.log.close();self.log=None
    def start(self,stage="none"):
        self.stop();(self.backend/"port").unlink(missing_ok=True)
        self.log=(self.root/"backend-private.log").open("a+")
        env={**os.environ,"PYTHONPATH":str(ROOT/"backend"),"PYTHONDONTWRITEBYTECODE":"1"}
        self.proc=subprocess.Popen([PYTHON,str(ROOT/"tests/backend_service_fixture.py"),str(self.backend),stage],env=env,stdout=self.log,stderr=subprocess.STDOUT)
        def ready():
            if self.proc.poll() is not None:
                raise AssertionError((self.root/"backend-private.log").read_text()[-3500:])
            if not (self.backend/"port").exists():return False
            self.port=int((self.backend/"port").read_text());self.url=f"http://127.0.0.1:{self.port}"
            try:return self.http("GET","/test/state")[0]==200
            except OSError:return False
        wait_for(ready,15)
        self.http("GET","/api/v1/admin/commit_receipts/s/"+"0"*64,headers=HEADERS)
        self.cfg=replace(self.cfg,backend_port=self.port,metrics_url=self.url+"/metrics")
        self.worker=gate.Worker(self.cfg,self.db,threading.Event())
    def http(self,method,path,body=None,headers=None):
        req=urllib.request.Request(self.url+path,method=method,data=json.dumps(body).encode() if body is not None else None,headers={"Content-Type":"application/json",**(headers or {})})
        try:
            with urllib.request.urlopen(req,timeout=3) as response:return response.status,json.load(response)
        except urllib.error.HTTPError as error:
            with error:return error.code,json.load(error)
    def state(self):return self.http("GET","/test/state")[1]
    def enqueue(self,session="s",body=None):
        self.db.enqueue(SCOPE,session,0,body or {},"integration")
    def submit_gate(self):
        self.assertFalse(self.worker.tick());self.assertTrue(self.worker.tick())
    def launcher(self):
        marker=self.root/"interactive-started"
        env={**os.environ,"XDG_RUNTIME_DIR":str(self.runtime),"OPENVIKING_ADMISSION_DB":self.cfg.database,"OPENVIKING_ADMISSION_HELPER":str(ROOT/"candidate/shim/admission_exec.py")}
        result=subprocess.run([str(ROOT/"candidate/shim/openviking-agent-run"),"/usr/bin/touch",str(marker)],env=env,capture_output=True,text=True,timeout=3)
        return result,marker
    def reconcile_until(self,session,state="complete"):
        def check():
            self.worker.tick()
            return any(r["session_id"]==session and r["state"]==state for r in self.db.list_rows())
        wait_for(check,4)
    def test_real_publication_gap_lost_response_launcher_and_terminal_resume(self):
        self.start("publication");self.enqueue();self.submit_gate()
        state=self.state();self.assertEqual(state["stage"],"published_before_task");self.assertEqual(state["tasks"],[]);self.assertEqual(state["queue_size"],0)
        self.assertEqual(self.worker._metrics(),(0,0));self.assertEqual(self.db.list_rows()[0]["state"],"unknown")
        row=self.db.unknown_rows()[0];attempt=self.db.attempt(row);frozen=dict(attempt)
        envelope={"scope":SCOPE,"generation":frozen["generation"],"body":json.loads(frozen["body_json"]),"body_digest":frozen["body_digest"]}
        path="/api/v1/admin/commit_receipts/s/"+frozen["request_key"]
        self.assertEqual(self.http("POST",path,envelope,HEADERS)[1]["result"]["state"],"preparing")
        self.assertEqual(self.state()["commit_calls"],1)
        self.db.enqueue(SCOPE,"s",5,{"keep_recent_count":5},"newer generation")
        self.enqueue("other")
        self.assertEqual(dict(self.db.attempt(self.db.unknown_rows()[0])),frozen)
        result,marker=self.launcher();self.assertEqual(result.returncode,75,result.stderr);self.assertFalse(marker.exists())
        self.assertFalse(self.worker.tick());self.assertEqual(self.state()["commit_calls"],1)
        self.http("POST","/test/release",{})
        wait_for(lambda:(self.worker.tick() or True) and self.state()["queue_size"]==1)
        # Accepted, durable and queued while metrics are zero is not release.
        self.worker.tick();self.assertEqual(self.state()["commit_calls"],1)
        result,marker=self.launcher();self.assertEqual(result.returncode,75)
        self.http("POST","/test/drain",{})
        self.reconcile_until("s",state="pending")  # generation 2 is preserved.
        self.assertEqual(self.state()["extractions"],1)
        # Resolve gen2 as genuine no-archive skip, then independently queued work.
        self.worker.tick();self.worker.tick()
        self.http("POST","/test/drain",{})
        self.reconcile_until("s")
        for _ in range(5):self.worker.tick()
        if self.state()["queue_size"]:self.http("POST","/test/drain",{})
        self.reconcile_until("other")
        self.assertEqual(self.state()["commit_calls"],3)
        self.assertEqual(self.state()["extractions"],2)
        result,marker=self.launcher();self.assertEqual(result.returncode,0,result.stderr);self.assertTrue(marker.exists())
        print("I1_PUBLICATION_TIMELINE "+json.dumps({"actual_native_queuefs":True,"publication_empty_task_list":True,"idle_metrics":[0,0],"interactive_blocked":True,"original_extractions":1,"newer_generation_preserved":True,"unrelated_resumed":True}))
    def test_crash_during_publication_recovers_exact_archive_without_commit_reexecution(self):
        self.start("publication");self.enqueue();self.submit_gate()
        old=dict(self.db.attempt(self.db.unknown_rows()[0]));self.stop(kill=True);self.start()
        self.cfg=replace(self.cfg,quiet_grace_seconds=.05)
        self.worker=gate.Worker(self.cfg,self.db,threading.Event())
        self.http("POST","/test/busy",{})
        for _ in range(3):self.worker.tick()
        self.assertEqual(self.state()["queue_size"],0)
        self.assertEqual(self.launcher()[0].returncode,75)
        self.http("POST","/test/idle",{})
        self.worker.tick()  # Exact archive recovery still requires idle grace.
        self.assertEqual(self.state()["queue_size"],0)
        wait_for(lambda:(self.worker.tick() or True) and self.state()["queue_size"]==1)
        self.assertEqual(self.state()["commit_calls"],0)
        self.http("POST","/test/drain",{})
        self.reconcile_until("s")
        self.assertEqual(self.state()["extractions"],1)
        self.assertEqual(self.state()["commit_calls"],0)
        body=json.loads(old["body_json"]);envelope={"scope":SCOPE,"generation":1,"body":body,"body_digest":old["body_digest"]}
        path="/api/v1/admin/commit_receipts/s/"+old["request_key"]
        code,receipt=self.http("POST",path,envelope,HEADERS);self.assertEqual(code,200);self.assertEqual(receipt["result"]["state"],"terminal")
        self.assertEqual(self.state()["commit_calls"],0)
        self.http("POST","/test/replay",{});self.http("POST","/test/drain",{})
        self.assertEqual(self.state()["extractions"],1)
        envelope["body"]={"keep_recent_count":1};envelope["body_digest"]=canonical_digest(envelope["body"])
        self.assertEqual(self.http("POST",path,envelope,HEADERS)[0],409)
    def test_registered_not_enqueued_and_persistent_queue_restart_remain_protected(self):
        self.start("registration");self.enqueue();self.submit_gate()
        state=self.state();self.assertEqual(state["stage"],"registered_before_enqueue");self.assertEqual(len(state["tasks"]),1);self.assertEqual(state["queue_size"],0)
        self.assertEqual(self.launcher()[0].returncode,75)
        self.stop(kill=True);self.start();self.worker.tick()
        wait_for(lambda:(self.worker.tick() or True) and self.state()["queue_size"]==1)
        self.stop(kill=True);self.start();self.worker.tick()
        self.assertEqual(self.state()["queue_size"],1)
        self.assertEqual(self.launcher()[0].returncode,75)
        self.http("POST","/test/drain",{});self.reconcile_until("s")
        self.assertEqual(self.state()["extractions"],1)
    def test_accepted_receipt_survives_lost_http_response(self):
        self.start("response");self.enqueue();self.submit_gate()
        self.assertEqual(self.state()["stage"],"accepted_before_http")
        self.assertEqual(self.state()["queue_size"],1)
        self.assertEqual(self.db.list_rows()[0]["state"],"unknown")
        self.assertEqual(self.launcher()[0].returncode,75)
        self.worker.tick();self.assertEqual(self.state()["commit_calls"],1)
        self.http("POST","/test/release",{});self.http("POST","/test/drain",{})
        self.reconcile_until("s")
        self.assertEqual(self.state()["extractions"],1)
        self.assertEqual(self.state()["commit_calls"],1)

    def test_failed_task_preserves_history_and_newer_generation(self):
        self.start("failure");self.enqueue();self.submit_gate()
        self.db.enqueue(SCOPE,"s",0,{},"newer")
        self.http("POST","/test/drain",{})
        self.reconcile_until("s",state="pending")
        failed=self.db.list_unresolved_failures()
        self.assertEqual(len(failed),1);self.assertEqual(failed[0]["generation"],1)
        self.assertEqual(self.db.list_rows()[0]["requested_generation"],2)
        self.assertEqual(self.db.list_rows()[0]["last_terminal_outcome"],"failed")

    def test_cancelled_queue_is_fenced_without_model_execution(self):
        self.start();self.enqueue();self.submit_gate()
        self.http("POST","/test/cancel",{});self.http("POST","/test/drain",{})
        self.reconcile_until("s",state="failed")
        self.assertEqual(self.state()["extractions"],0)
        self.assertEqual(self.launcher()[0].returncode,0)

    def test_disabled_receipts_preserve_actual_legacy_backend(self):
        self.start("disabled")
        code,result=self.http("POST","/test/legacy",{})
        self.assertEqual(code,200);self.assertTrue(result["task_id"])
        self.http("POST","/test/drain",{})
        self.assertEqual(self.state()["extractions"],1)
        self.enqueue();self.submit_gate()
        self.assertEqual(self.db.list_rows()[0]["state"],"unknown")
        self.assertEqual(self.launcher()[0].returncode,75)

    def test_done_marker_does_not_release_an_active_worker(self):
        self.start("terminal_gap");self.enqueue();self.submit_gate()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            draining=pool.submit(self.http,"POST","/test/drain",{})
            wait_for(lambda:self.state()["stage"]=="done_marker_worker_active")
            self.worker.tick()  # Tracking is allowed; terminal release is not.
            self.assertNotEqual(self.db.list_rows()[0]["state"],"complete")
            self.assertEqual(self.launcher()[0].returncode,75)
            self.http("POST","/test/release",{})
            self.assertEqual(draining.result(timeout=3)[0],200)
        self.reconcile_until("s")
        self.assertEqual(self.launcher()[0].returncode,0)

    def test_skip_and_receipt_auth_scope_mismatch(self):
        self.start();self.enqueue("skip");self.submit_gate();self.reconcile_until("skip");self.assertEqual(self.db.list_rows()[0]["state"],"complete")
        self.assertEqual(self.state()["extractions"],0)
        scope={**SCOPE,"session_id":"skip"};key=request_key(scope,1);path="/api/v1/admin/commit_receipts/skip/"+key
        self.assertEqual(self.http("GET",path,headers={**HEADERS,"Authorization":"Bearer capture-only"})[0],401)
        self.assertEqual(self.http("GET",path,headers={**HEADERS,"X-OpenViking-Actor-Peer":"other"})[0],409)
        # A legacy unknown has no retrospective request identity and stays blocked.
        with self.db.connect() as db:
            db.execute("UPDATE intents SET state='unknown',claimed_generation=99")
        self.assertFalse(self.worker.tick())
        self.assertEqual(self.launcher()[0].returncode,75)

if __name__=='__main__':unittest.main()
