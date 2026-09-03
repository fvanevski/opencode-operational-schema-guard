import { unwrapLiveConfig } from "./lib/context-policy.mjs"
import { createOperationGuard, policyFromConfig } from "./lib/operation-guard.mjs"

export async function OperationalSchemaGuardPlugin({ client, directory }) {
  if (!client?.config?.get) throw new Error("Operational schema guard initialization failed: client.config.get() is unavailable")
  const config = unwrapLiveConfig(await client.config.get())
  const policy = policyFromConfig(config)
  return createOperationGuard({
    client,
    directory,
    policy,
    stateDirectory: "/home/filip/.local/share/opencode/operational-schema-v5/workspaces",
  })
}

export default OperationalSchemaGuardPlugin
