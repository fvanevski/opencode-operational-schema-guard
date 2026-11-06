# Issue #81 — Historical priority regression: local Build contract

This is a **Central-owned source change** staged on a fresh implementation branch based on merged `main`, not on the evidence branch. It corrects the demonstrated S06 ranking inversion. It does **not** claim full Issue #81 acceptance, revise frozen targets, or authorize redesign of retrieval.

## Authority

- Repo: `fvanevski/opencode-operational-schema-guard`
- Working branch: `issue/81-relevance-priority`
- Source base: `b39e1ff7d950075273fc2dab7206c5f8a17add70`
- Staged source commit: **use the exact full SHA in the operator kickoff; independently check the remote branch ref**
- Evidence source: `docs/issue-78/evidence/81-corrective-evidence-v1/` at `0583808c0f94fe118484005def967cce9c1c5266`
- Frozen native acceptance: 8/16 FAIL (threshold 13/16); N02 FAIL_INJECTED; human precision UNVERIFIED.
- Primary: `build` (isolated host integration, validation, bounded evidence write, at most one PR).

## Mutation envelope

SOURCE_REMOTE_UPDATE=forbidden. SEMANTIC_REMEDIATION=forbidden. MECHANICAL_REMEDIATION=allowed for demonstrably semantics-preserving formatting of the two staged code/test files only. EVIDENCE_REMOTE_UPDATE=allowed. EVIDENCE_PACKET_REQUIRED=yes. EVIDENCE_ROOT=`docs/issue-78/evidence/81-relevance-priority-implementation-v1/`. REMOTE_UPDATE=one evidence-only commit allowed. PR_CREATE=at_most_one_draft_after_validation. MAIN_WRITE=forbidden. GRAPHITI_WRITE=forbidden. CONFIG_OR_SERVICE_CHANGE=forbidden. LIVE_PLUGIN_DEPLOYMENT=forbidden. FULL_NATIVE_ACCEPTANCE_RERUN=forbidden. NEW_MODEL_OR_GPU_TEST=forbidden. ISSUE_CLOSURE=forbidden. MERGE=forbidden.

### Required execution (one cohesive host campaign)

**A. Source admission and isolated environment**

1. Authenticate the repo origin, latest `main`, and exact remote working-branch SHA provided in the kickoff. Require that the staged source-commit parent is the exact source base above and the only Central source edit is the `HISTORICAL_STATEMENT` removal of standalone `then`. The new regression test and this contract are the other allowed staged files.
2. Materialize the remote commit in a *new* collision-safe disposable worktree/clone. Do not reset/rebase/clean/synchronize the operator's primary checkout. If the branch has moved, stop STALE and report its full SHA. Do not overwrite an occupied scratch path.
3. Confirm Node runtime, repository `package.json` scripts and current relevant AGENTS/validation/CI rules before tests. Record exact source-blob digests. No host plugin install in this pre-review step.

**B. Establish real regression and repository verification (CPU-only)**

4. In a separate disposable base snapshot, copy only the staged new regression test to the original candidate-relative test path and run `node --test docs/issue-75/v2-candidate/relevance-priority-regression.test.mjs`. Record a genuine expected RED failure for the S06 procedural-`then` assertion. Do not weaken tests or require all tests to fail; return the actual failure details.
5. At the authenticated candidate head, run:
   - `node --check docs/issue-75/v2-candidate/relevance.mjs`
   - `node --check docs/issue-75/v2-candidate/relevance-priority-regression.test.mjs`
   - `node --test docs/issue-75/v2-candidate/relevance-priority-regression.test.mjs docs/issue-75/v2-candidate/relevance.test.mjs docs/issue-75/v2-candidate/relevance-observation-replay.test.mjs`
   - `node --test docs/issue-75/v2-candidate/memory-core.test.mjs docs/issue-75/v2-candidate/plugin-behavior.test.mjs docs/issue-78/v2-candidate/association.test.mjs docs/issue-78/v2-candidate/candidate.test.mjs docs/issue-78/v2-candidate/long-prompt.test.mjs`
   - `npm run check` and `npm test`, if the currently authenticated package and runner make them applicable in this environment.
   Capture true exit statuses, test counts and bounded sanitized logs. The old retrospective replay is in-sample; do not claim it is an independent holdout.
