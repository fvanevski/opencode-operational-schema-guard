import assert from "node:assert/strict"
import test from "node:test"
import {
  assessRunnerContainer,
  RunnerReadinessBlockedError,
  validateRunnerReadinessConfig,
  validateRunnerSettings,
} from "../lib/runner-readiness.mjs"

const image = `sha256:${"a".repeat(64)}`
const seccomp = "b".repeat(64)

function config(overrides = {}) {
  return {
    schema_version: "ghdev-runner-readiness-v1",
    repository: "fvanevski/opencode-operational-schema-guard",
    container_name: "ghdev-verify-runner",
    expected_image_id: image,
    github_runner_labels: ["self-hosted", "Linux", "X64", "ghdev-verify"],
    network_mode: "bridge",
    runner_settings_path: "/opt/actions-runner/.runner",
    runner_listener_path: "/opt/actions-runner/bin/Runner.Listener",
    runner_listener_sha256: "c".repeat(64),
    runner_version: "2.337.0",
    healthcheck_test: ["CMD-SHELL", "pgrep -u 1000 -f 'Runner.Listener' >/dev/null"],
    seccomp: { path: "/etc/ghdev/runner-seccomp.json", sha256: seccomp },
    resources: { memory_bytes: 4294967296, nano_cpus: 4000000000, pids_limit: 1024 },
    allowed_named_volumes: [
      { name: "ghdev-runner-state", destination: "/runner/state", read_only: false },
      { name: "ghdev-runner-work", destination: "/runner/_work", read_only: false },
    ],
    allowed_tmpfs: [{ destination: "/tmp", options: "rw,noexec,nosuid,size=1g" }],
    ...overrides,
  }
}

function inspect(overrides = {}) {
  return {
    Name: "/ghdev-verify-runner",
    Image: image,
    Config: {
      User: "1000:1000",
      Image: "runner@example",
      Env: ["PATH=/usr/bin:/bin", "RUNNER_ALLOW_RUNASROOT=0"],
      Labels: {
        "ghdev.repository": "fvanevski/opencode-operational-schema-guard",
        "ghdev.runner.labels": "self-hosted,Linux,X64,ghdev-verify",
        "ghdev.runner.mode": "persistent-listener-v1",
        "ghdev.runner.role": "repository-final-verify",
        "ghdev.runner.update": "disabled",
      },
      Healthcheck: { Test: ["CMD-SHELL", "pgrep -u 1000 -f 'Runner.Listener' >/dev/null"] },
    },
    HostConfig: {
      Privileged: false,
      ReadonlyRootfs: true,
      CapAdd: null,
      CapDrop: ["ALL"],
      NetworkMode: "bridge",
      PidMode: "",
      IpcMode: "private",
      UTSMode: "",
      UsernsMode: "",
      CgroupnsMode: "private",
      Devices: [],
      DeviceRequests: [],
      AutoRemove: false,
      RestartPolicy: { Name: "unless-stopped", MaximumRetryCount: 0 },
      Memory: 4294967296,
      NanoCpus: 4000000000,
      PidsLimit: 1024,
      MaskedPaths: [],
      ReadonlyPaths: [],
      SecurityOpt: ["no-new-privileges:true", "systempaths=unconfined", "seccomp=/etc/ghdev/runner-seccomp.json"],
      Binds: null,
      Tmpfs: { "/tmp": "rw,noexec,nosuid,size=1g" },
    },
    Mounts: [
      { Type: "volume", Name: "ghdev-runner-state", Destination: "/runner/state", RW: true },
      { Type: "volume", Name: "ghdev-runner-work", Destination: "/runner/_work", RW: true },
    ],
    State: { Running: true, Status: "running", Health: { Status: "healthy" } },
    ...overrides,
  }
}

async function blocked(fn, pattern) {
  await assert.rejects(async () => fn(), (error) => {
    assert.ok(error instanceof RunnerReadinessBlockedError)
    if (pattern) assert.match(error.message, pattern)
    return true
  })
}

