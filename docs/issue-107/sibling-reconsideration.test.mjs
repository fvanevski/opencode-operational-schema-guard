import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fromPromptCandidates} from '../issue-78/v2-candidate/events.mjs';
import {selectClusters,ReviewStore} from '../issue-78/v2-curator/core.mjs';
import {validateAutonomousDecision} from '../issue-100/autonomous-policy.mjs';
const scope={group:'sibling107',project:'gh_mcp',workspace:'/workspace/gh_mcp'};
const statementA='The native Graphiti source adapter must preserve the full original source reference after a worker restart.';
const statementB='The post-exit curator must never replay the original graph episode when a separate model-format sibling needs correction.';
const fixture=()=>{
 const e=fromPromptCandidates({sessionID:'ses_107',messageID:'msg_107',
  prompt:{text:statementA+' '+statementB},
  timestamp:'2026-11-18T12:00:00Z'},scope,{admitted:true})[0];
 const cluster=selectClusters([e],{sourceMessageIsolation:true})[0];
 return {e,cluster};
};
const fact=(e,quote,{valid=true,provisional=false}={})=>({
 kind:'architecture',temporal_status:'observed',
 source_refs:[e.source_refs[0]],evidence_quote:quote,
 retention_status:provisional?'provisional_retention':'established_retention',
 ...(provisional?{}:{utility_class:'stable_architecture'}),
 ...(valid?{utility_reason:'Source-backed technical behavior for later development'}:{})
});
const model=(facts)=>({decision:'EMIT',reason:'Two independent useful source statements',facts});
const tdir=async fn=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ghdev107-sibling-'));
 const saved=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 try{return await fn(dir);}
 finally{
  if(saved===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=saved;
  await rm(dir,{recursive:true,force:true});
 }
};
const savedProposal=(e,cluster)=>{
 const p=validateAutonomousDecision(model([
  fact(e,statementA),fact(e,statementB,{valid:false})]),cluster);
 assert.equal(p.ok,true);
 assert.equal(p.facts.length,1);
 assert.equal(p.recoverable_siblings.length,1);
 assert.deepEqual(p.recoverable_siblings[0],{
  index:1,source_ref:e.source_refs[0],reason:'invalid_utility_metadata'});
 return p;
};
test('#107 format-rejected sibling source is durable without replaying accepted sibling',()=>tdir(async root=>{
 const {e,cluster}=fixture(),store=new ReviewStore(root,scope.group);
 const p=savedProposal(e,cluster);
 const first=await store.createBundle(cluster,p);
 assert.equal(first.records.length,2);
 const accepted=first.records.find(r=>r.state==='approved');
 const pending=first.records.find(r=>r.state==='deferred');
 assert.ok(accepted&&pending);assert.equal(accepted.facts.length,1);
 assert.equal(accepted.facts[0].assertion,statementA);
 assert.equal(pending.facts.length,0);
 assert.equal(pending.reconsideration.source_ref,e.source_refs[0]);
 assert.equal(pending.origin_cluster_id,cluster.id);
 assert.deepEqual(pending.source_event_ids,accepted.source_event_ids);
 const second=await new ReviewStore(root,scope.group).restoreBundle(cluster.id);
 assert.equal(second.records.length,2);
 assert.equal(second.records.find(r=>r.state==='approved').id,accepted.id);
 assert.equal(second.records.find(r=>r.state==='deferred').id,pending.id);
 assert.equal((await new ReviewStore(root,scope.group).restoreBundles()),1);
}));
test('#107 EX retry recovers one fact into distinct durable child, leaving original untouched',()=>tdir(async root=>{
 const {e,cluster}=fixture(),store=new ReviewStore(root,scope.group);
 const pair=await store.createBundle(cluster,savedProposal(e,cluster));
 const accepted=pair.records.find(r=>r.state==='approved');
 const pending=pair.records.find(r=>r.state==='deferred');
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 const reserved=await store.reserveSiblingRetry(pending.id,pending.revision);
 assert.equal(reserved.reconsideration.status,'running');
 assert.equal(reserved.reconsideration.attempts,1);
 const result=validateAutonomousDecision(model([
  fact(e,statementB,{provisional:true})]),cluster);
 assert.equal(result.ok,true);
 const done=await store.finishSiblingRetry(pending.id,reserved.revision,result);
 assert.equal(done.status,'recovered');
 const recovered=await store.get(pending.id);
 assert.equal(recovered.state,'approved');assert.equal(recovered.facts.length,1);
 assert.equal(recovered.facts[0].assertion,statementB);
 assert.equal(recovered.retention.status,'provisional_retention');
 assert.equal(recovered.remote_episode_uuid,null);
 assert.equal(recovered.origin_cluster_id,accepted.origin_cluster_id);
 assert.equal((await store.get(accepted.id)).state,'approved');
 assert.equal((await store.get(accepted.id)).revision,1);
 assert.equal(await store.reserveSiblingRetry(recovered.id,recovered.revision),null);
 await store.restoreBundles();
 assert.equal((await store.get(recovered.id)).state,'approved');
 assert.equal((await store.list()).total,2);
}));
test('#107 bounded model-only retry exhausted after two failures, no remote intent',()=>tdir(async root=>{
 const {e,cluster}=fixture(),store=new ReviewStore(root,scope.group);
 const pair=await store.createBundle(cluster,savedProposal(e,cluster));
 const pending=pair.records.find(r=>r.state==='deferred');
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 const first=await store.reserveSiblingRetry(pending.id,pending.revision);
 const one=await store.finishSiblingRetry(pending.id,first.revision,
  null,{technicalFailure:true});
 assert.equal(one.status,'pending');
 const second=await new ReviewStore(root,scope.group).reserveSiblingRetry(pending.id,one.record.revision);
 assert.equal(second.reconsideration.attempts,2);
 const two=await store.finishSiblingRetry(pending.id,second.revision,
  null,{technicalFailure:true});
 assert.equal(two.status,'exhausted');
 assert.equal(two.record.state,'deferred');
 assert.equal(two.record.facts.length,0);
 assert.equal(two.record.remote_episode_uuid,null);
 assert.equal(await store.reserveSiblingRetry(pending.id,two.record.revision),null);
}));
test('#107 crash after reserved model-only retry permits one bounded recovery under EX',()=>tdir(async root=>{
 const {e,cluster}=fixture(),store=new ReviewStore(root,scope.group);
 const pair=await store.createBundle(cluster,savedProposal(e,cluster));
 const pending=pair.records.find(r=>r.state==='deferred');
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 const running=await store.reserveSiblingRetry(pending.id,pending.revision);
 await new ReviewStore(root,scope.group).restoreBundles();
 const second=await new ReviewStore(root,scope.group)
  .reserveSiblingRetry(running.id,running.revision);
 assert.equal(second.reconsideration.attempts,2);
 const result=validateAutonomousDecision(model([fact(e,statementB)]),cluster);
 assert.equal((await store.finishSiblingRetry(second.id,second.revision,result)).status,'recovered');
 assert.equal((await store.list()).total,2);
}));
test('#107 crash after final reserved attempt is durably exhausted on fresh EX',()=>tdir(async root=>{
 const {e,cluster}=fixture(),store=new ReviewStore(root,scope.group);
 const pair=await store.createBundle(cluster,savedProposal(e,cluster));
 const pending=pair.records.find(r=>r.state==='deferred');
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 const one=await store.reserveSiblingRetry(pending.id,pending.revision);
 const two=await new ReviewStore(root,scope.group)
   .reserveSiblingRetry(one.id,one.revision);
 assert.equal(two.reconsideration.attempts,2);
 const recovered=new ReviewStore(root,scope.group);
 assert.equal(await recovered.expireInterruptedSibling(two.id,two.revision),true);
 const final=await recovered.get(two.id);
 assert.equal(final.reconsideration.status,'exhausted');
 assert.equal(final.state,'deferred');
 assert.equal(final.remote_episode_uuid,null);
 assert.equal(await recovered.reserveSiblingRetry(final.id,final.revision),null);
 assert.equal((await recovered.list()).total,2);
}));
test('#107 rejected duplicate of accepted sibling never produces new approved child',()=>tdir(async root=>{
 const {e,cluster}=fixture(),store=new ReviewStore(root,scope.group);
 const pair=await store.createBundle(cluster,savedProposal(e,cluster));
 const pending=pair.records.find(r=>r.state==='deferred');
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 const reserved=await store.reserveSiblingRetry(pending.id,pending.revision);
 const duplicate=validateAutonomousDecision(model([fact(e,statementA)]),cluster);
 const outcome=await store.finishSiblingRetry(pending.id,reserved.revision,duplicate);
 assert.equal(outcome.status,'exhausted');
 assert.equal((await store.get(pending.id)).state,'deferred');
 assert.equal((await store.list()).total,2);
}));
test('#107 no sibling reservation without post-exit lease',()=>tdir(async root=>{
 const {e,cluster}=fixture(),store=new ReviewStore(root,scope.group);
 const pair=await store.createBundle(cluster,savedProposal(e,cluster));
 const pending=pair.records.find(r=>r.state==='deferred');
 delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 await assert.rejects(store.reserveSiblingRetry(pending.id,pending.revision),
  /EX_POST_EXIT_ADMISSION_REQUIRED/);
 assert.equal((await store.get(pending.id)).revision,1);
}));
test('#107 forged source / unsafe rationale never becomes a retryable child',()=>{
 const {e,cluster}=fixture();
 const spoof=validateAutonomousDecision(model([
  fact(e,statementA),{...fact(e,statementB,{valid:false}),
   source_refs:['opencode:foreign:message:fake']}]),cluster);
 assert.equal(spoof.ok,true);
 assert.equal(spoof.recoverable_siblings.length,0);
 const unsafe=validateAutonomousDecision(model([
  fact(e,statementA),{...fact(e,statementB),
    utility_reason:'secret: private_access_key'}]),cluster);
 assert.equal(unsafe.recoverable_siblings.length,0);
});
