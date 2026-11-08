#!/usr/bin/env python3
"""Offline, private-only indicator scan of previously public model-request JSONL.

Emits counts and SHA-256 only. No excerpts, prompts, credentials, IDs, URLs or
external requests. A clean result cannot prove complete confidentiality.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys

PATTERNS = {
    "provider_key_like": re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}\b"),
    "github_token_like": re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9_]{12,}|github_pat_[A-Za-z0-9_]{15,})\b"),
    "aws_access_key_like": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "pem_private_key_header": re.compile(r"-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----"),
    "bearer_header_like": re.compile(r"\bBearer\s+[A-Za-z0-9._~+/-]{12,}={0,2}\b", re.I),
    "credential_field_like": re.compile(r"\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret|cookie)\b\s*[=:]\s*['\"]?\S{4,}", re.I),
    "email_address_like": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
}
def values(node):
    if isinstance(node, dict):
        for key, value in node.items():
            yield str(key)
            yield from values(value)
    elif isinstance(node, list):
        for value in node:
            yield from values(value)
    elif isinstance(node, str):
        yield node
def audit(filepath: Path):
    total, invalid, raw_requests = 0, 0, 0
    sha, record_counts, hit_counts = hashlib.sha256(), Counter(), Counter()
    with filepath.open("rb") as handle:
        for raw in handle:
            total += 1
            sha.update(raw)
            try:
                obj = json.loads(raw)
            except (ValueError, UnicodeDecodeError):
                invalid += 1
                texts = [raw.decode("utf-8", "replace")]
            else:
                if '"messages"' in raw.decode("utf-8", "ignore"):
                    raw_requests += 1
                texts = values(obj)
            seen = set()
            for item in texts:
                for name, pat in PATTERNS.items():
                    n = len(pat.findall(item))
                    if n:
                        hit_counts[name] += n
                        seen.add(name)
            record_counts.update(seen)
    return {
        "schema": "gh81.private-trace-disclosure-indicator-audit.v1",
        "input_sha256": sha.hexdigest(),
        "records": total,
        "records_containing_model_messages": raw_requests,
        "invalid_json_records": invalid,
        "indicator_occurrences": dict(sorted(hit_counts.items())),
        "records_with_indicators": dict(sorted(record_counts.items())),
        "disposition": "REQUIRES_HUMAN_ADJUDICATION",
        "limitations": "Pattern counts cannot establish credential validity, distinguish synthetic examples, or exclude unpatterned private text/identifiers. Historic Git objects and caches may remain accessible after branch deletion.",
    }
if __name__ == "__main__":
    if len(sys.argv) != 2 or not Path(sys.argv[1]).is_file():
        raise SystemExit("usage: python3 issue81-private-trace-audit.py /private/litellm-trace.jsonl")
    print(json.dumps(audit(Path(sys.argv[1])), indent=2, sort_keys=True))
