"""Validate subprocess protocol without running actual graph queries."""
import hashlib,json,tempfile,unittest,sys
from pathlib import Path
from temporal_validator_transport import make_runner,ValidatorUnavailable

class RunnerTests(unittest.TestCase):
    def setUp(self):
        d=tempfile.TemporaryDirectory();self.addCleanup(d.cleanup)
        self.root=Path(d.name);self.script=self.root/"child.py"
        self.validator=self.root/"validator.py";self.validator.write_text("# fake validated file\n")
    def stub(self,answer,returncode=0):
        self.script.write_text("import json,sys\nsys.stdin.read()\n"+
            f"print('ISSUE70_VALIDATION='+{answer!r})\n"+
            f"sys.exit({returncode})\n")
        return make_runner(python=sys.executable,child=str(self.script),
                           validator_path=str(self.validator),
                           validator_sha256=hashlib.sha256(self.validator.read_bytes()).hexdigest())
    def test_exact_shape(self):
        result={"validator_sha256":hashlib.sha256(self.validator.read_bytes()).hexdigest(),
                "exit":1,"disposition":"TEMPORAL_CONFLICT","mode":"live",
                "coverage":"complete","findings":[]}
        run=self.stub(json.dumps(result))
        self.assertEqual(run({"transition":{"from":"Redis"}})["exit"],1)
    def test_missing_and_duplicate_fail(self):
        for response in ("not-json","{}",json.dumps({"exit":0})):
            with self.subTest(response=response):
                with self.assertRaises(ValidatorUnavailable):
                    self.stub(response)({})
    def test_validator_changes_after_configuration_fail_closed(self):
        pin=hashlib.sha256(self.validator.read_bytes()).hexdigest()
        result={"validator_sha256":pin,"exit":0,"disposition":"PASS",
                "mode":"live","coverage":"complete","findings":[]}
        run=self.stub(json.dumps(result))
        self.validator.write_text("# changed validator implementation\n")
        with self.assertRaises(ValidatorUnavailable):run({})

    def test_nonzero_exit_fail(self):
        with self.assertRaises(ValidatorUnavailable):
            self.stub("{}",returncode=1)({})
if __name__=="__main__":unittest.main()
