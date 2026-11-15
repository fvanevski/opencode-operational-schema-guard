# Local Build handoff: issue #93 first consolidated B1/B3 campaign

Use the kickoff's exact expected full commit SHA. This contract is on
fvanevski/opencode-operational-schema-guard branch issue/93. Parent #91,
dependency #92 (accepted/merged PR #95), downstream #94 (final installation).
Task target: one bounded diagnosis, same-snapshot quality comparison,
source-safe scorecard, and a precise B2 root-cause recommendation, not a
sequence of tiny handoffs or an unbounded benchmark campaign.

LOCAL_AGENT_PRIMARY=build
SOURCE_BASE=25ca82a70b968cd6102a0f02980ea2a34d82ebd9
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed
EVIDENCE_ROOT=docs/issue-93/evidence/first-host-campaign
EVIDENCE_PACKET_REQUIRED=yes
MECHANICAL_REMEDIATION=forbidden
SEMANTIC_REMEDIATION=forbidden
PRODUCTION_DEPLOYMENT=forbidden
GRAPHITI_MUTATION=forbidden
LIVE_CONFIG_MUTATION=forbidden
HISTORICAL_EVIDENCE_MUTATION=forbidden
PR_CREATION=forbidden
CENTRAL_REVIEW=required

1. Authenticate the remote issue branch exact head from the kickoff before
   using source. Use a nonproduction checkout, isolate dirty owner state,
   and never reset/rebase/force-push it. Read the current #93 and ADR-91
   requirements and the exact source: docs/issue-75/v2-candidate/{memory-core,
   semantic-recall,relevance,plugin}.mjs; docs/issue-78/v2-curator/{sourced-
   recall,curated-recall-candidates}.mjs; existing tests and accepted #92
   per-fact source/receipt contracts. Do not assume old V1 guard APIs.

2. B1: Compare original S03/S05/S13 positive misses, N01/N02 irrelevant
   injections, and representative paraphrase/historical, wrong-group,
   stale UUID, source, secret and false-verified controls. For each, record
   source-exact query truth and actual: Graphiti search facts, independent
   journal/review/source-index match, per-fact remote positive episode
   membership, shortlist, strict/semantic selection, the 1400-character /
   5-fact model-facing projection, associated real native model request,
   on-time race result and independent answer support. Distinguish an
   indexed-only fact's remote proof from Graphiti search facts. Missing
   source/material is UNVERIFIED, never fabricated.

3. Use the host's ACTUAL Graphiti MCP schema; observed read shapes are
   search_memory_facts with query/group_ids/max_facts and get_episodes with
   group_ids/max_episodes. Keep read-only and current group, normally
   development-knowledge, independently authenticated. No add_memory,
   delete, Graphiti replay, EX drain, curator worker or historical graph
   mutations. Do not create a competing model/reranker service.

4. Run node --test docs/issue-93/score-stage-ledger.test.mjs and focused
   semantic-recall, memory-core, relevance, curator and native callback
   regressions where applicable. Preserve process exit and real test
   counts without shell-pipe masking. Freeze a small untouched holdout
   before tuning; do not re-label old frozen sources. Build a private
   original-ID -> synthetic label map, then private stage-ledger JSON as
   documented in docs/issue-93/README.md, and run the scorer. Scoring
   output itself is not proof of source membership or a live callback.

5. Profile ALL actual Graphiti context callbacks entry-to-return, including
   no-injection/errors/late results; separately report prompt prefetch
   search completion, true associated request context availability and
   full-chain time if known. Only disposable isolated source/config
   instrumentation; no production source/config/service changes. If an
   EX-incompatible interactive harness prevents genuinely fresh model-backed
   validation, prepare one minimal verified post-exit operator action,
   exit and return READY_FOR_FINAL_OPERATOR_RUN, not an invented controller
   or gate bypass.

6. B2 decision: select the most material evidence-backed retrieval/presentation
   defect. Do not presume a top-hit lexical issue; no hard lexical/Issue-ID
   veto, no selector rewrite without measured gain, no dynamic interactive
   LLM calls, new daemon, relaxed source/secret/group/remote/EX checks or
   enlarged public budget. If baseline suffices, recommend NO_CODE_CHANGE
   with quantitative evidence; otherwise report the smallest semantic
   contract, exact loss stage and focused regression examples so CENTRAL
   writes the implementation/tests on the SAME issue branch. Do not hide
   substantive local feature edits as mechanical integration. One later
   exact-head qualification, only if source changes, is acceptable.

7. You may adapt disposable PRIVATE diagnostic fixtures/scripts for observed
   host interfaces and run additional same-scope tests. Use a new collision-
   safe scratch root (mkdir, do not pre-delete/reuse unknown paths). No live
   config write, Graphiti mutation, credential disclosure or production
   deployment; stop only on material protected-boundary conflict or missing
   necessary authority. Do not start issue #94 scaling/activation.

8. Publish at most ONE sanitized, manifest-covered EVIDENCE-ONLY commit to
   docs/issue-93/evidence/first-host-campaign on issue/93 (no PR).
   Source, tests and existing files outside that path remain unchanged.
   Authenticate current remote ref immediately before a non-force push and
   read back full SHA/paths. If any packet member contains private traces,
   original source text, credentials or assembled model requests, KEEP IT
   PRIVATE and report EVIDENCE_PUBLICATION=BLOCKED instead. Never post raw
   private evidence to public GitHub. For a current publication gate, honor
   its allowed read-only Fresh-review/Verify child roles; do not bypass it.

Handback:
RESULT=PASS_DIAGNOSTIC|PARTIAL|BLOCKED|STALE
SOURCE_BASE_SHA=<full>
TESTED_SOURCE_SHA=<full>
REMOTE_ISSUE_BRANCH_SHA=<full>
B1_STAGE_LOSS=<S03/S05/S13, N01/N02 + controls, with reasons>
FROZEN_STRICT=<n/16|UNVERIFIED>
FROZEN_SEMANTIC=<n/16|UNVERIFIED>
NEGATIVE_COST=<N01/N02 counts>
HOLDOUT_SUPPORT=<scores|UNVERIFIED>
CONTEXT_CALLBACK_ALL=<n,p50,p95,max,errors,empty,on-time>
ANSWER_SUPPORT=<independently checked|UNVERIFIED>
SCOPE_PRIVACY_REMOTE_EX=<status>
B2_CHANGE_REQUIRED=yes|no|unverified
B2_MINIMUM_CONTRACT=<root cause, planned regression and expected effect>
TEST_RECEIPTS=<commands/exits/counts>
EVIDENCE_PUBLICATION=PASS|BLOCKED|NOT_ATTEMPTED
EVIDENCE_COMMIT_SHA=<full|none>
EVIDENCE_PATH=docs/issue-93/evidence/first-host-campaign
UNCOMMITTED_SOURCE_CHANGES=<paths|none>
KNOWN_GAPS=<bounded>
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<short key>
      requested_shape=<sanitized submitted shape>
      effective_shape=<executed/rejected|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<short>
      replacement_shape=<shape|none>
      recipe_reference=<GHDEV-10 key|none>
      resource_reference=<resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
If none: encountered=no; events=[]; omitted_sensitive_values=no.
Return the full handback directly, not only a local scratch path.
