# Issue #92 ADR D1 — matched exposed development comparison (previous vs corrected curator prompt)

**Schema:** `issue92-adr-exposed-d1-comparison-v1` (diagnostic) · `issue92-adr-d1-receipt-v1` · `issue92-adr-d1-terminal-evidence-v1`
**Kind:** sanitized, evidence-only, public. No raw model responses, private source text, credentials or raw service logs are in this directory.
**Disposition:** `REMEDIATION_REQUIRED` (development readiness, not Issue #92 acceptance).

## Campaign

One bounded, exactly-once, EX-gated matched development comparison between the failed ADR candidate and Central's corrected candidate, on the frozen original 24-cluster prospective corpus.

| | d1:previous | d1:corrected |
|---|---|---|
| Source SHA | `a684667a6eefa2dc19f29755bed0c3048874721d` | `e303a67786fd96491cbdab36790b81442c4340c6` |
| Treatment | original `modelPrompt` | per-fact-first decision policy (only production change; validator/worker blobs identical) |
| Graphiti group (fresh, empty) | `graphiti-adr92-d1-previous` | `graphiti-adr92-d1-corrected` |
| ReviewStore root (fresh, empty) | disposable `d1-state/previous` | disposable `d1-state/corrected` |
| Model | `chat-fast`, temp 0, max_tokens 1600, json_object, 90 s | identical |

The historical baseline `c8eb5260f2b10832346234b1b5d0cf28302ffba8` was **not** run as a third arm (its older validator would add a second source difference). The only treatment is the revised system prompt.

## EX admission and once-only execution

- Canonical `openviking-commit-gate` EX protocol: exclusive flock, interactive-harness-exit check, quiet grace, scheduler-idle observation, lock retained through remote readback (installed `post-exit-drain.py`).
- No inference or Graphiti writes from the interactive OpenCode harness. Campaign window `2026-11-10T00:14:57Z → 00:18:26Z` (harness exit → completion).
- Central private trace wrapper (`adr-private-trace.mjs`, sha256 `f95efda1…`, identical to the `fcc1c67` blob) recorded call intent **before** inference; raw responses kept 0600. 24/24 clusters per arm have exactly one trace + one call-intent, 0 unfinished, all mode 0600. No replays.
- Both wrapper exits 0 (late-reconciliation resumes under retained EX; final reconcile-only settled).

## Frozen corpus identity

- `freeze.json` (host-local, 0600) sha256 `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f` — 24 clusters, 24 eligible sources, 16 valuable targets, 11 nonvaluable targets, 1 ineligible privacy control. Unchanged from the published prospective freeze receipt.

## Results

### Per-target first-loss stages (16 valuable targets per arm)

Structural classification by `adr-causal-audit.mjs analyze` (see `d1-causal-result.json`); `REMOTE_TARGET_PRESERVED` additionally requires the independent reviewer's original-source support credit (the cited verbatim span must itself express the target's claim).

| Stage | d1:previous | d1:corrected |
|---|---|---|
| MODEL_SKIP | 13 | 8 |
| MODEL_DEFER | 0 | 0 |
| VALIDATOR_REJECTED | 1 (`graphiti_temporal_validation_skill`: 20-char evidence span < 25 min) | 0 |
| VALIDATED_NO_TERMINAL_PROOF (persisted, cited span is boilerplate, not source support) | 0 | 6 |
| REMOTE_TARGET_PRESERVED (source-supported, four-surface terminal proof) | 2 | 2 |

- **d1:previous** preserved `graphiti_live_mcp_no_openviking` and `graphiti_temporal_memory_live_test` (g3 cluster, 2 per-fact episodes, distinct UUIDs). 13 valuable targets lost at MODEL_SKIP; 1 lost at the deterministic validator (g4 span too short → durable DEFER).
- **d1:corrected** preserved `django_add_filter_lazy_string_typeerror` and `django_lazy_proxy_string_concat` (dj1 cluster; the cited span literally states the lazy-string/TypeError defect). 8 valuable targets lost at MODEL_SKIP (all graphiti-mcp operational briefs incl. the previously preserved g3 pair — model nondeterminism — plus sphinx rst-header rows sp8/sp9). 6 valuable targets were **proposed, validator-accepted and persisted, but the cited evidence span is session-boilerplate text that does not express the target claim** (`django_add_filter_lazy_string_variant`, 3× pylint, 2× sphinx dict-param) → not credited as source-supported retention.

