# Issue #75: evidence-based relevance admission, candidate review (2026-11-01)

SOURCE EVIDENCE: published real Graphiti/Jina reranker data at
\`23bde2a68e71f548313101be912ab9df32641501\` in
\`docs/issue-75/evidence/20261101-reranker-observations.json\`,
\`20261101-holdout-queries.json\`, and historical candidate/baseline files.
This file describes the Central-authored candidate, NOT acceptance or
deployment authority.

## Measured problem

- Raw Jina ONNX scores on the host range approximately 0.011–0.654.
  They are model ranking signals, not calibrated P(relevance).
- The relevant direct-decision fact in frozen paraphrase scores 0.0687;
  a distractor returned for a wrong-group QUESTION scores 0.1290.
  Thus **no single score floor** admits the relevant item while
  rejecting that distractor in these observed cases.
- For 7 of the 8 POSITIVE questions the correct source is rank 1.
  The only positive top-1 miss is the current-choice paraphrase:
  historical Tkinter transition 0.0914 vs direct React Flow choice
  0.0687. Four other questions expect zero results; their raw top-1
  ranks are not "correct responses" until an admission rule abstains.
- The original fixed 0.70 policy returned nothing; lexical-only
  produced frozen P/R 0.60/0.60, coverage 5/7.
- Native Graphiti returns loose top-k but local remote-episode journal
  filtering maintains group and source provenance. Do not conflate
  false-positive local-group results with cross-group leakage.

## Central candidate design

\`relevance.mjs\` retains the independent loopback CPU ONNX reranker.
Rather than turning its scores into unsound absolute probabilities, the
selector requires support from a guarded query/fact relationship:
1. At least two shared meaningful terms, or
2. an explicitly historical question and a history-qualified source
   statement with at least one shared meaningful term, or
3. an explicit choice/decision question with at least two topical query
   terms and an independently reranked *direct decision* statement.
   A historical transition statement does not win a current-choice
   question merely because the cross-encoder slightly favors it.

Named software or entity terms appearing inside a question must occur
in an admitted fact. Causal "before replacing" does not by itself make
a dependency question historical. Historical/decision cues are generic
English structures; no production code contains seed names, source IDs,
query IDs, project-specific synonyms or frozen expected answers.
The filter returns at most ONE source-attributed fact by default for
automatic context. Broader on-demand search remains a separate need.
Without a working independent reranker, zero-overlap semantic choices
fail closed to lexical selection; low-confidence misses are preferable
to a fabricated answer.

This is a provisional bounded candidate, not a general semantic
entailment solver. In particular, a low-overlap unrelated choice
question could still be falsely matched to an unrelated chosen fact.
Independent adversarial queries and real V2 context outcomes must be
measured before production promotion. There is no claim that these
generic heuristics will suffice for arbitrary history/repo relations.

## Retrospective replay (NOT independent validation)

Using the published 12 recorded queries and actual per-fact scores:
- Frozen 7/7 expected result sets (7 covered, P=1.00, R=1.00,
  wrong-group=0).
- Previously published holdout 5/5 expected result sets (3 positives,
  2 abstentions).
- Combined: TP=8, FP=0, FN=0. All 12 cases have a recorded Graphiti
  result and no reranker errors in the source evidence.

The holdout is NOT independent now: its queries and raw scores were
inspected before this implementation. The replay is legitimate
source-level regression coverage but **must not satisfy the final
out-of-sample gate**. \`relevance-observation-replay.test.mjs\`
explicitly states that limitation. Synthetic second-domain tests in
\`relevance.test.mjs\` also exercise generic choice/history/named entity
behavior without mentioning the frozen source names.

## Next required qualification (ONE consolidated host campaign)

1. Run current exact-head CPU and mock-V2 tests. No weakening of
   source-class, graph/journal, disabled-capture or timeout guards.
2. Use \`benchmark-live.mjs\` with the actual disposable group,
   existing \`:8766\` MCP, \`:8004/v1/rerank\`, and the tracked
   \`benchmark-source-map.json\` to exercise the **real Memory.search**
   path. Preserve the frozen seven cases unchanged, then run the
   published prior holdout for regression. Keep the heuristic-only
   baseline explicitly non-equivalent to live service results.
3. Before inspecting new candidate results, freeze 8–12 NEW mixed
   positive/negative/adversarial queries, including unseen irrelevant
   topics, choices absent from the graph, historical-vs-causal-before,
   names from a different repository, and underspecified questions.
   If independently supported, use a second disposable corpus of
   fresh source-attributed decisions to check cross-domain behavior.
   Ground expected outcomes in the input facts, not the model scores.
4. Exercise fresh stock V2 context injection of the selected source
   (not model-answer prose), coexistence with production-equivalent
   OpenViking and operational schema, and a genuine newly submitted
   Graphiti episode after harness exit under the existing EX gate and
   idle/quiet-grace rules. The distinct \`chat-extract\` non-thinking
   profile must be demonstrated through Graphiti, not just direct
   ninfer \`{"ok":true}\`.
5. No production Graphiti data changes, plugin promotion, model profile
   change or new permanent scheduler/service. Reuse the earlier
   private state and disposable group only when this cannot corrupt
   source-map assumptions. A temporary isolated worker may be used
   to test extraction failure/recovery without stopping the shared
   production server. Do not retry unknown/queued rows blindly.
6. Report actual precision/recall/coverage, wrong-group vs relevance
   false positives, p50/p95, timeouts, model reasoning/output, terminal
   graph readback and privacy/rollback. If the NEW adversarial
   holdout shows false admission or unacceptable misses, return the
   exact counterexamples for Central correction; do not silently
   overfit or lower safety thresholds.

## Important limitations

- The exact final stage is not yet host-tested.
- The new source policy is conservative and may under-recall legitimate
  zero-overlap paraphrases; no false assurance of coverage.
- Scores and observed facts came from the existing 3-episode synthetic
  corpus. The 12-case score range is not necessarily representative
  of a larger graph; keep source admission scoped.
- Independent reranker runtime of ~8–15 ms in observations did not
  include every full Graphiti/network/context delay. One observed
  Graphiti query took ~279 ms before reranking, near the 300 ms context
  budget; timeouts must be measured through actual plugin hooks.
- Production acceptance requires the above out-of-sample host
  evidence and a Central exact-head independent review. Do not open
  the final PR before those gates.
