# Issue #92 — B2 project-scoped semantic-family arbitration

**Status:** Central-staged development correction; native/model/Graphiti qualification pending.  
**Governing authority:** Issue #92; `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md`; `docs/issue-91/adr-acceptance/ISSUE92_POST_D3_ORDER_NEUTRAL_REPRESENTATIVES.md`.  
**Historical B1 result:** `docs/issue-91/evidence/92-b1-finite-batch/README.md` @ `e307b69f7884b797de17a40df77bf46d8ca4e844`; previous 2/16 useful and 2/11 nonvaluable; B1 finite-batch 8/16 source-supported useful targets, **11/11** nonvaluable repeated facts persisted. **B1 remains REMEDIATION_REQUIRED**.  
**B2 previous treatment:** `8a112799a7a42b47c5a044d21aa11ef8ebe21b59` (the exact original finite-batch implementation).  
**B2 corrected treatment:** `f51ca861c05f03bac2d86051a7bb339fe2fb5d05` (project-scope source change); later commits provide regressions only.  
**Original immutable exposed cohort:** frozen private `/tmp/opencode/issue92-adr-qual/freeze.json`, SHA-256 `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f`, 24 clusters, 16 valuable targets, 11 nonvaluable controls and one capture-excluded privacy source. No new holdout or retrospective label changes.

## Central correction and invariant

The published B1 plan contained 19 independently utility-accepted facts but **19 singleton arbitration calls** because `partitionKey()` required identical group, project AND workspace. Source examples from each per-run SWE-bench workspace therefore never met a same-family sibling, even when their technical predicates were redundant.

The corrected B2 implementation makes the comparison partition **exactly `[group, project]`**. Per-fact authorization still uses the full original native `group/project/workspace/source_ref/evidence_class/observed_at/temporal_status`; nothing is promoted with another source's workspace or project. The joint arbitration prompt states project-level comparison scope, omits a misleading first-candidate workspace authority, and includes each source workspace's digest for traceable distinct origins without publishing host paths. Cross-project candidates may never share one arbitration pool. Candidate identities, stable sort, model call-intents/results, frozen plan, 1-fact-per-episode, CAS, no replay, privacy exclusions, canonical EX and installed one-pass default are unchanged.

**This is a semantic comparison, not authorization to merge unrelated repositories or infer technical equivalence from shared keywords.** A legitimate identity-preserving group/project configuration is required. Family equivalence and representative quality remain LLM judgments requiring independent source adjudication. Do not automatically delete/supersede a previously persisted episode. Uncertain semantic families stay REVIEW/deferred.

## One consolidated Build qualification

### A. CPU-only source/native gate

Fetch the exact current B2 branch HEAD, compare it to the historical B1 source and the source patch `f51ca861...`; authenticate exact blobs, working tree status, governing ADR, original B1 evidence and this contract. Verify **only** `finite-batch.mjs` changes production-source semantics between treatment pins and no changes in `core.mjs`, `worker.mjs`, `fact-review.mjs`, queue, Graphiti client, model/model-policy, installed plugin or default curator. New `finite-batch.test.mjs` covers same-group/project cross-workspace arbitration, project isolation, uncertain-family REVIEW, arrival-order permutations and 19-candidate Sphinx/Django family behavior.

Run each producer independently, preserving exit codes:

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

Root `npm test` is NOT the issue-78 focused test suite. Central verified source syntax and source invariants but **has not executed native Node tests**. Fix genuinely mechanical host/fixture issues; do not weaken source, authority, no-replay or tests to force success. A substantive source defect is a blocker requiring exact Central evidence. Do not run a model campaign after a red native gate.

### B. One matched original-exposed B2 run (GPU and Graphiti only with real post-exit EX)

Stage the exact original 24 source clusters and labels into **two new empty disposable** ReviewStore roots and Graphiti groups. Both arms use the two-stage finite-batch architecture, the exact same native source context, the same `chat-fast` model profile (temperature 0, max_tokens 1600, JSON object and 90s timeout) and the same admission/recovery protocol. The only intended source treatment is **same-project cross-workspace arbitration**.

Before launching, verify using native source records that the relevant Sphinx/Django sibling sources share the same authenticated `group+project` but have different `workspace`. If that is not true, **do not fake/rewire identities**, return the discrepancy to Central. Count expected accepted candidates/pools from source once model results are recorded; an unexpected singleton-only corrected arm is a specific review finding.