### Negative controls

- **Nonvaluable (11):** previous arm 0 persisted (11 SKIP). Corrected arm **8 persisted** (6 django lazy-string repetitions dj3–dj8, 2 sphinx repetitions sp6/sp7; 3 SKIP) — repetition inflation: the single Django defect is persisted across 8 sibling clusters and the sphinx defect across 4.
- **Privacy control:** the ineligible `:ctrl` source was not staged in either arm → not model-visible in either arm.
- **Useful-among-grounded:** 2/15 = 13.3% in the corrected arm (1/1 = 100% in the previous arm's 2 episodes, but n=2). Far below the ≥75% prospective target.

### Terminal per-fact evidence (all 17 persisted episodes)

Every persisted episode has positive four-surface terminal proof — ReviewStore record with `remote_episode_uuid`, Graphiti MCP `get_episodes` membership, raw FalkorDB `Episodic` node, and source-index entry — with distinct UUIDs (see `d1-terminal-evidence.json`). Per-fact identity preserved (the previous arm's 2-fact bundle materialized as 2 independent review records/episodes).

### Controls

- Production group `development-knowledge` and all four historical campaign groups: **0 episodes created in the D1 window** (unchanged).
- No duplicate/stale replay (exactly-once traces, no `submission_unknown` in final state).
- No unsafe source exposure: raw model responses and private source text remain host-local 0600.
- Reported-bug evidence class preserved: model-written normalized claims stay `review_only_unverified`; user-stated defect sources keep their `user-stated` class (the preserved dj1 fact is a source-stated defect, not an independently verified fix).

## Model variance and limitations

- One run per arm, `chat-fast` at temp 0; the run is **not** a deterministic replay (identical sources/config, different decisions: g3/g4 EMIT in previous, SKIP in corrected). No favorable-output reruns were performed.
- `VALIDATED_NO_TERMINAL_PROOF` is a structural stage: the audit CLI cannot judge span semantics; the support credit is the independent reviewer's adjudication recorded in the bundle (boilerplate spans ≠ original source support).
- The audit CLI imports `validateModelDecision` from one repository worktree; the validator blob is byte-identical in both arms, so a single import is authentic for both.

## Decision (Phase E)

`REMEDIATION_REQUIRED`.

The corrected prompt recovered the **decision level**: valuable-target MODEL_SKIPs fell 13→8 and the model now proposes validator-accepted facts for 8 of 16 valuable targets (previous: 2). But **source-supported valuable retention did not improve**: 2/16 (12.5%) in both arms, with a different retained set. The corrected arm instead persists substantial low-value information: 8 of 15 episodes (53%) are nonvaluable repetitions and 6 valuable episodes are persisted with boilerplate evidence spans. There is no credible path from this observed behavior to the prospective ≥85% valuable-target retention objective without addressing the remaining first-loss mechanisms:

1. **Evidence-span mis-anchoring** (new first-loss stage): EMIT facts cite boilerplate session-constraint spans or partial ISSUE lines that do not express the fact's claim → persistence without original source support (6 valuable + 4 nonvaluable facts).
2. **Repetition inflation**: identical underlying defects persisted across 4–8 sibling clusters (no cross-cluster dedup at curation; useful-among-grounded 13.3%).
3. **Residual MODEL_SKIP** on 8 valuable targets (graphiti-mcp operational briefs, sphinx rst-header rows), including regression of the 2 previously preserved g3 targets (nondeterminism).
4. **Validator hard-control exposure** (previous arm): 20-char span < 25-char minimum → durable DEFER; the span-boundary discipline must also survive the new policy.

Recommended bounded next action for Central: revise the span-anchoring rule (require the cited span to contain the claim, e.g. a deterministic span-claim entailment/keyword gate in the validator or a stricter prompt rule) plus a cross-cluster repetition bound, then re-run this same two-arm D1 comparison. No local prompt tuning or extra speculative sweep was performed in this campaign.

## Files

- `d1-causal-result.json` — `adr-causal-audit.mjs analyze` output (`issue92-adr-exposed-d1-result-v1`, disposition COMPLETE, 16/16 rows per arm).
- `d1-receipt.json` — identities, EX admission evidence, model workload, final state, controls.
- `d1-terminal-evidence.json` — per-episode four-surface terminal receipts (UUID + booleans only).
