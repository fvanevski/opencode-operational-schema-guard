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
  process.stderr.write("usage: migrate-v516-config.mjs --input PATH --output PATH\n")
  process.exitCode = 2
} else {
  const config = JSON.parse(await readFile(resolve(input), "utf8"))
  
  // 1. Update reasoningEffort to medium for local thinking models
  for (const provider of Object.values(config.provider ?? {})) {
    for (const [name, model] of Object.entries(provider?.models ?? {})) {
      if (model?.options?.reasoningEffort === "xhigh") {
        model.options.reasoningEffort = "medium"
      }
      if (typeof model?.name === "string" && model.name.includes("(xhigh reasoning, bounded)")) {
        model.name = model.name.replace("(xhigh reasoning, bounded)", "(medium reasoning, bounded)")
      }
    }
  }

  // 2. Update build prompt references to guard warning and hard stops
  const build = config.agent?.build
  if (build && typeof build.prompt === "string") {
    build.prompt = build.prompt
      .replace(
        "The guard warns after 12 accepted primary calls and hard-stops after 18 accepted calls",
        "The guard warns after 24 accepted primary calls and hard-stops after 30 accepted calls"
      )
      .replace(
        "reopen at most three child-covered paths; two additional read calls are allowed only with explicit offset and limit<=200.",
        "reopen at most five child-covered paths; three additional read calls are allowed only with explicit offset and limit<=200."
      )
  }

  await writeFile(resolve(output), `${JSON.stringify(config, null, 2)}\n`, "utf8")
}
