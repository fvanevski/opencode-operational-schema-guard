import test from "node:test"
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { BUILD_AGENT_PROMPT, EVIDENCE_ASSESSMENT_RULE, EXPLORE_AGENT_PROMPT, REMEDIATION_AUDIT_RULE, VERIFY_AGENT_PROMPT } from "../lib/policy-spec.mjs"

const installer = resolve(dirname(fileURLToPath(import.meta.url)), "../scripts/install-live-plugin.mjs")

function validLiveConfig(context = 204800) {
  const models = Object.fromEntries(["chat", "chat-fast", "chat-review", "chat-audit"].map((name) => [name, { limit: { context, input: 180000, output: 8192 } }]))
  return {
    model: "local/chat",
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
            "git rev-parse *": "allow", "rtk git rev-parse *": "allow",
            "git log *": "allow", "rtk git log *": "allow",
            "git diff *": "allow", "rtk git diff *": "allow",
            "git merge-base *": "allow", "rtk git merge-base *": "allow",
            "git branch --show-current": "allow", "rtk git branch --show-current": "allow",
            [EVIDENCE_ASSESSMENT_RULE]: "allow", [`rtk ${EVIDENCE_ASSESSMENT_RULE}`]: "allow",
            [REMEDIATION_AUDIT_RULE]: "allow", [`rtk ${REMEDIATION_AUDIT_RULE}`]: "allow",
          },
        },
      },
      verify: {
        prompt: VERIFY_AGENT_PROMPT,
        permission: {
          external_directory: { "*": "deny", "/tmp/opencode/verify/**": "allow", "/home/filip/.local/share/opencode/tool-output/**": "allow" },
          bash: {
            "*": "deny",
            "git ls-files *": "allow", "rtk git ls-files *": "allow",
            "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-disposable.mjs *": "allow",
            "rtk /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-disposable.mjs *": "allow",
            "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-manifest.mjs --manifest /tmp/opencode/verify/manifests/*.json": "allow",
            "rtk /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-manifest.mjs --manifest /tmp/opencode/verify/manifests/*.json": "allow",
            "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --spec /tmp/opencode/verify/assessments/*.json": "allow",
            "rtk /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --spec /tmp/opencode/verify/assessments/*.json": "allow",
            [EVIDENCE_ASSESSMENT_RULE]: "allow", [`rtk ${EVIDENCE_ASSESSMENT_RULE}`]: "allow",
            [REMEDIATION_AUDIT_RULE]: "allow", [`rtk ${REMEDIATION_AUDIT_RULE}`]: "allow",
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
        permission: { external_directory: { "*": "deny", "/tmp/opencode/review/worktrees/**": "allow" }, bash: { "*": "deny" } },
      },
    },
  }
}
const CLEAN_GIT_ENV = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
}

function run(file, args, { cwd, env = CLEAN_GIT_ENV, input } = {}) {
  const result = spawnSync(file, args, {
    cwd,
    env,
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  })
  if (result.error) throw result.error
  return result
}

function git(cwd, args, options = {}) {
  return run("git", args, { cwd, ...options })
}

