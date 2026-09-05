const MAX_NODES = 1_000_000
const MAX_DEPTH = 64

export const TRACE_AUDIT_SCHEMA = "opencode-session-audit-v1"
export const TRACE_AUDIT_PROFILES = Object.freeze(["guard-friction-v1", "remediation-audit-v1"])

const EVENT_CLASSES = new Set([
  "preflight_rejection", "capability_mismatch", "malformed_invocation",
  "duplicate_success_block", "retry_advisory", "delegation_transport_failure",
  "gate_failure", "authority_block", "publish_gate_block", "context_pressure",
  "routing_advisory", "provenance_advisory", "premature_turn_termination",
  "role_elision", "planner_partition",
])

const STRUCTURED_RULES = [
  [/fresh-review-elided|role-elided|HONOR_SEMANTIC_REVIEW_AUTHORITY/i, "role_elision"],
  [/deterministic planner.*PARTITION_REQUIRED|deterministic-complexity-partition/i, "planner_partition"],
  [/capability.mismatch/i, "capability_mismatch"],
  [/(?:preflight|packet|prompt).*(?:reject|invalid)|envelope/i, "preflight_rejection"],
  [/malformed|invocation.shape|invalid.command|child-shell-shape/i, "malformed_invocation"],
  [/^(?:verify-result|operational-(?:review|explore))-marker-missing$|^(?:verify|operational-(?:review|explore)).*(?:outcome|count)-/i, "gate_failure"],
  [/(?:duplicate.*success|successful.*duplicate)/i, "duplicate_success_block"],
  [/(?:retry|terminal).*(?:advisory|breaker)|child-duplicate-failed/i, "retry_advisory"],
  [/(?:transport|delegation).*(?:fail|incomplete|blocked)/i, "delegation_transport_failure"],
  [/(?:verify|review|explore|gate|outcome).*(?:fail|blocked|incomplete)/i, "gate_failure"],
  [/(?:exact.head|authority|admission).*(?:deny|block|mismatch|fail)/i, "authority_block"],
  [/(?:publish|commit|push).*(?:deny|block|gate)/i, "publish_gate_block"],
  [/(?:context|token).*(?:pressure|ceiling|limit)/i, "context_pressure"],
  [/external.*unattested/i, "provenance_advisory"],
  [/(?:routing|budget|reopen|operation|primary|child-tool).*(?:advisory|warning|limit)/i, "routing_advisory"],
]

const FALLBACK_RULES = [
  [/CHILD_CAPABILITY_MISMATCH|capability mismatch/i, "capability_mismatch"],
  [/rejected Task packet.*(?:packet envelope|Scope:|Questions:|Stop condition:)/i, "preflight_rejection"],
  [/exact-head admission|authority admission|starting-head/i, "authority_block"],
  [/Operational schema guard:.{0,400}(?:(?:commit|push|publish).{0,120}(?:gate|block|deny)|(?:gate|block|deny|require).{0,160}(?:before\s+)?(?:commit|push|publish))/i, "publish_gate_block"],
  [/(?:unique files|reconnaissance targets|primary shell packet|primary tool calls|routing|operation).{0,100}(?:limit|accumulated|boundary|packet)/i, "routing_advisory"],
  [/(?:context|token).{0,80}(?:ceiling|pressure|limit)/i, "context_pressure"],
  [/DELEGATION INCOMPLETE|transport.{0,40}(?:failed|incomplete)/i, "delegation_transport_failure"],
  [/HONOR_SEMANTIC_REVIEW_AUTHORITY|Fresh-review is elided/i, "role_elision"],
  [/deterministic planner returned PARTITION_REQUIRED|deterministic-complexity-partition/i, "planner_partition"],
  [/TERMINAL RETRY BREAKER/i, "retry_advisory"],
  [/OPERATIONAL ADVISORY/i, "routing_advisory"],
]

