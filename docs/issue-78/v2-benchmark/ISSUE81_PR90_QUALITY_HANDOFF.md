# Issue #81 / PR #90 — consolidated semantic-recall quality qualification

## Authority / objective

```
LOCAL_AGENT_PRIMARY=build
REPOSITORY_VERIFY_AUTHORITY=trusted-actions-plus-focused-host
MECHANICAL_REMEDIATION=private-scratch-only
SEMANTIC_REMEDIATION=forbidden
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed
EVIDENCE_PACKET_REQUIRED=yes
EVIDENCE_ROOT=evidence/issue81-semantic-recall/quality-followup
INDEPENDENT_PR_REVIEW=central-owned
LIVE_DEPLOYMENT=forbidden
LIVE_GRAPHITI_MUTATION=forbidden
```


This is **one** Build-agent host integration and evidence campaign for the Central-authored semantic-first recall candidate on the existing **draft PR #90**. Target the exact new commit SHA supplied by the operator kickoff and verified remote ref, not any older stage/evidence commit or local default branch. The new source-exact scorecard and tests in this commit are Central-owned evaluation code, not permission to change product recall policy.

Repository: `fvanevski/opencode-operational-schema-guard`
Branch: `issue/81-semantic-recall` → `main`
Prior reviewed production control: `main@6e5695da91974447c718e99757bc8a84d9de3e9d`
Prior source candidate: `74972845dcf885e8676d5845853bc590e742f137`
Prior evidence-only commit: `5d233c0de7a161eceaf7c98f8d9b8a9d5fc0792a`
Current target: **the exact kickoff SHA, which contains this contract and the Central scorer.**
Original frozen 16-positive/4-negative roster digest: `47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652` (read back original bytes locally; do not reconstruct).
Host work root: the **operator-prepared** clean detached worktree, with no checkout/branch changes required inside the campaign.
Production group: `development-knowledge`; workspace `/workspace/mcp_servers/gh_mcp`; project `gh_mcp`; Graphiti MCP `http://127.0.0.1:8766/mcp`; curator state root observed previously `/home/filip/.local/state/ghdev-graphiti` (re-authenticate, not an unconditional pin).

### Scope and execution classes

- **CPU-only, while Build is active:** source/readback, script syntax/tests, private roster extraction/adapters, scorecard, signed precision worksheet readback, evidence scrubbing, statistics, portal/status GET/CLI inspect.
- **Host read-only Graphiti:** existing `search_memory_facts` and `get_episodes` through the established MCP client. Semantic search/embeddings may use the already-running GPU service internally; do not start another inference server/model or the post-exit curator.
- **Excluded in this pre-merge campaign:** deployed-plugin replacement, stock-V2 service restart, live context hook acceptance, Graphiti `add_memory`/delete/update, curator drain, EX gate changes, source-group migration, disabled fencing, changed original labels, and any source/code semantics changed to obtain PASS. Those are not required to assess this existing unmerged PR. Subsequent genuinely fresh installed-client acceptance is a separate post-merge boundary.

Allowed local autonomy: diagnose and repair ordinary private input-projection errors, a shell/CLI invocation shape, local scratch path/permissions, private evidence formatting, transient read-only connection faults, and exact test command execution. Apply a minimal semantics-preserving formatting fix to a **private** helper if needed. **Do not alter staged production code, tracked tests/scorer/contract, benchmark definitions or acceptance authority.** If a tracked semantic defect is reproducible, provide the exact input/output, path and proposed narrowly bounded regression to Central, without patching the implementation yourself.

## Phase 1 — Authenticate and qualify Central source

1. From the operator-prepared worktree authenticate `git rev-parse HEAD` equals the kickoff SHA, `git status --short` empty, branch remote `issue/81-semantic-recall` still equals the kickoff SHA, `main` exact base is unchanged or report movement, and the two new files and this handoff are present at the target blob identity. Authenticate the original source commit/tree and evidence-only parent chain; do not rebase, reset or force-sync a branch. Inspect repository-local guidance if present and current native role restrictions.
2. Run each `node --check` separately on:
   - `docs/issue-78/v2-benchmark/score-semantic-replay.mjs`
   - `docs/issue-78/v2-benchmark/score-semantic-replay.test.mjs`
   - `docs/issue-78/v2-benchmark/issue81-semantic-replay.mjs`
   - `docs/issue-75/v2-candidate/semantic-recall.mjs`
   - `docs/issue-75/v2-candidate/memory-core.mjs`
