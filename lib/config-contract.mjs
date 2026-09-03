import { COPYFILE_EXCL } from "node:constants"
import { randomUUID } from "node:crypto"
import { copyFile, open, readFile, rename, stat, unlink } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import { derivePrimaryContextPolicy } from "./context-policy.mjs"
import { BUILD_AGENT_PROMPT, EVIDENCE_ASSESSMENT_RULE, EXPLORE_AGENT_PROMPT, REMEDIATION_AUDIT_RULE, VERIFY_AGENT_PROMPT } from "./policy-spec.mjs"

const LIVE_PLUGIN = "file:///home/filip/.config/opencode/plugins/operational-schema-v5/index.mjs"
const SYSTEM_COMPAT_PLUGIN = "file:///home/filip/.config/opencode/plugins/system-message-compat-v1/index.mjs"
const VERIFY_TEMP = "/tmp/opencode/verify/**"
const REVIEW_TEMP = "/tmp/opencode/review/worktrees/**"
const TOOL_OUTPUT = "/home/filip/.local/share/opencode/tool-output/**"
const VERIFY_WRAPPER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-disposable.mjs *"
const VERIFY_MANIFEST_RUNNER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-manifest.mjs --manifest /tmp/opencode/verify/manifests/*.json"
const LOCAL_ASSESSMENT_RUNNER = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --spec /tmp/opencode/verify/assessments/*.json"
const TRACE_ASSESSMENT = EVIDENCE_ASSESSMENT_RULE
const TRACE_REMEDIATION_AUDIT = REMEDIATION_AUDIT_RULE
const VERIFY_REPOSITORY_TOOL_RULES = [
  ".venv*/bin/ruff check *",
  "PYTHONDONTWRITEBYTECODE=1 .venv*/bin/ruff check *",
  ".venv*/bin/ruff format --check *",
  ".venv*/bin/pyrefly check *",
  ".venv*/bin/pytest *",
  "PYTHONDONTWRITEBYTECODE=1 .venv*/bin/pytest *",
  ".venv*/bin/mypy *",
]
const VERIFY_REPOSITORY_FIX_DENIES = [
  ".venv*/bin/ruff check *--fix*",
  "PYTHONDONTWRITEBYTECODE=1 .venv*/bin/ruff check *--fix*",
]
const VERIFY_READ_ONLY_GIT_RULES = ["git ls-files *", "rtk git ls-files *"]
const EXPLORE_READ_ONLY_GIT_RULES = [
  "git rev-parse *", "rtk git rev-parse *",
  "git log *", "rtk git log *",
  "git diff *", "rtk git diff *",
  "git merge-base *", "rtk git merge-base *",
  "git branch --show-current", "rtk git branch --show-current",
]
const REQUIRED_MODELS = ["chat", "chat-fast", "chat-review", "chat-audit"]

function contractError(message) {
  return new Error(`OpenCode live-config contract failed: ${message}`)
}

function assertRule(condition, message) {
  if (!condition) throw contractError(message)
}

function configuredModels(config) {
  const models = new Map()
  for (const provider of Object.values(config.provider ?? {})) {
    for (const [name, model] of Object.entries(provider?.models ?? {})) {
      if (!models.has(name)) models.set(name, model)
    }
  }
  return models
}

