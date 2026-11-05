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
  const checkPid=pid=>{try{process.kill(pid,0);return true;}
    catch(e){if(e.code==='ESRCH')return false;throw e;}};
  if(checkPid(evidence.prior_backend_pid)||
     !checkPid(evidence.current_backend_pid))
    throw Error('PRIOR_BACKEND_NOT_RETIRED_OR_CURRENT_NOT_ALIVE');
}
const graphiti=new GraphitiMcp(endpoint,{timeoutMs:12000});
const plan=await assessAcknowledgedRetry({
  store:new ReviewStore(root,group),graphiti,root,group,
  reviewId:id,expectedRevision:revision,evidence,apply,
  attest:args.includes('--attest-acknowledged-retry'),
  acknowledgePartialEffects:args.includes('--ack-partial-effects'),
  expectedRemoteSha:get('expect-remote-sha')||null
});
console.log(JSON.stringify(plan,null,2));
