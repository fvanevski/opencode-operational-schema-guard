import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"
import { installConfigAtomically, parseAndValidateConfig } from "../lib/config-contract.mjs"
import { BUILD_AGENT_PROMPT, EVIDENCE_ASSESSMENT_RULE, EXPLORE_AGENT_PROMPT, README_POLICY_BLOCK, REMEDIATION_AUDIT_RULE, VERIFY_AGENT_PROMPT } from "../lib/policy-spec.mjs"

function validConfig(context = 204800) {
  const models = Object.fromEntries(["chat", "chat-fast", "chat-review", "chat-audit"].map((name) => [name, { limit: { context, input: 180000, output: 8192 } }]))
  return {
    compaction: { auto: true, prune: true, reserved: 20000 },
    plugin: [
      "file:///home/filip/.config/opencode/plugins/operational-schema-v5/index.mjs",
      "file:///home/filip/.config/opencode/plugins/system-message-compat-v1/index.mjs",
    ],
    provider: { local: { models } },
    agent: {
      build: { prompt: BUILD_AGENT_PROMPT, permission: { edit: { "*": "allow", "/home/filip/.config/opencode/opencode.json": "deny" } } },
      explore: {
        prompt: EXPLORE_AGENT_PROMPT,
        permission: {
          external_directory: { "*": "deny", "/tmp/opencode/review/worktrees/**": "allow", "/tmp/opencode/verify/**": "allow", "/home/filip/.local/share/opencode/tool-output/**": "allow" },
          bash: {
            "*": "deny",
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
            [EVIDENCE_ASSESSMENT_RULE]: "allow",
            [`rtk ${EVIDENCE_ASSESSMENT_RULE}`]: "allow",
            [REMEDIATION_AUDIT_RULE]: "allow",
            [`rtk ${REMEDIATION_AUDIT_RULE}`]: "allow",
          },
        },
      },
      verify: {
        prompt: VERIFY_AGENT_PROMPT,
        permission: {
          external_directory: {
            "*": "deny",
            "/tmp/opencode/verify/**": "allow",
            "/home/filip/.local/share/opencode/tool-output/**": "allow",
          },
          bash: {
            "*": "deny",
            "git ls-files *": "allow",
            "rtk git ls-files *": "allow",
            "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-disposable.mjs *": "allow",
            "rtk /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-disposable.mjs *": "allow",
            "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-manifest.mjs --manifest /tmp/opencode/verify/manifests/*.json": "allow",
            "rtk /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-manifest.mjs --manifest /tmp/opencode/verify/manifests/*.json": "allow",
            "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --spec /tmp/opencode/verify/assessments/*.json": "allow",
            "rtk /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --spec /tmp/opencode/verify/assessments/*.json": "allow",
            [EVIDENCE_ASSESSMENT_RULE]: "allow",
            [`rtk ${EVIDENCE_ASSESSMENT_RULE}`]: "allow",
            [REMEDIATION_AUDIT_RULE]: "allow",
            [`rtk ${REMEDIATION_AUDIT_RULE}`]: "allow",
            ".venv*/bin/ruff check *": "allow",
            "PYTHONDONTWRITEBYTECODE=1 .venv*/bin/ruff check *": "allow",
            ".venv*/bin/ruff check *--fix*": "deny",
            "PYTHONDONTWRITEBYTECODE=1 .venv*/bin/ruff check *--fix*": "deny",
            ".venv*/bin/ruff format --check *": "allow",
            ".venv*/bin/pyrefly check *": "allow",
            ".venv*/bin/pytest *": "allow",
            "PYTHONDONTWRITEBYTECODE=1 .venv*/bin/pytest *": "allow",
            ".venv*/bin/mypy *": "allow",
          },
        },
      },
      "fresh-review": {
        prompt: "Review the bounded diff. End with OPERATIONAL_REVIEW: CLEAN|FINDINGS|BLOCKED; TARGETS_REVIEWED: <n>; TARGETS_REQUIRED: <n>.",
        permission: {
          external_directory: { "*": "deny", "/tmp/opencode/review/worktrees/**": "allow" },
          bash: { "*": "deny" },
        },
      },
    },
  }
}

test("the live-config contract accepts the intended permission and model invariants", () => {
  assert.doesNotThrow(() => parseAndValidateConfig(JSON.stringify(validConfig())))
})

test("later providers do not shadow the reviewed primary model aliases", () => {
  const config = validConfig()
  config.provider.secondary = {
    models: {
      chat: { limit: { context: 262144, input: 240000, output: 16384 } },
    },
  }
  assert.doesNotThrow(() => parseAndValidateConfig(JSON.stringify(config)))
})

test("the compatibility coalescer plugin must be the final configured plugin", () => {
  const unsafe = validConfig()
  unsafe.plugin.push("file:///later/system-augmenter.mjs")
  assert.throws(() => parseAndValidateConfig(JSON.stringify(unsafe)), /must place .*system-message-compat-v1.* after every prompt-augmenting plugin/)
})

