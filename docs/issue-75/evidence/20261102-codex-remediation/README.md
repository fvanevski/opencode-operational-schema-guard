# Issue #75: Consolidated Codex-Review Remediation & Evidence Packet

**Date:** 2026-11-02  
**Repository:** `fvanevski/opencode-operational-schema-guard`  
**Branch:** `issue/75`  
**Required Starting HEAD:** `ae43d4b192655a275b54b8feb24a26fa56909fd1`  
**Role:** Build / Host-Bound Integration  
**Final Result:** `PASS` (All four Codex findings P1-1, P1-2, P2-1, P2-2 verified and closed)

---

## 1. Executive Summary & Disposition of the Four Findings

1. **Finding P1-1 (Receipt binding POST bypasses admission hold):**
   - *Fix:* Gate `_proxy()` was modified so that `is_binding` is restricted to HTTP GET requests matching exact regex `^/api/v1/admin/commit_receipts/binding/[^/]+$`. Any POST to receipt endpoints (including `/api/v1/admin/commit_receipts/binding/{key}` or URL-encoded `/api/v1/admin/commit_receipts/%62inding/{key}`) is fenced by `admission_hold.publication()`, returning HTTP 503 while admission hold is active and preventing backend reconciliation side effects.
   - *Verification:* `test_receipt_hold_fencing.py` (8/8 PASS) verified ordinary GET, URL-encoded GET, POST to standard receipt path, and POST to `/binding/key` are all fenced (HTTP 503) with 0 backend calls, while pure read-only GET binding lookups remain accessible.

2. **Finding P1-2 (Post-exit drain ignores canonical unresolved work in SQLite):**
   - *Fix:* `post-exit-drain.py` now implements `canonical_unresolved(gate, config)` which connects to the canonical gate SQLite DB via `_read_only_gate_connection()` (`mode=ro`, `PRAGMA query_only=ON`) and inspects `memory_work` for any active `admitted`, `processing`, or `blocked_reconcile` tasks. If unresolved work exists or the DB is unreadable, it fails closed before checking inference metrics.
   - *Verification:* `test_post_exit_drain.py` (9/9 PASS) verified:
     - Canonical queue with `blocked_reconcile` immediately blocks drain before calling metrics.
     - Unreadable / missing DB fails closed.
     - Idle queue without `memory_work` table passes.
     - Contentious flock contention fails closed without bypassing lease.

3. **Finding P2-1 (Temporary binding outage dead-letters claimed work):**
   - *Fix:* In `_verified_claim_binding(row)`, transient errors (transport timeouts, HTTP 503, 404, or malformed responses) return `None` rather than `False`. In `_process_receipted(row)`, when `binding is None` prior to submission (`not attempt["submitted"]`), the worker calls `self.db.retry(row, "pre-submission owner binding temporarily unavailable", self.cfg)` to requeue the intent under bounded exponential backoff. Authoritative scope mismatches return `False` and remain terminally dead-lettered.
   - *Verification:*
     - Unit tests: `test_claim_binding_retry.py` (4/4 PASS).
     - End-to-end qualification: `TRANSIENT_RETRY_QUALIFICATION.json` verified that when backend returns HTTP 503, the intent transitions to retriable `pending` with `attempts=1` and `submitted=0` (no dead-letter, zero receipt POSTs). Upon backend recovery (HTTP 200 match), the intent progresses to `complete` with `submitted=1` (exactly one submission, zero duplicate executions).

4. **Finding P2-2 (Fencing test uses fragile `parents[6]` relative traversal):**
   - *Fix:* Replaced fragile relative traversal in `test_receipt_hold_fencing.py` with `candidate_gate = pathlib.Path(__file__).resolve().parents[1] / "host-candidate" / "gate"`, failing closed with a clear error if the reconstructed candidate gate is absent.
   - *Verification:* Test suite executes and passes 8/8 against reconstructed candidate gate.

---

## 2. Reconstructed Source & Pin Integrity

- **Original Base Reversal:** Validated that reverse-patching (`patch -R -p1`) the new canonical `SOURCE.diff` against the candidate tree produces byte-identical original base files for all 7 pinned entries, matching `base_sha256` in `SOURCE_PINS.json`.
- **Forward Candidate Patch:** Forward-patching (`patch -p1`) produces byte-identical files matching `candidate_sha256` (`aa0cf54e4513767b87f18e9704e27eb398a6aee3e71462644044d8805fd12b96` for gate).
- **Reproduction Tooling:** Verified `reproduce.py --backend <path> --gate <path>` directly against deployed host paths, completing with exit code 0 and producing valid test trees.

---

## 3. Operational Deployment & Service Posture

- **Preimage Backup:** Captured `/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py.pre-codex-fix-20261102` (`eb8753caddab...`).
- **Deployed Gate:** Atomically replaced `/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py` with the candidate (`aa0cf54e4513...`).
- **Service Restart:** Restarted `openviking-commit-gate.service` via `systemctl --user restart`. Confirmed fresh PID 810932 active, listening on `127.0.0.1:1933` and connecting to backend `127.0.0.1:1934`.
- **Durable Queues & Hold:** Verified `recovery_hold` remains released (`held=0`), 1,306 complete intents, 19 dead, 9 failed, 93 resolved commit attempts, and 3 rejection repair audit entries preserved. Zero destructive mutations.
- **Lock:** Canonical agent lock `/run/user/1000/openviking-agent.lock` remains unlocked.
