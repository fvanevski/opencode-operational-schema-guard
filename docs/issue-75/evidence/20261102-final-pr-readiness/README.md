# Issue #75: Final PR-Readiness Qualification & Evidence Packet

**Date:** 2026-11-02  
**Repository:** `fvanevski/opencode-operational-schema-guard`  
**Branch:** `issue/75`  
**Required Starting HEAD:** `bff777f0f174c755c119db952da63fff1b38c664`  
**Role:** Build Controller  
**Final Result:** `PASS` (All findings B1, B2, B3 resolved; genuine stock OpenCode V2 acceptance proven)

---

## 1. Executive Summary

This evidence packet closes the final verification-integrity findings identified by Central for Issue #75:
1. **Finding B1 (Unified Graphiti Sanitizer & Extraction Proxy):** Reconstructed Graphiti source from both clean pinned base (`7f9f51853c68...`) and deployed state (`2f070e28fc52...`) yielding byte-identical `run_graphiti.py` (`3481d30aeccc870da3c559596b966c6128a914556e7a2b7c6d8ababb1c2f6f99`). 13/13 sanitizer regressions passed. Extraction proxy secured with environment-authenticated `LITELLM_MASTER_KEY` on loopback only.
2. **Finding B2 (Unmocked Normal Gate Admission):** Verified terminal progression of session `oc-ses_issue75_verify_e358da8688df41adba37e6e34ba41130` through the unmodified ordinary gate worker under canonical quiet grace (30.0s). Confirmed `TERMINAL_VERIFIED` with receipt state `terminal`, outcome `completed`, `release_proven: 1`, and settled attempt under rotated root authentication.
3. **Finding B3 (Full Service / Tenant Integration):** Executed the complete 19-test `TenantIntegration` and `I1Service` suite using `/home/filip/.local/share/uv/tools/openviking/bin/python` in a disposable fixture environment. All 19 tests PASSED in 148.285s. Updated `reproduce.py` to link `candidate/shim` directly from authenticated repository source `docs/issue-70/implementation/i1-integrated/candidate/shim`.
4. **Harness Classifier Validation:** Narrowly exempted passive ChatGPT desktop helpers (`codex exec-server`, `codex app-server`) while retaining active CLI controllers (`codex`, `opencode`, `agy`, `opencode-desktop`). 12/12 unit tests passed in `test_harness_classifier.py`.
5. **Credential Rotation & Hardening:** Rotated `OPENVIKING_ROOT_API_KEY` in `/etc/openviking/openviking.env` (new key SHA256: `6b3c97853d270972e7a3cbb5dba532c61054abea3c4c211e38ead654bbf24cef`). Both gate (:1933) and backend (:1934) verified authenticated; invalid keys fail closed with HTTP 401/403. Zero raw credentials exposed.
6. **Genuine Stock OpenCode V2 Event Acceptance:** Ran stock OpenCode 2.2.5 CLI in an isolated sandbox with the candidate plugin `opencode-v2-candidate-graphiti` enabled. The native runtime delivered the user decision to `ctx.session.hook('prompt')` and `ctx.session.hook('context')`, atomically staging journal candidate `44f5e0d0-8313-4ec0-a957-ce0fa7e70d6b` bound to session `ses_issue75_stock_native_v2`. Post-harness Graphiti extraction under EX lock materialized 3 entities and 3 edges (`PUBLISHES`, `RUNS`, `PRECEDES`) in remote episode `2fcbf9e8-cc18-46ed-b6d6-8d2a8f4bcedf`. Fresh-process recall verified source attribution, group isolation (0 wrong-group facts), and 300ms context injection budget compliance.

---

## 2. Evidence Artifacts

| File | Description |
|---|---|
| `CREDENTIAL_ROTATION.json` | Sanitized ledger of root credential rotation and authenticated service readback. |
| `HARNESS_CLASSIFIER_REGRESSIONS.json` | 12/12 unit test results for passive desktop helper exemption and active harness detection. |
| `SERVICE_INTEGRATION_TESTS.json` | 19/19 test results for the complete `TenantIntegration` and `I1Service` suite. |
| `CONTRACT_TEST_RESULTS.json` | Summary of all 86 unit, contract, and regression tests passed across 8 suites. |
| `UNMOCKED_GATE_COMMIT_RECEIPT.json` | Verified terminal commit receipt produced by ordinary gate worker with zero mocks. |
| `V2_STOCK_EVENT_RECALL.json` | Genuine stock OpenCode V2 event capture, Graphiti extraction, and fresh-process recall ledger. |
| `HOST_POSTURE.json` | Host service health, queue states (0 pending, 1,306 complete), and durable invariant verification. |
| `SHA256SUMS` | Cryptographic checksums of all files in this evidence packet. |
| `EVIDENCE_MANIFEST.json` | Typed manifest binding evidence artifacts to their commit and source identity. |

---

## 3. Reproduction & Invariants

- **Source Reconstruction:** `reproduce.py --backend <path> --gate <path>` reconstructs the candidate tree, verifies bidirectional patch application against `SOURCE_PINS.json`, and links authenticated test fixtures.
- **Durable Repair Invariance:** Historical rejected commit remains dead (`state='dead'`, `resolved=1`) with immutable audit trail in `rejection_repairs`. Zero duplicate execution.
- **Service Isolation:** Graphiti extraction runs strictly during maintenance windows under canonical exclusive lock (`openviking-agent.lock`), preserving production inference isolation.
