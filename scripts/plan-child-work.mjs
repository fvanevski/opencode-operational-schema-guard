#!/usr/bin/env node
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { planChildWork } from "../lib/hybrid-workflow.mjs"

function usage() {
  return "usage: plan-child-work.mjs --spec <absolute-json-path>"
}

const args = process.argv.slice(2)
if (args.length !== 2 || args[0] !== "--spec" || !args[1]?.startsWith("/") || !args[1].endsWith(".json")) {
  process.stderr.write(`CHILD_WORK_PLAN_RESULT=BLOCKED\n${usage()}\n`)
  process.exit(2)
}

try {
  const specPath = resolve(args[1])
  const input = JSON.parse(await readFile(specPath, "utf8"))
  const result = planChildWork(input)
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write(`CHILD_WORK_PLAN_RESULT=${result.status}\n`)
  process.exit(result.status === "UNREPRESENTABLE" ? 2 : 0)
} catch (error) {
  process.stderr.write(`CHILD_WORK_PLAN_RESULT=BLOCKED\n${error.message}\n`)
  process.exit(2)
}
