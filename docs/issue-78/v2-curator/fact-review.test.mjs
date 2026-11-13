import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fromPrompt} from '../v2-candidate/events.mjs';
import {CandidateQueue} from '../v2-candidate/queue.mjs';
import {selectClusters,validateModelDecision,ReviewStore} from './core.mjs';
import {factDiscoveryPrompt,validateFactDiscovery,
 factReviewPrompt,validateFactReview,filterFactProposal,
 sourceAtomicityStructuralRisk,
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
  reason_code:'source_specific_durable',utility_class:'useful_negative'}]});
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
 assert.match(msgs[0].content,/source_excerpt|exact quoted assertion|exact quoted/i);
 assert.match(msgs[0].content,/REVIEW/);
});
test('screen verdict cannot self-authorize unknown indices, reasons or conflicting decisions',()=>{
 const c=selectClusters([source()])[0],p=proposal(c);
 assert.equal(validateFactReview(accepted,p).ok,true);
 for(const raw of [
  {decisions:[{index:1,disposition:'ACCEPT',reason_code:'source_specific_durable',
    utility_class:'useful_negative'}]},
  {decisions:[{index:0,disposition:'ACCEPT',reason_code:'invented_reason',
    utility_class:'useful_negative'}]},
  {decisions:[{index:0,disposition:'REJECT',reason_code:'source_specific_durable',
    utility_class:'useful_negative'}]},
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
    curate:async()=>({content:JSON.stringify({reason:'Source-backed potential',
      candidates:[{kind:'blocker',source_ref:e.source_refs[0],
        temporal_status:'observed',start:0,end:e.excerpt.length}]}),
      duration_ms:1}),
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
   curate:async()=>({content:JSON.stringify({reason:'Source-backed potential',
    candidates:[{kind:'blocker',source_ref:e.source_refs[0],
      temporal_status:'observed',start:0,end:e.excerpt.length}]}),duration_ms:1}),
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
     return {content:JSON.stringify({reason:'No source-specific technical claim',
       candidates:[]}),
       duration_ms:1};
   },factReview:true,maxSeconds:10,maxClusters:2});
  assert.ok(firstPrompt);
  assert.match(firstPrompt[0].content,/SOURCE-FIRST candidate discovery/);
 }finally{
  if(prior===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=prior;
 }
}));

