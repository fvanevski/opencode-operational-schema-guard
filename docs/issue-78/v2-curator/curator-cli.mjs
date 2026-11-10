#!/usr/bin/env node
/** Post-exit worker, called by accepted Issue #75 Python EX admission wrapper. */
import path from 'node:path';
import os from 'node:os';
import { CandidateQueue } from '../v2-candidate/queue.mjs';
import { ReviewStore } from './core.mjs';
import { runAdmitted, reconcile } from './worker.mjs';
import { modelPolicy } from './model-policy.mjs';
import { GraphitiMcp } from '../../issue-75/v2-candidate/memory-core.mjs';
import {describeFixtureGroup} from '../fixture-groups.mjs';
const [, ,command,...args]=process.argv;
const arg=k=>{const i=args.indexOf('--'+k);return i<0?'':args[i+1]||'';};
const group=arg('group');
const root=arg('state-dir')||path.join(process.env.XDG_STATE_HOME||path.join(os.homedir(),'.local','state'),'ghdev-graphiti');
const maxSeconds=Number(arg('max-seconds')||'600');
const maxClusters=Number(arg('max-clusters')||'6');
// Explicit development-only opt-in. Installed production callers retain the
// historical one-model policy until independent Issue #92 qualification.
const factReviewArg=arg('fact-review');
if(factReviewArg&&factReviewArg!=='on')throw Error('FACT_REVIEW_OPT_IN_INVALID');
const factReview=factReviewArg==='on';
if(command==='validate-config'){
  const policy=modelPolicy(process.env);
  console.log(JSON.stringify({status:'VALID_CURATOR_MODEL_OPTIONS',
    modelOptions:policy,default_behavior:!Object.keys(policy).length}));
}else if(!group||!['drain','status','list','reconcile-only'].includes(command)||
   !Number.isInteger(maxSeconds)||maxSeconds<5||maxSeconds>3600){
  console.error('Usage: node curator-cli.mjs drain|status|list|reconcile-only --group GROUP --state-dir DIR '+
    '[--endpoint LOOPBACK_GRAPHITI_MCP --max-seconds 600 --max-clusters 6] '+ 
    '[--fact-review on (development only)]. '+
    'For drain set LOCAL_CURATOR_URL, LOCAL_CURATOR_MODEL, LOCAL_CURATOR_API_KEY.');
  process.exitCode=2;
}else{
  const store=new ReviewStore(root,group);
  if(command==='status'){
    const counts={};let reviewCount=0;
    for(let offset=0;;offset+=500){
      const page=await store.list({limit:500,offset});
      for(const r of page.items)counts[r.state]=(counts[r.state]||0)+1;
      reviewCount=page.total;if(!page.has_more)break;
    }
    console.log(JSON.stringify({group,fixture:describeFixtureGroup(group),counts,review_count:reviewCount,
      queue:await new CandidateQueue(root,group).status()},null,2));
  }else if(command==='list'){
    const rows=await store.list({limit:100});
    console.log(JSON.stringify({group,fixture:describeFixtureGroup(group),total:rows.total,
      items:rows.items.map(({id,state,decision,utility_class,reason,revision,remote_episode_uuid,source_event_ids,failure_evidence})=>
        ({id,state,decision,utility_class:utility_class??null,reason,revision,remote_episode_uuid,source_event_ids,
          failure_code:failure_evidence?.error_code||null,
          failure_identity_binding:failure_evidence?.identity_binding||null}))},null,2));
  }else if(command==='reconcile-only'){
    // The Python wrapper alone owns the actual EX flock. This subprocess
    // receives admission from that wrapper; it cannot call the model or
    // Graphiti add_memory, even if pending candidate records exist.
    if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted')
      throw Error('EX_POST_EXIT_ADMISSION_REQUIRED');
    // Timeout can occur before the first model decision/review is created.
    // In that case there is no remotely submitted record to reconcile,
    // but new source events still require an admitted drain under this EX.
    // The returned work_remaining status below must trigger resumption,
    // not strand the canonical lease because the review store is empty.
    const endpoint=arg('endpoint');
    if(!endpoint)throw Error('Graphiti endpoint required for reconciliation');
    const graphiti=new GraphitiMcp(endpoint,{timeoutMs:12000});
    const result=await reconcile(store,graphiti);
    const after=await store.list({limit:500});
    // reconcile() sees all pages; do not trust just the first list page.
    // Distinguish remote ambiguity (exit 3) from local eligible work
    // (exit 4). The Python EX holder must resume the admitted drain once
    // remote uncertainty clears; otherwise it can hold EX forever.
    let pendingReview=false;
    for(let offset=0;;offset+=500){
      const page=await store.list({limit:500,offset});
      if(page.items.some(r=>r.state==='approved'||r.state==='retry_authorized'||
        (r.state==='deferred'&&r.reevaluate_requested)))pendingReview=true;
      if(!page.has_more)break;
    }
    const queueStatus=await new CandidateQueue(root,group).status();
    const eligible=pendingReview||
      queueStatus.counts.new>0||queueStatus.counts.reserved>0;
    const status=result.unresolved?'unresolved':eligible?'work_remaining':'settled';
    console.log(JSON.stringify({mode:'reconcile-only',group,
      reconciled_persisted:result.persisted,unresolved:result.unresolved,
      review_count:after.total,queue_new:queueStatus.counts.new,
      queue_reserved:queueStatus.counts.reserved,
      pending_review:pendingReview,status}));
    if(result.unresolved)process.exitCode=3;
    else if(eligible)process.exitCode=4;
  }else{
    const data=await runAdmitted({root,group,graphitiEndpoint:arg('endpoint'),
      modelEndpoint:process.env.LOCAL_CURATOR_URL,
      modelId:process.env.LOCAL_CURATOR_MODEL,
      apiKey:process.env.LOCAL_CURATOR_API_KEY||'local',
      modelOptions:modelPolicy(process.env),maxSeconds,maxClusters,
      factReview});
    console.log(JSON.stringify(data));
    if(data.status==='unresolved'||data.status==='incomplete')process.exitCode=3;
  }
}
