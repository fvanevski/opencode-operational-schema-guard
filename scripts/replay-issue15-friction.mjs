#!/usr/bin/env node
import { replayFrictionScenario } from "../lib/hybrid-workflow.mjs"

function usage() {
  return "usage: replay-issue15-friction.mjs --mode central-owned|local-fresh-review"
}

const args = process.argv.slice(2)
if (args.length !== 2 || args[0] !== "--mode" || !new Set(["central-owned", "local-fresh-review"]).has(args[1])) {
  process.stderr.write(`ISSUE15_FRICTION_REPLAY_RESULT=BLOCKED\n${usage()}\n`)
  process.exit(2)
}

try {
  const report = replayFrictionScenario(args[1])
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.stdout.write("ISSUE15_FRICTION_REPLAY_RESULT=PASS\n")
} catch (error) {
  process.stderr.write(`ISSUE15_FRICTION_REPLAY_RESULT=BLOCKED\n${error.message}\n`)
  process.exit(2)
}
