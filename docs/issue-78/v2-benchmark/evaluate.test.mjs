import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,sha256,quantiles,confusion} from './evaluate.mjs';
import {fromPrompt} from '../v2-candidate/events.mjs';
const scope={group:'issue81_dev',project:'benchmark',workspace:'/tmp/issue81/benchmark'};
const timestamp='2026-11-03T18:15:00Z';
const prompt=(id,text,valuable,category='implicit')=>({
 id,source_type:'prompt',category,source_locator:'synthetic:unit:'+id,
 native_event:{sessionID:'ses_81test',messageID:'msg_'+id,timestamp,prompt:{text}},
 label:{valuable}});
const shell=(id,exit,output,valuable=true)=>({
 id,source_type:'tool',category:'error_fix',source_locator:'synthetic:unit:'+id,
 native_event:{sessionID:'ses_81test',callID:'call_'+id,timestamp,
 tool:'bash',status:'completed',input:{command:'node --test median.test.js'},
 result:{output:{exit,output}}},label:{valuable}});
function corpus(){return {schema_version:1,split:'development',label_status:'prior_accepted',
 scope,cases:[
 prompt('implicit','The root cause is an off-by-one median calculation; correct the implementation and rerun the test.',true),
 prompt('explicit','I prefer to retain the existing Graphiti interface and avoid introducing a separate database.',true,'direct'),
 prompt('chatter','thanks',false,'chatter'),
 prompt('private','I decided to set password=synthetic-not-a-real-credential in the config.',false,'privacy'),
 shell('fail',1,'1 failed, 0 passed'),
 shell('pass',0,'1 passed, 0 failed'),
 {...prompt('wrong','The design rationale from another group must not enter this group.',false,'wrong_group'),
  scope:{...scope,group:'other_group'}}]};}
const targets={schema_version:1,status:'central_proposal',thresholds:{
 candidate_recall_min:.85,durable_grounded_precision_min:.9,
 semantic_recall_min:.8,context_p95_ms_max:300,post_exit_p95_seconds_max:900}};
