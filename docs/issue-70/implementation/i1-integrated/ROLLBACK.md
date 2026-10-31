No production installation or service restart occurred. All optional features remain disabled.

Every full patch was dry-run, applied to its authenticated originals, compared byte-for-byte with the final candidate, reversed, and compared with the originals. source-base-manifest.json pins these inputs and outputs. prepare_backend.py refuses source mismatch and an existing output directory and verifies every patched backend file. Gate and V2 capture snapshots and their full patches include all prior Phase 1 corrections. Central's primitive/tests remain unchanged.

The Phase 2 regenerated `patches/gate.patch` (twelve file entries, covering the disabled-Graphiti admission source, the six staged `test_shared_work.py` regressions, the `test_dual_metrics.py` fixture repair and the previously unlisted `tests/test_multi_unknown_recovery.py`) was re-proven the same way: forward application on the authenticated installed gate source reproduces the candidate bytes exactly, and reverse application restores the original source bytes exactly, removing every file the patch introduced.

For isolated rollback, discard only a newly created disposable directory or reverse its matching patch. The preserved /home/filip/issue70-phase1-n3BNR6J9 candidate and archives were not reset or edited.

Future production rollback requires separate authorization and consistent owner-controlled backups of source/launcher files and gate/receipt/archive/task/QueueFS storage. Never restore a historical database over an active worker. Do not delete commit_attempts, receipt_bindings, commit_receipts or admission_contract to manufacture release. Admission activation is sticky even when configuration is later disabled. Keyed deliveries fail closed without their receipt owner; preserve that runtime and the shared launcher interlock until exact operations are terminal. Historical unknowns without request identity require separate backend-owner reconciliation.

A code rollback neither cancels accepted work nor proves quiescence. Applicable launchers must retain the matching checker while unresolved work exists. No production rollback command was executed.

## Phase 3 rollback scope

The Phase 3 additions (gate `graphiti_runtime_bootstrap.py`, `shared_work.py` auto-admission, V2 capture/recall modules and tests, source-pinned `docs/issue-70/phase3/` runtime) roll back with the same discipline: reverse `patches/gate.patch` and `patches/openviking-v2.patch` (thirteen and eight entries) on isolated copies to restore the authenticated installed gate/plugin bytes, and drop the Phase 3 source-pinned directory from the deployment manifest. No Phase 3 component is installed on the live host: the live gate config carries no graphiti keys, the installed plugin is the pre-Phase 3 `index.mjs` (6899822e), and all Graphiti evidence lives on disposable `issue70_*` graphs and disposable gate databases only. Disabling `graphiti_enabled` after activation preserves sticky admission for existing Graphiti work (Phase 2 invariant); the automatic `exclusive_state_transition` category was never enabled by any configuration in this campaign.

## Phase 4 rollback scope

The Phase 4 additions (gate `shared_work.py` transactional `temporal_transition_contracts` binding and `temporal_validation_status` status join, `graphiti_runtime_bootstrap.py` operator-pinned validator gate, source-pinned `docs/issue-70/phase4/` runtime, and the `graphiti-recall.mjs` temporal label semantics) roll back with the same discipline: reverse `patches/gate.patch` and `patches/openviking-v2.patch` (thirteen and eight entries, including the Phase 4 content) on isolated copies to restore the authenticated installed gate/plugin bytes, and drop the Phase 4 source-pinned directory from the deployment manifest. The `temporal_transition_contracts` and `temporal_validation_results` tables are created `IF NOT EXISTS` in the gate SQLite database and are inert when the feature is disabled: no exclusive-state ingestion starts without the explicit bootstrap opt-in (validator path + SHA-256 pin plus the operator source policy), and the automatic category remains disabled by bootstrap policy in every shipped configuration. No Phase 4 component is installed on the live host: the live gate config carries no graphiti keys, the live gate database was never accessed by tests, the installed plugin remains the pre-Phase 4 `index.mjs` (6899822e), the pinned read-only validator is an operator-supplied file outside the repository, and all temporal-validation evidence lives on the disposable graph `issue70_p4_real` and disposable gate databases only. A failed validation outcome (INCONSISTENT/INCOMPLETE/UNVERIFIED) never erases or re-executes the completed Graphiti ingestion receipt; retrying validation is bounded and read-only, so rollback never replays ingestion.

## Final integrated campaign rollback scope

The final integrated campaign (Central source-derived canonical-instruction
restoration and the `shared_work.status()` source repair, `fc753d51` →
`1f31823e`) rolls back with the same discipline: reverse the regenerated
`patches/gate.patch` (thirteen entries, now carrying the corrected
`shared_work.py`) and `patches/openviking-v2.patch` (eight entries) on
isolated copies to restore the authenticated installed gate/plugin bytes
(6ad48a93 / 6899822e), dropping every patch-introduced file. The
source-pinned `docs/issue-70/phase2/graphiti_terminal.py`,
`phase3/graphiti_core_worker.py` and `phase3/graphiti_process_transport.py`
canonical-instruction files and their regressions roll back with the branch
commit; no component is installed on the live host. The genuine PASS
transition ran only on the disposable graph `issue70_final_real` and a
disposable gate database; the live `graphiti_live` graph was not mutated
(node count 0), the live gate database was never accessed by tests, and the
pinned read-only validator is an operator-supplied file outside the
repository. Production exclusive-state capture remains disabled in every
shipped configuration; demonstrating a genuine automatic PASS does not
activate it.

## Four-finding campaign rollback scope

The four-finding campaign (A1 recall authority in
`docs/issue-70/phase3/graphiti_recall_service.py`, A2 fair deferred
cursor in `candidate/gate/shared_work.py`, A3 exact validator identity in
`graphiti_runtime_bootstrap.py`/`openviking_commit_gate.py`, A4 read-only
validator retry in the gate worker, plus the bounded
`tests/test_dual_metrics.py` fixture repair) rolls back with the same
discipline: reverse the regenerated `patches/gate.patch` (thirteen entries)
and `patches/openviking-v2.patch` (eight entries) on isolated copies to
restore the authenticated installed gate/plugin bytes
(`6ad48a93` / `6899822e`), dropping every patch-introduced file, and drop
the source-pinned `docs/issue-70/phase3/` + `phase4/` runtime from the
deployment manifest. The source-pinned recall-service and phase4 runtime
files roll back with the branch commit; no component is installed on the
live host. The genuine real-service qualification ran only on the
disposable graph `issue70_p4c_final` and a disposable gate database; the
live `graphiti_live` graph was not mutated, the live gate database was
never accessed by tests, and the pinned read-only validator is an
operator-supplied file outside the repository. A failed or transient
validation outcome (UNVERIFIED/INCONSISTENT/INCOMPLETE) never erases or
re-executes the completed Graphiti ingestion receipt; the read-only retry
is bounded and never replays ingestion. Production exclusive-state
capture remains disabled in every shipped configuration.
