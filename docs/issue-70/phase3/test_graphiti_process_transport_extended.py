"""Extended CPU-only transport failures: timeout, kill, malformed terminals,
duplicate submissions. No Graphiti import required (stub children)."""
import asyncio, json, os, signal, subprocess, sys, tempfile, time, unittest
from pathlib import Path
from graphiti_process_transport import (ProcessCoreClient, ChildTerminalUnverified,
                                        make_process_client_factory)
from graphiti_terminal import AwaitedCoreAdapter, EpisodeEnvelope, UnverifiedSource
from datetime import datetime, timezone

def _client(tmp, script_text, group="issue70_fixture", timeout=2):
    script = Path(tmp) / "child.py"
    script.write_text(script_text)
    return ProcessCoreClient(python=sys.executable, worker=str(script), group=group,
                             timeout_seconds=timeout)

def _payload(group="issue70_fixture"):
    return {"name": "example", "episode_body": "fact", "source_description": "git:source",
            "reference_time": datetime(2026, 10, 30, tzinfo=timezone.utc), "group_id": group}

class TransportFailureTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def test_timeout_kills_child_and_never_seals(self):
        c = _client(self.tmp.name, "import time\ntime.sleep(30)\n", timeout=1)
        async def run():
            with self.assertRaises(asyncio.TimeoutError):
                await c.add_episode(**_payload())
        asyncio.run(run())
        # The killed child must not have produced any terminal record.
        self.assertIsNone(c._persisted)

    def test_killed_child_blocks_with_nonzero_exit(self):
        c = _client(self.tmp.name, "import os,signal,sys\nos.kill(os.getpid(),signal.SIGKILL)\n")
        async def run():
            with self.assertRaises(ChildTerminalUnverified):
                await c.add_episode(**_payload())
        asyncio.run(run())

    def test_malformed_terminals_rejected(self):
        for body in ("", "ISSUE70_TERMINAL=not-json\n",
                     "ISSUE70_TERMINAL={}\nISSUE70_TERMINAL={}\n",
                     "other-line\n"):
            c = _client(self.tmp.name,
                        "import sys\nsys.stdout.write(%r)\n" % body)
            async def run(c=c):
                with self.assertRaises(ChildTerminalUnverified):
                    await c.add_episode(**_payload())
            asyncio.run(run())

    def test_group_conflict_rejected_before_child_spawn(self):
        marker = Path(self.tmp.name) / "spawned"
        c = _client(self.tmp.name,
                    "open(r'%s','w').write('x')\n" % marker, group="issue70_a")
        async def run():
            with self.assertRaises(ChildTerminalUnverified):
                await c.add_episode(**_payload(group="issue70_b"))
        asyncio.run(run())
        self.assertFalse(marker.exists())

    def test_duplicate_submission_executes_child_once(self):
        counter = Path(self.tmp.name) / "runs"
        script = (
            "import json,sys\n"
            "open(r'%s','a').write('1\\n')\n"
            "i=json.loads(sys.stdin.read())\n"
            "print('ISSUE70_TERMINAL='+json.dumps({'episode_uuid':'ep-9','readback':"
            "{'uuid':'ep-9','group_id':i['group_id'],'name':i['name'],"
            "'content':i['episode_body']}}))\n" % counter
        )
        c = _client(self.tmp.name, script)
        factory = make_process_client_factory(
            python=sys.executable, worker=str(c.worker), group="issue70_fixture")
        import sqlite3
        from contextlib import contextmanager
        db_path = str(Path(self.tmp.name) / "gate.sqlite3")
        @contextmanager
        def connection():
            db = sqlite3.connect(db_path)
            db.row_factory = sqlite3.Row
            try:
                yield db
                db.commit()
            finally:
                db.close()
        class FakeDB:
            def connect(self):
                return connection()
        async def readback(client, uid, group):
            return await client.read_episode(uid, group)
        ep = EpisodeEnvelope("a" * 64, "e" * 64, "issue70_fixture", "verified:one",
                             "authorized synthetic fact", "source:fixture",
                             datetime(2026, 10, 30, tzinfo=timezone.utc), "f" * 64)
        adapter = AwaitedCoreAdapter(FakeDB(), resolve=lambda _: ep,
                                     identity_fn=lambda _: ("a" * 64, "e" * 64),
                                     client_factory=factory, read_episode=readback)
        key1 = adapter.submit({"scope": {"group_id": "issue70_fixture"}})
        key2 = adapter.submit({"scope": {"group_id": "issue70_fixture"}})
        self.assertEqual(key1, "a" * 64)
        self.assertEqual(key2, "a" * 64)
        self.assertEqual(counter.read_text().count("\n"), 1)
        self.assertEqual(adapter.poll("a" * 64)["status"], "completed")

if __name__ == "__main__":
    unittest.main()
