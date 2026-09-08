# Trusted self-hosted Actions repository Verify

This repository contains the controller/profile contract for a trusted exact-head evidence producer at `.github/workflows/ghdev-verify.yml` for ordinary repository-deterministic final Verify. It becomes evidence authority only after the introducing control-plane change is merged, the workflow is therefore loaded from trusted `main`, the supported self-hosted runner is installed/registered, and post-merge exact-head artifact/status consumption is proven. It is deliberately separate from OpenCode semantic review and from typed host/runtime assessment.

## Trust boundary

The workflow is `workflow_dispatch` only. Dispatch must target trusted `main` and supply:

- `pr_number`;
- `expected_base_sha`;
- `expected_head_sha`;
- `expected_controller_sha`; and
- `profile=repository-final-v1`.

The controller requires its live workflow identity to be `.github/workflows/ghdev-verify.yml@refs/heads/main` and `github.sha` to equal `expected_controller_sha`. It resolves the canonical PR before the self-hosted job is admitted, requires `base.ref=main`, exact base/head SHA equality, and `head.repo.full_name` equal to this repository. Fork/foreign heads are denied before the self-hosted runner is acquired.

Self-certification is not decided from the PR's mutable `/pulls/{number}/files` view. The trusted controller resolves the immutable Git trees for the dispatched `expected_base_sha` and `expected_head_sha`, fails closed if either recursive tree response is truncated or malformed, computes the changed-path set from those exact tree identities, and applies the bounded 1,000-path control-plane census to that immutable set. A force-push/restore race therefore cannot substitute a benign changed-file list for the exact candidate SHA that will execute.

The trusted profile lives at `evidence/profiles/repository-final-v1.json`. A PR that changes the workflow, profile, controller/executor/publisher scripts, receipt library, or validation launch authority (`package.json`, `scripts/test-plugin.mjs`, `.npmrc`, the exact top-level `node_modules` path, or any tracked `node_modules/**` descendant) is classified as a control-plane change and is denied self-certification by the existing trusted controller. This prevents a candidate from retaining the nominal `npm run check` / `npm test` profile while silently redefining what those commands execute. Such a change must use the pre-existing trusted acceptance route and, after merge, be proven from trusted `main`.

## Executor isolation

The executor routes only to `[self-hosted, Linux, X64, ghdev-verify]`. The runner is registered at repository scope inside a GitHub-supported Ubuntu or Debian userspace/container on the workstation; raw Garuda/Arch is not the declared runner environment. For this single-workstation producer, the supported steady-state deployment is a continuously connected persistent listener container. It is configured once, remains registered across jobs/reboots, and is kept running by Docker `unless-stopped`; Central dispatch must not require a per-run local launch or token-injection rendezvous.

The runner container/VM is an infrastructure trust boundary and must have no host Docker socket, `sudo`, canonical developer repository mount, OpenCode state, SSH keys, browser/session material, OpenAI/Hugging Face credentials, or unrelated host secrets. Do not mount the user's normal home directory.

Candidate execution is a second isolation boundary. Before every run the workflow requires a run/attempt-unique workspace that did not already exist. `actions/checkout` materializes the exact expected candidate SHA with `persist-credentials: false`. The trusted executor then runs the profile commands through Bubblewrap with:

- `--unshare-all` plus an explicit required user namespace (`--unshare-user`) and `--cap-drop ALL`;
- `--clearenv` plus only `HOME`, `PATH`, `CI`, and locale allowlist values;
- a fresh `/proc`, `/dev`, and tmpfs `/tmp`;
- only system toolchain/runtime mounts needed for execution;
- the exact candidate checkout mounted read-only at `/workspace`; and
- a dedicated Bubblewrap `--json-status-fd` channel used as trusted startup/exit evidence.

The executor does not count a profile command or claim the dynamic `unshared`/`read-only`/`clearenv-allowlist` execution properties until Bubblewrap's status channel reports a valid `child-pid`, which Bubblewrap emits only after the sandboxed child starts. A numeric nonzero Bubblewrap process status without that child-start record is an isolation/setup failure and is typed `BLOCKED`, not an ordinary candidate `FAIL`. Once a child has started, Bubblewrap's reported child exit record must agree with the process status; inconsistent status evidence also fails closed.

