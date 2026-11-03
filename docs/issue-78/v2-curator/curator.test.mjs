import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fromPrompt, fromTool, fromFinishedTurn } from '../v2-candidate/events.mjs';
import { CandidateQueue } from '../v2-candidate/queue.mjs';
import { selectClusters, modelPrompt, validateDecision, validateModelDecision, ReviewStore } from './core.mjs';
import { promoteOne, reconcile, runAdmitted, positiveEpisode } from './worker.mjs';
import { curateCluster } from './model.mjs';
import { sourcedEpisodeResolver } from './sourced-recall.mjs';
import { Journal, Memory } from '../../issue-75/v2-candidate/memory-core.mjs';

const scope={group:'stage80',workspace:'/workspace/gh_mcp',project:'gh_mcp'};
const t='2026-11-03T18:00:00.000Z';
const U=fromPrompt({sessionID:'ses_80',messageID:'msg_1',prompt:{
  text:'Fix the invalid median algorithm, retain the old CLI interface and prove the node tests pass.'
},timestamp:t},scope,{admitted:true});
const T=fromTool({sessionID:'ses_80',callID:'call_1',status:'completed',
  input:{command:'node --test median.test.mjs'},
  result:{output:{exit:1,output:'1 test failed due to median invalid result'}},
  timestamp:t},scope);
const A=fromFinishedTurn({sessionID:'ses_80',messageID:'msg_2',
  role:'assistant',status:'completed',
  text:'The median algorithm had an off by one error; after fixing the middle index the tests now pass.',
  timestamp:t},scope);
const cluster=()=>selectClusters([U,T,A])[0];
const fact=(event,overrides={})=>({
  assertion:'Fix the invalid median algorithm and retain the CLI interface.',
  kind:'decision',source_refs:[event.source_refs[0]],
  evidence_class:event.evidence_class,
  scope:{group:scope.group,project:scope.project,workspace:scope.workspace},
  observed_at:event.observed_at,temporal_status:'observed',...overrides
});
const proposal=(event,decision='EMIT')=>({decision,reason:'Source-backed reusable decision',
  facts:decision==='EMIT'?[fact(event)]:[]});
const temp=fn=> (async()=>{const root=await mkdtemp(path.join(os.tmpdir(),'curator80-'));
  try{return await fn(root);}finally{await rm(root,{recursive:true,force:true});}})();

