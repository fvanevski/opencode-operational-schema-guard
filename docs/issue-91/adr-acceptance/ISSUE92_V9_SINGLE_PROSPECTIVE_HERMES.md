# Issue #92 / PR #95 — V9 single-cohort prospective qualification and closure-readiness
#
# Central authored this contract and the temporal-authority source/test fix
# together on the existing PR branch. It is NOT a record of tests or an
# authorization to bypass the post-exit EX gate.

REPO=fvanevski/opencode-operational-schema-guard
ISSUE=92
PR=95
BRANCH=issue/92-v7c-accepted
REQUIRED_HEAD=<full 40-char exact SHA supplied in Central kickoff>
PREDECESSOR_HEAD=6d7f16a05c1f7b44c80628e584d4b212c9962e15
PRIMARY_AGENT=OpenCode Build (Hermes Build for post-exit host execution, if needed)
ENV_CPU=source audit, checks, freeze, ratification, scoring, readback, publication
ENV_GPU=one admitted local model/Graphiti run ONLY after all CPU preflights pass
GOVERNING_ARCHITECTURE=docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md
ACCEPTANCE=docs/issue-91/adr-acceptance/issue92-a3-acceptance.mjs
SCORE_CLI=docs/issue-91/adr-acceptance/issue92-a3-score.mjs
STAGING_CLI=docs/issue-91/adr-acceptance/issue92-a3-stage.mjs
MODEL_CLI=docs/issue-78/v2-curator/curator-cli.mjs
EVIDENCE_ROOT=docs/issue-91/evidence/92-pr95-v9-prospective
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed (one sanitized pre-inference freeze commit, one sanitized terminal-result commit, same branch)
EVIDENCE_PACKET_REQUIRED=yes
NEW_PR=forbidden
MERGE=forbidden
DEPLOYMENT=forbidden
ISSUE_CLOSE=forbidden
HISTORICAL_REPLAY=forbidden
OLD_MODEL_INTENT_REUSE=forbidden
OLD_GRAPHITI_GROUP_WRITE=forbidden
SOURCE_OR_SCORER_SEMANTIC_EDITS=central-owned, forbidden locally
MECHANICAL_REMEDIATION=allowed only for provably value-preserving static repairs
PROSPECTIVE_RUN_LIMIT=ONE new cohort, ONE post-exit inference attempt; no result-driven retry, relabel or V10

## Goal and authority

Advance #92 through a genuine new A3 result, without another exploratory
campaign. Correctly validate the already-staged Central change, independently
ratify ONE new real native-source 20-case cohort, then run its single admitted
post-exit evaluation if and only if every gate below is positively evidenced.
One cohesive assignment, not a chain of micro-handoffs. Safe host/launcher,
endpoint, file-permission, fixture and diagnostic repairs are within Build
autonomy when they do not change published source/labels/gates or erase a
possibly executed intent. Do not create a new repo subsystem or optimize
prompts/model settings to pass the cohort.

Source change: deterministic original-source fallback cannot infer whether a
statement is implemented/observed/proposed. It now freezes temporal_status
unknown for fallback facts, leaving verbatim source qualifiers intact.
Independent quote/utility review, original scope, and one-fact/episode still
govern. Do NOT substitute a regex-based temporal classifier or overwrite
model-chosen temporal statuses in normal discovery/claim-review lanes.

Carryover authority:
- Earlier V7c PASS (9/10 useful, source-grounded, 0 controls) remains history.
- V8d FAIL remains 5/10 valuable coverage, 5/8 independently useful among
  grounded, 5 useful independent facts, 8/8 Graphiti remote positive.
- Frozen v8/v8c/v8d manifests/labels/model calls/episode UUIDs never change.
- V8d v01/v07/c01: shared session, v07 not selected, c01 was review context
  only, not fact source. v02 was deferred by utility; v04 proposed; v06
  reported transient failure; v08 tentative. ALL are EXPOSED, not V9 holdout.
