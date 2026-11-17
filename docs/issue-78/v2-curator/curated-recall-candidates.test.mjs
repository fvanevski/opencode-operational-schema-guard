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

test('more than 4096 review records retain indexed persisted facts without skipping old IDs',
  ()=>growthFixture({persisted:1,deferred:4096,targetIndex:1},async({root,targetUUID})=>{
    for(const policy of ['strict','semantic']) {
      const found=await curatedRecallCandidates(root,group,workspace,project,growthQuery,policy);
      assert.equal(found.length,1,'deferred growth must not black out persisted index');
      assert.equal(found[0].remoteEpisodeUuid,targetUUID);
      assert.equal(found[0].source,source);
    }
    assert.deepEqual(await curatedRecallCandidates(
      root,group,'/workspace/other',project,growthQuery,'semantic'),[]);
    assert.deepEqual(await curatedRecallCandidates(
      root,group,workspace,'other',growthQuery,'strict'),[]);
    // Source-index corruption cannot become a positive provenance claim.
    const index=path.join(root,'curation-v1',group,'_episode-index',targetUUID+'.json');
    await writeFile(index,JSON.stringify({id:'f'.repeat(64),remote_episode_uuid:targetUUID}));
    assert.deepEqual(await curatedRecallCandidates(
      root,group,workspace,project,growthQuery,'semantic'),[]);
  }));
test('unrelated malformed index JSON cannot blackout healthy persisted candidates after 4096 reviews',
  ()=>growthFixture({persisted:2,deferred:4095,targetIndex:1},async({root,targetUUID})=>{
    const index=path.join(root,'curation-v1',group,'_episode-index',
      growthUUID(2)+'.json');
    await writeFile(index,'{');
    for(const policy of ['strict','semantic']) {
      const found=await curatedRecallCandidates(root,group,workspace,project,growthQuery,policy);
      assert.equal(found.length,1,'an invalid unrelated index must be skipped, not reject all');
      assert.equal(found[0].remoteEpisodeUuid,targetUUID);
      assert.equal(found[0].source,source);
    }
    // Adjacent failure boundary: corrupt review JSON and corrupt identity/state
    // must not suppress a distinct, positively indexed healthy review.
    await writeFile(index,JSON.stringify({
      id:growthId(2),remote_episode_uuid:growthUUID(2)
    }));
    const reviewPath=path.join(root,'curation-v1',group,growthId(2)+'.json');
    for(const invalid of ['{','null',JSON.stringify({id:growthId(2),group:'wrong',state:'persisted'})]) {
      await writeFile(reviewPath,invalid);
      if(invalid==='null')await assert.rejects(
        ()=>new ReviewStore(root,group).get(growthId(2)),
        /Corrupt review identity\/state/,
        'valid JSON null must be classified as corrupted review data, not a TypeError');
      for(const policy of ['strict','semantic']) {
        const found=await curatedRecallCandidates(root,group,workspace,project,growthQuery,policy);
        assert.equal(found.length,1,'an unrelated corrupt review must be skipped');
        assert.equal(found[0].remoteEpisodeUuid,targetUUID);
      }
    }
  }));

test('remote >=1000 episode inventory remains fail-closed after local overflow recovery',
  ()=>growthFixture({persisted:1,deferred:4096,targetIndex:1},async({root})=>{
    const calls=[];
    const graphiti={call:async name=>{
      calls.push(name);
      if(name==='search_memory_facts')return {facts:[]};
      if(name==='get_episodes')return {episodes:Array.from({length:1000},(_,n)=>({
        uuid:growthUUID(n+1),group_id:group
      }))};
      throw Error('unexpected Graphiti operation '+name);
    }};
    const memory=new Memory({journal:new Journal(root,group),graphiti,group,
      curatedCandidateRetriever:curatedRecallRetriever(root,group,workspace,project)});
    const result=await memory.search(growthQuery);
    assert.deepEqual(result,[],'full remote inventory never grants group membership');
    assert.ok(calls.includes('get_episodes'));
    assert.ok(!calls.includes('add_memory'));
  }));

