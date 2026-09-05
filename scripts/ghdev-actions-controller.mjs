#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises"
import { resolve } from "node:path"
import {
  TRUSTED_DEFAULT_REF,
  TRUSTED_WORKFLOW_PATH,
  assertSha,
  commandFingerprint,
  detectSelfCertification,
  evaluatePrIdentity,
  validateDispatchInput,
  validateProfile,
} from "../lib/actions-evidence.mjs"

function fail(message, code = 2) {
  process.stderr.write(`GHDEV_ACTIONS_CONTROLLER: BLOCKED; ${message}\n`)
  process.exit(code)
}

function argValue(name) {
  const index = process.argv.indexOf(name)
  if (index < 0 || index + 1 >= process.argv.length) fail(`missing ${name}`)
  return process.argv[index + 1]
}

async function writeOutputs(values) {
  const output = process.env.GITHUB_OUTPUT
  if (!output) return
  const lines = Object.entries(values).map(([key, value]) => `${key}=${String(value).replaceAll("\n", "%0A")}\n`).join("")
  await appendFile(output, lines)
}

async function githubJson(path) {
  const token = process.env.GHDEV_GITHUB_TOKEN
  const repository = process.env.GITHUB_REPOSITORY
  if (!token) fail("GHDEV_GITHUB_TOKEN is unavailable")
  if (!repository) fail("GITHUB_REPOSITORY is unavailable")
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ghdev-actions-controller-v1",
    },
  })
  if (!response.ok) fail(`GitHub API ${path} returned HTTP ${response.status}`)
  return response.json()
}

async function currentControllerSha() {
  const branch = await githubJson("/branches/main")
  const sha = branch?.commit?.sha
  try {
    return assertSha(sha, "current main controller SHA")
  } catch {
    fail("current main controller identity is unavailable")
  }
}

function validateTreePath(path) {
  if (typeof path !== "string" || path.length < 1 || path.length > 4096 || path.includes("\u0000") || path.includes("\n") || path.includes("\r") || path.startsWith("/") || path.split("/").some((part) => part === "" || part === "." || part === "..")) {
    fail("immutable Git tree contains an invalid repository-relative path")
  }
  return path
}

async function treeSnapshot(commitSha) {
  let treeSha
  try {
    const commit = await githubJson(`/git/commits/${commitSha}`)
    treeSha = assertSha(commit?.tree?.sha, `tree SHA for ${commitSha}`)
  } catch {
    fail(`immutable Git commit/tree identity is unavailable for ${commitSha}`)
  }

  const response = await githubJson(`/git/trees/${treeSha}?recursive=1`)
  if (!response || typeof response !== "object" || response.truncated === true || !Array.isArray(response.tree)) {
    fail(`immutable Git tree response is invalid or truncated for ${commitSha}`)
  }

  const snapshot = new Map()
  for (const item of response.tree) {
    const path = validateTreePath(item?.path)
    if (snapshot.has(path)) fail(`immutable Git tree contains duplicate path ${path}`)
    let sha
    try {
      sha = assertSha(item?.sha, `tree entry SHA for ${path}`)
    } catch {
      fail(`immutable Git tree contains invalid entry identity for ${path}`)
    }
    if (typeof item?.mode !== "string" || !/^[0-7]{6}$/.test(item.mode) || !new Set(["blob", "tree", "commit"]).has(item?.type)) {
      fail(`immutable Git tree contains invalid entry metadata for ${path}`)
    }
    snapshot.set(path, `${item.mode}:${item.type}:${sha}`)
  }
  return snapshot
}

async function changedPaths(expectedBaseSha, expectedHeadSha) {
  const [baseTree, headTree] = await Promise.all([treeSnapshot(expectedBaseSha), treeSnapshot(expectedHeadSha)])
  const allPaths = new Set([...baseTree.keys(), ...headTree.keys()])
  const changed = []
  for (const path of [...allPaths].sort()) {
    if (baseTree.get(path) === headTree.get(path)) continue
    changed.push(path)
    if (changed.length > 1000) fail("immutable changed-path set exceeds the bounded 1000-path controller limit")
  }
  return changed
}

