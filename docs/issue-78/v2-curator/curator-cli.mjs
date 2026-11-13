#!/usr/bin/env node
/** Post-exit worker, called by accepted Issue #75 Python EX admission wrapper. */
import path from 'node:path';
import os from 'node:os';
import { CandidateQueue } from '../v2-candidate/queue.mjs';
import { ReviewStore } from './core.mjs';
import { runAdmitted, reconcile } from './worker.mjs';
import { runAdmittedFiniteBatch } from './finite-batch.mjs';
import {loadFiniteBatchTuning,tuningSummary} from './finite-batch-tuning.mjs';
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
const finiteBatchArg=arg('finite-batch');
if(finiteBatchArg&&finiteBatchArg!=='on')throw Error('FINITE_BATCH_OPT_IN_INVALID');
const finiteBatch=finiteBatchArg==='on';
if(finiteBatch&&factReview)throw Error('FINITE_BATCH_ALREADY_INCLUDES_FACT_REVIEW');
const noveltyPolicy=arg('novelty-policy')||'recall';
if(!['recall','conservative'].includes(noveltyPolicy)||
 (!finiteBatch&&arg('novelty-policy')))
 throw Error('FINITE_BATCH_NOVELTY_POLICY_INVALID');
const maxCandidates=Number(arg('max-candidates')||'48');
const tuningPath=arg('tuning-file');
const replayOnlyArg=arg('replay-only');
if(replayOnlyArg&&replayOnlyArg!=='on')throw Error('REPLAY_ONLY_OPT_IN_INVALID');
if(replayOnlyArg&&(!finiteBatch||command!=='drain'))
 throw Error('REPLAY_ONLY_FINITE_BATCH_DRAIN_REQUIRED');
const replayOnly=replayOnlyArg==='on';
const recoveryArg=arg('source-recovery');
if(recoveryArg&&recoveryArg!=='on')throw Error('SOURCE_RECOVERY_OPT_IN_INVALID');
if(recoveryArg&&(!finiteBatch||command!=='drain'||noveltyPolicy!=='recall'))
 throw Error('SOURCE_RECOVERY_RECALL_FINITE_BATCH_REQUIRED');
const sourceRecovery=recoveryArg==='on';
const resilientArg=arg('resilient-discovery');
if(resilientArg&&resilientArg!=='on')throw Error('RESILIENT_DISCOVERY_OPT_IN_INVALID');
if(resilientArg&&(!sourceRecovery||!finiteBatch||command!=='drain'))
 throw Error('RESILIENT_DISCOVERY_REQUIRES_SOURCE_RECOVERY');
const resilientDiscovery=resilientArg==='on';
const claimArg=arg('claim-evidence');
if(claimArg&&claimArg!=='on')throw Error('CLAIM_EVIDENCE_OPT_IN_INVALID');
if(claimArg&&(!resilientDiscovery||!finiteBatch||command!=='drain'))
 throw Error('CLAIM_EVIDENCE_REQUIRES_RESILIENT_FINITE_BATCH');
const claimEvidence=claimArg==='on';
const complementArg=arg('source-exact-complement');
if(complementArg&&complementArg!=='on')throw Error('SOURCE_EXACT_COMPLEMENT_OPT_IN_INVALID');
if(complementArg&&(!claimEvidence||!finiteBatch||command!=='drain'))
 throw Error('SOURCE_EXACT_COMPLEMENT_REQUIRES_CLAIM_EVIDENCE');
const sourceExactComplement=complementArg==='on';
const dedupArg=arg('balanced-dedup');
if(dedupArg&&dedupArg!=='on')throw Error('BALANCED_DEDUP_OPT_IN_INVALID');
if(dedupArg&&(!finiteBatch||command!=='drain'||noveltyPolicy!=='recall'))
 throw Error('BALANCED_DEDUP_REQUIRES_RECALL_FINITE_BATCH');
const balancedDedup=dedupArg==='on';
const salvageArg=arg('source-quote-salvage');
if(salvageArg&&salvageArg!=='on')throw Error('SOURCE_QUOTE_SALVAGE_OPT_IN_INVALID');
if(salvageArg&&(!sourceExactComplement||!finiteBatch||command!=='drain'))
 throw Error('SOURCE_QUOTE_SALVAGE_REQUIRES_SOURCE_EXACT_COMPLEMENT');
const sourceQuoteSalvage=salvageArg==='on';
if(tuningPath&&command!=='validate-tuning'&&(!finiteBatch||command!=='drain'))
 throw Error('FINITE_BATCH_TUNING_ONLY_ON_DRAIN');
if(command==='validate-tuning'){
 if(!tuningPath)throw Error('TUNING_FILE_REQUIRED');
 console.log(JSON.stringify(tuningSummary(await loadFiniteBatchTuning(tuningPath))));
}else if(command==='validate-config'){
  const policy=modelPolicy(process.env);
  console.log(JSON.stringify({status:'VALID_CURATOR_MODEL_OPTIONS',
    modelOptions:policy,default_behavior:!Object.keys(policy).length}));
}else if(!group||!['drain','status','list','reconcile-only'].includes(command)||
   !Number.isInteger(maxSeconds)||maxSeconds<5||maxSeconds>3600){
  console.error('Usage: node curator-cli.mjs drain|status|list|reconcile-only --group GROUP --state-dir DIR '+
    '[--endpoint LOOPBACK_GRAPHITI_MCP --max-seconds 600 --max-clusters 6] '+ 
    '[--fact-review on | --finite-batch on (development only)] '+ 
    '[--max-candidates 48] [--novelty-policy recall|conservative] '+
    '[--tuning-file ABSOLUTE_JSON_PATH] [--replay-only on] [--source-recovery on] '+
     '[--resilient-discovery on (requires source-recovery)] '+
     '[--claim-evidence on (requires resilient-discovery)] '+
     '[--source-exact-complement on (requires claim-evidence)] '+
     '[--balanced-dedup on (recall mode, semantic duplicate review)] '+
     '[--source-quote-salvage on (independent source-quote utility)]. '+
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
    const inputs={root,group,graphitiEndpoint:arg('endpoint'),
      modelEndpoint:process.env.LOCAL_CURATOR_URL,
      modelId:process.env.LOCAL_CURATOR_MODEL,
      apiKey:process.env.LOCAL_CURATOR_API_KEY||'local',
      modelOptions:modelPolicy(process.env),maxSeconds,maxClusters};
    const data=finiteBatch?
      await runAdmittedFiniteBatch({...inputs,maxCandidates,noveltyPolicy,replayOnly,
       sourceRecovery,resilientDiscovery,claimEvidence,sourceExactComplement,
        balancedDedup,sourceQuoteSalvage,
       tuning:tuningPath?await loadFiniteBatchTuning(tuningPath):null}):
      await runAdmitted({...inputs,factReview});
    console.log(JSON.stringify(data));
    if(data.status==='unresolved'||data.status==='incomplete')process.exitCode=3;
  }
}
