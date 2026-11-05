import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {inspectFreshProductionGroup,PRODUCTION_GROUP,RETIRED_GROUP} from './production-cutover.mjs';
async function fixture(fn){
 const root=await mkdtemp(path.join(os.tmpdir(),'fresh-graphiti-'));
 const graphiti={calls:[],episodes:[],async call(tool,args){
  this.calls.push(tool);assert.equal(tool,'get_episodes');
  assert.deepEqual(args,{group_ids:[PRODUCTION_GROUP],max_episodes:1000});
  return {episodes:this.episodes};}};
 try{await fn({root,graphiti});}finally{await rm(root,{recursive:true,force:true});}
}
test('fresh named production namespace is empty and never migrates development records',
 ()=>fixture(async x=>{
 const r=await inspectFreshProductionGroup({...x,group:PRODUCTION_GROUP});
 assert.equal(r.status,'FRESH_PRODUCTION_EPISODES_EMPTY');
 assert.equal(r.retired_group,RETIRED_GROUP);
 assert.equal(r.old_group_data_migration,false);
 assert.equal(r.graph_storage_absence,'REQUIRES_FALKORDB_READ_ONLY_PROOF');
 assert.deepEqual(r.local.map(y=>y.state),['absent','absent','absent']);
 assert.deepEqual(x.graphiti.calls,['get_episodes']);
}));
test('existing state and symlink alias both fail closed',()=>fixture(async x=>{
 const dest=path.join(x.root,'curation-v1',PRODUCTION_GROUP);
 await mkdir(dest,{recursive:true});await writeFile(path.join(dest,'old.json'),'{}');
 await assert.rejects(inspectFreshProductionGroup({...x,group:PRODUCTION_GROUP}),/LOCAL_STATE_NOT_EMPTY/);
 await rm(dest,{recursive:true,force:true});await symlink(x.root,dest);
 await assert.rejects(inspectFreshProductionGroup({...x,group:PRODUCTION_GROUP}),/PATH_UNSAFE/);
 assert.equal(x.graphiti.calls.length,0);
}));
test('nonempty remote, invalid remote and old namespace fail closed',
 ()=>fixture(async x=>{
 x.graphiti.episodes=[{uuid:'x',name:'old',group_id:PRODUCTION_GROUP}];
 await assert.rejects(inspectFreshProductionGroup({...x,group:PRODUCTION_GROUP}),/REMOTE_EPISODES_NOT_EMPTY/);
 x.graphiti.episodes=null;
 await assert.rejects(inspectFreshProductionGroup({...x,group:PRODUCTION_GROUP}),/REMOTE_EPISODES_NOT_EMPTY/);
 await assert.rejects(inspectFreshProductionGroup({...x,group:RETIRED_GROUP}),/SCOPE_INVALID/);
}));
