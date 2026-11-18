import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fromPrompt} from '../issue-78/v2-candidate/events.mjs';
import {ReviewStore,selectClusters,nativeFactOrigin} from '../issue-78/v2-curator/core.mjs';
import {promoteOne} from '../issue-78/v2-curator/worker.mjs';
const scope={group:'cor107',project:'gh_mcp',workspace:'/workspace/gh_mcp'};
const quote='The versioned source index must retain its original native reference before the next Graphiti review.';
const uuid='b2345678-1111-4111-a111-222222222222';
const tmp=async fn=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'corroboration107-'));
 const old=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{return await fn(root);}
 finally{
   if(old===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
   else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=old;
   await rm(root,{recursive:true,force:true});
 }
};
function occurrence(session,messageID,project=scope.project){
 const s={...scope,project};
 return fromPrompt({sessionID:session,messageID,prompt:{text:quote},
   timestamp:'2026-11-18T11:00:00Z'},s,{admitted:true});
}
function candidate(e){
 const c=selectClusters([e],{sourceMessageIsolation:true})[0];
 const fact={assertion:e.excerpt,kind:'architecture',
  evidence_class:e.evidence_class,
  scope:{group:e.group,project:e.project,workspace:e.workspace},
  observed_at:e.observed_at,temporal_status:'observed',
  source_refs:[e.source_refs[0]]};
 return {c,decision:{decision:'EMIT',reason:'Original source reported a durable interface requirement',facts:[fact]}};
}
async function persisted(store,e){
 const {c,decision}=candidate(e);
 const v=await store.create(c,decision);
 assert.equal(v.created,true);
 assert.equal(await store.advance(c.id,'approved','submission_unknown',{expected_revision:1}),true);
 assert.equal(await store.advance(c.id,'submission_unknown','queued'),true);
 assert.equal(await store.advance(c.id,'queued','persisted',{remote_episode_uuid:uuid}),true);
 return await store.get(c.id);
}
test('#107 distinct source receives durable local link, never second remote write',()=>tmp(async root=>{
 const store=new ReviewStore(root,scope.group);
 const first=occurrence('ses_old','msg_older');
 const prior=await persisted(store,first);
 const second=occurrence('ses_new','msg_newer');
 const {c,decision}=candidate(second);
 const fresh=(await store.create(c,decision)).record;
 let graphCalls=0;
 const result=await promoteOne(store,fresh,{call:async()=>{
   graphCalls++;throw Error('Graphiti RPC was not needed for the local link');
 }});
 assert.equal(result.status,'deferred');
 assert.equal(result.reason,'LOCAL_DISTINCT_SOURCE_CORROBORATION');
 const linked=await store.get(c.id);
 assert.equal(linked.state,'deferred');
 assert.equal(linked.revision,2);
 assert.equal(linked.corroboration.prior_review_id,prior.id);
 assert.equal(linked.corroboration.prior_remote_episode_uuid,uuid);
 assert.equal(linked.corroboration.source_factually_verified,false);
 assert.equal(linked.corroboration.current_source_ref,second.source_refs[0]);
 assert.equal(linked.corroboration.prior_source_ref,first.source_refs[0]);
 assert.equal(linked.facts[0].evidence_class,'user-stated');
 assert.equal(linked.remote_episode_uuid,null);
 assert.equal(graphCalls,0);
 assert.equal((await store.get(prior.id)).state,'persisted');
 assert.equal(await store.deferCorroboration(c.id,1,prior.id),false);
}));
test('#107 same original native occurrence is not independent corroboration',()=>tmp(async root=>{
 const store=new ReviewStore(root,scope.group);
 const first=occurrence('ses_same','msg_same');
 const prior=await persisted(store,first);
 const {c,decision}=candidate(first);
 const other={...c,id:'c'.repeat(64)};
 assert.equal(nativeFactOrigin({...c,events:[first]},decision.facts[0]),
   first.source_refs[0]);
 await store.create(other,decision);
 const result=await promoteOne(store,await store.get(other.id),{
   call:async()=>{throw Error('Unexpected Graphiti call');}});
 assert.equal(result.reason,'LOCAL_REPEATED_ASSERTION');
 assert.equal((await store.get(other.id)).corroboration,undefined);
 assert.equal((await store.get(prior.id)).state,'persisted');
}));
test('#107 missing positive prior index denies local corroboration',()=>tmp(async root=>{
 const store=new ReviewStore(root,scope.group);
 const first=occurrence('ses_idx','msg_idx');
 const prior=await persisted(store,first);
 const second=occurrence('ses_idx2','msg_idx2');
 const {c,decision}=candidate(second);
 await store.create(c,decision);
 const {unlink}=await import('node:fs/promises');
 await unlink(path.join(store.dir,'_episode-index',uuid+'.json'));
 const result=await promoteOne(store,await store.get(c.id),{
   call:async()=>{throw Error('No remote write');}});
 assert.equal(result.status,'concurrent_transition');
 assert.equal((await store.get(c.id)).state,'approved');
 assert.equal((await store.get(prior.id)).state,'persisted');
}));
