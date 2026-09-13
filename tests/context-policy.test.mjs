import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { access, mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { OperationalSchemaGuardPlugin } from "../index.mjs"
import { derivePrimaryContextPolicy, unwrapLiveConfig, validateModelContextBudget } from "../lib/context-policy.mjs"

function configuredModel({ context = 262144, input = 241664, output = 20480 } = {}) {
  return { limit: { context, input, output } }
}

function liveConfig({ reserved = 40960 } = {}) {
  return {
    model: "local/chat",
    compaction: { auto: true, prune: true, reserved },
    provider: {
      local: {
        models: {
          chat: configuredModel(),
          "chat-fast": configuredModel({ input: 253952, output: 8192 }),
          "chat-review": configuredModel(),
          "chat-audit": configuredModel(),
        },
      },
    },
    agent: {
      plan: { model: "local/chat-audit" },
      build: { model: "local/chat" },
      review: { model: "local/chat-review" },
      research: { model: "local/chat-audit" },
    },
  }
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr || `${args.join(" ")} failed`)
  return String(result.stdout ?? "").trim()
}

async function sessionRepository(remote) {
  const root = await mkdtemp(join(tmpdir(), "opencode-session-governed-repo-"))
  runGit(root, ["init", "-q"])
  runGit(root, ["-c", "user.name=GHDEV", "-c", "user.email=ghdev@example.invalid", "commit", "--allow-empty", "-qm", "base"])
  if (remote) runGit(root, ["remote", "add", "origin", remote])
  return root
}

function sessionAwareClient(config, directories) {
  return {
    config: { get: async () => ({ data: config }) },
    session: {
      get: async (request) => {
        const id = request?.path?.id ?? request?.sessionID
        return { data: { id, directory: directories.get(id) } }
      },
    },
  }
}

test("context policy is derived per primary agent and frozen at initialization values", () => {
  const config = liveConfig()
  const policy = derivePrimaryContextPolicy(config)
  assert.deepEqual(policy.build, {
    model: "local/chat",
    contextTokens: 262144,
    inputTokens: 241664,
    outputTokens: 20480,
    reservedTokens: 40960,
    warningTokens: 200704,
    hardLimitTokens: 241664,
  })
  assert.equal(policy.plan.model, "local/chat-audit")
  assert.equal(policy.review.model, "local/chat-review")
  assert.equal(policy.research.model, "local/chat-audit")
  assert.ok(Object.isFrozen(policy))
  assert.ok(Object.isFrozen(policy.build))

  config.compaction.reserved = 8192
  config.provider.local.models.chat.limit.input = 180000
  assert.equal(policy.build.warningTokens, 200704)
  assert.equal(policy.build.hardLimitTokens, 241664)
})

test("different live model and reserve values produce different derived thresholds", () => {
  const config = liveConfig({ reserved: 32768 })
  config.provider.local.models.chat = configuredModel({ input: 245760, output: 16384 })
  const policy = derivePrimaryContextPolicy(config)
  assert.equal(policy.build.warningTokens, 212992)
  assert.equal(policy.build.hardLimitTokens, 245760)
  assert.equal(policy.build.reservedTokens, 32768)
})

test("context budget validation rejects incoherent limits and reserve", () => {
  assert.throws(() => validateModelContextBudget({ context: 262144, input: 250000, output: 16384 }, 40960, "test"), /input \+ limit\.output must not exceed limit\.context/)
  assert.throws(() => validateModelContextBudget({ context: 262144, input: 40000, output: 8192 }, 40000, "test"), /compaction\.reserved must be smaller/)
  assert.throws(() => validateModelContextBudget({ context: 262144, output: 8192 }, 40960, "test"), /limit\.input must be a positive integer/)
})

test("context policy rejects missing or unresolved primary model authority", () => {
  const missing = liveConfig()
  delete missing.model
  delete missing.agent.build.model
  assert.throws(() => derivePrimaryContextPolicy(missing), /build must resolve a configured model/)

  const unresolved = liveConfig()
  unresolved.agent.review.model = "local/missing"
  assert.throws(() => derivePrimaryContextPolicy(unresolved), /review model local\/missing is not configured/)
})

