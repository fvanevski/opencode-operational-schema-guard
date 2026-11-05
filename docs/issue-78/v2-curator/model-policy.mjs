/** Profile ownership: chat-fast is always non-thinking; thinking uses chat-review/audit. */
export function modelPolicy(env={}){
 const result={};
 const alias=env.LOCAL_CURATOR_MODEL;
 const effort=env.GHDEV_CURATOR_REASONING_EFFORT;
 const budget=env.GHDEV_CURATOR_MAX_TOKENS;
 if(effort!==undefined&&effort!==''){
  if(alias==='chat-fast')throw Error('CURATOR_POLICY_CHAT_FAST_NO_REASONING_OVERRIDE');
  if(!['chat-review','chat-audit'].includes(alias))
   throw Error('CURATOR_POLICY_THINKING_PROFILE_REQUIRED');
  if(!['low','medium','high','xhigh'].includes(effort))
   throw Error('CURATOR_POLICY_INVALID_EFFORT');
  result.reasoningEffort=effort;
 }
 if(budget!==undefined&&budget!==''){
  if(!/^[1-9][0-9]*$/.test(String(budget)))throw Error('CURATOR_POLICY_INVALID_BUDGET');
  const n=Number(budget);
  if(!Number.isSafeInteger(n)||n<256||n>1600)
    throw Error('CURATOR_POLICY_INVALID_BUDGET');
  result.maxTokens=n;
 }
 return result;
}
