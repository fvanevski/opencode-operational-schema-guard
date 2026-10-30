# Issue #70: Phase 1 verification matrix (source-bound, pre-activation)

Authority: `docs/issue-70/phase1-contract.md`. Each case requires actual
source identity and a concrete command/result; mocks alone are not live
acceptance. Use disposable state. Preserve original OpenViking regression
entrypoints instead of replacing existing assertions with convenient fixtures.

| ID | Scenario | Required observable result |
|---|---|---|
| OWN-01 | Verify active OpenCode V2 plugin sources, six-plugin ordering, runtime, gate, shims, Graphiti and validator | Exact source/launch identities, effective non-secret config and ownership table; V1 tree explicitly historical |
| OPT-01 | New feature disabled at startup and config reload | No Graphiti event, episode or inference; existing OpenViking behavior unchanged |
| OPT-02 | Explicit scoped opt-in, disallowed workspace/group/category | Only allowed durable references become bounded candidates; rejected input is not logged or stored |
| OPT-03 | Secret, raw log, speculative fact, fixture, unsupported source | No candidate/job persistence and no leakage in rejection/error metadata |
| EVT-01 | Duplicate hook delivery and same source after process restart | Stable `event_id`/deduped work key; exactly one accepted durable candidate |
| EVT-02 | Compaction and continuation | Durable checkpoint/cursor covers original source; no dependence on post-compaction context segment alone |
| EVT-03 | Hook latency and network loss | Hook does not perform inference; bounded work; safe drop/defer and typed diagnostics |
| Q-01 | Legacy OpenViking ingress, coalescing, queue drain and completion | Existing response and durable authority remain equivalent |
| Q-02 | Mixed OpenViking and disabled/synthetic Graphiti work | One shared queue, no second independent scheduler, bounded status transitions |
| Q-03 | Duplicate and ambiguous backend acknowledgement | No blind resubmission; `blocked_reconcile`/readback until terminal identity established |
| Q-04 | Long-running Graphiti processing after queued ack | Global inference reservation remains held until real terminal proof (simulate async worker) |
| Q-05 | Interactive harness lease held / busy inference metrics / quiet grace | Admission withheld; resource/lease owner not bypassed |
| Q-06 | Unavailable or malformed scheduler data | Fail closed, no new inference execution |
| Q-07 | Coordinator crash between enqueue/submit/receipt persist | Durable identity-safe recovery; no duplicate external work |
| Q-08 | Existing failed/dead-letter cases and operator status | Retained legacy recoverability and redacted bounded status |
| Q-09 | Fairness with queued work for both backends | Neither eligible class starves under finite processing; existing OpenViking not displaced |
| Q-10 | Stop/cancellation/backend disabled | No orphan inference ownership and no accidental episode submission |
| RES-01 | Full inference reservation vs pre-admission metrics | Self-created GPU activity does not deadlock active job; external contender remains excluded |
| SEC-01 | Role permissions, opt-in, queue state and backups | No live config/service/data mutation or expanded OpenCode permissions |
| ROL-01 | Stage candidate and restore disposable old version | Documented compatible rollback without loss of historical queue facts |

## Evidence qualification levels

- `DETERMINISTIC_PASS`: focused unit/contract scenarios with isolated fixtures.
- `SERVICE_BACKED_PASS`: faithful disposable gate plus real/fake controllable
  inference scheduler, process restart and mixed-work resource ownership timeline.
- `LIVE_READ_ONLY`: authoritative current service identities/config/queue posture
  observed without mutating production.
- `UNQUALIFIED`: full Graphiti fresh post-write completion, temporal validation,
  graph recall and production activation remain for later stages.

Always return which level supports each assertion. A fully mocked scheduler
cannot establish production no-overlap. An arbitrary Graphiti `queued`
acknowledgment cannot establish a terminal completion. For a production
service whose state cannot be observed safely, record `BLOCKED` with an exact
missing interface rather than inventing a success.

## Handback minimum

```text
ISSUE_70_PHASE1=PASS|PARTIAL|BLOCKED|FAIL
TRACKER_BRANCH=issue/70
TRACKER_SPEC_SHA=<verified full commit>
LIVE_SOURCE_MAP=<paths/repos/service units/exact immutable IDs; redacted>
LIVE_CONFIG_IDENTITY=<hashes/effective policy without credentials>
CANDIDATE_SOURCE_ROOTS=<isolated paths>
CANDIDATE_DIFFS=<paths, hashes, changed-file inventory>
OPENVIKING_REGRESSION=<results with commands>
CAPTURE_REGRESSION=<results>
COORDINATOR_REGRESSION=<results and ownership timeline>
INFERENCE_BACKEND=<verified active backend + metrics contract>
GRAPHITI_ASYNC_TERMINAL_INTERFACE=<verified capability|UNVERIFIED|BLOCKED>
LIVE_PROTECTED_SURFACES_UNCHANGED=yes|no|unverified
PRODUCTION_DEPLOYED=no
GRAPHITI_AUTOMATIC_WRITE_ENABLED=no
NEXT_CENTRAL_DECISION=<source placement / missing interface / review>
```
