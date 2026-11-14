# Issue #92 — D3 exposed qualification of two-stage source-fact review correction

**Authority:** Issue #92 and `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md`.
**Status:** central-staged corrective source + diagnostic; NOT accepted, not production approved.
**Working branch:** `work/91-memory-utility-r1`.
**Historical D2 result:** `docs/issue-91/evidence/92-adr-d2-two-stage/README.md` at evidence commit `76e984e49996f56696f377c3c9c5130b1346d888`.
**Two exact model-tested source arms:**
- `d3:previous`: `50db627850c28f2ce31a68f547f91f51ee3e43b0` (original D2 two-stage, 0/16 valuable retention).
- `d3:corrected`: `a19e82c7ab68e710339dfd8b4f1381c75b37e8a5` (Central correction to `fact-review.mjs` + tests).
**Diagnostic authority:** `docs/issue-91/adr-acceptance/adr-causal-audit.mjs` at current branch HEAD; D3 `source_commits` still use the *original frozen prospective* baseline/candidate identities, not the treatment source identities.
**Exposed native corpus:** `/tmp/opencode/issue92-adr-qual/freeze.json` sha256 `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f`. Exactly 24 clusters / 16 valuable targets / 11 nonvaluable targets + one capture-ineligible privacy control. Frozen old cohort is **NOT a fresh holdout**.

## Purpose and scope

D2 proved zero automated pollution but **zero useful retention**: 20/20 independent review judgments were REVIEW, with 18 `not_substantive` and no Graphiti writes. Four clusters suffered discovery rejection, three from descriptive `reason` length and one from a source-range end offset outside the authenticated excerpt. D2 prior arm remained noisy, 2/16 supported targets, 9/11 nonvaluable persists and 4 boilerplate episodes.

Central's corrective source maintains the high-recall input/graph boundary while changing **only**:
1. Discovery: present `excerpt_length`, request concise reason and accurate offsets. Safely ignore overlong non-authoritative explanation rather than discarding valid candidates. Permit only deterministic, source-native, end-of-excerpt pointer recovery for an otherwise eligible range whose end overshoots actual excerpt length by **no more than 32 characters**. The original start/source remain unchanged; `validateModelDecision` still enforces exact excerpt, native source, scope, temporal, 25..450 bounds. Such a repair never independently authorizes persistence; the distinct reviewer must ACCEPT the actual recovered quote. Reject forged ref, changed start, larger overrun, short/invalid quote.
2. Independent reviewer: examine each EXACT quoted assertion for an actually stated technical claim first; a specific issue title or **source-reported** defect/constraint can be durable even without root-cause verification or a completed fix. No truth/authority upgrade; correct evidence class/temporal uncertainty persist. Then evaluate value and novelty. `not_substantive` applies only where the quoted passage itself lacks technical content. Genuine repetition/boilerplate still REVIEW, not automatically persisted.

**No changes** to capture, `core.mjs` deterministic source validator, Graphiti worker/queue/store/UUID/CAS/EX admission, OpenViking, model policy, installed production, or historical D2 output. Existing two-stage opt-in remains mandatory; the one-pass installed default remains untouched.

## One consolidated local Build campaign

**Agent:** OpenCode `build` for CPU integration, disposable source worktrees, permitted mechanical fixture/host repair, and evidence publication. No delegated substantive source/validator/architecture changes. Serena for significant symbol/reference questions, GitNexus for read-only impact, Probe for distinct retrieval gaps, RTK per current host command semantics, OpenViking only for historical context; direct native OpenCode commands for known paths.

### Phase A — source authority and native verification (CPU)

