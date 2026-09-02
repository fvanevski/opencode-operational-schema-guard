#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const VERIFY_TEMP = "/tmp/opencode/verify/**"
const REVIEW_TEMP = "/tmp/opencode/review/worktrees/**"

function option(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function orderedRules(current, additions) {
  const rules = current && typeof current === "object" && !Array.isArray(current) ? current : {}
  const { "*": wildcard = "deny", ...specific } = rules
  return { "*": wildcard, ...specific, ...additions }
}

const input = option("--input")
const output = option("--output")
if (!input || !output || process.argv.includes("--help")) {
  process.stderr.write("usage: migrate-v514-config.mjs --input PATH --output PATH\n")
  process.exitCode = 2
} else {
  const config = JSON.parse(await readFile(resolve(input), "utf8"))
  const freshReview = config.agent?.["fresh-review"]
  if (freshReview) {
    freshReview.permission.external_directory = orderedRules(freshReview.permission.external_directory, {
      [REVIEW_TEMP]: "allow",
      [VERIFY_TEMP]: "allow",
    })
  }
  const verify = config.agent?.verify
  if (verify) {
    verify.permission.external_directory = orderedRules(verify.permission.external_directory, {
      [VERIFY_TEMP]: "allow",
      [REVIEW_TEMP]: "allow",
    })
  }
  await writeFile(resolve(output), `${JSON.stringify(config, null, 2)}\n`, "utf8")
}
