# Issue #81 — Review readiness (shared-MCP review gate)

Campaign: `ISSUE81_SHARED_MCP_REVIEW_GATE_V1`
Source head: `7a82f0099bd5c281a12d2377326e0671aa8d5b33` (PR #89 DRAFT, base `main` `9a27b73`)

## 126-item human-review packet and ratified precision target (read-only revalidation)

- Frozen input `operator_review_packet_126` (private 0600 on host at
  `<scratch>/../issue81-fresh-native-acceptance/precision/operator-review-packet-126.json`):
  re-hashed at this gate → SHA256 `c110acd3bcc9fa6e62f347c285bd61fd542e2a826634fa1134bac78a1f204e52`
  = **MATCH** with the frozen receipt published in `81-corrective-evidence-v1/input-identities.json`
  and `81-git-procedure-selection-v1/safety-and-precision.json`.
- Structure reverified: 126 items; every item's `human_verdict` object carries all six subfields
  (`grounded`, `authority_correct`, `scope_correct`, `useful`, `evaluator_id`, `comment`) and
  **all 126×6 subfields are null** → `AWAITING_OPERATOR_ADJUDICATION`.
- Ratified precision target: `>=0.90` grounded precision over the 126-item packet
  (operator-ratified).
- **`HUMAN_PRECISION=UNVERIFIED`** — unchanged; this gate neither fills nor waives the verdict
  fields, and does not adjudicate.

## Hook p95 / 300 ms context allowance

- **`HOOK_P95=UNVERIFIED`** — exact native hook start/end p95 was not independently measured in
  this gate; no inference is made from total `Memory.search` timing.
- Head-of-line (HOL) analysis for the new per-client queue:
  - The `prompt` hook fires `memory.search(...).catch(() => [])` **without awaiting** (fire-and-forget
    prefetch). The prompt hook's own start/end duration is unchanged by the queue, so the queue does
    not extend the prompt-hook p95.
  - The `context` hook consumes the prefetch with a hard race:
    `Promise.race([selected.request, timeout(300 ms) → []])` ("Never wait for Graphiti beyond this
    context allowance"). The 300 ms allowance is a cap on context-hook waiting, not a measured
    hook duration.
  - With the queue, a second overlapping prompt's prefetch remote phase (search_memory_facts +
    get_episodes) starts only after the first prompt's remote phase completes. If the first
    search's remote phase consumes most of the second prompt's 300 ms window, the second context
    build resolves with `[]` for that turn (recall freshness loss for the overlapping prompt),
    while the hook itself still finishes inside the allowance.
  - **Report:** HOL waits can reduce *recall availability* for prompts that overlap a slow remote
    search (the prefetch may lose the 300 ms race and yield an empty context for that turn). They
    do **not** push hook start/end p95 beyond the 300 ms allowance, and the allowance value is
    unchanged by the patch. This is a recall-freshness trade-off bought by eliminating the known
    concurrent-MCP-call service instability; no timeout, selector, or guard was changed.

## Readiness statement

- Source identity: kickoff SHA, main base, and PR #89 OPEN/DRAFT verified at the remote; exact diff
  scope confirmed (queue + 2 tests + handoff only).
- Focused suites: 32/32 PASS (producer exit 0), including the two new shared-client regression
  tests; 7/7 independent overlap invariants PASS (maxActive=1, FIFO, single-shot, failure release,
  init-once, sequential invariance).
- Historical 13/16 source-selection qualification preserved and reused as corroboration (not
  re-run).
- Fixture-name inventory complete (this packet); no active opaque fixture creation names remain;
  all legacy opaque IDs classified PRESERVE_IMMUTABLE with recommended future labels for Central.
- 126-item packet revalidated byte-identical; HUMAN_PRECISION and HOOK_P95 remain UNVERIFIED.

**Blocking findings: none.** Non-blocking residuals: (a) operator adjudication of the 126-item
packet, (b) independent hook p95 measurement if Central requires it, (c) Central-owned naming
edits before final issue-level review, (d) two enabled legacy path units with inert/absent watch
paths (`ghdev-cur81-holdout-4c3ab514.path`, `ghdev-curator81t-qual.path`) — host cleanup is
operator-owned and out of scope here.

PR #89 remains DRAFT; no merge, deploy, or issue closure is authorized by this gate.
