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
  return { "*": wildcard, ...specific, ...additions }
}

const input = option("--input")
const output = option("--output")
if (!input || !output || process.argv.includes("--help")) {
  process.stderr.write("usage: migrate-v512-config.mjs --input PATH --output PATH\n")
  process.exitCode = 2
} else {
  const config = JSON.parse(await readFile(resolve(input), "utf8"))
  const build = config.agent?.build
  const explore = config.agent?.explore
  const verify = config.agent?.verify
  const fresh = config.agent?.["fresh-review"]
  if (!build || !explore || !verify || !fresh) throw new Error("build, explore, verify, and fresh-review agents are required")

  explore.permission.external_directory = { "*": "deny", "/tmp/opencode/review/worktrees/**": "allow" }
  fresh.permission.external_directory = { "*": "deny", "/tmp/opencode/review/worktrees/**": "allow" }
  verify.permission.bash = orderedRules(verify.permission.bash, {
    "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-manifest.mjs --manifest /tmp/opencode/verify/manifests/*.json": "allow",
    "rtk /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-manifest.mjs --manifest /tmp/opencode/verify/manifests/*.json": "allow",
  })

  build.prompt = appendOnce(build.prompt, "Use explicit Targets bullets; one resolve: bullet represents one unresolved alias. For long Verify plans stage one opencode-verify-manifest-v1 JSON under /tmp/opencode/verify/manifests and invoke verify-manifest.mjs once. CLEAN Fresh-review and PASS Verify may run in either order after the latest content edit; a content-neutral commit does not create an edit generation.")
  explore.prompt = appendOnce(explore.prompt, "End with exactly OPERATIONAL_EXPLORE: COMPLETE|PARTIAL|BLOCKED; TARGETS_INSPECTED: <n>; TARGETS_REQUIRED: <n>. Review worktrees are only under /tmp/opencode/review/worktrees/**.")
  verify.prompt = appendOnce(verify.prompt, "Prose is never parsed as executable Commands. For long plans use Manifest: /tmp/opencode/verify/manifests/<name>.json and run verify-manifest.mjs once; never read, copy, truncate, or reconstruct its commands.")
  fresh.prompt = appendOnce(fresh.prompt, "End with exactly OPERATIONAL_REVIEW: CLEAN|FINDINGS|BLOCKED; TARGETS_REVIEWED: <n>; TARGETS_REQUIRED: <n>. Review worktrees are only under /tmp/opencode/review/worktrees/**.")

  await writeFile(resolve(output), `${JSON.stringify(config, null, 2)}\n`, "utf8")
}
