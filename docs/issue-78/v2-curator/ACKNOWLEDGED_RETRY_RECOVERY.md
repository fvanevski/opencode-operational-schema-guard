# Issue #81 — Acknowledged Graphiti task recovery (one-use)

This bounded source correction handles a **previously acknowledged** `add_memory`
request whose original asynchronous task is no longer live after a backend
generation change. It does **not** make the Graphiti queue durable and does not
claim that the original request was never submitted.

## State and authority

`queued → retry_authorized → submission_unknown → queued → persisted`

- `queued → retry_authorized`: operator-attested local CAS after independent
  log/process evidence, positive remote inventory readback and explicit
  acknowledgment that partial graph effects cannot be excluded.
- `retry_authorized → submission_unknown`: **only the EX-admitted worker**,
  after rechecking source/duplicate/remote identity. This stages a durable
  second-write intent and irrevocably spends the one-use authorization before
  `add_memory` is called.
- A crash or ambiguous ACK after the second intent leaves
  `submission_unknown` or `queued` for read-only reconciliation. There is
  **no automatic third submission**, no bypass of admission or review edits.
- The existing `failed_extraction` and `reconcileNeverSubmitted` contracts
  remain unchanged. A failed extraction record is not retry-eligible.

## Host evidence and dry-run

The production utility is `acknowledged-retry-cli.mjs` in this directory.
It does **not** submit remotely. Before using it on production, install the
exact reviewed/merged source (core + worker + curator CLI + utility) through
the existing rollback-aware stock-V2 deployment procedure. Never mark a
review `retry_authorized` while the installed worker still rejects this state.

Create a private, 0600 JSON evidence file, with these fields grounded in the
host's actual logs and independent backend/task inventory:

```json
{
  "kind": "acknowledged_graphiti_orphaned_task",
  "identity_binding": "anonymous_group_fifo_inference",
  "acknowledged_submission": true,
  "prior_process_retired": true,
  "partial_effect_risk_acknowledged": true,
  "journal_sha256": "<64-hex>",
  "diagnostic_manifest_sha256": "<64-hex>",
  "original_ack_at": "<the EXACT queued audit UTC timestamp>",
  "process_retired_at": "<observed prior backend retirement ISO timestamp>",
  "observed_at": "<remote/process readback ISO timestamp>",
  "prior_backend_pid": 11111,
  "current_backend_pid": 22222
}
```

PID placeholders above are **not** run instructions. Verify old PID really
retired and the current backend is the intended one. The utility checks
PID liveness on production and verifies canonical curator service state,
but cannot independently prove an anonymous upstream FIFO event identity.
The operator must assess residual partial-graph and provenance risk.

From the installed plugin directory, first run:

```bash
node docs/issue-78/v2-curator/acknowledged-retry-cli.mjs \
  --group ghdev_gh_mcp \
  --state-dir /home/filip/.local/state/ghdev-graphiti \
  --endpoint http://127.0.0.1:8766/mcp \
  --review <FULL_64_HEX_REVIEW_ID> --revision <EXACT_REVISION> \
  --evidence-file <PRIVATE_ABSOLUTE_EVIDENCE_JSON>
```

Require `DRY_RUN_READY`, exact remote inventory and exact current state.
After explicit operator approval, use the SAME command plus:

```bash
--apply --attest-acknowledged-retry --ack-partial-effects \
  --expect-remote-sha <DRY_RUN_REMOTE_INVENTORY_SHA256>
```

The apply operation only records **one local authorization**. Because the
existing curator wrapper holds EX, it can then resume under that lease and
submit the authorized retry once. Capture its actual terminal remote episode
UUID, source index and historical-episode preservation.

Stop instead of applying if remote target identity appears, original backend
has not retired, partial graph effects are suspected, current source/runtime
is not at the reviewed commit, EX is owned by a different process, or the
review revision/dry-run fingerprint changed.

## Boundaries

A 1000-episode MCP readback is bounded, so the utility rejects a saturated
inventory rather than treating absence as proof. Remote absence by itself
is never proof that an acknowledged submission had no graph side effects.
The terminal prior recovery record must not be modified.

This change adds a one-use operator recovery route. Durable queue storage,
direct per-task completion receipts and backend idle-retirement policy remain
separate upstream reliability concerns. They should be pursued on measured
evidence, not smuggled into this recovery PR.
