import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Journal,Memory} from '../../issue-75/v2-candidate/memory-core.mjs';
import {curatedRecallCandidates,curatedRecallRetriever} from './curated-recall-candidates.mjs';
import {ReviewStore} from './core.mjs';
import {relevanceFilter,relevanceSignals,answerTypeSupport} from '../../issue-75/v2-candidate/relevance.mjs';

const group='qual-test', project='sample-app',workspace='/workspace/sample-app';
const uuid='12345678-1234-4234-a234-123456789abc';
const source='opencode:ses_test:message:msg_test';
async function fixture(cb){
  const root=await mkdtemp(path.join(os.tmpdir(),'gh81-curated-'));
  try {
    const dir=path.join(root,'curation-v1',group),id='a'.repeat(64);
    await mkdir(path.join(dir,'_episode-index'),{recursive:true});
    const review={id,group,project,workspace,state:'persisted',
      remote_episode_uuid:uuid,
      facts:[{assertion:'The durable archive retention service uses PostgreSQL storage.',
        source_refs:[source],evidence_class:'tool-reported',temporal_status:'observed'}],
      events:[{source_strength:'native-id',source_refs:[source],
        evidence_class:'tool-reported',
        excerpt:'The durable archive retention service uses PostgreSQL storage.'}]};
    await writeFile(path.join(dir,id+'.json'),JSON.stringify(review));
    await writeFile(path.join(dir,'_episode-index',uuid+'.json'),
      JSON.stringify({id,remote_episode_uuid:uuid}));
    return await cb({root,dir,id,review});
  } finally { await rm(root,{force:true,recursive:true}); }
}
test('curated candidate inventory requires persisted exact group/project/workspace and native-id source',()=>fixture(async f=>{
  const found=await curatedRecallCandidates(f.root,group,workspace,project);
  assert.equal(found.length,1);
  assert.equal(found[0].remoteEpisodeUuid,uuid);
  assert.equal(found[0].source,source);
  assert.equal(found[0].evidenceClass,'tool-reported');
  assert.deepEqual(await curatedRecallCandidates(f.root,group,workspace,'other'),[]);
  assert.deepEqual(await curatedRecallCandidates(f.root,'other',workspace,project),[]);
  const invalid={...f.review,events:[{...f.review.events[0],source_strength:'session-weak'}]};
  await writeFile(path.join(f.dir,f.id+'.json'),JSON.stringify(invalid));
  assert.deepEqual(await curatedRecallCandidates(f.root,group,workspace,project),[]);
}));
async function withMemory(remote,cb,{fact='The durable archive retention service uses PostgreSQL storage.'}={}){
  return fixture(async f=>{
    const rows=await curatedRecallCandidates(f.root,group,workspace,project);
    const calls=[];
    const graphiti={call:async(name,args)=>{
      calls.push({name,args});
      if(name==='search_memory_facts')return {facts:[]};
      if(name==='get_episodes')return remote;
      throw Error('unexpected Graphiti operation '+name);
    }};
    const mem=new Memory({journal:new Journal(f.root,group),graphiti,group,
      curatedCandidateRetriever:()=>rows});
    const result=await mem.search('Which durable archive retention service uses PostgreSQL storage?');
    await cb(result,calls);
  });
}
test('curated assertions inject only after fresh same-group remote UUID proof',async()=>{
  await withMemory({episodes:[{uuid,group_id:group}]},(found,calls)=>{
    assert.equal(found.length,1);
    assert.equal(found[0].source,source);
    assert.equal(found[0].evidenceClass,'tool-reported');
    assert.equal(Object.hasOwn(found[0],'sourceContext'),false);
    assert.equal(calls.filter(x=>x.name==='get_episodes').length,1);
    assert.deepEqual(calls.find(x=>x.name==='get_episodes').args,
      {group_ids:[group],max_episodes:1000});
    assert.equal(calls.some(x=>x.name==='add_memory'),false);
  });
  await withMemory({episodes:[]},found=>assert.deepEqual(found,[]));
  await withMemory({episodes:[{uuid,group_id:'wrong-group'}]},
    found=>assert.deepEqual(found,[]));
  await withMemory({episodes:[{uuid:'bad',group_id:group}]},
    found=>assert.deepEqual(found,[]));
  await withMemory({error:'unavailable'},found=>assert.deepEqual(found,[]));
});
test('curated lookup fails closed when remote get_episodes throws',()=>fixture(async f=>{
  const mem=new Memory({journal:new Journal(f.root,group),group,
    graphiti:{call:async name=>name==='search_memory_facts'?{facts:[]}:Promise.reject(Error('remote down'))},
    curatedCandidateRetriever:()=>curatedRecallCandidates(f.root,group,workspace,project)});
  return mem.search('Which durable archive retention service uses PostgreSQL storage?')
    .then(result=>assert.deepEqual(result,[]));
}));
test('source context is an admission hint, never a new authority or model assertion',async()=>{
  const query='How does the Graphiti MCP service isolate each group driver?';
  const fact='Each group driver clones an isolated workspace graph.';
  const linked={fact,sourceContext:'The Graphiti MCP service uses the group driver in this implementation.'};
  assert.equal(relevanceSignals(query,fact).eligible,false);
  assert.deepEqual(await relevanceFilter(query,[linked]),[linked]);
  assert.deepEqual(await relevanceFilter('How does the MongoDB service isolate each group driver?',[linked]),[],
    'a different named product cannot be waived by source context');
  assert.deepEqual(await relevanceFilter('How does Issue #81 isolate each group driver?',[linked]),[],
    'a contextual citation cannot satisfy an absent exact issue in an assertion');
  assert.deepEqual(await relevanceFilter('What changed on 6382 for each group driver?',[linked]),[],
    'numeric identity must occur in the assertion, not only source context');
});
test('generic requested answer type breaks port/why tie without weakening topical fences',async()=>{
  const portQuery='Which port hosts the durable archive storage service?';
  const port={fact:'The durable archive storage service runs on port 6382.'};
  const irrelevant={fact:'The durable archive storage service routes reads to a different graph.'};
  assert.equal(answerTypeSupport(portQuery,port.fact),1);
  assert.equal(answerTypeSupport(portQuery,irrelevant.fact),0);
  assert.deepEqual(await relevanceFilter(portQuery,[irrelevant,port]),[port]);
  const whyQuery='Why does the storage layer use separate graphs for each workspace?';
  const causal={fact:'The storage layer clones drivers per-group, so that each workspace uses a separate graph.'};
  const state={fact:'The storage layer has 35 nodes in the separate workspace graph.'};
  assert.deepEqual(await relevanceFilter(whyQuery,[state,causal]),[causal]);
  assert.deepEqual(await relevanceFilter('Which MongoDB service handles reports?',[causal]),[]);
});
test('private and short prompt admission fences remain unchanged even with a curated retriever',()=>fixture(async f=>{
  const calls=[],graphiti={call:async(name)=>{calls.push(name);return {facts:[]};}};
  const mem=new Memory({journal:new Journal(f.root,group),graphiti,group,
    curatedCandidateRetriever:()=>curatedRecallCandidates(f.root,group,workspace,project)});
  assert.deepEqual(await mem.search('hi'),[]);
  assert.deepEqual(await mem.search('Use api_key=secret for the archive'),[]);
  assert.deepEqual(calls,[]);
}));


