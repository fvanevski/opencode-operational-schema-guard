"""Legacy-schema characterization ONLY. No repair candidate or production path.

No arguments, environment-selected DB, network, or installed-module import.
Every writable SQLite connection belongs to a newly created TemporaryDirectory.
This reproduces why dead_letter alone is insufficient; it does not fix it.
"""
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator
import json
import sqlite3
import tempfile
import time

here = Path(__file__).resolve().parent
namespace = {"contextmanager": contextmanager, "sqlite3": sqlite3,
             "Iterator": Iterator, "time": time}
exec(compile((here / "legacy_methods.py.txt").read_text(),
             "reviewed-installed-method-excerpts", "exec"), namespace)
checks = []
with tempfile.TemporaryDirectory(prefix="gate-schema-characterization-") as fresh:
    db_path = Path(fresh) / "fixture.sqlite3"
    assert not db_path.exists()
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.executescript((here / "installed_schema.sql").read_text())
    connection.execute("""INSERT INTO intents
        (account,user_id,actor_peer,session_id,requested_generation,
         processed_generation,claimed_generation,state,first_requested_at,last_requested_at)
        VALUES ('','','PEER_FIXTURE','SESSION_FIXTURE',2,0,2,'unknown',1,1)""")
    connection.execute("""INSERT INTO commit_attempts
        (request_key,account,user_id,actor_peer,session_id,generation,
         body_json,body_digest,submitted,resolved)
        VALUES ('KEY_FIXTURE','','','PEER_FIXTURE','SESSION_FIXTURE',2,
                '{"keep_recent_count":7}','DIGEST_FIXTURE',1,0)""")
    connection.execute("""INSERT INTO intents
        (account,user_id,actor_peer,session_id,requested_generation,
         processed_generation,state,first_requested_at,last_requested_at)
        VALUES ('OTHER_ACCOUNT','OTHER_USER','','BACKLOG_FIXTURE',4,1,'pending',2,2)""")
    connection.execute("""INSERT INTO failed_tasks
        (task_id,session_id,generation,error,failed_at,resolution_status)
        VALUES ('OLD_FAILURE','OTHER_SESSION',1,'fixture error',1,'unresolved')""")
    connection.commit()
    history_before = [tuple(row) for row in connection.execute("SELECT * FROM failed_tasks")]
    backlog_before = dict(connection.execute(
        "SELECT * FROM intents WHERE session_id='BACKLOG_FIXTURE'").fetchone())
    original = connection.execute(
        "SELECT * FROM intents WHERE session_id='SESSION_FIXTURE'").fetchone()
    installed = object.__new__(namespace["QueueDB"])
    installed.path = str(db_path)
    assert db_path.resolve().is_relative_to(Path(fresh).resolve())
    installed.dead_letter(original, "preacceptance rejection: characterization")
    assert connection.execute("SELECT state FROM intents WHERE session_id='SESSION_FIXTURE'").fetchone()[0] == "dead"
    assert connection.execute("SELECT resolved FROM commit_attempts WHERE request_key='KEY_FIXTURE'").fetchone()[0] == 0
    checks.append("unknown -> dead leaves submitted attempt unresolved (legacy defect reproduced)")
    ready = installed.next_ready(now=10)
    assert ready["session_id"] == "BACKLOG_FIXTURE"
    checks.append("raw ready selector still exposes pending generation-gap backlog; full worker admission NOT tested")
    connection.execute("UPDATE intents SET state='inflight',claimed_generation=2 WHERE session_id='SESSION_FIXTURE'")
    connection.commit()
    original = connection.execute("SELECT * FROM intents WHERE session_id='SESSION_FIXTURE'").fetchone()
    installed.dead_letter(original, "trigger control")
    assert connection.execute("SELECT resolved FROM commit_attempts WHERE request_key='KEY_FIXTURE'").fetchone()[0] == 1
    checks.append("inflight -> dead fires actual commit_attempt_resolved trigger (control)")
    assert [tuple(row) for row in connection.execute("SELECT * FROM failed_tasks")] == history_before
    assert dict(connection.execute("SELECT * FROM intents WHERE session_id='BACKLOG_FIXTURE'").fetchone()) == backlog_before
    checks.append("unrelated backlog and failed history unchanged")
    connection.close()
print(json.dumps({"result": "CHARACTERIZATION_PASS", "checks": checks,
                  "repair_implemented": False, "crash_or_recovery_tests": "NOT_RUN_SOURCE_DRIFT_STOP",
                  "production_DB_connections": 0, "network_calls": 0}, indent=2))
