<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
STATUS=SUPERSEDED_BY_docs/issue-75/FINAL_HOST_QUALIFICATION_CONTRACT.md
PRIMARY_AGENT=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=75
WORKING_BRANCH=issue/75
EXPECTED_HEAD_SHA=operator verified exact new staged HEAD
SEMANTIC_OWNER=Central, host-local bounded adaptation/remediation allowed
LOCAL_SOURCE_EDITS=allowed ONLY in named v2-candidate subsystem and focused tests
GITHUB_WRITES=no
CREATE_PR=no
MERGE=no
LIVE_PRODUCTION_CONFIG_OR_GRAPH_WRITES=no
DISPOSABLE_GROUP_AND_PRIVATE_CONFIG_WRITES=yes
BACKGROUND_SCHEDULER_INSTALL=no

Mission: Complete the integrated correction to Issue #75 Graphiti memory capture, post-harness extraction and relevance admission, without splitting off new campaigns. Read docs/issue-75/ARCHITECTURE_REASSESSMENT.md and docs/issue-75/v2-candidate/README_NEXT.md, and inspect ALL current candidate source/tests. The old retrieval-only contract and first Build contract are historical. The previous local diff is data, not mandatory implementation authority.

A. Authenticate worktree HEAD, upstream remote, installed OpenCode v2.2.5/V2 SDK, actual pinned Graphiti Core/MCP, existing gate implementation/TOML, local LLM/embedding/reranker/metric endpoints and active OpenViking hooks. In the ORIGINAL local worktree, inspect /tmp/opencode/issue75-evidence/final-diff.binary and the five uncommitted files from the first handback. Summarize differences versus new candidate. Retain missing validated host fixes without applying conflicting old patch blindly. Do not alter the original working tree or production installation.

B. CPU-only first: run node --check on candidate .mjs modules, node --test memory-core.test.mjs relevance.test.mjs, python3 -m py_compile post-exit-drain.py, python3 -m unittest discover -p test_post_exit_drain.py, and benchmark scorer synthetic-positive/negative sanity. Fix genuine code/test defects in isolated candidate and extend regression. No assertion weakening or thresholds tuned to observed test output. Prove hook stage does NOT call Graphiti add_memory or start GPU extraction while agent model is active; opt-out registers no hook; failures do not stop ordinary OpenCode operation.

C. In unique disposable group and isolated V2 config, verify a genuine user decision and passing tool event are journaled with appropriate source classes and real V2 nested output, deterministic dedupe, privacy/secret exclusion, group identity, compaction/restart and source refs; no premature Graphiti add_memory. Test attribution and fresh process native context injection. Include a disposable environment with the existing production-style OpenViking/operational-schema plugin load so coexistence is actually exercised without changing production config.

D. Retrieval: baseline is the first campaign's reported heuristic-only 5/7 covered, precision 0.40/recall 0.80. Preserve benchmark-cases.json expected values unchanged; rerun seven cases using correct group/source semantics. Distinguish wrong-group fact leakage from a wrong answer in the in-group graph. Try bounded native facts and CPU relevance; if the host's existing reranker endpoint is an independent service, verify actual /v1/rerank request/score/latency and enable optional rerank only if it fits 160ms request / 300ms total context budgets and does not compete for the single serving LLM. Include separate small holdout cases. Predeclared goal: precision >=0.80, recall >=0.75, at least 2 more covered cases vs old 5/7, zero actual cross-group leaks, no unbacked source/temporal certainty. If quality shortfall remains, diagnose and fix substantive issue within this module IN SAME campaign, with regression. Do not hardcode frozen questions or lower the thresholds.

E. Extraction/recovery: investigate raw local Qwen3.8 finish_reason, generated reasoning/content tokens, timeouts, model queue wait, Graphiti structured JSON output and failed worker logs. Distinguish active harness contention, reasoning budget exhausted and format error with direct evidence. Constrain Graphiti episode payload and use its supported non-thinking or bounded reasoning extraction profile only after testing against actual installed pinned client. Keep interactive agent model defaults unchanged. Verify real gate Config/Worker/parser API compatibility and shared flock semantics for post-exit-drain.py; test BUSY lease and BUSY scheduler fail-closed using controlled non-mutating probes. Any terminal failure retry needs explicit full group/name and remote-graph readback; never replay a queued/ambiguous response blindly.

F. Complete candidate repairs while Build harness is active and return one exact, fully-resolved post-exit operator command derived from actual installed gate source/TOML, current isolated state/endpoint, and staged candidate CLI. The operator executes only AFTER this agent harness exits, retaining existing exclusive flock and scheduler quiet grace until Graphiti fully persists or the runner emits a typed nonzero unresolved result. Do not launch this post-exit job inside the agent, build another daemon, or change gate service/privileges. Do not claim a post-exit PASS until operator supplies the output/evidence.

G. Verify correction path by exact remote Graphiti episode UUID, stable name and group, persisted readback, refusal to forget queued/unknown, explicit disposable forget only with --yes, bounded recent-episode gap, no unrelated production data writes, fresh recall injection and OpenViking continuity. Report unresolved queued prior lab data transparently; do not duplicate or erase it. Local agent may autonomously repair ordinary V2/MCP/host import bugs in named modules/tests rather than escalating micro-handoffs. Stop only on a truly material architecture/authority/resource blocker or unavoidable production mutation.

Return ONE complete report:
RESULT=PASS|PARTIAL|BLOCKED|FAIL
SOURCE_HEAD_SHA=<40hex>; OLD_LOCAL_DIFF=<path/hash and merged changes>
ACTIVE_RUNTIME=<version/config/source hashes and actual endpoints>
CPU_TESTS=<literal commands/status/count>
CAPTURE=<real decision and test event IDs, journal source labels, NO active-session writes>
GRAPHITI=<group/name/local/remote identity, queued/persisted/terminal states>
MODEL_AND_LEASE=<single-serving contention evidence; finish_reason/usage; quiet/EX evidence>
RETRIEVAL=<frozen+holdout files, raw relevance IDs, p50/p95, precision/recall, wrong_group versus false_positive>
COEXISTENCE=<fresh isolated V2+OpenViking behavior>
POST_EXIT=<actual result or READY_FOR_OPERATOR_POST_EXIT with exact executable command>
CORRECTION=<failure/duplicate/privacy/forget cases>
SOURCE_DIFF=<full git diff --binary path and file hashes>
OPEN_DEFECTS=<none or evidence-backed bounded blockers>
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<description>
      requested_shape=<actual sanitized agent-submitted invocation>
      effective_shape=<actual|same-as-requested|unknown>
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
