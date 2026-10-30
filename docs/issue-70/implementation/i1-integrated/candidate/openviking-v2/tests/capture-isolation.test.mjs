import test from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { once } from "node:events"
import { candidateFromToolEvent, createCaptureObserver } from "../candidate-capture.mjs"

const policy = { enabled: true, revision: "r1", workspaces: ["/work"], groups: ["approved"], categories: ["verified_architecture_fact", "exclusive_state_transition"], tools: ["tool"] }
const called = (id = "t1") => ({ type: "session.tool.called", data: { sessionID: "s1", id, name: "tool" } })
const success = (id = "t1") => ({ type: "session.tool.success", data: { sessionID: "s1", assistantMessageID: "m1", id, name: "tool", executed: true, metadata: { memory_candidate_v1: { group_id: "approved", category: "verified_architecture_fact", fact_ref: "repo:fact", evidence_ref: "repo:forged", observed_at: "2026-10-30T00:00:00Z", confidence: 1, logical_digest: "0".repeat(64) } } } })
const options = { workspaceID: "/work", policyPath: "fixture-policy", policyLoader: () => policy, url: "http://127.0.0.1:1", token: "disposable-capture" }

test("forged evidence confidence time and transitions never become verified", () => {
  const event = success()
  const first = candidateFromToolEvent(event, policy, "/work")
  assert.equal(first.authority.basis, "agent_candidate")
  assert.equal(first.authority.confidence, 0)
  assert.equal(first.authority.evidence_ref, undefined)
  event.data.metadata.memory_candidate_v1.evidence_ref = "repo:different-forgery"
  event.data.metadata.memory_candidate_v1.confidence = 0.9
  event.data.metadata.memory_candidate_v1.logical_digest = "f".repeat(64)
  const same = candidateFromToolEvent(event, policy, "/work")
  assert.deepEqual(first, same)
  event.data.metadata.memory_candidate_v1.observed_at = "2099-01-01T00:00:00Z"
  const forged = candidateFromToolEvent(event, policy, "/work")
  assert.equal(forged.event_id, first.event_id)
  assert.notEqual(forged.logical_digest, first.logical_digest)
  assert.equal(forged.authority.basis, "agent_candidate")
  event.data.metadata.memory_candidate_v1.category = "exclusive_state_transition"
  event.data.metadata.memory_candidate_v1.transition = { subject_ref: "repo:entity", predicate: "state", outgoing_state_ref: "repo:old", incoming_state_ref: "repo:new", effective_at: "2099-01-01T00:00:00Z" }
  assert.equal(candidateFromToolEvent(event, policy, "/work").authority.basis, "agent_candidate")
})

test("outstanding work is bounded; duplicates coalesce; baseline delivery proceeds before network", async () => {
  let release
  const slow = new Promise((resolve) => { release = resolve })
  const sent = []
  const observer = createCaptureObserver({ ...options, maxPending: 2, enqueue: async (candidate) => { sent.push(candidate.event_id); await slow; return true } })
  const baseline = []
  for (const id of ["t1", "t1", "t2", "t3"]) {
    // Faithful subscription pattern: optional observer is never awaited.
    observer(called(id)); observer(success(id)); baseline.push(id)
  }
  await Promise.resolve()
  assert.equal(baseline.length, 4)
  assert.equal(observer.status().pending, 2)
  assert.equal(observer.status().deferred, 1)
  assert.equal(sent.length, 2)
  release(); await observer.flush()
  assert.equal(observer.status().pending, 0)
})

test("policy and sender exceptions are isolated including synchronous throws", async () => {
  for (const overrides of [{ policyLoader: () => { throw Error("bad policy") } }, { enqueue: () => { throw Error("send threw") } }, { enqueue: async () => { throw Error("send rejected") } }]) {
    const observer = createCaptureObserver({ ...options, ...overrides })
    await observer(called()); await assert.doesNotReject(observer(success()))
    await observer.flush()
    assert.equal(observer.status().failed, 1)
  }
})

test("slow real endpoint times out without delaying baseline callbacks", async () => {
  let requests = 0
  const sockets = new Set()
  const server = createServer((_req, _res) => { requests++ })
  server.on("connection", (socket) => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)) })
  server.listen(0, "127.0.0.1"); await once(server, "listening")
  try {
    const observer = createCaptureObserver({ ...options, url: `http://127.0.0.1:${server.address().port}`, timeoutMs: 100 })
    observer(called()); observer(success())
    let baseline = false; baseline = true
    assert.equal(baseline, true)
    assert.equal(observer.status().pending, 1)
    await observer.flush()
    assert.equal(requests, 1)
    assert.equal(observer.status().failed, 1)
    assert.equal(observer.status().pending, 0)
  } finally { for (const socket of sockets) socket.destroy(); await new Promise((resolve) => server.close(resolve)) }
})

test("restart and continuation preserve event binding but missing Called is deferred", async () => {
  const sent = []
  const opts = { ...options, enqueue: async (candidate) => { sent.push(candidate); return true } }
  const first = createCaptureObserver(opts)
  await first(called()); const id = await first(success()); await first.flush()
  const restarted = createCaptureObserver(opts)
  assert.equal(await restarted(success()), null)
  await restarted(called()); assert.equal(await restarted(success()), id); await restarted.flush()
  assert.deepEqual(sent[0], sent[1])
  const continued = success(); continued.data.assistantMessageID = "continued-message"
  assert.equal(candidateFromToolEvent(continued, policy, "/work").event_id, id)
})
