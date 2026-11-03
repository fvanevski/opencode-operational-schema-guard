import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {ReviewStore,selectClusters} from './core.mjs';
import {CandidateQueue} from '../v2-candidate/queue.mjs';
import {fromPrompt} from '../v2-candidate/events.mjs';
import {assessQueueLog,assessOperatorRecovery} from './terminal-recovery.mjs';
const group='cur80_qualtest',rootScope={group,project:'test',workspace:'/workspace/test'};
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
 const root=await mkdtemp(path.join(os.tmpdir(),'cur80-recovery-'));
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
  return await fn({root,store,queue,graphiti,failed,success});
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
