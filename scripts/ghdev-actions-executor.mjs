#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { closeSync, constants, lstatSync, openSync, readSync, readlinkSync, statSync } from "node:fs"
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import {
  EXECUTION_SCHEMA,
  RUNNER_IMAGE_SCHEMA,
  TRUSTED_DEFAULT_REF,
  TRUSTED_WORKFLOW_PATH,
  commandFingerprint,
  fingerprintFiles,
  parseNodeTapTotals,
  sha256Hex,
  validateDispatchInput,
  validateProfile,
} from "../lib/actions-evidence.mjs"

function argValue(name) {
  const index = process.argv.indexOf(name)
  if (index < 0 || index + 1 >= process.argv.length) throw new Error(`missing ${name}`)
  return process.argv[index + 1]
}

function commandOutput(argv, options = {}) {
  const result = spawnSync(argv[0], argv.slice(1), { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, shell: false, ...options })
  if (result.error) throw result.error
  return result
}

function exactCommandOutput(argv) {
  const result = commandOutput(argv)
  if (result.status !== 0) throw new Error(`${argv[0]} failed with exit ${result.status}: ${(result.stderr ?? "").trim()}`)
  return (result.stdout ?? "").trim()
}

const COMMAND_TAIL_BYTES = 1024 * 1024
const SANDBOX_STATUS_BYTES = 64 * 1024

function readTail(path, maxBytes = COMMAND_TAIL_BYTES) {
  const size = statSync(path).size
  const length = Math.min(size, maxBytes)
  const buffer = Buffer.alloc(length)
  const fd = openSync(path, "r")
  try {
    if (length > 0) readSync(fd, buffer, 0, length, Math.max(0, size - length))
  } finally {
    closeSync(fd)
  }
  return { text: buffer.toString("utf8"), bytes: size, truncated: size > length }
}

function candidateCommandOutput(argv, logRoot, commandId, options = {}) {
  const stdoutPath = join(logRoot, `${commandId}.stdout.log`)
  const stderrPath = join(logRoot, `${commandId}.stderr.log`)
  const stdoutFd = openSync(stdoutPath, "wx", 0o600)
  const stderrFd = openSync(stderrPath, "wx", 0o600)
  let result
  try {
    result = spawnSync(argv[0], argv.slice(1), { shell: false, stdio: ["ignore", stdoutFd, stderrFd, "pipe"], ...options })
  } finally {
    closeSync(stdoutFd)
    closeSync(stderrFd)
  }
  return { result, stdout: readTail(stdoutPath), stderr: readTail(stderrPath) }
}

function parseSandboxStatus(value) {
  const text = Buffer.isBuffer(value) ? value.toString("utf8") : typeof value === "string" ? value : ""
  if (Buffer.byteLength(text, "utf8") > SANDBOX_STATUS_BYTES) throw new Error("Bubblewrap status channel exceeds bounded size")
  const documents = []
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue
    let document
    try {
      document = JSON.parse(line)
    } catch {
      throw new Error("Bubblewrap status channel contains invalid JSON")
    }
    if (!document || typeof document !== "object" || Array.isArray(document)) throw new Error("Bubblewrap status channel contains an invalid document")
    documents.push(document)
  }

  const childDocuments = documents.filter((document) => Object.hasOwn(document, "child-pid"))
  if (childDocuments.length > 1) throw new Error("Bubblewrap status channel contains multiple child startup records")
  for (const document of childDocuments) {
    if (!Number.isSafeInteger(document["child-pid"]) || document["child-pid"] < 1) throw new Error("Bubblewrap child startup record is invalid")
  }

  const exitDocuments = documents.filter((document) => Object.hasOwn(document, "exit-code"))
  if (exitDocuments.length > 1) throw new Error("Bubblewrap status channel contains multiple child exit records")
  for (const document of exitDocuments) {
    if (!Number.isSafeInteger(document["exit-code"]) || document["exit-code"] < 0 || document["exit-code"] > 255) throw new Error("Bubblewrap child exit record is invalid")
  }
  if (childDocuments.length === 0 && exitDocuments.length > 0) throw new Error("Bubblewrap exit record exists without a child startup record")

  return {
    child_started: childDocuments.length === 1,
    exit_code: exitDocuments.length === 1 ? exitDocuments[0]["exit-code"] : null,
  }
}

