import { createOperationGuard } from "./lib/operation-guard.mjs"

export async function OperationalSchemaGuardPlugin({ client, directory }) {
  return createOperationGuard({
    client,
    directory,
    stateDirectory: "/home/filip/.local/share/opencode/operational-schema-v5/workspaces",
  })
}

export default OperationalSchemaGuardPlugin
