import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const workflow = await readFile(new URL("../.github/workflows/ghdev-verify.yml", import.meta.url), "utf8")
const controller = await readFile(new URL("../scripts/ghdev-actions-controller.mjs", import.meta.url), "utf8")
const executor = await readFile(new URL("../scripts/ghdev-actions-executor.mjs", import.meta.url), "utf8")
const publisher = await readFile(new URL("../scripts/ghdev-actions-publisher.mjs", import.meta.url), "utf8")

test("evidence workflow is dispatch-only and never uses pull_request_target", () => {
  assert.match(workflow, /\bon:\n\s+workflow_dispatch:/)
  assert.doesNotMatch(workflow, /^\s*pull_request(?:_target)?:/m)
  assert.doesNotMatch(workflow, /pull_request_target/)
})

test("self-hosted routing is same-repo-controller-gated and exact-head checkout is explicit", () => {
  assert.match(workflow, /needs: controller/)
  assert.match(workflow, /runs-on: \[self-hosted, Linux, X64, ghdev-verify\]/)
  assert.match(workflow, /ref: \$\{\{ inputs\.expected_head_sha \}\}/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /ghdev-actions-controller\.mjs"? recheck/)
})

test("candidate executor cannot publish statuses and publisher is a separate job", () => {
  const executorBlock = workflow.match(/\n  executor:\n([\s\S]*?)\n  publisher:\n/)?.[1] ?? ""
  const publisherBlock = workflow.match(/\n  publisher:\n([\s\S]*)$/)?.[1] ?? ""
  assert.ok(executorBlock)
  assert.ok(publisherBlock)
  assert.doesNotMatch(executorBlock, /statuses:\s*write/)
  assert.match(publisherBlock, /statuses:\s*write/)
})

test("candidate sandbox clears environment, unshares namespaces, and mounts source read-only", () => {
  assert.match(executor, /"--unshare-all"/)
  assert.match(executor, /"--unshare-user"/)
  assert.match(executor, /"--cap-drop", "ALL"/)
  assert.match(executor, /"--clearenv"/)
  assert.match(executor, /"--ro-bind", candidatePath, "\/workspace"/)
  assert.match(executor, /candidate_environment: "clearenv-allowlist"/)
  assert.match(executor, /network: "unshared"/)
})

test("self-certification census is derived from immutable expected-base and expected-head Git trees", () => {
  assert.doesNotMatch(controller, /\/pulls\/\$\{prNumber\}\/files/)
  assert.match(controller, /githubJson\(`\/git\/commits\/\$\{commitSha\}`\)/)
  assert.match(controller, /githubJson\(`\/git\/trees\/\$\{treeSha\}\?recursive=1`\)/)
  assert.match(controller, /response\.truncated === true/)
  assert.match(controller, /changedPaths\(dispatch\.expected_base_sha, dispatch\.expected_head_sha\)/)
})

test("candidate checkout happens only after the self-hosted remote recheck", () => {
  const recheck = workflow.indexOf("Revalidate canonical PR identity immediately before execution")
  const checkout = workflow.indexOf("Checkout exact candidate head")
  const execute = workflow.indexOf("Execute exact profile in Bubblewrap isolation")
  assert.ok(recheck >= 0 && checkout > recheck && execute > checkout)
})

test("immutable receipt artifact is published before the final exact-head status", () => {
  const build = workflow.indexOf("Revalidate and build typed receipt")
  const upload = workflow.indexOf("Upload immutable typed receipt")
  const status = workflow.indexOf("Revalidate and publish exact-head status after artifact publication")
  assert.ok(build >= 0 && upload > build && status > upload)
})

test("executor resets the dedicated workspace parent and removes it after the job", () => {
  assert.match(workflow, /rm -rf -- "\$GHDEV_RUN_PARENT"/)
  assert.match(workflow, /mkdir -p -- "\$GHDEV_RUN_PARENT"/)
  assert.match(workflow, /test ! -L "\$GHDEV_RUN_PARENT"/)
  assert.match(workflow, /rm -rf -- "\$GHDEV_RUN_PARENT" "\$GHDEV_EXECUTION_DIR"/)
  assert.match(workflow, /test ! -e "\$GHDEV_RUN_PARENT"/)
  assert.match(workflow, /test ! -e "\$GHDEV_EXECUTION_DIR"/)
})

test("all reusable third-party Actions are pinned to full commit SHAs", () => {
  const uses = [...workflow.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1])
  assert.ok(uses.length >= 4)
  for (const use of uses) assert.match(use, /^[^@]+@[0-9a-f]{40}$/)
})

test("dispatch strings enter shell commands only through environment variables", () => {
  assert.doesNotMatch(workflow, /--pr-number [^\n]*\$\{\{ inputs\./)
  assert.doesNotMatch(workflow, /--expected-(?:base|head|controller)-sha [^\n]*\$\{\{ inputs\./)
  assert.doesNotMatch(workflow, /--profile [^\n]*\$\{\{ inputs\./)
  assert.match(workflow, /GHDEV_INPUT_PR_NUMBER: \$\{\{ inputs\.pr_number \}\}/)
})

test("controller freshness is revalidated before execution and again by the publisher", () => {
  assert.match(workflow, /observed_controller_sha/)
  assert.match(workflow, /Revalidate and build typed receipt/)
  assert.match(workflow, /Revalidate and publish exact-head status after artifact publication/)
})

test("candidate command output is file-backed and bounded independently of spawn buffers", () => {
  assert.match(executor, /const COMMAND_TAIL_BYTES = 1024 \* 1024/)
  assert.match(executor, /openSync\(stdoutPath, "wx", 0o600\)/)
  assert.match(executor, /openSync\(stderrPath, "wx", 0o600\)/)
  assert.match(executor, /stdio: \["ignore", stdoutFd, stderrFd, "pipe"\]/)
  assert.match(executor, /candidateCommandOutput\(\["\/usr\/bin\/bwrap"/)
  assert.match(executor, /if \(run\.error\)/)
  assert.match(executor, /block_reason = "COMMAND_SPAWN_ERROR"/)
})

test("Bubblewrap child-start handshake precedes command accounting and isolation claims", () => {
  assert.match(executor, /"--json-status-fd", "3"/)
  assert.match(executor, /parseSandboxStatus\(run\.output\?\.\[3\]\)/)
  const childProof = executor.indexOf("if (!sandboxStatus.child_started)")
  const environmentProof = executor.indexOf('record.environment.network = "unshared"')
  const commandAccounting = executor.indexOf("record.commands_run += 1")
  assert.ok(childProof >= 0 && environmentProof > childProof && commandAccounting > environmentProof)
  assert.match(executor, /never reached sandbox child startup/)
  assert.match(executor, /block_reason = "SETUP_OR_ISOLATION_ERROR"/)
})

test("publisher prioritizes final source movement as STALE over a simultaneous PR closure", () => {
  const identityHelper = publisher.match(/function publicationIdentity\([\s\S]*?\n}\n\nasync function buildMode/)?.[0] ?? ""
  assert.ok(identityHelper)
  assert.match(identityHelper, /observedBaseSha !== dispatch\.expected_base_sha \|\| observedHeadSha !== dispatch\.expected_head_sha/)
  assert.match(identityHelper, /if \(sourceMoved\) return \{ result: "STALE", reason: "REMOTE_IDENTITY_CHANGED"/)
  assert.match(publisher, /finalIdentityResult: publication\.result/)
  assert.match(publisher, /const effectiveResult = publication\.result === "PASS" \? receipt\.result : publication\.result/)
})