3. Run `node --test docs/issue-78/v2-benchmark/score-semantic-replay.test.mjs docs/issue-75/v2-candidate/semantic-recall.test.mjs docs/issue-75/v2-candidate/semantic-memory-integration.test.mjs docs/issue-78/v2-curator/curated-recall-candidates.test.mjs docs/issue-75/v2-candidate/memory-core.test.mjs`. Preserve actual process status and test counts; do not pipe away the exit. Existing exact-head trusted Actions/PR CI may satisfy root `npm run check`/`npm test`; do **not** rerun the same entire root suite if current CI already passed with matching source/head and commands.
4. Source review: unchanged strict `relevance.mjs` and Issue #75 default; Issue #78 default semantic and explicit strict; 24 native facts; source resolver/journal; remote-positive indexed membership; `safeText` query/fact fences; no foreign group, missing source, false verified label, sourceContext leak, or change to the 300 ms `Promise.race`. Inspect actual code rather than echoing this checklist. Return one focused finding matrix.

## Phase 2 — One fully paired private cohort, not another exploratory campaign

5. Read the actual frozen 16+4 roster bytes and verify SHA-256 equals `47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652`; verify original query/source identity and any human-approved source equivalence **without altering** the frozen file or accepted judgments. Map its existing questions and expected source refs to a **private** manifest matching `issue81-frozen-source-scorecard.v1` with **all 20 cases**. Required fields: `frozen_roster_sha256`, exact `group/workspace/project`, and `cases:[{case_id,role,query_sha256,expected_source_sha256 (positives only),tags}]`. `expected_source_sha256` hashes the exact frozen expected `source_ref` string using SHA-256; for originally ambiguous or missing expected source, report that case as `UNSCORABLE` instead of inventing an exact match or silently omitting it. Keep the manifest private; no benchmark denominator changes.
6. Confirm existing production group and scoped local state root. Use read-only `get_episodes` membership and original source index/resolver, not a new group or an artificial fact injection. The established replay entrypoint is:

   `node docs/issue-78/v2-benchmark/issue81-semantic-replay.mjs --endpoint http://127.0.0.1:8766/mcp --group development-knowledge --state-dir /home/filip/.local/state/ghdev-graphiti --workspace /workspace/mcp_servers/gh_mcp --project gh_mcp --query '<one original private frozen query>'`

   Invoke it **once per original case, serially**, from the authenticated checkout with the actual private question. If the actual state root differs, use the **verified actual root**, not the historical string. Keep raw prompts out of shell history/public logs where possible. Each invocation outputs a fingerprint-only paired strict/semantic response. Re-run **only** a result whose read failed for a proven transient transport problem. Do not average runs until they agree, choose a best run, or adjust original questions.
7. Combine the 20 exact replay outputs into **one private** `issue81-shadow-replay-batch.v1` file of `{schema, cases:[{case_id, replay:<exact raw replay JSON>}...]}`. Run the Central-authored scorer exactly:

   `node docs/issue-78/v2-benchmark/score-semantic-replay.mjs --manifest <PRIVATE_MANIFEST_JSON> --batch <PRIVATE_BATCH_JSON>`

   The scorer **must** reject incomplete/misidentified rosters, count regressions as regressions, and report original source drift as a miss. Preserve its JSON stdout in a private 0600 result file. Do not edit the scorer or source to change a result. If the existing private corpus cannot be mapped because of an exact schema/identity gap, return the blocker plus one complete mapping recommendation; do not construct a substitute cohort.
