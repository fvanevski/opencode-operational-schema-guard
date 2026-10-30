# Issue #70 Phase 2 — direct, awaited Graphiti completion, not MCP queued acknowledgment

Central staged implementation: graphiti_terminal.py and CPU-only test_graphiti_terminal.py. **Candidate, not yet qualified against installed Graphiti.** Source home: separate continuation branch issue/70-graphiti-ingest derived from Phase 1 candidate and Codex P2 remediation at 9120c69d09b910942e80ae6b5f8e0b4d74c2b719. This is NOT PR #71's current head and does not silently broaden the draft Phase 1 PR.

## Source-specific choice and authority

Inspected getzep/graphiti@72b5c59c06607e09ea855be61b6ff5a3446fc951: MCP add_memory -> QueueService.add_episode -> background asyncio task; add_memory returns queued and has no durable per-attempt terminal receipt. Meanwhile direct Graphiti.add_episode (graphiti_core/graphiti.py, 1334–1586) is awaitable and returns AddEpisodeResults including episode.uuid after extraction, resolution, and graph persistence. Passing an arbitrary uuid is NOT accepted as creation semantics; upstream checks get_by_uuid for non-null uuid.

**Choose direct core awaited ingestion under the existing OpenViking-derived gate EX flock**, not the MCP queued route and not another GPU scheduler. Backend Core client initialization and exact group-specific readback must use the currently installed Graphiti deployment/config; this upstream source is a design input, not an authenticated installed-version pin.

## Durable boundary and fail-closed behavior

- An immutable verified EpisodeEnvelope is constructed ONLY by a configured source attestor. Stage-one tool metadata is agent_candidate and stays deferred_unverified. No agent-supplied basis/evidence/time qualifies by shape alone.
- IngestJournal uses the gate's existing SQLite connection; reserve immutable source/group/payload before side effects. BEGIN IMMEDIATE transitions reserved -> processing BEFORE awaited Graphiti.add_episode. Duplicate work key never calls Graphiti twice; contradictory content/group rejects. Process death leaves processing. On restart processing is blocked_reconcile; no blind retry.
- The synchronous adapter holds the gate's existing exclusive resource lease for the full awaited extraction and exact UUID/group/name/content readback. Only after both complete is the durable terminal receipt sealed. A dropped response after graph effects blocks (even when the episode can be seen, it is not necessarily quiescent).
- The existing gate Worker._process_graphiti currently writes backend_identity AFTER submit, which is too late for a crash gap. Phase2 integration MUST first write stable backend identity equal to the work key in SharedWorkQueue.processing() before invoking adapter.submit; after return validate identity; poll persisted terminal and finish. In a restart, reconcile a blocked row only if its immutable owner ledger independently proves completed AND exact producer quiescence. For unproven rows, retain blocked_reconcile and sticky interactive launcher admission.
- Do not use Graphiti MCP queue size, get_status, ranked search, or mere episode visibility as terminal proof. Never release flock and terminal admission if a detached Graphiti inference producer can remain running.
- Existing Graphiti CLI/MCP routes that may issue independent inference must be disabled, gated, or incorporated into the global admission contract for any live activation; disposable isolated Graphiti is adequate for qualification, not production proof.

## Work identity and source content

The Phase 1 memory-candidate-v1 wire contract contains fact_ref but no content. Do not invent text based on that reference. Define a bounded source-authorized resolution boundary that reads a genuinely authenticated source record, verifies declared workspace/group/event identity and episode text, derives observed/reference times from authoritative evidence and returns immutable EpisodeEnvelope. Prefer one concrete supported tool/source type initially, not a generic model trust framework. Do not read raw transcripts, credentials or arbitrary tool results into Graphiti. Operator opt-in and source policies remain disabled by default.

Promote deferred memory_work to queued only upon independent attestation and durable source-event conflict checks; maintain the existing unique source+scope index. Implement this under a single SQLite transaction with a distinct admission record. Model-proposed or forged authority must never self-promote. Remember that Graphiti.add_episode may include nontrivial LLM/embedding work, so CPU-only stubs cannot establish actual extraction correctness.

## Cohesive local integration and acceptance

Integrate the Central code into copies of the verified gate and current Graphiti core, without updating live installed packages. Qualify actual Graphiti exact signatures, graph driver and EpisodicNode.get_by_uuid readback, same-group binding, reuse of gate SQLite, and global launcher exclusion. Add read-only status/recovery flow for terminal receipts. Exercise two distinct Graphiti work keys, duplicate/contradictory source, dropped response after graph write, process restart, cancellation and timeout, Graphiti/OpenViking competing admission with idle metrics, exclusive-state contract and validator outcomes 0/1/2/3. At least one genuine source-authorized episode should be ingested into a **disposable nonproduction graph** using configured local model(s), verifying exact persisted Graphiti episode and temporal validator when an exclusive transition is present. GPU use is optional only in a separate explicitly marked host-bound phase, not accidental during CPU-only tests.

Preserve all Phase 1 gate/source-home tests. In this one campaign also run the Codex P2 updated source-home preflight and its 10 tests at exact Phase 1 code; publish host evidence to issue/70 branch without altering Phase 2 source. Keep PR #71 draft until Central independently reviews its exact head.

Graphiti automatic live writes, V2 plugin enablement, production FalkorDB, source/global config, and real memory mutation remain out of scope. Do not create another PR until Phase 2 candidate is review-ready, and do not merge or deploy.
