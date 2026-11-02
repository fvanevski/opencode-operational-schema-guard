import unittest
from graphiti_relevance import query_plan,rank_rows,hop_entities

class GraphitiRelevanceTests(unittest.TestCase):
    def setUp(self):
        self.rows=[
            dict(subject="Graphiti",object="FalkorDB",fact="Graphiti stores edges in FalkorDB",episode_ids=["p1"]),
            dict(subject="OpenCode",object="OpenViking",fact="OpenCode uses OpenViking broad recall",episode_ids=["p2"]),
            dict(subject="OpenViking",object="Graphiti",fact="Graphiti ingestion depends on the OpenViking scheduler",episode_ids=["p3"]),
            dict(subject="LegacyBridge",object="Graphiti",fact="LegacyBridge was superseded by Graphiti",episode_ids=["p4"],invalid_at="2026-01-01"),
        ]
    def test_paraphrase_and_multi_entity(self):
        self.assertIn("depends",query_plan("Which service is reliant on the scheduler?"))
        self.assertIn("graphiti",query_plan("Does OpenCode depend on Graphiti?"))
        self.assertTrue(rank_rows(self.rows,"What breaks when Graphiti fails?"))
    def test_historical_and_implicit_dependency(self):
        x=rank_rows(self.rows,"Which component was superseded by Graphiti?")
        self.assertTrue(any(r["subject"]=="LegacyBridge" for r in x))
        self.assertTrue(hop_entities(self.rows,"What breaks if Graphiti fails?"))
        self.assertFalse(hop_entities(self.rows,"What is Graphiti?"))
    def test_no_raw_sensitivity_or_generic_chat(self):
        self.assertEqual(query_plan("hello"),[])
        self.assertEqual(query_plan("password=secret what depends on NATS?"),[])
        self.assertEqual(query_plan("Bearer my-token is expired"),[])
        self.assertEqual(rank_rows(self.rows,"hello"),[])
    def test_distinct_episode_evidence_survives(self):
        duplicate={**self.rows[0],"episode_ids":["conflicted"]}
        self.assertEqual(len(rank_rows([self.rows[0],duplicate],"Graphiti FalkorDB")),2)
    def test_bounded_probes(self):
        self.assertLessEqual(len(query_plan(" ".join(["component"]*100))),6)

if __name__=="__main__":unittest.main()
