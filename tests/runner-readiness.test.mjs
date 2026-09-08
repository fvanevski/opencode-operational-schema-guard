import assert from "node:assert/strict"
import test from "node:test"
import {
  assessRunnerContainer,
  RunnerReadinessBlockedError,
  validateGitHubRunnerRegistration,
  validateNamedVolumeInspects,
  validateRunnerReadinessConfig,
  validateRunnerSettings,
} from "../lib/runner-readiness.mjs"

const image = `sha256:${"a".repeat(64)}`
const seccomp = "b".repeat(64)
const listener = "c".repeat(64)
const seccompProfile = {
  defaultAction: "SCMP_ACT_ERRNO",
  architectures: ["SCMP_ARCH_X86_64"],
  syscalls: [{ names: ["clone"], action: "SCMP_ACT_ALLOW", args: [] }],
}
const seccompInline = JSON.stringify(seccompProfile)

function config(overrides = {}) {
  return {
    schema_version: "ghdev-runner-readiness-v1",
    repository: "fvanevski/opencode-operational-schema-guard",
    container_name: "ghdev-verify-runner",
    expected_image_id: image,
    github_runner_labels: ["self-hosted", "Linux", "X64", "ghdev-verify"],
    network_mode: "bridge",
    runner_settings_path: "/runner/.runner",
    runner_listener_path: "/runner/bin/Runner.Listener",
    runner_listener_sha256: listener,
    runner_version: "2.337.0",
    healthcheck_test: ["CMD-SHELL", "pgrep -u 1000 -f 'Runner.Listener' >/dev/null"],
    seccomp: { path: "/etc/ghdev/runner-seccomp.json", sha256: seccomp },
    resources: { memory_bytes: 4294967296, nano_cpus: 4000000000, pids_limit: 1024 },
    allowed_named_volumes: [
      { name: "ghdev-runner-state", destination: "/runner", read_only: false },
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
    Created: "2026-09-08T00:00:00.000000000Z",
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
      SecurityOpt: ["no-new-privileges:true", `seccomp=${seccompInline}`],
      Binds: null,
      Tmpfs: { "/tmp": "rw,noexec,nosuid,size=1g" },
    },
    Mounts: [
      { Type: "volume", Name: "ghdev-runner-state", Destination: "/runner", RW: true },
      { Type: "volume", Name: "ghdev-runner-work", Destination: "/runner/_work", RW: true },
      { Type: "tmpfs", Destination: "/tmp", RW: true },
    ],
    State: { Running: true, Status: "running", Health: { Status: "healthy" } },
    ...overrides,
  }
}

function runnerSettings(overrides = {}) {
  return {
    DisableUpdate: true,
    Ephemeral: false,
    GitHubUrl: "https://github.com/fvanevski/opencode-operational-schema-guard",
    AgentId: 42,
    AgentName: "ghdev-verify-runner",
    WorkFolder: "_work",
    ...overrides,
  }
}

function volumes(overrides = {}) {
  const values = [
    { Name: "ghdev-runner-state", Driver: "local", Scope: "local", Options: null },
    { Name: "ghdev-runner-work", Driver: "local", Scope: "local", Options: null },
  ]
  return values.map((value) => ({ ...value, ...(overrides[value.Name] ?? {}) }))
}

function seccompProof(overrides = {}) {
  return { sha256: seccomp, mtime_ns: "1000000000", ctime_ns: "1000000000", profile: seccompProfile, ...overrides }
}

function githubRunners(overrides = {}) {
  const runner = {
    id: 42,
    name: "ghdev-verify-runner",
    status: "online",
    busy: false,
    labels: ["self-hosted", "Linux", "X64", "ghdev-verify"].map((name) => ({ name })),
    ...(overrides.runner ?? {}),
  }
  return { total_count: 1, runners: [runner], ...overrides.response }
}

