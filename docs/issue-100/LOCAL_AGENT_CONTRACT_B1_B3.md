# Issue #100 | B1–B3 first-increment local integration contract

This tracked file is the controlling execution contract for the short kickoff supplied by Central. It is **not** authority to redesign, replace or promote the live Graphiti curator. Current issue #100 and its parent #98 govern semantics. Source baseline: main `658c4c96abc392bf8a100c1afd1dcfacc3adf5b0`; candidate branch `issue/100`, PR #103 (draft). Authenticate the actual candidate SHA from the separate kickoff/current GitHub ref, not from a historical hard-coded SHA in this document.

## Scope, permissions and stop boundary

- Task: B1 live production-mode/source-path reconnaissance; B2/B3 CPU integration and source/retention verification of Central-authored opt-in code; exposed-case local, non-production model interface assessment only when properly admitted. No production promotion.
- Harness: OpenCode **primary build** for safe Git materialization, read-only host inspection, disposable test execution, and (if genuinely needed) one bounded mechanical static correction. Not a strict Evidence role and not a typed V1 gateway.
- `REPO_ID=fvanevski/opencode-operational-schema-guard`, `BRANCH=issue/100`, `PR=103`.
- `MECHANICAL_REMEDIATION=allowed`, `SEMANTIC_REMEDIATION=forbidden`, `REMOTE_UPDATE=allowed_for_one_bounded_mechanical_fix_only`, `LOCAL_SUBSYSTEM_REMEDIATION=forbidden`. Publication Fresh-review/Verify child gates required whenever actual installed operational-schema policy says so, **after** the final edit; these are NOT Central independent PR review.
- Never change `main`, review/approval/merge/issue state, PR status, baselines, tests' asserted meaning, lock/dependency/toolchain manifests, trusted Actions evidence producer, EX admission, graph storage, actual live curator state, installed plugin/config, OpenViking, provider routing, or source/remote credentials.
- Do not alter B1–B3 semantics, source-quote validator, retention categories, episode identity, state authority or retry policy. A test failure that requires such an edit is `SEMANTIC_BLOCKER` for Central, with repro and proposed minimal correction. Do not make the local model a covert architect.
- No second branch, issue, PR, reviewer request or broad refactor; do not use speculative hypotheses as promotion blockers.
- **Guard/harness:** stock OpenCode V2 native permissions are authoritative. V1 typed-gateway/terminal authority, `ADMIT_EXACT_TARGET`, inherited private output control, or historical V1 installer commands are NOT presumed. Do not evade native permission denials.

## Phase 1 — Admit exact source and inspect current host

1. From the already-running Build harness, authenticate repository origin and current working directory; keep the owner checkout untouched. Fetch the exact authorized `refs/heads/issue/100` from origin, then prove the fetched `FETCH_HEAD` equals the **40-character SHA in the kickoff**. Fetch must precede local object/ref proof because this commit was newly advanced remotely. Use a fresh, fail-on-collision detached worktree for that commit. Do not pull/reset/rebase/clean the developer checkout. If the remote head has changed from kickoff unexpectedly, report `STALE`; do not adopt a new head without Central rebind.
2. Inspect current nearest `AGENTS.md`, `package.json`, `.github/workflows/ci.yml`, `docs/issue-99/LIFECYCLE_ARCHITECTURE.md`, `docs/issue-100/B1_ARCHITECTURE.md`, `docs/issue-100/autonomous-policy.mjs`, and actual affected `core.mjs`, `worker.mjs`, `curator-cli.mjs`. Read the full source diff against authenticated `main`, not only GitHub commit summaries.
3. Host read-only: identify the **actual installed** stock OpenCode/curator process, post-exit wrapper, unit/timer/path wake chain, effective argv and model alias, EX lease/quiet-grace binding, Graphiti MCP endpoint and current group. Compare whether production uses ordinary `drain`, `--fact-review on`, `--finite-batch on`, or extra experimental flags. Capture settings **by field name/role only** when values contain tokens, credentials or raw data. Confirm the installed #99 archive path and ReviewStore/index contract without raw record export.
4. Inspect the installed Graphiti MCP public read/update/metadata capabilities **read-only**, preferably existing bound client/tool catalog and version. State `UPDATE_SEMANTICS=UNVERIFIED` if no authenticated method exists. Do not infer arbitrary tags or mutate graph records as a probe. Reconcile the real stored counts of source events, review states and remote episodes as **different populations**, including the known historical 205 deferred reviews versus 862 deferred events (point-in-time counts, remeasure safely). Do not promote or reingest any of those records.

## Phase 2 — Exact candidate CPU qualification

All repository test commands run in the authenticated detached candidate worktree, not the owner checkout:

