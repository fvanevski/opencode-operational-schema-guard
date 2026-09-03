#!/usr/bin/env node
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const tests = [
  "tests/operation-guard.test.mjs",
  "tests/context-policy.test.mjs",
  "tests/target-lifecycle-guard.test.mjs",
  "tests/target-lifecycle-after-boundary.test.mjs",
  "tests/target-terminal-exit-contract.test.mjs",
  "tests/todo-ledger.test.mjs",
  "tests/verify-disposable.test.mjs",
  "tests/verify-manifest.test.mjs",
  "tests/local-agent-assessment.test.mjs",
  "tests/owner-base-reconciliation.test.mjs",
  "tests/repo-pr-assessment.test.mjs",
  "tests/repository-owned-assessment.test.mjs",
  "tests/workspace-identity.test.mjs",
  "tests/config-contract.test.mjs",
  "tests/export-session-safe.test.mjs",
  "tests/session-trace-assessment.test.mjs",
]
const child = spawn(process.execPath, ["--test", "--test-reporter=tap", ...tests], { cwd: root, stdio: "inherit", shell: false })
child.on("error", (error) => {
  process.stderr.write(`OPERATIONAL_PLUGIN_TEST_RESULT: BLOCKED; ${error.message}\n`)
  process.exit(2)
})
child.on("exit", (code, signal) => {
  if (code === 0) process.stdout.write("OPERATIONAL_PLUGIN_TEST_RESULT: PASS\n")
  else process.stderr.write(`OPERATIONAL_PLUGIN_TEST_RESULT: FAIL; exit=${code ?? "signal"}; signal=${signal ?? "none"}\n`)
  process.exit(code ?? 1)
})