test("persistent hardened listener fixture is admitted", () => {
  assert.equal(validateRunnerReadinessConfig(config()).schema_version, "ghdev-runner-readiness-v1")
  assert.doesNotThrow(() => validateRunnerSettings(config(), { DisableUpdate: true, Ephemeral: false, GitHubUrl: "https://github.com/fvanevski/opencode-operational-schema-guard", AgentName: "ghdev-verify-runner", WorkFolder: "_work" }))
  const result = assessRunnerContainer(config(), inspect())
  assert.equal(result.result, "PASS")
  assert.equal(result.running, true)
  assert.equal(result.healthy, true)
})

test("credential-like static environment and host binds fail closed", async () => {
  await blocked(() => assessRunnerContainer(config(), inspect({ Config: { ...inspect().Config, Env: ["GH_TOKEN=secret"] } })), /credential-like environment/i)
  await blocked(() => assessRunnerContainer(config(), inspect({ HostConfig: { ...inspect().HostConfig, Binds: ["/home/user:/host"] } })), /host bind mounts/i)
})

test("privilege, root identity, image, restart, resource, and health drift fail closed", async () => {
  await blocked(() => assessRunnerContainer(config(), inspect({ Config: { ...inspect().Config, User: "0:1000" } })), /non-root user/i)
  await blocked(() => assessRunnerContainer(config(), inspect({ Config: { ...inspect().Config, User: "root:1000" } })), /non-root user/i)
  await blocked(() => assessRunnerContainer(config(), inspect({ HostConfig: { ...inspect().HostConfig, Privileged: true } })), /must not be privileged/i)
  await blocked(() => assessRunnerContainer(config(), inspect({ Image: `sha256:${"c".repeat(64)}` })), /image ID/i)
  await blocked(() => assessRunnerContainer(config(), inspect({ HostConfig: { ...inspect().HostConfig, RestartPolicy: { Name: "no", MaximumRetryCount: 0 } } })), /restart policy/i)
  await blocked(() => assessRunnerContainer(config(), inspect({ HostConfig: { ...inspect().HostConfig, Memory: 1024 } })), /resource limits/i)
  await blocked(() => assessRunnerContainer(config(), inspect({ State: { Running: true, Status: "running", Health: { Status: "unhealthy" } } })), /not healthy/i)
})

test("systempaths, seccomp, namespaces, devices, and exact volume set are enforced", async () => {
  await blocked(() => assessRunnerContainer(config(), inspect({ HostConfig: { ...inspect().HostConfig, SecurityOpt: ["no-new-privileges:true", "seccomp=/etc/ghdev/runner-seccomp.json"] } })), /SecurityOpt/i)
  await blocked(() => assessRunnerContainer(config(), inspect({ HostConfig: { ...inspect().HostConfig, PidMode: "host" } })), /PidMode/i)
  await blocked(() => assessRunnerContainer(config(), inspect({ HostConfig: { ...inspect().HostConfig, DeviceRequests: [{ Driver: "nvidia" }] } })), /host devices/i)
  await blocked(() => assessRunnerContainer(config(), inspect({ Mounts: [] })), /named-volume set/i)
})

test("config requires exact GitHub routing labels, isolated network mode, and normalized absolute paths", async () => {
  await blocked(() => validateRunnerReadinessConfig(config({ github_runner_labels: ["self-hosted", "ghdev-verify"] })), /github_runner_labels/i)
  await blocked(() => validateRunnerReadinessConfig(config({ network_mode: "container:other" })), /cannot share another container namespace/i)
  await blocked(() => validateRunnerReadinessConfig(config({ seccomp: { path: "/etc/ghdev/../bad.json", sha256: seccomp } })), /normalized absolute path/i)
})

test("runner registration settings prove persistent update-disabled repository binding", async () => {
  const valid = { DisableUpdate: true, Ephemeral: false, GitHubUrl: "https://github.com/fvanevski/opencode-operational-schema-guard", AgentName: "ghdev-verify-runner", WorkFolder: "_work" }
  assert.doesNotThrow(() => validateRunnerSettings(config(), valid))
  await blocked(() => validateRunnerSettings(config(), { ...valid, DisableUpdate: false }), /DisableUpdate=true/i)
  await blocked(() => validateRunnerSettings(config(), { ...valid, Ephemeral: true }), /must not be ephemeral/i)
  await blocked(() => validateRunnerSettings(config(), { ...valid, GitHubUrl: "https://github.com/other/repo" }), /GitHubUrl/i)
})
