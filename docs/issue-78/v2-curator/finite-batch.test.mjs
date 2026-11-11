import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fromPrompt} from '../v2-candidate/events.mjs';
import {CandidateQueue} from '../v2-candidate/queue.mjs';
import {ReviewStore} from './core.mjs';
import {runAdmittedFiniteBatch,representativePrompt,
  validateRepresentativeFamilies,specificityPrompt,validateSpecificityFamilies,
  finiteBatchDiscoveryPrompt,
  finiteBatchUtilityPrompt} from './finite-batch.mjs';
import {selectClusters,validateModelDecision} from './core.mjs';

const scope={group:'issue92batch',project:'repo92',workspace:'/workspace/repo92'};
const strong='Sphinx reStructuredText output drops dictionary parameter header rows, causing expected table columns to disappear in rendered API documentation.';
const weak='The Sphinx reStructuredText output has an issue with dictionary parameter header rows in rendered API documentation.';
const different='Pylint --verbose fails when the required argument is omitted, even though the short -v flag is accepted by its command-line parser.';
const source=(id,body,eventScope=scope)=>fromPrompt({sessionID:'sess-'+id,
  messageID:'msg-'+id,prompt:{text:body},
  timestamp:'2026-11-09T19:00:00Z'},eventScope,{admitted:true});
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
function model({uncertain=false,distinct=false,invalid=false,reject=false,
 specificity='same',counter=null}={}){
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
  }else if(system.includes('INDEPENDENT COUNTER-REVIEW')){
   const cs=data.candidates;
   let families;
   if(specificity==='invalid'){
    families=[{members:cs.map(c=>c.index),representative:0,
      certainty:'high',reason_code:'same_technical_predicate',
      representative_quote:'fabricated quote not in source',
      equivalence_checks:cs.slice(1).map(c=>({index:c.index,
       shared_behavior:'Same underlying technical behavior as representative'}))}];
   }else if(specificity==='split'){
    families=cs.map(c=>({members:[c.index],representative:c.index,
     certainty:'high',reason_code:'distinct_predicate',
     representative_quote:c.assertion.slice(0,200),equivalence_checks:[]}));
   }else{
    const rep=cs.find(c=>c.assertion===strong)?.index??0;
    families=[{members:cs.map(c=>c.index),representative:rep,
     certainty:'high',reason_code:'same_technical_predicate',
     representative_quote:cs[rep].assertion.slice(0,200),
     equivalence_checks:cs.filter(c=>c.index!==rep).map(c=>({
      index:c.index,
      shared_behavior:'This statement describes the identical missing-row behavior'
     }))}];
   }
   content=JSON.stringify({families});
  }else throw Error('unknown model stage');
  return {content,duration_ms:1,
   usage:{prompt_tokens:10,completion_tokens:15}};
 };
}
async function fixture(fn,order=[strong,weak],{scopeFor=null}={}){
 const root=await mkdtemp(path.join(os.tmpdir(),'issue92-finite-'));
 const previous=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const queue=new CandidateQueue(root,scope.group);
  const store=new ReviewStore(root,scope.group);
  for(const body of order){
   const id=body===strong?'strong':body===weak?'weak':'different';
   const e=source(id,body,scopeFor?scopeFor(id):scope);
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
// Existing finite-batch tests retain the explicit conservative policy to
// verify legacy recovery behavior, while the new tests below exercise the
// production-facing development default: recall, not model-gated novelty.
const opts=f=>({...f,group:scope.group,
 modelEndpoint:'http://127.0.0.1:8002/v1/chat/completions',
 modelId:'chat-fast',maxClusters:24,maxSeconds:180,
 noveltyPolicy:'conservative'});
const recallOpts=f=>({...opts(f),noveltyPolicy:undefined});

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
  assert.equal(result.model_calls,6);
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
 assert.equal(count.n,6);
 assert.equal(f.graphiti.writes.length,0);
 const out=await runAdmittedFiniteBatch(opts({...f,curate}));
 assert.equal(out.persisted,1);
 assert.equal(out.model_calls,0);
 assert.equal(count.n,6);
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

test('finite-batch discovery prefers actual technical predicates over task boilerplate',()=>{
 const c=selectClusters([source('probe',strong)])[0];
 const msgs=finiteBatchDiscoveryPrompt(c);
 assert.match(msgs[0].content,/technical predicate/);
 assert.match(msgs[0].content,/NOT the generic task header/);
 const data=JSON.parse(msgs[1].content);
 assert.equal(data.evidence[0].excerpt,strong);
 assert.equal(data.evidence[0].source,c.events[0].source_refs[0]);
});
test('independent batch utility does not inherit earlier same-group duplication anchors',()=>{
 const c=selectClusters([source('probe2',strong)])[0],e=c.events[0];
 const p=validateModelDecision({decision:'EMIT',reason:'Exact supported excerpt',
  utility_class:'useful_negative',facts:[{kind:'blocker',
   utility_class:'useful_negative',source_refs:[e.source_refs[0]],
   temporal_status:'observed',evidence_span:{
    source_ref:e.source_refs[0],start:0,end:e.excerpt.length}}]},c);
 assert.equal(p.ok,true);
 const msgs=finiteBatchUtilityPrompt(c,p);
 assert.match(msgs[0].content,/FIRST independent utility judgment/);
 assert.match(msgs[0].content,/There are NO earlier same-batch facts/);
 assert.match(msgs[0].content,/REPORTED defect/);
 assert.equal(JSON.parse(msgs[1].content).prior_same_group_facts.length,0);
});

test('a corrupted frozen model receipt blocks recovery before any Graphiti write',()=>fixture(async f=>{
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,curate:model(),
  onCheckpoint:s=>{if(s==='plan_frozen')throw Error('INJECTED_POST_PLAN');}
 })),/INJECTED_POST_PLAN/);
 const {readdir,writeFile}=await import('node:fs/promises');
 const active=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
 const dir=path.join(f.root,'issue92-finite-batches-v1',scope.group,
  active.batch_id,'model-calls');
 const name=(await readdir(dir)).find(x=>x.endsWith('.result.json'));
 assert.ok(name);
 const file=path.join(dir,name),item=JSON.parse(await readFile(file,'utf8'));
 await writeFile(file,JSON.stringify({...item,reply_sha256:'0'.repeat(64)}));
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,curate:model()})),
  /PLAN_MODEL_RECEIPT_MISMATCH/);
 assert.equal(f.graphiti.writes.length,0);
 assert.equal((await f.store.list({limit:20})).total,0);
}));

