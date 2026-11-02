# Issue #75 — integrated source reconciliation, rejected-commit recovery and extraction proof

<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
REPO_ID=fvanevski/opencode-operational-schema-guard
BRANCH=issue/75
ISSUE_NUMBER=75
START_SHA=exact SHA from the Central kickoff; verify fresh remote SHA before any writes
PRIMARY_CONTROLLER=one direct Codex CLI (GPT-6.1-Sol medium) or Antigravity (Gemini 4 Argon)
OTHER_CONTROLLER=passive observer only; no competing source writer or model work
TASK_ROLE=build
HOST_MUTATION_AUTHORITY=approved-for-tightly-scoped-reversible-corrections-and-guarded-rejected-attempt-repair
CONTINUE_THROUGH_ORDINARY_FAILURES=yes
MODEL_BACKED_TEST_AUTHORITY=conditional-on-proven-exclusive-ingress
PRODUCTION_SOURCE_CHANGE=allowed-with-reproducible-snapshot-tests-and-restoration
PROTECTED_GATE_STATE_REPAIR=allowed-only-after-coherent-runtime-persistent-hold-transaction-proof-and-fresh-exact-guards
PERMANENT_GATE_POLICY_BYPASS=no
PENDING_AUTODRAIN_OR_REPLAY=no
EXISTING_SESSION_REKEY=no
SOURCE_BRANCH_PUBLICATION=allowed-on-issue/75-exact-head-only
EVIDENCE_PUBLICATION=mandatory-sanitized-GitHub-readable
PULL_REQUEST_OR_MERGE=not-authorized
CENTRAL_FINAL_REVIEW=required

## Governing evidence and decision

First read `docs/issue-75/CENTRAL_COHERENT_BACKEND_AND_RECOVERY_DECISION_20261102.md`,
`docs/issue-75/EVIDENCE_PUBLICATION_PROTOCOL.md`,
and the current published packet at
`docs/issue-75/evidence/20261102-gate-recovery-tI5UuXkC/`.
Read full current installed OpenViking source/config/runtime, not only published
historical excerpts. Verify issue branch HEAD, repo tests, and original private
host packets without modifying their existing bytes.

The report at `5ed6fa4e3cb43aa0a0d5dd9357e31c1225d661ad` establishes:
- Six backend files changed AFTER the running process started, all within
  2026-11-02 16:45:37 UTC. Disk source has removed the admin receipt route
  and keyed task/resume hooks, while running backend still exposes receipt GET/POST.
- The exact prior receipt POST 409 for blank tenant scope was before commit
  acceptance; gate retains `unknown`, `submitted=1`, `resolved=0`.
- 3 other pending intents could become eligible after barrier resolution.
- Four offline SQLite characterizations, 493/493 repo tests passed, but
  NO source-bound repair was implemented, no repaired live gate or new graph
  extraction was qualified. Do not turn these historic passes into new-code proof.
- Controller model transport is still independently UNVERIFIED.

### Local autonomy and boundaries

You are the primary **implementation and host operator** for this bounded
Issue #75 recovery. You may inspect and modify isolated copies and,
after the relevant preconditions below, install narrowly scoped fixes to
the live OpenViking backend/gate, pause/restart the specifically implicated
services and clients, run read/write recovery through an owner-only guarded
transaction, test native OpenCode V2 and Graphiti on disposable state, and
revise local code/tests as evidence warrants. Do not ask Central for each
routine configuration adjustment or host action. Complete one cohesive
campaign with a useful consolidated handback and GitHub review packet.
You are not required to use the earlier Codex-App-spawns-Codex-CLI
pattern: one directly executing host-capable controller suffices if it
does not hold an incompatible session SH lease and its transport is verified.

Stay within the existing OpenViking+Graphiti memory and gate subsystem.
The agent must **not** bypass the gate, change locks/permissions to satisfy
checks, disable authentication, rewrite older task identities, suppress
failing tests, erase other pending/failed work, perform a broad host upgrade,
or change unrelated services. Preserve user-selected OpenCode behavior,
current model serving and the already accepted relevance limitations.
Do not substitute different models merely to obtain a passing response.
A genuinely risky, irreversible, privacy-impacting or out-of-scope action
remains a stop boundary; otherwise correct in-scope failures autonomously.
The user has authorized appropriate host actions, not unconditional
destruction or publishing private credentials.

