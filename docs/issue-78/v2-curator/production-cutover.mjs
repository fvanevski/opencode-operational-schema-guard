/** Read-only fresh-production-group preflight. No legacy migration or writes. */
import path from 'node:path';
import {lstat,readdir} from 'node:fs/promises';
export const PRODUCTION_GROUP='development-knowledge';
export const RETIRED_GROUP='ghdev_gh_mcp';
async function checkEmpty(target){
 const info=await lstat(target).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(!info)return {path:target,state:'absent'};
 if(info.isSymbolicLink()||!info.isDirectory())throw Error('CUTOVER_TARGET_PATH_UNSAFE');
 if((await readdir(target)).length)throw Error('CUTOVER_TARGET_LOCAL_STATE_NOT_EMPTY');
 return {path:target,state:'empty_directory'};
}
export async function inspectFreshProductionGroup({root,group,graphiti}={}){
 if(typeof root!=='string'||!path.isAbsolute(root)||
  group!==PRODUCTION_GROUP||typeof graphiti?.call!=='function')
  throw Error('CUTOVER_PRODUCTION_SCOPE_INVALID');
 const rootInfo=await lstat(root);
 if(rootInfo.isSymbolicLink()||!rootInfo.isDirectory())
  throw Error('CUTOVER_STATE_ROOT_UNSAFE');
 for(const base of ['candidate-events-v1','curation-v1']){
  const parent=await lstat(path.join(root,base)).catch(e=>{
   if(e.code==='ENOENT')return null;
   throw e;
  });
  if(parent&&(parent.isSymbolicLink()||!parent.isDirectory()))
   throw Error('CUTOVER_TARGET_PARENT_UNSAFE');
 }
 const local=[];
 for(const rel of [group,path.join('candidate-events-v1',group),
   path.join('curation-v1',group)])
  local.push(await checkEmpty(path.join(root,rel)));
 const remote=await graphiti.call('get_episodes',{group_ids:[group],max_episodes:1000});
 if(!Array.isArray(remote?.episodes)||remote.episodes.length)
  throw Error('CUTOVER_REMOTE_EPISODES_NOT_EMPTY_OR_UNVERIFIED');
 return {status:'FRESH_PRODUCTION_EPISODES_EMPTY',group,retired_group:RETIRED_GROUP,
  local,remote_episode_count:0,old_group_data_migration:false,
  graph_storage_absence:'REQUIRES_FALKORDB_READ_ONLY_PROOF',
  graphiti_write_performed:false,local_state_mutation:false};
}
