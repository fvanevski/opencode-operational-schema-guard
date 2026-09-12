#!/usr/bin/env node

import { COPYFILE_EXCL } from "node:constants"
import { createHash, randomUUID } from "node:crypto"
import { spawnSync } from "node:child_process"
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

const PLAN_SCHEMA = "opencode-live-plugin-install-plan-v1"
const RECEIPT_SCHEMA = "opencode-live-plugin-deployment-v1"
const DEFAULT_LIVE_ROOT = "/home/filip/.config/opencode/plugins/operational-schema-v5"
const DEFAULT_LIVE_CONFIG = "/home/filip/.config/opencode/opencode.json"
const DEFAULT_WORK_ROOT = "/tmp/opencode/live-plugin-install"
const DEFAULT_PROFILE = "evidence/profiles/repository-final-v1.json"
const DEFAULT_TEST_INIT_BRANCH = "master"
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
    [--work-root ABSOLUTE_PATH] \\
    [--profile REPO_RELATIVE_PATH] \\
    [--test-init-default-branch NAME]

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

async function writeReservedJson(path, handle, value) {
  const payload = `${JSON.stringify(value, null, 2)}\n`
  await handle.truncate(0)
  await handle.writeFile(payload, "utf8")
  await handle.sync()
  await handle.close()
  await fsyncDirectory(dirname(path))
  return sha256Bytes(Buffer.from(payload))
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

function deterministicValidationEnv(defaultBranch) {
  return {
    ...process.env,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "init.defaultBranch",
    GIT_CONFIG_VALUE_0: defaultBranch,
  }
}

function parseNodeTapTotals(text) {
  const fields = {}
  for (const name of ["tests", "pass", "fail", "skipped"]) {
    const match = new RegExp(`^# ${name} (\\d+)\\s*$`, "m").exec(text)
    if (match) fields[name] = Number(match[1])
  }
  if (!Number.isInteger(fields.tests) || !Number.isInteger(fields.pass) || !Number.isInteger(fields.fail)) {
    block("TEST_TOTALS_MISSING", "node-tap totals were requested but could not be parsed")
  }
  fields.skipped ??= 0
  return fields
}

async function runValidationProfile(stageRoot, workRoot, profileRelativePath, defaultBranch) {
  const profilePath = join(stageRoot, profileRelativePath)
  const profile = await readJson(profilePath)
  if (profile.schema_version !== "ghdev-actions-profile-v1" || !Array.isArray(profile.commands) || profile.commands.length === 0) {
    block("INVALID_VALIDATION_PROFILE", `${profilePath} is not a supported repository-final profile`)
  }
  const logRoot = join(workRoot, "validation-logs")
  await mkdir(logRoot, { recursive: true })
  const results = []
/*__GHDEV_INSTALLER_REMAINDER__*/
