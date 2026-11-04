# Issue #80 post-timeout recovery and final closure

Governing Build handoff: LOCAL_AGENT_CONTRACT_RECOVERY_CLOSURE.md.
This adds a source-preserving failed_extraction review state, operator-attested anonymous FIFO log evidence with exact current group and remote readback, one-shot recovery CLI (dry-run by default), no-replay guard for duplicate facts, source-index repair for proven remote success, and portal status/error display.

The Graphiti processing log uses "episode None". A task-to-review mapping is only inferred from the actual sequential group log and confirmed second episode UUID; failure does not prove absence of partial graph effects. No failed episode is retried.

The shared mcp-mux Graphiti worker must NOT be stopped. The historic wrapper was stopped after all two observed tasks had terminal processing logs and only the disposable path was disabled. The new source is not a hot patch to already-running processes.

Central has verified exact GitHub writes and static parse of new JS, plus a bounded pure-function check against the observed four-event log shape. Host native Node/Python regressions, TypeScript/Vite and actual recovery remain UNVERIFIED until local Build executes them.

Reuse prior accepted pre-exit Issue #80 proof, finish one distinct real operator GUI approval through confirmed Graphiti persistence, and publish at most one evidence-only commit on issue/79. No PR, merge, issue closure or production activation.
