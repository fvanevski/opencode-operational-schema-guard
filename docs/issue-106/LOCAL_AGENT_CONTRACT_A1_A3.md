<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
LOCAL_AGENT_PRIMARY=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE=#106
PARENT=#105
WORKING_BRANCH=issue/106
EXPECTED_REMOTE_HEAD=<provided in kickoff, verify full SHA>
TRUSTED_BASE=df703861714717b795465423939f4563cb3d08e6
CAMPAIGN=A1_A3_SOURCE_COVERAGE_WITHIN_ONE_BRANCH
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed
EVIDENCE_ROOT=docs/issue-106/evidence/a1-a3-host
EVIDENCE_PACKET_REQUIRED=yes
EVIDENCE_ARCHIVE_REQUIRED=yes
SEMANTIC_REMEDIATION=forbidden
HOST_PRODUCTION_MUTATION=forbidden
GRAPHITI_REMOTE_MUTATION=forbidden
HISTORICAL_REINGESTION=forbidden

Objective: qualify the Central-staged #106 comparison and source-oriented candidate as one coherent CPU/host source campaign. This is not authority to redesign capture, train models, start an EX drain, rewrite a production service, or create a PR. Inspect the repository instructions and exact latest branch source before execution. Do normal preparation yourself: inspect the existing checkout and dirty state; safely fetch issue/106, authenticate the full remote SHA, and use a clean isolated worktree if the developer checkout is dirty or stale. Never reset/clean/rebase/overwrite unrelated work. Record exact local/remote source tree and actual current host OpenCode/plugin/config/source group/selected capture hooks and source/archive state non-secretly. Do not treat historical V1 runtime guards as stock V2 public authority.

1. Read docs/issue-106/A1_A3_ARCHITECTURE.md and compare.mjs and the production paths it imports. Map actual prompt/context/execute.after/assistant hook use, effective stock OpenCode version, capture activation and caller argv; distinguish intended source from installed source. Do not expose credentials, raw prompt text or private path contents. Validate actual queue status/read-only drop counters and oldest actionable pending item; explicitly distinguish event drop counters from durable queue-full and archival counts.
2. Run CPU-only from this exact working tree: node --check on changed .mjs files; node --test docs/issue-106/capture-coverage.test.mjs docs/issue-78/v2-candidate/candidate.test.mjs docs/issue-78/v2-candidate/long-prompt.test.mjs docs/issue-78/v2-curator/curator.test.mjs docs/issue-99/archive.test.mjs docs/issue-100/autonomous-policy.test.mjs. Run npm run check and npm test if appropriate in the same campaign. Do not alter tests, fixtures, invariants, privacy gates, EX admission, trusted control, CI or dependencies just to pass. If a genuine source regression is found, return the complete diagnostic and minimal Central-ready patch proposal; do not silently implement semantic behavior changes.
3. Run node docs/issue-106/compare.mjs and freeze its structured baseline-vs-candidate result, including original-source inclusion, event IDs, offsets, hard negative cases and source-oriented distinct message capacity. The frozen synthetic cohort is not a real native holdout and its model-slot result is a capacity bound. For a small bounded set of actually observed safe native user/tool/assistant messages, select and privately grade original-source useful opportunities *before* testing the two selectors if source is available lawfully without production mutation. Never export raw host-private messages; report separately sanitized source-excerpt hashes, eligibility reason, per-variant considered unique opportunities, and actual missing-ID classes. When native observations are unavailable, report REAL_CASES=0/UNVERIFIED and retain the synthetic result; do not invent them. No network model or Graphiti calls in this phase.
4. Verify no modification of production config/services, source queue, ReviewStore, episode-index, Graphiti/OpenViking stores or shared EX/scheduler state. Host inspection must be read-only and should not start a model-backed drain while the interactive harness is active. No service restart is required for this CPU/source slice. Do not run destructive cleanup or Graphiti mutation to obtain a benchmark.
5. Produce a reviewable evidence matrix and one sanitized operator-attachable tar.gz: (a) exact source/installed identity + hook/config mapping; (b) frozen synthetic per-case JSON outputs and full commands/exits; (c) source regression results and relevant failure excerpts; (d) read-only host queue/status/drop counters/age and preexisting versus changed behavior; (e) privacy, native user/assistant/tool, weak-ID and source-span negative checks; (f) baseline/candidate decision with limits, CPU work and omitted observations; (g) full source diff from TRUSTED_BASE to tested tree, plus all agent-owned changes; (h) privacy manifest with each file path, size, SHA-256, origin, redactions and missing reason. Exclude raw provider payloads, private source text, full logs and backups. Provide a SHA-256 of the finished tar.gz, and a manifest integrity binding outside the archive. GitHub evidence publication is optional and allowed once only under EVIDENCE_ROOT if fully public safe, with exact-parent remote readback; no source commit/push and no new PR. If publication is blocked, keep the attachable archive and say so, rather than widening authority.
6. STOP with PASS, FAIL or BLOCKED and the evidence packet, not an implementation side-campaign. Minor mechanical corrections to private diagnostic output paths/commands are allowed, but repo source edits are not. Central owns source decisions and review; report a concrete blocker with observed regression, plausible current reachability and material #106 acceptance impact.

HANDOFF:
  disposition=PASS|FAIL|BLOCKED
  remote_head_sha=<full 40>
  tested_commit_sha=<full 40>
  source_tree_sha=<full 40>
  observed_host_version=<exact|UNVERIFIED>
  installed_capture_identity=<exact hash/path or UNVERIFIED>
  installed_worker_identity=<exact hash/path or UNVERIFIED>
  installed_options_and_hook_kinds=<sanitized verified facts or UNVERIFIED>
  source_cases_synthetic=<n>
  source_cases_real=<n or UNVERIFIED>
  baseline_distinct_opportunities=<n or UNVERIFIED>
  candidate_distinct_opportunities=<n or UNVERIFIED>
  privacy_scope_identity_regressions=PASS|FAIL|BLOCKED
  queue_active_archived_drops_oldest=<read-only exact counts/time or UNVERIFIED>
  test_commands_exits=<literal invoked commands and exits>
  source_mutation=none|details
  github_evidence_publication=COMPLETED|BLOCKED|NOT_REQUESTED
  evidence_commit_sha=<full 40 or none>
  archive_path=<operator-attachable file>
  archive_sha256=<sha256>
  manifest_sha256=<sha256>
  missing_observations=<explicit list>
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<short task scenario>
      requested_shape=<sanitized requested invocation>
      effective_shape=<same-as-requested|actual effective invocation|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<diagnostic/correction>
      replacement_shape=<successful shape|none>
      recipe_reference=<GHDEV-10 key|none>
      resource_reference=<resource used|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
<<< LOCAL_AGENT_CONTRACT_END >>>
