<<< LOCAL_AGENT_CONTRACT_BEGIN >>>

# Issue #108 | C4 service recovery and exact V10 guard candidate integration

## Mission and authority

Hermes is the **external supervisor**. Start a genuinely fresh OpenCode `build` primary for authorized host-bound work, only when the target process can be admitted safely. A read-only `evidence` child/phase may independently check the result. This is **one combined service + source-integration handoff**, not a new feature campaign.

```text
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=108
PARENT_GATE=105
WORK_BRANCH=issue/108-c4-remediation
BASE_MAIN_SHA=288cbb48a68bffde8fb922714e22500b5db4dd66
WORK_BRANCH_HEAD=<full exact SHA supplied by Central kickoff; re-read GitHub>
V10_BASE_SHA256=b5452c987d8c9d7a520e082fe492f81f35d7d0484b85e89e0d1234c125d84a25
V10_PATCHED_SHA256=fd1eba5d56f1dd72b4a6eced4d8c3677c85c2902d9a81f87b50b75272d9e5218
GRAPHITI_GROUP=development-knowledge
WORKSPACE=/workspace/mcp_servers/gh_mcp
MODE=HOST_SERVICE_RECOVERY_AND_CANDIDATE_READINESS
PRIMARY_AGENT=build
SEMANTIC_REMEDIATION=forbidden
GITHUB_WRITES=forbidden
LIVE_GUARD_SOURCE_PROMOTION=forbidden_pending_Central_review_merge
LIVE_LEDGER_WRITES=forbidden
LIVE_SQLITE_WRITES=forbidden
GRAPHITI_DIRECT_MUTATION=forbidden
EX_BYPASS=forbidden
```

## 1. Establish exact authorities and a clean host baseline

Read current GitHub `main` and the continuing work-branch ref, fetch the branch and verify exact commit/tree before materializing it in a **collision-safe isolated worktree**. Do not move or clean the occupied main checkout or historic worktrees. Inspect the branch `v10-guard` files and this complete contract, then the actual installed V2 adapter→V5 core imports, installed module/config hashes, full safety-store scope and effective plugin/tool registrations.

Read current host state after reboot: OpenCode service/registration/listeners, vLLM/provider, Graphiti 8766, OpenViking 1933, bridge 8788, EX/shared locks, autonomous curator and any active interactive sessions. Do not rely on historical PIDs or infer source identity from the service name. Reuse earlier accepted source and test evidence where byte-identical, instead of rerunning all 482 tests.

Preserve rollback receipts for user-unit/wrapper/config and current ledger/SQLite without modifying the ledger or SQLite. No indiscriminate `pkill -f`, lockfile deletion, manual service-registry edits, or repeated restart loops.

## 2. Recover the canonical shared service, using the documented foreground mode

A healthy shared server with an authenticated current load epoch may be reused. Otherwise inspect `opencode --version`, installed help and service-registration metadata. The prior `serve --service` run used native detachment under a transient unit and failed to keep port 49374 bound.

**Central-selected primary route:** use the supported **foreground** `opencode serve --hostname 127.0.0.1 --port 49374` as the server process supervised by the same existing OpenViking admission shim, `flock -s` shared lease and `admission_exec.py`, instead of wrapping an internal daemonizing `serve --service` child. Where attached clients previously relied on automatic background-service discovery, use `opencode --server http://127.0.0.1:49374` explicitly. Confirm any required authentication is supplied through the existing accepted secrets configuration, without printing or changing credentials. Bind loopback, never `0.0.0.0`.

This is **not** authority to remove the EX chain or turn off the guard. Use an isolated, short diagnostic launch if needed, then one reversible user-unit/launcher promotion if it proves the identical admission and security boundary. You may correct ordinary systemd `Type`/`ExecStart`/working-directory/stdio/ownership/stop-signal details, as well as an equivalent supported launch invocation, provided all are bounded, inspected, reversible and do not change core policy. A native managed-service route is acceptable instead if live evidence proves it retains correct EX admission, process lifetime and client behavior.

Verify before declaring success: stable listening process after supervisor transition; fresh service PID/invocation; authenticated actual loaded V2 guard, Graphiti/OpenViking plugins, provider/model route and safety permissions; real authenticated API health; valid explicit native-client attachment; **no second unmanaged server**; no observer/relay left behind. Check that the canonical EX shared/quiet-grace behavior remains intact without forcing a real curation drain.

If diagnosis finds substantive wrapper/admission code needed, **do not redesign it locally**; collect original launcher source, complete failing process exit/signal/run-ID evidence and a targeted recommended change, then continue independent candidate readiness. Do not treat a healthy foreground probe alone as recovered production service.

## 3. Integrate the exact Central-owned guard code into a disposable tree