```bash
node --check docs/issue-100/autonomous-policy.mjs
node --check docs/issue-78/v2-curator/core.mjs
node --check docs/issue-78/v2-curator/worker.mjs
node --check docs/issue-78/v2-curator/curator-cli.mjs
node --test docs/issue-100/autonomous-policy.test.mjs
node --test docs/issue-78/v2-curator/curator.test.mjs
node --test docs/issue-99/archive.test.mjs docs/issue-99/lifecycle.test.mjs
```

Run the listed checks once initially. On failure, inspect full native failure output and the implicated source/fixtures. Rerun the focused failing test after a permitted mechanical repair; do NOT run root suite repeatedly merely to obtain a green counter. Central consumes authoritative exact-head PR CI/trusted Verify separately. Preserve all test counts/exit statuses, not just the last few output lines. A test that fails due to wrong assumptions about installed source, actual model output, or per-fact schema is substantive and returns to Central.

Specific invariant inspection, using isolated synthetic/disposable data:
- A cluster with two independent safe source spans produces two separate fact records with `established_retention` and `provisional_retention`; each retains exact original quote/span/ref, source evidence class, group/project/workspace, observation time and immutable sibling/origin identities.
- Bad source offset, wrong-group/source, secret/injection-containing source, assistant-claim verification upgrade and unentailed normalized synthesis cannot gain graph authority, even if model utility is marked provisional. A malformed sibling does not contaminate a valid sibling.
- Missing/malformed model output must leave source actionable as `new` for later admitted retry; it must not turn into an automatic SKIP or indefinite routine portal-required review.
- One fact per episode and unique terminal same-group remote UUID/index. Persisted source evidence and EX no-replay rules must remain unchanged. Exercise fault-injected **disposable** transitions where existing tests support them, and classify any untested crash window explicitly.
- Verify `ReviewStore` status/retention readback after process/restart simulation and bundle recovery. An existing historical record without new `retention` metadata must remain readable without retroactive relabeling.
- Check that any model-authored normalized claim remains review-only; the Graphiti episode body contains only original quoted assertion and qualified source/retention text, not an asserted causal verification.

Create a small predeclared synthetic/exposed comparison **before invoking a model**: enumerate 6–12 source cases from the existing #92 regression families and new synthetics, with expected safe-source/utility status and no exposed-case claims of prospective independence. Compare one-pass candidate with actual production predecessor shape, including the number of distinct safe facts, deferred utility-only cases, invalid blocks, duplicates, model calls and estimated context cost. CPU-only hand-coded JSON decisions are a validator regression, not evidence of real model utility. Host model calls are optional for this first integration and must respect the next paragraph.

## Phase 3 — Actual model/EX interface boundary

While OpenCode Build remains an interactive inference tenant, **do not** invoke the model-backed curator, force-release the shared lease, preempt another harness, or bypass the post-exit EX scheduler. If a safe existing post-exit service can exercise a disposable isolated group automatically after Build exits, prepare/configure it reversibly and return one verified minimal native operator command to execute **after** harness exit (normally the existing curator user service start/wake, not a new detached controller). Do not execute that command from inside the Build session. Only use disposable novel source records/graph group if an admitted real model/Graphiti experiment is both required and authorized; never re-submit historical real episodes. If no safe isolated EX/model route exists now, report `MODEL_EXPERIMENT=DEFERRED_HOST_GATE` and deliver complete CPU/source evidence, not a fabricated runtime PASS.

No live source/config activation, restart of the shared OpenCode service, or new production curation policy is authorized by this first increment. Separate merge/production-promotion/fresh-client acceptance belongs to later #100 B5 and final #101 gate.

## Evidence matrix and private artifact

Use a new collision-safe private staging root (SW-01: `mktemp -d` with a unique suffix under an existing private parent; never pre-emptively `rm -rf` an old directory). Write the following **sanitized, operator-attachable** artifacts and provide the full actual paths:

| Criterion | Required artifact | Primary observation | Privacy |
|---|---|---|---|
| Exact source and worktree | `identity.json` | full SHA, parent/base, branch ref after fetch, blob hashes, clean status, full changed-path list | shareable |
| Real installed production mode and #99 contract | `production-invocation.json` | selected systemd/argv/EX/wake bindings, model alias, source/record population counts, version/readback, secrets redacted | shareable sanitized |
| B1 source/decision map | `source-map.md` | actual code entrypoints and keep/simplify/replace/retire updates, unknown Graphiti metadata semantics marked unverified | shareable |
| CPU regressions | `tests.json` and `tests.txt` | literal commands/workdirs/exits, complete bounded TAP counts and decisive failures, no elided failure lines | shareable |
| B2/B3 policy/fact status | `policy-cases.json` | synthetic/exposed labels, stagewise denominators, per-fact source and retention outcomes **without private quotes**, dedup/invalid/model counters | shareable |
| Privacy, source, no replay, EX | `integrity.json` | immutable record/UUID comparison, unattempted live writes, lease state and optional after-exit route | shareable |
| Drift and omissions | `friction.json`, `manifest.json` | canonical friction fields, criterion-to-file SHA256/bytes/identity, missing evidence reasons | shareable |

