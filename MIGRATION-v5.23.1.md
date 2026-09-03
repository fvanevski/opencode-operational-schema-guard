# operational-schema v5.23.1 real gateway lifecycle remediation

v5.23.1 is a patch release for the v5.23 target-lifecycle and owner-base reconciliation feature. The public assessment and reconciliation grammars introduced by v5.23 remain unchanged. This release repairs two production integration defects discovered only after fresh-process live deployment and a real repository-owned Firecrawl PR assessment.

## Blocking production defects fixed

### 1. Public result schema was compared to the input-spec schema

The real `local-agent-assessment.mjs` wrapper emits the gateway result schema in its `OPERATIONAL_ASSESSMENT` marker. The result object produced by `repo-pr-assessment.mjs` uses:

```text
opencode-repo-pr-assessment-result-v1
```

v5.23.0 incorrectly required that marker to equal the typed input-spec schema:

```text
opencode-local-assessment-v1
```

That made every real terminal result fail lifecycle authentication even when the exact spec hash, target/base identity, summary hash, summary bytes, terminal result, and exit status were otherwise valid.

v5.23.1 exports one canonical `ASSESSMENT_RESULT_SCHEMA` from `lib/repo-pr-assessment.mjs`, uses it when generating both gateway-owned and repository-owned outer summaries, and uses the same constant when authenticating the public marker and summary in `lib/operation-guard.mjs`.

The input-spec schema remains `opencode-local-assessment-v1`; it is intentionally distinct from the public result schema.

### 2. Owner-reconciliation admission incorrectly required pre-seeded core `observedHead`

The repository-owned gateway already captures the owner checkout in its inode-anchored outer summary and proves that the owner is unchanged before/after assessment. v5.23.0 nevertheless required the legacy/core workspace authority state to contain a separately populated `observedHead` before a clean-owner-behind-base `STALE` result could mint `OWNER_RECONCILIATION`.

That state is normally populated only by a separate bare `git rev-parse HEAD` proof. The typed repository-owned assessment route deliberately does not require callers to run that redundant proof, so a real gateway `STALE` could not be admitted even after the result-schema defect was corrected.

v5.23.1 instead derives the reconciliation old-owner SHA from the authenticated outer summary and requires:

- a 40-lowercase-hex `owner_initial.head`;
- `owner_initial.branch == repository.base_ref`;
- `owner_initial.status == ""`;
- `owner_final.head/branch/status` exactly equal `owner_initial`;
- the gateway has proved `owner_initial.head` is an ancestor of the exact pinned base SHA before emitting the reconcilable owner-behind-base `STALE` cause;
- `runner_execution == "repository-owned"`;
- `runner_authority == "base"`;
- exact observed remote base/head equality with the pinned spec identities; and
- the exact owner-behind-pinned-base terminal error constructed from that authenticated owner SHA.

If core `observedHead` is present and is a valid SHA, it remains an additional fail-closed equality check. It is no longer a prerequisite and is no longer the source from which lifecycle `owner_sha` is minted.

The persisted `OWNER_RECONCILIATION.owner_sha` now comes from the authenticated gateway summary. A clean owner on the base branch that is ahead of or divergent from the pinned base produces a distinct non-reconcilable `STALE`; it remains `TARGET_BOUND`, does not mint `OWNER_RECONCILIATION`, and may be reassessed for the same exact target after the underlying authority condition is corrected.

## Regression repair

The v5.23.0 lifecycle tests accidentally fabricated the public marker with `schema=opencode-local-assessment-v1` and pre-seeded `observedHead` with a bare HEAD proof. Those fixtures modeled a protocol that the real wrapper never emits and masked both production defects.

v5.23.1 changes the fixtures to consume the exported result-schema constant and adds explicit regressions for:

- authentic repository-owned/base `STALE` admission with no pre-seeded core `observedHead`;
- rejection of the retired/wrong input-spec schema when it appears in a public result marker;
- rejection when authenticated summary owner identity disagrees with an independently proven core `observedHead`;
- rejection when `owner_final` drifts from `owner_initial`;
- gateway-level proof that an actual ancestor-behind owner emits the reconcilable `STALE` cause while a clean ahead/divergent owner emits a distinct non-reconcilable `STALE` without mutation;
- lifecycle proof that the divergent-owner `STALE` remains `TARGET_BOUND` and permits corrected same-target reassessment;
- shared result-schema use in public terminal exit-contract tests; and
- shared result-schema use in the assessment-wrapper summary-hash test.

