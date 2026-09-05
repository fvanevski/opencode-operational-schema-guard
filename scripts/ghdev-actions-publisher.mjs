#!/usr/bin/env node
import { appendFile, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import {
  STATUS_CONTEXT,
  assertSha,
  buildReceipt,
  evaluatePrIdentity,
  statusForResult,
  validateDispatchInput,
  validateProfile,
  validateReceipt,
} from "../lib/actions-evidence.mjs"

function fail(message, code = 2) {
  process.stderr.write(`GHDEV_ACTIONS_PUBLISHER: BLOCKED; ${message}\n`)
  process.exit(code)
}

function argValue(name) {
  const index = process.argv.indexOf(name)
  if (index < 0 || index + 1 >= process.argv.length) fail(`missing ${name}`)
  return process.argv[index + 1]
}

async function githubRequest(path, options = {}) {
  const token = process.env.GHDEV_GITHUB_TOKEN
  const repository = process.env.GITHUB_REPOSITORY
  if (!token) fail("GHDEV_GITHUB_TOKEN is unavailable")
  if (!repository) fail("GITHUB_REPOSITORY is unavailable")
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ghdev-actions-publisher-v1",
      ...(options.headers ?? {}),
    },
  })
  if (!response.ok) fail(`GitHub API ${path} returned HTTP ${response.status}`)
  return response.status === 204 ? null : response.json()
}

async function currentControllerSha() {
  const branch = await githubRequest("/branches/main")
  const sha = branch?.commit?.sha
  try {
    return assertSha(sha, "current main controller SHA")
  } catch {
    fail("current main controller identity is unavailable")
  }
}

async function writeOutputs(values) {
  if (!process.env.GITHUB_OUTPUT) return
  await appendFile(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(""))
}

async function loadCommon() {
  const profile = validateProfile(JSON.parse(await readFile(resolve(argValue("--profile-path")), "utf8")))
  const dispatch = validateDispatchInput({
    pr_number: argValue("--pr-number"),
    expected_base_sha: argValue("--expected-base-sha"),
    expected_head_sha: argValue("--expected-head-sha"),
    expected_controller_sha: argValue("--expected-controller-sha"),
    profile: argValue("--profile"),
  }, { allowedProfiles: [profile.profile_id] })
  return { profile, dispatch }
}

async function buildMode(profile, dispatch) {
  const execution = JSON.parse(await readFile(resolve(argValue("--execution")), "utf8"))
  if (execution.repository !== process.env.GITHUB_REPOSITORY) fail("execution repository does not match workflow repository")
  const outputPath = resolve(argValue("--output"))
  const executionArtifactId = argValue("--execution-artifact-id")
  const receiptArtifactName = argValue("--receipt-artifact-name")

  const pr = await githubRequest(`/pulls/${dispatch.pr_number}`)
  const identity = evaluatePrIdentity(pr, dispatch, process.env.GITHUB_REPOSITORY)
  const observedControllerFinal = await currentControllerSha()
  const observedBaseFinal = identity.observed_base_sha ?? pr?.base?.sha
  const observedHeadFinal = identity.observed_head_sha ?? pr?.head?.sha
  if (typeof observedBaseFinal !== "string" || typeof observedHeadFinal !== "string") fail("final PR identity is unavailable")
  const controllerMoved = observedControllerFinal !== dispatch.expected_controller_sha
  const finalIdentityResult = controllerMoved ? "STALE" : (identity.admitted ? "PASS" : identity.result)
  const finalIdentityReason = controllerMoved ? "CONTROLLER_REF_MOVED" : identity.reason

  const receipt = buildReceipt({
    execution,
    profile,
    dispatch,
    observedBaseFinal,
    observedHeadFinal,
    observedControllerFinal,
    finalIdentityResult,
    finalIdentityReason,
    workflowRunId: process.env.GITHUB_RUN_ID,
    workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT,
    executionArtifactId,
    receiptArtifactName,
  })
  validateReceipt(receipt, profile, dispatch)
  await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 })
  await writeOutputs({ result: receipt.result, receipt_sha256: receipt.receipt_sha256 })
  process.stdout.write(`GHDEV_ACTIONS_PUBLISHER: RECEIPT_${receipt.result}; head=${dispatch.expected_head_sha}; receipt_sha256=${receipt.receipt_sha256}\n`)
}

async function statusMode(profile, dispatch) {
  const receipt = JSON.parse(await readFile(resolve(argValue("--receipt")), "utf8"))
  validateReceipt(receipt, profile, dispatch)
  if (receipt.workflow_run_id !== String(process.env.GITHUB_RUN_ID) || receipt.workflow_run_attempt !== String(process.env.GITHUB_RUN_ATTEMPT)) fail("receipt does not belong to this workflow run/attempt")
  const receiptArtifactId = argValue("--receipt-artifact-id")
  if (!/^\d+$/.test(receiptArtifactId)) fail("receipt artifact id must be numeric")

  const pr = await githubRequest(`/pulls/${dispatch.pr_number}`)
  const identity = evaluatePrIdentity(pr, dispatch, process.env.GITHUB_REPOSITORY)
  const observedControllerNow = await currentControllerSha()
  const effectiveResult = observedControllerNow !== dispatch.expected_controller_sha ? "STALE" : (identity.admitted ? receipt.result : identity.result)
  const status = statusForResult(effectiveResult)
  const targetUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  const published = await githubRequest(`/statuses/${dispatch.expected_head_sha}`, {
    method: "POST",
    body: JSON.stringify({
      state: status.state,
      context: STATUS_CONTEXT,
      description: `${status.description}; receipt ${receipt.receipt_sha256.slice(0, 12)}`,
      target_url: targetUrl,
    }),
  })
  if (!Number.isSafeInteger(published?.id) || published.id < 1 || published?.sha !== dispatch.expected_head_sha || published?.context !== STATUS_CONTEXT) {
    fail("published status readback did not bind to the intended exact head/context")
  }
  await writeOutputs({ effective_result: effectiveResult, status_id: published.id, receipt_artifact_id: receiptArtifactId })
  process.stdout.write(`GHDEV_ACTIONS_PUBLISHER: STATUS_${effectiveResult}; head=${dispatch.expected_head_sha}; status_id=${published.id}; receipt_artifact_id=${receiptArtifactId}\n`)
}

async function main() {
  const mode = process.argv[2]
  if (!new Set(["build", "status"]).has(mode)) fail("usage: ghdev-actions-publisher.mjs build|status ...")
  const { profile, dispatch } = await loadCommon()
  if (process.env.GITHUB_SHA !== dispatch.expected_controller_sha || process.env.GITHUB_REF !== "refs/heads/main") fail("publisher controller identity drifted")
  if (process.env.GITHUB_WORKFLOW_REF !== `${process.env.GITHUB_REPOSITORY}/.github/workflows/ghdev-verify.yml@refs/heads/main`) fail("publisher workflow identity drifted")
  if (mode === "build") await buildMode(profile, dispatch)
  else await statusMode(profile, dispatch)
}

main().catch((error) => fail(error?.stack ?? error?.message ?? String(error)))
