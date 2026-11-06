# 81-integrated-recall-acceptance-v1

One sanitized evidence packet for the Issue #81 consolidated
recall-association regression and installed-Graphiti readiness campaign,
per `docs/issue-78/v2-benchmark/LOCAL_AGENT_CONTRACT_INTEGRATED_ACCEPTANCE.md`.

- Source stage commit: `52863aed0498521b181f44bbb454ce314d60fa8c`
  (branch `issue/81-recall-acceptance`), base
  `ef1d62de1942061bb4441fc3606996a6faa7d327` (merged `main`).
- Result: `READY_FOR_POST_EXIT_OPERATOR_RUN` (see `handback.md`).
- Evidence classes are identified per the contract:
  - **CPU-only:** `cpu-validation.md` (frozen committed source, 7/7 exit 0).
  - **Disposable host:** `native-probe-traces.md` + `probe-traces.jsonl`
    (isolated config/DB; branch plugin bytes; recall-only against the
    production graph; no production activation) and
    `latency-aggregates.json`.
  - **Live Graphiti / host:** `ex-wake-status.md` (read-only service,
    unit, queue, and terminal-receipt inspection) and
    `rollback-inventory.md` (installed bytes + config rollback state).
  - **Truly fresh process:** not yet performed (post-merge gate;
    declared in the rubric as UNVERIFIED_UNTIL_FRESH_CLIENT).

Sanitization: no private transcripts, no real credentials (the one
invented fake token is redacted), no model private reasoning; native
session/message/episode identifiers are included as the required
source-anchored identities. Frozen targets, corpus labels, and
thresholds were not modified; the Stage H private corpus is referenced
by SHA-256 only.
