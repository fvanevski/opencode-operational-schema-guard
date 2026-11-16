# Issue #100 | B4/B5 consolidated host qualification, continuation of PR #103

This is the **agent-executable** contract for the next coherent #100 campaign. Central has already authored the substantive code. The operator's launch and post-exit process transition instructions are outside the copyable agent kickoff. Source baseline and exact candidate head come from the kickoff + fresh GitHub readback, not from this file's historical commit references.

## Role / scope

```text
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE=100
PARENT=98
BRANCH=issue/100
PR=103 (keep DRAFT)
PRIMARY_AGENT=build
SEMANTIC_REMEDIATION=forbidden
MECHANICAL_REMEDIATION=allowed
REMOTE_UPDATE=one bounded mechanical correction only, exact remote-head CAS/non-force
LOCAL_SUBSYSTEM_REMEDIATION=forbidden
LIVE_PRODUCTION_DEPLOYMENT=forbidden
DISPOSABLE_GRAPHITI_SUBMISSION=allowed_after_authentic_post_exit_EX_only
GRAPHITI_PHYSICAL_DELETE=forbidden
GRAPHITI_PRODUCTION_GROUP=development-knowledge (read-only)
INDEPENDENT_PR_REVIEW=central-owned
```

The accepted #99 source-preserving F archive and current Graphiti group/ReviewStore source identity are non-negotiable. No alternate SQLite store, human approval queue, new service, fork, paid model or inferential concurrency. Existing stock-V2 permissions are real authority; historical V1 assessment/terminal-gate conventions are not presumed live.

## A — Source/host identity and focused CPU execution

1. Use your already-running Build permission to inspect the authorized owner checkout, then **fetch remote `refs/heads/issue/100` before** checking the exact fetched object. Require FETCH_HEAD and the remote branch to equal the kickoff's full `EXPECTED_HEAD_SHA`. Create a fresh, collision-safe detached worktree at that object. Do not checkout/reset/rebase the owner checkout or silently adopt head movement. Authenticate `main@658c4c96abc392bf8a100c1afd1dcfacc3adf5b0` and read the entire PR diff, current nearest AGENTS, current issue #100 and the branch's `B1_ARCHITECTURE.md`, `B4_ARCHITECTURE.md`, and evaluation rubric.
2. Confirm the host-installed curator is still **plain production drain**; the candidate has an opt-in `--autonomous-curation` flag on both JS CLI and Python EX wrapper. Read `post-exit-drain.py` and `curator-cli.mjs` full current sources and resolve actual installed canonical `--gate-source`, `--gate-config`, Graphiti MCP endpoint, model alias/settings, socket/service/EX locks. Do not expose secrets; no source/service promotion.
3. Root CI/trusted Actions is Central-owned deterministic Verify. Unless current exact-head Actions fails or host environment identity is the acceptance target, do NOT duplicate the whole `npm test` suite. Do run focused, host-native tests (or use current exact-head CI receipt if output is fully equivalent):

```bash
node --check docs/issue-100/autonomous-policy.mjs
node --check docs/issue-100/consolidation.mjs
node --check docs/issue-78/v2-curator/core.mjs
node --check docs/issue-78/v2-curator/worker.mjs
node --check docs/issue-78/v2-curator/curator-cli.mjs
node --test docs/issue-100/autonomous-policy.test.mjs docs/issue-100/consolidation.test.mjs
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s docs/issue-75/v2-candidate -p 'test_post_exit_drain.py' -v
```

Check original-source/secret rejection with a genuinely secret-pattern synthetic quote, plus valid sibling survival, normalized suggestion review-only, exact source/retention and scope/temporal labels. Check per-fact bundle restore after simulated crash, local revision CAS and one-step rollback, status readback after a restarted reader, unchanged remote episode UUID/index, and that logically retired/superseded records cannot pass either `sourcedEpisodeResolver` or `curatedRecallCandidates`. Examine both standalone and current model-bound source acceptance. No test/baseline weakening for green.
4. Inspect actual new-source-trigger selection. A pre-existing episode, identical replay, wrong-scope, same-origin, private quote, submission_unknown or nonterminal Graphiti record must NOT cause a model consolidation call. Two distinct new source facts must not contaminate each other's terminal state. Only a newly available, positively indexed, same-group Graphiti fact can trigger provisional reconsideration; repeated identical prompt is not new evidence. Preserve `<=2` optional model attempts per admitted drain and priority for new capture. Assess if this implementation has a concrete material defect; return full source/trace with a minimal Central-owned repair proposal rather than making substantive edits in this evidence campaign.
5. Freeze an exposed comparison set and a separately labeled new prospective set **before** seeing model outcomes. Use `docs/issue-100/B5_COMPARISON_PROTOCOL.md`. Original source support, future usefulness, retention outcome, duplicate/no-replay, tokens/calls and operator touches require their own denominators. Do not represent 7 deterministic hand-coded cases as measured model utility or a causal answer benefit.

