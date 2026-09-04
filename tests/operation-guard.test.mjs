import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { createOperationGuard, DEFAULT_POLICY, EVIDENCE_ASSESSMENT_PATH, extractPaths, normalizeTaskPacket, policyFromConfig, SCHEMA_VERSION, validateChildPlan, validateTaskPacket } from "../lib/operation-guard.mjs"

function taskArgs(overrides = {}) {
  return {
    description: "Map one bounded subsystem",
    prompt: "Scope: request pipeline\nQuestions:\n- Trace one call path.\n- Identify its invariant.\nStop condition: the path and invariant are supported by exact source references.",
    subagent_type: "explore",
    ...overrides,
  }
}

async function register(hooks, sessionID, agent) {
  await hooks["chat.message"]({ sessionID, agent }, { message: {}, parts: [] })
}

async function message(hooks, sessionID, agent, text) {
  await hooks["chat.message"]({ sessionID, agent }, { message: {}, parts: [{ type: "text", text }] })
}

async function system(hooks, sessionID) {
  const output = { system: [] }
  await hooks["experimental.chat.system.transform"]({ sessionID, model: {} }, output)
  return output.system.join("\n")
}

async function systemMessages(hooks, sessionID, seed = []) {
  const output = { system: [...seed] }
  await hooks["experimental.chat.system.transform"]({ sessionID, model: {} }, output)
  return output.system
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

async function taskFailureEvent(hooks, sessionID, callID, error, messageID = `msg-${callID}`) {
  await hooks.event({ event: { type: "message.part.updated", properties: { part: {
    sessionID,
    messageID,
    callID,
    type: "tool",
    tool: "task",
    state: { status: "error", error },
  } } } })
}

function exploreComplete(text, inspected = 1, required = inspected) {
  return `${text}\nOPERATIONAL_EXPLORE: COMPLETE; TARGETS_INSPECTED: ${inspected}; TARGETS_REQUIRED: ${required}`
}

function reviewClean(text, reviewed = 1, required = reviewed) {
  return `${text}\nOPERATIONAL_REVIEW: CLEAN; TARGETS_REVIEWED: ${reviewed}; TARGETS_REQUIRED: ${required}`
}

test("bounded Explore packet is accepted", () => {
  assert.doesNotThrow(() => validateTaskPacket(taskArgs()))
})

test("omnibus Explore packet is rejected by character and section limits", () => {
  assert.throws(() => validateTaskPacket(taskArgs({ prompt: `Scope: one\nQuestions:\n- One\nStop condition: done\n${"x".repeat(4501)}` })), /characters/)
  assert.throws(
    () => validateTaskPacket(taskArgs({ prompt: "Scope: one\nQuestions:\n- One\nStop condition: done\n1. One\n2. Two\n3. Three\n4. Four\n5. Five" })),
    /5 numbered investigative sections/,
  )
})

test("Task packet requires the structured envelope and no more than three questions", () => {
  assert.throws(() => validateTaskPacket(taskArgs({ prompt: "Trace the request." })), /packet envelope/)
  assert.throws(
    () => validateTaskPacket(taskArgs({ prompt: "Scope: one\nQuestions:\n- One\n- Two\n- Three\n- Four\nStop condition: done" })),
    /4 investigative questions/,
  )
  assert.throws(
    () => validateTaskPacket(taskArgs({ prompt: `Scope: ${"x".repeat(501)}\nQuestions:\n- One\nStop condition: done` })),
    /Scope exceeds 500 characters/,
  )
})

test("format-only Task packet defects are normalized without weakening strict validation", () => {
  const crowded = normalizeTaskPacket(taskArgs({ prompt: "Scope: unknown flow\nQuestions:\n- One\n- Two\n- Three\n- Four\n- Five\nStop condition: done\n1. A\n2. B\n3. C\n4. D\n5. E\n6. F" }))
  assert.deepEqual(crowded.normalizations, ["questions-deferred:2", "numbered-sections-normalized:2"])
  assert.match(crowded.args.prompt, /Deferred by operational guard: 2 additional questions/)
  assert.equal((crowded.args.prompt.match(/^\s*-\s+/gm) ?? []).length, 3)
  assert.equal((crowded.args.prompt.match(/^\s*\d+[.)]\s+/gm) ?? []).length, 4)
  assert.doesNotThrow(() => validateTaskPacket(crowded.args))

  const oversized = normalizeTaskPacket(taskArgs({ prompt: `Missing envelope ${"x".repeat(4500)}` }))
  assert.equal(oversized.normalizations.length, 0)
  assert.throws(() => validateTaskPacket(oversized.args), /packet envelope|characters/)
})

test("a bounded non-envelope Task prompt is normalized into the Turn-1 contract", () => {
  const result = normalizeTaskPacket({ subagent_type: "explore", description: "Trace the unknown request flow", prompt: "Inspect the controller flow and return concise evidence." })
  assert.ok(result.normalizations.includes("packet-envelope-inferred"))
  assert.match(result.args.prompt, /^Scope:/)
  assert.match(result.args.prompt, /OPERATIONAL_EXPLORE: COMPLETE\|PARTIAL\|BLOCKED/)
  assert.doesNotThrow(() => validateTaskPacket(result.args))
})

test("Fresh-review normalizes bounded envelope-less prompts beyond the legacy 1200-character cliff", () => {
  const original = `Review only the current diff and return bounded source-review evidence.\n${"bounded review context ".repeat(70)}`
  assert.ok(original.length > 1200)
  const result = normalizeTaskPacket({ subagent_type: "fresh-review", description: "Review the bounded implementation diff", prompt: original })
  assert.ok(result.normalizations.includes("packet-envelope-inferred"))
  assert.ok(result.args.prompt.includes(`Supporting context:\n${original}`))
  assert.match(result.args.prompt, /remain read-only/i)
  assert.match(result.args.prompt, /one bare allowlisted invocation per call/i)
  assert.match(result.args.prompt, /Do not run test or validation suites in Fresh-review/i)
  assert.match(result.args.prompt, /route those gates to Verify/i)
  assert.ok(result.args.prompt.length <= DEFAULT_POLICY.taskPromptChars["fresh-review"])
  assert.doesNotThrow(() => validateTaskPacket(result.args))

  const pathBoundedOriginal = `Review only lib/operation-guard-core.mjs and return source-review findings.\n${"focused implementation context ".repeat(55)}`
  assert.ok(pathBoundedOriginal.length > 1200)
  const pathBounded = normalizeTaskPacket({ subagent_type: "fresh-review", description: "Review one implementation file", prompt: pathBoundedOriginal })
  assert.ok(pathBounded.normalizations.includes("packet-envelope-inferred"))
  assert.ok(pathBounded.args.prompt.includes(`Supporting context:\n${pathBoundedOriginal}`))
  assert.doesNotThrow(() => validateTaskPacket(pathBounded.args))

  const unboundedOriginal = `Review the entire repository, follow every dependency and caller, and inspect anything else necessary before deciding whether it is clean.\n${"open-ended review context ".repeat(55)}`
  assert.ok(unboundedOriginal.length > 1200)
  const unbounded = normalizeTaskPacket({ subagent_type: "fresh-review", description: "Review the bounded implementation diff", prompt: unboundedOriginal })
  assert.ok(!unbounded.normalizations.includes("packet-envelope-inferred"))
  assert.ok(unbounded.args.prompt.startsWith(unboundedOriginal.trimEnd()))
  assert.doesNotMatch(unbounded.args.prompt, /^Scope:/m)
  assert.doesNotMatch(unbounded.args.prompt, /^Questions:/m)
  assert.doesNotMatch(unbounded.args.prompt, /^Stop condition:/m)
  assert.throws(() => validateTaskPacket(unbounded.args), /packet envelope/)

  const shortUnbounded = normalizeTaskPacket({ subagent_type: "fresh-review", description: "Review the bounded implementation diff", prompt: "Review the whole codebase and inspect whatever else is relevant." })
  assert.ok(!shortUnbounded.normalizations.includes("packet-envelope-inferred"))
  assert.throws(() => validateTaskPacket(shortUnbounded.args), /packet envelope/)

  const contradictory = normalizeTaskPacket({ subagent_type: "fresh-review", description: "Review the bounded implementation diff", prompt: "Review the current diff and all dependencies and callers across the codebase." })
  assert.ok(!contradictory.normalizations.includes("packet-envelope-inferred"))
  assert.throws(() => validateTaskPacket(contradictory.args), /packet envelope/)

  const boundedAnything = normalizeTaskPacket({ subagent_type: "fresh-review", description: "Review the bounded implementation diff", prompt: "Review only the current diff and report anything suspicious." })
  assert.ok(boundedAnything.normalizations.includes("packet-envelope-inferred"))
  assert.doesNotThrow(() => validateTaskPacket(boundedAnything.args))

  const openEndedAnything = normalizeTaskPacket({ subagent_type: "fresh-review", description: "Review the bounded implementation diff", prompt: "Review the current diff and inspect anything else necessary." })
  assert.ok(!openEndedAnything.normalizations.includes("packet-envelope-inferred"))
  assert.throws(() => validateTaskPacket(openEndedAnything.args), /packet envelope/)

  const nearLimit = normalizeTaskPacket({ subagent_type: "fresh-review", description: "Bounded review", prompt: "x".repeat(3900) })
  assert.ok(!nearLimit.normalizations.includes("packet-envelope-inferred"))
  assert.throws(() => validateTaskPacket(nearLimit.args), /packet envelope|characters/)

  for (const prompt of [
    "Scope: existing partial envelope without questions or stop condition",
    "Questions:\nSupporting prose without a complete envelope",
    "Targets:\n- lib/operation-guard-core.mjs",
  ]) {
    const partial = normalizeTaskPacket({ subagent_type: "fresh-review", description: "Partial packet", prompt })
    assert.ok(!partial.normalizations.includes("packet-envelope-inferred"))
    assert.throws(() => validateTaskPacket(partial.args), /packet envelope/)
  }
})

test("Fresh-review preserves the 10-target ceiling for explicit and envelope-less packets", () => {
  const admittedTargets = Array.from({ length: 10 }, (_, index) => `lib/f${index}.mjs`)
  const overflowTargets = [...admittedTargets, "lib/f10.mjs"]
  const explicit = (targets) => `Scope: bounded changed-file review\nTargets:\n${targets.map((target) => `- ${target}`).join("\n")}\nQuestions:\n- Is the bounded change safe?\nStop condition: every admitted target is reviewed.`
  assert.doesNotThrow(() => validateTaskPacket(taskArgs({ subagent_type: "fresh-review", prompt: explicit(admittedTargets) })))
  assert.throws(() => validateTaskPacket(taskArgs({ subagent_type: "fresh-review", prompt: explicit(overflowTargets) })), /limit is 10/)

  const admittedEnvelopeLess = normalizeTaskPacket({
    subagent_type: "fresh-review",
    description: "Review the explicitly named files",
    prompt: `Review only ${admittedTargets.join(", ")} and return source-review findings.`,
  })
  assert.ok(admittedEnvelopeLess.normalizations.includes("packet-envelope-inferred"))
  assert.doesNotThrow(() => validateTaskPacket(admittedEnvelopeLess.args))

  const overflowEnvelopeLess = normalizeTaskPacket({
    subagent_type: "fresh-review",
    description: "Review the explicitly named files",
    prompt: `Review only ${overflowTargets.join(", ")} and return source-review findings.`,
  })
  assert.ok(!overflowEnvelopeLess.normalizations.includes("packet-envelope-inferred"))
  assert.throws(() => validateTaskPacket(overflowEnvelopeLess.args), /packet envelope/)
})

test("Task normalization injects a compact type-specific execution and result contract", () => {
  const verify = normalizeTaskPacket(taskArgs({ subagent_type: "verify" }))
  assert.match(verify.args.prompt, /one bare supported invocation per shell call/i)
  assert.match(verify.args.prompt, /OPERATIONAL_RESULT: PASS\|FAIL\|BLOCKED/)
  assert.equal((verify.args.prompt.match(/OPERATIONAL_RESULT:/g) ?? []).length, 1)

  const review = normalizeTaskPacket(taskArgs({ subagent_type: "fresh-review" }))
  assert.match(review.args.prompt, /remain read-only/i)
  assert.match(review.args.prompt, /built-in read\/grep\/glob and allowlisted read-only Git/i)
  assert.match(review.args.prompt, /one bare allowlisted invocation per call/i)
  assert.match(review.args.prompt, /no &&, ;, pipes, redirects, command substitutions, or appended status probes/i)
  assert.match(review.args.prompt, /Do not run test or validation suites in Fresh-review/i)
  assert.match(review.args.prompt, /route those gates to Verify/i)
  assert.match(review.args.prompt, /OPERATIONAL_REVIEW: CLEAN\|FINDINGS\|BLOCKED/)
})

test("Verify accepts a bounded 24-target packet and rejects a 25th target", () => {
  const prompt = (count) => `Scope: changed-file verification\nQuestions:\n- Do the requested gates pass for ${Array.from({ length: count }, (_, index) => `src/f${index}.py`).join(", ")}?\nStop condition: every requested gate has an exit status.`
  assert.doesNotThrow(() => validateTaskPacket(taskArgs({ subagent_type: "verify", prompt: prompt(24) })))
  assert.throws(() => validateTaskPacket(taskArgs({ subagent_type: "verify", prompt: prompt(25) })), /limit is 24/)
})

test("path extraction strips prose punctuation and ignores slash-separated non-path labels", () => {
  const paths = extractPaths("Read /tmp/opencode/verify/i307/commands.md. Do not use --start/--down-after; report passed/failed/skipped.", "/")
  assert.deepEqual([...paths], ["/tmp/opencode/verify/i307/commands.md"])

  const prompt = `Scope: integration gates\nQuestions:\n- Do ${Array.from({ length: 13 }, (_, index) => `tests/integration/f${index}.py`).join(" ")} pass/failed/skipped?\nStop condition: report failures/skips without --start/--down-after.`
  assert.doesNotThrow(() => validateTaskPacket(taskArgs({ subagent_type: "verify", prompt })))
})

test("Verify preflight rejects equivalent commands and redundant owner cleanup", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  const duplicate = taskArgs({
    subagent_type: "verify",
    prompt: "Scope: silent diff gate\nQuestions:\n- Does the gate pass?\nCommands:\nrtk git diff --check HEAD~1..HEAD\ngit diff --check HEAD~1..HEAD\nStop condition: report its exit status.",
  })
  await assert.rejects(() => before(hooks, "parent", "duplicate-plan", "task", duplicate), /repeats an equivalent command/)

  const proseOnly = taskArgs({
    subagent_type: "verify",
    prompt: "Scope: silent diff gates\nQuestions:\n- Gate 1, one bare invocation only: rtk git diff --check HEAD~1..HEAD\n- Gate 2, one bare invocation only: git diff --check HEAD~1..HEAD\nStop condition: report both exit statuses.",
  })
  await assert.doesNotReject(() => before(hooks, "parent", "prose-is-not-a-plan", "task", proseOnly))

  const cleanup = taskArgs({
    subagent_type: "verify",
    prompt: "Scope: owner lifecycle gate\nQuestions:\n- Does integration pass?\nCommands:\n/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-disposable.mjs --namespace smoke --start --down-after -- pytest -q tests/integration\nscripts/disposable-test-services --namespace smoke down\nStop condition: wrapper teardown is reported.",
  })
  await assert.rejects(() => before(hooks, "parent", "cleanup-plan", "task", cleanup), /redundantly requests standalone disposable-service cleanup/)
})

