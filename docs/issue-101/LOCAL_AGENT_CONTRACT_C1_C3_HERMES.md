<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
HARNESS=hermes (independent host supervisor; NOT an OpenCode Build/Evidence primary)
ROLE=one bounded CPU/source-and-host-readonly C1/C2/C3 campaign
REPO=fvanevski/opencode-operational-schema-guard
BRANCH=issue/101
SOURCE_BASE=0bdff06ce164545bd96f913278d08fe91dc55f0e
SOURCE_TARGET=full exact SHA furnished by the operator kickoff; never silently follow later branch movement
PRIMARY_INSTRUCTIONS=docs/issue-101/C1_C2_ARCHITECTURE.md
FROZEN_COHORT=docs/issue-101/C3_COHORT.json

Limits: GitHub writes, source-branch edits, PR creation, production Graphiti/OpenViking mutation, production plugin/config/service deployment, EX lease overrides, destructive graph operations, reruns of historical #99/#100 submissions and uploading private traces are FORBIDDEN. Disposable test fixtures and a minimal private comparison/measurement script outside the Git working tree are permitted. Hermes itself is outside the OpenCode harness commit-gate exclusion, but any spawned OpenCode process or post-exit model worker must obey its real launcher/shared lease, scheduler and EX quiet-grace rules. Do not create extra inference services or listeners; preserve originals.

1. Authenticate exact GitHub branch ref and SOURCE_TARGET, fetch `refs/heads/issue/101` BEFORE proving a newly staged local commit, verify fetched exact commit and object, prepare a separate clean detached worktree without modifying the owner's checkout. If remote head differs, STOP STALE; if underlying main has moved, report it without rebase. Check nearest AGENTS and live harness interfaces. Use Serena/GitNexus only if installed/fresh for source navigation, Probe for supplemental search, RTK only for safe summarized output, native Git/raw checks for authoritative SHA/diff/failure. Do not infer old V1 OpenCode guards from this stock-V2 setup.
2. Run from the candidate repository root:
   node --check docs/issue-78/v2-curator/curated-recall-candidates.mjs
   node --check docs/issue-78/v2-curator/sourced-recall.mjs
   node --test docs/issue-78/v2-curator/curated-recall-candidates.test.mjs docs/issue-75/v2-candidate/semantic-recall.test.mjs docs/issue-75/v2-candidate/memory-core.test.mjs
   node --test docs/issue-78/v2-curator/curator.test.mjs
   npm run check
   npm test
   Preserve real command exits and counts. Consume one equivalent trusted exact-head Actions receipt when Central supplies it; do not repeat an unnecessary full suite. If a focused test fails, diagnose in private scratch, construct a specific source/test patch suggestion with reproduction, but do not commit or silently alter assertions.
3. Using separate disposable fixtures authenticated at SOURCE_BASE and SOURCE_TARGET, evaluate the original and candidate C1/C2 behavior at review counts 512/4096/4097 and indexed episode counts from small to near 4096, with cold/warm timing, file read counts and exact candidate identities. Test malformed sibling/target, corrupt index and nested review, missing index, fatal read permissions, ≥1000 remote list, wrong-group/source/secret and provisional/historical/retired cases. Baseline failure is an observation, not a reason to weaken a test. Continue one campaign for routine fixture/script repairs; escalate only a material semantic/source defect.
4. Before querying any real model/Graphiti answers, hash and freeze C3_COHORT.json, including what source assertions are independently known and which are not known to exist in remote Graphiti. Compare strict/semantic/curated/legacy marginal unique positively authorized fact reach using disposable or non-secret read-only same-group facts, not an untrusted ranked result as provenance. Count omissions, duplicates, source identity, temporal/provisional accuracy, abstentions, context characters/tokens and answer-level support separately. No scorecard edits after observing results.
5. Inspect installed Graphiti MCP tool catalog and normal shared OpenCode config/process read-only; record whether a supported targeted membership READ API exists and actual positive same-group `get_episodes` limit behavior. Avoid blanket 1000-result negative inference. Measure Graphiti transport RTT, local indexed scan, serialized operation and optional enrichment separately. An actual hook latency metric requires real `context` callback entry+exit over ALL invocations including errors/empty results, with real model-bound source blocks and an authenticated fresh test process. If safe previously qualified observation is unavailable without service/config mutation, label actual hook p95 and causal answer benefit UNVERIFIED for later C4/C5 rather than fabricating or installing an observer in this first phase.
6. Do not trigger an EX Graphiti curation or consolidation drain while interacting, even though Hermes is unexcluded. Normal eligible capture after prior saturation and final A+B+C fresh service/client/native-session tests are post-merge C4/C5 work controlled by Central. Stop with one actionable comparison and no new side campaign.

