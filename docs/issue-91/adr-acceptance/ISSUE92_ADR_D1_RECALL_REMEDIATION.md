# Issue #92 ADR D1 — atomic fact-first selection recovery

**Status:** Central-authored source correction, one exposed development comparison, no new prospective holdout.  
**Authority:** `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md`, Issue #92 and published `docs/issue-91/evidence/92-adr-causal-resolution/`.  
**Frozen original cohort:** exact private `/tmp/opencode/issue92-adr-qual/freeze.json`, SHA-256 `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f`; 24 clusters, 16 valuable and 11 nonvaluable target labels, one privacy control. All H2/H3/H4 and ADR prospective records stay immutable.
**Prior rejected source:** `a684667a6eefa2dc19f29755bed0c3048874721d`.  
**New corrected source:** `e303a67786fd96491cbdab36790b81442c4340c6`.  
**Historical base:** `c8eb5260f2b10832346234b1b5d0cf28302ffba8` (do not run as a third D1 arm).  
**Diagnostic scorer:** `docs/issue-91/adr-acceptance/adr-causal-audit.mjs`, now supports `issue92-adr-exposed-d1-comparison-v1` and pins the two model-tested source SHAs.

## Central source change and causal premise

The last independent, frozen two-trial acceptance retained **2/16** valuable targets in each candidate arm, while all **16/16** were model-visible. The host independently recovered raw decisions from native ReviewStore records: **14/16** valuable targets were SKIPped in each candidate trial, before extraction or validator evaluation, without a corresponding privacy/source/persistence failure. Only two explicitly framed durable user constraints survived. The older baseline retained useful knowledge more often; its replay through the current utility validator generated artifacts, not historical rejections.

Central changed **only** `modelPrompt(cluster)` plus focused static/validator regressions. The model is instructed to: (1) inspect every source excerpt for independently useful atomic findings **before** deciding whether a task/test session is transient, (2) assess each candidate's actual reusable value, source attribution and uncertainty, and (3) choose cluster EMIT when at least one safe durable fact exists. Nonvaluable transient counts, generic tasks, unsupported assistant assertions, repeats and superseded claims remain per-fact exclusions. The five durable utility categories, exact 25–450 source evidence, time/authority/privacy checks, one fact per episode, up-to-three facts per cluster, operator review, Graphiti source index, remote readback, no-replay and EX boundaries remain unchanged.

A user-reported defect is evidence of the **report**, not verification that its proposed root cause/fix is true. Keep reported/proposed temporal and source authority labels. Model-written `normalized_claim` stays `review_only_unverified` unless separately independently supported; never silently promote it.

## Qualification design

**CPU/source verification:** Verify current GitHub issue branch tip, fetch it before materializing the new candidate, validate parent/changed source and test blobs, run native Node focused tests (`curator.test.mjs`, `issue92-source-fact.test.mjs`, `adr-causal-audit.test.mjs`) plus `npm run check` and `npm test`. Do not claim native pass based on Central V8 smoke checks. Compare `validateModelDecision` and the actual `worker.mjs` blob between the failed and corrected source; their non-prompt semantics must be identical.

**One exposed matched development comparison:** Use **the same 24 native source clusters and independent target labels** from the existing frozen ADR cohort. No re-freeze, no new labels, no new holdout, and no original remote group reuse. Two arms only: `d1:previous` sourced at `a684667a...`, and `d1:corrected` sourced at `e303a677...`. Use newly allocated empty disposable review stores and Graphiti groups, the exact same known local `chat-fast` policy (temp 0, max_tokens 1600, response_format=json_object, timeout 90000) and an authenticated canonical post-exit EX-gated one-shot launcher. Both arms see identical original source opportunity identities, source content, cluster grouping and privacy controls. The only intended treatment is the revised system prompt. Model nondeterminism must be disclosed; do not claim deterministic replay or repeat calls to seek a favorable result.

