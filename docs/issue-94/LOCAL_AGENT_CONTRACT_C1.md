# Issue #94 — first local Build campaign (C1, conditional C2 architecture decision)

This is an **agent-executable** work order. The operator's choice of launch directory, fresh harness process and primary role is supplied outside this file in the kickoff. Follow current nearest repository/global `AGENTS.md` and live stock-V2 permissions without treating historical V1 guards as installed authority.

## Identity, role and permission boundary

```text
REPO_ID=fvanevski/opencode-operational-schema-guard
IMPLEMENTATION_ISSUE=94
PARENT_ISSUE=91
WORKING_BRANCH=issue/94
BASELINE_MAIN_SHA=5892ebac26894ca895dde235916da33d437c3ba9
LOCAL_AGENT_PRIMARY=build
CAMPAIGN=C1_PRE_OPTIMIZATION_BASELINE_AND_C2_DECISION
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed
EVIDENCE_PACKET_REQUIRED=yes
EVIDENCE_ROOT=docs/issue-94/evidence/c1
REMOTE_UPDATE=evidence_only
MECHANICAL_REMEDIATION=forbidden
SEMANTIC_REMEDIATION=forbidden
LOCAL_SUBSYSTEM_REMEDIATION=forbidden
PUBLICATION_FRESH_REVIEW=live-policy-dependent
PUBLICATION_VERIFY=live-policy-dependent
INDEPENDENT_PR_REVIEW=central-owned_later
PR_CREATE=forbidden
MERGE_AND_DEPLOY=forbidden
GRAPHITI_WRITES=forbidden
LIVE_REVIEWSTORE_OR_QUEUE_MUTATION=forbidden
HOST_CONFIG_SERVICE_MUTATION=forbidden
PRODUCTION_SOURCE_MUTATION=forbidden
GPU_INFERENCE=forbidden_within_active_OpenCode_harness_unless_normal_existing_task_traffic
EX_POST_EXIT_WORK=existing_supervisor_only_not_run_inside_active_harness
```

1. Authenticate `issue/94` to the **full SHA from the Central kickoff**, fetch its remote head before any local proof if just advanced, and verify it descends from the pinned initial `main` and contains `docs/issue-94/{README.md,retrieval-profile.mjs,retrieval-profile.test.mjs,this contract}`. The kickoff SHA is the reference identity; do not infer head from a same-name stale local branch. Prefer isolated clean working state rather than mutating unrelated developer checkout. If remote `main` has moved since staging, record it; do not automatically rebase/merge unrelated changes. Follow current `AGENTS.md`, `package.json`, stock-V2 runtime permissions and issue #94/ADR-91.
2. Inspect `README.md` and the **current source** before tests. Revalidate issue #92 one-fact-per-episode/multi-fact-per-cluster invariants and issue #93 semantic/strict abstention path. Confirm the current review index and Graphiti proof routes; do not assume 2026-11-08 counts, Graphiti APIs, installed OpenCode binary hash or service process remain current.
3. Create a new 0700 **private** scratch root using collision-safe `mktemp -d`, with private query input (0600) from already-approved source-linked cases and bounded sanitized labels. Seal input identifiers/sha256 before measurement, and do not tune labels or replace privacy-negative original strings with redacted variants. Never copy raw queries, live reviews, model requests, credentials, native session transcripts or private source into the public repository.
4. Reauthenticate host runtime and actual source/config: OpenCode binary/version, active service PID/start/loaded plugin bytes/order, base/generated config and group `development-knowledge` (or report actual), actual Graphiti MCP endpoint/server version and `tools/list` (names/typed arguments only), actual `get_episodes` capability and **whether there is a supported targeted single-UUID query**. Read source receipts and hash identities without assuming any Graphiti version or targeted API. Observe OpenViking coexistence without restarting service or changing hooks. Capture metadata-only counts: review states and per-origin-cluster fact fanout, local index entries and health bounds, per-fact distinct remote episode UUIDs by count, queue ingress/loss/reasons if current producer exposes them, pending/unknown/deferred backlog, and any real host counts versus historical ~562 reviews.
5. Run exactly the repo-root CPU-only commands in README for the new profiler (`node --check`, two focused `node --test` commands, one disposable `--mode synthetic` near/beyond 4096 and one `--mode local` on authenticated current read-only state with already frozen cases). Keep producer exit codes, source/toolchain identities and output SHA256. Do not mechanically edit source when a test fails. If the profiler itself has a reproducible within-directory nonsemantic defect, you may prepare a bounded private candidate repair, but do not publish changed production source; return the full patch and failure evidence for Central. Synthetic rows must never be written to the live root.
6. Measure the other C1 stages **separately and honestly**, using present public read-only interfaces and preexisting private/safe host instrumentation. Where an accepted observer can see real source-attributed Graphiti `prompt`/`context` calls and assembled model-bound provenance without intercepting raw messages publicly, record all callback durations including error/abstention/late outcomes and on-time useful-context rate. Report `UNVERIFIED` for invisible stages. Distinguish local scan, source-index validation, Graphiti `search_memory_facts`, remote `get_episodes`, callback, full plugin chain (if observable), model answer and exclusive post-exit work. Do not infer callback p95 from Graphiti RTT. No request rerouting on the production port, `SO_MARK`, privileged packet interception, new callback injector, production model-proxy changes, or Graphiti writes. No independent EX/model call while active harness owns the shared lease.
7. For representative source-linked, paraphrase, stale/historical, wrong-group, secret/off-topic, high-group and near-cap cases, report denominators, local candidates, Graphiti result/remote proof availability, source-qualified shortlist, selected vs actually injected counts, abstentions/timeouts, callback percentiles, response bytes/token budget and useful answer attribution **only when observed**. Keep #92 source opportunity/discovery/retention metrics and #93 fixed scorecards as predecessor evidence, clearly label what was/was not reobserved. Do not create a new untouched holdout, tune source thresholds, retroactively re-score the frozen controls or replay historical Graphiti episodes.
8. Freeze C1 **before any C2 source change**. Decide whether evidence demonstrates (a) sufficient headroom/no material bottleneck => `PROFILE_ONLY_ACCEPTED`, or (b) a real growth cliff/runtime loss => `MEASURED_OPTIMIZATION_CANDIDATE`, with exact measurements and failure boundaries. A confirmed 4097-case source-index blackout warrants describing a growth cliff, but does not itself authorize an unreviewed new local cache or relaxation of remote proof. Central authors any substantive C2 code/test patch once the baseline is returned. Do not force an optimization merely to produce a PR.
9. Create one **sanitized self-contained** evidence packet under `docs/issue-94/evidence/c1/` containing `README.md` (preconditions, source/ref hashes, method, sample denominators, typed result), machine-readable aggregate profile (no input queries, source refs or UUIDs), bounded test/producer receipts, captured actual public API signatures stripped of sensitive values, context timing/association aggregate, known gaps, and `COMMAND_SHAPE_FRICTION` below. Include a complete diff for *any* local scratch or repo-source changes (or `SOURCE_DIFF=none`). Ensure no private raw captures or credentials appear in the packet. If safe publication is impossible, retain a private portable packet and report `EVIDENCE_PUBLICATION=BLOCKED` with reason instead of leaking data.
10. When publication is safe, keep working-branch source at Central's staged implementation, stage **only** the evidence packet, respect any live publication Fresh-review/Verify generation requirements, make at most one evidence-only commit on `issue/94`, and push non-force **only if** the remote ref still matches the previously authenticated parent. Read back the remote full SHA, touched paths and state. On branch movement, report `STALE`, do not rebase/reset/force. No PR, no issue mutation, no deployment. Check your OpenCode TodoWrite ledger if used and reconcile status before handback. Finish with a direct conversational handback, not merely a local file path.

