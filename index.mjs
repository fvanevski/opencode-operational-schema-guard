import { unwrapLiveConfig } from "./lib/context-policy.mjs"
import { createOperationGuard, policyFromConfig, policyWithContextFailure } from "./lib/operation-guard.mjs"

export async function OperationalSchemaGuardPlugin({ client, directory }) {
  let policy
  try {
    if (!client?.config?.get) throw new Error("client.config.get() is unavailable")
    const config = unwrapLiveConfig(await client.config.get())
    policy = policyFromConfig(config)
  } catch (error) {
    policy = policyWithContextFailure(error)
  }
  return createOperationGuard({
    client,
    directory,
    policy,
    stateDirectory: "/home/filip/.local/share/opencode/operational-schema-v5/workspaces",
  })
}

export default OperationalSchemaGuardPlugin
