/** Loopback OpenAI-compatible inference. Must only be called under post-exit admission. */
import { modelPrompt } from './core.mjs';
export async function curateCluster(cluster,{
  endpoint,model,apiKey='local',fetchImpl=fetch,timeoutMs=90000
}={}){
  if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted')
    throw Error('MODEL_ADMISSION_REQUIRED');
  const url=new URL(endpoint);
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||
     !url.pathname.endsWith('/v1/chat/completions'))throw Error('Loopback model endpoint required');
  if(typeof model!=='string'||!model||model.length>160||timeoutMs<1000||timeoutMs>180000)
    throw Error('Invalid model settings');
  const started=Date.now();
  const response=await fetchImpl(url,{method:'POST',signal:AbortSignal.timeout(timeoutMs),
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
    body:JSON.stringify({model,messages:modelPrompt(cluster),temperature:0,max_tokens:1600,
      response_format:{type:'json_object'}})});
  if(!response.ok)throw Error('CURATOR_HTTP_'+response.status);
  const reply=await response.json();
  const content=reply?.choices?.[0]?.message?.content;
  if(typeof content!=='string'||content.length>12000)throw Error('INVALID_MODEL_OUTPUT');
  return {content,usage:reply?.usage?{
    prompt_tokens:Number(reply.usage.prompt_tokens)||0,
    completion_tokens:Number(reply.usage.completion_tokens)||0}:null,
    duration_ms:Date.now()-started};
}