## Required handback

```text
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE=94
C1_RESULT=BASELINE_COMPLETE|PARTIAL|BLOCKED
C2_RECOMMENDATION=PROFILE_ONLY_ACCEPTED|MEASURED_OPTIMIZATION_CANDIDATE|UNVERIFIED
SOURCE_BASE_SHA=<full sha>
C1_SOURCE_SHA=<full sha actually profiled>
SOURCE_TREE_SHA=<full sha>
MAIN_SHA_OBSERVED=<full sha>
PRODUCTION_SOURCE_CHANGED=no
HOST_BINARY_VERSION_HASH=<nonsecret version/hash or UNVERIFIED>
ACTIVE_PLUGIN_CONFIG_PAIR=<nonsecret exact digests or UNVERIFIED>
GRAPHITI_ACTUAL_API=<get_episodes semantics and targeted lookup availability, or UNVERIFIED>
LIVE_REVIEW_AND_EPISODE_COUNTS=<aggregates with stage attribution>
QUEUE_BACKLOG_CAPTURE_LOSS=<aggregates or UNVERIFIED>
SYNTHETIC_4096_4097=<counts, target visibility, timing and producer exit>
ACTUAL_LOCAL_SCAN=<cold/warm and p50/p95/max + count + producer exit>
NATIVE_PREFETCH_AND_CALLBACK=<n, p50/p95/max, on-time rate or UNVERIFIED>
REMOTE_PROOF_TIMINGS=<counts, cap, p50/p95/max, failures or UNVERIFIED>
INJECTION_AND_MODEL_ANSWER=<actually supported source/association/answer counts or UNVERIFIED>
EX_POST_EXIT_POSTURE=<read-only observation or NOT_EXECUTED>
TEST_COMMANDS_AND_EXITS=<exact commands/status without secrets>
SOURCE_DIFF=<none or full authenticated portable patch>
EVIDENCE_PACKET_GITHUB_PATH=docs/issue-94/evidence/c1/|BLOCKED
EVIDENCE_COMMIT_SHA=<full sha or none>
EVIDENCE_PUBLICATION=PASS|BLOCKED|STALE
MATERIAL_BLOCKERS=<specific reproducible path or none>
KNOWN_UNVERIFIED=<list>
```

`COMMAND_SHAPE_FRICTION` **must** appear in the conversational handback and evidence packet with this canonical schema (even on clean execution):

```text
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<short repository/task scenario key>
      requested_shape=<bounded sanitized command/invocation requested>
      effective_shape=<actual post-hook runtime invocation|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<bounded decisive message>
      replacement_shape=<corrected shape|none>
      recipe_reference=<GHDEV-10 recipe key|none>
      resource_reference=<plugin/repository resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
```

When no friction occurred: `encountered=no`, `events=[]`, `omitted_sensitive_values=no`. Preserve command producer exits and identity; redact sensitive values. Central consumes friction separately from the C1 outcome.

**Stop and return** only on a material trust/host safety conflict, unexpected source/remote ref movement, necessary production mutation, unavailable private evidence route, or completion of this cohesive C1 baseline. Routine read-only interface discovery and within-scope fixture/observer corrections do not justify serial micro-handoffs. Do not attempt C3 activation or PR creation as a workaround.