function assess(configInput = config(), inspectInput = inspect(), options = {}) {
  return assessRunnerContainer(configInput, inspectInput, {
    volumeInspects: volumes(),
    seccompProof: seccompProof(),
    ...options,
  })
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
  assert.doesNotThrow(() => validateRunnerSettings(config(), runnerSettings()))
  assert.doesNotThrow(() => validateNamedVolumeInspects(config(), volumes()))
  const registration = validateGitHubRunnerRegistration(config(), runnerSettings(), githubRunners())
  assert.deepEqual(registration.labels, ["Linux", "X64", "ghdev-verify", "self-hosted"].sort())
  const result = assess()
  assert.equal(result.result, "PASS")
  assert.equal(result.running, true)
  assert.equal(result.healthy, true)
})

test("credential-like static environment and host binds fail closed", async () => {
  await blocked(() => assess(config(), inspect({ Config: { ...inspect().Config, Env: ["GH_TOKEN=secret"] } })), /credential-like environment/i)
  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, Binds: ["/home/user:/host"] } })), /host bind mounts/i)
})

test("privilege, every numeric UID-zero spelling, image, restart, resource, and health drift fail closed", async () => {
  for (const user of ["0:1000", "00:1000", "0000", "+0:1000", "-0:1000", "root:1000", "ROOT:1000"]) {
    await blocked(() => assess(config(), inspect({ Config: { ...inspect().Config, User: user } })), /non-root user/i)
  }
  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, Privileged: true } })), /must not be privileged/i)
  await blocked(() => assess(config(), inspect({ Image: `sha256:${"d".repeat(64)}` })), /image ID/i)
  const restartDrift = inspect()
  restartDrift.HostConfig = { ...restartDrift.HostConfig, RestartPolicy: { Name: "no", MaximumRetryCount: 0 } }
  await blocked(() => assess(config(), restartDrift), /restart policy/i)
  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, Memory: 1024 } })), /resource limits/i)
  await blocked(() => assess(config(), inspect({ State: { Running: true, Status: "running", Health: { Status: "unhealthy" } } })), /not healthy/i)
})

test("effective systempaths, namespaces, devices, named volumes, and tmpfs mount census are enforced", async () => {
  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, MaskedPaths: ["/proc/acpi"] } })), /masked\/read-only path lists/i)
  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, ReadonlyPaths: ["/proc/sys"] } })), /masked\/read-only path lists/i)
  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, PidMode: "host" } })), /PidMode/i)
  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, DeviceRequests: [{ Driver: "nvidia" }] } })), /host devices/i)
  await blocked(() => assess(config(), inspect({ Mounts: inspect().Mounts.filter((mount) => mount.Type !== "volume") })), /named-volume set/i)
  await blocked(() => assess(config(), inspect({ Mounts: inspect().Mounts.filter((mount) => mount.Type !== "tmpfs") })), /tmpfs mount set/i)
  await blocked(() => assess(config(), inspect({ Mounts: [...inspect().Mounts, { Type: "bind", Source: "/host", Destination: "/unexpected", RW: false }] })), /unexpected mount type/i)
})

test("Docker-persisted security options require NNP plus the exact custom seccomp semantics", async () => {
  const reorderedProfile = {
    syscalls: seccompProfile.syscalls,
    defaultAction: seccompProfile.defaultAction,
    architectures: seccompProfile.architectures,
  }
  const reordered = inspect()
  reordered.HostConfig = { ...reordered.HostConfig, SecurityOpt: ["no-new-privileges=true", `seccomp=${JSON.stringify(reorderedProfile)}`] }
  assert.equal(assess(config(), reordered).result, "PASS")

  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, SecurityOpt: [`seccomp=${seccompInline}`] } })), /no-new-privileges/i)
  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, SecurityOpt: ["no-new-privileges:true"] } })), /exactly one applied seccomp/i)
  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, SecurityOpt: ["no-new-privileges:true", "seccomp=unconfined"] } })), /custom seccomp profile/i)
  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, SecurityOpt: ["no-new-privileges:true", "seccomp={not-json"] } })), /not valid inline JSON/i)
  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, SecurityOpt: ["no-new-privileges:true", `seccomp=${JSON.stringify({ ...seccompProfile, defaultAction: "SCMP_ACT_ALLOW" })}`] } })), /differs from frozen host profile/i)
  await blocked(() => assess(config(), inspect({ HostConfig: { ...inspect().HostConfig, SecurityOpt: ["no-new-privileges:true", `seccomp=${seccompInline}`, "apparmor=unconfined"] } })), /unexpected SecurityOpt/i)
})

