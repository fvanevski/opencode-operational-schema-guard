"""Read-only recall query authority, no FalkorDB process required."""
import unittest
from graphiti_recall_service import term_for_query,episode_ids,format_rows

class RecallTests(unittest.TestCase):
    def test_keyword_bounded_and_no_secret_query(self):
        self.assertEqual(term_for_query("What changed in SystemAlpha?"),"systemalpha")
        self.assertIsNone(term_for_query("password=secret changed"))
        self.assertIsNone(term_for_query("hello"))

    def test_provenance_mandatory(self):
        rows=[{"fact":"A uses B","episode_ids":["u1"]}]
        self.assertEqual(format_rows(rows,{},"grp"),[])
        approved={"u1":{"source_ref":"git:"+"a"*40+":memory-facts/f.json","exclusive":False}}
        x=format_rows(rows,approved,"grp")
        self.assertEqual(len(x),1)
        self.assertEqual(x[0]["validation_status"],"not_required")

    def test_exclusive_state_unverified_without_validator_record(self):
        rows=[{"fact":"A uses C","episode_ids":'["u2"]'}]
        approved={"u2":{"source_ref":"git:"+"b"*40+":memory-facts/s.json","exclusive":True}}
        x=format_rows(rows,approved,"grp")
        self.assertEqual(x[0]["validation_status"],"UNVERIFIED")
        self.assertEqual(x[0]["exclusive"],True)

    def test_multi_episode_disposition_is_order_independent(self):
        from itertools import permutations
        refs=["git:"+c*40+":memory-facts/f.json" for c in ("a","b","c")]
        receipts={
            "pass":{"source_ref":refs[0],"exclusive":True,"validation_status":"PASS"},
            "bad":{"source_ref":refs[1],"exclusive":True,"validation_status":"INCONSISTENT"},
            "ordinary":{"source_ref":refs[2],"exclusive":False,"validation_status":"not_required"},
        }
        for ids in permutations(["pass","bad"]):
            facts=format_rows([{"fact":"Service uses NATS","episode_ids":list(ids)}],receipts,"grp")
            self.assertEqual(facts[0]["validation_status"],"INCONSISTENT")
            self.assertEqual(set(facts[0]["source_refs"]),set(refs[:2]))
        for ids in permutations(["pass","ordinary"]):
            facts=format_rows([{"fact":"Service uses NATS","episode_ids":list(ids)}],receipts,"grp")
            self.assertEqual(facts[0]["validation_status"],"UNVERIFIED")
            self.assertTrue(facts[0]["exclusive"])
        for ids in permutations(["pass","missing"]):
            self.assertEqual(format_rows([{"fact":"Service uses NATS","episode_ids":list(ids)}],
                             receipts,"grp")[0]["validation_status"],"UNVERIFIED")

    def test_multi_episode_only_pass_when_every_exclusive_receipt_passes(self):
        approved={"a":{"source_ref":"git:"+"a"*40+":memory-facts/a.json",
                       "exclusive":True,"validation_status":"PASS"},
                  "b":{"source_ref":"git:"+"b"*40+":memory-facts/b.json",
                       "exclusive":True,"validation_status":"PASS"}}
        for ordered in (["a","b"],["b","a"]):
            row={"fact":"Service uses NATS","episode_ids":ordered}
            self.assertEqual(format_rows([row],approved,"grp")[0]["validation_status"],"PASS")
        approved["b"]["validation_status"]="INCOMPLETE"
        self.assertEqual(format_rows([row],approved,"grp")[0]["validation_status"],"INCOMPLETE")
        approved["b"]["validation_status"]="UNVERIFIED"
        self.assertEqual(format_rows([row],approved,"grp")[0]["validation_status"],"UNVERIFIED")

    def test_episode_overflow_never_grants_pass(self):
        approved={f"e{i}":{"source_ref":"git:"+"a"*40+":memory-facts/a.json",
                          "exclusive":True,"validation_status":"PASS"} for i in range(33)}
        row={"fact":"Service uses NATS","episode_ids":[f"e{i}" for i in range(33)]}
        self.assertEqual(format_rows([row],approved,"grp")[0]["validation_status"],"UNVERIFIED")

    def test_duplicate_unproven_and_secret_rows_filtered(self):
        rows=[{"fact":"A uses C","episode_ids":["u1"]},
              {"fact":"A uses C","episode_ids":["u1"]},
              {"fact":"password=secret","episode_ids":["u1"]}]
        approved={"u1":{"source_ref":"git:"+"a"*40+":memory-facts/s.json","exclusive":False}}
        self.assertEqual(len(format_rows(rows,approved,"grp",limit=3)),1)

if __name__=="__main__":unittest.main()