test('cross-workspace Sphinx siblings share one project arbitration pool and preserve their original native scopes',async()=>{
 const scopes=id=>({...scope,workspace:'/workspace/swebench/'+id});
 const run=order=>fixture(async f=>{
  const out=await runAdmittedFiniteBatch(opts({...f,curate:model()}));
  assert.equal(out.model_calls,6); // two discoveries, two utility calls, joint review + specificity
  assert.equal(out.persisted,1);
  assert.equal(out.deferred,1);
  assert.equal(f.graphiti.writes.length,1);
  assert.ok(f.graphiti.writes[0].episode_body.includes(strong));
  const rows=(await f.store.list({limit:20})).items;
  assert.equal(rows.length,2);
  const kept=rows.find(r=>r.state==='persisted'),alternate=rows.find(r=>r.state==='deferred');
  assert.ok(kept&&alternate);
  assert.equal(kept.workspace,scopes('strong').workspace);
  assert.equal(alternate.workspace,scopes('weak').workspace);
  const active=JSON.parse(await readFile(path.join(f.root,
   'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
  const plan=JSON.parse(await readFile(path.join(f.root,
   'issue92-finite-batches-v1',scope.group,active.batch_id,'plan.json'),'utf8'));
  assert.equal(plan.families.length,1);
  assert.equal(plan.families[0].pool.length,2);
  assert.equal(plan.families[0].selected.length,1);
  return {families:plan.families,items:plan.items};
 },order,{scopeFor:scopes});
 assert.deepEqual(await run([weak,strong]),await run([strong,weak]));
});
test('cross-workspace uncertain-equivalence families defer both instead of promoting first arrival',()=>fixture(async f=>{
 const out=await runAdmittedFiniteBatch(opts({...f,curate:model({uncertain:true})}));
 assert.equal(out.model_calls,5);
 assert.equal(out.approved,0);
 assert.equal(out.deferred,2);
 assert.equal(f.graphiti.writes.length,0);
},[strong,weak],{scopeFor:id=>({...scope,workspace:'/workspace/swebench/'+id})}));
test('same group but different authenticated projects cannot be compared as one family',()=>fixture(async f=>{
 const out=await runAdmittedFiniteBatch(opts({...f,curate:model({distinct:true})}));
 assert.equal(out.model_calls,6); // two discoveries, two utilities, two singleton arbitration calls
 assert.equal(out.approved,2);
 assert.equal(out.persisted,2);
 const active=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
 const plan=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,active.batch_id,'plan.json'),'utf8'));
 assert.equal(plan.families.length,2);
 for(const family of plan.families)assert.equal(family.pool.length,1);
},[strong,weak],{scopeFor:id=>({
 ...scope,project:id==='strong'?'repo92':'repo93',
 workspace:'/workspace/swebench/'+id
})}));
test('arbitration rejects cross-project candidate data, but accepts separate workspaces of one project',()=>{
 const make=(id,project,workspace)=>({id,group:scope.group,project,workspace,
  utility_class:'useful_negative',fact:{assertion:strong,kind:'blocker',
   evidence_class:'user-stated',temporal_status:'observed',
   source_refs:['opencode:session:message:'+id]}});
 const a=make('a'.repeat(64),'repo92','/repo-a');
 const b=make('b'.repeat(64),'repo92','/repo-b');
 const prompt=representativePrompt([a,b]);
 const data=JSON.parse(prompt[1].content);
 assert.equal(data.scope.comparison_scope,'project');
 assert.equal(data.scope.native_workspace_scopes,'retained_individually');
 assert.equal(data.candidates.length,2);
 assert.notEqual(data.candidates[0].workspace_sha256,data.candidates[1].workspace_sha256);
 assert.throws(()=>representativePrompt([a,{...b,project:'repo93'}]),
  /ARBITRATION_CROSS_PROJECT_OR_INVALID_WORKSPACE/);
});

