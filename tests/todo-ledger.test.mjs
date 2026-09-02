import assert from "node:assert/strict"
import test from "node:test"
import {
  TODO_LEDGER_SENTINEL,
  TODOWRITE_LEDGER_CONTRACT,
  normalizeTodos,
  isTerminalStatus,
  hasNonterminal,
  nonterminalTodos,
  nonterminalCount,
  fingerprintTodos,
  renderReminder,
} from "../lib/todo-ledger.mjs"
import { createOperationGuard } from "../lib/operation-guard.mjs"

// ---------------------------------------------------------------------------
// Pure todo-ledger helper coverage
// ---------------------------------------------------------------------------

test("normalizeTodos drops non-objects and defaults priority", () => {
  const todos = normalizeTodos([
    { content: "One", status: "in_progress", priority: "High" },
    null,
    42,
    { content: "Two", status: "pending" },
    "junk",
  ])
  assert.deepEqual(todos, [
    { id: undefined, content: "One", status: "in_progress", priority: "high" },
    { id: undefined, content: "Two", status: "pending", priority: "medium" },
  ])
  assert.deepEqual(normalizeTodos({ not: "an array" }), [])
})

test("isTerminalStatus classifies terminal, nonterminal, and unknown statuses", () => {
  assert.ok(isTerminalStatus("completed"))
  assert.ok(isTerminalStatus("CANCELLED"))
  assert.ok(isTerminalStatus("canceled"))
  assert.ok(!isTerminalStatus("pending"))
  assert.ok(!isTerminalStatus("in_progress"))
  assert.ok(!isTerminalStatus("some-unknown"))
  assert.ok(!isTerminalStatus(undefined))
})

test("nonterminal counting and filtering respect terminal boundary", () => {
  const todos = [
    { content: "A", status: "completed" },
    { content: "B", status: "in_progress" },
    { content: "C", status: "cancelled" },
    { content: "D", status: "pending" },
  ]
  assert.equal(nonterminalCount(todos), 2)
  assert.deepEqual(nonterminalTodos(todos).map((todo) => todo.content), ["B", "D"])
  assert.ok(hasNonterminal(todos))
  assert.ok(!hasNonterminal([{ content: "A", status: "completed" }]))
})

test("fingerprintTodos is order-insensitive, stable, and change-sensitive", () => {
  const a = [{ content: "B", status: "pending" }, { content: "A", status: "in_progress" }]
  const b = [{ content: "A", status: "in_progress" }, { content: "B", status: "pending" }]
  assert.equal(fingerprintTodos(a), fingerprintTodos(b))
  assert.equal(fingerprintTodos([]), "empty")
  const changed = [{ content: "A", status: "completed" }, { content: "B", status: "pending" }]
  assert.notEqual(fingerprintTodos(changed), fingerprintTodos(a))
})

test("renderReminder returns undefined for an empty or fully-terminal ledger", () => {
  assert.equal(renderReminder([]), undefined)
  assert.equal(renderReminder([{ content: "A", status: "completed" }, { content: "B", status: "cancelled" }]), undefined)
  assert.equal(renderReminder(undefined), undefined)
})

test("renderReminder bounds the list to six items and reports overflow", () => {
  const todos = Array.from({ length: 9 }, (_, index) => ({ content: `Item ${index}`, status: "pending" }))
  const reminder = renderReminder(todos)
  assert.ok(reminder.startsWith(TODO_LEDGER_SENTINEL))
  assert.match(reminder, /9 nonterminal items/)
  assert.match(reminder, /- \[pending\] Item 5/)
  assert.doesNotMatch(reminder, /Item 6/)
  assert.match(reminder, /3 more nonterminal items/)
})

test("renderReminder truncates long content to 96 characters", () => {
  const long = "x".repeat(140)
  const reminder = renderReminder([{ content: long, status: "in_progress" }])
  const line = reminder.split("\n").find((value) => value.startsWith("- [in_progress]"))
  assert.match(line, /^- \[in_progress\] \S{95}…$/)
  assert.equal(line.length, "- [in_progress] ".length + 96)
})

