"""CPU-only opt-in Git source attestation (no Graphiti or network)."""
from pathlib import Path
import json
import subprocess
import tempfile
import unittest
from git_source_authority import GitFactResolver
from graphiti_terminal import UnverifiedSource

def run(repo,*args):
    return subprocess.check_output(["git","-C",str(repo),*args],stderr=subprocess.DEVNULL).decode().strip()

class GitFactTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo=Path(self.tmp.name)
        run(self.repo,"init","-q")
        run(self.repo,"config","user.name","Fixture")
        run(self.repo,"config","user.email","fixture@example.invalid")
        path=self.repo/"memory-facts"/"accepted.json"
        path.parent.mkdir()
        self.record={"schema_version":1,"workspace_id":"workspace-x","group_id":"group-x",
                     "category":"durable_decision","episode_body":"Architecture records use immutable Git facts.",
                     "reference_time":"2026-10-30T00:00:00Z"}
        path.write_text(json.dumps(self.record))
        run(self.repo,"add","memory-facts/accepted.json")
        run(self.repo,"commit","-qm","add approved record")
        self.commit=run(self.repo,"rev-parse","HEAD")
        self.branch=run(self.repo,"symbolic-ref","HEAD")
        self.policy={"enabled":True,"source_type":"git-record-v1","revision":"v1",
                     "repository":str(self.repo),"trusted_ref":self.branch,
                     "source_prefix":"memory-facts","workspaces":["workspace-x"],
                     "groups":["group-x"],"categories":["durable_decision"]}
        self.candidate={"destination":"graphiti","scope":{"workspace_id":"workspace-x","group_id":"group-x"},
                        "category":"durable_decision","fact_ref":"git:"+self.commit+":memory-facts/accepted.json"}
        self.make=lambda: GitFactResolver(policy=self.policy,work_key_fn=lambda _: "a"*64,
                                            source_key_fn=lambda _: "b"*64)

    def test_authenticated_git_fact_without_per_event_approval(self):
        ep=self.make()(self.candidate)
        self.assertEqual(ep.episode_body,self.record["episode_body"])
        self.assertEqual(ep.group_id,"group-x")
        self.assertEqual(ep.work_key,"a"*64)

    def test_disabled_policy_rejects(self):
        self.policy["enabled"]=False
        with self.assertRaises(UnverifiedSource):self.make()(self.candidate)

    def test_scope_and_untrusted_path_reject(self):
        for candidate in (
            {**self.candidate,"scope":{"workspace_id":"wrong","group_id":"group-x"}},
            {**self.candidate,"fact_ref":"git:"+self.commit+":../memory-facts/accepted.json"},
            {**self.candidate,"fact_ref":"git:"+self.commit+":other/accepted.json"},
        ):
            with self.assertRaises(UnverifiedSource):self.make()(candidate)

    def test_uncommitted_worktree_mutation_has_no_effect(self):
        (self.repo/"memory-facts"/"accepted.json").write_text('{"episode_body":"malicious worktree"}')
        self.assertEqual(self.make()(self.candidate).episode_body,self.record["episode_body"])

    def test_branch_reachability_enforced(self):
        path=self.repo/"memory-facts"/"untrusted.json"
        path.write_text(json.dumps(self.record))
        run(self.repo,"add","memory-facts/untrusted.json")
        run(self.repo,"commit","-qm","untrusted temporary commit")
        later=run(self.repo,"rev-parse","HEAD")
        run(self.repo,"reset","--hard",self.commit)
        cand={**self.candidate,"fact_ref":"git:"+later+":memory-facts/untrusted.json"}
        with self.assertRaises(UnverifiedSource):self.make()(cand)

    def test_secret_at_committed_source_rejected(self):
        path=self.repo/"memory-facts"/"secret.json"
        record={**self.record,"episode_body":"password=secret"}
        path.write_text(json.dumps(record))
        run(self.repo,"add","memory-facts/secret.json")
        run(self.repo,"commit","-qm","secret test")
        commit=run(self.repo,"rev-parse","HEAD")
        cand={**self.candidate,"fact_ref":"git:"+commit+":memory-facts/secret.json"}
        with self.assertRaises(UnverifiedSource):self.make()(cand)

if __name__=="__main__":
    unittest.main()