const CORRECTION_CODES = new Set([
  "SPLIT_TO_BARE_CALLS", "USE_BUILTIN_DISCOVERY", "PRIMARY_OWNS_REMOTE_REFRESH",
  "REMOVE_EXTERNAL_TARGET", "STAGE_TYPED_INPUT", "USE_SUPPORTED_WRAPPER",
  "USE_SUPPORTED_CAPABILITY", "FIX_PACKET_ENVELOPE", "HANDLE_PRIMARY_EXACT_LOOKUP",
  "SPLIT_OR_STAGE_MANIFEST", "REBUILD_VERIFY_MANIFEST", "REPACKET_FOR_CHILD_CAPABILITY",
  "START_FRESH_OR_REPORT_BLOCKER", "REPORT_TASK_BLOCKER", "PRESERVE_RESUME_TYPE",
  "PRESERVE_RESUME_SCOPE", "FIX_PACKET", "RESPOND_OR_ASK_NONEMPTY",
  "HONOR_SEMANTIC_REVIEW_AUTHORITY",
])

function boundedString(value, limit = 120) {
  return typeof value === "string" ? value.slice(0, limit) : undefined
}

function countTree(value) {
  let nodes = 0
  const stack = [{ value, depth: 0 }]
  while (stack.length) {
    const current = stack.pop()
    nodes += 1
    if (nodes > MAX_NODES) throw new Error("document node limit exceeded")
    if (current.depth > MAX_DEPTH) throw new Error("document depth limit exceeded")
    if (Array.isArray(current.value)) {
      for (const item of current.value) stack.push({ value: item, depth: current.depth + 1 })
    } else if (current.value && typeof current.value === "object") {
      for (const item of Object.values(current.value)) stack.push({ value: item, depth: current.depth + 1 })
    }
  }
  return nodes
}

function legacyMetrics(messages) {
  const metrics = {
    nodes: 0, textBytes: 0, guardBlocks: 0, incompleteDelegations: 0,
    capabilityMismatches: 0, advisories: 0, terminalBreakers: 0,
    parserTestIndirection: 0,
  }
  const patterns = [
    ["guardBlocks", /Operational schema guard/gi],
    ["incompleteDelegations", /DELEGATION INCOMPLETE/gi],
    ["capabilityMismatches", /(?:CHILD_CAPABILITY_MISMATCH|capability mismatch|capability[^\n]{0,80}block)/gi],
    ["advisories", /OPERATIONAL ADVISORY/gi],
    ["terminalBreakers", /TERMINAL RETRY BREAKER/gi],
    ["parserTestIndirection", /(?:pytest|test_)[^\n]{0,100}(?:session|trace|parser)/gi],
  ]
  const stack = [{ value: messages, depth: 0 }]
  while (stack.length) {
    const current = stack.pop()
    metrics.nodes += 1
    if (metrics.nodes > MAX_NODES) throw new Error("document node limit exceeded")
    if (current.depth > MAX_DEPTH) throw new Error("document depth limit exceeded")
    if (typeof current.value === "string") {
      metrics.textBytes += Buffer.byteLength(current.value)
    } else if (Array.isArray(current.value)) {
      for (const item of current.value) stack.push({ value: item, depth: current.depth + 1 })
    } else if (current.value && typeof current.value === "object") {
      for (const item of Object.values(current.value)) stack.push({ value: item, depth: current.depth + 1 })
    }
  }
  const scan = (value, selectedPatterns = patterns) => {
    if (typeof value !== "string") return
    for (const [key, pattern] of selectedPatterns) metrics[key] += (value.match(pattern) ?? []).length
  }
  for (const message of messages) {
    if (typeof message === "string") {
      scan(message)
      continue
    }
    for (const part of Array.isArray(message?.parts) ? message.parts : []) {
      if (part?.type !== "tool") continue
      const schema = part?.state?.metadata?.operationalSchema
      scan(part?.state?.error)
      if (String(part?.tool ?? "").toLowerCase() === "task" && !schema) scan(part?.state?.output)
      if (schema && typeof schema === "object") {
        for (const event of Array.isArray(schema.guardEvents) ? schema.guardEvents : []) {
          if (/capability[.-]mismatch/i.test(String(event?.rule ?? event?.code ?? event))) {
            metrics.capabilityMismatches += Number.isInteger(event?.occurrenceCount) && event.occurrenceCount > 0 ? event.occurrenceCount : 1
          }
        }
        const reasons = reasonCodes(schema)
        if (schema.complete === false || reasons.some((reason) => /(?:marker-missing|outcome-|count-mismatch|transport|finish-|result-empty|result-oversized)/i.test(reason))) {
          metrics.incompleteDelegations += 1
        }
        scan(JSON.stringify(schema), patterns.filter(([key]) => !["capabilityMismatches", "incompleteDelegations", "guardBlocks"].includes(key)))
      }
      scan(part?.state?.input?.command, patterns.filter(([key]) => key === "parserTestIndirection"))
    }
  }
  return metrics
}

