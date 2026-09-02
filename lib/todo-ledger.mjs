// Deterministic, stateless todo-ledger helpers for the operational-schema guard.
//
// These functions are state-visibility and reinforcement only: they normalize,
// fingerprint, count, and render the todo ledger. They never mutate todo
// status/content/ids, never infer semantic completion from edits/commands/tests
// or idle state, and never drive model continuation.

export const TODO_LEDGER_SENTINEL = "[OPERATIONAL_TODO_LEDGER_V1]"

// The idempotent, sentinel-marked contract appended to the todowrite tool
// description. It is marked so repeated tool.definition passes never duplicate
// it; the block itself does not change the parameter schema.
export const TODOWRITE_LEDGER_CONTRACT = [
  TODO_LEDGER_SENTINEL,
  "Operational todo-ledger guard: your todowrite status is the user-facing progress ledger for this session and must reflect actual work state, not the intended plan.",
  "- Statuses are real transitions, not intentions: pending and in_progress are nonterminal; completed and cancelled are terminal; treat any unknown status as nonterminal.",
  "- Move an item to completed only after its required work and verification have genuinely passed. Never infer completion from edits, commands, tests, or tool activity alone.",
  "- Prefer a single todowrite call that marks the current item completed and starts the next item in_progress, then cancel any superseded work.",
  "- Leave blocked or partial work nonterminal, and reconcile every status before a final handback.",
].join("\n")

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "canceled"])
const REMINDER_ITEM_LIMIT = 6
const REMINDER_CONTENT_CHARS = 96

function statusOf(item) {
  return String(item?.status ?? "").trim().toLowerCase()
}

// Normalize item content to one line for rendering.
function contentOf(item) {
  return String(item?.content ?? "").replace(/[\r\n\t]+/g, " ").trim()
}

// Normalize an unknown todo payload into a bounded, predictable shape. The
// payload is never modified in place.
export function normalizeTodos(todos) {
  if (!Array.isArray(todos)) return []
  return todos
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : undefined,
      content: contentOf(item),
      status: statusOf(item),
      priority: String(item?.priority ?? "").trim().toLowerCase() || "medium",
    }))
}

// completed and cancelled are terminal; pending, in_progress, and any unknown
// status are nonterminal.
export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(String(status ?? "").trim().toLowerCase())
}

export function hasNonterminal(todos) {
  return normalizeTodos(todos).some((todo) => !isTerminalStatus(todo.status))
}

export function nonterminalTodos(todos) {
  return normalizeTodos(todos).filter((todo) => !isTerminalStatus(todo.status))
}

export function nonterminalCount(todos) {
  return nonterminalTodos(todos).length
}

// Stable fingerprint of the nonterminal ledger so repeated idle events with an
// unchanged ledger dedupe, while a changed ledger may warn again.
export function fingerprintTodos(todos) {
  const items = nonterminalTodos(todos).map((todo) => `${todo.status}\u0000${todo.content}`)
  items.sort()
  return items.length === 0 ? "empty" : `n=${items.length}:${items.join("|")}`
}

function truncateContent(content, limit = REMINDER_CONTENT_CHARS) {
  if (content.length <= limit) return content
  return `${content.slice(0, limit - 1)}…`
}

function reminderLines(todos) {
  const items = nonterminalTodos(todos)
  const shown = items.slice(0, REMINDER_ITEM_LIMIT)
  const lines = shown.map((todo) => {
    const content = todo.content || "(untitled)"
    return `- [${todo.status || "unknown"}] ${truncateContent(content)}`
  })
  const overflow = items.length - shown.length
  if (overflow > 0) lines.push(`- … +${overflow} more nonterminal item${overflow === 1 ? "" : "s"}`)
  return lines
}

// Render the bounded per-turn reminder, or undefined when the ledger is empty or
// fully terminal so no reminder is injected.
export function renderReminder(todos) {
  const count = nonterminalCount(todos)
  if (count === 0) return undefined
  const body = [
    TODO_LEDGER_SENTINEL,
    `Todo ledger: ${count} nonterminal item${count === 1 ? "" : "s"}. Keep the ledger synchronized at logical transitions: complete the current item and start the next in one todowrite call, leave blocked work nonterminal, and reconcile every status before a final handback.`,
    ...reminderLines(todos),
  ].join("\n")
  return body
}