- Previous source/label overlap and false 'RETAIN' descriptions in v8c show
  why source-ID uniqueness alone does not establish new factual opportunity.
- Issue #92's hard A1/A2/A3 authority and ADR-91 temporal/security bounds
  remain governing. Do not weaken >=85% valuable retention, >=90% grounded,
  >=75% useful among grounded with >=8 independent useful facts, zero
  control-sourced persisted facts, or zero authority/privacy/EX breaches.

## A. Host CPU exact-head admission, source integrity and verification

1. Read current issue #92, current PR #95, ADR-91, nearest AGENTS.md and
   this FULL exact-head file. Preserve owner checkout/uncommitted work.
   Fetch a CURRENT remote ref BEFORE local object/worktree materialization:
     git -C <repo> fetch --no-tags origin refs/heads/issue/92-v7c-accepted
     git -C <repo> rev-parse FETCH_HEAD
   Require FETCH_HEAD, GitHub PR head and REQUIRED_HEAD equal. Work in a
   collision-safe isolated detached worktree at that SHA; prove git rev-parse
   HEAD and source/test blob SHAs. If remote advanced, STOP STALE. No reset,
   rebase, force, destructive clean, automatic ref move or new PR.

2. Diff REQUIRED_HEAD against PREDECESSOR_HEAD: only
     docs/issue-78/v2-curator/finite-batch.mjs
     docs/issue-78/v2-curator/finite-batch.test.mjs
     this new local contract
   should differ. Check the exact temporal-state fix, existing shared-session
   recovery, A3 scorer zero-control gate, and all unchanged security/Graphiti
   invariants. If independent examination uncovers a genuine functional flaw,
   record the smallest source-bound blocker and STOP before inference, not
   'fix' it in local production code.

3. From the exact worktree (native statuses, no pipe-to-tail exit masking):
     node --check docs/issue-78/v2-curator/finite-batch.mjs
     node --test docs/issue-78/v2-curator/finite-batch.test.mjs
     node --test docs/issue-91/adr-acceptance/issue92-a3-acceptance.test.mjs
     node --test docs/issue-78/v2-curator/issue92-source-fact.test.mjs
     node --test docs/issue-78/v2-curator/fact-review.test.mjs
     npm run check
     npm test
   Existing trusted Actions for the exact PR HEAD may provide the broader
   verification receipt (record run, head, check names, outcomes), but focused
   semantic regressions still require their native direct exits.
   Explicitly prove proposed and hedged source-only passages preserve exact
   source quotes while receiving Temporal: unknown, not Temporal: observed.
   Prove existing sibling positive/negative and 3-fact bounds, scorer control
   factual-source vs context-only sibling, original evidence-class/time/scope,
   private-data/offset/structural atomicity, EX/once-only/CAS/retry no-replay.
   There is NO permission to weaken assertions, test fixtures, scorer, lint
   gates or validation standards merely to obtain green.

4. No model or Graphiti writes during Steps A and B. Do not rerun historical
   inference. Local host-side exposed deterministic test pass means SOURCE
   READINESS only, not a fresh prospective A3 PASS.

## B. CPU prospective V9 source selection, true independence and pre-freeze

Prepare exactly ONE new prospectively held-out 20-case corpus, with 10
independently useful durable technical targets and 10 nonvaluable controls.
Use authentic canonical native OpenCode messages, not fabricated/synthetic
sessions, artificial message IDs, model-generated evidence, OpenViking memory
echoes, private credentials or repeat technical predicates in new wording.
Preserve real message/session IDs, source locator, role=user, project/workspace,
timestamp, UTF-8 native text hash and scope, full-input privacy screens, and
the real original source byte offsets. Never attribute missing native data.