test("plugin initialization snapshots live configuration and fallback client.config.get exactly once", async () => {
  const config = liveConfig()
  let reads = 0
  const client = {
    config: {
      get: async () => {
        reads += 1
        return { data: config }
      },
    },
  }
  const hooks = await OperationalSchemaGuardPlugin({ client, directory: "/tmp/context-policy-plugin-test" })
  await hooks.config?.(config)
  await hooks["tool.execute.before"]({ sessionID: "s1", callID: "tool-1", tool: "todowrite" }, { args: { todos: [] } })
  assert.equal(reads, 0) // config hook resolved policy, so client.config.get was not called

  // Fallback when config hook was not invoked
  const fallbackHooks = await OperationalSchemaGuardPlugin({ client, directory: "/tmp/context-policy-plugin-test-fallback" })
  await fallbackHooks["tool.execute.before"]({ sessionID: "s2", callID: "tool-1", tool: "todowrite" }, { args: { todos: [] } })
  assert.equal(reads, 1)
  config.compaction.reserved = 8192
  await fallbackHooks["tool.execute.before"]({ sessionID: "s2", callID: "tool-2", tool: "todowrite" }, { args: { todos: [] } })
  assert.equal(reads, 1)
  await fallbackHooks.dispose?.()
})

test("plugin initialization remains active and fails closed when live config authority is unavailable or malformed", async () => {
  const missingHooks = await OperationalSchemaGuardPlugin({ client: {}, directory: "/tmp/context-policy-plugin-test-missing" })
  await assert.rejects(
    () => missingHooks["tool.execute.before"]({ sessionID: "missing", callID: "tool-1", tool: "todowrite" }, { args: { todos: [] } }),
    /context policy initialization failed closed.*client\.config\.get\(\) is unavailable/,
  )

  let reads = 0
  const malformed = liveConfig()
  malformed.compaction.reserved = 0
  const malformedHooks = await OperationalSchemaGuardPlugin({
    client: { config: { get: async () => { reads += 1; return { data: malformed } } } },
    directory: "/tmp/context-policy-plugin-test-malformed",
  })
  await assert.rejects(
    () => malformedHooks["tool.execute.before"]({ sessionID: "malformed", callID: "tool-1", tool: "read" }, { args: { filePath: "README.md" } }),
    /context policy initialization failed closed.*compaction\.reserved must be a positive integer/,
  )
  assert.equal(reads, 1)
  assert.throws(() => unwrapLiveConfig(undefined), /did not return a live configuration object/)
})

test("a never-resolving legacy client.config.get cannot deadlock factory construction (boot regression)", { timeout: 4000 }, async () => {
  // BOOT_DEADLOCK_REGRESSION: the legacy client.config.get surface is present but
  // intentionally never resolves. A regression that reintroduces a top-level
  // `await client.config.get()` in the factory would hang here until the bounded
  // timeout fails the test deterministically instead of hanging the suite.
  const hangingGet = new Promise(() => {})
  let reads = 0
  const client = {
    config: {
      get: async () => {
        reads += 1
        return hangingGet
      },
    },
  }
  const started = Date.now()
  // PLUGIN_FACTORY_RETURNED: the factory must return its hooks without waiting
  // on the never-resolving legacy config API.
  const hooks = await OperationalSchemaGuardPlugin({ client, directory: "/tmp/ctx-boot-deadlock-regression" })
  const elapsed = Date.now() - started
  assert.equal(typeof hooks, "object", "PLUGIN_FACTORY_RETURNED: the factory returned its hooks object")
  assert.equal(typeof hooks["tool.execute.before"], "function", "tool.execute.before hook is present")
  assert.equal(typeof hooks.event, "function", "event hook is present")
  assert.ok(elapsed < 2000, `factory returned in ${elapsed}ms without waiting on the hanging get`)
  // HANGING_CLIENT_CONFIG_GET_CALLED: the factory must not call client.config.get()
  // at construction; it is only reached lazily by a context-sensitive hook.
  assert.equal(reads, 0, "HANGING_CLIENT_CONFIG_GET_CALLED=0: factory did not invoke the legacy config API")
})

