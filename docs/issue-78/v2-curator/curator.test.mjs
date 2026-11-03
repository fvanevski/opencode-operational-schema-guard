import test from 'node:test';
import { spawnSync } from 'node:child_process';
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
// Model-generated assertions must be exact source excerpts; operator edits can
// use paraphrases under their distinct revision-checked approval contract.
const modelProposal=(event=U)=>({decision:'EMIT',reason:'Exact source-backed decision',
  facts:[{assertion:event.excerpt,kind:'decision',
    source_refs:[event.source_refs[0]],temporal_status:'observed'}]});
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
   facts:[{assertion:U.excerpt,kind:'decision',source_refs:f.source_refs,temporal_status:'observed'}]};
 const result=validateModelDecision(JSON.stringify(minimal),c);
 assert.equal(result.ok,true);
 assert.deepEqual(result.facts[0].scope,f.scope);
 assert.equal(result.facts[0].observed_at,U.observed_at);
 assert.equal(result.facts[0].evidence_class,'user-stated');
 const exact=validateDecision(minimal,c);
 assert.equal(exact.ok,false);
 assert.equal(exact.reason,'invalid_fact_fields');
 assert.equal(exact.diagnostic_field,'evidence_class');
 assert.equal(validateModelDecision({...minimal,facts:[{...minimal.facts[0],kind:'file_change'}]},c).diagnostic_field,'kind');
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
 assert.match(modelPrompt(c)[0].content,/CONTIGUOUS VERBATIM EXTRACT/);
});
test('model curation rejects paraphrases and fabricated extensions despite lexical similarity',()=>{
 const c=cluster(),raw=modelProposal();
 assert.equal(validateModelDecision(raw,c).ok,true);
 const paraphrase=fact(U).assertion;
 // Manual-review plausibility differs from the stricter model automation.
 assert.equal(validateDecision({decision:'EMIT',reason:'Manual review only',
   facts:[fact(U)]},c).ok,true);
 const rejection=validateModelDecision({...raw,facts:[{...raw.facts[0],assertion:paraphrase}]},c);
 assert.equal(rejection.ok,false);
 assert.equal(rejection.reason,'model_assertion_not_source_extract');
 const fabricated={...raw,facts:[{...raw.facts[0],
   assertion:U.excerpt+' This proves all future tests pass.'}]};
 assert.equal(validateModelDecision(fabricated,c).ok,false);
 const combined={...raw,facts:[{...raw.facts[0],
   source_refs:[U.source_refs[0],T.source_refs[0]]}]};
 assert.equal(validateModelDecision(combined,c).ok,false);
});
test('field-level model schema diagnostic survives durable deferred review without source text',()=>temp(async root=>{
 const c=cluster();
 const f=fact(U,{kind:'unsupported_tool_kind'});
 const invalid=validateModelDecision({decision:'EMIT',reason:'Source-backed attempt',
   facts:[f]},c);
 assert.equal(invalid.ok,false);
 assert.equal(invalid.reason,'invalid_fact_fields');
 assert.equal(invalid.diagnostic_field,'kind');
 const store=new ReviewStore(root,scope.group);
 const created=await store.create(c,invalid);
 assert.equal(created.record.state,'deferred');
 assert.equal(created.record.diagnostic_field,'kind');
 assert.equal(created.record.facts.length,0);
 const requested=await store.change(c.id,1,'reevaluate',{reason:'Retry with source-bound schema'});
 assert.equal(requested.reevaluate_requested,true);
 const updated=await store.reviseDeferred(c.id,2,invalid);
 assert.equal(updated.state,'deferred');
 assert.equal(updated.diagnostic_field,'kind');
}));
test('valid multi-event factual assertion uses latest referenced source observation time',()=>{
 const c=cluster();
 const f=fact(U,{assertion:U.excerpt,source_refs:[U.source_refs[0],T.source_refs[0]]});
 const supportsDifferentClasses=validateModelDecision({decision:'EMIT',
   reason:'Needs one source authority',facts:[f]},c);
 assert.equal(supportsDifferentClasses.ok,false);
 const newer={...U,source_refs:['opencode:ses_80:message:msg_later'],
   event_id:'a'.repeat(64),observed_at:'2026-11-03T18:03:00.000Z'};
 const oneClass={...c,events:[U,newer]};
 const sourceRefs=[U.source_refs[0],newer.source_refs[0]];
 // Automatic model promotions require one source. Multi-source attribution
 // remains available to a deliberate operator-reviewed assertion.
 const modelResult=validateModelDecision({decision:'EMIT',reason:'Two related observations',
   facts:[{assertion:f.assertion,kind:'decision',
     source_refs:sourceRefs,temporal_status:'observed'}]},oneClass);
 assert.equal(modelResult.ok,false);
 assert.equal(modelResult.reason,'model_assertion_not_source_extract');
 const operatorResult=validateDecision({decision:'EMIT',reason:'Two related observations',
   facts:[{...f,source_refs:sourceRefs,observed_at:newer.observed_at}]},oneClass);
 assert.equal(operatorResult.ok,true);
 assert.equal(operatorResult.facts[0].observed_at,newer.observed_at);
});
test('operator qualification seed cannot masquerade as model curation',()=>temp(async root=>{
 const store=new ReviewStore(root,scope.group),c=cluster();
 const result=await store.create(c,{decision:'DEFER',reason:'Operator qualification review',
   facts:[]},{origin:'qualification_operator_seed'});
 assert.equal(result.record.origin,'qualification_operator_seed');
 assert.equal(result.record.audit[0].action,'qualification_operator_seed');
 await assert.rejects(store.create(c,{decision:'DEFER',reason:'No',facts:[]},
   {origin:'verified_by_model'}),/Invalid review creation origin/);
}));
test('operator-attested asynchronous extraction failure preserves source authority and blocks replay',()=>temp(async root=>{
 const s=new ReviewStore(root,scope.group),c=cluster();
 const {record}=await s.create(c,validDecision(c));
 await s.advance(record.id,'approved','submission_unknown');
 await s.advance(record.id,'submission_unknown','queued');
 const queued=await s.get(record.id);
 const proof={kind:'graphiti_async_processing_failure',
   identity_binding:'anonymous_group_fifo_inference',operator_attested:true,
   journal_sha256:'a'.repeat(64),other_success_episode_uuid:'26299f65-f48c-45c1-abf0-9c7d521b1a03',
   observed_at:'2026-11-03T22:31:39.841Z',error_code:'graphiti_json_decode_error',
   reason:'First anonymous FIFO task failed and second task persisted; original graph effects not proven absent'};
 await assert.rejects(s.markExtractionFailure(record.id,queued.revision,
   {...proof,operator_attested:false}),/INVALID_TERMINAL_FAILURE_EVIDENCE/);
 const marked=await s.markExtractionFailure(record.id,queued.revision,proof);
 assert.equal(marked.state,'failed_extraction');
 assert.equal(marked.remote_episode_uuid,null);
 assert.deepEqual(marked.facts,queued.facts);
 assert.deepEqual(marked.events,queued.events);
 assert.deepEqual(marked.source_event_ids,queued.source_event_ids);
 assert.equal(marked.failure_evidence.identity_binding,'anonymous_group_fifo_inference');
 assert.equal(marked.audit.at(-1).outcome,'failed_extraction');
 await assert.rejects(s.markExtractionFailure(record.id,queued.revision,proof),
   /STALE_REVIEW_REVISION/);
 await assert.rejects(s.change(record.id,marked.revision,'edit-and-approve',
   {facts:marked.facts}),/REMOTE_WRITE_ALREADY_POSSIBLE/);
 assert.equal(await s.advance(record.id,'queued','submission_unknown'),false);
 assert.equal((await s.list()).items[0].state,'failed_extraction');
}));
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
test('incompatible Graphiti readback preflight blocks every add_memory attempt',()=>temp(async root=>{
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const store=new ReviewStore(root,scope.group),c=cluster();
  await store.create(c,proposal(U));
  let writes=0,readbacks=0;
  const graphiti={call:async method=>{
    if(method==='search_memory_facts')return {facts:[]};
    if(method==='get_episodes'){readbacks++;return {invalid_list:true};}
    if(method==='add_memory'){writes++;throw Error('must not submit');}
    throw Error('unexpected '+method);
  }};
  const result=await promoteOne(store,await store.get(c.id),graphiti);
  assert.equal(result.status,'deferred');
  assert.equal(result.reason,'graphiti_readback_preflight_unavailable');
  assert.equal((await store.get(c.id)).state,'deferred');
  assert.equal((await store.get(c.id)).remote_episode_uuid,null);
  assert.equal(writes,0);
  assert.equal(readbacks,1);
 }finally{delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;}
}));
test('reconcile-only CLI rejects callers without inherited EX admission',()=>temp(async root=>{
 const saved=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 try {
  const result=spawnSync(process.execPath,[
    new URL('./curator-cli.mjs',import.meta.url).pathname,
    'reconcile-only','--group',scope.group,'--state-dir',root,
    '--endpoint','http://127.0.0.1:8766/mcp'
  ],{encoding:'utf8',timeout:5000,env:{...process.env}});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/EX_POST_EXIT_ADMISSION_REQUIRED/);
 } finally {
  if(saved===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=saved;
 }
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
    curate:async()=>({content:JSON.stringify(modelProposal(U)),duration_ms:25}),maxSeconds:20});
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
    if(method==='search_memory_facts')return {facts:[{fact:U.excerpt,group_id:scope.group}]};
    return {episodes:[]};
  }};
  const result=await runAdmitted({root,group:scope.group,queue:q,store,graphiti,
    curate:async()=>({content:JSON.stringify(modelProposal(U)),duration_ms:20}),maxSeconds:20});
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
test('re-evaluated approval converges deferred source queue without re-staging events',()=>temp(async root=>{
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const store=new ReviewStore(root,scope.group),q=new CandidateQueue(root,scope.group),c=cluster();
  for(const e of c.events){
    assert.equal((await q.stage(e)).status,'staged');
    assert.equal(await q.transition(e.event_id,'new','deferred'),true);
  }
  const initial=await store.create(c,{decision:'DEFER',reason:'Model schema mismatch',facts:[]});
  assert.equal(initial.record.state,'deferred');
  await store.change(c.id,1,'reevaluate',{reason:'Retry with exact source schema'});
  const uuid='87654321-1111-4111-a111-222222222222';
  let remoteWrite=false;
  const graphiti={call:async method=>{
    if(method==='search_memory_facts')return {facts:[]};
    if(method==='add_memory'){remoteWrite=true;return {ok:true};}
    if(method==='get_episodes')return {episodes:remoteWrite?
      [{name:'curated-v1:'+c.id,group_id:scope.group,uuid}]:[]};
    throw Error('unexpected '+method);
  }};
  const result=await runAdmitted({root,group:scope.group,queue:q,store,graphiti,
    curate:async()=>({content:JSON.stringify({
      decision:'EMIT',reason:'User-backed decision',
      facts:[{assertion:U.excerpt,kind:'decision',
        source_refs:[U.source_refs[0]],temporal_status:'observed'}]}),duration_ms:30}),
    maxSeconds:20});
  assert.equal(result.status,'settled');
  assert.equal(result.persisted,1);
  assert.equal((await store.get(c.id)).state,'persisted');
  const qstatus=await q.status();
  assert.equal(qstatus.counts.deferred,0);
  assert.equal(qstatus.counts.approved,3);
  assert.equal(qstatus.total,3);
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
