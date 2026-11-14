# Issue #92 — B3 specificity counter-review for cross-workspace development facts

**Disposition:** Central-staged development-only source and regressions; host execution **UNVERIFIED**, not qualified or production-authorized.
**Authority:** Issue #92, `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md`, `docs/issue-91/adr-acceptance/ISSUE92_POST_D3_ORDER_NEUTRAL_REPRESENTATIVES.md`.
**Branch:** `work/91-memory-utility-r1`.
**Previous B2 treatment:** `f51ca861c05f03bac2d86051a7bb339fe2fb5d05` (project-scope family arbitration, no specificity counter-review).
**B3 source treatment:** `672cd08fd05db092ff919ec7b247339d094b62b1` (family-specific counter-review implementation; subsequent commits modify tests/docs only).
**Historical evidence:** B2 `docs/issue-91/evidence/92-b2-project-arbitration/README.md` @ `22e902d730b27437d6d1ded341c230efa4207521`. D1/D2/D3/B1/B2 scores remain immutable.
**Exposed source identities:** original 24 eligible native events, 16 independently valuable targets, 11 nonvaluable duplicate/repetition controls, 1 capture-ineligible privacy control. Historical private freeze digest: `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f`. **Important provenance limitation:** the original private `freeze.json` bytes were lost across a reboot before B2; the B2 cohort was reconstructed from native `opencode.db` records, with original source/label correspondence independently compared where available. Do NOT assert a newly reconstructed file has the historical SHA-256 unless it actually does. Explicitly report `ORIGINAL_FREEZE_BYTES_UNAVAILABLE`, reconstruction identity proof, and remaining uncertainty.

## B2 first-loss mechanism and required B3 improvement

B2 successfully removed the structurally vacuous 17 singleton pools: the corrected source formed three same-project, cross-workspace arbitration pools of 8, 8, and 3 accepted facts. It reduced known nonvaluable persistence from 11/11 to 0/11. But the single semantic arbiter collapsed technically distinct Sphinx, Django and Pylint variants as `alternative_equivalent_fact`, reducing independently supported valuable-target retention from the prior B1 8/16 to B2 5/16. Six graphiti-mcp targets were still missed before arbitration at discovery/utility. **The task is to restore distinct source-supported constraints without reopening the 11 repeated facts; it is not a request to force >=85% by prompt selection or count multiple copies of one underlying claim as different.**

## Central implementation staged

Only `docs/issue-78/v2-curator/finite-batch.mjs` has altered production-path semantics since B2. `finite-batch.test.mjs` adds regressions and incorporates the previously host-proven mechanical cross-project fixture correction (`model({distinct:true})`).

1. `representativePrompt` continues project-scoped high-recall joint arbitration; `validateRepresentativeFamilies` now exposes the original source-identity-bound family membership/representative for further checks, without changing its existing exact-index/complete-partition protection.
2. For a **high-certainty multi-member provisional family**, `runAdmittedFiniteBatch` invokes **one additional independent specificity model call**, after source discovery and independently accepted utility, **before** plan/ReviewStore/Graphiti writes. The specificity reviewer is told not to assume the preliminary equivalence label is true; it examines individual source quotes for additional format, mode, flag, condition, negative case or interface differences. It can split a broad initial family into multiple genuinely distinct technical-predicate families. A singleton or initially uncertain family does not incur the extra call; uncertain candidates stay operator-reviewable.
3. `validateSpecificityFamilies` requires a complete non-overlapping identity-bounded partition, exactly one representative per refined high-certainty subfamily, an **exact contiguous 15..220-character source quote** for each selected representative, and a substantive 16..200-character explanation for every claimed equivalent alternate. This verifies source quote identity and output shape; it is **NOT deterministic semantic entailment verification**. Source claims/temporal class/authorization still come only from the existing exact-span validator. A bad or missing specificity response fails before any ReviewStore materialization/Graphiti write and cannot be rerun if an earlier model-call intent had ambiguous outcome.
4. The entire refined family decision, exact source-linked candidate IDs, response digests, selected representatives, deferred alternates and model-call intents remain inside the existing private write-once batch plan. The same `promoteOne`, remote UUID source binding, CAS, unknown-submission nonreplay, canonical post-exit EX and 1-fact-per-episode semantics apply. Normal installed one-pass curator, interactive capture, model policy, Graphiti schema and production groups remain unchanged.
5. This is a **development-only** semantic comparison; the second reviewer is the same local model with a distinct task-specific prompt, not an independent factual oracle. Arbitrator and specificity verdicts must undergo source-backed operator adjudication during this B3 campaign. If two claims differ merely lexically, do not give separate acceptance credit. If they differ in genuine supported behavior but the reviewer wrongly collapses them, record `OVER_EQUIVALENCE` and stop at `REMEDIATION_REQUIRED`.

