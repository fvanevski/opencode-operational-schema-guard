# Issue #75 Integrated Recovery Evidence Packet

Campaign: `issue75-integrated-oEAmIHhQ`
Timestamp: `2026-11-02`
Target Repository: `fvanevski/opencode-operational-schema-guard`
Branch: `issue/75`

## Summary of Accomplishments

### 1. Coherent Host Deployment & Quiescence
- Stopped all dependent daemons (`openviking.service`, `openviking-commit-gate.service`) under verified zero pending tasks.
- Created WAL-consistent SQLite snapshots (`gate-quiesced.sqlite3`, `receipts-quiesced.sqlite3`) and rehearsed disposable restore with verified logical parity.
- Atomically deployed 7 backend and gate source files (`app.py`, `sessions.py`, `session.py`, `session_commit_msg.py`, `admission_hold.py`, `openviking_commit_gate.py`, `shared_work.py`).

### 2. Durable Hold & Rejected-Attempt Repair
- Initialized `recovery_hold` singleton with `held=1`, preventing automated draining while holding candidate state safely.
- Atomically repaired historical rejected request (`cx-01a19a53-df02-7e13-80a2-0bc4ffa9b3df`, `f606b06ba1bcee883fad79fbb1f6f7d6070dab887941580a7506f4ddfbc571fa`) under canonical lock:
  - Transitioned intent to terminal `state='dead'`, `last_error='backend_preacceptance_rejected: owner audited'`.
  - Latched attempt to `resolved=1`.
  - Preserved full audit trail in `rejection_repairs`.
  - Audited all 1,326 other intents and 84 other commit attempts: verified 100% byte-for-byte identical to baseline.
  - Zero fabricated receipts, tasks, archives, or backend executions.

### 3. Tenant Binding & Security Gates
- Added worker pre-claim binding validation in `openviking/server/routers/sessions.py` to authenticate tenant identity prior to attempt latch creation.
- Negative controls: missing auth, spoofed tenant account/user, duplicate headers, and mismatched peers fail closed with 400 before any attempt row is inserted.
- Unpinned ROOT credentials fail closed with 503 (`ROOT gate owner not configured`).

### 4. Graphiti Extraction Qualification & Think-Tag Sanitization
- Root cause of 0-entity extraction identified: unthinking reasoning models (`enable_thinking: false`) hit the negative token path in 8 tokens, while local inference engines emit `<think>...</think>` or orphan closing `</think>` tags that broke bare `json.loads`.
- Added runtime think-tag and markdown code fence stripping in `run_graphiti.py`.
- Preserved reasoning capability with `preserve_thinking: false` in LiteLLM extraction configuration.
- Executed full qualification sequence on fresh group `g_issue75_qual_final_oEAmIHhQ`:
  - 30s quiet grace verified under canonical EX lock (`/run/user/1000/openviking-agent.lock`).
  - Episode submitted via `Memory.drain()` and materialized 3 nodes (`release pipeline`, `smoke test suite`, `release artifact`) and 3 edges (`PUBLISHES`, `RUNS`, `PRECEDES`).
  - Independent fresh-process recall verified in Node.js: source attribution matched (`sourceRef`, `evidenceClass`), wrong-group negative control returned 0 facts, search latency was 39.28ms (< 300ms budget), and stock OpenCode V2 plugin context hook injected `[GHDEV_GRAPHITI_CONTEXT]` cleanly.
  - All temporary workers terminated, canonical lock released, and `litellm-proxy.service` restored active.
  - Historical graphs (`g_issue75_test`, `g_issue75_remediation`, `ghdev_gh_mcp`) remain 100% intact.
