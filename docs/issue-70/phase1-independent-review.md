# Issue #70 — Independent Phase 1 archive review (2026-10-30)

Disposition: **CHANGES_REQUIRED**, candidate preserved; no host deployment or PR approval.
Source of review: user-provided `issue70-phase1-handback.tar.gz`, SHA-256
`caeeddc5b48f303fa3ae489de1c416fe41bdcfa50d3619360fb904761f76e705`.
Exact source-base identities remain **host-reported**, not independently materialized
in Central. The complete pre-edit production source trees were not included.

## Authenticated artifacts

- Archive members: `HANDOFF.md`, `proposed-config.md`, `manifest.json`,
  `patches/gate.patch`, `patches/openviking-v2.patch`. No unsafe archive paths.
- `gate.patch` SHA-256 `6a6640598125df4cf40c6c10eb736013806a4dd8a234854c98eaba543e028f77`.
- `openviking-v2.patch` SHA-256 `a4cd60e34ed50757ffc5bf99986a054fdee7055e729e155f3fc7da14803fea85`.
- Every newly added module/test/schema reconstructed from these diffs matches
  its manifest candidate SHA-256; both schema copies match.
- Locally replayed `node --test tests/candidate-capture.test.mjs` against the
  extracted self-contained JS module: **6/6 PASS** under Node v22.16.0.
- `py_compile` passed for the new `shared_work.py`, `test_shared_work.py`
  and `test_service_mixed.py`. The complete gate 32/32, legacy OpenViking
  24/24, compaction 7/7, offline validator 6/6, HTTP scheduler simulation
  and patch dry-runs remain **local-agent-reported**, not replayed centrally
  because the original source/test dependencies were not provided.
- The host report indicates stock OpenCode v2.2.3, five explicitly configured
  plugins, ninfer inference, no activation, and no live database snapshot.
  Current host identities are not independently read back by Central.

## Blocking / important source findings

### B1 — Metadata is promoted to verified source authority without verification
`openviking-v2.patch`, new `candidate-capture.mjs`,
`candidateFromToolEvent`: after checking a tool name against a policy allowlist,
the candidate gets `authority.basis="source_verified"`, confidence,
`evidence_ref`, `observed_at` and optional exclusive transition entirely
from tool-provided metadata. The module does not verify that the referenced
source exists, is current, supports the asserted fact, or has the supplied
authority/time. The schema and queue validator check shape, not truth or
source binding. Root-cause correction: establish an authenticated,
tool-specific source-reference verifier/attestation boundary, and derive
source authority/time/confidence independently of arbitrary candidate
metadata. Otherwise classify as unverified candidate and **do not schedule
Graphiti inference**. Add negative forged-source and forged-time tests.

### B2 — Same source event can produce multiple work keys
`candidateFromToolEvent` accepts any syntactically valid caller-supplied
`logical_digest`. `shared_work.work_key()` includes that digest in the
deduplication key, while `event_id` does not. Central independently
reproduced two fully valid candidates with identical `event_id` but
different logical digests. These would not coalesce as one source event.
Root-cause correction: compute the semantic digest from a canonical
source-verified envelope, not caller-provided arbitrary bytes; enforce a
durable unique source-event+scope admission key with conflicting-payload
detection, and test crash/retry and same-event/different-digest submissions.

### B3 — Inflight OpenViking continuation appears to bypass the shared lease
`gate.patch`, `Worker.tick`: the new early branch for existing
`inflight`/known `task_id` calls `_process(inflight)` before the
normal scheduler check and (per patch placement) ahead of the usual
exclusive lock acquisition path. Ignoring self-produced scheduler activity
is necessary, but bypassing the shared lease is not. The original full
`Worker.tick` source was not supplied, so **confirm exact control-flow
placement against the authenticated base** before changing code.
Required invariant: every submit, poll and terminal-reconciliation path
owns the same live shared admission lease for the full inference window;
own scheduler metrics must not self-deadlock that path. Add a regression
using a competing interactive lease holder during an existing task.

