import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {promises as fs} from 'node:fs';
import {autonomousPrompt,validateAutonomousDecision} from './autonomous-policy.mjs';
import {ReviewStore} from '../issue-78/v2-curator/core.mjs';

const quoteA='The cache contract requires invalidating the previous episode lookup whenever its source revision changes.';
const quoteB='The native controller preserves each original source ID and never recreates missing historical events.';
const event=(id,excerpt)=>({event_id:id.repeat(64),source_refs:['opencode:ses_test:user:msg_'+id],
  source_strength:'native-id',evidence_class:'user-stated',kind:'decision',
  observed_at:'2026-11-16T10:00:00Z',excerpt,group:'development-knowledge',
  project:'operational-schema-guard',workspace:'/workspace/test',
  session_id:'ses_test',state:'new'});
function cluster(){
  const events=[event('a',quoteA),event('b',quoteB)];
  return {id:'c'.repeat(64),events,group:events[0].group,project:events[0].project,
    workspace:events[0].workspace,session_id:events[0].session_id,
    source_event_ids:events.map(x=>x.event_id)};
}
const fact=(e,status='established_retention')=>({
  kind:'decision',temporal_status:'observed',source_refs:[e.source_refs[0]],
  evidence_span:{source_ref:e.source_refs[0],start:0,end:e.excerpt.length},
  retention_status:status,utility_class:'stable_architecture',
  utility_reason:'Source-grounded developer knowledge for later decisions'
});
const decision=(c)=>({decision:'EMIT',reason:'Two distinct useful facts',
  facts:[fact(c.events[0]),fact(c.events[1],'provisional_retention')]});
test('one pass yields two separately grounded retention decisions',()=>{
  const c=cluster(),p=validateAutonomousDecision(decision(c),c);
  assert.equal(p.ok,true);assert.equal(p.facts.length,2);
  assert.deepEqual(p.fact_retentions,['established_retention','provisional_retention']);
  assert.deepEqual(p.fact_utilities,['stable_architecture','plausibly_useful']);
  assert.equal(p.facts[0].evidence_class,'user-stated');
});
test('invalid sibling is blocked without contaminating a valid sibling',()=>{
  const c=cluster(),d=decision(c);
  d.facts[0].evidence_span.source_ref='foreign';
  const p=validateAutonomousDecision(d,c);
  assert.equal(p.ok,true);assert.equal(p.facts.length,1);
  assert.equal(p.blocked_candidates[0].reason,'invalid_original_source_span');
});
test('an invented normalized assertion cannot replace the exact original quote',()=>{
  const c=cluster(),f=fact(c.events[0],'provisional_retention');
  f.assertion='A fabricated root cause was independently verified and repaired';
  const p=validateAutonomousDecision({decision:'EMIT',
    reason:'Potentially useful reported observation',facts:[f]},c);
  assert.equal(p.ok,true);
  assert.equal(p.facts[0].assertion,quoteA);
  assert.equal(p.facts[0].evidence_class,'user-stated');
  assert.equal(p.review_only_claims[0].status,'review_only_unverified');
});
test('malformed model output remains retryable instead of SKIP',()=>{
  assert.equal(validateAutonomousDecision('{broken',cluster()).retryable,true);
  assert.equal(validateAutonomousDecision({decision:'DEFER',reason:'Uncertain',facts:[]},cluster()).retryable,true);
});
test('only source-bearing utility is selected, never truth certification',()=>{
  const prompt=autonomousPrompt(cluster());
  assert.match(prompt[0].content,/original-source support/);
  assert.match(prompt[0].content,/No model output authorizes Graphiti/);
});
test('bundle recovery preserves retention and atomic source spans',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ghdev100-'));
  try{
    const c=cluster(),d=validateAutonomousDecision(decision(c),c);
    const s=new ReviewStore(root,c.group);
    const first=await s.createBundle(c,d);
    assert.equal(first.records.length,2);
    assert.deepEqual(first.records.map(x=>x.retention?.status),d.fact_retentions);
    assert.ok(first.records.every(x=>x.facts.length===1));
    const again=await new ReviewStore(root,c.group).restoreBundle(c.id);
    assert.deepEqual(again.records.map(x=>x.retention),first.records.map(x=>x.retention));
  } finally {await fs.rm(root,{recursive:true,force:true});}
});