export function parseAndValidateConfig(text) {
  let config
  try {
    config = JSON.parse(String(text))
  } catch (error) {
    throw contractError(`candidate is not strict JSON (${error.message}).`)
  }
  assertRule(config && typeof config === "object" && !Array.isArray(config), "root must be an object.")
  assertRule(Array.isArray(config.plugin) && config.plugin.includes(LIVE_PLUGIN), `plugin list must include ${LIVE_PLUGIN}.`)
  assertRule(config.plugin.includes(SYSTEM_COMPAT_PLUGIN), `plugin list must include ${SYSTEM_COMPAT_PLUGIN}.`)
  assertRule(config.plugin.at(-1) === SYSTEM_COMPAT_PLUGIN, `configured plugin list must place ${SYSTEM_COMPAT_PLUGIN} after every prompt-augmenting plugin.`)
  assertRule(config.plugin.indexOf(LIVE_PLUGIN) < config.plugin.indexOf(SYSTEM_COMPAT_PLUGIN), "system-message compatibility must run after the operational schema.")

  const build = config.agent?.build
  const verify = config.agent?.verify
  const explore = config.agent?.explore
  assertRule(build && verify && explore, "Build, Verify, and Explore agent definitions are required.")
  assertRule(build.permission?.edit?.["*"] === "allow", "Build edit rules must retain the default allow rule.")
  assertRule(build.permission?.edit?.["/home/filip/.config/opencode/opencode.json"] === "deny", "Build must deny direct edits to the live opencode.json.")
  assertRule(String(build.prompt ?? "") === BUILD_AGENT_PROMPT, "Build prompt must exactly match the generated operational-schema prompt.")

  const compaction = config.compaction
  assertRule(compaction?.auto === true, "automatic compaction must be enabled.")
  assertRule(compaction?.prune === true, "compaction pruning must be enabled.")
  assertRule(Number.isInteger(compaction?.reserved) && compaction.reserved >= 16000, "compaction reserved headroom must be at least 16000 tokens.")
  assertRule(!("tail_turns" in compaction) && !("preserve_recent_tokens" in compaction), "legacy undocumented compaction keys are forbidden.")

  const external = verify.permission?.external_directory
  assertRule(external && typeof external === "object" && !Array.isArray(external), "Verify external_directory must be an ordered rule object.")
  const externalKeys = Object.keys(external)
  assertRule(external["*"] === "deny", "Verify external_directory wildcard must deny.")
  assertRule(external[VERIFY_TEMP] === "allow", `Verify must allow ${VERIFY_TEMP}.`)
  assertRule(external[TOOL_OUTPUT] === "allow", `Verify must allow ${TOOL_OUTPUT}.`)
  assertRule(externalKeys.indexOf("*") < externalKeys.indexOf(VERIFY_TEMP), "Verify temp allow must follow the wildcard deny so last-match permission ordering works.")
  assertRule(externalKeys.indexOf("*") < externalKeys.indexOf(TOOL_OUTPUT), "tool-output allow must follow the wildcard deny so last-match permission ordering works.")

  const verifyBash = verify.permission?.bash
  assertRule(verifyBash?.["*"] === "deny", "Verify bash wildcard must deny.")
  assertRule(verifyBash?.[VERIFY_WRAPPER] === "allow", "Verify must directly allow the live disposable-service wrapper.")
  assertRule(verifyBash?.[`rtk ${VERIFY_WRAPPER}`] === "allow", "Verify must allow the RTK-prefixed disposable-service wrapper.")
  assertRule(verifyBash?.[VERIFY_MANIFEST_RUNNER] === "allow", "Verify must directly allow the typed manifest runner.")
  assertRule(verifyBash?.[`rtk ${VERIFY_MANIFEST_RUNNER}`] === "allow", "Verify must allow the RTK-prefixed typed manifest runner.")
  assertRule(verifyBash?.[LOCAL_ASSESSMENT_RUNNER] === "allow", "Verify must directly allow the typed local assessment gateway.")
  assertRule(verifyBash?.[`rtk ${LOCAL_ASSESSMENT_RUNNER}`] === "allow", "Verify must allow the RTK-prefixed typed local assessment gateway.")
  assertRule(verifyBash?.[TRACE_ASSESSMENT] === "allow" && verifyBash?.[`rtk ${TRACE_ASSESSMENT}`] === "allow", "Verify must allow the exact read-only session trace assessment route.")
  assertRule(verifyBash?.[TRACE_REMEDIATION_AUDIT] === "allow" && verifyBash?.[`rtk ${TRACE_REMEDIATION_AUDIT}`] === "allow", "Verify must allow the exact read-only remediation-audit route.")
  assertRule(!Object.keys(verifyBash ?? {}).some((rule) => /node .*verify-disposable/i.test(rule) && verifyBash[rule] === "allow"), "Verify must not allow node-mediated wrapper invocation.")
  assertRule(!Object.keys(verifyBash ?? {}).some((rule) => /node .*local-agent-assessment/i.test(rule) && verifyBash[rule] === "allow"), "Verify must not allow node-mediated local assessment invocation.")
  for (const rule of VERIFY_REPOSITORY_TOOL_RULES) {
    assertRule(verifyBash?.[rule] === "allow", `Verify must allow repository-local validation command ${rule}.`)
  }
  for (const rule of VERIFY_READ_ONLY_GIT_RULES) {
    assertRule(verifyBash?.[rule] === "allow", `Verify must allow safe path derivation command ${rule}.`)
  }
  for (const rule of VERIFY_REPOSITORY_FIX_DENIES) {
    assertRule(verifyBash?.[rule] === "deny", `Verify must explicitly deny repository-local Ruff autofix ${rule}.`)
  }
  const verifyBashKeys = Object.keys(verifyBash ?? {})
  for (const rule of [VERIFY_WRAPPER, `rtk ${VERIFY_WRAPPER}`, VERIFY_MANIFEST_RUNNER, `rtk ${VERIFY_MANIFEST_RUNNER}`, LOCAL_ASSESSMENT_RUNNER, `rtk ${LOCAL_ASSESSMENT_RUNNER}`, TRACE_ASSESSMENT, `rtk ${TRACE_ASSESSMENT}`, TRACE_REMEDIATION_AUDIT, `rtk ${TRACE_REMEDIATION_AUDIT}`]) {
    assertRule(verifyBashKeys.indexOf("*") < verifyBashKeys.indexOf(rule), `Verify allow ${rule} must follow the wildcard deny.`)
  }
  for (const rule of VERIFY_REPOSITORY_TOOL_RULES) {
    assertRule(verifyBashKeys.indexOf("*") < verifyBashKeys.indexOf(rule), `Verify repository-local allow ${rule} must follow the wildcard deny.`)
  }
  for (const rule of VERIFY_READ_ONLY_GIT_RULES) {
    assertRule(verifyBashKeys.indexOf("*") < verifyBashKeys.indexOf(rule), `Verify safe Git allow ${rule} must follow the wildcard deny.`)
  }
  assertRule(verifyBashKeys.indexOf(".venv*/bin/ruff check *") < verifyBashKeys.indexOf(".venv*/bin/ruff check *--fix*"), "Verify Ruff autofix deny must follow the repository-local Ruff allow so last-match ordering remains fail-closed.")
  assertRule(verifyBashKeys.indexOf("PYTHONDONTWRITEBYTECODE=1 .venv*/bin/ruff check *") < verifyBashKeys.indexOf("PYTHONDONTWRITEBYTECODE=1 .venv*/bin/ruff check *--fix*"), "Verify env-prefixed Ruff autofix deny must follow its allow.")
  assertRule(String(verify.prompt ?? "") === VERIFY_AGENT_PROMPT, "Verify prompt must exactly match the generated operational-schema prompt.")

  const exploreBash = explore.permission?.bash
  const exploreBashKeys = Object.keys(exploreBash ?? {})
  assertRule(exploreBash?.["*"] === "deny", "Explore bash wildcard must deny.")
  assertRule(exploreBash?.[TRACE_ASSESSMENT] === "allow" && exploreBash?.[`rtk ${TRACE_ASSESSMENT}`] === "allow", "Explore must allow the exact read-only session trace assessment route.")
  assertRule(exploreBash?.[TRACE_REMEDIATION_AUDIT] === "allow" && exploreBash?.[`rtk ${TRACE_REMEDIATION_AUDIT}`] === "allow", "Explore must allow the exact read-only remediation-audit route.")
  assertRule(exploreBashKeys.indexOf("*") < exploreBashKeys.indexOf(TRACE_ASSESSMENT) && exploreBashKeys.indexOf("*") < exploreBashKeys.indexOf(`rtk ${TRACE_ASSESSMENT}`), "Explore trace assessment allows must follow the wildcard deny.")
  assertRule(exploreBashKeys.indexOf("*") < exploreBashKeys.indexOf(TRACE_REMEDIATION_AUDIT) && exploreBashKeys.indexOf("*") < exploreBashKeys.indexOf(`rtk ${TRACE_REMEDIATION_AUDIT}`), "Explore remediation-audit allows must follow the wildcard deny.")
  for (const rule of EXPLORE_READ_ONLY_GIT_RULES) {
    assertRule(exploreBash?.[rule] === "allow", `Explore must allow read-only authority command ${rule}.`)
    assertRule(exploreBashKeys.indexOf("*") < exploreBashKeys.indexOf(rule), `Explore read-only Git allow ${rule} must follow the wildcard deny.`)
  }
  const exploreExternal = explore.permission?.external_directory
  assertRule(exploreExternal && typeof exploreExternal === "object" && !Array.isArray(exploreExternal), "Explore external_directory must be an ordered rule object.")
  assertRule(exploreExternal["*"] === "deny" && exploreExternal[REVIEW_TEMP] === "allow", `Explore must deny arbitrary external paths and allow ${REVIEW_TEMP}.`)
  assertRule(exploreExternal[VERIFY_TEMP] === "allow" && exploreExternal[TOOL_OUTPUT] === "allow", "Explore must allow bounded Verify materials and OpenCode tool-output evidence.")
  assertRule(Object.keys(exploreExternal).indexOf("*") < Object.keys(exploreExternal).indexOf(REVIEW_TEMP), "Explore review-root allow must follow the wildcard deny.")
  assertRule(Object.keys(exploreExternal).indexOf("*") < Object.keys(exploreExternal).indexOf(VERIFY_TEMP) && Object.keys(exploreExternal).indexOf("*") < Object.keys(exploreExternal).indexOf(TOOL_OUTPUT), "Explore evidence-root allows must follow the wildcard deny.")
  assertRule(String(explore.prompt ?? "") === EXPLORE_AGENT_PROMPT, "Explore prompt must exactly match the generated operational-schema prompt.")

  const freshReview = config.agent?.["fresh-review"]
  assertRule(freshReview, "Fresh-review agent definition is required.")
  const freshExternal = freshReview.permission?.external_directory
  assertRule(freshExternal && typeof freshExternal === "object" && !Array.isArray(freshExternal), "Fresh-review external_directory must be an ordered rule object.")
  assertRule(freshExternal["*"] === "deny", "Fresh-review external_directory wildcard must deny.")
  assertRule(freshExternal[REVIEW_TEMP] === "allow", `Fresh-review must allow ${REVIEW_TEMP}.`)
  assertRule(Object.keys(freshExternal).indexOf("*") < Object.keys(freshExternal).indexOf(REVIEW_TEMP), "Fresh-review review-root allow must follow the wildcard deny.")
  assertRule(/OPERATIONAL_REVIEW:\s*CLEAN\|FINDINGS\|BLOCKED/.test(String(freshReview.prompt ?? "")), "Fresh-review prompt must require the structured review marker.")

  const models = configuredModels(config)
  for (const name of REQUIRED_MODELS) {
    const model = models.get(name)
    assertRule(model, `model alias ${name} is required.`)
    const context = model.limit?.context
    const input = model.limit?.input
    const output = model.limit?.output
    assertRule(Number.isInteger(context) && context > 0, `${name} context limit must be a positive integer.`)
    assertRule(Number.isInteger(input) && input > 0, `${name} input limit must be a positive integer.`)
    assertRule(Number.isInteger(output) && output > 0, `${name} output limit must be a positive integer.`)
    assertRule(input + output <= context, `${name} input limit plus output limit must not exceed its context limit.`)
    assertRule(compaction.reserved < input, `compaction reserve must be smaller than ${name} input limit.`)
  }
  try {
    derivePrimaryContextPolicy(config)
  } catch (error) {
    throw contractError(String(error?.message ?? error).replace(/^Operational context policy:\s*/, ""))
  }
  return config
}

export async function installConfigAtomically({ candidatePath, targetPath, backupPath } = {}) {
  assertRule(candidatePath, "candidatePath is required.")
  assertRule(targetPath, "targetPath is required.")
  const candidate = await readFile(resolve(candidatePath), "utf8")
  parseAndValidateConfig(candidate)

  const target = resolve(targetPath)
  const targetDirectory = dirname(target)
  const currentStat = await stat(target)
  if (backupPath) await copyFile(target, resolve(backupPath), COPYFILE_EXCL)

  const temporary = join(targetDirectory, `.${basename(target)}.${process.pid}.${randomUUID()}.tmp`)
  let handle
  try {
    handle = await open(temporary, "wx", currentStat.mode)
    await handle.writeFile(candidate, "utf8")
    await handle.sync()
    await handle.close()
    handle = undefined
    await rename(temporary, target)
    const directoryHandle = await open(targetDirectory, "r")
    try {
      await directoryHandle.sync()
    } finally {
      await directoryHandle.close()
    }
  } catch (error) {
    if (handle) await handle.close().catch(() => {})
    await unlink(temporary).catch(() => {})
    throw error
  }
  return { target, backup: backupPath ? resolve(backupPath) : undefined }
}
