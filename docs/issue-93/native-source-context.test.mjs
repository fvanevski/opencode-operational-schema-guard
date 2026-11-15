/**
 * Issue #93: deterministic native-hook context integration with the accepted
 * #92 one-fact ReviewStore source/index path. No network, Graphiti mutation,
 * installed OpenCode configuration, GPU inference, or external daemon.
 *
 * Authenticated test doubles simulate Graphiti search and episode membership.
 * This test does NOT certify a live Graphiti service or assembled model answer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import plugin from '../issue-75/v2-candidate/plugin.mjs';
import { curatedRecallRetriever } from '../issue-78/v2-curator/curated-recall-candidates.mjs';
import { sourcedEpisodeResolver } from '../issue-78/v2-curator/sourced-recall.mjs';

const group='issue93-source-proof';
const workspace='/workspace/issue93-source-proof';
const project='issue93-source-proof';
const sourceRef='opencode:ses-issue93:message:msg-source';
const uuid='12345678-1234-4234-a234-123456789abc';
const fact='The durable archive service selected PostgreSQL as its storage database.';
const query='Which storage database was selected for the durable archive service?';
const PRIVATE_EXCERPT='UNPUBLISHED_SOURCE_CONTEXT_DO_NOT_INJECT';
const MARKER='[GHDEV_GRAPHITI_CONTEXT]';

async function withFixture(options, check) {
  const root=await mkdtemp(path.join(os.tmpdir(),'issue93-native-source-'));
  const originalFetch=globalThis.fetch;
  let cleanup=null;
  const calls=[];
  try {
    const dir=path.join(root,'curation-v1',group);
    await mkdir(path.join(dir,'_episode-index'),{recursive:true});
    const id='a'.repeat(64);
    const review={id,group,project,workspace,state:'persisted',
      remote_episode_uuid:uuid,
      facts:[{assertion:fact,source_refs:[sourceRef],
        evidence_class:'tool-reported',temporal_status:'observed'}],
      events:[{source_strength:'native-id',source_refs:[sourceRef],
        evidence_class:'tool-reported',excerpt:PRIVATE_EXCERPT+' '+fact}]};
    if(options?.untrustedSource)review.events[0].source_strength='session-weak';
    if(!options?.noReview){
      await writeFile(path.join(dir,id+'.json'),JSON.stringify(review));
      await writeFile(path.join(dir,'_episode-index',uuid+'.json'),
        JSON.stringify({id,remote_episode_uuid:uuid}));
    }
    globalThis.fetch=async (url,init)=>{
      assert.equal(new URL(url).hostname,'127.0.0.1');
      assert.equal(init.method,'POST');
      const req=JSON.parse(init.body);
      calls.push({method:req.method,name:req.params?.name,args:req.params?.arguments});
      let result;
      if(req.method==='initialize')result={protocolVersion:'2025-06-18',capabilities:{},serverInfo:{name:'fixture',version:'1'}};
      else if(req.method==='tools/call'){
        if(req.params.name==='search_memory_facts'){
          result={structuredContent:{result:{facts:options?.searchFacts??[]}}};
        }else if(req.params.name==='get_episodes'){
          result={structuredContent:{result:{episodes:options?.episodes??[{uuid,group_id:group}]}}};
        }else throw Error('Unauthorized test Graphiti tool '+req.params.name);
      }else throw Error('Unexpected Graphiti RPC method '+req.method);
      return {ok:true,status:200,headers:{get:k=>k==='mcp-session-id'?'issue93-fixture':null},
        text:async()=>JSON.stringify({jsonrpc:'2.0',id:req.id,result})};
    };
    const hooks={};
    const register=(kind,name,fn)=>{
      if(!hooks[kind])hooks[kind]={};
      hooks[kind][name]=fn;
      return {dispose(){}};
    };
    const ctx={options:{
      enabled:true,capture:false,recallPolicy:options?.policy??'semantic',
      endpoint:'http://127.0.0.1:8766/mcp',group,stateDir:root,
      sourcedEpisodeResolver:ids=>sourcedEpisodeResolver(root,group,workspace,project,ids),
      curatedCandidateRetriever:curatedRecallRetriever(root,group,workspace,project),
    },session:{hook:async(name,fn)=>register('session',name,fn)},
       tool:{hook:async(name,fn)=>register('tool',name,fn)}};
    cleanup=await plugin.setup(ctx);
    assert.equal(typeof hooks.session.prompt,'function');
    assert.equal(typeof hooks.session.context,'function');
    async function request(text=query,{sessionID='issue93-session',id='issue93-msg'}={}){
      hooks.session.prompt({sessionID,messageID:id,prompt:{text}});
      const event={sessionID,system:[],messages:[{role:'user',id,
        parts:[{type:'text',text}]}]};
      await hooks.session.context(event);
      return event.system.map(p=>p.text).join('\n');
    }
    await check({request,calls,root});
  }finally{
    if(typeof cleanup==='function')await cleanup();
    globalThis.fetch=originalFetch;
    await rm(root,{recursive:true,force:true});
  }
}

test('native hook presents a sourced #92 curated fact with positive remote proof',async()=>{
  await withFixture({},async({request,calls})=>{
    const context=await request();
    assert.match(context,/\[GHDEV_GRAPHITI_CONTEXT\]/);
    assert.ok(context.includes(fact));
    assert.ok(context.includes(sourceRef));
    assert.ok(context.includes('tool-reported'));
    assert.equal(context.includes(PRIVATE_EXCERPT),false,
      'source evidence excerpt may rank, but cannot leak into model-facing context');
    assert.ok(calls.some(x=>x.name==='search_memory_facts'));
    assert.ok(calls.some(x=>x.name==='get_episodes'));
    assert.ok(calls.every(x=>x.name!=='add_memory'&&x.name!=='delete_episode'));
  });
});

test('source-backed native recall fails closed without fresh remote membership',async()=>{
  for(const episodes of [[],[{uuid,group_id:'other-group'}],
    [{uuid:'bad-uuid',group_id:group}]]){
    await withFixture({episodes},async({request})=>
      assert.equal(await request(),''));
  }
});

test('untrusted or missing ReviewStore source proof never reaches the native context',async()=>{
  for(const opts of [{noReview:true},{untrustedSource:true}]){
    await withFixture(opts,async({request})=>assert.equal(await request(),''));
  }
});

test('wrong-group Graphiti facts cannot bypass exact group proof',async()=>{
  await withFixture({noReview:true,searchFacts:[
    {fact,group_id:'wrong-group',episodes:[uuid]}]},
  async({request})=>assert.equal(await request(),''));
});

test('negative question and pre-Graphiti privacy fence abstain',async()=>{
  await withFixture({},async({request,calls})=>{
    assert.equal(await request('How many moons does Jupiter currently have?'),'');
    const before=calls.filter(x=>x.name==='search_memory_facts').length;
    assert.equal(await request('Use api_key=secret for database migration.'),'');
    assert.equal(calls.filter(x=>x.name==='search_memory_facts').length,before);
  });
});

test('native message attribution blocks unrelated session prompt association',async()=>{
  await withFixture({},async({request})=>{
    assert.match(await request(),/\[GHDEV_GRAPHITI_CONTEXT\]/);
    assert.match(await request(query,{sessionID:'other-session',id:'other-msg'}),
      /\[GHDEV_GRAPHITI_CONTEXT\]/);
  });
});
