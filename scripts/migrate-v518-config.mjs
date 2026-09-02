#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises"
import { BUILD_AGENT_PROMPT, EVIDENCE_ASSESSMENT_RULE, EXPLORE_AGENT_PROMPT, REMEDIATION_AUDIT_RULE, VERIFY_AGENT_PROMPT } from "../lib/policy-spec.mjs"

const args = process.argv.slice(2)
if (args.length !== 4 || args[0] !== "--input" || args[2] !== "--output") throw new Error("usage: migrate-v518-config.mjs --input <json> --output <json>")
const config = JSON.parse(await readFile(args[1], "utf8"))

config.agent.build.prompt = BUILD_AGENT_PROMPT
config.agent.verify.prompt = VERIFY_AGENT_PROMPT
config.agent.explore.prompt = EXPLORE_AGENT_PROMPT
for (const name of ["verify", "explore"]) {
  const agent = config.agent[name]
  agent.permission ||= {}
  agent.permission.bash ||= { "*": "deny" }
  for (const rule of [EVIDENCE_ASSESSMENT_RULE, REMEDIATION_AUDIT_RULE]) {
    agent.permission.bash[rule] = "allow"
    agent.permission.bash[`rtk ${rule}`] = "allow"
  }
}
config.agent.explore.permission.external_directory ||= { "*": "deny" }
config.agent.explore.permission.external_directory["/tmp/opencode/verify/**"] = "allow"
config.agent.explore.permission.external_directory["/home/filip/.local/share/opencode/tool-output/**"] = "allow"
await writeFile(args[3], `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" })