Sampling: first inventory eligible raw original-source opportunities using a
predeclared deterministic chronological/family selection strategy. Record
the candidate inventory size, eligibility and exclusions with sanitized
reason codes before selecting labels. Cover >=3 substantive task families
and normal real developer material, including mixed-session messages,
specific source-reported/qualified defects, proposed requirements, durable
constraints, and realistic uncertain/transient/negative controls. Prefer
natural shared-session multi-opportunity material if it occurs in the eligible
inventory; never invent or rekey events just to exercise the sibling fix.
Do not cherry-pick only trivial controls or give valuable case labels to a
question asking for an unknown answer, task-only instructions, generic status
or a guessed/verified deployment outcome.

Perform TWO independent nonoverlap checks against ALL H2-H4, B/S1-S6,
V2-V8/V8c/V8d, prior A3/exposed and accepted-graph source evidence:
  (i) source identity/native message/hashed excerpt;
  (ii) substantive technical predicate/underlying fix or configuration
      family, not mere different wording, time, path or message ID.
If source cannot support 10 useful independent targets + 10 representative
controls, STOP COHORT_NOT_RATIFIABLE; no inference, no adaptive label padding.

Complete original-source, source support, temporal, utility and privacy
review by an independent pre-inference reviewer (separate Evidence review
role or otherwise demonstrably independent from Build/curator inference).
Obtain explicit written decisions for EVERY source case, including original
native quote, target predicate and rationale, evidence class and observed/
historical/proposed/unknown semantics, and independent usefulness. The
model whose output is to be evaluated must NEVER supply its own gold labels.
Report reviewer identity/role and timed ratification before first model
intent. The Central-authored criteria here are fixed; do not change them.

Privately freeze 20 original cases with private manifest mode 0600, state
root 0700, ten valuable and ten controls, exact 64-hex SHA256 manifest,
label SHA256 and source/roster binding; preserve COMPLETE native text privately.
Use current supported issue92-a3-native-source and issue92-a3-stage schema,
not a new one. Freeze a new unused group
  graphiti-adr92-a3-prospective-v9
ONLY if a read-only check confirms zero remote episodes, zero prior model/
Graphiti intent/marker, empty staging/ReviewStore and no competing owner.
Otherwise select a new never-used vN group, record why, never clear/reuse
an old group. Match the roster group exactly.

Preflight scorer with incomplete results: MUST refuse PASS/score until
complete, ratified source/remote evidence exists. Require deterministic
source staging with (absolute paths, real private data):
  node docs/issue-91/adr-acceptance/issue92-a3-stage.mjs \
    <ABS_ROSTER_JSON> <ABS_PRIVATE_MANIFEST_JSON> <ABS_PRIVATE_STATE_ROOT>
Read back staged receipt, each original source hash, all 20 stage mappings,
actual candidate queue, group identity, 20-case denominator, and private
file permissions. Keep the exact stage receipt immutable from here onward.

PRE-INFERENCE PUBLICATION IS MANDATORY FOR CHRONOLOGY. Publish ONE
SANITIZED source/label freeze digest and case-ID/family/nonoverlap summary
under EVIDENCE_ROOT/freeze/ (no private native text, actual sensitive paths,
raw prompts or credentials). Non-force CAS to the SAME PR #95 branch with
exact-head preflight and authoritative ref/commit/blob readback. The new
freeze evidence commit must be the ancestor of first model intent. Preserve
the earlier code/test source SHA and prove all code/scorer blobs unchanged
despite the evidence-only commit. No new PR. A remote race is STALE: stop,
do not rebase, force or silently select a different source.

## C. GPU/model+Graphiti: one conditional post-exit prospective execution

AUTHORIZATION=ONE EX-admitted V9 prospective run, conditional on EVERY A/B
gate PASS, independent ratification, immutable stage, verified pre-inference
freeze evidence commit, source/no-code-drift identity, new empty group and
valid original host EX bridge. The local agent may proceed within this one
assignment without asking Central to restate the already-approved standards.
If any is unverified or failed, DO NOT INFER; return the blocker with prepared
commands/receipts. Do not seek a more favorable cohort or re-label.

