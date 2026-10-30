# Issue 70 — Codex P2 backend dependency drift remediation

Codex review at PR #71 exact head `a055754daa450405176b9b1d0f1458d2494075a9`, thread `PRRT_kwDOULzk_M6yJ8Qa`, identified that original host validation checked only `source-base-manifest.json` but omitted the runtime dependencies recorded in `source-ownership.json` (notably native RAGFS, TaskTracker and SessionService). This could return false PASS after a queue/terminal implementation change.

Central correction: `verify_source_home.py` now reads **all** recorded `/site-packages/openviking/` files using the explicit provided `--backend-root`, enforces safe confined paths and full SHA-256 identity, checks three mandatory dependencies are recorded, and cross-checks any overlapping original-source digest against the source-base manifest. It rejects mismatched, absent, malformed or duplicate backend dependencies. Output adds `backend_dependency_checks`; old `original_source_checks` is unchanged.

Regression suite now contains 10 checks (previous six plus native binary drift, TaskTracker drift, omitted SessionService record and contradicting original-vs-recorded digest). No production source, memory, backend or capture candidate is changed by this correction.

**Verification boundary:** Central has authored this narrow fix against exact GitHub source; run all 10 tests and the read-only host preflight on the current installed host before treating the review finding as resolved. Keep PR #71 draft until independent exact-head review and acceptance. Do not weaken the check by updating expected hashes to match unexpected host drift. The current patch-construction routine remains separate, and the host preflight's new dependency evidence is required in its artifact.

Next substantive Phase 2 development should be staged on a **distinct continuation branch derived from the reviewed Phase 1 source** to avoid broadening draft PR #71; no additional PR is needed until its implementation is ready and the Phase 1 merge boundary is decided.
