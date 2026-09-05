import test from "node:test"
import assert from "node:assert/strict"
import { createOperationGuard } from "../lib/operation-guard.mjs"

const HEAD = "a".repeat(40)

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
  await message(hooks, "parent", "build", `HEAD_SHA: ${HEAD}`)
  await message(hooks, "parent", "build", "SEMANTIC REVIEW AUTHORITY: local-fresh-review")
  await editThree(hooks, "parent")
  const verify = await completeVerify(hooks, "parent", "verify-child-local")
  assert.equal(verify.metadata.operationalSchema.planning.status, "READY")
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
