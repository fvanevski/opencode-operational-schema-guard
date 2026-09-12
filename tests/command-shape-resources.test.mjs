import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import {
  appendCommandShapeResource,
  canonicalRepositoryIdentity,
  resolveCommandShapeResource,
  resolveRepositoryIdentity,
} from "../lib/command-shape-resources.mjs"
import { createOperationGuard } from "../lib/operation-guard.mjs"

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function runGit(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr || `${args.join(" ")} failed`)
  return String(result.stdout ?? "").trim()
}

async function repositoryWithRemote(remote) {
  const root = await mkdtemp(join(tmpdir(), "opencode-command-shapes-repo-"))
  runGit(root, ["init", "-q"])
  if (remote) runGit(root, ["remote", "add", "origin", remote])
  return root
}

async function message(hooks, sessionID, text) {
  await hooks["chat.message"]({ sessionID, agent: "build" }, { message: {}, parts: [{ type: "text", text }] })
}

async function rejectedMessage(action) {
  try {
    await action()
  } catch (error) {
    return String(error?.message ?? error)
  }
  assert.fail("expected invocation to be rejected")
}

test("GitHub SSH and HTTPS remotes canonicalize to one repository identity", async () => {
  for (const remote of [
    "https://github.com/fvanevski/firecrawl_skill.git",
    "http://github.com/fvanevski/firecrawl_skill",
    "git@github.com:fvanevski/firecrawl_skill.git",
    "ssh://git@github.com/fvanevski/firecrawl_skill.git",
    "git://github.com/fvanevski/firecrawl_skill.git",
  ]) {
    assert.equal(canonicalRepositoryIdentity(remote), "fvanevski/firecrawl_skill", remote)
    const repository = await repositoryWithRemote(remote)
    assert.equal(resolveRepositoryIdentity(repository), "fvanevski/firecrawl_skill", remote)
  }
})