test('nineteen same-project, cross-workspace candidates form real semantic-family choices instead of nineteen singleton calls',()=>{
 const make=(name,assertion,i)=>({
  id:(i+1).toString(16).padStart(64,'0'),group:scope.group,
  project:scope.project,workspace:'/workspace/swebench/'+name,
  utility_class:'useful_negative',fact:{
   assertion,evidence_class:'user-stated',temporal_status:'observed',
   kind:'blocker',source_refs:['opencode:sess-'+name+':message:m'+i]
  }
 });
 const entries=[
  ...Array.from({length:5},(_,i)=>make('sphinx-'+i,
   'Sphinx dictionary parameter table header row missing in rendering variant '+i,i)),
  ...Array.from({length:6},(_,i)=>make('django-'+i,
   'Django lazy string proxy raises TypeError in filter variant '+i,i+5)),
  ...Array.from({length:8},(_,i)=>make('distinct-'+i,
   'Unique independent technical constraint number '+i+' uses another interface',i+11))
 ];
 const input=representativePrompt([...entries].reverse());
 const parsed=JSON.parse(input[1].content);
 assert.equal(parsed.candidates.length,19);
 assert.equal(new Set(parsed.candidates.map(x=>x.workspace_sha256)).size,19);
 assert.equal(parsed.scope.comparison_scope,'project');
 const families=[
  {members:[0,1,2,3,4],representative:0,certainty:'high',
   reason_code:'same_technical_predicate'},
  {members:[5,6,7,8,9,10],representative:5,certainty:'high',
   reason_code:'same_technical_predicate'},
  ...Array.from({length:8},(_,j)=>({members:[11+j],representative:11+j,
   certainty:'high',reason_code:'distinct_predicate'}))
 ];
 const solution=validateRepresentativeFamilies({families},entries);
 assert.equal(solution.ok,true);
 assert.equal(solution.selected.length,10); // 2 meaningful family reps + 8 distinct
 assert.equal(solution.deferred.length,9); // all 9 repeated variants remain reviewable
 assert.deepEqual(solution,validateRepresentativeFamilies({families},[...entries].reverse()));
 assert.deepEqual(input,representativePrompt(entries));
});

test('independent specificity counter-review splits supported distinct technical variants',()=>fixture(async f=>{
 const out=await runAdmittedFiniteBatch(opts({...f,curate:model({specificity:'split'})}));
 assert.equal(out.model_calls,6);
 assert.equal(out.approved,2);
 assert.equal(out.persisted,2);
 assert.equal(out.deferred,0);
 assert.equal(f.graphiti.writes.length,2);
 const active=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
 const plan=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,active.batch_id,'plan.json'),'utf8'));
 assert.equal(plan.families.length,1);
 assert.equal(plan.families[0].provisional.length,1);
 assert.equal(plan.families[0].provisional[0].members.length,2);
 assert.equal(plan.families[0].refinements.length,1);
 assert.equal(plan.families[0].refinements[0].selected.length,2);
 assert.equal(plan.families[0].refinements[0].source_proof.length,2);
},[strong,different],{scopeFor:id=>({...scope,
 workspace:'/workspace/swebench/'+id})}));
test('specificity quote and per-alternate equivalence checks are mandatory and source-authenticated',()=>{
 const make=(id,text)=>({id,group:scope.group,project:scope.project,
  workspace:'/workspace/swebench/'+id,utility_class:'useful_negative',
  fact:{assertion:text,kind:'blocker',temporal_status:'observed',
   evidence_class:'user-stated',source_refs:['opencode:source:'+id]}});
 const entries=[make('a'.repeat(64),strong),make('b'.repeat(64),weak)];
 const prompt=specificityPrompt([...entries].reverse());
 assert.deepEqual(prompt,specificityPrompt(entries));
 assert.match(prompt[0].content,/additional independently useful constraint/);
 const accepted={families:[{members:[0,1],representative:0,certainty:'high',
  reason_code:'same_technical_predicate',
  representative_quote:strong.slice(0,90),
  equivalence_checks:[{index:1,
   shared_behavior:'Both passages report the same Sphinx header-row defect'}]}]};
 assert.equal(validateSpecificityFamilies(accepted,entries).ok,true);
 const missing={families:[{...accepted.families[0],equivalence_checks:[]}]};
 assert.equal(validateSpecificityFamilies(missing,entries).ok,false);
 assert.equal(validateSpecificityFamilies({families:[{
  ...accepted.families[0],representative_quote:'a fabricated assertion that is absent'
 }]},entries).ok,false);
 const refined={families:entries.map((c,index)=>({
  members:[index],representative:index,certainty:'high',
  reason_code:'distinct_predicate',representative_quote:c.fact.assertion.slice(0,95),
  equivalence_checks:[]}))};
 assert.equal(validateSpecificityFamilies(refined,entries).selected.length,2);
});
test('invalid optional specificity model output defers only that family, not the source or the batch',()=>fixture(async f=>{
 const out=await runAdmittedFiniteBatch(opts({...f,
  curate:model({specificity:'invalid'})}));
 assert.equal(out.model_calls,6);
 assert.equal(out.persisted,0);
 assert.equal(out.approved,0);
 assert.equal(out.deferred,2);
 assert.equal(f.graphiti.writes.length,0);
 assert.equal((await f.store.list({limit:20})).items.filter(x=>x.state==='deferred').length,2);
 const active=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
 const plan=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,active.batch_id,'plan.json'),'utf8'));
 assert.equal(plan.families[0].refinements[0].result,'review_required_invalid_specificity');
 assert.ok(plan.families[0].refinements[0].validation_reason.includes('quote_not_from_selected_fact'));
}));
test('unknown result for independent specificity cannot be replayed after restart',()=>fixture(async f=>{
 let attempts=0;
 const otherwise=model();
 const unstable=async(cluster,opts)=>{
  if(opts.promptMessages[0].content.includes('INDEPENDENT COUNTER-REVIEW')){
   attempts++;throw Error('unknown model outcome at specificity');
  }
  return otherwise(cluster,opts);
 };
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,curate:unstable})),
  /MODEL_CALL_OUTCOME_UNKNOWN_NO_REPLAY/);
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,curate:unstable})),
  /MODEL_CALL_AMBIGUOUS_NO_REPLAY/);
 assert.equal(attempts,1);
 assert.equal(f.graphiti.writes.length,0);
}));
test('first-pass uncertain equivalence remains deferred without specificity call',()=>fixture(async f=>{
 const calls={n:0};
 const out=await runAdmittedFiniteBatch(opts({...f,
  curate:model({uncertain:true,counter:calls})}));
 assert.equal(out.approved,0);
 assert.equal(out.persisted,0);
 assert.equal(out.deferred,2);
 assert.equal(out.model_calls,5);
 assert.equal(calls.n,5);
}));