test("the native config hook captures a real snapshot; a post-hook source mutation is ignored", async () => {
  // NATIVE_CONFIG_SNAPSHOT_CAPTURE: capture is proven by the fact that the values
  // delivered through the native config hook are the ones consumed later, not a
  // live reference to the caller-owned object. The fallback get is made to throw
  // so any accidental fallback is impossible (accidental fallback would be obvious).
  const config = liveConfig() // reserved=40960 -> captured build.warningTokens=200704
  const client = {
    config: {
      get: async () => {
        throw new Error("fallback client.config.get must not be used; the native config hook is the authority")
      },
    },
  }
  const hooks = await OperationalSchemaGuardPlugin({ client, directory: "/tmp/ctx-snapshot-capture" })
  await hooks.config(config)

  // Mutate the caller-owned source AFTER the config hook captured the snapshot.
  // If the policy were a live reference (reserved=60000 -> build.warningTokens=181664),
  // a 190000-token input would already exceed the threshold.
  config.compaction.reserved = 60000

  await hooks["chat.message"]({ sessionID: "snap", agent: "build" }, { parts: [] })

  // Discriminator token 190000 sits between the live threshold (181664) and the
  // captured threshold (200704): only the captured policy suppresses the notice.
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "snap", role: "assistant", finish: "stop", id: "m1", tokens: { input: 190000 } } } } })
  const outA = { system: [] }
  await hooks["experimental.chat.system.transform"]({ sessionID: "snap" }, outA)
  assert.equal(
    outA.system.length,
    0,
    "SOURCE_OBJECT_POST_HOOK_MUTATION_IGNORED: 190000 < captured 200704 so no notice; the reserved=60000 mutation was ignored",
  )

  // Confirming token 210000 exceeds the captured threshold, proving the captured
  // value (not a fail-closed/undefined policy) is actively driving the budget.
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "snap", role: "assistant", finish: "stop", id: "m2", tokens: { input: 210000 } } } } })
  const outB = { system: [] }
  await hooks["experimental.chat.system.transform"]({ sessionID: "snap" }, outB)
  assert.ok(
    outB.system.some((s) => /primary input context is 210000/.test(s)),
    "DERIVED_POLICY_MATCHES_CAPTURED_VALUES: the captured 200704 threshold is in effect (notice at 210000)",
  )
})

test("the message.updated event path shares the single lazy resolution and never consumes an unresolved policy", async () => {
  // EVENT_PATH_SHARED_POLICY_RESOLUTION: with config resolvable only through the
  // fallback get (no native config hook), the message.updated event path resolves
  // through the same single authority as the operational hooks and consumes the
  // resolved policy rather than the implicit proxy fail-close.
  let reads = 0
  const config = liveConfig() // build.warningTokens=200704
  const client = {
    config: {
      get: async () => {
        reads += 1
        return { data: config }
      },
    },
  }
  const hooks = await OperationalSchemaGuardPlugin({ client, directory: "/tmp/ctx-event-shared" })
  await hooks["chat.message"]({ sessionID: "ev", agent: "build" }, { parts: [] })
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "ev", role: "assistant", finish: "stop", id: "m1", tokens: { input: 210000 } } } } })
  const out = { system: [] }
  await hooks["experimental.chat.system.transform"]({ sessionID: "ev" }, out)
  assert.ok(out.system.some((s) => /primary input context is 210000/.test(s)), "EVENT_PATH_SHARED_POLICY_RESOLUTION: the event path used the resolved policy")
  assert.equal(reads, 1, "EVENT_PATH: one shared derivation across the event and the hooks")

  // EVENT_PATH_NO_UNRESOLVED_POLICY_CONSUMPTION: when config authority is
  // unavailable, an event arriving first must not crash and must keep the
  // process consistently fail-closed rather than consuming a null/unresolved policy.
  const failHooks = await OperationalSchemaGuardPlugin({ client: {}, directory: "/tmp/ctx-event-failclosed" })
  await failHooks["chat.message"]({ sessionID: "f", agent: "build" }, { parts: [] })
  await failHooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "f", role: "assistant", finish: "stop", id: "m1", tokens: { input: 210000 } } } } })
  await assert.rejects(
    () => failHooks["tool.execute.before"]({ sessionID: "f", callID: "t", tool: "read" }, { args: { filePath: "README.md" } }),
    /context policy initialization failed closed/,
    "EVENT_PATH_NO_UNRESOLVED_POLICY_CONSUMPTION: a tool remains rejected in the fail-closed state after an event",
  )
})

