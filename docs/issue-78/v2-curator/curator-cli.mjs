#!/usr/bin/env node
/** Post-exit worker, called by accepted Issue #75 Python EX admission wrapper. */
import path from 'node:path';
import os from 'node:os';
import { CandidateQueue } from '../v2-candidate/queue.mjs';
import { ReviewStore } from './core.mjs';
import { runAdmitted, reconcile } from './worker.mjs';
import { GraphitiMcp } from '../../issue-75/v2-candidate/memory-core.mjs';
const [, ,command,...args]=process.argv;
const arg=k=>{const i=args.indexOf('--'+k);return i<0?'':args[i+1]||'';};
const group=arg('group');
const root=arg('state-dir')||path.join(process.env.XDG_STATE_HOME||path.join(os.homedir(),'.local','state'),'ghdev-graphiti');
const maxSeconds=Number(arg('max-seconds')||'600');
const maxClusters=Number(arg('max-clusters')||'6');
if(!group||!['drain','status','list','reconcile-only'].includes(command)||
   !Number.isInteger(maxSeconds)||maxSeconds<5||maxSeconds>3600){
  console.error('Usage: node curator-cli.mjs drain|status|list|reconcile-only --group GROUP --state-dir DIR '+
    '[--endpoint LOOPBACK_GRAPHITI_MCP --max-seconds 600 --max-clusters 6]. '+
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
    console.log(JSON.stringify({group,counts,review_count:reviewCount,
      queue:await new CandidateQueue(root,group).status()},null,2));
  }else if(command==='list'){
    const rows=await store.list({limit:100});
    console.log(JSON.stringify({group,total:rows.total,
      items:rows.items.map(({id,state,decision,reason,revision,remote_episode_uuid,source_event_ids})=>
        ({id,state,decision,reason,revision,remote_episode_uuid,source_event_ids}))},null,2));
  }else if(command==='reconcile-only'){
    // The Python wrapper alone owns the actual EX flock. This subprocess
    // receives admission from that wrapper; it cannot call the model or
    // Graphiti add_memory, even if pending candidate records exist.
    if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted')
      throw Error('EX_POST_EXIT_ADMISSION_REQUIRED');
    const before=await store.list({limit:500});
    if(before.total===0)throw Error('EMPTY_REVIEW_STORE_CANNOT_PROVE_TERMINAL');
    const endpoint=arg('endpoint');
    if(!endpoint)throw Error('Graphiti endpoint required for reconciliation');
    const graphiti=new GraphitiMcp(endpoint,{timeoutMs:12000});
    const result=await reconcile(store,graphiti);
    const after=await store.list({limit:500});
    // reconcile() sees all pages; do not trust just the first list page.
    console.log(JSON.stringify({mode:'reconcile-only',group,
      reconciled_persisted:result.persisted,unresolved:result.unresolved,
      review_count:after.total,status:result.unresolved?'unresolved':'settled'}));
    if(result.unresolved)process.exitCode=3;
  }else{
    const data=await runAdmitted({root,group,graphitiEndpoint:arg('endpoint'),
      modelEndpoint:process.env.LOCAL_CURATOR_URL,
      modelId:process.env.LOCAL_CURATOR_MODEL,
      apiKey:process.env.LOCAL_CURATOR_API_KEY||'local',maxSeconds,maxClusters});
    console.log(JSON.stringify(data));
    if(data.status==='unresolved')process.exitCode=3;
  }
}
