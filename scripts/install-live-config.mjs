#!/usr/bin/env node

import { resolve } from "node:path"
import { installConfigAtomically } from "../lib/config-contract.mjs"

const LIVE_CONFIG = "/home/filip/.config/opencode/opencode.json"

function option(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const candidate = option("--candidate")
const backup = option("--backup")
if (!candidate || !backup || process.argv.includes("--help")) {
  process.stderr.write("usage: install-live-config.mjs --candidate ABSOLUTE_PATH --backup ABSOLUTE_NEW_PATH\n")
  process.exitCode = 2
} else if (!candidate.startsWith("/") || !backup.startsWith("/")) {
  process.stderr.write("candidate and backup paths must be absolute\n")
  process.exitCode = 2
} else {
  const result = await installConfigAtomically({ candidatePath: resolve(candidate), targetPath: LIVE_CONFIG, backupPath: resolve(backup) })
  process.stdout.write(`validated and atomically installed ${result.target}; backup ${result.backup}\n`)
}

