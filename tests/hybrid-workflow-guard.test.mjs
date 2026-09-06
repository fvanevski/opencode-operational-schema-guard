import { spawnSync } from "node:child_process"
import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import {
  buildReceipt,
  commandFingerprint,
  validateDispatchInput,
  validateProfile,
} from "../lib/actions-evidence.mjs"
import { createOperationGuard } from "../lib/operation-guard.mjs"

const HEAD = "a".repeat(40)
const BASE = "b".repeat(40)
const CONTROLLER = "c".repeat(40)
const ACTIONS_PROFILE = validateProfile(JSON.parse(await readFile(new URL("../evidence/profiles/repository-final-v1.json", import.meta.url), "utf8")))

async function message(hooks, sessionID, agent, text) {
  await hooks["chat.message"]({ sessionID, agent }, { message: {}, parts: [{ type: "text", text }] })
}

async function register(hooks, sessionID, agent) {
  await hooks["chat.message"]({ sessionID, agent }, { message: {}, parts: [] })
}

async function before(hooks, sessionID, callID, tool, args = {}) {
  const output = { args }
  await hooks["tool.execute.before"]({ sessionID, callID, tool }, output)
  return output
}

async function after(hooks, sessionID, callID, tool, args = {}, output = {}) {
  const result = { title: "", output: "", metadata: {}, ...output }
  await hooks["tool.execute.after"]({ sessionID, callID, tool, args }, result)
  return result
}

function taskArgs(role) {
  return {
    subagent_type: role,
    description: role === "fresh-review" ? "Review the bounded changed files" : "Run the bounded implementation gates",
    prompt: role === "fresh-review"
      ? "Scope: changed implementation\nTargets:\n- src/a.py\n- src/b.py\n- src/c.py\nQuestions:\n- Is the bounded change correct?\nStop condition: all listed targets are reviewed."
      : "Scope: changed implementation gates\nQuestions:\n- Do both required gates pass?\nStop condition: both command results are reported.",
  }
}

async function editThree(hooks, sessionID) {
  for (const [index, path] of ["src/a.py", "src/b.py", "src/c.py"].entries()) {
    await before(hooks, sessionID, `edit-${index}`, "edit", { filePath: path })
  }
}

async function completeVerify(hooks, parentSession, childSession, callID = "verify") {
  const args = taskArgs("verify")
  const preflight = await before(hooks, parentSession, callID, "task", args)
  await register(hooks, childSession, "verify")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: childSession, role: "assistant", finish: "stop" } } } })
  return after(hooks, parentSession, callID, "task", preflight.args, {
    output: "COMMANDS_REQUIRED: 2\nOPERATIONAL_RESULT: PASS\nCOMMANDS_RUN: 2",
    metadata: { sessionId: childSession },
  })
}

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false })
  assert.equal(result.status, 0, result.stderr)
  return String(result.stdout ?? "").trim()
}

async function gitFixture(prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  git(directory, "init", "-q")
  git(directory, "config", "user.email", "issue15@example.invalid")
  git(directory, "config", "user.name", "Issue 15 Fixture")
  return directory
}