The branch includes `v10-guard/operational-schema-v5-capacity-and-corrupt-ledger.patch` and `guard-applied-cursor-capacity.test.mjs`. Authenticate their SHA-256 against the previously accepted Central packet: patch `fc575dfd779e04c468c58216a0fbdd78d254eff5c156f1ec803f6f24734543a5` and test `abc167a1d8e8c9fde61952fcd7194ece8f03fd3a54e589a1aa34ee7c146510d3`.

Verify installed V10 source exactly equals `V10_BASE_SHA256`. Copy the **complete** installed V5 and V2 adapter dependency trees to isolated scratch. Apply the staged patch to the scratch V10 copy, zero fuzz; resulting core **must** equal `V10_PATCHED_SHA256`. Do **not** apply it to repository-root V9 source. Run `node --check` and the supplied focused `node --test` with `OPERATION_GUARD_CORE_MODULE` pointing to the patched scratch core.

Previously qualified same-source results were 2/2 supplied, 17/17 independent probe, 7/7 adapter, with identical two existing installed-suite failures on base and candidate. Do not rerun every suite merely to repeat those receipts if the code and dependencies are unchanged. If material source or environment changed, run impacted focused tests and classify precisely. Do not weaken a failing test or turn baseline failure into a false green result.

**Do not install the new core into production in this phase.** Central will independently review this PR's exact SHA, trusted CI and host evidence, then authorize merge and a controlled source promotion. A further local source redesign or direct GitHub push is not delegated.

## 4. Report readiness for one integrated post-merge C4/C5 continuation

Inspect (read-only) whether original S3b episode UUID `6dc365a4-8f3c-4a4a-9214-0b1bb096456c` remains source-linked and positively present in the correct Graphiti group; do not replay ingestion. Record the current quarantined three bundle identities and EX drain state without reintroducing them.

Identify the already supported private observer path for true context-hook entry→return and same-provider-request dual markers. Set up no permanent observer. Prepare the smallest native retrieval cohort and legitimate negative control for the later **post-merge** production acceptance, but **do not run new inference sessions before a full guard/live service is authenticated**.

Consolidate valid historical stagewise evidence; do not relabel exposed cases as holdout. Mark actual callback latency and provider-bound dual-memory context as UNVERIFIED until directly observed.

Return one sanitized manifest-verified evidence archive containing service/lifecycle diagnosis, source+hash parity, focused test exits, host rollback and C4 readiness. Keep original database, ledger, sessions, prompts and provider bodies host-private.

```text
RESULT=PASS|PARTIAL|BLOCKED
MAIN_SHA=<40hex>
WORK_BRANCH_SHA=<40hex>
INSTALLED_V10_BASE_SHA256=<64hex>
STAGED_PATCH_SHA256=<64hex>
PATCHED_SCRATCH_SHA256=<64hex>
GUARD_REGRESSIONS=<exact tests/exits>
SERVICE_MODE=<foreground-supervised|native-managed|unresolved>
SERVICE_LISTENER_AND_PID=<actual>
SERVICE_GUARD_ENFORCING=PASS|FAIL|UNVERIFIED
SHARED_EX_ADMISSION=PASS|FAIL|UNVERIFIED
MODEL_AND_MEMORY_DEPENDENCIES=<actual health>
HOST_SERVICE_CHANGE=<NOOP|reversible-mechanical|NONE>
ROLLBACK_READY=YES|NO|UNVERIFIED
LIVE_SOURCE_AND_LEDGER_UNCHANGED=PASS|FAIL
SQLITE_UNCHANGED=PASS|FAIL
S3B_TERMINAL_MEMBERSHIP=PASS|FAIL|UNVERIFIED
OBSERVER_READINESS=READY|PARTIAL|BLOCKED
C4_READY_POST_MERGE=yes|no
EVIDENCE_ARCHIVE_PATH=<absolute>
EVIDENCE_ARCHIVE_SHA256=<64hex>
EVIDENCE_ARCHIVE_BYTES=<integer>
COMMAND_SHAPE_FRICTION=<GHDEV-10 schema>
```

## Authority and escalation

Hermes may diagnose and repair routine reversible host service lifecycle details in this one campaign, without seeking Central approval for each unit property. It may perform necessary bounded readbacks and focused regressions and resolve transient tooling errors. Do not stop for a guessed PID, obsolete unit name, or nonmaterial command-shape mismatch: inspect and choose the current supported equivalent.

Stop **only the unsafe branch of work** when it requires security/admission architecture, production semantic source changes, session-ledger pruning, SQLite live restoration, arbitrary Graphiti writes, disabling the guard, provider-secret exposure, forced replay or unbounded service churn. Continue safe independent tasks and return one typed limitation, not a cascade of micro-handoffs.

No new PR, branch, GitHub comment, merge, issue closure, or accepted C4/C5 claim is delegated.

<<< LOCAL_AGENT_CONTRACT_END >>>
