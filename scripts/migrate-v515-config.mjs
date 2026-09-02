#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

function option(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const input = option("--input")
const output = option("--output")
if (!input || !output || process.argv.includes("--help")) {
  process.stderr.write("usage: migrate-v515-config.mjs --input PATH --output PATH\n")
  process.exitCode = 2
} else {
  const config = JSON.parse(await readFile(resolve(input), "utf8"))
  const build = config.agent?.build
  if (build) {
    build.prompt = build.prompt.replace(
      "At the start of non-trivial work, partition bounded operation packets before broad reading.",
      "At the start of non-trivial work, formulate a Turn-1 Execution Graph and partition bounded operation packets before broad reading. Proactively delegate: deploy a fresh Explore child on Turn 1 for unknown call paths, stage a typed manifest under /tmp/opencode/verify/manifests upfront for multi-gate verification, and retain direct work for known 1-2 file edits."
    )
  }
  await writeFile(resolve(output), `${JSON.stringify(config, null, 2)}\n`, "utf8")
}
