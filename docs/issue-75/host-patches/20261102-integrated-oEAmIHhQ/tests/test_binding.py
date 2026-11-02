import sys,pathlib,unittest
for p in (pathlib.Path(__file__).parents[1]/"host-candidate/gate", pathlib.Path("/home/filip/.local/share/openviking-commit-gate")):
    if p.is_dir(): sys.path.insert(0, str(p))
import openviking_commit_gate as gate
class Binding(unittest.TestCase):
 def test_future_identity_is_authenticated_not_optional_headers(self):
  self.assertTrue(hasattr(gate.GateHandler,"_verified_identity"),"missing backend-authoritative preclaim validation")
if __name__=="__main__":unittest.main()