test('multi-variant source-specificity review preserves distinct conditions while deferring true repetitions',()=>{
 const subjects=[
  'Sphinx output drops dictionary parameter headers from the rendered table.',
  'Sphinx rendering has missing dictionary parameter header columns in its table.',
  'Sphinx table headings disappear for dictionary parameter documentation.',
  'Sphinx documentation lacks required dictionary parameter header rows.',
  'Sphinx ASCII-only formatting omits required output key/value labels.',
  'The Sphinx plain-ASCII formatter drops its output key/value labels.',
  'Sphinx RST export escapes a literal backslash in a parameter name.',
  'Sphinx nested-list output duplicates indentation of wrapped descriptions.'
 ];
 const rows=subjects.map((assertion,i)=>({
  id:(i+1).toString(16).padStart(64,'0'),group:scope.group,
  project:scope.project,workspace:'/workspace/swebench/run-'+i,
  utility_class:'useful_negative',fact:{
   assertion,kind:'blocker',evidence_class:'user-stated',
   temporal_status:'observed',source_refs:['opencode:session:message:'+i]
  }
 }));
 const family=(members,rep)=>({members,representative:rep,
  certainty:'high',reason_code:members.length>1?
  'same_technical_predicate':'distinct_predicate',
  representative_quote:subjects[rep].slice(0,100),
  equivalence_checks:members.filter(i=>i!==rep).map(i=>({
   index:i,shared_behavior:'Both descriptions identify the same documented output failure'
  }))
 });
 const outcome=validateSpecificityFamilies({families:[
  family([0,1,2,3],0),family([4,5],4),family([6],6),family([7],7)
 ]},rows);
 assert.equal(outcome.ok,true);
 assert.equal(outcome.selected.length,4);
 assert.equal(outcome.deferred.length,4);
 assert.equal(outcome.proof.length,4);
 assert.deepEqual(outcome,validateSpecificityFamilies({families:[
  family([0,1,2,3],0),family([4,5],4),family([6],6),family([7],7)
 ]},[...rows].reverse()));
 assert.throws(()=>specificityPrompt([rows[0],{...rows[4],project:'other-project'}]),
  /SPECIFICITY_SCOPE/);
});


test('recall-first default promotes both independently useful, source-validated facts without a semantic veto',()=>fixture(async f=>{
 const count={n:0};
 const result=await runAdmittedFiniteBatch(recallOpts({...f,curate:model({invalid:true,counter:count})}));
 assert.equal(result.status,'settled');
 assert.equal(result.model_calls,4); // discovery + independent utility only
 assert.equal(count.n,4); // no arbitration or specificity inference
 assert.equal(result.approved,2);
 assert.equal(result.deferred,0);
 assert.equal(result.persisted,2);
 assert.equal(f.graphiti.writes.length,2);
 const active=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
 const plan=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,active.batch_id,'plan.json'),'utf8'));
 assert.equal(plan.policy,'issue92_recall_first_source_and_utility_v1');
 assert.equal(plan.families.length,1);
 assert.equal(plan.families[0].novelty_status,
  'semantic_equivalence_advisory_not_promotion_gate');
 assert.equal(plan.families[0].selected.length,2);
 assert.equal(plan.calls.length,4);
 assert.ok(plan.calls.every(c=>['discovery','utility'].includes(c.stage)));
}));
test('recall-first default is not defeated by previously uncertain model equivalence',()=>fixture(async f=>{
 const count={n:0};
 const result=await runAdmittedFiniteBatch(recallOpts({...f,
  curate:model({uncertain:true,counter:count})}));
 assert.equal(count.n,4);
 assert.equal(result.persisted,2);
 assert.equal(result.deferred,0);
 assert.equal(f.graphiti.writes.length,2);
},[strong,weak],{scopeFor:id=>({...scope,
 workspace:'/workspace/swebench/'+id})}));
test('frozen discovery/utility replies can be reused without model replay when novelty is no longer a gate',()=>fixture(async f=>{
 const count={n:0},curate=model({counter:count});
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,curate,
  onCheckpoint:stage=>{
   if(stage==='model_result_frozen'&&count.n===4)
    throw Error('STOP_AFTER_UTILITY_BEFORE_NOVELTY');
  }
 })),/STOP_AFTER_UTILITY_BEFORE_NOVELTY/);
 assert.equal(count.n,4);
 assert.equal(f.graphiti.writes.length,0);
 const noInference=async()=>{throw Error('NO_REPLAY_OF_FROZEN_INFERENCE_ALLOWED');};
 const result=await runAdmittedFiniteBatch(recallOpts({...f,curate:noInference}));
 assert.equal(result.model_calls,0);
 assert.equal(result.persisted,2);
 assert.equal(result.approved,2);
 assert.equal(f.graphiti.writes.length,2);
 assert.equal(count.n,4);
}));
test('already frozen recall plans cannot switch back to restrictive policy on restart',()=>fixture(async f=>{
 const count={n:0},curate=model({counter:count});
 await assert.rejects(runAdmittedFiniteBatch(recallOpts({...f,curate,
  onCheckpoint:stage=>{
   if(stage==='plan_frozen')throw Error('STOP_AT_RECALL_PLAN');
  }
 })),/STOP_AT_RECALL_PLAN/);
 assert.equal(count.n,4);
 assert.equal(f.graphiti.writes.length,0);
 await assert.rejects(runAdmittedFiniteBatch(opts({...f,curate})),
  /ISSUE92_BATCH_PLAN_IDENTITY/);
 assert.equal(count.n,4);
 assert.equal(f.graphiti.writes.length,0);
 const recovered=await runAdmittedFiniteBatch(recallOpts({...f,curate}));
 assert.equal(recovered.model_calls,0);
 assert.equal(recovered.persisted,2);
 assert.equal(count.n,4);
}));

