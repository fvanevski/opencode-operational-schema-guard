import { createHash } from "node:crypto"
import { constants } from "node:fs"
import { open } from "node:fs/promises"
import { isAbsolute, normalize } from "node:path"

export const RUNNER_READINESS_SCHEMA = "ghdev-runner-readiness-v1"
export const RUNNER_LISTENER_MODE = "persistent-listener-v1"
export const RUNNER_UPDATE_MODE = "disabled"
export const RUNNER_SETTINGS_PATH = "/runner/.runner"
export const RUNNER_LISTENER_PATH = "/runner/bin/Runner.Listener"
export const RUNNER_WORK_FOLDER = "_work"
export const REQUIRED_GITHUB_RUNNER_LABELS = ["self-hosted", "Linux", "X64", "ghdev-verify"]

const SHA256 = /^[0-9a-f]{64}$/
const IMAGE_ID = /^sha256:[0-9a-f]{64}$/
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const CONTAINER = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/
const VOLUME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/
const NETWORK = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/
const RUNNER_VERSION = /^2\.\d{3,4}\.\d{1,4}$/
const MAX_FILE_BYTES = 64 * 1024
const SECRET_ENV = /(?:^|_)(?:TOKEN|SECRET|PASSWORD|PASSWD|PRIVATE_KEY|ACCESS_KEY|API_KEY)(?:_|$)/i

export class RunnerReadinessBlockedError extends Error {
  constructor(message) {
    super(message)
    this.name = "RunnerReadinessBlockedError"
    this.result = "BLOCKED"
  }
}

function blocked(message) {
  throw new RunnerReadinessBlockedError(message)
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) blocked(`${label} must be an object`)
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    blocked(`${label} must contain exactly: ${expected.join(", ")}`)
  }
}

function absolutePath(value, label) {
  if (typeof value !== "string" || !isAbsolute(value) || normalize(value) !== value || /[\0\r\n]/.test(value)) blocked(`${label} must be one normalized absolute path`)
  return value
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) blocked(`${label} must be a positive integer`)
  return value
}

function validateTmpfs(value) {
  if (!Array.isArray(value) || value.length > 8) blocked("allowed_tmpfs must be an array with at most 8 entries")
  const seen = new Set()
  return value.map((entry) => {
    exactKeys(entry, ["destination", "options"], "allowed_tmpfs entry")
    const destination = absolutePath(entry.destination, "allowed_tmpfs destination")
    if (destination === "/" || seen.has(destination)) blocked("allowed_tmpfs destinations must be unique and cannot be /")
    seen.add(destination)
    if (typeof entry.options !== "string" || entry.options.length > 256 || /[\0\r\n]/.test(entry.options)) blocked("allowed_tmpfs options are invalid")
    return { destination, options: entry.options }
  }).sort((a, b) => a.destination.localeCompare(b.destination))
}

function pathCoveredByDirectory(path, directory) {
  return path === directory || path.startsWith(`${directory}/`)
}

function validateVolumes(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) blocked("allowed_named_volumes must contain 1-8 entries")
  const names = new Set()
  const destinations = new Set()
  const volumes = value.map((entry) => {
    exactKeys(entry, ["destination", "name", "read_only"], "allowed_named_volumes entry")
    if (typeof entry.name !== "string" || !VOLUME.test(entry.name) || names.has(entry.name)) blocked("named volume names must be unique bounded identifiers")
    const destination = absolutePath(entry.destination, "named volume destination")
    if (destination === "/" || destinations.has(destination)) blocked("named volume destinations must be unique and cannot be /")
    if (typeof entry.read_only !== "boolean") blocked("named volume read_only must be boolean")
    names.add(entry.name)
    destinations.add(destination)
    return { name: entry.name, destination, read_only: entry.read_only }
  }).sort((a, b) => a.destination.localeCompare(b.destination))
  const writable = volumes.filter((entry) => !entry.read_only)
  for (const requiredPath of [RUNNER_SETTINGS_PATH, `/runner/${RUNNER_WORK_FOLDER}`]) {
    if (!writable.some((entry) => pathCoveredByDirectory(requiredPath, entry.destination))) blocked(`writable named-volume coverage is required for ${requiredPath}`)
  }
  return volumes
}

