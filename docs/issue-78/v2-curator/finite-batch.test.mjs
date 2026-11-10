import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fromPrompt} from '../v2-candidate/events.mjs';
import {CandidateQueue} from '../v2-candidate/queue.mjs';
import {ReviewStore} from './core.mjs';
import {runAdmittedFiniteBatch,representativePrompt,
  validateRepresentativeFamilies} from './finite-batch.mjs';

const scope={group:'issue92batch',project:'repo92',workspace:'/workspace/repo92'};
const strong='Sphinx reStructuredText output drops dictionary parameter header rows, causing expected table columns to disappear in rendered API documentation.';
const weak='The Sphinx reStructuredText output has an issue with dictionary parameter header rows in rendered API documentation.';
const different='Pylint --verbose fails when the required argument is omitted, even though the short -v flag is accepted by its command-line parser.';
const source=(id,body)=>fromPrompt({sessionID:'sess-'+id,
  messageID:'msg-'+id,prompt:{text:body},
  timestamp:'2026-11-09T19:00:00Z'},scope,{admitted:true});
function graph(){
 return {episodes:[],writes:[],
  async call(method,args){
   if(method==='get_episodes')return {episodes:[...this.episodes]};
   if(method==='search_memory_facts')return {facts:[]};
   if(method==='add_memory'){
    this.writes.push(args);
    this.episodes.push({name:args.name,group_id:args.group_id,
     uuid:'00000000-0000-4000-8000-'+
       String(this.episodes.length+1).padStart(12,'0')});
    return {queued:true};
   }
   throw Error('unexpected Graphiti method');
  }};
}
function model({uncertain=false,distinct=false,invalid=false,reject=false,counter=null}={}){
 return async(_cluster,{promptMessages})=>{
  if(counter)counter.n++;
  const system=promptMessages[0].content;
  const data=JSON.parse(promptMessages[1].content);
  let content;
  if(system.includes('SOURCE-FIRST candidate discovery')){
   const e=data.evidence[0];
   content=JSON.stringify({reason:'Potential technical observation',
    candidates:[{kind:'blocker',source_ref:e.source,start:0,
     end:e.excerpt.length,temporal_status:'observed'}]});
  }else if(system.includes('independently REVIEW developer-memory')){
   content=JSON.stringify({decisions:data.candidates.map(c=>({
    index:c.index,disposition:reject?'REVIEW':'ACCEPT',
    reason_code:reject?'not_substantive':'source_specific_durable',
    ...(reject?{}:{utility_class:'useful_negative'})
   }))});
  }else if(system.includes('FINAL JOINT REVIEW')){
   const cs=data.candidates;
   let families;
   if(invalid)families=[{members:[0,0],representative:0,
    certainty:'high',reason_code:'same_technical_predicate'}];
   else if(distinct)families=cs.map(c=>({members:[c.index],
    representative:c.index,certainty:'high',reason_code:'distinct_predicate'}));
   else families=[{members:cs.map(c=>c.index),
    representative:cs.find(c=>c.assertion===strong)?.index??0,
    certainty:uncertain?'uncertain':'high',
    reason_code:uncertain?'uncertain':'same_technical_predicate'}];
   content=JSON.stringify({families});
  }else throw Error('unknown model stage');
  return {content,duration_ms:1,
   usage:{prompt_tokens:10,completion_tokens:15}};
 };
}
async function fixture(fn,order=[strong,weak]){
 const root=await mkdtemp(path.join(os.tmpdir(),'issue92-finite-'));
 const previous=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const queue=new CandidateQueue(root,scope.group);
  const store=new ReviewStore(root,scope.group);
  for(const body of order){
   const id=body===strong?'strong':body===weak?'weak':'different';
   const e=source(id,body);
   assert.ok(e);
   assert.equal((await queue.stage(e)).status,'staged');
  }
  return await fn({root,queue,store,graphiti:graph()});
 }finally{
  if(previous===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=previous;
  await rm(root,{recursive:true,force:true});
 }
}
const opts=f=>({...f,group:scope.group,
 modelEndpoint:'http://127.0.0.1:8002/v1/chat/completions',
 modelId:'chat-fast',maxClusters:24,maxSeconds:180});

