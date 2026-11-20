import json
import io
import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import idle_window as m

class FakeHost:
    def __init__(self, result=0, work=True, fail=None):
        self.result=result; self.work=work; self.fail=fail
        self.service="active"; self.pid="4321"; self.events=[]
        self.calls=0;self.listener_checks=0;self.post_drain_gate_checks=0
    def status(self): self.events.append("status"); return self.work
    def active(self): self.events.append("active"); return self.service,self.pid
    def ingress(self, *, expect_fenced):
        self.events.append("ingress_fenced" if expect_fenced else "ingress_open")
        if self.fail=="ingress_busy": raise m.Blocked("ingress active")
    def sessions_idle(self):
        self.calls+=1; self.events.append("session_idle")
        if self.fail=="second_busy" and self.calls==2: raise m.Blocked("session busy")
        if self.fail=="busy": raise m.Blocked("session busy")
    def gate_idle(self):
        self.events.append("gate_idle")
        if self.fail=="gate_busy": raise m.Blocked("scheduler busy")
        if "drain" in self.events:
            self.post_drain_gate_checks+=1
            if self.fail=="post_terminal_busy_once" and self.post_drain_gate_checks==1:
                raise m.Blocked("inference scheduler busy")
            if self.fail=="post_terminal_busy_forever":
                raise m.Blocked("inference scheduler busy")
            if self.fail=="post_terminal_remote_unknown":
                raise m.Blocked("unresolved Graphiti gate state")
    def stop(self):
        self.events.append("stop")
        if self.fail=="stop": raise m.Blocked("systemd stop failed")
        self.service="inactive";self.pid="0"
    def listener_down(self):self.events.append("down");return self.service=="inactive"
    def drain(self):
        self.events.append("drain")
        if self.service!="inactive":raise AssertionError("drain with listener up")
        return self.result
    def start(self):
        self.events.append("start")
        if self.fail=="restart":raise m.Blocked("restart failed")
        self.service="active";self.pid="12345"
    def listener_up(self):
        self.listener_checks+=1;self.events.append("up")
        if self.fail=="delayed_listener" and self.listener_checks<3: return False
        if self.fail=="never_listener": return False
        return self.service=="active"

