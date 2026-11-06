# GHDEV Issue 81: Retrieval recovery feasibility and one-campaign integration decision

CAMPAIGN=ISSUE81_RETRIEVAL_RECOVERY_FEASIBILITY_V1
PRIMARY_AGENT=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=81
PR_NUMBER=89
IMPLEMENTATION_BRANCH=issue/81-source-recall-correction
MAIN_BASE=9a27b73de882c0af6fec4d86de81945338611479
PRE_HANDOFF_IMPLEMENTATION_SHA=8f6e688f5a82ef405c6d1f76e63410d5be0c48fb
CURRENT_IMPLEMENTATION_SHA=read back the exact branch commit containing this document
EVIDENCE_BRANCH=issue/81-recall-acceptance
EVIDENCE_EXPECTED_SHA=def2be8f97463b0f6d1098286c4a2559032ebd85
NEW_EVIDENCE_ROOT=docs/issue-78/evidence/81-retrieval-recovery-feasibility-v1
CENTRAL_PROBE=docs/issue-78/v2-benchmark/issue81-retrieval-feasibility.mjs
RECALL_GROUP=development-knowledge
RECALL_WORKSPACE=/workspace/mcp_servers/gh_mcp
RECALL_PROJECT=gh_mcp
RECALL_MCP=http://127.0.0.1:8766/mcp

## Objective
Deliver one complete, source-backed decision about how to recover the five missing persisted source episodes S03, S05, S07, S10, S13 and address the two selector misses S01/S04 without weakening scope/authority fences. The prior 12 vs 24 Graphiti comparisons did not return those five expected episodes at either depth; raising the cap further is not an accepted remedy. The current 24-candidate stage and 9/16 offline regression do not warrant merging draft PR #89.

This campaign tests two Central-specified general approaches:
1. A second, deterministic, generic reduced query to the existing Graphiti fact search.
2. Read-only examination of already persisted, same-group/project/workspace curated facts through the existing positive episode-index/source-strength resolver, including a bounded hypothetical blended selector.

The Central-authored executable probe is in CENTRAL_PROBE. The agent must run it, diagnose its actual interfaces and return evidence. The agent must NOT write new retrieval architecture or revise relevance policy. The probe is a feasibility instrument, NOT production code. There is no new service, model, storage, curated record or native acceptance run.

## Allowed
Read-only Graphiti MCP and local persisted curator/index queries; private 0600 JSON adapters, scratch log and report assembly; bounded mechanical/private probe-interface corrections if necessary; one sanitized evidence-only commit on EVIDENCE_BRANCH after exact CAS preflight and remote readback. Normal consumer-grade handling of shell, local permissions, bounded Node helpers, directory/scratch names and command syntax. Use the Build harness because its host source and private evidence access are needed.

## Forbidden
Source edits/push to IMPLEMENTATION_BRANCH; any production install/config/runtime change; Graphiti add/delete/retry, group migration or curation reset; gate/lease bypass; new GPU LLM inference; full native 20-case acceptance; revised frozen roster/targets/expected identities; writing human precision verdicts; a new PR, merge or issue closure. The 126-fact precision review remains operator-only and UNVERIFIED.

## Phase 1: exact authority
- Verify origin/main is MAIN_BASE, PR #89 remains draft, and working branch is precisely the new commit containing this handoff and probe. Authenticate current commit, parent, tree, source delta and probe/blob.
- Fetch remote branch before local checkout/object proof; use a clean isolated noncolliding worktree, not the owner's checkout. Do not reset, clean or overwrite any active checkout.
- Read this entire file and CENTRAL_PROBE from authenticated working branch before acting.
- Run node --check on CENTRAL_PROBE and inspect its imports against the actual GraphitiMcp, ReviewStore and sourcedEpisodeResolver interfaces. Do not change code merely because an optional probe fails. If a pure scratch adapter needs a repair, record original failure + private patch; no production source write.
- Authenticate previous evidence commit def2be8f... and five-case depth findings; previous diagnostics are immutable current-snapshot records, not a new acceptance population.

## Phase 2: private roster adapter
- Reuse the authenticated frozen 16-positive and N01-N04 negatives from private Issue #81 packets; original roster SHA256 is 47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652.
- Create a NEW 0600 private JSON adapter of shape:
  {"cases":[{"case_id":"S01","question":"EXACT unchanged frozen question","expected_episode_uuid":"valid UUID"}, ... ]}
- Include S01/S03/S04/S05/S07/S10/S13 and N01-N04 (negative UUID may be omitted); preserve case ordering. Verify every prompt and positive UUID against the original immutable source. Never commit raw prompts.
- Authenticate the production curated state root from current effective config and index evidence, not a guessed path.