## One consolidated local Build task

### A. Exact identity and native regression gate (CPU)

Fetch branch first, authenticate the **full** B3 starting HEAD supplied in the kickoff, all source SHAs, `finite-batch.mjs` blob at B3 source vs current HEAD, and known old B2 source. Read current issue/ADR, AGENTS.md, relevant GHDEV-00/01/02/03/08/10, B2 evidence, and this contract. Verify that B3 does **not** modify `core.mjs`, `worker.mjs`, `fact-review.mjs`, `model.mjs`, `model-policy.mjs`, `queue.mjs`, Graphiti clients or installed production. This source change is explicitly opt-in via existing `--finite-batch on`.

Run independently, preserve **producer** exit codes and complete failure context:

```bash
node --check docs/issue-78/v2-curator/finite-batch.mjs
node --check docs/issue-78/v2-curator/finite-batch.test.mjs
node --check docs/issue-78/v2-curator/curator-cli.mjs
node --check docs/issue-78/v2-curator/fact-review.mjs
node --check docs/issue-78/v2-curator/worker.mjs

node --test docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/fact-review.test.mjs
node --test docs/issue-78/v2-curator/curator.test.mjs
node --test docs/issue-78/v2-curator/issue92-source-fact.test.mjs
node --test docs/issue-91/adr-acceptance/adr-causal-audit.test.mjs

npm run check
npm test
```

The root `npm test` does not cover the issue-78 focused tests. Central completed V8 syntax/pure-validator smoke checks, **not native Node execution**. Independently confirm test meaningfulness, including the new 25-case finite-batch suite, 19-workspace grouping, supported specificity quote, multi-representative result, uncertain-case deferral and ambiguous specificity no-replay. Fix ordinary mechanical host/fixture/import issues without weakening tests; a reproduced substantive source defect is `BLOCKED_SOURCE_DEFECT`. Do not silently run the campaign on locally changed treatment source, or use modified scorecard pins.

### B. Cohort and EX preflight (CPU, then GPU only post-exit)

Recover the same **native** 24-source, 16 valuable, 11 nonvaluable and ineligible privacy-control targets used in B2, including distinct original group/project/workspace and source strength. Authenticate against native `opencode.db` records and published B1/B2 source-ref digests. Preserve unverified aspects of the historically lost private freeze byte; record reconstruction method and any mismatches. Do not invent a new cohort or rewrite original labels/denominators.

Prepare exactly two **fresh empty** disposable source worktrees, ReviewStore roots and Graphiti groups:
- `b3:previous` = original B2 corrected finite-batch SHA `f51ca861c05f03bac2d86051a7bb339fe2fb5d05`;
- `b3:specificity` = B3 source SHA `672cd08fd05db092ff919ec7b247339d094b62b1`.

Both arms use the same original native events and unchanged `chat-fast` model temperature 0, JSON object, max_tokens 1600 and 90s timeout. No extra model/backend, third arm or ad-hoc seed tuning.

Run the existing canonical **post-exit EX** controller: real interactive-harness exit, eligible process classifier (persistent `serve --service` helper exempt), quiet grace, scheduler idle, serialization with production drain, actual canonical `flock`, retained admission through model execution AND terminal reconciliation. An env token alone is not admission. Avoid the previous 3600s harness-wait failure by preparing the detached launcher before terminating the session, then completing the real harness exit; do not weaken the actual exclusivity or extend timeouts without a grounded need. One attempt per source/model call; durable 0700/0600 snapshot, call intent/result, plan, ReviewStore and Graphiti evidence preserved. A model call with intent but no result is UNKNOWN and **must not be replayed**. Remote `submission_unknown` needs positive UUID/episode reconciliation, not blind replay. No destructive Graphiti cleanup.

### C. One matched B3 EX campaign (GPU/model/Graphiti)

