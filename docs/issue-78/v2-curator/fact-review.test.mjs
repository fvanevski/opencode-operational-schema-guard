import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fromPrompt} from '../v2-candidate/events.mjs';
import {CandidateQueue} from '../v2-candidate/queue.mjs';
import {selectClusters,validateModelDecision,ReviewStore} from './core.mjs';
import {factDiscoveryPrompt,factReviewPrompt,validateFactReview,filterFactProposal,
 reviewProposedFacts} from './fact-review.mjs';
import {runAdmitted} from './worker.mjs';

const scope={group:'issue92screen',project:'repo92',workspace:'/workspace/repo92'};
const sourceText='The CLI option --verbose requires an argument in the installed Pylint version; using -v alone fails with missing option value.';
function source(){
 const e=fromPrompt({sessionID:'ses92screen',messageID:'msg92screen',
   prompt:{text:sourceText},timestamp:'2026-11-09T19:00:00Z'},
   scope,{admitted:true});
 assert.ok(e);return e;
}
function proposal(c){
 const e=c.events[0];
 return validateModelDecision({decision:'EMIT',utility_class:'useful_negative',
   reason:'This source reports a reusable command-line incompatibility',
   facts:[{kind:'blocker',utility_class:'useful_negative',
     source_refs:[e.source_refs[0]],temporal_status:'observed',
     evidence_span:{source_ref:e.source_refs[0],
       start:0,end:e.excerpt.length}}]},c);
}
const accepted=JSON.stringify({decisions:[{index:0,disposition:'ACCEPT',
  reason_code:'source_specific_durable'}]});
const boilerplate=JSON.stringify({decisions:[{index:0,disposition:'REVIEW',
  reason_code:'not_substantive'}]});
const repeated=JSON.stringify({decisions:[{index:0,disposition:'REVIEW',
  reason_code:'repetition_candidate'}]});