Use canonical EX flock held through model, Graphiti terminal readback and reconcile. Real harness exit, quiet grace, scheduler idle, production-drain serialization, eligibility and lease are required. The environment token alone is not admission. Prepare one exactly-once post-exit launcher and exit the interactive OpenCode session before any model inference or remote Graphiti write. Do not reuse/delete original B1, D1/D2/D3 or production groups.

B2 previous arm uses `runAdmittedFiniteBatch` from `8a112799...`; B2 corrected arm uses the same function from `f51ca861...`, both `--finite-batch on --max-clusters 24 --max-candidates 48`. No third arm. Preserve every 0700/0600 private snapshot, model-call intent/result, source index and frozen plan. A model-call intent lacking a result is UNKNOWN and non-replayable. A remote write with `submission_unknown` requires positive reconciliation, not blind replay. Exactly one model attempt per call; no repeated favorable-output sweeps.

### C. Independent source/adjudication, graph proof and scorecard

The historical `adr-causal-audit.mjs` D1/D2/D3 source pins are **not** a B2 scorer. Build one sanitized B2 scorecard from authenticated private source, per-stage model evidence and actual remote receipts. Report the old/corrected arm's canonical `[group,project]` opportunities and the actual different-workspace source identities, all 16 valuable target selections, 11 nonvaluable repetitive meanings, exact source-quote support, first loss stage, independent utility/review decisions and **joint family** partitions including representative and alternate reasons. Show source-supported retention rather than merely model EMIT or episode counts. Detect siblings that are thematically similar but state distinct constraints and must not merge.

For every persisted fact, independently verify actual ReviewStore `remote_episode_uuid`, Graphiti MCP `get_episodes({group_ids:[...],max_episodes:...})`, raw FalkorDB `Episodic` UUID/content and the ReviewStore/episode-index source binding. **Do not invent `Source` graph nodes:** B1 proved this deployment has zero `Source` nodes, even in production, and the source index lives in local ReviewStore. Zero Model errors, no wrong-group mutation, exact source authority and capture-ineligible privacy control absence must be verified, not assumed.

Assess whether B2 reduces 11/11 nonvaluable persistence and removes vacuous 19-singleton arbitration while retaining/improving B1's independently supported 8/16. Explicitly report any regression of valuable facts caused by an overbroad family equivalence judgment. Also report the still-outstanding discovery/utility losses (g1/g2/g3/g4/sp1), which this source correction does NOT claim to fix. Model temperature zero is not deterministic; no score is inferred from historical B1 as if it were a matched identical run.

Model and Graphiti work is already budgeted in this one assignment. Collect model calls/tokens/latency, family count, distinct-source workspace count, operator DEFER backlog, raw response digest completeness, plan/crash/no-replay and production before/after. Do not perform a new holdout or another unplanned run.

### D. Disposition and publication

- `READY_FOR_NEXT_CENTRAL_CORRECTION`: source-supported value retention remains meaningful and duplicate pollution is materially reduced by genuine same-project family comparison; hard boundaries intact. This **does not** mean Issue #92 prospective acceptance, since 8/16 historical useful retention is below the eventual prospective >=85% target and several nonduplication false negatives remain.
- `REMEDIATION_REQUIRED`: comparison remains vacuous, low-value families persist excessively, valuable representatives are displaced by weak siblings, or unrelated predicates collapse; report the exact first-loss mechanism and minimal Central correction.
- `BLOCKED`: native gate, verified EX, source identity, model-call no-replay or remote submission ambiguity prevents valid execution.

Publish exactly **one sanitized evidence-only** commit under `docs/issue-91/evidence/92-b2-project-arbitration/` on the existing branch, exact-head non-force CAS + remote readback. No source semantic changes, PR, merge, production activation, issue close, new holdout, extra unplanned campaign or destructive Graphiti cleanup.

Typed final handback: `ISSUE92_B2_RESULT`, exact starting/ending/old/new source SHAs and implementation blob comparison, native producer exits, original freeze SHA, real EX proof, private call-intent/result counts, project/workspace partition evidence, per-family selected/deferred identities with independent source review, 16 valuable and 11 negative target outcomes, privacy/scope/authority, Graphiti UUID/index/MCP/FalkorDB readback, production unchanged, model/reviewer costs, one evidence commit/ref readback, one supported next Central patch decision, and full canonical GHDEV `COMMAND_SHAPE_FRICTION`. Keep the contract's source-derived vocabulary: evidence class, source_ref, workspace, utility, family and terminal UUID.
