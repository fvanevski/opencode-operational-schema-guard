import test from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { chmod, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const installer = resolve(dirname(fileURLToPath(import.meta.url)), "../scripts/install-live-plugin.mjs")
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
    `#!/usr/bin/env node\nimport { spawnSync } from "node:child_process"\nconst r = spawnSync("git", ["config", "--get", "init.defaultBranch"], { encoding: "utf8" })\nif (r.status !== 0 || r.stdout.trim() !== "master") {\n  process.stderr.write(\`unexpected init.defaultBranch=\${r.stdout.trim()}\\n\`)\n  process.exit(1)\n}\n`,
  )
  await chmod(join(repo, "scripts", "fixture-check.mjs"), 0o755)
  await writeFile(
    join(repo, "scripts", "fixture-test.mjs"),
    `#!/usr/bin/env node\nprocess.stdout.write("TAP version 13\\n1..1\\nok 1 - fixture\\n# tests 1\\n# pass 1\\n# fail 0\\n# skipped 0\\n")\n`,
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
  const live = join(root, "live")
  const config = join(root, "opencode.json")
  const work = join(root, "work")
  const plan = join(root, "plan.json")
  const receipt = join(root, "receipt.json")
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
/*__GHDEV_INSTALLER_TEST_REMAINDER__*/
