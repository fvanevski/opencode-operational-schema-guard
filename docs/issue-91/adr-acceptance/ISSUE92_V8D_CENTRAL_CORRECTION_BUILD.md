<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
LOCAL_AGENT_PRIMARY=build
REPO=fvanevski/opencode-operational-schema-guard
ISSUE=92
PR=95
BRANCH=issue/92-v7c-accepted
TARGET_HEAD=<use exact SHA in Central kickoff, not guessed>
PREDECESSOR_HEAD=9ee9cdc8d9b2657f29f0fe8676ba83043215eac1
GOVERNING_ADR=docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md
ENVIRONMENT=CPU_ONLY; local mock tests, no GPU-intensive inference
SEMANTIC_IMPLEMENTATION=central-owned / forbidden to local agent
MECHANICAL_REMEDIATION=allowed (value-preserving diagnostics only)
REMOTE_UPDATE=allowed only for one necessary bounded mechanical correction
PUBLICATION_FRESH_REVIEW=if required by current runtime
PUBLICATION_VERIFY=if required by current runtime
NO_NEW_PR; NO_MERGE; NO_ISSUE_CLOSE; NO_DEPLOYMENT
NO_LIVE_GRAPHITI_WRITES; NO_EX_MODEL_CALLS; NO_NEW_PROSPECTIVE_COHORT
NO_OLD_COHORT_REPLAY; NO_HISTORICAL_FREEZE_OR_LABEL_MUTATION
PRODUCTION_CONFIG_AND_MEMORY=read-only

MISSION
Integrate and verify one Central-staged source/test change under ADR-91.
Do all related CPU/native verification in ONE campaign. Do not rebuild the
architecture, tune model prompts, redesign the scorer, or launch side issues.

CARRYOVER
- Source changed only by Central on this target: finite-batch sibling-source
  recovery and the zero-control-fact persistence scorer gate, with tests.
- V8d terminal original result remains FAIL: 5/10 valuable, 5/8 useful
  among grounded, 8/8 reconciled Graphiti episodes. Do not re-score history
  as PASS or rerun 74 original model calls.
- v01/v07/c01 share a session. c01 is only review context in the v01 fact,
  never a persisted factual source. v07 had no own plan item. v02 was utility
  deferred; v04 is proposed; v06 is a source-reported transient failure;
  v08 is uncertain. Preserve all original temporal and source qualifiers.
- Read docs/issue-91/evidence/92-pr95-v8d-first-loss/summary.json,
  not raw logs or historical memory summaries as mutable authority.

STEP A — PROVE CURRENT SOURCE
Inspect caller checkout, existing owner changes, and live PR/branch exact SHAs.
Fetch current branch into an isolated disposable exact-head worktree, without
reset/clean/rebase/force/pull of user's checkout. Fresh remote fetch precedes
local ref/object proof; prove TARGET_HEAD in both GitHub and worktree.
Stop STALE if branch ref moved unexpectedly. Nearest project AGENTS.md and
current actual toolchain are authoritative. Compare exact diff from PREDECESSOR:
only two source files, two tests and this tracked contract may change.

STEP B — FOCUSED + INTEGRATION TESTS
Run (from exact root with current Node project tooling):
  node --test docs/issue-91/adr-acceptance/issue92-a3-acceptance.test.mjs
  node --test docs/issue-78/v2-curator/finite-batch.test.mjs
  npm run check
  npm test
Capture each true exit code and decisive failed output; do not infer PASS from
filtered stdout. When the current trusted exact-head Actions producer satisfies
an equivalent broader deterministic profile, consume its complete source-bound
receipt instead of wasting a duplicate model-driven full-suite run.
Prove: a factual source belonging to a nonvaluable control fails the A3 gate;
a control that occurs ONLY in rec.events/source_event_ids does not fail it;
9/10 useful grounded cases with zero control-source facts still pass.
Prove: separate original messages in ONE session can each yield an independently
supported, useful, atomic fact under the <=3 per-cluster bound, with distinct
review IDs, source refs and episode UUIDs, while low-value sibling stays out.
Keep EX admission, source/offset/claim support, privacy, temporal, scope,
CAS, retry, no-replay and historic one-fact regressions green.

STEP C — V8D EXPOSED READ-ONLY TRIAGE
Use existing frozen V8d receipts and private native source hashes ONLY for
diagnostic corroboration; no model call, graph write, frozen plan mutation or
new prospective run. Report v07's formerly unrepresented sibling as now
'eligible for separate source-only utility review', not 'persisted'; confirm
v02 independent utility DEFER is not silently reversed; check v04/v06/v08
qualifiers are not promoted from proposed/reported/uncertain to verified.
Report first-loss stage mapping, actual CPU/mock evidence, and which next
non-overlapping prospective conditions remain unproven.
Do not upload raw prompts, user messages, personal data, credentials, DB
exports or Graphiti payloads to public GitHub.

STEP D — SELF-HEAL ONLY MECHANICAL STATIC FAILURES
If and only if canonical safe formatter/linter or whitespace normalization is
required, adjust implicated files value-preservingly in disposable workspace,
inspect entire diff, run focused checks, honor live required publication
Fresh-review/Verify child gates, then optionally make ONE non-force bounded
commit to same branch with exact remote-head preflight/readback. A changed
commit requires re-admission and fresh validation. If failure concerns behavior,
test meaning, scorer/control policy, semantics, dependencies, source authority,
or security, stop semantic mutation and return a precise Central blocker.
Do not change production config or historic receipts to achieve green tests.
One passing campaign suffices; do not add follow-up micro-campaigns.

RETURN ONE DIRECT CONVERSATIONAL HANDBACK:
RESULT=PASS|FAIL|BLOCKED|STALE
HEAD_ADMITTED=<full 40-char SHA>
HEAD_FINAL=<GitHub full 40-char SHA>
DIFF_SCOPE=<exact changed paths; any bounded mechanical correction>
TEST_EVIDENCE=<command, workdir, native exit, counts, failures; Actions receipts>
SCORER_REGRESSIONS=<control factual source vs sibling-only context>
SIBLING_RECOVERY_REGRESSIONS=<source refs, separate reviews, UUIDs, bound, negatives>
EXPOSED_V8D=<v02,v07,v04,v06,v08 stage-level facts and limits>
SOURCE_TEMPORAL_PRIVACY_EX_INVARIANTS=<checks and outcomes>
HISTORICAL_STATE=<immutable V8d identities unchanged>
FOLLOWUP_BLOCKERS=<only real blockers, no speculative extra campaign>
NEXT_PROSPECTIVE_READINESS=<what remains to independently freeze/prove>
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<scenario key>
      requested_shape=<sanitized requested invocation>
      effective_shape=<actual command|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<bounded diagnostic>
      replacement_shape=<corrected invocation|none>
      recipe_reference=<GHDEV-10 key|none>
      resource_reference=<plugin/repo resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
Never claim this deterministic validation alone is an A3 prospective PASS,
independent semantic review, merged-main evidence or production activation.
<<< LOCAL_AGENT_CONTRACT_END >>>
