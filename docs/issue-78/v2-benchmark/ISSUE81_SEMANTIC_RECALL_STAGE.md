# Issue #81: semantic-first native recall (Central-authored source stage)

Candidate branch: issue/81-semantic-recall; authoritative exact commit provided in the handoff.
Base: 6e5695da91974447c718e99757bc8a84d9de3e9d.
Status: STAGED SOURCE; not merged, installed, deployed or independently reviewed.

## Objective

Implement Issue #81's revised optimization principle in one cohesive production recall
path. Favor useful semantic knowledge coverage while retaining privacy, exact group
and workspace isolation, positive source/episode authority and temporal honesty.
Context is untrusted reference evidence, never instructions or verified truth.

## Central implementation

- New semantic-recall.mjs: native search rank as soft semantic signal, Issue/
  lexical overlap as soft ranking/disambiguation cues; adaptive (up to five)
  diversified source-grounded observations within the existing character budget.
- Memory.search: preserve 24 native facts, persistence/group/source validation,
  per-Graphiti-client FIFO serialization and positive remote indexed episode
  proof. Switch to the semantic selector only when recallPolicy=semantic.
- Issue #75 baseline plugin remains strict by default. Issue #78 candidate
  wrapper defaults to the new semantic policy, with explicit strict control.
- Strict relevance.mjs and all historical benchmark assertions remain unchanged.

The indexed-only route has no independent semantic rank. It uses query hints to
limit remote-proof work; this must not veto semantically retrieved native Graphiti
facts. Tool question-echo pollution remains excluded. No new model inference,
datastore, reranker, service, Group migration, private-state rewrite or LLM
resource contention is introduced.

## Focused validation

From authenticated repository root, run node --check on every changed executable
file and new test. Run node --test over:
docs/issue-75/v2-candidate/semantic-recall.test.mjs
docs/issue-75/v2-candidate/semantic-memory-integration.test.mjs
docs/issue-75/v2-candidate/memory-core.test.mjs
docs/issue-75/v2-candidate/relevance.test.mjs
docs/issue-75/v2-candidate/relevance-priority-regression.test.mjs
docs/issue-75/v2-candidate/relevance-observation-replay.test.mjs
docs/issue-75/v2-candidate/plugin-behavior.test.mjs
docs/issue-78/v2-curator/curated-recall-candidates.test.mjs
docs/issue-78/v2-curator/production-cutover.test.mjs

Also run repository-defined static/root checks, except equivalent exact-head
trusted Actions that Central can reuse. Return actual producer exit/counts and
complete failures, not compressed test-only summaries.

## Bounded host qualification

Read-only private shadow replay comparing strict versus semantic policy against
existing previously authenticated Graphiti facts, source index and negative
controls, including the original FalkorDB and curator history questions. Prove
group, source, temporal and privacy invariants, and measure CPU/Graphiti
latency. Do not mutate production Graphiti, installed OpenCode, services or
curation state, or claim genuine native session acceptance before future
review, merge, separately authorized installation and fresh-process run.

The 300 ms context Promise.race remains the current baseline, NOT a proven
native hook p95 nor a permanently fixed design target. The original 126-item
precision worksheet and frozen corpus/holdout scores are immutable; newly
added recall utility results are prospective and labeled separately.

Local Build may address only mechanical formatting/invocation friction inside
this stage. Any semantic failure is reported to Central with reproduction;
do not change policy, weaken tests, tune frozen cases or create a PR.
