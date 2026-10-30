# Issue #70 — Graphiti terminal-completion boundary

Status: verified upstream code observation; **not** a review of the local Phase 1 candidate
Date: 2026-10-30
Related phase-one authority: `docs/issue-70/phase1-contract.md`
Exact upstream source: `getzep/graphiti@72b5c59c06607e09ea855be61b6ff5a3446fc951`

## Inspected source facts

- `mcp_server/src/graphiti_mcp_server.py`, `add_memory`, lines 402–535:
  the public MCP tool queues background ingestion with `queue_service.add_episode`
  and returns `SuccessResponse(message="Episode ... queued ...")`. There is no
  returned durable job ID, per-job attempt generation, terminal receipt, or
  synchronous completion confirmation.
- `mcp_server/src/services/queue_service.py`, `QueueService`, lines 12–90:
  queues and worker-running flags are in-memory dictionaries keyed by group.
  `asyncio.create_task` starts processing; `task_done()` runs on both
  processing success and failure. A queue acknowledgment or drained queue
  cannot prove persisted graph success. Concurrent first enqueue calls also
  warrant a focused worker-start serialization review before relying on
  per-group single-worker exclusion.
- `mcp_server/src/services/queue_service.py`, lines 152–184:
  the background worker does await `graphiti_client.add_episode` and logs
  success/error, but does not expose the awaited outcome as a durable public
  per-job receipt.
- `mcp_server/src/graphiti_mcp_server.py`, `get_status`, lines 1146–1175:
  returns graph/database connectivity, not episode processing status.
- `mcp_server/src/graphiti_mcp_server.py`, `get_episodes` and
  `get_episode_entities`, lines 795–872 and 1060–1099: these expose
  persisted graph data/provenance, not authoritative absence of still-running
  background extraction or a durable queue-to-terminal lifecycle.
- `graphiti_core/graphiti.py`, `Graphiti.add_episode`, lines 1334–1559:
  direct core ingestion is awaitable and its completion can return concrete
  episode results; however that callable by itself does not solve ambiguous
  transport, crash-recovery, duplicate-submission or status/readback authority.
  The optional `uuid` path first reads the supplied episode UUID rather
  than necessarily creating that UUID; do not assume arbitrary caller UUID
  injection provides idempotent creation.

These observations corroborate the local handback's reported interface gap.
They do **not** independently authenticate the deployed Graphiti service/config
or the unreviewed local candidate patches.

## Decision: preserve Phase 1 and disable real writes

Phase 1 may be classified as `PARTIAL` on reported isolated evidence.
The shared coordinator's synthetic Graphiti adapter can test long-lived
reservation and fairness, but no real Graphiti episodes should be issued
through it until a terminal authority exists.

**Do not** treat MCP `add_memory` acknowledgment, `get_status=ok`, empty/
nonempty ranked search, `get_episodes` visibility alone, log completion,
or `asyncio.Queue.task_done` as a complete job receipt. Do not permit the
coordinator to release its inference reservation merely because any of those
conditions is observed.

## Minimal follow-on interface requirements

Before Phase 2 activation, implement or authenticate **one** small adapter
boundary owned by the source repository actually responsible for Graphiti
execution (not a second GPU scheduler). It may use a supported direct
`await Graphiti.add_episode` path behind the shared gate or a bounded
Graphiti-side typed completion/readback adapter. Choose only after review of
actual installed source and service ownership.

The chosen boundary must support:

1. A durable coordinator-owned work identity and group/scope binding, with
   an externally reconcilable episode/result identity.
2. Serialized global inference admission through the OpenViking-derived
   coordinator; no independent competing backend scheduler. Exclude bypass
   routes or represent their external inference activity explicitly.
3. An observed `processing` phase and terminal `completed` / `failed`
   status only after the awaited extraction plus graph-persistence boundary
   has definitively returned. Include a bounded per-job result/receipt.
4. Process-restart and transport-ambiguity recovery: reconcile prior
   submission/episode identity and worker ownership before retry or release.
   A job with unresolved external processing remains `blocked_reconcile`
   and holds the scheduling safety boundary until reconciliation/verified
   quiescence; it cannot auto-resubmit.
5. Cancellation/timeout semantics that do not leave a detached inference
   producer active after the token is released.
6. No silent assumptions that arbitrary caller `uuid` creates a new episode,
   that name/group are globally unique, or that graph search is exhaustive.
7. With the feature disabled, baseline OpenViking commit/recall and existing
   Graphiti MCP compatibility must remain unchanged.

**Acceptance exercise before enabling writes:** one real authorized
post-write Graphiti episode, exact source/group and persisted result binding,
an independently checked terminal state, explicit exclusive-state validator
result where applicable, then a second queued OpenViking job that must not
start before the first operation's inference lifetime ends. Include a
crash/ambiguous-response variant without duplicate external submission.
Keep production deployment and new opt-in permission separately authorized.

## Other Phase 1 follow-ups (not new campaigns)

- The handback reports **five** effective OpenCode plugins versus a historical
  six-plugin reference. Record exact active IDs and whether the missing one
  is a required dependency; a changed count alone is not a failure.
- The reported capture implementation accepts only operator-allowlisted
  structured tool metadata. This is an appropriate conservative candidate
  input, but it does not yet prove automatic capture of the whole intended
  set of durable decisions and architecture facts. Qualify the supported
  structured producer and expected coverage before Phase 2 opt-in.
- Offline validator results reportedly exercise exits 0/1/2, not a test
  asserting exit 3. Add this narrowly to later full acceptance.
- The local reported patches and archive have **not** been centrally
  inspected; do not commit or merge them from descriptions alone.
- Reported live database preservation is unverified; avoid interpreting
  unchanged plugin/config/source hashes as database-byte invariance.

## Evidence boundary

This note is an architectural acceptance constraint, not a production change.
No Graphiti MCP/server, coordinator runtime, host database, OpenCode plugin or
installed source was modified by this note. Further patch staging must use
complete authenticated patches/manifest and actual source-base identities.
