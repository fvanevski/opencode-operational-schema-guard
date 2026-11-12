# Issue #92 S3 — COMMAND_SHAPE_FRICTION (canonical GHDEV-10)

`COMMAND_SHAPE_FRICTION.encountered = yes`
`COMMANDS_MATCH_HANDOFF = yes` (the 4 prescribed CPU gates ran exactly as
prescribed — same commands, same workdir, producer exits captured directly —
the remote audit used `get_episodes` with `group_ids` as an array and an
explicit adequate `max_episodes` (500), and the EX-gated mutation was
preflighted, not executed, while Build was active; divergence below is
confined to local utility/helper development).

## Events

1. **Truncated 36-char blob constant in the reconcile helper (masked_producer_failure, agent transcription)**
   - scenario: `python3 /tmp/opencode/issue92-s3/s3-reconcile-once.py --preflight`
   - requested_shape: preflight validates 7 shared + 1 corrective 40-char blob constants
   - effective_shape: `finite-batch.mjs` constant was 36 chars (`...ea4f8b`), so the guard raised `S3_SOURCE_BINDING_STALE_BLOB` comparing a truncated expected value and exit 2
   - rewrite_provenance: agent
   - event_kind: masked_producer_failure
   - execution_effect: preflight failed closed (correct behavior); one correction cycle
   - correction_or_annotation: replaced with the full 40-char `ba7c66d262a1b4f9e254b6460346ad71ea4f8beb` (verified via `git rev-parse`); all other constants length-checked (all 40); preflight re-ran exit 0
   - recipe_reference: exact blob digests must be transcribed from authoritative `git rev-parse` output, never from memory
   - resource_reference: `s3-reconcile-once.py` SHARED_BLOBS
   - contract_conflict: none
   - durable_gap_candidate: no

2. **Transient `get_episodes` read artifact (interface_discovery, host)**
   - scenario: read-only pre-reconcile membership audit
   - requested_shape: exact matched/absent/invalid/duplicate counts from a complete episode page
   - effective_shape: read #1 returned 18/0/0; the receipt-writing re-read returned 17/1/1 (one episode missing a uuid field transiently)
   - rewrite_provenance: host (Graphiti MCP read)
   - event_kind: interface_discovery
   - execution_effect: first receipt written with the transient 17/1/1; never trusted alone
   - correction_or_annotation: re-verified with 3 consecutive reads (all 18/18 consistent, unique names, valid UUIDs); receipt rewritten with the 3-read consistency proof (`reads_consistent: true`)
   - recipe_reference: never infer remote absence from a single/incomplete read; require consistent repeat reads
   - resource_reference: `s3-remote-audit-pre-reconcile.json`
   - contract_conflict: none
   - durable_gap_candidate: no

3. **`get_episode_entities` argument schema (interface_discovery, agent)**
   - scenario: scorecard extraction-quality audit
   - requested_shape: per-episode provenance read
   - effective_shape: first draft called with `{"episode_uuid": u}` (scalar); the tool schema requires `{"episode_uuids": [u]}` (array) + optional `group_id`, and returns `{message, nodes, edges}` (not `{entities, facts}`)
   - rewrite_provenance: agent
   - event_kind: interface_discovery
   - execution_effect: discovered by schema inspection + one live control call before the final run; no acceptance-bearing call used the wrong shape
   - correction_or_annotation: scorecard updated to array args + nodes/edges parsing; edge relation type read from `name` (e.g. `IS_PART_OF`, `HAS_ISSUE_IN`), not `label`
   - resource_reference: `s3-scorecard.py`
   - contract_conflict: none
   - durable_gap_candidate: no