function actionsExecution() {
  return {
    schema_version: "ghdev-actions-execution-v1",
    repository: "fvanevski/opencode-operational-schema-guard",
    pr_number: 24,
    expected_base_sha: BASE,
    observed_base_sha_initial: BASE,
    expected_head_sha: HEAD,
    observed_head_sha_initial: HEAD,
    observed_controller_sha_initial: CONTROLLER,
    observed_candidate_head_initial: HEAD,
    observed_candidate_head_final: HEAD,
    controller_workflow_path: ".github/workflows/ghdev-verify.yml",
    controller_workflow_ref: "refs/heads/main",
    controller_commit_sha: CONTROLLER,
    profile_id: ACTIONS_PROFILE.profile_id,
    profile_version: ACTIONS_PROFILE.profile_version,
    command_fingerprint: commandFingerprint(ACTIONS_PROFILE),
    candidate_fingerprints: Object.fromEntries(ACTIONS_PROFILE.candidate_fingerprint_paths.map((path) => [path, "MISSING"])),
    runner_class: "self-hosted-supported-linux",
    runner_labels: ACTIONS_PROFILE.runner.labels,
    environment: {
      image_fingerprint: "f".repeat(64),
      image_schema: "ghdev-runner-image-v2",
      image_id: "fixture",
      base_image_digest: `sha256:${"1".repeat(64)}`,
      actions_runner_version: "2.337.0",
      git_version: "git version 2.43.0",
      node_version: "v22.23.2",
      npm_version: "10.9.8",
      python_version: "Python 3.12.3",
      bwrap_version: "bubblewrap 0.9.0",
      os_id: "ubuntu",
      os_version_id: "24.04",
      os_release_fingerprint: "2".repeat(64),
      git_sha256: "3".repeat(64),
      node_sha256: "4".repeat(64),
      npm_sha256: "5".repeat(64),
      python_sha256: "6".repeat(64),
      bwrap_sha256: "7".repeat(64),
      sandbox: "bubblewrap-no-network-v1",
      network: "unshared",
      candidate_mount: "read-only",
      candidate_environment: "clearenv-allowlist",
    },
    commands_required: ACTIONS_PROFILE.commands.length,
    commands_run: ACTIONS_PROFILE.commands.length,
    per_command_exit: ACTIONS_PROFILE.commands.map((command) => ({ id: command.id, exit: 0, signal: null })),
    npm_test_count: 10,
    npm_test_pass: 10,
    npm_test_fail: 0,
    npm_test_skip: 0,
    worktree_clean_final: true,
    workspace_cleanup_final: true,
    execution_identity: "run:123:executor:attempt:1",
    block_reason: null,
    result: "PASS",
  }
}

function actionsReceipt() {
  const dispatch = validateDispatchInput({
    pr_number: 24,
    expected_base_sha: BASE,
    expected_head_sha: HEAD,
    expected_controller_sha: CONTROLLER,
    profile: ACTIONS_PROFILE.profile_id,
  })
  return buildReceipt({
    execution: actionsExecution(),
    profile: ACTIONS_PROFILE,
    dispatch,
    observedBaseFinal: BASE,
    observedHeadFinal: HEAD,
    observedControllerFinal: CONTROLLER,
    workflowRunId: 123,
    workflowRunAttempt: 1,
    executionArtifactId: 456,
    receiptArtifactName: "ghdev-receipt-live-planner-fixture",
  })
}

test("deterministic Task planner partitions complexity before child launch", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/issue15-planner", env: {} })
  await message(hooks, "parent", "build", `HEAD_SHA: ${HEAD}`)
  const targets = Array.from({ length: 7 }, (_, index) => `- lib/target-${index}.mjs`).join("\n")
  await assert.rejects(
    () => before(hooks, "parent", "large-review", "task", {
      subagent_type: "fresh-review",
      description: "Review the bounded changed files",
      prompt: `Scope: review seven production targets\nQuestions:\n- Are the changed invariants correct?\nStop condition: all targets are reviewed.\nTargets:\n${targets}`,
    }),
    /PARTITION_REQUIRED.*deterministic-complexity-partition.*target_paths/s,
  )
})

test("deterministic Task planner refuses excess questions without deferring them", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/issue15-question-plan", env: {} })
  await message(hooks, "parent", "build", `HEAD_SHA: ${HEAD}`)
  await assert.rejects(
    () => before(hooks, "parent", "questions", "task", {
      subagent_type: "explore",
      description: "Inspect bounded unknown flow",
      prompt: "Scope: inspect one unknown flow\nQuestions:\n- q1\n- q2\n- q3\n- q4\nStop condition: all questions are answered.\nTargets:\n- lib/a.mjs",
    }),
    /UNREPRESENTABLE.*question-count-exceeds-three/s,
  )
})

test("bounded Task records deterministic planning provenance when exact authority is declared", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/issue15-planner-ready", env: {} })
  await message(hooks, "parent", "build", `HEAD_SHA: ${HEAD}`)
  const args = taskArgs("verify")
  const preflight = await before(hooks, "parent", "verify-plan", "task", args)
  await register(hooks, "verify-plan-child", "verify")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "verify-plan-child", role: "assistant", finish: "stop" } } } })
  const result = await after(hooks, "parent", "verify-plan", "task", preflight.args, {
    output: "OPERATIONAL_RESULT: PASS; COMMANDS_RUN: 1; COMMANDS_REQUIRED: 1",
    metadata: { sessionId: "verify-plan-child" },
  })
  assert.equal(result.metadata.operationalSchema.planning.status, "READY")
  assert.equal(result.metadata.operationalSchema.planning.coverage.unique_complete, true)
})

