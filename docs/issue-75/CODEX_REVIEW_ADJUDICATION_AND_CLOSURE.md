# Issue #75, PR #76: Codex exact-head findings and single remediation

Review head: e38d97c956499550104af03b0831ee8e3927f0e0.
All four Codex findings were reproduced or confirmed from exact source.
No positive approval is authorized before rebuilding the final candidate,
regression execution, host readback, and fresh head-bound trusted Verify.

| Finding | Impact | Central source |
| --- | --- | --- |
| P1 receipt binding POST skips hold | security/admission blocker | host-patches/20261102-integrated-oEAmIHhQ/fix_reviewed_gate.py |
| P1 drain ignores canonical unresolved work | inference isolation blocker | v2-candidate/post-exit-drain.py, test_post_exit_drain.py |
| P2 temporary binding outage dead-letters claimed work | data durability blocker | fix_reviewed_gate.py, tests/test_claim_binding_retry.py |
| P2 test uses invalid parents[6] | reproduction/test gap | tests/test_receipt_hold_fencing.py |

## Central implementation authority

The exact-preimage fix_reviewed_gate.py is the substantive source patch.
It accepts ONLY the previously pinned deployed gate SHA256
eb8753caddab78a2b3930f39985f453f1981a1fc3d012340baab017f8b792c94
and writes a new disposable output file without touching host services.

After reconstructing the candidate, incorporate the delta into the
single ORIGINAL-base SOURCE.diff and refresh SOURCE_PINS.json with computed,
verified hashes. Do not present the original deployed pin as the new one.
The other amended files are already directly staged on issue/75.

## One host-bound integration step, not a new design campaign

1. Fetch the current authenticated remote issue/75 head before local proof,
   use a clean disposable worktree, and read the staged scripts and tests.
2. Validate input pin and materialize candidate through fix_reviewed_gate.py.
   Reconstruct from original authenticated base too, and require byte identity.
3. Run CPU-only focused tests from reconstructed host-candidate:
   test_receipt_hold_fencing.py, test_claim_binding_retry.py,
   test_post_exit_drain.py, test_recovery.py and the affected 19-case
   TenantIntegration/I1Service suite. Test negative POST binding under hold,
   authoritative tenant mismatch, transient HTTP/status/timeouts, same-gen
   retry and submission-once after recovery; no false PASS for queued/unknown.
4. Confirm final source, DB, admission and service preflight; deploy as one
   reversible gate update only if the corrected source is fully verified.
   Preserve old repaired receipts, journal, groups, tenant binding and secrets.
   No reranker tuning, extraction benchmarks or repeated native V2 campaign.
5. Publish full canonical SOURCE.diff, SOURCE_PINS.json, focused test evidence,
   sanitized installed/restarted source pins and host restoration on existing
   issue/75; ensure exact-head CAS/nonforce and remote readback. No PR/merge.
6. Return a single complete typed handback. Central independently re-reviews
   the head and obtains fresh PR CI plus trusted exact-head Verify.

Host source/DB/service mutations are explicitly scoped, reversible only.
Do not override hold or inference exclusion to obtain a green test.
If an unexpected live state precludes safe deployment, keep the working
installation and report PARTIAL, with a precise recovery route.

REQUIRED=RESULT,START_SHA,PUBLISHED_SHA,TREE_SHA,FOUR_FINDINGS_DISPOSITION,
CANONICAL_GATE_PATCH_SHA,DETERMINISTIC_REBUILD,RECORDED_RETRY_TRANSITIONS,
TEST_RESULTS,HOST_SHA_AND_SERVICE_RESTART,QUEUE_AND_HOLD_STATE,
HISTORICAL_DATA_PRESERVED,EVIDENCE_PACKET_PATHS,RESIDUAL_RISKS
