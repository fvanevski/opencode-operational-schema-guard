import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {ReviewStore,selectClusters} from './core.mjs';
import {CandidateQueue} from '../v2-candidate/queue.mjs';
import {fromPrompt} from '../v2-candidate/events.mjs';
import {assessQueueLog,assessOperatorRecovery,assessNeverSubmittedRecovery} from './terminal-recovery.mjs';
const group='graphiti-curator-recovery-r01',rootScope={group,project:'test',workspace:'/workspace/test'};
const successUUID='26299f65-f48c-45c1-abf0-9c7d521b1a03';
function log(extra=''){
 return [
 '2026-11-03T14:20:01-08:00 [graphiti:stderr] services.queue_service - INFO - Processing episode None for group '+group,
 '2026-11-03T14:31:31-08:00 [graphiti:stderr] services.queue_service - ERROR - Failed to process episode None for group '+group+': Expecting value: line 1 column 1 (char 0)',
 '2026-11-03T14:31:31-08:00 [graphiti:stderr] services.queue_service - INFO - Processing episode None for group '+group,
 '2026-11-03T14:31:39-08:00 [graphiti:stderr] services.queue_service - INFO - Successfully processed episode None for group '+group,
 extra].join('\n');
}
test('anonymous chronological evidence is explicitly inference, not UUID-level proof',()=>{
 const x=assessQueueLog(log(),group);
 assert.equal(x.processing_starts,2);
 assert.equal(x.identity_binding,'anonymous_group_fifo_inference');
 assert.match(x.journal_sha256,/^[a-f0-9]{64}$/);
 assert.throws(()=>assessQueueLog(log('2026-11-03T14:32:00-08:00 services.queue_service - INFO - Processing episode None for group '+group),group),/NOT_PROVEN/);
 assert.throws(()=>assessQueueLog(log().replace('Successfully processed','Failed to process'),group),/NOT_PROVEN/);
});
async function setup(fn){
 const root=await mkdtemp(path.join(os.tmpdir(),'graphiti-recovery-'));
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const store=new ReviewStore(root,group),queue=new CandidateQueue(root,group);
  let ix=0;
  async function create(origin){
   const event=fromPrompt({sessionID:'ses_recovery'+ix,messageID:'msg_recovery'+ix,
    prompt:{text:'Keep the observed median behavior and preserve the existing command line interface during fixes.'},
    timestamp:'2026-11-03T18:00:00Z'},rootScope,{admitted:true});
   ix++;
   const c=selectClusters([event])[0];
   const {record}=await store.create(c,{decision:'EMIT',reason:'Grounded intent',
     facts:[{assertion:event.excerpt,kind:'decision',source_refs:event.source_refs,
       evidence_class:event.evidence_class,scope:rootScope,observed_at:event.observed_at,
       temporal_status:'observed'}]},{origin});
   await store.advance(record.id,'approved','submission_unknown');
   await store.advance(record.id,'submission_unknown','queued');
   return await store.get(record.id);
  }
  const failed=await create('qualification_operator_seed');
  const success=await create('curated');
  const graphiti={calls:[],async call(tool,args){
   this.calls.push(tool);assert.equal(tool,'get_episodes');
   assert.deepEqual(args,{group_ids:[group],max_episodes:1000});
   return {episodes:[{uuid:successUUID,group_id:group,name:'curated-v1:'+success.id}]};
  }};
  try{
  return await fn({root,store,queue,graphiti,failed,success});
 }finally{delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;}
 } finally {await rm(root,{recursive:true,force:true});}
}
test('dry run never mutates review, requires attestation for apply, and never calls add_memory',()=>setup(async s=>{
 const args={...s,group,failedId:s.failed.id,successId:s.success.id,
  failedRevision:s.failed.revision,successRevision:s.success.revision,successUUID,journal:log()};
 const dry=await assessOperatorRecovery(args);
 assert.equal(dry.status,'READY_FOR_OPERATOR_ATTESTATION');
 assert.equal((await s.store.get(s.failed.id)).state,'queued');
 assert.equal((await s.store.get(s.success.id)).state,'queued');
 await assert.rejects(assessOperatorRecovery({...args,apply:true}),/ACK_ANONYMOUS/);
 assert.deepEqual(s.graphiti.calls,['get_episodes','get_episodes']);
}));
test('explicit source-bound recovery persists true success, records failure without replay',()=>setup(async s=>{
 const args={...s,group,failedId:s.failed.id,successId:s.success.id,
  failedRevision:s.failed.revision,successRevision:s.success.revision,successUUID,
  journal:log(),apply:true,acknowledgeAnonymousOrder:true};
 const actual=await assessOperatorRecovery(args);
 assert.equal(actual.status,'RECOVERED_WITH_ATTESTED_FAILURE');
 assert.equal((await s.store.get(s.failed.id)).state,'failed_extraction');
 assert.equal((await s.store.get(s.success.id)).state,'persisted');
 assert.equal(actual.success_source_index_confirmed,true);
 assert.deepEqual(s.graphiti.calls,['get_episodes']);
 await assert.rejects(assessOperatorRecovery(args),/QUALIFICATION_REVIEW/);
}));
test('remote mismatch cannot mutate local records',()=>setup(async s=>{
 const args={...s,group,failedId:s.failed.id,successId:s.success.id,
  failedRevision:s.failed.revision,successRevision:s.success.revision,successUUID,
  journal:log(),apply:true,acknowledgeAnonymousOrder:true};
 s.graphiti.call=async()=>({episodes:[]});
 await assert.rejects(assessOperatorRecovery(args),/REMOTE_GROUP_IDENTITY_UNEXPECTED/);
 assert.equal((await s.store.get(s.failed.id)).state,'queued');
 assert.equal((await s.store.get(s.success.id)).state,'queued');
}));