class Safety(unittest.TestCase):
    def setUp(self):
        self.temp=TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name)
        trusted=root/"source";trusted.write_text("source",encoding="utf-8")
        self.cfg={"journal":str(root/"journal.json"),"coordinator_lock":str(root/"lock"),
                  "pinned_files":{str(trusted):m._sha256(str(trusted))},"quiet_seconds":0}
    def run_cycle(self,host):
        if not Path(self.cfg["journal"]).exists():
            m._write_journal(Path(self.cfg["journal"]),"idle","test-bootstrap","fixture initial state")
        return m.run_cycle(self.cfg,host,sleep=lambda _:None)
    def state(self):
        item=m._safe_journal(Path(self.cfg["journal"]))
        return item["state"] if item else None
    def test_no_work_never_stops(self):
        host=FakeHost(work=False);self.assertEqual(self.run_cycle(host),"no_work")
        self.assertNotIn("stop",host.events);self.assertEqual(self.state(),"idle")
    def test_busy_never_stops_or_fences(self):
        for how in ("busy","second_busy","gate_busy","ingress_busy"):
            with self.subTest(how=how):
                host=FakeHost(fail=how)
                with self.assertRaises(m.Blocked):self.run_cycle(host)
                self.assertNotIn("stop",host.events);self.assertEqual(self.state(),"idle")
    def test_clean_drain_server_restored_only_after_terminal(self):
        host=FakeHost();self.assertEqual(self.run_cycle(host),"completed")
        self.assertEqual(self.state(),"idle")
        self.assertLess(host.events.index("stop"),host.events.index("drain"))
        self.assertLess(host.events.index("drain"),host.events.index("start"))
        self.assertEqual(host.service,"active");m.check_start(Path(self.cfg["journal"]))
        self.assertLess(host.events.index("ingress_fenced"),host.events.index("stop"))
    def test_safe_local_retry_can_restart(self):
        host=FakeHost(result=4);self.assertEqual(self.run_cycle(host),"safe_local_retry")
        self.assertEqual(self.state(),"idle")
    def test_post_terminal_scheduler_busy_recovers_without_repeat_drain(self):
        host=FakeHost(result=4,fail="post_terminal_busy_once")
        self.assertEqual(self.run_cycle(host),"safe_local_retry")
        self.assertEqual(self.state(),"idle")
        self.assertEqual(host.events.count("drain"),1)
        self.assertEqual(host.post_drain_gate_checks,2)
        self.assertEqual(host.events.count("start"),1)
        self.assertLess(host.events.index("drain"),host.events.index("start"))

    def test_post_terminal_non_scheduler_denial_stays_unsafe(self):
        host=FakeHost(result=4,fail="post_terminal_remote_unknown")
        with self.assertRaisesRegex(m.Blocked,"unresolved Graphiti gate state"):
            self.run_cycle(host)
        self.assertEqual(host.post_drain_gate_checks,1)
        self.assertEqual(host.events.count("drain"),1)
        self.assertNotIn("start",host.events)
        self.assertEqual(self.state(),"unsafe")
        with self.assertRaises(m.Blocked):m.check_start(Path(self.cfg["journal"]))

    def test_post_terminal_scheduler_timeout_stays_unsafe(self):
        host=FakeHost(result=4,fail="post_terminal_busy_forever")
        with patch.object(m,"wait_for_post_terminal_idle",
                          side_effect=m.Blocked("post-terminal inference scheduler busy beyond bounded wait")):
            with self.assertRaises(m.Blocked):self.run_cycle(host)
        self.assertEqual(self.state(),"unsafe")
        self.assertNotIn("start",host.events)
        self.assertEqual(host.events.count("drain"),1)

    def test_post_terminal_wait_is_bounded_and_no_other_admission_retries(self):
        host=FakeHost(fail="post_terminal_busy_forever")
        host.events.append("drain")
        ticks=iter([0.0,0.1,1.0])
        with self.assertRaisesRegex(m.Blocked,"beyond bounded wait"):
            m.wait_for_post_terminal_idle(host,timeout_seconds=0.5,
                                          sleep=lambda _:None,now=lambda:next(ticks))
        self.assertEqual(host.post_drain_gate_checks,2)

    def test_delayed_backend_listener_does_not_poison_journal(self):
        for result,expected in ((0,"completed"),(4,"safe_local_retry")):
            with self.subTest(result=result):
                host=FakeHost(result=result,fail="delayed_listener")
                self.assertEqual(self.run_cycle(host),expected)
                self.assertEqual(host.listener_checks,3)
                self.assertEqual(self.state(),"idle")
                self.assertLess(host.events.index("start"),host.events.index("up"))
                self.assertEqual(host.events[-1],"ingress_fenced")
    def test_backend_never_ready_times_out_without_restarting_it(self):
        host=FakeHost(fail="never_listener")
        ticks=iter([0.0,0.1,1.0])
        with self.assertRaisesRegex(m.Blocked,"did not become ready"):
            m.wait_for_backend_ready(host,timeout_seconds=0.5,
                                     sleep=lambda _:None,now=lambda:next(ticks))
        self.assertEqual(host.events.count("start"),0)
        self.assertEqual(host.listener_checks,2)
    def test_backend_failed_state_does_not_wait_or_reopen(self):
        host=FakeHost();host.service="failed";host.pid="0"
        with self.assertRaisesRegex(m.Blocked,"service failed"):
            m.wait_for_backend_ready(host,sleep=lambda _:None)
        self.assertNotIn("up",host.events)
    def test_post_drain_readiness_failure_retains_unsafe_journal(self):
        host=FakeHost()
        with patch.object(m,"wait_for_backend_ready",
                          side_effect=m.Blocked("backend did not become ready after terminal EX")):
            with self.assertRaises(m.Blocked):self.run_cycle(host)
        self.assertEqual(self.state(),"unsafe")
        self.assertIn("start",host.events)
        self.assertNotIn("ingress_open",host.events[host.events.index("start"):])
        with self.assertRaises(m.Blocked):m.check_start(Path(self.cfg["journal"]))
    def test_unknown_remote_result_stays_fenced(self):
        host=FakeHost(result=3)
        with self.assertRaisesRegex(m.Blocked,"not terminal-safe"):self.run_cycle(host)
        self.assertEqual(self.state(),"unsafe")
        self.assertEqual(host.service,"inactive");self.assertNotIn("start",host.events)
        with self.assertRaises(m.Blocked):m.check_start(Path(self.cfg["journal"]))
        with self.assertRaises(m.Blocked):self.run_cycle(FakeHost())
    def test_stop_error_rejects_any_ex_drain(self):
        host=FakeHost(fail="stop")
        with self.assertRaises(m.Blocked):self.run_cycle(host)
        self.assertEqual(self.state(),"unsafe")
        self.assertNotIn("drain",host.events)
    def test_restart_error_blocks_ingress_until_recovered(self):
        host=FakeHost(fail="restart")
        with self.assertRaises(m.Blocked):self.run_cycle(host)
        self.assertEqual(self.state(),"unsafe")
    def test_tampered_source_blocks_before_stop(self):
        source=Path(next(iter(self.cfg["pinned_files"])))
        source.write_text("changed")
        host=FakeHost()
        with self.assertRaises(m.Blocked):self.run_cycle(host)
        self.assertNotIn("stop",host.events)
    def test_missing_journal_denies_start(self):
        with self.assertRaises(m.Blocked):m.check_start(Path(self.cfg["journal"]))
    def test_corrupt_journal_denies_start(self):
        p=Path(self.cfg["journal"]);p.write_text('{broken')
        with self.assertRaises(Exception):m.check_start(p)
    def test_bootstrap_rejects_existing_and_ex_lock(self):
        import fcntl,os
        root=Path(self.temp.name)
        kernel_lock=root/"kernel.lock";kernel_lock.touch(mode=0o600)
        gate=root/"gate.py"
        gate.write_text("from types import SimpleNamespace\nclass Config:\n    @staticmethod\n    def load(path): return SimpleNamespace(lock_file="+repr(str(kernel_lock))+")\n")
        self.cfg["gate_source"]=str(gate)
        self.cfg["gate_config"]=str(root/"config")
        self.cfg["pinned_files"][str(gate)]=m._sha256(str(gate))
        fd=os.open(kernel_lock,os.O_RDWR)
        try:
            fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            with self.assertRaises(m.Blocked):m.bootstrap(self.cfg)
            self.assertIsNone(self.state())
            fcntl.flock(fd,fcntl.LOCK_UN)
            self.assertTrue(m.bootstrap(self.cfg))
            self.assertEqual(self.state(),"idle")
            with self.assertRaises(m.Blocked):m.bootstrap(self.cfg)
        finally:os.close(fd)
    def test_unsafe_restart_denial(self):
        p=Path(self.cfg["journal"])
        m._write_journal(p,"draining","dead", "interrupted")
        with self.assertRaises(m.Blocked):m.check_start(p)
    def test_concurrent_coordinator_blocked(self):
        import fcntl,os
        fd=os.open(self.cfg["coordinator_lock"],os.O_CREAT|os.O_RDWR,0o600)
        fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
        # flock from the same process on another open file description conflicts.
        try:
            host=FakeHost()
            with self.assertRaises(m.Blocked):self.run_cycle(host)
            self.assertNotIn("stop",host.events)
        finally:os.close(fd)
    def test_wrong_service_config_blocks(self):
        c={"journal":self.cfg["journal"],"coordinator_lock":self.cfg["coordinator_lock"],
           "service_unit":"bad","service_port":49375,"service_url":"http://127.0.0.1:49375",
           "ingress_status_url":"http://127.0.0.1:49374/__ghdev_ingress/status",
           "status_argv":["/usr/bin/node","/none"],"drain_argv":["/usr/bin/python3","/none"],
           "gate_source":"/none","gate_config":"/none","pinned_files":{"/none":"0"*64}}
        with self.assertRaises(m.Blocked):m._assert_config(c)


