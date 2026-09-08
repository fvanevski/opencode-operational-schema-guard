#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import {
  assessRunnerContainer,
  loadRunnerReadinessConfig,
  RunnerReadinessBlockedError,
  verifySeccompProfile,
} from "../lib/runner-readiness.mjs"

function fail(message) {
  const reason = String(message).replace(/[\r\n]+/g, " ").slice(0, 1000)
  process.stderr.write(`GHDEV_RUNNER_READINESS: BLOCKED; reason=${reason}\n`)
  process.stderr.write("GHDEV_RUNNER_READINESS_RESULT=BLOCKED\n")
  process.exit(2)
}

const args = process.argv.slice(2)
if (args.length !== 2 || args[0] !== "--config") fail("usage: ghdev-runner-readiness.mjs --config /etc/ghdev/runner-readiness.json")

try {
  const loaded = await loadRunnerReadinessConfig(args[1])
  const seccompSha256 = await verifySeccompProfile(loaded.config)
  const docker = spawnSync("/usr/bin/docker", ["inspect", "--type", "container", loaded.config.container_name], {
    encoding: "utf8",
    shell: false,
    maxBuffer: 4 * 1024 * 1024,
    timeout: 15_000,
    env: { PATH: "/usr/bin:/bin", LANG: "C.UTF-8", LC_ALL: "C.UTF-8" },
  })
  if (docker.error || docker.status !== 0) fail(`docker inspect failed (${docker.error?.message ?? `exit ${docker.status}`})`)
  let inspect
  try {
    inspect = JSON.parse(docker.stdout)
  } catch (error) {
    fail(`docker inspect returned invalid JSON (${error.message})`)
  }
  const result = assessRunnerContainer(loaded.config, inspect)
  process.stdout.write(`GHDEV_RUNNER_READINESS: PASS; repository=${result.repository}; container=${result.container_name}; image_id=${result.image_id}; listener_mode=${result.listener_mode}; runner_updates=${result.runner_updates}; running=${result.running}; healthy=${result.healthy}; config_sha256=${loaded.sha256}; seccomp_sha256=${seccompSha256}\n`)
  process.stdout.write("GHDEV_RUNNER_READINESS_RESULT=PASS\n")
} catch (error) {
  if (error instanceof RunnerReadinessBlockedError) fail(error.message)
  fail(error?.message ?? String(error))
}
