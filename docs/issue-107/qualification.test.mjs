import test from 'node:test';
import assert from 'node:assert/strict';
import {fromPromptCandidates,fromTool} from '../issue-78/v2-candidate/events.mjs';
import {selectClusters} from '../issue-78/v2-curator/core.mjs';
import {autonomousPrompt} from '../issue-100/autonomous-policy.mjs';
import {compactAutonomousPrompt,normalizeCompactDecision,
  validateCompactDecision} from './protocol.mjs';
import {freezeQualificationCases,runPairedQualification} from './qualification.mjs';

const scope={group:'issue107',project:'curation',workspace:'/workspace/curation'};
const quoteA='The storage adapter must preserve the original revision before committing a graph episode.';
const quoteB='The scheduler may defer ambiguous cache hints until a later independently sourced update.';
function promptSource(session='ses_b1'){
  return fromPromptCandidates({sessionID:session,messageID:'native_message',
    prompt:{text:quoteA+' '+quoteB},
    timestamp:'2026-11-18T10:00:00.000Z'},scope,{admitted:true})[0];
}
function clusterFor(e){
  return selectClusters([e],{sourceMessageIsolation:true})[0];
}
const established=(e,quote=quoteA)=>({kind:'architecture',temporal_status:'observed',
  source_refs:[e.source_refs[0]],evidence_quote:quote,
  retention_status:'established_retention',utility_class:'stable_architecture',
  utility_reason:'A durable implementation boundary useful in later work'});
const compact=(e,quote=quoteA)=>({kind:'architecture',temporal_status:'observed',
  source:e.source_refs[0],quote,retention:'established_retention',
  utility:'stable_architecture',
  why:'A durable implementation boundary useful in later work'});
function sourceCase(id='case_one',e=promptSource()){
  return {id,cohort_origin:'synthetic',cluster:clusterFor(e),
    opportunities:[{source_ref:e.source_refs[0],quote:quoteA,grade:'useful'},
      {source_ref:e.source_refs[0],quote:quoteB,grade:'excluded'}]};
}
const decision=f=>({decision:'EMIT',reason:'Useful exact developer-source statement',facts:f});

