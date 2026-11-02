# Issue #75: integrated Build handback adjudication (2026-11-01)

**Disposition: PARTIAL. No Issue #75 acceptance, no review-ready PR, no production promotion.**

This is a source-based Central classification of the second local Build handback,
not direct verification of its host data. The Build worktree was pinned to
`2189a026e9f94b9e01cb1108db907a4deb959224`; the final five-file
uncommitted host diff and raw retrieval results were reported but not supplied
as inspectable bytes to Central. Changes staged after that head are Central
candidate code, **not host-tested source**.

## Accepted evidence boundaries

- Native V2 capture/source class/opt-out and zero `add_memory` during interactive
  harness: **host-reported mock-hook tests**, not a fresh full-stack live call.
- Group and remote episode identity: host-reported three persisted journal rows,
  local name / remote UUID reconciliation. Production Graphiti graph unchanged.
- Independent `:8004` CPU reranker: host-reported 40-85 ms requests; it ranked
  relevant facts but its returned score scale was below the hardcoded 0.70
  absolute acceptance floor. Backend score semantics/calibration are not yet
  independently established.
- Single-serving Qwen3.8 and Graphiti contention: host-reported model limit one.
  Of 2,083 logged completions, ten reached `output_limit`. Extraction requests
  had 8,192 total output tokens but up to 16,384 reasoning tokens, a strong
  causal explanation for at least the cited truncations; not proof of every
  empty response. A direct `enable_thinking:false` probe returned valid JSON.
  **Native Graphiti extraction using `chat-extract` has not been proven.**
- Post-exit command output `settled,persisted=3`: proved successful
  admission/lock acquisition and a settled journal snapshot; **did not itself
  prove a new episode submitted and indexed**.
- Coexistence: successful plugin imports/exports, not fresh-process OpenViking
  functional readback with new Graphiti context.
- Retrieval: lexical precision/recall 0.60/0.60, 5/7 coverage, group leakage 0.
  Fixed-0.70 reranker rejected all; retrieval targets not achieved. The prior
  5/7 baseline is **heuristic-only**, not service-equivalent.

## Current Central code staging

Following this handback, Central conditionally advanced `issue/75` with:
1. plain-object stock-V2 plugin export and host-reported Graphiti MCP default
   `:8766`, replacing an invalid historical `:8000` default;
2. bounded waiting for the **same** existing shared exclusive flock, without
   an alternative admission path; a lock-contention unit regression;
3. more precise per-run drain counters, distinguishing pre-existing persisted
   records from newly submitted and reconciled records.

These changes are based on host-reported interfaces and central source inspection.
They **do not certify exact equivalence to the unsupplied host diff**, the
original generated `plugin-behavior.test.mjs`, or `extraction-profile.md`.

## Blocking review work, kept within the same issue

**Retrieval:** absolute reranker thresholds are not portable calibration.
Verify model checkpoint, actual score protocol and the raw scores for each
candidate, including irrelevant queries. Prefer a predeclared,
query-relative/calibrated acceptance rule using independent calibration
examples and abstention over merely decreasing 0.70 until the known seven
cases pass. Run frozen seven and disjoint holdout after the policy is fixed.
Retain zero cross-group leaks and source-backed-only injection.

**Extraction:** configure `chat-extract` (or the actually supported equivalent)
for Graphiti ONLY, preserving interactive `chat`, and demonstrate a newly
selected ordinary event progressing pending -> queued -> persisted after
interactive harness exit without concurrent LLM activity. Distinguish actual
worker completion and any terminal failure from queued HTTP acknowledgment.
Do not resubmit the prior lab `g_other_repo` unknown/queued row absent
explicit case-specific reconciliation.

**Full coexistence:** a fresh isolated host process loads the intended
production-equivalent plugins and demonstrates both OpenViking recall and
Graphiti context injection. Import success alone is not this proof.

**Integration:** retrieve and inspect the exact host-generated `final-diff.binary`,
`plugin-behavior.test.mjs`, `extraction-profile.md`, raw frozen + holdout
results and reranker score trace before declaring the host fixes fully merged.
No new separate issue/PR required. Preserve original host worktree and
evidence; avoid replaying already terminal data writes.

## Friction disposition

The reported `rm -rf` guard denials were pre-execution, with no side effects;
a fresh unique destination was the correct recovery for disposable state.
The `__pycache__` cleanup also remained within an existing known cleanup
permission behavior. **NO_KB_CHANGE** on the reported facts. The handback's
events use a condensed rather than full canonical GHDEV-10 schema; future
handoffs should retain the complete fields without inventing omitted data.
