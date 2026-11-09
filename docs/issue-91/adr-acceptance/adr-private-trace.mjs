/** Private, disposable-only curator trace wrapper for EXPOSED diagnostic runs.
 * Does not acquire/bypass the EX gate and never makes a model call itself.
 * Caller passes the already admitted curateCluster function. The wrapper
 * is not wired into production. Raw model responses stay private (0600).
 */
import {promises as fs} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {modelPrompt} from '../../issue-78/v2-curator/core.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const id=/^[a-f0-9]{64}$/;
export function createPrivateTraceCurator(curate,{directory}){
 if(typeof curate!=='function'||typeof directory!=='string'||
   !path.isAbsolute(directory))throw Error('ADR92_TRACE_INVALID_CONFIG');
 return async (cluster,opts)=>{
   if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted')
     throw Error('ADR92_TRACE_POST_EXIT_REQUIRED');
   if(!id.test(cluster?.id||''))throw Error('ADR92_TRACE_BAD_CLUSTER');
   await fs.mkdir(directory,{recursive:true,mode:0o700});
   const dest=path.join(directory,cluster.id+'.json');
   // wx preflight avoids accidental second model call in a diagnostic group.
   try{await fs.access(dest);throw Error('ADR92_TRACE_ALREADY_EXISTS');}
   catch(e){if(e.code!=='ENOENT')throw e;}
   const prompt=modelPrompt(cluster);
   const reply=await curate(cluster,opts);
   if(typeof reply?.content!=='string'||reply.content.length>12000)
     throw Error('ADR92_TRACE_INVALID_REPLY');
   const record={schema:'issue92-adr-private-model-trace-v1',
     cluster_id:cluster.id,group_id:cluster.group,
     model_prompt_sha256:hash(JSON.stringify(prompt)),
     source_refs:cluster.events.map(e=>({ref_sha256:hash(e.source_refs[0]),
       excerpt_sha256:hash(e.excerpt)})),
     model_reply_sha256:hash(reply.content),
     raw_model_content:reply.content,
     completed_at:new Date().toISOString()};
   // The only output with raw model text is private and atomically unique.
   await fs.writeFile(dest,JSON.stringify(record),{flag:'wx',mode:0o600});
   return reply;
 };
}