export function validateRunnerReadinessConfig(input) {
  exactKeys(input, [
    "allowed_named_volumes",
    "allowed_tmpfs",
    "container_name",
    "expected_image_id",
    "github_runner_labels",
    "healthcheck_test",
    "network_mode",
    "repository",
    "resources",
    "runner_listener_path",
    "runner_listener_sha256",
    "runner_settings_path",
    "runner_version",
    "schema_version",
    "seccomp",
  ], "readiness config")
  if (input.schema_version !== RUNNER_READINESS_SCHEMA) blocked(`schema_version must be ${RUNNER_READINESS_SCHEMA}`)
  if (typeof input.repository !== "string" || !REPOSITORY.test(input.repository)) blocked("repository must be owner/name")
  if (typeof input.container_name !== "string" || !CONTAINER.test(input.container_name)) blocked("container_name is invalid")
  if (typeof input.expected_image_id !== "string" || !IMAGE_ID.test(input.expected_image_id)) blocked("expected_image_id must be an exact sha256 Docker image ID")
  if (JSON.stringify(input.github_runner_labels) !== JSON.stringify(REQUIRED_GITHUB_RUNNER_LABELS)) blocked(`github_runner_labels must be exactly ${REQUIRED_GITHUB_RUNNER_LABELS.join(",")}`)
  if (typeof input.network_mode !== "string" || !NETWORK.test(input.network_mode) || new Set(["host", "none"]).has(input.network_mode)) blocked("network_mode must be one explicit named/bridge non-host network and cannot share another container namespace")
  const runnerSettingsPath = absolutePath(input.runner_settings_path, "runner_settings_path")
  const runnerListenerPath = absolutePath(input.runner_listener_path, "runner_listener_path")
  if (runnerSettingsPath !== RUNNER_SETTINGS_PATH) blocked(`runner_settings_path must be exactly ${RUNNER_SETTINGS_PATH}`)
  if (runnerListenerPath !== RUNNER_LISTENER_PATH) blocked(`runner_listener_path must be exactly ${RUNNER_LISTENER_PATH}`)
  if (!SHA256.test(input.runner_listener_sha256 ?? "")) blocked("runner_listener_sha256 must be a lowercase SHA-256")
  if (typeof input.runner_version !== "string" || !RUNNER_VERSION.test(input.runner_version)) blocked("runner_version must be an exact actions/runner version")
  if (!Array.isArray(input.healthcheck_test) || input.healthcheck_test.length < 2 || input.healthcheck_test.length > 16 || !new Set(["CMD", "CMD-SHELL"]).has(input.healthcheck_test[0])) blocked("healthcheck_test must be a bounded Docker CMD/CMD-SHELL vector")
  for (const entry of input.healthcheck_test) if (typeof entry !== "string" || entry.length < 1 || entry.length > 512 || /[\0\r\n]/.test(entry)) blocked("healthcheck_test contains an invalid entry")
  exactKeys(input.seccomp, ["path", "sha256"], "seccomp")
  const seccompPath = absolutePath(input.seccomp.path, "seccomp.path")
  if (!SHA256.test(input.seccomp.sha256 ?? "")) blocked("seccomp.sha256 must be a lowercase SHA-256")
  exactKeys(input.resources, ["memory_bytes", "nano_cpus", "pids_limit"], "resources")
  const resources = {
    memory_bytes: positiveInteger(input.resources.memory_bytes, "resources.memory_bytes"),
    nano_cpus: positiveInteger(input.resources.nano_cpus, "resources.nano_cpus"),
    pids_limit: positiveInteger(input.resources.pids_limit, "resources.pids_limit"),
  }
  return {
    ...input,
    runner_settings_path: runnerSettingsPath,
    runner_listener_path: runnerListenerPath,
    seccomp: { path: seccompPath, sha256: input.seccomp.sha256 },
    resources,
    allowed_named_volumes: validateVolumes(input.allowed_named_volumes),
    allowed_tmpfs: validateTmpfs(input.allowed_tmpfs),
  }
}

export function validateRunnerSettings(configInput, settings) {
  const config = validateRunnerReadinessConfig(configInput)
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) blocked("runner settings must be a JSON object")
  if (settings.DisableUpdate !== true) blocked("runner settings do not prove DisableUpdate=true")
  if (settings.Ephemeral === true) blocked("runner settings must not be ephemeral")
  if (typeof settings.GitHubUrl !== "string" || settings.GitHubUrl.replace(/\/$/, "") !== `https://github.com/${config.repository}`) blocked("runner settings GitHubUrl does not match the repository")
  if (!Number.isSafeInteger(settings.AgentId) || settings.AgentId < 1) blocked("runner settings AgentId is invalid")
  if (typeof settings.AgentName !== "string" || !settings.AgentName || settings.AgentName.length > 256) blocked("runner settings AgentName is invalid")
  if (settings.WorkFolder !== RUNNER_WORK_FOLDER) blocked(`runner settings WorkFolder must be exactly ${RUNNER_WORK_FOLDER}`)
  return settings
}

