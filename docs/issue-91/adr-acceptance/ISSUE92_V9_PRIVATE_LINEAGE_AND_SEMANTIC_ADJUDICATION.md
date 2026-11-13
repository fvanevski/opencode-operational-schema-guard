# Issue #92 / PR #95 — one consolidated V9 authoritative lineage and semantic adjudication handoff

<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
LOCAL_AGENT_PRIMARY=build
REPO=fvanevski/opencode-operational-schema-guard
ISSUE=92
PR=95
BRANCH=issue/92-v7c-accepted
REQUIRED_HEAD=<exact immutable SHA supplied by Central kickoff>
V9_EXECUTION_SHA=05470be563a703b75a6f8c7a5b393871293c0c40
V9_RESULT_SHA=affc70013cba22de988d767072624662b7977b5b
GOVERNING_ADR=docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md
AUDIT_CLI=docs/issue-91/adr-acceptance/issue92-v9-lineage-audit.mjs
AUDIT_TEST=docs/issue-91/adr-acceptance/issue92-v9-lineage-audit.test.mjs
HOST_ENVIRONMENT=CPU_ONLY; private native-source/state review, no GPU jobs
MODEL_INFERENCE=FORBIDDEN; GRAPHITI_WRITES=FORBIDDEN
HISTORICAL_REPLAY=FORBIDDEN; FROZEN_ARTIFACT_EDITS=FORBIDDEN
PRODUCTION_CONFIG_EDITS=FORBIDDEN; SOURCE_SEMANTIC_EDITS=CENTRAL_ONLY
GITHUB_WRITES=FORBIDDEN; NEW_PR=FORBIDDEN; MERGE=FORBIDDEN; ISSUE_CLOSE=FORBIDDEN
PRIVATE_EVIDENCE=host-only mode 0600 or direct user-provided attachment; never public GitHub
AGENT_HARNESS=OpenCode Build or Hermes Build with read-only evidence access

## Mission

One substantive, bounded CPU campaign that establishes what the ORIGINAL V9
source and model receipts actually prove, not another speculative explanation.
Collect all missing adjudication evidence centrally usable to design the
next source correction without further forensics handoffs. DO NOT implement
semantic production changes locally, claim a new prospective PASS, retrofit
the archived A3 score, or prepare/infer V10. No generated model prompts,
model/Graphiti calls or reproduction of the V9 inference.

V9 remains observed numerical FAIL (2/10 credited, 2 control cases/3
episodes), but its stage label digest d1d3ba84... differs from the scored
roster digest bc42ae73.... It is an EXPOSED diagnostic cohort and not an
independently qualifying A3 PASS/FAIL. The new scorer fails closed on drift.
Four valuable cases show zero discovery candidates; four show utility rejection.
Full original source meaning and exact approved-fact-to-lane mapping are not
established by aggregate first-loss counts. Prior handbacks contradicted one
another on V9-V-05/V-08 and fallback. The new Central analyzer must produce
the factual lineage rather than a reconstructed narrative.

## A. Exact-head checkout and native verification

1. Authenticate GitHub PR #95/branch full SHA equals REQUIRED_HEAD. Read the
   nearest project AGENTS.md, ADR, this entire contract, audit helper/test,
   scorer, V9 frozen public evidence. Use host's true GitHub/native Git source;
   preserve any owner checkout and uncommitted developer files.
2. Fetch exact current branch into an isolated disposable detached worktree.
   Fetch BEFORE object/worktree proof (do not rely on cached commit):
     git -C <existing_repo> fetch --no-tags origin refs/heads/issue/92-v7c-accepted
     git -C <existing_repo> rev-parse FETCH_HEAD
   Verify fetch/PR/ref/worktree SHA all equal REQUIRED_HEAD; no force/reset,
   checkout over owner edits, rebase, or new PR. If head moved, STOP STALE.
3. Check the Central audit helper and the latest scorer label-digest guard:
     node --check docs/issue-91/adr-acceptance/issue92-v9-lineage-audit.mjs
     node --test docs/issue-91/adr-acceptance/issue92-v9-lineage-audit.test.mjs
     node --test docs/issue-91/adr-acceptance/issue92-a3-acceptance.test.mjs
     npm run check
     npm test
   Read actual process exit codes. An exact-head successful trusted Actions
   run may replace redundant broad native execution where current policy
   allows, but not focused new helper tests. Run no suite that performs live
   Graphiti/model writes. A real semantic/fixture failure is a Central
   source blocker; no test weakening, silent schema changes or workaround
   to manufacture green. Ordinary host tool/permissions diagnostics permitted.