## Phase 3: bounded read-only execution
- Run from the exact working branch:
  node docs/issue-78/v2-benchmark/issue81-retrieval-feasibility.mjs --input PRIVATE_ADAPTER --root VERIFIED_STATE_ROOT --group development-knowledge --workspace /workspace/mcp_servers/gh_mcp --project gh_mcp --endpoint http://127.0.0.1:8766/mcp
- Capture raw stdout, stderr and process rc privately. Keep private evidence protected and do not publish source assertions or full model messages.
- Probe checks only scoped curated records whose remote episode UUID maps through the existing positive persisted source-index resolver; mere local evidence is NOT independent proof of current remote persistence. Report this difference explicitly.
- Graphiti full query uses depth 24; reduced derived query uses depth 12. These are serial read-only probes, NOT proposed live hook timing.
- Score query-union and blended alternatives by exact episode/source ID separately from proposition-equivalent siblings. Record false admissions, group violations, unexpected source classes or private/secret material on negatives.
- If the probe has a standard local JSON/layout mismatch, correct only private input projection. If its source-selection semantics are invalid, report the exact source defect to Central instead of editing deployed or staged code.
- One run is sufficient; bounded retry only for independently identified transient network error or local adapter corruption. Do not expand into another campaign.

## Phase 4: decision quality
- For each of seven residual positives, record exact expected episode position in original 24, reduced 12, and authenticated local-index candidates. Record whether the original, query union, index-only and blended alternatives select the expected episode; distinguish exact source and proposition equivalence.
- For all negatives, report supported source group, identity and content-policy failures. Frozen N02=FAIL_INJECTED remains preserved; classify policy separately without changing original score.
- Report measured Graphiti request and curated index scan latency separately (p50/p95 with n and quantile definition). Context-hook <=300ms is a separate strict actual requirement and remains UNVERIFIED unless native hook start/end data are available.
- Do not recommend source-index injection unless the source strength, positive remote persisted evidence, live scope and temporal validity and latency can be established by a product-level design. It is an architectural choice for Central, not an agent-created workaround.
- Do not represent probe outcome as 13/16 native PASS even if the hypothetical exact-source count improves. Prior 8/16 and 9/16 are immutable.

## Phase 5: sanitized evidence publication and handback
- Produce exactly one complete sanitized packet under NEW_EVIDENCE_ROOT, preferably:
  README.md, recovery-matrix.json, latency-and-source-authority.json, central-recommendation.md, command-shape-friction.json, SHA256-MANIFEST.txt.
- Full raw prompt/fact traces, private source snippets, exact operator worksheet and credentials stay on host.
- Re-read exact EVIDENCE_BRANCH remote ref. Require EVIDENCE_EXPECTED_SHA or report STALE, never reconcile with force/rebase.
- At most one evidence-only commit, with its parent equal to the pre-write evidence head. No implementation-branch push, new PR, merge or issue closure. Independently read back new ref, parent, changed paths, and digest manifest. If publication cannot be done safely, retain private packet and return evidence path.
- Return one consolidated handback:
  CAMPAIGN, RESULT, IMPLEMENTATION_HEAD, PROBE_BLOB, ROSTER_SHA256, PRIVATE_ADAPTER_SHA256, AUTHENTICATED_CURATOR_ROOT, CURATED_RECORDS_SCANNED, CURATED_SOURCES_VERIFIED, CASE_MATRIX, GRAPHITI_ALTERNATE_RECOVERED, INDEX_EXACT_RECOVERED, UNION_EXACT_SOURCE_COUNT, BLENDED_EXACT_SOURCE_COUNT, NEGATIVE_ADMISSIONS, GRAPHITI_P50_P95, CURATED_SCAN_LATENCY, HOOK_P95, SOURCE_AUTHORITY_VERDICT, CENTRAL_RECOMMENDATION, HUMAN_PRECISION=UNVERIFIED, EVIDENCE_COMMIT_SHA, PARENT_SHA, REMOTE_READBACK, full canonical COMMAND_SHAPE_FRICTION, UNEXPECTED_HOST_CHANGES, NEXT_STOP_BOUNDARY.
- Ordinary missing answer is a result, not a campaign failure. Stop only on source-identity drift, definite wrong-group/credential injection, unverified source-index authority, repeated authenticated service failure, unauthorized mutation or canonical EX lease conflict.
- Finish with one handback. No extra PRs or serial micro-handoffs.

## Handoff delivery
This committed document is the complete controlling local-agent contract. The operator receives only an abbreviated kickoff referring to exact GitHub branch/commit/path. The local agent must fetch/read THIS file, not infer detailed task permissions from the kickoff.