8. Assess the two Central review questions using actual positive case identities and private source evidence:
   - **Indexed-only lexical preselection**: for source-correct observations omitted from the presented context, identify whether the native 24 lacked the remote episode, the verified index held it, lexical preselection rejected it, positive remote proof timed out, dedup/budget cut it, or final ranking selected another. Attribute each case to the actual stage; do not call an unverified source an eligible fact.
   - **Unanchored multi-event cap**: identify actual indirect/multi-event positives where the native top facts were independently source-linked but zero query lexemes matched, and classify whether the one-fact cap omitted useful complementary material. Compare with unrelated N01 cost. **Do not automatically loosen the cap** or treat multiple Graphiti facts as independent evidence of relevance.
   Classify old expected source drift (especially S07) explicitly; preserve N02 as a known **same-group content-policy negative**, not false cross-group leakage. Report case-level precision/recall separately from total injected fact counts. Any claim about semantic usefulness/answer utility needs an actual human judgment, not a hash.
9. If the original 20-case cohort has already been marked exposed, keep that label. Do not call this an untouched holdout. Preserve prior 13/16 exposed result as historical control. Report source-exact numerator/denominator, strict-vs-semantic paired delta, first-ranked source, negative injected-count, case-category breakdown, p50/p95/max for **shadow `Memory.search` only**, and clearly `NATIVE_HOOK_P95=UNVERIFIED`.

## Phase 3 — Human-quality and bounded operating checks

10. Locate the original 126-fact operator precision packet and its actual ratification state. **One batch human review:** prepare a private, navigable packet with each fact's original source/claim/temporal/provenance context, existing human verdict (if any), and one explicit completeness tally. Present it to the operator for a single approve/correct/decline pass. Agent proposals are suggestions only, never signatures. If no ratification can be obtained during this campaign, mark `HUMAN_PRECISION=PENDING_OPERATOR_REVIEW` and return the ready private packet, **without pausing all other evidence**. Do not overwrite signed judgments, change case truth, assume 13/13 on a smaller packet means 126/126, or mark target >=0.90 accepted absent operator-signed evidence.
11. Perform a bounded read-only compatibility smoke for the current candidate/curator CLI `inspect/status` and the existing #80 portal GET/status/graph-preview route using actual currently configured service endpoints. Check group/workspace isolation and source labels, do not issue a destructive correction/forget on production. Reuse previously independently accepted non-production correction/forget receipts when their source/runtime identity remains applicable; otherwise mark those mutation-specific operations not re-exercised. No new portal implementation work or temporary service is required for this read-only smoke.
12. No installed source/config/plugin/service mutation; verify unchanged host hashes/units/options when available. If private acceptance instrumentation was already installed from earlier runs, it may be **read**, not modified. A current resident stock-V2 session is not a genuine post-merge fresh-process run. Do not conflate read-only Graphiti response times with the actual 300 ms context hook and do not launch model-backed drain during an interactive agent session.

## Phase 4 — One sanitized evidence-only continuation and handback

13. Use a new collision-safe private 0700 campaign root (never delete or reuse an occupied path), with 0600 raw source/prompt/adjudication/score JSON. Publish **only** a compact sanitized packet under `evidence/issue81-semantic-recall/quality-followup/` on the **existing PR branch**, not another PR or evidence branch. Include `README.md`, `source-and-tests.json`, `paired-source-scorecard.json` (digests/case IDs only), `relevance-loss-stage.json` (coded reasons only), `precision-and-operations.json` (non-private status and evidence class), `command-shape-friction.json`, and a SHA256 manifest. Before publication inspect every file for raw private prompts, facts, UUIDs, tokens, usernames, API keys, raw host paths that could identify private content, or unratified human verdicts. Keep the complete private review packet on host.
14. Check the current stock-V2 publication permissions. If they explicitly require a bounded Fresh-review/Verify child generation for this evidence-only commit, complete those current gates rather than bypassing them; such a child is NOT the independent GHDEV-05 PR review. Immediately before the **one** evidence-only commit: re-read the exact branch ref and require it equals the kickoff SHA; the user authorized a bounded evidence publication to the existing #90 branch, **not** a semantic implementation change, force-push, rebase, new PR, issue write, deployment or merge. If branch moved, stop with `STALE` and preserve local packet. Publish only the evidence subtree, non-force; read back parent==kickoff SHA, new branch/head, changed-path inventory, evidence manifest hashes and clean working tree. If the current harness cannot publish within its active permission/safety contract, do not bypass it: return the sanitized packet location and `EVIDENCE_PUBLICATION=BLOCKED` for Central to publish.
15. Return **one** handback (not phase-by-phase):