test("the live-config contract rejects the v5.8-v5.9 preloaded recovery prompt", () => {
  const unsafe = validConfig()
  unsafe.agent.build.prompt += " After reasoning-only length exhaustion, execute one already-established action. A target mismatch permits git switch --detach SHA followed by a separate bare git rev-parse HEAD."
  assert.throws(() => parseAndValidateConfig(JSON.stringify(unsafe)), /Build prompt must exactly match/)
})

test("the live-config contract rejects syntax, undersized contexts, and unsafe Verify path ordering", () => {
  assert.throws(() => parseAndValidateConfig('{"plugin":'), /not strict JSON/)
  assert.throws(() => parseAndValidateConfig(JSON.stringify(validConfig(131072))), /context limit must be at least 196608/)
  const legacyCompaction = validConfig()
  legacyCompaction.compaction.tail_turns = 1
  assert.throws(() => parseAndValidateConfig(JSON.stringify(legacyCompaction)), /legacy undocumented compaction keys/)
  const lateCompaction = validConfig()
  lateCompaction.provider.local.models.chat.limit.input = 190000
  assert.throws(() => parseAndValidateConfig(JSON.stringify(lateCompaction)), /input limit.*no greater than 180000/)
  const unsafe = validConfig()
  unsafe.agent.verify.permission.external_directory = {
    "/tmp/opencode/verify/**": "allow",
    "*": "deny",
    "/home/filip/.local/share/opencode/tool-output/**": "allow",
  }
  assert.throws(() => parseAndValidateConfig(JSON.stringify(unsafe)), /temp allow must follow the wildcard deny/)
})

test("the live-config core does not require a project-specific Explore gateway", () => {
  const config = validConfig()
  assert.doesNotThrow(() => parseAndValidateConfig(JSON.stringify(config)))
  config.agent.explore.permission.bash["/workspace/project/scripts/project-corpus-readonly *"] = "allow"
  assert.doesNotThrow(() => parseAndValidateConfig(JSON.stringify(config)))
})

test("the live-config contract requires generic repository-local Verify tools and fail-closed autofix ordering", () => {
  const missing = validConfig()
  delete missing.agent.verify.permission.bash[".venv*/bin/pytest *"]
  assert.throws(() => parseAndValidateConfig(JSON.stringify(missing)), /repository-local validation command.*pytest/)

  const unsafe = validConfig()
  unsafe.agent.verify.permission.bash = {
    ".venv*/bin/ruff check *--fix*": "deny",
    ...unsafe.agent.verify.permission.bash,
  }
  assert.throws(() => parseAndValidateConfig(JSON.stringify(unsafe)), /autofix deny must follow/)
})

test("the live-config contract requires the typed local assessment gateway", () => {
  const missing = validConfig()
  delete missing.agent.verify.permission.bash["/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --spec /tmp/opencode/verify/assessments/*.json"]
  assert.throws(() => parseAndValidateConfig(JSON.stringify(missing)), /typed local assessment gateway/)

  const bypass = validConfig()
  bypass.agent.verify.permission.bash["node /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs *"] = "allow"
  assert.throws(() => parseAndValidateConfig(JSON.stringify(bypass)), /node-mediated local assessment/)
})

test("last-match ordering is enforced for every new Verify and Explore evidence allow", () => {
  for (const rule of [
    EVIDENCE_ASSESSMENT_RULE,
    `rtk ${EVIDENCE_ASSESSMENT_RULE}`,
    REMEDIATION_AUDIT_RULE,
    `rtk ${REMEDIATION_AUDIT_RULE}`,
    "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-disposable.mjs *",
    "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-manifest.mjs --manifest /tmp/opencode/verify/manifests/*.json",
    "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --spec /tmp/opencode/verify/assessments/*.json",
  ]) {
    const unsafe = validConfig()
    unsafe.agent.verify.permission.bash = { [rule]: "allow", ...unsafe.agent.verify.permission.bash }
    assert.throws(() => parseAndValidateConfig(JSON.stringify(unsafe)), /must follow the wildcard deny/)
  }
  const exploreBash = validConfig()
  exploreBash.agent.explore.permission.bash = { [EVIDENCE_ASSESSMENT_RULE]: "allow", ...exploreBash.agent.explore.permission.bash }
  assert.throws(() => parseAndValidateConfig(JSON.stringify(exploreBash)), /trace assessment allows must follow/)
  const exploreExternal = validConfig()
  exploreExternal.agent.explore.permission.external_directory = { "/tmp/opencode/verify/**": "allow", ...exploreExternal.agent.explore.permission.external_directory }
  assert.throws(() => parseAndValidateConfig(JSON.stringify(exploreExternal)), /evidence-root allows must follow/)
})

test("README generated policy block is exactly sourced from policy-spec", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8")
  assert.ok(readme.includes(README_POLICY_BLOCK))
})