**Private model decision proof:** Use `createPrivateTraceCurator(curateCluster,{directory,promptBuilder:modelPrompt})` from each arm's exact immutable worktree. Preserve mode-0600 raw model trace files, prompt/response hashes, private source handles, case-to-fact indexes and call-intent files; the wrapper writes call intent before model inference. If an arm/model write is ambiguous or a call intent is unfinished, stop instead of blindly replaying it. Do not infer EX admission from the environment marker alone.

**Read-only causal reconciliation:** For each of the 16 valuable frozen targets in each arm, independently determine whether its source was model-visible, what the **raw model** chose (SKIP, DEFER, EMIT), whether a fact preserving that original target was actually proposed, accepted by the *matching* validator, and persisted with an authentic terminal UUID, original-source support and independent ReviewStore/Graphiti MCP/raw FalkorDB/source-index proof. Keep unsupported/uncertain proposals and private source text out of public evidence. Include the 11 nonvaluable targets and the privacy-control opportunity in a separate negative-pollution matrix. Any model-written summary does not qualify as source proof.

The offline diagnostic input schema is `issue92-adr-exposed-d1-comparison-v1`, with:
- original freeze byte digest and immutable `source_commits` from that file;
- `comparison_sources.previous=a684667a6eefa2dc19f29755bed0c3048874721d` and `comparison_sources.corrected=e303a67786fd96491cbdab36790b81442c4340c6`;
- exactly two runs, `{trial:"d1",arm:"previous",source_sha:"a684..." }` and `{trial:"d1",arm:"corrected",source_sha:"e303..." }`;
- exactly 16 valuable target rows per run, with `cluster`, `model_visible`, `model_raw_content`, `model_reply_sha256`, independent `model_fact_indices`, `review_state`, `review_reason` and actual supported terminal receipts as shown in `adr-causal-audit.test.mjs`.

Run:
`node docs/issue-91/adr-acceptance/adr-causal-audit.mjs analyze <PRIVATE_ORIGINAL_FREEZE_JSON> <PRIVATE_D1_BUNDLE_JSON> > <SANITIZED_D1_CAUSAL_RESULT_JSON>`

The tool accepts only the exact two source SHAs and never confuses the H4 historical base with the d1 previous candidate. It is structural forensic evidence, **not** an independent semantic judge. Read the actual original source and real remote facts independently.

## Completion test and disposition

Compare previous vs corrected arms using a per-target table, not just total episode counts. Recalculate source-supported valuable selection/retention, useful precision, positive four-surface per-fact receipts, SKIP/DEFER reasons, model errors and source authority. The original 14/16 candidate SKIPs are the main development regression targets, not an automatically guaranteed 14/14 conversion.

The corrected source should show **material improvement in valid useful target retention**, with a credible path toward the prospective >=85% target, without low-value episode inflation, unsupported claims, wrong group, privacy leakage, duplicates or Graphiti ambiguity. Verify the two previously preserved targets remain eligible. Preserve the 11 transient/repetition and privacy negatives. If only SKIP wording changes and no useful supported facts persist, that is not an improvement.

If the correction remains highly suppressive, finish a complete, source-backed failure diagnosis in this same campaign; do not run repeated speculative inference or tune thresholds locally. Central will decide if a structural curator change is needed. A **successful exposed D1 is readiness to design one NEW prospective evaluation**, not Issue #92 acceptance and not permission to merge or deploy.

**Publication:** One sanitized evidence-only commit under `docs/issue-91/evidence/92-adr-d1-recall/`, CAS on the existing `work/91-memory-utility-r1` branch with exact-head readback. No PR/merge/issue close/production activation. No changes to original freeze/scorecard or historic graph groups. No credentials, raw model outputs, unredacted private messages or raw service logs in the repo.

**Required handback:** actual baseline/previous/corrected/scorer SHAs, changed blobs, native verification and failures, host EX/once-only execution evidence, matched source/policy hashes, original freeze identity, actual raw prompt/decision digest coverage, target-by-target first loss stages and independent support, 11 negative controls and privacy check, individual Graphiti UUID/index/remote receipts, model/CPU/GPU/queue/review workload, production unchanged, material improvement and risks, one evidence commit and readback, full GHDEV command-shape friction, and one bounded concrete next action. No third arm, independent holdout, local semantic source changes or extra campaign.
