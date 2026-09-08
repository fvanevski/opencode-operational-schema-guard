# Issue #31 zero-touch trusted Verify acceptance record

This document records the bounded acceptance sequence for the persistent GHDEV self-hosted runner introduced under Issue #31.

## First trusted dispatch

- Trusted controller/main SHA: `3cc6e11290fd1a790fa9cf12c0569d97fe5c63b6`
- Probe PR: `#40`
- Probe head SHA: `8b4e9ee245f8e033df3aad2d08bf1234d64f7255`
- Workflow: `.github/workflows/ghdev-verify.yml`
- Workflow run: `34191207035`
- Result: `PASS`
- Persistent executor: `ghdev-verify-workstation`, AgentId `32`
- Receipt result: `PASS`
- Exact-head status: `local-host-verify=SUCCESS`

The controller, isolated self-hosted executor, and trusted publisher all completed successfully without local runner activation or registration-token injection.

## Restart boundary

After the first successful dispatch, the preserved runner container was restarted exactly once with `docker restart ghdev-verify-runner`.

The restart preserved container identity, v3 image identity, AgentId `32`, runner listener identity, seccomp/readiness fingerprints, zero effective host-bind posture, and the documented Docker `--tmpfs` contract. No registration token was minted and no runner re-registration occurred. Readiness returned `PASS` both immediately before and after the restart.

## Pending completion

Issue #31 remains open until Central completes a second fresh trusted-main `workflow_dispatch` after this restart boundary and verifies the same controller → persistent executor → publisher topology, immutable typed receipt, and exact-head `local-host-verify=SUCCESS` result.

This documentation-only commit does not modify `.github/workflows/ghdev-verify.yml`, evidence profiles, controller/executor/publisher code, runner readiness code, dependency launch behavior, or any other trusted-control path. Its purpose is to durably record acceptance evidence while advancing `main` to a fresh trusted controller commit required by the governed exact-dispatch replay guard.
