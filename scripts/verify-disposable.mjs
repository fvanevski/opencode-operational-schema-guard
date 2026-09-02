#!/usr/bin/env node

import { realpathSync } from "node:fs"
import { basename, isAbsolute, relative, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ENV_KEYS = new Set([
  "RESEARCH_STORE_TEST_DATABASE_URL",
  "RESEARCH_STORE_TEST_ALLOW_RESET",
  "QDRANT_URL",
  "RESEARCH_STORE_TEST_QDRANT_URL",
  "RESEARCH_STORE_TEST_QDRANT_ALLOW_RESET",
])

function fail(message) {
  process.stderr.write(`verify-disposable: ${message}\n`)
  process.exitCode = 2
}

function usage() {
  process.stderr.write(
    "Usage: verify-disposable.mjs [--helper PATH] --namespace NAME [--pg-port PORT] [--qdrant-port PORT] [--start] [--reset-qdrant] [--down-after] -- COMMAND [ARG ...]\n",
  )
}

function parseArgs(argv) {
  const options = {
    helper: "scripts/disposable-test-services",
    start: false,
    resetQdrant: false,
    downAfter: false,
    helperArgs: [],
    command: [],
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--") {
      options.command = argv.slice(index + 1)
      break
    }
    if (["--helper", "--namespace", "--pg-port", "--qdrant-port"].includes(arg)) {
      const value = argv[index + 1]
      if (!value) throw new Error(`${arg} requires a value`)
      index += 1
      if (arg === "--helper") options.helper = value
      else options.helperArgs.push(arg, value)
      if (arg === "--namespace") options.namespace = value
      continue
    }
    if (arg === "--start") options.start = true
    else if (arg === "--reset-qdrant") options.resetQdrant = true
    else if (arg === "--down-after") options.downAfter = true
    else throw new Error(`unknown option: ${arg}`)
  }
  if (!options.namespace) throw new Error("--namespace is required")
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/.test(options.namespace)) throw new Error("namespace is invalid")
  if (options.command.length === 0) throw new Error("a command is required after --")
  if (options.downAfter && !options.start) throw new Error("--down-after requires --start so the wrapper only removes services it started")
  if (options.resetQdrant && !options.start) throw new Error("--reset-qdrant requires --start so the wrapper cannot reset pre-existing services")
  return options
}

function resolveHelper(pathValue) {
  const cwd = realpathSync(process.cwd())
  const candidate = realpathSync(resolve(cwd, pathValue))
  const rel = relative(cwd, candidate)
  if (isAbsolute(rel) || rel === ".." || rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) {
    throw new Error("helper must resolve inside the current project")
  }
  if (basename(candidate) !== "disposable-test-services") {
    throw new Error("helper must be named disposable-test-services")
  }
  return candidate
}

function commandIsAllowed(command) {
  const [program, ...args] = command
  const name = basename(program ?? "")
  if (["pytest", "pyrefly", "mypy"].includes(name)) return true
  if (name === "ruff") return args[0] === "check" || (args[0] === "format" && args.includes("--check"))
  if (/^python(?:3(?:\.\d+)?)?$/.test(name)) return args[0] === "-m" && ["pytest", "pyrefly", "mypy"].includes(args[1])
  if (name === "uv" && args[0] === "run") return commandIsAllowed(args.slice(1))
  if (["npm", "pnpm"].includes(name)) return args[0] === "test" || (args[0] === "run" && args[1] === "test")
  if (name === "yarn") return args[0] === "test"
  if (name === "cargo" || name === "go") return args[0] === "test"
  return false
}

function rejectManagedEnvironmentPrefix(command) {
  const first = String(command[0] ?? "")
  if (first === "env" || /^[A-Za-z_][A-Za-z0-9_]*=/.test(first) || first === "rtk" || first === "node") {
    throw new Error("after --, begin directly with the repository-pinned validation executable; this wrapper injects PYTHONDONTWRITEBYTECODE and helper environment itself, so env, assignment, RTK, and node prefixes are forbidden")
  }
}

export { rejectManagedEnvironmentPrefix }

function runHelper(helper, helperArgs, action) {
  const result = spawnSync(helper, [...helperArgs, action], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`helper action ${action} failed with exit status ${result.status}`)
  return result.stdout
}

function parseEnvironment(text) {
  const environment = {}
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    const match = line.match(/^export ([A-Z][A-Z0-9_]*)='([^']*)'$/)
    if (!match || !ENV_KEYS.has(match[1])) throw new Error(`helper emitted an unexpected environment line: ${line}`)
    environment[match[1]] = match[2]
  }
  for (const key of ENV_KEYS) {
    if (!(key in environment)) throw new Error(`helper did not emit required variable ${key}`)
  }
  return environment
}

function run() {
  const options = parseArgs(process.argv.slice(2))
  const helper = resolveHelper(options.helper)
  rejectManagedEnvironmentPrefix(options.command)
  if (!commandIsAllowed(options.command)) throw new Error(`test command is not allowlisted: ${options.command.join(" ")}`)

  let started = false
  try {
    let exports = runHelper(helper, options.helperArgs, options.start ? "up" : "env")
    started = options.start
    if (options.resetQdrant) exports = runHelper(helper, options.helperArgs, "reset-qdrant")
    const environment = { ...process.env, ...parseEnvironment(exports), PYTHONDONTWRITEBYTECODE: "1" }
    const result = spawnSync(options.command[0], options.command.slice(1), { env: environment, stdio: "inherit" })
    if (result.error) throw result.error
    process.exitCode = result.status ?? 1
  } finally {
    if (started && options.downAfter) runHelper(helper, options.helperArgs, "down")
  }
}

const invokedAsMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
if (invokedAsMain) {
  try {
    run()
  } catch (error) {
    usage()
    fail(error instanceof Error ? error.message : String(error))
  }
}