test("named volumes reject local-driver bind backing, non-local drivers, and missing writable runner-state coverage", async () => {
  await blocked(() => assessRunnerContainer(config(), inspect(), { volumeInspects: volumes({ "ghdev-runner-state": { Options: { type: "none", o: "bind", device: "/home/user" } } }), seccompProof: seccompProof() }), /must not use local-driver options/i)
  await blocked(() => assessRunnerContainer(config(), inspect(), { volumeInspects: volumes({ "ghdev-runner-work": { Driver: "custom" } }), seccompProof: seccompProof() }), /local Docker driver/i)
  await blocked(() => validateRunnerReadinessConfig(config({ allowed_named_volumes: [{ name: "unrelated", destination: "/data", read_only: false }] })), /writable named-volume coverage.*\/runner\/\.runner/i)
  await blocked(() => validateRunnerReadinessConfig(config({ allowed_named_volumes: [{ name: "state-ro", destination: "/runner", read_only: true }, { name: "work", destination: "/runner/_work", read_only: false }] })), /writable named-volume coverage.*\/runner\/\.runner/i)
})

test("seccomp bytes must be unchanged since before container creation", async () => {
  await blocked(() => assessRunnerContainer(config(), inspect(), { volumeInspects: volumes(), seccompProof: seccompProof({ mtime_ns: "9999999999999999999" }) }), /changed after container creation/i)
  await blocked(() => assessRunnerContainer(config(), inspect(), { volumeInspects: volumes(), seccompProof: seccompProof({ sha256: "d".repeat(64) }) }), /seccomp proof/i)
})

test("config requires exact GitHub routing labels, isolated network mode, and normalized absolute paths", async () => {
  await blocked(() => validateRunnerReadinessConfig(config({ github_runner_labels: ["self-hosted", "ghdev-verify"] })), /github_runner_labels/i)
  await blocked(() => validateRunnerReadinessConfig(config({ network_mode: "container:other" })), /cannot share another container namespace/i)
  await blocked(() => validateRunnerReadinessConfig(config({ seccomp: { path: "/etc/ghdev/../bad.json", sha256: seccomp } })), /normalized absolute path/i)
  await blocked(() => validateRunnerReadinessConfig(config({ runner_settings_path: "/tmp/decoy/.runner" })), /runner_settings_path must be exactly/i)
  await blocked(() => validateRunnerReadinessConfig(config({ runner_listener_path: "/tmp/decoy/Runner.Listener" })), /runner_listener_path must be exactly/i)
})

test("runner registration settings prove persistent update-disabled repository binding", async () => {
  assert.doesNotThrow(() => validateRunnerSettings(config(), runnerSettings()))
  await blocked(() => validateRunnerSettings(config(), runnerSettings({ DisableUpdate: false })), /DisableUpdate=true/i)
  await blocked(() => validateRunnerSettings(config(), runnerSettings({ Ephemeral: true })), /must not be ephemeral/i)
  await blocked(() => validateRunnerSettings(config(), runnerSettings({ GitHubUrl: "https://github.com/other/repo" })), /GitHubUrl/i)
  await blocked(() => validateRunnerSettings(config(), runnerSettings({ AgentId: 0 })), /AgentId/i)
  await blocked(() => validateRunnerSettings(config(), runnerSettings({ WorkFolder: "alternate-work" })), /WorkFolder must be exactly/i)
})

test("GitHub runner registration proves server-side identity, labels, and online idle state", async () => {
  assert.doesNotThrow(() => validateGitHubRunnerRegistration(config(), runnerSettings(), githubRunners()))
  await blocked(() => validateGitHubRunnerRegistration(config(), runnerSettings(), githubRunners({ runner: { labels: [{ name: "self-hosted" }, { name: "Linux" }, { name: "X64" }] } })), /labels do not match/i)
  await blocked(() => validateGitHubRunnerRegistration(config(), runnerSettings(), githubRunners({ runner: { status: "offline" } })), /online and idle/i)
  await blocked(() => validateGitHubRunnerRegistration(config(), runnerSettings(), githubRunners({ runner: { id: 99 } })), /does not uniquely match/i)
})
