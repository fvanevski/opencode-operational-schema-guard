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

The executor routes only to `[self-hosted, Linux, X64, ghdev-verify]`. The first deployment must register that runner at repository scope inside a GitHub-supported Ubuntu or Debian userspace/container on the workstation; raw Garuda/Arch is not the declared runner environment.

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
  "schema_version": "ghdev-runner-image-v2",
  "image_id": "opencode-operational-schema-guard-ghdev-verify-v2",
  "os_id": "ubuntu",
  "os_version_id": "24.04",
  "base_image_digest": "sha256:<64-lowercase-hex-image-digest>",
  "actions_runner_version": "<installed-runner-version>",
  "node_major": 22,
  "python_major": 3,
  "sandbox": "bubblewrap-no-network-v1"
}
```

`os_id` may be `ubuntu` or `debian`. The digest and runner version are provenance, not placeholders: record the exact image digest and installed Actions runner version actually used. Marker v1 and profile v1 receipts are not equivalent to the current environment contract.

Because this is a **public user-owned repository**, GitHub's general self-hosted-runner warning is directly relevant: public-fork workflow code must not be allowed to reach the runner automatically. Before registering the first runner, set the repository's fork-PR workflow approval policy to require maintainer approval for **all external contributors**, verify that setting, and do not manually approve an external workflow that targets the self-hosted label unless its code has been explicitly adjudicated. This repository cannot rely on organization runner-group workflow allowlisting because the owner is a user account. The controller's same-repository PR check is still mandatory; the repository setting is an additional scheduler-level defense, not a substitute.

Repository registration is operator-owned because GitHub runner registration tokens are short-lived credentials and must never be committed. Preferred deployment is an ephemeral repository-scoped runner/container:

1. build/start a dedicated Ubuntu/Debian runner image with system Node 22, npm, Git, Python 3, Bubblewrap (including `--json-status-fd` support), and the marker above;
2. drop all unnecessary Linux capabilities, enable `no-new-privileges`, keep the root filesystem read-only, expose no privileged host mounts, and retain the narrow custom seccomp policy that permits Bubblewrap's required `unshare(CLONE_NEWUSER)` without granting `CAP_SYS_ADMIN`;
3. for the dedicated Docker runner container, use `--security-opt systempaths=unconfined` so Docker does not mask/read-only-submount parent `/proc` paths that make the nested fresh procfs fail with `VFS: Mount too revealing`; verify the effective container has `MaskedPaths=[]` and `ReadonlyPaths=[]` while retaining non-root UID, `cap-drop=ALL`, `no-new-privileges`, custom seccomp, read-only rootfs, no host mounts, and no Docker socket;
4. never replace the narrow posture with `seccomp=unconfined`, `--privileged`, `--cap-add=SYS_ADMIN`, host PID/network/IPC namespaces, or host repository/home mounts;
5. run the dedicated runner container/VM with explicit CPU, memory, PID/process-count, and writable-filesystem limits appropriate to this repository so candidate code cannot turn host-wide resource exhaustion into an implicit privilege boundary;
6. register against this repository using GitHub's current one-time registration token and the custom label `ghdev-verify` (default `self-hosted`, `Linux`, and `X64` labels remain required);
7. prefer `--ephemeral` registration so one container handles one job; if a persistent runner is temporarily used, the workflow's never-reused run/attempt workspace remains mandatory and prior workspace state is never evidence authority; and
8. before registration, validate the exact production Bubblewrap topology plus actual `npm run check` and `npm test` under the same image/seccomp/system-path posture. Both repository-final commands must pass, and the Bubblewrap user/PID/network namespaces, fresh `/proc`, read-only candidate mount, environment allowlist, `/dev`, tmpfs `/tmp`, startup record, and exit record must remain proven.

Do not store registration tokens, runner credentials, seccomp policy contents, or host secrets in Actions artifacts, receipts, or project KB. The locally frozen seccomp file and its SHA-256 are host infrastructure evidence; Central should bind the exact hash during runner bootstrap without treating the host-owned policy as candidate repository source.

## GitHub Actions JavaScript runtime

The JavaScript runtime used internally by a reusable GitHub Action is separate from the Node runtime selected for repository commands. The trusted workflow and conventional CI pin Node-24-native action generations by exact commit SHA, while `actions/setup-node` continues to install Node 22 for the repository/controller/publisher command contract.

Current trusted generations are:

- `actions/checkout` v7.0.1;
- `actions/setup-node` v7.0.0;
- `actions/upload-artifact` v7.0.1; and
- `actions/download-artifact` v8.0.1.

All repository references use full 40-hex release commit SHAs rather than mutable tags. `actions/setup-node` also sets `package-manager-cache: false` explicitly: this workflow uses setup-node only to establish the trusted Node 22 runtime, and an automatically inferred package-manager cache would add an unnecessary cross-run state surface. A future action-generation update is a trusted-control change and requires the ordinary non-self-bootstrap lifecycle.

## Profile and execution semantics

`repository-final-v1` profile version 2 runs, in order and at most once each:

```text
npm run check
npm test
```

The controller revalidates canonical PR identity on the self-hosted runner immediately before command execution. The candidate checkout must prove `HEAD == expected_head_sha`. Before the first command, the executor must have admitted the v2 image marker and complete Git/Node/npm/Python/Bubblewrap provenance described above. Each command is launched only through Bubblewrap. A command is considered started only after the trusted Bubblewrap JSON status channel supplies a valid `child-pid`. A pre-child Bubblewrap failure, malformed/missing startup evidence, or inconsistent Bubblewrap exit evidence produces `BLOCKED`; only a proven-started command with consistent numeric nonzero child/process exit evidence produces ordinary `FAIL`. A supervising process termination without usable numeric exit remains `BLOCKED` rather than being normalized into a candidate failure.

The repository is mounted read-only during candidate execution, and after the commands the trusted executor independently proves exact HEAD plus `git status --porcelain=v1 --untracked-files=all` cleanliness. The candidate checkout is then removed; removal is part of PASS evidence. After the execution handoff artifact is uploaded, the workflow separately removes both its trusted-control run root and execution scratch directory and fails closed if either remains. The profile fingerprints `.npmrc`, `npm-shrinkwrap.json`, `package-lock.json`, `package.json`, and `scripts/test-plugin.mjs` as dependency/test-configuration provenance; missing optional files are represented explicitly as `MISSING`. Because the launcher-bearing files are also trusted-control paths, a candidate that changes them is not self-certifiable. `npm test` TAP totals are required for PASS when the profile declares the `node-tap` collector.

The publisher re-resolves the PR after execution. Any base/head movement converts the receipt to `STALE`, regardless of command exits. PASS therefore requires exact base/head identity both before and after execution.

## Receipt and status

The final artifact contains `receipt.json` with schema `ghdev-actions-evidence-v1`. It binds:

- repository, PR, expected and observed initial/final base/head SHAs;
- exact candidate checkout HEAD before/after;
- trusted workflow path/ref and controller commit SHA;
- profile ID/version and canonical command fingerprint;
- candidate dependency/config fingerprints;
- runner class/labels and actual supported-Linux userspace/image provenance;
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

A current PASS may satisfy only `actions-repository-deterministic` Verify when repository/head, controller SHA, profile/command fingerprint, candidate config fingerprints, required runner/environment scope, counts, and immutable run/artifact identity all match the consuming gate. For profile version 2 this includes the v2 image marker and complete Git/Node/npm/Python/Bubblewrap provenance; a profile-v1 or marker-v1 receipt is not environment-equivalent.

It does **not** satisfy semantic review, local Fresh-review, typed operational-schema host assessment, GPU/service/runtime/filesystem/process evidence outside this profile, or merged-main evidence for another SHA. The receipt therefore records both semantic review and host-specific evidence as `NOT_EVALUATED`.

Conventional `CI / node-contract` remains useful CI, but it is not automatically equivalent to this producer because ordinary `pull_request` workflows may execute GitHub's synthetic merge ref and do not carry the same trusted-controller/profile/receipt provenance. Conventional CI nevertheless uses the same Node-24-native checkout/setup-node generations and Node 22 repository runtime to avoid an unnecessary action/runtime-version discrepancy.

## Bootstrap rule

The first PR that introduces or changes this workflow/profile/environment contract cannot use its candidate copy as trust evidence. Validate that PR through the authoritative pre-Slice-K route. After merge, bind the exact new trusted `main` commit, rebuild the runner image with the v2 marker and Python 3, re-prove the accepted narrow seccomp plus `systempaths=unconfined` Docker posture, and run the exact repository-final profile locally inside the production Bubblewrap topology before registering one new ephemeral runner. Then prove the merged controller against a fresh exact same-repository docs-only test PR head. Only after Central can dispatch the trusted-main workflow, read the run, read/validate the artifact, verify the complete v2 environment provenance, and observe `local-host-verify` on that exact candidate SHA is this producer promoted to ordinary final-Verify authority.