test("Verify preflight inspects only an explicitly referenced typed manifest", async () => {
  await mkdir("/tmp/opencode/verify/manifests", { recursive: true })
  const packet = await mkdtemp("/tmp/opencode/verify/manifests/plan-")
  const manifest = join(packet, "commands.json")
  await writeFile(manifest, JSON.stringify({ schema_version: "opencode-verify-manifest-v1", commands: [{ argv: ["git", "diff", "--check", "HEAD~1..HEAD"] }, { argv: ["git", "diff", "--check", "HEAD~1..HEAD"] }] }))
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  const args = taskArgs({ subagent_type: "verify", prompt: `Scope: manifest gates\nManifest: ${manifest}\nQuestions:\n- Do the gates pass?\nCommands:\n/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-manifest.mjs --manifest ${manifest}\nStop condition: every command has an exit status.` })
  await assert.rejects(() => before(hooks, "parent", "manifest-plan", "task", args), /repeats an equivalent command/)
})

test("Verify ignores ordinary staged material and prose that resembles commands", async () => {
  await mkdir("/tmp/opencode/verify/materials", { recursive: true })
  const material = "/tmp/opencode/verify/materials/tools.json"
  await writeFile(material, "Ruff 0.16.4 (diagnostic header):\nnot a command manifest\n")
  const args = taskArgs({
    subagent_type: "verify",
    prompt: `Scope: inspect cached evidence at ${material}\nTargets:\n- tests/unit\nQuestions:\n- Does the explicit gate pass?\nCommands:\ngit status --short\nStop condition: report the status.`,
  })
  await assert.doesNotReject(() => validateChildPlan(args, "/home/filip/project"))
})

test("explicit Targets isolate target accounting from prose paths and aliases", () => {
  const prosePaths = Array.from({ length: 20 }, (_, index) => `context/example-${index}.py`).join(" ")
  const prompt = `Scope: unknown temporal owner ${prosePaths}\nTargets:\n- resolve: research_store/temporal.py or acquisition/temporal.py\n- src/owner.py\nQuestions:\n- Trace ownership.\nStop condition: both target entries are resolved.`
  assert.doesNotThrow(() => validateTaskPacket(taskArgs({ prompt })))
  const tooMany = `Scope: broad mapping\nTargets:\n${Array.from({ length: 9 }, (_, index) => `- src/f${index}.py`).join("\n")}\nQuestions:\n- Trace ownership.\nStop condition: all targets are resolved.`
  assert.throws(() => validateTaskPacket(taskArgs({ prompt: tooMany })), /names 9 filesystem targets/)
})

test("Verify manifest preflight rejects wrapper-managed env prefixes", async () => {
  await mkdir("/tmp/opencode/verify/manifests", { recursive: true })
  const packet = await mkdtemp("/tmp/opencode/verify/manifests/prefix-")
  const manifest = join(packet, "commands.json")
  await writeFile(manifest, JSON.stringify({ schema_version: "opencode-verify-manifest-v1", commands: [{ argv: ["/live/verify-disposable.mjs", "--namespace", "smoke", "--", "env", "PYTHONDONTWRITEBYTECODE=1", ".venv-project/bin/pytest", "-q", "tests/integration"] }] }))
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  const args = taskArgs({ subagent_type: "verify", prompt: `Scope: manifest gate\nManifest: ${manifest}\nQuestions:\n- Does the command pass?\nStop condition: report its exit status.` })
  await assert.rejects(() => before(hooks, "parent", "managed-env-plan", "task", args), /begin directly with the repository-pinned executable.*wrapper injects/s)
})

test("Verify manifest preflight rejects non-allowlisted argv before child launch", async () => {
  await mkdir("/tmp/opencode/verify/manifests", { recursive: true })
  const packet = await mkdtemp("/tmp/opencode/verify/manifests/unsafe-")
  const manifest = join(packet, "commands.json")
  await writeFile(manifest, JSON.stringify({ schema_version: "opencode-verify-manifest-v1", commands: [{ argv: ["sh", "-c", "echo unsafe"] }] }))
  const args = taskArgs({ subagent_type: "verify", prompt: `Scope: unsafe manifest\nManifest: ${manifest}\nQuestions:\n- Is the plan admissible?\nStop condition: preflight decides.` })
  await assert.rejects(() => validateChildPlan(args, "/home/filip/project"), /command 1.*not in the declared child capability set/)
})

test("Verify child blocks wrapper-managed env prefixes before permission execution", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "verify-child", "verify")
  await assert.rejects(
    () => before(hooks, "verify-child", "managed-env", "bash", { command: "/live/verify-disposable.mjs --namespace smoke -- PYTHONDONTWRITEBYTECODE=1 .venv-project/bin/pytest -q tests/integration" }),
    /begin directly with the repository-pinned executable.*assignments/s,
  )
})

test("child capability preflight accepts supported read-only authority and review roots", async () => {
  await assert.doesNotReject(() => validateChildPlan(taskArgs({
    prompt: "Scope: unknown ownership flow in /tmp/opencode/review/worktrees/packet-a\nQuestions:\n- Does the identity match?\nCommands:\ngit rev-parse HEAD\nStop condition: report the commit-qualified owner path.",
  }), "/home/filip/project"))
  await assert.doesNotReject(() => validateChildPlan(taskArgs({
    subagent_type: "fresh-review",
    prompt: "Scope: review /tmp/opencode/review/worktrees/packet-b\nQuestions:\n- Does the diff preserve the invariant?\nCommands:\ngit diff HEAD~1..HEAD\nStop condition: report findings.",
  }), "/home/filip/project"))
})

test("an absolute review path in packet prose is not misclassified as a shell command", async () => {
  await assert.doesNotReject(() => validateChildPlan(taskArgs({
    subagent_type: "verify",
    prompt: "Scope: inspect /tmp/opencode/review/worktrees/packet-a.\nQuestions:\n- Are tests tracked?\nCommands:\ngit ls-files tests\nStop condition: report one command.",
  }), "/tmp/opencode/review/worktrees/packet-a"))
})

test("Fresh-review preflight and runtime keep validation, discovery, mutation, and compound shell calls out", async () => {
  const packet = (command) => taskArgs({
    subagent_type: "fresh-review",
    prompt: `Scope: exact implementation review\nQuestions:\n- Is the bounded diff clean?\nCommands:\n${command}\nStop condition: report only source-review findings.`,
  })
  const rejected = [
    "node --test tests/operation-guard.test.mjs",
    "ls tests",
    "git checkout main",
    "git status && git log -1",
  ]
  for (const command of rejected) {
    await assert.rejects(() => validateChildPlan(packet(command), "/home/filip/project"), /CHILD_CAPABILITY_MISMATCH/, command)
  }

  const hooks = createOperationGuard({ directory: "/home/filip/project", env: {} })
  await register(hooks, "fresh-review-runtime", "fresh-review")
  for (const [index, command] of rejected.entries()) {
    await assert.rejects(() => before(hooks, "fresh-review-runtime", `rejected-${index}`, "bash", { command }), /OPERATIONAL_CHILD_BLOCK|SPLIT_TO_BARE_CALLS/, command)
  }
})

test("child capability preflight rejects git -C and primary-owned remote refresh", async () => {
  await assert.rejects(() => validateChildPlan(taskArgs({
    subagent_type: "verify",
    prompt: "Scope: authority\nQuestions:\n- Report SHA.\nCommands:\ngit -C /home/filip/project rev-parse HEAD\nStop condition: report SHA.",
  }), "/home/filip/project"), /CHILD_CAPABILITY_MISMATCH.*git -C.*workdir.*REPACKET_FOR_CHILD_CAPABILITY/s)
  await assert.rejects(() => validateChildPlan(taskArgs({
    subagent_type: "verify",
    prompt: "Scope: remote authority\nQuestions:\n- Report the ref.\nCommands:\ngit fetch origin\nStop condition: report the ref.",
  }), "/home/filip/project"), /remote authority refresh is primary-owned/)
})

test("Verify capability preflight rejects denial-prone discovery and direct Python forms", async () => {
  for (const command of [
    "ls tests/unit/test_one.py tests/unit/test_two.py",
    ".venv-project/bin/python -m pytest -q tests/unit",
    "/tmp/opencode/py311/venv/bin/python -m pytest -q tests/unit",
  ]) {
    await assert.rejects(() => validateChildPlan(taskArgs({
      subagent_type: "verify",
      prompt: `Scope: focused gates\nQuestions:\n- Report the exit status.\nCommands:\n${command}\nStop condition: report the exit status.`,
    }), "/home/filip/project"), /CHILD_CAPABILITY_MISMATCH/)
  }
})

test("Verify capability preflight accepts one tracked-path derivation and wrapper-mediated external Python", async () => {
  const prompt = [
    "Scope: dual interpreter gates",
    "Questions:",
    "- Do both gates pass?",
    "Commands:",
    "git ls-files tests/unit",
    "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-disposable.mjs --namespace dual -- /tmp/opencode/py311/venv/bin/python -m pytest -q tests/unit",
    "Stop condition: report both statuses.",
  ].join("\n")
  await assert.doesNotReject(() => validateChildPlan(taskArgs({ subagent_type: "verify", prompt }), "/home/filip/project"))
})

test("Verify capability preflight accepts only the bounded typed local assessment shape", async () => {
  const runner = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs"
  const spec = "/tmp/opencode/verify/assessments/pr20.json"
  const packet = (command) => taskArgs({
    subagent_type: "verify",
    prompt: `Scope: exact host evidence
Questions:
- Does host evidence pass?
Commands:
${command}
Stop condition: report typed host evidence.`,
  })
  await assert.doesNotReject(() => validateChildPlan(packet(`${runner} --spec ${spec}`), "/home/filip/project"))
  await assert.doesNotReject(() => validateChildPlan(packet(`rtk ${runner} --spec ${spec}`), "/home/filip/project"))
  for (const eol of ["\n", "\r\n"]) {
    await assert.doesNotReject(() => validateChildPlan(packet(`${runner} \\${eol}  --spec ${spec}`), "/home/filip/project"))
  }
  for (const command of [
    `${runner} --spec /tmp/opencode/verify/assessments/*.json`,
    `${runner} --spec /tmp/opencode/verify/assessments/../escape.json`,
    `${runner} --spec ${spec} --extra`,
    `${runner} --sha ${"a".repeat(40)} --assessment-id legacy`,
    `${runner} --spec ${spec}; git status`,
    `${runner}\n--spec ${spec}`,
    `${runner} \\ \n --spec ${spec}`,
    `${runner} \\`,
    `${runner} --spec ${spec} && git status`,
    `${runner} --spec ${spec} | cat`,
    `${runner} --spec ${spec} > /tmp/result`,
    `${runner} --spec $(printf ${spec})`,
  ]) {
    await assert.rejects(() => validateChildPlan(packet(command), "/home/filip/project"), /Local assessment must use exactly|one bare invocation|CHILD_CAPABILITY_MISMATCH/, command)
  }
})

test("Verify and Explore admit only the exact session-trace assessment shape", async () => {
  const command = `${EVIDENCE_ASSESSMENT_PATH} --input /tmp/opencode/verify/materials/session.json --session-id ses_fb47d8ed3ffe0OixkF9W9UiolU --profile guard-friction-v1`
  for (const type of ["verify", "explore"]) {
    await assert.doesNotReject(() => validateChildPlan(taskArgs({ subagent_type: type, prompt: `Scope: session trace friction\nQuestions:\n- Assess the bounded exported trace.\nCommands:\n${command}\nStop condition: metrics are reported.` }), "/home/filip/project"))
  }
  await assert.rejects(() => validateChildPlan(taskArgs({ subagent_type: "verify", prompt: `Scope: session trace friction\nQuestions:\n- Assess it.\nCommands:\n${command} --extra\nStop condition: metrics are reported.` }), "/home/filip/project"), /Session trace assessment must use exactly/)
  const wildcard = `${EVIDENCE_ASSESSMENT_PATH} --input /tmp/opencode/verify/materials/*.json --session-id ses_Concrete123 --profile guard-friction-v1`
  await assert.rejects(() => validateChildPlan(taskArgs({ subagent_type: "verify", prompt: `Scope: session trace friction\nQuestions:\n- Assess it.\nCommands:\n${wildcard}\nStop condition: metrics are reported.` }), "/home/filip/project"), /Session trace assessment must use exactly/)
  const remediation = `${EVIDENCE_ASSESSMENT_PATH} --input /tmp/opencode/verify/materials/session.json --session-id ses_Concrete123 --profile remediation-audit-v1`
  await assert.doesNotReject(() => validateChildPlan(taskArgs({ subagent_type: "verify", prompt: `Scope: session trace remediation audit\nQuestions:\n- Assess the bounded export.\nCommands:\n${remediation}\nStop condition: the redacted report is returned.` }), "/home/filip/project"))
})

test("child capability mismatch is rejected before a Task becomes pending", async () => {
  const hooks = createOperationGuard({ directory: "/home/filip/project", env: {} })
  await register(hooks, "parent", "build")
  const incompatible = taskArgs({
    subagent_type: "verify",
    prompt: "Scope: path census\nQuestions:\n- Report paths.\nCommands:\nls tests/unit\nStop condition: report paths.",
  })
  await assert.rejects(() => before(hooks, "parent", "permission-doomed", "task", incompatible), /REPACKET_FOR_CHILD_CAPABILITY/)
  const compatible = taskArgs({
    subagent_type: "verify",
    prompt: "Scope: path census\nQuestions:\n- Report paths.\nCommands:\ngit ls-files tests/unit\nStop condition: report paths.",
  })
  await assert.doesNotReject(() => before(hooks, "parent", "corrected", "task", compatible))
})

test("an improvised child capability mismatch is structured and child budgets remain advisory", async () => {
  const hooks = createOperationGuard({ directory: "/home/filip/project", env: {} })
  await register(hooks, "verify-child-capability", "verify")
  await assert.rejects(
    () => before(hooks, "verify-child-capability", "denied-ls", "bash", { command: "ls tests/unit" }),
    /OPERATIONAL_CHILD_BLOCK: PERMISSION.*OPERATIONAL_CORRECTION: USE_BUILTIN_DISCOVERY.*does not consume the normal child tool budget/s,
  )
  for (let index = 1; index <= DEFAULT_POLICY.childToolCalls.verify; index += 1) {
    await before(hooks, "verify-child-capability", `allowed-${index}`, "read", { filePath: `tests/unit/f${index}.py` })
  }
  await assert.doesNotReject(() => before(hooks, "verify-child-capability", "over-budget", "read", { filePath: "tests/unit/overflow.py" }))
})

test("a repeated improvised capability mismatch rejects only that invocation", async () => {
  const hooks = createOperationGuard({ directory: "/home/filip/project", env: {} })
  await register(hooks, "explore-child-capability", "explore")
  const args = { command: "git fetch origin" }
  await assert.rejects(() => before(hooks, "explore-child-capability", "fetch-1", "bash", args), /OPERATIONAL_CORRECTION: PRIMARY_OWNS_REMOTE_REFRESH.*primary-owned/s)
  await assert.rejects(() => before(hooks, "explore-child-capability", "fetch-2", "bash", args), /rejects only the unsafe invocation/)
  await assert.doesNotReject(() => before(hooks, "explore-child-capability", "after-mismatch", "read", { filePath: "src/a.py" }))
})

test("child external-path enforcement permits only harness-owned roots", async () => {
  const hooks = createOperationGuard({ directory: "/home/filip/project", env: {} })
  await register(hooks, "explore-review-root", "explore")
  await assert.doesNotReject(() => before(hooks, "explore-review-root", "review-read", "read", { filePath: "/tmp/opencode/review/worktrees/head-a/src/a.py" }))
  await assert.rejects(
    () => before(hooks, "explore-review-root", "arbitrary-tmp", "read", { filePath: "/tmp/unowned/a.py" }),
    /OPERATIONAL_CHILD_BLOCK: PERMISSION.*cannot access/,
  )
})

