"""Operator-allowlisted immutable Git fact records for automatic Graphiti admission.

An OpenCode tool completion may nominate a fact_ref, but neither its metadata
nor the agent can attest that fact. This resolver independently verifies the
referenced Git object under a configured trusted repository/ref and returns
the exact source payload. A repository commit is evidence of its content,
not a guarantee of truth: operator policy determines eligible classifications.

No Git writes, model calls, graph writes, or arbitrary file reads are made.
"""
from __future__ import annotations

from datetime import datetime
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess

from graphiti_terminal import EpisodeEnvelope, UnverifiedSource, digest
from source_authority import PRIVATE

REF = re.compile(r"^git:([0-9a-f]{40}):([A-Za-z0-9_./-]{1,360})$")
HEX = re.compile(r"^[0-9a-f]{40,64}$")
MAX_SOURCE_BYTES = 65536


def git(repo: Path, *args: str, max_output=MAX_SOURCE_BYTES) -> bytes:
    # Never shell out through a shell, invoke arbitrary Git aliases or trust a
    # working-tree file in place of an immutable commit object.
    try:
        cmd = ["git", "-c", "core.hooksPath=/dev/null", "-C", str(repo), *args]
        result = subprocess.run(cmd, stdout=subprocess.PIPE,
                                stderr=subprocess.DEVNULL, timeout=5, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise UnverifiedSource("Git authority unavailable") from exc
    if result.returncode != 0 or len(result.stdout) > max_output:
        raise UnverifiedSource("Git source unavailable or exceeds size bound")
    return result.stdout.strip() if args[0] in ("rev-parse", "merge-base") else result.stdout


class GitFactResolver:
    """Explicit operator policy. Does not infer a trusted repo from a tool arg."""

    def __init__(self, *, policy: dict, work_key_fn, source_key_fn):
        self.policy = policy
        self.work_key_fn = work_key_fn
        self.source_key_fn = source_key_fn

    def __call__(self, candidate: dict) -> EpisodeEnvelope:
        policy = self.policy
        if policy.get("enabled") is not True or policy.get("source_type") != "git-record-v1":
            raise UnverifiedSource("Git fact policy disabled")
        scope = candidate.get("scope") if isinstance(candidate, dict) else None
        if not isinstance(scope, dict) or candidate.get("destination") != "graphiti":
            raise UnverifiedSource("unsupported candidate/scope")
        workspace, group = scope.get("workspace_id"), scope.get("group_id")
        if (workspace not in policy.get("workspaces", []) or group not in policy.get("groups", [])
                or candidate.get("category") not in policy.get("categories", [])):
            raise UnverifiedSource("workspace/group/category not opted in")
        ref = candidate.get("fact_ref")
        match = REF.fullmatch(ref) if isinstance(ref, str) else None
        if not match:
            raise UnverifiedSource("Git source reference must pin a full commit SHA")
        commit, relative = match.groups()
        path = PurePosixPath(relative)
        prefix = policy.get("source_prefix")
        if (path.is_absolute() or ".." in path.parts or not isinstance(prefix, str)
                or not prefix or not relative.startswith(prefix.rstrip("/") + "/")
                or path.suffix != ".json"):
            raise UnverifiedSource("source path not within approved Git prefix")
        repo_string = policy.get("repository")
        trusted_ref = policy.get("trusted_ref")
        if (not isinstance(repo_string, str) or not isinstance(trusted_ref, str)
                or not re.fullmatch(r"refs/heads/[A-Za-z0-9_./-]+", trusted_ref)):
            raise UnverifiedSource("invalid operator repository/ref policy")
        try:
            repo = Path(repo_string).resolve(strict=True)
        except OSError as exc:
            raise UnverifiedSource("approved repository unavailable") from exc
        if not repo.is_dir():
            raise UnverifiedSource("approved Git root is not a directory")
        top = git(repo, "rev-parse", "--show-toplevel").decode()
        if Path(top).resolve() != repo:
            raise UnverifiedSource("approved repository path is not canonical root")
        # Require the record commit to be reachable from the operator's trusted
        # branch, rather than accepting a random SHA in local object storage.
        branch_commit = git(repo, "rev-parse", "--verify", trusted_ref + "^{commit}").decode()
        if not HEX.fullmatch(branch_commit):
            raise UnverifiedSource("trusted Git ref did not resolve")
        git(repo, "merge-base", "--is-ancestor", commit, branch_commit, max_output=0)
        blob = git(repo, "rev-parse", "--verify", commit + ":" + relative).decode()
        if not HEX.fullmatch(blob):
            raise UnverifiedSource("source is not a Git object")
        if git(repo, "cat-file", "-t", blob).strip() != b"blob":
            raise UnverifiedSource("source is not a regular Git blob")
        raw = git(repo, "cat-file", "-p", blob)
        if len(raw) > MAX_SOURCE_BYTES:
            raise UnverifiedSource("source exceeds size bound")
        try:
            record = json.loads(raw)
            ordinary={"schema_version","workspace_id","group_id","category",
                      "episode_body","reference_time"}
            exclusive=candidate["category"]=="exclusive_state_transition"
            expected=ordinary | ({"transition_contract"} if exclusive else set())
            if not isinstance(record,dict) or set(record)!=expected:
                raise ValueError("Git record shape")
            if (record["schema_version"] != 1 or record["workspace_id"] != workspace
                    or record["group_id"] != group or record["category"] != candidate["category"]):
                raise UnverifiedSource("record scope/category contradicts source event")
            body = record["episode_body"]
            if not isinstance(body, str) or not body.strip() or len(body.encode()) > MAX_SOURCE_BYTES or PRIVATE.search(body):
                raise UnverifiedSource("Git fact content rejected")
            moment = datetime.fromisoformat(record["reference_time"].replace("Z", "+00:00"))
            if moment.tzinfo is None:
                raise UnverifiedSource("source time missing timezone")
            declared=None
            if exclusive:
                from temporal_ledger import validate_contract
                declared=record["transition_contract"]
                validate_contract(declared,group)
                hint=candidate.get("transition")
                if not isinstance(hint,dict) or any((
                    hint.get("subject_ref")!=declared["subject"],
                    hint.get("predicate")!=declared["predicate"],
                    hint.get("outgoing_state_ref")!=declared["transition"]["from"],
                    hint.get("incoming_state_ref")!=declared["transition"]["to"],
                    hint.get("effective_at")!=declared["transition"]["effective_at"],
                )):
                    raise UnverifiedSource("source transition contradicts nomination")
            elif candidate.get("transition") is not None:
                raise UnverifiedSource("ordinary fact unexpectedly carries transition")
        except (TypeError, KeyError, ValueError, UnicodeDecodeError) as exc:
            raise UnverifiedSource("invalid authenticated Git fact record") from exc

        work_key = self.work_key_fn(candidate)
        source_key = self.source_key_fn(candidate)
        envelope = EpisodeEnvelope(
            work_key=work_key, source_event_key=source_key, group_id=group,
            name="git-source:" + work_key[:24], episode_body=body,
            source_description="git:" + commit + ":" + relative,
            reference_time=moment,
            attestation_digest=digest([
                "git-record-v1", policy.get("revision"), str(repo), commit,
                blob, workspace, group, source_key,
            ]),
            transition_contract=declared,
        )
        # Perform all deterministic source-derived transport checks while
        # still in independent source verification. The coordinator must
        # never queue a contract that can fail before the first graph call.
        envelope.validate()
        return envelope