test("renderReminder collapses multi-line content into a single line", () => {
  const reminder = renderReminder([{ content: "first part\nsecond part", status: "pending" }])
  const line = reminder.split("\n").find((value) => value.startsWith("- [pending]"))
  assert.match(line, /first part second part/)
  assert.ok(!line.includes("\n"))
})

// ---------------------------------------------------------------------------
// Guard wiring: todowrite tool.definition, after-hook, reminder, idle, dispose
// ---------------------------------------------------------------------------

// The sentinel is a bracketed string; count it literally to avoid treating it
// as a regex character class.
const sentinelCount = (value) => value.split(TODO_LEDGER_SENTINEL).length - 1

function todoGuard(overrides = {}) {
  const hooks = createOperationGuard({ directory: "/tmp/project", env: {}, ...overrides })
  const register = async (sessionID, agent = "build") => {
    await hooks["chat.message"]({ sessionID, agent }, { message: {}, parts: [] })
  }
  const afterTodoWrite = async (sessionID, todos) => {
    await hooks["tool.execute.after"]({ sessionID, callID: "c1", tool: "todowrite", args: { todos } }, { title: "", output: "", metadata: {} })
  }
  const transform = async (sessionID, seed = ["base system prompt"]) => {
    const output = { system: [...seed] }
    await hooks["experimental.chat.system.transform"]({ sessionID, model: {} }, output)
    return output
  }
  const event = async (type, properties) => hooks.event({ event: { type, properties } })
  return { hooks, register, afterTodoWrite, transform, event }
}

test("tool.definition appends the ledger contract idempotently", async () => {
  const { hooks } = todoGuard()
  const first = { description: "Track a plan.", parameters: { type: "object" } }
  await hooks["tool.definition"]({ toolID: "todowrite" }, first)
  assert.match(first.description, /Track a plan\./)
  assert.ok(first.description.includes(TODO_LEDGER_SENTINEL))
  assert.equal(first.description, `Track a plan.\n\n${TODOWRITE_LEDGER_CONTRACT}`)

  const second = { ...first }
  await hooks["tool.definition"]({ toolID: "todowrite" }, second)
  assert.equal(second.description, first.description)
  assert.equal(sentinelCount(second.description), 1)

  const other = { description: "Original" }
  await hooks["tool.definition"]({ toolID: "bash" }, other)
  assert.equal(other.description, "Original")
})

test("a successful todowrite seeds the ledger and the reminder is injected without adding an element", async () => {
  const { hooks, register, afterTodoWrite, transform } = todoGuard()
  await register("s1", "build")
  await afterTodoWrite("s1", [{ content: "Wire the guard", status: "in_progress" }, { content: "Add tests", status: "pending" }])
  const output = await transform("s1")
  assert.equal(output.system.length, 1)
  assert.match(output.system[0], /base system prompt/)
  assert.ok(output.system[0].includes(TODO_LEDGER_SENTINEL))
  assert.match(output.system[0], /2 nonterminal items/)
  assert.match(output.system[0], /- \[in_progress\] Wire the guard/)
})

test("the reminder is not injected for an empty or fully-terminal ledger", async () => {
  const { hooks, register, afterTodoWrite, transform } = todoGuard()
  await register("s1", "build")
  await afterTodoWrite("s1", [{ content: "Done", status: "completed" }])
  const terminal = await transform("s1")
  assert.equal(terminal.system.length, 1)
  assert.ok(!terminal.system[0].includes(TODO_LEDGER_SENTINEL))

  await register("s2", "build")
  await afterTodoWrite("s2", [])
  const cleared = await transform("s2")
  assert.equal(cleared.system.length, 1)
  assert.ok(!cleared.system[0].includes(TODO_LEDGER_SENTINEL))
})

