import test from 'node:test';
import assert from 'node:assert/strict';
import {Memory} from './memory-core.mjs';
const group='development-knowledge',uuid='aaaaaaaa-1111-4111-8111-111111111111';
const source='opencode:ses-example:message:msg-example';
const query='What storage or persistence problem did we encounter with FalkorDB during the memory-system cutover?';
const fact='FalkorDB AOF crash loop caused effects format v2/v3 incompatibility.';
function fixture({groupId=group,sourceRef=source,policy='semantic'}={}){
  const calls=[];
  const graphiti={call:async(name,args)=>{
    calls.push({name,args});
    if(name==='search_memory_facts')return {facts:[{fact,group_id:groupId,episodes:[uuid]}]};
    throw Error('unexpected Graphiti call '+name);
  }};
  const resolver=async ids=>ids.map(remoteEpisodeUuid=>({status:'persisted',group,
    remoteEpisodeUuid,sourceRef,evidenceClass:'assistant-reported'}));
  const memory=new Memory({journal:{pages:async function*(){}},graphiti,group,
    extraSourceResolver:resolver,recallPolicy:policy});
  return {memory,calls};
}
test('semantic production selection recovers FalkorDB paraphrase with exact native source',async()=>{
  assert.deepEqual(await fixture({policy:'strict'}).memory.search(query),[]);
  const s=fixture(),found=await s.memory.search(query);
  assert.equal(found.length,1);assert.equal(found[0].fact,fact);
  assert.equal(found[0].source,source);
  assert.deepEqual(s.calls[0].args,{query,group_ids:[group],max_facts:24});
});
test('semantic mode cannot admit wrong-group or untrusted sources',async()=>{
  assert.deepEqual(await fixture({groupId:'wrong-group'}).memory.search(query),[]);
  assert.deepEqual(await fixture({sourceRef:'wrong-source'}).memory.search(query),[]);
});
test('curated-only candidate needs positive exact-group get_episodes proof',async()=>{
  const index=[{fact:'FalkorDB AOF storage was restored after the crash loop.',
    source,group,remoteEpisodeUuid:uuid,evidenceClass:'tool-reported'}];
  for(const remoteGroup of [group,'wrong-group']){
    const calls=[];
    const graphiti={call:async(name,args)=>{
      calls.push({name,args});
      return name==='search_memory_facts'?{facts:[]}:
        name==='get_episodes'?{episodes:[{uuid,group_id:remoteGroup}]}:{};
    }};
    const mem=new Memory({journal:{pages:async function*(){}},graphiti,group,
      curatedCandidateRetriever:async()=>index,recallPolicy:'semantic'});
    assert.equal((await mem.search(query)).length,remoteGroup===group?1:0);
    assert.deepEqual(calls.find(x=>x.name==='get_episodes').args,
      {group_ids:[group],max_episodes:1000});
    assert.equal(calls.some(x=>x.name==='add_memory'),false);
  }
});

test('Memory.search semantic policy preserves a strictly qualified index fact after fresh group proof',async()=>{
  const q='Why was the archive database migration delayed during recovery?';
  const origin='opencode:s0:message:index';
  const indexUUID='bbbbbbbb-2222-4222-8222-222222222222';
  const reasons=['workers','plugins','queues','cache','network','ports'];
  const facts=reasons.map((term,i)=>({fact:'The archive database migration logged subsystem '+
    term+' during the operational window.',group_id:group,
    episodes:[uuid]}));
  const local=[{fact:'Archive database migration was delayed because recovery required schema repairs.',
    source:origin,group,remoteEpisodeUuid:indexUUID,evidenceClass:'tool-reported',
    temporal:'current state not independently verified'}];
  const graphiti={call:async(name)=>{
    if(name==='search_memory_facts')return {facts};
    if(name==='get_episodes')return {episodes:[{uuid:indexUUID,group_id:group}]};
    throw Error('Unexpected remote operation '+name);
  }};
  const args={journal:{pages:async function*(){}},graphiti,group,
    extraSourceResolver:async ids=>ids.map(remoteEpisodeUuid=>({status:'persisted',
      group,remoteEpisodeUuid,sourceRef:'opencode:s0:message:native',
      evidenceClass:'tool-reported'})),
    curatedCandidateRetriever:async()=>local};
  const strict=await new Memory({...args,recallPolicy:'strict'}).search(q);
  assert.equal(strict[0]?.source,origin,'independent strict control selects the causal fact');
  const semantic=await new Memory({...args,recallPolicy:'semantic'}).search(q);
  assert.equal(semantic[0]?.source,origin);
  assert.ok(semantic.length>1,'additional sourced context remains available');
});
