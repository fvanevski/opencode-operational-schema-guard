"""Disposable, source-only regressions for issue 70 preflight."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from verify_source_home import PreflightError, check_package, check_host, confined

def sha(v):
    return hashlib.sha256(v).hexdigest()

class SourceHomeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        r = Path(self.tmp.name)
        self.pkg,self.gate,self.v2,self.backend=(r/p for p in ("pkg","gate","v2","site-packages"))
        for p in (self.pkg,self.gate,self.v2,self.backend):p.mkdir()
        self.shim=r/"openviking-agent-run"
        self.shim.write_bytes(b"old-shim")
        items=[
            ("gate","openviking_commit_gate.py",b"old-gate",b"new-gate"),
            ("openviking-v2","index.mjs",b"old-v2",b"new-v2"),
            ("backend","openviking/session/session.py",b"old-backend",b"new-backend"),
            ("backend","openviking/service/receipt_protocol.py",None,b"new-service"),
            ("shim","openviking-agent-run",b"old-shim",b"new-shim"),
        ]
        rows=[]
        for comp,name,old,new in items:
            rows.append(dict(component=comp,path=name,source_base_sha256=sha(old) if old else None,candidate_sha256=sha(new)))
            if comp=="backend" and old is not None: source_root=self.backend
            elif comp=="shim": source_root=None
            else: source_root={"gate":self.gate,"openviking-v2":self.v2}.get(comp)
            if source_root is not None and old is not None:self.write(source_root,name,old)
            if comp=="backend" and old is not None:continue
            rel=(f"backend-new/{name}" if comp=="backend" else f"candidate/{comp}/{name}")
            self.write(self.pkg,rel,new)
        self.write(self.pkg,"source-base-manifest.json",json.dumps({"files":rows}).encode())
        paths=sorted(p for p in self.pkg.rglob("*") if p.is_file())
        self.write(self.pkg,"SHA256SUMS","".join(f"{sha(p.read_bytes())}  {p.relative_to(self.pkg)}\n" for p in paths).encode())

    def write(self,root,name,data):
        p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)

    def test_positive_package_and_host(self):
        self.assertEqual(check_package(self.pkg)["candidate_checks"],4)
        self.assertEqual(check_host(self.pkg,self.gate,self.v2,self.backend,self.shim)["original_source_checks"],4)

    def test_package_tampering_rejected(self):
        self.write(self.pkg,"candidate/gate/openviking_commit_gate.py",b"corrupt")
        with self.assertRaises(PreflightError):check_package(self.pkg)

    def test_host_drift_rejected(self):
        self.write(self.gate,"openviking_commit_gate.py",b"drifted")
        with self.assertRaises(PreflightError):check_host(self.pkg,self.gate,self.v2,self.backend,self.shim)

    def test_missing_source_rejected(self):
        (self.v2/"index.mjs").unlink()
        with self.assertRaises(PreflightError):check_host(self.pkg,self.gate,self.v2,self.backend,self.shim)

    def test_traversal_rejected(self):
        with self.assertRaises(PreflightError):confined(self.pkg,"../file")

    def test_outside_symlink_rejected(self):
        (self.pkg/"escape").symlink_to(self.shim)
        with self.assertRaises(PreflightError):confined(self.pkg,"escape")

if __name__ == "__main__": unittest.main()