### Phase 1 — establish one coherent backend source/runtime authority

A. Inspect actual running backend PID/start, package/venv, loaded route
   table, effective API auth mode and version, current on-disk files,
   git status/log/reflog/deploy logs and package upgrade/provenance.
   Authenticate all six changed files, their historical preserved
   copies and current disk SHAs. Identify whether the change is an
   intentional upstream update, uncommitted local overwrite, or
   a partially applied integration; **never assume the newest
   filesystem is the correct runtime contract**. Determine which
   related modules still require receipt/task/queue coherency.
B. Preserve complete byte-exact, permission-aware backups of both
   on-disk and preserved pre-change source, deployed config/units,
   current gate database in a consistent snapshot, and relevant
   receipt/task/QueueFS schema and state; protect secrets locally.
   Do not publish private backups. Reauthenticate gate/worker current
   source and actual event/task scope before any deployment.
C. Design a **coherent, pinned source tree** with the native installed
   OpenViking version plus the smallest compatible receipt/task/key
   integration. Prefer version-controlled overlay/cherry-pick of the
   historical receipt integration after reading *both sides*
   completely; no blind copy of the six historical files over new
   ones. Preserve intentionally added upstream behaviors and
   required key identity. Verify imports/routes/schema/typing,
   full receipt POST/GET, task/archive bindings, worker fence,
   QueueFS message fields, stable owner/tenant context, and service
   launch config. If live source is necessarily a custom fork,
   include full reproducible patch/commit base in the evidence.
D. Run focused integration tests for the **actual installed** source
   in an isolated env (including receipt 409, valid client owner,
   idempotency, task/lease persistence, archive binding, queue
   resume/failure and no duplicate publish). Prefer testing a
   disposable server and database before any live restart.
   Because the active process may retain old modules in memory,
   a fresh-process qualification of the complete candidate is
   mandatory. Preserve related tests; failures require diagnosis,
   not weakening.
E. Only after host workload/queue preflight and rollback rehearsal,
   deploy the coherent candidate and restart *specifically affected*
   backend service(s). Prevent simultaneous old/new workers and
   do not restart into an unverified queue drain. Compare live
   registered route, runtime behavior, source hashes, identity,
   health and task/receipt state after restart. On failure,
   restore original backed-up service/source state and stop further
   state mutation. If current updates are owned by another active
   host deployment campaign, do not overwrite that campaign;
   integrate or preserve a reproducible alternative instead.

### Phase 2 — install a durable gate hold and repair the exact rejected attempt

F. The current `next_ready()` chooses pending intents independently
   of the unknown record. Before clearing it, establish a **durable
   default-closed admission hold**, checked within claim transaction
   and all worker/reconciliation paths capable of submitting a
   commit, remaining effective across service restart, controller
   exit and concurrent workers. Prefer the smallest compatible
   addition to the existing schema/worker. Test hold ownership,
   stale release, race during claim, stop/restart, two workers and
   expiry semantics (do not silently auto-release a hold).
   Alternative: keep the gate service verifiably stopped with a
   tested restart inhibitor, preserving lock inode, until the hold
   is ready; service stoppage alone is not final resolution.
   Record existing pending and generation-gap records individually;
   no automatic drain, discard, rekey or unexplained transition.
G. Re-read the exact historical 409 with original immutable request
   identity, stored `intents`/attempt rows and backend receipt,
   binding, task, archive, QueueFS absence. Verify the exact
   backend owner validation sequence and current database schema.
   This is a **fresh precondition**, not permission to infer
   acceptance from `submitted=1` or nonacceptance from GET 404.