Use the already installed authenticated local model + existing Graphiti MCP
under canonical kernel-backed exclusive post-exit flock, actual harness
exit/quiet grace, scheduler idle and resolved previous submissions. A
GHDEV_MEMORY_POST_EXIT_LEASE env marker by itself is NOT admission. Verify
inherited held FD and negative/positive admission preflight. Interactive
OpenCode never directly runs model or Graphiti writes. If using OpenCode,
prepare the existing accepted post-exit launcher, exit the interactive
harness, and let the authorized EX holder perform the ONE shot; Hermes may
act as accepted nonblocking supervisor only within current host policy.
On harness transition return a bounded HARNESS_TRANSITION_CARRYOVER
with exact source, frozen hashes, accepted launcher, current EX status,
last safe operation and unknown outcomes; do not restart model intent.
No timer/background claim unless an actual approved launcher is armed.

Pin existing actual V8d/V7c proven model alias, backend, policy,
temperature, token/timeout parameters and supported EX controller from
authenticated private prior execution, with NO tuning to improve V9.
Required CLI mode (invoke through validated Python EX holder, NOT directly
from an interactive session; add actual source-verified endpoint and env):
  node docs/issue-78/v2-curator/curator-cli.mjs drain \
    --group <V9_GROUP> --state-dir <ABS_PRIVATE_STATE_ROOT> \
    --endpoint <AUTHENTICATED_LOOPBACK_GRAPHITI_MCP> \
    --finite-batch on --novelty-policy recall \
    --source-recovery on --resilient-discovery on \
    --claim-evidence on --source-exact-complement on \
    --source-quote-salvage on \
    --max-clusters 24 --max-candidates 72 --max-seconds 3600
Compare optional historical V8d flags against the frozen launcher receipt;
retain the exact approved policy, do not guess or substitute flags. Do not
add --fact-review on with --finite-batch on. No model call before first
intent attestation. Freeze once-only marker and call intent receipts before
actual model execution, exactly once. If none was initiated due to recoverable
preflight/service failure, repair ordinary environment bindings within scope
and revalidate; this is NOT a model replay.

Post-write ambiguity: never blindly re-call model/add_memory or replay a
possibly submitted operation. Preserve intent/ReviewStore, hold EX if needed
for accepted reconcile-only, use positive get_episodes/UUID/source-index
readback, stop if unresolved. Do not clear groups or manufacture success.
Maintain one atomic fact per episode, <=3 per authentic cluster, distinct CAS,
UUID/source and no Graphiti write to any production/historical group.
Original full-input privacy and OpenViking self-context exclusion stay hard.

## D. CPU post-run independent adjudication, score and report

Perform independent, blinded-to-curator-utility case/fact judgment using
original source meaning, stage mapping, frozen target predicates, actual
quotes, evidence/temporal classes, and remote episode contents. Review all
10 valuable targets AND all 10 controls; do not credit a sibling just
because another fact in its cluster persisted. All persistences must have
one fact, real UUID, positive group/remote episode, ReviewStore/source-index
and original-source quote checks. Count duplicate, nonvaluable, unsupported,
temporal upgrade, wrong-group, secret and EX events separately. Verify that
a proposed network requirement is source-stated and not claimed deployed;
a hedged cause cannot be promoted to verified root cause. No retroactive
changes to v8d or prior labels/remote group.

Score via the existing exact-head canonical eight-argument command:
  node docs/issue-91/adr-acceptance/issue92-a3-score.mjs \
    <ABS_ROSTER_JSON> <ABS_STAGE_RECEIPT_JSON> \
    <ABS_PRIVATE_STATE_ROOT> <V9_GROUP> \
    <ABS_POSITIVE_REMOTE_READBACK_JSON> \
    <ABS_PREINFERENCE_RATIFICATION_JSON> \
    <ABS_INDEPENDENT_FACT_ADJUDICATIONS_JSON> \
    <ABS_AUTHORITY_AUDIT_JSON>
