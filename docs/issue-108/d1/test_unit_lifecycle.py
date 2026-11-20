"""D1.3: protect the backend from accidental fence crash coupling.

These tests are a deterministic unit-file contract; host systemd failure
interleavings remain mandatory separate validation.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch
import unittest
import idle_window as m

ROOT=Path(__file__).resolve().parent
class UnitDependency(unittest.TestCase):
    def test_backend_requires_fence_at_start_without_lifetime_binding(self):
        unit=(ROOT/"units/opencode-serve.service.d.ghdev108.conf").read_text()
        self.assertIn("Wants=ghdev-ingress-fence.service",unit)
        self.assertIn("After=ghdev-ingress-fence.service",unit)
        self.assertNotIn("BindsTo=",unit.splitlines()[-5:])
        self.assertFalse(any(line.startswith(("BindsTo=","PartOf=","Requires=","Requisite=")) for line in unit.splitlines()))
        self.assertIn("idle_window.py check-start",unit)
        self.assertIn("--port 49375",unit)
    def test_fence_supervised_restarts_independently(self):
        unit=(ROOT/"units/ghdev-ingress-fence.service").read_text()
        self.assertIn("Restart=on-failure",unit)
        self.assertIn("GHDEV_WINDOW_JOURNAL=",unit)
        self.assertIn("GHDEV_BACKEND_PORT=49375",unit)


class StartupFence(unittest.TestCase):
    def setup_journal(self,state="idle"):
        scratch=TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        journal=Path(scratch.name)/"journal.json"
        m._write_journal(journal,state,"test-setup","disposable")
        return {"journal":str(journal),"ingress_status_url":"http://127.0.0.1:49374/__ghdev_ingress/status"}
    def test_live_managed_front_allows_initial_and_maintenance_start(self):
        for state,blocked in (("idle",False),("starting",True)):
            with self.subTest(state=state):
                cfg=self.setup_journal(state)
                stub=SimpleNamespace(returncode=0,stdout="ActiveState=active\nMainPID=1234\n")
                with patch.object(m,"_run",return_value=stub) as run, patch.object(m.Host,"ingress",return_value=1234) as probe:
                    self.assertTrue(m.front_start_ready(cfg,timeout_seconds=0))
                    probe.assert_called_once_with(expect_fenced=blocked)
                    self.assertIn("ghdev-ingress-fence.service",run.call_args.args[0])
    def test_failed_front_or_wrong_managed_pid_never_authorizes_start(self):
        cfg=self.setup_journal()
        conditions=[
            (SimpleNamespace(returncode=0,stdout="ActiveState=failed\nMainPID=0\n"),1234),
            (SimpleNamespace(returncode=1,stdout=""),1234),
            (SimpleNamespace(returncode=0,stdout="ActiveState=active\nMainPID=1234\n"),4321),
        ]
        for systemd, observed in conditions:
            with self.subTest(status=systemd.stdout,observed=observed):
                with patch.object(m,"_run",return_value=systemd),patch.object(m.Host,"ingress",return_value=observed):
                    with self.assertRaises(m.Blocked):
                        m.front_start_ready(cfg,timeout_seconds=0)
    def test_front_probe_error_and_nonstart_journal_fail_closed(self):
        cfg=self.setup_journal()
        stub=SimpleNamespace(returncode=0,stdout="ActiveState=active\nMainPID=1234\n")
        with patch.object(m,"_run",return_value=stub),patch.object(m.Host,"ingress",side_effect=m.Blocked("fence down")):
            with self.assertRaises(m.Blocked):
                m.front_start_ready(cfg,timeout_seconds=0)
        m._write_journal(Path(cfg["journal"]),"draining","test-drain","do not start")
        with patch.object(m,"_run",return_value=stub),patch.object(m.Host,"ingress",return_value=1234):
            with self.assertRaises(m.Blocked):
                m.front_start_ready(cfg,timeout_seconds=0)

if __name__=="__main__": unittest.main()
