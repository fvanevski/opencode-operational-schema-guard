#!/usr/bin/env node
/** Post-exit worker, called by accepted Issue #75 Python EX admission wrapper. */
import path from 'node:path';
import os from 'node:os';
import { CandidateQueue } from '../v2-candidate/queue.mjs';
import { ReviewStore } from './core.mjs';
import { runAdmitted } from './worker.mjs';
const [, ,command,...args]=process.argv;
const arg=k=>{const i=args.indexOf('--'+k);return i<0?'':args[i+1]||'';};
const group=arg('group');
const root=arg('state-dir')||path.join(process.env.XDG_STATE_HOME||path.join(os.homedir(),'.local','state'),'ghdev-graphiti');
const maxSeconds=Number(arg('max-seconds')||'600');
const maxClusters=Number(arg('max-clusters')||'6');
if(!group||!['drain','status','list'].includes(command)||
   !Number.isInteger(maxSeconds)||maxSeconds<5||maxSeconds>3600){
  console.error('Usage: node curator-cli.mjs drain|status|list --group GROUP --state-dir DIR '+
    '[--endpoint LOOPBACK_GRAPHITI_MCP --max-seconds 600 --max-clusters 6]. '+
    'For drain set LOCAL_CURATOR_URL, LOCAL_CURATOR_MODEL, LOCAL_CURATOR_API_KEY.');
  process.exitCode=2;
}else{
  const store=new ReviewStore(root,group);
  if(command==='status'){
    const items=(await store.list({limit:500})).items;
    const counts={};for(const r of items)counts[r.state]=(counts[r.state]||0)+1;
    console.log(JSON.stringify({group,counts,review_count:items.length,
      queue:await new CandidateQueue(root,group).status()},null,2));
  }else if(command==='list'){
    const rows=await store.list({limit:100});
    console.log(JSON.stringify({group,total:rows.total,
      items:rows.items.map(({id,state,decision,reason,revision,remote_episode_uuid,source_event_ids})=>
        ({id,state,decision,reason,revision,remote_episode_uuid,source_event_ids}))},null,2));
  }else{
    const data=await runAdmitted({root,group,graphitiEndpoint:arg('endpoint'),
      modelEndpoint:process.env.LOCAL_CURATOR_URL,
      modelId:process.env.LOCAL_CURATOR_MODEL,
      apiKey:process.env.LOCAL_CURATOR_API_KEY||'local',maxSeconds,maxClusters});
    console.log(JSON.stringify(data));
    if(data.status==='unresolved')process.exitCode=3;
  }
}
