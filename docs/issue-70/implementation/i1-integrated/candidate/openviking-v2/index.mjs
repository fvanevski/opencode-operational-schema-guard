import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { appendFileSync } from "node:fs"
import { createMemorySessionManager } from "../openviking-context-v4/lib/memory-session.mjs"
import { createMemoryRecall } from "../openviking-context-v4/lib/memory-recall.mjs"
import { createSessionInject } from "../openviking-context-v4/lib/session-inject.mjs"
import { createRepoContext } from "../openviking-context-v4/lib/repo-context.mjs"
import { createVikingUriGuard } from "../openviking-context-v4/lib/viking-uri-guard.mjs"
import { loadConfig, resolveDataDir } from "../openviking-context-v4/lib/config.mjs"
import { initLogger, log } from "../openviking-context-v4/lib/utils.mjs"
import { createHybridLexicalIndex } from "../openviking-context-v4/lib/shared/hybrid-lexical.mjs"
import { createHybridRecall, loadVikingCorpus, DEFAULT_CORPUS_ROOT } from "../openviking-context-v4/lib/shared/hybrid-recall.mjs"
import { normalizeToolName } from "../openviking-context-v4/lib/shared/uri-guard.mjs"
import { createCaptureObserver } from "./candidate-capture.mjs"

const pluginRoot = dirname(fileURLToPath(new URL("../openviking-context-v4/index.mjs", import.meta.url)))
const parts = (message) => message.type === "user"
  ? [{ id: `${message.id}:text`, type: "text", text: message.text }]
  : (message.content ?? []).flatMap((part, index) => part.type === "text" && typeof part.text === "string"
    ? [{ id: `${message.id}:text:${index}`, type: "text", text: part.text }] : [])
const session = (result) => result?.data ?? result

async function canonicalMessages(ctx, sessionID, directory) {
  const current = session(await ctx.session.get({ sessionID }))
  if (current?.location?.directory !== directory) throw new Error("OpenViking canonical session moved outside its capture workspace")
  if (typeof ctx.session?.messages === "function") {
    const messages = []
    let cursor
    for (let page = 0; page < 100; page++) {
      const batch = await ctx.session.messages({ sessionID, limit: 1000, order: "asc", ...(cursor ? { cursor: { id: cursor, direction: "next" } } : {}) })
      if (!Array.isArray(batch)) throw new Error("OpenViking canonical delivered history unavailable")
      messages.push(...batch)
      if (batch.length < 1000) return messages
      cursor = batch.at(-1)?.id
      if (!cursor) break
    }
    return messages
  }
  if (typeof ctx.session?.context === "function") {
    const res = await ctx.session.context({ sessionID })
    const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
    return list.map((msg) => ({
      ...msg,
      type: msg.type ?? (msg.role === "assistant" ? "assistant" : "user"),
      text: msg.text ?? (Array.isArray(msg.content) ? msg.content.find((p) => p.type === "text")?.text : (typeof msg.content === "string" ? msg.content : "")),
    }))
  }
  return []
}

