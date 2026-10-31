"""Negative source-authority checks: forged candidate data cannot self-promote."""
from datetime import datetime
import hashlib,json,tempfile,unittest
from pathlib import Path
from graphiti_terminal import UnverifiedSource,digest
from source_authority import PinnedSourceResolver


class SourceTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.candidate={"scope":{"workspace_id":"w","group_id":"g"},
            "category":"verified_architecture_fact","destination":"graphiti","fact_ref":"repo:fact-a"}
        self.event_key="e"*64
        self.work_key="a"*64
        self.record={"source_event_key":self.event_key,"workspace_id":"w","group_id":"g",
            "category":"verified_architecture_fact","fact_ref":"repo:fact-a",
            "episode_body":"The example system uses a durable queue.",
            "reference_time":"2026-10-30T00:00:00Z"}
        self.path=self.root/"fact.json"
        self.path.write_text(json.dumps(self.record))
        self.sha=hashlib.sha256(self.path.read_bytes()).hexdigest()
        self.policy={"enabled":True,"revision":"r1","workspace_id":"w","group_id":"g",
            "categories":["verified_architecture_fact"],
            "approved_events":{self.event_key:{"file":"fact.json","sha256":self.sha}}}
        self.resolve=PinnedSourceResolver(policy=self.policy,source_root=self.root,
            work_key_fn=lambda c:self.work_key,source_key_fn=lambda c:self.event_key)

    def test_pinned_authorized_fact(self):
        x=self.resolve(self.candidate)
        self.assertEqual(x.episode_body,self.record["episode_body"])
        self.assertEqual(x.work_key,self.work_key)
        self.assertEqual(x.reference_time.tzinfo is not None,True)

    def test_unpinned_or_disabled_event(self):
        self.policy["enabled"]=False
        with self.assertRaises(UnverifiedSource):self.resolve(self.candidate)
        self.policy["enabled"]=True
        self.policy["approved_events"]={}
        with self.assertRaises(UnverifiedSource):self.resolve(self.candidate)

    def test_tampered_source_record(self):
        self.record["episode_body"]="Changed without independent approval"
        self.path.write_text(json.dumps(self.record))
        with self.assertRaises(UnverifiedSource):self.resolve(self.candidate)

    def test_group_or_fact_forgery(self):
        for change in ({"scope":{"workspace_id":"w","group_id":"foreign"}},
                       {"fact_ref":"repo:forged"}):
            with self.assertRaises(UnverifiedSource):self.resolve({**self.candidate,**change})

    def test_private_content_rejected(self):
        self.record["episode_body"]="password=secret"
        self.path.write_text(json.dumps(self.record))
        self.policy["approved_events"][self.event_key]["sha256"]=hashlib.sha256(self.path.read_bytes()).hexdigest()
        with self.assertRaises(UnverifiedSource):self.resolve(self.candidate)

    def test_traversal_and_symlink_escape(self):
        self.policy["approved_events"][self.event_key]["file"]="../outside"
        with self.assertRaises(UnverifiedSource):self.resolve(self.candidate)
        outside=Path(self.tmp.name).parent/"issue70-nonexistent-source.json"
        (self.root/"link.json").symlink_to(outside)
        self.policy["approved_events"][self.event_key]["file"]="link.json"
        with self.assertRaises(UnverifiedSource):self.resolve(self.candidate)


if __name__=="__main__":unittest.main()
