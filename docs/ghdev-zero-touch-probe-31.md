# GHDEV Issue #31 zero-touch Verify probe

This file is an inert same-repository documentation-only candidate used to prove the trusted `GHDEV exact-head Verify` workflow after the persistent self-hosted runner readiness remediations were merged to `main`.

- Trusted controller base at probe creation: `3cc6e11290fd1a790fa9cf12c0569d97fe5c63b6`.
- Purpose: exercise Central workflow dispatch, self-hosted executor pickup, trusted publisher receipt/status, and restart persistence without modifying the GHDEV control plane.
- This probe does not change workflow, profile, executor, publisher, readiness, dependency-launch, or runner-environment authority.
- The probe should not be merged as product functionality; it exists only as bounded acceptance evidence for Issue #31.