test('Graphiti MCP search and remote-proof reads never overlap',()=>fixture(async f=>{
  const rows=await curatedRecallCandidates(f.root,group,workspace,project);
  let active=0,maxActive=0;
  const graphiti={call:async name=>{
    active++;maxActive=Math.max(maxActive,active);
    try{
      await new Promise(resolve=>setTimeout(resolve,3));
      return name==='search_memory_facts'?{facts:[]}:
        name==='get_episodes'?{episodes:[{uuid,group_id:group}]}:{};
    }finally{active--;}
  }};
  const mem=new Memory({journal:new Journal(f.root,group),graphiti,group,
    curatedCandidateRetriever:()=>rows});
  const result=await mem.search('Which durable archive retention service uses PostgreSQL storage?');
  assert.equal(result.length,1);
  assert.equal(maxActive,1,'remote Graphiti MCP operations must be serialized');
}));

const growthId=n=>n.toString(16).padStart(64,'0');
const growthUUID=n=>'aaaaaaaa-aaaa-4aaa-8aaa-'+n.toString(16).padStart(12,'0');
const growthQuery='Which PostgreSQL database stores durable archive state?';
async function growthFixture({persisted,deferred,targetIndex},check) {
  const root=await mkdtemp(path.join(os.tmpdir(),'gh81-growth-'));
  try {
    const dir=path.join(root,'curation-v1',group);
    await mkdir(path.join(dir,'_episode-index'),{recursive:true});
    for(let start=1;start<=persisted+deferred;start+=48) {
      const pending=[];
      for(let n=start;n<=Math.min(start+47,persisted+deferred);n++) {
        const id=growthId(n),remote_episode_uuid=growthUUID(n),active=n<=persisted;
        const fact=n===targetIndex?'PostgreSQL database stores durable archive state.':
          'Unrelated compilation inventory item '+n+' completed.';
        const review={id,group,project,workspace,state:active?'persisted':'deferred',
          remote_episode_uuid:active?remote_episode_uuid:null,
          facts:active?[{assertion:fact,source_refs:[source],
            evidence_class:'tool-reported',temporal_status:'observed'}]:[],
          events:active?[{source_strength:'native-id',source_refs:[source],
            evidence_class:'tool-reported',excerpt:fact}]:[]};
        pending.push(writeFile(path.join(dir,id+'.json'),JSON.stringify(review)));
        if(active)pending.push(writeFile(path.join(dir,'_episode-index',
          remote_episode_uuid+'.json'),JSON.stringify({id,remote_episode_uuid})));
      }
      await Promise.all(pending);
    }
    await check({root,targetUUID:growthUUID(targetIndex)});
  }finally{await rm(root,{recursive:true,force:true});}
}
test('299 persisted sources survive the former 288-inventory blackout',()=>growthFixture(
  {persisted:299,deferred:199,targetIndex:299},async({root,targetUUID})=>{
    for(const policy of ['strict','semantic']) {
      const found=await curatedRecallCandidates(root,group,workspace,project,growthQuery,policy);
      assert.equal(found.length,1);assert.equal(found[0].remoteEpisodeUuid,targetUUID);
      assert.equal(found[0].source,source);assert.equal(found[0].group,group);
    }
    const legacy=await curatedRecallCandidates(root,group,workspace,project);
    assert.equal(legacy.length,299,'resolver must batch, not truncate at 288');
  }));