H. Build a **supported owner-only repair** in the actual gate source
   (or a one-off guarded owner transaction after full source review)
   that atomically resolves:
   - exact prior `intents.state='unknown'`, claimed generation=2,
     submitted request key/body digest/scope and null task;
   - exact `commit_attempts.submitted=1,resolved=0` latch;
   - an honest durable rejection audit, without inventing a
     successful/skipped receipt, task ID or backend completion;
   - original `requested_generation` and `processed_generation`
     unchanged, with no retry or new intent.
   `dead` is an acceptable candidate state only if readers,
   triggers and audit confirm it means rejected without processing.
   Existing `commit_attempt_resolved` trigger only resolves from
   `OLD.state='inflight'`, so plain `dead_letter(unknown)` is NOT
   sufficient. Preserve unique key and immutable attempt. Provide
   exact compare-and-set guards on ALL relevant columns and
   fail-close on a mismatch. The operation must be idempotent
   *without* repeated side effects.
I. Test the complete transaction against a disposable copy of the
   actual schema and representative row data: exact success,
   stale key/scope/digest/generation, changed intent/attempt
   preimage, two concurrent transactions, crash before COMMIT,
   repeat after COMMIT, worker restart with persistent hold,
   unrelated failed/dead/pending rows, no backend writes,
   no new receipt, no new service queues, no release of work.
   Run actual existing source tests and static checks relevant
   to touched code; record exact current source/head identity.
J. Under the canonical cooperative exclusion and **proved
   worker/service quiescence**, take a verified consistent backup,
   lock the exact repair target and revalidate all compare guards.
   Execute the narrowly scoped reviewed owner transaction once,
   verify affected-row counts and audit/rejection disposition,
   then verify original backend nonacceptance and no other
   claim/task transitions. Keep the durable admission hold
   active after COMMIT, and leave the three other pending intents
   untouched pending explicit evidence-based dispositions.
   If backup, lock, target identity or postcondition fails,
   do not attempt an unsafe replay or ad-hoc "repair the repair";
   preserve state and return the exact recovery evidence.
   Rollback after other jobs resume is not falsely claimed safe.

### Phase 3 — fix recurrence and finish the original functional goal

K. Fix **future** tenant binding before setting submitted=1:
   `GateHandler._identity` currently reads optional
   `X-OpenViking-Account` / `X-OpenViking-User` headers and
   defaults them to empty. These are not authoritative by
   themselves. Bind identity through authenticated backend
   session/owner with explicit validation of scope and route,
   or reject before claiming an attempt if that binding cannot
   be proven. Define creator-to-caller behavior for ROOT
   `api_key` mode, stale/mismatched sessions, duplicated
   headers and normalized whitespace. Preserve older rejected
   key unchanged. Regression tests must show invalid caller
   cannot create an attempt latch. Do not claim success for
   just rejecting every commit forever.
L. Authenticate **this controller's real model endpoint**
   (Codex direct or Antigravity) using trustworthy process-bound
   config/route telemetry; if unprovable, do not perform GPU
   tests with the same single-serving local backend. The
   previously authorized temporary quiescence of verified
   competing inference clients remains in effect. Verify
   ingress exclusivity beyond `flock` cooperation; include
   no-inflight/no-waiting metric and quiet grace, maintain EX
   through asynchronous Graphiti terminal processing, restore
   each stopped service after tests.
M. With a **new unique group and journal**, run focused
   native OpenCode V2 capture (opt-in and source attribution)
   and actual Graphiti extraction under safe exclusive
   inference. Prove stored episode, associated meaningful
   nodes/edge, independent fresh-process native facts query,
   `Memory.search` source attribution and final context
   formatting. A zero-edge episode, HTTP 200 or cleanup
   rc=0 is not PASS. The previous two `json_schema` and
   `json_object` clean controls were both factless; inspect
   effective model prompt/extraction and candidate fixes,
   not another blind mode toggle. Run bounded iterations
   inside the same authorization; no full relevance reranker
   campaign.
N. Before re-enabling gate worker admission, explicitly
   enumerate/dispose each pre-existing pending intent and
   generation gap with independently justified action and
   no unintended replay. If such disposition cannot be
   shown safe, **retain the durable hold and report gate
   admission deliberately suspended**, while otherwise
   preserving service health and handing back the complete
   recovery evidence. A partial result must not claim
   normal gate operations resumed. Do not silently
   change pending data to green.

### Publication, tests and one handback