## B — Prepare genuine post-harness EX model/Graphiti trial

The post-exit wrapper source is already staged by Central. It owns the canonical installed OpenViking gate admission, no active harness, metrics idle, quiet grace and kernel EX lease. **Never** call `curator-cli.mjs drain` directly with a hand-set `GHDEV_MEMORY_POST_EXIT_LEASE`, run model-backed drain inside an interactive Build/Hermes tenant, or turn off the guard to test.

1. In a private collision-safe scratch root, prepare a **disposable nonproduction Graphiti group** (not `development-knowledge`) and original-source queue using the existing authenticated `fromPromptCandidates/fromTool` + `CandidateQueue.stage` interfaces. Preserve valid project/workspace/session/native source handles and source event IDs; use controlled technical synthetic facts and no real private messages. Do not seed `ReviewStore` manually to fabricate AI decisions. Freeze the source packet/hash and its expected utility categories prior to inference. Distinct later source IDs should allow a second EX cycle to test new-evidence consolidation without replaying the same remote episode.
2. Qualify the exact supported candidate wrapper flags (the new `--autonomous-curation` option is on `post-exit-drain.py`, while `curator-cli.mjs` takes `--autonomous-curation on`; these are **not** interchangeable). The wrapper's `--finite-batch-v2` and `--autonomous-curation` are mutually exclusive. In particular, its exit-4 continuation must pass the same autonomous flag under the retained EX lock. Do not add a new wrapper or temporary daemon. Confirm no standing production unit is changed.
3. Return a **fully rendered, shell-safe, post-exit-only** host operator command using the actual candidate worktree, current canonical installed `--gate-source` and `--gate-config`, `--cli` from this exact candidate, disposable `--group`, private `--state-dir`, installed Graphiti `--endpoint`, bounded `--max-seconds`/lock timeout and `--autonomous-curation` as the wrapper boolean. Include its stdout/stderr redirect to a private log and exit-code receipt. Keep keys in existing private environment configuration. The command must not be run while this Build process or any other active inference tenant remains. If available and actually safe, a separate host supervisor may own the post-harness execution **only after all model harnesses exit**. Otherwise the operator executes it after Build exits; that is a single campaign transition, not a new architectural handoff.
4. For the second cycle, only after exact terminal outcome of the first and a fresh newer independent synthetic source, repeat the same authentic EX route to observe bounded consolidation. Do not force the model to choose promotion/retirement; record its actual decision, source/new remote proof, rollback feasibility and after-state. A repeated model call on the same trigger without new evidence is a regression. Do not promote or reingest historical production episodes.

If the harness-absence gate cannot be met, return `READY_FOR_POST_EXIT_OPERATOR_RUN` with exact commands and do **not** claim model acceptance; do not weaken process classification, force unlock, kill the productive gate or alter production data. If an ambiguous Graphiti write occurs, retain the canonical EX unknown/reconciliation behavior and stop safely. The shared service remains otherwise operational.

## C — Evidence matrix and archive

Create an operator-attachable, allowlisted `.tar.gz` inside a separate private root, independent of raw model logs, host env, originals or rollback backups. Require exact member names (no symlinks, path traversal, unexpected extra files), per-member bytes/SHA256 in `manifest.json`, independent archive readability, and **external** complete SHA256+byte count.

| Objective | Required shareable artifact | Contents |
|---|---|---|
| Exact source | `identity.json` | full main/candidate tree/head, fetched ref, clean diff/status, actual configured tested SHA, trusted CI receipt ref |
| Code/authority audit | `source-contract.md` | meaningful source/consumer/EX paths, fallback/unknown/rollback and original-source checks, any blocking finding with reproduction |
| CPU regressions | `tests.json`, `tests.txt` | literal commands, workdirs, exits, full pass/fail counts, decisive diagnostics |
| Frozen comparison | `cohorts.json`, `evaluation.json` | before-model source hashes, denominators and blinded labels, predecessor vs candidate results/limitations, false negatives and duplicates |
| EX post-harness run | `ex-run.json` | canonical gate/quiet grace observed, actual wrapper flags, service/process state and exit receipts; if not run `not_executed` |
| Original-source/remote | `graphiti-proof.json` | disposable group only, per-fact source/review/index/remote UUID positive identity, changed counts, no unknown replay |
| Consolidation | `consolidation.json` | triggers, actual decisions, status/revisions, one-step rollback, no repeat, source/exclusion readback and model/token/cost counts |
| Production non-mutation | `nonmutation.json` | production CLI/config and 4,002 historical archive/566 review/355 episode readback where safely available, no forced reingestion |
| Drift and completeness | `friction.json`, `manifest.json` | required `COMMAND_SHAPE_FRICTION` fields plus omitted items/reasons and digest-valid member inventory |

