/** Loopback OpenAI-compatible inference. Must only be called under post-exit admission. */
import { modelPrompt } from './core.mjs';
export async function curateCluster(cluster,{
  endpoint,model,apiKey='local',fetchImpl=fetch,timeoutMs=90000,
  // Defaults unchanged; opt-in controls for admitted model-only efficiency probes.
  reasoningEffort=null,maxTokens=1600,promptMessages=null
}={}){
  if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted')
    throw Error('MODEL_ADMISSION_REQUIRED');
  const url=new URL(endpoint);
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||
     !url.pathname.endsWith('/v1/chat/completions'))throw Error('Loopback model endpoint required');
  if(typeof model!=='string'||!model||model.length>160||timeoutMs<1000||timeoutMs>180000)
    throw Error('Invalid model settings');
  if(!Number.isInteger(maxTokens)||maxTokens<128||maxTokens>1600)
    throw Error('Invalid model completion budget');
  if(reasoningEffort!==null){
    if(model==='chat-fast')throw Error('CHAT_FAST_NO_REASONING_OVERRIDE');
    if(!['chat-review','chat-audit'].includes(model)||
      !['low','medium','high','xhigh'].includes(reasoningEffort))
      throw Error('THINKING_PROFILE_REQUIRED_FOR_REASONING_EFFORT');
  }
  const messages=promptMessages??modelPrompt(cluster);
  if(!Array.isArray(messages)||messages.length!==2||
    messages[0]?.role!=='system'||messages[1]?.role!=='user'||
    messages.some(m=>typeof m.content!=='string'||m.content.length>60000))
    throw Error('INVALID_CURATOR_PROMPT_MESSAGES');
  const started=Date.now();
  const response=await fetchImpl(url,{method:'POST',signal:AbortSignal.timeout(timeoutMs),
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
    body:JSON.stringify({model,messages,temperature:0,max_tokens:maxTokens,
      response_format:{type:'json_object'},
      ...(reasoningEffort===null?{}:{reasoning_effort:reasoningEffort})})});
  if(!response.ok)throw Error('CURATOR_HTTP_'+response.status);
  const reply=await response.json();
  const content=reply?.choices?.[0]?.message?.content;
  if(typeof content!=='string'||content.length>12000)throw Error('INVALID_MODEL_OUTPUT');
  const usage=reply?.usage;
  const count=v=>Number.isSafeInteger(v)&&v>=0?v:null;
  return {content,usage:usage?{
    prompt_tokens:count(usage.prompt_tokens),
    completion_tokens:count(usage.completion_tokens),
    reasoning_tokens:count(usage.completion_tokens_details?.reasoning_tokens),
    cached_prompt_tokens:count(usage.prompt_tokens_details?.cached_tokens)}:null,
    finish_reason:reply?.choices?.[0]?.finish_reason??null,
    output_chars:content.length,duration_ms:Date.now()-started};
}
