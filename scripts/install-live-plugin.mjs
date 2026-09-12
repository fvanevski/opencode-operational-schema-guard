#!/usr/bin/env node

import { COPYFILE_EXCL } from "node:constants"
import { createHash, randomUUID } from "node:crypto"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import {
  copyFile,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  open,
  opendir,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { parseAndValidateConfig } from "../lib/config-contract.mjs"

const PLAN_SCHEMA = "opencode-live-plugin-install-plan-v1"
const RECEIPT_SCHEMA = "opencode-live-plugin-deployment-v1"
const DEFAULT_LIVE_ROOT = "/home/filip/.config/opencode/plugins/operational-schema-v5"
const DEFAULT_LIVE_CONFIG = "/home/filip/.config/opencode/opencode.json"
const DEFAULT_WORK_ROOT = "/tmp/opencode/live-plugin-install"
const SHA40 = /^[0-9a-f]{40}$/
const SHA256 = /^[0-9a-f]{64}$/
const MAX_BUFFER = 64 * 1024 * 1024
const FORBIDDEN_BASENAMES = new Set([".git", "node_modules", "__pycache__"])
const FORBIDDEN_SUFFIXES = [".pyc"]

class InstallError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = "InstallError"
    this.code = code
    this.details = details
  }
}

function block(code, message, details = {}) {
  throw new InstallError(code, message, details)
}

function usage() {
  return `usage:
  install-live-plugin.mjs prepare \\
    --repo ABSOLUTE_REPO \\
    --merged-sha 40HEX \\
    --reviewed-sha 40HEX \\
    --expected-live-sha 40HEX \\
    --plan ABSOLUTE_PLAN_JSON \\
    [--live-root ABSOLUTE_PATH] \\
    [--live-config ABSOLUTE_PATH] \\
    [--work-root ABSOLUTE_PATH]

  install-live-plugin.mjs promote \\
    --plan ABSOLUTE_PLAN_JSON \\
    --expected-plan-sha256 64HEX \\
    --receipt ABSOLUTE_RECEIPT_JSON

prepare never mutates the live installation or its parent. promote rechecks every
prepared identity, creates verified rollback material, performs a same-filesystem
directory swap, validates the installed activation pair, and emits a typed receipt.

The installer never merges a PR, edits opencode.json, performs fresh-process
acceptance, or closes an issue. If the staged source does not validate the current
live config unchanged, prepare fails with CONFIG_MIGRATION_REQUIRED.
`
}

function parseOptions(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(usage())
    process.exit(0)
  }
  const mode = argv[0]
  if (!["prepare", "promote"].includes(mode)) {
    block("USAGE", `unknown mode: ${mode}`)
  }
  const options = new Map()
  for (let i = 1; i < argv.length; i += 2) {
    const name = argv[i]
    const value = argv[i + 1]
    if (!name?.startsWith("--") || value === undefined || value.startsWith("--")) {
      block("USAGE", `expected --name value pair near ${name ?? "<end>"}`)
    }
    if (options.has(name)) block("USAGE", `duplicate option: ${name}`)
    options.set(name, value)
  }
  return { mode, options }
}

function option(options, name, fallback) {
  return options.has(name) ? options.get(name) : fallback
}

function required(options, name) {
  const value = options.get(name)
  if (!value) block("USAGE", `missing required option ${name}`)
  return value
}

function absolutePath(value, name) {
  if (!isAbsolute(value)) block("USAGE", `${name} must be an absolute path`)
  return resolve(value)
}

function exactSha(value, name) {
  const normalized = String(value).toLowerCase()
  if (!SHA40.test(normalized)) block("USAGE", `${name} must be exactly 40 lowercase hexadecimal characters`)
  return normalized
}

function exactSha256(value, name) {
  const normalized = String(value).toLowerCase()
  if (!SHA256.test(normalized)) block("USAGE", `${name} must be exactly 64 lowercase hexadecimal characters`)
  return normalized
}

function safeRelativeRepoPath(value, name) {
  if (!value || isAbsolute(value) || value.split(/[\\/]/).includes("..")) {
    block("USAGE", `${name} must be a non-escaping repository-relative path`)
  }
  return value.replaceAll("\\", "/")
}

function commandText(file, args) {
  return [file, ...args].map((part) => JSON.stringify(String(part))).join(" ")
}

