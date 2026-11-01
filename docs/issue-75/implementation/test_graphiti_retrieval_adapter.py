import asyncio
import unittest
from graphiti_retrieval_adapter import (
    READ_QUERY,retrieve_rows,bounded_rows_for_format
)

class FakeDriver:
    def __init__(self,rows):
        self.rows=rows
        self.calls=[]
    async def execute_query(self,cypher,**kwargs):
        self.calls.append((cypher,kwargs))
        return (self.rows.get(kwargs["term"],[]),)

def episodes(value):
    return value if isinstance(value,list) else []

def overflow(value):
    return not isinstance(value,list) or len(value)>32

class RetrievalTests(unittest.TestCase):
    def test_bounded_multi_term_and_group_isolation(self):
        driver=FakeDriver({
            "graphiti":[{"subject":"Graphiti","object":"FalkorDB",
                         "fact":"Graphiti uses FalkorDB",
                         "episode_ids":["p1"]}],
            "falkordb":[{"subject":"Graphiti","object":"FalkorDB",
                         "fact":"Graphiti uses FalkorDB",
                         "episode_ids":["p2"]}],
        })
        rows=asyncio.run(retrieve_rows(driver,"authorized",
                                      "What stores Graphiti facts in FalkorDB?"))
        self.assertTrue(rows)
        self.assertLessEqual(len(driver.calls),8)
        self.assertTrue(all(item[1]["group"]=="authorized"
                            for item in driver.calls))
        self.assertIn("a.group_id = $group",READ_QUERY)
        self.assertIn("r.group_id = $group",READ_QUERY)
        self.assertIn("r.fact",READ_QUERY)
    def test_duplicate_edges_keep_all_receipt_contributors(self):
        driver=FakeDriver({
            "graphiti":[dict(subject="Graphiti",object="FalkorDB",
                             fact="Graphiti uses FalkorDB",episode_ids=["PASS"]),
                       dict(subject="Graphiti",object="FalkorDB",
                             fact="Graphiti uses FalkorDB",episode_ids=["CONFLICT"])]
        })
        rows=asyncio.run(retrieve_rows(driver,"authorized","Graphiti status?"))
        grouped=bounded_rows_for_format(rows,"Graphiti status?",
                                       episode_ids=episodes,episode_overflow=overflow)
        self.assertEqual(len(grouped),1)
        self.assertEqual(set(grouped[0]["episode_ids"]),{"PASS","CONFLICT"})
    def test_truncated_or_malformed_fails_closed(self):
        driver=FakeDriver({"graphiti":[dict(fact="x",episode_ids=["p"])]*24})
        with self.assertRaises(ValueError):
            asyncio.run(retrieve_rows(driver,"authorized","Graphiti status?"))
        self.assertEqual(bounded_rows_for_format([
            dict(subject="Graphiti",object="X",fact="Graphiti depends on X",
                 episode_ids=["p"]),
            dict(subject="Graphiti",object="X",fact="Graphiti depends on X",
                 episode_ids="invalid")
        ],"Graphiti dependency",episode_ids=episodes,
          episode_overflow=overflow),[])
    def test_no_query_for_secret_or_low_information(self):
        for text in ("hello","password=secret, what about Graphiti?"):
            driver=FakeDriver({})
            self.assertEqual(asyncio.run(retrieve_rows(driver,"authorized",text)),[])
            self.assertEqual(driver.calls,[])
    def test_historical_intervals_remain_distinct(self):
        facts=[dict(subject="Graphiti",object="Bridge",fact="Graphiti replaced Bridge",
                    valid_at="2025",invalid_at="2026",episode_ids=["old"]),
               dict(subject="Graphiti",object="Bridge",fact="Graphiti replaced Bridge",
                    valid_at="2026",invalid_at="",episode_ids=["new"])]
        grouped=bounded_rows_for_format(facts,"Graphiti replaced Bridge",
              episode_ids=episodes,episode_overflow=overflow)
        self.assertEqual(len(grouped),2)

if __name__=="__main__":unittest.main()