test("live Verify planning consumes a user-pinned trusted Actions receipt and elides the duplicate child", async () => {
  const materialRoot = "/tmp/opencode/verify/materials"
  await mkdir(materialRoot, { recursive: true })
  const materialDirectory = await mkdtemp(join(materialRoot, "/issue15-actions-reuse-"))
  try {
    const receipt = actionsReceipt()
    const evidencePath = join(materialDirectory, "receipt.json")
    await writeFile(evidencePath, `${JSON.stringify({ schema_version: "ghdev-actions-plan-evidence-v1", receipt, profile: ACTIONS_PROFILE })}\n`)
    const hooks = createOperationGuard({ directory: "/tmp/issue15-actions-reuse", env: {} })
    await message(hooks, "parent", "build", `HEAD_SHA: ${HEAD}\nTRUSTED ACTIONS RECEIPT: head=${HEAD}; sha256=${receipt.receipt_sha256}`)
    await assert.rejects(
      () => before(hooks, "parent", "verify-actions", "task", {
        subagent_type: "verify",
        description: "Consume exact trusted repository Verify evidence",
        prompt: `Scope: repository-final deterministic Verify evidence\nQuestions:\n- Is the equivalent trusted Actions receipt current?\nStop condition: stop when exact evidence equivalence is decided.\nEvidence: ${evidencePath}`,
      }),
      /already satisfied.*HONOR_TRUSTED_ACTIONS_EVIDENCE/s,
    )
  } finally {
    await rm(materialDirectory, { recursive: true, force: true })
  }
})

test("trusted-actions Verify authority removes only the pre-publication local repository-final gate", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/issue15-actions-publish", env: {} })
  await message(hooks, "parent", "build", "SEMANTIC REVIEW AUTHORITY: central-owned\nREPOSITORY VERIFY AUTHORITY: trusted-actions")
  await editThree(hooks, "parent")
  await assert.doesNotReject(() => before(hooks, "parent", "commit-actions-owned", "bash", { command: "git commit -m issue15" }))
  const output = { context: [] }
  await hooks["experimental.session.compacting"]({ sessionID: "parent" }, output)
  assert.match(output.context.join("\n"), /Repository Verify authority: trusted-actions/)
})