class NativeActivity(unittest.TestCase):
    def setUp(self):
        self.host=m.Host({"service_url":"http://127.0.0.1:49375"})
        self.auth=patch.dict(os.environ,{"OPENCODE_PASSWORD":"disposable-test-password"})
        self.auth.start();self.addCleanup(self.auth.stop)
    def check(self, response, *, jobs_response='{"data":[]}', http_status=200, job_http_status=200):
        urls=[]
        class Response:
            def __init__(self, text, status): self.text=text; self.status=status
            def __enter__(self): return self
            def __exit__(self, *_): return None
            def read(self, _n): return self.text.encode("utf-8")
        def respond(req, **_):
            urls.append(req.full_url)
            self.assertTrue(req.get_header("Authorization").startswith("Basic "))
            if req.full_url.endswith("/api/session/active"):
                return Response(response,http_status)
            if req.full_url.endswith("/api/experimental/job?status=running"):
                return Response(jobs_response,job_http_status)
            raise AssertionError("unexpected native activity URL")
        with patch.object(m.urllib.request,"urlopen",side_effect=respond):
            self.host.sessions_idle()
        self.assertEqual(urls,[
            "http://127.0.0.1:49375/api/session/active",
            "http://127.0.0.1:49375/api/experimental/job?status=running"])
    def test_empty_owned_active_set_allows_idle(self):
        self.check('{"data":{}}')
    def test_owned_running_drain_blocks_stop(self):
        with self.assertRaisesRegex(m.Blocked,"foreground execution"):
            self.check('{"data":{"ses_test":{"type":"running"}}}')
    def test_no_legacy_spa_or_invalid_shape_can_prove_idle(self):
        for body in ('<html>SPA</html>','{}','{"data":[]}','{"data":{"ses_test":{"type":"idle"}}}'):
            with self.subTest(body=body),self.assertRaises(m.Blocked):
                self.check(body)
    def test_missing_service_password_fails_closed(self):
        with patch.dict(os.environ,{"OPENCODE_PASSWORD":""}):
            with self.assertRaises(m.Blocked): self.host.sessions_idle()
    def test_running_background_job_blocks_even_with_empty_active_sessions(self):
        with self.assertRaisesRegex(m.Blocked,"background execution"):
            self.check('{"data":{}}',jobs_response='{"data":[{"id":"job-1","status":"running","kind":"shell"}]}')
    def test_background_jobs_shape_must_be_complete_and_valid(self):
        for body in ('{}','{"data":{}}','{"data":[{"status":"completed"}]}','<html>SPA</html>'):
            with self.subTest(body=body),self.assertRaises(m.Blocked):
                self.check('{"data":{}}',jobs_response=body)
    def test_unavailable_background_job_api_fails_closed(self):
        with self.assertRaisesRegex(m.Blocked,"background jobs HTTP non-200"):
            self.check('{"data":{}}',job_http_status=404)

class GateImport(unittest.TestCase):
    def test_pinned_gate_sibling_dependency_loads_in_clean_coordinator(self):
        with TemporaryDirectory() as temp:
            root=Path(temp)
            dep="gh108_disposable_gate_sibling"
            (root/(dep+".py")).write_text("TOKEN='ok'\n")
            (root/"gate.py").write_text("from "+dep+" import TOKEN\n")
            oldpath=list(sys.path)
            try:
                sys.path[:]=[x for x in sys.path if x != str(root)]
                module=m._load_gate_source(str(root/"gate.py"),"gh108_gate_test")
                self.assertEqual(module.TOKEN,"ok")
            finally:
                sys.path[:]=oldpath
                sys.modules.pop(dep,None)
                sys.modules.pop("gh108_gate_test",None)

if __name__=="__main__":unittest.main()