All prior exact spec/hash/target/summary/exit, restart persistence, forged-evidence, unrelated-`STALE`, and reconciliation-consumption regressions remain required.

## Exact-head validation hygiene follow-up

The first caller-owned exact-head validation of the remediated PR passed every substantive static and test gate, but the focused repository-owned assessment test imported `scripts/repo-pr-runner-supervisor.py` through Python `importlib` without disabling bytecode generation. On Python 3.14 that left an untracked `scripts/__pycache__/repo-pr-runner-supervisor.cpython-314.pyc` in the otherwise disposable validation worktree. Under the strict clean-worktree handoff contract, Central correctly classified that run as `ISOLATION_BREACH` even though tracked source, owner checkout, remote refs, GitHub state, and the live plugin were unchanged.

v5.23.1 now runs that repository-source import probe with Python `-B`, preventing `.pyc` materialization at the source path, and the regression explicitly proves that a clean scripts directory does not acquire `__pycache__` state. This is test-harness isolation hygiene only; it does not change runtime gateway, guard, supervisor, or reconciliation authority semantics. The cache is intentionally not hidden with a `.gitignore` rule, because masking the byproduct would not satisfy the clean-worktree validation invariant.

## Important non-blocking session-audit findings

The Firecrawl host-assessment session audit also identified several operational-friction findings. They do not justify weakening authority or containment enforcement, but v5.23.1 makes the intended route explicit in generated policy/documentation:

- **Context pressure:** after the 150000-token compaction warning, prefer bounded selectors and concise summaries rather than dumping large JSON, JUnit, or similar structured payloads into primary context. The 195000-token emergency no-tool ceiling remains unchanged.
- **Deterministic authority denials:** do not ask the user for conversational permission to override a persisted authority/lifecycle rejection. Conversational approval cannot alter deterministic guard state. Use the exact typed capability if it is admitted; otherwise report the blocker.
- **Temporary shell orchestration:** do not generate or execute ad-hoc `/tmp/*.sh` orchestration. Use bare commands or the mandated deterministic Node helpers. Existing execution-side `/tmp/*.sh` guard enforcement remains in place; v5.23.1 does not add a broad temporary-file write prohibition.
- **Repository-runner descendants:** supervisor detection of surviving runner descendants remains an intentional `ISOLATION_BREACH`. The observed PR #349/#352 containment failures demonstrated the supervisor working as designed and require no weakening of the plugin.

## Codex review status

The preceding v5.23 PR received no Codex automated code-review findings because the Codex connector reported that code-review usage limits had been reached. Under the standing project authorization, Codex review is waived while that usage-limit condition remains active. No finding is inferred from the absence of Codex output, and the normal Central independent review, exact-head CI, review-thread inspection, and merge gates remain required.

## Deployment and host validation

No `opencode.json` migration is required solely for v5.23.1.

Upgrade remains stage-first:

1. bind deployment to the exact reviewed/merged v5.23.1 commit;
2. run `npm run check` and `npm test` in the staged source;
3. compare staged/live inventory and exact bytes;
4. backup the current live plugin and deploy through the existing project-controlled replacement path;
5. start a genuinely new OpenCode process after deployment;
6. prove package/runtime version 5.23.1 and live assessment/reconciliation grammar;
7. rerun the repository-owned clean-owner-behind-base reproduction with a **new assessment ID/spec identity**;
8. require the real result marker and authenticated outer summary to admit `OWNER_RECONCILIATION` without any preliminary bare owner-HEAD proof;
9. invoke only the exact `reconcile-owner-base.mjs` capability and require authenticated PASS;
10. prove owner branch/HEAD/clean readback; and
11. stop before running the target PR's next full host assessment until Central reviews the reconciliation evidence.

Do not reuse the failed v5.23.0 assessment identity, hot-edit the deployed plugin, manually fast-forward the owner checkout, or use another session/process to bypass persisted target state.
