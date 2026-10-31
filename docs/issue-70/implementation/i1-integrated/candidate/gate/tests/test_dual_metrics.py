"""Provider switching and fail-closed admission regression tests."""
import io
import tempfile
import threading
import unittest
import urllib.error
from dataclasses import replace
from unittest import mock
from test_gate import gate, config

PAIRS = [
    ("vllm:num_requests_running", "vllm:num_requests_waiting"),
    ("llamacpp:requests_processing", "llamacpp:requests_deferred"),
    ("ninfer_requests_running", "ninfer_requests_waiting"),
]

def payload(pair, running=0, waiting=0):
    return f'{pair[0]}{{engine="0"}} {running}\n{pair[1]} {waiting}\n'

class DualMetricsTests(unittest.TestCase):
    def test_idle_busy_and_sums_for_both(self):
        for pair in PAIRS:
            for counts in [(0,0), (1,0), (0,2)]:
                with self.subTest(pair=pair, counts=counts):
                    self.assertEqual(gate.parse_vllm_metrics(payload(pair,*counts)), counts)
            self.assertEqual(gate.parse_vllm_metrics(payload(pair,1,2)+f'{pair[0]}{{engine="1"}} 3\n'), (4,2))

    def test_ninfer_materializing_paused_and_ready_gates(self):
        ninfer_base = "ninfer_engine_ready 1\nninfer_requests_running 0\nninfer_requests_waiting 0\n"
        self.assertEqual(
            gate.parse_vllm_metrics(ninfer_base + "ninfer_requests_materializing 1\nninfer_requests_paused 2\n"),
            (1.0, 2.0),
        )
        with self.assertRaises(ValueError):
            gate.parse_vllm_metrics("ninfer_engine_ready 0\nninfer_requests_running 0\nninfer_requests_waiting 0\n")
        with self.assertRaises(ValueError):
            gate.parse_vllm_metrics("ninfer_requests_materializing 0\nninfer_requests_paused 0\n")

    def test_missing_malformed_and_mixed_fail_closed(self):
        invalid = [
            '',
            '# TYPE vllm:num_requests_running gauge',
            payload(PAIRS[0]) + payload(PAIRS[1]),
            payload(PAIRS[0]) + payload(PAIRS[2]),
            payload(PAIRS[1]) + payload(PAIRS[2]),
            f'{PAIRS[0][0]} 0\n{PAIRS[1][1]} 0',
            f'{PAIRS[0][0]} 0\n{PAIRS[2][1]} 0',
            payload(PAIRS[0]) + 'ninfer_requests_paused 0\n',
        ]
        for pair in PAIRS:
            invalid += [f'{pair[0]} 0', payload(pair)+f'{pair[0]}{{engine="bad"}} invalid',
                        payload(pair,'NaN'), payload(pair,'Inf'), payload(pair,-1),payload(pair,'1e999'),
                        payload(pair)+f'{pair[1]} 0 trailing']
        for body in invalid:
            with self.subTest(body=body), self.assertRaises(ValueError):
                gate.parse_vllm_metrics(body)

    def test_explicit_custom_names_and_invalid_auto_pair(self):
        self.assertEqual(gate.parse_vllm_metrics('custom:run 0\ncustom:wait 1', 'custom:run','custom:wait'), (0,1))
        with self.assertRaises(ValueError): gate.parse_vllm_metrics(payload(PAIRS[0]),'auto',PAIRS[0][1])

    def test_worker_switches_both_directions_without_restart(self):
        with tempfile.TemporaryDirectory() as root:
            db=mock.MagicMock()
            # The legacy graphiti-disable recheck reads state via connect().
            db.connect.return_value.__enter__.return_value.execute.return_value.fetchone.return_value=None
            worker=gate.Worker(config(root), db, threading.Event())
            responses=[]
            for pair in [PAIRS[0],PAIRS[1],PAIRS[2],PAIRS[0]]:
                response=io.BytesIO(payload(pair,2,1).encode()); response.status=200; responses.append(response)
            with mock.patch.object(gate.urllib.request,'urlopen',side_effect=responses):
                self.assertEqual([worker._metrics() for _ in responses],[(2,1)]*4)

    def test_worker_falls_back_on_connection_refused_or_404_only(self):
        with tempfile.TemporaryDirectory() as root:
            cfg = replace(
                config(root),
                metrics_url="http://127.0.0.1:8001/metrics",
                metrics_fallback_urls=("http://127.0.0.1:8002/metrics",),
            )
            db=mock.MagicMock()
            db.connect.return_value.__enter__.return_value.execute.return_value.fetchone.return_value=None
            worker = gate.Worker(cfg, db, threading.Event())
            ok_resp = io.BytesIO(payload(PAIRS[0], 0, 0).encode())
            ok_resp.status = 200
            with mock.patch.object(
                gate.urllib.request,
                "urlopen",
                side_effect=[urllib.error.URLError("refused"), ok_resp],
            ) as mocked:
                self.assertEqual(worker._metrics(), (0.0, 0.0))
                self.assertEqual(mocked.call_count, 2)

            bad_payload = io.BytesIO(b"ninfer_requests_running 0\n")
            bad_payload.status = 200
            with mock.patch.object(
                gate.urllib.request,
                "urlopen",
                side_effect=[bad_payload, ok_resp],
            ) as mocked:
                with self.assertRaises(ValueError):
                    worker._metrics()
                self.assertEqual(mocked.call_count, 1)

    def test_each_provider_busy_blocks_and_idle_keeps_grace(self):
        with tempfile.TemporaryDirectory() as root:
            db=mock.MagicMock(); db.inflight.return_value=None; db.next_ready.return_value={'state':'pending'}
            # The disabled-Graphiti admission recheck reads existing state
            # through the connect() context manager. Model a legacy database
            # without a memory_work table so the recheck reports available.
            db.connect.return_value.__enter__.return_value.execute.return_value.fetchone.return_value=None
            worker=gate.Worker(replace(config(root), drain_enabled=True, process_names=(),quiet_grace_seconds=30), db, threading.Event())
            for pair in PAIRS:
                for running,waiting in [(1,0),(0,1),(0,0)]:
                    response=io.BytesIO(payload(pair,running,waiting).encode()); response.status=200
                    with mock.patch.object(gate.urllib.request,'urlopen',return_value=response):
                        self.assertFalse(worker.tick())
                    self.assertEqual(worker.admission_status()['state'],'vllm_busy' if running or waiting else 'quiet_grace')
                    db.claim.assert_not_called()
            for error in [urllib.error.URLError('unavailable'), urllib.error.HTTPError('http://test',501,'disabled',{},None)]:
                with mock.patch.object(gate.urllib.request,'urlopen',side_effect=error), self.assertRaises(type(error)):
                    worker.tick()
                db.claim.assert_not_called()

if __name__ == '__main__': unittest.main()
