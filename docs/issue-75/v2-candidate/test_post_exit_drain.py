"""CPU-only admission tests, no host services or model inference."""
import fcntl
import importlib.util
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase, mock

spec = importlib.util.spec_from_file_location(
    "issue75_post_exit", Path(__file__).with_name("post-exit-drain.py"))
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

class FakeWorker:
    active = []
    def _active_harness_processes(self):
        return type(self).active

class FakeGate:
    Worker = FakeWorker
    @staticmethod
    def parse_vllm_metrics(payload, _running, _waiting):
        numbers = payload.split("/")
        return float(numbers[0]), float(numbers[1])

CFG = SimpleNamespace(
    metrics_url="http://127.0.0.1:8002/metrics",
    metrics_fallback_urls=(), metrics_running="auto", metrics_waiting="auto")

def http_response(payload):
    response = mock.MagicMock()
    response.status = 200
    response.read.return_value = payload.encode()
    response.__enter__.return_value = response
    return response

class PostExitAdmissionTests(TestCase):
    def test_bounded_lock_wait_does_not_bypass_held_lease(self):
        # Two handles to the SAME inode exercise actual flock contention.
        with tempfile.TemporaryDirectory() as temp:
            lockpath = Path(temp) / 'agent.lock'
            with lockpath.open('a+') as holder, lockpath.open('a+') as contender:
                fcntl.flock(holder.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                with self.assertRaisesRegex(RuntimeError, 'lease held'):
                    runner.acquire_gate_lock(contender, 0)
                fcntl.flock(holder.fileno(), fcntl.LOCK_UN)
                runner.acquire_gate_lock(contender, 0)
                fcntl.flock(contender.fileno(), fcntl.LOCK_UN)

    def setUp(self):
        FakeWorker.active = []

    @mock.patch.object(runner.urllib.request, "urlopen")
    def test_idle_only(self, urlopen):
        urlopen.return_value = http_response("0/0")
        runner.observation(FakeGate, CFG)

    @mock.patch.object(runner.urllib.request, "urlopen")
    def test_busy_running_is_not_downgraded_to_fallback(self, urlopen):
        urlopen.return_value = http_response("1/0")
        with self.assertRaisesRegex(RuntimeError, "scheduler busy"):
            runner.observation(FakeGate, CFG)

    @mock.patch.object(runner.urllib.request, "urlopen")
    def test_busy_waiting(self, urlopen):
        urlopen.return_value = http_response("0/1")
        with self.assertRaisesRegex(RuntimeError, "scheduler busy"):
            runner.observation(FakeGate, CFG)

    @mock.patch.object(runner.urllib.request, "urlopen")
    def test_active_harness_blocks_before_metrics(self, urlopen):
        FakeWorker.active = [{"pid": 1, "comm": "opencode"}]
        with self.assertRaisesRegex(RuntimeError, "harness active"):
            runner.observation(FakeGate, CFG)
        urlopen.assert_not_called()

    @mock.patch.object(runner.urllib.request, "urlopen")
    def test_unavailable_metrics_fail_closed(self, urlopen):
        urlopen.side_effect = OSError("metrics unavailable")
        with self.assertRaisesRegex(RuntimeError, "not verified"):
            runner.observation(FakeGate, CFG)
