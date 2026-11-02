# Issue #75 Final Integration and PR-Readiness Implementation Plan

**Goal:** Resolve the three findings (B1, B2, B3) from Central's independent review (`docs/issue-75/INDEPENDENT_REVIEW_INTEGRATED_RECOVERY_20261102.md`) and achieve exact-head PR-readiness on `issue/75`.

---

## Architecture & Decomposition

1. **B1: Graphiti Sanitization Overlay & LiteLLM Config**
   - Base `run_graphiti.py` SHA: `7f9f51853c68f43b44e98e48af11d85cb7accf0b4130f2af919bfe8c5c309ba8`
   - Deployed `run_graphiti.py` SHA: `2f070e28fc52b0dea04b2adf532661ebb498e02f70ad61721c661164aae60119`
   - File: `docs/issue-75/host-patches/graphiti/run_graphiti.py.patch`
   - File: `docs/issue-75/host-patches/graphiti/litellm-extract.yaml`
   - File: `docs/issue-75/host-patches/graphiti/graphiti_sanitizer.py` (overlay implementation)
   - File: `docs/issue-75/host-patches/graphiti/tests/test_graphiti_sanitizer.py` (regression suite)

2. **B3: Receipt GET Fencing Under Admission Hold**
   - File: `gate/openviking_commit_gate.py` (and deployed service)
   - File: `docs/issue-75/host-patches/20261102-integrated-oEAmIHhQ/tests/test_receipt_hold_fencing.py`
   - Gate `_proxy` must fence all `/api/v1/admin/commit_receipts/{session}/{key}` routes under `admission_hold.publication` for both GET and POST, regardless of `recover` parameter.
   - Truly read-only `/api/v1/admin/commit_receipts/binding/{session}` remains unfenced.

3. **B2: Pending Intents Disposition & Safe Hold Release**
   - File: `gate/admission_hold.py`
   - File: `docs/issue-75/host-patches/20261102-integrated-oEAmIHhQ/tests/test_untenanted_retirement.py`
   - Method: `retire_untenanted_pending(path, expected_intent, *, owner, evidence_digest)`
   - Rows 1325 and 1327: PROVEN_INVALID_UNTENANTED (blank tenant scope, 0 attempts, backend 409). Retired to `state='dead'`, `last_error='untenanted_spool_rejected: owner audited'`.
   - Row 1326: LEGITIMATELY_PENDING (`account: garion`, `user_id: filip`, binding verified).
   - Test hold release: `set_hold(path, owner, revision, False, reason)`.
   - End-to-end demonstration of a new valid authenticated session commit.

---

## Detailed Task Steps

### Task 1: Reproducible Graphiti Extraction Fix (B1)
1. Write `docs/issue-75/host-patches/graphiti/graphiti_sanitizer.py` implementing `_strip_code_fences_and_thinking` with robust handling for:
   - `<think>...</think>` tags (single-line and multi-line)
   - Orphan leading `</think>` tags
   - Markdown code fences (```json ... ```)
   - Mixed thinking tags + markdown code fences
   - Valid empty structured JSON (`{"extracted_entities": [], "extracted_edges": []}`)
   - Malformed non-JSON (raises `json.JSONDecodeError`, does not swallow)
2. Write unit tests in `docs/issue-75/host-patches/graphiti/tests/test_graphiti_sanitizer.py`.
3. Run tests using `python3 -B docs/issue-75/host-patches/graphiti/tests/test_graphiti_sanitizer.py`.
4. Create reproducible patch `docs/issue-75/host-patches/graphiti/run_graphiti.py.patch` with verified base and deployed SHAs.
5. Create sanitized LiteLLM configuration `docs/issue-75/host-patches/graphiti/litellm-extract.yaml`.

### Task 2: Receipt GET Fencing Under Admission Hold (B3)
1. Write failing test in `docs/issue-75/host-patches/20261102-integrated-oEAmIHhQ/tests/test_receipt_hold_fencing.py` asserting that a GET on `/api/v1/admin/commit_receipts/{session}/{key}` returns 503 when hold=1.
2. Update `gate/openviking_commit_gate.py`:
   - In `_proxy`: Normalize path with `posixpath.normpath(urllib.parse.unquote(path.path))`.
   - If path starts with `/api/v1/admin/commit_receipts/` and not `/api/v1/admin/commit_receipts/binding/`:
     Fence with `with admission_hold.publication(self.server.db.path):`.
3. Run `test_receipt_hold_fencing.py` to confirm GREEN.
4. Deploy updated `openviking_commit_gate.py` to host (`/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py`) and restart `openviking-commit-gate.service`.
5. Verify live endpoint behavior: GET with hold=1 returns 503; `/binding/` returns 200.

### Task 3: Read-Only Audit & Guarded Terminal Disposition for Pending Intents (B2)
1. Add `retire_untenanted_pending(path, expected_intent, *, owner, evidence_digest)` to `gate/admission_hold.py`.
2. Write unit tests in `docs/issue-75/host-patches/20261102-integrated-oEAmIHhQ/tests/test_untenanted_retirement.py`.
3. Run unit tests to confirm GREEN.
4. Deploy `admission_hold.py` to host (`/home/filip/.local/share/openviking-commit-gate/admission_hold.py`).
5. Execute guarded retirement on live `/home/filip/.local/state/openviking-commit-gate/queue.sqlite3`:
   - Retire Row 1325 (`cx-01a19a50...`).
   - Retire Row 1327 (`cx-01a19a9f...`).
   - Record exact preimages and audit rows.
   - Verify Row 1326 (`oc-ses_e65c...`) remains pending and unaffected.
   - Verify historical rejected commit `f606b06...` and all other rows remain untouched.

### Task 4: Safe Hold Release & New Valid Session Commit (B2 Completion)
1. Release durable hold:
   - Call `set_hold(path, "issue75-integrated-oEAmIHhQ", 1, False, "release: untenanted pending intents audited and retired")`.
   - Confirm `held=0`, revision=2 in `recovery_hold`.
2. Let gate process Row 1326 or verify its clean completion.
3. Demonstrate a brand new authenticated session commit:
   - Create session `oc-ses_issue75_final_valid` with account `garion`, user `filip`.
   - Post commit intent to gate port 1933.
   - Observe intent queued, claimed, backend receipt created on port 1934, and terminal completion.
   - Independently read back receipt from gate port 1933 (`state="terminal"`).

### Task 5: Evidence Publication & Final Handback
1. Create `docs/issue-75/evidence/20261102-pr-readiness/` with:
   - `EVIDENCE_MANIFEST.json`
   - `SHA256SUMS`
   - `PENDING_INTENTS_DISPOSITION.json`
   - `RECEIPT_GET_FENCING_AUDIT.json`
   - `GRAPHITI_SANITIZER_EVIDENCE.json`
   - `NEW_SESSION_COMMIT_RECEIPT.json`
   - `HOST_POSTURE.json`
   - `TEST_RESULTS.json`
   - `README.md`
2. Run GitNexus graph change check: `detect-changes --scope all`.
3. Commit to `issue75-integrated-oEAmIHhQ` with commit message:
   `fix(issue-75): resolve extraction reproduction, receipt hold fencing, and pending intent disposition`
4. Fast-forward push to `origin issue/75`.
5. Read back remote ref and tree SHA.
6. Return consolidated handback with `RESULT=PASS`.