test("todo.updated reconciles the per-session cache independently of a todowrite", async () => {
  const { hooks, register, transform, event } = todoGuard()
  await register("s1", "build")
  await event("todo.updated", { sessionID: "s1", todos: [{ content: "Now pending", status: "pending" }] })
  const output = await transform("s1")
  assert.equal(output.system.length, 1)
  assert.match(output.system[0], /1 nonterminal item/)
  assert.match(output.system[0], /- \[pending\] Now pending/)
})

function idleClient() {
  const toasts = []
  const client = {
    session: {
      todo: async () => [{ content: "Still open", status: "in_progress" }],
      get: async () => ({ id: "s1" }),
    },
    tui: {
      showToast: async ({ body }) => {
        toasts.push(body)
      },
    },
  }
  return { client, toasts }
}

test("session.idle warns once for a stale nonterminal primary ledger and dedupes repeats", async () => {
  const { client, toasts } = idleClient()
  const { hooks, register, event } = todoGuard({ client })
  await register("s1", "build")
  await event("session.idle", { sessionID: "s1" })
  assert.equal(toasts.length, 1)
  assert.equal(toasts[0].variant, "warning")
  assert.match(toasts[0].message, /1 nonterminal item/)

  await event("session.idle", { sessionID: "s1" })
  assert.equal(toasts.length, 1, "an unchanged ledger must not re-warn")

  await event("todo.updated", { sessionID: "s1", todos: [{ content: "Changed item", status: "pending" }] })
  client.session.todo = async () => [{ content: "Changed item", status: "pending" }]
  await event("session.idle", { sessionID: "s1" })
  assert.equal(toasts.length, 2, "a changed ledger fingerprint may warn again")
})

test("session.idle does not warn for child sessions or when the ledger is terminal", async () => {
  const child = idleClient()
  const { hooks, register, event } = todoGuard({ client: child.client })
  await register("s1", "explore")
  await event("session.idle", { sessionID: "s1" })
  assert.equal(child.toasts.length, 0, "child/subagent sessions are suppressed")

  const { client: primary, toasts } = idleClient()
  const terminal = todoGuard({ client: primary })
  await terminal.register("s2", "build")
  await terminal.afterTodoWrite("s2", [{ content: "Done", status: "completed" }])
  primary.session.todo = async () => [{ content: "Done", status: "completed" }]
  await terminal.event("session.idle", { sessionID: "s2" })
  assert.equal(toasts.length, 0, "a fully-terminal ledger never warns")
})

test("hydrate failures and missing clients fail open without blocking the turn", async () => {
  const broken = todoGuard({ client: { session: { todo: async () => { throw new Error("no db") } } } })
  await broken.register("s1", "build")
  await broken.afterTodoWrite("s1", [{ content: "Open", status: "pending" }])
  const output = await broken.transform("s1")
  assert.equal(output.system.length, 1)
  assert.match(output.system[0], /1 nonterminal item/)

  const noClient = todoGuard()
  await noClient.register("s2", "build")
  const empty = await noClient.transform("s2", [])
  assert.deepEqual(empty.system, [], "with no cache and no primary string nothing is injected")
})

test("a synchronous showToast throw is swallowed and never blocks the idle path", async () => {
  const client = {
    session: {
      todo: async () => [{ content: "Open", status: "pending" }],
      get: async () => ({ id: "s1" }),
    },
    tui: {
      showToast: () => {
        throw new Error("toast unavailable")
      },
    },
  }
  const { hooks, register, event } = todoGuard({ client })
  await register("s1", "build")
  await assert.doesNotReject(() => event("session.idle", { sessionID: "s1" }), "a toast failure must not reject the idle handler")
})

test("dispose clears the per-session cache so a later idle can warn again", async () => {
  const { client, toasts } = idleClient()
  const { hooks, register, event } = todoGuard({ client })
  await register("s1", "build")
  await event("session.idle", { sessionID: "s1" })
  assert.equal(toasts.length, 1)
  assert.equal(typeof hooks.dispose, "function")
  hooks.dispose()
  await event("session.idle", { sessionID: "s1" })
  assert.equal(toasts.length, 2, "dispose resets the ledger fingerprint, so the warning may fire again")
})
