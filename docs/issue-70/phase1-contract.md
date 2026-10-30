# Issue #70: Phase 1 architecture and integration contract

Status: **Central-authored design for host-source integration, not an installed/runtime-qualified implementation.**
Tracker: https://github.com/fvanevski/opencode-operational-schema-guard/issues/70
Last design update: 2026-10-30

## Scope and source placement

Phase 1 covers source ownership, a stable capture contract, observe-only selection, and one shared
inference-admission/queue compatibility path. **It does not enable automatic Graphiti ingestion,
graph-edge mutation, graph recall injection, new global capture policy or production deployment.**

The tracker repository at `afbb1d2ccc803af82e07fef2036ee84b8b5ca7dd` is historical
OpenCode V1 code. Do not edit its runtime `index.mjs`, `lib/`, or install scripts as if
they were the running V2 plugin. No source home for the active V2 plugin, existing
OpenViking gate, Graphiti adapter/service, or validator is authenticated by this document.
Source provenance and a writable isolated integration copy must be established first.
If different components live in different source repositories, place implementation in
their actual source homes; this tracker branch carries the shared specification.
Do not create a second standing scheduler/service just to keep all files in this repository.

## Architecture decisions

1. **One admission owner.** The existing OpenViking deferred commit gateway's durable queue,
   shared interactive lease and scheduler-idle gate are the integration anchor, subject to
   host verification. Extend it to typed work classes `OPENVIKING_SESSION_COMMIT` and
   `GRAPHITI_EPISODE_INGEST`. Preserve existing public ingress/response semantics,
   queue persistence/recovery, writer identity, rollback and backup behavior. Reuse its
   SQLite store where safe; require a migration/backup plan if schema evolves. New
   implementations must not silently overwrite pending or historical work.
2. **Separate capture from inference.** A supported stock-V2 lifecycle hook observes
   eligible durable source references, applies operator policy, and performs bounded local
   classification/enqueue only. It never waits for Graphiti extraction, invokes LLMs,
   scans the entire session on each turn, or synchronously validates graph state.
   Session-compaction callbacks cannot assume `session.context()` includes pre-compaction
   messages. Use persistent message IDs/cursors and acknowledged delivery state;
   source references that cannot be durably resolved remain deferred/unsupported.
3. **Operator opt-in is a hard condition.** Default all new Graphiti capture and write
   behavior to disabled, with explicit eligible workspace/group/category allowlists,
   a config generation and disable switch. A model proposal is not authorization.
   Disallow raw conversations/tool outputs, credentials, secrets, arbitrary logs,
   disposable test output, speculative/conflicting unsupported assertions, and
   unrelated sensitive content. Reject/omit the event instead of logging rejected values.
   For OpenViking, retain its qualified baseline behavior unless the existing operator
   policy itself disables it.
4. **Stable source identity.** Use the accompanying `memory-candidate-v1.schema.json`
   as the phase-one canonical event envelope, with opaque source identifiers and
   a bounded canonical fact reference, not unrestricted source content. `event_id` is
   deterministic per namespace, source identity, category, canonical fact identity
   and extractor version. `policy_revision` and source timestamps are recorded
   separately from effective fact time. This schema is a proposed internal interface;
   reconcile field names with authenticated existing APIs before finalizing a migration.
5. **Durable work identity.** Queue `work_key = H(version, work_class, source_event_id,
   destination_scope, logical_payload_digest)`; OpenViking's existing idempotency key
   must retain its current semantics. Unique durable work-key admission coalesces repeat
   notifications. Persist queue work class, source ref, group/scope, requested operation,
   attempt generation, current status, timestamps, backend episode/commit identity,
   scheduler lease identity, and bounded terminal/error metadata. Do not store secrets,
   full transcripts or raw model traces in the queue.
6. **One global inference reservation.** Start with one exclusive inference-producing job
   across both backends. Admission requires the existing shared harness lease
   exclusion, independently observed configured scheduler idle state, quiet grace,
   healthy backend, and no unresolved prior exclusive job. Only a single serialized
   admission owner may grant the reservation. Own the exclusion for the **entire**
   actual inference-producing operation, including asynchronous Graphiti extraction.
   An acknowledged Graphiti queue submission is not terminal completion and must
   not release the reservation. A durable completion proof must bind the backend
   episode identity and persist/extract terminal state, not just a successful request
   or search result. If no reliable public/durable terminal observer is available,
   keep that backend disabled / job blocked and return the interface gap.
7. **Idle detection versus own activity.** Scheduler-idle checks and quiet grace are
   pre-admission criteria. Once a job is admitted, the scheduler activity generated
   by **that job** must not self-deadlock its terminal watcher. External interactive
   activity is still excluded by the shared lease. Do not mistake newly busy
   scheduler metrics for a reason to release the active token.
