"""Small operator-approved source record resolver for disposable Phase 2 qualification.

This deliberately does not promote arbitrary OpenCode tool metadata. A record
must be independently allowlisted and digest-pinned by a trusted policy owner.
Do not mistake this bounded source for general automatic session-fact capture.
"""
from __future__ import annotations
from datetime import datetime
import hashlib
import json
from pathlib import Path, PurePosixPath
import re

from graphiti_terminal import EpisodeEnvelope, UnverifiedSource, digest

PRIVATE = re.compile(r"(?:-----BEGIN .*PRIVATE KEY-----|Bearer\\s+\\S+|password\\s*[:=]|\\bsk-[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9]{20,})", re.I)


def read_record(root, rel):
    part=PurePosixPath(rel)
    if part.is_absolute() or ".." in part.parts or not part.parts:
        raise UnverifiedSource("unsafe approved source path")
    try:
        home=Path(root).resolve(strict=True)
        path=Path(root).joinpath(*part.parts).resolve(strict=True)
    except OSError as exc:
        raise UnverifiedSource("approved source missing") from exc
    if not path.is_relative_to(home) or not path.is_file():
        raise UnverifiedSource("approved source escapes trusted root")
    raw=path.read_bytes()
    return raw


class PinnedSourceResolver:
    """Operator-owned policy: digest-pinned record files, exact source/scope."""

    def __init__(self, *, policy, source_root, work_key_fn, source_key_fn):
        self.policy=policy
        self.source_root=source_root
        self.work_key_fn=work_key_fn
        self.source_key_fn=source_key_fn

    def __call__(self,candidate):
        policy=self.policy
        if policy.get("enabled") is not True:
            raise UnverifiedSource("source policy disabled")
        if not isinstance(candidate,dict) or candidate.get("destination")!="graphiti":
            raise UnverifiedSource("not a Graphiti source candidate")
        scope=candidate.get("scope")
        if not isinstance(scope,dict):
            raise UnverifiedSource("source scope unavailable")
        group,workspace=scope.get("group_id"),scope.get("workspace_id")
        if (group!=policy.get("group_id") or workspace!=policy.get("workspace_id")
                or candidate.get("category") not in policy.get("categories",[])):
            raise UnverifiedSource("not opted-in source/category scope")
        source_key=self.source_key_fn(candidate)
        entries=policy.get("approved_events",{})
        entry=entries.get(source_key)
        if not isinstance(entry,dict):
            raise UnverifiedSource("source event not independently approved")
        expected=entry.get("sha256","")
        if not re.fullmatch("[0-9a-f]{64}",expected):
            raise UnverifiedSource("missing immutable approved source digest")
        raw=read_record(self.source_root,entry.get("file",""))
        if hashlib.sha256(raw).hexdigest()!=expected:
            raise UnverifiedSource("approved source bytes changed")
        try:
            record=json.loads(raw)
            if (record["source_event_key"]!=source_key
                    or record["workspace_id"]!=workspace
                    or record["group_id"]!=group
                    or record["category"]!=candidate["category"]
                    or record["fact_ref"]!=candidate["fact_ref"]):
                raise UnverifiedSource("approved source conflicts with candidate")
            body=record["episode_body"]
            if not isinstance(body,str) or len(body.encode())>65536 or PRIVATE.search(body):
                raise UnverifiedSource("approved source content rejected")
            time_str=record["reference_time"]
            moment=datetime.fromisoformat(time_str.replace("Z","+00:00"))
            if moment.tzinfo is None:raise UnverifiedSource("reference time lacks timezone")
        except (KeyError,TypeError,ValueError,UnicodeDecodeError) as exc:
            raise UnverifiedSource("approved source record invalid") from exc
        key=self.work_key_fn(candidate)
        return EpisodeEnvelope(
            work_key=key,source_event_key=source_key,group_id=group,
            name="ghdev-source:"+key[:24],episode_body=body,
            source_description="approved-source:"+record["fact_ref"][:100],
            reference_time=moment,
            attestation_digest=digest((policy["revision"],source_key,expected,group,workspace)))
