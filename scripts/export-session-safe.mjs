#!/usr/bin/env node

import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { dirname, join, resolve } from "node:path"

function option(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const sessionID = process.argv.find((arg) => /^ses_[A-Za-z0-9]+$/.test(arg))
const output = option("--output")
const binary = process.env.OPENCODE_BIN || "/home/filip/.opencode/bin/opencode"
if (!sessionID || !output || process.argv.includes("--help")) {
  process.stderr.write("usage: export-session-safe.mjs SESSION_ID --output PATH\n")
  process.exitCode = 2
} else {
  const target = resolve(output)
  if (existsSync(target)) throw new Error(`refusing to overwrite existing output ${target}`)
  const targetDirectory = dirname(target)
  const packet = mkdtempSync(join(targetDirectory, ".opencode-export-"))
  const temporary = join(packet, "session.json")
  const descriptor = openSync(temporary, "wx", 0o600)
  let result
  try {
    result = spawnSync(binary, ["export", sessionID], { stdio: ["ignore", descriptor, "pipe"], encoding: "utf8" })
  } finally {
    closeSync(descriptor)
  }
  if (result.status !== 0) {
    rmSync(packet, { recursive: true, force: true })
    throw new Error(`opencode export failed (${result.status ?? result.signal}): ${String(result.stderr ?? "").trim()}`)
  }
  const raw = readFileSync(temporary, "utf8")
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const tail = raw.slice(-160).replace(/\s+/g, " ")
    rmSync(packet, { recursive: true, force: true })
    throw new Error(`opencode export produced invalid JSON (${raw.length} bytes; ${error.message}; tail=${JSON.stringify(tail)})`)
  }
  if (parsed?.info?.id !== sessionID) {
    rmSync(packet, { recursive: true, force: true })
    throw new Error(`export identity mismatch: requested ${sessionID}, observed ${parsed?.info?.id ?? "missing"}`)
  }
  renameSync(temporary, target)
  rmSync(packet, { recursive: true, force: true })
  process.stdout.write(`exported ${sessionID} to ${target} (${raw.length} bytes; ${parsed.messages?.length ?? 0} messages)\n`)
}