test("known exact small-file lookups are not delegated to Explore", () => {
  assert.throws(
    () => validateTaskPacket(taskArgs({ prompt: "Scope: read exactly src/a.mjs, src/b.mjs, and test/a.test.mjs\nQuestions:\n- Return each exact export.\nStop condition: exports copied verbatim." })),
    /known exact 3-path lookup/,
  )
  assert.doesNotThrow(() =>
    validateTaskPacket(taskArgs({ prompt: "Scope: unknown call path beginning at src/a.mjs\nQuestions:\n- Trace its dependencies and ownership.\nStop condition: the call path is supported by source evidence." })),
  )
  // Ensure the expanded DISCOVERY_SIGNAL keywords prevent blockage
  assert.doesNotThrow(() =>
    validateTaskPacket(taskArgs({ prompt: "Scope: Investigate the bug in src/a.mjs, src/b.mjs\nQuestions:\n- Check what causes it.\nStop condition: done." })),
  )
})

test("Explore warns after 32 individual tool calls but permits necessary continuation", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "child", "explore")
  for (let index = 1; index <= DEFAULT_POLICY.childToolCalls.explore; index += 1) {
    await before(hooks, "child", `call-${index}`, "read", { filePath: `src/${index}.py` })
  }
  await assert.doesNotReject(() => before(hooks, "child", "call-33", "read", { filePath: "src/33.py" }))
  assert.match(await system(hooks, "child"), /OPERATIONAL ADVISORY.*32/)
})

test("repeated child budget advisories coalesce into one bounded telemetry record", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent-budget", "build")
  const args = taskArgs({ subagent_type: "verify", prompt: "Scope: budget telemetry\nQuestions:\n- Does one gate pass?\nStop condition: report its result." })
  await before(hooks, "parent-budget", "task-budget", "task", args)
  await register(hooks, "child-budget", "verify")
  for (let index = 1; index <= DEFAULT_POLICY.childToolCalls.verify + 16; index += 1) {
    await before(hooks, "child-budget", `read-${index}`, "read", { filePath: `tests/f${index}.py` })
  }
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child-budget", role: "assistant", finish: "stop" } } } })
  const output = await after(hooks, "parent-budget", "task-budget", "task", args, {
    output: "OPERATIONAL_RESULT: PASS; COMMANDS_RUN: 1; COMMANDS_REQUIRED: 1",
    metadata: { sessionId: "child-budget" },
  })
  const events = output.metadata.operationalSchema.guardEvents.filter((event) => event.rule === "child-tool-budget-advisory")
  assert.equal(events.length, 1)
  assert.equal(events[0].occurrenceCount, 16)
  assert.equal(events[0].threshold, DEFAULT_POLICY.childToolCalls.verify)
  assert.equal(events[0].firstObservedCallCount, DEFAULT_POLICY.childToolCalls.verify + 1)
  assert.equal(events[0].maxObservedCallCount, DEFAULT_POLICY.childToolCalls.verify + 16)
  assert.equal(output.metadata.operationalSchema.complete, true)
})

test("failed duplicate child invocations are advisory while proven success remains blocked", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "child", "verify")
  const args = { command: "pytest -q tests/failing.py" }
  await before(hooks, "child", "attempt-1", "bash", args)
  await after(hooks, "child", "attempt-1", "bash", args, { output: "failed", metadata: { exit: 1 } })
  await before(hooks, "child", "attempt-2", "bash", args)
  await after(hooks, "child", "attempt-2", "bash", args, { output: "failed again", metadata: { exit: 1 } })
  await assert.doesNotReject(() => before(hooks, "child", "attempt-3", "bash", args))
  await assert.doesNotReject(() => before(hooks, "child", "attempt-4", "read", { filePath: "different.txt" }))
  assert.match(await system(hooks, "child"), /OPERATIONAL ADVISORY.*repeated failed/)
})

test("duplicate fingerprints canonicalize RTK and native shell spellings", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "child-canonical", "verify")
  await before(hooks, "child-canonical", "attempt-1", "bash", { command: "rtk ruff check src" })
  await before(hooks, "child-canonical", "attempt-2", "bash", { command: "ruff   check   src" })
  await assert.doesNotReject(() => before(hooks, "child-canonical", "attempt-3", "bash", { command: "rtk ruff check src" }))
})

test("successful empty child shell output is explicit and cannot be retried as ambiguous", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "verify-silent", "verify")
  const args = { command: "rtk git diff --check HEAD~1..HEAD" }
  await before(hooks, "verify-silent", "silent-1", "bash", args)
  const output = await after(hooks, "verify-silent", "silent-1", "bash", args, { output: "", metadata: { exit: 0 } })
  assert.equal(output.output, "OPERATIONAL_STATUS: completed; exit=0; output=empty")
  await assert.rejects(() => before(hooks, "verify-silent", "silent-2", "bash", { command: "git diff --check HEAD~1..HEAD" }), /already completed successfully/)
})

test("a proven-success duplicate non-shell child invocation remains blocked", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "explore-read-success", "explore")
  const args = { filePath: "src/a.py" }
  await before(hooks, "explore-read-success", "read-1", "read", args)
  await after(hooks, "explore-read-success", "read-1", "read", args, { output: "source" })
  await assert.rejects(() => before(hooks, "explore-read-success", "read-2", "read", args), /already completed successfully/)
})

test("compound child shell calls reject each malformed invocation without terminalizing the child", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "child", "verify")
  const args = { command: "pyrefly check; echo exit=$?" }
  await assert.rejects(() => before(hooks, "child", "shape-1", "bash", args), /OPERATIONAL_CORRECTION: SPLIT_TO_BARE_CALLS.*one bare allowlisted invocation.*exit status in tool metadata/s)
  await assert.rejects(() => before(hooks, "child", "shape-2", "bash", args), /one bare allowlisted invocation/)
  await assert.rejects(() => before(hooks, "child", "shape-3", "bash", args), /rejects only the malformed invocation/)
  await assert.doesNotReject(() => before(hooks, "child", "after-shape", "read", { filePath: "src/a.py" }))
})

test("quoted shell punctuation is not mistaken for a compound child command", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "child", "verify")
  await assert.doesNotReject(() => before(hooks, "child", "quoted", "bash", { command: "pytest -k 'alpha;beta|gamma'" }))
})

test("standalone exit-status probes are blocked before shell permission handling", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "child", "verify")
  await assert.rejects(() => before(hooks, "child", "status-1", "bash", { command: "echo $?" }), /standalone echo\/printf exit-status probes.*recorded status/)
  await assert.rejects(() => before(hooks, "child", "status-2", "bash", { command: "printf 'exit status: %s\\n' $?" }), /standalone echo\/printf exit-status probes/)
})

test("distinct pre-execution shell-shape rejections do not consume the tool-call budget", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "child", "verify")
  for (let index = 1; index <= 10; index += 1) {
    await assert.rejects(() => before(hooks, "child", `shape-${index}`, "bash", { command: `pyrefly check src/${index}; echo exit=$?` }), /rejects only the malformed invocation/)
  }
  for (let index = 1; index <= DEFAULT_POLICY.childToolCalls.verify; index += 1) {
    await before(hooks, "child", `valid-${index}`, "read", { filePath: `src/${index}.py` })
  }
  await assert.doesNotReject(() => before(hooks, "child", "over-budget", "read", { filePath: "src/over.py" }))
})

test("child response token caps are enforced", async () => {
  const hooks = createOperationGuard({ env: {} })
  const output = { maxOutputTokens: 25000 }
  await hooks["chat.params"]({ sessionID: "child", agent: "explore" }, output)
  assert.equal(output.maxOutputTokens, 20480)
})

test("primary receives routing advisories without a read hard stop", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (let index = 1; index <= DEFAULT_POLICY.primaryReadWarning; index += 1) {
    const args = { filePath: `src/${index}.py` }
    await before(hooks, "parent", `read-${index}`, "read", args)
    const output = await after(hooks, "parent", `read-${index}`, "read", args, { output: "source" })
    if (index === DEFAULT_POLICY.primaryReadWarning) assert.match(output.output, /ROUTING CHECKPOINT/)
  }
  for (let index = DEFAULT_POLICY.primaryReadWarning + 1; index <= DEFAULT_POLICY.primaryReadHardLimit; index += 1) {
    await before(hooks, "parent", `read-${index}`, "read", { filePath: `src/${index}.py` })
  }
  await assert.doesNotReject(() => before(hooks, "parent", `read-${DEFAULT_POLICY.primaryReadHardLimit + 1}`, "read", { filePath: `src/${DEFAULT_POLICY.primaryReadHardLimit + 1}.py` }))
  assert.match(await system(hooks, "parent"), /OPERATIONAL ADVISORY.*reconnaissance/)
})

test("truncated or max-step child output is marked incomplete", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  const args = taskArgs()
  await before(hooks, "parent", "task-1", "task", args)
  const output = await after(hooks, "parent", "task-1", "task", args, {
    output: "Maximum steps for this agent have been reached",
    metadata: { truncated: true },
  })
  assert.equal(output.metadata.operationalSchema.complete, false)
  assert.equal(output.metadata.operationalSchema.boundaryReset, false)
  assert.match(output.output, /DELEGATION INCOMPLETE/)
})

test("a child result without a correlatable session ID is fail-closed", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  const args = taskArgs()
  await before(hooks, "parent", "task-no-session", "task", args)
  const output = await after(hooks, "parent", "task-no-session", "task", args, { output: "Substantive-looking handoff." })
  assert.equal(output.metadata.operationalSchema.complete, false)
  assert.deepEqual(output.metadata.operationalSchema.reasons, ["child-session-unknown"])
})

test("transient Task failure admits one provenance-bound resume", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  const original = taskArgs()
  await before(hooks, "parent", "failed-task", "task", original)
  await taskFailureEvent(hooks, "parent", "failed-task", "Subagent failed (task_id: ses_resume): provider network timeout")
  const notice = await system(hooks, "parent")
  assert.match(notice, /RESUMABLE TASK FAILURE.*exactly once.*task_id=ses_resume/s)
  assert.doesNotMatch(await system(hooks, "parent"), /RESUMABLE TASK FAILURE/)

  await assert.rejects(
    () => before(hooks, "parent", "wrong-type", "task", taskArgs({ subagent_type: "verify", task_id: "ses_resume" })),
    /belongs to explore, not verify/,
  )
  await assert.rejects(
    () => before(hooks, "parent", "wrong-scope", "task", taskArgs({ task_id: "ses_resume", prompt: "Scope: another subsystem\nQuestions:\n- Trace one call path.\nStop condition: exact source references are returned." })),
    /does not match this normalized Scope/,
  )

  const resumed = taskArgs({ task_id: "ses_resume", prompt: "Scope:  REQUEST   PIPELINE \nQuestions:\n- Continue the bounded trace.\nStop condition: exact source references are returned." })
  await before(hooks, "parent", "resume-once", "task", resumed)
  await assert.rejects(() => before(hooks, "parent", "resume-twice", "task", resumed), /exhausted its single bounded resume attempt/)
  await register(hooks, "ses_resume", "explore")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "ses_resume", role: "assistant", finish: "stop" } } } })
  const output = await after(hooks, "parent", "resume-once", "task", resumed, { output: exploreComplete("Bounded handoff."), metadata: { sessionId: "ses_resume" } })
  assert.equal(output.metadata.operationalSchema.complete, true)
})

test("unknown, deterministic, and missing-ID Task failures fail closed", async () => {
  for (const [callID, error, pattern] of [
    ["permission", "Subagent failed (task_id: ses_denied): permission denied", /deterministic/],
    ["unknown", "Subagent failed (task_id: ses_unknown): unexpected internal condition", /not safely classified/],
    ["missing", "Subagent failed: network timeout", /no resumable task_id/],
  ]) {
    const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
    await register(hooks, "parent", "build")
    await before(hooks, "parent", callID, "task", taskArgs())
    await taskFailureEvent(hooks, "parent", callID, error)
    assert.match(await system(hooks, "parent"), pattern)
    const taskID = error.match(/task_id: ([A-Za-z0-9_-]+)/)?.[1] ?? "ses_missing"
    await assert.rejects(() => before(hooks, "parent", `${callID}-retry`, "task", taskArgs({ task_id: taskID })), /not an admitted resumable failure/)
  }
})

test("undefined Task after-hook result preserves the original failure path", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await before(hooks, "parent", "undefined-result", "task", taskArgs())
  await assert.doesNotReject(() => hooks["tool.execute.after"]({ sessionID: "parent", callID: "undefined-result", tool: "task", args: taskArgs() }, undefined))
  await taskFailureEvent(hooks, "parent", "undefined-result", "Subagent failed (task_id: ses_after): stream error")
  assert.match(await system(hooks, "parent"), /task_id=ses_after/)
})

test("resumed Task detects OpenCode silent fresh-session fallback", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await before(hooks, "parent", "first", "task", taskArgs())
  await taskFailureEvent(hooks, "parent", "first", "Subagent failed (task_id: ses_expected): service unavailable")
  const resumed = taskArgs({ task_id: "ses_expected" })
  await before(hooks, "parent", "resume", "task", resumed)
  await register(hooks, "ses_fresh", "explore")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "ses_fresh", role: "assistant", finish: "stop" } } } })
  const output = await after(hooks, "parent", "resume", "task", resumed, { output: exploreComplete("Looks complete."), metadata: { sessionId: "ses_fresh" } })
  assert.equal(output.metadata.operationalSchema.complete, false)
  assert.ok(output.metadata.operationalSchema.reasons.includes("resume-session-mismatch"))
  assert.equal(output.metadata.operationalSchema.boundaryReset, false)
})

test("child finish unknown may recover to stop before result evaluation", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await register(hooks, "child", "explore")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child", role: "assistant", finish: "unknown" } } } })
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child", role: "assistant", finish: "stop" } } } })
  await before(hooks, "parent", "task-recovered", "task", taskArgs())
  const output = await after(hooks, "parent", "task-recovered", "task", taskArgs(), { output: exploreComplete("Recovered handoff."), metadata: { sessionId: "child" } })
  assert.equal(output.metadata.operationalSchema.complete, true)
})

test("a resumed Task failure cannot create a second resume chain", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await before(hooks, "parent", "first", "task", taskArgs())
  await taskFailureEvent(hooks, "parent", "first", "Subagent failed (task_id: ses_once): connection reset")
  const resumed = taskArgs({ task_id: "ses_once" })
  await before(hooks, "parent", "resumed", "task", resumed)
  await taskFailureEvent(hooks, "parent", "resumed", "Subagent failed (task_id: ses_twice): network timeout")
  assert.match(await system(hooks, "parent"), /single bounded resume attempt is exhausted/)
  await assert.rejects(() => before(hooks, "parent", "third", "task", taskArgs({ task_id: "ses_twice" })), /not an admitted resumable failure/)
})

test("OpenCode finish:length and an empty task result are independently incomplete", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await register(hooks, "child", "fresh-review")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child", role: "assistant", finish: "length" } } } })
  const args = taskArgs({ subagent_type: "fresh-review" })
  await before(hooks, "parent", "task-length", "task", args)
  const output = await after(hooks, "parent", "task-length", "task", args, {
    output: "<task_result></task_result>",
    metadata: { sessionId: "child" },
  })
  assert.equal(output.metadata.operationalSchema.complete, false)
  assert.deepEqual(output.metadata.operationalSchema.reasons, ["child-result-empty", "child-finish-length"])
})

test("short max-step wording and unknown child finish cannot satisfy a gate", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  const args = taskArgs({ subagent_type: "verify" })
  await before(hooks, "parent", "task-max", "task", args)
  const output = await after(hooks, "parent", "task-max", "task", args, {
    output: "**Maximum steps reached**",
    metadata: { sessionId: "child-without-event" },
  })
  assert.deepEqual(output.metadata.operationalSchema.reasons, ["child-max-steps", "child-finish-unknown"])
})

