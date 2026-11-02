#!/usr/bin/env python3
"""Materialize the centrally reviewed PR #76 gate fixes into disposable output.

Never writes live gate source, SQLite, or service configuration. The output
is a complete candidate that must be integrated into canonical SOURCE.diff
and SOURCE_PINS.json after focused host validation.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path

PREIMAGE_SHA256 = "eb8753caddab78a2b3930f39985f453f1981a1fc3d012340baab017f8b792c94"

REPLACEMENTS = [
    (
        """        try:
            session=urllib.parse.quote(str(row["session_id"]),safe="")
            url=f"http://{self.cfg.backend_host}:{self.cfg.backend_port}/api/v1/admin/commit_receipts/binding/{session}"
            status,payload=json_request("GET",url,headers=self._auth_headers(row),timeout=self.cfg.request_timeout_seconds)
            result=payload.get("result",{})
            return (status==200 and result.get("protocol")=="gate-owner-binding-v1"
                and all(result.get(k)==row[k] for k in ("account","user_id","session_id")))
        except Exception:
            return False
""",
        """        try:
            session=urllib.parse.quote(str(row["session_id"]),safe="")
            url=f"http://{self.cfg.backend_host}:{self.cfg.backend_port}/api/v1/admin/commit_receipts/binding/{session}"
            status,payload=json_request("GET",url,headers=self._auth_headers(row),timeout=self.cfg.request_timeout_seconds)
        except Exception:
            # Missing owner reply is not proof of an invalid owner.
            return None
        if status!=200 or not isinstance(payload,dict):
            return None
        result=payload.get("result")
        if not isinstance(result,dict) or result.get("protocol")!="gate-owner-binding-v1":
            return None
        # A valid authoritative reply with incorrect scope is a real mismatch.
        return all(result.get(k)==row[k] for k in ("account","user_id","session_id"))
""",
    ),
    (
        """            if not attempt["submitted"]:
                if not self._verified_claim_binding(row):
                    self.db.dead_letter(row,"pre-submission authenticated binding unavailable")
                    return
                envelope=""",
        """            if not attempt["submitted"]:
                binding = self._verified_claim_binding(row)
                if binding is False:
                    self.db.dead_letter(row,"pre-submission authenticated owner mismatch")
                    return
                if binding is None:
                    # Receipt submission has NOT started. Requeue the same
                    # generation/identity under the existing bounded backoff.
                    self.db.retry(row,"pre-submission owner binding temporarily unavailable",self.cfg)
                    return
                envelope=""",
    ),
    (
        """        is_binding = norm_path.startswith("/api/v1/admin/commit_receipts/binding/")
        # Every receipt endpoint""",
        """        is_binding = (self.command == "GET" and
            re.fullmatch(r"/api/v1/admin/commit_receipts/binding/[^/]+", norm_path) is not None)
        # Every receipt endpoint""",
    ),
]

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    source = Path(args.source).resolve(strict=True)
    output = Path(args.output).absolute()
    if source == output or output.exists() or not output.parent.is_dir() or output.parent.is_symlink():
        p.error("output must be new and in an existing non-symlink disposable directory")
    original = source.read_bytes()
    before = hashlib.sha256(original).hexdigest()
    if before != PREIMAGE_SHA256:
        p.error("unknown gate preimage; stop rather than overwrite")
    text = original.decode("utf-8")
    for old, new in REPLACEMENTS:
        if text.count(old) != 1:
            p.error("gate source anchor changed; no candidate produced")
        text = text.replace(old, new, 1)
    result = text.encode("utf-8")
    fd = os.open(output, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "wb") as f:
        f.write(result)
        f.flush()
        os.fsync(f.fileno())
    print(json.dumps({"preimage_sha256": before,
                      "candidate_sha256": hashlib.sha256(result).hexdigest(),
                      "output": str(output), "replacements": len(REPLACEMENTS)}))

if __name__ == "__main__":
    main()
