# Issue #92 ADR D2 — two-stage fact discovery + independent novelty review (previous vs two_stage)

**Schema:** `issue92-adr-exposed-d2-comparison-v1` (diagnostic) · `issue92-adr-d2-receipt-v1` · `issue92-adr-d2-terminal-evidence-v1`
**Kind:** sanitized, evidence-only, public. No raw model responses, private source text, credentials or raw service logs are in this directory.
**Disposition:** `REMEDIATION_REQUIRED` (development readiness, not Issue #92 acceptance).

## Campaign

One bounded, exactly-once, EX-gated two-arm matched development comparison on the frozen original 24-cluster exposed corpus (development evidence only, not H5 or a new independent holdout).

| | d2:previous | d2:two_stage |
|---|---|---|
| Source SHA | `e303a67786fd96491cbdab36790b81442c4340c6` | `50db627850c28f2ce31a68f547f91f51ee3e43b0` |
| Treatment | one-pass `runAdmitted` (`factReview=false`), D1 corrected source | two-stage `runAdmitted` (`factReview=true`): source-only discovery prompt + independent review model call, opt-in dev path |
| Graphiti group (fresh, empty) | `graphiti-adr92-d2-previous` | `graphiti-adr92-d2-two-stage` |
| ReviewStore root (fresh, empty) | disposable `d2-state/previous` | disposable `d2-state/two-stage` |
| Model | `chat-fast`, temp 0, max_tokens 1600, json_object, 90 s | identical; separate discovery and review calls |

Starting GitHub HEAD for the campaign: `9e335908c52aa1df37342e5726c45bb640f61b2b` (branch `work/91-memory-utility-r1`). The two-stage source bytes are identical at later scoring HEAD `9e335908`.

## EX admission and once-only execution

- Canonical `openviking-commit-gate` EX protocol: exclusive flock, interactive-harness-exit check, quiet grace, scheduler-idle observation, lock retained through remote readback (installed `post-exit-drain.py`).
- No inference or Graphiti writes from the interactive OpenCode harness. Campaign window `2026-11-10T01:25:17Z → 01:28:45Z` (harness exit → completion); the production post-exit drain was observed to settle before the campaign started.
- Central private trace wrappers (`adr-private-trace.mjs` at `9e335908`, sha256 `f4ef9079…`) recorded call intent **before** each inference with `wx` preflight; raw responses kept 0600. 24 one-pass traces (previous), 24 discovery traces + 20 review traces (two_stage), all with matching call-intents, 0 unfinished, all mode 0600. No replays.
- Both wrapper exits 0 (late-reconciliation resumes under retained EX; final reconcile-only settled).

## Frozen corpus identity

- `freeze.json` (host-local, 0600) sha256 `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f` — 24 clusters, 24 eligible sources, 16 valuable targets, 11 nonvaluable targets, 1 ineligible privacy control. Unchanged from the published prospective freeze receipt.

## Results

### Per-target first-loss stages (16 valuable targets per arm)

Structural classification by `adr-causal-audit.mjs analyze` (see `d2-causal-result.json`); `REMOTE_TARGET_PRESERVED` additionally requires the independent reviewer's original-source support credit (the cited verbatim span must itself express the target's claim).

| Stage | d2:previous | d2:two_stage |
|---|---|---|
| MODEL_SKIP | 10 | 0 |
| VALIDATOR_REJECTED (record deferred: `invalid_model_shape`, reason > 300 chars) | 1 (sp9, model decision SKIP) | 0 |
| VALIDATED_NO_TERMINAL_PROOF (persisted, cited span is boilerplate, not source support) | 4 | 0 |
| REMOTE_TARGET_PRESERVED (source-supported, four-surface terminal proof) | 2 | 0 |
| DISCOVERY_VALIDATOR_REJECTED | 0 | 5 |
| REVIEW_DEFER (independent reviewer deferred every candidate) | 0 | 11 |

- **d2:previous** preserved `django_add_filter_lazy_string_typeerror` and `django_lazy_proxy_string_concat` (dj1 cluster, one verbatim defect span 693..893 stating the lazy-string/TypeError defect; same span family as the D1 corrected credit). 10 valuable targets lost at MODEL_SKIP (all 6 graphiti-mcp operational briefs g1–g4, sphinx dict-param sp1/sp2, sphinx rst-header rows sp8; sp9 is a model SKIP whose record was durably deferred because the validator also rejected its >300-char reason). 4 valuable targets were **proposed, validator-accepted and persisted, but the cited evidence span is session-boilerplate text that does not express the target claim** (`django_add_filter_lazy_string_variant`, 3× pylint) → not credited as source-supported retention.
- **d2:two_stage** persisted **0 episodes**. All 16 valuable targets lost:
  - **DISCOVERY_VALIDATOR_REJECTED (5 target rows / 4 clusters):** `adr92-g1` (2 candidates, discovery `reason` 388 chars > 300 → `discovery_invalid_shape`), `adr92-g4` (0 candidates, `reason` 693 chars → `discovery_invalid_shape`), `adr92-dj6` (1 candidate, `reason` 313 chars → `discovery_invalid_shape`), `adr92-dj1` (1 candidate, span end 1000 > excerpt length 972 → `invalid_fact_fields:assertion`).
  - **REVIEW_DEFER (11 target rows / 11 clusters):** the independent reviewer returned REVIEW for **all 20 candidates** (18 `not_substantive`, 1 `source_ambiguous`, 1 `review_uncertain`); no candidate was ACCEPTed, so no fact reached persistence and all 24 clusters carry a durable deferred review-only record.

