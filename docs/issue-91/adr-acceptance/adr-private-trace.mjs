/** Private, disposable-only curator trace wrapper for EXPOSED diagnostic runs.
 * Does not acquire/bypass the EX gate and never makes a model call itself.
 * Caller passes the already admitted curateCluster function. The wrapper
 * is not wired into production. Raw model responses stay private (0600).
 */
import {promises as fs} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const hash=x=>createHash('sha256').update(x).digest('hex');
const id=/^[a-f0-9]{64}$/;
export function createPrivateTraceCurator(curate,{directory,promptBuilder}={}){
 if(typeof curate!=='function'||typeof promptBuilder!=='function'||
   typeof directory!=='string'||!path.isAbsolute(directory))throw Error('ADR92_TRACE_INVALID_CONFIG');
 return async (cluster,opts)=>{
   if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted')
     throw Error('ADR92_TRACE_POST_EXIT_REQUIRED');
   if(!id.test(cluster?.id||''))throw Error('ADR92_TRACE_BAD_CLUSTER');
   await fs.mkdir(directory,{recursive:true,mode:0o700});
   const dest=path.join(directory,cluster.id+'.json');
   // wx preflight avoids accidental second model call in a diagnostic group.
   for(const existing of [dest,dest+'.call-intent']){
     try{await fs.access(existing);throw Error('ADR92_TRACE_ALREADY_EXISTS');}
     catch(e){if(e.code!=='ENOENT')throw e;}
   }
   // Persist a private one-shot call intent BEFORE invoking the model. If the
   // process crashes after inference but before saving the response, the
   // intent remains and blocks an accidental second call.
   const prompt=promptBuilder(cluster);
   if(!Array.isArray(prompt)||prompt.length<2)
     throw Error('ADR92_TRACE_INVALID_SOURCE_PROMPT');
   await fs.writeFile(dest+'.call-intent',JSON.stringify({
     cluster_id:cluster.id,group_id:cluster.group,created_at:new Date().toISOString(),
     model_prompt_sha256:hash(JSON.stringify(prompt))
   }),{flag:'wx',mode:0o600});
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


/** D2 second-stage trace. The actual reviewer prompt is supplied by the
 * admitted reviewProposedFacts call in opts.promptMessages, not reconstructed.
 * A prior call-intent prevents any ambiguous second inference attempt.
 */
export function createPrivateMessageTraceCall(modelCall,{directory}={}){
 if(typeof modelCall!=='function'||typeof directory!=='string'||
   !path.isAbsolute(directory))throw Error('ADR92_REVIEW_TRACE_INVALID_CONFIG');
 return async (cluster,opts)=>{
   if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted')
     throw Error('ADR92_TRACE_POST_EXIT_REQUIRED');
   if(!id.test(cluster?.id||''))throw Error('ADR92_TRACE_BAD_CLUSTER');
   const messages=opts?.promptMessages;
   if(!Array.isArray(messages)||messages.length!==2||
     messages[0]?.role!=='system'||messages[1]?.role!=='user'||
     messages.some(x=>typeof x.content!=='string'||x.content.length>60000))
     throw Error('ADR92_REVIEW_TRACE_INVALID_PROMPT');
   await fs.mkdir(directory,{recursive:true,mode:0o700});
   const dest=path.join(directory,cluster.id+'.json');
   for(const candidate of [dest,dest+'.call-intent']){
     try{await fs.access(candidate);throw Error('ADR92_TRACE_ALREADY_EXISTS');}
     catch(e){if(e.code!=='ENOENT')throw e;}
   }
   const promptSha=hash(JSON.stringify(messages));
   await fs.writeFile(dest+'.call-intent',JSON.stringify({
     schema:'issue92-adr-review-call-intent-v1',
     cluster_id:cluster.id,group_id:cluster.group,
     model_prompt_sha256:promptSha,created_at:new Date().toISOString()
   }),{flag:'wx',mode:0o600});
   const reply=await modelCall(cluster,opts);
   if(typeof reply?.content!=='string'||reply.content.length>12000)
     throw Error('ADR92_REVIEW_TRACE_INVALID_REPLY');
   await fs.writeFile(dest,JSON.stringify({
     schema:'issue92-adr-private-review-trace-v1',
     cluster_id:cluster.id,group_id:cluster.group,
     model_prompt_sha256:promptSha,
     model_reply_sha256:hash(reply.content),
     raw_model_content:reply.content,
     completed_at:new Date().toISOString()
   }),{flag:'wx',mode:0o600});
   return reply;
 };
}