function classify(values, rules) {
  for (const raw of values) {
    const value = String(raw ?? "")
    for (const [pattern, category] of rules) if (pattern.test(value)) return category
  }
  return undefined
}

function reasonCodes(schema) {
  const values = []
  for (const value of schema?.reasons ?? []) {
    if (typeof value === "string" && /^[A-Za-z0-9_.:-]{1,96}$/.test(value)) values.push(value)
    else if (value && typeof value === "object") {
      const code = value.code ?? value.reason ?? value.rule
      if (typeof code === "string" && /^[A-Za-z0-9_.:-]{1,96}$/.test(code)) values.push(code)
    }
  }
  return [...new Set(values)].slice(0, 16)
}

function correctionCodes(value) {
  const candidates = []
  if (typeof value === "string") {
    for (const match of value.matchAll(/OPERATIONAL_(?:CORRECTION|PACKET_ACTION):\s*([A-Z][A-Z0-9_]{1,63})/g)) candidates.push(match[1])
  } else if (value && typeof value === "object") {
    candidates.push(value.correctionCode, value.correction_code)
  }
  return [...new Set(candidates.filter((code) => CORRECTION_CODES.has(code)))].slice(0, 8)
}

function schemaEvents(schema) {
  const result = new Map()
  const record = (category, reason_codes = [], correction_codes = [], occurrences = 1) => {
    const current = result.get(category) ?? { category, reason_codes: [], correction_codes: [], occurrence_count: 0 }
    current.occurrence_count += Number.isInteger(occurrences) && occurrences > 0 ? Math.min(occurrences, MAX_NODES) : 1
    current.reason_codes = [...new Set([...current.reason_codes, ...reason_codes])]
    current.correction_codes = [...new Set([...current.correction_codes, ...correction_codes])]
    result.set(category, current)
  }
  const candidates = Array.isArray(schema?.guardEvents) ? schema.guardEvents : []
  for (const item of candidates) {
    const values = typeof item === "string" ? [item] : [item?.category, item?.kind, item?.rule, item?.reason, item?.code]
    const category = classify(values, STRUCTURED_RULES)
    if (category) record(category, reasonCodes({ reasons: [item] }), correctionCodes(item), item?.occurrenceCount)
  }
  const reasons = reasonCodes(schema)
  for (const reason of reasons) {
    const category = classify([reason], STRUCTURED_RULES)
    if (category && !result.has(category)) record(category, [reason])
  }
  return [...result.values()]
}

function safeToolShape(part) {
  const input = part?.state?.input
  return {
    input_keys: input && typeof input === "object" && !Array.isArray(input) ? Object.keys(input).sort().slice(0, 32) : [],
    has_output: typeof part?.state?.output === "string" && part.state.output.length > 0,
    has_error: typeof part?.state?.error === "string" && part.state.error.length > 0,
  }
}

