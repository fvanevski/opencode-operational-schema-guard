<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
LOCAL_AGENT_PRIMARY=build
TASK=Issue #81 consolidated recall-association regression and installed-Graphiti readiness
REPO_ID=fvanevski/opencode-operational-schema-guard
WORKING_BRANCH=issue/81-recall-acceptance
SOURCE_STAGE_BASE_COMMIT_IDENTITY=ef1d62de1942061bb4441fc3606996a6faa7d327
SOURCE_STAGE_COMMIT_IDENTITY=the exact branch commit authenticated in the operator kickoff
TARGET_ISSUE=81
EVIDENCE_ROOT=docs/issue-78/evidence/81-integrated-recall-acceptance-v1
EVIDENCE_PACKET_REQUIRED=yes
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed
REMOTE_UPDATE=forbidden except the explicit evidence-only publication
MECHANICAL_REMEDIATION=forbidden
SEMANTIC_REMEDIATION=forbidden
INDEPENDENT_PR_REVIEW=central-owned
GITHUB_PR_CREATION=forbidden
MERGE=forbidden
ISSUE_CLOSURE=forbidden

Objective: In one cohesive Build campaign, authenticate and test the Central-staged
source-bound Graphiti recall correction, establish live stock-V2/native hook shape
compatibility and test the remaining Issue #81 integration gates, and return one
sanitized source-anchored evidence handback. Do not split this into issue/PR
micro-slices. The staged plugin's source is the architectural implementation;
do not independently redesign it in the name of integration.

0. Reconcile the operator-provided exact branch SHA against origin and the
   materialized working tree. No assumptions from a stale issue/81 checkout.
   Stop STALE on source movement, unrelated dirty state, or mismatched bytes.
   Read README, docs/issue-78/v2-benchmark/POST_MERGE_FRESH_NATIVE_PLAN.md,
   docs/issue-78/ISSUE81_PRODUCTION_CUTOVER.md, and local AGENTS if present.
   Confirm the actual installed stock-V2 host/plugin interface and current
   production group. Current approved production identity is
   development-knowledge; historical ghdev_gh_mcp is not current authority.

1. CPU-only repository validation first, with cwd at the authenticated
   repository root. Run these exact commands with normal native Node:
   node --check docs/issue-75/v2-candidate/plugin.mjs
   node --check docs/issue-75/v2-candidate/plugin-behavior.test.mjs
   node --test docs/issue-75/v2-candidate/plugin-behavior.test.mjs docs/issue-75/v2-candidate/memory-core.test.mjs docs/issue-75/v2-candidate/relevance.test.mjs
   node --test docs/issue-78/v2-candidate/association.test.mjs docs/issue-78/v2-candidate/candidate.test.mjs docs/issue-78/v2-candidate/long-prompt.test.mjs
   node --test docs/issue-78/v2-benchmark/evaluate.test.mjs docs/issue-78/v2-benchmark/stage-holdout.test.mjs docs/issue-78/v2-benchmark/adjudicate.test.mjs
   npm run check
   npm test
   Use the repository-defined runner for any additional focused tests; do not
   alter frozen labels, budgets, baselines, assertions or policy to obtain green.
   The root npm suite alone does not cover docs/issue-75/78 Node regressions.

2. Native host integration, bounded to the source issue:
   - Reconcile the live installed plugin/config hash and plugin order with
     exact approved merged-main source. Preserve its rollback state.
   - With opt-in private/disposable instrumentation, observe actual stock-V2
     prompt hook IDs, current native user message IDs, context.messages and
     outbound model-request context during one real prompt plus both (a) an
     over-500-character auxiliary/title prompt and (b) a short auxiliary
     prompt. Do not manufacture a passing answer by echoing a model output.
     Preserve sanitized ordering/IDs and demonstrate the source-bound
     Graphiti block is selected from the correct real user request.
     If real native fields contradict the staged matching contract, return
     a complete minimal redacted shape and reproducer to Central; do not
     quietly weaken ID matching or substitute session-latest selection.
   - Respect existing EX/shared inference lease. Do not launch a competing
     local LLM, Graphiti extractor, post-exit worker or nested model client
     while the interactive harness holds the shared lease. CPU-only tests
     and bounded read-only service inspection are fine while Build runs.
   - Inspect the installed development-knowledge post-exit path/unit
     state, wake triggers, scheduler admission, candidate/review queue and
     remote Graphiti receipts. If already healthy, leave it alone.
     Within current user authorization, you may directly correct a
     demonstrated host-local wake/config binding defect ONLY inside the
     existing Graphiti-specific user-systemd/worker configuration and
     reversible private qualification instrumentation, after exact backups
     and focused preflight. No new scheduler, Graphiti database migration,
     persisted-record rewriting, EX bypass, or global LiteLLM/NInfer
     model-default change. Do not duplicate a possibly accepted submission.
   - Do not activate unreviewed issue-branch plugin bytes in the shared
     production OpenCode service. Use isolated/disposable source-scoped
     native probes only when compatible with the lease and installed host
     boundaries. The eventual production promotion requires independent
     Central source review, explicit merge authority, and authenticated
     merged-main deployment in a genuinely fresh client/session.