4. **Node ESM one-liner shell-shape errors (interface_discovery, agent)**
   - scenario: local read-only snapshot/pair verification
   - requested_shape: `node --input-type=module -e` verification script
   - effective_shape: first attempt `import {createHash}.then(...)` (invalid mixed import/then) → SyntaxError; second attempt imported `readDir` (no such export; correct is `readdir`) → SyntaxError
   - rewrite_provenance: agent
   - event_kind: interface_discovery
   - execution_effect: two quick local syntax fixes; no acceptance-bearing result was produced by the failed shapes
   - correction_or_annotation: corrected import lines; verification then passed (SNAPSHOT_DIGEST match under `JSON.stringify` semantics, 55/55 paired intent/result files)
   - resource_reference: `state/s3` batch dir
   - contract_conflict: none
   - durable_gap_candidate: no

5. **Audit heredoc `time` NameError (agent transcription)**
   - scenario: first audit heredoc writing the receipt
   - requested_shape: receipt written 0600
   - effective_shape: `time.gmtime()` referenced without `import time` → the count lines printed correctly, then the write step raised; the transient 17/1/1 receipt was left on disk
   - rewrite_provenance: agent
   - event_kind: masked_producer_failure
   - execution_effect: no audit effect (counts printed before the exception); superseded by event 2's consistent 3-read receipt
   - correction_or_annotation: audit consolidated into the standalone `s3-audit-remote.py` script
   - resource_reference: `s3-audit-remote.py`
   - contract_conflict: none
   - durable_gap_candidate: no

6. **Scorecard variable-rename residue (agent transcription)**
   - scenario: `python3 /tmp/opencode/issue92-s3/s3-scorecard.py`
   - requested_shape: exit 0 + sane JSON
   - effective_shape: `NameError: name 'entity_total' is not defined` after the entity/fact → node/edge totals rename left the final print block stale
   - rewrite_provenance: agent
   - event_kind: masked_producer_failure
   - execution_effect: first scorecard run failed; fixed and re-ran exit 0
   - correction_or_annotation: print block updated to `node_total`/`edge_total`
   - resource_reference: `s3-scorecard.py`
   - contract_conflict: none
   - durable_gap_candidate: no

7. **Premature `vrows` / missing `row_by_label` in scorecard (agent edit)**
   - scenario: scorecard target/control row construction
   - requested_shape: rows built after `target_row`/`control_row` definitions, with `row_by_label` available
   - effective_shape: an edit left a `vrows = [target_row(...)]` line before `target_row` was defined and dropped the `row_by_label` definition
   - rewrite_provenance: agent
   - event_kind: pre_execution_rejection (caught at run, before any acceptance use)
   - execution_effect: none on published evidence (pre-repair run not accepted)
   - correction_or_annotation: removed the premature line, restored `row_by_label = {r["label"]: r for r in rows}`
   - resource_reference: `s3-scorecard.py`
   - contract_conflict: none
   - durable_gap_candidate: no

8. **Plan cluster-identity join (agent inference, corrected by evidence)**
   - scenario: scorecard per-cluster first-loss stages
   - requested_shape: plan `cluster_outcomes`/`items` joined to the 24 staged clusters
   - effective_shape: first draft assumed plan `cluster_id` = `sha256(GROUP + '\n' + session_id)`; 0/24 matched, dry run showed `unclassified: None` first-loss rows
   - rewrite_provenance: agent
   - event_kind: interface_discovery
   - execution_effect: first dry run's per-target loss stages were incomplete (not accepted)
   - correction_or_annotation: verified join = staged `event_id` → ReviewStore `source_event_ids` → record `origin_cluster_id` (24/24 unique, all in the plan's 24 cluster ids); scorecard now uses it; dry run shows meaningful stages (utility `not_substantive`, discovery SKIP, field-validation DEFER)
   - resource_reference: `s3-scorecard.py` `ev2plan`
   - contract_conflict: none
   - durable_gap_candidate: no

## Summary
All 8 events were caught by the campaign's own fail-closed guards (helper
source-binding check, consistent-read audit, dry runs) before any
acceptance-bearing result was recorded. No handoff-prescribed command was
substituted, re-located, or wrapped; the EX-gated mutation remains
unexecuted pending the operator's single post-exit command.