test("max-step wording nested inside a Task wrapper is transport-incomplete", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await register(hooks, "child", "verify")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child", role: "assistant", finish: "stop" } } } })
  const args = taskArgs({ subagent_type: "verify" })
  await before(hooks, "parent", "task-nested-max", "task", args)
  const output = await after(hooks, "parent", "task-nested-max", "task", args, {
    output: "<task_result>\n## Summary\n\nMaximum steps for this agent have been reached\nOPERATIONAL_RESULT: PASS; COMMANDS_RUN: 2; COMMANDS_REQUIRED: 2\n</task_result>",
    metadata: { sessionId: "child" },
  })
  assert.equal(output.metadata.operationalSchema.complete, false)
  assert.deepEqual(output.metadata.operationalSchema.reasons, ["child-max-steps"])
})

test("health detector does not mistake quoted detector examples for transport failure", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await register(hooks, "child", "explore")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child", role: "assistant", finish: "stop" } } } })
  const args = taskArgs()
  await before(hooks, "parent", "task-self-reference", "task", args)
  const output = await after(hooks, "parent", "task-self-reference", "task", args, {
    output: exploreComplete('<task id="child" state="completed">\n<task_result>\nThe detector recognizes "output was truncated", "Maximum steps reached", and `<task_result></task_result>` as examples. The actual handoff is non-empty.\n</task_result>\n</task>'),
    metadata: { sessionId: "child" },
  })
  assert.equal(output.metadata.operationalSchema.complete, true)
})

test("oversized child results are clipped before returning to the parent", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  const args = taskArgs({ subagent_type: "verify" })
  await before(hooks, "parent", "task-large", "task", args)
  const output = await after(hooks, "parent", "task-large", "task", args, { output: "x".repeat(9000) })
  assert.equal(output.metadata.operationalSchema.complete, false)
  assert.match(output.output, /child-result-oversized/)
  assert.match(output.output, /child result clipped/)
  assert.ok(output.output.length < 8400)
})

test("parent reopen limits are advisory after five child-covered paths", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await register(hooks, "child", "explore")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child", role: "assistant", finish: "stop" } } } })
  const args = taskArgs()
  await before(hooks, "parent", "task-1", "task", args)
  await after(hooks, "parent", "task-1", "task", args, {
    output: exploreComplete("src/a.py src/b.py src/c.py src/d.py src/e.py src/f.py", 6),
    metadata: { sessionId: "child" },
  })
  for (const name of ["a", "b", "c", "d", "e"]) {
    await before(hooks, "parent", `read-${name}`, "read", { filePath: `src/${name}.py` })
  }
  await assert.doesNotReject(() => before(hooks, "parent", "read-f", "read", { filePath: "src/f.py" }))
  await assert.doesNotReject(() => before(hooks, "parent", "read-f-range", "read", { filePath: "src/f.py", offset: 40, limit: 80 }))
})

test("an exact Explore follow-up is allowed after delegated-path reopening is exhausted", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await register(hooks, "child", "explore")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child", role: "assistant", finish: "stop" } } } })
  const first = taskArgs()
  await before(hooks, "parent", "first", "task", first)
  await after(hooks, "parent", "first", "task", first, { output: exploreComplete("src/a.py src/b.py src/c.py src/d.py src/e.py src/f.py", 6), metadata: { sessionId: "child" } })
  for (const name of ["a", "b", "c", "d", "e"]) await before(hooks, "parent", `read-${name}`, "read", { filePath: `src/${name}.py` })
  const followup = taskArgs({ prompt: "Scope: exact unresolved src/f.py lookup\nQuestions:\n- Return the exact required definition.\nStop condition: the definition and line range are reported." })
  const normalized = await before(hooks, "parent", "followup", "task", followup)
  assert.match(normalized.args.prompt, /src\/f\.py/)
})

test("actual child grep and Serena paths count even when omitted from the handoff", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await register(hooks, "child", "explore")
  await before(hooks, "child", "grep-a", "grep", { path: "src/a.py", pattern: "thing" })
  await after(hooks, "child", "grep-a", "grep", { path: "src/a.py", pattern: "thing" }, { output: "src/c.py:12: thing" })
  await before(hooks, "child", "serena-b", "serena_find_symbol", { relative_path: "src/b.py", name_path_pattern: "Thing" })
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child", role: "assistant", finish: "stop" } } } })
  const args = taskArgs()
  await before(hooks, "parent", "task-observed", "task", args)
  const output = await after(hooks, "parent", "task-observed", "task", args, {
    output: exploreComplete("The bounded call path is mapped."),
    metadata: { sessionId: "child" },
  })
  assert.equal(output.metadata.operationalSchema.pathCount, 3)
  await before(hooks, "parent", "read-a", "read", { filePath: "src/a.py" })
  await before(hooks, "parent", "read-b", "read", { filePath: "src/b.py" })
  await before(hooks, "parent", "read-c", "read", { filePath: "src/c.py" })
})

test("delegated provenance is workspace-local and capped", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await register(hooks, "child", "explore")
  const lines = ["/usr/lib/python/system.py", ...Array.from({ length: 40 }, (_, index) => `src/file-${index}.py:1: hit`)].join("\n")
  await before(hooks, "child", "grep-many", "grep", { path: "src", pattern: "hit" })
  await after(hooks, "child", "grep-many", "grep", { path: "src", pattern: "hit" }, { output: lines })
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child", role: "assistant", finish: "stop" } } } })
  const args = taskArgs()
  await before(hooks, "parent", "task-bounded", "task", args)
  const output = await after(hooks, "parent", "task-bounded", "task", args, {
    output: exploreComplete(`${lines}\nThe subsystem is mapped.`),
    metadata: { sessionId: "child" },
  })
  assert.equal(output.metadata.operationalSchema.pathCount, DEFAULT_POLICY.delegatedPathLimit.explore)
  assert.equal(output.metadata.operationalSchema.pathOverflow, true)
})

test("primary receives an operation-boundary warning before long direct work drifts", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (let index = 0; index < DEFAULT_POLICY.primaryOperationWarning; index += 1) {
    await before(hooks, "parent", `todo-${index}`, "todowrite", { todos: [] })
  }
  assert.match(await system(hooks, "parent"), /24 primary tool calls.*successful delegation boundary/)
})

test("primary direct work receives an advisory after thirty calls and still permits a boundary", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (let index = 0; index < DEFAULT_POLICY.primaryOperationHardLimit; index += 1) {
    await before(hooks, "parent", `todo-${index}`, "todowrite", { todos: [] })
  }
  await assert.doesNotReject(() => before(hooks, "parent", "thirty-first", "todowrite", { todos: [] }))
  await assert.doesNotReject(() => before(hooks, "parent", "boundary-edit", "edit", { filePath: "docs/result.md" }))
  await assert.doesNotReject(() => before(hooks, "parent", "after-boundary", "todowrite", { todos: [] }))
})

test("a normalized Task packet remains an allowed routing boundary at the hard stop", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (let index = 0; index < DEFAULT_POLICY.primaryOperationHardLimit; index += 1) {
    await before(hooks, "parent", `todo-normalized-${index}`, "todowrite", { todos: [] })
  }
  await register(hooks, "normalized-child", "explore")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "normalized-child", role: "assistant", finish: "stop" } } } })
  const output = await before(hooks, "parent", "normalized-boundary", "task", taskArgs({ prompt: "Scope: test\nQuestions:\n- One?\nStop condition: done." }))
  assert.match(output.args.prompt, /^Scope:/)
  await after(hooks, "parent", "normalized-boundary", "task", output.args, { output: exploreComplete("Mapped."), metadata: { sessionId: "normalized-child" } })
  await assert.doesNotReject(() => before(hooks, "parent", "after-normalized-boundary", "todowrite", { todos: [] }))
})

test("failed or blocked Task outcomes do not discharge the parent hard stop", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (let index = 0; index < DEFAULT_POLICY.primaryOperationHardLimit; index += 1) {
    await before(hooks, "parent", `todo-failed-${index}`, "todowrite", { todos: [] })
  }
  await register(hooks, "blocked-child", "verify")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "blocked-child", role: "assistant", finish: "stop" } } } })
  const args = taskArgs({ subagent_type: "verify" })
  await before(hooks, "parent", "blocked-boundary", "task", args)
  await after(hooks, "parent", "blocked-boundary", "task", args, {
    output: "OPERATIONAL_RESULT: BLOCKED; COMMANDS_RUN: 0; COMMANDS_REQUIRED: 2",
    metadata: { sessionId: "blocked-child" },
  })
  await assert.doesNotReject(() => before(hooks, "parent", "still-admitted", "todowrite", { todos: [] }))
})

test("terminal Task error events do not discharge the parent hard stop", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (let index = 0; index < DEFAULT_POLICY.primaryOperationHardLimit; index += 1) {
    await before(hooks, "parent", `todo-error-${index}`, "todowrite", { todos: [] })
  }
  await before(hooks, "parent", "failed-boundary", "task", taskArgs())
  await taskFailureEvent(hooks, "parent", "failed-boundary", "Subagent failed (task_id: ses_503): HTTP 503 service unavailable")
  await assert.doesNotReject(() => before(hooks, "parent", "still-error-admitted", "todowrite", { todos: [] }))
})

test("temporary manifest writes do not masquerade as implementation boundaries", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (let index = 0; index < DEFAULT_POLICY.primaryOperationHardLimit; index += 1) {
    await before(hooks, "parent", `todo-manifest-${index}`, "todowrite", { todos: [] })
  }
  await before(hooks, "parent", "manifest", "write", { filePath: "/tmp/opencode/verify/packet/manifest.md", content: "commands" })
  await assert.doesNotReject(() => before(hooks, "parent", "after-manifest", "todowrite", { todos: [] }))
})

test("rejected Task packets produce a compact preflight reminder", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  const targets = Array.from({ length: 9 }, (_, index) => `src/target-${index}.mjs`).join(", ")
  await assert.rejects(() => before(hooks, "parent", "bad-task", "task", taskArgs({ prompt: `Scope: unknown cross-cutting dependencies\nQuestions:\n- Trace ${targets}.\nStop condition: dependencies are evidenced.` })), /limit is 8/)
  assert.match(await system(hooks, "parent"), /previous Task packet failed preflight.*Explore 8, Verify 24, Fresh-review 10/)
  await assert.doesNotReject(() => before(hooks, "parent", "debt-read", "read", { filePath: "src/another.mjs" }))
  assert.match(await system(hooks, "parent"), /OPERATIONAL ADVISORY.*routing debt/i)

  await register(hooks, "partition-child", "explore")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "partition-child", role: "assistant", finish: "stop" } } } })
  const partitioned = taskArgs({ prompt: "Scope: unknown dependency group\nQuestions:\n- Trace the bounded subsystem ownership.\nStop condition: return exact evidence." })
  await before(hooks, "parent", "partitioned", "task", partitioned)
  await after(hooks, "parent", "partitioned", "task", partitioned, { output: exploreComplete("Mapped src/owner.mjs."), metadata: { sessionId: "partition-child" } })
  await assert.doesNotReject(() => before(hooks, "parent", "debt-cleared", "read", { filePath: "src/another.mjs" }))
})

test("Task output records and reports packet normalizations", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await register(hooks, "child-normalized", "explore")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child-normalized", role: "assistant", finish: "stop" } } } })
  const preflight = await before(hooks, "parent", "task-normalized", "task", taskArgs({ prompt: "Scope: Trace the unknown request flow.\nQuestions:\n- One\n- Two\n- Three\n- Four\n- Five\nStop condition: Done." }))
  const output = await after(hooks, "parent", "task-normalized", "task", preflight.args, {
      output: exploreComplete("The flow is mapped."),
    metadata: { sessionId: "child-normalized" },
  })
  assert.deepEqual(output.metadata.operationalSchema.preflightNormalizations, ["questions-deferred:2"])
  assert.equal(output.metadata.operationalSchema.schemaVersion, SCHEMA_VERSION)
  assert.equal(output.metadata.operationalSchema.boundaryReset, true)
  assert.match(output.output, /Task packet normalized before launch \(questions-deferred:2\)/)
})

test("Verify transport completion does not imply verification success or path coverage", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await register(hooks, "verify-child", "verify")
  await before(hooks, "verify-child", "read-log", "read", { filePath: "logs/output.txt" })
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "verify-child", role: "assistant", finish: "stop" } } } })
  const args = taskArgs({ subagent_type: "verify" })
  await before(hooks, "parent", "verify-blocked", "task", args)
  const output = await after(hooks, "parent", "verify-blocked", "task", args, {
    output: "Validation was blocked. src/a.py was NOT RUN.\nOPERATIONAL_RESULT: BLOCKED; COMMANDS_RUN: 0; COMMANDS_REQUIRED: 2",
    metadata: { sessionId: "verify-child" },
  })
  assert.equal(output.metadata.operationalSchema.transportComplete, true)
  assert.equal(output.metadata.operationalSchema.complete, false)
  assert.equal(output.metadata.operationalSchema.outcome, "blocked")
  assert.equal(output.metadata.operationalSchema.pathCount, 0)
  assert.deepEqual(output.metadata.operationalSchema.reasons, ["verify-outcome-blocked"])
})

test("Verify requires an explicit PASS marker with matching nonzero command counts", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (const [callID, text, expectedReason] of [
    ["missing", "All checks passed.", "verify-result-marker-missing"],
    ["mismatch", "OPERATIONAL_RESULT: PASS; COMMANDS_RUN: 1; COMMANDS_REQUIRED: 2", "verify-command-count-mismatch"],
  ]) {
    const child = `child-${callID}`
    await register(hooks, child, "verify")
    await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: child, role: "assistant", finish: "stop" } } } })
    const args = taskArgs({ subagent_type: "verify" })
    await before(hooks, "parent", callID, "task", args)
    const output = await after(hooks, "parent", callID, "task", args, { output: text, metadata: { sessionId: child } })
    assert.equal(output.metadata.operationalSchema.complete, false)
    assert.deepEqual(output.metadata.operationalSchema.reasons, [expectedReason])
  }
})

test("Fresh-review requires CLEAN with complete target counts before advancing the gate", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await before(hooks, "parent", "edit", "edit", { filePath: "src/security.py" })
  const args = taskArgs({ subagent_type: "fresh-review", prompt: "Scope: security edit\nTargets:\n- src/security.py\nQuestions:\n- Is the invariant preserved?\nStop condition: the target is reviewed." })
  for (const [suffix, text, reason] of [
    ["missing", "No findings.", "operational-review-marker-missing"],
    ["findings", "A blocking finding.\nOPERATIONAL_REVIEW: FINDINGS; TARGETS_REVIEWED: 1; TARGETS_REQUIRED: 1", "operational-review-outcome-findings"],
    ["count", "No findings.\nOPERATIONAL_REVIEW: CLEAN; TARGETS_REVIEWED: 1; TARGETS_REQUIRED: 2", "operational-review-count-mismatch"],
  ]) {
    const child = `review-${suffix}`
    await register(hooks, child, "fresh-review")
    await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: child, role: "assistant", finish: "stop" } } } })
    await before(hooks, "parent", suffix, "task", args)
    const output = await after(hooks, "parent", suffix, "task", args, { output: text, metadata: { sessionId: child } })
    assert.equal(output.metadata.operationalSchema.complete, false)
    assert.ok(output.metadata.operationalSchema.reasons.includes(reason))
  }
  const child = "review-clean"
  await register(hooks, child, "fresh-review")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: child, role: "assistant", finish: "stop" } } } })
  await before(hooks, "parent", "clean", "task", args)
  const clean = await after(hooks, "parent", "clean", "task", args, { output: reviewClean("No findings."), metadata: { sessionId: child } })
  assert.equal(clean.metadata.operationalSchema.complete, true)
})

