# Issue #75 — pragmatic retrieval disposition and remaining release gate

**Authority:** the user's latest direction (2026-11-01) accepts occasionally
imperfect reranker behavior for a personally operated tool. This governs
the next execution priority, not a claim that old numeric targets passed.

## Evidence reviewed

Current published evidence commit:
`15e83fc21e2ed4660f4d31e66e284e9613f48201`.
Inspect the actual files in `docs/issue-75/evidence/`:
- frozen live `20261102-frozen-live.json`: **7/7** exact, P=1.0, R=1.0,
  zero wrong-group, zero timeout;
- previous published holdout live `20261102-prior-holdout-live.json`:
  **5/5** exact (previously inspected, not blind);
- NEW frozen-before-evaluation holdout `20261102-new-holdout-queries.json`
  + `20261102-new-holdout-live.json`: **9/12** exact,
  P=0.60 / R=0.60; zero timeouts and zero wrong-group leaks.
  Errors: n2 unrelated decision f1 admitted; n5 historical f3 mistaken
  for f1; n6 implicit media dependency f2 omitted.
- `20261102-new-holdout-reranker-observations.json`:
  19 read-only cases, zero errors, zero redaction, independent CPU ONNX
  Jina reranker. n2 is a *source admission* false positive caused by
  excluding a higher-scoring historical fact from background comparison;
  n5 is a historical intent parsing/rerank tie; n6 is a lexical
  morphology/implicit relation miss. None is a cross-group leak.
- `20261102-host-local-fixes.diff`: independently reviewed; RTK
  closed-list commands and V2 JSON-quoted prompt are already
  reconstructed in central source, with a test for the decoded
  search query. The host diff is audit evidence, not a patch to reapply.

## Explicit acceptance decision

**Retrieval is sufficient for this issue's personal-tool beta qualification,
WITH KNOWN LIMITATIONS.** No requirement that every query rank or admit the
perfect fact; do not hold the issue open for repeated calibration, another
reranker model or more adversarial fixture sweeps. The previously stated
P>=0.80 / R>=0.75 *holdout targets were NOT achieved*; this is an
explicit pragmatic acceptance of the measured 9/12 behavior, not
retroactive rewriting of scores or tests. Keep the frozen query
specifications and all recorded negative results unchanged.

Continue enforcing hard correctness boundaries: group/source UUID
qualifiers, no wrong-group fact leakage, no sensitive capture,
no unsupported verified provenance, bounded context/reranker time,
opt-in/opt-out, and no heavy Graphiti extraction during live OpenCode.
One irrelevant answer or imperfect paraphrase is a quality limitation,
not proof that these invariants may be weakened.

The current query/fact selector remains deliberately small. Revisit
ranking only for severe real-world misbehavior after ordinary use, not
because a crafted holdout contains normal low-confidence mistakes.

## The actual remaining blocker

**Fresh source-attributed, model-backed Graphiti extraction after agent exit**:
the last qualifying host state included five `pending` candidates,
including a new genuine user decision, and zero Graphiti writes in-session.
The earlier `settled/persisted=3` outcome was a no-op on old records,
not proof of fresh extraction.

The Graphiti extractor currently targets a single-serving Qwen3.8 model
with a 16,384 thinking budget against an 8,192 requested-output budget;
ten `output_limit` model completions have been observed. The earlier
direct non-thinking `{"ok":true}` probe is not Graphiti end-to-end proof.
A supported Graphiti-only non-thinking model alias/config is the
preferred narrow fix, preserving interactive `chat` defaults.

No production LiteLLM/Graphiti/OpenCode configuration may be modified
without separately verified scope and explicit operator approval.
Prefer a disposable Graphiti worker/config with an isolated test group,
using existing shared EX admission. The worker must not compete with
active agent inference and must not be stopped if it is a shared service.
The post-exit runner can hold EX on uncertain asynchronous tasks; do not
run it against shared server state without an explicit safe recovery
route for that failure.

## Finish and delivery

One bounded host activation/proof step, not another retrieval campaign.
Demonstrate pending -> submitted/queued -> **persisted with distinct
remote UUID**, plus context recall of that newly indexed fact in a
fresh process. Confirm no production group/config changes, no duplicate
ingestion, and no adverse OpenViking behavior. Rerun focused
integration regressions on the exact updated source, report terminal
logs/errors and post-exit evidence. Then central independently reviews
the exact head and prepares one issue PR when appropriate.
