#!/usr/bin/env node
import { loadUntrackedQuarantineSpec, QuarantineBlockedError, runUntrackedQuarantine } from "../lib/untracked-quarantine.mjs"

function usage() {
  process.stderr.write("usage: untracked-quarantine.mjs --spec /tmp/opencode/verify/untracked-quarantine/specs/<file>.json\n")
}

const args = process.argv.slice(2)
if (args.length !== 2 || args[0] !== "--spec") {
  usage()
  process.stderr.write("UNTRACKED_QUARANTINE_RESULT=BLOCKED\n")
  process.exit(2)
}

try {
  const loaded = await loadUntrackedQuarantineSpec(args[1])
  const result = await runUntrackedQuarantine(loaded.spec)
  const fields = Object.entries(result)
    .filter(([key]) => key !== "result")
    .map(([key, value]) => `${key}=${String(value).replaceAll(";", "%3B").replaceAll("\n", "%0A")}`)
    .join("; ")
  process.stdout.write(`OPERATIONAL_UNTRACKED_QUARANTINE: PASS; ${fields}\n`)
  process.stdout.write("UNTRACKED_QUARANTINE_RESULT=PASS\n")
} catch (error) {
  const reason = String(error?.message ?? error).replace(/[\r\n]+/g, " ").slice(0, 1000)
  process.stderr.write(`OPERATIONAL_UNTRACKED_QUARANTINE: BLOCKED; reason=${reason}\n`)
  process.stderr.write("UNTRACKED_QUARANTINE_RESULT=BLOCKED\n")
  process.exit(error instanceof QuarantineBlockedError ? 2 : 2)
}