1. Refresh remote branch and use exact working-head proof. Fetch before relying on locally cached newly pushed objects. Prove each treatment worktree has its correct immutable commit and `fact-review.mjs` blob; check `core.mjs`, `worker.mjs`, `model.mjs`, `model-policy.mjs`, `curator-cli.mjs` and Graphiti source invariance between old/new source. D3 change should be confined to `fact-review.mjs` and its associated regression tests.
2. Inspect current Issue #92, ADR, current AGENTS.md, this contract, D2 result, and D3 source/diagnostic tests. Do not copy raw D2 model traces into public GitHub.
3. Run individually in the actual checked-out repository workdir (capture *producer* exit codes, no `| tail` masking):

```bash
node --check docs/issue-78/v2-curator/fact-review.mjs
node --check docs/issue-78/v2-curator/model.mjs
node --check docs/issue-78/v2-curator/worker.mjs
node --check docs/issue-91/adr-acceptance/adr-causal-audit.mjs
node --check docs/issue-91/adr-acceptance/adr-private-trace.mjs

node --test docs/issue-78/v2-curator/fact-review.test.mjs
node --test docs/issue-78/v2-curator/curator.test.mjs
node --test docs/issue-78/v2-curator/issue92-source-fact.test.mjs
node --test docs/issue-91/adr-acceptance/adr-causal-audit.test.mjs

npm run check
npm test
```

Central has only performed isolated V8 synthetic checks (source/pointer/authorization and 12 synchronous audit tests); **native Node tests are NOT yet proven**. Record actual test results without imputing success. Resolve obvious host command/fixture issues autonomously. If an acceptance-bearing source bug is reproduced, do not replace treatment source or weaken tests: report `BLOCKED_SOURCE_DEFECT` with exact commands, traces, and bounded corrective diagnosis. Do not run a campaign against a local uncommitted patch or change the scorer source pins.

### Phase B — one paired EX campaign (GPU/model/Graphiti, after harness exit)

Prepare exactly two fresh initially empty ReviewStore roots and disposable Graphiti groups; no production/historical group reuse or deletion. Use original frozen 24 clusters, source and source-strength identities, 16 independently valuable targets, 11 nonvaluable targets and original capture-ineligible privacy control. The same `chat-fast` alias, temp 0, max_tokens 1600, JSON output, timeout 90s in both arms; the same real native inference backend, scheduler, clock and durable source inputs.

**Both arms are two-stage with `factReview=true`.** The only treatment source difference is Central's revised discovery adapter/prompt and independent reviewer prompt. Distinct exactly-once private 0600 traces and call-intents for *each* arm's discovery and reviewer calls. Use the existing verified post-exit controller and `createPrivateTraceCurator` plus `createPrivateMessageTraceCall`. Source the correct `factDiscoveryPrompt` and `curateCluster` from each immutable treatment worktree. Never take the D3 scoring HEAD's model prompt as a substitute for the old arm.

Preflight canonical EX flock, harness termination, actual interactive-process eligibility, quiet grace, production-drain serialization, scheduler idle and durable Graphiti/MCP health. Do not call model or perform Graphiti writes from an interactive OpenCode session. Wrapper holds EX through terminal reconciliation. Exactly one attempt per cluster/arm; on a crashed or ambiguous model/Graphiti attempt preserve `call-intent` and remote `submission_unknown`, do not replay; a bounded follow-up read-only reconciliation is permitted. Continue within this same campaign if a recoverable service fault can be resolved without source/data authority change.

### Phase C — independent fact-level adjudication (CPU/read-only)

For every valuable target and nonvaluable control, use original native source and actual prompts plus raw model evidence. Record source visibility; discovery candidate exact ref/offset and `source_span_adjustments`; old-versus-new model/validator result; reviewer judgment and final `utility_class`; semantic support by the QUOTED PASSAGE ITSELF; equivalent prior/sibling assertion duplication; review state; each persisted episode's exact UUID, ReviewStore, source index, Graphiti MCP and FalkorDB terminal readback. A valid offset into an authentic source does **not** itself mean that quote expresses a useful claim or verified fix. The reviewer saying ACCEPT also does not substitute for independent adjudication.

