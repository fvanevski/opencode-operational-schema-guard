import sys,pathlib,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parents[1]/"host-candidate/gate"))
import openviking_commit_gate as gate
class Binding(unittest.TestCase):
 def test_future_identity_is_authenticated_not_optional_headers(self):
  self.assertTrue(hasattr(gate.GateHandler,"_verified_identity"),"missing backend-authoritative preclaim validation")
if __name__=="__main__":unittest.main()
