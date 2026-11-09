# Issue #92 — ADR exposed-cohort first-loss resolution

**Status:** Central-owned diagnostic implementation and one cohesive local host-evidence qualification. **Not** an implementation acceptance or approval to alter production.  
**Authority:** `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md`, current #92; immutable prospective result at `94cb32364e2115502f5bdde00b46735ac7bb112c`.  
**Original baseline:** `c8eb5260f2b10832346234b1b5d0cf28302ffba8`.  
**Failed candidate:** `a684667a6eefa2dc19f29755bed0c3048874721d`.  
**Frozen cohort:** private original `/tmp/opencode/issue92-adr-qual/freeze.json` (find via existing host campaign root, never reconstruct it from summaries); SHA-256 `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f`.  
**Original result:** each candidate trial retained only 2 of 16 independently valuable targets (12.5%), baseline 8/16 and 5/16; all 16 recorded as "discovered" in both trials without a published source-bound model-proposal mapping. `INSUFFICIENT_SAMPLE` is the scorer precedence result, **not** a waiver of the definite selection/retention/preservation FAIL gates.

## Scope and hypothesis discipline

Work only on the **24-cluster already-revealed ADR prospective cohort** and its 16 independently ratified valuable targets (plus bounded existing transient/privacy negatives). The cohort is now **development data**. Do not change the frozen labels, historical scorecards, source identity, or original remote groups. Do not interpret 22 model SKIPs as proof that 22 raw sources are transient: the pre-output ratification independently identified valuable knowledge in the corpus.

Central stages two small diagnostic tools under `docs/issue-91/adr-acceptance/`:

- `adr-causal-audit.mjs`: pure, offline, source-bound first-loss classifier. It **replays** `validateModelDecision` from the source implementation, checks actual source refs/cluster input, requires independent reviewer fact-target indices, validates raw model-response and freeze-file digests and independently verified real UUID/receipt mappings. Emits only sanitized target IDs, decision stages, reason codes and hashes. It never infers model recognition from the earlier scorecard's `discovered=true`.
- `adr-private-trace.mjs`: optional **disposable** wrapped curator callback for one **EX-admitted** paired development replay if original raw model replies are absent. The caller must supply the **actual arm-specific `modelPrompt` function**, its real `curateCluster` function, and a private absolute output directory. The wrapper writes a mode-0600 irrevocable call intent **before** each model call and mode-0600 raw response afterward; the intent blocks an accidental second call after interruption. It does **not** acquire or bypass admission and is never wired into installed production.

Native tests for these interfaces are in `adr-causal-audit.test.mjs`.

## Step 1 — Verify original host and source records (CPU/read-only)

Use the previous freeze file and raw original `opencode.db` native source, not just pre-captured candidate queue data. Inspect the actual prior four-arm ReviewStore entries, queue/source indexes, post-exit statuses and available private raw model responses, along with the immutable public two-trial scorecard.

Construct a **target-by-trial-by-arm ledger** covering all 16 valuable targets and both matched trials, with the independent 27-target frozen inventory preserved. For each target distinguish:

1. raw native opportunity and original evidence strength;
2. capture and actual model input visibility;
3. model's observed raw `SKIP`, `DEFER`, `EMIT` (or **raw response unavailable**);
4. target-specific model fact proposal, if any (private raw fact index plus independently reviewed exact original-source support);
5. deterministic validator acceptance/rejection and exact safe reason;
6. individual ReviewStore/Graphiti state, actual remote membership and target-supported retention;
7. first **observed** loss stage and outstanding epistemic uncertainty.

A model reason that sounds like it may have noticed a useful fact is *not* independent proof of a proposed or discovered claim. A raw SKIP proves a SKIP decision, not that the underlying source is transient. A missing raw response remains `RAW_MODEL_UNAVAILABLE` rather than being guessed from `discovered=true`. Do not turn a review-record state into a fabricated raw model transcript.

Run the new offline CLI:

`node docs/issue-91/adr-acceptance/adr-causal-audit.mjs analyze <PRIVATE_ORIGINAL_FREEZE_JSON> <PRIVATE_CAUSAL_BUNDLE_JSON> > <PRIVATE_SANITIZED_RESULT_JSON>`

The causality input is `issue92-adr-exposed-causal-audit-v1`, with the shape illustrated by `adr-causal-audit.test.mjs`. Each included row has a frozen `target_id`, the actual exact `cluster` object, source visibility, raw JSON response if present, the SHA-256 of that raw response, a separately reviewed `model_fact_indices` list when a proposal supports that target, an actual review state/reason, and real terminal UUIDs/proof when applicable. The input must bind to the SHA-256 of the **exact original private freeze bytes**. No private source text or raw model reply is printed by the resulting diagnostic report.

If old model response data are unavailable, the tool deliberately returns `RAW_MODEL_UNAVAILABLE`. This is an evidence limitation, not a failure that authorizes inventing earlier model thoughts.

## Step 2 — One bounded exposed diagnostic replay if necessary

Only when the original four-arm raw decisions cannot adequately identify the first loss stage, perform **one** controlled matched **development** comparison of the same 24 exposed clusters (baseline and failed candidate), using new empty disposable review stores and Graphiti groups, the frozen `chat-fast` policy and the existing native EX gate. This is **not** an H5, a new holdout, or a replacement for the original t1/t2 outcome.