test("budget exhaustion is advisory and does not fabricate an incomplete Explore result", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  const args = taskArgs({ prompt: "Scope: unknown subsystem\nTargets:\n- src\nQuestions:\n- Trace ownership.\nStop condition: the subsystem is mapped." })
  await before(hooks, "parent", "task", "task", args)
  await register(hooks, "budget-child", "explore")
  for (let index = 0; index < DEFAULT_POLICY.childToolCalls.explore; index += 1) await before(hooks, "budget-child", `read-${index}`, "read", { filePath: `src/${index}.py` })
  await assert.doesNotReject(() => before(hooks, "budget-child", "overflow", "read", { filePath: "src/overflow.py" }))
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "budget-child", role: "assistant", finish: "stop" } } } })
  const output = await after(hooks, "parent", "task", "task", args, { output: exploreComplete("Mapped."), metadata: { sessionId: "budget-child" } })
  assert.equal(output.metadata.operationalSchema.complete, true)
  assert.ok(output.metadata.operationalSchema.guardEvents.some((event) => event.rule === "child-tool-budget-advisory" && event.advisory === true))
})

test("read-only shell reconnaissance participates in the primary routing ceiling", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (let index = 1; index <= DEFAULT_POLICY.primaryReadHardLimit; index += 1) {
    await before(hooks, "parent", `shell-${index}`, "bash", { command: `rtk rg -n symbol_${index} .` })
  }
  await assert.doesNotReject(() => before(hooks, "parent", "shell-advised", "bash", { command: "git ls-files" }))
})

test("fourth direct validation command is advisory", async () => {
  const hooks = createOperationGuard({ env: {} })
  await register(hooks, "parent", "build")
  await before(hooks, "parent", "v1", "bash", { command: "ruff check src" })
  await after(hooks, "parent", "v1", "bash", { command: "ruff check src" })
  await before(hooks, "parent", "v2", "bash", { command: "pytest -q tests/unit" })
  await after(hooks, "parent", "v2", "bash", { command: "pytest -q tests/unit" })
  await before(hooks, "parent", "v3", "bash", { command: "pyrefly check" })
  await after(hooks, "parent", "v3", "bash", { command: "pyrefly check" })
  await assert.doesNotReject(() => before(hooks, "parent", "v4", "bash", { command: "pytest -q tests/integration" }))
})

test("newline, env, venv-python, and xargs validation forms cannot bypass routing", async () => {
  const hooks = createOperationGuard({ env: {} })
  await register(hooks, "parent", "build")
  await assert.doesNotReject(() => before(hooks, "parent", "advisory", "bash", { command: "env PYTHONDONTWRITEBYTECODE=1 pytest -q\n.venv-project/bin/python -m pyrefly check\nxargs -n1 ruff check\npytest tests" }))
})

test("repository venv executables and assignment-prefixed commands count as validation", async () => {
  const hooks = createOperationGuard({ env: {} })
  await register(hooks, "parent", "build")
  await before(hooks, "parent", "venv-ruff", "bash", { command: ".venv-project/bin/ruff check src" })
  await after(hooks, "parent", "venv-ruff", "bash", { command: ".venv-project/bin/ruff check src" })
  await before(hooks, "parent", "venv-pytest", "bash", { command: "PYTHONDONTWRITEBYTECODE=1 .venv-project/bin/pytest -q tests" })
  await after(hooks, "parent", "venv-pytest", "bash", { command: "PYTHONDONTWRITEBYTECODE=1 .venv-project/bin/pytest -q tests" })
  await before(hooks, "parent", "venv-pyrefly", "bash", { command: ".venv-project/bin/pyrefly check" })
  await after(hooks, "parent", "venv-pyrefly", "bash", { command: ".venv-project/bin/pyrefly check" })
  await assert.doesNotReject(() => before(hooks, "parent", "venv-mypy", "bash", { command: ".venv-project/bin/mypy src" }))
})

test("primary compound shell packet limits are advisory", async () => {
  const hooks = createOperationGuard({ env: {} })
  await register(hooks, "parent", "build")
  await assert.doesNotReject(() => before(hooks, "parent", "omnibus-shell", "bash", { command: "git status; git rev-parse HEAD; git diff --stat; git log -1; git branch --show-current; git status; git log -1" }))
})

test("literal output labels do not inflate the primary shell segment count", async () => {
  const hooks = createOperationGuard({ env: {} })
  await register(hooks, "parent", "build")
  await assert.doesNotReject(() => before(hooks, "parent", "labeled-shell", "bash", { command: "git status; echo BRANCH; git branch --show-current; echo HEAD; git rev-parse HEAD; echo LOG; git log -1" }))
})

test("large primary shell packets are admitted with advisories", async () => {
  const hooks = createOperationGuard({ env: {} })
  await register(hooks, "parent", "build")
  for (let index = 0; index < 24; index += 1) {
    await assert.doesNotReject(() => before(hooks, "parent", `large-${index}`, "bash", { command: "git status; git rev-parse HEAD; git diff --stat; git log -1; git branch --show-current; git status; git diff" }))
  }
  await assert.doesNotReject(() => before(hooks, "parent", "accepted", "todowrite", { todos: [] }))
})

test("npm run check is classified as a validation gate", async () => {
  const hooks = createOperationGuard({ env: {} })
  await register(hooks, "parent", "build")
  await before(hooks, "parent", "v1", "bash", { command: "npm run check" })
  await after(hooks, "parent", "v1", "bash", { command: "npm run check" })
  await before(hooks, "parent", "v2", "bash", { command: "npm test" })
  await after(hooks, "parent", "v2", "bash", { command: "npm test" })
  await before(hooks, "parent", "v3", "bash", { command: "pytest -q" })
  await after(hooks, "parent", "v3", "bash", { command: "pytest -q" })
  await assert.doesNotReject(() => before(hooks, "parent", "v4", "bash", { command: "mypy src" }))
})

test("ruff mutation is not misclassified as a validation gate", async () => {
  const hooks = createOperationGuard({ env: {} })
  await register(hooks, "parent", "build")
  await before(hooks, "parent", "format", "bash", { command: "ruff format src" })
  await after(hooks, "parent", "format", "bash", { command: "ruff format src" })
  await before(hooks, "parent", "v1", "bash", { command: "ruff format --check src" })
  await after(hooks, "parent", "v1", "bash", { command: "ruff format --check src" })
  await before(hooks, "parent", "v2", "bash", { command: "pytest -q" })
  await after(hooks, "parent", "v2", "bash", { command: "pytest -q" })
  await before(hooks, "parent", "v3", "bash", { command: "mypy src" })
  await after(hooks, "parent", "v3", "bash", { command: "mypy src" })
  await assert.doesNotReject(() => before(hooks, "parent", "v4", "bash", { command: "pytest tests" }))
})

test("commit after multi-file production edits requires fresh-review and Verify", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (const [index, name] of ["a", "b", "c"].entries()) {
    await before(hooks, "parent", `edit-${index}`, "edit", { filePath: `src/${name}.py` })
  }
  await assert.rejects(() => before(hooks, "parent", "commit-1", "bash", { command: "git commit -m test" }), /fresh-review/)

  const review = taskArgs({ subagent_type: "fresh-review", prompt: "Scope: three-file implementation diff\nQuestions:\n- Does the diff preserve the stated invariant in src/a.py, src/b.py, and src/c.py?\nStop condition: every changed production path is assessed for actionable findings." })
  await register(hooks, "review-child", "fresh-review")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "review-child", role: "assistant", finish: "stop" } } } })
  await before(hooks, "parent", "review", "task", review)
  await after(hooks, "parent", "review", "task", review, { output: reviewClean("No findings. src/a.py src/b.py src/c.py", 3), metadata: { sessionId: "review-child" } })
  await assert.rejects(() => before(hooks, "parent", "commit-2", "bash", { command: "rtk git commit -m test" }), /PASS Verify/)

  const verify = taskArgs({ subagent_type: "verify", prompt: "Scope: changed production files\nQuestions:\n- Do the focused test and static gates pass?\nStop condition: requested commands have exit statuses or the first root failure is identified." })
  await register(hooks, "failed-verify-child", "verify")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "failed-verify-child", role: "assistant", finish: "stop" } } } })
  await before(hooks, "parent", "failed-verify", "task", verify)
  await after(hooks, "parent", "failed-verify", "task", verify, {
    output: "One required gate failed.\nOPERATIONAL_RESULT: FAIL; COMMANDS_RUN: 2; COMMANDS_REQUIRED: 2",
    metadata: { sessionId: "failed-verify-child" },
  })
  await assert.rejects(() => before(hooks, "parent", "commit-after-failed-verify", "bash", { command: "git commit -m test" }), /PASS Verify/)

  await register(hooks, "verify-child", "verify")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "verify-child", role: "assistant", finish: "stop" } } } })
  await before(hooks, "parent", "verify", "task", verify)
  await after(hooks, "parent", "verify", "task", verify, { output: "All requested commands passed with exit status 0.\nOPERATIONAL_RESULT: PASS; COMMANDS_RUN: 2; COMMANDS_REQUIRED: 2", metadata: { sessionId: "verify-child" } })
  await assert.doesNotReject(() => before(hooks, "parent", "commit-3", "bash", { command: "git commit -m test" }))
})

test("staging and commit in one publish packet is allowed after current review and Verify gates", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (const [index, name] of ["a", "b", "c"].entries()) {
    await before(hooks, "parent", `edit-${index}`, "edit", { filePath: `src/${name}.py` })
  }
  const publishPacket = "git add -- src/a.py src/b.py src/c.py && git commit -m test > /tmp/opencode-commit.out 2>&1 && cat /tmp/opencode-commit.out"
  await assert.rejects(() => before(hooks, "parent", "premature-stage-and-commit", "bash", { command: publishPacket }), /fresh-review/)

  const review = taskArgs({ subagent_type: "fresh-review", prompt: "Scope: three-file implementation diff\nQuestions:\n- Is the bounded diff clean?\nStop condition: every changed production path is reviewed." })
  await register(hooks, "review-child", "fresh-review")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "review-child", role: "assistant", finish: "stop" } } } })
  await before(hooks, "parent", "review", "task", review)
  await after(hooks, "parent", "review", "task", review, { output: reviewClean("No findings. src/a.py src/b.py src/c.py", 3), metadata: { sessionId: "review-child" } })

  const verify = taskArgs({ subagent_type: "verify", prompt: "Scope: three-file implementation gates\nQuestions:\n- Do all required gates pass?\nStop condition: every required command has an exit status." })
  await register(hooks, "verify-child", "verify")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "verify-child", role: "assistant", finish: "stop" } } } })
  await before(hooks, "parent", "verify", "task", verify)
  await after(hooks, "parent", "verify", "task", verify, { output: "All gates passed.\nOPERATIONAL_RESULT: PASS; COMMANDS_RUN: 2; COMMANDS_REQUIRED: 2", metadata: { sessionId: "verify-child" } })

  await assert.rejects(() => before(hooks, "parent", "workspace-redirect-and-commit", "bash", { command: "git commit -m test > artifacts/commit.out" }), /fresh-review/)
  await assert.doesNotReject(() => before(hooks, "parent", "stage-and-commit", "bash", { command: publishPacket }))
})

test("shell mutations are high-risk edit generations and gate both commit and push", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  await before(hooks, "parent", "shell-fix", "bash", { command: "ruff check src --fix" })
  await assert.rejects(() => before(hooks, "parent", "commit-shell-fix", "bash", { command: "rtk git add src && rtk git commit -m fixed" }), /fresh-review/)
  await assert.rejects(() => before(hooks, "parent", "push-shell-fix", "bash", { command: "git -C /tmp/project push origin branch" }), /fresh-review/)
})

test("file redirects are mutations but descriptor-only redirects are not", async () => {
  const cleanHooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(cleanHooks, "clean-parent", "build")
  await before(cleanHooks, "clean-parent", "stderr", "bash", { command: "git fetch origin 2>&1" })
  await assert.doesNotReject(() => before(cleanHooks, "clean-parent", "clean-commit", "bash", { command: "git commit -m metadata-only" }))

  const dirtyHooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(dirtyHooks, "dirty-parent", "build")
  await before(dirtyHooks, "dirty-parent", "redirect", "bash", { command: "printf generated > src/generated.txt" })
  await assert.rejects(() => before(dirtyHooks, "dirty-parent", "dirty-commit", "bash", { command: "git commit -m generated" }), /fresh-review/)
})

test("primary context pressure uses the active agent's initialization-derived model budget", async () => {
  const config = {
    model: "local/chat",
    compaction: { reserved: 40960 },
    provider: { local: { models: {
      chat: { limit: { context: 262144, input: 241664, output: 20480 } },
      "chat-review": { limit: { context: 262144, input: 245760, output: 16384 } },
      "chat-audit": { limit: { context: 262144, input: 241664, output: 20480 } },
    } } },
    agent: {
      plan: { model: "local/chat-audit" },
      build: { model: "local/chat" },
      review: { model: "local/chat-review" },
      research: { model: "local/chat-audit" },
    },
  }
  const policy = policyFromConfig(config, {})
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {}, policy })
  await register(hooks, "parent", "build")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "parent", role: "assistant", finish: "tool-calls", tokens: { input: policy.primaryContext.build.warningTokens } } } } })
  assert.match(await system(hooks, "parent"), /primary input context is 200704 tokens.*warning=200704.*model=local\/chat.*Remain in this session/s)
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "parent", role: "assistant", finish: "tool-calls", tokens: { input: policy.primaryContext.build.hardLimitTokens } } } } })
  await assert.rejects(() => before(hooks, "parent", "context-block", "todowrite", { todos: [] }), /emergency context ceiling reached 241664 tokens.*model input limit 241664.*same session/)
  await assert.rejects(() => before(hooks, "parent", "context-edit", "edit", { filePath: "src/final.mjs" }), /Call no more tools/)
  await assert.rejects(() => before(hooks, "parent", "context-task", "task", taskArgs()), /Call no more tools/)

  const reviewHooks = createOperationGuard({ directory: "/tmp/project-review", env: {}, policy })
  await register(reviewHooks, "review-parent", "review")
  await reviewHooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "review-parent", role: "assistant", finish: "tool-calls", tokens: { input: 200704 } } } } })
  assert.doesNotMatch(await system(reviewHooks, "review-parent"), /primary input context/)
  await reviewHooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "review-parent", role: "assistant", finish: "tool-calls", tokens: { input: policy.primaryContext.review.warningTokens } } } } })
  assert.match(await system(reviewHooks, "review-parent"), /primary input context is 204800 tokens.*model=local\/chat-review/)
})

test("compaction hook preserves operational generations and forces auto-continue", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (const [index, name] of ["a", "b", "c"].entries()) await before(hooks, "parent", `edit-${index}`, "edit", { filePath: `src/${name}.py` })
  const compacting = { context: [], prompt: undefined }
  await hooks["experimental.session.compacting"]({ sessionID: "parent" }, compacting)
  assert.match(compacting.context.join("\n"), /Continue in this same session.*Edit generation: 3; Fresh-review generation: 0; Verify generation: 0/s)
  const autocontinue = { enabled: false }
  await hooks["experimental.compaction.autocontinue"]({ sessionID: "parent" }, autocontinue)
  assert.equal(autocontinue.enabled, true)
})

test("workspace safety generations survive a fresh primary session and plugin restart", async () => {
  const stateDirectory = await mkdtemp(join(tmpdir(), "opencode-operation-state-"))
  const first = createOperationGuard({ directory: "/tmp/project", env: {}, stateDirectory })
  await register(first, "parent-a", "build")
  for (const [index, name] of ["a", "b", "c"].entries()) await before(first, "parent-a", `edit-${index}`, "edit", { filePath: `src/${name}.py` })

  const second = createOperationGuard({ directory: "/tmp/project", env: {}, stateDirectory })
  await register(second, "parent-b", "build")
  await assert.rejects(() => before(second, "parent-b", "commit", "bash", { command: "git commit -m unsafe" }), /fresh-review/)
})

