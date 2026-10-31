"""CPU-only contract tests; direct Graphiti Core is injected, not mocked MCP ack."""
import asyncio
from datetime import datetime,timezone
from pathlib import Path
import sqlite3
import tempfile
import unittest
from types import SimpleNamespace
from graphiti_terminal import AwaitedCoreAdapter, EpisodeEnvelope, IngestJournal, IngestConflict, UnverifiedSource


class TestDB:
    def __init__(self,path): self.path=path
    def connect(self):
        # Production QueueDB.connect() uses the same sqlite3 connection contract.
        from contextlib import contextmanager
        @contextmanager
        def connection():
            db=sqlite3.connect(self.path)
            db.row_factory=sqlite3.Row
            try:
                yield db
                db.commit()
            except BaseException:
                db.rollback()
                raise
            finally:
                db.close()
        return connection()


class Graph:
    def __init__(self): self.writes=0;self.saved={};self.drop=False
    async def add_episode(self,**kwargs):
        self.writes+=1
        item=SimpleNamespace(uuid="episode-"+str(self.writes),
            group_id=kwargs["group_id"],name=kwargs["name"],content=kwargs["episode_body"])
        self.saved[item.uuid]=item
        if self.drop:raise ConnectionError("lost response after side effect")
        return SimpleNamespace(episode=item)


class TerminalTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db=TestDB(str(Path(self.tmp.name)/"existing-gate.sqlite3"))
        self.graph=Graph()
        self.ep=EpisodeEnvelope(
            "a"*64,"e"*64,"group-a","verified:one","authorized synthetic fact",
            "source:fixture",datetime(2026,10,30,tzinfo=timezone.utc),"f"*64)
        self.candidate={"scope":{"group_id":"group-a"}}
        async def get_by_uuid(client,uuid,group):
            await asyncio.sleep(0)
            return client.saved.get(uuid)
        self.adapter=AwaitedCoreAdapter(self.db,resolve=lambda _:self.ep,
            identity_fn=lambda _:("a"*64,"e"*64),
            client_factory=lambda:self.graph,read_episode=get_by_uuid)

    def test_trusted_transition_generates_canonical_predicate_instruction(self):
        from dataclasses import replace
        from graphiti_terminal import transition_extraction_instructions
        contract={"group_id":"group-a","subject":"Service",
                  "predicate":"USES_AS_JOB_QUEUE_BACKEND",
                  "transition":{"from":"Redis","to":"NATS",
                                "effective_at":"2026-10-30T00:00:00Z"}}
        self.ep=replace(self.ep,transition_contract=contract)
        submitted=[]
        original=self.graph.add_episode
        async def capture(**kwargs):
            submitted.append(kwargs)
            return await original(**kwargs)
        self.graph.add_episode=capture
        self.assertEqual(self.adapter.submit(self.candidate),"a"*64)
        self.assertEqual(self.adapter.poll("a"*64)["status"],"completed")
        self.assertEqual(len(submitted),1)
        opts=submitted[0]
        self.assertIn("custom_extraction_instructions",opts)
        self.assertIn("USES_AS_JOB_QUEUE_BACKEND",opts["custom_extraction_instructions"])
        self.assertIn("invalid_at",opts["custom_extraction_instructions"])
        self.assertEqual(opts["group_id"],"group-a")
        self.assertLessEqual(len(opts["custom_extraction_instructions"].encode()),2048)
        self.assertIn("USES_AS_JOB_QUEUE_BACKEND",
                      transition_extraction_instructions(contract))

    def test_oversized_unicode_instruction_rejected_before_receipt(self):
        from dataclasses import replace
        contract={"group_id":"group-a","subject":"界"*256,
                  "predicate":"USES_AS_JOB_QUEUE_BACKEND",
                  "transition":{"from":"Redis","to":"NATS",
                                "effective_at":"2026-10-30T00:00:00Z"}}
        self.ep=replace(self.ep,transition_contract=contract)
        with self.assertRaisesRegex(UnverifiedSource,"instructions exceed bound"):
            self.adapter.submit(self.candidate)
        # No journal identity exists to reconcile because no work was
        # reserved, and the Graphiti backend was never called.
        self.assertIsNone(self.adapter.journal.read("a"*64))
        self.assertEqual(self.graph.writes,0)

    def test_valid_unicode_instruction_stays_supported(self):
        from dataclasses import replace
        contract={"group_id":"group-a","subject":"界"*16,
                  "predicate":"USES_AS_JOB_QUEUE_BACKEND",
                  "transition":{"from":"Redis","to":"NATS",
                                "effective_at":"2026-10-30T00:00:00Z"}}
        self.ep=replace(self.ep,transition_contract=contract)
        self.assertEqual(self.adapter.submit(self.candidate),"a"*64)
        self.assertEqual(self.graph.writes,1)
        self.assertEqual(self.adapter.poll("a"*64)["status"],"completed")

    def test_ordinary_episode_does_not_inject_temporal_instructions(self):
        submitted=[]
        original=self.graph.add_episode
        async def capture(**kwargs):
            submitted.append(kwargs)
            return await original(**kwargs)
        self.graph.add_episode=capture
        self.adapter.submit(self.candidate)
        self.assertNotIn("custom_extraction_instructions",submitted[0])

    def test_awaited_persistence_exact_readback_and_duplicate(self):
        self.assertEqual(self.adapter.submit(self.candidate),"a"*64)
        self.assertEqual(self.adapter.poll("a"*64)["status"],"completed")
        self.assertTrue(self.adapter.poll("a"*64)["persisted"])
        self.adapter.submit(self.candidate)
        self.assertEqual(self.graph.writes,1)

    def test_lost_response_after_side_effect_blocks_retry(self):
        self.graph.drop=True
        with self.assertRaises(ConnectionError):self.adapter.submit(self.candidate)
        self.graph.drop=False
        self.adapter.submit(self.candidate)
        self.assertEqual(self.graph.writes,1)
        self.assertEqual(self.adapter.poll("a"*64)["status"],"blocked_reconcile")

    def test_restart_blocks_processing_without_replaying(self):
        journal=IngestJournal(self.db)
        journal.reserve(self.ep)
        self.assertTrue(journal.begin("a"*64))
        self.assertEqual(IngestJournal(self.db).recover_restart(),1)
        self.adapter.submit(self.candidate)
        self.assertEqual(self.graph.writes,0)

    def test_conflicting_source_payload_rejected(self):
        self.adapter.submit(self.candidate)
        other=EpisodeEnvelope(**{**self.ep.__dict__,"episode_body":"changed body"})
        with self.assertRaises(IngestConflict):IngestJournal(self.db).reserve(other)

    def test_no_terminal_without_both_proofs(self):
        j=IngestJournal(self.db);j.reserve(self.ep);j.begin("a"*64)
        for a,r in ((False,True),(True,False)):
            with self.assertRaises(ValueError):j.seal("a"*64,"fabricated",awaited=a,readback=r)

    def test_wrong_graph_result_and_scope_block(self):
        async def wrong(client,uuid,group):
            return SimpleNamespace(uuid=uuid,group_id="other",
                                   name=self.ep.name,content=self.ep.episode_body)
        self.adapter.read_episode=wrong
        with self.assertRaises(RuntimeError):self.adapter.submit(self.candidate)
        self.assertEqual(self.adapter.poll("a"*64)["status"],"blocked_reconcile")

    def test_unverified_source_resolver_fails_before_extraction(self):
        self.adapter.resolve=lambda _:None
        with self.assertRaises(UnverifiedSource):self.adapter.submit(self.candidate)
        self.assertEqual(self.graph.writes,0)

    def test_client_is_closed_after_verified_terminal(self):
        closed = []
        async def close(client):
            closed.append(client)
        self.adapter.close_client=close
        self.adapter.submit(self.candidate)
        self.assertEqual(closed,[self.graph])
        self.assertEqual(self.adapter.poll("a"*64)["status"],"completed")

    def test_client_is_closed_on_ambiguous_graph_exception(self):
        closed = []
        self.graph.drop=True
        self.adapter.close_client=lambda client: closed.append(client)
        with self.assertRaises(ConnectionError):
            self.adapter.submit(self.candidate)
        self.assertEqual(closed,[self.graph])
        self.assertEqual(self.adapter.poll("a"*64)["status"],"blocked_reconcile")

    def test_failed_cleanup_blocks_terminal_seal(self):
        async def failed_cleanup(client):
            raise RuntimeError("driver close not confirmed")
        self.adapter.close_client=failed_cleanup
        with self.assertRaisesRegex(RuntimeError,"driver close not confirmed"):
            self.adapter.submit(self.candidate)
        self.assertEqual(self.graph.writes,1)
        self.assertEqual(self.adapter.poll("a"*64)["status"],"blocked_reconcile")

    def test_candidate_mismatched_group_fails_before_extraction(self):
        with self.assertRaises(UnverifiedSource):
            self.adapter.submit({"scope":{"group_id":"cross-group"}})
        self.assertEqual(self.graph.writes,0)

    def test_attestor_cannot_substitute_another_work_identity(self):
        self.adapter.identity_fn=lambda _:("b"*64,"e"*64)
        with self.assertRaisesRegex(UnverifiedSource,"identity mismatch"):
            self.adapter.submit(self.candidate)
        self.assertEqual(self.graph.writes,0)


if __name__=="__main__":unittest.main()