test('missing reserved episode cannot suppress the next proven strict winner',async()=>{
  const q='What database did we originally use for archive storage recovery?';
  for(const proofFailure of ['remote-episode','local-index']) {
    const root=await mkdtemp(path.join(os.tmpdir(),'gh81-fallback-'));
    try {
      const dir=path.join(root,'curation-v1',group);
      await mkdir(path.join(dir,'_episode-index'),{recursive:true});
      const claims=[
        'We previously used database snapshots.',
        'We previously used database backups.',
        ...Array.from({length:24},(_,i)=>
          'Archive storage recovery database validation job '+i+' completed.')
      ];
      const uuids=claims.map((_,i)=>growthUUID(i+1));
      for(let i=0;i<claims.length;i++) {
        const id=growthId(i+1),remote_episode_uuid=uuids[i],assertion=claims[i];
        const review={id,group,workspace,project,state:'persisted',
          remote_episode_uuid,
          facts:[{assertion,source_refs:[source],evidence_class:'tool-reported',
            temporal_status:'observed'}],
          events:[{source_strength:'native-id',source_refs:[source],
            evidence_class:'tool-reported',excerpt:assertion}]};
        await writeFile(path.join(dir,id+'.json'),JSON.stringify(review));
        if(i!==0||proofFailure!=='local-index') {
          await writeFile(path.join(dir,'_episode-index',remote_episode_uuid+'.json'),
            JSON.stringify({id,remote_episode_uuid}));
        }
      }
      const retriever=curatedRecallRetriever(root,group,workspace,project);
      const indexRows=await retriever(q,'semantic');
      assert.ok(indexRows.length<=48,'two bounded 24-slot pre-proof lanes');
      assert.ok(indexRows.some(x=>x.fact===claims[1]),
        'strict runner-up must survive the first semantic cut');
      const calls=[];
      const graphiti={call:async(name,args)=>{
        calls.push({name,args});
        if(name==='search_memory_facts')return {facts:[]};
        if(name==='get_episodes')return {episodes:uuids
          .filter((_,i)=>i!==0||proofFailure!=='remote-episode')
          .map(uuid=>({uuid,group_id:group}))};
        throw Error('unexpected Graphiti operation '+name);
      }};
      const build=policy=>new Memory({
        journal:new Journal(root,group),graphiti,group,recallPolicy:policy,
        curatedCandidateRetriever:retriever
      });
      const strict=await build('strict').search(q);
      const semantic=await build('semantic').search(q);
      assert.equal(strict[0]?.fact,claims[1],
        'strict control selects the next source with valid proof');
      assert.equal(semantic[0]?.fact,claims[1],
        'semantic must preserve that proven strict fallback');
      assert.ok(semantic.length<=5);
      assert.ok(!semantic.some(x=>x.fact===claims[0]),
        'the unproven reserved claim must never enter context');
      assert.equal(calls.filter(x=>x.name==='get_episodes').length,2);
      assert.ok(calls.every(x=>x.name!=='add_memory'));
    }finally{await rm(root,{recursive:true,force:true});}
  }
});

test('issue #101: <=4096 individual bad review isolation and nonauthorizing nested data',
  ()=>fixture(async({root,dir,review})=>{
    const badId='b'.repeat(64),badUuid='87654321-4321-4321-8321-abcdefabcdef';
    const other={...review,id:badId,remote_episode_uuid:badUuid};
    await writeFile(path.join(dir,'_episode-index',badUuid+'.json'),
      JSON.stringify({id:badId,remote_episode_uuid:badUuid}));
    for(const raw of [
      '{','null',JSON.stringify({...other,group:'wrong'}),
      JSON.stringify({...other,events:{}}),
      JSON.stringify({...other,events:[{source_refs:null}]}),
      JSON.stringify({...other,facts:[null]})
    ]) {
      await writeFile(path.join(dir,badId+'.json'),raw);
      for(const policy of ['strict','semantic']) {
        const found=await curatedRecallCandidates(root,group,workspace,project,
          growthQuery,policy);
        assert.deepEqual(found.map(x=>x.remoteEpisodeUuid),[uuid]);
      }
      const compatible=await curatedRecallCandidates(root,group,workspace,project);
      assert.deepEqual(compatible.map(x=>x.remoteEpisodeUuid),[uuid]);
    }
    await writeFile(path.join(dir,review.id+'.json'),'{');
    assert.deepEqual(await curatedRecallCandidates(root,group,workspace,project,
      growthQuery,'semantic'),[],
      'bad indexed target never becomes an authorized source');
  }));

test('issue #101: automatic query reads indexed facts, not unindexed deferred history',
  ()=>growthFixture({persisted:1,deferred:513,targetIndex:1},
    async({root,targetUUID})=>{
      const original=ReviewStore.prototype.get,ids=[];
      ReviewStore.prototype.get=async function(id){
        ids.push(id);
        return original.call(this,id);
      };
      try{
        for(const policy of ['strict','semantic']) {
          const found=await curatedRecallCandidates(root,group,workspace,project,
            growthQuery,policy);
          assert.deepEqual(found.map(x=>x.remoteEpisodeUuid),[targetUUID]);
        }
        assert.deepEqual([...new Set(ids)],[growthId(1)]);
        assert.ok(ids.length<=4,'one indexed read and one local resolver per policy');
      } finally {ReviewStore.prototype.get=original;}
    }));

test('issue #101: invalid data isolation never conceals permission or IO failures',
  ()=>fixture(async({root,dir,review})=>{
    const badId='b'.repeat(64),badUuid='87654321-4321-4321-8321-abcdefabcdef';
    await writeFile(path.join(dir,badId+'.json'),JSON.stringify({
      ...review,id:badId,remote_episode_uuid:badUuid
    }));
    await writeFile(path.join(dir,'_episode-index',badUuid+'.json'),
      JSON.stringify({id:badId,remote_episode_uuid:badUuid}));
    const original=ReviewStore.prototype.get;
    ReviewStore.prototype.get=async function(id) {
      if(id===badId)throw Object.assign(new Error('permission denied'),{code:'EACCES'});
      return original.call(this,id);
    };
    try{
      await assert.rejects(curatedRecallCandidates(root,group,workspace,project,
        growthQuery,'semantic'),e=>e?.code==='EACCES');
      await assert.rejects(curatedRecallCandidates(root,group,workspace,project),
        e=>e?.code==='EACCES');
    } finally {ReviewStore.prototype.get=original;}
  }));
