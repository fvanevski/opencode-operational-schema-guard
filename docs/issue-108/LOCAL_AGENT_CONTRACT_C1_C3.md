<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
LOCAL_AGENT_PRIMARY=build
TASK=issue108-first-cohesive-C1-C3-source-scored-shadow-qualification
REPO_ID=fvanevski/opencode-operational-schema-guard
BASE_MAIN_SHA=d928166fc0fa586a2dc905e7db3c64e44b0dddd1
WORK_BRANCH=issue/108
PARENT_GATE=105
IMPLEMENTATION_ISSUE=108
PR_CREATION=forbidden-for-this-diagnostic-phase
SEMANTIC_REPOSITORY_REMEDIATION=forbidden
REMOTE_REPOSITORY_UPDATE=forbidden
PRODUCTION_SOURCE_CONFIG_CHANGE=forbidden
GRAPHITI_MUTATION=forbidden
OPENVIKING_MUTATION=forbidden
EX_DRAIN_REPLAY=forbidden

MISSION: Execute the centrally authored `docs/issue-108/C1_C3_ARCHITECTURE.md` and `paired-recall.mjs`/tests against authenticated current source and a supported read-only host environment. Complete the whole bounded C1–C3 evidence objective within this one campaign, not one handoff per case, sampling run, adapter, or C3 check. Treat #106 capture-source improvements and #107 sibling/corroboration/retention semantics as authoritative; do not undo them.

1. First authenticate current remote `main`, branch exact full 40-hex SHA, current worktree and relevant source/module blobs, nearest repository `AGENTS.md` if present, CI profile and installed stock-V2 service/module/config. A diverged `main`, a moved candidate branch, or a different live module is an evidence distinction, not permission to reset, rebase, fast-forward an occupied developer checkout, or silently overwrite the live installation. If there are local uncommitted user changes, keep them untouched and use a fresh isolated branch worktree. Fetch remote refs before local proof if newly remote. Verify `docs/issue-108/paired-recall.mjs` and tests are actually present at the branch SHA. The exact branch SHA is evidence authority, not the historical BASE_MAIN_SHA.
2. Inspect the real wiring for `GraphitiMcp`, `Memory.search`, `curatedRecallRetriever`, `sourcedEpisodeResolver`, `Journal`, and the current group/project/workspace, selected recall policy, source/index roots and Graphiti MCP endpoint. Confirm Graphiti `get_episodes` group names through the configured MCP, not the unrelated empty default FalkorDB graph. Source/ReviewStore/local corroboration is not positive remote membership. Count distinct source-linked accepted facts; #107 corroboration links or deferred siblings are NOT additional independently persisted Graphiti episodes.
3. Build one privately stored frozen, independently original-source-scored corpus of 6–12 usable cases spanning source-exact, paraphrase, temporal, related-defect, ambiguous-source, off-topic and wrong-group/private controls as safely available. Include #101 historical cases only as disclosed prior-exposure controls. Require exact native original source and temporal/evidence/retention review *before* measuring candidates; do not use retrieval/model answers to define gold labels. Label safely absent cohort as MISSING with reason, rather than inventing observations. Freeze bytes and SHA-256 before the first comparator run. Do not put private queries, excerpts, source handles, provider requests or credentials in public reports.
4. Run focused syntax and Node tests for the centrally staged module and real affected source tests, then read-only paired strict/semantic runs using the staged `node docs/issue-108/paired-recall.mjs` CLI with actual authenticated absolute `--freeze`, `--out`, `--journal-dir`, `--review-root`, `--graphiti-endpoint`, `--source-revision` and `--rounds 2`. Only use documented arguments. This is direct `Memory.search`, not a native callback. Record process exit, freeze hash, exact source, policy ordering, qualified fact reach and unmatched/unadjudicated selections, RPC counts, approximate decoded response bytes, local resolver/index count, first and repeated search latency. Do not assert network bytes, disk reads, true cold cache, callback p95, or answer-level utility from this script alone. If the current interactive harness/lease prevents the read-only Graphiti service calls, finish non-inference checks, report the precise admission blocker and a minimal native post-exit run under ordinary policy; do not bypass EX, start an ad hoc inference worker, or replay a possibly completed mutation.
5. Profile bounded local index/read costs at realistic 512, ~4096, and >4096 inventory sizes with disposable fixtures or safe non-mutating production readback, distinguishing indexed count from total review count. Inspect current installed Graphiti MCP tool inventory/schema for a targeted positive single-episode/same-group read; use only read-only calls; report supported candidate shapes and whether UUID, group, name, terminal identity match independently. No new Graphiti service, cached-positive shortcut, Graphiti writes, physical deletions, migration, or watcher. If real IO/bytes or cold cache cannot be measured without invasive tooling, report UNVERIFIED rather than improvise mutation.
6. Perform an evidence-backed KEEP/SIMPLIFY/REPLACE/RETIRE/CONDITIONAL analysis of native, legacy journal, curated index, shortlist, source resolver, remote proof and final selector. Distinguish a candidate omitted by original source/capture, curation, indexed scan, preselect, positive remote proof, final selection or context deadline; mark unsupported causal attribution not_determined. Flag specific justified C2 change(s) for Central to implement on the SAME branch, not self-authorize production ranking refactors. If all existing mechanisms preserve independently unique facts, support the issue's explicit no-change outcome. No PR, review request, issue close or parent gate mutation in this phase.
7. Keep harmless within-scope adjustments to private qualification scripts/fixture parsing under Build authority, with before/after exact diff and rerun. Do not change source production algorithms, trust controls, hard validation, privacy policy, installed module/config, dependencies or user data. If a centrally staged comparator defect is reproducible, return focused failing fixture, exact stack and bounded patch suggestion to Central, not a quiet semantic rewrite. Avoid broad host environment modernization or unrelated deployment campaigns.