Both arms must run `--finite-batch on --max-clusters 24 --max-candidates 48` in their correctly pinned disposable worktrees. Original B2 arm uses the old joint family arbiter only; B3 arm uses the same arbiter **plus specificity counter-review for every accepted multi-member family**. Capture the real shape and semantic result of every provisional family and refined subfamily. Explicitly report number of specificity calls, members reviewed, quoted representative evidence, alternative explanations, and model-call unknown/error outcomes.

No favorable-output rerun, speculative next arm, or H2/H3/H4/D1/D2/D3/B1/B2 remote group reuse. If a native source or accepted safety check fails, return a typed blocker. An independent pure read-only post-exit diagnostic after the complete campaign is permitted; it does not authorize repeating model inference.

### D. Independent scoring, usefulness and safety (CPU/read-only)

Use original native evidence to judge each of the **16 independently valuable targets** and **11 nonvaluable controls** in EACH arm, not only persisted episode count. Distinguish discovery not proposed, wrong-source-span, independent utility DEFER, original joint equivalence, specificity-revised distinct/equivalent/uncertain, operator-approved review state, terminal supported fact and duplicate/unsupported persistence. Report each regressed B2 variant specifically: `sphinx_ascii_rst_header_rows`, `django_add_filter_lazy_string_variant`, `pylint_6386_verbose_flag_negative`, `pylint_verbose_v_arg_expected`; check that lexical rephrasings are not counted as separate valuable facts. Record g1-g4 historical misses separately as discovery/utility, not arbitration.

For every persisted episode, verify real UUID and content through ReviewStore `remote_episode_uuid`, episode index/source_ref, Graphiti MCP `get_episodes(group_ids:[...],max_episodes:...)`, and raw FalkorDB `Episodic` node. Do NOT invent Graphiti `Source` nodes (historically absent). Verify source class/temporal uncertainty/scope and original workspace; rejected privacy control absent from staged queue, model inputs and graph. Production and historical groups must not be written by B3; active production drain may change its own episode count, so distinguish external production activity from B3 mutations using group/UUID/time, not absolute count invariance alone.

Inspect the frozen plan `families[].provisional`, `families[].refinements[]`, selected/deferred sets and private response digests for coherence. Count which actual duplicate siblings were suppressed, which distinct variants gained, and any over-splitting duplicates that reenter graph. Model temperature 0 is not guaranteed deterministic, so compare this one matched B3 execution and retain B2 published numbers only as historical reference. No proprietary corpus or broader tool modernization campaigns.

### E. Disposition and one evidence-only publication

Return `READY_FOR_NEXT_CENTRAL_CORRECTION` only if the B3 source preserves material B2 duplicate reduction while recovering independently valuable distinct variants, without new hard safety or grounding regressions. This is **not** prospective acceptance; g1-g4 discovery/utility false negatives still require Central work. Use `REMEDIATION_REQUIRED` if B3 still collapses unique constraints, reintroduces material duplicate pollution, or otherwise fails source-supported retention. Use `BLOCKED` for native test/source/EX/no-replay/terminal ambiguity preventing valid execution. Do not retroactively weaken the acceptance target or count duplicate spellings as useful.

Publish exactly **one sanitized evidence-only** final commit under `docs/issue-91/evidence/92-b3-specificity/` to existing branch, with exact-head non-force CAS and independent ref/commit/blob readback. Keep raw source, prompts, private model traces, host paths, model auth and service logs out of public evidence. No source semantic updates, PR, merge, issue close, production activation, fresh prospective holdout or second campaign.

**Typed handback:** `ISSUE92_B3_RESULT`, full starting/final/treatment SHAs and source blobs, native producer exits, original freeze-byte availability/reconstruction source identity, EX admission receipts, model calls/tokens/errors and exactly-once private intent/result counts, provisional/refined family partitions (per-variant source-backed supporting quotes/claimed differences), 16 valuable + 11 nonvaluable outcomes and first-loss stages, protected scope/privacy/temporal class, four-surface UUID/source-index proof, deferred review burden, unknown/no-replay recovery, production/historical groups' mutation provenance, sanitized CAS evidence commit/readback, one bounded next Central correction, and complete GHDEV `COMMAND_SHAPE_FRICTION`. Report submitted/effective command forms, guard/harness rewrites and actual producer exits without hiding failures. One consolidated assignment; do not split ordinary host mechanics into micro-handoffs.