function must(result, label) {
  assert.equal(result.status, 0, `${label}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
  return result.stdout.trim()
}

function blocked(result, code) {
  assert.notEqual(result.status, 0, `expected ${code} to block\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
  assert.match(result.stderr, new RegExp(`BLOCK_REASON=${code}(?:\\n|$)`))
}

async function exists(path) {
  return Boolean(await stat(path).catch(() => null))
}

async function archiveCommit(repo, commit, target) {
  await mkdir(target, { recursive: true })
  const tar = `${target}.tar`
  must(git(repo, ["archive", "--format=tar", `--output=${tar}`, commit]), "git archive")
  must(run("tar", ["-xf", tar, "-C", target]), "tar extract")
  await rm(tar, { force: true })
}

async function writeFixtureSource(repo, { failInstalledValidation = false } = {}) {
  await mkdir(join(repo, "scripts"), { recursive: true })
  await mkdir(join(repo, "evidence", "profiles"), { recursive: true })
  await writeFile(
    join(repo, "package.json"),
    `${JSON.stringify({ name: "opencode-operational-schema-guard", version: "0.0.0-test", private: true, type: "module" }, null, 2)}\n`,
  )
  await writeFile(
    join(repo, "scripts", "validate-config.mjs"),
    `#!/usr/bin/env node\nimport { readFile } from "node:fs/promises"\nconst argv = process.argv.slice(2)\nif (argv.length !== 2 || argv[0] !== "--candidate") process.exit(2)\nJSON.parse(await readFile(argv[1], "utf8"))\nif (${JSON.stringify(failInstalledValidation)} && process.env.FIXTURE_FAIL_INSTALLED_VALIDATION === "1" && process.cwd() === process.env.FIXTURE_LIVE_ROOT) {\n  process.stderr.write("fixture installed validation failure\\n")\n  process.exit(1)\n}\nprocess.stdout.write(\`OPERATIONAL_CONFIG_RESULT: PASS; candidate=\${argv[1]}\\n\`)\n`,
  )
  await chmod(join(repo, "scripts", "validate-config.mjs"), 0o755)
  await writeFile(
    join(repo, "scripts", "fixture-check.mjs"),
    `#!/usr/bin/env node\nprocess.stderr.write("staged profile command must not execute\\n")\nprocess.exit(99)\n`,
  )
  await chmod(join(repo, "scripts", "fixture-check.mjs"), 0o755)
  await writeFile(
    join(repo, "scripts", "fixture-test.mjs"),
    `#!/usr/bin/env node\nprocess.stderr.write("staged profile test must not execute\\n")\nprocess.exit(99)\n`,
  )
  await chmod(join(repo, "scripts", "fixture-test.mjs"), 0o755)
  await writeFile(
    join(repo, "evidence", "profiles", "repository-final-v1.json"),
    `${JSON.stringify(
      {
        schema_version: "ghdev-actions-profile-v1",
        profile_id: "repository-final-v1",
        profile_version: 1,
        commands: [
          { id: "npm-check", argv: ["node", "scripts/fixture-check.mjs"] },
          { id: "npm-test", argv: ["node", "scripts/fixture-test.mjs"], collect_test_totals: "node-tap" },
        ],
      },
      null,
      2,
    )}\n`,
  )
}

async function fixture({ mergedTreeMismatch = false, priorLiveDrift = false, failInstalledValidation = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), "live-plugin-install-test-"))
  const repo = join(root, "repo")
  const live = join(root, "plugins", "live")
  const config = join(root, "opencode.json")
  const work = join(root, "control")
  const plan = join(work, "plan.json")
  const receipt = join(work, "receipt.json")
  await mkdir(repo)
  must(git(repo, ["init", "-q"]), "git init")
  must(git(repo, ["config", "user.name", "GHDEV Fixture"]), "git user.name")
  must(git(repo, ["config", "user.email", "ghdev-fixture@example.invalid"]), "git user.email")
  await writeFixtureSource(repo, { failInstalledValidation })
  await writeFile(join(repo, "state.txt"), "prior\n")
  must(git(repo, ["add", "."]), "git add prior")
  must(git(repo, ["commit", "-qm", "prior"]), "git commit prior")
  const prior = must(git(repo, ["rev-parse", "HEAD"]), "prior sha")
  await archiveCommit(repo, prior, live)
  const configText = `${JSON.stringify(validLiveConfig(), null, 2)}\n`
  await writeFile(config, configText)
  if (priorLiveDrift) await writeFile(join(live, "state.txt"), "drifted prior\n")

  await writeFile(join(repo, "state.txt"), "reviewed\n")
  must(git(repo, ["add", "state.txt"]), "git add reviewed")
  must(git(repo, ["commit", "-qm", "reviewed"]), "git commit reviewed")
  const reviewed = must(git(repo, ["rev-parse", "HEAD"]), "reviewed sha")

  if (mergedTreeMismatch) {
    await writeFile(join(repo, "state.txt"), "different merged tree\n")
    must(git(repo, ["add", "state.txt"]), "git add mismatched merged")
    must(git(repo, ["commit", "-qm", "merged mismatch"]), "git commit mismatched merged")
  } else {
    must(git(repo, ["commit", "--allow-empty", "-qm", "merged rewrite"]), "git commit merged rewrite")
  }
  const merged = must(git(repo, ["rev-parse", "HEAD"]), "merged sha")

  return { root, repo, live, config, configText, work, plan, receipt, prior, reviewed, merged }
}

function invoke(args, env = {}) {
  return run(process.execPath, [installer, ...args], {
    env: {
      ...process.env,
      ...env,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "init.defaultBranch",
      GIT_CONFIG_VALUE_0: "main",
    },
  })
}

function prepareArgs(f) {
  return [
    "prepare",
    "--repo", f.repo,
    "--merged-sha", f.merged,
    "--reviewed-sha", f.reviewed,
    "--expected-live-sha", f.prior,
    "--plan", f.plan,
    "--live-root", f.live,
    "--live-config", f.config,
    "--work-root", f.work,
  ]
}