function run(file, args, { cwd, env, allowFailure = false, encoding = "utf8" } = {}) {
  const result = spawnSync(file, args, {
    cwd,
    env: env ?? process.env,
    encoding,
    maxBuffer: MAX_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (result.error) {
    block("COMMAND_EXECUTION_FAILED", `${commandText(file, args)} failed to execute: ${result.error.message}`)
  }
  const status = result.status ?? 1
  if (!allowFailure && status !== 0) {
    block("COMMAND_FAILED", `${commandText(file, args)} exited ${status}`, {
      cwd: cwd ?? null,
      stdout: String(result.stdout ?? ""),
      stderr: String(result.stderr ?? ""),
    })
  }
  return {
    status,
    signal: result.signal ?? null,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  }
}

function git(repoRoot, args, options = {}) {
  return run("git", args, { cwd: repoRoot, ...options })
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex")
}

async function sha256File(path) {
  return sha256Bytes(await readFile(path))
}

async function fsyncFile(path) {
  const handle = await open(path, "r")
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

async function fsyncDirectory(path) {
  const handle = await open(path, "r")
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

async function openExclusiveDestination(path) {
  await mkdir(dirname(path), { recursive: true })
  try {
    return await open(path, "wx", 0o600)
  } catch (error) {
    if (error?.code === "EEXIST") block("DESTINATION_EXISTS", `exclusive destination already exists: ${path}`)
    throw error
  }
}

async function writeJsonExclusive(path, value) {
  const payload = `${JSON.stringify(value, null, 2)}\n`
  const handle = await openExclusiveDestination(path)
  try {
    await handle.writeFile(payload, "utf8")
    await handle.sync()
  } finally {
    await handle.close()
  }
  await fsyncDirectory(dirname(path))
  return sha256Bytes(Buffer.from(payload))
}

async function replaceReservedJson(path, expectedSha256, value) {
  const observed = await sha256File(path)
  if (observed !== expectedSha256) block("RECEIPT_RESERVATION_DRIFT", `reserved receipt changed before finalization: ${path}`)
  const payload = `${JSON.stringify(value, null, 2)}\n`
  const temporary = `${path}.tmp.${process.pid}.${randomUUID()}`
  const handle = await open(temporary, "wx", 0o600)
  try {
    await handle.writeFile(payload, "utf8")
    await handle.sync()
  } finally {
    await handle.close()
  }
  try {
    await rename(temporary, path)
    await fsyncDirectory(dirname(path))
  } catch (error) {
    await unlink(temporary).catch(() => {})
    throw error
  }
  return sha256Bytes(Buffer.from(payload))
}

async function assertAbsentPath(path, label) {
  const existing = await lstat(path).catch((error) => {
    if (error?.code === "ENOENT") return null
    throw error
  })
  if (existing) block("DESTINATION_EXISTS", `${label} already exists: ${path}`)
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"))
  } catch (error) {
    block("INVALID_JSON", `cannot read valid JSON from ${path}: ${error.message}`)
  }
}

async function pathIdentity(path, expectedType = "directory") {
  const info = await lstat(path, { bigint: true }).catch((error) => {
    block("PATH_NOT_FOUND", `${path}: ${error.message}`)
  })
  if (info.isSymbolicLink()) block("SYMLINK_BOUNDARY_REJECTED", `${path} must not be a symbolic link`)
  if (expectedType === "directory" && !info.isDirectory()) block("PATH_TYPE_MISMATCH", `${path} must be a directory`)
  if (expectedType === "file" && !info.isFile()) block("PATH_TYPE_MISMATCH", `${path} must be a regular file`)
  return {
    dev: String(info.dev),
    ino: String(info.ino),
    mode: Number(info.mode & 0o7777n),
    size: String(info.size),
  }
}

function sameIdentity(a, b) {
  return a.dev === b.dev && a.ino === b.ino && a.mode === b.mode
}

async function ensureRepoRoot(repoRoot) {
  const real = await realpath(repoRoot).catch((error) => block("REPO_NOT_FOUND", error.message))
  await pathIdentity(real, "directory")
  const inside = git(real, ["rev-parse", "--is-inside-work-tree"]).stdout.trim()
  if (inside !== "true") block("NOT_A_GIT_WORKTREE", `${real} is not a Git worktree`)
  return real
}

function resolveCommitTree(repoRoot, sha, label) {
  const type = git(repoRoot, ["cat-file", "-t", sha]).stdout.trim()
  if (type !== "commit") block("COMMIT_NOT_FOUND", `${label} ${sha} is not an available commit object`)
  const tree = git(repoRoot, ["rev-parse", `${sha}^{tree}`]).stdout.trim().toLowerCase()
  if (!SHA40.test(tree)) block("INVALID_TREE_IDENTITY", `${label} tree identity is malformed: ${tree}`)
  return tree
}

function gitDirectorySet(repoRoot, sha) {
  const result = git(repoRoot, ["ls-tree", "-rz", "-t", "--full-tree", sha])
  const dirs = new Set()
  for (const entry of String(result.stdout).split("\0")) {
    if (!entry) continue
    const tab = entry.indexOf("\t")
    if (tab < 0) block("LS_TREE_PARSE_FAILED", `malformed ls-tree entry for ${sha}`)
    const meta = entry.slice(0, tab).split(" ")
    const path = entry.slice(tab + 1)
    if (meta[1] === "tree") dirs.add(path)
  }
  return dirs
}

async function walkInventory(root) {
  const entries = []
  const dirs = new Set()
  async function visit(current, prefix) {
    const directory = await opendir(current)
    const names = []
    for await (const dirent of directory) names.push(dirent.name)
    names.sort((a, b) => Buffer.from(a).compare(Buffer.from(b)))
    for (const name of names) {
      if (FORBIDDEN_BASENAMES.has(name) || FORBIDDEN_SUFFIXES.some((suffix) => name.endsWith(suffix))) {
        block("DEPLOYMENT_RESIDUE", `forbidden deployment residue: ${prefix ? `${prefix}/` : ""}${name}`)
      }
      const path = join(current, name)
      const rel = prefix ? `${prefix}/${name}` : name
      const info = await lstat(path)
      if (info.isDirectory()) {
        dirs.add(rel)
        entries.push({ path: rel, type: "directory", mode: info.mode & 0o7777 })
        await visit(path, rel)
      } else if (info.isFile()) {
        const bytes = await readFile(path)
        entries.push({
          path: rel,
          type: "file",
          mode: info.mode & 0o111 ? "100755" : "100644",
          size: info.size,
          sha256: sha256Bytes(bytes),
        })
      } else if (info.isSymbolicLink()) {
        const target = await readlink(path)
        entries.push({
          path: rel,
          type: "symlink",
          mode: "120000",
          target,
          sha256: sha256Bytes(Buffer.from(target)),
        })
      } else {
        block("SPECIAL_FILE_REJECTED", `unsupported filesystem object at ${rel}`)
      }
    }
  }
  await visit(root, "")
  return {
    entries,
    dirs,
    manifestSha256: sha256Bytes(Buffer.from(`${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`)),
  }
}

function setEquals(left, right) {
  if (left.size !== right.size) return false
  for (const value of left) if (!right.has(value)) return false
  return true
}

async function computeGitTree(root, scratchRoot) {
  const scratch = await mkdtemp(join(scratchRoot, "treehash-"))
  const gitDir = join(scratch, "git")
  try {
    run("git", ["init", "--bare", "-q", gitDir])
    const env = {
      ...process.env,
      GIT_DIR: gitDir,
      GIT_WORK_TREE: root,
      GIT_INDEX_FILE: join(gitDir, "index"),
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
    }
    run("git", ["-c", "core.autocrlf=false", "-c", "core.filemode=true", "-c", "core.symlinks=true", "read-tree", "--empty"], { cwd: root, env })
    run("git", ["-c", "core.autocrlf=false", "-c", "core.filemode=true", "-c", "core.symlinks=true", "add", "--all", "--force", "--", "."], { cwd: root, env })
    const tree = run("git", ["-c", "core.autocrlf=false", "-c", "core.filemode=true", "-c", "core.symlinks=true", "write-tree"], { cwd: root, env }).stdout.trim().toLowerCase()
    if (!SHA40.test(tree)) block("TREE_HASH_FAILED", `malformed computed tree identity: ${tree}`)
    return tree
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

async function validateTreeAgainstCommit({ repoRoot, root, commitSha, expectedTree, scratchRoot, label }) {
  await pathIdentity(root, "directory")
  const inventory = await walkInventory(root)
  const expectedDirs = gitDirectorySet(repoRoot, commitSha)
  if (!setEquals(inventory.dirs, expectedDirs)) {
    const extra = [...inventory.dirs].filter((path) => !expectedDirs.has(path)).slice(0, 20)
    const missing = [...expectedDirs].filter((path) => !inventory.dirs.has(path)).slice(0, 20)
    block("TREE_DIRECTORY_DRIFT", `${label} directory inventory differs from ${commitSha}`, { extra, missing })
  }
  const tree = await computeGitTree(root, scratchRoot)
  if (tree !== expectedTree) {
    block("TREE_IDENTITY_MISMATCH", `${label} tree ${tree} != expected ${expectedTree}`, { observed: tree, expected: expectedTree })
  }
  return { tree, manifestSha256: inventory.manifestSha256, entryCount: inventory.entries.length }
}

async function materializeCommit({ repoRoot, commitSha, expectedTree, target, scratchRoot }) {
  await mkdir(dirname(target), { recursive: true })
  await mkdir(target)
  const tarPath = `${target}.tar`
  try {
    git(repoRoot, ["archive", "--format=tar", `--output=${tarPath}`, commitSha])
    run("tar", ["-xf", tarPath, "-C", target])
  } finally {
    await unlink(tarPath).catch(() => {})
  }
  return validateTreeAgainstCommit({
    repoRoot,
    root: target,
    commitSha,
    expectedTree,
    scratchRoot,
    label: "staged source",
  })
}

async function validateLiveConfig(liveConfig) {
  const text = await readFile(liveConfig, "utf8")
  try {
    parseAndValidateConfig(text)
  } catch (error) {
    block("CONFIG_MIGRATION_REQUIRED", `current live config is incompatible with the merged source contract: ${error.message}`)
  }
  const after = await readFile(liveConfig, "utf8")
  if (after !== text) block("CONFIG_VALIDATOR_MUTATION", "live config changed while validating its in-process contract")
  return { result: "PASS", sha256: sha256Bytes(Buffer.from(text)) }
}

function pathWithin(parent, child) {
  const rel = relative(parent, child)
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

async function ensureSafeControlRoot(requestedRoot, liveParent) {
  const tempRoot = resolve(tmpdir())
  const target = resolve(requestedRoot)
  if (target === tempRoot || !pathWithin(tempRoot, target)) {
    block("UNSAFE_CONTROL_ROOT", `installer control root must be a strict descendant of ${tempRoot}`)
  }
  let current = tempRoot
  for (const part of relative(tempRoot, target).split(sep).filter(Boolean)) {
    current = join(current, part)
    const info = await lstat(current).catch((error) => {
      if (error?.code !== "ENOENT") throw error
      return null
    })
    if (info) {
      if (info.isSymbolicLink()) block("SYMLINK_BOUNDARY_REJECTED", `control-root component must not be a symlink: ${current}`)
      if (!info.isDirectory()) block("PATH_TYPE_MISMATCH", `control-root component must be a directory: ${current}`)
    } else {
      await mkdir(current, { mode: 0o700 })
    }
  }
  const controlRoot = await realpath(target)
  const liveParentReal = await realpath(liveParent)
  if (pathWithin(liveParentReal, controlRoot) || pathWithin(controlRoot, liveParentReal)) {
    block("UNSAFE_CONTROL_ROOT", "installer control root must not overlap the live-plugin parent")
  }
  return controlRoot
}

async function readPackageMarker(root) {
  const packagePath = join(root, "package.json")
  const pkg = await readJson(packagePath)
  if (pkg.name !== "opencode-operational-schema-guard") {
    block("PACKAGE_MARKER_MISMATCH", `${packagePath} has unexpected package name ${pkg.name}`)
  }
  return { name: pkg.name, version: pkg.version ?? null }
}

async function prepare(options) {
  const repoRoot = await ensureRepoRoot(absolutePath(required(options, "--repo"), "--repo"))
  const mergedSha = exactSha(required(options, "--merged-sha"), "--merged-sha")
  const reviewedSha = exactSha(required(options, "--reviewed-sha"), "--reviewed-sha")
  const expectedLiveSha = exactSha(required(options, "--expected-live-sha"), "--expected-live-sha")
  const planPath = absolutePath(required(options, "--plan"), "--plan")
  const liveRoot = absolutePath(option(options, "--live-root", DEFAULT_LIVE_ROOT), "--live-root")
  const liveConfig = absolutePath(option(options, "--live-config", DEFAULT_LIVE_CONFIG), "--live-config")
  const requestedWorkRoot = absolutePath(option(options, "--work-root", DEFAULT_WORK_ROOT), "--work-root")

  const mergedTree = resolveCommitTree(repoRoot, mergedSha, "merged commit")
  const reviewedTree = resolveCommitTree(repoRoot, reviewedSha, "reviewed commit")
  if (mergedTree !== reviewedTree) {
    block("MERGED_TREE_IDENTITY_MISMATCH", "reviewed PR tree does not equal merged-main tree", {
      reviewed_sha: reviewedSha,
      reviewed_tree: reviewedTree,
      merged_sha: mergedSha,
      merged_tree: mergedTree,
    })
  }
  const expectedLiveTree = resolveCommitTree(repoRoot, expectedLiveSha, "expected live commit")

  await pathIdentity(liveRoot, "directory")
  await pathIdentity(liveConfig, "file")
  const liveParent = dirname(liveRoot)
  const liveRootIdentity = await pathIdentity(liveRoot, "directory")
  const liveParentIdentity = await pathIdentity(liveParent, "directory")
  const liveConfigIdentity = await pathIdentity(liveConfig, "file")
  const liveConfigSha256 = await sha256File(liveConfig)
  const controlRoot = await ensureSafeControlRoot(requestedWorkRoot, liveParent)
  if (!pathWithin(controlRoot, planPath)) block("UNSAFE_CONTROL_PATH", "plan must be created inside the installer control root")

  const workRoot = await mkdtemp(join(controlRoot, "prepare-"))
  const scratchRoot = join(workRoot, "scratch")
  await mkdir(scratchRoot)
  const stageRoot = join(workRoot, "merged-source")
  const stage = await materializeCommit({
    repoRoot,
    commitSha: mergedSha,
    expectedTree: mergedTree,
    target: stageRoot,
    scratchRoot,
  })
  const packageMarker = await readPackageMarker(stageRoot)

  const priorLive = await validateTreeAgainstCommit({
    repoRoot,
    root: liveRoot,
    commitSha: expectedLiveSha,
    expectedTree: expectedLiveTree,
    scratchRoot,
    label: "current live source",
  })
  const configValidation = await validateLiveConfig(liveConfig)

  const plan = {
    schema_version: PLAN_SCHEMA,
    result: "PREPARED",
    created_at: new Date().toISOString(),
    repository_root: repoRoot,
    reviewed_commit: reviewedSha,
    reviewed_tree: reviewedTree,
    merged_commit: mergedSha,
    merged_tree: mergedTree,
    reviewed_tree_equals_merged_tree: true,
    source_stage: {
      root: stageRoot,
      tree: stage.tree,
      manifest_sha256: stage.manifestSha256,
      entry_count: stage.entryCount,
      package: packageMarker,
    },
    expected_live: {
      commit: expectedLiveSha,
      tree: expectedLiveTree,
      observed_tree: priorLive.tree,
      observed_manifest_sha256: priorLive.manifestSha256,
      entry_count: priorLive.entryCount,
      authenticated: true,
    },
    activation_pair: {
      live_root: liveRoot,
      live_config: liveConfig,
      live_root_identity: liveRootIdentity,
      live_parent_identity: liveParentIdentity,
      live_config_identity: liveConfigIdentity,
      pre_promotion_config_sha256: liveConfigSha256,
      config_change_required: false,
      config_validation: configValidation,
    },
    repository_validation: { authority: "trusted-actions-external", result: "NOT_EVALUATED_BY_INSTALLER" },
    control_root: controlRoot,
    work_root: workRoot,
    scratch_root: scratchRoot,
    fresh_process_acceptance: "NOT_RUN",
    issue_closure_ready: false,
  }
  const planSha256 = await writeJsonExclusive(planPath, plan)
  process.stdout.write(
    [
      "OPERATIONAL_LIVE_PLUGIN_PREPARE_RESULT=PASS",
      `PLAN=${planPath}`,
      `PLAN_SHA256=${planSha256}`,
      `REVIEWED_PR_COMMIT_IDENTITY=${reviewedSha}`,
      `REVIEWED_PR_TREE_IDENTITY=${reviewedTree}`,
      `MERGED_MAIN_COMMIT_IDENTITY=${mergedSha}`,
      `MERGED_MAIN_TREE_IDENTITY=${mergedTree}`,
      `SOURCE_STAGE_TREE_IDENTITY=${stage.tree}`,
      `PRIOR_LIVE_SOURCE_IDENTITY=${expectedLiveSha}`,
      `PRIOR_LIVE_TREE_IDENTITY=${priorLive.tree}`,
      `PRE_PROMOTION_CONFIG_SHA256=${liveConfigSha256}`,
      "CONFIG_CHANGE_REQUIRED=no",
      "FRESH_PROCESS_ACCEPTANCE=NOT_RUN",
      "ISSUE_CLOSURE_READY=no",
      "",
    ].join("\n"),
  )
}

async function acquireLock(lockPath) {
  const nonce = randomUUID()
  const body = JSON.stringify({ pid: process.pid, nonce, created_at: new Date().toISOString() })
  const handle = await open(lockPath, "wx", 0o600).catch((error) => {
    block("INSTALL_LOCKED", `cannot acquire ${lockPath}: ${error.message}`)
  })
  try {
    await handle.writeFile(`${body}\n`, "utf8")
    await handle.sync()
  } finally {
    await handle.close()
  }
  await fsyncDirectory(dirname(lockPath))
  return { nonce, body: `${body}\n` }
}

async function releaseLock(lockPath, lock) {
  try {
    const current = await readFile(lockPath, "utf8")
    if (current !== lock.body) block("LOCK_IDENTITY_DRIFT", `installer lock changed unexpectedly: ${lockPath}`)
    await unlink(lockPath)
    await fsyncDirectory(dirname(lockPath))
  } catch (error) {
    if (error instanceof InstallError) throw error
    if (error?.code !== "ENOENT") throw error
  }
}

function utcStamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

async function copyTreeExact(source, destination) {
  await cp(source, destination, {
    recursive: true,
    force: false,
    errorOnExist: true,
    dereference: false,
    preserveTimestamps: true,
  })
}

async function fsyncTree(root) {
  const info = await lstat(root)
  if (!info.isDirectory()) block("PATH_TYPE_MISMATCH", `${root} must be a directory`)
  const directory = await opendir(root)
  const children = []
  for await (const entry of directory) children.push(entry.name)
  children.sort((a, b) => Buffer.from(a).compare(Buffer.from(b)))
  for (const name of children) {
    const path = join(root, name)
    const child = await lstat(path)
    if (child.isDirectory()) {
      await fsyncTree(path)
    } else if (child.isFile()) {
      await fsyncFile(path)
    } else if (!child.isSymbolicLink()) {
      block("SPECIAL_FILE_REJECTED", `unsupported filesystem object during fsync: ${path}`)
    }
  }
  await fsyncDirectory(root)
}

async function rollbackSwap({ liveRoot, liveParent, superseded, failedRoot, repoRoot, expectedLiveSha, expectedLiveTree, scratchRoot, liveConfig, expectedConfigSha256 }) {
  let candidateMoved = false
  try {
    const current = await lstat(liveRoot).catch(() => null)
    if (current) {
      await rename(liveRoot, failedRoot)
      candidateMoved = true
    }
    await rename(superseded, liveRoot)
    await fsyncDirectory(liveParent)
    const restored = await validateTreeAgainstCommit({
      repoRoot,
      root: liveRoot,
      commitSha: expectedLiveSha,
      expectedTree: expectedLiveTree,
      scratchRoot,
      label: "rolled-back live source",
    })
    const configSha = await sha256File(liveConfig)
    if (configSha !== expectedConfigSha256) {
      block("ROLLBACK_CONFIG_IDENTITY_MISMATCH", `config changed during rollback: ${configSha}`)
    }
    return { restored_tree: restored.tree, failed_candidate: candidateMoved ? failedRoot : null }
  } catch (error) {
    block("ROLLBACK_FAILED", `automatic rollback failed: ${error.message}`, {
      superseded,
      failed_root: candidateMoved ? failedRoot : null,
    })
  }
}

async function promote(options) {
  const planPath = absolutePath(required(options, "--plan"), "--plan")
  const expectedPlanSha256 = exactSha256(required(options, "--expected-plan-sha256"), "--expected-plan-sha256")
  const receiptPath = absolutePath(required(options, "--receipt"), "--receipt")
  const observedPlanSha256 = await sha256File(planPath)
  if (observedPlanSha256 !== expectedPlanSha256) {
    block("PLAN_DIGEST_MISMATCH", `plan digest ${observedPlanSha256} != expected ${expectedPlanSha256}`)
  }
  const plan = await readJson(planPath)
  if (plan.schema_version !== PLAN_SCHEMA || plan.result !== "PREPARED") {
    block("INVALID_PLAN", `${planPath} is not a prepared ${PLAN_SCHEMA} plan`)
  }

  const repoRoot = await ensureRepoRoot(plan.repository_root)
  const mergedSha = exactSha(plan.merged_commit, "plan.merged_commit")
  const reviewedSha = exactSha(plan.reviewed_commit, "plan.reviewed_commit")
  const expectedLiveSha = exactSha(plan.expected_live?.commit, "plan.expected_live.commit")
  const mergedTree = resolveCommitTree(repoRoot, mergedSha, "merged commit")
  const reviewedTree = resolveCommitTree(repoRoot, reviewedSha, "reviewed commit")
  const expectedLiveTree = resolveCommitTree(repoRoot, expectedLiveSha, "expected live commit")
  if (mergedTree !== plan.merged_tree || reviewedTree !== plan.reviewed_tree || mergedTree !== reviewedTree) {
    block("PRECONDITION_DRIFT", "prepared reviewed/merged Git identities no longer agree with the plan")
  }
  if (expectedLiveTree !== plan.expected_live.tree) {
    block("PRECONDITION_DRIFT", "expected prior-live Git tree no longer agrees with the plan")
  }

  const stageRoot = absolutePath(plan.source_stage?.root, "plan.source_stage.root")
  const liveRoot = absolutePath(plan.activation_pair?.live_root, "plan.activation_pair.live_root")
  const liveConfig = absolutePath(plan.activation_pair?.live_config, "plan.activation_pair.live_config")
  const liveParent = dirname(liveRoot)
  const scratchRoot = absolutePath(plan.scratch_root, "plan.scratch_root")
  await mkdir(scratchRoot, { recursive: true })

  const relativeReceiptToLive = relative(liveRoot, receiptPath)
  if (relativeReceiptToLive === "" || (!relativeReceiptToLive.startsWith(`..${sep}`) && relativeReceiptToLive !== ".." && !isAbsolute(relativeReceiptToLive))) {
    block("UNSAFE_RECEIPT_PATH", "receipt must not be created inside the live plugin root")
  }

  let receiptHandle = await openExclusiveDestination(receiptPath)
  let receiptCommitted = false
  try {
    const lockPath = join(liveParent, `.${basename(liveRoot)}.install.lock`)
    const lock = await acquireLock(lockPath)
    let superseded = null
    let backupSource = null
    let configBackup = null
    let failedRoot = null
    let finalReceipt = null
    let finalOutput = null
    try {
      const currentLiveIdentity = await pathIdentity(liveRoot, "directory")
      const currentParentIdentity = await pathIdentity(liveParent, "directory")
      const currentConfigIdentity = await pathIdentity(liveConfig, "file")
      if (!sameIdentity(currentLiveIdentity, plan.activation_pair.live_root_identity)) {
        block("PRECONDITION_DRIFT", "live source inode/device/mode changed after prepare")
      }
      if (!sameIdentity(currentParentIdentity, plan.activation_pair.live_parent_identity)) {
        block("PRECONDITION_DRIFT", "live source parent inode/device/mode changed after prepare")
      }
      if (!sameIdentity(currentConfigIdentity, plan.activation_pair.live_config_identity)) {
        block("PRECONDITION_DRIFT", "live config inode/device/mode changed after prepare")
      }

      const stage = await validateTreeAgainstCommit({
        repoRoot,
        root: stageRoot,
        commitSha: mergedSha,
        expectedTree: mergedTree,
        scratchRoot,
        label: "prepared stage",
      })
      if (stage.manifestSha256 !== plan.source_stage.manifest_sha256) {
        block("PRECONDITION_DRIFT", "prepared stage manifest changed after prepare")
      }
      const priorLive = await validateTreeAgainstCommit({
        repoRoot,
        root: liveRoot,
        commitSha: expectedLiveSha,
        expectedTree: expectedLiveTree,
        scratchRoot,
        label: "pre-promotion live source",
      })
      if (priorLive.manifestSha256 !== plan.expected_live.observed_manifest_sha256) {
        block("PRECONDITION_DRIFT", "live source manifest changed after prepare")
      }
      const configBefore = await sha256File(liveConfig)
      if (configBefore !== plan.activation_pair.pre_promotion_config_sha256) {
        block("PRECONDITION_DRIFT", "live config bytes changed after prepare")
      }
      await validateConfigWithSource(stageRoot, liveConfig)

      const stamp = utcStamp()
      const nonce = randomUUID().replaceAll("-", "").slice(0, 12)
      const base = basename(liveRoot)
      backupSource = join(liveParent, `${base}.backup-${stamp}-${mergedSha.slice(0, 8)}-${nonce}`)
      superseded = join(liveParent, `${base}.superseded-${stamp}-${mergedSha.slice(0, 8)}-${nonce}`)
      const incoming = join(liveParent, `.${base}.incoming-${stamp}-${mergedSha.slice(0, 8)}-${nonce}`)
      failedRoot = join(liveParent, `${base}.failed-${stamp}-${mergedSha.slice(0, 8)}-${nonce}`)
      configBackup = join(dirname(liveConfig), `${basename(liveConfig)}.backup-live-plugin-${stamp}-${mergedSha.slice(0, 8)}-${nonce}`)

      await copyTreeExact(liveRoot, backupSource)
      await fsyncTree(backupSource)
      const backup = await validateTreeAgainstCommit({
        repoRoot,
        root: backupSource,
        commitSha: expectedLiveSha,
        expectedTree: expectedLiveTree,
        scratchRoot,
        label: "rollback source backup",
      })

      await copyFile(liveConfig, configBackup, COPYFILE_EXCL)
      await fsyncFile(configBackup)
      await fsyncDirectory(dirname(configBackup))
      const configBackupSha256 = await sha256File(configBackup)
      if (configBackupSha256 !== configBefore) {
        block("ROLLBACK_CONFIG_COPY_MISMATCH", "rollback config backup differs from the pre-promotion config")
      }

      await copyTreeExact(stageRoot, incoming)
      await fsyncTree(incoming)
      const incomingIdentity = await pathIdentity(incoming, "directory")
      if (incomingIdentity.dev !== currentParentIdentity.dev) {
        block("CROSS_FILESYSTEM_PROMOTION_REJECTED", "incoming source is not on the live-root filesystem")
      }
      const incomingCheck = await validateTreeAgainstCommit({
        repoRoot,
        root: incoming,
        commitSha: mergedSha,
        expectedTree: mergedTree,
        scratchRoot,
        label: "incoming source",
      })
      if (incomingCheck.manifestSha256 !== stage.manifestSha256) {
        block("INCOMING_COPY_MISMATCH", "incoming source manifest differs from the prepared stage")
      }

      await rename(liveRoot, superseded)
      await fsyncDirectory(liveParent)
      try {
        await rename(incoming, liveRoot)
        await fsyncDirectory(liveParent)
      } catch (error) {
        await rename(superseded, liveRoot).catch((rollbackError) => {
          block("ROLLBACK_FAILED", `candidate rename failed (${error.message}); restoring prior live source also failed (${rollbackError.message})`, {
            superseded,
            incoming,
          })
        })
        await fsyncDirectory(liveParent)
        block("PROMOTION_RENAME_FAILED", `candidate rename failed; prior live source restored: ${error.message}`, { incoming })
      }

      let installed
      let configAfter
      let installedConfigValidation
      try {
        installed = await validateTreeAgainstCommit({
          repoRoot,
          root: liveRoot,
          commitSha: mergedSha,
          expectedTree: mergedTree,
          scratchRoot,
          label: "installed live source",
        })
        if (installed.manifestSha256 !== stage.manifestSha256) {
          block("POST_PROMOTION_TREE_MISMATCH", "installed source manifest differs from the prepared stage")
        }
        configAfter = await sha256File(liveConfig)
        if (configAfter !== configBefore) {
          block("POST_PROMOTION_CONFIG_DRIFT", "live config changed during a source-only deployment")
        }
        installedConfigValidation = await validateConfigWithSource(liveRoot, liveConfig)
        const installedPackage = await readPackageMarker(liveRoot)
        if (
          installedPackage.name !== plan.source_stage.package.name ||
          installedPackage.version !== plan.source_stage.package.version
        ) {
          block("POST_PROMOTION_PACKAGE_MARKER_MISMATCH", "installed package marker differs from the prepared stage")
        }
      } catch (error) {
        const rollback = await rollbackSwap({
          liveRoot,
          liveParent,
          superseded,
          failedRoot,
          repoRoot,
          expectedLiveSha,
          expectedLiveTree,
          scratchRoot,
          liveConfig,
          expectedConfigSha256: configBefore,
        })
        throw new InstallError(
          "POST_PROMOTION_VALIDATION_FAILED_ROLLED_BACK",
          `post-promotion validation failed and the prior source was restored: ${error.message}`,
          { original_code: error.code ?? null, rollback, backup_source: backupSource, config_backup: configBackup },
        )
      }

      const receipt = {
        schema_version: RECEIPT_SCHEMA,
        result: "PASS",
        created_at: new Date().toISOString(),
        plan: { path: planPath, sha256: observedPlanSha256, schema_version: plan.schema_version },
        repository_root: repoRoot,
        reviewed_commit: reviewedSha,
        reviewed_tree: reviewedTree,
        merged_commit: mergedSha,
        merged_tree: mergedTree,
        reviewed_tree_equals_merged_tree: true,
        source_stage: {
          root: stageRoot,
          tree: stage.tree,
          manifest_sha256: stage.manifestSha256,
          entry_count: stage.entryCount,
        },
        prior_live: {
          commit: expectedLiveSha,
          tree: priorLive.tree,
          manifest_sha256: priorLive.manifestSha256,
          authenticated: true,
        },
        activation_pair: {
          live_root: liveRoot,
          live_config: liveConfig,
          config_change_required: false,
          pre_promotion_config_sha256: configBefore,
          post_promotion_config_sha256: configAfter,
          config_byte_preserved: configAfter === configBefore,
          config_validation: installedConfigValidation,
        },
        validation: plan.validation,
        validation_summary: plan.validation_summary,
        installed: {
          tree: installed.tree,
          manifest_sha256: installed.manifestSha256,
          entry_count: installed.entryCount,
          tree_matches_stage: installed.tree === stage.tree && installed.manifestSha256 === stage.manifestSha256,
          tree_matches_merged_main: installed.tree === mergedTree,
          deployment_residue_check: "PASS",
        },
        rollback: {
          source_backup: backupSource,
          source_backup_tree: backup.tree,
          superseded_source: superseded,
          config_backup: configBackup,
          config_backup_sha256: configBackupSha256,
          retained: true,
        },
        fresh_process_acceptance: "NOT_RUN",
        issue_closure_ready: false,
      }
      finalReceipt = receipt
      finalOutput = [
        "OPERATIONAL_LIVE_PLUGIN_DEPLOYMENT_RESULT=PASS",
        `REVIEWED_PR_COMMIT_IDENTITY=${reviewedSha}`,
        `REVIEWED_PR_TREE_IDENTITY=${reviewedTree}`,
        `MERGED_MAIN_COMMIT_IDENTITY=${mergedSha}`,
        `MERGED_MAIN_TREE_IDENTITY=${mergedTree}`,
        "REVIEWED_TREE_EQUALS_MERGED_TREE=yes",
        `SOURCE_STAGE_COMMIT_IDENTITY=${mergedSha}`,
        `SOURCE_STAGE_TREE_IDENTITY=${stage.tree}`,
        "STAGED_TREE_MATCHES_MERGED_MAIN=yes",
        `PRIOR_LIVE_SOURCE_IDENTITY=${expectedLiveSha}`,
        `PRIOR_LIVE_TREE_IDENTITY=${priorLive.tree}`,
        "PRIOR_LIVE_TREE_AUTHENTICATED=yes",
        `LIVE_ROOT=${liveRoot}`,
        "CONFIG_CHANGE_REQUIRED=no",
        `PRE_PROMOTION_CONFIG_SHA256=${configBefore}`,
        `POST_PROMOTION_CONFIG_SHA256=${configAfter}`,
        "CONFIG_BYTE_PRESERVED=yes",
        "CONFIG_VALIDATION_RESULT=PASS",
        `STAGED_NPM_CHECK=${plan.validation_summary.npm_check}`,
        `STAGED_NPM_TEST=${plan.validation_summary.npm_test}`,
        `STAGED_NPM_TEST_COUNT=${plan.validation_summary.test_count ?? "UNVERIFIED"}`,
        `STAGED_NPM_TEST_PASS=${plan.validation_summary.test_pass ?? "UNVERIFIED"}`,
        "INSTALLED_TREE_MATCHES_STAGE=yes",
        "INSTALLED_TREE_MATCHES_MERGED_MAIN=yes",
        "DEPLOYMENT_RESIDUE_CHECK=PASS",
        `ROLLBACK_SOURCE=${backupSource};${superseded}`,
        `ROLLBACK_CONFIG=${configBackup}`,
        "ROLLBACK_RETAINED=yes",
        "FRESH_PROCESS_ACCEPTANCE=NOT_RUN",
        "ISSUE_CLOSURE_READY=no",
        "BLOCK_REASON=none",
        "",
      ]
    } finally {
      await releaseLock(lockPath, lock)
    }

    const receiptSha256 = await writeReservedJson(receiptPath, receiptHandle, finalReceipt)
    receiptHandle = undefined
    receiptCommitted = true
    process.stdout.write([finalOutput[0], `RECEIPT=${receiptPath}`, `RECEIPT_SHA256=${receiptSha256}`, ...finalOutput.slice(1)].join("\n"))
  } finally {
    if (!receiptCommitted) {
      if (receiptHandle) await receiptHandle.close().catch(() => {})
      await unlink(receiptPath).catch(() => {})
      await fsyncDirectory(dirname(receiptPath)).catch(() => {})
    }
  }
}

async function main() {
  const { mode, options } = parseOptions(process.argv.slice(2))
  if (mode === "prepare") await prepare(options)
  else await promote(options)
}

main().catch((error) => {
  const code = error instanceof InstallError ? error.code : "UNEXPECTED_ERROR"
  const message = error?.message ?? String(error)
  const details = error instanceof InstallError ? error.details : {}
  process.stderr.write(
    `${JSON.stringify({
      schema_version: "opencode-live-plugin-install-error-v1",
      result: "BLOCKED",
      code,
      message,
      details,
    })}\n`,
  )
  process.stderr.write(`OPERATIONAL_LIVE_PLUGIN_RESULT=BLOCKED\nBLOCK_REASON=${code}\n`)
  process.exitCode = 1
})

