#!/usr/bin/env node
/** Local archive plan/apply. No Graphiti or model calls. Back up before applying. */
import path from 'node:path';
import {CandidateQueue} from '../issue-78/v2-candidate/queue.mjs';
import {ReviewStore} from '../issue-78/v2-curator/core.mjs';
import {archiveOwnedSources} from './archive-owned.mjs';
const [,,command,...args]=process.argv;
const arg=k=>{const i=args.indexOf('--'+k);return i<0?null:args[i+1]??null;};
async function main(){
  const root=arg('state-dir'),group=arg('group'),limit=Number(arg('max-files')||'4000');
  if(!['plan','apply'].includes(command)||!root||!path.isAbsolute(root)||!group||
     !Number.isInteger(limit)||limit<1||limit>20000)
    throw Error('USAGE: plan|apply --state-dir ABS --group GROUP [--max-files 4000] [--expected-plan HASH]');
  const expected=arg('expected-plan');
  if(command==='apply'&&!/^[a-f0-9]{64}$/.test(expected||''))
    throw Error('ARCHIVE_APPLY_REQUIRES_PREVIEW_PLAN_SHA');
  if(command==='plan'&&expected!==null)throw Error('ARCHIVE_PLAN_HAS_NO_EXPECTATION');
  const queue=new CandidateQueue(root,group),store=new ReviewStore(root,group);
  const result=await archiveOwnedSources(queue,store,{
    limit,dryRun:command==='plan',expectedPlan:expected});
  console.log(JSON.stringify({schema:'issue99-source-archive-v1',mode:command,group,limit,...result}));
}
main().catch(e=>{console.error(JSON.stringify({status:'BLOCKED',code:e.message}));process.exitCode=2;});
