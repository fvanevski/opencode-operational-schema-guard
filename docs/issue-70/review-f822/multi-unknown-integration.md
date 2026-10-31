# Issue 70: Central-integrated multi-unknown recovery protection

Scope: review finding B1 from the independently reviewed f822e881905730d0da13e69aad5c94a8dd3cba1c.

Central has changed candidate/gate/openviking_commit_gate.py in-place to disallow an inference-producing recovery for one unknown request while another unknown or inflight commit remains unresolved. Read-only receipt polling remains allowed and quiet grace/shared lease requirements remain unchanged. Both recovery call sites now pass the current work row.

Added candidate/gate/tests/test_multi_unknown_recovery.py: five regression cases for a distinct accepted queued task, two unknowns, the read-only sweep, independent pending work and interactive lease contention. Updated the gate count in run_qualification.py from 48 to 53. This source was NOT host-tested on the new exact commit by Central.

NEXT LOCAL TASK: run all tests, add a disposable actual-OpenViking-backend multi-request test (A native-queued and not yet executing, B unknown and ready to recover, idle model metrics; no recover=true for B until exact terminal proof for A; then B proceeds once). Test restart, launcher blocking, no duplicate inference, and queue replay as relevant. Do not dilute the negative-path assertions.

PACKAGING NOTE: patches/gate.patch, source-base-manifest.json, SHA256SUMS, CHANGED_FILES.txt and qualification.json are from the prior f822 candidate. Rebuild the installable gate patch from the original authenticated host source; forward/reverse compare and refresh all hashes, inventories, and counts in one cohesive local GitHub artifact commit. Do not claim package consistency before this work.

FAIL-CLOSED LIMIT: Two independently ambiguous requests without backend-authoritative proof may remain blocked. That is not permission to use empty task lists or idle metrics to release either. Within this one local pass, improve availability only through a verified, smallest-possible per-request/source-backed proof. Do not create a new scheduler.

Keep real Graphiti ingestion disabled, live source/data/config untouched, and retain historical V1 source ownership boundary. A source-bound candidate is not an installed V2 deployment.