### B4 — Long-lived ambiguous inference cannot be released as safe to start
`_process_graphiti` blocks unresolved records on timeout/interrupt and
`SharedWorkQueue.unresolved()` prevents new gate admissions. But the OS
`flock` held by `Worker.tick` is released when processing returns. If a
real Graphiti job continues asynchronously after that boundary, an
interactive harness governed **only by the shared flock** can subsequently
start even though inference is still running. Prior to Phase 2, ensure
terminal/cancellation proof or a durable gate-aware interactive admission
interlock protects this boundary. A blocked DB row alone is not an OS lease.
This is a *future real-adapter activation blocker*, not proof that the
disabled synthetic Phase 1 path overlapped.

### I1 — Legacy global unknown-row blocking changes availability
`gate.patch`, `has_unknown_claim()` and `Worker.tick` reject every
subsequent admission whenever **any** legacy intent is `unknown`, even
with Graphiti disabled. Confirm whether historical unknown rows were
previously recoverable without globally stopping new legacy work.
Preserve no-blind-retry semantics for the ambiguous identity while
allowing unrelated safe commits only if current resource ownership
is independently established. Include a prior-existing-unknown-row
nonregression.

### I2 — Error classification is too narrow around legacy commit POST
`Worker._process` distinguishes missing response and acknowledged HTTP
success without task ID, but an HTTP error returned after a side effect
may also be ambiguous depending on backend semantics. Inspect exact
original body/error contract and classify typed terminal vs
ambiguous accepted vs provably non-submitted, with bounded restart-safe
reconciliation. Do not turn all failures into blind retries.

### I3 — Capture event-loop backpressure / failure isolation
`openviking-v2/index.mjs` places `await observeCandidate(event)` directly
in the existing sequential subscription loop, ahead of the pre-existing
OpenViking event handling. This can delay old events by the bounded
network timeout and, if policy loading throws unexpectedly, can abort
the subscription. Preserve event order/identity but isolate optional
capture delivery from baseline OpenViking callbacks. Bound pending
work and test slow/unavailable endpoint and observer failure.

### I4 — Disabled-by-default dependency and credential posture
`openviking_commit_gate.py` imports `shared_work` at module load,
which imports `jsonschema` even when `graphiti_enabled=false`;
existing deployments without that package can fail at startup despite
the feature being disabled. Require an explicit dependency preflight
or lazy optional import before acceptance. The observer currently uses
`OPENVIKING_ROOT_API_KEY` for optional capture submission; do not
expand root-level credentials into an untrusted plugin configuration.
Use an appropriately scoped, independently authenticated route,
or keep capture submission disabled.

## Remaining non-blocking scope decisions

- The observer accepts only structured tool metadata from explicitly
  allowed tool names. This is safe as a candidate boundary but does
  **not** yet demonstrate broad automatic extraction of durable
  decisions/entity relationships from ordinary OpenCode sessions.
  Record Phase 1's narrow coverage; do not implicitly satisfy issue
  #70's complete auto-capture criterion.
- Reported five-plugin configuration requires identifying which
  historical sixth plugin is absent and whether it is actually required;
  raw count difference alone is not a blocker.
- Offline temporal validator exit 3 was inspected but not independently
  exercised. The fresh real post-write validator acceptance remains open.
- Reported source/launcher/config unchanged hashes are not proof that
  live FalkorDB, OpenViking memory or SQLite queue bytes were unchanged.
- The upstream Graphiti MCP background queue has no durable per-job
  terminal receipt; `docs/issue-70/graphiti-terminal-boundary.md`
  remains governing. Automatic Graphiti submission stays disabled.

## Disposition and economical continuation

Do **not** merge the raw candidate diffs or promote the install.
Preserve the exact imported patches and their provenance as review
inputs; the baseline host sources are persistent non-Git files.
Use one bounded Central-authored correction packet for B1/B2/B3 and
I1/I2/I3/I4 as they apply to Phase 1. Local Build may integrate that
packet in an isolated copy of the *actual* source, fix narrowly
demonstrated within-scope errors, and return exact full-file/diff/CI
evidence. Avoid additional unrelated issue/PR fragmentation.

A valid Phase 1 PR should carry source-bound implementable code,
regressions, provenance, disabled configuration and rollback contract
in an explicitly designated current source home. The historical V1
root is not proof of current installed stock-V2 source ownership.
Graphiti terminal observation, real authorized ingestion and
production activation are later, separately qualified boundaries.
