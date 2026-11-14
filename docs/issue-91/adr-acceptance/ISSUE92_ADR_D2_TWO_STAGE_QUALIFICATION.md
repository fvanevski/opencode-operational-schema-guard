# Issue #92 — D2 two-stage fact discovery and novelty review: one exposed integration campaign

**Status:** Central-staged implementation/qualification, NOT production authority or prospective PASS.  
**Governing ADR:** `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md`.  
**Historical source baseline:** `c8eb5260f2b10832346234b1b5d0cf28302ffba8` (historical reference only).  
**D2 previous arm:** `e303a67786fd96491cbdab36790b81442c4340c6` (D1 fact-first prompt, one-pass curator).  
**D2 two-stage arm:** `50db627850c28f2ce31a68f547f91f51ee3e43b0` (new opt-in two-stage source; source bytes remain identical at later scoring HEAD).  
**Source cohort:** EXACT original 24-cluster, 27-target exposed ADR freeze, 16 independently valuable and 11 nonvaluable, one privacy control. Private `/tmp/opencode/issue92-adr-qual/freeze.json` SHA-256 `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f`. The cohort is **development evidence only**, not H5 or a new independent holdout.  
**Scoring:** `docs/issue-91/adr-acceptance/adr-causal-audit.mjs` with `issue92-adr-exposed-d2-comparison-v1`; independent source adjudication remains mandatory.

## Authority and failure mechanism

D1 was a **failed** exposed development result: 2/16 valuable retained for both previous and corrected arms; the corrected arm SKIPped 8/16, selected six valuable-target source passages that did not actually support the target and persisted 8/11 nonvaluable repetitions. All 17 Graphiti writes had valid distinct terminal episode receipts; this was selection/grounding relevance/pollution, not Graphiti storage identity. Do not reinterpret the D1 result as a PASS.

The approved Graphiti role is persistent, contextualized **development knowledge** alongside OpenViking's session/experience/resource continuity. High-recall capture must never become a keyword-template gate; automatic persistence must still require a source-supported, useful, nonrepeated atomic assertion. A raw exact quote is evidence of *what was stated*, not proof of technical correctness, actual value, or novelty.

## Central implementation staged

- `factDiscoveryPrompt` asks the first model pass only to propose 0..3 exact source-anchored potentially useful passages, without requiring an early durable-utility judgment or classifying the whole cluster as transient.
- `validateFactDiscovery` uses the existing `validateModelDecision` and preserves all original-source/offset/25..450/scope/temporal/privacy constraints. A provisional internal utility class exists **only** to satisfy the source validator; it never independently authorizes persistence.
- `factReviewPrompt` uses a separate model call to review the **exact quoted assertion itself**, compare prior same-group review/graph candidates, and assign a final independently proposed durable utility class. Unsubstantiated boilerplate, uncertain source meaning, generic transient text and potential semantic duplicates return `REVIEW`, not automatic Graphiti EMIT. It is an AI utility judgment, not definitive semantic proof.
- The worker only persists independently ACCEPTed, source-validated facts; individual REVIEW facts remain in private ReviewStore review-only notes (when an eligible sibling is accepted) or a deferred source record. One fact per episode and bounded 1..3 facts/cluster remain unchanged.
- `curator-cli.mjs drain ... --fact-review on` explicitly opts into the new path; existing installed production callers remain on one-pass behavior by default. No on-demand interactive model call, Graphiti write, ontology migration or new daemon.
- New focused tests: `docs/issue-78/v2-curator/fact-review.test.mjs`; D2 source-pinned audit and private second-model trace tests under `docs/issue-91/adr-acceptance/`.

## One comprehensive local Build qualification

**A. Native verification (CPU)**

Fetch branch HEAD before materializing new commits locally; prove current ref, D2 source SHA, previous source SHA, file/blob differences, and original freeze hash. Read AGENTS.md/current GHDEV contracts and all implementation/tests above. Run:

