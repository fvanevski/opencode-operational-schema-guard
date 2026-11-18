#!/usr/bin/env node
/** #107 B1 admitted, model-only paired comparison runner.
 * No Graphiti/queue/ReviewStore dependency or production worker configuration.
 * Parent must hold the genuine canonical EX flock and pass fd through the
 * existing ex_admitted_node_bridge.py. Never set the lease marker in this CLI.
 */
import {readFile,lstat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {requireKernelExAdmission} from '../issue-78/v2-curator/ex-admission-proof.mjs';
import {curateCluster} from '../issue-78/v2-curator/model.mjs';
import {runPairedQualification} from './qualification.mjs';

const fail=code=>{throw Error('B1_'+code);};
function parseArgs(argv){
  if(argv[0]!=='run')fail('RUN_REQUIRED');
  const read=key=>{
    const i=argv.indexOf('--'+key);
    if(i<0||i+1>=argv.length||argv[i+1].startsWith('--'))fail('ARG_'+key.toUpperCase()+'_REQUIRED');
    return argv[i+1];
  };
  const cases=read('cases'),out=read('out');
  if(!path.isAbsolute(cases)||!path.isAbsolute(out)||cases===out||
    argv.length!==5)fail('PRIVATE_PATHS_REQUIRED');
  return {cases,out};
}
/** May only execute after a host-owned EX preflight. Require a kernel lock,
 * not a manually invented GHDEV_MEMORY_POST_EXIT_LEASE marker.
 */
export async function main(argv=process.argv.slice(2),env=process.env){
  requireKernelExAdmission();
  const {cases,out}=parseArgs(argv);
  const file=await lstat(cases);
  if(!file.isFile()||file.isSymbolicLink()||file.uid!==process.getuid()||
    (file.mode&0o077)!==0||file.size>240000)
    fail('PRIVATE_FROZEN_CASES_REQUIRED');
  const parsed=JSON.parse(await readFile(cases,'utf8'));
  const endpoint=env.LOCAL_CURATOR_URL,model=env.LOCAL_CURATOR_MODEL;
  if(typeof endpoint!=='string'||typeof model!=='string'||!endpoint||!model)
    fail('AUTHENTICATED_MODEL_BINDING_REQUIRED');
  const timeoutMs=Number(env.GHDEV_107_MODEL_TIMEOUT_MS||90000);
  const maxTokens=Number(env.GHDEV_107_MAX_TOKENS||1600);
  const modelArgs={endpoint,model,apiKey:env.LOCAL_CURATOR_API_KEY||'local',
    timeoutMs,maxTokens,temperature:0};
  const comparison=await runPairedQualification(parsed,{
    modelArgs,curate:async(cluster,args)=>{
      requireKernelExAdmission();
      return curateCluster(cluster,args);
    }});
  // Even though the report excludes source/replies, create it in private mode
  // and never overwrite an earlier evidence artifact.
  await writeFile(out,JSON.stringify(comparison,null,2)+'\n',{flag:'wx',mode:0o600});
  return {status:'B1_PAIRED_MODEL_ONLY_COMPLETE',
    output:out,freeze_sha256:comparison.freeze_sha256,
    cohort_count:comparison.cohort_count,graphiti_calls:0,
    source_mutations:0,remote_writes:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{console.log(JSON.stringify(await main()));}
  catch(e){const reason=String(e?.message||'');
    // No host-private inputs, model responses, or credentials in errors.
    console.error(JSON.stringify({status:'B1_PAIRED_MODEL_ONLY_BLOCKED',
      reason:/^(B1_|EX_KERNEL_ADMISSION_REQUIRED:)/.test(reason)?
        reason.slice(0,100):'B1_UNEXPECTED_EXECUTION_FAILURE',
      graphiti_calls:0,remote_writes:0}));
    process.exitCode=2;
  }
}