async function prepared(f) {
  const result = invoke(prepareArgs(f))
  const output = must(result, "installer prepare")
  const digest = /^PLAN_SHA256=([0-9a-f]{64})$/m.exec(output)?.[1]
  assert.ok(digest, output)
  return { digest, plan: JSON.parse(await readFile(f.plan, "utf8")), output }
}

function promoteArgs(f, digest) {
  return ["promote", "--plan", f.plan, "--expected-plan-sha256", digest, "--receipt", f.receipt]
}

async function cleanup(f) {
  await rm(f.root, { recursive: true, force: true })
}

test("installer script is syntactically valid", () => {
  must(run(process.execPath, ["--check", installer]), "node --check installer")
})

test("prepare and promote exact merged source with typed receipt and rollback material", async () => {
  const f = await fixture()
  try {
    const { digest } = await prepared(f)
    const result = invoke(promoteArgs(f, digest))
    const output = must(result, "installer promote")
    assert.match(output, /OPERATIONAL_LIVE_PLUGIN_DEPLOYMENT_RESULT=PASS/)
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "reviewed\n")
    assert.equal(await readFile(f.config, "utf8"), f.configText)
    const receipt = JSON.parse(await readFile(f.receipt, "utf8"))
    assert.equal(receipt.result, "PASS")
    assert.equal(receipt.reviewed_commit, f.reviewed)
    assert.equal(receipt.merged_commit, f.merged)
    assert.equal(receipt.reviewed_tree_equals_merged_tree, true)
    assert.equal(receipt.installed.tree_matches_stage, true)
    assert.equal(receipt.installed.tree_matches_merged_main, true)
    assert.equal(receipt.activation_pair.config_byte_preserved, true)
    assert.equal(receipt.rollback.retained, true)
    assert.equal(await readFile(join(receipt.rollback.source_backup, "state.txt"), "utf8"), "prior\n")
    assert.equal(await readFile(receipt.rollback.config_backup, "utf8"), f.configText)
    assert.deepEqual(receipt.repository_validation, { authority: "trusted-actions-external", result: "NOT_EVALUATED_BY_INSTALLER" })
  } finally {
    await cleanup(f)
  }
})

test("prepare rejects reviewed and merged commits with different trees", async () => {
  const f = await fixture({ mergedTreeMismatch: true })
  try {
    const result = invoke(prepareArgs(f))
    blocked(result, "MERGED_TREE_IDENTITY_MISMATCH")
    assert.equal(await exists(f.plan), false)
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "prior\n")
  } finally {
    await cleanup(f)
  }
})

test("prepare rejects unauthenticated prior live tree", async () => {
  const f = await fixture({ priorLiveDrift: true })
  try {
    const result = invoke(prepareArgs(f))
    blocked(result, "TREE_IDENTITY_MISMATCH")
    assert.equal(await exists(f.plan), false)
  } finally {
    await cleanup(f)
  }
})

test("prepare rejects a control root that overlaps the live-plugin parent", async () => {
  const f = await fixture()
  try {
    f.work = join(dirname(f.live), "control")
    f.plan = join(f.work, "plan.json")
    const result = invoke(prepareArgs(f))
    blocked(result, "UNSAFE_CONTROL_ROOT")
    assert.equal(await exists(f.plan), false)
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "prior\n")
  } finally {
    await cleanup(f)
  }
})

test("prepare rejects a plan path outside the control root", async () => {
  const f = await fixture()
  try {
    f.plan = join(f.root, "outside-plan.json")
    const result = invoke(prepareArgs(f))
    blocked(result, "UNSAFE_CONTROL_PATH")
    assert.equal(await exists(f.plan), false)
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "prior\n")
  } finally {
    await cleanup(f)
  }
})

test("plan destination collision is exclusive and non-mutating", async () => {
  const f = await fixture()
  try {
    await mkdir(dirname(f.plan), { recursive: true })
    await writeFile(f.plan, "sentinel\n")
    const result = invoke(prepareArgs(f))
    blocked(result, "DESTINATION_EXISTS")
    assert.equal(await readFile(f.plan, "utf8"), "sentinel\n")
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "prior\n")
  } finally {
    await cleanup(f)
  }
})

test("promote rejects plan digest tampering before live mutation", async () => {
  const f = await fixture()
  try {
    const { digest } = await prepared(f)
    await writeFile(f.plan, `${await readFile(f.plan, "utf8")}\n`)
    const result = invoke(promoteArgs(f, digest))
    blocked(result, "PLAN_DIGEST_MISMATCH")
    assert.equal(await exists(f.receipt), false)
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "prior\n")
  } finally {
    await cleanup(f)
  }
})