```bash
node --check docs/issue-78/v2-curator/fact-review.mjs
node --check docs/issue-78/v2-curator/model.mjs
node --check docs/issue-78/v2-curator/worker.mjs
node --check docs/issue-78/v2-curator/curator-cli.mjs
node --check docs/issue-91/adr-acceptance/adr-causal-audit.mjs
node --check docs/issue-91/adr-acceptance/adr-private-trace.mjs
node --test docs/issue-78/v2-curator/fact-review.test.mjs
node --test docs/issue-78/v2-curator/curator.test.mjs
node --test docs/issue-78/v2-curator/issue92-source-fact.test.mjs
node --test docs/issue-91/adr-acceptance/adr-causal-audit.test.mjs
npm run check
npm test
```

Central has run **only isolated V8 smoke checks**, not native Node tests. Record actual exits/complete failures. Repair routine host/test shape and genuinely mechanical changes only. For any acceptance-bearing source/validator/screen bug, return the exact failure, minimal Central patch proposal and independent evidence. Do not bypass tests/EX/privacy to go green.

**B. Pre-execution source and plan (CPU)**

Prepare two immutable source worktrees `d2:previous` and `d2:two_stage`. Use exactly the previous frozen corpus, same raw native events and privacy control, same grouping, two fresh initially empty disposable ReviewStore roots and Graphiti groups, `chat-fast` temperature 0 / max_tokens 1600 / json_object / timeout 90s, source/clock scope and same context. Never reuse historical groups or replace frozen target labels. Confirm every nonvaluable source, existing controls and original exposure class.

Use the existing accepted canonical EX post-exit controller, not a new inference gate. Lock, interactive harness exit, quiet grace, scheduler-idle and exclusive process class must be proven before one-shot execution. Keep the lock across all Graphiti terminal reconciliation. A lease env token alone is insufficient. No inference/writes while OpenCode interactive. Restore/validate normal scheduler service posture as previously qualified.

**C. Exactly one two-arm development execution (GPU/Graphiti)**

D2 previous arm uses one-pass `runAdmitted` from `e303a677...`, with `factReview=false`. D2 two-stage arm uses `runAdmitted` from `50db627...`, with `factReview=true`; use the same genuine `curateCluster` and source-correct `factDiscoveryPrompt` under the EX lease.

For private exact-model forensics use:

```js
import {createPrivateTraceCurator,createPrivateMessageTraceCall}
  from '.../adr-acceptance/adr-private-trace.mjs';

// previous arm (one pass):
const tracedPrevious=createPrivateTraceCurator(previousCurateCluster,{
  directory:PRIVATE_PREVIOUS_TRACE_DIR,promptBuilder:previousModelPrompt
});

// two-stage arm (distinct first/second raw responses):
const tracedDiscovery=createPrivateTraceCurator(twoStageCurateCluster,{
  directory:PRIVATE_DISCOVERY_TRACE_DIR,promptBuilder:factDiscoveryPrompt
});
const tracedReviewer=createPrivateMessageTraceCall(twoStageCurateCluster,{
  directory:PRIVATE_REVIEW_TRACE_DIR
});
await runAdmittedFromTwoStageSource({
  ...verifiedDisposableHostArguments,
  curate:tracedDiscovery,factReview:true,factReviewModelCall:tracedReviewer
});
```

The actual options must be sourced from current host contracts. Tracers must not be attached to production. They write private 0600 raw response and call-intent files keyed by cluster ID; if a call-intent exists without response, DO NOT repeat the model call. All real inference is exclusively after interactive harness exit. If one-shot code needs a helper, confine it to the private disposable run root; no production agent/CLI modifications.

Reconcile each source/ReviewStore/Graphiti/FalkorDB episode using four surfaces and real UUIDs. An `add_memory` ACK is not proof of terminal persistence. No blind retries on unknown submission. Service recovery is allowed within existing disposable groups when safe and source-backed, not through resets of production/historic groups.

**D. Independent adjudication (CPU, read-only)**