test('specificity response shape alias and exact long quote do not become safety vetoes',()=>{
 const rep='Sphinx output drops dictionary parameter header rows in rendered documentation and affects the table-column layout for text-based output, including a reproducible exception when the output contains a nested rendering mode or additional versioned parameters.';
 const other='Sphinx documentation output suppresses the same table header rows for dictionary parameters in the generated API page.';
 const mk=(id,assertion)=>({id,group:scope.group,project:scope.project,
  workspace:'/workspace/swebench/'+id,utility_class:'useful_negative',
  fact:{assertion,kind:'blocker',source_refs:['opencode:source:'+id],
   evidence_class:'user-stated',temporal_status:'observed'}});
 const rows=[mk('a'.repeat(64),rep),mk('b'.repeat(64),other)];
 const raw={family:[0,1],representative:0,certainty:'high',
  reason_code:'same_technical_predicate',
  representative_quote:rep,
  equivalence_checks:[{index:1,
   shared_behavior:'Both statements describe missing Sphinx dictionary table headers'}]};
 assert.ok(rep.length>220&&rep.length<=450);
 const v=validateSpecificityFamilies(raw,rows);
 assert.equal(v.ok,true);
 assert.equal(v.normalization,'flat_single_family');
 assert.equal(v.selected.length,1);
 assert.equal(v.deferred.length,1);
 assert.equal(validateSpecificityFamilies({family:[0,1],representative:0},rows).ok,false);
 assert.equal(validateSpecificityFamilies({...raw,representative_quote:'fabricated quote'},rows).ok,false);
 assert.equal(validateSpecificityFamilies({...raw,family:[0]},rows).ok,false);
});


test('recall-first finite batch applies separate discovery/utility model knobs without novelty calls',()=>fixture(async f=>{
 const tuning={schema:'issue92-finite-batch-tuning-v1',stages:{
  discovery:{model:'chat-fast',temperature:0.1,max_tokens:1024,
   prompt_guidance:'Identify actual source-stated technical constraints.'},
  utility:{model:'chat-review',reasoning_effort:'low',temperature:0,
   max_tokens:3072,prompt_guidance:'Accept potentially useful reported defects.'}
 }};
 const calls=[],base=model();
 const mocked=async(cluster,opts)=>{
  calls.push({model:opts.model,temperature:opts.temperature,
   reasoningEffort:opts.reasoningEffort,maxTokens:opts.maxTokens,
   promptMessages:opts.promptMessages});
  return base(cluster,opts);
 };
 const result=await runAdmittedFiniteBatch(recallOpts({...f,curate:mocked,tuning}));
 assert.equal(result.model_calls,4);
 assert.equal(result.approved,2);
 assert.equal(result.persisted,2);
 assert.equal(calls.length,4);
 assert.equal(calls.filter(x=>x.model==='chat-fast').length,2);
 assert.equal(calls.filter(x=>x.model==='chat-review').length,2);
 for(const x of calls){
  if(x.model==='chat-fast'){
   assert.equal(x.maxTokens,1024);
   assert.equal(x.temperature,0.1);
   assert.ok(x.promptMessages[0].content.includes('Identify actual source-stated'));
  }else{
   assert.equal(x.maxTokens,3072);
   assert.equal(x.reasoningEffort,'low');
   assert.ok(x.promptMessages[0].content.includes('Accept potentially useful'));
  }
 }
 const active=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
 const baseDir=path.join(f.root,'issue92-finite-batches-v1',
  scope.group,active.batch_id);
 const plan=JSON.parse(await readFile(path.join(baseDir,'plan.json'),'utf8'));
 assert.match(plan.tuning_sha256,/^[0-9a-f]{64}$/);
 assert.equal(plan.tuning_sha256,active.tuning_sha256);
 const {readdir}=await import('node:fs/promises');
 const intents=(await readdir(path.join(baseDir,'model-calls')))
   .filter(n=>n.endsWith('.intent.json'));
 assert.equal(intents.length,4);
 for(const n of intents){
  const intent=JSON.parse(await readFile(path.join(baseDir,'model-calls',n),'utf8'));
  assert.match(intent.request_sha256,/^[0-9a-f]{64}$/);
 }
}));
test('a frozen batch cannot change its stage profile after the first model result',()=>fixture(async f=>{
 const count={n:0},curate=model({counter:count});
 const tuning={schema:'issue92-finite-batch-tuning-v1',stages:{
  utility:{model:'chat-review',reasoning_effort:'medium',max_tokens:2048}
 }};
 await assert.rejects(runAdmittedFiniteBatch(recallOpts({...f,curate,tuning,
  onCheckpoint:stage=>{
   if(stage==='model_result_frozen'&&count.n===1)
    throw Error('STOP_AFTER_FIRST_TUNED_RESPONSE');
  }
 })),/STOP_AFTER_FIRST_TUNED_RESPONSE/);
 assert.equal(count.n,1);
 await assert.rejects(runAdmittedFiniteBatch(recallOpts({...f,curate,
  tuning:{...tuning,stages:{utility:{
   ...tuning.stages.utility,reasoning_effort:'high'}}}
 })),/ISSUE92_BATCH_TUNING_IDENTITY_CHANGED/);
 assert.equal(count.n,1);
 const recovered=await runAdmittedFiniteBatch(recallOpts({...f,curate,tuning}));
 assert.equal(recovered.persisted,2);
 assert.equal(recovered.model_calls,3);
 assert.equal(count.n,4);
}));


