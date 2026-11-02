# SUPERSEDED — do not execute

Following the Issue #75 architectural correction on 2026-11-01, this first-pass retrieval-only packet and its local-agent kickoff are **withdrawn**. It incorrectly assumed that Issue #70's Git source authority, receipts, temporal validation and scheduler were mandatory implementation contracts. Those are prior working fixtures to evaluate, not required architecture. See `docs/issue-75/ARCHITECTURE_REASSESSMENT.md`. The code/tests below remain historical experiments, not the approved Issue #75 implementation. No live host behavior is changed by this notice.

# Issue #75 first integrated retrieval unit

Source base: main 0f03cec9635304849ae17bfbf08ea930eab32e1d.
See INTEGRATION.md for Central-authored code-level wiring; the adapter
implements search orchestration and contributor-safe aggregation rather than
leaving that semantic design to the local agent.

These centrally authored modules and tests are *candidate source*, not an
installed live plugin. The currently running stock V2 host source/config,
Graphiti recall service and recovered gate overlays must be authenticated.

## Fixed implementation architecture

- Use bounded CPU-only lexical concepts and aliases from graphiti_relevance.py,
  not an interactive LLM, embedding requirement or second scheduler.
- The Python service at docs/issue-70/phase3/graphiti_recall_service.py is the
  repository reference, NOT necessarily the host-installed source. Integrate
  these modules with the real host copy in an isolated candidate.
- Preserve the existing receipt_sources, combined_validation and format_rows
  temporal/provenance logic. Never rank a graph edge into trusted memory without
  independent completed Git-attested receipts.
- Read-only Cypher stays group-scoped and parameterized. Permit matched edge
  fact text in addition to entity-name matches. Probe <=6 planned terms;
  for dependency/impact queries only, <=2 bounded neighboring entity-name
  probes. Each query <=24 rows, aggregate <=192 rows, and <=96 total unique
  episode IDs. No broad scan, index creation or graph writes. Keep existing
  service semaphore and timeouts.
- graphiti_retrieval_adapter.py merges ALL returned edge/episode contributors
  before passing at most 24 complete fact/period rows to existing format_rows;
  a saturated search probe fails closed rather than hiding contributors. The
  source and exclusive-state validation SQL remains unchanged.
- Use graphiti-intent.mjs to replace the fixed keyword-regex request gate
  in the stock V2 graphiti-recall.mjs. Keep its group/policy/token checks,
  <=1200 ms timeout, <=8 items/2400 chars, source-attributed formatting and
  existing OpenViking-first, Graphiti-optional context injection.
- Do not change captured-source categories, Git trust, Graphiti ingestion
  paths, temporal validation, or production source/config in this unit.
  No prior Issue #70 episode may be replayed.

## Benchmark acceptance, fixed before running new candidate

Before integration, record old behavior on a disposable seeded graph and
receipt database, including direct, paraphrase, implicit dependency,
multi-entity, historical-state, irrelevant and wrong-group queries.
Freeze query cases and human-checked relevant source facts first.
New candidate targets >=80% recall and >=80% precision on relevant facts,
>=2 additional relevant query cases covered versus old behavior,
zero wrong-group or unauthenticated facts, zero false temporal PASS,
<=8 injected facts/2400 chars and no interactive inference.
Measure end-to-end p50/p95 latency and old/new timeout behavior; do not
silently relax timeouts or threshold after results.

## Why discovery/source publication is a separate follow-on within same PR

Issue #75 also requires an opt-in path from ordinary development evidence to
durable source-backed Graphiti episodes without hand-authored JSON.
Compare an operator-controlled publisher with a constrained existing Git
development-artifact attestation adapter. Prefer the latter if authenticated
policy and host interfaces support it, avoiding unattended Git writes.
This first retrieval qualification must not fabricate authenticated source
events or delegate arbitrary Git-source adapter design to Build.
Central must stage that substantive source-admission implementation before
any production activation and before #75 may be completed. Reuse issue/75
and eventual single PR rather than opening per-adapter PRs.