test("plugin routes resource identity and exact-target admission through the authoritative session directory", async () => {
  const config = liveConfig()
  const firecrawl = await sessionRepository("https://github.com/fvanevski/firecrawl_skill.git")
  const unrelated = await sessionRepository("https://github.com/example/unrelated.git")
  const target = runGit(firecrawl, ["rev-parse", "HEAD"])
  runGit(unrelated, ["fetch", "-q", firecrawl, "HEAD"])
  assert.equal(runGit(unrelated, ["cat-file", "-t", target]), "commit")
  const sessions = new Map([["firecrawl-session", firecrawl]])
  const stateDirectory = await mkdtemp(join(tmpdir(), "opencode-session-governed-state-"))
  const hooks = await OperationalSchemaGuardPlugin({
    client: sessionAwareClient(config, sessions),
    directory: unrelated,
    stateDirectory,
  })
  await hooks.config(config)
  await hooks["chat.message"](
    { sessionID: "firecrawl-session", agent: "build" },
    { message: {}, parts: [{ type: "text", text: `REQUIRED EXACT HEAD: ${target}` }] },
  )

  const worktreeRoot = await mkdtemp(join(tmpdir(), "opencode-session-governed-worktree-root-"))
  const worktree = join(worktreeRoot, "candidate")
  const compound = { command: `git worktree add --detach ${worktree} ${target} && git rev-parse HEAD`, workdir: firecrawl }
  let rejection
  try {
    await hooks["tool.execute.before"]({ sessionID: "firecrawl-session", callID: "compound", tool: "bash" }, { args: compound })
    assert.fail("compound target setup must reject")
  } catch (error) {
    rejection = String(error?.message ?? error)
  }
  assert.match(rejection, /OPERATIONAL_CORRECTION: SPLIT_TARGET_ADMISSION/)
  assert.match(rejection, /OPERATIONAL_RESOURCE: kind=command-shape; repository=fvanevski\/firecrawl_skill/)
  assert.match(rejection, /section=exact-target-disposable-worktree/)

  const wrongWorkspace = { command: `git worktree add --detach ${worktree} ${target}`, workdir: unrelated }
  let wrongWorkspaceRejection
  try {
    await hooks["tool.execute.before"]({ sessionID: "firecrawl-session", callID: "wrong-workspace", tool: "bash" }, { args: wrongWorkspace })
    assert.fail("a per-call workdir must not redefine the governed repository")
  } catch (error) {
    wrongWorkspaceRejection = String(error?.message ?? error)
  }
  assert.match(wrongWorkspaceRejection, /OPERATIONAL_CORRECTION: ADMIT_EXACT_TARGET/)
  assert.match(wrongWorkspaceRejection, /repository=fvanevski\/firecrawl_skill/)

  const setup = { command: `git worktree add --detach ${worktree} ${target}`, workdir: firecrawl }
  await assert.doesNotReject(() => hooks["tool.execute.before"]({ sessionID: "firecrawl-session", callID: "setup", tool: "bash" }, { args: setup }))
  runGit(firecrawl, ["worktree", "add", "--detach", worktree, target])
  await hooks["tool.execute.after"](
    { sessionID: "firecrawl-session", callID: "setup", tool: "bash", args: setup },
    { title: "", output: "prepared", metadata: { exit: 0 } },
  )

  const proof = { command: "git rev-parse HEAD", workdir: worktree }
  await assert.doesNotReject(() => hooks["tool.execute.before"]({ sessionID: "firecrawl-session", callID: "proof", tool: "bash" }, { args: proof }))
  const proofOutput = { title: "", output: `${target}\n`, metadata: { exit: 0 } }
  await hooks["tool.execute.after"](
    { sessionID: "firecrawl-session", callID: "proof", tool: "bash", args: proof },
    proofOutput,
  )
  assert.equal(proofOutput.metadata.operationalSchema.authorityStatus, "verified")
  assert.equal(proofOutput.metadata.operationalSchema.observedHead, target)

  const verifiedWrongPath = join(worktreeRoot, "verified-wrong-repository")
  const verifiedWrong = { command: `git worktree add --detach ${verifiedWrongPath} ${target}`, workdir: unrelated }
  let verifiedWrongRejection
  try {
    await hooks["tool.execute.before"]({ sessionID: "firecrawl-session", callID: "verified-wrong-workspace", tool: "bash" }, { args: verifiedWrong })
    assert.fail("verified target setup from a different repository must reject before Git execution")
  } catch (error) {
    verifiedWrongRejection = String(error?.message ?? error)
  }
  assert.match(verifiedWrongRejection, /OPERATIONAL_CORRECTION: ADMIT_EXACT_TARGET/)
  assert.match(verifiedWrongRejection, /repository=fvanevski\/firecrawl_skill/)
  assert.match(verifiedWrongRejection, /section=exact-target-disposable-worktree/)
  await assert.rejects(() => access(verifiedWrongPath), (error) => error?.code === "ENOENT")
  assert.ok(!runGit(unrelated, ["worktree", "list", "--porcelain"]).includes(verifiedWrongPath))

  const verifiedForcedPath = join(worktreeRoot, "verified-force-option")
  await assert.rejects(
    () => hooks["tool.execute.before"](
      { sessionID: "firecrawl-session", callID: "verified-force-option", tool: "bash" },
      { args: { command: `git worktree add --force --detach ${verifiedForcedPath} ${target}`, workdir: unrelated } },
    ),
    /OPERATIONAL_CORRECTION: ADMIT_EXACT_TARGET/,
  )
  await assert.rejects(() => access(verifiedForcedPath), (error) => error?.code === "ENOENT")
  assert.ok(!runGit(unrelated, ["worktree", "list", "--porcelain"]).includes(verifiedForcedPath))

  const verifiedCompoundPath = join(worktreeRoot, "verified-compound-setup")
  await assert.rejects(
    () => hooks["tool.execute.before"](
      { sessionID: "firecrawl-session", callID: "verified-compound-setup", tool: "bash" },
      { args: { command: `git worktree add -q -d ${verifiedCompoundPath} ${target} && git status --short`, workdir: unrelated } },
    ),
    /OPERATIONAL_CORRECTION: ADMIT_EXACT_TARGET/,
  )
  await assert.rejects(() => access(verifiedCompoundPath), (error) => error?.code === "ENOENT")
  assert.ok(!runGit(unrelated, ["worktree", "list", "--porcelain"]).includes(verifiedCompoundPath))

  await assert.rejects(
    () => hooks["tool.execute.before"](
      { sessionID: "firecrawl-session", callID: "verified-switch-short-detach", tool: "bash" },
      { args: { command: `git switch -d ${target}`, workdir: unrelated } },
    ),
    /OPERATIONAL_CORRECTION: ADMIT_EXACT_TARGET/,
  )

  const proofWorktreeSetupPath = join(worktreeRoot, "verified-proof-worktree-setup")
  await assert.rejects(
    () => hooks["tool.execute.before"](
      { sessionID: "firecrawl-session", callID: "verified-proof-worktree-setup", tool: "bash" },
      { args: { command: `git worktree add --detach ${proofWorktreeSetupPath} ${target}`, workdir: worktree } },
    ),
    /OPERATIONAL_CORRECTION: ADMIT_EXACT_TARGET/,
  )
  await assert.rejects(() => access(proofWorktreeSetupPath), (error) => error?.code === "ENOENT")

  await assert.doesNotReject(
    () => hooks["tool.execute.before"](
      { sessionID: "firecrawl-session", callID: "verified-external-readonly", tool: "bash" },
      { args: { command: "git status --short", workdir: unrelated } },
    ),
  )

  const verifiedCanonicalPath = join(worktreeRoot, "verified-canonical")
  const verifiedCanonical = { command: `git worktree add --detach ${verifiedCanonicalPath} ${target}`, workdir: firecrawl }
  await assert.doesNotReject(
    () => hooks["tool.execute.before"]({ sessionID: "firecrawl-session", callID: "verified-canonical", tool: "bash" }, { args: verifiedCanonical }),
  )
  runGit(firecrawl, ["worktree", "add", "--detach", verifiedCanonicalPath, target])
  await hooks["tool.execute.after"](
    { sessionID: "firecrawl-session", callID: "verified-canonical", tool: "bash", args: verifiedCanonical },
    { title: "", output: "prepared", metadata: { exit: 0 } },
  )
  runGit(firecrawl, ["worktree", "remove", "--force", verifiedCanonicalPath])

  runGit(firecrawl, ["worktree", "remove", "--force", worktree])
  await hooks.dispose()
})

