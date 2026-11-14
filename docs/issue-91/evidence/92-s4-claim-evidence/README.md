# Issue #92 S4 — source-bound claim/evidence terminal completion (evidence-only)

**Result:** `TERMINAL_RECONCILED`
**Status:** terminal reconciliation settled post-exit under the canonical EX
gate; sanitized evidence published with this commit.

## Campaign
Completes the existing S4 claim/evidence qualification of Issue #92 without
inference replay, new Graphiti writes beyond the disposable group, a new
cohort, or a new PR. S4 runs the finite-batch treatment with `--claim-evidence
on` (implies resilient-discovery + source-recovery + recall + finite-batch):
discovery proposes a standalone normalized claim with a separate exact source
quote; an independent support critic reviews entailment (advisory); an
independent utility reviewer judges durable utility. Only the source-exact
authenticated quote is persisted to Graphiti — the normalized claim is never a
graph assertion.

## Identities
- Repository: `fvanevski/opencode-operational-schema-guard`
- Branch: `work/91-memory-utility-r1`
- S4 execution head: `37601461b21a9d5d5634ca5683db25479937f627`
- Frozen corpus SHA: `ebac7052065766eb8d1ef464142ea63dc3052d52deb36424492ebc477fdd3508` (original B3 24-roster, identical to S2/S3)
- Group: `graphiti-adr92-s4-claim-evidence`
- Model: `chat-fast` (default settings, no tuning sweep)

## What was done
1. **CPU acceptance** (`s4-native-test-results.json`): 6 `node --check` exit 0;
   focused suites `claim-evidence` 4/4, `finite-batch` 51/51,
   `finite-batch-tuning` 5/5, `fact-review` 16/16, `curator` 36/36,
   `issue92-source-fact` 5/5, `adr-causal-audit` 14/14; `npm run check` exit 0;
   `npm test` 524/524 exit 0. No assertions weakened.
2. **Source binding** (`s4-source-digest-roster.json`): S4 blobs at head
   (finite-batch `66e7f343`, claim-evidence `21db194b`, fact-review
   `20da07bc`, curator-cli `9e77394b`); no worktree drift.
3. **One bounded EX qualification** (`s4-launcher.log` +
   `s4-reconcile-receipt.json`): ONE EX-admitted run (canonical OpenViking
   flock, 30s quiet grace, scheduler idle, production-drain serialization).
   Three independent model stages (discovery/support/utility); no replay.
4. **Scorecard** (`s4-scorecard.json`): immutable 16 valuable / 11 control
   denominators (S1 7/16, S2 9/16, S3 9/16 historical) — S4 terminal:
   **valuable 4/16, controls 3/11**. Per-target first-loss stages across the seven
   S4 mechanisms recorded. Episode existence is not credited as extraction:
   6 episodes total, 23 entity nodes, 11 fact edges (6 episodes with
   substantive extraction, 0 trivial membership-only). Read-only retrieval
   probe: run.

## Stage model-call metrics
{
 "plan_stage_calls": {
  "discovery": 27,
  "utility": 7,
  "support": 9
 },
 "model_metrics": {
  "discovery": {
   "calls": 27,
   "prompt_tokens": 28623,
   "completion_tokens": 5587,
   "reasoning_tokens": 0,
   "cached_prompt_tokens": 15369,
   "latency_ms": 20462,
   "latency_reports": 27,
   "usage_field_reports": {
    "prompt_tokens": 27,
    "completion_tokens": 27,
    "reasoning_tokens": 27,
    "cached_prompt_tokens": 27
   }
  },
  "utility": {
   "calls": 7,
   "prompt_tokens": 9347,
   "completion_tokens": 280,
   "reasoning_tokens": 0,
   "cached_prompt_tokens": 3015,
   "latency_ms": 1388,
   "latency_reports": 7,
   "usage_field_reports": {
    "prompt_tokens": 7,
    "completion_tokens": 7,
    "reasoning_tokens": 7,
    "cached_prompt_tokens": 7
   }
  },
  "support": {
   "calls": 9,
   "prompt_tokens": 4865,
   "completion_tokens": 677,
   "reasoning_tokens": 0,
   "cached_prompt_tokens": 792,
   "latency_ms": 2510,
   "latency_reports": 9,
   "usage_field_reports": {
    "prompt_tokens": 9,
    "completion_tokens": 9,
    "reasoning_tokens": 9,
    "cached_prompt_tokens": 9
   }
  }
 }
}

## Findings
- **Claim/evidence boundary**: only the source-exact authenticated quote is
  persisted; the normalized claim is advisory evidence. only the source-exact authenticated quote is persisted; the normalized claim is advisory evidence, never a graph assertion
- **S4 recovery yield**: the 7 S2-missed valuable targets (g1 x2, g2, g3 x2,
  g4, sp9) independently scored; S4 valuable retention 4/16, control retention 3/11.
- **Model usage**: see `s4-scorecard.json` `stage_call_metrics`.

## Not done
No new model sweep, no inference campaign, no new cohort, no PR/merge,
no production installation, no issue closure, no changes to repository
logic/tests/validators or the EX gate, no mutation of historical S1/S2/S3
campaigns.

## Friction
`COMMAND_SHAPE_FRICTION.encountered` — see `s4-command-shape-friction.md`.