test('replay-only refuses to infer when even one frozen model-call intent is missing',()=>fixture(async f=>{
 let calls=0;
 await assert.rejects(runAdmittedFiniteBatch(recallOpts({...f,replayOnly:true,
  curate:async()=>{calls++;throw Error('NEVER_CALL_MODEL');}
 })),/REPLAY_ONLY_MISSING_FROZEN_CALL/);
 assert.equal(calls,0);
 assert.equal(f.graphiti.writes.length,0);
 assert.equal((await f.store.list({limit:20})).total,0);
}));
test('replay-only recovers completed model responses with per-stage metrics and no inference',()=>fixture(async f=>{
 const count={n:0},curate=model({counter:count});
 await assert.rejects(runAdmittedFiniteBatch(recallOpts({...f,curate,
  onCheckpoint:s=>{if(s==='plan_frozen')throw Error('STOP_AFTER_FREEZE');}
 })),/STOP_AFTER_FREEZE/);
 assert.equal(count.n,4);
 assert.equal(f.graphiti.writes.length,0);
 let unexpected=0;
 const result=await runAdmittedFiniteBatch(recallOpts({...f,replayOnly:true,
  curate:async()=>{unexpected++;throw Error('UNAUTHORIZED_MODEL_CALL');}
 }));
 assert.equal(unexpected,0);
 assert.equal(result.model_calls,0);
 assert.equal(result.replay_only,true);
 assert.equal(result.persisted,2);
 assert.equal(result.model_metrics.discovery.calls,2);
 assert.equal(result.model_metrics.utility.calls,2);
 assert.equal(result.model_metrics.discovery.prompt_tokens,20);
 assert.equal(result.model_metrics.utility.completion_tokens,30);
 assert.equal(result.model_metrics.discovery.latency_ms,2);
 assert.equal(f.graphiti.writes.length,2);
}));

test('S2 recovers a source-supported technical quote after weak-header utility rejection',()=>fixture(async f=>{
 const stages=[];
 const curate=async(_,{promptMessages})=>{
  const system=promptMessages[0].content,data=JSON.parse(promptMessages[1].content);
  const recoveryDiscovery=system.includes('SECOND-PASS SOURCE RECOVERY');
  const recoveryUtility=system.includes('SECOND-PASS UTILITY REVIEW');
  const discovery=system.includes('SOURCE-FIRST candidate discovery');
  stages.push(recoveryDiscovery?'recovery-discovery':recoveryUtility?
   'recovery-utility':discovery?'discovery':'utility');
  if(discovery){
   const e=data.evidence[0],start=e.excerpt.indexOf(strong);
   assert.ok(start>25);
   return {content:JSON.stringify({reason:'source technical passage',candidates:[{
    kind:'blocker',source_ref:e.source,start:recoveryDiscovery?start:0,
    end:recoveryDiscovery?start+strong.length:start-1,temporal_status:'observed'
   }]})};
  }
  return {content:JSON.stringify({decisions:data.candidates.map(x=>({
   index:x.index,disposition:recoveryUtility?'ACCEPT':'REVIEW',
   reason_code:recoveryUtility?'source_specific_durable':'not_substantive',
   ...(recoveryUtility?{utility_class:'useful_negative'}:{})
  }))})};
 };
 const result=await runAdmittedFiniteBatch(recallOpts({...f,curate,sourceRecovery:true}));
 assert.deepEqual(stages,['discovery','utility','recovery-discovery','recovery-utility']);
 assert.equal(result.persisted,1);assert.equal(result.approved,1);
 assert.equal(result.deferred,1);assert.equal(f.graphiti.writes.length,1);
 const active=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
 assert.equal(active.source_recovery,true);
 const plan=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,active.batch_id,'plan.json'),'utf8'));
 assert.equal(plan.cluster_outcomes[0].source_recovery_trigger,'utility_non_substantive');
 assert.equal(plan.cluster_outcomes[0].source_recovery_attempted,true);
 assert.equal(plan.calls.length,4);
 assert.ok(plan.calls.some(x=>x.identity.endsWith(':source-recovery-v1')));
},['Please investigate this issue and send a progress update. '+strong]));

test('S2 default is unchanged and cannot adopt rescue after a plan is frozen',()=>fixture(async f=>{
 let calls=0;
 const curate=async()=>{calls++;return {content:JSON.stringify({
  reason:'No source candidates',candidates:[]})};};
 const result=await runAdmittedFiniteBatch(recallOpts({...f,curate}));
 assert.equal(result.persisted,0);assert.equal(calls,1);
 const active=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
 assert.equal(active.source_recovery,undefined);
 await assert.rejects(runAdmittedFiniteBatch(recallOpts({...f,curate,
  sourceRecovery:true})),/SOURCE_RECOVERY_IDENTITY_CHANGED/);
 assert.equal(calls,1);assert.equal(f.graphiti.writes.length,0);
},[strong]));

test('S2 fabricated source reference in recovery cannot reach Graphiti',()=>fixture(async f=>{
 const curate=async(_,{promptMessages})=>({content:JSON.stringify(
  promptMessages[0].content.includes('SECOND-PASS SOURCE RECOVERY')?
  {reason:'unattributed',candidates:[{kind:'blocker',source_ref:'forged',
   start:0,end:strong.length,temporal_status:'observed'}]}:
  {reason:'no initial source candidates',candidates:[]})});
 const result=await runAdmittedFiniteBatch(recallOpts({...f,curate,sourceRecovery:true}));
 assert.equal(result.approved,0);assert.equal(result.persisted,0);
 assert.equal(f.graphiti.writes.length,0);
},[strong]));

