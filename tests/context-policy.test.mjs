import assert from "node:assert/strict"
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

test("plugin initialization snapshots client.config.get exactly once", async () => {
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
  assert.equal(reads, 1)
  config.compaction.reserved = 8192
  await hooks.dispose?.()
  assert.equal(reads, 1)
})

test("plugin initialization fails closed when the live config surface is unavailable", async () => {
  await assert.rejects(() => OperationalSchemaGuardPlugin({ client: {}, directory: "/tmp/context-policy-plugin-test" }), /client\.config\.get/)
  assert.throws(() => unwrapLiveConfig(undefined), /did not return a live configuration object/)
})
