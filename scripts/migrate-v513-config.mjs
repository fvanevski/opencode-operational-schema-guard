#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const RUNNER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --sha * --assessment-id *"

function option(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function appendOnce(value, addition) {
  const text = String(value ?? "").trim()
  return text.includes(addition) ? text : `${text} ${addition}`
}

function orderedRules(current, additions) {
  const rules = current && typeof current === "object" && !Array.isArray(current) ? current : {}
  const { "*": wildcard = "deny", ...specific } = rules
  return { "*": wildcard, ...specific, ...additions }
}

const input = option("--input")
const output = option("--output")
if (!input || !output || process.argv.includes("--help")) {
  process.stderr.write("usage: migrate-v513-config.mjs --input PATH --output PATH\n")
  process.exitCode = 2
} else {
  const config = JSON.parse(await readFile(resolve(input), "utf8"))
  const verify = config.agent?.verify
  if (!verify) throw new Error("verify agent is required")
  verify.permission.bash = orderedRules(verify.permission.bash, {
    [RUNNER]: "allow",
    [`rtk ${RUNNER}`]: "allow",
  })
  verify.prompt = appendOnce(
    verify.prompt,
    "Use local-agent-assessment.mjs as the single bounded command for deterministic host evidence.",
  )
  await writeFile(resolve(output), `${JSON.stringify(config, null, 2)}\n`, "utf8")
}
