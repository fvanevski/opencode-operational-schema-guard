# Issue #70 Phase 2 — Graphiti Core completion qualification record

Qualifies the Central-staged direct, awaited Graphiti completion adapter (see
`INTEGRATION_CONTRACT.md`) against the installed Graphiti deployment, using a
disposable nonproduction FalkorDB graph. Branch: `issue/70-graphiti-ingest`.
No production Graphiti/FalkorDB writes, no live `graphiti_live` mutation, no
deployment, no new PR.

## Authenticated sources and environment (B1)

- Graphiti Core `0.31.2` at
  `/workspace/mcp_servers/graphiti/upstream/mcp_server/.venv/lib/python3.13/site-packages/graphiti_core`
  (Python 3.13.15 venv interpreter; system `python3` lacks `graphiti_core`).
  166-file source hash manifest: `results/graphiti_core_SHA256SUMS.txt`,
  manifest self-hash `42d50f7271dd21240d45223b9d6ce0e8e1649fe2af6d30de18c1739c801aa5a8`.
- LLM `chat` endpoint port 8002; embedder `embed` port 8004 (dimension 1024),
  both local LiteLLM. `OpenAIGenericClient` (Chat Completions) with
  `small_model=llm_model` — mirrors the MCP server factory; avoids Responses-API
  structured-output failures of the local reasoning model.
- Live FalkorDB `127.0.0.1:6382`; live graph `graphiti_live` (read-only
  reference). Qualification graph: **disposable** `issue70_phase2_disposable`
  (FalkorDB multi-tenancy; group id must equal database name because
  `_resolve_request_scope` routes group→database). Port 6380 is plain Valkey
  (no `GRAPH.QUERY`) and is not used.
- Confirmed signatures: `Graphiti.add_episode(...) -> AddEpisodeResults` with
  `episode.uuid`; exact readback via `EpisodicNode.get_by_uuid`; episode count
  query uses label `Episodic`.

## Implementation (B2–C)

- `graphiti_core_bridge.py`: builds the real Core client, async factory,
  exact-UUID readback, and a live-graph guard that refuses non-disposable
  group ids. Fixed a bridge defect where `read_episode_by_uuid` returned the
  coroutine function object instead of awaiting `_read()`.
- `graphiti_terminal.py`: `AwaitedCoreAdapter` gained `extra_episode_kwargs`
  so the temporal-validation harness can bind the transition contract
  pre-extraction.
- `source_authority.py`: `PinnedSourceResolver` — source-authorized admission
  path. A real source-authorized episode was ingested through
  `SharedWorkQueue.admit_attested` → coordinator → Core path (Phase C).

## CPU qualification (D)

- Phase 2 suite: **20/20 PASS** — `test_graphiti_terminal` 9,
  `test_source_authority` 6, `test_gate_integration` 5 (including the two new
  cross-backend exclusion tests: Graphiti-pending blocks OpenViking inference
  and OpenViking-inflight blocks Graphiti inference).
- Phase 1 gate suite preserved: **53/53 PASS** on the updated candidates.
- Source-home suite: **10/10 PASS** (published separately to `issue/70`).

## Real Graphiti qualification (D, disposable graph)

`real_graphiti_qualification.py` → `results/real_graphiti_result.json`
(`REAL_GRAPHITI_QUALIFICATION=PASS`):

- work key / backend identity `32c6457a0c9b22123e8828753b9fa33f0111800215e489b792f6a463a3a2403c`
  (stable identity written before submit, validated after return);
- real episode `613f6893-5e2d-4fe6-a298-0576f3964983` in
  `issue70_phase2_disposable`, exact readback `content_len=290`,
  `disposable_episode_count=1` (duplicate submit returned the same work key,
  no second episode);
- `memory_work_status=completed`, `journal_state=completed`;
- competing OpenViking job `ovcg-07b4fa7ff3983f5d06d1a62e` stayed `pending`
  while Graphiti inference was in flight (global admission exclusion held).

## Temporal post-write validation (D)

`temporal_validation_integration.py` → `results/temporal_validation_result.json`:

- Transition contract (subject `Phase2 Service`, predicate
  `USES_AS_JOB_QUEUE_BACKEND`, Redis→NATS, `effective_at 2026-10-30T00:00:00Z`)
  bound pre-extraction; episode `6ccaf5aa-7008-42d9-9eed-8ada72893c97`
  ingested, journal completed.
- Live validator: exit 0, `PASS`, coverage complete, zero findings.
- Deterministic outcomes: `INCONSISTENT=1` (open-ended outgoing state
  overlap), `INCOMPLETE=2` (ambiguous subject name, `INCOMPLETE_EVIDENCE`),
  `INVALID_INPUT=3` (missing `transition.to`).

## Scope and residuals

- All real-Graphiti runs used the disposable graph only; `graphiti_live` was
  not mutated. The local reasoning model intermittently emits
  `</think>`-prefixed/empty JSON causing non-fatal Graphiti extraction
  retries (~60–90 s per real episode); retries succeeded and do not affect
  terminal invariants.
- Production activation, live FalkorDB writes, V2 enablement and PR #71
  adjudication remain Central/operator authorities.
