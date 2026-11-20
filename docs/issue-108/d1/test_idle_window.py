import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import idle_window as m

class FakeHost:
    def __init__(self, result=0, work=True, fail=None):
        self.result=result; self.work=work; self.fail=fail
        self.service="active"; self.pid="4321"; self.events=[]
        self.calls=0
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
    def listener_up(self):self.events.append("up");return self.service=="active"

class Safety(unittest.TestCase):
    def setUp(self):
        self.temp=TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name)
        trusted=root/"source";trusted.write_text("source",encoding="utf-8")
        self.cfg={"journal":str(root/"journal.json"),"coordinator_lock":str(root/"lock"),
                  "pinned_files":{str(trusted):m._sha256(str(trusted))},"quiet_seconds":0}
    def run_cycle(self,host): return m.run_cycle(self.cfg,host,sleep=lambda _:None)
    def state(self):
        item=m._safe_journal(Path(self.cfg["journal"]))
        return item["state"] if item else None
    def test_no_work_never_stops(self):
        host=FakeHost(work=False);self.assertEqual(self.run_cycle(host),"no_work")
        self.assertNotIn("stop",host.events);self.assertIn(self.state(),(None,"idle"))
    def test_busy_never_stops_or_fences(self):
        for how in ("busy","second_busy","gate_busy","ingress_busy"):
            with self.subTest(how=how):
                host=FakeHost(fail=how)
                with self.assertRaises(m.Blocked):self.run_cycle(host)
                self.assertNotIn("stop",host.events);self.assertIn(self.state(),(None,"idle"))
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
    def test_corrupt_journal_denies_start(self):
        p=Path(self.cfg["journal"]);p.write_text('{broken')
        with self.assertRaises(Exception):m.check_start(p)
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

if __name__=="__main__":unittest.main()