test('discovery proposal requires only exact original source evidence, not a first-pass utility label',()=>{
 const c=selectClusters([source()])[0],e=c.events[0];
 const p=validateFactDiscovery(JSON.stringify({reason:'Potential source issue',
   candidates:[{source_ref:e.source_refs[0],start:0,end:e.excerpt.length,
     kind:'blocker',temporal_status:'observed'}]}),c);
 assert.equal(p.ok,true);
 assert.equal(p.decision,'EMIT');
 assert.equal(p.facts[0].assertion,e.excerpt);
 const invalid=validateFactDiscovery({reason:'Unattributed',
   candidates:[{source_ref:'opencode:invented',start:0,end:75,
     kind:'blocker',temporal_status:'observed'}]},c);
 assert.equal(invalid.ok,false);
 const empty=validateFactDiscovery({reason:'No source fact',candidates:[]},c);
 assert.equal(empty.decision,'SKIP');
 const msg=factDiscoveryPrompt(c);
 assert.doesNotMatch(msg[0].content,/return EMIT with durable utility_class/);
});
test('discovery preserves validated source offsets, including bounded EOF correction',()=>{
 const c=selectClusters([source()])[0],e=c.events[0];
 const ref=e.source_refs[0],boundary=65;
 assert.ok(e.excerpt.length>boundary+25);
 const p=validateFactDiscovery({
  reason:'Two independently source-cited portions',
  candidates:[
   {kind:'blocker',source_ref:ref,start:0,end:boundary,temporal_status:'observed'},
   {kind:'blocker',source_ref:ref,start:boundary,
    end:e.excerpt.length+8,temporal_status:'observed'}
  ]
 },c);
 assert.equal(p.ok,true);
 assert.equal(p.facts.length,2);
 assert.deepEqual(p.facts.map(f=>f.evidence_span),[
  {source_ref:ref,start:0,end:boundary},
  {source_ref:ref,start:boundary,end:e.excerpt.length}
 ]);
 assert.equal(p.facts[0].assertion,e.excerpt.slice(0,boundary).trim());
 assert.equal(p.facts[1].assertion,e.excerpt.slice(boundary).trim());
 assert.equal(p.source_span_adjustments.length,1);
 assert.equal(p.source_span_adjustments[0].authorized_end,e.excerpt.length);
 for(const f of p.facts){
  assert.equal(Object.isFrozen(f),true);
  assert.equal(Object.isFrozen(f.evidence_span),true);
 }
 const invalid=validateFactDiscovery({
  reason:'Outside authenticated source',
  candidates:[{kind:'blocker',source_ref:'unknown:source',
   start:0,end:boundary,temporal_status:'observed'}]
 },c);
 assert.equal(invalid.ok,false);
 assert.deepEqual(invalid.facts,[]);
});
test('S3 isolated discovery keeps valid source facts and blocks invalid siblings',()=>{
 const c=selectClusters([source()])[0],e=c.events[0],ref=e.source_refs[0];
 const candidates=[
  {kind:'blocker',source_ref:ref,start:0,end:e.excerpt.length,temporal_status:'observed'},
  {kind:'invented_kind',source_ref:ref,start:0,end:e.excerpt.length,temporal_status:'observed'},
  {kind:'blocker',source_ref:'opencode:forged',start:0,end:e.excerpt.length,temporal_status:'observed'}
 ];
 const legacy=validateFactDiscovery({reason:'mixed source',candidates},c);
 assert.equal(legacy.ok,false);
 const isolated=validateFactDiscovery({reason:'mixed source',candidates},c,
  {isolateCandidates:true});
 assert.equal(isolated.ok,true);
 assert.equal(isolated.facts.length,1);
 assert.equal(isolated.facts[0].assertion,e.excerpt);
 assert.deepEqual(isolated.facts[0].evidence_span,
  {source_ref:ref,start:0,end:e.excerpt.length});
 assert.deepEqual(isolated.invalid_candidates.map(x=>[x.index,x.reason]),
  [[1,'invalid_fact_fields'],[2,'unattributed_or_weak_source']]);
 assert.equal(Object.isFrozen(isolated.facts[0]),true);
 assert.equal(Object.isFrozen(isolated.facts[0].evidence_span),true);
 const invalidOnly=validateFactDiscovery({reason:'forged',
  candidates:candidates.slice(2)},c,{isolateCandidates:true});
 assert.equal(invalidOnly.ok,false);
 assert.equal(invalidOnly.reason,'unattributed_or_weak_source');
 assert.deepEqual(invalidOnly.facts,[]);
});
test('second-stage durable utility cannot be fabricated or omitted by reviewer',()=>{
 const p=proposal(selectClusters([source()])[0]);
 const invalid=validateFactReview({decisions:[{index:0,disposition:'ACCEPT',
   reason_code:'source_specific_durable'}]},p);
 assert.equal(invalid.ok,false);
 assert.equal(invalid.reason,'invalid_durable_utility');
 const valid=validateFactReview({decisions:[{index:0,disposition:'ACCEPT',
   reason_code:'source_specific_durable',utility_class:'stable_architecture'}]},p);
 assert.equal(valid.ok,true);
 assert.equal(filterFactProposal(p,valid).fact_utilities[0],'stable_architecture');
});

test('independent mixed review keeps a supported fact and routes boilerplate to review without cross-fact veto',()=>{
 const c=selectClusters([source()])[0];
 const p={ok:true,decision:'EMIT',utility_class:'durable_decision',
  reason:'Two tentative source claims from same cluster',
  facts:[
   {assertion:'The CLI option --verbose requires an argument in the installed Pylint version.',
    source_refs:[c.events[0].source_refs[0]],kind:'blocker',
    temporal_status:'observed',evidence_class:'user-stated'},
   {assertion:'The installed Pylint version has a command-line option.',
    source_refs:[c.events[0].source_refs[0]],kind:'observation',
    temporal_status:'observed',evidence_class:'user-stated'}
  ],fact_utilities:['durable_decision','durable_decision']};
 const raw={decisions:[
  {index:0,disposition:'ACCEPT',reason_code:'source_specific_durable',
   utility_class:'useful_negative'},
  {index:1,disposition:'REVIEW',reason_code:'not_substantive'}
 ]};
 const screen=validateFactReview(raw,p);
 assert.equal(screen.ok,true);
 const out=filterFactProposal(p,screen);
 assert.equal(out.ok,true);
 assert.equal(out.facts.length,1);
 assert.equal(out.facts[0].assertion,p.facts[0].assertion);
 assert.equal(out.fact_utilities[0],'useful_negative');
 assert.equal(out.review_only_claims.length,1);
 assert.equal(out.review_only_claims[0].screen_reason,'not_substantive');
});


