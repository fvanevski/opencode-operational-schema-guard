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
/*__GHDEV_INSTALLER_REMAINDER__*/