export function validateGitHubRunnerRegistration(configInput, settingsInput, response) {
  const config = validateRunnerReadinessConfig(configInput)
  const settings = validateRunnerSettings(config, settingsInput)
  if (!response || typeof response !== "object" || Array.isArray(response)) blocked("GitHub runners response must be an object")
  if (!Number.isSafeInteger(response.total_count) || response.total_count < 0 || response.total_count > 100) blocked("GitHub runners response exceeds the bounded 100-runner census")
  if (!Array.isArray(response.runners) || response.runners.length !== response.total_count) blocked("GitHub runners response is incomplete")
  const matches = response.runners.filter((runner) => runner?.id === settings.AgentId && runner?.name === settings.AgentName)
  if (matches.length !== 1) blocked("GitHub runner registration does not uniquely match persisted AgentId/AgentName")
  const runner = matches[0]
  const labels = Array.isArray(runner.labels) ? runner.labels.map((entry) => entry?.name) : []
  if (labels.some((label) => typeof label !== "string")) blocked("GitHub runner labels response is invalid")
  const observedLabels = [...labels].sort()
  const expectedLabels = [...config.github_runner_labels].sort()
  if (JSON.stringify(observedLabels) !== JSON.stringify(expectedLabels)) blocked("GitHub runner labels do not match the exact routing contract")
  if (runner.status !== "online" || runner.busy !== false) blocked("GitHub runner must be online and idle for readiness PASS")
  return { agent_id: runner.id, runner_name: runner.name, status: runner.status, busy: runner.busy, labels: observedLabels }
}

export function validateNamedVolumeInspects(configInput, volumeInspects) {
  const config = validateRunnerReadinessConfig(configInput)
  if (!Array.isArray(volumeInspects) || volumeInspects.length !== config.allowed_named_volumes.length) blocked("Docker named-volume inspection is incomplete")
  const byName = new Map()
  for (const volume of volumeInspects) {
    if (!volume || typeof volume !== "object" || Array.isArray(volume) || typeof volume.Name !== "string" || byName.has(volume.Name)) blocked("Docker named-volume inspection is invalid or duplicated")
    byName.set(volume.Name, volume)
  }
  for (const expected of config.allowed_named_volumes) {
    const volume = byName.get(expected.name)
    if (!volume) blocked(`Docker named-volume inspection is missing ${expected.name}`)
    if (volume.Driver !== "local" || volume.Scope !== "local") blocked(`named volume ${expected.name} must use the local Docker driver/scope`)
    if (volume.Options !== null && volume.Options !== undefined) {
      if (!volume.Options || typeof volume.Options !== "object" || Array.isArray(volume.Options) || Object.keys(volume.Options).length !== 0) blocked(`named volume ${expected.name} must not use local-driver options or bind backing`)
    }
  }
  return volumeInspects
}

function dockerCreatedNs(value) {
  const match = typeof value === "string" ? value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/) : null
  if (!match) blocked("Docker container Created timestamp is invalid")
  const wholeSecondsMs = Date.parse(`${match[1]}Z`)
  if (!Number.isFinite(wholeSecondsMs)) blocked("Docker container Created timestamp is invalid")
  const fraction = (match[2] ?? "").padEnd(9, "0") || "0"
  return BigInt(wholeSecondsMs) * 1_000_000n + BigInt(fraction)
}

function assertSeccompCreationBinding(config, inspect, proof) {
  if (!proof || typeof proof !== "object" || Array.isArray(proof) || proof.sha256 !== config.seccomp.sha256) blocked("seccomp proof does not match readiness config")
  for (const field of ["mtime_ns", "ctime_ns"]) if (typeof proof[field] !== "string" || !/^\d+$/.test(proof[field])) blocked(`seccomp proof ${field} is invalid`)
  const createdNs = dockerCreatedNs(inspect.Created)
  if (BigInt(proof.mtime_ns) > createdNs || BigInt(proof.ctime_ns) > createdNs) blocked("seccomp profile changed after container creation; recreate the runner container before readiness can PASS")
}

function normalizeSecurityOpt(value) {
  if (value === "no-new-privileges:true") return "no-new-privileges"
  return value
}