test("external workdir publish and identity calls cannot close the local campaign", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent-external-campaign", "build")
  await before(hooks, "parent-external-campaign", "edit", "edit", { filePath: "docs/result.md" })
  const externalCommit = { command: "git commit -m external", workdir: "/tmp/other-project" }
  await before(hooks, "parent-external-campaign", "external-commit", "bash", externalCommit)
  await after(hooks, "parent-external-campaign", "external-commit", "bash", externalCommit, { output: "committed", metadata: { exit: 0 } })
  const sha = "a".repeat(40)
  const externalIdentity = { command: `/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/workspace-identity.mjs`, workdir: "/tmp/other-project" }
  const identityOutput = `[Git] HEAD SHA: ${sha}\n[Git] Worktree Status: CLEAN\n[Git] Diff Check: CLEAN\n`
  const output = await after(hooks, "parent-external-campaign", "external-identity", "bash", externalIdentity, { output: identityOutput, metadata: { exit: 0 } })
  assert.doesNotMatch(output.output, /OPERATIONAL_CAMPAIGN: closed/)
  const compacting = { context: [] }
  await hooks["experimental.session.compacting"]({ sessionID: "parent-external-campaign" }, compacting)
  assert.match(compacting.context.join("\n"), /Edit generation: 1/)
})

test("campaign closure requires publish at the latest edit and an exact clean local identity proof", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent-campaign-close", "build")
  await before(hooks, "parent-campaign-close", "edit-1", "edit", { filePath: "docs/result.md" })
  const commit = { command: "git commit -m result" }
  await before(hooks, "parent-campaign-close", "commit-1", "bash", commit)
  await after(hooks, "parent-campaign-close", "commit-1", "bash", commit, { output: "committed", metadata: { exit: 0 } })
  await before(hooks, "parent-campaign-close", "edit-2", "edit", { filePath: "docs/result.md" })
  const sha = "b".repeat(40)
  const identity = { command: "rtk /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/workspace-identity.mjs" }
  let output = await after(hooks, "parent-campaign-close", "identity-before-republish", "bash", identity, { output: `[Git] HEAD SHA: ${sha}\n[Git] Worktree Status: CLEAN\n[Git] Diff Check: CLEAN\n`, metadata: { exit: 0 } })
  assert.doesNotMatch(output.output, /OPERATIONAL_CAMPAIGN: closed/)
  await before(hooks, "parent-campaign-close", "commit-2", "bash", commit)
  await after(hooks, "parent-campaign-close", "commit-2", "bash", commit, { output: "committed", metadata: { exit: 0 } })
  output = await after(hooks, "parent-campaign-close", "identity-after-republish", "bash", identity, { output: `[Git] HEAD SHA: ${sha}\n[Git] Worktree Status: CLEAN\n[Git] Diff Check: CLEAN\n`, metadata: { exit: 0 } })
  assert.match(output.output, /OPERATIONAL_CAMPAIGN: closed/)
})

test("workspace identity ownership rejects execution-altering environment prefixes", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent-prefixed-identity", "build")
  await before(hooks, "parent-prefixed-identity", "edit", "edit", { filePath: "docs/result.md" })
  const commit = { command: "git commit -m result" }
  await before(hooks, "parent-prefixed-identity", "commit", "bash", commit)
  await after(hooks, "parent-prefixed-identity", "commit", "bash", commit, { output: "committed", metadata: { exit: 0 } })
  const command = "NODE_OPTIONS=--require=/tmp/forge.js /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/workspace-identity.mjs"
  const output = await after(hooks, "parent-prefixed-identity", "prefixed-identity", "bash", { command }, { output: `[Git] HEAD SHA: ${"c".repeat(40)}\n[Git] Worktree Status: CLEAN\n[Git] Diff Check: CLEAN\n`, metadata: { exit: 0 } })
  assert.doesNotMatch(output.output, /OPERATIONAL_CAMPAIGN: closed/)
})

test("workspace identity ownership rejects shell operators in helper arguments", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent-operator-identity", "build")
  await before(hooks, "parent-operator-identity", "edit", "edit", { filePath: "docs/result.md" })
  const commit = { command: "git commit -m result" }
  await before(hooks, "parent-operator-identity", "commit", "bash", commit)
  await after(hooks, "parent-operator-identity", "commit", "bash", commit, { output: "committed", metadata: { exit: 0 } })
  const clean = `[Git] HEAD SHA: ${"d".repeat(40)}\n[Git] Worktree Status: CLEAN\n[Git] Diff Check: CLEAN\n`
  for (const [index, command] of [
    "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/workspace-identity.mjs --check-bin /tmp/$(/tmp/other)",
    "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/workspace-identity.mjs --check-bin `/tmp/other`",
    "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/workspace-identity.mjs --check-bin /tmp/foo&/tmp/other",
  ].entries()) {
    const output = await after(hooks, "parent-operator-identity", `operator-${index}`, "bash", { command }, { output: clean, metadata: { exit: 0 } })
    assert.doesNotMatch(output.output, /OPERATIONAL_CAMPAIGN: closed/)
  }
})

test("pending authority permits merge-base while retaining exact mutation blocks", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  const target = "a".repeat(40)
  await message(hooks, "parent-merge-base", "build", `REQUIRED EXACT HEAD: ${target}`)
  await assert.doesNotReject(() => before(hooks, "parent-merge-base", "merge-base", "bash", { command: `git merge-base ${target} HEAD` }))
  await assert.doesNotReject(() => before(hooks, "parent-merge-base", "symbolic-ref-read", "bash", { command: "git symbolic-ref --short HEAD" }))
  await assert.doesNotReject(() => before(hooks, "parent-merge-base", "global-merge-base", "bash", { command: `git -P --git-dir '.git metadata' merge-base ${target} HEAD` }))
  await assert.doesNotReject(() => before(hooks, "parent-merge-base", "global-symbolic-ref-read", "bash", { command: "git -p --exec-path=/usr/lib/git-core symbolic-ref --short HEAD" }))
  for (const [callID, command] of [
    ["merge", `git merge --ff-only ${target}`],
    ["rebase", `git rebase ${target}`],
    ["reset", `git reset --hard ${target}`],
    ["cherry-pick", `git cherry-pick ${target}`],
    ["pull", "git pull --ff-only"],
    ["revert", `git revert ${target}`],
    ["am", "git am patch.mbox"],
    ["update-ref", `git update-ref refs/heads/main ${target}`],
    ["symbolic-ref", "git symbolic-ref HEAD refs/heads/main"],
    ["bisect", "git bisect bad"],
    ["configured-pull", "git -c advice.detachedHead=false pull --ff-only"],
    ["git-dir-rebase", "git --git-dir .git rebase refs/heads/topic"],
    ["work-tree-commit", "git --work-tree=/tmp/project commit -m result"],
    ["pager-pull", "git -P pull --ff-only"],
    ["exec-rebase", "git --exec-path=/usr/lib/git-core rebase refs/heads/topic"],
    ["quoted-commit", "git --work-tree '/tmp/project tree' commit -m result"],
    ["conservative-option-pull", "git --future-global value pull --ff-only"],
  ]) await assert.rejects(() => before(hooks, "parent-merge-base", callID, "bash", { command }), /exact-head admission is pending/)
})

test("failed and alternate HEAD mutators invalidate provenance before execution", async () => {
  const proven = "c".repeat(40)
  for (const [index, command, exit] of [
    [1, "git rebase refs/heads/topic", 1],
    [2, "git pull --ff-only", 0],
    [3, "git revert HEAD~1", 0],
    [4, `git update-ref refs/heads/main ${"d".repeat(40)}`, 0],
    [5, "git symbolic-ref HEAD refs/heads/main", 0],
    [6, "git bisect bad", 0],
    [7, "git -c advice.detachedHead=false pull --ff-only", 1],
    [8, "git --git-dir .git rebase refs/heads/topic", 1],
    [9, "git --work-tree=/tmp/project commit -m result", 0],
    [10, "git -P pull --ff-only", 1],
    [11, "git -p rebase refs/heads/topic", 1],
    [12, "git --exec-path=/usr/lib/git-core commit -m result", 0],
    [13, "git --work-tree '/tmp/project tree' pull --ff-only", 1],
  ]) {
    const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
    const parent = `parent-mutator-${index}`
    const proofArgs = { command: "git rev-parse HEAD" }
    await register(hooks, parent, "build")
    await before(hooks, parent, "proof", "bash", proofArgs)
    await after(hooks, parent, "proof", "bash", proofArgs, { output: `${proven}\n`, metadata: { exit: 0 } })
    const mutationArgs = { command }
    await before(hooks, parent, "mutation", "bash", mutationArgs)
    await after(hooks, parent, "mutation", "bash", mutationArgs, { output: exit === 0 ? "completed" : "conflict", metadata: { exit } })
    const args = taskArgs()
    await before(hooks, parent, "task", "task", args)
    const child = `child-mutator-${index}`
    await register(hooks, child, "explore")
    await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: child, role: "assistant", finish: "stop" } } } })
    const output = await after(hooks, parent, "task", "task", args, { output: exploreComplete("Bounded handoff."), metadata: { sessionId: child } })
    assert.equal(output.metadata.operationalSchema.taskWorkspaceHead, undefined, command)
    assert.equal(output.metadata.operationalSchema.taskWorkspaceHeadStatus, "unknown", command)
  }
})

test("unbound bare HEAD proof establishes current Task provenance without admission history", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  const proven = "e".repeat(40)
  await register(hooks, "parent-unbound-proof", "build")
  const proofArgs = { command: "git rev-parse HEAD" }
  await before(hooks, "parent-unbound-proof", "proof", "bash", proofArgs)
  await after(hooks, "parent-unbound-proof", "proof", "bash", proofArgs, { output: `${proven}\n`, metadata: { exit: 0 } })
  const args = taskArgs()
  await before(hooks, "parent-unbound-proof", "task", "task", args)
  await register(hooks, "child-unbound-proof", "explore")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child-unbound-proof", role: "assistant", finish: "stop" } } } })
  const output = await after(hooks, "parent-unbound-proof", "task", "task", args, { output: exploreComplete("Bounded handoff."), metadata: { sessionId: "child-unbound-proof" } })
  assert.equal(output.metadata.operationalSchema.admissionObservedHead, undefined)
  assert.equal(output.metadata.operationalSchema.observedHead, undefined)
  assert.equal(output.metadata.operationalSchema.taskWorkspaceHead, proven)
  assert.equal(output.metadata.operationalSchema.taskWorkspaceHeadStatus, "proven")
})

test("Task provenance separates historical admission from the currently proven workspace HEAD", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  const admitted = "a".repeat(40)
  const committed = "b".repeat(40)
  await message(hooks, "parent-provenance", "build", `REQUIRED EXACT HEAD: ${admitted}`)
  const proofArgs = { command: "git rev-parse HEAD" }
  await before(hooks, "parent-provenance", "proof-a", "bash", proofArgs)
  await after(hooks, "parent-provenance", "proof-a", "bash", proofArgs, { output: `${admitted}\n`, metadata: { exit: 0 } })

  const completeTask = async (callID, childID) => {
    const args = taskArgs()
    await before(hooks, "parent-provenance", callID, "task", args)
    await register(hooks, childID, "explore")
    await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: childID, role: "assistant", finish: "stop" } } } })
    return after(hooks, "parent-provenance", callID, "task", args, { output: exploreComplete("Bounded handoff."), metadata: { sessionId: childID } })
  }

  let output = await completeTask("task-a", "child-a")
  assert.equal(output.metadata.operationalSchema.admissionObservedHead, admitted)
  assert.equal(output.metadata.operationalSchema.taskWorkspaceHead, admitted)
  assert.equal(output.metadata.operationalSchema.taskWorkspaceHeadStatus, "proven")

  const commitArgs = { command: "git commit -m result" }
  await before(hooks, "parent-provenance", "commit", "bash", commitArgs)
  await after(hooks, "parent-provenance", "commit", "bash", commitArgs, { output: "committed", metadata: { exit: 0 } })
  output = await completeTask("task-unknown", "child-unknown")
  assert.equal(output.metadata.operationalSchema.admissionObservedHead, admitted)
  assert.equal(output.metadata.operationalSchema.observedHead, admitted)
  assert.equal(output.metadata.operationalSchema.taskWorkspaceHead, undefined)
  assert.equal(output.metadata.operationalSchema.taskWorkspaceHeadStatus, "unknown")

  const identityArgs = { command: "rtk /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/workspace-identity.mjs" }
  await after(hooks, "parent-provenance", "identity-b", "bash", identityArgs, { output: `[Git] HEAD SHA: ${committed}\n[Git] Worktree Status: DIRTY\n[Git] Diff Check: CLEAN\n`, metadata: { exit: 0 } })
  output = await completeTask("task-b", "child-b")
  assert.equal(output.metadata.operationalSchema.admissionObservedHead, admitted)
  assert.equal(output.metadata.operationalSchema.taskWorkspaceHead, committed)
  assert.equal(output.metadata.operationalSchema.taskWorkspaceHeadStatus, "proven")
})

test("strict starting-head admission blocks reconciliation after a proved mismatch", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  const expected = "a".repeat(40)
  const observed = "b".repeat(40)
  await message(hooks, "parent", "build", `EXPECTED_START_HEAD=${expected}`)
  assert.match(await system(hooks, "parent"), /strict starting-head admission.*git rev-parse HEAD/s)
  await assert.rejects(() => before(hooks, "parent", "compound-proof", "bash", { command: "git status && git rev-parse HEAD" }), /proof must be one bare native git rev-parse HEAD/)
  await before(hooks, "parent", "proof", "bash", { command: "git rev-parse HEAD" })
  const proof = await after(hooks, "parent", "proof", "bash", { command: "git rev-parse HEAD" }, { output: `${observed}\n`, metadata: { exit: 0 } })
  assert.match(proof.output, new RegExp(`OPERATIONAL_AUTHORITY: mismatch; required=${expected}; observed=${observed}; mode=strict-start`))
  await assert.rejects(() => before(hooks, "parent", "fast-forward", "bash", { command: `git merge --ff-only ${expected}` }), /strict-start.*new user authority/)
  await assert.rejects(() => before(hooks, "parent", "edit", "edit", { filePath: "src/a.py" }), /strict-start mismatch requires new user authority/)
  const notice = await system(hooks, "parent")
  assert.match(notice, /STRICT STARTING-HEAD ADMISSION BLOCKED.*supplies new authority/s)
  assert.doesNotMatch(notice, /TARGET RECOVERY|git switch --detach/)
})

test("strict starting-head SHA aliases bind exact 40-hex tokens and tolerate trailing punctuation", async () => {
  const expected = "a".repeat(40)
  for (const [index, declaration] of [
    `REQUIRED STARTING HEAD: ${expected}`,
    `REQUIRED STARTING HEAD SHA: ${expected}`,
    `EXPECTED STARTING HEAD SHA: ${expected},`,
    `REQUIRED STARTING HEAD SHA: ${expected}"`,
  ].entries()) {
    const hooks = createOperationGuard({ directory: `/tmp/project-strict-alias-${index}`, env: {} })
    const sessionID = `strict-alias-${index}`
    await message(hooks, sessionID, "build", declaration)
    await before(hooks, sessionID, "proof", "bash", { command: "git rev-parse HEAD" })
    const proof = await after(hooks, sessionID, "proof", "bash", { command: "git rev-parse HEAD" }, { output: `${expected}\n`, metadata: { exit: 0 } })
    assert.equal(proof.metadata.operationalSchema.authorityBinding, expected)
    assert.equal(proof.metadata.operationalSchema.authorityMode, "strict-start")
    assert.equal(proof.metadata.operationalSchema.authorityStatus, "verified")
  }

  for (const [index, declaration] of [
    `REQUIRED STARTING HEAD SHA: ${"a".repeat(39)}`,
    `REQUIRED STARTING HEAD SHA: ${"a".repeat(41)}`,
    "REQUIRED STARTING HEAD SHA: main",
    expected,
  ].entries()) {
    const hooks = createOperationGuard({ directory: `/tmp/project-strict-invalid-${index}`, env: {} })
    const sessionID = `strict-invalid-${index}`
    await message(hooks, sessionID, "build", declaration)
    await before(hooks, sessionID, "proof", "bash", { command: "git rev-parse HEAD" })
    const proof = await after(hooks, sessionID, "proof", "bash", { command: "git rev-parse HEAD" }, { output: `${expected}\n`, metadata: { exit: 0 } })
    assert.equal(proof.metadata.operationalSchema.authorityBinding, undefined)
    assert.equal(proof.metadata.operationalSchema.authorityMode, undefined)
  }
})