function makeCandidate(category, events, index) {
  const reasons = new Set(events.flatMap((event) => event.reason_codes ?? []))
  if (category === "malformed_invocation" && reasons.has("child-shell-shape")) {
    return candidateRecord(index, "child_invocation_shape_gap", "Keep child shell execution to one bare supported invocation and inject that contract directly into the delegated packet.", category, events)
  }
  if (category === "gate_failure" && [...reasons].every((reason) => /marker-missing|count-mismatch/.test(reason))) {
    return candidateRecord(index, "delegated_result_contract_gap", "Inject the exact result marker into the delegated packet and keep gate completion fail-closed until the marker and counts are valid.", category, events)
  }
  const definitions = {
    preflight_rejection: ["packet_preflight_gap", "Align generated Task packet guidance with the declared child capability contract."],
    capability_mismatch: ["capability_contract_gap", "Route the operation through the supported capability and improve prompts before considering any permission change."],
    malformed_invocation: ["invocation_shape_gap", "Use the correction-code-specific invocation shape; for interactive tools, answer directly when ready or supply at least one real question."],
    premature_turn_termination: ["interactive_finalization_gap", "Emit a ready final response directly; reserve interactive tools for genuinely missing input and reject only structurally empty prompts."],
    duplicate_success_block: ["duplicate_detection_gap", "Preserve the success block and clarify successful-empty-output semantics in prompts."],
    retry_advisory: ["retry_friction", "Make retry advice state-aware and point to the single supported recovery route."],
    delegation_transport_failure: ["delegation_transport_instability", "Inspect Task transport/result correlation and keep retry authority bounded."],
    gate_failure: ["validation_gate_failure", "Repair the underlying validation or prerequisite; do not weaken the gate."],
    context_pressure: ["context_routing_friction", "Prefer bounded helpers and concise prompt direction; keep context thresholds advisory."],
    routing_advisory: ["context_routing_friction", "Prefer bounded helpers and concise prompt direction; keep routing thresholds advisory."],
    publish_gate_block: ["publish_gate_friction", "Distinguish real post-review content mutation from content-neutral staging and temporary evidence redirection; never waive stale review or Verify generations."],
  }
  const definition = definitions[category]
  if (!definition) return undefined
  return candidateRecord(index, definition[0], definition[1], category, events)
}

function candidateRecord(index, kind, remediation, category, events) {
  const occurrences = events.reduce((sum, event) => sum + event.occurrence_count, 0)
  return {
    candidate_id: `candidate-${String(index).padStart(4, "0")}`,
    kind,
    confidence: events.every((event) => ["operational_schema", "trace_structure", "trace_sequence"].includes(event.evidence_source)) ? "high" : "medium",
    evidence_refs: events.map((event) => event.event_id),
    observed_behavior: `${occurrences} ${category} occurrence${occurrences === 1 ? "" : "s"} across ${events.length} evidence record${events.length === 1 ? "" : "s"}.`,
    possible_remediation: remediation,
    constraints: ["Do not infer permission relaxation from frequency alone.", "Confirm against current plugin source and runtime tests."],
    status: "candidate",
  }
}

function malformedInteractiveReason(part) {
  if (!["question", "ask_question"].includes(String(part?.tool ?? "").toLowerCase())) return undefined
  const questions = part?.state?.input?.questions
  if (!Array.isArray(questions)) return "invalid_interactive_questions"
  if (questions.length === 0) return "empty_interactive_questions"
  if (!questions.some((question) => typeof question?.question === "string" && question.question.trim().length > 0)) return "blank_interactive_questions"
  return undefined
}

function announcesFinalization(parts) {
  const pattern = /\b(?:compose|deliver|emit|provide|return|write)\b[^\n]{0,120}\b(?:final|packet|handoff|response|answer)\b|\b(?:final|packet|handoff|response|answer)\b[^\n]{0,120}\b(?:ready|complete|satisfied)\b/i
  return parts.some((part) => ["text", "reasoning"].includes(part?.type) && pattern.test(String(part?.text ?? "")))
}

function immediateUserRequestsCompletion(messages, messageIndex) {
  const next = messages[messageIndex + 1]
  if (next?.info?.role !== "user") return false
  if (!next) return false
  const pattern = /\b(?:compose|deliver|emit|finish|complete|provide|return|write)\b[^\n]{0,120}\b(?:final|packet|handoff|response|answer)\b/i
  return (Array.isArray(next.parts) ? next.parts : []).some((part) => part?.type === "text" && pattern.test(String(part?.text ?? "")))
}