function boundedVersion(value, field) {
  if (typeof value !== "string" || value.length < 1 || value.length > 128 || value.includes("\n") || value.includes("\r")) throw new Error(`${field} version output is not bounded`)
  return value
}

function addRootMount(args, path) {
  try {
    const stat = lstatSync(path)
    if (stat.isSymbolicLink()) args.push("--symlink", readlinkSync(path), path)
    else args.push("--ro-bind", path, path)
  } catch (error) {
    if (error?.code !== "ENOENT") throw error
  }
}

function addOptionalFile(args, path) {
  try {
    const stat = lstatSync(path)
    if (stat.isFile()) args.push("--ro-bind", path, path)
  } catch (error) {
    if (error?.code !== "ENOENT") throw error
  }
}

function sandboxArgs(candidatePath, argv) {
  const args = [
    "--die-with-parent",
    "--new-session",
    "--json-status-fd", "3",
    "--unshare-all",
    "--unshare-user",
    "--cap-drop", "ALL",
    "--clearenv",
    "--setenv", "HOME", "/tmp/ghdev-home",
    "--setenv", "PATH", "/usr/bin:/bin",
    "--setenv", "CI", "true",
    "--setenv", "LANG", "C.UTF-8",
    "--setenv", "LC_ALL", "C.UTF-8",
    "--ro-bind", "/usr", "/usr",
  ]
  for (const path of ["/bin", "/sbin", "/lib", "/lib64"]) addRootMount(args, path)
  for (const path of ["/etc/passwd", "/etc/group", "/etc/nsswitch.conf", "/etc/gitconfig"]) addOptionalFile(args, path)
  args.push(
    "--proc", "/proc",
    "--dev", "/dev",
    "--tmpfs", "/tmp",
    "--dir", "/tmp/ghdev-home",
    "--ro-bind", candidatePath, "/workspace",
    "--chdir", "/workspace",
    "--",
    ...argv,
  )
  return args
}

function validateImageMarker(marker) {
  if (!marker || typeof marker !== "object" || Array.isArray(marker)) throw new Error("runner image marker must be an object")
  if (marker.schema_version !== RUNNER_IMAGE_SCHEMA) throw new Error(`runner image marker schema must be ${RUNNER_IMAGE_SCHEMA}`)
  if (!new Set(["ubuntu", "debian"]).has(marker.os_id)) throw new Error("runner image marker os_id must be ubuntu or debian")
  if (typeof marker.os_version_id !== "string" || marker.os_version_id.length < 1) throw new Error("runner image marker os_version_id missing")
  if (!Number.isSafeInteger(marker.node_major) || marker.node_major !== 22) throw new Error("runner image marker node_major must be 22")
  if (marker.sandbox !== "bubblewrap-no-network-v1") throw new Error("runner image marker sandbox mismatch")
  if (typeof marker.image_id !== "string" || marker.image_id.length < 1 || marker.image_id.length > 128) throw new Error("runner image marker image_id invalid")
  if (typeof marker.base_image_digest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(marker.base_image_digest)) throw new Error("runner image marker base_image_digest must be an exact sha256 digest")
  if (typeof marker.actions_runner_version !== "string" || marker.actions_runner_version.length < 1 || marker.actions_runner_version.length > 64) throw new Error("runner image marker actions_runner_version missing")
  return marker
}

function parseOsRelease(text) {
  const values = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    let value = match[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    values[match[1]] = value
  }
  return values
}

function emptyEnvironment(profile) {
  return {
    image_fingerprint: null,
    image_schema: profile.runner.image_schema,
    image_id: null,
    base_image_digest: null,
    actions_runner_version: null,
    node_version: null,
    npm_version: null,
    bwrap_version: null,
    os_id: null,
    os_version_id: null,
    os_release_fingerprint: null,
    node_sha256: null,
    npm_sha256: null,
    bwrap_sha256: null,
    sandbox: profile.runner.sandbox,
    network: "not-executed",
    candidate_mount: "not-executed",
    candidate_environment: "not-executed",
  }
}

async function writeRecord(outputPath, record) {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx", mode: 0o600 })
}