The candidate does not see the trusted controller checkout, runner home, host home, parent process namespace, GitHub publisher token, or Actions write credentials. Its sandbox PATH is fixed to `/usr/bin:/bin`; the exact top-level `node_modules` path and tracked `node_modules/**` descendants are trusted-control denials because npm script launcher resolution can otherwise be shadowed. The self-hosted job has read-only repository permissions. The publisher is a separate GitHub-hosted job and is the only job with `statuses: write`.

The self-hosted runner must provide `/usr/bin/node` (major 22), `/usr/bin/npm`, `/usr/bin/git`, `/usr/bin/python3` (major 3), and `/usr/bin/bwrap`; the installed Bubblewrap must support `--json-status-fd`. Python is part of the repository-final runtime because repository-owned assessment tests launch their supervisor through `/usr/bin/python3`. The trusted executor preflights all five absolute tool paths before starting any profile command, requires Node 22 and Python 3, and constrains the candidate PATH to `/usr/bin:/bin`. It also reads `/etc/os-release`, requires its actual `ID`/`VERSION_ID` to match the image marker, and records bounded versions plus SHA-256 fingerprints for Git, Node, npm, Python, Bubblewrap, and `os-release`. Missing/mismatched provenance is typed `BLOCKED` with zero profile commands started; the producer does not convert a missing infrastructure runtime into candidate `FAIL` or silently fall back to a host/user toolchain.

## Runner image marker and operator bootstrap

Create `/etc/ghdev-runner-image.json` inside the supported Linux runner image before registration. It is hashed into every execution receipt and must have this shape:

```json
{
  "schema_version": "ghdev-runner-image-v3",
  "image_id": "opencode-operational-schema-guard-ghdev-verify-v3",
  "os_id": "ubuntu",
  "os_version_id": "24.04",
  "base_image_digest": "sha256:<64-lowercase-hex-image-digest>",
  "actions_runner_version": "<installed-runner-version>",
  "node_major": 22,
  "python_major": 3,
  "sandbox": "bubblewrap-no-network-v1",
  "listener_mode": "persistent-listener-v1",
  "runner_updates": "disabled"
}
```

`os_id` may be `ubuntu` or `debian`. The digest and runner version are provenance, not placeholders: record the exact image digest and installed Actions runner version actually used. Marker v3 additionally binds the always-ready persistent-listener lifecycle and the requirement that runner self-update is disabled. Older marker/profile generations are not equivalent to the current environment contract.

Because this is a **public user-owned repository**, GitHub's general self-hosted-runner warning is directly relevant: public-fork workflow code must not be allowed to reach the runner automatically. Before registering the first runner, set the repository's fork-PR workflow approval policy to require maintainer approval for **all external contributors**, verify that setting, and do not manually approve an external workflow that targets the self-hosted label unless its code has been explicitly adjudicated. This repository cannot rely on organization runner-group workflow allowlisting because the owner is a user account. The controller's same-repository PR check is still mandatory; the repository setting is an additional scheduler-level defense, not a substitute.

Repository registration is operator-owned because GitHub runner registration tokens are short-lived credentials and must never be committed. The one-time bootstrap for the always-ready listener is:

