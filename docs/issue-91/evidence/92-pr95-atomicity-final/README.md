# Issue #92 / PR #95 — final atomicity qualification (sanitized evidence)

Branch `issue/92-v7c-accepted` | PRIMARY_AGENT=Hermes/Build | CPU + one EX-admitted exposed GPU probe
CONTRACT=docs/issue-91/adr-acceptance/ISSUE92_PR95_ATOMICITY_EXPOSED_FINAL_HERMES.md

## RESULT = **SOURCE_REMEDIATION_REQUIRED**

The real `chat-fast` atomicity reviewer, on the exact historical two-predicate
v7-v-08 source, **approved the bundled original assertion as a single atomic
fact** (model attested `independent_predicates: 1`) and it persisted to a fresh
disposable Graphiti group. Per the contract, when the model still approves the
bundled original assertion the result is `SOURCE_REMEDIATION_REQUIRED` and the
v8 cohort is NOT prepared (no C phase). No prompt/model variant sweep and no
second inference run were attempted.

## Source identity (Section A)
- TESTED_SOURCE_HEAD = `28afd5307b0088d8e0f695efb49f9b2879d5d708` (remote head, verified)
- Verified key blobs match contract:
  - events.mjs `041aab30…fbf80c`, finite-batch.mjs `f0c54e18…9ddcc`,
    fact-review.mjs `e4b13873…8d3d`, claim-evidence.mjs `3c29c4ff…2bd6`,
    finite-batch.test.mjs `739e01f4…468b7`
- Focused native suites corroborate host version: candidate+long-prompt 31/0,
  curator 97/0, A3 19/0 (147 PASS). Trusted exact-head CI (run 43481444760)
  covered the full 671-test root profile; not duplicated on the host.

## CPU boundary (privacy + literal source/offset)
- "API key was removed" → stages as a non-secret user-stated observation (1 event).
- "password is DEMO_VALUE_DO_NOT_USE" (and analogous NL values) → NOT staged (0 events).
- "credentials can be found at <location> with token/password field types" → eligible, no values.
- Native excerpt preserves literal internal whitespace/newlines contiguously; exact UTF-16 offsets retained.

## B. Exposed atomicity probe (one EX-admitted inference, disposable group)
- Group `graphiti-adr92-exposed-atomicity-r1` (fresh, 0 episodes pre-stage), private 0700 state.
- Sources (native, from frozen v7c manifest by identity): v7-v-08 (two-predicate
  valuable), v7-v-07 (atomic valuable positive), v7-c-01 + v7-c-02 (controls).
- One admitted `chat-fast` finite-batch run: 5 candidates → **2 approved, 3 deferred**,
  19 model calls, 0 errors (discovery 11 / utility 5 / arbitration 1 / support 1 /
  specificity 1).
- **Original bundled v7-v-08:** PERSISTED as ONE atomic fact (episode
  `68405b68-3119-4d9f-8209-158b01974d88`); assertion SHA-256
  `2c03af01…804c60`; model attestation `independent_predicates: 1` merged the
  Tdarr-v3 and Context7/Firecrawl predicates. **This is the disqualifying
  acceptance of the bundled assertion.**
- **Atomic positive v7-v-07:** PERSISTED (episode `6fd0b306-3283-4d06-9bad-c6489662e1c4`);
  assertion SHA-256 `292674d5…80cf0`; attested `independent_predicates: 1` — the gate
  does accept a genuine atomic fact (not a degenerate all-DEFER).
- **Controls v7-c-01 / v7-c-02:** DEFERRED, stayed out of Graphiti (no control pollution).
- Plan certificate `atomicity_review_v1=true`; per-item assertion SHA-256 + rationale
  frozen in the plan. Positive Graphiti UUID readback confirmed both episodes.

## EX admission
- Canonical kernel flock on `/run/user/1000/openviking-agent.lock`; the launcher's
  locked fd (3) was inherited by the Node driver via `pass_fds` and proven
  kernel-backed (fd present in `/proc/self/fd`, fdinfo FLOCK held by the launcher PID).
- Scheduler idle (vLLM running=waiting=paused=0) at admission; harness-exit OK
  (no codex/opencode/agy/opencode-desktop); no-unresolved OK; 30s quiet grace honored.
- Once-only marker written after a settled run. Reconcile-only: driver rc=3
  (2 writes queued) → reconcile-only attempt 1 → `reconciled_persisted=2, unresolved=0,
  status=settled`. No model replay.

## C. v8 prospective cohort
- **NOT prepared.** B did not qualify (bundled v7-v-08 assertion accepted), so no
  fresh v8 freeze is staged; no v8 inference executed.

## Historical integrity / local changes
- Historical v7c and all earlier states unchanged (read-only; no v7c inference replay,
  no writes to the v7c group or any production group).
- No semantic source edits; only host-local disposable group/state + a throwaway
  EX launcher/driver under `/tmp` (not committed).

## Command-shape friction
- EX proof env var is `GHDEV_MEMORY_POST_EXIT_LOCK_FD` (the first launcher attempt used
  `EX_LOCK_FD` and failed at `requireKernelExAdmission: missing_lock_fd`); corrected and
  re-run. No source semantics changed.

## Decision blockers (bounded)
- The `chat-fast` atomicity reviewer merges the two independent v7-v-08 predicates into
  one (`independent_predicates: 1`) and persists the bundled original quote. Central must
  decide the source-level remediation (e.g. a lexical two-predicate detector or a
  predicate-enumeration requirement in `atomicity_review_v1`) before the v8 cohort is
  ratifiable.