Read real process exit status; non-PASS is a truthful outcome, NOT a reason
to adjust private roster, scorer, model options, graph group or rerun.
Require >=9/10 valuable coverage, grounded >=90%, useful among grounded
>=75% WITH >=8 independent useful persisted facts, 0 control-sourced
persistences, 0 privacy/scope/fabricated/false-verified/EX breaches, positive
remote UUIDs/index, and complete fact-level adjudication. Preserve 95%
Wilson intervals. Report missing/insufficient samples honestly and break
down each first-loss stage.

Publish at most ONE additional SANITIZED terminal evidence-only commit
under EVIDENCE_ROOT/result/ on the existing PR branch with exact-head
non-force preflight/readback. Preserve the pre-inference freeze commit as
an ancestor; source/scorer/test blobs unchanged, frozen private state
unchanged. No raw prompts or model replies, private manifest, transcripts,
real host paths or secrets in GitHub evidence. No new PR, merge, deploy or
issue close.

## E. Handback and stop rule

Work comprehensively in this assignment. Do not spin off follow-up side
campaigns for routine environment/test integration. A functional
implementation/standard/safety defect must come back to Central; do not
resolve it by weakening validation, unsafe permissions or change to labels.
Failure of V9 itself is terminal immutable evidence, not permission to
shop for a passing cohort. Keep production inactive.

RETURN one complete handback:
RESULT=V9_PASS | V9_FAIL | V9_NOT_EXECUTED | SOURCE_DEFECT | COHORT_NOT_RATIFIABLE | BLOCKED | STALE
EXECUTION_SOURCE_SHA=<exact Central implementation 40-char source SHA>
PR_CURRENT_HEAD=<exact latest evidence-only commit 40-char SHA>
SOURCE_BLOBS=<finite-batch, tests, scorer, stage CLI exact Git blob>
NATIVE_VERIFY=<focused commands/counts/exits, full check/test or matching trusted exact-head CI receipt>
TEMPORAL_REPAIR=<unknown for fallback, status qualifiers, direct episode mock result>
FROZEN_SOURCE=<20 native cases / 10 valuable / 10 controls, original source/temporal review, 3+ families, sample exclusions>
NONOVERLAP=<native identity AND semantic predicate proof, exclusions>
RATIFICATION=<independent reviewer, chronology before model intent>
PRIVATE_FREEZE=<sha256 manifest, label, roster, staging receipt; modes; private readback>
FREEZE_PUBLICATION=<exact freeze evidence commit/tree/readback, before first model intent>
EX_BINDING=<kernel held FD, harness exit, quiet grace, model/Graphiti endpoints, once-only marker, no unrelated activity>
MODEL_CALLS=<count / frozen intents / error count / backend settings / no replay>
REVIEW_AND_PERSISTENCE=<per-fact provenance, CAS, remote UUID, graph/source index, unresolved count>
SCORER_RESULT=<exact scorecard digest / native exit / each gate / Wilson intervals / 10-case first loss>
HISTORICAL_INTEGRITY=<v7c/v8d and other frozen episodes/labels/model calls unchanged>
PRODUCTION_UNCHANGED=<loaded source/config/services and historical groups>
EVIDENCE_PUBLICATION=<freeze and result full SHAs, exact-head CAS/readback or reason blocked>
SOURCE_EDITS=<none; or mechanical-only path with exact branch/CI re-admission>
COMMAND_SHAPE_FRICTION=COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<short key>
      requested_shape=<sanitized submitted command>
      effective_shape=<actual execution|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<diagnosis/repair>
      replacement_shape=<corrected shape|none>
      recipe_reference=<GHDEV-10 key|none>
      resource_reference=<relevant tool or file|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
NEXT_DECISION=<Central independent exact-head semantic PR review, remediation or merge gate; no self-authorized closure>

If GPU/execution requires a different harness, include
HARNESS_TRANSITION_CARRYOVER={source_harness,target_harness,exact_source_head,
immutable_manifest_hashes,launcher_identity,last_safe_step,EX_status,
remaining_work,unresolved_effects}.
Never assert prospective PASS from CPU mocks, from a successful CI check,
from previous V7c PASS, or from Graphiti group membership alone.
