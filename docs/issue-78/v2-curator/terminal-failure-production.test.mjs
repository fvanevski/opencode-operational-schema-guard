import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {assessProductionTerminalFailure,verifySixTaskJournal} from './terminal-failure-production.mjs';

const group='ghdev_gh_mcp';
const ids='abcdef'.split('').map(x=>x.repeat(64));
const uuids=[1,2,3,4,6].map(x=>'00000000-0000-4000-8000-'+String(x).padStart(12,'0'));
const ackTimes=[
 '2026-11-05T18:47:57.715Z','2026-11-05T18:47:57.875Z',
 '2026-11-05T18:47:58.052Z','2026-11-05T18:47:58.214Z',
 '2026-11-05T18:47:58.346Z','2026-11-05T18:47:58.478Z'
];
const starts=[
 '2026-11-05T18:47:57.713Z','2026-11-05T18:48:36.206Z',
 '2026-11-05T18:51:04.778Z','2026-11-05T18:51:23.664Z',
 '2026-11-05T18:52:06.121Z','2026-11-05T19:02:56.042Z'
];
const ends=[
 '2026-11-05T18:48:36.206Z','2026-11-05T18:51:04.778Z',
 '2026-11-05T18:51:23.664Z','2026-11-05T18:52:06.121Z',
 '2026-11-05T19:02:56.042Z','2026-11-05T19:09:26.212Z'
];
function journal(){
 const lines=[];
 for(let i=0;i<6;i++){
  lines.push(starts[i]+' mcp-mux [graphiti:stderr] services.queue_service - INFO - Processing episode None for group '+group);
  lines.push(ends[i]+' mcp-mux [graphiti:stderr] services.queue_service - '+(
    i===4?'ERROR - Failed to process episode None for group '+group+': Expecting value: line 1 column 1 (char 0)':
    'INFO - Successfully processed episode None for group '+group));
 }
 return lines.join('\n')+'\n';
}
function evidence(j){
 return {kind:'graphiti_async_processing_failure',
  identity_binding:'anonymous_group_fifo_inference',
  journal_sha256:createHash('sha256').update(j).digest('hex'),
  window_start_at:'2026-11-05T18:47:57Z',
  window_end_at:'2026-11-05T19:10:30Z',
  failed_at:'2026-11-05T19:02:56.042Z',
  ordered_review_ids:ids,success_review_id:ids[5],
  other_success_episode_uuid:uuids[4],source_event_count:8,
  serial_fifo_verified:true,other_group_interleaving_excluded:true,
  error_code:'graphiti_json_decode_error',
  reason:'Fifth FIFO task failed JSON decode; sixth succeeded. No replay authorized.'};
}
function records(){
 return ids.map((id,i)=>({id,group,revision:i===4?3:4,
  state:i===4?'queued':'persisted',
  remote_episode_uuid:i===4?null:uuids[i<4?i:4],
  facts:[{assertion:'Testing fact'}],
  source_event_ids:Array.from({length:8},(_,n)=>id+':'+n),
  audit:[{action:'state',outcome:'queued',at:ackTimes[i]}]}));
}
async function withFixture(fn){
 const root=await mkdtemp(path.join(os.tmpdir(),'graphiti-prod-terminal-'));
 try{
  const reviewRecords=records(),remote=reviewRecords.filter(x=>x.state==='persisted')
    .map(r=>({uuid:r.remote_episode_uuid,name:'curated-v1:'+r.id,group_id:group}));
  const indexPath=path.join(root,'curation-v1',group,'_episode-index');
  await mkdir(indexPath,{recursive:true});
  for(const r of reviewRecords.filter(x=>x.state==='persisted'))
   await writeFile(path.join(indexPath,r.remote_episode_uuid+'.json'),
     JSON.stringify({id:r.id,remote_episode_uuid:r.remote_episode_uuid}));
  const store={
   group,records:reviewRecords,applies:0,
   async list({offset,limit}){return {items:this.records.slice(offset,offset+limit),
     total:this.records.length,has_more:offset+limit<this.records.length};},
   async markExtractionFailure(id,rev,e){
    this.applies++;
    const record=this.records.find(r=>r.id===id);
    if(record.revision!==rev||record.state!=='queued')throw Error('STALE');
    record.state='failed_extraction';record.revision++;
    record.failure_evidence=e;
    return {...record};
   }
  };
  const graphiti={calls:[],async call(tool,args){
   this.calls.push(tool);
   assert.equal(tool,'get_episodes');
   assert.deepEqual(args,{group_ids:[group],max_episodes:1000});
   return {episodes:remote};
  }};
  const j=journal(),e=evidence(j);
  return await fn({root,store,graphiti,j,e,remote});
 }finally{await rm(root,{recursive:true,force:true});}
}
function request(x,more={}){
 return {store:x.store,graphiti:x.graphiti,root:x.root,group,
  reviewId:ids[4],expectedRevision:3,evidence:x.e,journal:x.j,...more};
}
test('exact six-task FIFO journal establishes fifth failure without claiming UUID-level proof',()=>{
 const r=verifySixTaskJournal(journal(),group,'2026-11-05T18:47:57Z',
  '2026-11-05T19:10:30Z','2026-11-05T19:02:56.042Z');
 assert.equal(r.task_count,6);assert.equal(r.failed_position,5);
 assert.equal(r.success_count,5);
 assert.throws(()=>verifySixTaskJournal(journal().replace(
  'ERROR - Failed to process','INFO - Successfully processed'),
  group,'2026-11-05T18:47:57Z','2026-11-05T19:10:30Z',
  '2026-11-05T19:02:56.042Z'),/SIX_COMPLETE_TASKS|FIFO_LIFECYCLE/);
 assert.throws(()=>verifySixTaskJournal(journal()+
  '2026-11-05T19:05:00Z services.queue_service - INFO - Processing episode None for group '+group,
  group,'2026-11-05T18:47:57Z','2026-11-05T19:10:30Z',
  '2026-11-05T19:02:56.042Z'),/SIX_COMPLETE_TASKS/);
});
test('dry-run checks every persisted source index and performs no local or remote mutation',()=>withFixture(async x=>{
 const r=await assessProductionTerminalFailure(request(x));
 assert.equal(r.status,'TERMINAL_FAILURE_DRY_RUN_READY');
 assert.equal(r.source_event_count,8);
 assert.equal(r.persisted_review_count,5);
 assert.equal(r.partial_graph_effect_risk,'NOT_EXCLUDED');
 assert.equal(x.store.applies,0);
 assert.deepEqual(x.graphiti.calls,['get_episodes']);
}));
test('explicit one-use CAS requires fresh inventory fingerprint and dual operator attestation',()=>withFixture(async x=>{
 const plan=await assessProductionTerminalFailure(request(x));
 await assert.rejects(assessProductionTerminalFailure(request(x,{apply:true,
  expectedRemoteSha:plan.remote_inventory_sha256,acknowledgeFifo:true})),/ATTESTATION_REQUIRED/);
 assert.equal(x.store.applies,0);
 const after=await assessProductionTerminalFailure(request(x,{apply:true,
  expectedRemoteSha:plan.remote_inventory_sha256,acknowledgeFifo:true,
  acknowledgePartialEffects:true}));
 assert.equal(after.status,'TERMINAL_FAILURE_RECORDED');
 assert.equal(after.new_revision,4);
 assert.equal(x.store.applies,1);
 assert.equal(x.store.records[4].failure_evidence.operator_attested,true);
 assert.deepEqual(x.graphiti.calls,['get_episodes','get_episodes','get_episodes']);
 await assert.rejects(assessProductionTerminalFailure(request(x,{apply:true,
  expectedRemoteSha:plan.remote_inventory_sha256,acknowledgeFifo:true,
  acknowledgePartialEffects:true})),/STATE_OR_REVISION_STALE/);
 assert.equal(x.store.applies,1);
}));
test('fail closed on evidence tampering, remote drift, missing index, and wrong group',()=>withFixture(async x=>{
 await assert.rejects(assessProductionTerminalFailure(request(x,{journal:x.j+'extra'})),/DIGEST_MISMATCH/);
 const badEvidence={...x.e,ordered_review_ids:[...ids].reverse()};
 await assert.rejects(assessProductionTerminalFailure(request(x,{evidence:badEvidence})),/EVIDENCE_INVALID/);
 x.remote.push({uuid:'00000000-0000-4000-8000-000000000009',name:'curated-v1:'+ids[4],group_id:group});
 await assert.rejects(assessProductionTerminalFailure(request(x)),/TARGET_REMOTE_EPISODE_PRESENT/);
 x.remote.pop();
 x.remote[0].group_id='other-group';
 await assert.rejects(assessProductionTerminalFailure(request(x)),/INVENTORY_UNVERIFIABLE/);
 x.remote[0].group_id=group;
 await assert.rejects(assessProductionTerminalFailure(request(x,{group:'development-knowledge'})),/SCOPE_INVALID/);
 assert.equal(x.store.applies,0);
}));
