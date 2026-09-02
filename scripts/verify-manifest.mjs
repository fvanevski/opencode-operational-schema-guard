#!/usr/bin/env node

import { createHash } from "node:crypto"
import { readFile, realpath } from "node:fs/promises"
import { basename, resolve } from "node:path"
import { spawn } from "node:child_process"

const ROOT = "/tmp/opencode/verify/manifests"
const SCHEMA = "opencode-verify-manifest-v1"
const WRAPPER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-disposable.mjs"

function fail(message, code = 2) {
  process.stderr.write(`verify-manifest: ${message}\n`)
  process.exit(code)
}

function inside(path, root) {
  const relative = path.slice(root.length)
  return path === root || (path.startsWith(`${root}/`) && relative.length > 1)
}

function validateArgv(argv, index) {
  if (!Array.isArray(argv) || argv.length < 1 || argv.length > 512 || argv.some((value) => typeof value !== "string" || /[\r\n\0]/.test(value))) {
    fail(`command ${index} has invalid argv`)
  }
  const executable = argv[0]
  const args = argv.slice(1)
  const name = basename(executable)
  if (executable === WRAPPER) {
    const delimiter = args.indexOf("--")
    if (delimiter < 0 || delimiter === args.length - 1) fail(`command ${index} disposable wrapper is missing -- <executable>`)
    const delegated = args[delimiter + 1]
    if (!["pytest", "ruff", "pyrefly", "mypy"].includes(basename(delegated))) fail(`command ${index} wrapper delegates an unsupported executable`)
    return
  }
  if (name === "git") {
    if (!/^(?:status|diff|rev-parse|branch|log|show|ls-files)$/.test(args[0] ?? "")) fail(`command ${index} uses a non-read-only Git subcommand`)
    return
  }
  if (!["pytest", "ruff", "pyrefly", "mypy"].includes(name)) fail(`command ${index} executable is not allowlisted (${executable})`)
  if (name === "ruff" && args[0] === "check" && args.includes("--fix")) fail(`command ${index} requests Ruff autofix`)
  if (name === "ruff" && args[0] === "format" && !args.includes("--check")) fail(`command ${index} requests Ruff format writes`)
  if (name === "ruff" && !["check", "format", "--version"].includes(args[0] ?? "")) fail(`command ${index} uses an unsupported Ruff mode`)
  if (name === "pyrefly" && !["check", "--version"].includes(args[0] ?? "")) fail(`command ${index} uses an unsupported Pyrefly mode`)
}

function run(argv, cwd) {
  return new Promise((complete, reject) => {
    const child = spawn(argv[0], argv.slice(1), { cwd, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }, stdio: "inherit", shell: false })
    child.once("error", reject)
    child.once("exit", (code, signal) => complete({ code: code ?? 1, signal }))
  })
}

const argv = process.argv.slice(2)
if (argv.length !== 2 || argv[0] !== "--manifest") fail("usage: verify-manifest.mjs --manifest /tmp/opencode/verify/manifests/<name>.json")
const requested = resolve(argv[1])
if (!inside(requested, ROOT) || !requested.endsWith(".json")) fail(`manifest must be a .json file under ${ROOT}`)

let canonical
try {
  canonical = await realpath(requested)
} catch (error) {
  fail(`manifest is not readable (${error.code ?? error.message})`)
}
if (!inside(canonical, ROOT)) fail("manifest symlink escapes the allowed root")

const text = await readFile(canonical, "utf8")
if (text.length > 32768) fail("manifest exceeds 32768 characters")
let manifest
try {
  manifest = JSON.parse(text)
} catch (error) {
  fail(`manifest is not strict JSON (${error.message})`)
}
if (manifest?.schema_version !== SCHEMA || !Array.isArray(manifest.commands) || manifest.commands.length < 1 || manifest.commands.length > 32) {
  fail(`manifest must use ${SCHEMA} with 1-32 commands`)
}
for (const [index, command] of manifest.commands.entries()) validateArgv(command?.argv, index + 1)

const hash = createHash("sha256").update(text).digest("hex")
const cwd = process.cwd()
let failed = 0
process.stdout.write(`OPERATIONAL_MANIFEST: schema=${SCHEMA}; sha256=${hash}; commands=${manifest.commands.length}; cwd=${cwd}\n`)
for (const [index, command] of manifest.commands.entries()) {
  const label = typeof command.label === "string" && command.label.trim() ? command.label.trim().replace(/[\r\n]/g, " ") : `command-${index + 1}`
  process.stdout.write(`OPERATIONAL_COMMAND_START: index=${index + 1}; label=${label}\n`)
  let result
  try {
    result = await run(command.argv, cwd)
  } catch (error) {
    process.stderr.write(`verify-manifest: command ${index + 1} failed to start (${error.code ?? error.message})\n`)
    result = { code: 127, signal: undefined }
  }
  if (result.code !== 0) failed += 1
  process.stdout.write(`OPERATIONAL_COMMAND_END: index=${index + 1}; exit=${result.code}; signal=${result.signal ?? "none"}\n`)
  if (result.code !== 0 && manifest.fail_fast !== false) break
}
process.stdout.write(`OPERATIONAL_MANIFEST_RESULT: ${failed === 0 ? "PASS" : "FAIL"}; COMMANDS_REQUIRED: ${manifest.commands.length}; COMMANDS_FAILED: ${failed}; SHA256: ${hash}\n`)
process.exit(failed === 0 ? 0 : 1)
