# Issue #75 — Final verification-integrity correction (Central-owned candidate)

**Design and implementation owner:** Central ChatGPT. **Host integration and
fresh verification owner:** one Codex or Antigravity local Build controller.

Current candidate staged on issue/75 includes: a unified Graphiti sanitizer,
both exact-base and deployed-state Graphiti adapter patches, a safer
environment-authenticated LiteLLM extraction example, and a two-phase
service-backed OpenViking test + CPU-only contract regressions.

<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE=75
BRANCH=issue/75
START_SHA=full_SHA_supplied_by_Central_kickoff_verify_remote_before_execution
ROLE=build
SCOPE=verification-integrity-closure-only
HOST_ACTIONS=scoped-reversible-source-deployment-and-service-qualification-allowed
GITHUB_SOURCE_AND_EVIDENCE_PUBLICATION=allowed-on-issue/75-with-exact-head-nonforce
GITHUB_PR_OR_MERGE=not_authorized
FINAL_INDEPENDENT_REVIEW=Central
EXISTING_WORK_AND_HISTORY=preserve
NEW_DESIGN_CAMPAIGN=forbidden

## Phase 0 — source and runtime preflight

Read the latest Central independent review, the previous two published evidence
packets, the new central-owned candidate files and the GHDEV-07/10 contracts.
Authenticate current full remote issue/75 SHA and materialize the remote selector
BEFORE local object proof. Confirm worktree ownership and no conflicting writer.
Inspect the current deployed files/versions, pending gate tasks/holds, locked
harnesses, service manager and any host drift since 2026-11-02 19:53 UTC.

## Phase 1 — unify the Graphiti sanitizer; no architecture redesign

Reconstruct Graphiti source from the original pinned base and separately from
the deployed pinned source using the matching supplied patch. Both candidates
must yield byte-identical run_graphiti.py after patch, with the published helper
module beside it. If one preimage SHA mismatches, investigate that material
drift and adapt the *smallest correct* patch with documented proof, not a blind
overwrite. Run the provided sanitizer tests, add only essential runtime-bound
regression cases, and verify actual OpenAIGenericClient._strip_code_fences after
fresh-process initialization. Test representative negative malformed JSON,
nested/leading reasoning envelopes, literal think tags INSIDE JSON strings and
proper empty result parsing. Preserve interactive chat configuration.

For isolated LiteLLM extraction use the new master-key-from-environment config
and loopback-only bind; no weak/unset-key bypass or credential publication.
Use the already accepted source-attributed Graphiti episode proof; perform at
most a focused smoke test if altered sanitizer/runtime bytes warrant it.
Source-owned patch and helper must match what is actually deployed.

## Phase 2 — replace synthetic live-worker test with genuine service evidence

The earlier test_new_valid_session_commit.py was NOT valid normal-gate
admission evidence: it instantiated Worker against live state and patched
_active_harness_processes/_metrics and quiet_grace_seconds. Central has
replaced it with CPU-only contract tests and service_commit_qualification.py,
which NEVER creates a Worker or mocks admission.

Run the safe unit tests. Prepare a campaign-private 0700 evidence directory
and credentials from already authorized private local configuration; do not
scrape a PID's /proc environ or expose secrets through arguments/output. Use:
  ISSUE75_TEST_USER_KEY (regular authenticated session caller)
  ISSUE75_TEST_ROOT_KEY (authenticated owner for receipt GET)
Only the loopback :1933 and :1934 services are allowed.

Use service_commit_qualification.py submit --state-file <private>/commit.json
--account <verified_account> --user <verified_user> --actor <verified_actor>.
Submission reports GATE_QUEUED_NOT_COMPLETED, NEVER PASS.

The ordinary gate worker must run with its original scheduling/classifier/
quiet-grace policies. Do NOT set quiet_grace_seconds=0, fake zero metrics,
mock active-harness processes, call Worker.tick directly or route around the
gate. If the current controller's active lease prevents the normal worker from
running, arrange an operator-authorized narrowly scoped post-controller
observer/supervisor BEFORE ending the controller, then release the actual
controller session normally and let the ordinary installed gate advance.
The observer uses:
  service_commit_qualification.py observe --state-file <private>/commit.json
  --gate-db <authenticated_gate_db_path> --wait-seconds <bounded_duration>
It must run only after the controller's ordinary lease has gone, retain
private auth, and report exact producer exit 0 (terminal) or 3 (pending);
any contradiction is blocking evidence. Never replay an ambiguous submission.

Require exact completed + terminal/sealed_terminal + release_proven=1,
one matching resolved attempt, owner/scope match, no duplicate execution and
unchanged unrelated records. The earlier receipt can corroborate backend
capability, but only this normal scheduling path closes the finding.

## Phase 3 — final evidence closure and single PR readiness

Rerun focused Gate receipt/tenant tests consuming the ACTUAL final deployed
candidate, including the previously passed 19-case tenant integration suite
if its inputs are affected. Do not weaken tests. Inspect disposable and live
postures; preserve historical repair audit and Graphiti groups.

Before declaring the whole issue PR-ready, compare prior evidence to Issue #75's
original stock-OpenCode-V2 acceptance requirement. If the previously accepted
Graphiti example originated only from a manually staged fixture rather than a
real opted-in completed V2 user/tool event, add ONE narrow ordinary V2 source
event capture and attribution readback using the existing candidate plugin and
journal; no extra architecture or reranker campaign. This is a mandatory
acceptance gap check, not permission to relitigate established results.
Publish a privacy-screened GitHub-readable packet containing full source
diffs/pins, sanitizer reconstructed identity, config redactions, exact producer
commands/exits, post-controller supervisor receipt, normal worker status,
gate/receipt/task identities, nonreplay proof and final service restoration.
An optional tar archive cannot substitute for readable files. Stage/push one
or a few cohesive fast-forward commits to issue/75 only; verify fresh remote
SHA, tree and file hashes. No PR or main write.

This is ONE integrated correction. Resolve routine test/dependency/runtime
friction independently, including small source fixes if demonstrably needed.
Do not start reranker calibration, broad architecture reassessment, unrelated
service upgrades or new PR campaigns.

## Stop and result classification

PASS means candidate rebuilt and deployed coherently, real unmocked normal
gate progression verified to terminal completed receipt, relevant tests
passed, services restored, and GitHub evidence independently readable.
PARTIAL means a focused fix was completed but one invariant not proven;
preserve the correct safe host posture and describe exact next step.
BLOCKED only for authority conflict, irreconcilable runtime identity,
unsafe durable mutation, or required resource unavailable. Never label
an old mocked test or queued admission as normal-operation PASS.

Required fields: RESULT, START_SHA, PUBLISHED_SHA, TREE_SHA,
SANITIZER_BASE_AND_DEPLOYED_SHA, LITELLM_ISOLATION_AND_AUTH,
SCHEDULER_UNMOCKED, CONTROLLER_LEASE_RELEASE, GATE_RECEIPT_TERMINAL,
ATTEMPT_COUNTS_AND_INVARIANTS, FOCUSED_TEST_RESULTS, FULL_PROFILE_GATES,
HOST_RESTORATION, EVIDENCE_PACKET_PATH_AND_HASHES,
COMMAND_SHAPE_FRICTION, RESIDUAL_RISKS, PR_CREATED=no.
<<< LOCAL_AGENT_CONTRACT_END >>>