test('#107 compact and baseline share identical evidence input, not system instructions',()=>{
  const c=sourceCase().cluster;
  const original=autonomousPrompt(c),short=compactAutonomousPrompt(c);
  assert.deepEqual(short.map(x=>x.role),['system','user']);
  assert.equal(short[1].content,original[1].content);
  assert.notEqual(short[0].content,original[0].content);
  assert.match(short[0].content,/EX\/Graphiti write authority/);
  assert.match(short[0].content,/original-output fragment/);
  assert.ok(short[0].content.length<original[0].content.length);
});
test('#107 compact translates into exactly the preexisting strict source validator',()=>{
  const e=promptSource(),c=clusterFor(e);
  const normalized=normalizeCompactDecision(decision([compact(e)]));
  assert.deepEqual(normalized.facts[0].source_refs,e.source_refs);
  assert.equal(normalized.facts[0].evidence_quote,quoteA);
  assert.equal(normalized.facts[0].scope,undefined);
  const got=validateCompactDecision(decision([compact(e)]),c);
  assert.equal(got.ok,true);assert.equal(got.decision,'EMIT');
  assert.equal(got.facts[0].assertion,quoteA);
  assert.equal(got.facts[0].evidence_class,'user-stated');
  assert.equal(got.facts[0].observed_at,e.observed_at);
  assert.deepEqual(got.fact_source_spans[0],{
    source_ref:e.source_refs[0],start:0,end:quoteA.length});
});
test('#107 provisional utility is host classified and never factual certification',()=>{
  const e=promptSource(),c=clusterFor(e),p={...compact(e,quoteB),
    retention:'provisional_retention',utility:undefined};
  const got=validateCompactDecision(decision([p]),c);
  assert.equal(got.ok,true);
  assert.equal(got.fact_utilities[0],'plausibly_useful');
  assert.equal(got.facts[0].evidence_class,'user-stated');
});
test('#107 forged handle, invented quote, and weak fallback remain blocked',()=>{
  const e=promptSource(),c=clusterFor(e);
  const forged=validateCompactDecision(decision([{...compact(e),
    source:'opencode:ses_other:message:fake'}]),c);
  assert.equal(forged.ok,false);assert.equal(forged.reason,'integrity_blocked');
  const invented=validateCompactDecision(decision([{...compact(e),
    quote:'A fabricated source statement that is absent from the native input.'}]),c);
  assert.equal(invented.ok,false);assert.equal(invented.retryable,true);
  assert.equal(invented.blocked_candidates[0].reason,'invalid_exact_source_quote');
  const weak={...e,source_strength:'session-scoped-fallback'};
  const notNative=validateCompactDecision(decision([compact(weak)]),clusterFor(weak));
  assert.equal(notNative.ok,false);
  assert.equal(notNative.blocked_candidates[0].reason,'invalid_original_source_span');
});
test('#107 malformed sibling cannot veto independently safe source fact',()=>{
  const e=promptSource(),c=clusterFor(e);
  const got=validateCompactDecision(decision([
    {...compact(e),why:undefined},compact(e,quoteB)]),c);
  assert.equal(got.ok,true);assert.equal(got.facts.length,1);
  assert.equal(got.facts[0].assertion,quoteB);
  assert.equal(got.blocked_candidates[0].reason,'invalid_utility_metadata');
  assert.equal(validateCompactDecision('{broken',c).retryable,true);
});
test('#107 a tool quote cannot include generated labels or disjoint lines',()=>{
  const output=['PASS initial check','ordinary row two',
    'The parser requires UTF-8 input.','ordinary row four',
    'The client requires version two.'].join('\n');
  const tool=fromTool({sessionID:'ses_tools',callID:'call_107',tool:'shell',
    status:'completed',input:{command:'node validate-parser.mjs'},
    result:{output:{exit:0,output}}},scope);
  assert.equal(tool.kind,'tool_outcome');
  assert.equal(tool.source_fragments.length,3);
  const c=clusterFor(tool);
  const good={...compact(tool,'The parser requires UTF-8 input.'),
    kind:'test_result'};
  assert.equal(validateCompactDecision(decision([good]),c).ok,true);
  const synthetic=tool.excerpt.slice(tool.excerpt.indexOf('[3]'));
  assert.match(synthetic,/\| \[5\]/);
  const bad=validateCompactDecision(decision([{...good,quote:synthetic}]),c);
  assert.equal(bad.ok,false);assert.equal(bad.reason,'integrity_blocked');
  assert.equal(bad.blocked_candidates[0].reason,'invalid_original_source_span');
  assert.throws(()=>freezeQualificationCases([{id:'forged_tool_grade',
    cohort_origin:'synthetic',cluster:c,
    opportunities:[{source_ref:tool.source_refs[0],quote:synthetic,
      grade:'useful'}]}]),/B1_UNSUPPORTED_REFERENCE_GRADE/);
});
test('#107 reference cohort is frozen before model inference and excludes source spoofing',()=>{
  const e=promptSource(),one=sourceCase('freeze',e);
  const frozen=freezeQualificationCases([one]);
  assert.match(frozen.freeze_sha256,/^[a-f0-9]{64}$/);
  assert.notEqual(frozen.cases[0],one);
  one.cluster.events[0].excerpt='changed after freeze';
  assert.equal(frozen.cases[0].cluster.events[0].excerpt,quoteA+' '+quoteB);
  const foreign=sourceCase('bad',promptSource('ses_bad'));
  foreign.opportunities[0].source_ref='opencode:foreign:message:fake';
  assert.throws(()=>freezeQualificationCases([foreign]),
    /B1_UNSUPPORTED_REFERENCE_GRADE/);
});
test('#107 no paired model call without admitted EX marker',async()=>{
  const prior=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  try{
    let invoked=false;
    await assert.rejects(()=>runPairedQualification([sourceCase()],{
      curate:async()=>{invoked=true;}}),/EX_POST_EXIT_ADMISSION_REQUIRED/);
    assert.equal(invoked,false);
  }finally{
    if(prior===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
    else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=prior;
  }
});
test('#107 paired local-model simulation counts gold references and excludes raw payloads',async()=>{
  const prior=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
  try{
    const cases=[sourceCase()],e=cases[0].cluster.events[0];
    const calls=[];
    const result=await runPairedQualification(cases,{
      modelArgs:{endpoint:'http://127.0.0.1:8002/v1/chat/completions',model:'chat'},
      curate:async(c,args)=>{
        calls.push(args);
        const compactMode=args.promptMessages[0].content.includes('COMPACT PROTOCOL');
        return {content:JSON.stringify(decision([compactMode?compact(e):established(e)])),
          usage:{prompt_tokens:compactMode?175:280,completion_tokens:75},
          duration_ms:compactMode?9:12};
      }});
    assert.equal(result.cohort_count,1);
    assert.equal(result.totals.baseline.useful_reference_matched,1);
    assert.equal(result.totals.compact.useful_reference_matched,1);
    assert.equal(result.totals.baseline.attempted_calls,1);
    assert.equal(result.totals.compact.attempted_calls,1);
    assert.equal(result.totals.baseline.tokens_per_reference_matched,355);
    assert.equal(result.totals.compact.tokens_per_reference_matched,250);
    assert.equal(calls.length,2);
    assert.equal(calls[0].promptMessages[1].content,calls[1].promptMessages[1].content);
    assert.equal(calls[0].model,'chat');
    const returned=JSON.stringify(result);
    assert.ok(!returned.includes(quoteA));
    assert.ok(!returned.includes('native_message'));
    assert.ok(!returned.includes('http://'));
  }finally{
    if(prior===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
    else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=prior;
  }
});
test('#107 one model failure is accounted for and never triggers a hidden retry',async()=>{
  const prior=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
  try{
    const c=sourceCase(),e=c.cluster.events[0];
    let attempts=0;
    const out=await runPairedQualification([c],{curate:async()=>{attempts++;
      if(attempts===1)throw Error('private_model_failure');
      return {content:JSON.stringify(decision([compact(e)])),
        usage:{prompt_tokens:100,completion_tokens:55},duration_ms:2};
    }});
    assert.equal(attempts,2);
    assert.equal(out.totals.baseline.model_errors,1);
    assert.equal(out.totals.compact.completed_calls,1);
    assert.equal(out.totals.baseline.accepted_facts,0);
    assert.ok(!JSON.stringify(out).includes('private_model_failure'));
  }finally{
    if(prior===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
    else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=prior;
  }
});