function assertMounts(config, inspect) {
  const binds = inspect.HostConfig?.Binds ?? []
  if (!Array.isArray(binds) || binds.length !== 0) blocked("runner container must not use host bind mounts")
  const mounts = inspect.Mounts ?? []
  if (!Array.isArray(mounts)) blocked("Docker inspect Mounts is invalid")
  const expectedVolumes = new Map(config.allowed_named_volumes.map((entry) => [entry.destination, entry]))
  const expectedTmpfs = new Set(config.allowed_tmpfs.map((entry) => entry.destination))
  const volumeMounts = mounts.filter((mount) => mount?.Type === "volume")
  const tmpfsMounts = mounts.filter((mount) => mount?.Type === "tmpfs")
  if (volumeMounts.length !== expectedVolumes.size) blocked("runner container named-volume set differs from readiness config")
  if (tmpfsMounts.length !== expectedTmpfs.size) blocked("runner container tmpfs mount set differs from readiness config")
  if (mounts.length !== volumeMounts.length + tmpfsMounts.length) blocked("runner container has an unexpected mount type")
  for (const mount of volumeMounts) {
    const expectedMount = expectedVolumes.get(mount?.Destination)
    if (!expectedMount || mount?.Name !== expectedMount.name || Boolean(mount?.RW) === expectedMount.read_only) blocked("runner container has an unexpected or mismatched named volume")
  }
  for (const mount of tmpfsMounts) {
    if (!expectedTmpfs.has(mount?.Destination)) blocked("runner container has an unexpected tmpfs mount")
  }
}

function assertTmpfs(config, inspect) {
  const observed = inspect.HostConfig?.Tmpfs ?? {}
  if (!observed || typeof observed !== "object" || Array.isArray(observed)) blocked("Docker inspect Tmpfs is invalid")
  const normalizedObserved = Object.entries(observed).sort(([a], [b]) => a.localeCompare(b))
  const expected = config.allowed_tmpfs.map((entry) => [entry.destination, entry.options])
  if (JSON.stringify(normalizedObserved) !== JSON.stringify(expected)) blocked("runner container tmpfs contract differs from readiness config")
}

function assertStaticEnvironment(inspect) {
  const env = inspect.Config?.Env ?? []
  if (!Array.isArray(env)) blocked("Docker inspect environment is invalid")
  for (const assignment of env) {
    if (typeof assignment !== "string") blocked("Docker inspect environment entry is invalid")
    const separator = assignment.indexOf("=")
    const name = assignment.slice(0, separator < 0 ? assignment.length : separator)
    if (SECRET_ENV.test(name) || new Set(["GH_TOKEN", "GITHUB_TOKEN"]).has(name.toUpperCase())) blocked(`runner container persists forbidden credential-like environment variable ${name}`)
  }
}

