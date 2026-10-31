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

    def test_duplicate_unproven_and_secret_rows_filtered(self):
        rows=[{"fact":"A uses C","episode_ids":["u1"]},
              {"fact":"A uses C","episode_ids":["u1"]},
              {"fact":"password=secret","episode_ids":["u1"]}]
        approved={"u1":{"source_ref":"git:"+"a"*40+":memory-facts/s.json","exclusive":False}}
        self.assertEqual(len(format_rows(rows,approved,"grp",limit=3)),1)

if __name__=="__main__":unittest.main()
