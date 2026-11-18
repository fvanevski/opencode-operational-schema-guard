import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {fromPromptCandidates} from '../issue-78/v2-candidate/events.mjs';
import {CandidateQueue} from '../issue-78/v2-candidate/queue.mjs';
import {ReviewStore} from '../issue-78/v2-curator/core.mjs';
import {runAdmitted} from '../issue-78/v2-curator/worker.mjs';

const scope={group:'siblingworker107',project:'gh_mcp',workspace:'/workspace/gh_mcp'};
const a='The process must retain the exact original source identifier before saving any autonomous Graphiti episode.';
const b='When a separate model-format error occurs, the original submitted Graphiti episode must not be replayed.';
const fact=(e,quote,valid=true)=>({
 kind:'architecture',temporal_status:'observed',source_refs:[e.source_refs[0]],
 evidence_quote:quote,retention_status:'established_retention',
 utility_class:'stable_architecture',
 ...(valid?{utility_reason:'Durable source-supported developer contract'}:{})
});
const msg=facts=>JSON.stringify({decision:'EMIT',
 reason:'Original-source technical requirements were reported',facts});
test('#107 accepted fact is terminal before targeted sibling retry, with one episode each',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'ghdev107-worker-'));
 const previous=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
   const e=fromPromptCandidates({sessionID:'ses_worker107',
     messageID:'msg_worker107',prompt:{text:a+' '+b},
     timestamp:'2026-11-18T12:00:00Z'},scope,{admitted:true})[0];
   const queue=new CandidateQueue(root,scope.group),store=new ReviewStore(root,scope.group);
   assert.equal((await queue.stage(e)).status,'staged');
   let modelCalls=0,remoteWrites=0;
   const episodes=[];
   const graphiti={call:async(method,args)=>{
     if(method==='search_memory_facts')return {facts:[]};
     if(method==='get_episodes')return {episodes:[...episodes]};
     if(method==='add_memory'){
       remoteWrites++;
       assert.equal(args.group_id,scope.group);
       assert.equal(args.episode_body.match(/Fact 1:/g)?.length,1);
       assert.equal(args.episode_body.includes('Fact 2:'),false);
       assert.equal(episodes.some(x=>x.name===args.name),false);
       episodes.push({name:args.name,group_id:scope.group,
         uuid:'a2345678-1111-4111-a111-'+String(remoteWrites).padStart(12,'0')});
       return {ok:true};
     }
     throw Error('Unexpected mock Graphiti method: '+method);
   }};
   const curate=async (_cluster,config)=>{
     modelCalls++;
     assert.equal(config.model,'synthetic-no-inference');
     return {content:modelCalls===1?msg([fact(e,a),fact(e,b,false)]):
       modelCalls===2?msg([fact(e,b)]):(()=>{throw Error('extra model call')})(),
       usage:{prompt_tokens:1,completion_tokens:1},
       duration_ms:1,finish_reason:'stop'};
   };
   const args={root,group:scope.group,store,queue,graphiti,curate,
      modelEndpoint:'http://127.0.0.1:8002/v1/chat/completions',
      modelId:'synthetic-no-inference',autonomousCuration:true,
      maxClusters:4,maxSeconds:20};
   const first=await runAdmitted(args);
   assert.equal(first.curated,1);
   assert.equal(first.sibling_retry_attempts,0);
   assert.equal(first.status,'technical_retry',
     'unsettled local-only sibling must not be mistaken for remote submission');
   assert.equal(modelCalls,1);
   assert.equal(remoteWrites,1);
   let rows=(await store.list()).items;
   assert.equal(rows.length,2);
   const accepted=rows.find(r=>r.state==='persisted');
   const pending=rows.find(r=>r.reconsideration?.status==='pending');
   assert.ok(accepted&&pending);
   // The canonical Python EX wrapper invokes this precise read-only CLI to
   // distinguish local work (4) from remote submission ambiguity (3).
   const reconcileStatus=()=>spawnSync(process.execPath,[
     fileURLToPath(new URL('../issue-78/v2-curator/curator-cli.mjs',import.meta.url)),
     'reconcile-only','--group',scope.group,'--state-dir',root,
     '--endpoint','http://127.0.0.1:9621/mcp'],{
     encoding:'utf8',timeout:15000,env:{...process.env,
       GHDEV_MEMORY_POST_EXIT_LEASE:'admitted'}});
   const beforeCLI=reconcileStatus();
   assert.equal(beforeCLI.status,4,beforeCLI.stderr);
   assert.equal(JSON.parse(beforeCLI.stdout).status,'work_remaining');
   assert.equal(JSON.parse(beforeCLI.stdout).pending_review,true);
   assert.equal(accepted.facts[0].assertion,a);
   assert.equal(accepted.remote_episode_uuid,episodes[0].uuid);
   const acceptedRevision=accepted.revision;
   const second=await runAdmitted(args);
   assert.equal(second.sibling_retry_attempts,1);
   assert.equal(second.sibling_retry_recovered,1);
   assert.equal(second.status,'settled');
   assert.equal(modelCalls,2);
   assert.equal(remoteWrites,2);
   rows=(await store.list()).items;
   assert.equal(rows.length,2);
   assert.equal(rows.filter(r=>r.state==='persisted').length,2);
   assert.equal((await store.get(accepted.id)).revision,acceptedRevision);
   assert.equal((await store.get(accepted.id)).remote_episode_uuid,episodes[0].uuid);
   const recovered=await store.get(pending.id);
   assert.equal(recovered.facts[0].assertion,b);
   assert.equal(recovered.remote_episode_uuid,episodes[1].uuid);
   assert.notEqual(recovered.id,accepted.id);
   assert.equal(recovered.origin_cluster_id,accepted.origin_cluster_id);
   assert.deepEqual(recovered.source_event_ids,accepted.source_event_ids);
   assert.equal(recovered.reconsideration.status,'recovered');
   const afterCLI=reconcileStatus();
   assert.equal(afterCLI.status,0,afterCLI.stderr);
   assert.equal(JSON.parse(afterCLI.stdout).status,'settled');
   const third=await runAdmitted(args);
   assert.equal(third.sibling_retry_attempts,0);
   assert.equal(modelCalls,2);
   assert.equal(remoteWrites,2);
 }finally{
   if(previous===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
   else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=previous;
   await rm(root,{recursive:true,force:true});
 }
});