For each of 16 valuable targets per arm, independently inspect original native source and actual model input. For the new two-stage arm, distinguish: source missing; discovery no candidate; candidate offset/source validator rejection; proposed fact not related to frozen target; independent reviewer REVIEW/defer; reviewer accepts a source-supported target; per-fact CAS/remote terminal failure; actual original-source target retained. Check semantic content of **the cited span itself**, not nearby cluster boilerplate or model gloss. A source-stated defect is not a verified fix.

For each of 11 nonvaluable target controls, report whether its exact meaning persisted, even under different wording; cross-cluster duplicate and within-arm repetition counts separately. The ineligible privacy control must be absent from model input. Verify mixed-cluster independence, source authority, no unsupported normalized claim promotion, and no cross-group reads/writes. Treat reviewer "ACCEPT" as a model judgment requiring independent blinded source verification, not a substitute for it.

D2 bundle schema `issue92-adr-exposed-d2-comparison-v1` uses the original private freeze digest and original source commits, with exact additional `comparison_sources.previous=e303a677...` and `comparison_sources.two_stage=50db627...`. Two runs only `trial:"d2",arm:"previous"|"two_stage"`. Previous rows use legacy `model_raw_content` and its digest. Two-stage rows use **both** `discovery_raw_content`+`discovery_reply_sha256` and, where candidates exist, `review_raw_content`+`review_reply_sha256`, plus independently source-reviewed `model_fact_indices`, actual cluster, model visibility, review/remote data. See the **native** audit tests for shape. The D2 source classification authenticates both stages before retention credit.

Run:

`node docs/issue-91/adr-acceptance/adr-causal-audit.mjs analyze <PRIVATE_ORIGINAL_FREEZE_JSON> <PRIVATE_D2_BUNDLE_JSON> > <PRIVATE_SANITIZED_D2_RESULT_JSON>`

This is a structural classifier and cannot itself prove semantic support or original-source truth. Do not mislabel an unsupported but persisted episode as a missing remote write; maintain a separate adjudication row and terminal UUID for each persisted non-target quote. No H2/H3/H4/D1 scorecard rewriting or old group replay.

**E. Decision/closure**

This is a one-time **exposed development** comparison, not a fresh prospective acceptance. Score meaningful valuable-target recall (historical D1 corrected was 2/16), discovered candidate targets, semantic-support acceptance, actual terminal retention, missed baseline-useful targets, nonvaluable persistence (D1 corrected 8/11), distinct cross-cluster duplicate families, Wilson/uncertainty, model call count, queue/Graphiti workload, and operator-review volume. A fall in low-value persistence alone is not enough if 16 valuable targets still disappear. A larger number of model EMITs alone is not success. Do not set a rigid new retrospective percentage and do not pick a favorable repeated run.

If the two-stage candidate shows a material, source-supported retention increase and large reduction in unsupported/duplicate persistence with no hard safety regressions, return `READY_FOR_NEW_PROSPECTIVE_DESIGN`; Central then designs one genuinely untouched independent qualification and eventual single PR. Otherwise return `REMEDIATION_REQUIRED`, with a precise source-based first-loss matrix and the minimal remaining blocking correction, **without running another speculative campaign**.

**F. Evidence publication and handback**

Publish exactly one sanitized evidence-only final commit under `docs/issue-91/evidence/92-adr-d2-two-stage/` to existing `work/91-memory-utility-r1`, exact-head non-force CAS and remote readback. No source remote updates, new PR, merge, issue close, production activation, fresh cohort, force push, or destructive Graphiti operations. Keep raw source and both model responses private at mode 0600. Return full typed result and the published packet: starting/final GitHub source SHA, native test exits, original freeze hash, model settings/EX evidence, per-arm original-source and candidate/review trace coverage, 16-target first-loss/retention matrix, 11 nonvaluable/privacy controls, duplicate families, actual UUID/remote proof, per-fact authority, reviewer workload and resource usage, production unchanged, evidence commit, central blocker/no-blocker and one concrete next step. Include full GHDEV `COMMAND_SHAPE_FRICTION` observations and producer exits. Do not create a second handoff for ordinary host repairs or post-exit readback continuity.