const scratch=async fn=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'issue92-screen-'));
 try{return await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}
};
test('fact-screen judges the exact persisted source quote, not unrelated cluster context',()=>{
 const c=selectClusters([source()])[0],p=proposal(c);
 assert.equal(p.ok,true);
 const msgs=factReviewPrompt(c,p,[{assertion:
   'The CLI option --verbose requires an argument in this release.',
   source_ref:'opencode:other',temporal_status:'historical',kind:'blocker'}]);
 assert.equal(msgs.length,2);
 const input=JSON.parse(msgs[1].content);
 assert.equal(input.candidates[0].assertion,c.events[0].excerpt);
 assert.equal(input.candidates[0].source_excerpt,c.events[0].excerpt);
 assert.equal(input.prior_same_group_facts.length,1);
 assert.match(msgs[0].content,/source_excerpt|exact quoted assertion|exact quoted/);
 assert.match(msgs[0].content,/REVIEW/);
});
test('screen verdict cannot self-authorize unknown indices, reasons or conflicting decisions',()=>{
 const c=selectClusters([source()])[0],p=proposal(c);
 assert.equal(validateFactReview(accepted,p).ok,true);
 for(const raw of [
  {decisions:[{index:1,disposition:'ACCEPT',reason_code:'source_specific_durable'}]},
  {decisions:[{index:0,disposition:'ACCEPT',reason_code:'invented_reason'}]},
  {decisions:[{index:0,disposition:'REJECT',reason_code:'source_specific_durable'}]},
  {decisions:[]}
 ])assert.equal(validateFactReview(raw,p).ok,false);
 assert.deepEqual(validateFactReview(repeated,p).accepted,[]);
});
test('review verdict preserves uncertain source for operator instead of automatic Graphiti write',()=>{
 const c=selectClusters([source()])[0],p=proposal(c);
 const screen=validateFactReview(boilerplate,p);
 const filtered=filterFactProposal(p,screen);
 assert.equal(filtered.decision,'DEFER');
 assert.equal(filtered.facts.length,0);
 assert.equal(filtered.review_only_claims[0].status,'review_only_unverified');
 assert.equal(filtered.review_only_claims[0].screen_reason,'not_substantive');
 const approved=filterFactProposal(p,validateFactReview(accepted,p));
 assert.equal(approved.ok,true);
 assert.equal(approved.facts[0].assertion,p.facts[0].assertion);
 assert.equal(approved.facts[0].source_refs[0],p.facts[0].source_refs[0]);
 assert.equal(approved.fact_utilities[0],'useful_negative');
});
test('post-exit reviewer sees previously approved/persisted same-group statements',()=>scratch(async root=>{
 const c=selectClusters([source()])[0],p=proposal(c);
 let observed=null;
 const store={list:async()=>({items:[
   {state:'persisted',facts:[{...p.facts[0],
     assertion:'The CLI option --verbose requires an argument in this release.'}]}
 ],has_more:false})};
 const r=await reviewProposedFacts(c,p,{store,modelEndpoint:'http://127.0.0.1:8002/v1/chat/completions',
   modelId:'chat-fast',modelCall:async(_cluster,options)=>{
     observed=options.promptMessages;
     return {content:repeated,duration_ms:1};
   }});
 assert.equal(r.prior_count,1);
 assert.equal(JSON.parse(observed[1].content).prior_same_group_facts.length,1);
 assert.equal(r.proposal.decision,'DEFER');
 assert.equal(r.proposal.review_only_claims[0].screen_reason,'repetition_candidate');
}));
test('opt-in worker screen can reject boilerplate before Graphiti while preserving review',()=>scratch(async root=>{
 const previous=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const e=source(),queue=new CandidateQueue(root,scope.group),
    store=new ReviewStore(root,scope.group);
  await queue.stage(e);
  const graphiti={call:async(method)=>{
    if(method==='get_episodes')return {episodes:[]};
    if(method==='search_memory_facts')return {facts:[]};
    if(method==='add_memory')throw Error('FACT_SCREEN_MUST_NOT_PERSIST_BOILERPLATE');
    throw Error('unexpected:'+method);
  }};
  const result=await runAdmitted({root,group:scope.group,queue,store,graphiti,
    curate:async()=>({content:JSON.stringify({decision:'EMIT',
      utility_class:'useful_negative',
      reason:'Reported CLI incompatibility',facts:[{
       kind:'blocker',utility_class:'useful_negative',
       source_refs:[e.source_refs[0]],temporal_status:'observed',
       evidence_span:{source_ref:e.source_refs[0],start:0,end:e.excerpt.length}
      }]}),duration_ms:1}),
    factReview:true,factReviewModelCall:async()=>({content:boilerplate,duration_ms:1}),
    maxClusters:2,maxSeconds:10});
  assert.equal(result.model_calls,2);
  assert.equal(result.persisted,0);
  const rows=(await store.list({limit:20})).items;
  assert.equal(rows.length,1);
  assert.equal(rows[0].state,'deferred');
  assert.equal(rows[0].review_only_claims[0].screen_reason,'not_substantive');
 }finally{
  if(previous===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=previous;
 }
}));
test('screen unavailability fails to deferred evidence, not an unreviewed automatic write',()=>scratch(async root=>{
 const prior=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const e=source(),queue=new CandidateQueue(root,scope.group),
   store=new ReviewStore(root,scope.group);
  await queue.stage(e);
  const graphiti={call:async(method)=>{
    if(method==='get_episodes')return {episodes:[]};
    if(method==='search_memory_facts')return {facts:[]};
    if(method==='add_memory')throw Error('BAD_AUTOMATIC_WRITE');
   }};
  const result=await runAdmitted({root,group:scope.group,queue,store,graphiti,
   curate:async()=>({content:JSON.stringify({decision:'EMIT',
    utility_class:'useful_negative',reason:'Valid reported CLI incompatibility',
    facts:[{kind:'blocker',source_refs:[e.source_refs[0]],
      utility_class:'useful_negative',temporal_status:'observed',
      evidence_span:{source_ref:e.source_refs[0],start:0,end:e.excerpt.length}}]}),
    duration_ms:1}),
   factReview:true,factReviewModelCall:async()=>{throw Error('review unavailable');},
   maxClusters:2,maxSeconds:10});
  assert.equal(result.persisted,0);
  assert.equal(result.model_errors,1);
  assert.equal((await store.list({limit:20})).items[0].state,'deferred');
 }finally{
  if(prior===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=prior;
 }
}));

test('two-stage development discovery enumerates source-specific candidates before utility judgment',()=>{
 const c=selectClusters([source()])[0];
 const msg=factDiscoveryPrompt(c);
 assert.equal(msg.length,2);
 assert.match(msg[0].content,/SOURCE-FIRST candidate discovery/);
 assert.match(msg[0].content,/Do not perform final utility\/novelty gatekeeping/);
 assert.match(msg[0].content,/substantive technical observation amid test results/);
 assert.equal(JSON.parse(msg[1].content).evidence[0].source,c.events[0].source_refs[0]);
});
test('optional worker passes the genuine discovery prompt, not the old SKIP-heavy prompt',()=>scratch(async root=>{
 const prior=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const e=source(),queue=new CandidateQueue(root,scope.group),
   store=new ReviewStore(root,scope.group);
  await queue.stage(e);
  let firstPrompt=null;
  const graphiti={call:async(method)=>{
   if(method==='get_episodes')return {episodes:[]};
   if(method==='search_memory_facts')return {facts:[]};
   if(method==='add_memory')throw Error('unexpected write');
  }};
  await runAdmitted({root,group:scope.group,queue,store,graphiti,
   curate:async(_cluster,options)=>{
     firstPrompt=options.promptMessages;
     return {content:JSON.stringify({decision:'SKIP',utility_class:'transient_result',
       reason:'No source-specific technical claim extracted',facts:[]}),
       duration_ms:1};
   },factReview:true,maxSeconds:10,maxClusters:2});
  assert.ok(firstPrompt);
  assert.match(firstPrompt[0].content,/SOURCE-FIRST candidate discovery/);
 }finally{
  if(prior===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=prior;
 }
}));