test('bounded event clustering, original source identities, untrusted prompt separation',()=>{
  const c=cluster();assert.equal(c.events.length,3);assert.equal(c.session_id,'ses_80');
  assert.equal(c.source_event_ids.length,3);assert.equal(c.group,scope.group);
  const messages=modelPrompt(c);
  assert.equal(messages.length,2);assert.match(messages[0].content,/UNTRUSTED DATA/);
  assert.ok(messages[1].content.includes(U.source_refs[0]));
  assert.equal(selectClusters([{...U,state:'skipped'}]).length,0);
});
test('strict structured validator accepts grounded class and rejects all authority inflation',()=>{
 const c=cluster();
 const ok=validateDecision(proposal(U),c);assert.equal(ok.ok,true);
 for(const altered of [
  {evidence_class:'verified'}, {evidence_class:'tool-reported'},
  {source_refs:['opencode:ses_80:message:forged']},
  {observed_at:'2022-01-01T00:00:00Z'},
  {scope:{...scope,group:'other'}},
  {assertion:'Password=secret123 must be kept to support the service.'},
  {assertion:'An entirely unsupported astronomical theorem about Martian microbes was proven.'}
 ]){
  const value=validateDecision({decision:'EMIT',reason:'Source-backed statement',
    facts:[fact(U,altered)]},c);
  assert.equal(value.ok,false,JSON.stringify(altered));
  assert.equal(value.decision,'DEFER');
 }
 assert.equal(validateDecision('{bad',c).decision,'DEFER');
 assert.equal(validateDecision({decision:'EMIT',reason:'hello',facts:[]},c).ok,false);
 assert.equal(validateDecision({decision:'SKIP',reason:'Chatter',facts:[fact(U)]},c).ok,false);
 const weak={...U,source_strength:'session-scoped-fallback'};
 assert.equal(validateDecision(proposal(weak),{...c,events:[weak]}).ok,false);
});
test('model field binding uses original authenticated source data, not guessed metadata',()=>{
 const c=cluster(),f=fact(U),minimal={decision:'EMIT',reason:'Grounded decision',
   facts:[{assertion:f.assertion,kind:'decision',source_refs:f.source_refs,temporal_status:'observed'}]};
 const result=validateModelDecision(JSON.stringify(minimal),c);
 assert.equal(result.ok,true);
 assert.deepEqual(result.facts[0].scope,f.scope);
 assert.equal(result.facts[0].observed_at,U.observed_at);
 assert.equal(result.facts[0].evidence_class,'user-stated');
 const exact=validateDecision(minimal,c);
 assert.equal(exact.ok,false);
 assert.equal(exact.reason,'invalid_fact_fields');
 assert.equal(exact.diagnostic_field,'evidence_class');
 for(const altered of [
   {scope:{...scope,group:'wrong'}},
   {evidence_class:'verified'},
   {observed_at:'2000-01-01T00:00:00Z'},
   {source_refs:['opencode:ses_80:message:fake']}
 ]){
   const bad=validateModelDecision({...minimal,facts:[{...minimal.facts[0],...altered}]},c);
   assert.equal(bad.ok,false,JSON.stringify(altered));
 }
 assert.match(modelPrompt(c)[0].content,/LATEST referenced event timestamp/);
 assert.match(modelPrompt(c)[0].content,/SOURCE strings/);
});
test('valid multi-event factual assertion uses latest referenced source observation time',()=>{
 const c=cluster();
 const f=fact(U,{source_refs:[U.source_refs[0],T.source_refs[0]]});
 const supportsDifferentClasses=validateModelDecision({decision:'EMIT',
   reason:'Needs one source authority',facts:[f]},c);
 assert.equal(supportsDifferentClasses.ok,false);
 const newer={...U,source_refs:['opencode:ses_80:message:msg_later'],
   event_id:'a'.repeat(64),observed_at:'2026-11-03T18:03:00.000Z'};
 const oneClass={...c,events:[U,newer]};
 const result=validateModelDecision({decision:'EMIT',reason:'Two related observations',
   facts:[{assertion:f.assertion,kind:'decision',
     source_refs:[U.source_refs[0],newer.source_refs[0]],temporal_status:'observed'}]},oneClass);
 assert.equal(result.ok,true);
 assert.equal(result.facts[0].observed_at,newer.observed_at);
});
test('review store durable create/dedup, safe operator revisions and blocked unverified approval',()=>temp(async root=>{
 const store=new ReviewStore(root,scope.group),c=cluster();
 const first=await store.create(c,proposal(U));assert.equal(first.created,true);
 assert.equal(first.record.state,'approved');
 const second=await store.create(c,proposal(U));assert.equal(second.created,false);
 await assert.rejects(store.change(c.id,10,'discard',{reason:'No longer useful'}),/STALE/);
 const deferred=await store.change(c.id,1,'defer',{reason:'More evidence needed'});
 assert.equal(deferred.state,'deferred');assert.equal(deferred.revision,2);
 await assert.rejects(store.change(c.id,2,'approve',{facts:[fact(U,{evidence_class:'verified'})]}),
  /INVALID_APPROVAL/);
 const accepted=await store.change(c.id,2,'edit-and-approve',{reason:'Exact source checked',facts:[fact(U)]});
 assert.equal(accepted.state,'approved');
 assert.equal((await store.list()).items[0].revision,3);
 assert.equal(await store.advance(c.id,'approved','submission_unknown'),true);
 await assert.rejects(store.change(c.id,4,'discard',{reason:'undo'}),/REMOTE_WRITE_ALREADY_POSSIBLE/);
 const restarted=new ReviewStore(root,scope.group);
 assert.equal((await restarted.get(c.id)).state,'submission_unknown');
 assert.equal((await restarted.get(c.id)).audit.length,4);
}));
test('Graphiti write intent first; unknown submission cannot replay',()=>temp(async root=>{
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const store=new ReviewStore(root,scope.group),c=cluster();
  await store.create(c,proposal(U));
  const graphiti={call:async method=>{
    if(method==='search_memory_facts')return {facts:[]};
    if(method==='add_memory')throw Error('ACK lost after send');
    return {episodes:[]};
  }};
  assert.equal((await promoteOne(store,await store.get(c.id),graphiti)).status,'submission_unknown');
  assert.equal((await store.get(c.id)).state,'submission_unknown');
  assert.equal((await promoteOne(store,await store.get(c.id),graphiti)).status,'not_approved');
  const res=await reconcile(store,graphiti);
  assert.deepEqual(res,{persisted:0,unresolved:1});
 }finally{delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;}
}));
test('successful ACK is QUEUED, positive exact group+name episode readback persists',()=>temp(async root=>{
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const store=new ReviewStore(root,scope.group),c=cluster();
  await store.create(c,proposal(U));
  let calls=0;
  const uuid='87654321-1111-4111-a111-222222222222';
  const graphiti={call:async (method,arg)=>{
    if(method==='search_memory_facts')return {facts:[]};
    if(method==='add_memory'){calls++;assert.equal(arg.group_id,scope.group);return {ok:true};}
    if(method==='get_episodes')return {episodes:[
      {uuid,group_id:'other',name:'curated-v1:'+c.id}]};
    throw Error('unexpected '+method);
  }};
  assert.equal((await promoteOne(store,await store.get(c.id),graphiti)).status,'queued');
  assert.equal((await store.get(c.id)).remote_episode_uuid,null);
  assert.deepEqual(await reconcile(store,graphiti),{persisted:0,unresolved:1});
  graphiti.call=async (method,arg)=>{
    if(method==='get_episodes')return {episodes:[{uuid,group_id:scope.group,name:'curated-v1:'+c.id}]};
    throw Error('unsupported');
  };
  assert.deepEqual(await reconcile(store,graphiti),{persisted:1,unresolved:0});
  assert.equal((await store.get(c.id)).remote_episode_uuid,uuid);
  assert.equal((await store.get(c.id)).state,'persisted');
  assert.equal(calls,1);
  assert.equal(positiveEpisode(await store.get(c.id),[{uuid,group_id:'other',name:'curated-v1:'+c.id}]),null);
 }finally{delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;}
}));
test('duplicate assertion diverts approved candidate to deferred with no write',()=>temp(async root=>{
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const store=new ReviewStore(root,scope.group),c=cluster();
  await store.create(c,proposal(U));
  let writes=0;
  const graphiti={call:async (method)=>{
    if(method==='search_memory_facts')return {facts:[{fact:fact(U).assertion,group_id:scope.group}]};
    if(method==='add_memory'){writes++;return {};}
  }};
  assert.equal((await promoteOne(store,await store.get(c.id),graphiti)).status,'deferred');
  assert.equal((await store.get(c.id)).state,'deferred');
  assert.equal(writes,0);
 }finally{delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;}
}));
test('no model or graph work without admitted post-exit lease',()=>temp(async root=>{
 delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 await assert.rejects(runAdmitted({root,group:scope.group}),/ADMISSION_REQUIRED/);
 await assert.rejects(curateCluster(cluster(),{endpoint:'http://127.0.0.1:8001/v1/chat/completions',
   model:'local'}),/ADMISSION_REQUIRED/);
}));
test('one admitted model cluster emits exactly one source-linked Graphiti episode',()=>temp(async root=>{
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const q=new CandidateQueue(root,scope.group),store=new ReviewStore(root,scope.group);
  for(const e of [U,T,A])assert.equal((await q.stage(e)).status,'staged');
  const id=cluster().id,uuid='87654321-1111-4111-a111-222222222222';
  let writes=0,submitted=false;
  const graphiti={call:async (method,args)=>{
    if(method==='search_memory_facts')return {facts:[]};
    if(method==='add_memory'){
      writes++;submitted=true;
      assert.equal(args.group_id,scope.group);
      assert.match(args.episode_body,/Source references:/);
      assert.match(args.name,/curated-v1:/);
      return {ack:true};
    }
    if(method==='get_episodes')return {episodes:submitted?[
      {uuid,group_id:scope.group,name:'curated-v1:'+id}]:[]};
    throw Error('unexpected call '+method);
  }};
  const result=await runAdmitted({root,group:scope.group,queue:q,store,graphiti,
    curate:async()=>({content:JSON.stringify(proposal(U)),duration_ms:25}),maxSeconds:20});
  assert.equal(result.status,'settled');
  assert.equal(result.persisted,1);
  assert.equal(writes,1);
  assert.equal((await store.get(id)).state,'persisted');
  assert.equal((await store.get(id)).remote_episode_uuid,uuid);
 }finally{delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;}
}));
test('operator-requested re-evaluation is processed by admitted worker',()=>temp(async root=>{
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const store=new ReviewStore(root,scope.group),q=new CandidateQueue(root,scope.group),c=cluster();
  const initial=await store.create(c,{decision:'DEFER',reason:'Needs review',facts:[]});
  assert.equal(initial.record.state,'deferred');
  const requested=await store.change(c.id,1,'reevaluate',{reason:'New context'});
  assert.equal(requested.reevaluate_requested,true);
  const graphiti={call:async method=>{
    if(method==='search_memory_facts')return {facts:[{fact:fact(U).assertion,group_id:scope.group}]};
    return {episodes:[]};
  }};
  const result=await runAdmitted({root,group:scope.group,queue:q,store,graphiti,
    curate:async()=>({content:JSON.stringify(proposal(U)),duration_ms:20}),maxSeconds:20});
  assert.equal(result.curated,1);
  assert.equal((await store.get(c.id)).reevaluate_requested,false);
  assert.equal((await store.get(c.id)).state,'deferred');
  assert.match((await store.get(c.id)).reason,/DUPLICATE/);
 }finally{delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;}
}));
test('persisted curated episode becomes source-attributed in accepted native recall; wrong workspace excluded',()=>temp(async root=>{
 const store=new ReviewStore(root,scope.group),c=cluster(),uuid='87654321-1111-4111-a111-222222222222';
 await store.create(c,proposal(U));
 await store.advance(c.id,'approved','submission_unknown');
 await store.advance(c.id,'submission_unknown','queued');
 assert.deepEqual(await sourcedEpisodeResolver(root,scope.group,scope.workspace,scope.project,[uuid]),[]);
 await store.advance(c.id,'queued','persisted',{remote_episode_uuid:uuid});
 const mappings=await sourcedEpisodeResolver(root,scope.group,scope.workspace,scope.project,[uuid]);
 assert.equal(mappings.length,1);
 assert.equal(mappings[0].sourceRef,U.source_refs[0]);
 assert.equal(mappings[0].evidenceClass,'user-stated');
 assert.deepEqual(await sourcedEpisodeResolver(root,scope.group,'/workspace/other',scope.project,[uuid]),[]);
 const graphiti={call:async name=>{
   if(name==='search_memory_facts')return {facts:[{fact:fact(U).assertion,group_id:scope.group,episodes:[uuid]}]};
   throw Error('Unwanted graph write/read '+name);
 }};
 const memory=new Memory({journal:new Journal(root,scope.group),graphiti,group:scope.group,
   extraSourceResolver:ids=>sourcedEpisodeResolver(root,scope.group,scope.workspace,scope.project,ids)});
 const recalled=await memory.search('Why did we fix the invalid median algorithm and retain the CLI interface?');
 assert.ok(recalled.length>0);
 assert.equal(recalled[0].source,U.source_refs[0]);
 assert.equal(recalled[0].evidenceClass,'user-stated');
 const legacyOnly=new Memory({journal:new Journal(root,scope.group),graphiti,group:scope.group});
 assert.deepEqual(await legacyOnly.search('Why did we fix the invalid median algorithm and retain the CLI interface?'),[]);
}));
test('multi-fact mixed-episode promotion stays deferred rather than inflating a source class',()=>temp(async root=>{
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const store=new ReviewStore(root,scope.group),c=cluster();
  const two={decision:'EMIT',reason:'Two candidate statements',
    facts:[fact(U),fact(A,{assertion:'The median algorithm had an off by one error and the tests now pass.',
      kind:'implementation'})]};
  const stored=await store.create(c,two);
  assert.equal(stored.record.state,'approved');
  const graphiti={call:async name=>{if(name==='add_memory')throw Error('unexpected write');
    return {facts:[]};}};
  const result=await promoteOne(store,stored.record,graphiti);
  assert.equal(result.status,'deferred');
  assert.equal((await store.get(c.id)).reason,'multi_fact_requires_split');
 }finally{delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;}
}));
test('unavailable model yields durable DEFER without losing candidate, no Graphiti write',()=>temp(async root=>{
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const q=new CandidateQueue(root,scope.group),store=new ReviewStore(root,scope.group);
  for(const event of [U,T,A])assert.equal((await q.stage(event)).status,'staged');
  const graphiti={call:async method=>{
    if(method==='add_memory')throw Error('unapproved write');
    if(method==='get_episodes')return {episodes:[]};
    return {facts:[]};
  }};
  const result=await runAdmitted({root,group:scope.group,queue:q,store,graphiti,
    curate:async()=>{throw Error('provider unavailable')},maxSeconds:20});
  assert.equal(result.deferred,1);
  assert.equal((await store.list()).items[0].state,'deferred');
  assert.equal((await q.status()).counts.deferred,3);
 }finally{delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;}
}));
