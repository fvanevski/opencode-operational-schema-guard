"""CPU-only tests for separate Graphiti Core interpreter transport."""
import asyncio,json,sys,tempfile,unittest
from pathlib import Path
from graphiti_process_transport import ProcessCoreClient,ChildTerminalUnverified

class TransportTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.script=Path(self.temp.name)/"child.py"
        self.payload={"name":"example","episode_body":"fact","source_description":"git:source",
                      "reference_time":"2026-10-30T00:00:00+00:00","group_id":"issue70_fixture"}

    def stub(self,bad=False):
        self.script.write_text(
            "import json,sys\n"
            "i=json.loads(sys.stdin.read())\n"
            "record={'episode_uuid':'ep-1','readback':{'uuid':'ep-1',"
            "'group_id':i['group_id'],'name':i['name'],'content':"
            + ("'wrong'" if bad else "i['episode_body']") +
            "}}\n"
            "print('ISSUE70_TERMINAL='+json.dumps(record))\n")

    def test_child_terminal_readback(self):
        self.stub()
        c=ProcessCoreClient(python=sys.executable,worker=str(self.script),group="issue70_fixture")
        async def run():
            from datetime import datetime
            params={**self.payload,"reference_time":datetime.fromisoformat(self.payload["reference_time"])}
            result=await c.add_episode(**params)
            saved=await c.read_episode(result.episode.uuid,"issue70_fixture")
            return saved
        stored=asyncio.run(run())
        self.assertEqual(stored.uuid,"ep-1")
        self.assertEqual(stored.content,"fact")

    def test_child_mismatched_readback_blocks(self):
        self.stub(bad=True)
        c=ProcessCoreClient(python=sys.executable,worker=str(self.script),group="issue70_fixture")
        async def run():
            with self.assertRaises(ChildTerminalUnverified):
                await c.add_episode(**self.payload)
        asyncio.run(run())

    def test_non_disposable_target_rejected(self):
        self.stub()
        with self.assertRaises(ValueError):
            ProcessCoreClient(python=sys.executable,worker=str(self.script),group="graphiti_live")

if __name__=="__main__":unittest.main()