### Negative controls

- **Nonvaluable (11):** previous arm **9 persisted** (sphinx sp4/sp5/sp6, django lazy-string repetitions dj3–dj8) — repetition inflation persists: the single Django defect is now persisted across 7 sibling clusters (dj1 valuable + dj3–dj8) and the sphinx defect across 3. two_stage arm **0 persisted** (all reviewer-deferred).
- **Privacy control:** the ineligible `:ctrl` source (`out_of_scope_workspace`) was not staged → 0 queue events and 0 trace prompts reference it in either arm.
- **Useful-among-grounded:** previous arm 2/14 = 14.3% (n=14); two_stage arm 0/0 (no persisted episodes → `INSUFFICIENT_SAMPLE`).

### Terminal per-fact evidence (all 14 persisted episodes)

Every persisted episode in the previous arm has positive four-surface terminal proof — ReviewStore record with `remote_episode_uuid`, Graphiti MCP `get_episodes` membership, raw FalkorDB `Episodic` node, and source-index entry — with 14 distinct UUIDs (see `d2-terminal-evidence.json`). The two_stage group contains 0 episodes (verified empty in MCP and FalkorDB).

### Model cost

| | d2:previous | d2:two_stage |
|---|---|---|
| Model calls | 24 (one-pass) | 44 (24 discovery + 20 review) |
| Model errors | 0 | 0 |
| Model time | 15.9 s | 16.9 s |
| Prompt / completion tokens | 48,309 / 4,076 | 32,139 / 3,857 |

The two-stage path costs ~83% more model calls and a 33% reduction in low-value persistence bought at the cost of **zero** valuable-target retention.

## Controls

- Production group `development-knowledge`: **0 episodes created in the D2 window** (newest episode 2026-11-08T03:57:03Z); normal scheduler posture restored after the campaign.
- Historical groups unchanged: `graphiti-adr92-d1-previous` 2 episodes, `graphiti-adr92-d1-corrected` 15 episodes (D1 published counts).
- No duplicate/stale replay (exactly-once traces, 0 `submission_unknown` in final state).
- No unsafe source exposure: raw model responses and private source text remain host-local 0600.
- Reported-bug evidence class preserved: persisted dj1 fact is a source-stated defect, not an independently verified fix; model-written normalized claims remain `review_only_unverified`.

## Decision (Phase E)

`REMEDIATION_REQUIRED`.

The two-stage candidate shows a **large reduction in low-value persistence** (9 nonvaluable + 4 boilerplate-valuable episodes → 0) with **bounded repetition** (no cross-cluster duplicate families persisted) and **no hard safety regression** (privacy control absent from model input, no cross-group writes, all 14 previous-arm terminals four-surface proven). However, **useful-fact retention did not materially improve**: 0/16 valuable targets retained in the two-stage arm versus 2/16 in the previous arm (and 2/16 in both D1 arms). A lower Graphiti episode count and a higher persisted-only precision (0/0 = INSUFFICIENT_SAMPLE) are not independently sufficient.

Precise source-based first-loss matrix for Central:

1. **Reviewer over-deferral (dominant loss, 11 valuable + 11 nonvaluable targets):** the independent review pass returned REVIEW for 20/20 candidates (18 `not_substantive`), including candidates citing spans that *do* state the defect (e.g. dj2, sp1, sp2, sp8, py1–py3 spans and the g2/g3 graphiti operational briefs). The review prompt's "boilerplate" and "NOT sufficient" rules are applied to issue-title/defect-statement spans that the ADR treats as source-stated useful negatives. Minimal correction: recalibrate the review prompt/validator to credit source-stated defect spans (the span itself must state the claim; reviewer `not_substantive` must not fire on spans that do), without reopening boilerplate persistence.
2. **Discovery validator shape fragility (4 clusters / 5 valuable targets):** `reason` > 300 chars (`discovery_invalid_shape`) kills an otherwise valid candidate set (g1, dj6, and g4's empty-candidate reply); one out-of-bounds span (dj1: end 1000 > 972) drops the only candidate for the one cluster whose span *did* state the defect. Minimal correction: bound/trim `reason` before the shape check (or raise the limit) and clamp/reject out-of-bounds spans with a targeted validator message; both are mechanical, semantically inert changes.
3. **Residual MODEL_SKIP in the one-pass arm (10 valuable targets):** graphiti-mcp operational briefs and sphinx rst-header rows still SKIP at discovery; this loss is independent of the two-stage review and persists across D1/D2.

No local prompt tuning, threshold change, or extra speculative sweep was performed in this campaign.

## Files

- `d2-causal-result.json` — `adr-causal-audit.mjs analyze` output (`issue92-adr-exposed-d2-result-v1`, disposition COMPLETE, 16/16 rows per arm).
- `d2-receipt.json` — identities, EX admission evidence, model workload, final state, controls, verdict.
- `d2-terminal-evidence.json` — per-episode four-surface terminal receipts (UUID + booleans only).
