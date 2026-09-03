import { unwrapLiveConfig } from "./lib/context-policy.mjs"
import { createOperationGuard, policyFromConfig, policyWithContextFailure } from "./lib/operation-guard.mjs"

export async function OperationalSchemaGuardPlugin({ client, directory }) {
  let policy = null
  let failureError = null

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

  const guard = createOperationGuard({
    client,
    directory,
    policy: policyProxy,
    stateDirectory: "/home/filip/.local/share/opencode/operational-schema-v5/workspaces",
  })

  return {
    ...guard,

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

    "chat.message": async (input, output) => {
      await resolvePolicy()
      return guard["chat.message"]?.(input, output)
    },

    "chat.params": async (input, output) => {
      await resolvePolicy()
      return guard["chat.params"]?.(input, output)
    },

    "experimental.chat.system.transform": async (input, output) => {
      await resolvePolicy()
      return guard["experimental.chat.system.transform"]?.(input, output)
    },

    "experimental.session.compacting": async (input, output) => {
      await resolvePolicy()
      return guard["experimental.session.compacting"]?.(input, output)
    },

    "tool.execute.before": async (input, output) => {
      await resolvePolicy()
      return guard["tool.execute.before"]?.(input, output)
    },

    "tool.execute.after": async (input, output) => {
      await resolvePolicy()
      return guard["tool.execute.after"]?.(input, output)
    },

    event: async (input) => {
      await resolvePolicy()
      return guard.event?.(input)
    },

    dispose: async () => {
      policy = null
      failureError = null
      await guard.dispose?.()
    },
  }
}

export default OperationalSchemaGuardPlugin