Use the staged private trace wrapper around the arm's exact imported curator:

```js
const observedCurate = createPrivateTraceCurator(curateCluster, {
  directory: PRIVATE_TRACE_DIRECTORY_FOR_THIS_ARM,
  promptBuilder: modelPromptFromThisExactArmSource
});
await runAdmitted({ /* original canonical admitted args */, curate: observedCurate });
```

No direct model call or Graphiti write from an interactive OpenCode TUI. Prove real post-exit exclusive lease, quiet grace and process classification; an env marker alone is not proof of admission. Arm the once-only launcher, exit normally, then use the observed native terminal statuses. Resolve no remote write by blind replay. For any interrupted call-intent with no response, record an **unknown model-attempt outcome** rather than treating it as proof no call happened. Never reset historic or production groups.

Preserve original-source and prompt identities (baseline and candidate prompts differ). The resulting `d1` diagnostic raw traces support findings about **the new exposed development run**, not unverifiable claims about historical t1/t2 private model thoughts. A small bounded duplicate negative/control sample may be included only when it materially changes source/safety diagnosis. Do not launch repeated speculative model sweeps.

## Step 3 — Independent fact-to-target adjudication

Use the existing user-approved AI review authority against original private native source records. Blind target judgments to arm identity and historical curator labels until first-source proof is recorded.

For every independently ratified valuable target, determine whether the actual raw model output contained any fact proposal genuinely preserving that target. Use the exact source handle and original native evidence (and offsets when proposed); report unsupported assistant inference, superseded information, missing original context, source window limits, and case-level ambiguity separately.

A model-authored normalized paraphrase is `review_only_unverified` unless there is a separate independent entailment judgment and authorization. It is not a successful persisted claim just because it seems semantically related.

Classify the most proximate supported mechanism among: upstream source/capture loss, evidence truncation/weak identity, model SKIP, model DEFER, EMIT selecting an unrelated fact, validator rejection, successful validated proposal with no terminal proof, genuine retained source-supported fact, and missing raw evidence. Keep observed machine state separate from reviewer inference. Quantify positive valuable targets lost by each actual stage, group by source family, and identify repeatable conditions.

## Step 4 — Finish the causal answer in this assignment

Produce one independent, concise causal conclusion addressing:

- What proportion of 16 valuable targets were actually model-visible?
- Which were demonstrably **proposed as candidate facts** in the raw model output, versus merely marked `discovered` in the scorecard?
- Of source-supported proposals, which failed exact offset/format, utility classification, source authorization, ReviewStore approval, or Graphiti terminal evidence?
- Did a broad cluster-level SKIP/DEFER preempt an otherwise safe extract, or did the model fail to extract a durable claim?
- Did the baseline retain its useful facts under the same source/policy, and which candidate losses are genuinely paired rather than caused by model variance?
- Does the hard 25–450-character exact-source assertion requirement prevent useful normalized **but independently supportable** knowledge from becoming Graphiti facts?
- Can the next source change remain inside the authorized ADR boundaries: high-recall upstream, independent fact extraction + utility judgment, source-anchored deterministic promotion, one fact per episode and bounded per-cluster plurality?

**Do not author or push new semantic curator, validator, source-capture or scorer changes locally.** Central will implement the smallest supported source correction from this first-loss evidence. The local agent may return a concrete proposed diff or regression shape, but must not conceal substantive implementation under "mechanical fixture repair."

If raw evidence proves most loss is model SKIP despite authenticated supported durable spans, recommend a targeted recall-conscious curator change. If the problem is source-span/format feasibility, recommend a source evidence/claim separation correction. If evidence is insufficient, state which private trace/source records would resolve it; do not send Central a generic rebenchmark request.

## Verification, publication and closure

Run native `node --check`, `node --test docs/issue-91/adr-acceptance/adr-causal-audit.test.mjs`, and applicable existing source tests plus `npm run check`/`npm test` from the authenticated scoring HEAD, if their host execution plane is authorized. Resolve ordinary fixture/command/scratch/environment issues within scope. No tests or validations may be weakened, bypassed or fabricated.

Use one private work root (0700, raw files 0600); sanitized outputs only under `docs/issue-91/evidence/92-adr-causal-resolution/`. Publish **one** final evidence-only commit on the existing branch with exact-head compare-and-swap and remote readback. No PR, merge, issue close, production activation, new holdout, Graphiti data purge, or model-policy change.

The prior scorer result stays `INSUFFICIENT_SAMPLE` overall **and FAIL for selection, retention and baseline-useful preservation**. This diagnostic does not revise it.

Return typed evidence with: exact source/scorer HEAD and blobs, native test results, original freeze and model digest readbacks, private raw-trace availability, independent source reviewer identity/method, complete or explicitly incomplete first-loss matrix by trial/arm/target, any necessary one-shot `d1` run and real EX/Graphiti receipts, quantified causal families and first loss stages, preservation of negative/privacy controls, production unchanged, recommended smallest Central-owned remediation plus exact regression criteria, evidence commit CAS readback, and GHDEV command-shape friction.

**Completion target:** enough source-proven evidence for Central to implement one meaningful correction, **without consuming another untouched cohort or requiring repeated exploratory handoffs**.