Private backups, raw source events, raw model prompts/replies, bearer/env files, Graphiti episodes, full private process environment, raw provider requests and keys must stay **outside** the shareable tree. Scan actual archive members, compare manifest inventory/sha256/byte size, reject extra members/symlinks/traversal, compute external full archive SHA-256, and independently verify archive readability. Deliver a single `ghdev-osg-issue100-b1b3-<UTC>.tar.gz` for attachment to Central. Do **not** push evidence to public GitHub without separate approval. If unsafe/incomplete, mark archive `BLOCKED` and return bounded sanitized facts in chat.

## Handback

```text
LOCAL_AGENT_RESULT=PASS|FAIL|BLOCKED|STALE
REPO_ID=fvanevski/opencode-operational-schema-guard
PR_NUMBER=103
MAIN_BASE_SHA=<40-hex>
EXPECTED_BRANCH_SHA=<kickoff 40-hex>
TESTED_SHA=<40-hex>
REMOTE_BRANCH_SHA_AFTER=<40-hex>
SOURCE_DIFF_COMPLETE=yes|no
PRODUCTION_CURATOR_MODE=<observed mode|UNVERIFIED>
GRAPHITI_METADATA_UPDATE_SEMANTICS=<verified shape|UNVERIFIED>
MODEL_EXPERIMENT=<not_attempted|DEFERRED_HOST_GATE|qualified_disposable>
EX_LEASE_UNCHANGED=yes|no|UNVERIFIED
REVIEWSTORE_AND_SOURCE_IDENTITY=<PASS|FAIL|UNVERIFIED>
AUTONOMOUS_TESTS=<pass/fail counts, exact exits>
LEGACY_REGRESSIONS=<pass/fail counts, exact exits>
SAFE_FACTS_SELECTED=<count>
PROVISIONAL_SELECTED=<count>
INVALID_BLOCKED=<count>
SOURCE_EVENTS_NEW_OR_MUTATED_IN_LIVE=<count or UNVERIFIED>
REMOTE_EPISODES_NEW_OR_MUTATED_IN_LIVE=<count or UNVERIFIED>
MECHANICAL_CHANGE=<none|old_sha_to_new_sha+paths+gate evidence>
SEMANTIC_BLOCKER=<none|exact repro and violated invariant>
POST_EXIT_OPERATOR_COMMAND=<none|one authenticated minimal existing command>
EVIDENCE_ARCHIVE_REQUIRED=yes
EVIDENCE_ARCHIVE_STATUS=READY|BLOCKED
EVIDENCE_ARCHIVE_PATH=<verified host absolute path or none>
EVIDENCE_ARCHIVE_SHA256=<full 64-hex or none>
EVIDENCE_ARCHIVE_BYTES=<integer>
EVIDENCE_MANIFEST=<archive path or none>
EVIDENCE_REQUIRED_ARTIFACTS=<count/list>
EVIDENCE_INCLUDED_ARTIFACTS=<count/list>
EVIDENCE_MISSING_ARTIFACTS=<items and reasons>
EVIDENCE_PRIVACY_CHECK=PASS|BLOCKED
EVIDENCE_INTEGRITY_CHECK=PASS|BLOCKED
CENTRAL_REVIEW_ATTACHMENT_REQUIRED=yes
```

Include the **exact canonical bounded** `COMMAND_SHAPE_FRICTION` block below in the conversational handback, whether or not friction occurred:

```text
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<short key>
      requested_shape=<sanitized command submitted>
      effective_shape=<executed or rejected command|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<specific cause/correction>
      replacement_shape=<successful corrected shape|none>
      recipe_reference=<GHDEV-10 recipe key|none>
      resource_reference=<tool or resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
```

If no events: `encountered=no`, `events=[]`, `omitted_sensitive_values=no`.

Do not label CPU-only results model/Graphiti acceptance. Return complete file diffs for any edit, tests tied to the **post-edit exact head**, status of PR CI if visible, and a concise Central-required decision list. Stop at this meaningful first-increment evidence boundary, rather than launching B4 redesign or B5 production activation. Finish with:

`REQUIRED OPERATOR ACTION: Attach <verified archive filename/path> to the next Central ChatGPT message together with this handback.`
