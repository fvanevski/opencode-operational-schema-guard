# Issue #92 — Utility-recovery qualification (sanitized evidence)

Branch `work/91-memory-utility-r1` | PRIMARY_AGENT=Hermes/Build
REQUIRED_HEAD (source) `5a0d2ddb0cb2284439740b036a587016a42a50b7` | one EX-admitted exposed run + one untouched prospective freeze

## RESULT = **READY_FOR_FINAL_PROSPECTIVE_APPROVAL**

Central's utility-selection correction (finite-batch.mjs `finiteBatchUtilityPrompt`, blob `358aa21`)
recovers **3 of the 6 previously-missed durable-fact categories** in the exposed run, with **0 control
pollution, 0 duplicates, and no privacy breach**. A fresh untouched v7 prospective cohort is frozen and
prepared (not executed).

### A. CPU verification (source HEAD `5a0d2dd`)
- `node --check` finite-batch.mjs / .test.mjs: **rc=0 / rc=0**
- `node --test` finite-batch: **rc=0** (68/0). Two **Central-authored test-literal defects** fixed
  locally (disclosed, unstaged, source unchanged): the new tests assert `/never automatic approvals/i`
  and case-sensitive `/DO NOT/`, but Central's own prompt says "not automatic approvals" and "Do NOT
  classify…" — corrected to `/not automatic approvals/i` and `/Do NOT/` (no semantic/weakening change).
- `node --test` claim-evidence / long-prompt / stage / acceptance: **rc=0** each
- Python EX bridge: **rc=0** · `npm run check`: **rc=0** · `npm test`: **524 pass / 0 fail**

### B. Exposed functional qualification (one EX-admitted inference, batch `fcb55f58`)
Group `graphiti-adr92-exposed-utility-final-r1` (fresh, was empty). 1 inference, 41 model calls
(discovery 26 / utility 10 / support 4 / arbitration 1), 0 errors; settled by reconcile-only (no replay).
**3 of 6 valuable recovered; 0 of 3 controls persisted (no pollution); 0 duplicates; no secret values
persisted (v-08 credential fact is location-only).**

| Case (v6 source) | Category | v6 outcome | new outcome |
|---|---|---|---|
| v-03 mcp-mux clone | repo-location | deferred | **PERSISTED** `6cc0c871` |
| v-04 post-key gate health | post-change state | deferred | **PERSISTED** `29c51bc3` |
| v-07 dovi/libdovi install | package-install | deferred | deferred (`transient_execution`) |
| v-08 opensubtitles creds location | credential-location | deferred | **PERSISTED** `5cbff296` (no values) |
| v-09 probe MCP → 8002 | config-endpoint | deferred | deferred (`review_uncertain`) |
| v-10 queue_empty operator rule | conditional rule | deferred | deferred (`source_quote_utility_transient_execution`) |

**Recovery is real but partial:** the utility fix now credits *location / state* facts (repo-clone,
gate-health, credential-location) but still under-credits *install*, *config-endpoint*, and *conditional-rule*
classes (v-07/v-09/v-10). No privacy/authority breach, no control pollution. This is a meaningful
recovery across distinct previously-missed types → justifies preparing the fresh freeze.

### C. Fresh untouched v7 prospective freeze (CPU-only, NOT executed)
20-case native cohort: **10 valuable** (diverse durable types: config, location, architecture, install,
operational, conditional) + **10 controls** (task-only, transient, weak). Real native OpenCode
session/message IDs, UTF-8 SHA-256, source locators, observed times. Excludes v2–v6/B/exposed overlap,
OpenViking echoes, synthetic labels, and secret-bearing sources.
- **manifest** `d111717b26e4024698325bfdc23df7790b299a1597d21714989a3dce1c8047f1`
- **label freeze** `7cbea619ff650850a71b22fa071ff31723aeba0ededd7a10b89f0bd98310b121`
- staged 20 events / **18 clusters** (≤24) in fresh `state-v7` (0700); group
  `graphiti-adr92-a3-prospective-v7` = **0 episodes**; once-only marker **absent**; EX preflight **PASS**;
  8-arg scorer **fails closed** pre-inference (`independent_pre_inference_ratification`).

### Prepared launch (not executed)
```
V5_HOST_APPROVED=1 python3 /tmp/opencode/issue92-a3/a3-v7-prospective-launcher.py
```
Bound to source `5a0d2dd` (finite-batch.mjs `358aa21`), bridge `004188b1`, treatment 24/72/3600,
`chat-fast@127.0.0.1:8002`, state-scoped once-only marker `state-v7/.v7-prospective-ran`, canonical
`issue92-a3-score.mjs` (8-arg, fails closed pre-inference).

### Historical state unchanged
S1–S6, v3, v4, v5 (7 eps), v6 (3 eps), exposed-final-recall, and this run's exposed-utility group (3 eps)
all preserved; v6 manifest `70f02cef` unchanged. Single sanitized evidence-only commit. No PR/merge/deploy/
issue closure.
