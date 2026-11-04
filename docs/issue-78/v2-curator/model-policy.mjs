/** Optional #81 curator-only model controls; absent env leaves #80 default untouched. */
export function modelPolicy(env={}){
 const result={};
 const effort=env.GHDEV_CURATOR_REASONING_EFFORT;
 const budget=env.GHDEV_CURATOR_MAX_TOKENS;
 if(effort!==undefined&&effort!==''){
  if(!['none','low'].includes(effort))throw Error('CURATOR_POLICY_INVALID_EFFORT');
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
