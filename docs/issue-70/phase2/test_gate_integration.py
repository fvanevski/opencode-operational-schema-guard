"""Phase 2 integration against the existing gate SQLite/typed work contract.

Run with installed jsonschema and a Python interpreter compatible with gate.
Tests use disposable state and no Graphiti/LLM/network service.
"""
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from datetime import datetime,timezone
from dataclasses import replace
from types import SimpleNamespace

ROOT=Path(__file__).resolve().parents[1]
GATE=ROOT/"implementation"/"i1-integrated"/"candidate"/"gate"
sys.path.insert(0,str(GATE/"tests"))
sys.path.insert(0,str(GATE))
from test_gate import gate,config
from test_shared_work import candidate
from shared_work import SharedWorkQueue, work_key,source_key,normalized_candidate
from graphiti_terminal import EpisodeEnvelope,AwaitedCoreAdapter


class FakeCore:
    def __init__(self):self.writes=0;self.store={}
    async def add_episode(self,**kwargs):
        self.writes+=1
        episode=SimpleNamespace(uuid="graph-"+str(self.writes),
            group_id=kwargs["group_id"],name=kwargs["name"],content=kwargs["episode_body"])
        self.store[episode.uuid]=episode
        return SimpleNamespace(episode=episode)


class GateIntegration(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.cfg=replace(config(self.tmp.name),graphiti_enabled=True,
                         drain_enabled=True,process_names=(),quiet_grace_seconds=0)
        self.db=gate.QueueDB(self.cfg.database)
        self.shared=SharedWorkQueue(self.db)
        self.original=normalized_candidate(candidate())
        self.key=work_key(self.original)
        self.ep=EpisodeEnvelope(
            self.key,source_key(self.original),self.original["scope"]["group_id"],
            "verified:"+self.key[:12],"An approved synthetic source event.",
            "operator-source",datetime(2026,10,30,tzinfo=timezone.utc),"f"*64)
        self.graph=FakeCore()
        async def exact(core,uuid,group):
            return core.store.get(uuid)
        self.adapter=AwaitedCoreAdapter(self.db,
            resolve=lambda _:self.ep,
            identity_fn=lambda event:(work_key(event),source_key(event)),
            client_factory=lambda:self.graph,read_episode=exact)

    def test_deferred_requires_attested_promotion(self):
        first=self.shared.enqueue(candidate())
        self.assertEqual(first["status"],"deferred_unverified")
        self.assertIsNone(self.shared.ready())
        with self.assertRaises(Exception):
            forged=EpisodeEnvelope("b"*64,self.ep.source_event_key,self.ep.group_id,
                self.ep.name,self.ep.episode_body,self.ep.source_description,
                self.ep.reference_time,self.ep.attestation_digest)
            self.shared.admit_attested(self.original,forged,source_authority="operator-policy")
        actual=self.shared.admit_attested(
            self.original,self.ep,source_authority="operator-policy")
        self.assertEqual(actual,{"work_key":self.key,"status":"queued"})
        self.assertIsNotNone(self.shared.ready())
        self.assertEqual(self.shared.admit_attested(
            self.original,self.ep,source_authority="operator-policy")["status"],"queued")

    def test_gate_claim_submit_and_terminal_share_stable_identity(self):
        self.shared.enqueue(candidate())
        self.shared.admit_attested(self.original,self.ep,source_authority="operator-policy")
        worker=gate.Worker(self.cfg,self.db,threading.Event(),self.adapter)
        worker._metrics=lambda:(0,0)
        worker._active_harness_processes=lambda:[]
        self.assertFalse(worker.tick())  # quiet-grace first observation
        self.assertTrue(worker.tick())
        self.assertEqual(self.graph.writes,1)
        state=self.shared.status()[0]
        self.assertEqual(state["status"],"completed")
        self.assertEqual(state["backend_identity"],self.key)
        self.assertFalse(worker.tick()) # no second graph attempt
        self.assertEqual(self.graph.writes,1)

    def test_ambiguous_core_failure_blocks_second_admission(self):
        self.shared.enqueue(candidate())
        self.shared.admit_attested(self.original,self.ep,source_authority="operator-policy")
        worker=gate.Worker(self.cfg,self.db,threading.Event(),self.adapter)
        worker._metrics=lambda:(0,0)
        worker._active_harness_processes=lambda:[]
        async def uncertain(**_):
            self.graph.writes+=1
            raise ConnectionError("response lost")
        self.graph.add_episode=uncertain
        self.assertFalse(worker.tick())
        self.assertTrue(worker.tick())
        self.assertEqual(self.shared.status()[0]["status"],"blocked_reconcile")
        self.assertFalse(worker.tick())
        self.assertEqual(self.graph.writes,1)


if __name__=="__main__":unittest.main()