function neverEvidence(stagingAt){
 return {kind:'pre_exit_local_staging_no_remote_call',operator_attested:true,
  staging_proven:true,remote_readback_zero_episodes:true,
  evidence_sha256:'c'.repeat(64),staging_at:stagingAt,
  observed_at:'2026-11-03T23:59:00.000Z'};
}
function stagingAtOf(record){
 return record.audit.find(a=>a.action==='state'&&a.outcome==='submission_unknown').at;
}
async function setupNeverSubmitted(fn){
 const root=await mkdtemp(path.join(os.tmpdir(),'graphiti-recovery-ns-'));
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const store=new ReviewStore(root,group);
  const event=fromPrompt({sessionID:'ses_ns',messageID:'msg_ns',
   prompt:{text:'Keep the observed median behavior and preserve the existing command line interface during fixes.'},
   timestamp:'2026-11-03T18:00:00Z'},rootScope,{admitted:true});
  const c=selectClusters([event])[0];
  const {record}=await store.create(c,{decision:'EMIT',reason:'Grounded intent',
   facts:[{assertion:event.excerpt,kind:'decision',source_refs:event.source_refs,
    evidence_class:event.evidence_class,scope:rootScope,observed_at:event.observed_at,
    temporal_status:'observed'}]},{origin:'qualification_operator_seed'});
  const deferred=await store.change(record.id,record.revision,'edit-and-approve',
   {reason:'Exact source checked',facts:record.facts});
  await store.advance(deferred.id,'approved','submission_unknown');
  const staged=await store.get(record.id);
  const graphiti={calls:[],async call(tool,args){
   this.calls.push(tool);assert.equal(tool,'get_episodes');
   assert.deepEqual(args,{group_ids:[group],max_episodes:1000});
   return {episodes:[]};
  }};
  return await fn({root,store,graphiti,record:staged});
 }finally{
  delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  await rm(root,{recursive:true,force:true});
 }
}
test('never-submitted staging reconciles to approved only with exact scope, zero-episode readback and attestation',()=>setupNeverSubmitted(async s=>{
 const evidence=neverEvidence(stagingAtOf(s.record));
 const dry=await assessNeverSubmittedRecovery({store:s.store,graphiti:s.graphiti,group,
  reviewId:s.record.id,expectedRevision:s.record.revision,evidence});
 assert.equal(dry.status,'READY_FOR_OPERATOR_ATTESTATION');
 assert.equal(dry.remote_episode_count,0);
 assert.equal((await s.store.get(s.record.id)).state,'submission_unknown');
 await assert.rejects(assessNeverSubmittedRecovery({store:s.store,graphiti:s.graphiti,group,
  reviewId:s.record.id,expectedRevision:s.record.revision,evidence,apply:true}),
  /NO_REMOTE_CALL_ATTESTATION/);
 const applied=await assessNeverSubmittedRecovery({store:s.store,graphiti:s.graphiti,group,
  reviewId:s.record.id,expectedRevision:s.record.revision,evidence,apply:true,
  attestNoRemoteCall:true});
 assert.equal(applied.status,'RECOVERED_NEVER_SUBMITTED');
 const restored=await s.store.get(s.record.id);
 assert.equal(restored.state,'approved');
 assert.equal(restored.never_submitted_evidence.staging_at,stagingAtOf(s.record));
 assert.equal(restored.audit.at(-1).action,'operator_attested_never_submitted');
 // The restored record is eligible for a genuine first submission, not a replay.
 assert.equal(restored.remote_episode_uuid,null);
}));
test('never-submitted adjudication rejects present remote episodes, stale revisions and audit mismatch',()=>setupNeverSubmitted(async s=>{
 const evidence=neverEvidence(stagingAtOf(s.record));
 s.graphiti.call=async()=>({episodes:[{uuid:'00000000-0000-4000-a000-000000000000',
  group_id:group,name:'curated-v1:'+s.record.id}]});
 await assert.rejects(assessNeverSubmittedRecovery({store:s.store,graphiti:s.graphiti,group,
  reviewId:s.record.id,expectedRevision:s.record.revision,evidence}),
  /REMOTE_GROUP_EPISODES_PRESENT/);
 s.graphiti.call=async()=>({episodes:[]});
 await assert.rejects(assessNeverSubmittedRecovery({store:s.store,graphiti:s.graphiti,group,
  reviewId:s.record.id,expectedRevision:s.record.revision+1,evidence}),
  /NEVER_SUBMITTED_REVIEW_IDENTITY_NOT_PROVEN/);
 await assert.rejects(assessNeverSubmittedRecovery({store:s.store,graphiti:s.graphiti,group,
  reviewId:s.record.id,expectedRevision:s.record.revision,
  evidence:{...evidence,staging_at:'2026-11-03T00:00:00.000Z'},apply:true,
  attestNoRemoteCall:true}),/STAGING_AUDIT_MISMATCH/);
 await assert.rejects(s.store.reconcileNeverSubmitted(s.record.id,s.record.revision,
  {...evidence,operator_attested:false}),/INVALID_NEVER_SUBMITTED_EVIDENCE/);
 assert.equal((await s.store.get(s.record.id)).state,'submission_unknown');
}));

test('legacy recovery remains accepted, while new non-recovery or production groups stay denied',()=>{
 const old='cur80_qualtest';
 const legacyLog=log().replaceAll(group,old);
 assert.equal(assessQueueLog(legacyLog,old).processing_starts,2);
 assert.throws(()=>assessQueueLog(log(),'graphiti-cron-holdout-r01'),/INVALID_QUEUE_LOG_INPUT/);
 assert.throws(()=>assessQueueLog(log(),'ghdev_gh_mcp'),/INVALID_QUEUE_LOG_INPUT/);
});
