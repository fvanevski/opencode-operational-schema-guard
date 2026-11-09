import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fromPrompt,fromTool} from '../v2-candidate/events.mjs';
import {CandidateQueue} from '../v2-candidate/queue.mjs';
import {selectClusters,modelPrompt,validateModelDecision,ReviewStore} from './core.mjs';
import {runAdmitted} from './worker.mjs';
import {sourcedEpisodeResolver} from './sourced-recall.mjs';
const scope={group:'stage92',project:'repo92',workspace:'/workspace/repo92'};
const ts='2026-11-09T10:00:00Z';
function source(){
 const u=fromPrompt({sessionID:'ses_92',messageID:'msg_1',
  prompt:{text:'Preserve the old CLI interface and fix the current median algorithm.'},
  timestamp:ts},scope,{admitted:true});
 const t=fromTool({sessionID:'ses_92',callID:'call_1',status:'completed',
  input:{command:'rg median docs/interface.md'},
  result:{output:{exit:0,output:'The parser requires integer median input.'}},timestamp:ts},scope);
 assert.ok(u&&t);return [u,t];
}
function raw(events){
 return {decision:'EMIT',utility_class:'durable_decision',
   reason:'Two independently sourced reusable development requirements',
   facts:events.map((e,i)=>({
      kind:i?'dependency':'decision',
      utility_class:i?'stable_architecture':'durable_decision',
      source_refs:[e.source_refs[0]],
      temporal_status:'observed',
      evidence_span:{source_ref:e.source_refs[0],start:0,end:e.excerpt.length},
      ...(i===0?{normalized_claim:'Retain the historical CLI when repairing the median implementation.'}:{})
   }))};
}
const scratch=async fn=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'issue92-facts-'));
 try{return await fn(root);}finally{await rm(root,{recursive:true,force:true});}
};
test('model-selected source offsets derive verbatim evidence and quarantine normalized claim',()=>{
 const events=source(),c=selectClusters(events)[0],p=raw(events);
 assert.match(modelPrompt(c)[0].content,/evidence_span/);
 const checked=validateModelDecision(p,c);
 assert.equal(checked.ok,true);
 assert.equal(checked.facts.length,2);
 assert.equal(checked.facts[0].assertion,events[0].excerpt);
 assert.equal(checked.review_only_claims[0].status,'review_only_unverified');
 assert.deepEqual(checked.fact_utilities,['durable_decision','stable_architecture']);
 const transient=validateModelDecision({...p,facts:[
   p.facts[0],{...p.facts[1],utility_class:'transient_result'}]},c);
 assert.equal(transient.ok,false);
 assert.equal(transient.reason,'per_fact_utility_required');
 assert.equal(validateModelDecision({...p,facts:[{...p.facts[0],
   evidence_span:{...p.facts[0].evidence_span,end:9999}}]},c).ok,false);
 const hallucinated=validateModelDecision({...p,facts:[{...p.facts[0],
   assertion:'This unrelated claim proves every future deployment is secure.'}]},c);
 assert.equal(hallucinated.ok,true);
 assert.equal(hallucinated.facts[0].assertion,events[0].excerpt);
 assert.ok(hallucinated.review_only_claims.some(c=>
   c.suggested.includes('every future deployment')&&c.status==='review_only_unverified'));
});
test('two independently grounded child facts receive distinct terminal Graphiti episodes',()=>scratch(async root=>{
 const prev=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const e=source(),cluster=selectClusters(e)[0],q=new CandidateQueue(root,scope.group),
    store=new ReviewStore(root,scope.group);
  for(const s of e)assert.equal((await q.stage(s)).status,'staged');
  const episodes=[];let calls=0;
  const graphiti={call:async(method,args)=>{
    if(method==='search_memory_facts')return {facts:[]};
    if(method==='get_episodes')return {episodes:[...episodes]};
    if(method==='add_memory'){
      calls++;
      assert.match(args.episode_body,/Fact 1:/);
      assert.doesNotMatch(args.episode_body,/Fact 2:/);
      episodes.push({name:args.name,group_id:scope.group,
        uuid:'abcd0000-0000-4000-9000-'+String(calls).padStart(12,'0')});
      return {ok:true};
    }
    throw Error('Unexpected Graphiti call '+method);
  }};
  const run=await runAdmitted({root,group:scope.group,queue:q,store,graphiti,
    curate:async()=>({content:JSON.stringify(raw(e)),duration_ms:10}),
    maxSeconds:20});
  assert.equal(run.model_calls,1);
  assert.equal(run.persisted,2);
  assert.equal(calls,2);
  assert.equal(await store.get(cluster.id),null);
  const rows=(await store.list({limit:50})).items;
  assert.equal(rows.length,2);
  assert.ok(rows.every(r=>r.origin_cluster_id===cluster.id&&r.facts.length===1&&r.state==='persisted'));
  assert.deepEqual(new Set(rows.map(r=>r.utility_class)),
    new Set(['durable_decision','stable_architecture']));
  for(const r of rows){
    const matches=await sourcedEpisodeResolver(root,scope.group,scope.workspace,
      scope.project,[r.remote_episode_uuid]);
    assert.equal(matches.length,1);
    assert.equal(matches[0].sourceRef,r.facts[0].source_refs[0]);
  }
  assert.equal((await q.status()).counts.approved,2);
 }finally{
  if(prev===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=prev;
 }
}));
test('bundle manifest heals an interrupted child write without model replay',()=>scratch(async root=>{
 const events=source(),c=selectClusters(events)[0],store=new ReviewStore(root,scope.group);
 const verified=validateModelDecision(raw(events),c);
 assert.equal(verified.ok,true);
 const initial=await store.createBundle(c,verified);
 assert.equal(initial.records.length,2);
 await rm(store.filename(initial.records[1].id));
 assert.equal(await new ReviewStore(root,scope.group).restoreBundles(),1);
 const after=(await store.list({limit:20})).items;
 assert.equal(after.length,2);
 assert.ok(after.every(r=>r.state==='approved'&&r.origin_cluster_id===c.id));
}));