test("promote rejects prepared-stage drift before live mutation", async () => {
  const f = await fixture()
  try {
    const { digest, plan } = await prepared(f)
    await writeFile(join(plan.source_stage.root, "state.txt"), "stage drift\n")
    const result = invoke(promoteArgs(f, digest))
    blocked(result, "TREE_IDENTITY_MISMATCH")
    assert.equal(await exists(f.receipt), false)
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "prior\n")
  } finally {
    await cleanup(f)
  }
})

test("promote rejects live-tree drift between prepare and promote", async () => {
  const f = await fixture()
  try {
    const { digest } = await prepared(f)
    await writeFile(join(f.live, "state.txt"), "live drift\n")
    const result = invoke(promoteArgs(f, digest))
    blocked(result, "TREE_IDENTITY_MISMATCH")
    assert.equal(await exists(f.receipt), false)
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "live drift\n")
  } finally {
    await cleanup(f)
  }
})

test("promote rejects live-config drift between prepare and promote", async () => {
  const f = await fixture()
  try {
    const { digest } = await prepared(f)
    await writeFile(f.config, '{"fixture":false}\n')
    const result = invoke(promoteArgs(f, digest))
    blocked(result, "PRECONDITION_DRIFT")
    assert.equal(await exists(f.receipt), false)
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "prior\n")
  } finally {
    await cleanup(f)
  }
})

test("promote rejects a receipt path outside the prepared control root", async () => {
  const f = await fixture()
  try {
    const { digest } = await prepared(f)
    f.receipt = join(f.root, "outside-receipt.json")
    const result = invoke(promoteArgs(f, digest))
    blocked(result, "UNSAFE_RECEIPT_PATH")
    assert.equal(await exists(f.receipt), false)
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "prior\n")
  } finally {
    await cleanup(f)
  }
})

test("receipt destination collision blocks before lock or live mutation", async () => {
  const f = await fixture()
  try {
    const { digest } = await prepared(f)
    await writeFile(f.receipt, "sentinel\n")
    const result = invoke(promoteArgs(f, digest))
    blocked(result, "DESTINATION_EXISTS")
    assert.equal(await readFile(f.receipt, "utf8"), "sentinel\n")
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "prior\n")
  } finally {
    await cleanup(f)
  }
})

test("installation lock collision blocks and removes the reserved receipt", async () => {
  const f = await fixture()
  try {
    const { digest } = await prepared(f)
    const lock = join(dirname(f.live), `.${f.live.split("/").at(-1)}.install.lock`)
    await writeFile(lock, "held\n")
    const result = invoke(promoteArgs(f, digest))
    blocked(result, "INSTALL_LOCKED")
    assert.equal(await exists(f.receipt), false)
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "prior\n")
  } finally {
    await cleanup(f)
  }
})

test("post-promotion installed-tree validation failure restores prior live source", async () => {
  const f = await fixture()
  let watcher
  try {
    const { digest } = await prepared(f)
    const priorIno = String((await stat(f.live)).ino)
    const watcherCode = `
      const fs = require("node:fs")
      const [live, priorIno] = process.argv.slice(1)
      const deadline = Date.now() + 10000
      const timer = setInterval(() => {
        try {
          const ino = String(fs.lstatSync(live).ino)
          if (ino !== priorIno) {
            fs.appendFileSync(live + "/package.json", "\\n")
            clearInterval(timer)
            process.exit(0)
          }
        } catch {}
        if (Date.now() > deadline) {
          clearInterval(timer)
          process.exit(3)
        }
      }, 1)
    `
    watcher = spawn(process.execPath, ["-e", watcherCode, f.live, priorIno], { stdio: "ignore" })
    const result = invoke(promoteArgs(f, digest))
    blocked(result, "POST_PROMOTION_VALIDATION_FAILED_ROLLED_BACK")
    assert.equal(await exists(f.receipt), true)
    const pending = JSON.parse(await readFile(f.receipt, "utf8"))
    assert.equal(pending.result, "PROMOTION_PENDING")
    assert.equal(pending.merged_commit, f.merged)
    assert.equal(pending.prior_live_commit, f.prior)
    assert.equal(await readFile(join(f.live, "state.txt"), "utf8"), "prior\n")
    assert.equal(await readFile(f.config, "utf8"), f.configText)
  } finally {
    watcher?.kill()
    await cleanup(f)
  }
})