test("an invalid candidate cannot alter the target or create a backup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencode-config-contract-"))
  const target = join(directory, "opencode.json")
  const candidate = join(directory, "candidate.json")
  const backup = join(directory, "backup.json")
  await writeFile(target, "original\n")
  await writeFile(candidate, "{invalid")
  await assert.rejects(() => installConfigAtomically({ candidatePath: candidate, targetPath: target, backupPath: backup }), /not strict JSON/)
  assert.equal(await readFile(target, "utf8"), "original\n")
  await assert.rejects(() => readFile(backup, "utf8"), /ENOENT/)
})

test("a valid candidate is backed up and atomically replaces the target", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencode-config-contract-"))
  const target = join(directory, "opencode.json")
  const candidate = join(directory, "candidate.json")
  const backup = join(directory, "backup.json")
  const replacement = `${JSON.stringify(validConfig(), null, 2)}\n`
  await writeFile(target, "old config\n")
  await writeFile(candidate, replacement)
  await installConfigAtomically({ candidatePath: candidate, targetPath: target, backupPath: backup })
  assert.equal(await readFile(backup, "utf8"), "old config\n")
  assert.equal(await readFile(target, "utf8"), replacement)
})

test("the v5.19 migration is idempotent and produces a contract-valid candidate", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencode-v519-migration-"))
  const input = join(directory, "input.json")
  const first = join(directory, "first.json")
  const second = join(directory, "second.json")
  await writeFile(input, `${JSON.stringify(validConfig(), null, 2)}\n`)
  let result = spawnSync(process.execPath, [new URL("../scripts/migrate-v519-config.mjs", import.meta.url).pathname, "--input", input, "--output", first], { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  result = spawnSync(process.execPath, [new URL("../scripts/migrate-v519-config.mjs", import.meta.url).pathname, "--input", first, "--output", second], { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  const firstText = await readFile(first, "utf8")
  assert.equal(firstText, await readFile(second, "utf8"))
  assert.doesNotThrow(() => parseAndValidateConfig(firstText))
})

test("the v5.20 migration is idempotent and produces a contract-valid candidate", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencode-v520-migration-"))
  const input = join(directory, "input.json")
  const first = join(directory, "first.json")
  const second = join(directory, "second.json")
  await writeFile(input, `${JSON.stringify(validConfig(), null, 2)}\n`)
  let result = spawnSync(process.execPath, [new URL("../scripts/migrate-v520-config.mjs", import.meta.url).pathname, "--input", input, "--output", first], { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  result = spawnSync(process.execPath, [new URL("../scripts/migrate-v520-config.mjs", import.meta.url).pathname, "--input", first, "--output", second], { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  const firstText = await readFile(first, "utf8")
  assert.equal(firstText, await readFile(second, "utf8"))
  assert.doesNotThrow(() => parseAndValidateConfig(firstText))
})


test("the v5.21 migration removes project-specific assessment permissions and is idempotent", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opencode-v521-migration-"))
  const input = join(directory, "input.json")
  const first = join(directory, "first.json")
  const second = join(directory, "second.json")
  const legacy = validConfig()
  const verifyBash = legacy.agent.verify.permission.bash
  delete verifyBash["/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --spec /tmp/opencode/verify/assessments/*.json"]
  delete verifyBash["rtk /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --spec /tmp/opencode/verify/assessments/*.json"]
  verifyBash["/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --sha * --assessment-id *"] = "allow"
  verifyBash["rtk /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --sha * --assessment-id *"] = "allow"
  for (const rule of Object.keys(verifyBash)) {
    if (rule.includes(".venv*/bin/")) {
      const value = verifyBash[rule]
      delete verifyBash[rule]
      verifyBash[rule.replace(".venv*", ".venv-research-store")] = value
    }
  }
  legacy.agent.explore.permission.bash["/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/firecrawl-readonly.mjs *"] = "allow"
  legacy.agent.explore.permission.bash["rtk /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/firecrawl-readonly.mjs *"] = "allow"
  await writeFile(input, `${JSON.stringify(legacy, null, 2)}\n`)
  let result = spawnSync(process.execPath, [new URL("../scripts/migrate-v521-config.mjs", import.meta.url).pathname, "--input", input, "--output", first], { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  result = spawnSync(process.execPath, [new URL("../scripts/migrate-v521-config.mjs", import.meta.url).pathname, "--input", first, "--output", second], { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  const firstText = await readFile(first, "utf8")
  assert.equal(firstText, await readFile(second, "utf8"))
  assert.doesNotThrow(() => parseAndValidateConfig(firstText))
  assert.doesNotMatch(firstText, /firecrawl-readonly|local-agent-assessment\.mjs --sha|\.venv-research-store/)
  assert.match(firstText, /local-agent-assessment\.mjs --spec \/tmp\/opencode\/verify\/assessments\/\*\.json/)
})
