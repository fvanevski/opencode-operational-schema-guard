import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {promises as fs} from 'node:fs';
import {autonomousPrompt,validateAutonomousDecision,completeSourceTokenSpan} from './autonomous-policy.mjs';
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
test('utility rationale cannot echo secret-bearing or self-referential text',()=>{
  const c=cluster(),d=decision(c);
  d.facts[0].utility_reason='secret: xxxxxxxxxxxxxxxxxxxxxxxxx';
  const p=validateAutonomousDecision(d,c);
  assert.equal(p.facts.length,1);
  assert.equal(p.blocked_candidates[0].reason,'invalid_utility_choice');
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

test('operator edit cannot retain an AI classification or its stale source span',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ghdev100-human-'));
  try{
    const c=cluster(),d=validateAutonomousDecision(decision(c),c);
    const store=new ReviewStore(root,c.group);
    const first=(await store.create(c,{...d,facts:[d.facts[0]],
      fact_utilities:[d.fact_utilities[0]],
      fact_retentions:[d.fact_retentions[0]],
      fact_source_spans:[d.fact_source_spans[0]],
      fact_utility_reasons:[d.fact_utility_reasons[0]]})).record;
    assert.equal(first.retention.status,'established_retention');
    const replacement={...first.facts[0],assertion:quoteB,
      source_refs:[c.events[1].source_refs[0]]};
    const changed=await store.change(first.id,first.revision,'edit-and-approve',{
      reason:'Corrected source identity after independent review',
      facts:[replacement]});
    assert.equal(changed.state,'approved');
    assert.equal(changed.retention,null);
    assert.equal((await store.get(first.id)).retention,null);
    assert.equal(changed.facts[0].assertion,quoteB);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('model-copied exact quote derives source offsets without model arithmetic',()=>{
  const c=cluster(),e=c.events[0],f={...fact(e),evidence_quote:e.excerpt};
  delete f.evidence_span;
  const result=validateAutonomousDecision({decision:'EMIT',
    reason:'A complete original source statement',facts:[f]},c);
  assert.equal(result.ok,true);
  assert.equal(result.facts[0].assertion,e.excerpt);
  assert.deepEqual(result.fact_source_spans[0],
    {source_ref:e.source_refs[0],start:0,end:e.excerpt.length});
  assert.match(autonomousPrompt(c)[0].content,/do not count character offsets/i);
});
test('middle-of-token span is local retry, not a remotely persisted fragment',()=>{
  const c=cluster(),e=c.events[0];
  const f={...fact(e),evidence_span:{
    source_ref:e.source_refs[0],start:0,end:e.excerpt.indexOf('lookup')+3}};
  assert.equal(completeSourceTokenSpan(e.excerpt,0,f.evidence_span.end),false);
  const result=validateAutonomousDecision({decision:'EMIT',
    reason:'Truncated source wording must be retried',facts:[f]},c);
  assert.equal(result.retryable,true);
  assert.equal(result.reason,'technical_retry_source_quote');
  assert.equal(result.blocked_candidates[0].reason,'incomplete_source_token_boundary');
});
test('nonexistent model quote cannot acquire source attribution',()=>{
  const c=cluster(),f={...fact(c.events[0]),
    evidence_quote:'A fabricated claim not present in the supplied source.'};
  delete f.evidence_span;
  const result=validateAutonomousDecision({decision:'EMIT',
    reason:'The synthetic claim lacks verbatim source support',facts:[f]},c);
  assert.equal(result.retryable,true);
  assert.equal(result.facts.length,0);
  assert.equal(result.blocked_candidates[0].reason,'invalid_exact_source_quote');
});
test('safe sibling remains independent of a truncated first source',()=>{
  const c=cluster(),d=decision(c);
  d.facts[0].evidence_span.end=c.events[0].excerpt.indexOf('lookup')+3;
  const result=validateAutonomousDecision(d,c);
  assert.equal(result.ok,true);
  assert.equal(result.facts.length,1);
  assert.equal(result.blocked_candidates[0].reason,'incomplete_source_token_boundary');
});
test('UTF-16 surrogate pairs and mid-word edges do not become valid source spans',()=>{
  const excerpt='The library records emoji 🚀 glyphs and source metadata together.';
  const emoji=excerpt.indexOf('🚀');
  assert.equal(completeSourceTokenSpan(excerpt,0,emoji+1),false);
  assert.equal(completeSourceTokenSpan(excerpt,0,emoji+2),true);
  assert.equal(completeSourceTokenSpan(excerpt,1,excerpt.length),false);
  assert.equal(completeSourceTokenSpan(excerpt,0,excerpt.length),true);
});

test('missing utility rationale leaves an otherwise exact quote retryable',()=>{
  const c=cluster(),f={...fact(c.events[0]),evidence_quote:quoteA};
  delete f.utility_reason;
  delete f.evidence_span;
  const result=validateAutonomousDecision({decision:'EMIT',
    reason:'One exact, safely sourced fact with malformed model metadata',
    facts:[f]},c);
  assert.equal(result.ok,false);
  assert.equal(result.retryable,true);
  assert.equal(result.reason,'technical_retry_utility_metadata');
  assert.equal(result.blocked_candidates[0].reason,'invalid_utility_metadata');
  assert.deepEqual(result.facts,[]);
});
test('invalid established utility class and overly short rationale are model retries',()=>{
  const c=cluster(),e=c.events[0],f=fact(e);
  const d={decision:'EMIT',reason:'One source-backed development statement',facts:[f]};
  f.utility_class='not_a_durable_class';
  const invalidClass=validateAutonomousDecision(d,c);
  assert.equal(invalidClass.retryable,true);
  assert.equal(invalidClass.blocked_candidates[0].reason,'invalid_established_class');
  f.utility_class='stable_architecture';
  f.utility_reason='x';
  const invalidReason=validateAutonomousDecision(d,c);
  assert.equal(invalidReason.retryable,true);
  assert.equal(invalidReason.blocked_candidates[0].reason,'invalid_utility_metadata');
});
test('unsafe utility rationale or forged source is a hard block, not a retry',()=>{
  const c=cluster(),f=fact(c.events[0]);
  f.utility_reason='secret: xxxxxxxxxxxxxxxxxxxxxxxxx';
  const unsafe=validateAutonomousDecision({decision:'EMIT',
    reason:'Safe top-level model response',facts:[f]},c);
  assert.equal(unsafe.reason,'integrity_blocked');
  assert.equal(unsafe.retryable,false);
  assert.equal(unsafe.blocked_candidates[0].reason,'invalid_utility_choice');
  const foreign=fact(c.events[0]);
  foreign.source_refs=['opencode:foreign:user:invented'];
  delete foreign.utility_reason;
  const spoof=validateAutonomousDecision({decision:'EMIT',
    reason:'Safe top-level model response',facts:[foreign]},c);
  assert.equal(spoof.reason,'integrity_blocked');
  assert.equal(spoof.retryable,false);
  assert.equal(spoof.blocked_candidates[0].reason,'invalid_original_source_span');
  const mixed=validateAutonomousDecision({decision:'EMIT',
    reason:'Safe top-level model response',facts:[
      {...fact(c.events[1]),utility_reason:undefined},foreign]},c);
  assert.equal(mixed.reason,'integrity_blocked');
  assert.equal(mixed.retryable,false);
});
test('safe sibling survives malformed utility metadata without being deferred',()=>{
  const c=cluster(),d=decision(c);
  delete d.facts[0].utility_reason;
  const result=validateAutonomousDecision(d,c);
  assert.equal(result.ok,true);
  assert.equal(result.decision,'EMIT');
  assert.equal(result.facts.length,1);
  assert.equal(result.facts[0].source_refs[0],c.events[1].source_refs[0]);
  assert.equal(result.blocked_candidates[0].reason,'invalid_utility_metadata');
});
