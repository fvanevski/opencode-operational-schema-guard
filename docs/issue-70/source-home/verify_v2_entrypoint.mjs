#!/usr/bin/env node
// Offline stock-V2 entrypoint shape check. The caller supplies an isolated
// packages directory containing sibling openviking-v2 and openviking-context-v4.
// No OpenCode server, model, Graphiti, or gate is started here.
import { realpathSync, statSync } from "node:fs"
import { join, isAbsolute, resolve, sep } from "node:path"
import { pathToFileURL } from "node:url"

const rootArg = process.argv[2]
if (!rootArg || !isAbsolute(rootArg)) {
  console.error("usage: node verify_v2_entrypoint.mjs /absolute/disposable/packages")
  process.exit(64)
}
const root = realpathSync(resolve(rootArg))
const realFile = (rel) => {
  const path = realpathSync(join(root, rel))
  if (!path.startsWith(root + sep) || !statSync(path).isFile()) {
    throw new Error("source escaped disposable package root: " + rel)
  }
  return path
}
try {
  const candidate = realFile("openviking-v2/index.mjs")
  // The V2 sibling dependency is a library: openviking-v2/index.mjs imports
  // these ten context-v4 lib modules (its V1 root entry is retired as
  // index.mjs.v1-retired and is not part of the V2 import graph).
  for (const rel of [
    "openviking-context-v4/lib/config.mjs",
    "openviking-context-v4/lib/utils.mjs",
    "openviking-context-v4/lib/memory-recall.mjs",
    "openviking-context-v4/lib/memory-session.mjs",
    "openviking-context-v4/lib/repo-context.mjs",
    "openviking-context-v4/lib/session-inject.mjs",
    "openviking-context-v4/lib/viking-uri-guard.mjs",
    "openviking-context-v4/lib/shared/hybrid-lexical.mjs",
    "openviking-context-v4/lib/shared/hybrid-recall.mjs",
    "openviking-context-v4/lib/shared/uri-guard.mjs",
  ]) realFile(rel)
  const module = await import(pathToFileURL(candidate).href)
  if (module?.default?.id !== "local.openviking-v2" ||
      typeof module.default.setup !== "function") {
    throw new Error("stock V2 plugin id/setup export contract mismatch")
  }
  console.log(JSON.stringify({
    result: "PASS",
    mode: "offline_module_import_only",
    plugin_id: module.default.id,
    sibling_imports_present: true,
    runtime_hooks_exercised: false,
    inference_executed: false,
  }))
} catch (error) {
  console.error(JSON.stringify({
    result: "FAIL",
    mode: "offline_module_import_only",
    error: String(error?.message ?? error),
  }))
  process.exitCode = 1
}
