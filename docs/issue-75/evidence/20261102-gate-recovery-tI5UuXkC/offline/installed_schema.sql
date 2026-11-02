CREATE TABLE intents (
                    account TEXT NOT NULL DEFAULT '',
                    user_id TEXT NOT NULL DEFAULT '',
                    actor_peer TEXT NOT NULL DEFAULT '',
                    session_id TEXT NOT NULL,
                    requested_generation INTEGER NOT NULL DEFAULT 1,
                    processed_generation INTEGER NOT NULL DEFAULT 0,
                    claimed_generation INTEGER,
                    keep_recent_count INTEGER NOT NULL DEFAULT 0,
                    commit_body_json TEXT NOT NULL DEFAULT '{}',
                    reasons_json TEXT NOT NULL DEFAULT '[]',
                    first_requested_at REAL NOT NULL,
                    last_requested_at REAL NOT NULL,
                    state TEXT NOT NULL DEFAULT 'pending',
                    task_id TEXT,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    next_attempt_at REAL NOT NULL DEFAULT 0,
                    last_error TEXT, last_terminal_outcome TEXT, last_terminal_generation INTEGER,
                    PRIMARY KEY (account, user_id, actor_peer, session_id)
                );

CREATE INDEX intents_ready_idx ON intents(state, next_attempt_at, first_requested_at);

CREATE TABLE failed_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT,
                    account TEXT NOT NULL DEFAULT '',
                    user_id TEXT NOT NULL DEFAULT '',
                    actor_peer TEXT NOT NULL DEFAULT '',
                    session_id TEXT NOT NULL,
                    generation INTEGER NOT NULL DEFAULT 1,
                    archive_uri TEXT,
                    error TEXT,
                    failure_kind TEXT,
                    failed_at REAL NOT NULL,
                    resolution_status TEXT NOT NULL DEFAULT 'unresolved',
                    resolved_at REAL
                );

CREATE INDEX failed_tasks_identity_idx ON failed_tasks(account, user_id, actor_peer, session_id, resolution_status, generation);

CREATE UNIQUE INDEX failed_tasks_task_unique ON failed_tasks(task_id) WHERE task_id IS NOT NULL;

CREATE UNIQUE INDEX failed_tasks_generation_unique ON failed_tasks(account, user_id, actor_peer, session_id, generation);

CREATE TABLE admission_contract (version INTEGER PRIMARY KEY, required INTEGER NOT NULL);

CREATE TABLE commit_attempts (
                request_key TEXT PRIMARY KEY, account TEXT NOT NULL, user_id TEXT NOT NULL,
                actor_peer TEXT NOT NULL, session_id TEXT NOT NULL, generation INTEGER NOT NULL,
                body_json TEXT NOT NULL, body_digest TEXT NOT NULL,
                submitted INTEGER NOT NULL DEFAULT 0, resolved INTEGER NOT NULL DEFAULT 0,
                UNIQUE(account,user_id,actor_peer,session_id,generation));

CREATE TRIGGER commit_attempt_resolved AFTER UPDATE OF state ON intents
                WHEN OLD.state='inflight' AND NEW.state NOT IN ('inflight','unknown')
                BEGIN UPDATE commit_attempts SET resolved=1
                WHERE account=OLD.account AND user_id=OLD.user_id AND actor_peer=OLD.actor_peer
                    AND session_id=OLD.session_id AND generation=OLD.claimed_generation; END;

CREATE TABLE graphiti_ingest_receipts(
                work_key TEXT PRIMARY KEY, payload_digest TEXT NOT NULL,
                source_event_key TEXT NOT NULL, group_id TEXT NOT NULL,
                state TEXT NOT NULL, episode_uuid TEXT,
                error_code TEXT, updated_at REAL NOT NULL);

CREATE TABLE memory_work (
                work_key TEXT PRIMARY KEY, work_class TEXT NOT NULL,
                source_event_id TEXT NOT NULL, source_session_id TEXT NOT NULL,
                source_message_id TEXT, destination_scope TEXT NOT NULL,
                logical_digest TEXT NOT NULL, candidate_json TEXT NOT NULL,
                status TEXT NOT NULL, attempt_generation INTEGER NOT NULL DEFAULT 0,
                backend_identity TEXT, lease_identity TEXT, created_at REAL NOT NULL,
                updated_at REAL NOT NULL, error_code TEXT
            );

CREATE INDEX memory_work_ready ON memory_work(status, created_at);

CREATE TABLE memory_source_admissions (
                source_key TEXT NOT NULL, destination_scope TEXT NOT NULL,
                payload_digest TEXT NOT NULL, work_key TEXT NOT NULL,
                PRIMARY KEY(source_key, destination_scope));

CREATE TABLE memory_source_attestations(
                work_key TEXT PRIMARY KEY, source_authority TEXT NOT NULL,
                attestation_digest TEXT NOT NULL, episode_digest TEXT NOT NULL,
                created_at REAL NOT NULL);

CREATE TABLE memory_source_scan_cursor(
                singleton INTEGER PRIMARY KEY CHECK(singleton=1),
                created_at REAL NOT NULL, work_key TEXT NOT NULL);

CREATE TABLE temporal_validator_active(
            singleton INTEGER PRIMARY KEY CHECK(singleton=1),
            validator_sha256 TEXT NOT NULL);

CREATE TABLE temporal_transition_contracts(
                    work_key TEXT PRIMARY KEY, group_id TEXT NOT NULL,
                    contract_json TEXT NOT NULL, contract_digest TEXT NOT NULL,
                    attestation_digest TEXT NOT NULL, bound_at REAL NOT NULL);

CREATE TABLE temporal_validation_results(
                work_key TEXT PRIMARY KEY, episode_uuid TEXT NOT NULL,
                contract_digest TEXT NOT NULL, state TEXT NOT NULL,
                exit_code INTEGER, disposition TEXT,
                result_digest TEXT, details_json TEXT,
                attempts INTEGER NOT NULL DEFAULT 0,
                updated_at REAL NOT NULL,
                validator_sha256 TEXT);