EVIDENCE MATRIX (criterion -> required artifact / primary proof / privacy):
C1 original truth + exposure -> `freeze-receipt.json` (source-independent method, cohort IDs, counts, private-file SHA-256, timestamp, historical exposure labels) plus private frozen source retained on host; share receipt only.
C1 paired route reach/stages -> `paired-report.json` produced by exact CLI + `stagewise-adjudication.json` mapping safe fact/case IDs to unique native/legacy/curated route, confirmed omission point or not_determined, candidate no-change/C2 recommendation; sanitized.
C1/C3 latency/cost -> `performance.json` with real command exits, native host version, actual measured population/cold-warm qualifications, search p50/p95, RPC calls, observed IO/bytes when directly measured, unavailable counters distinctly null; sanitized.
C3 bounds/API -> `remote-api-inventory.json` with read-only MCP tool shapes and exact group/UUID evidence status, 1000-result full-list refusal, 4096-index boundary observations; no raw episode bodies.
Host source/CI -> `source-runtime.json` with exact 40-hex branch/ref main, installed vs candidate blobs, config identity, version/session/lease conditions, regressions and exits, untouched sources; sanitized.
Privacy/limitations -> `negative-controls.json` with wrong-group, spoof, private excerpt, retired-as-current and absent/off-topic dispositions with source/candidate caveats; no raw payloads.

Create one fresh collision-safe private staging root. Preserve full originals privately. Share only named allowlisted JSON, `manifest.json`, optional short sanitized diffs/check exits; scan for secrets/source text, reject traversal, symlinks and extra entries, verify file SHA-256/size and tar member equality. Create a sanitized operator-attachable `opencode-operational-schema-guard-108-C1C3-<UTC>.tar.gz`, verify archive readability, record external full archive SHA-256. If any required artifact cannot be produced, return `MISSING:<reason>`; do not manufacture PASS. Do not put raw provider output, private source adjudication or service credential in the archive or public GitHub.

RETURN conversational handback: RESULT=PASS|PARTIAL|BLOCKED, BASE_MAIN_SHA, WORK_BRANCH, CANDIDATE_HEAD_SHA, current remote main SHA, source/config/installed identity, source drift, actual commands/exits and tests, cohort freeze digest, paired metric/read counts and limitations, uniquely reached authorized fact IDs/routes, exact omission-stage certainty, C2 candidate decision and C3 supported API result, Graphiti/OV/EX untouched proof, missing evidence and a next Central decision. Distinguish `search_ms` from genuine hook latency and model answer quality. Include complete `COMMAND_SHAPE_FRICTION` schema below even when no friction occurred; preserve material failed/recovered command shapes without secrets. Provide archive path/hash/bytes and requirement to attach it. No completion claim without artifacts.

COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<short task scenario>
      requested_shape=<sanitized requested invocation>
      effective_shape=<post-hook shape|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<bounded error/correction>
      replacement_shape=<corrected shape|none>
      recipe_reference=<GHDEV-10 key|none>
      resource_reference=<plugin or repo resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>

EVIDENCE_ARCHIVE_REQUIRED=yes
EVIDENCE_ARCHIVE_STATUS=<READY|BLOCKED>
EVIDENCE_ARCHIVE_PATH=<absolute host path|none>
EVIDENCE_ARCHIVE_SHA256=<full sha256|none>
EVIDENCE_ARCHIVE_BYTES=<integer|none>
EVIDENCE_MANIFEST=<manifest.json|none>
EVIDENCE_REQUIRED_ARTIFACTS=<names above>
EVIDENCE_INCLUDED_ARTIFACTS=<list>
EVIDENCE_MISSING_ARTIFACTS=<list/reasons>
EVIDENCE_PRIVACY_CHECK=<PASS|BLOCKED>
EVIDENCE_INTEGRITY_CHECK=<PASS|BLOCKED>
CENTRAL_REVIEW_ATTACHMENT_REQUIRED=yes

REQUIRED OPERATOR ACTION: Attach the verified sanitized archive to the next Central ChatGPT message together with this handback.
<<< LOCAL_AGENT_CONTRACT_END >>>