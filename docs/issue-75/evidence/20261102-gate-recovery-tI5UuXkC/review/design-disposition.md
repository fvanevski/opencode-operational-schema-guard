# Recovery and recurrence design disposition — NOT IMPLEMENTED

The original intended route was an exact-compare atomic resolution of both
`intents.unknown` and `commit_attempts.resolved=0`, using existing `dead` to mean
rejected without processing. `processed_generation` must not be advanced as if
extraction succeeded, and no fake skipped/completed receipt, task or release ID
may be created. Preserve the immutable attempt and a separate rejection audit.

An alternative new terminal state would require broader readers/schema changes.
Generic dead_letter alone is insufficient: its installed trigger only resolves
attempts whose old intent state is inflight. Re-keying, replay or synthetic
skipped semantics are inadmissible. The source drift stops implementation before
either alternative is a qualified candidate.

## Backlog/hold requirements

The current pending records and generation gaps are summarized with private
identities aliased. Clearing the target cannot authorize their drain. A future
review must define a durable global hold checked before reconciliation/model
work and atomically with worker claims, not rely solely on a live harness name
or a temporary EX descriptor. The hold must survive repair/controller crash and
remain until each pending item has an explicitly approved disposition.

The current worker has not acquired that new capability. The offline selector
characterization only shows backlog remains selectable after target dead-letter;
it does not prove actual worker/model admission. No global-hold schema or worker
patch is installed, and no simulated check is labeled a live qualification.

## Future tenant binding requirements

Authenticate the real caller through a backend-authoritative, version-bound
identity before creating or marking an attempt submitted. In API-key ROOT mode,
ordinary assertion headers may be stripped/defaulted by the backend; raw headers
or a session's creator metadata are not sufficient caller attestation. Missing,
mismatched, stale or non-authoritative binding must fail closed, without a new
attempt latch. Reject ambiguous whitespace/case/duplicate-header normalization
and preserve original scope exactly once frozen. A new request with a valid
binding must not silently alter or re-key the old rejected attempt.

No recurrence implementation or binding test is claimed while the current disk
receipt interface and retained live route disagree. Central must first choose
the supported identity/readback interface and coherent runtime version.

## Rollback and future live execution proposal

NOT EXECUTABLE. Reauthenticate exact source, original tuple/body, no publication
and current ledger/QueueFS state. Obtain separate protected-state and deployment
authority, retain canonical exclusion, take a verified consistent backup and
hold normal admission. Review exact compare guards for scope/key/generation/body,
state/task/submitted/resolved and concurrent drift; verify all-or-nothing repair
and restart/idempotence with actual schema/trigger behavior offline first.

Before commit, SQL rollback preserves preimages. After commit, restoration is
safe only while admission/exclusion remains held and no other work was released.
Once another job starts, a row-only restore cannot undo downstream effects. Do
not release the hold or EX merely because this controller is currently active.
Controller transport, pending disposition and later inference maintenance need
their own proofs. No production execution command or credential is supplied.
