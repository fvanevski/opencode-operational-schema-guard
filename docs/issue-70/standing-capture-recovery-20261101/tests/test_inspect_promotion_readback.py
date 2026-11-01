"""Positive and negative checks for actual Issue-70 receipt schema."""
from pathlib import Path
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
import inspect_promotion_readback as r

def sample():
    scope={"account":"a","user_id":"u","actor_peer":"","session_id":"private"}
    attempt={**scope,"request_key":r.REQUEST_KEY,"body_digest":r.BODY_DIGEST,
             "generation":1,"submitted":1,"resolved":1}
    intent={**scope,"state":"complete","last_terminal_outcome":"completed",
            "last_terminal_generation":1,"processed_generation":1}
    receipt={"request_key":r.REQUEST_KEY,"body_digest":r.BODY_DIGEST,
             "scope_json":__import__("json").dumps(scope),"state":"terminal",
             "outcome":"completed","release_proven":1,"task_id":"private-task"}
    work={"work_key":r.WORK_KEY,"destination_scope":r.GROUP,
          "status":"queued","attempt_generation":0,"backend_identity":None}
    return attempt,intent,receipt,work,None

class ReceiptReadbackTest(unittest.TestCase):
    def test_real_field_names_resume_queued(self):
        out=r.check_state(*sample())
        self.assertEqual(out["decision"],"RESUME_EXISTING_GRAPHITI_DRAIN_ONLY")
        self.assertEqual(out["backend_receipt_outcome"],"completed")
        self.assertNotIn("terminal_outcome",out)
    def test_completed_graphiti(self):
        a,i,rp,w,_=sample()
        w["status"]="completed";w["attempt_generation"]=1
        ing={"work_key":r.WORK_KEY,"group_id":r.GROUP,"state":"completed","episode_uuid":"real-uuid"}
        out=r.check_state(a,i,rp,w,ing)
        self.assertEqual(out["decision"],"VERIFY_RECALL_AND_STANDING_CONFIG")
    def test_backend_absent_fails(self):
        a,i,rp,w,_=sample()
        out=r.check_state(a,i,None,w,None)
        self.assertEqual(out["decision"],"STOP_AND_RECONCILE_EXACT_STATE")
    def test_backend_not_terminal_fails(self):
        a,i,rp,w,_=sample();rp["state"]="accepted";rp["release_proven"]=0
        out=r.check_state(a,i,rp,w,None)
        self.assertEqual(out["decision"],"STOP_AND_RECONCILE_EXACT_STATE")
    def test_scope_drift_blocks(self):
        a,i,rp,w,_=sample();rp["scope_json"]='{"account":"other"}'
        with self.assertRaises(r.StateMismatch):r.check_state(a,i,rp,w,None)
    def test_task_absence_blocks(self):
        a,i,rp,w,_=sample();rp["task_id"]=None
        with self.assertRaises(r.StateMismatch):r.check_state(a,i,rp,w,None)
    def test_inconsistent_graphiti_completed_blocks(self):
        a,i,rp,w,_=sample();w["status"]="completed"
        with self.assertRaises(r.StateMismatch):r.check_state(a,i,rp,w,None)
    def test_processing_requires_reconciliation(self):
        a,i,rp,w,_=sample();w["status"]="processing"
        out=r.check_state(a,i,rp,w,None)
        self.assertEqual(out["decision"],"STOP_AND_RECONCILE_EXACT_STATE")
    def test_gate_not_complete_blocks(self):
        a,i,rp,w,_=sample();i["state"]="unknown"
        out=r.check_state(a,i,rp,w,None)
        self.assertEqual(out["decision"],"STOP_AND_RECONCILE_EXACT_STATE")
    def test_attempt_mismatch_blocks(self):
        a,i,rp,w,_=sample();a["body_digest"]="bad"
        with self.assertRaises(r.StateMismatch):r.check_state(a,i,rp,w,None)

if __name__=="__main__":
    unittest.main()