test('applies authentic selector/adapter functions to identical source fixtures',()=>{
 const result=evaluate(corpus(),{targets});
 assert.deepEqual([result.baseline.tp,result.baseline.fn],[2,2]);
 assert.deepEqual([result.broad_capture.tp,result.broad_capture.fn,result.broad_capture.fp],[4,0,0]);
 assert.deepEqual(result.privacy_or_wrong_group_selected,[]);
 assert.equal(result.curator.status,'UNVERIFIED_NO_MODEL_OBSERVATIONS');
 assert.equal(result.targets.candidate_recall,true);
 assert.equal(result.targets.semantic_recall,'UNVERIFIED_UNTIL_FRESH_CLIENT');
});
test('incomplete ground truth never masquerades as complete metrics',()=>{
 const c=corpus();delete c.cases[0].label;
 const r=evaluate(c);
 assert.equal(r.gold_complete,false);
 assert.equal(r.baseline,null);
 assert.equal(r.broad_capture,null);
});
test('holdout denies self-authorization without human adjudication and pinned digests',()=>{
 const c=corpus();c.split='holdout';
 assert.throws(()=>evaluate(c,{targets}),/unadjudicated_holdout/);
 c.label_status='operator_adjudicated';c.adjudicated_by='human';
 assert.throws(()=>evaluate(c,{targets}),/unverified_corpus_hash/);
 const b=JSON.stringify(c),t=JSON.stringify(targets);
 assert.throws(()=>evaluate(c,{targets,corpusBytes:b,targetsBytes:t,
 expectedCorpusSha:sha256(b),expectedTargetsSha:sha256(t)}),/unratified_holdout_targets/);
 targets.status='operator_ratified';
 const approved=JSON.stringify(targets);
 const scored=evaluate(c,{targets,corpusBytes:b,targetsBytes:approved,
 expectedCorpusSha:sha256(b),expectedTargetsSha:sha256(approved)});
 assert.equal(scored.gold_complete,true);
 targets.status='central_proposal';
});
test('curator observation must match deterministic cluster ID, native source and authority',()=>{
 const c=corpus(),r=evaluate(c),sourceId=r.rows[0].event_id;
 const original=c.cases[0].native_event.prompt.text;
 const record={source_case_ids:['implicit'],cluster_id:sha256(sourceId),
  origin:'model',decision:'EMIT',reason:'Exact source excerpt',
  facts:[{assertion:original,kind:'implementation',temporal_status:'observed',
    source_refs:['opencode:ses_81test:message:msg_implicit']}],
  model_ms:520,prompt_tokens:130,completion_tokens:26,terminal_state:'queued'};
 const result=evaluate(c,{observations:{schema_version:1,records:[record]}});
 assert.equal(result.curator.invalid_model_or_source_decisions,0);
 assert.equal(result.curator.facts_proposed,1);
 assert.equal(result.curator.facts_human_judged,0);
 assert.equal(result.curator.grounded_precision,null);
 assert.equal(result.curator.tokens_total,156);
 const fake={...record,facts:[{...record.facts[0],source_refs:['opencode:bogus:tool:missing']}]};
 assert.equal(evaluate(c,{observations:{schema_version:1,records:[fake]}}).curator.invalid_model_or_source_decisions,1);
 assert.throws(()=>evaluate(c,{observations:{schema_version:1,records:[
  {...record,source_case_ids:['no-such-source']} ]}}),/missing_candidate/);
 assert.throws(()=>evaluate(c,{observations:{schema_version:1,records:[
  {...record,origin:'unspecified'} ]}}),/observation_shape_or_origin/);
});
test('qualification group does not rewrite frozen labels or silently rebind event IDs',()=>{
 const c=corpus(),different={...scope,group:'cur81_dev_ce555621'};
 const event=fromPrompt(c.cases[0].native_event,different,{admitted:true});
 assert.ok(event?.event_id);
 const obs={schema_version:1,scope:different,records:[{
  source_case_ids:['implicit'],source_event_ids:[event.event_id],
  cluster_id:sha256(event.event_id),origin:'model',decision:'DEFER',
  reason:'No durable fact supported yet',facts:[]}]};
 const report=evaluate(c,{observations:obs});
 assert.equal(report.curator.invalid_model_or_source_decisions,0);
 assert.equal(report.curator.records[0].cluster_id,sha256(event.event_id));
 assert.equal(report.broad_capture.tp,4);
 const wrong={...obs,records:[{...obs.records[0],source_event_ids:['0'.repeat(64)]}]};
 assert.throws(()=>evaluate(c,{observations:wrong}),/qualification_source_identity_mismatch/);
 assert.throws(()=>evaluate(c,{observations:{...obs,scope:{...different,group:'ghdev_gh_mcp'}}}),
   /qualification_scope_mismatch/);
 assert.throws(()=>evaluate(c,{observations:{...obs,scope:{...different,project:'other_project'}}}),
   /qualification_scope_mismatch/);
});
test('independent fact labels cannot be inflated by unaudited observations',()=>{
 const c=corpus(),r=evaluate(c),original=c.cases[0].native_event.prompt.text;
 const record={source_case_ids:['implicit'],cluster_id:sha256(r.rows[0].event_id),
  origin:'model',decision:'EMIT',reason:'Exact source excerpt',
  facts:[{assertion:original,kind:'implementation',temporal_status:'observed',
   source_refs:['opencode:ses_81test:message:msg_implicit']}],
  fact_verdicts:[{grounded:true,useful:true,authority_correct:true,
    scope_correct:true,evaluator_id:'unratified_fixture'}]};
 const report=evaluate(c,{observations:{schema_version:1,records:[record]}});
 assert.equal(report.curator.grounded_precision,null);
 assert.equal(report.curator.facts_human_judged,0);
});
test('quantiles and confusion are explicit and null for unobserved denominators',()=>{
 assert.deepEqual(quantiles([]),{count:0,p50:null,p95:null});
 assert.deepEqual(quantiles([1,2,3,4,5]),{count:5,p50:3,p95:5});
 assert.deepEqual(confusion([{truth:true,found:true},{truth:false,found:true}],'found'),
  {tp:1,fp:1,tn:0,fn:0,precision:.5,recall:1});
});