test("exact-head target admission permits only an exact detached transition before proof", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  const target = "c".repeat(40)
  await message(hooks, "parent", "build", `REQUIRED EXACT HEAD: ${target}`)
  await assert.rejects(() => before(hooks, "parent", "wrong-merge", "bash", { command: `git merge --ff-only ${target}` }), new RegExp(`local-agent-assessment\\.mjs --spec.*git worktree add --detach <absolute-disposable-path> ${target}`, "s"))
  const compound = `git checkout --quiet --detach ${target} && git rev-parse HEAD`
  await assert.rejects(() => before(hooks, "parent", "compound-checkout", "bash", { command: compound }), /separate bare git rev-parse HEAD proof/)
  const command = `git checkout --quiet --detach ${target}`
  await before(hooks, "parent", "checkout", "bash", { command })
  await after(hooks, "parent", "checkout", "bash", { command }, { output: "", metadata: { exit: 0 } })
  await before(hooks, "parent", "proof", "bash", { command: "git rev-parse HEAD" })
  const proof = await after(hooks, "parent", "proof", "bash", { command: "git rev-parse HEAD" }, { output: `${target}\n`, metadata: { exit: 0 } })
  assert.equal(proof.metadata.operationalSchema.schemaVersion, SCHEMA_VERSION)
  assert.equal(proof.metadata.operationalSchema.authorityStatus, "verified")
  await assert.doesNotReject(() => before(hooks, "parent", "edit", "edit", { filePath: "src/a.py" }))
})

test("target mismatch recovery stays out of a fresh primary system prompt", async () => {
  const stateDirectory = await mkdtemp(join(tmpdir(), "opencode-target-state-"))
  const target = "f".repeat(40)
  const observed = "e".repeat(40)
  const first = createOperationGuard({ directory: "/tmp/project-target", env: {}, stateDirectory })
  await message(first, "parent-a", "build", `REQUIRED EXACT HEAD: ${target}`)
  await before(first, "parent-a", "proof", "bash", { command: "git rev-parse HEAD" })
  await after(first, "parent-a", "proof", "bash", { command: "git rev-parse HEAD" }, { output: `${observed}\n`, metadata: { exit: 0 } })

  const second = createOperationGuard({ directory: "/tmp/project-target", env: {}, stateDirectory })
  await register(second, "parent-b", "build")
  const notice = await system(second, "parent-b")
  assert.doesNotMatch(notice, /TARGET RECOVERY|git switch --detach|unless the user supplies new authority/)
  await assert.doesNotReject(() => before(second, "parent-b", "detach", "bash", { command: `git switch --detach ${target}` }))
})

test("target mismatch proof and rejected mutation provide one-step recovery feedback", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  const target = "d".repeat(40)
  const observed = "e".repeat(40)
  await message(hooks, "parent", "build", `REQUIRED EXACT HEAD: ${target}`)
  await before(hooks, "parent", "proof", "bash", { command: "git rev-parse HEAD" })
  const proof = await after(hooks, "parent", "proof", "bash", { command: "git rev-parse HEAD" }, { output: `${observed}\n`, metadata: { exit: 0 } })
  assert.match(proof.output, /REQUIRED STARTING HEAD: <40-lowercase-sha>/)
  assert.match(proof.output, /REQUIRED STARTING HEAD SHA: <40-lowercase-sha>/)
  assert.match(proof.output, /guard never infers a task change or releases target authority/i)
  assert.match(proof.output, /local-agent-assessment\.mjs --spec/)
  assert.match(proof.output, /reconcile-owner-base\.mjs --spec/)
  assert.match(proof.output, new RegExp(`git worktree add --detach <absolute-disposable-path> ${target}`))
  assert.doesNotMatch(proof.output, /run one bare git switch --detach/)
  assert.doesNotMatch(await system(hooks, "parent"), /TARGET RECOVERY|git switch --detach/)
  await assert.rejects(
    () => before(hooks, "parent", "branch", "bash", { command: "git switch refactor/research-controller" }),
    new RegExp(`local-agent-assessment\\.mjs --spec.*git worktree add --detach <absolute-disposable-path> ${target}`, "s"),
  )
})

test("target-mode compound worktree setup is rejected with the safe two-step sequence while the corrected sequence is admitted", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project-target-worktree", env: {} })
  const target = "d".repeat(40)
  const path = "/tmp/opencode/verify/worktrees/issue13-target"
  await message(hooks, "parent-target-worktree", "build", `REQUIRED EXACT HEAD: ${target}`)
  await assert.rejects(
    () => before(hooks, "parent-target-worktree", "compound-worktree", "bash", { command: `git worktree add --detach ${path} ${target} && git -C ${path} rev-parse HEAD` }),
    /one bare git worktree add --detach.*set subsequent tool workdir.*one separate bare git rev-parse HEAD/s,
  )

  const add = { command: `git worktree add --detach ${path} ${target}` }
  await assert.doesNotReject(() => before(hooks, "parent-target-worktree", "worktree-add", "bash", add))
  await after(hooks, "parent-target-worktree", "worktree-add", "bash", add, { output: "prepared", metadata: { exit: 0 } })
  const proofArgs = { command: "git rev-parse HEAD", workdir: path }
  await before(hooks, "parent-target-worktree", "worktree-proof", "bash", proofArgs)
  const proof = await after(hooks, "parent-target-worktree", "worktree-proof", "bash", proofArgs, { output: `${target}\n`, metadata: { exit: 0 } })
  assert.equal(proof.metadata.operationalSchema.authorityStatus, "verified")
})

test("explicit strict-start authority supersedes prior target publication gates only after the new declaration", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project-explicit-authority-change", env: {} })
  const first = "a".repeat(40)
  const second = "b".repeat(40)
  await message(hooks, "parent-explicit-change", "build", `REQUIRED EXACT HEAD: ${first}`)
  const proofArgs = { command: "git rev-parse HEAD" }
  await before(hooks, "parent-explicit-change", "proof-first", "bash", proofArgs)
  await after(hooks, "parent-explicit-change", "proof-first", "bash", proofArgs, { output: `${first}\n`, metadata: { exit: 0 } })
  for (const [index, name] of ["a", "b", "c"].entries()) await before(hooks, "parent-explicit-change", `edit-${index}`, "edit", { filePath: `src/${name}.py` })

  const review = taskArgs({ subagent_type: "fresh-review", prompt: "Scope: exact prior-head diff\nQuestions:\n- Is the bounded diff clean?\nStop condition: all changed production paths are reviewed." })
  await register(hooks, "review-explicit-change", "fresh-review")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "review-explicit-change", role: "assistant", finish: "stop" } } } })
  await before(hooks, "parent-explicit-change", "review", "task", review)
  await after(hooks, "parent-explicit-change", "review", "task", review, { output: reviewClean("No findings. src/a.py src/b.py src/c.py", 3), metadata: { sessionId: "review-explicit-change" } })

  const verify = taskArgs({ subagent_type: "verify", prompt: "Scope: exact prior-head gates\nQuestions:\n- Do the bounded gates pass?\nStop condition: all requested commands have exit status." })
  await register(hooks, "verify-explicit-change", "verify")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "verify-explicit-change", role: "assistant", finish: "stop" } } } })
  await before(hooks, "parent-explicit-change", "verify", "task", verify)
  await after(hooks, "parent-explicit-change", "verify", "task", verify, { output: "OPERATIONAL_RESULT: PASS; COMMANDS_RUN: 2; COMMANDS_REQUIRED: 2", metadata: { sessionId: "verify-explicit-change" } })
  await assert.doesNotReject(() => before(hooks, "parent-explicit-change", "commit-before-transition", "bash", { command: "git commit -m prior" }))

  await message(hooks, "parent-explicit-change", "build", `REQUIRED STARTING HEAD SHA: ${second}`)
  assert.match(await system(hooks, "parent-explicit-change"), new RegExp(`authority changed from ${first} to ${second}.*superseded`))
  await before(hooks, "parent-explicit-change", "proof-second", "bash", proofArgs)
  const secondProof = await after(hooks, "parent-explicit-change", "proof-second", "bash", proofArgs, { output: `${second}\n`, metadata: { exit: 0 } })
  assert.equal(secondProof.metadata.operationalSchema.authorityMode, "strict-start")
  await assert.rejects(() => before(hooks, "parent-explicit-change", "commit-after-transition", "bash", { command: "git commit -m new" }), /fresh-review/)
})

test("STALE target assessment admits only typed owner reconciliation and successful reconciliation releases target authority", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  const target = "d".repeat(40)
  const observed = "a".repeat(40)
  const base = "b".repeat(40)
  const spec = "/tmp/opencode/verify/assessments/pr357.json"
  const assessmentRunner = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs"
  const reconciliationRunner = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/reconcile-owner-base.mjs"
  await message(hooks, "parent", "build", `REQUIRED EXACT HEAD: ${target}`)
  await before(hooks, "parent", "proof", "bash", { command: "git rev-parse HEAD" })
  await after(hooks, "parent", "proof", "bash", { command: "git rev-parse HEAD" }, { output: `${observed}\n`, metadata: { exit: 0 } })

  const assessment = { command: `${assessmentRunner} --spec ${spec}` }
  await assert.doesNotReject(() => before(hooks, "parent", "assessment", "bash", assessment))
  const stale = await after(hooks, "parent", "assessment", "bash", assessment, {
    output: "HOST_EVIDENCE_RESULT=STALE\nGATE_DECISION=NOT_EVALUATED\n",
    metadata: { exit: 3 },
  })
  assert.match(stale.output, /ASSESSMENT_TERMINAL -> OWNER_RECONCILIATION/)
  await assert.rejects(() => before(hooks, "parent", "raw-base-merge", "bash", { command: `git merge --ff-only ${base}` }), /exact-head admission is mismatch/)
  await assert.rejects(() => before(hooks, "parent", "candidate-merge", "bash", { command: `git merge --ff-only ${target}` }), /exact-head admission is mismatch/)
  await assert.rejects(() => before(hooks, "parent", "malformed-reconcile", "bash", { command: `${reconciliationRunner} --spec ${spec} --expected-old-sha ${observed} --expected-base-sha ${base} --expected-target-sha ${target} --destination ${base}` }), /Owner-base reconciliation must use exactly/)
  await assert.rejects(() => before(hooks, "parent", "wrong-target-reconcile", "bash", { command: `${reconciliationRunner} --spec ${spec} --expected-old-sha ${observed} --expected-base-sha ${base} --expected-target-sha ${"f".repeat(40)}` }), /does not match persisted exact-head target/)

  const reconciliation = { command: `${reconciliationRunner} --spec ${spec} --expected-old-sha ${observed} --expected-base-sha ${base} --expected-target-sha ${target}` }
  await assert.doesNotReject(() => before(hooks, "parent", "reconcile", "bash", reconciliation))
  const reconciled = await after(hooks, "parent", "reconcile", "bash", reconciliation, {
    output: `OPERATIONAL_OWNER_RECONCILIATION: PASS; schema=opencode-owner-base-reconciliation-v1; assessment_id=pr357; expected_old_sha=${observed}; base_sha=${base}; head_sha=${target}; branch=main\nOWNER_BASE_RECONCILIATION_RESULT=PASS\n`,
    metadata: { exit: 0 },
  })
  assert.match(reconciled.output, new RegExp(`OWNER_RECONCILIATION -> TARGET_RELEASED; base=${base}`))
  const compacting = { context: [] }
  await hooks["experimental.session.compacting"]({ sessionID: "parent" }, compacting)
  assert.match(compacting.context.join("\n"), /Authority: unbound/)
})

test("recognized non-STALE assessment terminal releases target while interrupted execution remains fail-closed", async () => {
  const runner = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs"
  const spec = "/tmp/opencode/verify/assessments/pr-terminal.json"
  const target = "c".repeat(40)
  const observed = "a".repeat(40)

  const released = createOperationGuard({ directory: "/tmp/project-released", env: {} })
  await message(released, "parent-release", "build", `REQUIRED EXACT HEAD: ${target}`)
  await before(released, "parent-release", "proof", "bash", { command: "git rev-parse HEAD" })
  await after(released, "parent-release", "proof", "bash", { command: "git rev-parse HEAD" }, { output: `${observed}\n`, metadata: { exit: 0 } })
  const command = { command: `${runner} --spec ${spec}` }
  await before(released, "parent-release", "assessment", "bash", command)
  const failed = await after(released, "parent-release", "assessment", "bash", command, { output: "HOST_EVIDENCE_RESULT=FAIL\nGATE_DECISION=NOT_EVALUATED\n", metadata: { exit: 1 } })
  assert.match(failed.output, /ASSESSMENT_TERMINAL -> TARGET_RELEASED; result=FAIL/)
  const compacted = { context: [] }
  await released["experimental.session.compacting"]({ sessionID: "parent-release" }, compacted)
  assert.match(compacted.context.join("\n"), /Authority: unbound/)

  const interrupted = createOperationGuard({ directory: "/tmp/project-interrupted", env: {} })
  await message(interrupted, "parent-interrupted", "build", `REQUIRED EXACT HEAD: ${target}`)
  await before(interrupted, "parent-interrupted", "proof", "bash", { command: "git rev-parse HEAD" })
  await after(interrupted, "parent-interrupted", "proof", "bash", { command: "git rev-parse HEAD" }, { output: `${observed}\n`, metadata: { exit: 0 } })
  await before(interrupted, "parent-interrupted", "assessment", "bash", command)
  await after(interrupted, "parent-interrupted", "assessment", "bash", command, { output: "dispatcher crashed before typed terminal evidence", metadata: { exit: 2 } })
  await assert.rejects(() => before(interrupted, "parent-interrupted", "raw-merge", "bash", { command: `git merge --ff-only ${"b".repeat(40)}` }), /exact-head admission is mismatch/)
})

test("strict-start mismatch cannot use owner-base reconciliation as an escape hatch", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project-strict-reconcile", env: {} })
  const expected = "a".repeat(40)
  const observed = "b".repeat(40)
  const spec = "/tmp/opencode/verify/assessments/strict.json"
  const runner = "/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/reconcile-owner-base.mjs"
  await message(hooks, "parent", "build", `EXPECTED_START_HEAD=${expected}`)
  await before(hooks, "parent", "proof", "bash", { command: "git rev-parse HEAD" })
  await after(hooks, "parent", "proof", "bash", { command: "git rev-parse HEAD" }, { output: `${observed}\n`, metadata: { exit: 0 } })
  await assert.rejects(() => before(hooks, "parent", "reconcile", "bash", { command: `${runner} --spec ${spec} --expected-old-sha ${observed} --expected-base-sha ${expected} --expected-target-sha ${expected}` }), /available only for exact-head target authority/)
})

test("system augmentation is always coalesced into one leading message", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  assert.deepEqual(await systemMessages(hooks, "unknown", ["base", "earlier plugin"]), ["base\n\nearlier plugin"])

  const target = "c".repeat(40)
  await message(hooks, "parent", "build", `REQUIRED EXACT HEAD: ${target}`)
  const messages = await systemMessages(hooks, "parent", ["base", "earlier plugin"])
  assert.equal(messages.length, 1)
  assert.match(messages[0], /base\n\nearlier plugin\n\nOPERATIONAL GUARD: exact-head target/)
})