async function main() {
  const profilePath = resolve(argValue("--profile-path"))
  const candidatePath = resolve(argValue("--candidate-path"))
  const outputPath = resolve(argValue("--output"))
  const imageMarkerPath = argValue("--image-marker")
  const profile = validateProfile(JSON.parse(await readFile(profilePath, "utf8")))
  const dispatch = validateDispatchInput({
    pr_number: argValue("--pr-number"),
    expected_base_sha: argValue("--expected-base-sha"),
    expected_head_sha: argValue("--expected-head-sha"),
    expected_controller_sha: argValue("--expected-controller-sha"),
    profile: argValue("--profile"),
  }, { allowedProfiles: [profile.profile_id] })

  const repository = argValue("--repository")
  const observedBaseInitial = argValue("--observed-base-sha")
  const observedHeadInitial = argValue("--observed-head-sha")
  const observedControllerInitial = argValue("--observed-controller-sha")
  if (observedBaseInitial !== dispatch.expected_base_sha || observedHeadInitial !== dispatch.expected_head_sha || observedControllerInitial !== dispatch.expected_controller_sha) throw new Error("pre-execution remote/controller identity does not match dispatch")
  if (process.env.RUNNER_OS !== profile.runner.os || process.env.RUNNER_ARCH !== profile.runner.arch) throw new Error(`runner identity must be ${profile.runner.os}/${profile.runner.arch}`)
  if (process.env.GITHUB_SHA !== dispatch.expected_controller_sha || process.env.GITHUB_REF !== TRUSTED_DEFAULT_REF) throw new Error("executor workflow controller identity drifted")
  if (process.env.GITHUB_WORKFLOW_REF !== `${repository}/${TRUSTED_WORKFLOW_PATH}@${TRUSTED_DEFAULT_REF}`) throw new Error("executor workflow identity drifted")

  const record = {
    schema_version: EXECUTION_SCHEMA,
    repository,
    pr_number: dispatch.pr_number,
    expected_base_sha: dispatch.expected_base_sha,
    observed_base_sha_initial: observedBaseInitial,
    expected_head_sha: dispatch.expected_head_sha,
    observed_head_sha_initial: observedHeadInitial,
    observed_controller_sha_initial: observedControllerInitial,
    observed_candidate_head_initial: null,
    observed_candidate_head_final: null,
    controller_workflow_path: TRUSTED_WORKFLOW_PATH,
    controller_workflow_ref: TRUSTED_DEFAULT_REF,
    controller_commit_sha: dispatch.expected_controller_sha,
    profile_id: profile.profile_id,
    profile_version: profile.profile_version,
    command_fingerprint: commandFingerprint(profile),
    candidate_fingerprints: {},
    runner_class: "self-hosted-supported-linux",
    runner_labels: profile.runner.labels,
    environment: emptyEnvironment(profile),
    commands_required: profile.commands.length,
    commands_run: 0,
    per_command_exit: [],
    npm_test_count: null,
    npm_test_pass: null,
    npm_test_fail: null,
    npm_test_skip: null,
    worktree_clean_final: false,
    workspace_cleanup_final: false,
    block_reason: "SETUP_OR_ISOLATION_ERROR",
    execution_identity: `run:${process.env.GITHUB_RUN_ID}:executor:attempt:${process.env.GITHUB_RUN_ATTEMPT}`,
    result: "BLOCKED",
  }

  try {
    await access(candidatePath, constants.R_OK)
    const observedCandidateInitial = exactCommandOutput(["/usr/bin/git", "-C", candidatePath, "rev-parse", "HEAD"])
    if (observedCandidateInitial !== dispatch.expected_head_sha) throw new Error(`candidate checkout mismatch: ${observedCandidateInitial}`)
    record.observed_candidate_head_initial = observedCandidateInitial
    record.observed_candidate_head_final = observedCandidateInitial

    for (const tool of ["/usr/bin/git", "/usr/bin/node", "/usr/bin/npm", "/usr/bin/bwrap"]) await access(tool, constants.X_OK)
    const nodeVersion = boundedVersion(exactCommandOutput(["/usr/bin/node", "--version"]), "node")
    const npmVersion = boundedVersion(exactCommandOutput(["/usr/bin/npm", "--version"]), "npm")
    const bwrapVersion = boundedVersion(exactCommandOutput(["/usr/bin/bwrap", "--version"]), "bwrap")
    if (!/^v22\./.test(nodeVersion)) throw new Error(`self-hosted runner must provide Node 22; observed ${nodeVersion}`)

    const markerBytes = await readFile(imageMarkerPath)
    const marker = validateImageMarker(JSON.parse(markerBytes.toString("utf8")))
    const osReleaseBytes = await readFile("/etc/os-release")
    if (osReleaseBytes.length > 32 * 1024) throw new Error("/etc/os-release exceeds bounded size")
    const osRelease = parseOsRelease(osReleaseBytes.toString("utf8"))
    if (osRelease.ID !== marker.os_id || osRelease.VERSION_ID !== marker.os_version_id) throw new Error(`runner OS identity ${osRelease.ID ?? "unknown"}/${osRelease.VERSION_ID ?? "unknown"} does not match image marker`)
    record.candidate_fingerprints = await fingerprintFiles(candidatePath, profile.candidate_fingerprint_paths)
    record.environment = {
      image_fingerprint: sha256Hex(markerBytes),
      image_schema: marker.schema_version,
      image_id: marker.image_id,
      base_image_digest: marker.base_image_digest,
      actions_runner_version: marker.actions_runner_version,
      node_version: nodeVersion,
      npm_version: npmVersion,
      bwrap_version: bwrapVersion,
      os_id: osRelease.ID,
      os_version_id: osRelease.VERSION_ID,
      os_release_fingerprint: sha256Hex(osReleaseBytes),
      node_sha256: sha256Hex(await readFile("/usr/bin/node")),
      npm_sha256: sha256Hex(await readFile("/usr/bin/npm")),
      bwrap_sha256: sha256Hex(await readFile("/usr/bin/bwrap")),
      sandbox: profile.runner.sandbox,
      network: "not-executed",
      candidate_mount: "not-executed",
      candidate_environment: "not-executed",
    }

    for (const command of profile.commands) {
      process.stdout.write(`GHDEV_ACTIONS_EXECUTOR_COMMAND: ${command.id}\n`)
      const capture = candidateCommandOutput(["/usr/bin/bwrap", ...sandboxArgs(candidatePath, command.argv)], dirname(outputPath), command.id, { env: { PATH: "/usr/bin:/bin" } })
      const run = capture.result
      if (capture.stdout.text) process.stdout.write(capture.stdout.text)
      if (capture.stderr.text) process.stderr.write(capture.stderr.text)
      if (run.error) {
        record.result = "BLOCKED"
        record.block_reason = "COMMAND_SPAWN_ERROR"
        process.stderr.write(`GHDEV_ACTIONS_EXECUTOR: BLOCKED; command ${command.id} spawn failed: ${run.error.code ?? run.error.message}\n`)
        break
      }

      let sandboxStatus
      try {
        sandboxStatus = parseSandboxStatus(run.output?.[3])
      } catch (error) {
        record.result = "BLOCKED"
        record.block_reason = "SETUP_OR_ISOLATION_ERROR"
        process.stderr.write(`GHDEV_ACTIONS_EXECUTOR: BLOCKED; command ${command.id} has invalid Bubblewrap status evidence: ${error?.message ?? String(error)}\n`)
        break
      }
      if (!sandboxStatus.child_started) {
        record.result = "BLOCKED"
        record.block_reason = "SETUP_OR_ISOLATION_ERROR"
        process.stderr.write(`GHDEV_ACTIONS_EXECUTOR: BLOCKED; command ${command.id} never reached sandbox child startup\n`)
        break
      }

      record.environment.network = "unshared"
      record.environment.candidate_mount = "read-only"
      record.environment.candidate_environment = "clearenv-allowlist"

      const exit = Number.isSafeInteger(run.status) ? run.status : null
      const signal = typeof run.signal === "string" ? run.signal : null
      if (exit === null && signal === null) {
        record.result = "BLOCKED"
        record.block_reason = "SETUP_OR_ISOLATION_ERROR"
        process.stderr.write(`GHDEV_ACTIONS_EXECUTOR: BLOCKED; command ${command.id} returned no exit or signal after sandbox startup\n`)
        break
      }
      if (exit !== null && sandboxStatus.exit_code !== exit) {
        record.commands_run += 1
        record.per_command_exit.push({ id: command.id, exit, signal: null })
        record.result = "BLOCKED"
        record.block_reason = "SETUP_OR_ISOLATION_ERROR"
        process.stderr.write(`GHDEV_ACTIONS_EXECUTOR: BLOCKED; command ${command.id} Bubblewrap exit evidence mismatched process status\n`)
        break
      }
      if (exit === null && signal !== null && sandboxStatus.exit_code !== null) {
        record.commands_run += 1
        record.per_command_exit.push({ id: command.id, exit: null, signal })
        record.result = "BLOCKED"
        record.block_reason = "SETUP_OR_ISOLATION_ERROR"
        process.stderr.write(`GHDEV_ACTIONS_EXECUTOR: BLOCKED; command ${command.id} Bubblewrap exit evidence conflicts with signal termination\n`)
        break
      }

      record.commands_run += 1
      record.per_command_exit.push({ id: command.id, exit, signal })
      if (command.collect_test_totals === "node-tap") {
        const totals = parseNodeTapTotals(`${capture.stdout.text}\n${capture.stderr.text}`)
        if (totals) {
          record.npm_test_count = totals.count
          record.npm_test_pass = totals.pass
          record.npm_test_fail = totals.fail
          record.npm_test_skip = totals.skip
        }
      }
      if (exit === null) {
        record.result = "BLOCKED"
        record.block_reason = "COMMAND_TERMINATED_WITHOUT_EXIT"
        break
      }
      if (exit !== 0) {
        record.result = "FAIL"
        record.block_reason = null
        break
      }
    }

    if (record.commands_run === record.commands_required && record.per_command_exit.every((entry) => entry.exit === 0)) {
      const totalsRequired = profile.commands.some((command) => command.collect_test_totals === "node-tap")
      const totalsPresent = Number.isSafeInteger(record.npm_test_count) && Number.isSafeInteger(record.npm_test_pass) && Number.isSafeInteger(record.npm_test_fail) && Number.isSafeInteger(record.npm_test_skip)
      if (totalsRequired && !totalsPresent) {
        record.result = "BLOCKED"
        record.block_reason = "TEST_TOTALS_UNAVAILABLE"
      } else {
        record.result = "PASS"
        record.block_reason = null
      }
    }
  } catch (error) {
    record.result = "BLOCKED"
    record.block_reason = "SETUP_OR_ISOLATION_ERROR"
    process.stderr.write(`GHDEV_ACTIONS_EXECUTOR: BLOCKED; ${error?.message ?? String(error)}\n`)
  }

  try {
    if (record.observed_candidate_head_initial !== null) {
      const observedCandidateFinal = exactCommandOutput(["/usr/bin/git", "-C", candidatePath, "rev-parse", "HEAD"])
      record.observed_candidate_head_final = observedCandidateFinal
      const status = exactCommandOutput(["/usr/bin/git", "-C", candidatePath, "status", "--porcelain=v1", "--untracked-files=all"])
      record.worktree_clean_final = status.length === 0 && observedCandidateFinal === dispatch.expected_head_sha
      if (!record.worktree_clean_final) {
        record.result = "BLOCKED"
        record.block_reason = "FINAL_SOURCE_IDENTITY_ERROR"
      }
    }
  } catch (error) {
    record.result = "BLOCKED"
    record.block_reason = "FINAL_SOURCE_IDENTITY_ERROR"
    process.stderr.write(`GHDEV_ACTIONS_EXECUTOR: BLOCKED; final source proof failed: ${error?.message ?? String(error)}\n`)
  }

  try {
    await rm(candidatePath, { recursive: true, force: false })
    try {
      await access(candidatePath)
      record.workspace_cleanup_final = false
    } catch (error) {
      if (error?.code === "ENOENT") record.workspace_cleanup_final = true
      else throw error
    }
  } catch (error) {
    record.workspace_cleanup_final = false
    record.result = "BLOCKED"
    record.block_reason = "CANDIDATE_CLEANUP_ERROR"
    process.stderr.write(`GHDEV_ACTIONS_EXECUTOR: BLOCKED; candidate cleanup failed: ${error?.message ?? String(error)}\n`)
  }

  await writeRecord(outputPath, record)
  process.stdout.write(`GHDEV_ACTIONS_EXECUTOR: ${record.result}; commands=${record.commands_run}/${record.commands_required}; clean=${record.worktree_clean_final}; cleanup=${record.workspace_cleanup_final}; reason=${record.block_reason ?? "none"}\n`)
}

main().catch((error) => {
  process.stderr.write(`GHDEV_ACTIONS_EXECUTOR: BLOCKED; no typed execution record: ${error?.stack ?? error?.message ?? String(error)}\n`)
  process.exit(2)
})