test("mapped Firecrawl correction preserves payload and emits the repository resource pointer", async () => {
  const repository = await repositoryWithRemote("https://github.com/fvanevski/firecrawl_skill.git")
  const original = "Operational schema guard: OPERATIONAL_CORRECTION: SPLIT_TARGET_ADMISSION; do_not_execute_or_auto_split=true."
  const annotated = await appendCommandShapeResource(original, { directory: repository, pluginRoot })
  assert.ok(annotated.startsWith(original))
  assert.match(annotated, /OPERATIONAL_RESOURCE: kind=command-shape; repository=fvanevski\/firecrawl_skill; correction=SPLIT_TARGET_ADMISSION;/)
  assert.match(annotated, new RegExp(`path=${JSON.stringify(join(pluginRoot, "resources", "command-shapes", "repositories", "fvanevski__firecrawl_skill.md")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))
  assert.match(annotated, /section=exact-target-disposable-worktree$/m)
})

test("unknown, missing, and ambiguous repository identity safely fall back to the global recipe", async () => {
  const noRemote = await repositoryWithRemote()
  const unknown = await repositoryWithRemote("https://github.com/example/other.git")
  const ambiguous = await repositoryWithRemote("https://github.com/fvanevski/firecrawl_skill.git")
  runGit(ambiguous, ["remote", "add", "upstream", "https://github.com/example/other.git"])

  for (const repository of [noRemote, unknown, ambiguous]) {
    const resource = await resolveCommandShapeResource({ correction: "PROVE_TARGET_HEAD", directory: repository, pluginRoot })
    assert.equal(resource?.repository, "global")
    assert.equal(resource?.section, "exact-target-admission")
    assert.equal(resource?.path, join(pluginRoot, "resources", "command-shapes", "global.md"))
  }
})

test("mapped correction without a repository override falls back to global and unmapped corrections remain byte-identical", async () => {
  const repository = await repositoryWithRemote("git@github.com:fvanevski/firecrawl_skill.git")
  const globalOnly = await resolveCommandShapeResource({ correction: "PROVE_STRICT_START_HEAD", directory: repository, pluginRoot })
  assert.equal(globalOnly?.repository, "global")
  assert.equal(globalOnly?.section, "strict-start-proof")

  const original = "Operational schema guard: OPERATIONAL_CORRECTION: UNMAPPED_EXAMPLE; unchanged=true."
  assert.equal(await appendCommandShapeResource(original, { directory: repository, pluginRoot }), original)
})

test("missing or malformed index/resource data never crashes correction handling", async () => {
  const repository = await repositoryWithRemote("https://github.com/fvanevski/firecrawl_skill.git")
  const missingRoot = await mkdtemp(join(tmpdir(), "opencode-command-shapes-missing-"))
  const original = "Operational schema guard: OPERATIONAL_CORRECTION: PROVE_TARGET_HEAD; required=<TARGET_SHA>."
  assert.equal(await appendCommandShapeResource(original, { directory: repository, pluginRoot: missingRoot }), original)

  const malformedRoot = await mkdtemp(join(tmpdir(), "opencode-command-shapes-malformed-"))
  await mkdir(join(malformedRoot, "resources", "command-shapes"), { recursive: true })
  await writeFile(join(malformedRoot, "resources", "command-shapes", "index.json"), "{not-json\n")
  assert.equal(await appendCommandShapeResource(original, { directory: repository, pluginRoot: malformedRoot }), original)
})

test("repository resource failures fall back globally while traversal and stale sections are rejected", async () => {
  const repository = await repositoryWithRemote("https://github.com/fvanevski/firecrawl_skill.git")
  const root = await mkdtemp(join(tmpdir(), "opencode-command-shapes-confined-"))
  const resourceRoot = join(root, "resources", "command-shapes")
  await mkdir(join(resourceRoot, "repositories"), { recursive: true })
  await writeFile(join(resourceRoot, "global.md"), "<!-- command-shape-section:global-target -->\n# Global\n")
  await writeFile(join(root, "escape.md"), "<!-- command-shape-section:repo-target -->\n# Escape\n")
  await writeFile(join(resourceRoot, "repositories", "stale.md"), "# Missing section marker\n")

  const baseIndex = {
    schema_version: "opencode-command-shape-index-v1",
    global: { path: "global.md", corrections: { PROVE_TARGET_HEAD: "global-target" } },
    repositories: {
      "fvanevski/firecrawl_skill": { path: "../../escape.md", corrections: { PROVE_TARGET_HEAD: "repo-target" } },
    },
  }
  await writeFile(join(resourceRoot, "index.json"), `${JSON.stringify(baseIndex, null, 2)}\n`)
  let resource = await resolveCommandShapeResource({ correction: "PROVE_TARGET_HEAD", directory: repository, pluginRoot: root })
  assert.equal(resource?.repository, "global")
  assert.equal(resource?.section, "global-target")

  baseIndex.repositories["fvanevski/firecrawl_skill"].path = "repositories/stale.md"
  await writeFile(join(resourceRoot, "index.json"), `${JSON.stringify(baseIndex, null, 2)}\n`)
  resource = await resolveCommandShapeResource({ correction: "PROVE_TARGET_HEAD", directory: repository, pluginRoot: root })
  assert.equal(resource?.repository, "global")
  assert.equal(resource?.section, "global-target")
})

test("resource paths are derived from the supplied plugin root and remain valid after relocation", async () => {
  const repository = await repositoryWithRemote("https://github.com/fvanevski/firecrawl_skill.git")
  const movedRoot = await mkdtemp(join(tmpdir(), "opencode-command-shapes-moved-"))
  await cp(join(pluginRoot, "resources"), join(movedRoot, "resources"), { recursive: true })
  const resource = await resolveCommandShapeResource({ correction: "ADMIT_EXACT_TARGET", directory: repository, pluginRoot: movedRoot })
  assert.equal(resource?.path, join(movedRoot, "resources", "command-shapes", "repositories", "fvanevski__firecrawl_skill.md"))
  assert.equal(resource?.section, "exact-target-disposable-worktree")
})

test("Firecrawl cookbook contains placeholders and no live/session-specific identities", async () => {
  const content = await readFile(join(pluginRoot, "resources", "command-shapes", "repositories", "fvanevski__firecrawl_skill.md"), "utf8")
  assert.match(content, /<TARGET_SHA>/)
  assert.match(content, /<EXTERNAL_RUN_ID>/)
  assert.match(content, /accepted maximum = 100/)
  assert.match(content, /research_invocations uses started_at\/completed_at\/created_at/)
  assert.match(content, /extraction_attempts raw relation field is invocation_id/)
  assert.doesNotMatch(content, /\b[0-9a-f]{40}\b/i)
  assert.doesNotMatch(content, /\bfr_[0-9a-f-]{8,}\b/i)
  assert.doesNotMatch(content, /(?:postgres(?:ql)?|http|https):\/\/[^\s<]+/i)
  assert.doesNotMatch(content, /(?:token|password|secret)\s*=\s*[^<\s]+/i)
})

test("Issue-368 friction replay exposes correction plus readable canonical target setup guidance without guard-source inspection", async () => {
  const repository = await repositoryWithRemote("https://github.com/fvanevski/firecrawl_skill.git")
  const hooks = createOperationGuard({ directory: repository, env: {}, pluginRoot })
  const target = "a".repeat(40)
  const disposable = join(tmpdir(), "opencode-command-shape-replay-target")
  await message(hooks, "issue368-replay", `REQUIRED EXACT HEAD: ${target}`)

  const rejection = await rejectedMessage(() => hooks["tool.execute.before"](
    { sessionID: "issue368-replay", callID: "compound-target", tool: "bash" },
    { args: { command: `git worktree add --detach ${disposable} ${target} && git rev-parse HEAD` } },
  ))
  assert.match(rejection, /OPERATIONAL_CORRECTION: SPLIT_TARGET_ADMISSION/)
  assert.match(rejection, /OPERATIONAL_RESOURCE: kind=command-shape; repository=fvanevski\/firecrawl_skill/)
  assert.match(rejection, /section=exact-target-disposable-worktree/)

  const resourcePath = JSON.parse(rejection.match(/path=("(?:[^"\\]|\\.)*")/)?.[1] ?? "null")
  assert.equal(resourcePath, join(pluginRoot, "resources", "command-shapes", "repositories", "fvanevski__firecrawl_skill.md"))
  const cookbook = await readFile(resourcePath, "utf8")
  assert.match(cookbook, /workdir=\$OWNER_REPO\ngit worktree add --detach <ABSOLUTE_DISPOSABLE_PATH> <TARGET_SHA>/)
  assert.match(cookbook, /workdir=<ABSOLUTE_DISPOSABLE_PATH>\ngit rev-parse HEAD/)
  assert.match(cookbook, /Do not grep guard implementation source merely to infer a published invocation shape/)
})