Evidence matrix (criterion => required sanitized artifact => authoritative observation):
- source/immutability and focused Verify => identity.json / tests.json => full SOURCE_BASE/TARGET/tree SHA, worktree cleanliness, node version, actual command exits and counts, existing trusted CI IDs if available
- source isolation and proof => source-controls.json => correct per-record omissions vs fatal IO, source UUID/group/class, unchanged remote-membership rules, negative controls
- availability and route utility => scan-benchmark.json / cohort-results.json => cold/warm distributions, real read counts, source-qualified unique and missing facts, exposed vs prospective classes, frozen cohort hash
- real host limits => readonly-mcp.json / hook-observations.json => read-only tool identity, group and <1000 vs =1000 fail-close, real callback samples n/p50/p95/max or exact UNVERIFIED reason, no synthetic RTT substitution
- operational safety => nonmutation.json / evidence-manifest.json => original vs final installed plugin/config/service and EX identities, no remote writes, private trace exclusion and skipped observations

Produce ONE operator-attachable allowlisted sanitized archive `osg-101-c1c3-<UTC-ID>.tar.gz` with only the listed shareable files, excluding raw source/model requests, credentials, private paths, scratch scripts with sensitive values, and backup/state. evidence-manifest.json maps each criterion to member SHA256, byte count, origin, source SHA, limitations/omissions. Verify precise archive member equality, no duplicates/absolute/traversal/symlinks, full member digests; hash the final archive externally and return its full SHA256/bytes. Never upload it to GitHub.

Return in conversation:
RESULT=PASS|FAIL|BLOCKED|STALE
MAIN_SHA=<full 40 hex>
TARGET_SHA=<full 40 hex>
TARGET_TREE=<full 40 hex>
TESTS=<commands/exit/quantitative results>
CORRUPT_REVIEW_AND_SOURCE_INVARIANT=<exact PASS/FAIL+finding>
INDEXED_SCAN_DELTA=<before/after file reads and timings>
UNIQUE_RECALL_GAIN_LOSS=<by source-exact/paraphrase/temporal/negative class>
REMOTE_PROOF_CAPABILITY=<actual available API, =1000 boundary>
HOOK_TIMING=<actual callback n/p50/p95/max/errors or UNVERIFIED>
ANSWER_UTILITY=<actual vs diagnostic, frozen cohort source and limitations>
CURRENT_CONFIG_SERVICE_EX=<non-secret before/after nonmutation evidence>
C3_DECISION=<keep/simplify/replace/retire and reason>
BLOCKERS_AND_NEXT_CENTRAL_ACTION=<bounded>
EVIDENCE_ARCHIVE_REQUIRED=yes
EVIDENCE_ARCHIVE_STATUS=READY|BLOCKED
EVIDENCE_ARCHIVE_PATH=<verified host absolute path or none>
EVIDENCE_ARCHIVE_SHA256=<full SHA256 or none>
EVIDENCE_ARCHIVE_BYTES=<integer or none>
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<short task key>
      requested_shape=<sanitized requested invocation>
      effective_shape=<post-hook executed/rejected shape|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<decisive error/annotation>
      replacement_shape=<successful corrected shape|none>
      recipe_reference=<GHDEV-10 key|none>
      resource_reference=<plugin/repo resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
Use events=[] for encountered=no. Even successful recoveries and material guard annotations remain events. Stop on a protected-boundary conflict rather than weakening admission or secretly changing semantics.
<<< LOCAL_AGENT_CONTRACT_END >>>