test("live planner derives exact diff and hunk complexity instead of treating rewritten targets as zero-diff", async () => {
  const directory = await gitFixture("issue15-live-diff-")
  try {
    await mkdir(join(directory, "lib"), { recursive: true })
    const target = join(directory, "lib", "oversized.mjs")
    await writeFile(target, "export const before = 1\n")
    git(directory, "add", "lib/oversized.mjs")
    git(directory, "commit", "-qm", "base")
    const base = git(directory, "rev-parse", "HEAD")
    await writeFile(target, Array.from({ length: 20000 }, (_, index) => `export const value${index} = ${index}\n`).join(""))
    const hooks = createOperationGuard({ directory, env: {} })
    await message(hooks, "parent", "build", `HEAD_SHA: ${base}\nEXPECTED_BASE_SHA: ${base}`)
    await assert.rejects(
      () => before(hooks, "parent", "rewritten-review", "task", {
        subagent_type: "fresh-review",
        description: "Review the bounded rewritten target",
        prompt: "Scope: review rewritten production target\nQuestions:\n- Is the rewrite correct?\nStop condition: the listed target is reviewed.\nTargets:\n- lib/oversized.mjs",
      }),
      /UNREPRESENTABLE.*single-target-complexity-exceeds-role-limit/s,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("canonical Explore partitions returned by preflight are admitted on exact retry", async () => {
  const directory = await gitFixture("issue15-explore-partition-")
  try {
    await mkdir(join(directory, "lib"), { recursive: true })
    const targetLines = []
    for (let index = 0; index < 6; index += 1) {
      const relative = `lib/target-${index}.mjs`
      targetLines.push(`- ${relative}`)
      await writeFile(join(directory, relative), "x".repeat(120000))
    }
    git(directory, "add", "lib")
    git(directory, "commit", "-qm", "base")
    const base = git(directory, "rev-parse", "HEAD")
    const hooks = createOperationGuard({ directory, env: {} })
    await message(hooks, "parent", "build", `HEAD_SHA: ${base}\nEXPECTED_BASE_SHA: ${base}`)
    let firstError
    try {
      await before(hooks, "parent", "broad-explore", "task", {
        subagent_type: "explore",
        description: "Summarize the bounded listed files",
        prompt: `Scope: Summarize the listed files\nQuestions:\n- What do the listed files contain?\nStop condition: all listed files are summarized.\nTargets:\n${targetLines.join("\n")}`,
      })
    } catch (error) {
      firstError = error
    }
    assert.ok(firstError)
    const match = firstError.message.match(/deterministic planner returned PARTITION_REQUIRED: (\{.*\}) OPERATIONAL_PACKET_ACTION:/s)
    assert.ok(match, firstError.message)
    const details = JSON.parse(match[1])
    assert.ok(details.partitions.length > 1)
    await assert.doesNotReject(() => before(hooks, "parent", "partition-explore", "task", {
      subagent_type: "explore",
      description: "Inspect canonical planner partition",
      prompt: details.partitions[0].packet,
    }))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("central-owned semantic review deterministically elides local Fresh-review", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/issue15-central-review", env: {} })
  await message(hooks, "parent", "build", "SEMANTIC REVIEW AUTHORITY: central-owned")
  await assert.rejects(
    () => before(hooks, "parent", "fresh", "task", taskArgs("fresh-review")),
    /central-owned.*NOT_EVALUATED.*HONOR_SEMANTIC_REVIEW_AUTHORITY/s,
  )

  await message(hooks, "parent", "build", "SEMANTIC REVIEW AUTHORITY: local-fresh-review")
  await assert.doesNotReject(() => before(hooks, "parent", "fresh-local", "task", taskArgs("fresh-review")))
})

test("central-owned mode removes only the local review publish gate and preserves Verify", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/issue15-central-publish", env: {} })
  await message(hooks, "parent", "build", "SEMANTIC REVIEW AUTHORITY: central-owned")
  await editThree(hooks, "parent")

  await assert.rejects(
    () => before(hooks, "parent", "commit-before-verify", "bash", { command: "git commit -m issue15" }),
    /require a PASS Verify/,
  )

  const verify = await completeVerify(hooks, "parent", "verify-child")
  assert.equal(verify.metadata.operationalSchema.complete, true)
  assert.equal(verify.metadata.operationalSchema.outcome, "pass")
  assert.ok(verify.metadata.operationalSchema.terminalNormalizations.includes("multiline-fields"))
  assert.ok(verify.metadata.operationalSchema.terminalNormalizations.includes("field-order-normalized"))

  await assert.doesNotReject(() => before(hooks, "parent", "commit-after-verify", "bash", { command: "git commit -m issue15" }))
})

test("local-fresh-review mode preserves the strict Fresh-review publish gate", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/issue15-local-review", env: {} })
  await message(hooks, "parent", "build", "SEMANTIC REVIEW AUTHORITY: local-fresh-review")
  await editThree(hooks, "parent")
  await completeVerify(hooks, "parent", "verify-child-local")
  await assert.rejects(
    () => before(hooks, "parent", "commit", "bash", { command: "git commit -m issue15" }),
    /require a CLEAN fresh-review/,
  )
})

test("semantic-review authority is included in compaction continuity without fabricating local CLEAN", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/issue15-compaction", env: {} })
  await message(hooks, "parent", "build", "SEMANTIC REVIEW AUTHORITY: central-owned")
  const output = { context: [] }
  await hooks["experimental.session.compacting"]({ sessionID: "parent" }, output)
  const context = output.context.join("\n")
  assert.match(context, /Semantic review authority: central-owned/)
  assert.match(context, /local semantic review: NOT_EVALUATED/)
  assert.doesNotMatch(context, /local semantic review: CLEAN/)
})