6. If a deterministic test fails because the staged Central behavior is wrong, preserve the failure and return for Central correction. Only clearly mechanical formatting can be repaired locally; never adjust a semantic assertion, threshold, CI, production code logic or acceptance rule.

**C. Bounded host replay, no production change**

7. Reuse read-only `docs/issue-78/evidence/81-corrective-evidence-v1/` facts/traces and the *private* frozen prompts and Graphiti bindings if available. Execute the candidate `relevanceFilter` directly on the authenticated source-admitted candidate list from the previous 9-case evidence. Use the candidate code, **not** the installed production module. Preserve all source/episode bindings and candidate ordering. Report original vs candidate selections case-by-case, with every evidence class explicitly labeled.
8. Required positive: S06 selects the correct cutover proposition ahead of the procedural git-`then` distractor, if the current eligible candidate set matches the pinned replay. Check historical markers still work and scope/issue/numeric/named-term guards remain unaffected.
9. Required negative guard: with frozen N01/N03/N04 prompts, use the prior captured results if present or at most one live read-only `search_memory_facts` call per case against `development-knowledge`, subject to current permission and EX admission. Run candidate filtering (no model answer). No new unwanted injection for N01/N03/N04; S13 must remain abstention on the equivalent pinned graph snapshot, and N02 remains correctly grouped and scored against its **unchanged** frozen negative. Record graph drift if present instead of silently scoring a different snapshot as the old acceptance.
10. Do not run a new 20-case native OpenCode campaign or claim that offline replay is a fresh installed-client acceptance. If host read-only search is blocked, preserve the successful CPU gates and report the bounded replay as UNVERIFIED with exact reason.

**D. One evidence packet, optional one PR**

11. Stage sanitized evidence under `docs/issue-78/evidence/81-relevance-priority-implementation-v1/`, alongside this unchanged handoff: `handback.md`, `validation-results.json`, `candidate-replay.json`, `command-shape-friction.json`, `SHA256-MANIFEST.txt`. Include actual executable commands, base/candidate source identities and true RED/GREEN results; private prompt text, credentials and raw traces stay outside Git. Do not publish source-private data in code comments or evidence.
12. If gates pass, produce **at most one** additional evidence-only commit on this same branch, parent equal to the authenticated Central stage SHA, after checking all changed paths stay within the designated evidence folder (except an expressly permitted mechanical edit to the two staged files). Immediately before push recheck the exact remote branch head; push once, non-force; read back branch, parent, changed-file inventory and remote hashes through GitHub. Stop on stale/ambiguous mutation; never force or blind retry.
13. When the branch is validated and the evidence commit read back, create **at most one draft PR** from `issue/81-relevance-priority` to current `main`, linked to #81. Include S06 root cause/patch/test outcomes and explicit remaining Issue #81 gates. Reuse an existing matching PR if one appears; no duplicate. If a trusted exact-head Verify profile is configured, obtain its native exact-head receipt/check on the final PR head and report it, rather than rerunning a duplicate full suite. Do not request reviewer approval, Codex or merge in this local campaign.
14. For an unavailable PR-create or evidence-publication interface, return a verified exact-head branch and packet with the specific blocker instead of expanding into infrastructure repair.

### Handback requirements

Return `IMPLEMENTATION_RESULT=PASS|PARTIAL|FAIL|BLOCKED`; source base, Central stage SHA, final branch/PR full SHA, PR URL/state, exact branch freshness, RED baseline failure, GREEN candidate checks/test counts, nine-case candidate selection summary, N01/N03/N04 and S13 guard outcomes, candidate source file hashes, source/evidence write inventory, host changes (must be none), one verified GitHub evidence path/manifest, trusted Verify receipt or pending reason, residual Issue #81 acceptance items, and complete canonical `COMMAND_SHAPE_FRICTION` event fields (scenario, requested/effective shape, rewrite provenance, event kind/effect, correction, replacement, resource/recipe, contract conflict, durable-gap candidate, sensitive-value omission).

**Stop on substantive source/test defects, unsafe mutation, stale remote head, true privacy leakage, or authority/lease bypass requirement.** Do not stop for harmless path, JSONL, command-shape or test-workdir friction: fix locally within scope, annotate and continue. Preserve clean rollback by never touching installed production or Graphiti.