test('source-ranged claim trims only boundary whitespace and preserves original attribution',()=>{
 const events=source(),c=selectClusters(events)[0],tool=events[1];
 const start=tool.excerpt.indexOf(' The parser requires');
 assert.ok(start>0);
 const raw=tool.excerpt.slice(start);
 assert.equal(raw[0],' ');
 const decision={decision:'EMIT',utility_class:'stable_architecture',
   reason:'Source-backed parser contract is useful for future maintenance',
   facts:[{kind:'dependency',utility_class:'stable_architecture',
     source_refs:[tool.source_refs[0]],temporal_status:'observed',
     evidence_span:{source_ref:tool.source_refs[0],start,end:tool.excerpt.length}}]};
 const result=validateModelDecision(decision,c);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.facts[0].assertion,raw.trim());
 assert.ok(tool.excerpt.includes(result.facts[0].assertion));
 assert.equal(result.facts[0].source_refs[0],tool.source_refs[0]);
 assert.equal(result.facts[0].evidence_class,'tool-reported');
 assert.equal(result.facts[0].scope.group,scope.group);
 assert.equal(result.facts[0].observed_at,tool.observed_at);
 const unsupported=validateModelDecision({...decision,
   facts:[{...decision.facts[0],evidence_span:{
      ...decision.facts[0].evidence_span,end:tool.excerpt.length+1}}]},c);
 assert.equal(unsupported.ok,false);
});
test('single-fact persisted utility classification follows validated per-fact judgment',()=>scratch(async root=>{
 const e=source(),c=selectClusters(e)[0],tool=e[1];
 const decision={decision:'EMIT',utility_class:'durable_decision',
   reason:'Validated utility belongs to the atomic persisted claim',
   facts:[{kind:'dependency',utility_class:'stable_architecture',
     assertion:tool.excerpt,source_refs:[tool.source_refs[0]],
     temporal_status:'observed'}]};
 const checked=validateModelDecision(decision,c);
 assert.equal(checked.ok,true);
 assert.deepEqual(checked.fact_utilities,['stable_architecture']);
 const record=(await new ReviewStore(root,scope.group).create(c,checked)).record;
 assert.equal(record.state,'approved');
 assert.equal(record.facts.length,1);
 assert.equal(record.utility_class,'stable_architecture');
}));