1. build/start a dedicated Ubuntu/Debian runner image with system Node 22, npm, Git, Python 3, Bubblewrap (including `--json-status-fd` support), and the marker above;
2. drop all unnecessary Linux capabilities, enable `no-new-privileges`, keep the root filesystem read-only, expose no privileged host mounts, and retain the narrow custom seccomp policy that permits Bubblewrap's required `unshare(CLONE_NEWUSER)` without granting `CAP_SYS_ADMIN`;
3. for the dedicated Docker runner container, use `--security-opt systempaths=unconfined` so Docker does not mask/read-only-submount parent `/proc` paths that make the nested fresh procfs fail with `VFS: Mount too revealing`; verify the effective container has `MaskedPaths=[]` and `ReadonlyPaths=[]` while retaining non-root UID, `cap-drop=ALL`, `no-new-privileges`, custom seccomp, read-only rootfs, no host bind mounts, and no Docker socket;
4. never replace the narrow posture with `seccomp=unconfined`, `--privileged`, `--cap-add=SYS_ADMIN`, host PID/network/IPC namespaces, host devices, or host repository/home mounts;
5. run the dedicated runner container with exact CPU, memory, PID/process-count, named-volume, tmpfs, healthcheck, and network limits recorded in `/etc/ghdev/runner-readiness.json`; every allowed persistent volume must be an ordinary Docker `local`/`local` named volume with no driver `Options` (local-driver bind backing is forbidden), and the host seccomp file must already contain its final frozen bytes **before** the container is created;
6. register against this repository once using GitHub's current one-time registration token and the custom label `ghdev-verify` (default `self-hosted`, `Linux`, and `X64` labels remain required), using `config.sh --disableupdate` and **not** `--ephemeral`; the persisted `.runner` `AgentId`/`AgentName` and GitHub's repository runners API must subsequently identify the same runner with exactly those four server-side labels;
7. remove the one-time registration token from the host immediately after registration, persist only the runner's repository-scoped registration state in the dedicated named volume(s), and never expose that state inside the Bubblewrap candidate sandbox;
8. configure the container with Docker restart policy `unless-stopped`, ensure Docker itself starts at host boot, and run `scripts/ghdev-runner-readiness.mjs --config /etc/ghdev/runner-readiness.json` after bootstrap/recreation to prove the exact hardened posture;
9. before promotion, validate the exact production Bubblewrap topology plus actual `npm run check` and `npm test` under the same image/seccomp/system-path posture. Both repository-final commands must pass, and the Bubblewrap user/PID/network namespaces, fresh `/proc`, read-only candidate mount, environment allowlist, `/dev`, tmpfs `/tmp`, startup record, and exit record must remain proven; and
10. prove zero-touch operation by dispatching from Central while no local interactive shell participates, then restart the runner container (or Docker service) and repeat the dispatch without re-registration/token injection.

The persistent outer runner is **not** evidence authority for prior-job workspace state. Each Actions run still creates a run/attempt-unique workspace, performs exact-head checkout after remote recheck, executes candidate commands only inside Bubblewrap, and removes the candidate/run scratch before PASS. Persistent listener state therefore replaces only the manual scheduler rendezvous, not per-run source/isolation cleanup.

Do not store registration tokens, runner credentials, seccomp policy contents, or host secrets in Actions artifacts, receipts, repository source, or project KB. The one-time registration token must not remain in Docker environment metadata after registration. The locally frozen seccomp file and its SHA-256 are host infrastructure evidence; Central should bind the exact hash during runner bootstrap without treating the host-owned policy as candidate repository source.

### Persistent-listener readiness contract

`/etc/ghdev/runner-readiness.json` is host-owned, contains no credentials, and uses schema `ghdev-runner-readiness-v1`. It binds the repository, container name, exact Docker image ID, exact GitHub routing labels, named/bridge (never host/none/other-container-shared) Docker network, exact healthcheck vector, frozen seccomp path/hash, CPU/memory/PID limits, allowed named volumes/tmpfs, exact non-secret `.runner` settings path, and exact Runner.Listener path/version/SHA-256. The readiness CLI independently reads the current seccomp file plus nanosecond mtime/ctime, `docker inspect` output and container creation time, each named volume's Docker driver/scope/options, the container's non-secret `.runner` settings, `Runner.Listener --version` and SHA-256, and the authenticated GitHub repository runners API. It fails closed unless all of the following remain true: persisted `DisableUpdate=true`, non-ephemeral exact-repository registration; `.runner` AgentId/AgentName uniquely match a GitHub-side runner that is `online`, idle, and has exactly `self-hosted,Linux,X64,ghdev-verify`; exact runner version/binary; explicit non-root UID (including rejection of alternate numeric spellings of UID 0); `Privileged=false`; read-only rootfs; `CapDrop=ALL` and no added capabilities; `no-new-privileges`; exact seccomp whose current mtime and ctime both predate container creation; `systempaths=unconfined` with empty Docker masked/read-only path lists; no host namespace/device/bind mounts; ordinary local named volumes with no driver options or bind backing; exact tmpfs/resource set; `unless-stopped`; exact persistent-listener/update-disabled Docker labels; no credential-like static environment variables; exact healthcheck; and running/healthy state. The readiness command therefore requires local authenticated `gh` read access in addition to Docker inspection; scheduler readiness is not inferred from container metadata alone.