For nonvaluable controls, count persistent *underlying meanings*, not just identical text. Explicitly verify the capture-excluded privacy source did not enter either arm's queue or prompt, no invented/unsafe source, no wrong-scope reads and no production/historical Graphiti mutations. Count model calls/tokens, reviewer backlog, duplicate families, reported-versus-verified source status and total episode burden. Both pre-campaign and post-campaign current installed production source and active scheduler posture must remain unchanged.

D3 private audit bundle:
- `schema="issue92-adr-exposed-d3-comparison-v1"`
- `comparison_sources.previous="50db627850c28f2ce31a68f547f91f51ee3e43b0"`
- `comparison_sources.corrected="a19e82c7ab68e710339dfd8b4f1381c75b37e8a5"`
- exactly two runs, `trial="d3"`, `arm="previous"|"corrected"`
- original frozen `source_commits` and exact `freeze_sha256`
- each target row: `discovery_raw_content`, `discovery_reply_sha256`, `review_raw_content`, `review_reply_sha256` where a review call occurred, independently reviewed target candidate indices, actual cluster, visibility/review state and four-surface terminal proofs.

The D3 scorer MUST use the old frozen discovery validator for `d3:previous` and the corrected validator for `d3:corrected`. It MUST preserve the historical D2 result when rerun on the old private D2 bundle; do not credit a D2 out-of-bounds/long-reason recovery that did not occur in D2's actual execution. The diagnostic code never infers semantic fact support: original-source adjudication is separate.

```bash
node docs/issue-91/adr-acceptance/adr-causal-audit.mjs analyze <PRIVATE_FROZEN_FREEZE_JSON> <PRIVATE_D3_PAIRED_BUNDLE_JSON> > <PRIVATE_D3_CAUSAL_RESULT_JSON>
```

Read and report the CLI producer exit separately from any display/filter/tee command.

### Phase D — disposition, one publication, no reruns

Compare D3 corrected vs exact D3 previous for (a) 16 valuable-target *source-supported terminal retention* and first-loss stage, (b) 11 nonvaluable-target persistence and repeated facts, (c) safety/privacy/source-class invariance, (d) model error/range correction/reviewer decisions, (e) Graphiti terminal proof and CPU/GPU/token cost. The historical D2 0/16 and 0/11 are context, not a matched current comparator; temp 0 does not guarantee identical decisions between runs. Do NOT treat greater discovery counts alone as success, nor treat 0 persisted as precision PASS.

Return `READY_FOR_NEW_PROSPECTIVE_DESIGN` only if retention recovers materially across independently supported technical facts with bounded low-value/duplicate persistence and all hard gates intact. A handful of favorable model decisions alone is not adequate. Otherwise `REMEDIATION_REQUIRED` with one source-backed first-loss diagnosis; do not launch D4 or another unplanned model sweep.

Publish exactly one sanitized evidence-only final commit to the existing branch under `docs/issue-91/evidence/92-adr-d3-recalibrated/`, with strict exact-head non-force CAS and remote commit/blob/ref readback. No raw source transcripts, model responses, prompt text, credentials, actual sensitive host paths or service logs in public evidence. No source remote writes, new PR, merge, issue closure, production activation or new holdout.

**Typed final handback** should cover: `ISSUE92_D3_RESULT`, starting/current/ref SHAs, exact source treatment pins and blob identity, native tests/exits, original frozen SHA, EX and once-only traces, per-arm 16-target and 11-negative-control summaries, old/new discovery/reviewer validator stage counts (including corrected offset decisions), model variance, independent useful-fact and duplicate adjudication, all persisted UUID remote proof, production unchanged, one evidence commit + GitHub readback, exact remaining blocker or prospective-ready recommendation, and full canonical GHDEV `COMMAND_SHAPE_FRICTION` with actual submitted/effective shapes, rewrite provenance, event kind, effect and correction. Do not create a new handoff for minor routine host repairs.