test('D2 long narrative commentary cannot veto a valid source candidate',()=>{
 const c=selectClusters([source()])[0],e=c.events[0];
 const a=validateFactDiscovery({
  reason:'narrative '.repeat(100),
  candidates:[{source_ref:e.source_refs[0],start:0,end:e.excerpt.length,
    kind:'blocker',temporal_status:'observed'}]
 },c);
 assert.equal(a.ok,true);
 assert.equal(a.facts[0].assertion,e.excerpt);
 const empty=validateFactDiscovery({reason:'x'.repeat(1000),candidates:[]},c);
 assert.equal(empty.ok,true);
 assert.equal(empty.decision,'SKIP');
});
test('only a narrowly bounded EOF overshoot can be source-adjusted, preserving the authentic start',()=>{
 const c=selectClusters([source()])[0],e=c.events[0];
 const req=(end,start=0,ref=e.source_refs[0])=>validateFactDiscovery({
  reason:'Possible native technical constraint',
  candidates:[{source_ref:ref,start,end,kind:'blocker',temporal_status:'observed'}]
 },c);
 const repaired=req(e.excerpt.length+28);
 assert.equal(repaired.ok,true);
 assert.equal(repaired.facts[0].assertion,e.excerpt);
 assert.deepEqual(repaired.source_span_adjustments,[{
  index:0,source_ref:e.source_refs[0],requested_end:e.excerpt.length+28,
  authorized_end:e.excerpt.length,reason:'bounded_eof_offset_adjustment'
 }]);
 assert.equal(req(e.excerpt.length+33).ok,false);
 assert.equal(req(e.excerpt.length+28,-1).ok,false);
 assert.equal(req(e.excerpt.length+28,0,'opencode:untrusted-forged-ref').ok,false);
 assert.equal(req(e.excerpt.length+28,e.excerpt.length-3).ok,false);
});
test('independent reviewer is explicitly asked to credit a specific source-stated defect without promoting generic headings',()=>{
 const c=selectClusters([source()])[0],p=proposal(c);
 const system=factReviewPrompt(c,p)[0].content;
 assert.match(system,/REPORTED defect/);
 assert.match(system,/technically specific issue\/bug title CAN convey a claim/);
 assert.match(system,/REVIEW with repetition_candidate/);
 assert.match(system,/REVIEW with not_substantive only/);
 assert.match(system,/itself must support/);
});

test('atomic source review explicitly separates distinct claims while retaining conditional rules',()=>{
 const c=selectClusters([source()])[0],p=proposal(c);
 const messages=factReviewPrompt(c,p);
 assert.match(messages[0].content,/ONE atomic technical predicate/);
 assert.match(messages[0].content,/bundles separate installation/);
 assert.match(messages[0].content,/condition and its direct consequence/);
 const ambiguous=validateFactReview({decisions:[{index:0,
  disposition:'REVIEW',reason_code:'review_uncertain'}]},p);
 assert.equal(ambiguous.ok,true);
 const deferred=filterFactProposal(p,ambiguous);
 assert.equal(deferred.decision,'DEFER');
 assert.equal(deferred.review_only_claims[0].screen_reason,'review_uncertain');
});

test('atomicity certification is explicit, quote-hash-bound and defers independent bundles',()=>{
 const c=selectClusters([source()])[0],p=proposal(c);
 const missing=validateFactReview(accepted,p,{requireAtomicity:true});
 assert.equal(missing.ok,true);
 assert.equal(filterFactProposal(p,missing).decision,'DEFER');
 assert.equal(filterFactProposal(p,missing).review_only_claims[0].screen_reason,
  'atomicity_not_proven');
 const bundled=validateFactReview({decisions:[{index:0,disposition:'ACCEPT',
  reason_code:'source_specific_durable',utility_class:'useful_negative',
  atomicity:{independent_predicates:2,
   rationale:'The version statement and separate tool advice are unrelated'}}]},p,
  {requireAtomicity:true});
 assert.equal(filterFactProposal(p,bundled).decision,'DEFER');
 assert.equal(filterFactProposal(p,bundled).review_only_claims[0].screen_reason,
  'multiple_independent_predicates');
 const single=validateFactReview({decisions:[{index:0,disposition:'ACCEPT',
  reason_code:'source_specific_durable',utility_class:'useful_negative',
  atomicity:{independent_predicates:1,
   rationale:'The complete statement reports one CLI compatibility constraint'}}]},p,
  {requireAtomicity:true});
 assert.equal(single.ok,true);
 assert.equal(single.accepted.length,1);
 const kept=filterFactProposal(p,single);
 assert.equal(kept.decision,'EMIT');
 assert.equal(kept.fact_atomicity_reviews.length,1);
 assert.match(kept.fact_atomicity_reviews[0].assertion_sha256,/^[a-f0-9]{64}$/);
});