export default {
  id: "local.openviking-v2",
  async setup(ctx) {
    const directory = ctx.location.directory
    const config = loadConfig(pluginRoot, directory)
    if (!config.enabled) return
    const dataDir = resolveDataDir(pluginRoot, config)
    initLogger(dataDir, config)
    const manager = createMemorySessionManager({ config, pluginRoot: dataDir })
    await manager.init()
    const repository = createRepoContext({ config })
    const hybridActive = String(process.env.OPENVIKING_HYBRID_RECALL ?? "").trim().toLowerCase() === "active"
    const lexical = hybridActive ? createHybridLexicalIndex({ onLog: (stage, data) => log("DEBUG", "hybrid", stage, data) }) : null
    const hybrid = lexical ? createHybridRecall({ lexical, log: (stage, data) => log("DEBUG", "hybrid", stage, data) }) : null
    const recall = createMemoryRecall({ config, sessionManager: manager, hybridRecall: hybrid })
    const uriGuard = createVikingUriGuard()
    const controller = new AbortController()
    const owned = new Set()
    const observeCandidate = createCaptureObserver({
      workspaceID: directory,
      policyPath: process.env.GRAPHITI_CAPTURE_POLICY_PATH,
      url: process.env.GRAPHITI_CAPTURE_GATE_URL ?? "http://127.0.0.1:1933",
      token: process.env.GRAPHITI_CAPTURE_TOKEN ?? "",
    })
    let stopped = false
    const consumeCanonical = async (sessionID) => {
      const messages = await canonicalMessages(ctx, sessionID, directory)
      if (!messages.some((message) => message.type === "user")) return false
      owned.add(sessionID)
      for (const message of messages) {
        if (message.type !== "user" && message.type !== "assistant") continue
        const role = message.type === "user" ? "user" : "assistant"
        await manager.handleEvent({ type: "message.updated", properties: { info: { id: message.id, sessionID, role } } })
        for (const part of parts(message)) await manager.handleEvent({ type: "message.part.updated", properties: { part: { ...part, sessionID, messageID: message.id } } })
      }
      return true
    }
    if (lexical) {
      Promise.resolve().then(async () => {
        try {
          const corpusRoot = String(process.env.OPENVIKING_HYBRID_CORPUS_ROOT || "").trim() || DEFAULT_CORPUS_ROOT
          const documents = await loadVikingCorpus(corpusRoot, { onLog: (stage, data) => log("DEBUG", "hybrid", stage, data) })
          if (!stopped && documents.length) await lexical.build(documents, { label: "startup" })
        } catch (error) { log("WARN", "hybrid", "Lexical index unavailable; dense recall remains active", { error: String(error?.message ?? error) }) }
      })
    }
    Promise.resolve().then(() => repository.refreshRepos({ force: true })).catch((error) =>
      log("WARN", "repo-context", "Initial refresh failed", { error: String(error?.message ?? error) }))
    const context = await ctx.session.hook("context", async (event) => {
      if (process.env.PHASE_B_OV_EVENT_TRACE) appendFileSync(process.env.PHASE_B_OV_EVENT_TRACE, `${JSON.stringify({ type: "context", hybridActive, lexical: lexical?.status() })}\n`)
      const messages = await canonicalMessages(ctx, event.sessionID, directory)
      const latest = messages.findLast((message) => message.type === "user")
      if (!latest) return
      const input = { sessionID: event.sessionID, messageID: latest.id, directory }
      const output = { message: { id: latest.id, sessionID: event.sessionID }, parts: [{ type: "text", text: latest.text }] }
      const recalled = { message: { id: latest.id, sessionID: event.sessionID }, parts: [{ type: "text", text: latest.text }] }
      const injection = createSessionInject({ config, sessionManager: manager })
      try {
        await injection.injectSessionContext(input, output)
        await recall.injectRelevantMemories(input, recalled)
      } catch (error) { log("WARN", "recall", "Context recall failed", { error: String(error?.message ?? error) }) }
      const extra = [...output.parts, ...recalled.parts].filter((part) => part.synthetic && typeof part.text === "string")
      for (const part of extra.toReversed()) if (!event.system.some((item) => item.type === "text" && item.text === part.text))
        event.system.push({ type: "text", text: part.text })
      const repo = repository.getRepoSystemPrompt()
      if (repo && !event.system.some((item) => item.type === "text" && item.text === repo)) event.system.push({ type: "text", text: repo })
    })
    const compaction = await ctx.session.hook("compaction", async (event) => {
      if (await consumeCanonical(event.sessionID)) await manager.flushSession(event.sessionID, { commit: true, reason: "session.compacting" })
    })
    const before = await ctx.tool.hook("execute.before", (event) => uriGuard({ tool: event.tool, args: event.input }, { args: event.input }))
    const after = lexical ? await ctx.tool.hook("execute.after", (event) => {
      if (event.status !== "completed") return
      const name = normalizeToolName(event.tool)
      if (/openviking/i.test(name) && /\b(write|edit|forget|add_resource|remember)\b/i.test(name)) lexical.markInvalid(`explicit-openviking-write:${name}`)
    }) : undefined
    const mcp = config.mcp?.enabled ? await ctx.mcp.transform((editor) => {
      if (editor.get("openviking")?.disabled === true) return
      const timeout = Math.max(90000, Number(config.mcp.timeoutMs) || Number(config.timeoutMs) || 120000)
      editor.set("openviking", { type: "local", command: ["node", `${pluginRoot}/servers/mcp-proxy.mjs`], timeout: { startup: timeout, catalog: timeout, execution: timeout } })
    }) : undefined
    const subscriber = (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          const sessionID = event.data?.sessionID
          // The event subscriber is outside interactive context/tool hooks.
          // A bounded local enqueue failure cannot block the model turn.
          observeCandidate(event)
          if (process.env.PHASE_B_OV_EVENT_TRACE) appendFileSync(process.env.PHASE_B_OV_EVENT_TRACE, `${JSON.stringify({ type: event.type, session: Boolean(sessionID) })}\n`)
          if (!sessionID) continue
          try {
            if (event.type === "session.idle" || event.type === "session.execution.succeeded" || event.type === "session.execution.failed" || event.type === "session.execution.interrupted") {
              if (await consumeCanonical(sessionID)) await manager.handleEvent({ type: "session.idle", properties: { sessionID } })
              if (process.env.PHASE_B_OV_REPEAT_CAPTURE === "1" && await consumeCanonical(sessionID))
                await manager.handleEvent({ type: "session.idle", properties: { sessionID } })
            } else if (event.type === "session.compacted" && owned.has(sessionID)) {
              await consumeCanonical(sessionID)
              await manager.handleEvent({ type: "session.compacted", properties: { sessionID } })
            } else if (event.type === "session.deleted" && owned.has(sessionID)) {
              await manager.handleEvent({ type: "session.deleted", properties: { sessionID } })
              owned.delete(sessionID)
            }
          } catch (error) { log("ERROR", "event", "Canonical OpenViking capture failed closed", { type: event.type, sessionID, error: String(error?.message ?? error) }) }
        }
      } catch (error) { if (!controller.signal.aborted) log("ERROR", "event", "OpenViking event subscriber failed", { error: String(error?.message ?? error) }) }
    })()
    return async () => {
      stopped = true
      controller.abort()
      await Promise.allSettled([subscriber, context.dispose(), compaction.dispose(), before.dispose(), after?.dispose(), mcp?.dispose()])
      await manager.flushAll({ commit: true })
    }
  },
}