export function assessRunnerContainer(configInput, inspectInput, { requireRunning = true, volumeInspects = null, seccompProof = null } = {}) {
  const config = validateRunnerReadinessConfig(configInput)
  const inspect = Array.isArray(inspectInput) ? (inspectInput.length === 1 ? inspectInput[0] : blocked("docker inspect must return exactly one container")) : inspectInput
  if (!inspect || typeof inspect !== "object" || Array.isArray(inspect)) blocked("docker inspect result is invalid")
  validateNamedVolumeInspects(config, volumeInspects)
  assertSeccompCreationBinding(config, inspect, seccompProof)
  if (String(inspect.Name ?? "").replace(/^\//, "") !== config.container_name) blocked("Docker container identity differs from readiness config")
  if (inspect.Image !== config.expected_image_id) blocked("Docker image ID differs from readiness config")
  const user = inspect.Config?.User ?? ""
  const principal = typeof user === "string" ? user.split(":", 1)[0] : ""
  const numericPrincipal = /^[+-]?\d+$/.test(principal) ? BigInt(principal) : null
  if (!user || numericPrincipal === 0n || principal.toLowerCase() === "root") blocked("runner container must use an explicit non-root user")

  const labels = inspect.Config?.Labels ?? {}
  const expectedLabels = {
    "ghdev.repository": config.repository,
    "ghdev.runner.labels": REQUIRED_GITHUB_RUNNER_LABELS.join(","),
    "ghdev.runner.mode": RUNNER_LISTENER_MODE,
    "ghdev.runner.role": "repository-final-verify",
    "ghdev.runner.update": RUNNER_UPDATE_MODE,
  }
  for (const [key, value] of Object.entries(expectedLabels)) if (labels?.[key] !== value) blocked(`runner container label ${key} is missing or mismatched`)

  const host = inspect.HostConfig ?? {}
  if (host.Privileged !== false) blocked("runner container must not be privileged")
  if (host.ReadonlyRootfs !== true) blocked("runner container root filesystem must be read-only")
  if (Array.isArray(host.CapAdd) && host.CapAdd.length > 0) blocked("runner container must not add Linux capabilities")
  if (!Array.isArray(host.CapDrop) || !host.CapDrop.map(String).map((value) => value.toUpperCase()).includes("ALL")) blocked("runner container must drop all Linux capabilities")
  if (host.NetworkMode !== config.network_mode) blocked("runner container network mode differs from readiness config")
  for (const [field, value] of [["PidMode", host.PidMode], ["IpcMode", host.IpcMode], ["UTSMode", host.UTSMode], ["UsernsMode", host.UsernsMode], ["CgroupnsMode", host.CgroupnsMode]]) {
    if (String(value ?? "").toLowerCase() === "host") blocked(`runner container ${field} must not use the host namespace`)
  }
  if ((host.Devices ?? []).length > 0 || (host.DeviceRequests ?? []).length > 0) blocked("runner container must not expose host devices")
  if (host.AutoRemove === true) blocked("persistent listener container must not use Docker auto-remove")
  if (host.RestartPolicy?.Name !== "unless-stopped" || Number(host.RestartPolicy?.MaximumRetryCount ?? 0) !== 0) blocked("runner container restart policy must be unless-stopped")
  if (host.Memory !== config.resources.memory_bytes || host.NanoCpus !== config.resources.nano_cpus || host.PidsLimit !== config.resources.pids_limit) blocked("runner container resource limits differ from readiness config")
  if ((host.MaskedPaths ?? []).length !== 0 || (host.ReadonlyPaths ?? []).length !== 0) blocked("runner container requires systempaths=unconfined with empty Docker masked/read-only path lists")

  const expectedSecurity = ["no-new-privileges", `seccomp=${config.seccomp.path}`, "systempaths=unconfined"].sort()
  const observedSecurity = (host.SecurityOpt ?? []).map(normalizeSecurityOpt).sort()
  if (JSON.stringify(observedSecurity) !== JSON.stringify(expectedSecurity)) blocked("runner container SecurityOpt contract differs from readiness config")
  assertMounts(config, inspect)
  assertTmpfs(config, inspect)
  assertStaticEnvironment(inspect)

  const healthTest = inspect.Config?.Healthcheck?.Test
  if (JSON.stringify(healthTest) !== JSON.stringify(config.healthcheck_test)) blocked("runner container healthcheck differs from readiness config")
  if (requireRunning) {
    if (inspect.State?.Running !== true || inspect.State?.Status !== "running") blocked("runner container is not running")
    if (inspect.State?.Health?.Status !== "healthy") blocked("runner container healthcheck is not healthy")
  }
  return {
    result: "PASS",
    repository: config.repository,
    container_name: config.container_name,
    image_id: config.expected_image_id,
    listener_mode: RUNNER_LISTENER_MODE,
    runner_updates: RUNNER_UPDATE_MODE,
    runner_version: config.runner_version,
    runner_listener_sha256: config.runner_listener_sha256,
    running: inspect.State?.Running === true,
    healthy: inspect.State?.Health?.Status === "healthy",
  }
}

async function readBoundedRegularFileWithStat(path, label) {
  const resolved = absolutePath(path, label)
  let handle
  try {
    handle = await open(resolved, constants.O_RDONLY | constants.O_NOFOLLOW)
    const info = await handle.stat({ bigint: true })
    if (!info.isFile() || info.size < 1n || info.size > BigInt(MAX_FILE_BYTES)) blocked(`${label} must be a bounded regular non-symlink file`)
    return { bytes: await handle.readFile(), mtime_ns: info.mtimeNs.toString(), ctime_ns: info.ctimeNs.toString() }
  } catch (error) {
    if (error instanceof RunnerReadinessBlockedError) throw error
    blocked(`${label} is unreadable (${error.code ?? error.message})`)
  } finally {
    await handle?.close().catch(() => {})
  }
}

async function readBoundedRegularFile(path, label) {
  return (await readBoundedRegularFileWithStat(path, label)).bytes
}

export async function loadRunnerReadinessConfig(path) {
  const bytes = await readBoundedRegularFile(path, "readiness config")
  let document
  try {
    document = JSON.parse(bytes.toString("utf8"))
  } catch (error) {
    blocked(`readiness config is invalid JSON (${error.message})`)
  }
  return { config: validateRunnerReadinessConfig(document), sha256: sha256(bytes) }
}

export async function verifySeccompProfile(configInput) {
  const config = validateRunnerReadinessConfig(configInput)
  const file = await readBoundedRegularFileWithStat(config.seccomp.path, "seccomp profile")
  const observed = sha256(file.bytes)
  if (observed !== config.seccomp.sha256) blocked("seccomp profile SHA-256 differs from readiness config")
  return { sha256: observed, mtime_ns: file.mtime_ns, ctime_ns: file.ctime_ns }
}