A readiness PASS is host infrastructure evidence only. It does not substitute for the workflow's exact-head execution receipt. Conversely, the workflow receipt does not prove that Docker will restart the listener after a future host reboot; both are required when accepting or diagnosing the persistent deployment.

## GitHub Actions JavaScript runtime

The JavaScript runtime used internally by a reusable GitHub Action is separate from the Node runtime selected for repository commands. The trusted workflow and conventional CI pin Node-24-native action generations by exact commit SHA, while `actions/setup-node` continues to install Node 22 for the repository/controller/publisher command contract.

Current trusted generations are:

- `actions/checkout` v7.0.1;
- `actions/setup-node` v7.0.0;
- `actions/upload-artifact` v7.0.1; and
- `actions/download-artifact` v8.0.1.

All repository references use full 40-hex release commit SHAs rather than mutable tags. `actions/setup-node` also sets `package-manager-cache: false` explicitly: this workflow uses setup-node only to establish the trusted Node 22 runtime, and an automatically inferred package-manager cache would add an unnecessary cross-run state surface. A future action-generation update is a trusted-control change and requires the ordinary non-self-bootstrap lifecycle.

## Profile and execution semantics

`repository-final-v1` profile version 3 runs, in order and at most once each:

```text
npm run check
npm test
```

The controller revalidates canonical PR identity on the self-hosted runner immediately before command execution. The candidate checkout must prove `HEAD == expected_head_sha`. Before the first command, the executor must have admitted the v3 image marker, complete Git/Node/npm/Python/Bubblewrap provenance, and the live `/runner/.runner` persistent registration state. It requires actual `DisableUpdate=true`, non-ephemeral exact-repository registration, a positive AgentId, AgentName equal to the Actions-assigned `RUNNER_NAME`, and the actual `/runner/bin/Runner.Listener` version matching the image marker. Each command is launched only through Bubblewrap. A command is considered started only after the trusted Bubblewrap JSON status channel supplies a valid `child-pid`. A pre-child Bubblewrap failure, malformed/missing startup evidence, or inconsistent Bubblewrap exit evidence produces `BLOCKED`; only a proven-started command with consistent numeric nonzero child/process exit evidence produces ordinary `FAIL`. A supervising process termination without usable numeric exit remains `BLOCKED` rather than being normalized into a candidate failure.

The repository is mounted read-only during candidate execution, and after the commands the trusted executor independently proves exact HEAD plus `git status --porcelain=v1 --untracked-files=all` cleanliness. It also re-reads the live `.runner` settings and Runner.Listener after candidate execution and requires the listener mode, update policy, AgentId/name, settings SHA-256, listener version, and listener SHA-256 to be unchanged; drift yields `BLOCKED/FINAL_RUNNER_IDENTITY_ERROR`. The candidate checkout is then removed; removal is part of PASS evidence. After the execution handoff artifact is uploaded, the workflow separately removes both its trusted-control run root and execution scratch directory and fails closed if either remains. The profile fingerprints `.npmrc`, `npm-shrinkwrap.json`, `package-lock.json`, `package.json`, and `scripts/test-plugin.mjs` as dependency/test-configuration provenance; missing optional files are represented explicitly as `MISSING`. Because the launcher-bearing files are also trusted-control paths, a candidate that changes them is not self-certifiable. `npm test` TAP totals are required for PASS when the profile declares the `node-tap` collector.

The publisher re-resolves the PR after execution. Any base/head movement converts the receipt to `STALE`, regardless of command exits. PASS therefore requires exact base/head identity both before and after execution.

## Receipt and status

The final artifact contains `receipt.json` with schema `ghdev-actions-evidence-v1`. It binds:

