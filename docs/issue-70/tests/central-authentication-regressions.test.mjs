// Issue #70. Copy this file to the authenticated openviking-v2 source's
// tests/ directory, alongside candidate-capture.test.mjs, before running.
// This intentionally fails against the 2026-10-30 supplied Phase 1 candidate.
// Do not change these assertions merely to achieve green.
import test from 'node:test'
import assert from 'node:assert/strict'
import { candidateFromToolEvent, createCaptureObserver } from '../candidate-capture.mjs'

const policy = {
  enabled: true, revision: 'operator-r1', extractor_version: '1',
  workspaces: ['/workspace'], groups: ['authorized'],
  categories: ['verified_architecture_fact'], tools: ['operator_allowlisted_tool'],
}
function candidateEvent() {
  return {type:'session.tool.success',data:{
    sessionID:'session1', assistantMessageID:'message1',id:'event1',
    name:'operator_allowlisted_tool', executed:true,metadata:{memory_candidate_v1:{
      group_id:'authorized',category:'verified_architecture_fact',
      fact_ref:'repo:main:claim1',evidence_ref:'repo:main:claim1',
      observed_at:'2026-10-30T00:00:00Z',confidence:1,
      logical_digest:'0'.repeat(64),
    }},
  }}
}

test('unverified tool proposal cannot be silently promoted to source_verified', () => {
  const candidate = candidateFromToolEvent(candidateEvent(), policy, '/workspace')
  assert.ok(candidate === null || candidate.authority.basis !== 'source_verified',
    'An allowlisted tool name is not independent source verification')
})
test('same source event cannot select alternate work identities through caller digest', () => {
  const a = candidateEvent()
  const b = candidateEvent()
  b.data.metadata.memory_candidate_v1.logical_digest = '1'.repeat(64)
  const first = candidateFromToolEvent(a, policy, '/workspace')
  const second = candidateFromToolEvent(b, policy, '/workspace')
  assert.ok(first === null || second === null || (
    first.event_id === second.event_id && first.logical_digest === second.logical_digest
  ), 'work-key inputs must be derived from authenticated canonical source data')
})
test('optional observer errors cannot reject the enclosing existing event callback', async () => {
  const observer = createCaptureObserver({
    workspaceID:'/workspace',policyPath:'fixture-policy',
    url:'http://127.0.0.1:1933',token:'test-only',
    policyLoader:()=>policy,
    enqueue:async()=>{throw new Error('optional network failure')},
  })
  await observer({type:'session.tool.called',data:{
    sessionID:'session1',id:'event1',name:'operator_allowlisted_tool',
  }})
  await assert.doesNotReject(observer(candidateEvent()))
})
