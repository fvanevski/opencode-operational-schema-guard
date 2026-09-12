import { isAbsolute, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { unwrapLiveConfig } from "./lib/context-policy.mjs"
import { createOperationGuard, policyFromConfig, policyWithContextFailure } from "./lib/operation-guard.mjs"

const PLUGIN_ROOT = fileURLToPath(new URL(".", import.meta.url))
const DEFAULT_STATE_DIRECTORY = "/home/filip/.local/share/opencode/operational-schema-v5/workspaces"

function normalizedAuthoritativeDirectory(value) {
  if (typeof value !== "string" || !value.trim() || !isAbsolute(value)) return undefined
  return resolve(value)
}

function eventSessionID(event) {
  const properties = event?.properties
  return properties?.sessionID
    ?? properties?.sessionId
    ?? properties?.info?.sessionID
    ?? properties?.info?.sessionId
    ?? properties?.info?.id
    ?? properties?.part?.sessionID
    ?? properties?.part?.sessionId
}

function eventSessionDirectory(event) {
  return normalizedAuthoritativeDirectory(event?.properties?.info?.directory ?? event?.properties?.directory)
}

function unwrapSessionInfo(response) {
  return response?.data && typeof response.data === "object" ? response.data : response
}

export async function OperationalSchemaGuardPlugin({ client, directory, stateDirectory = DEFAULT_STATE_DIRECTORY }) {
  const fallbackDirectory = resolve(directory ?? process.cwd())
  let policy = null
  let failureError = null
  const guards = new Map()
  const sessionRoutes = new Map()
  const callRoutes = new Map()
  const directoryNotices = new Map()

  async function resolvePolicy() {
    if (policy) return policy
    if (failureError) {
      policy = policyWithContextFailure(failureError)
      return policy
    }
    try {
      if (!client?.config?.get) {
        throw new Error("client.config.get() is unavailable")
      }
      const response = await client.config.get()
      const unwrapped = unwrapLiveConfig(response)
      policy = policyFromConfig(unwrapped)
    } catch (error) {
      failureError = error
      policy = policyWithContextFailure(error)
    }
    return policy
  }

  const policyProxy = new Proxy({}, {
    get(target, prop) {
      if (!policy) {
        if (failureError) {
          policy = policyWithContextFailure(failureError)
        } else {
          policy = policyWithContextFailure(new Error("client.config.get() is unavailable"))
        }
      }
      return policy[prop]
    },
  })

  function guardForDirectory(governedDirectory) {
    const normalized = resolve(governedDirectory)
    let guard = guards.get(normalized)
    if (!guard) {
      guard = createOperationGuard({
        client,
        directory: normalized,
        policy: policyProxy,
        pluginRoot: PLUGIN_ROOT,
        stateDirectory,
      })
      guards.set(normalized, guard)
    }
    return guard
  }

  async function authoritativeSessionDirectory(sessionID) {
    if (!sessionID || !client?.session?.get) return undefined
    const requests = [
      { sessionID },
      { path: { id: sessionID } },
    ]
    for (const request of requests) {
      try {
        const info = unwrapSessionInfo(await client.session.get(request))
        const governedDirectory = normalizedAuthoritativeDirectory(info?.directory)
        if (governedDirectory) return governedDirectory
      } catch {
        // Try the alternate SDK request shape, then retain the bounded fallback.
      }
    }
    return undefined
  }

  async function transitionSessionRoute(sessionID, governedDirectory, source) {
    const normalized = resolve(governedDirectory)
    const existing = sessionRoutes.get(sessionID)
    if (existing?.directory === normalized) {
      if (source === "session") existing.source = "session"
      return existing
    }

    if (existing) {
      await existing.guard.event?.({ event: { type: "session.deleted", properties: { sessionID } } }).catch(() => {})
      directoryNotices.set(
        sessionID,
        `OPERATIONAL GUARD: authoritative governed directory changed from ${existing.directory} to ${normalized}. Workspace-scoped authority, delegation, review, Verify, lifecycle, and mutation state are rebound to the new governed directory; prior-directory session-local state is not reused.`,
      )
    }

    const route = { directory: normalized, source, guard: guardForDirectory(normalized) }
    sessionRoutes.set(sessionID, route)
    return route
  }

  async function routeForSession(sessionID, { refresh = false, hintedDirectory } = {}) {
    if (!sessionID) {
      return { directory: fallbackDirectory, source: "fallback", guard: guardForDirectory(fallbackDirectory) }
    }

    const hint = normalizedAuthoritativeDirectory(hintedDirectory)
    if (hint) return transitionSessionRoute(sessionID, hint, "session")

    const existing = sessionRoutes.get(sessionID)
    if (refresh || !existing || existing.source !== "session") {
      const authoritative = await authoritativeSessionDirectory(sessionID)
      if (authoritative) return transitionSessionRoute(sessionID, authoritative, "session")
    }
    if (existing) return existing
    return transitionSessionRoute(sessionID, fallbackDirectory, "fallback")
  }

  function callRouteKey(input) {
    return `${String(input?.sessionID ?? "")}\0${String(input?.callID ?? "")}`
  }

  async function routedHook(name, input, output, { refresh = false } = {}) {
    await resolvePolicy()
    const route = await routeForSession(input?.sessionID, { refresh })
    return route.guard[name]?.(input, output)
  }

  return {
    "tool.definition": async (input, output) => {
      return guardForDirectory(fallbackDirectory)["tool.definition"]?.(input, output)
    },

    config: async (config) => {
      if (policy && !failureError) return
      try {
        const unwrapped = unwrapLiveConfig(config)
        policy = policyFromConfig(unwrapped)
      } catch (error) {
        failureError = error
        policy = policyWithContextFailure(error)
      }
    },

    "chat.message": async (input, output) => routedHook("chat.message", input, output, { refresh: true }),

    "chat.params": async (input, output) => routedHook("chat.params", input, output),

    "experimental.chat.system.transform": async (input, output) => {
      await resolvePolicy()
      const route = await routeForSession(input?.sessionID)
      const notice = directoryNotices.get(input?.sessionID)
      if (notice && Array.isArray(output?.system)) {
        output.system.push(notice)
        directoryNotices.delete(input.sessionID)
      }
      return route.guard["experimental.chat.system.transform"]?.(input, output)
    },

    "experimental.session.compacting": async (input, output) => routedHook("experimental.session.compacting", input, output),

    "experimental.compaction.autocontinue": async (input, output) => {
      const route = await routeForSession(input?.sessionID)
      return route.guard["experimental.compaction.autocontinue"]?.(input, output)
    },

    "tool.execute.before": async (input, output) => {
      await resolvePolicy()
      const route = await routeForSession(input?.sessionID)
      await route.guard["tool.execute.before"]?.(input, output)
      callRoutes.set(callRouteKey(input), route)
    },

    "tool.execute.after": async (input, output) => {
      await resolvePolicy()
      const key = callRouteKey(input)
      const route = callRoutes.get(key) ?? await routeForSession(input?.sessionID)
      try {
        return await route.guard["tool.execute.after"]?.(input, output)
      } finally {
        callRoutes.delete(key)
      }
    },

    event: async (input) => {
      await resolvePolicy()
      const event = input?.event
      const sessionID = eventSessionID(event)
      const route = await routeForSession(sessionID, {
        refresh: event?.type === "session.updated" && !eventSessionDirectory(event),
        hintedDirectory: eventSessionDirectory(event),
      })
      await route.guard.event?.(input)
      if (event?.type === "session.deleted" && sessionID) {
        sessionRoutes.delete(sessionID)
        directoryNotices.delete(sessionID)
        for (const key of [...callRoutes.keys()]) {
          if (key.startsWith(`${sessionID}\0`)) callRoutes.delete(key)
        }
      }
    },

    dispose: async () => {
      policy = null
      failureError = null
      sessionRoutes.clear()
      callRoutes.clear()
      directoryNotices.clear()
      for (const guard of guards.values()) await guard.dispose?.()
      guards.clear()
    },
  }
}

export default OperationalSchemaGuardPlugin
