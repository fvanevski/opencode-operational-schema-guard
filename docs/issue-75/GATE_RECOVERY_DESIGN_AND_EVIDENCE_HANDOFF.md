# Issue #75 — offline guarded gate recovery candidate and published evidence

**Status:** PREPARATION/REVIEW ONLY. No live repair, no gate state mutation, no Graphiti inference or maintenance-window entry.

**Read first:** `GATE_RECOVERY_CENTRAL_REVIEW_20261102.md`,
`EVIDENCE_PUBLICATION_PROTOCOL.md`, `UNKNOWN_COMMIT_RECONCILIATION_CONTINUATION.md`,
`AUTHORIZED_INFERENCE_MAINTENANCE_CONTRACT.md` and current GHDEV-02/07/10.
Use installed live gate/backend source/schema as mutable authority, not summaries.
Read the four private artifacts and original 114 supporting files under
`/tmp/opencode/issue75-direct/reconciliation-bTWEsL2h/`.

<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=75
WORKING_BRANCH=issue/75
REQUIRED_HEAD_SHA=exact 40hex supplied by Central kickoff; verify fresh remote
CONTROLLER=one direct Codex CLI or verified Antigravity controller, passive supervisor only
TASK=inspect exact gate source and design/test a guarded preacceptance-rejection recovery OFFLINE
LOCAL_SUBSYSTEM_REMEDIATION=disposable-offline-only
PRODUCTION_GATE_STATE_WRITE=forbidden
PRODUCTION_GATE_SOURCE_OR_CONFIG_WRITE=forbidden
LIVE_RECOVERY=forbidden
REPLAY_OR_RECEIPT_FABRICATION=forbidden
INFERENCE_AND_CLIENT_PAUSE=forbidden-during-this-phase
REMOTE_SOURCE_UPDATE=forbidden
REMOTE_EVIDENCE_UPDATE=allowed-one-evidence-only-commit
CENTRAL_REVIEW_REQUIRED=yes

## Objective

Supply Central with enough independently inspectable current source, trigger/schema,
backend request evidence and validated offline recovery design to make the
**separate protected-state repair decision** without another round of
operator-run diagnostic snippets. Keep the identity/authentication defect as a
separate root-cause change proposal. Within this task, the Build controller owns
read-only exploration, private scratch test implementation, controlled
disposable SQL/schema testing, redaction and a single evidence-only GitHub
publication to the existing working branch.

## Execute

1. Authenticate the branch's exact head and installed gate/server process,
   source hashes, runtime versions, loaded DB/schema/trigger definitions and
   actual state. Validate the user's uploaded `RECOVERY_PROPOSAL.json` against
   the original private 116-item evidence seal (not just the manifest), with
   all original bytes preserved. Reconcile prior 409 matching request with
   exact immutable key/scope/digest/generation, body-header/route limits,
   owner validation ordering, receipt/binding/task/QueueFS absence and original
   intent/attempt latch. Distinguish source-supported fact from inference.
2. Inspect the **actual installed** gate `QueueDB`, `commit_attempts`,
   `intents`, triggers, worker claim/complete/dead-letter transitions and
   backend admin receipt route. Identify a smallest honest terminal state for
   "rejected before backend acceptance" using existing state vocabulary
   where possible. If impossible without a schema/admin protocol change,
   prepare a *design alternative* and no SQL purported executable against
   the current schema.
3. Implement and test an exact-compare, all-or-nothing **offline-only**
   transaction or patch in a private disposable SQLite clone derived from
   the installed schema. Show exact preconditions and counts/row preimages;
   resolve both `unknown` intent and `submitted=1,resolved=0` attempt
   without a fake skipped/completed receipt, backend task/ID, replay or
   automatic subsequent work. Verify stale guards fail, collision and
   unrelated generations stay unchanged, duplicate invocation is not a
   replay, and crash/rollback preserves original state. Confirm constraints,
   triggers and intended worker behavior, not merely SQL row changes.
4. Analyze the **pending backlog** and root tenant/account binding as
   independent issues. Propose a safe explicit disposition/admission plan
   for remaining pending work; no automatic queue drain granted. Propose the
   smallest source fix for future authenticated tenant identity and a test
   proving an empty account/user scope is rejected *before* a submitted
   attempt latch is created. Do not silently rekey or resubmit the old
   request; do not modify installed code.
5. Capture the effective native Codex model endpoint when it can be proven
   using read-only attribution, or clearly mark UNVERIFIED. Do not generate
   GPU requests just to prove transport while protected admission is blocked.
6. Generate a complete **sanitized review packet** using
   `EVIDENCE_PUBLICATION_PROTOCOL.md`. Include the original proposal's
   relevant facts, exact source/DDL/trigger excerpts with original file
   hashes and line ranges, selected scrubbed 409/queue/counter evidence,
   complete offline patch/diff (not applied), focused tests and failures,
   a release/admission/rollback proposal, per-file SHA256 and privacy map.
   Include a supplemental `tar.gz` archive if it can be safely published,
   but always publish the inspectable plaintext files individually.
   **Publish evidence to the existing `issue/75` working branch in one
   evidence-only non-force fast-forward commit**, proving remote ref and
   published tree readback. Do not stage/commit production source changes.
   If a required source excerpt is unsafe for public publication, redact
   faithfully or omit it, mark Central review blocked for that claim, and
   preserve private original. Never bypass GitHub publication guards.
7. Return one consolidated typed handback, the verified publication SHA and
   links to the exact public evidence paths, plus `REPAIR_READY_FOR_CENTRAL_REVIEW`
   or the precise reason it is not. No live gate or model experiment.

## Acceptance and stop

PASS (for this **design-only** task) requires current-source-bound offline
recovery proof, exact stale-guard and rollback tests, honest disposition of
pending/generation records, and published inspectable sanitized evidence.
This is NOT acceptance of live production recovery or Graphiti extraction.
Stop if exact source identity differs materially, public evidence cannot be
made safe, model transport cannot be proven without unauthorized inference
(continue other CPU work), or an actual repair requires a protected mutation.
Do not call a sandbox experiment successful merely because a script exits 0.

## Typed handback

```text
RESULT=REPAIR_READY_FOR_CENTRAL_REVIEW|PARTIAL|BLOCKED
SOURCE_HEAD_BEFORE=<full SHA>
INSTALLED_GATE_SHA=<full SHA256 of actual source>
ORIGINAL_ATTEMPT=<private exact keys in private artifact; safe public projection>
BACKEND_NONACCEPTANCE_PROOF=<actual authenticated request and source/ledger readback>
LIVE_GATE_STATE=<pre/post identical read-only state, with hashes>
OFFLINE_REPAIR=<patch path/hash and tested schema version>
RECOVERY_SEMANTICS=<specific honest state transitions, constraints/triggers>
ATOMICITY_AND_ROLLBACK=<test logs/hashes and later-admission limits>
BACKLOG_AND_TENANT_BINDING=<independent risks, planned fixes>
CONTROLLER_TRANSPORT=<actual endpoint or UNVERIFIED>
EVIDENCE_PUBLICATION=<PASS|BLOCKED + exact GitHub SHA, files, hashes, redactions>
PROTECTED_STATE=<unchanged or exact discrepancy>
COMMAND_SHAPE_FRICTION=<full GHDEV-10 fields, even when none>
HANDOFF_RENDER_PREFLIGHT=PASS|FAIL
```
<<< LOCAL_AGENT_CONTRACT_END >>>