8. **Failure and restart semantics.** Durable status vocabulary:
   `queued -> admitted -> processing -> completed|failed|blocked_reconcile`.
   `blocked_reconcile` represents an ambiguous external acknowledgment,
   lost observer, stale process ownership or malformed scheduler input; it is not
   success and does not authorize a duplicate submission. On restart inspect
   the prior active identity and external terminal state before granting new work.
   Bounded retries apply only to provably unsubmitted/transient requests or
   idempotent externally inspectable operations. Retain failure/dead-letter and
   operator readback, and never erase historical OpenViking receipt authority.
9. **Fairness and control.** Existing OpenViking commitments must not starve when
   Graphiti is enabled. Use bounded queue-age based admission or a simple alternating
   policy, with cancellation and stopped/disabled backends represented explicitly.
   Do not introduce a heavyweight general scheduler, a new GPU worker, or a second
   persistent knowledge database. Provide redacted status and operator recovery;
   logging raw Graphiti payloads is prohibited.
10. **Validator ownership.** The existing read-only CPU-only
    `graphiti_temporal_validator.py` is the sole temporal validator for explicit
    exclusive-state transitions. A transition contract is derived from authoritative
    source/intent **before** graph inspection and retained with the job. Phase 1 may
    define its interface but must not invoke Graphiti inference or make a write.
    Phase 2 will call the validator only after verified asynchronous persistence;
    preserve result mapping 0 PASS, 1 INCONSISTENT, 2 INCOMPLETE, 3 INVALID_INPUT,
    including source/edge identifiers. Never auto-repair graph edges or retry until PASS.

## Required external interfaces to authenticate on the host

- Exact OpenCode executable, launched runtime version, source/plugin identity, actual
  V2 hook registration, plugin order, effective permissions, and config generation.
- OpenViking gate repository/source, service unit, ingress/proxy contract,
  on-disk queue schema, shared lease semantics, scheduler backend/metrics,
  persistence and backup/recovery mechanics.
- OpenViking launcher/shim active paths and proof that old and candidate execution
  cannot both own the same queue/admission resource.
- Graphiti MCP version, callable ingestion/readback/status APIs, job/episode
  identity and asynchronous terminal semantics, FalkorDB mapping, and model
  inference path. **Do not force arbitrary UUIDs into optional Graphiti uuid
  arguments** without proving support.
- Global opt-in and selective-group source of truth, allowed plugin cache/state
  paths and legacy OpenViking capture/recall precedence.
- Installed validator source, version/hash, JSON contract and known 0/1/2/3
  regressions.

## Phase 1 integration boundary

**A. Source map:** exact immutable identities, service/launch contracts,
ownership table, current config (non-secret), and data state. Distinguish
historical V1 and current V2. Stop before mutation if ownership is unresolved.

**B. Isolated implementation:** make minimal actual-source changes in disposable,
authenticated copies, not the running services. Wire default-disabled selection
against supported V2 APIs. Record durable message/cursor checkpoint semantics,
redacted candidate acceptance/rejection, deterministic event and job keys, and
a single shared gate queue/admission path. Use a fake Graphiti adapter or
disabled real adapter to exercise admission, but do **not** send real episodes
in Phase 1. If the gate cannot safely be evolved without migration, implement
a compatible adapter in isolation and return the migration decision; do not
deploy a parallel competing service.

**C. Regression:** execute the cases in `phase1-verification.md` against the
actual code, including the existing gate and one faithful service-backed
scheduler simulation or disposable local service where feasible. Record whether
the producer actually ran and bound a full inference reservation; a stub-only
PASS is not cross-backend production acceptance.

**D. Handback:** provide exact source/diff/archive identities, changed
repositories and file lists, test commands/exit codes, failure records,
current unchanged live identities, and the next decision. Central reviews
substantive changes and determines appropriate source-repository GitHub staging,
PR coverage and subsequent stage. No production rollout on Phase 1 authority.

## No-go decisions

- Do not import the V1 plugin or its retired exact-target/terminal guard into V2.
- Do not route Graphiti around the OpenViking admission owner.
- Do not release the resource token on HTTP/MCP queued acknowledgment.
- Do not loosen shared lease, permission, inference, publication, or
  backup/recovery controls to improve test success.
- Do not mutate the existing live SQLite queue, Graphiti/FalkorDB database,
  live OpenViking memory corpus or global OpenCode configuration.
- Do not claim Phase 2/3 or a full issue-70 PASS after Phase 1.
