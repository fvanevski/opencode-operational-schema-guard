import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { candidateFromToolEvent, createCaptureObserver, enqueueCandidate, loadCapturePolicy, validateCandidate } from "../candidate-capture.mjs"

const policy = {
  enabled: true, revision: "operator-r1", extractor_version: "1",
  workspaces: ["/work"], groups: ["approved"],
  categories: ["verified_architecture_fact"], tools: ["verified_source_tool"],
}
const event = {
  type: "session.tool.success",
  data: {
    sessionID: "s1", assistantMessageID: "m1", id: "t1", name: "verified_source_tool", executed: true,
    metadata: { memory_candidate_v1: {
      group_id: "approved", category: "verified_architecture_fact", fact_ref: "repo:commit:fact-1",
      observed_at: "2026-10-30T00:00:00Z", confidence: 1, evidence_ref: "repo:commit:file",
    } },
  },
}

test("disabled policy and mismatched scope do not persist candidates", () => {
  assert.equal(loadCapturePolicy(""), null)
  assert.equal(candidateFromToolEvent(event, null, "/work"), null)
  assert.equal(candidateFromToolEvent(event, { ...policy, enabled: false }, "/work"), null)
  assert.equal(candidateFromToolEvent(event, policy, "/other"), null)
  assert.equal(candidateFromToolEvent({ ...event, data: { ...event.data, name: "untrusted" } }, policy, "/work"), null)
})

test("operator policy reload requires an explicit enabled revision", () => {
  const root = mkdtempSync(join(tmpdir(), "issue70-policy-"))
  const path = join(root, "policy.json")
  try {
    writeFileSync(path, JSON.stringify({ ...policy, enabled: false }))
    assert.equal(loadCapturePolicy(path), null)
    writeFileSync(path, JSON.stringify(policy))
    assert.equal(loadCapturePolicy(path).revision, "operator-r1")
    writeFileSync(path, JSON.stringify({ ...policy, groups: [] }))
    assert.equal(loadCapturePolicy(path), null)
  } finally { rmSync(root, { recursive: true }) }
})

test("durable source IDs survive duplicate delivery and compaction", () => {
  const first = candidateFromToolEvent(event, policy, "/work")
  assert.ok(first)
  assert.ok(validateCandidate(first))
  assert.equal(candidateFromToolEvent(structuredClone(event), policy, "/work").event_id, first.event_id)
  assert.equal(first.source.message_id, "m1")
  assert.equal(first.source.cursor_id, "m1")
  assert.equal(first.source.tool_event_id, "t1")
  assert.equal(first.source.event_id, "t1")
})

test("native called/success sequence, duplicate replay and restart retain identity", async () => {
  const accepted = new Map()
  const options = {
    workspaceID: "/work", policyPath: "test-policy", url: "http://127.0.0.1:1933", token: "test-token",
    policyLoader: () => policy,
    enqueue: async (candidate) => { accepted.set(candidate.event_id, candidate); return true },
  }
  const called = { type: "session.tool.called", data: { sessionID: "s1", id: "t1", name: "verified_source_tool" } }
  const success = structuredClone(event)
  delete success.data.name // Native Success carries tool ID; Called carries its name.
  const first = createCaptureObserver(options)
  assert.equal(await first(called), null)
  const id = await first(success)
  assert.match(id, /^[0-9a-f]{64}$/)
  assert.equal(await first(success), null) // Missing Called is safely deferred.
  const restarted = createCaptureObserver(options)
  await restarted(called)
  assert.equal(await restarted(success), id)
  await first.flush()
  await restarted.flush()
  assert.equal(accepted.size, 1)
})

test("installed OpenCode 2.2.5 event shape: name arrives on input.started only", async () => {
  const accepted = new Map()
  const options = {
    workspaceID: "/work", policyPath: "test-policy", url: "http://127.0.0.1:1933", token: "test-token",
    policyLoader: () => policy,
    enqueue: async (candidate) => { accepted.set(candidate.event_id, candidate); return true },
  }
  const inputStarted = { type: "session.tool.input.started", data: { sessionID: "s1", assistantMessageID: "m1", id: "t1", name: "verified_source_tool" } }
  const called = { type: "session.tool.called", data: { sessionID: "s1", assistantMessageID: "m1", id: "t1", input: {}, executed: true } }
  const success = {
    type: "session.tool.success",
    data: { sessionID: "s1", assistantMessageID: "m1", id: "t1", executed: true,
      metadata: { memory_candidate_v1: {
        group_id: "approved", category: "verified_architecture_fact", fact_ref: "git:" + "a".repeat(40) + ":memory-facts/f.json",
        observed_at: "2026-10-30T00:00:00Z" } } },
  }
  const observer = createCaptureObserver(options)
  assert.equal(await observer(inputStarted), null)
  assert.equal(await observer(called), null)
  const id = await observer(success)
  assert.match(id, /^[0-9a-f]{64}$/)
  await observer.flush()
  assert.equal(accepted.size, 1)
  // No recorded tool name: the allowlist cannot be applied, nomination fails closed.
  const anonymous = createCaptureObserver(options)
  assert.equal(await anonymous({ ...success, data: { ...success.data, id: "t2", sessionID: "s2" } }), null)
  await anonymous.flush()
  assert.equal(anonymous.status().pending, 0)
})

test("secrets fixtures raw logs unsupported and unstructured claims are rejected", () => {
  for (const fact_ref of ["tests/fixture", "logs/run.log", "password=secret", "raw conversation text", "sk-abcdefghijklmnopqrstuvwxyz123456"]) {
    const changed = structuredClone(event)
    changed.data.metadata.memory_candidate_v1.fact_ref = fact_ref
    assert.equal(candidateFromToolEvent(changed, policy, "/work"), null)
  }
  const speculative = structuredClone(event)
  speculative.data.metadata.memory_candidate_v1.category = "agent_candidate"
  assert.equal(candidateFromToolEvent(speculative, policy, "/work"), null)
  assert.equal(candidateFromToolEvent({ ...event, type: "session.tool.failed" }, policy, "/work"), null)
})

test("local enqueue uses bounded background transport and no Graphiti invocation", async () => {
  const candidate = candidateFromToolEvent(event, policy, "/work")
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async (url, opts) => {
    calls++
    assert.match(url, /\/__commit_gate\/memory_candidates$/)
    assert.equal(opts.method, "POST")
    return { status: 202 }
  }
  try {
    assert.equal(await enqueueCandidate(candidate, { url: "http://127.0.0.1:1933", token: "test-token" }), true)
    assert.equal(calls, 1)
    assert.equal(await enqueueCandidate(candidate, { url: "https://example.org", token: "test-token" }), false)
    assert.equal(calls, 1)
  } finally { globalThis.fetch = original }
})