Counts are **new point-in-time** observations, not silently reused fixed truths. Raw model/provider requests/replies, credentials, native personal text, episode bodies, secrets and production backup data stay private outside the archive. Never push the raw archive to a public GitHub branch. If privacy scan or digest validation fails, mark archive `BLOCKED` and return sanitized counts directly.

## Completion and handback

```text
LOCAL_AGENT_RESULT=PASS|FAIL|BLOCKED|STALE|READY_FOR_POST_EXIT_OPERATOR_RUN
REPO_ID=fvanevski/opencode-operational-schema-guard
PR=103
EXPECTED_HEAD_SHA=<40-hex kickoff>
TESTED_HEAD_SHA=<40-hex>
REMOTE_HEAD_AFTER=<40-hex>
TRUSTED_CI_EXACT_HEAD=PASS|FAIL|PENDING|UNVERIFIED
PRIMARY_AGENT=build
LIVE_PRODUCTION_MUTATION=none|explain
DISPOSABLE_GROUP=<qualified nonproduction identifier>
SOURCE_AND_PRIVACY_REGRESSIONS=<counts/exit>
RETENTION_CAS_AND_ROLLBACK=<counts/exit>
RECALL_EXCLUSION=<counts/exit>
EX_WRAPPER_FLAGS_AND_RETRY=<counts/exit>
MODEL_EXPERIMENT=PASS|FAIL|DEFERRED_HOST_GATE|NOT_EXECUTED
MODEL_CALLS_AND_TOKENS=<measured denominators>
PROSPECTIVE_COHORT=<frozen count, classification>
PREDECESSOR_COMPARATOR=<comparable|noncomparable|not_run>
SOURCE_SUPPORTED_FACTS=<count>
ESTABLISHED_SELECTED=<count>
PROVISIONAL_SELECTED=<count>
SKIPPED_USEFUL=<count>
UNKNOWN_REMOTE_OUTCOMES=<count>
TERMINAL_EPISODE_UUIDS=<count, positive membership status>
CONSOLIDATION_TRIGGERED=<count>
CONSOLIDATION_OUTCOMES=<retain/promote/supersede/retire counts>
NO_REPLAY_AND_ROLLBACK=PASS|FAIL|UNVERIFIED
EX_LEASE_AND_HEALTH=PASS|FAIL|UNVERIFIED
SEMANTIC_BLOCKER=<none|one concrete repro/invariant>
MECHANICAL_CHANGE=<none|changed paths, pre/post SHA and new gates>
POST_EXIT_OPERATOR_COMMAND=<complete exact supported command|none>
ARCHIVE_STATUS=READY|BLOCKED
ARCHIVE_PATH=<real absolute host path|none>
ARCHIVE_SHA256=<64-hex|none>
ARCHIVE_BYTES=<integer|none>
ARCHIVE_MANIFEST=<member list/digest|none>
MISSING_ARTIFACTS=<none|reasons>
PR_REVIEW_READY=no
ISSUE_CLOSURE_READY=no
```

Include the full canonical `COMMAND_SHAPE_FRICTION` block for **each meaningful failure/correction**, containing `scenario`, `requested_shape`, `effective_shape`, `rewrite_provenance`, `event_kind`, `execution_effect`, `correction_or_annotation`, `replacement_shape`, `recipe_reference`, `resource_reference`, `contract_conflict`, `durable_gap_candidate`, and `omitted_sensitive_values`. If none, `encountered=no; events=[]`.

Return a direct conversational handback and attachable private archive, with exact full source diff for any change and an explicit statement of remaining Central review/merge/activation work. Do not create another PR, request Codex at opening, merge, alter existing gates, or claim complete #100 acceptance. **After a material model/EX FAIL or safely completed host trial, stop the bounded campaign and return evidence for Central semantic adjudication.** Minor mechanical/scratch corrections remain inside this one campaign.