test("reasoning-only primary length exhaustion receives a bounded recovery turn", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  const target = "d".repeat(40)
  const observed = "a".repeat(40)
  await message(hooks, "parent", "build", `REQUIRED EXACT HEAD: ${target}`)
  await before(hooks, "parent", "proof", "bash", { command: "git rev-parse HEAD" })
  await after(hooks, "parent", "proof", "bash", { command: "git rev-parse HEAD" }, { output: `${observed}\n`, metadata: { exit: 0 } })
  await hooks.event({ event: { type: "message.part.updated", properties: { part: { sessionID: "parent", messageID: "reasoning-only", type: "reasoning", text: "long internal reasoning" } } } })
  await hooks.event({ event: { type: "message.updated", properties: { info: { id: "reasoning-only", sessionID: "parent", role: "assistant", finish: "length" } } } })

  const params = { maxOutputTokens: 12288 }
  await hooks["chat.params"]({ sessionID: "parent", agent: "build" }, params)
  assert.equal(params.maxOutputTokens, 1024)
  const messages = await systemMessages(hooks, "parent", ["base", "earlier plugin"])
  assert.equal(messages.length, 1)
  assert.match(messages[0], /BOUNDED LENGTH RECOVERY.*[Pp]reserve the owner checkout.*local-agent-assessment\.mjs --spec/s)
  assert.doesNotMatch(messages[0], /Execute one bare `git switch --detach/)
})

test("visible text or tool output does not trigger reasoning-only length recovery", async () => {
  for (const part of [
    { type: "text", text: "partial visible answer" },
    { type: "tool", state: { status: "pending" } },
  ]) {
    const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
    await register(hooks, `parent-${part.type}`, "build")
    await hooks.event({ event: { type: "message.part.updated", properties: { part: { sessionID: `parent-${part.type}`, messageID: `msg-${part.type}`, ...part } } } })
    await hooks.event({ event: { type: "message.updated", properties: { info: { id: `msg-${part.type}`, sessionID: `parent-${part.type}`, role: "assistant", finish: "length" } } } })
    assert.doesNotMatch(await system(hooks, `parent-${part.type}`), /BOUNDED LENGTH RECOVERY/)
  }
})

test("strict admission mismatch survives a plugin restart", async () => {
  const stateDirectory = await mkdtemp(join(tmpdir(), "opencode-authority-state-"))
  const expected = "d".repeat(40)
  const observed = "e".repeat(40)
  const first = createOperationGuard({ directory: "/tmp/project-authority", env: {}, stateDirectory })
  await message(first, "parent-a", "build", `EXPECTED_START_HEAD=${expected}`)
  await before(first, "parent-a", "proof", "bash", { command: "git rev-parse HEAD" })
  await after(first, "parent-a", "proof", "bash", { command: "git rev-parse HEAD" }, { output: `${observed}\n`, metadata: { exit: 0 } })

  const second = createOperationGuard({ directory: "/tmp/project-authority", env: {}, stateDirectory })
  await register(second, "parent-b", "build")
  await assert.rejects(() => before(second, "parent-b", "merge", "bash", { command: `git merge --ff-only ${expected}` }), /strict-start.*new user authority/)
})

test("corrupt persisted workspace state fails closed instead of disabling the harness", async () => {
  const stateDirectory = await mkdtemp(join(tmpdir(), "opencode-operation-corrupt-"))
  const workspace = "/tmp/project-corrupt"
  const key = createHash("sha256").update(workspace).digest("hex")
  await writeFile(join(stateDirectory, `${key}.json`), "{broken")
  const hooks = createOperationGuard({ directory: workspace, env: {}, stateDirectory })
  await register(hooks, "parent", "build")
  assert.match(await system(hooks, "parent"), /safety state could not be loaded.*fail-closed/)
  await assert.rejects(() => before(hooks, "parent", "commit", "bash", { command: "git commit -m unsafe" }), /fresh-review/)
})

test("an exact-head authority change supersedes prior review and verification gates", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  const first = "a".repeat(40)
  const second = "b".repeat(40)
  await message(hooks, "parent", "build", `EXPECTED_HEAD_SHA=${first}`)
  await before(hooks, "parent", "first-proof", "bash", { command: "git rev-parse HEAD" })
  await after(hooks, "parent", "first-proof", "bash", { command: "git rev-parse HEAD" }, { output: `${first}\n`, metadata: { exit: 0 } })
  for (const [index, name] of ["a", "b", "c"].entries()) {
    await before(hooks, "parent", `edit-${index}`, "edit", { filePath: `src/${name}.py` })
  }

  const review = taskArgs({ subagent_type: "fresh-review", prompt: "Scope: exact-head production diff\nQuestions:\n- Is the bounded diff safe in src/a.py, src/b.py, and src/c.py?\nStop condition: every changed production path is assessed." })
  await register(hooks, "review-authority", "fresh-review")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "review-authority", role: "assistant", finish: "stop" } } } })
  await before(hooks, "parent", "review-authority", "task", review)
  await after(hooks, "parent", "review-authority", "task", review, { output: reviewClean("No findings. src/a.py src/b.py src/c.py", 3), metadata: { sessionId: "review-authority" } })

  const verify = taskArgs({ subagent_type: "verify", prompt: "Scope: exact-head production diff\nQuestions:\n- Do the focused gates pass?\nStop condition: every requested command has an exit status." })
  await register(hooks, "verify-authority", "verify")
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "verify-authority", role: "assistant", finish: "stop" } } } })
  await before(hooks, "parent", "verify-authority", "task", verify)
  await after(hooks, "parent", "verify-authority", "task", verify, { output: "OPERATIONAL_RESULT: PASS; COMMANDS_RUN: 2; COMMANDS_REQUIRED: 2", metadata: { sessionId: "verify-authority" } })
  await assert.doesNotReject(() => before(hooks, "parent", "commit-before-change", "bash", { command: "git commit -m test" }))

  await message(hooks, "parent", "build", `HEAD_SHA=${second}`)
  assert.match(await system(hooks, "parent"), new RegExp(`authority changed from ${first} to ${second}.*superseded`))
  await before(hooks, "parent", "second-proof", "bash", { command: "git rev-parse HEAD" })
  await after(hooks, "parent", "second-proof", "bash", { command: "git rev-parse HEAD" }, { output: `${second}\n`, metadata: { exit: 0 } })
  await assert.rejects(() => before(hooks, "parent", "commit-after-change", "bash", { command: "git commit -m test" }), /fresh-review/)
})

test("interactive tools (question, ask_question) are permitted past the 30-call hard stop", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (let index = 0; index < DEFAULT_POLICY.primaryOperationHardLimit; index += 1) {
    await before(hooks, "parent", `todo-${index}`, "todowrite", { todos: [] })
  }
  await assert.doesNotReject(() => before(hooks, "parent", "ask-user", "question", { questions: [{ question: "How to proceed?" }] }))
  await assert.doesNotReject(() => before(hooks, "parent", "ask-user-alt", "ask_question", { questions: [{ question: "How to proceed?" }] }))
  await assert.doesNotReject(() => before(hooks, "parent", "thirty-first-todo", "todowrite", { todos: [] }))
})

test("empty or malformed interactive prompts are narrowly rejected while valid questions pass unchanged", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent-interactive-shape", "build")
  for (const [index, tool, args] of [
    [1, "question", { questions: [] }],
    [2, "ask_question", { questions: [] }],
    [3, "question", {}],
    [4, "ask_question", { questions: "not-an-array" }],
    [5, "question", { questions: [{}] }],
    [6, "ask_question", { questions: [{ question: "" }] }],
    [7, "question", { questions: [{ question: "   " }] }],
  ]) {
    await assert.rejects(
      () => before(hooks, "parent-interactive-shape", `invalid-${index}`, tool, args),
      /OPERATIONAL_CORRECTION: RESPOND_OR_ASK_NONEMPTY.*at least one question.*answer directly/s,
    )
  }
  const valid = { questions: [{ header: "Choice", question: "Which path?", options: [{ label: "A", description: "Use A." }] }] }
  const output = await before(hooks, "parent-interactive-shape", "valid-question", "question", valid)
  assert.deepEqual(output.args, valid)
  const task = taskArgs()
  await before(hooks, "parent-interactive-shape", "task", "task", task)
  await register(hooks, "child-interactive-shape", "explore")
  await assert.rejects(() => before(hooks, "child-interactive-shape", "invalid-child", "question", { questions: [] }), /RESPOND_OR_ASK_NONEMPTY/)
  await hooks.event({ event: { type: "message.updated", properties: { info: { sessionID: "child-interactive-shape", role: "assistant", finish: "stop" } } } })
  const completed = await after(hooks, "parent-interactive-shape", "task", "task", task, { output: exploreComplete("Bounded handoff."), metadata: { sessionId: "child-interactive-shape" } })
  const events = completed.metadata.operationalSchema.guardEvents.filter((event) => event.rule === "malformed-interactive-invocation")
  assert.equal(events.length, 1)
  assert.equal(events[0].correctionCode, "RESPOND_OR_ASK_NONEMPTY")
  assert.equal(events[0].terminal, false)
})

test("prerequisite staging commands under /tmp/opencode are permitted past the 30-call hard stop", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")
  for (let index = 0; index < DEFAULT_POLICY.primaryOperationHardLimit; index += 1) {
    await before(hooks, "parent", `todo-${index}`, "todowrite", { todos: [] })
  }
  await assert.doesNotReject(() => before(hooks, "parent", "stage-mkdir", "bash", { command: "mkdir -p /tmp/opencode/verify/worktrees/repair-pr322" }))
  await assert.doesNotReject(() => before(hooks, "parent", "stage-cp", "bash", { command: "cp src/file.py /tmp/opencode/verify/worktrees/repair-pr322/" }))
  await assert.doesNotReject(() => before(hooks, "parent", "stage-worktree", "bash", { command: "git worktree add /tmp/opencode/verify/worktrees/repair-pr322 pr-branch" }))
  await assert.doesNotReject(() => before(hooks, "parent", "stage-workdir", "bash", { command: "ls -la", workdir: "/tmp/opencode/verify/worktrees/repair-pr322" }))
  await assert.doesNotReject(() => before(hooks, "parent", "regular-shell-advised", "bash", { command: "git status" }))
})

test("primary shell pipelines with output limiters do not inflate substantive command count", async () => {
  const hooks = createOperationGuard({ env: {} })
  await register(hooks, "parent", "build")
  const pipelineCommand = [
    'echo "=== requirements ==="',
    "cat requirements.txt | grep pytest",
    'echo "=== config ==="',
    'rtk rg -n "^\\[project\\]" pyproject.toml | head -30',
    'echo "=== uv cache ==="',
    'du -sh "$(uv cache dir)" | head -1',
    'echo "=== site-packages ==="',
    "ls site-packages/ | rtk rg -i \"package|editable|\\.pth\"",
  ].join("\n")
  await assert.doesNotReject(() => before(hooks, "parent", "piped-shell", "bash", { command: pipelineCommand }))
})

test("fresh-review and verify subagents can access both review and verify staging roots without capability mismatch", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")

  const freshReviewArgs = taskArgs({
    subagent_type: "fresh-review",
    prompt: "Scope: test repair\nQuestions:\n- Inspect patch in /tmp/opencode/verify/materials/pr322-repair/repair.patch.\nStop condition: verified against invariant.",
  })
  await assert.doesNotReject(() => validateChildPlan(freshReviewArgs, "/tmp/project"))

  const verifyArgs = taskArgs({
    subagent_type: "verify",
    prompt: "Scope: test validation\nQuestions:\n- Run tests in /tmp/opencode/review/worktrees/repair-pr322.\nStop condition: command exits.",
  })
  await assert.doesNotReject(() => validateChildPlan(verifyArgs, "/tmp/project"))
})

test("reasoning length exhaustion recovery turn clears lengthRecoveryPending on subsequent turns", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")

  await hooks.event({
    event: {
      type: "message.updated",
      properties: {
        info: {
          sessionID: "parent",
          role: "assistant",
          finish: "length",
          id: "msg-exhausted",
        },
      },
    },
  })

  const params1 = {}
  await hooks["chat.params"]({ sessionID: "parent", agent: "build" }, params1)
  assert.equal(params1.maxOutputTokens, 1024)

  const sys1 = { system: [] }
  await hooks["experimental.chat.system.transform"]({ sessionID: "parent", model: {} }, sys1)
  assert.match(sys1.system.join("\n"), /BOUNDED LENGTH RECOVERY/)

  const params2 = {}
  await hooks["chat.params"]({ sessionID: "parent", agent: "build" }, params2)
  assert.equal(params2.maxOutputTokens, undefined)

  const sys2 = { system: [] }
  await hooks["experimental.chat.system.transform"]({ sessionID: "parent", model: {} }, sys2)
  assert.doesNotMatch(sys2.system.join("\n"), /BOUNDED LENGTH RECOVERY/)
})

test("turn-1 proactive explore delegation cleanly establishes child boundary without parent pre-read debt", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")

  const exploreArgs = taskArgs({
    subagent_type: "explore",
    prompt: "Scope: auth service\nQuestions:\n- Map token expiration call path.\nStop condition: verified call graph.",
  })
  await before(hooks, "parent", "turn1-task", "task", exploreArgs)
  await after(
    hooks,
    "parent",
    "turn1-task",
    "task",
    exploreArgs,
    { output: "OPERATIONAL_EXPLORE: COMPLETE\nTARGETS_INSPECTED: 1\nTARGETS_REQUIRED: 1" },
    { sessionID: "child-explore-1" },
  )
  await hooks.event({
    event: {
      type: "message.updated",
      properties: {
        info: {
          sessionID: "child-explore-1",
          role: "assistant",
          finish: "stop",
          id: "msg-done",
        },
      },
    },
  })

  // After clean Explore return, direct edit proceeds without friction
  await assert.doesNotReject(() => before(hooks, "parent", "direct-edit", "write", { filePath: "/tmp/project/auth.py", content: "fixed" }))
})

test("proactive upfront manifest staging does not consume direct validation budget", async () => {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {} })
  await register(hooks, "parent", "build")

  await mkdir("/tmp/opencode/verify/manifests", { recursive: true })
  const packet = await mkdtemp("/tmp/opencode/verify/manifests/proactive-")
  const manifest = join(packet, "commands.json")
  const manifestContent = JSON.stringify({ schema_version: "opencode-verify-manifest-v1", commands: [{ argv: ["git", "diff", "--check", "HEAD~1..HEAD"] }] })
  await writeFile(manifest, manifestContent)

  // Turn 1: Stage manifest under /tmp/opencode/verify/manifests/
  await assert.doesNotReject(() => before(hooks, "parent", "stage-manifest", "write", {
    filePath: manifest,
    content: manifestContent,
  }))

  // Turn 2: Delegate to Verify
  const verifyArgs = taskArgs({
    subagent_type: "verify",
    prompt: `Scope: test validation\nManifest: ${manifest}\nQuestions:\n- Run staged manifest.\nStop condition: all gates exit 0.`,
  })
  await assert.doesNotReject(() => before(hooks, "parent", "verify-task", "task", verifyArgs))
})

test("v5.23.2 advisory policy limits and schema version are correctly exposed", async () => {
  assert.equal(SCHEMA_VERSION, "5.23.2")
  assert.equal(DEFAULT_POLICY.primaryReadWarning, 8)
  assert.equal(DEFAULT_POLICY.primaryReadHardLimit, 10)
  assert.equal(DEFAULT_POLICY.parentReopenLimit, 5)
  assert.equal(DEFAULT_POLICY.parentExactRangeReopenLimit, 3)
  assert.equal(DEFAULT_POLICY.primaryOperationWarning, 24)
  assert.equal(DEFAULT_POLICY.primaryOperationHardLimit, 30)
  assert.equal("primaryContextWarningTokens" in DEFAULT_POLICY, false)
  assert.equal("primaryContextHardLimitTokens" in DEFAULT_POLICY, false)
})