test('query-local search includes persisted fact after the first 500 reviews',()=>growthFixture(
  {persisted:513,deferred:0,targetIndex:513},async({root,targetUUID})=>{
    for(const policy of ['strict','semantic']) {
      const found=await curatedRecallCandidates(root,group,workspace,project,growthQuery,policy);
      assert.equal(found.length,1);
      assert.equal(found[0].remoteEpisodeUuid,targetUUID);
      assert.ok(found.length<=24);
    }
  }));
test('growing inventory does not bypass workspace, project or privacy fences',()=>growthFixture(
  {persisted:1,deferred:0,targetIndex:1},async({root})=>{
    assert.deepEqual(await curatedRecallCandidates(root,group,'/workspace/other',project,growthQuery,'semantic'),[]);
    assert.deepEqual(await curatedRecallCandidates(root,group,workspace,'other',growthQuery,'strict'),[]);
    assert.deepEqual(await curatedRecallCandidates(root,group,workspace,project,
      'Use api_key=secret for production','semantic'),[]);
  }));

test('query-scoped production/replay retriever reads each inventory record only once',()=>growthFixture(
  {persisted:513,deferred:0,targetIndex:513},async({root,targetUUID})=>{
    const retriever=curatedRecallRetriever(root,group,workspace,project);
    const original=ReviewStore.prototype.get;
    let reads=0;
    ReviewStore.prototype.get=async function(...args) {
      reads++; return original.apply(this,args);
    };
    try {
      const found=await retriever(growthQuery,'semantic');
      assert.equal(found.length,1);
      assert.equal(found[0].remoteEpisodeUuid,targetUUID);
      assert.ok(reads<=514,'513 inventory reads plus at most one source-index proof, not repeated full scans: '+reads);
      assert.ok(reads>=513,'scan must not silently drop reviews');
    }finally{ReviewStore.prototype.get=original;}
    // Omitting the query still invokes the deliberately bounded legacy API.
    // Production and replay MUST pass the real query/policy instead.
    assert.deepEqual(await retriever(),[]);
  }));