## B. Run Central read-only lineage auditor on original private V9 artifacts

Locate the ACTUAL original V9 paths from accepted host source, not guessed.
Read original private manifest, original/revised roster snapshots if both
exist, original staging receipt, pre-inference ratification/intent, V9
snapshot.json, plan.json, actual curation-v1 ReviewStore records and real
Graphiti readback UUIDs. Historical state stays untouched. No new model
calls and no re-run of scorer on edited inputs.

Invoke the tracked Central tool from REQUIRED_HEAD using real paths:
  node docs/issue-91/adr-acceptance/issue92-v9-lineage-audit.mjs \
    <ABS_PRIVATE_STATE_ROOT> graphiti-adr92-a3-prospective-v9 \
    <ABS_ORIGINAL_MANIFEST_JSON> <ABS_SCORING_ROSTER_JSON> \
    <ABS_ORIGINAL_STAGE_RECEIPT_JSON> <ABS_RATIFICATION_JSON> \
    <ABS_FROZEN_PUBLIC_FREEZE_RECEIPT_JSON> <ABS_PUBLIC_TERMINAL_SCORECARD_JSON>
The helper only reads and emits non-source-text metadata. Its exit code 2
means a verified discrepancy, not an invitation to rewrite any artifact.
Capture stdout into a private 0600 report if needed (use umask 077); preserve
the native exit status independently from tee/filter/wrappers. Validate
actual stage/plan/record identities, not manually assembled summary counts.
If any helper structural/schema failure arises, inspect its original
source and return an exact Central bug; do not patch production or helper
semantics locally. Record actual model stage call counts from plan.calls,
source-only outcome counts, original case source relationships, and the
unambiguously derived ReviewStore fact source-case mapping.

Prove whether V9 actually has 20 distinct sessions and 18 clusters (which
is impossible under native per-session clustering if each stage event has
one session); prove whether 5 approvals are plan.items vs per-cluster
outcome.approved (different semantics). Resolve V9-V-05 vs V9-V-08 mapped
persisted UUIDs with unredacted private ReviewStore proof, and identify
whether any auto-persisted control came from normal discovery, source-exact
complement, quote salvage or original-source fallback. Do not call a fact
'normal lane' based only on absence of source-only fallback approvals.
For a lane to be PROVEN, bind exact plan item id, source ref, quote digest
and matching immutable model call result/identity. Otherwise label
LANE_UNVERIFIED. Inspect all five remotely persisted UUIDs read-only; do
not rely on one Graphiti group-membership check as proof of assertion
origin.

## C. Independent semantic adjudication of ORIGINAL source meaning

For all ten valuable and ten control cases, read original native user
message bytes and quote the actual contiguous source excerpt PRIVATE only.
Bind source event handle, original UTF-8 hash, time, authenticated role,
session, project, workspace, source class and exact source span. Sanitize
before any public narrative. For each source case, establish:
- EXACT predicate actually asserted by original author (or none);
- status: observed/report, proposed requirement, historical constraint,
  diagnostic uncertainty, question, task instruction, transient/status;
- independent durable utility for later development in THAT project, not
  generic technical-looking text; a task instruction CAN contain a durable
  requirement, so do not make form/keywords an automatic veto;
- fact atomicity, multiple independent propositions, source span coverage,
  support and corroboration limitations; distinguish desired from deployed;
- if valuable label is unsupported, preserve the frozen label unchanged,
  report LABEL_UNSUPPORTED with precise reason rather than relabeling;
- if a control contains an independently durable predicate, report
  CONTROL_CONTAINS_DURABLE_PREDICATE rather than declaring false-positive
  automatically because the frozen control label says so;
- model's exact discovery/support/utility decision and reason on each
  case, where genuine; classify true first loss separately from curator
  disagreement and invalid gold label;
- for 5 persisted facts, adjudicate source support, precise temporal
  metadata, project-scope, independent future utility, duplicate relation,
  and the exact source/plan/lane binding.

Use independent human-readable evidence-role assessment separate from the
V9 curator model outputs and frozen gold labels. Do not ask the model under
evaluation to generate revised gold answers. Preserve uncertainty; do not
promote a user claim into a deployed state or independently verified fix.
Do not treat one generic task-oriented source as proof of no durable content,
nor count multiple separate predicates from one source as duplicates
without semantic equivalence.