```
CAMPAIGN=ISSUE81_PR90_SOURCE_EXACT_QUALITY
RESULT=PASS_EVIDENCE_READY|PARTIAL|BLOCKED|STALE
PR_NUMBER=90
ADMITTED_HEAD=<kickoff sha>
CANDIDATE_TREE=<exact>
CONTROL_MAIN_SHA=<fresh main sha>
SOURCE_INTEGRITY=PASS|FAIL
SOURCE_AND_PRIVACY_FENCES=PASS|FAIL|UNVERIFIED
FOCUSED_TESTS=<producer count/exit>
ROOT_ACTIONS_CI=<exact head/run/status or unavailable>
FROZEN_ROSTER_SHA256=<full exact>
REPLAY_COHORT=<positive/negative count; full/missing>
STRICT_SOURCE_EXACT=<n/d>
SEMANTIC_SOURCE_EXACT=<n/d>
REGRESSIONS=<case ids or none>
NEGATIVE_CONTEXT_COST=<N01-N04 and source/privacy separate>
INDEXED_ONLY_RELEVANCE_GAP=<case IDs and causal stage>
UNANCHORED_MULTI_EVENT_GAP=<case IDs and causal stage>
SOURCE_DRIFT=<case IDs and accepted original vs current digests>
SHADOW_LATENCY=<n,p50,p95,max,elapsed method>
NATIVE_HOOK_P95=UNVERIFIED
HUMAN_PRECISION=<ratified n/d+signed proof|PENDING_OPERATOR_REVIEW|UNVERIFIED>
PORTAL_CLI=<read-only statuses, prior mutation evidence applicability>
LIVE_INSTALL=unchanged
GRAPHITI_MUTATIONS=none
EX_GATE_MUTATIONS=none
EVIDENCE_PUBLICATION=<commit, parent, hash readback|BLOCKED>
NEXT_CENTRAL_DECISION=<specific positive review or source-correction question>
COMMAND_SHAPE_FRICTION=<canonical GHDEV-10 block below>
```

### Canonical GHDEV-10 friction block (include even for PASS)

```
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<specific task/scenario>
      requested_shape=<submitted sanitized command or invocation>
      effective_shape=<actual after hook/alias or rejected>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<actual bounded diagnostic>
      replacement_shape=<validated replacement or none>
      recipe_reference=<GHDEV-10 recipe ID or none>
      resource_reference=<actual resource ID or none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
  COMMANDS_MATCH_HANDOFF=<yes|no>
```

## Decision rule / stop boundary

The campaign can be **PASS_EVIDENCE_READY** when source, scope, tests, paired same-input 20-case diagnostic and all safety invariants are authenticated and the results (even negative findings) are faithfully published. A policy miss or sub-target score is **not** permission to change labels, widen group boundaries, or invent a pass; report it as a source/acceptance finding for Central. A material source or evaluator defect proven by reproducible input/output becomes one Central-owned candidate correction on PR #90, not another broad host-discovery campaign. Stop early only on source/roster identity mismatch, positive privacy/wrong-group/false-authority leak, unrecoverable service evidence failure, active EX lease conflict, or inability to prove the execution target; preserve private evidence and existing host state.

**Central continuation after handback:** independently adjudicate the current exact-head source/quality evidence; run the late Codex residual review only once Central is otherwise clean and within the PR-scoped request cap. Formal approval/merge require separate authority. If merged, apply GHDEV-06's progressive reversible stock-V2 deployment -> genuinely fresh-client/native-session acceptance; do not turn that post-merge freshness boundary into this pre-merge shadow campaign.