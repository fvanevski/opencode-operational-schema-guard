#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises"
import { BUILD_AGENT_PROMPT, EVIDENCE_ASSESSMENT_RULE, EXPLORE_AGENT_PROMPT, REMEDIATION_AUDIT_RULE, VERIFY_AGENT_PROMPT } from "../lib/policy-spec.mjs"

const args = process.argv.slice(2)
if (args.length !== 4 || args[0] !== "--input" || args[2] !== "--output") throw new Error("usage: migrate-v521-config.mjs --input <json> --output <json>")
const config = JSON.parse(await readFile(args[1], "utf8"))
const compatibilityPlugin = "file:///home/filip/.config/opencode/plugins/system-message-compat-v1/index.mjs"

const pluginRoot = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts"
const localAssessmentRule = `${pluginRoot}/local-agent-assessment.mjs --spec /tmp/opencode/verify/assessments/*.json`
const obsoleteAssessment = /local-agent-assessment\.mjs\s+--sha\s+\*\s+--assessment-id\s+\*/
const obsoleteFirecrawl = /(?:^|\s)\/home\/filip\/\.config\/opencode\/plugins\/operational-schema-v5\/scripts\/firecrawl-readonly\.mjs\b/
const obsoleteResearchVenv = /(?:^|\s)(?:PYTHONDONTWRITEBYTECODE=1\s+)?\.venv-research-store\/bin\/(?:ruff|pyrefly|pytest|mypy)\b/
const repositoryToolRules = [
  ".venv*/bin/ruff check *",
  "PYTHONDONTWRITEBYTECODE=1 .venv*/bin/ruff check *",
  ".venv*/bin/ruff format --check *",
  ".venv*/bin/pyrefly check *",
  ".venv*/bin/pytest *",
  "PYTHONDONTWRITEBYTECODE=1 .venv*/bin/pytest *",
  ".venv*/bin/mypy *",
]
const repositoryFixDenies = [
  ".venv*/bin/ruff check *--fix*",
  "PYTHONDONTWRITEBYTECODE=1 .venv*/bin/ruff check *--fix*",
]

function deleteMatchingRules(rules, predicate) {
  for (const rule of Object.keys(rules ?? {})) {
    if (predicate(rule)) delete rules[rule]
  }
}

config.agent.build.prompt = BUILD_AGENT_PROMPT
config.agent.verify.prompt = VERIFY_AGENT_PROMPT
config.agent.explore.prompt = EXPLORE_AGENT_PROMPT
config.plugin = [...(config.plugin ?? []).filter((entry) => entry !== compatibilityPlugin), compatibilityPlugin]

for (const name of ["verify", "explore"]) {
  const agent = config.agent[name]
  agent.permission ||= {}
  agent.permission.bash ||= { "*": "deny" }
  for (const rule of [EVIDENCE_ASSESSMENT_RULE, REMEDIATION_AUDIT_RULE]) {
    delete agent.permission.bash[rule]
    delete agent.permission.bash[`rtk ${rule}`]
    agent.permission.bash[rule] = "allow"
    agent.permission.bash[`rtk ${rule}`] = "allow"
  }
}

const verify = config.agent.verify
verify.permission.external_directory ||= { "*": "deny" }
verify.permission.external_directory["/tmp/opencode/verify/**"] = "allow"
verify.permission.external_directory["/home/filip/.local/share/opencode/tool-output/**"] = "allow"
deleteMatchingRules(verify.permission.bash, (rule) => obsoleteAssessment.test(rule) || obsoleteResearchVenv.test(rule))
delete verify.permission.bash[localAssessmentRule]
delete verify.permission.bash[`rtk ${localAssessmentRule}`]
verify.permission.bash[localAssessmentRule] = "allow"
verify.permission.bash[`rtk ${localAssessmentRule}`] = "allow"
for (const rule of [...repositoryToolRules, ...repositoryFixDenies]) delete verify.permission.bash[rule]
for (const rule of repositoryToolRules) verify.permission.bash[rule] = "allow"
for (const rule of repositoryFixDenies) verify.permission.bash[rule] = "deny"

const explore = config.agent.explore
explore.permission.external_directory ||= { "*": "deny" }
explore.permission.external_directory["/tmp/opencode/verify/**"] = "allow"
explore.permission.external_directory["/home/filip/.local/share/opencode/tool-output/**"] = "allow"
deleteMatchingRules(explore.permission.bash, (rule) => obsoleteFirecrawl.test(rule))

await writeFile(args[3], `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" })
