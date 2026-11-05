#!/usr/bin/env node
/** Single-review production/fixture adjudication. No Graphiti write or model. */
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {ReviewStore} from './core.mjs';
import {GraphitiMcp} from '../../issue-75/v2-candidate/memory-core.mjs';
import {assessAcknowledgedRetry} from './acknowledged-retry.mjs';
const args=process.argv.slice(2);
const get=k=>{const i=args.indexOf('--'+k);return i<0?'':args[i+1]||'';};
const group=get('group'),root=get('state-dir'),endpoint=get('endpoint');
const id=get('review'),revision=Number(get('revision'));
const evidenceFile=get('evidence-file');
const apply=args.includes('--apply');
if(!group||!path.isAbsolute(root)||!path.isAbsolute(evidenceFile)||
   !/^http:\/\/(?:127\.0\.0\.1|localhost):\d{2,5}\/mcp\/?$/.test(endpoint)||
   !Number.isInteger(revision)||revision<1)
  throw Error('ACKNOWLEDGED_RETRY_USAGE_INVALID');
const evidence=JSON.parse(await readFile(evidenceFile,'utf8'));
// Production requires proof that the original EX-holding wrapper is running.
// No lock is acquired or bypassed here; the worker performs remote calls later.
if(group==='ghdev_gh_mcp'){
  const show=key=>execFileSync('systemctl',['--user','show',
    'ghdev-curator-prod.service','--property='+key,'--value'],{
    encoding:'utf8',timeout:5000}).trim();
  if(show('ActiveState')!=='activating'||!Number(show('MainPID')))
    throw Error('CANONICAL_CURATOR_EX_HOLDER_NOT_RUNNING');
}
function verifyBackendGeneration(e){
  if(group!=='ghdev_gh_mcp')return;
  // Do NOT substitute an arbitrary dead process when historical PID logs
  // have rotated. Bind to the actual sole live Graphiti process generation.
  if(e.prior_backend_pid!==null||
     e.backend_generation_binding!=='fresh_graphiti_process_after_ack')
    throw Error('HISTORICAL_BACKEND_PID_UNVERIFIED');
  const opt={encoding:'utf8',timeout:5000,env:{...process.env,LC_ALL:'C'}};
  const processes=execFileSync('ps',['-eo','pid=,args='],opt).split('\n')
    .map(x=>/^\s*(\d+)\s+(.+)$/.exec(x)).filter(Boolean)
    .filter(x=>/(?:^|[\s/])run_graphiti\.py(?:\s|$)/.test(x[2]));
  if(processes.length!==1||Number(processes[0][1])!==e.current_backend_pid)
    throw Error('GRAPHITI_BACKEND_PROCESS_IDENTITY_UNVERIFIED');
  const started=execFileSync('ps',['-p',String(e.current_backend_pid),
    '-o','lstart='],opt).trim();
  const actual=Date.parse(started),claimed=Date.parse(e.current_backend_started_at);
  if(!Number.isFinite(actual)||!Number.isFinite(claimed)||
     Math.abs(actual-claimed)>2000||
     actual<=Date.parse(e.original_ack_at)||
     actual>Date.parse(e.observed_at))
    throw Error('GRAPHITI_BACKEND_GENERATION_TIME_UNVERIFIED');
}
verifyBackendGeneration(evidence);
const graphiti=new GraphitiMcp(endpoint,{timeoutMs:12000});
const plan=await assessAcknowledgedRetry({
  store:new ReviewStore(root,group),graphiti,root,group,
  reviewId:id,expectedRevision:revision,evidence,apply,
  attest:args.includes('--attest-acknowledged-retry'),
  acknowledgePartialEffects:args.includes('--ack-partial-effects'),
  expectedRemoteSha:get('expect-remote-sha')||null,
  verifyBackendGeneration
});
console.log(JSON.stringify(plan,null,2));
