# Issue #108: C4 service and V10 guard recovery candidate

**Authority:** issue #108 / parent #105; current base `main@288cbb48a68bffde8fb922714e22500b5db4dd66` (tree `5fef838f09e1b8cf883a8f78d7415293f69305c1`). This branch stages a **host-version-specific source patch and a host integration contract**. Nothing in this directory activates it.

## Central-owned code and design

The installed stock-V2 adapter imports a **different V10** `operational-schema-v5/lib/operation-guard-core.mjs` than the repository-root V9 core at the above base. **Never patch, replace, or deploy the repository V9 file in place of the host V10 core.** The host-origin source identity is SHA-256 `b5452c987d8c9d7a520e082fe492f81f35d7d0484b85e89e0d1234c125d84a25`. The exact patch in `v10-guard/` must produce SHA-256 `8f8fe8cfc8932fcdc15e75fa742d26316bb27abcc5e63f53164d0dac8a8fb24a`, without fuzz or an unstated migration. Both are **content hashes**, not Git commit SHAs.

The change is deliberately small:
- Raise the **per-workspace applied-turn cursor** capacity from 128 to 4096, retaining all historical cursors and the V10 disk schema.
- Latch a failed ordinary load of malformed authoritative persisted safety state, blocking delivered-turn admission and implicit `save()` until an explicit successful strict reload of valid recovered state. After a failed load, a missing ledger file must not be accepted as a fresh empty authority.
- Preserve duplicate/replay, content integrity, message ordering, atomic persistence and the hard 4096 ceiling. There is no ledger deletion, compaction or historical evictions.

This is an interim operational headroom measure, not a permanent append-only ledger lifecycle solution. Separate long-term retention/compaction design is not necessary for this bounded C4 recovery.

**Local host qualification previously completed:** exact candidate was independently hash-bound, supplied test 2/2 PASS, additional probe 17/17 PASS, V2 adapter 7/7 PASS; installed guard suite 480/482 on both original and candidate. The two common failures are a missing V1 `index.mjs` fixture in the host install and a stale persisted `version===9` test assertion against the host's V10 state. These remain documented baseline defects, **not silently waived**. Any new failure is a blocker requiring Central adjudication.

## Service-lifecycle strategy

The previous managed-server chain used `opencode serve --service` under a transient `systemd --user` unit, and repeatedly failed to retain its detached child/listener. OpenCode's documented `opencode serve --hostname 127.0.0.1 --port 49374` runs a foreground server intended for direct supervision. `opencode --server http://127.0.0.1:49374` explicitly attaches clients. This is the **primary replacement hypothesis** for the service-only host correction, not an assertion that the exact installed build/environment has been proven compatible.

Keep the existing authorized OpenViking shim, shared `flock -s` lease and `admission_exec.py` chain, service user/working directory/env, authentication and effective plugin/guard registrations. Do not run a second unguarded server, change model permissions, run under a separate production HOME/XDG tree or bypass EX. Prefer a reversible bounded user-unit/launcher adjustment using the already-supported foreground mode; verify process ownership and explicit native-client attachment. A new model-producing session in the currently full 128-cursor workspace is not required before the reviewed guard correction is promoted. A supported native managed-service route can be retained if it genuinely works without breaking the canonical lease; no preference overrides actual host evidence.

Source: [OpenCode CLI service/foreground distinction](https://opencode.ai/docs/cli/web/) and [OpenCode service troubleshooting/registration](https://opencode.ai/docs/troubleshooting/). Re-read installed `opencode --help` for the host version before execution.

## Excluded from this implementation

- No live SQLite restoration: an offline candidate exists, but historical data since its backup may be unrecoverable and explicit separate authorization is required.
- No pruning or editing `appliedTurns`, deleting application sessions, resetting a saturated ledger, disabling the V2 guard, EX admission override, or service launch from untrusted plugin paths.
- The three malformed legacy curation bundles remain preserved in quarantine. The current EX reconciliation backlog has been reported clear. No unreviewed source-validation bypass or automatic release of an unresolved Graphiti write is allowed.
- No broad operational-schema V9→V10 migration, new permanent observer or new PR per test.

## Remaining acceptance boundary

The original Issue #108 C4/C5 contract still requires a fresh post-merge service/client/native session; genuine post-exit source/curation/positive same-group membership; qualified Graphiti and OpenViking context in the **same outbound provider request**; source-supported answers/negative controls; and a measured real context-hook entry→return p95 <=300 ms. Direct `Memory.search` latency does not prove that budget. Historical S3b terminal source identity may be reused after current fresh membership/source reconciliation, but it does not substitute for provider-bound qualification.

**Local handoff:** `docs/issue-108/LOCAL_AGENT_CONTRACT_C4_SERVICE_AND_GUARD_HERMES.md`. Complete the mechanical host phase once; return one evidence packet. Central performs independent exact-PR-head review and a separate merge/promotion decision. No issue closure follows from this branch alone.