- Local controller may adjust in-scope code, tests and deployed
  service under phases above. Keep source changes traceable:
  original installed SHA -> scoped patch -> deployed SHA ->
  live runtime verification. Keep complete `git diff --binary`
  plus focused regression records, host service snapshots,
  change/rollback/health ledger and sanitized request and
  SQLite projection evidence.
- Publish to the existing `issue/75` branch using **one or
  a small number of cohesive non-force exact-head fast-forward
  commits**, with full CAS/ref readback and without touching
  `main`. Issue #75 candidate source/tests may be committed
  where directly relevant. External OpenViking host changes
  should normally be supplied as **inspectable patches**
  under `docs/issue-75/host-patches/` alongside design
  and tests, not pasted over unrelated repository roots.
  The earlier `EVIDENCE_PUBLICATION_PROTOCOL.md`
  privacy/manifest/readback rules still apply; this
  handoff explicitly expands the earlier evidence-only
  GitHub publication grant to coherent scoped
  candidate-source/test commits as well.
- Publish plaintext GitHub-readable evidence and optional
  sanitized archive under a new collision-safe
  `docs/issue-75/evidence/<date>-<id>/` with README,
  typed handback, exact source and runtime identities,
  source/DDL/trigger excerpts, full safe test commands
  and results, host mutation/restore evidence,
  sanitized root-cause artifacts, manifest and SHA256SUMS.
  Never publish credentials, raw tenant details,
  session transcripts, full host SQLite/keys, raw model
  tokens or sensitive config. Preserve originals privately.
- Do not create a PR, merge, close Issue #75, weaken
  existing CI/static gates or install new unrelated
  dependencies. Central performs independent exact-head
  source and evidence review before the eventual single PR.

Result is one of:
  PASS = rejected attempt honestly resolved, coherent
  backend live, pending work controlled, tenant recurrence
  tested, genuine source-attributed Graphiti memory recalled,
  services restored, new evidence verifiable;
  PARTIAL = one or more safe improvements completed but
  another substantive invariant unproved; specify held
  services/gate and safe recovery posture;
  BLOCKED = a concrete external/irreversible authority
  conflict, unrelated deployment, unsatisfied source
  identity, unavailable backup/rollback, or unprovable
  safe inference ingress; no speculative bypass.

Typed handback must contain:
```text
RESULT=PASS|PARTIAL|BLOCKED|FAIL
START_HEAD_SHA=<full SHA>
PUBLISHED_HEAD_SHA=<full SHA and fresh remote ref readback>
RUNTIME_SOURCE_IDENTITY=<package/version/PID/start/disk and loaded route evidence>
SOURCE_DRIFT_DISPOSITION=<old/current six-file diff, chosen coherent code, test proof>
HOST_DEPLOYMENT=<exact changed paths/hashes/service commands/downtime/rollback>
ADMISSION_HOLD=<persistent mechanism, all claim/reconcile paths, restart/race tests>
ORIGINAL_ATTEMPT_REPAIR=<exact guarded key/scope/generation, result and audit>
ATTEMPT_AND_INTENT_AFTER=<both state fields plus original immutable evidence>
REJECTED_BACKEND_RECEIPT=<confirmed absent/no task/lease>
TENANT_RECURRENCE=<preclaim validation and tests>
OTHER_PENDING_INTENTS=<three statuses, disposition/hold and no unauthorized replay>
MODEL_CONTROLLER_TRANSPORT=<provider/effective endpoint with proof>
GPU_EXCLUSION=<client inventory, clock/grace, lease, metrics>
GRAPHITI_FUNCTIONAL=<new group/journal/remote episode/nodes/edges/source attribution/recall>
TESTS=<focused, integration, host, static, broad with exit codes>
PROTECTED_NONREGRESSION=<pre/post health, untouched graph groups and other work>
HOST_ROLLBACK=<what can safely be reverted and what cannot>
EVIDENCE_GITHUB=<packet paths/manifest/hash/remote SHA and privacy mapping>
COMMAND_SHAPE_FRICTION=<canonical GHDEV-10 fields, even if none>
OPEN_RISKS=<evidence and exact boundary>
```
<<< LOCAL_AGENT_CONTRACT_END >>>
