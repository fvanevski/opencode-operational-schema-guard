import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {ReviewStore,selectClusters} from './core.mjs';
import {fromPrompt} from '../v2-candidate/events.mjs';
import {CandidateQueue} from '../v2-candidate/queue.mjs';
import {assessAcknowledgedRetry} from './acknowledged-retry.mjs';
import {promoteOne,reconcile,runAdmitted} from './worker.mjs';
const group='graphiti-curator-recovery-r02';
const scope={group,project:'test',workspace:'/workspace/test'};
const remoteUUID='5b7b50bd-1b42-472d-a2ae-482d6c1991d2';
const factUUID='d0addc0a-2c1e-45fe-a49c-4bc6d8d945ce';
const admitted=fn=>async()=>{
  const old=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
  try{return await fn();}
  finally{if(old===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
    else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=old;}
};
async function fixture(fn){
  const root=await mkdtemp(path.join(os.tmpdir(),'ack-orphan-'));
  try{
    const store=new ReviewStore(root,group),queue=new CandidateQueue(root,group);
    const event=fromPrompt({sessionID:'ses_recovery_orphan',messageID:'msg_orphan',
      prompt:{text:'Preserve source-backed historical latency evidence across the worker restart.'},
      timestamp:'2026-11-03T18:00:00Z'},scope,{admitted:true});
    const cluster=selectClusters([event])[0];
    const proposal={decision:'EMIT',reason:'Durable source-backed operational finding',
      facts:[{assertion:event.excerpt,kind:'observation',
        source_refs:event.source_refs,evidence_class:event.evidence_class,
        scope,observed_at:event.observed_at,temporal_status:'historical'}]};
    const {record}=await store.create(cluster,proposal);
    await store.advance(record.id,'approved','submission_unknown');
    await store.advance(record.id,'submission_unknown','queued');
    const queued=await store.get(record.id);
    const ack=queued.audit.find(x=>x.outcome==='queued').at;
    const evidence={kind:'acknowledged_graphiti_orphaned_task',
      identity_binding:'anonymous_group_fifo_inference',
      acknowledged_submission:true,prior_process_retired:true,
      partial_effect_risk_acknowledged:true,
      journal_sha256:'a'.repeat(64),diagnostic_manifest_sha256:'b'.repeat(64),
      original_ack_at:ack,
      process_retired_at:new Date(Date.parse(ack)+5000).toISOString(),
      observed_at:new Date(Date.parse(ack)+10000).toISOString(),
      prior_backend_pid:123456,current_backend_pid:123457};
    const mock={calls:[],episodes:[],async call(name,args){
      this.calls.push(name);
      if(name==='get_episodes')return {episodes:this.episodes};
      if(name==='search_memory_facts')return {facts:[]};
      if(name==='add_memory')return {queued:true};
      throw Error('unexpected:'+name);
    }};
    return await fn({root,store,queue,event,record:queued,evidence,mock});
  }finally{await rm(root,{recursive:true,force:true});}
}
test('one acknowledged submission is never misclassified as never-submitted or ordinarily approved',admitted(()=>fixture(async s=>{
  await assert.rejects(s.store.reconcileNeverSubmitted(s.record.id,3,{
    kind:'pre_exit_local_staging_no_remote_call',operator_attested:true,
    staging_proven:true,remote_readback_zero_episodes:true,evidence_sha256:'c'.repeat(64),
    staging_at:s.record.audit.find(x=>x.outcome==='submission_unknown').at,
    observed_at:s.evidence.observed_at
  }),/NEVER_SUBMITTED_REQUIRES/);
  await assert.rejects(s.store.advance(s.record.id,'queued','approved'),/Illegal remote state transition/);
  assert.equal((await s.store.get(s.record.id)).state,'queued');
})));
test('remote inventory and source-index checks precede any operator action',admitted(()=>fixture(async s=>{
  s.mock.episodes=[{group_id:group,name:'curated-v1:'+s.record.id,uuid:remoteUUID}];
  await assert.rejects(assessAcknowledgedRetry({store:s.store,graphiti:s.mock,root:s.root,
    group,reviewId:s.record.id,expectedRevision:3,evidence:s.evidence}),
    /REMOTE_TARGET_ALREADY_PRESENT/);
  s.mock.episodes=[{group_id:'other',name:'curated-v1:other',uuid:remoteUUID}];
  await assert.rejects(assessAcknowledgedRetry({store:s.store,graphiti:s.mock,root:s.root,
    group,reviewId:s.record.id,expectedRevision:3,evidence:s.evidence}),
    /REMOTE_INVENTORY_UNVERIFIABLE/);
  assert.equal((await s.store.get(s.record.id)).revision,3);
  assert.deepEqual(s.mock.calls,['get_episodes','get_episodes']);
})));
test('dry run has zero writes; operator applies exactly one distinct retry authorization',admitted(()=>fixture(async s=>{
  const arg={store:s.store,graphiti:s.mock,root:s.root,group,
    reviewId:s.record.id,expectedRevision:3,evidence:s.evidence};
  const before=await readFile(s.store.filename(s.record.id),'utf8');
  const plan=await assessAcknowledgedRetry(arg);
  assert.equal(plan.status,'DRY_RUN_READY');
  assert.equal(await readFile(s.store.filename(s.record.id),'utf8'),before);
  await assert.rejects(assessAcknowledgedRetry({...arg,apply:true}),/ATTESTATION_REQUIRED/);
  await assert.rejects(assessAcknowledgedRetry({...arg,apply:true,
    attest:true,acknowledgePartialEffects:true,expectedRemoteSha:'e'.repeat(64)}),
    /ATTESTATION_REQUIRED/);
  const applied=await assessAcknowledgedRetry({...arg,apply:true,
    attest:true,acknowledgePartialEffects:true,
    expectedRemoteSha:plan.remote_inventory_sha256});
  assert.equal(applied.status,'ONE_ACKNOWLEDGED_RETRY_AUTHORIZED');
  const after=await s.store.get(s.record.id);
  assert.equal(after.state,'retry_authorized');
  assert.equal(after.revision,4);
  assert.equal(after.orphaned_retry_evidence.retry_used_at,null);
  assert.equal(after.orphaned_retry_evidence.original_ack_at,s.evidence.original_ack_at);
  assert.deepEqual(after.source_event_ids,s.record.source_event_ids);
  assert.deepEqual(after.events,s.record.events);
  assert.deepEqual(after.facts,s.record.facts);
  assert.equal(s.mock.calls.includes('add_memory'),false);
  await assert.rejects(assessAcknowledgedRetry({...arg,apply:true,attest:true,
    acknowledgePartialEffects:true,expectedRemoteSha:plan.remote_inventory_sha256}),
    /STATE_OR_REVISION_STALE/);
})));
test('only EX-admitted worker spends authorization before one second remote attempt',admitted(()=>fixture(async s=>{
  const arg={store:s.store,graphiti:s.mock,root:s.root,group,
    reviewId:s.record.id,expectedRevision:3,evidence:s.evidence};
  const dry=await assessAcknowledgedRetry(arg);
  await assessAcknowledgedRetry({...arg,apply:true,attest:true,
    acknowledgePartialEffects:true,expectedRemoteSha:dry.remote_inventory_sha256});
  let count=0;
  s.mock.call=async function(name,args){
    this.calls.push(name);
    if(name==='get_episodes')return {episodes:this.episodes};
    if(name==='search_memory_facts')return {facts:[]};
    if(name==='add_memory'){
      count++;
      const staged=await s.store.get(s.record.id);
      assert.equal(staged.state,'submission_unknown');
      assert.equal(staged.orphaned_retry_evidence.retry_used_at!==null,true);
      assert.equal(args.name,'curated-v1:'+s.record.id);
      this.episodes.push({group_id:group,name:args.name,uuid:factUUID});
      return {queued:true};
    }
    throw Error(name);
  };
  const outcome=await promoteOne(s.store,await s.store.get(s.record.id),s.mock);
  assert.equal(outcome.status,'queued');
  assert.equal(count,1);
  assert.equal((await s.store.get(s.record.id)).state,'queued');
  assert.deepEqual(await reconcile(s.store,s.mock),{persisted:1,unresolved:0});
  const done=await s.store.get(s.record.id);
  assert.equal(done.state,'persisted');
  assert.equal(done.remote_episode_uuid,factUUID);
  assert.equal((await readFile(path.join(s.root,'curation-v1',group,
    '_episode-index',factUUID+'.json'),'utf8')).includes(s.record.id),true);
  assert.equal((await promoteOne(s.store,done,s.mock)).status,'not_approved');
  assert.equal(count,1);
})));
test('ambiguous retry acknowledgment remains submission_unknown and cannot auto-repeat',admitted(()=>fixture(async s=>{
  const arg={store:s.store,graphiti:s.mock,root:s.root,group,
    reviewId:s.record.id,expectedRevision:3,evidence:s.evidence};
  const dry=await assessAcknowledgedRetry(arg);
  await assessAcknowledgedRetry({...arg,apply:true,attest:true,
    acknowledgePartialEffects:true,expectedRemoteSha:dry.remote_inventory_sha256});
  let writes=0;
  s.mock.call=async function(name,args){
    this.calls.push(name);
    if(name==='get_episodes')return {episodes:[]};
    if(name==='search_memory_facts')return {facts:[]};
    if(name==='add_memory'){writes++;throw Error('ACK_TIMEOUT');}
    throw Error(name);
  };
  assert.equal((await promoteOne(s.store,await s.store.get(s.record.id),s.mock)).status,'submission_unknown');
  assert.equal(writes,1);
  assert.equal((await s.store.get(s.record.id)).orphaned_retry_evidence.retry_used_at!==null,true);
  const later=await runAdmitted({root:s.root,group,queue:s.queue,store:s.store,
    graphiti:s.mock,curate:async()=>{throw Error('must not curate');},
    maxSeconds:8,maxClusters:2});
  assert.equal(later.status,'unresolved');
  assert.equal(writes,1);
})));
test('remote episode appearing after authorization blocks retry before durable intent',admitted(()=>fixture(async s=>{
  const arg={store:s.store,graphiti:s.mock,root:s.root,group,
    reviewId:s.record.id,expectedRevision:3,evidence:s.evidence};
  const dry=await assessAcknowledgedRetry(arg);
  await assessAcknowledgedRetry({...arg,apply:true,attest:true,
    acknowledgePartialEffects:true,expectedRemoteSha:dry.remote_inventory_sha256});
  s.mock.episodes.push({group_id:group,name:'curated-v1:'+s.record.id,uuid:remoteUUID});
  const outcome=await promoteOne(s.store,await s.store.get(s.record.id),s.mock);
  assert.equal(outcome.status,'recovery_preflight_blocked');
  assert.equal((await s.store.get(s.record.id)).state,'retry_authorized');
  assert.equal(s.mock.calls.includes('add_memory'),false);
})));
test('no EX admission and stale record CAS reject direct remote retry',admitted(()=>fixture(async s=>{
  const arg={store:s.store,graphiti:s.mock,root:s.root,group,
    reviewId:s.record.id,expectedRevision:3,evidence:s.evidence};
  const dry=await assessAcknowledgedRetry(arg);
  await assessAcknowledgedRetry({...arg,apply:true,attest:true,
    acknowledgePartialEffects:true,expectedRemoteSha:dry.remote_inventory_sha256});
  await assert.rejects(s.store.authorizeOrphanedRetry(s.record.id,3,
    {...s.evidence,remote_inventory_sha256:dry.remote_inventory_sha256,
      operator_attested:true}),/STALE_REVIEW_REVISION/);
  const saved=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  try{
    await assert.rejects(promoteOne(s.store,await s.store.get(s.record.id),s.mock),
      /EX_POST_EXIT_ADMISSION_REQUIRED/);
  }finally{process.env.GHDEV_MEMORY_POST_EXIT_LEASE=saved;}
  assert.equal((await s.store.get(s.record.id)).state,'retry_authorized');
  assert.equal(s.mock.calls.includes('add_memory'),false);
})));
test('recovered record survives normal admitted drain without new curator inference',admitted(()=>fixture(async s=>{
  const arg={store:s.store,graphiti:s.mock,root:s.root,group,
    reviewId:s.record.id,expectedRevision:3,evidence:s.evidence};
  const dry=await assessAcknowledgedRetry(arg);
  await assessAcknowledgedRetry({...arg,apply:true,attest:true,
    acknowledgePartialEffects:true,expectedRemoteSha:dry.remote_inventory_sha256});
  let calls=0;
  s.mock.call=async function(name,args){
    if(name==='get_episodes')return {episodes:this.episodes};
    if(name==='search_memory_facts')return {facts:[]};
    if(name==='add_memory'){
      calls++;this.episodes.push({uuid:factUUID,group_id:group,name:args.name});
      return {queued:true};
    }
    throw Error(name);
  };
  const r=await runAdmitted({root:s.root,group,queue:s.queue,store:s.store,
    graphiti:s.mock,curate:async()=>{throw Error('unexpected inference');},
    maxSeconds:10,maxClusters:1});
  assert.equal(r.status,'settled');
  assert.equal(calls,1);
  assert.equal((await s.store.get(s.record.id)).state,'persisted');
})));

test('late positive readback settles authorized review without spending retry or add_memory',admitted(()=>fixture(async s=>{
  const arg={store:s.store,graphiti:s.mock,root:s.root,group,
    reviewId:s.record.id,expectedRevision:3,evidence:s.evidence};
  const dry=await assessAcknowledgedRetry(arg);
  await assessAcknowledgedRetry({...arg,apply:true,attest:true,
    acknowledgePartialEffects:true,expectedRemoteSha:dry.remote_inventory_sha256});
  assert.deepEqual(await reconcile(s.store,s.mock),{persisted:0,unresolved:0});
  s.mock.episodes.push({group_id:group,name:'curated-v1:'+s.record.id,uuid:remoteUUID});
  assert.deepEqual(await reconcile(s.store,s.mock),{persisted:1,unresolved:0});
  const row=await s.store.get(s.record.id);
  assert.equal(row.state,'persisted');
  assert.equal(row.orphaned_retry_evidence.retry_used_at,null);
  assert.equal(row.audit.at(-1).action,'acknowledged_retry_remote_preexisting');
  assert.equal(s.mock.calls.includes('add_memory'),false);
})));

test('ordinary review actions cannot bypass acknowledged one-use retry authority',admitted(()=>fixture(async s=>{
  const arg={store:s.store,graphiti:s.mock,root:s.root,group,
    reviewId:s.record.id,expectedRevision:3,evidence:s.evidence};
  const dry=await assessAcknowledgedRetry(arg);
  await assessAcknowledgedRetry({...arg,apply:true,attest:true,
    acknowledgePartialEffects:true,expectedRemoteSha:dry.remote_inventory_sha256});
  const original=await s.store.get(s.record.id);
  for(const action of ['approve','edit-and-approve','discard','defer','reevaluate']){
    await assert.rejects(s.store.change(s.record.id,original.revision,action,{
      reason:'No alternate authority',facts:original.facts}),/REMOTE_WRITE_ALREADY_POSSIBLE/);
  }
  assert.equal((await s.store.get(s.record.id)).state,'retry_authorized');
})));
test('never-submitted adjudicator cannot reset a spent, acknowledged retry after a timeout',admitted(()=>fixture(async s=>{
  const arg={store:s.store,graphiti:s.mock,root:s.root,group,
    reviewId:s.record.id,expectedRevision:3,evidence:s.evidence};
  const dry=await assessAcknowledgedRetry(arg);
  await assessAcknowledgedRetry({...arg,apply:true,attest:true,
    acknowledgePartialEffects:true,expectedRemoteSha:dry.remote_inventory_sha256});
  await s.store.advance(s.record.id,'retry_authorized','submission_unknown',
    {expected_revision:4});
  const spent=await s.store.get(s.record.id);
  const initialStaging=spent.audit.find(a=>a.action==='state'&&a.outcome==='submission_unknown').at;
  await assert.rejects(s.store.reconcileNeverSubmitted(s.record.id,spent.revision,{
    kind:'pre_exit_local_staging_no_remote_call',operator_attested:true,
    staging_proven:true,remote_readback_zero_episodes:true,
    evidence_sha256:'c'.repeat(64),staging_at:initialStaging,
    observed_at:s.evidence.observed_at
  }),/NEVER_SUBMITTED_HAS_PRIOR_REMOTE_ACK_OR_RETRY/);
  const afterwards=await s.store.get(s.record.id);
  assert.equal(afterwards.state,'submission_unknown');
  assert.equal(afterwards.orphaned_retry_evidence.retry_used_at!==null,true);
  await assert.rejects(s.store.advance(s.record.id,'submission_unknown','approved'),
    /Illegal remote state transition/);
})));

test('malformed remote episode identity fails closed before second add_memory',admitted(()=>fixture(async s=>{
  const arg={store:s.store,graphiti:s.mock,root:s.root,group,
    reviewId:s.record.id,expectedRevision:3,evidence:s.evidence};
  const dry=await assessAcknowledgedRetry(arg);
  await assessAcknowledgedRetry({...arg,apply:true,attest:true,
    acknowledgePartialEffects:true,expectedRemoteSha:dry.remote_inventory_sha256});
  const malformed=[
    {group_id:group,uuid:remoteUUID},
    {group_id:group,name:'unrelated'},
    {group_id:group,name:'unrelated',uuid:'not-a-uuid'},
    {group_id:group,name:'',uuid:remoteUUID},
    {group_id:'foreign',name:'unrelated',uuid:remoteUUID}
  ];
  for(const entry of malformed){
    s.mock.episodes=[entry];
    const out=await promoteOne(s.store,await s.store.get(s.record.id),s.mock);
    assert.equal(out.status,'recovery_preflight_blocked',JSON.stringify(entry));
    assert.equal((await s.store.get(s.record.id)).state,'retry_authorized');
    assert.equal(s.mock.calls.includes('add_memory'),false);
  }
})));