3. Acceptance instruments and freeze discipline:
   - Inventory the previously ratified Issue #81 dev/holdout corpus,
     source-ground-truth signatures, targets and recent Stage H private
     trace manifest. Never relabel, edit, reset or re-run submitted Graphiti
     sources merely to increase the score. Record historic results as
     historic FAIL where applicable.
   - Prebind a source-anchored set of true-positive natural/paraphrased,
     indirect and historical queries plus real wrong-group, unrelated and
     secret/distractor controls. Score source-correct injected facts, not
     embedding cosine or only plausible assistant wording. Missing trace
     is FAIL/UNVERIFIED, never a silent denominator omission. Avoid
     counting multiple requests from one session as 27 independent cases.
   - Report exact counts/denominators for semantic recall (target >=80%),
     useful candidate coverage (ratified >=85% when applicable),
     durable grounded precision (>=90% unless current ratified target
     differs), zero observed wrong-group/secret/false-verified violations,
     observed graph duplication and p50/p95 interactive context latency
     (p95 <=300 ms). Latency must time actual native context-build work
     and identify whether prewarming and network time are included.
     Report post-exit model/tokens/finish reason separately.
   - A post-exit autonomous curator wake is proven only by authenticated
     existing unit/gate ownership, real completed candidate -> review ->
     terminal Graphiti receipt + source index. A queued ACK or a unit that
     is merely enabled is NOT activation evidence.
   - If final real model-backed steps are excluded by active Build harness,
     prepare safe bounded readback prerequisites, exit normally, and return
     READY_FOR_POST_EXIT_OPERATOR_RUN with the minimal existing unit/CLI
     operator command and the exact identities to verify after exit.
     Do not spin up a new controller to avoid this lifecycle boundary.
   - If real prospective host instrumentation needs a different session,
     preserve the predeclared query identities and do not promote pre-merge
     source results to installed post-merge acceptance.

4. Local authority / repair envelope:
   - You may correct *only* host-specific disposable observer/fixture
     wiring, test invocation binding, and the existing Graphiti-specific
     wake-unit configuration when diagnostics prove a concrete failure;
     preserve old bytes and revalidate. Do not edit semantic repository
     plugin/relevance/curator code or its asserted tests to make it pass.
   - For an unexpected repository semantic blocker, capture full isolated
     reproduction plus a suggested bounded patch for Central review
     without modifying the branch source. For harmless local file paths,
     test fixture setup, or environment probes, repair iteratively inside
     this same campaign rather than stopping for repeated micro-approvals.
   - No destructive deletion of old/new Graphiti graphs, rollback backups,
     source/queue rows or remote episodes. No blind retries of ambiguous
     add_memory or hidden curator drain. Keep unrelated services intact.

5. Handback and evidence:
   - Stage ONE sanitized packet in EVIDENCE_ROOT: README/manifest, exact
     source Git identity, source diff reference, focused commands and native
     exit codes, bounded genuine hook shape/traces (no private text),
     EX/wake status and terminal receipts, original/final rubric matrices,
     latency population/method and raw aggregates, exclusions, rollback
     inventory, and unresolved findings. Clearly identify CPU-only,
     disposable host, live Graphiti, and truly fresh process evidence.
   - Publication is evidence-only on the SAME existing working branch.
     Inspect all staged paths; one non-force commit from the authenticated
     source head; check remote ref freshness immediately before push and
     perform authoritative remote readback after. If publication fails or
     sanitized proof is unsafe to commit, mark EVIDENCE_PUBLICATION=BLOCKED
     and return a complete private evidence packet reference; never
     force-push, rebase, invent a receipt or create a new PR.
   - If no source files changed, report UNCOMMITTED_SOURCE_CHANGES=none;
     otherwise return a complete portable source diff while keeping the
     GitHub source branch unchanged.
   - Report RESULT=PASS|FAIL|BLOCKED|READY_FOR_POST_EXIT_OPERATOR_RUN,
     exact SOURCE_STAGE_COMMIT_IDENTITY, tested installed activation pair
     (if any), native request/message and Graphiti episode identities,
     pre-exit vs post-exit action boundaries, remaining gates, and the
     canonical COMMAND_SHAPE_FRICTION block below.

COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<short repository/task key>
      requested_shape=<sanitized command/tool invocation>
      effective_shape=<executed or rejected form|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<bounded evidence>
      replacement_shape=<corrected shape|none>
      recipe_reference=<GHDEV-10 recipe key|none>
      resource_reference=<resource used|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
When no friction, return encountered=no, events=[] and
omitted_sensitive_values=no. Avoid secret-bearing command strings.
<<< LOCAL_AGENT_CONTRACT_END >>>
