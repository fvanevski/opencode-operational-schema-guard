#!/usr/bin/env node
/** Disposable Issue #80 terminal-processing recovery.
 * Dry-run by default. No LLM, add_memory, clear_graph or automatic replay.
 * Only explicit operator action can attest anonymous-FIFO task correlation.
 */
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ReviewStore} from './core.mjs';
import {CandidateQueue} from '../v2-candidate/queue.mjs';
import {GraphitiMcp} from '../../issue-75/v2-candidate/memory-core.mjs';
import {assessOperatorRecovery} from './terminal-recovery.mjs';
function command(program,args,{allowFailure=false}={}){
 const p=spawnSync(program,args,{encoding:'utf8',maxBuffer:2_000_000,timeout:20_000});
 if(p.error)throw p.error;
 if(!allowFailure&&p.status!==0)
  throw Error('HOST_AUTHORITY_COMMAND_FAILED:'+program+':'+String(p.status));
 return (p.stdout||'').trim();
}
function stopped(unit){
 const value=command('systemctl',['--user','show',unit,'--property=ActiveState','--value']);
 if(!['inactive','failed'].includes(value))
  throw Error('DISPOSABLE_UNIT_NOT_STOPPED:'+unit+':'+value);
}
export async function cli(args=process.argv.slice(2)){
 const get=k=>{const i=args.indexOf('--'+k);return i<0?'':args[i+1]||'';};
 const group=get('group'),root=get('state-dir'),endpoint=get('endpoint');
 const failedId=get('failed'),successId=get('success'),successUUID=get('success-uuid');
 const failedRevision=Number(get('failed-revision')),successRevision=Number(get('success-revision'));
 const since=get('since'),unit=get('unit');
 const apply=args.includes('--apply'),acknowledgeAnonymousOrder=args.includes('--ack-anonymous-order');
 if(!/^cur80_[a-z0-9_-]{3,60}$/.test(group)||
   !path.isAbsolute(root)||!/^http:\/\/(?:127\.0\.0\.1|localhost):\d{2,5}\/mcp\/?$/.test(endpoint)||
   !/^ghdev-curator80-[a-z0-9-]{1,40}$/.test(unit)||
   !/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(since))
  throw Error('REQUIRED_DISPOSABLE_GROUP_PATH_ENDPOINT_UNIT_AND_SINCE');
 if(apply&&!acknowledgeAnonymousOrder)
  throw Error('EXPLICIT_ANONYMOUS_ORDER_ATTESTATION_REQUIRED');
 stopped(unit+'.service');
 stopped(unit+'.path');
 if(command('systemctl',['--user','is-active','mcp-mux.service'])!=='active')
  throw Error('SHARED_GRAPHITI_SERVICE_NOT_RUNNING');
 // Do not run unbounded journald reads or rely on an operator-pasted summary.
 // Actual immutable log content is SHA-256-bound in durable failure evidence.
 const journal=command('journalctl',['--user','--unit','mcp-mux.service',
   '--since',since,'--no-pager','--output=short-iso',
   '--grep','services.queue_service.*'+group]);
 const store=new ReviewStore(root,group),queue=new CandidateQueue(root,group);
 const graphiti=new GraphitiMcp(endpoint,{timeoutMs:12000});
 const result=await assessOperatorRecovery({store,queue,graphiti,root,group,
  failedId,successId,successUUID,failedRevision,successRevision,journal,
  apply,acknowledgeAnonymousOrder});
 console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await cli();
