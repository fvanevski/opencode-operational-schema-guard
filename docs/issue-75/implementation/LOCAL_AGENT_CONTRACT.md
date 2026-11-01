# SUPERSEDED — do not execute

Following the Issue #75 architectural correction on 2026-11-01, this first-pass retrieval-only packet and its local-agent kickoff are **withdrawn**. It incorrectly assumed that Issue #70's Git source authority, receipts, temporal validation and scheduler were mandatory implementation contracts. Those are prior working fixtures to evaluate, not required architecture. See `docs/issue-75/ARCHITECTURE_REASSESSMENT.md`. The code/tests below remain historical experiments, not the approved Issue #75 implementation. No live host behavior is changed by this notice.

<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
LOCAL_AGENT_PRIMARY=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=75
WORKING_BRANCH=issue/75
EXPECTED_REMOTE_SHA=use exact full SHA in accompanying operator kickoff
ROLE=bounded candidate integration and isolated qualification
SEMANTIC_REVIEW_AUTHORITY=central-owned
GITHUB_WRITES=forbidden
NEW_PR=forbidden
MERGE=forbidden
LIVE_DEPLOYMENT=forbidden
CAPTURE_POLICY_EXPANSION=forbidden
PRODUCTION_GRAPH_AND_GATE_DB_MUTATION=forbidden

Objective: complete the FIRST cohesive Issue #75 retrieval improvement as
an integrated Python Graphiti read-only service + stock OpenCode V2 hook +
frozen old/new selection benchmark, not as disconnected microtasks.

1. Read README.md, INTEGRATION.md, and centrally staged source/tests in this directory.
Verify working branch exact SHA from kickoff. Inspect applicable AGENTS.md
and source/tool/validation instructions. Compare the actual installed
OpenCode V2 Graphiti hook, Python recall server, config, and relevant host
overlays with the repository Issue #70 reference files. Do not replace
production from historical source or alter dirty developer worktrees.
2. Preserve a pre-change baseline from the actual OLD selection behavior
using a disposable seeded graph and disposable authoritative receipts.
Freeze direct, paraphrased, implicit dependency, multi-entity, historical,
irrelevant, wrong-group and unsupported-source queries and relevance labels
BEFORE applying the candidate.
3. Integrate centrally authored graphiti_relevance.py, graphiti_retrieval_adapter.py
and graphiti-intent.mjs into an ISOLATED candidate of the real installed code.
Follow the exact Reader.query and client hook substitutions in INTEGRATION.md. Bind at most six
parameterized edge-name/fact search terms and two dependency-neighbor
lookups. Preserve all contributor receipts/temporal verdicts, source
attribution, policy separation, bounded latency and ordinary OpenViking
fallback. Resolve straightforward API/interface differences only within
this exact retrieval subsystem, not an unplanned platform rewrite.
4. Run both staged Python unittest modules, the staged node:test module,
and existing relevant Issue #70
regressions; exercise the real disposable service/stock V2 context path,
including missing Graphiti endpoint and exclusive validation conflict.
Repair in-scope candidate defects and rerun impacted tests as needed.
Keep all actual production gate/graph/credentials and prior episodes intact.
5. Return one complete host integration handback. Save candidate source diff,
hashes and focused test/benchmark outputs for Central inspection.
Do NOT push a local implementation commit, open a PR, or deploy live.
Stop only for irreconcilable source authority drift, necessary new Git/trust
policy, material security/temporal defect, or a genuine runtime blocker.

RESULT=<PASS|PARTIAL|BLOCKED|FAIL>
REMOTE_AND_WORKTREE_SHA=<full SHA>
HOST_SOURCE_IDENTITIES=<file hashes or UNVERIFIED>
DIFF_AND_CANDIDATE_HASHES=<paths and digests>
BASELINE=<cases, recall, precision, p50/p95, budget>
CANDIDATE=<same frozen cases and results>
TESTS=<exact commands, test counts, status>
ISOLATION_AND_SAFETY=<group, provenance, temporal, no-write>
ROLLBACK_AND_CLEANUP=<paths and observed state>
DISCOVERY_SOURCE_ADMISSION=not implemented in this first unit
OPEN_BLOCKERS=<none|bounded specifics>
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<short task scenario>
      requested_shape=<sanitized invocation>
      effective_shape=<actual shape|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<bounded code/error/annotation>
      replacement_shape=<corrected shape|none>
      recipe_reference=<recipe|none>
      resource_reference=<resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
<<< LOCAL_AGENT_CONTRACT_END >>>
