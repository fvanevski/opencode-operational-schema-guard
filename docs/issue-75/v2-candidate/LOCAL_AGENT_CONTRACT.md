<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
STATUS=SUPERSEDED_BY_LOCAL_AGENT_CONTRACT_NEXT.md_DO_NOT_EXECUTE
LOCAL_AGENT_PRIMARY=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=75
WORKING_BRANCH=issue/75
EXPECTED_REMOTE_SHA=specified in operator kickoff; authenticate exact worktree HEAD
PHASE=first cohesive native-V2 selective-capture-and-retrieval candidate
SEMANTIC_OWNER=central; locally adapt/repair within named candidate when evidence requires
GITHUB_WRITES=no
OPEN_PR=no
MERGE=no
PRODUCTION_CONFIG_OR_GRAPH_WRITES=no
DISPOSABLE_GRAPH_GROUP_AND_PRIVATE_STATE_WRITES=yes
LIVE_DEPLOYMENT=no

Mission: integrate and qualify the centrally staged `docs/issue-75/v2-candidate/`
candidate against the **actual installed stock OpenCode V2 and Graphiti MCP**.
The first working unit is end-to-end capture + persisted episode + native hybrid
retrieval + context attribution, not just a retrieval adapter or plan.
Issue #70's mechanisms are historical references, NOT compatibility obligations.

1. Authenticate exact worktree head, Git remote, installed OpenCode binary/version,
   applicable real SDK API, effective plugin order/config, OpenViking and Graphiti
   MCP server/build/transport, Graphiti backing group and inference scheduling
   constraints. Read `README.md`, `ARCHITECTURE_REASSESSMENT.md`, the revised
   Issue #75 and this directory's core/plugin/CLI/tests/benchmark. Do not copy an
   old #70 service over the current installation. Leave existing developer
   worktrees and production files untouched.

2. CPU-only first: run `node --check` for staged .mjs modules, and
   `node --test docs/issue-75/v2-candidate/memory-core.test.mjs` from checkout.
   Inspect and correct genuine module/API defects in an ISOLATED candidate. Use
   supported native V2 hook/plugin load mechanics; preserve existing operational
   schema, OpenViking, models and host service config. Add focused tests for
   changes. Do not weaken test assertions or bypass privacy, group, unknown
   submission or source-class checks to get green.

3. Before altering selection behavior, preserve the FROZEN
   `benchmark-cases.json` expectation set. Establish the old code-level
   trigger/longest-term baseline using current authoritative old source, and,
   when practicable, measure the full old recall service in a disposal-only
   seeded group. Explicitly label a heuristic-only baseline as such. Do not
   manufacture old receipt sources or pretend an unexercised baseline was
   live-measured. Record test case matches, raw-result-to-fact-ID mapping,
   p50/p95, token/character budget, false positives, and errors.

4. In a unique disposable Graphiti group and private state root, qualify
   native MCP initialization/transport, `uuid` support, `add_memory` queued
   acknowledgement vs actual `get_episodes` indexing, and
   `search_memory_facts` source-episode shape. Run one genuinely admitted
   stock V2 normal user decision (not a manually prewritten and read Git
   JSON record), plus one real successful test-tool event where available.
   Verify correct group, source labels, duplicate delivery/restart behavior,
   accepted episode UUID readback, native semantic relationship retrieval,
   non-instructional context injection, graceful Graphiti timeout and
   ordinary OpenViking continuity. Check opt-out and secret exclusion.
   Never use old production Graphiti group or replay its accepted episodes.

5. Capture the seven frozen query cases against the native candidate and
   run `node docs/issue-75/v2-candidate/benchmark-evaluate.mjs
   baseline-results.json candidate-results.json`. If actual Graphiti requires
   GPU inference, use the existing cooperative model/lease scheduling path;
   run CPU-only tests while the OpenCode harness is active. Prefer completing
   the minimal post-exit native Graphiti job within this ONE campaign where
   the lease excludes simultaneous model execution, not starting a new
   implementation handoff or a second inference scheduler. A fresh private
   process must establish source/config and outbound context identity.
   Measure query quality and runtime; note failures rather than fitting
   queries or threshold to the observed result.

6. Exercise failure and correction path: journal status transitions, ambiguous
   network response (no blind replay), queued-to-persisted reconciliation,
   bounded recent-episode limitation, explicit list/forget on disposable
   records, no wrong-group or unbacked source injection. Preserve all
   existing production data and no destructive migration. Fix small/cohesive
   candidate bugs, V2 event field adaptations and transport binding issues
   autonomously; if a genuine semantic defect is found in candidate module,
   repair with a regression inside the named memory subsystem. Don't
   establish another framework, general extraction campaign, host recovery
   campaign or unrelated plugin upgrade. Escalate only for a MATERIAL
   unresolvable architecture/source-authority issue or live production
   behavior change. Do not stop for routine module/import/API friction.

7. Return candidate source edits as a reviewable `git diff --binary` and
   updated hashes, plus evidence artifacts in a stable user-accessible
   path. Do NOT push local GitHub commits or open a PR; Central will review,
   stage integrated source on the SAME branch and do independent review.
   State exact source/environment identity, command transcripts, benchmark
   file paths, and remaining limitations, without pretending a candidate
   passed tests that weren't executed. Keep the operator's original worktree
   and existing production installation unchanged.

Handback:
RESULT=PASS|PARTIAL|BLOCKED|FAIL
WORKTREE_HEAD_SHA=<full SHA>
HOST_SOURCE_AND_RUNTIME=<versions and hashes; unknowns labeled>
INSTALLATION_INTEGRATION=<actual isolated native V2 load route and group>
SOURCE_DIFF_AND_HASHES=<patch path, changed paths, sha256>
CPU_TESTS=<commands, status, counts>
GRAPHITI_MCP=<endpoint transport, actual uuid/queue/episode/search observations>
CAPTURE_AND_RECALL=<real event reference, status transitions, source labels, context proof>
BENCHMARK_BASELINE=<old full or heuristic-only, exact result file, metrics>
BENCHMARK_CANDIDATE=<exact result file, metrics, p50/p95, safety>
RESOURCE_USE=<CPU/GPU and lease, no competing service>
ISOLATION_AND_RECOVERY=<disposable group, temp paths, no production modification>
OPEN_DEFECTS=<bounded remaining issues, or none>
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<scenario>
      requested_shape=<sanitized invocation>
      effective_shape=<actual shape|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<bounded note>
      replacement_shape=<corrected shape|none>
      recipe_reference=<recipe|none>
      resource_reference=<resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
<<< LOCAL_AGENT_CONTRACT_END >>>