test('S2 ambiguous second-pass model outcome is not replayed',()=>fixture(async f=>{
 let attempts=0;
 const curate=async(_,{promptMessages})=>{
  if(promptMessages[0].content.includes('SECOND-PASS SOURCE RECOVERY')){
   attempts++;throw Error('network outcome unknown');
  }
  return {content:JSON.stringify({reason:'No source candidates',candidates:[]})};
 };
 await assert.rejects(runAdmittedFiniteBatch(recallOpts({...f,curate,
  sourceRecovery:true})),/MODEL_CALL_OUTCOME_UNKNOWN_NO_REPLAY/);
 await assert.rejects(runAdmittedFiniteBatch(recallOpts({...f,curate,
  sourceRecovery:true})),/MODEL_CALL_AMBIGUOUS_NO_REPLAY/);
 assert.equal(attempts,1);assert.equal(f.graphiti.writes.length,0);
},[strong]));

test('S2 unsupported inference is deferred without a recovery retry',()=>fixture(async f=>{
 let calls=0;
 const curate=async(_,{promptMessages})=>{
  calls++;
  if(promptMessages[0].content.includes('SOURCE-FIRST candidate discovery')){
   const e=JSON.parse(promptMessages[1].content).evidence[0];
   return {content:JSON.stringify({reason:'proposed exact quote',candidates:[{
    kind:'blocker',source_ref:e.source,start:0,end:e.excerpt.length,
    temporal_status:'observed'}]})};
  }
  return {content:JSON.stringify({decisions:[{index:0,disposition:'REVIEW',
   reason_code:'unsupported_inference'}]})};
 };
 const result=await runAdmittedFiniteBatch(recallOpts({...f,curate,sourceRecovery:true}));
 assert.equal(calls,2);assert.equal(result.persisted,0);
 assert.equal(f.graphiti.writes.length,0);
},[strong]));

test('S2 source recovery can recover an authenticated empty first discovery',()=>fixture(async f=>{
 const stages=[];
 const curate=async(_,{promptMessages})=>{
  const system=promptMessages[0].content;
  const rescue=system.includes('SECOND-PASS SOURCE RECOVERY');
  const discovery=system.includes('SOURCE-FIRST candidate discovery');
  stages.push(rescue?'rescue':discovery?'discovery':'utility');
  if(rescue){
   const e=JSON.parse(promptMessages[1].content).evidence[0];
   return {content:JSON.stringify({reason:'specific original source',candidates:[{
    kind:'blocker',source_ref:e.source,start:0,end:e.excerpt.length,
    temporal_status:'observed'}]})};
  }
  if(discovery)return {content:JSON.stringify({reason:'initial empty',candidates:[]})};
  return {content:JSON.stringify({decisions:[{index:0,disposition:'ACCEPT',
   reason_code:'source_specific_durable',utility_class:'useful_negative'}]})};
 };
 const out=await runAdmittedFiniteBatch(recallOpts({...f,curate,sourceRecovery:true}));
 assert.deepEqual(stages,['discovery','rescue','utility']);
 assert.equal(out.model_calls,3);
 assert.equal(out.persisted,1);assert.equal(f.graphiti.writes.length,1);
 const active=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
 const plan=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,active.batch_id,'plan.json'),'utf8'));
 assert.equal(plan.cluster_outcomes[0].source_recovery_trigger,'discovery_skip');
},[strong]));

test('S2 conflicting verdict on the same exact quote cannot silently upgrade it',()=>fixture(async f=>{
 let utility=0;
 const curate=async(_,{promptMessages})=>{
  const system=promptMessages[0].content;
  if(system.includes('SOURCE-FIRST candidate discovery')){
   const e=JSON.parse(promptMessages[1].content).evidence[0];
   return {content:JSON.stringify({reason:'exact same quote',candidates:[{
    kind:'blocker',source_ref:e.source,start:0,end:e.excerpt.length,
    temporal_status:'observed'}]})};
  }
  utility++;
  return {content:JSON.stringify({decisions:[{index:0,
   disposition:utility===1?'REVIEW':'ACCEPT',
   reason_code:utility===1?'not_substantive':'source_specific_durable',
   ...(utility===1?{}:{utility_class:'useful_negative'})}]})};
 };
 const out=await runAdmittedFiniteBatch(recallOpts({...f,curate,sourceRecovery:true}));
 assert.equal(utility,2);assert.equal(out.model_calls,4);
 assert.equal(out.approved,0);assert.equal(out.persisted,0);assert.equal(out.deferred,1);
 assert.equal(f.graphiti.writes.length,0);
},[strong]));


test('S3 retries one invalid discovery once and persists only corrected sourced fact',()=>fixture(async f=>{
 const stages=[];
 const curate=async(_,{promptMessages})=>{
  const system=promptMessages[0].content,data=JSON.parse(promptMessages[1].content);
  const discovery=system.includes('SOURCE-FIRST candidate discovery');
  const recovery=system.includes('SECOND-PASS SOURCE RECOVERY');
  stages.push(discovery?(recovery?'recovery':'first'):'utility');
  if(discovery){
   const e=data.evidence[0];
   if(recovery){
    assert.deepEqual(data.previous_validation_failures.map(x=>x.reason),
     ['invalid_fact_fields']);
    return {content:JSON.stringify({reason:'correct source fields',
     candidates:[{kind:'blocker',source_ref:e.source,start:0,
      end:e.excerpt.length,temporal_status:'observed'}]})};
   }
   return {content:JSON.stringify({reason:'unsupported kind',
    candidates:[{kind:'bad_kind',source_ref:e.source,start:0,
     end:e.excerpt.length,temporal_status:'observed'}]})};
  }
  return {content:JSON.stringify({decisions:[{index:0,
   disposition:'ACCEPT',reason_code:'source_specific_durable',
   utility_class:'useful_negative'}]})};
 };
 const out=await runAdmittedFiniteBatch(recallOpts({...f,curate,
  sourceRecovery:true,resilientDiscovery:true}));
 assert.deepEqual(stages,['first','recovery','utility']);
 assert.equal(out.model_calls,3);
 assert.equal(out.approved,1);assert.equal(out.persisted,1);
 assert.equal(f.graphiti.writes.length,1);
 const active=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
 assert.equal(active.resilient_discovery,true);
 const plan=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,active.batch_id,'plan.json'),'utf8'));
 assert.equal(plan.resilient_discovery,true);
 assert.equal(plan.cluster_outcomes[0].source_recovery_trigger,'invalid_discovery');
 assert.equal(plan.cluster_outcomes[0].source_validation_failures[0].candidates[0]
  .diagnostic_field,'kind');
},[strong]));

