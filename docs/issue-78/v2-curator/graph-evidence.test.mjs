import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fromPrompt} from '../v2-candidate/events.mjs';
import {ReviewStore,selectClusters} from './core.mjs';
import {inspectEpisodeGraph} from './graph-evidence.mjs';
const group='graph80',workspace='/workspace/graph80',project='graph80';
const uuid='c92722f8-5baa-43bd-b764-2e24cf3c8cbe';
const nodeA='de70c909-c38a-43e0-a645-e9d3fa3a81e1';
const nodeB='55211338-cbf1-4cc2-b90d-38f040e9a55f';
const edgeID='5730d804-e172-45ff-b483-a3ef6a870489';
const input=fromPrompt({sessionID:'sgraph',messageID:'mgraph',
 prompt:{text:'Keep the median algorithm correct and preserve CLI compatibility in this graph project.'},
 timestamp:'2026-11-03T18:00:00Z'}, {group,project,workspace},{admitted:true});
const cluster=()=>selectClusters([input])[0];
async function fixture(fn){
 const root=await mkdtemp(path.join(os.tmpdir(),'cur80-graph-'));
 try{
  const store=new ReviewStore(root,group),c=cluster();
  process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
  await store.create(c,{decision:'EMIT',reason:'Exact user source',
   facts:[{assertion:input.excerpt,kind:'decision',
     source_refs:input.source_refs,evidence_class:'user-stated',
     scope:{group,project,workspace},observed_at:input.observed_at,
     temporal_status:'observed'}]});
  await store.advance(c.id,'approved','submission_unknown');
  await store.advance(c.id,'submission_unknown','queued');
  await store.advance(c.id,'queued','persisted',{remote_episode_uuid:uuid});
  try{return await fn({root,store,clusterId:c.id});}
  finally{delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;}
 }finally{await rm(root,{recursive:true,force:true});}
}
function stub(id,mode='good'){
 const calls=[];
 const graphiti={calls,async call(method,args){
  calls.push([method,args]);
  if(method==='get_episodes')return {episodes:
    [{uuid,name:'curated-v1:'+id,group_id:group}]};
  if(method==='get_episode_entities')return {
    nodes:[{uuid:nodeA,name:'median',group_id:mode==='wrong_group'?'private':group,
       summary:'Median calculation',labels:['Entity']},
      {uuid:nodeB,name:'CLI',group_id:group,summary:'Compatibility'}],
    edges:[{uuid:edgeID,group_id:group,fact:'median preserves CLI compatibility',
      source_node_uuid:nodeA,target_node_uuid:nodeB,episodes:[uuid]}]};
  throw Error('Unexpected remote method '+method);
 }};
 return graphiti;
}
test('exact remote episode and source index justify bounded graph readback',()=>fixture(async o=>{
 const g=stub(o.clusterId),result=await inspectEpisodeGraph({...o,group,graphiti:g});
 assert.equal(result.status,'verified_readback');
 assert.equal(result.node_count,2);
 assert.equal(result.edge_count,1);
 assert.equal(result.linked_edge_count,1);
 assert.equal(result.remote_episode_uuid,uuid);
 assert.equal(result.source_ref,input.source_refs[0]);
 assert.equal(result.evidence_class,'user-stated');
 assert.deepEqual(g.calls.map(x=>x[0]),['get_episodes','get_episode_entities']);
 assert.deepEqual(g.calls[1][1],{group_id:group,episode_uuids:[uuid]});
}));
test('mismatched remote group cannot expose graph objects',()=>fixture(async o=>{
 const g=stub(o.clusterId,'wrong_group');
 await assert.rejects(inspectEpisodeGraph({...o,group,graphiti:g}),
   /GRAPH_NODE_GROUP_NOT_PROVEN/);
}));
test('missing exact remote identity prevents entity read entirely',()=>fixture(async o=>{
 const g=stub(o.clusterId);
 g.call=async method=>{
  g.calls.push(method);
  if(method==='get_episodes')return {episodes:[{uuid,name:'wrong',group_id:group}]};
  throw Error('must not read entities');
 };
 const v=await inspectEpisodeGraph({...o,group,graphiti:g});
 assert.equal(v.status,'remote_identity_not_confirmed');
 assert.equal(g.calls.length,1);
}));
test('invalid graph payload fails visibly; does not invent empty edges',()=>fixture(async o=>{
 const g=stub(o.clusterId);
 g.call=async method=>method==='get_episodes'?
  {episodes:[{uuid,group_id:group,name:'curated-v1:'+o.clusterId}]}:{message:'no payload'};
 await assert.rejects(inspectEpisodeGraph({...o,group,graphiti:g}),
   /GRAPH_EPISODE_ENTITIES_UNAVAILABLE/);
}));
test('nonpersisted review does not query Graphiti',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'cur80-no-remote-'));
 try{
  const store=new ReviewStore(root,group),c=cluster();
  await store.create(c,{decision:'DEFER',reason:'Needs human review',facts:[]});
  const result=await inspectEpisodeGraph({store,root,group,clusterId:c.id,
    graphiti:{call:()=>{throw Error('forbidden')}}});
  assert.equal(result.status,'not_persisted');
 }finally{await rm(root,{recursive:true,force:true});}
});
