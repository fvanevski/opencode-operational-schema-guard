#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import {
  assessRunnerContainer,
  loadRunnerReadinessConfig,
  RunnerReadinessBlockedError,
  validateGitHubRunnerRegistration,
  validateRunnerSettings,
  verifySeccompProfile,
} from "../lib/runner-readiness.mjs"

function fail(message) {
  const reason = String(message).replace(/[\r\n]+/g, " ").slice(0, 1000)
  process.stderr.write(`GHDEV_RUNNER_READINESS: BLOCKED; reason=${reason}\n`)
  process.stderr.write("GHDEV_RUNNER_READINESS_RESULT=BLOCKED\n")
  process.exit(2)
}

function dockerCommand(args, label, maxBuffer = 4 * 1024 * 1024) {
  const result = spawnSync("/usr/bin/docker", args, {
    encoding: "utf8",
    shell: false,
    maxBuffer,
    timeout: 15_000,
    env: { PATH: "/usr/bin:/bin", LANG: "C.UTF-8", LC_ALL: "C.UTF-8" },
  })
  if (result.error || result.status !== 0) fail(`${label} failed (${result.error?.message ?? `exit ${result.status}`})`)
  return result.stdout
}

function ghCommand(args, label, maxBuffer = 4 * 1024 * 1024) {
  const result = spawnSync("/usr/bin/gh", args, {
    encoding: "utf8",
    shell: false,
    maxBuffer,
    timeout: 15_000,
    env: { ...process.env, GH_PAGER: "cat", PAGER: "cat" },
  })
  if (result.error || result.status !== 0) fail(`${label} failed (${result.error?.message ?? `exit ${result.status}`})`)
  return result.stdout
}

const args = process.argv.slice(2)
if (args.length !== 2 || args[0] !== "--config") fail("usage: ghdev-runner-readiness.mjs --config /etc/ghdev/runner-readiness.json")

try {
  const loaded = await loadRunnerReadinessConfig(args[1])
  const seccompProof = await verifySeccompProfile(loaded.config)
  let inspect
  try {
    inspect = JSON.parse(dockerCommand(["inspect", "--type", "container", loaded.config.container_name], "docker inspect"))
  } catch (error) {
    fail(`docker inspect returned invalid JSON (${error.message})`)
  }
  const volumeInspects = []
  for (const volume of loaded.config.allowed_named_volumes) {
    let inspected
    try {
      inspected = JSON.parse(dockerCommand(["volume", "inspect", volume.name], `docker volume inspect ${volume.name}`, 256 * 1024))
    } catch (error) {
      fail(`docker volume inspect ${volume.name} returned invalid JSON (${error.message})`)
    }
    if (!Array.isArray(inspected) || inspected.length !== 1) fail(`docker volume inspect ${volume.name} must return exactly one volume`)
    volumeInspects.push(inspected[0])
  }
  const result = assessRunnerContainer(loaded.config, inspect, { volumeInspects, seccompProof })
  let runnerSettings
  try {
    runnerSettings = JSON.parse(dockerCommand(["exec", loaded.config.container_name, "/usr/bin/cat", loaded.config.runner_settings_path], "runner settings read", 128 * 1024))
  } catch (error) {
    fail(`runner settings are invalid JSON (${error.message})`)
  }
  validateRunnerSettings(loaded.config, runnerSettings)
  let githubRunners
  try {
    githubRunners = JSON.parse(ghCommand(["api", "-H", "Accept: application/vnd.github+json", `repos/${loaded.config.repository}/actions/runners?per_page=100`], "GitHub runner census", 512 * 1024))
  } catch (error) {
    fail(`GitHub runner census returned invalid JSON (${error.message})`)
  }
  const githubRunner = validateGitHubRunnerRegistration(loaded.config, runnerSettings, githubRunners)
  const observedVersion = dockerCommand(["exec", loaded.config.container_name, loaded.config.runner_listener_path, "--version"], "runner version read", 64 * 1024).trim()
  if (observedVersion !== loaded.config.runner_version) fail(`runner version mismatch; expected ${loaded.config.runner_version}, observed ${observedVersion || "empty"}`)
  const hashOutput = dockerCommand(["exec", loaded.config.container_name, "/usr/bin/sha256sum", loaded.config.runner_listener_path], "runner binary hash", 64 * 1024).trim()
  const hashMatch = hashOutput.match(/^([0-9a-f]{64})\s+/)
  if (!hashMatch || hashMatch[1] !== loaded.config.runner_listener_sha256) fail("runner binary SHA-256 differs from readiness config")
  process.stdout.write(`GHDEV_RUNNER_READINESS: PASS; repository=${result.repository}; container=${result.container_name}; image_id=${result.image_id}; listener_mode=${result.listener_mode}; runner_updates=${result.runner_updates}; runner_version=${result.runner_version}; runner_listener_sha256=${result.runner_listener_sha256}; github_agent_id=${githubRunner.agent_id}; github_runner_name=${githubRunner.runner_name}; github_status=${githubRunner.status}; running=${result.running}; healthy=${result.healthy}; config_sha256=${loaded.sha256}; seccomp_sha256=${seccompProof.sha256}\n`)
  process.stdout.write("GHDEV_RUNNER_READINESS_RESULT=PASS\n")
} catch (error) {
  if (error instanceof RunnerReadinessBlockedError) fail(error.message)
  fail(error?.message ?? String(error))
}