- repository, PR, expected and observed initial/final base/head SHAs;
- exact candidate checkout HEAD before/after;
- trusted workflow path/ref and controller commit SHA;
- profile ID/version and canonical command fingerprint;
- candidate dependency/config fingerprints;
- runner class/labels and actual supported-Linux userspace/image provenance;
- live persistent listener mode/update policy, `.runner` settings SHA-256, Runner.Listener SHA-256, AgentId/name, and final live-runner identity-continuity result;
- Actions runner, Git, Node, npm, Python, and Bubblewrap versions plus Git/Node/npm/Python/Bubblewrap/OS SHA-256 fingerprints;
- required/run command counts and per-command exits;
- TAP test totals when available/required;
- worktree cleanliness and candidate-workspace cleanup;
- native executor result/block reason and final PR-identity result/reason;
- workflow run/attempt, execution identity, execution-artifact ID, and deterministic receipt-artifact name;
- evidence class; and
- a deterministic SHA-256 digest over the receipt excluding the digest field itself.

The publisher validates the execution record before building the receipt. Conflicting/malformed execution or receipt data is rejected rather than normalized into PASS. The receipt records both the native executor result and the final PR-identity result so a later STALE/BLOCKED disposition cannot erase the underlying command evidence.

Publication is intentionally ordered **receipt artifact first, status second**. The trusted publisher re-resolves the PR, builds and validates `receipt.json`, uploads that immutable artifact, then re-resolves the PR again immediately before creating commit status context `local-host-verify` on `expected_head_sha`. `PASS` maps to success, `FAIL` to failure, and `BLOCKED`/`STALE` to error. A source move detected while commands are running is encoded as STALE in the receipt; a move in the narrow artifact-to-status interval cannot inherit success because the final status recheck downgrades the old expected head to STALE. The new head never receives the old receipt/status. A receipt artifact without the matching current exact-head status and live PR identity is not sufficient acceptance evidence.

## Evidence equivalence boundary

A current PASS may satisfy only `actions-repository-deterministic` Verify when repository/head, controller SHA, profile/command fingerprint, candidate config fingerprints, required runner/environment scope, counts, and immutable run/artifact identity all match the consuming gate. For profile version 3 this includes the v3 image marker, live `persistent-listener-v1` registration with `DisableUpdate=true`, exact `.runner`/Runner.Listener fingerprints and Agent identity held stable through the execution, and complete Git/Node/npm/Python/Bubblewrap provenance; any older profile/marker receipt is not environment-equivalent.

It does **not** satisfy semantic review, local Fresh-review, typed operational-schema host assessment, GPU/service/runtime/filesystem/process evidence outside this profile, or merged-main evidence for another SHA. The receipt therefore records both semantic review and host-specific evidence as `NOT_EVALUATED`.

Conventional `CI / node-contract` remains useful CI, but it is not automatically equivalent to this producer because ordinary `pull_request` workflows may execute GitHub's synthetic merge ref and do not carry the same trusted-controller/profile/receipt provenance. Conventional CI nevertheless uses the same Node-24-native checkout/setup-node generations and Node 22 repository runtime to avoid an unnecessary action/runtime-version discrepancy.

## Bootstrap rule

The first PR that introduces or changes this workflow/profile/environment contract cannot use its candidate copy as trust evidence. Validate that PR through the authoritative pre-Slice-K route. After merge, bind the exact new trusted `main` commit, rebuild/relabel the runner image with the v3 marker and Python 3, re-prove the accepted narrow seccomp plus `systempaths=unconfined` Docker posture, and run the exact repository-final profile locally inside the production Bubblewrap topology. Configure/register the persistent listener once with `--disableupdate`, prove `ghdev-runner-readiness-v1` PASS, then prove the merged controller against a fresh exact same-repository docs-only test PR head with no local interactive activation. Repeat after a container/Docker restart without a new registration token. Only after Central can dispatch the trusted-main workflow, read the run, read/validate the artifact, verify the complete v3 environment provenance, and observe `local-host-verify` on that exact candidate SHA is this producer promoted to ordinary final-Verify authority.