test("different session directories isolate workspace authority and a directory change creates an explicit boundary", async () => {
  const config = liveConfig()
  const repoA = await sessionRepository()
  const repoB = await sessionRepository()
  const targetA = runGit(repoA, ["rev-parse", "HEAD"])
  const sessions = new Map([
    ["session-a", repoA],
    ["session-b", repoB],
  ])
  const stateDirectory = await mkdtemp(join(tmpdir(), "opencode-session-isolation-state-"))
  const hooks = await OperationalSchemaGuardPlugin({
    client: sessionAwareClient(config, sessions),
    directory: "/tmp/opencode-plugin-construction-fallback",
    stateDirectory,
  })
  await hooks.config(config)

  await hooks["chat.message"](
    { sessionID: "session-a", agent: "build" },
    { message: {}, parts: [{ type: "text", text: `REQUIRED EXACT HEAD: ${targetA}` }] },
  )
  await assert.rejects(
    () => hooks["tool.execute.before"]({ sessionID: "session-a", callID: "a-edit", tool: "edit" }, { args: { filePath: "docs/a.md" } }),
    /exact-head admission is pending/,
  )
  await hooks["chat.message"]({ sessionID: "session-b", agent: "build" }, { message: {}, parts: [] })
  await assert.doesNotReject(
    () => hooks["tool.execute.before"]({ sessionID: "session-b", callID: "b-edit", tool: "edit" }, { args: { filePath: "docs/b.md" } }),
  )

  const compactA = { context: [] }
  await hooks["experimental.session.compacting"]({ sessionID: "session-a" }, compactA)
  assert.match(compactA.context.join("\n"), new RegExp(`Workspace: ${repoA.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))
  const compactB = { context: [] }
  await hooks["experimental.session.compacting"]({ sessionID: "session-b" }, compactB)
  assert.match(compactB.context.join("\n"), new RegExp(`Workspace: ${repoB.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))

  sessions.set("session-a", repoB)
  await hooks["chat.message"]({ sessionID: "session-a", agent: "build" }, { message: {}, parts: [] })
  const transformed = { system: [] }
  await hooks["experimental.chat.system.transform"]({ sessionID: "session-a", model: {} }, transformed)
  assert.match(transformed.system.join("\n"), /authoritative governed directory changed/)
  assert.match(transformed.system.join("\n"), new RegExp(repoB.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  await assert.doesNotReject(
    () => hooks["tool.execute.before"]({ sessionID: "session-a", callID: "a-after-rebind", tool: "read" }, { args: { filePath: "README.md" } }),
  )

  await hooks.dispose()
})