async function loadInputs() {
  const profilePath = resolve(argValue("--profile-path"))
  const profile = validateProfile(JSON.parse(await readFile(profilePath, "utf8")))
  const dispatch = validateDispatchInput({
    pr_number: argValue("--pr-number"),
    expected_base_sha: argValue("--expected-base-sha"),
    expected_head_sha: argValue("--expected-head-sha"),
    expected_controller_sha: argValue("--expected-controller-sha"),
    profile: argValue("--profile"),
  }, { allowedProfiles: [profile.profile_id] })
  if (dispatch.profile !== profile.profile_id) fail("dispatch profile does not match loaded trusted profile")
  return { profile, dispatch }
}

async function verifyTrustedController(dispatch) {
  if (process.env.GITHUB_EVENT_NAME !== "workflow_dispatch") fail("trusted evidence controller must be invoked by workflow_dispatch")
  if (process.env.GITHUB_REF !== TRUSTED_DEFAULT_REF) fail(`trusted evidence controller must run from ${TRUSTED_DEFAULT_REF}`)
  if (process.env.GITHUB_SHA !== dispatch.expected_controller_sha) fail("workflow controller SHA does not match expected_controller_sha")
  const workflow = process.env.GITHUB_WORKFLOW_REF ?? ""
  const expectedWorkflow = `${process.env.GITHUB_REPOSITORY}/${TRUSTED_WORKFLOW_PATH}@${TRUSTED_DEFAULT_REF}`
  if (workflow !== expectedWorkflow) fail(`workflow identity is not ${expectedWorkflow}`)
}

async function main() {
  const mode = process.argv[2]
  if (!new Set(["preflight", "recheck"]).has(mode)) fail("usage: ghdev-actions-controller.mjs preflight|recheck ...")
  const { profile, dispatch } = await loadInputs()
  await verifyTrustedController(dispatch)
  const observedControllerSha = await currentControllerSha()
  if (observedControllerSha !== dispatch.expected_controller_sha) fail(`STALE:CONTROLLER_REF_MOVED; observed_controller=${observedControllerSha}`, 3)

  const pr = await githubJson(`/pulls/${dispatch.pr_number}`)
  const identity = evaluatePrIdentity(pr, dispatch, process.env.GITHUB_REPOSITORY)
  if (!identity.admitted) fail(`${identity.result}:${identity.reason}; observed_base=${identity.observed_base_sha ?? "unknown"}; observed_head=${identity.observed_head_sha ?? "unknown"}`, identity.result === "STALE" ? 3 : 2)

  if (mode === "preflight") {
    const immutableChangedPaths = await changedPaths(dispatch.expected_base_sha, dispatch.expected_head_sha)
    const selfCertification = detectSelfCertification(immutableChangedPaths, profile.trusted_control_paths, profile.trusted_control_prefixes)
    if (selfCertification.denied) fail(`SELF_CERTIFICATION_DENIED: ${selfCertification.conflicting_paths.join(",")}`)
  }

  await writeOutputs({
    admitted: "true",
    observed_base_sha: identity.observed_base_sha,
    observed_head_sha: identity.observed_head_sha,
    controller_sha: dispatch.expected_controller_sha,
    observed_controller_sha: observedControllerSha,
    command_fingerprint: commandFingerprint(profile),
  })
  process.stdout.write(`GHDEV_ACTIONS_CONTROLLER: PASS; mode=${mode}; pr=${dispatch.pr_number}; base=${identity.observed_base_sha}; head=${identity.observed_head_sha}; controller=${dispatch.expected_controller_sha}; observed_controller=${observedControllerSha}\n`)
}

main().catch((error) => fail(error?.message ?? String(error)))
