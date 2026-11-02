"""Service-backed Issue #75 commit acceptance.

Two phases. Submit once from an authorized controller; observe only AFTER the
ordinary commit-gate worker has been allowed to run. Never instantiate a worker,
mock scheduler state, shorten its quiet grace, or retry an ambiguous POST.
Credentials must arrive via caller-owned private environment, not a process PID.
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import sqlite3
import stat
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid


def loopback_base(value: str) -> str:
    u = urllib.parse.urlsplit(value)
    if u.scheme != "http" or u.hostname not in {"127.0.0.1", "localhost", "::1"} or u.username or u.password or u.path not in {"", "/"} or u.query or u.fragment:
        raise ValueError("explicit loopback HTTP base URL required")
    if u.port is None:
        raise ValueError("explicit TCP port required")
    return value.rstrip("/")


def require_credential(name: str) -> str:
    value = os.environ.get(name, "")
    if not value or "\n" in value or "\r" in value:
        raise RuntimeError("private credential unavailable: " + name)
    return value


def request_json(method: str, base: str, path: str, key: str, *, body=None, account=None, user=None, actor=None):
    headers = {"Authorization": "Bearer " + key, "Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if account is not None:
        headers["X-OpenViking-Account"] = account
    if user is not None:
        headers["X-OpenViking-User"] = user
    if actor is not None:
        headers["X-OpenViking-Actor-Peer"] = actor
    req = urllib.request.Request(
        loopback_base(base) + path,
        data=None if body is None else json.dumps(body, separators=(",", ":")).encode(),
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as exc:
        # Do not copy potentially sensitive server responses into public artifacts.
        status = exc.code
        exc.close()
        return status, {}


def _private_parent(path: pathlib.Path) -> None:
    if not path.parent.is_dir():
        raise ValueError("state parent directory must already exist")
    parent_mode = path.parent.stat().st_mode
    if parent_mode & 0o077:
        raise PermissionError("state parent must be private (0700); use a campaign-owned directory")


def create_state(path: pathlib.Path, state: dict) -> None:
    _private_parent(path)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as out:
        json.dump(state, out, sort_keys=True, indent=2)
        out.write("\n")
        out.flush()
        os.fsync(out.fileno())


def update_state(path: pathlib.Path, state: dict) -> None:
    _private_parent(path)
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix=".issue75-state-")
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            json.dump(state, out, sort_keys=True, indent=2)
            out.write("\n")
            out.flush()
            os.fsync(out.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def read_state(path: pathlib.Path) -> dict:
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_mode & 0o077:
        raise PermissionError("state file must be private regular file")
    return json.loads(path.read_text(encoding="utf-8"))


def check_terminal(intent: dict, attempt: dict, receipt: dict, expected: dict) -> None:
    """Raise AssertionError unless all real terminal-completion predicates agree."""
    for k in ("account", "user_id", "actor_peer", "session_id"):
        assert intent[k] == attempt[k] == expected[k], "scope mismatch: " + k
    assert intent["state"] == "complete", "intent not complete"
    assert int(intent["processed_generation"]) >= int(attempt["generation"]), "generation not processed"
    assert int(intent["requested_generation"]) == int(attempt["generation"]), "unexpected generation"
    assert int(attempt["submitted"]) == 1 and int(attempt["resolved"]) == 1, "attempt not settled"
    assert receipt["request_key"] == attempt["request_key"], "receipt key mismatch"
    assert receipt["state"] in ("terminal", "sealed_terminal"), "receipt not terminal"
    assert receipt["outcome"] == "completed", "not completed"
    assert receipt["release_proven"] == 1, "backend release not proven"
    assert receipt.get("task_id"), "missing backend task"
    scope = json.loads(receipt["scope_json"])
    assert all(scope.get(k) == expected[k] for k in ("account", "user_id", "actor_peer", "session_id")), "receipt scope mismatch"


def submit(args) -> int:
    gate, backend = loopback_base(args.gate), loopback_base(args.backend)
    key = require_credential("ISSUE75_TEST_USER_KEY")
    session_id = "oc-ses_issue75_verify_" + uuid.uuid4().hex
    expected = {"session_id": session_id, "account": args.account, "user_id": args.user, "actor_peer": args.actor}
    if not all(str(v).strip() and str(v) == str(v).strip() for v in expected.values()):
        raise ValueError("scope values must be nonempty and canonical")
    path = pathlib.Path(args.state_file).resolve()
    state = dict(expected, phase="initialized", created_at=time.time(), gate=gate, backend=backend)
    create_state(path, state)
    headers = dict(account=args.account, user=args.user)
    q = urllib.parse.quote(session_id, safe="")
    try:
        status, payload = request_json("POST", backend, "/api/v1/sessions", key, body={"session_id": session_id}, **headers)
        if status != 200 or payload.get("status") != "ok":
            raise RuntimeError("backend session creation failed (no commit attempted)")
        state["phase"] = "session_created"
        update_state(path, state)
        status, payload = request_json("POST", backend, "/api/v1/sessions/" + q + "/messages", key,
                                       body={"role": "user", "content": "Issue #75 normal admission verification."}, **headers)
        if status != 200 or payload.get("status") != "ok":
            raise RuntimeError("backend message write failed (no commit attempted)")
        state["phase"] = "message_created"
        update_state(path, state)
        # Persist ambiguity marker BEFORE submission. Never retry this request automatically.
        state["phase"] = "gate_submission_unknown"
        update_state(path, state)
        status, payload = request_json("POST", gate, "/api/v1/sessions/" + q + "/commit", key,
                                       body={"keep_recent_count": 0}, actor=args.actor, **headers)
        result = payload.get("result", {})
        if status != 200 or payload.get("status") != "ok" or result.get("status") != "queued" or result.get("session_id") != session_id:
            raise RuntimeError("gate acceptance not proven; reconcile state, do not replay")
        state["phase"] = "gate_queued"
        state["broker_generation"] = result.get("broker_generation")
        update_state(path, state)
        print(json.dumps({"result": "GATE_QUEUED_NOT_COMPLETED", "session_id": session_id, "state_file": str(path)}))
        return 0
    except Exception:
        print(json.dumps({"result": "INCOMPLETE_OR_UNKNOWN", "phase": read_state(path)["phase"], "session_id": session_id,
                          "note": "Do not retry the commit. Reconcile exact request and durable state."}), file=sys.stderr)
        raise


def observe_once(state: dict, db_path: pathlib.Path, root_key: str) -> dict:
    assert state["phase"] in ("gate_submission_unknown", "gate_queued"), "submission phase not established"
    if not db_path.is_file():
        raise FileNotFoundError("explicit existing gate SQLite database required")
    uri = db_path.resolve().as_uri() + "?mode=ro"
    with sqlite3.connect(uri, uri=True) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA query_only=ON")
        scope = tuple(state[k] for k in ("account", "user_id", "actor_peer", "session_id"))
        intents = conn.execute(
            "SELECT * FROM intents WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?", scope
        ).fetchall()
        if len(intents) != 1:
            raise AssertionError("expected exactly one matching durable intent; never infer absence")
        intent = dict(intents[0])
        attempts = conn.execute(
            "SELECT * FROM commit_attempts WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?", scope
        ).fetchall()
        if len(attempts) > 1:
            raise AssertionError("multiple attempts: cannot assert once-only processing")
        attempt = dict(attempts[0]) if attempts else None
    if not attempt:
        if intent["state"] == "pending":
            return {"result": "PENDING", "intent_state": intent["state"]}
        raise AssertionError("no attempt for nonpending intent")
    q = urllib.parse.quote(state["session_id"], safe="")
    path = "/api/v1/admin/commit_receipts/" + q + "/" + urllib.parse.quote(attempt["request_key"], safe="")
    status, payload = request_json("GET", state["gate"], path, root_key, account=state["account"],
                                   user=state["user_id"], actor=state["actor_peer"])
    if status == 404 and intent["state"] in ("pending", "inflight", "unknown"):
        return {"result": "PENDING", "intent_state": intent["state"], "receipt_status": 404}
    if status != 200 or payload.get("status") != "ok" or not isinstance(payload.get("result"), dict):
        raise AssertionError("receipt readback failure or ambiguous backend state; HTTP=" + str(status))
    receipt = payload["result"]
    if receipt.get("state") not in ("terminal", "sealed_terminal"):
        return {"result": "PENDING", "intent_state": intent["state"], "receipt_state": receipt.get("state")}
    check_terminal(intent, attempt, receipt, state)
    return {"result": "TERMINAL_VERIFIED", "session_id": state["session_id"], "request_key": attempt["request_key"],
            "task_id": receipt["task_id"], "receipt_state": receipt["state"], "outcome": receipt["outcome"],
            "release_proven": 1, "gate_intent": intent["state"], "processed_generation": intent["processed_generation"]}


def observe(args) -> int:
    state = read_state(pathlib.Path(args.state_file))
    loopback_base(state["gate"])
    root = require_credential("ISSUE75_TEST_ROOT_KEY")
    db = pathlib.Path(args.gate_db)
    deadline = time.monotonic() + args.wait_seconds
    while True:
        result = observe_once(state, db, root)
        if result["result"] == "TERMINAL_VERIFIED":
            print(json.dumps(result, sort_keys=True))
            return 0
        if time.monotonic() >= deadline:
            print(json.dumps(result, sort_keys=True))
            return 3  # PENDING is not PASS.
        time.sleep(min(2.0, max(0.1, deadline - time.monotonic())))


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="action", required=True)
    s = sub.add_parser("submit", help="create one new benign session and submit exactly once")
    s.add_argument("--state-file", required=True)
    s.add_argument("--gate", default="http://127.0.0.1:1933")
    s.add_argument("--backend", default="http://127.0.0.1:1934")
    s.add_argument("--account", required=True)
    s.add_argument("--user", required=True)
    s.add_argument("--actor", required=True)
    s.set_defaults(fn=submit)
    o = sub.add_parser("observe", help="observe ordinary worker result, never run the worker")
    o.add_argument("--state-file", required=True)
    o.add_argument("--gate-db", required=True)
    o.add_argument("--wait-seconds", type=float, default=0)
    o.set_defaults(fn=observe)
    args = p.parse_args()
    if getattr(args, "wait_seconds", 0) < 0 or getattr(args, "wait_seconds", 0) > 600:
        p.error("wait-seconds must be 0..600")
    return args.fn(args)


if __name__ == "__main__":
    raise SystemExit(main())