test('structural atomicity veto rejects a model false-ONE on authentic two-predicate source',()=>{
 const mixed='tdarr server/node are v3, use Context7 and Firecrawl MCP server tools for researching external APIs.';
 const e=fromPrompt({sessionID:'ses-atomic-source',messageID:'msg-atomic-source',
  prompt:{text:mixed},timestamp:'2026-11-13T19:00:00Z'},scope,{admitted:true});
 assert.ok(e);
 const cluster=selectClusters([e])[0],ref=e.source_refs[0];
 const p=validateModelDecision({decision:'EMIT',utility_class:'reusable_procedure',
  reason:'A possibly useful developer fact',
  facts:[{kind:'observation',source_refs:[ref],temporal_status:'observed',
   evidence_span:{source_ref:ref,start:0,end:e.excerpt.length}}]},cluster);
 assert.equal(p.ok,true);
 assert.equal(p.facts[0].assertion,mixed);
 assert.equal(sourceAtomicityStructuralRisk(mixed),'independent_clause_boundary');
 const apparentlyAcceptable={decisions:[{index:0,disposition:'ACCEPT',
  reason_code:'source_specific_durable',utility_class:'reusable_procedure',
  atomicity:{independent_predicates:1,
   rationale:'The quoted source seems to express just one unified procedure'}}]};
 const screen=validateFactReview(apparentlyAcceptable,p,{requireAtomicity:true});
 assert.equal(screen.ok,true);
 assert.equal(screen.accepted.length,0);
 const rejected=filterFactProposal(p,screen);
 assert.equal(rejected.decision,'DEFER');
 assert.equal(rejected.review_only_claims[0].screen_reason,
  'source_structural_independent_clause_boundary');
 // Historical non-opt-in receipts remain readable under their original
 // validator policy, but cannot be treated as structurally reviewed.
 assert.equal(validateFactReview(apparentlyAcceptable,p).accepted.length,1);
});
test('structural review accepts coherent conditional and historical architecture statements',()=>{
 const atomic=[
  'When the commit gate shows queue_empty, operator commands may be run.',
  'The installed dovi-tool and libdovi packages use the configured host versions.',
  'The original state map lived in a states.json file and the transition function read it at startup.',
  'The OpenViking API key was removed with pending sessions drained.'
 ];
 for(const quote of atomic)assert.equal(sourceAtomicityStructuralRisk(quote),null,quote);
 const bundled=[
  'Tdarr server and node use version three, and consult Context7 and Firecrawl for development research.',
  'The Tdarr server is version three; the Graphiti database is on a separate host.',
  'The API service is installed and the downstream proxy is configured for a new endpoint.'
 ];
 for(const quote of bundled)assert.equal(sourceAtomicityStructuralRisk(quote),
  'independent_clause_boundary',quote);
});

test('V2 word-boundary repair uses only original source characters before model review',()=>{
 const original='The adapter requires a compatible endpoint for future maintenance.';
 const sourceEvent=fromPrompt({sessionID:'v2word1',messageID:'v2word2',
  prompt:{text:original},timestamp:'2026-11-13T19:00:00Z'},scope,{admitted:true});
 const cluster=selectClusters([sourceEvent])[0],ref=cluster.events[0].source_refs[0];
 const start=original.indexOf('adapter')+2,end=original.indexOf('compatible')+4;
 const input={reason:'One exact original source statement',candidates:[{
  source_ref:ref,start,end,kind:'blocker',temporal_status:'observed'}]};
 const old=validateFactDiscovery(input,cluster,{isolateCandidates:true});
 const fixed=validateFactDiscovery(input,cluster,
  {isolateCandidates:true,repairWordBoundaries:true});
 assert.equal(old.ok,false); // Invalid clipped quote was already rejected by legacy validation.
 assert.equal(fixed.facts[0].assertion,
  original.slice(original.indexOf('adapter'),
   original.indexOf('compatible')+'compatible'.length));
 assert.equal(fixed.source_span_adjustments.length,1);
 assert.equal(fixed.source_span_adjustments[0].reason,'bounded_word_boundary_expansion');
});
test('V2 rejects a clipped source word requiring expansion beyond the fixed bound',()=>{
 const original='A'.repeat(80)+' configured endpoint is required for compatibility.';
 const event=fromPrompt({sessionID:'v2word3',messageID:'v2word4',
  prompt:{text:original},timestamp:'2026-11-13T19:00:00Z'},scope,{admitted:true});
 const cluster=selectClusters([event])[0];
 const input={reason:'clipped source',candidates:[{
  source_ref:cluster.events[0].source_refs[0],start:39,end:100,
  kind:'blocker',temporal_status:'observed'}]};
 const fixed=validateFactDiscovery(input,cluster,
  {isolateCandidates:true,repairWordBoundaries:true});
 assert.equal(fixed.ok,false);assert.deepEqual(fixed.facts,[]);
});
