#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

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
  return { "*": wildcard, ...additions, ...specific }
}

const input = option("--input")
const output = option("--output")
if (!input || !output || process.argv.includes("--help")) {
  process.stderr.write("usage: migrate-v511-config.mjs --input PATH --output PATH\n")
  process.exitCode = 2
} else {
  const config = JSON.parse(await readFile(resolve(input), "utf8"))
  const explore = config.agent?.explore
  const verify = config.agent?.verify
  const fresh = config.agent?.["fresh-review"]
  if (!explore || !verify || !fresh) throw new Error("explore, verify, and fresh-review agents are required")

  explore.permission.external_directory = { "*": "deny", "/tmp/opencode/review/**": "allow" }
  fresh.permission.external_directory = { "*": "deny", "/tmp/opencode/review/**": "allow" }
  explore.permission.bash = orderedRules(explore.permission.bash, {
    "git rev-parse *": "allow",
    "rtk git rev-parse *": "allow",
    "git log *": "allow",
    "rtk git log *": "allow",
    "git diff *": "allow",
    "rtk git diff *": "allow",
    "git merge-base *": "allow",
    "rtk git merge-base *": "allow",
    "git branch --show-current": "allow",
    "rtk git branch --show-current": "allow",
  })
  verify.permission.bash = orderedRules(verify.permission.bash, {
    "git ls-files *": "allow",
    "rtk git ls-files *": "allow",
  })

  explore.prompt = appendOnce(explore.prompt, "Read-only Git identity and history commands such as git rev-parse are available. For a parent-staged exact-head review, inspect only /tmp/opencode/review/**; set the tool workdir to that worktree and never use git -C.")
  fresh.prompt = appendOnce(fresh.prompt, "A parent-staged exact-head review worktree is readable only under /tmp/opencode/review/**; set the tool workdir to it and never use git -C.")
  verify.prompt = appendOnce(verify.prompt, "Remote-ref refresh such as git fetch is primary-owned and must finish before delegation. Set the tool workdir instead of using git -C. Derive tracked path sets with one git ls-files call or a staged manifest; never spend the child budget on per-path ls/glob probes.")
  config.agent.build.prompt = appendOnce(config.agent.build.prompt, "Task preflight validates explicit commands and external paths against the selected child's capability contract. Complete primary-owned prerequisites such as git fetch first; use child-supported workdir, pinned-executable, manifest, and wrapper forms rather than delegating a known permission failure.")

  await writeFile(resolve(output), `${JSON.stringify(config, null, 2)}\n`, "utf8")
}