## D. Freeze/source chronology and missing A1 denominator

Compare original SHA256 of every original private frozen artifact,
and distinguish (a) published receipt label digest, (b) immutable stage
label digest, (c) original and later roster digests, (d) ratification digest,
(e) final scorecard digest. The scorer guard now correctly flags any
discrepancy; never update/replace frozen originals to obtain PASS.
Original Git commit times are not by themselves push/ratification times.
Verify the earliest actual immutable model intent, host clock source and
ratification record against pre-inference publication using available
independent contemporaneous evidence. When evidence cannot establish true
chronology, report UNVERIFIED; do not call a rounded 2-hour shift
'corrected' without host measurements.

Recover the actual eligible raw native opportunity inventory count 1174
only if source query/DB identity proves it, and separately compute A1 capture
admission/drop classes if original raw event data supports them. Never
substitute 20 selected cases / 1174 inventory for the raw-native-event
opportunity-recall metric. If opportunity denominator is absent from original
authority audit, report null and a feasible collection method for future
A3 rather than retroactively rewriting this cohort.

## E. Report and close this ONE evidence campaign

Return TWO distinct artifacts:
  1. A SANITIZED direct conversational handback containing deterministic
     audit counts, conflict codes, 20-case classification and exact stage
     attribution; no raw source texts, full UUIDs, filesystem home paths or
     model prompts. No public GitHub commit.
  2. A PRIVATE operator-supplied attachment (mode 0600 file) containing the
     original-source evidence packets for Central semantic review. Include
     source excerpt/offset and exact native hash for every case; ten
     especially disputed cases (V01/V02/V03/V04/V06/V07/V09/V10/C05/C09)
     get exact model-support/utility reason, original fact quote and
     contextual qualifiers. Include all five fact receipts, native ReviewStore
     SHA, plan item id and model-call SHA so Central can independently inspect
     the proposed production remedy. The user will upload/transfer this
     privately; DO NOT post it to GitHub, OpenViking, vector store, or an
     unrelated agent or URL.

No new prospective or model/Graphiti campaign. No runtime source/test edits
or scorer changes by the local agent. Fix ordinary environment/permission/
path issues autonomously without authority drift. If native tests fail,
return full source-bound failure and exact-host metadata; do not waive tests.
If source implies a future systematic guard, identify the invariant and
minimum counterexample rather than implementing it locally. The next
Central turn owns source correction/test design and, once exposed-case
evidence supports readiness, future prospectively ratified qualification.

MANDATORY HANDBACK:
RESULT=LINEAGE_VERIFIED|PROVENANCE_BLOCKED|SOURCE_DEFECT|STALE
HEAD_ADMITTED=<full SHA>; HEAD_FINAL=<full SHA>
SOURCE_DIFF=<changed paths vs predecessor and V9 source>
TEST_EVIDENCE=<all actual exit codes, counts, CI run full SHA>
AUDITOR=<command, result code, output SHA256 and error codes>
FROZEN_HASH_MATRIX=<manifest, stage/roster labels, score, ratification>
CLUSTER_AND_SESSION_PROOF=<native event count, session count, clusters, shared IDs>
FIVE_FACT_LINEAGE=<record_id digest, source case, cluster, quoted fact SHA,
  review state, UUID proof, selection lane or UNVERIFIED>
CASE_SEMANTIC_MATRIX=<all 20 rows, first-loss and label adequacy>
GOLD_LABEL_LEAKAGE=<proof that no labels reached curator prompt>
FIRST_LOSS_DRIVERS=<only independently evidenced source vs model causes>
TIMELINE=<source of clocks, first model intent, ratification/publication>
A1_DENOMINATOR=<raw opportunities, exclusions, verified vs unverified>
PRIVATE_CENTRAL_PACKET=<local path, SHA, permissions, user handoff method>
HISTORICAL_INTEGRITY=<all old state/group and V9 files unmodified>
NEXT_SOURCE_CORRECTION=<one or two proposed invariants, with counterexamples>
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<key>
      requested_shape=<sanitized requested invocation>
      effective_shape=<actual command|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<bounded explanation>
      replacement_shape=<corrected command|none>
      recipe_reference=<GHDEV-10 key|none>
      resource_reference=<plugin/repo resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
Never call V9 a valid prospective A3 PASS/FAIL under the new stage-label
guard; V9 remains an observed numerical FAIL and an exposed diagnostic.
<<< LOCAL_AGENT_CONTRACT_END >>>
