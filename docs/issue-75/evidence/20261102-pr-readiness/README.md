# Issue #75 PR-Readiness Evidence Packet

This packet documents the conclusive resolution of all three blocking findings (B1, B2, B3) specified in Central's independent handback review (`docs/issue-75/INDEPENDENT_REVIEW_INTEGRATED_RECOVERY_20261102.md`).

---

## 1. Finding B1: Reproducible Graphiti Extraction Implementation

- **Published Artifacts**:
  - `docs/issue-75/host-patches/graphiti/run_graphiti.py.patch`: Exact patch from preimage base (`7f9f51853c68f43b44e98e48af11d85cb7accf0b4130f2af919bfe8c5c309ba8`) to deployed (`2f070e28fc52b0dea04b2adf532661ebb498e02f70ad61721c661164aae60119`).
  - `docs/issue-75/host-patches/graphiti/graphiti_sanitizer.py`: Reusable sanitization module.
  - `docs/issue-75/host-patches/graphiti/litellm-extract.yaml`: Sanitized LiteLLM extraction config (`preserve_thinking: false`, `drop_params: false`).
  - `docs/issue-75/host-patches/graphiti/tests/test_graphiti_sanitizer.py`: Regression suite covering multiline thinking blocks, orphan `</think>` tags, markdown code fences, nested fences, empty JSON schemas, and malformed non-JSON error propagation.
- **Verification Result**: 11/11 tests PASS in 0.605s.

---

## 2. Finding B3: Receipt GET Fencing Under Admission Hold

- **Vulnerability**: An ordinary GET on `/api/v1/admin/commit_receipts/{session}/{key}` with default `recover=false` was proxied via `_proxy_unheld`. The backend `get_commit_receipt` calls `reconcile(allow_recovery=False)`, mutating durable receipt state in `commit_receipts.sqlite3` (`preparing` -> `accepted`, `completed` -> `sealed_terminal`) while `recovery_hold.held=1`.
- **Resolution**:
  - Updated `gate/openviking_commit_gate.py`: Normalized path via `posixpath.normpath(urllib.parse.unquote(path.path))`.
  - All receipt endpoints under `/api/v1/admin/commit_receipts/{session}/{key}` are fenced under `admission_hold.publication` for both GET and POST, and all `recover` query variants (`recover=0`, `recover=false`, `recover=true`, omitted, encoded).
  - Purely read-only `/api/v1/admin/commit_receipts/binding/{session}` remains unfenced.
  - Deployed hash: `bef5696ab19b8e2f9c585eda7a5c61bf82bd6941f18a765e0830428f53c3e75b`.
- **Verification Result**: `test_receipt_hold_fencing.py` confirms that with hold=1, GET and POST return HTTP 503 `durable admission held` and backend reconcile is called 0 times. 6/6 tests PASS.

---

## 3. Finding B2: Disposition of Historically Pending Intents & Hold Release

- **Classification & Disposition**:
  - **Row 1325 (`cx-01a19a50-40f3-7b03-9d80-a7fb61421b59`)**: Blank tenant scope (`account: ""`, `user_id: ""`), 0 attempts, 0 receipts, backend returns 409 conflict, claim binding fails closed. Retired to terminal `state='dead'`, `last_error='untenanted_spool_rejected: owner audited'` under owned hold via exact full-row CAS. Evidence digest: `baf76d8ccff9d7f0d6c753dd11ac573ecc40a07079573183e704aca70fd5983b`.
  - **Row 1327 (`cx-01a19a9f-8933-74d1-b378-9f24d6ebd8a0`)**: Blank tenant scope (`account: ""`, `user_id: ""`), 0 attempts, 0 receipts, backend returns 409 conflict, claim binding fails closed. Retired to terminal `state='dead'`, `last_error='untenanted_spool_rejected: owner audited'` under owned hold via exact full-row CAS. Evidence digest: `467acfcbc5c074291bd26ec18605d52bb6bb100aa350d7c764b128c94e2e7308`.
  - **Row 1326 (`oc-ses_e65c4e095ffeycUDo0IpP5wLwV__r3_000001`)**: Legitimate pending session (`account: garion`, `user_id: filip`). Successfully processed by worker upon hold release to `state='complete'`, receipt sealed terminal (`8af41115071d701cf33dce7e589e4e9914678f84a28627647e03c1e79abad061`).
- **Hold Release**: Hold released via `hold.set_hold(..., False, ...)` to `held=0`, revision=2.
- **New Valid Authenticated Session Demonstration**:
  - Session `oc-ses_issue75_valid_1793649139` created on backend.
  - Admitted through gate port 1933 (`broker_intent_id`, `state="pending"`).
  - Worker verified pre-claim tenant binding, submitted receipt to backend, executed commit task.
  - Independent readback via gate port 1933 confirmed receipt `state="terminal"`, `outcome="completed"`.

---

## 4. Final Queue & Host State

- **Queue State**: 0 pending, 0 inflight, 1,303 complete, 19 dead, 9 failed.
- **Host Posture**: All services healthy (`openviking.service` 1934, `openviking-commit-gate.service` 1933, `litellm-proxy` 8002, `ninfer-serve` 8001, `falkordb` 6382, `tei-reranker` 8004).
- **Total Test Suite**: 43/43 tests PASS across all 7 suites with zero failures.
