# Issue #75 — Central review of pre-acceptance rejection recovery proposal

Status: **RECOVERY DESIGN REQUIRED / NO LIVE REPAIR AUTHORIZED**.
Source review performed 2026-11-02 using three user-uploaded files:
`HANDBACK(1).md`, `RECOVERY_PROPOSAL.json`, `EVIDENCE_MANIFEST.json`.
No access to the other 114 enumerated individual evidence artifacts or installed live gate source was available to Central. Do not represent this note as an independent inspection of those unavailable bytes.

## Evidence read and classification

The agent's forensic handback reports an authenticated original admin receipt POST returning **409** after the immutable request envelope had empty `account` and `user_id`. The installed backend `_receipt_owner` allegedly rejects that request **before** `owner.submit`, `ReceiptLedger.begin`, and `Session.commit_async`. The same specific request has no receipt, binding, archive, task, QueueFS work, or publication lease. The 404 receipt lookup is **not** by itself proof of nonacceptance.

The gate's own durable data reportedly retain a single matching `intents` row `state=unknown`, `requested_generation=2`, `processed_generation=0`, `claimed_generation=2`, `task_id=NULL`, and one `commit_attempts` record `submitted=1, resolved=0`. Under the described installed gate semantics, the attempt latch was recorded before the network submission. The reported 409 therefore explains why `submitted=1` is not evidence of backend acceptance.

**Provisional evidence conclusion:** `NEVER_ACCEPTED_PROVEN` is supported by a coherent cross-system record in the uploaded handback, **conditional** on independently checking the preserved source, backend access record, exact ledger snapshots, and live preimages before any mutation. The user-uploaded manifest's proposal entry SHA-256 `a0a1bbf1b68738158d4368c8345692ece49717e1d5e77c670043d2bd0f3ac6af` matches the uploaded proposal bytes. The supplied manifest lists **114** individual artifacts; it excludes itself and the handback (separately covered by a host-only SHA256SUMS). Central cannot validate the claimed 116-item seal from the three uploaded files alone.

## What the proposed recovery correctly rejects

- Repeating the original receipt POST with blank tenant scope: invalid, potentially duplicate side effect.
- Changing the old tenant/account fields or rekeying to the creator's actual identity: creates a *different* immutable operation, not reconciliation of the failed old request.
- Treating GET 404 as equivalent to terminal failure, or forging `skipped`, `completed`, task IDs or backend release receipts.
- Calling `QueueDB.dead_letter` alone: agent reports its `commit_attempt_resolved` trigger handles `OLD.state=inflight` but the row is `unknown`, leaving the unresolved latch.
- Direct unguarded SQL or blind replay.

## Review finding and minimum implementation contract

No executable SQL/script can be approved from the proposal alone: installed gate methods, table DDL, triggers, constraints, lifecycle ordering, and service writer coordination have not been independently inspected here. A single-row `unknown -> dead` update would be inadequate if it leaves `commit_attempts.resolved=0` or prematurely admits other queued work.

Prepare, **offline first**, a narrowly scoped owner-only resolution for a *proved pre-acceptance rejection*. Its contract must distinguish a **backend rejection without processing** from a terminal processed/skipped commit; preserve original request key, scope, generation, content digest and immutable evidence; and atomically settle both the intent barrier and attempt latch under exact compare guards. Choose valid states only after reading current installed schema/trigger code. Never fabricate receipt/task/release evidence.

Prove with regression tests against a disposable copy of the **actual installed** schema:
1. Exact rejected pre-acceptance attempt resolves the two related gate invariants without scheduling new work, creating a receipt, or changing the original request identity.
2. A mismatched scope/key/generation/body digest/state or concurrent mutation makes the transaction fail without partial changes.
3. Other intents, historical generations, and failed/dead task history remain unchanged.
4. Failure/crash before transaction commit preserves original preimages; restart is idempotent and does not replay or repeatedly mutate the settled intent.
5. A `pending`/generation-gap backlog does **not** become an unexamined automatic drain when the barrier clears; account for gate worker admission/lease, not just SQLite row changes.
6. Future tenant/account binding and pre-submit validation are fixed independently as the **root cause of recurrence**, with realistic caller/header semantics and no implicit rewriting of this rejected request.

The rollback window is restricted: transaction rollback before commit is safe if preimages are intact; after a worker resumes another job, a row-only restore cannot reverse downstream effects. A safe repair plan therefore needs actual live exclusion/admission control, consistent backup and explicit pending-work disposition, not only a saved database file.

## Authorization and sequencing

Current user authorization covers a reversible pause of **verified competing inference clients for Graphiti experiments**. It does **not** cover writing the protected gate's durable SQLite state, deploying new admin/gate code, clearing/replaying blocked work, or changing the gate's identity/locking policy.

The appropriate next milestone is an **inspectable, sanitized exact-source evidence packet and offline tested recovery candidate on `issue/75`**, followed by independent Central review and, if warranted, separate scoped authorization to execute the guarded repair. Do not pause production clients or launch Graphiti GPU work merely to prepare this packet.

Separate outstanding blocker: native Codex exec-bound effective inference URL remains UNVERIFIED; clearing this gate row will not by itself prove GPU safety.