function remediationAudit(value, sessionID, source) {
  countTree(value.messages)
  const turns = []
  const events = []
  const links = []
  const diagnostics = []
  const knownParts = new Set(["text", "reasoning", "tool", "step-start", "step-finish", "patch", "compaction"])
  let activeTurn
  let eventNumber = 0

  for (const [messageIndex, message] of value.messages.entries()) {
    const info = message?.info ?? {}
    const messageID = boundedString(info.id) ?? `message-index-${messageIndex}`
    if (info.role === "user" || !activeTurn) {
      activeTurn = { turn_id: `turn-${String(turns.length + 1).padStart(4, "0")}`, user_message_id: info.role === "user" ? messageID : undefined, message_ids: [], event_refs: [] }
      turns.push(activeTurn)
    }
    activeTurn.message_ids.push(messageID)
    if (!info.time) diagnostics.push({ code: "missing_message_time", message_id: messageID })
    const parts = Array.isArray(message?.parts) ? message.parts : []
    let malformedInteractiveEvent
    let malformedInteractivePartIndex = -1
    for (const [partIndex, part] of parts.entries()) {
      const partID = boundedString(part?.id) ?? `${messageID}:part-${partIndex}`
      if (!knownParts.has(part?.type)) diagnostics.push({ code: "unknown_part_type", message_id: messageID, part_id: partID, value_present: typeof part?.type === "string" })
      if (part?.type !== "tool") continue
      const schema = part?.state?.metadata?.operationalSchema
      const exitCode = part?.state?.metadata?.exit
      if (part?.state?.status === "completed" && Number.isInteger(exitCode) && exitCode !== 0) {
        diagnostics.push({ code: "nonzero_tool_exit", message_id: messageID, part_id: partID, tool: boundedString(part?.tool, 64), exit_code: exitCode })
      }
      if (schema?.schemaVersion && !/^5\.(?:1[6-9]|[2-9]\d)\./.test(String(schema.schemaVersion))) diagnostics.push({ code: "unknown_operational_schema_version", message_id: messageID, part_id: partID, value_present: true })
      const detectedEvents = schemaEvents(schema)
      const interactiveReason = malformedInteractiveReason(part)
      if (interactiveReason) {
        const existing = detectedEvents.find((event) => event.category === "malformed_invocation")
        if (existing) {
          existing.reason_codes = [...new Set([...existing.reason_codes, interactiveReason])]
          existing.correction_codes = [...new Set([...existing.correction_codes, "RESPOND_OR_ASK_NONEMPTY"])]
          existing.structural = true
        } else {
          detectedEvents.unshift({ category: "malformed_invocation", reason_codes: [interactiveReason], correction_codes: ["RESPOND_OR_ASK_NONEMPTY"], occurrence_count: 1, structural: true })
        }
      }
      if (!detectedEvents.length && part?.state?.status === "error") {
        const category = classify([part?.state?.error], FALLBACK_RULES)
        if (category) detectedEvents.push({ category, reason_codes: [], correction_codes: correctionCodes(part?.state?.error), occurrence_count: 1, fallback: true })
      }
      for (const detected of detectedEvents) {
        const event = {
          event_id: `event-${String(++eventNumber).padStart(4, "0")}`,
          turn_id: activeTurn.turn_id,
          message_id: messageID,
          part_id: partID,
          call_id: boundedString(part?.callID),
          tool: boundedString(part?.tool, 64),
          category: detected.category,
          status: boundedString(part?.state?.status, 32) ?? "unknown",
          evidence_source: detected.structural ? "trace_structure" : detected.fallback ? "tool_error" : "operational_schema",
          confidence: detected.fallback ? "medium" : "high",
          reason_codes: detected.reason_codes,
          correction_codes: detected.correction_codes ?? [],
          occurrence_count: detected.occurrence_count ?? 1,
          child_session_id: /^ses_[A-Za-z0-9]+$/.test(String(part?.state?.metadata?.sessionId ?? "")) ? part.state.metadata.sessionId : undefined,
          tool_shape: safeToolShape(part),
        }
        events.push(event)
        activeTurn.event_refs.push(event.event_id)
        if (detected.structural && interactiveReason) {
          malformedInteractiveEvent = event
          malformedInteractivePartIndex = partIndex
        }
        if (event.tool?.toLowerCase() === "task" && event.child_session_id) links.push({ kind: "task_child_session", from: event.event_id, to_session_id: event.child_session_id, confidence: "explicit" })
      }
    }
    const finishIndex = parts.findIndex((part, index) => index > malformedInteractivePartIndex && part?.type === "step-finish" && part?.reason === "tool-calls")
    const assistantContinued = finishIndex > malformedInteractivePartIndex && parts.slice(malformedInteractivePartIndex + 1, finishIndex).some((part) => ["text", "reasoning"].includes(part?.type) && String(part?.text ?? "").trim().length > 0)
    const userContinuation = immediateUserRequestsCompletion(value.messages, messageIndex)
    if (malformedInteractiveEvent && malformedInteractiveEvent.status === "error" && finishIndex === parts.length - 1 && !assistantContinued && announcesFinalization(parts.slice(0, malformedInteractivePartIndex)) && userContinuation) {
      const event = {
        event_id: `event-${String(++eventNumber).padStart(4, "0")}`,
        turn_id: activeTurn.turn_id,
        message_id: messageID,
        part_id: malformedInteractiveEvent.part_id,
        call_id: malformedInteractiveEvent.call_id,
        tool: malformedInteractiveEvent.tool,
        category: "premature_turn_termination",
        status: "observed",
        evidence_source: "trace_sequence",
        confidence: "high",
        reason_codes: ["finalization_announced", "malformed_interactive_error", "user_completion_retry"],
        correction_codes: ["RESPOND_OR_ASK_NONEMPTY"],
        occurrence_count: 1,
        tool_shape: malformedInteractiveEvent.tool_shape,
      }
      events.push(event)
      activeTurn.event_refs.push(event.event_id)
      links.push({ kind: "malformed_interactive_termination", from: malformedInteractiveEvent.event_id, to: event.event_id, confidence: "high" })
    }
  }

  for (let index = 1; index < events.length; index += 1) {
    const previous = events[index - 1]
    const current = events[index]
    if (previous.category === current.category && previous.turn_id === current.turn_id) links.push({ kind: "temporal_followup", from: previous.event_id, to: current.event_id, confidence: "temporal_only" })
  }
  const grouped = new Map()
  for (const event of events) grouped.set(event.category, [...(grouped.get(event.category) ?? []), event])
  const candidates = []
  for (const [category, categoryEvents] of grouped) {
    const candidate = makeCandidate(category, categoryEvents, candidates.length + 1)
    if (candidate) candidates.push(candidate)
  }
  const eventCounts = Object.fromEntries([...EVENT_CLASSES].map((name) => [name, grouped.get(name)?.length ?? 0]))
  const occurrenceCounts = Object.fromEntries([...EVENT_CLASSES].map((name) => [name, (grouped.get(name) ?? []).reduce((sum, event) => sum + event.occurrence_count, 0)]))
  return {
    schema_version: TRACE_AUDIT_SCHEMA,
    profile: "remediation-audit-v1",
    session: { id: sessionID, version: boundedString(value.info?.version, 64), title_present: Boolean(value.info?.title) },
    source,
    summary: { messages: value.messages.length, turns: turns.length, events: events.length, event_counts: eventCounts, occurrence_counts: occurrenceCounts, remediation_candidates: candidates.length },
    turns,
    events,
    causal_links: links,
    remediation_candidates: candidates,
    diagnostics,
  }
}

export function assessSessionTrace(value, { sessionID, profile, source = {} } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("export root must be an object")
  if (value.info?.id !== sessionID) throw new Error(`export identity mismatch (observed ${value.info?.id ?? "missing"})`)
  if (!Array.isArray(value.messages)) throw new Error("export messages must be an array")
  if (!TRACE_AUDIT_PROFILES.includes(profile)) throw new Error("unsupported profile")
  if (profile === "guard-friction-v1") return { profile, sessionID, metrics: legacyMetrics(value.messages) }
  return remediationAudit(value, sessionID, source)
}