test('S3 independently validates mixed discovery and preserves two distinct facts',()=>fixture(async f=>{
 const combined=strong+' '+different;
 let discoveries=0,utilities=0;
 const curate=async(_,{promptMessages})=>{
  const system=promptMessages[0].content,data=JSON.parse(promptMessages[1].content);
  if(system.includes('SOURCE-FIRST candidate discovery')){
   discoveries++;
   const e=data.evidence[0],split=strong.length+1;
   if(discoveries===1)return {content:JSON.stringify({reason:'mixed source',
    candidates:[
     {kind:'blocker',source_ref:e.source,start:0,end:strong.length,temporal_status:'observed'},
     {kind:'invalid_kind',source_ref:e.source,start:split,end:e.excerpt.length,temporal_status:'observed'}
    ]})};
   assert.deepEqual(data.previous_validation_failures.map(x=>x.reason),
    ['invalid_fact_fields']);
   return {content:JSON.stringify({reason:'correct sibling',
    candidates:[{kind:'blocker',source_ref:e.source,start:split,
     end:e.excerpt.length,temporal_status:'observed'}]})};
  }
  utilities++;
  return {content:JSON.stringify({decisions:data.candidates.map(x=>({
   index:x.index,disposition:'ACCEPT',reason_code:'source_specific_durable',
   utility_class:'useful_negative'}))})};
 };
 const out=await runAdmittedFiniteBatch(recallOpts({...f,curate,
  sourceRecovery:true,resilientDiscovery:true}));
 assert.equal(discoveries,2);assert.equal(utilities,2);
 assert.equal(out.model_calls,4);
 assert.equal(out.approved,2);assert.equal(out.persisted,2);
 assert.equal(f.graphiti.writes.length,2);
 const active=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,'_active.json'),'utf8'));
 const plan=JSON.parse(await readFile(path.join(f.root,
  'issue92-finite-batches-v1',scope.group,active.batch_id,'plan.json'),'utf8'));
 assert.equal(plan.cluster_outcomes[0].source_recovery_trigger,'partial_invalid_discovery');
 assert.equal(plan.cluster_outcomes[0].source_validation_failures[0].valid_candidate_count,1);
},[strong+' '+different]));

test('S3 does not retry a forged source reference',()=>fixture(async f=>{
 let calls=0;
 const curate=async()=>{calls++;return {content:JSON.stringify({
  reason:'invented source',candidates:[{kind:'blocker',
   source_ref:'opencode:forged',start:0,end:strong.length,
   temporal_status:'observed'}]})};};
 const out=await runAdmittedFiniteBatch(recallOpts({...f,curate,
  sourceRecovery:true,resilientDiscovery:true}));
 assert.equal(calls,1);assert.equal(out.approved,0);
 assert.equal(out.persisted,0);assert.equal(f.graphiti.writes.length,0);
},[strong]));

test('S3 opt-in cannot change existing S2 active identity',()=>fixture(async f=>{
 let calls=0;
 const curate=async()=>{calls++;return {content:JSON.stringify({
  reason:'No source quote',candidates:[]})};};
 await runAdmittedFiniteBatch(recallOpts({...f,curate,sourceRecovery:true}));
 const before=calls;
 await assert.rejects(runAdmittedFiniteBatch(recallOpts({...f,curate,
  sourceRecovery:true,resilientDiscovery:true})),
  /RESILIENT_DISCOVERY_IDENTITY_CHANGED/);
 assert.equal(calls,before);assert.equal(f.graphiti.writes.length,0);
},[strong]));

test('S3 ambiguous correction request is not retried after frozen intent',()=>fixture(async f=>{
 let calls=0;
 const curate=async(_,{promptMessages})=>{
  calls++;
  const system=promptMessages[0].content;
  if(system.includes('SECOND-PASS SOURCE RECOVERY'))
   throw Error('unresolved model response');
  const e=JSON.parse(promptMessages[1].content).evidence[0];
  return {content:JSON.stringify({reason:'invalid kind',
   candidates:[{kind:'unsupported_kind',source_ref:e.source,
    start:0,end:e.excerpt.length,temporal_status:'observed'}]})};
 };
 await assert.rejects(runAdmittedFiniteBatch(recallOpts({...f,curate,
  sourceRecovery:true,resilientDiscovery:true})),
  /MODEL_CALL_OUTCOME_UNKNOWN_NO_REPLAY/);
 await assert.rejects(runAdmittedFiniteBatch(recallOpts({...f,curate,
  sourceRecovery:true,resilientDiscovery:true})),
  /MODEL_CALL_AMBIGUOUS_NO_REPLAY/);
 assert.equal(calls,2);assert.equal(f.graphiti.writes.length,0);
},[strong]));