test('representative input and resolution are invariant to candidate order',()=>{
 const make=(id,assertion)=>({id,group:scope.group,project:scope.project,
  workspace:scope.workspace,utility_class:'useful_negative',
  fact:{assertion,evidence_class:'user-stated',temporal_status:'observed',
   kind:'blocker',source_refs:['opencode:session:message:'+id]}});
 const rows=[make('b'.repeat(64),strong),make('a'.repeat(64),weak)];
 assert.deepEqual(representativePrompt(rows),
  representativePrompt([...rows].reverse()));
 const verdict={families:[{members:[0,1],representative:1,
  certainty:'high',reason_code:'same_technical_predicate'}]};
 assert.deepEqual(validateRepresentativeFamilies(verdict,rows),
  validateRepresentativeFamilies(verdict,[...rows].reverse()));
 assert.equal(validateRepresentativeFamilies({families:[{members:[0,0],
  representative:0,certainty:'high',
  reason_code:'same_technical_predicate'}]},rows).ok,false);
});
test('batch picks substantive representative and preserves the weaker review record in both arrival orders',async()=>{
 const run=order=>fixture(async f=>{
  const result=await runAdmittedFiniteBatch(opts({...f,curate:model()}));
  assert.equal(result.persisted,1);
  assert.equal(result.approved,1);
  assert.equal(result.deferred,1);
  assert.equal(result.model_calls,5);
  assert.equal(f.graphiti.writes.length,1);
  assert.ok(f.graphiti.writes[0].episode_body.includes(strong));
  const records=(await f.store.list({limit:20})).items;
  assert.equal(records.filter(r=>r.state==='persisted').length,1);
  assert.equal(records.filter(r=>r.state==='deferred').length,1);
  const active=JSON.parse(await readFile(path.join(f.root,
   'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
  const plan=JSON.parse(await readFile(path.join(f.root,
   'issue92-finite-batches-v1',scope.group,active.batch_id,'plan.json'),'utf8'));
  return {batch_id:result.batch_id,items:plan.items,families:plan.families};
 },order);
 assert.deepEqual(await run([weak,strong]),await run([strong,weak]));
});
test('uncertain equivalence defers both source facts without remote writes',()=>fixture(async f=>{
 const out=await runAdmittedFiniteBatch(opts({...f,curate:model({uncertain:true})}));
 assert.equal(out.persisted,0);
 assert.equal(out.deferred,2);
 assert.equal(f.graphiti.writes.length,0);
}));
test('distinct technical predicates are not collapsed merely because both are bug reports',()=>fixture(async f=>{
 const out=await runAdmittedFiniteBatch(opts({...f,curate:model({distinct:true})}));
 assert.equal(out.persisted,2);
 assert.equal(f.graphiti.writes.length,2);
},[strong,different]));
test('invalid family partition blocks all review and Graphiti mutations',()=>fixture(async f=>{
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,
  curate:model({invalid:true})})),/ARBITRATION_UNVERIFIED_NO_GRAPH_WRITES/);
 assert.equal((await f.store.list({limit:20})).total,0);
 assert.equal(f.graphiti.writes.length,0);
}));
test('independent utility REJECT retains source for review rather than Graphiti persistence',()=>fixture(async f=>{
 const out=await runAdmittedFiniteBatch(opts({...f,curate:model({reject:true})}));
 assert.equal(out.persisted,0);
 assert.equal(out.deferred,2);
 const records=(await f.store.list({limit:20})).items;
 assert.ok(records.every(r=>r.review_only_claims?.[0]?.screen_reason==='not_substantive'));
}));
test('crash after frozen plan resumes without any additional model calls',()=>fixture(async f=>{
 const count={n:0},curate=model({counter:count});
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,curate,
  onCheckpoint:s=>{if(s==='plan_frozen')throw Error('INJECTED_CRASH');}
 })),/INJECTED_CRASH/);
 assert.equal(count.n,5);
 assert.equal(f.graphiti.writes.length,0);
 const out=await runAdmittedFiniteBatch(opts({...f,curate}));
 assert.equal(out.persisted,1);
 assert.equal(out.model_calls,0);
 assert.equal(count.n,5);
}));
test('ambiguous model call intent remains non-replayable after interruption',()=>fixture(async f=>{
 let calls=0;
 const fail=async()=>{calls++;throw Error('network outage');};
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,curate:fail})),
  /MODEL_CALL_OUTCOME_UNKNOWN_NO_REPLAY/);
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,curate:fail})),
  /MODEL_CALL_AMBIGUOUS_NO_REPLAY/);
 assert.equal(calls,1);
 assert.equal(f.graphiti.writes.length,0);
}));
test('interactive harness cannot invoke the finite-batch worker',()=>fixture(async f=>{
 delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,curate:model()})),
  /EX_POST_EXIT_ADMISSION_REQUIRED/);
 assert.equal(f.graphiti.writes.length,0);
}));

test('remote ACK loss is reconciled by positive episode identity without a second write',()=>fixture(async f=>{
 const original=f.graphiti.call.bind(f.graphiti);
 let submitted=0;
 f.graphiti.call=async(method,args)=>{
  if(method==='add_memory'){submitted++;await original(method,args);
   throw Error('remote ACK lost after committed episode');}
  return original(method,args);
 };
 const counter={n:0},curate=model({distinct:true,counter});
 const first=await runAdmittedFiniteBatch(opts({...f,curate}));
 assert.equal(first.status,'unresolved');
 assert.equal(submitted,1);
 assert.equal(f.graphiti.episodes.length,1);
 const resumed=await runAdmittedFiniteBatch(opts({...f,curate}));
 assert.equal(resumed.model_calls,0);
 assert.equal(resumed.persisted,1);
 assert.equal(submitted,1);
 assert.equal(counter.n,3);
},[strong]));
test('snapshot resumes only if native source bytes match authenticated queue events',()=>fixture(async f=>{
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,curate:model(),
  onCheckpoint:s=>{if(s==='snapshot_frozen')throw Error('INJECTED_SNAPSHOT_STOP');}
 })),/INJECTED_SNAPSHOT_STOP/);
 const queued=(await f.queue.list({limit:20,states:['new']})).items;
 const event=queued[0];
 const file=f.queue.filename(event.event_id);
 const actual=JSON.parse(await readFile(file,'utf8'));
 const altered={...actual,excerpt:actual.excerpt+' modified'};
 const {writeFile}=await import('node:fs/promises');
 await writeFile(file,JSON.stringify(altered));
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,curate:model()})),
  /SNAPSHOT_QUEUE_SOURCE_DRIFT/);
 assert.equal(f.graphiti.writes.length,0);
}));
