import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fromPrompt,fromPromptCandidates,fromTool} from './events.mjs';
import {CandidateQueue} from './queue.mjs';
import plugin from './plugin.mjs';
import {selectClusters,modelPrompt,validateModelDecision} from '../v2-curator/core.mjs';

const scope={project:'memory',workspace:'/workspace/memory',group:'qa81'};
const native=(text,id='msg-long')=>({sessionID:'ses-native',messageID:id,
  timestamp:'2026-11-04T15:00:00Z',prompt:{text}});
const filler='The design constraint is that event evidence remains scoped and source linked. ';
const long=(filler.repeat(175)+'The final decision is to retain the existing source index during migration. ');
const accepted=e=>fromPromptCandidates(e,scope,{admitted:true});
async function scratch(fn){
 const root=await mkdtemp(path.join(os.tmpdir(),'capture81-'));
 try{return await fn(root);}finally{await rm(root,{recursive:true,force:true});}
}
test('long native message becomes at most six distinct, bounded, deterministic source spans',()=>{
 const chunks=accepted(native(long));
 assert.equal(chunks.length,6);
 assert.ok(chunks.every(e=>e.kind==='user_turn'&&e.evidence_class==='user-stated'&&
   e.source_strength==='native-id'&&e.excerpt.length<=900&&
   e.source_refs[0].startsWith('opencode:ses-native:message:msg-long:span:')));
 assert.equal(new Set(chunks.map(x=>x.event_id)).size,chunks.length);
 assert.deepEqual(chunks,accepted(native(long)));
 assert.equal(fromPrompt(native(long),scope,{admitted:true}).event_id,chunks[0].event_id);
 assert.match(chunks.at(-1).excerpt,/final decision is to retain the existing source index/);
 assert.ok(accepted(native(long,'msg-other'))[0].event_id!==chunks[0].event_id);
});
test('whole-message privacy, SELF, control, oversized payload and weak-ID gates precede segmentation',()=>{
 assert.deepEqual(accepted(native(long+' password=secret123')),[]);
 assert.deepEqual(accepted(native(long+' [GHDEV_GRAPHITI_CONTEXT]')),[]);
 assert.deepEqual(accepted(native(long+' [OPENVIKING_CONTEXT]')),[]);
 assert.deepEqual(accepted(native(long+'\\u0001')),[]);
 assert.deepEqual(accepted(native('Please preserve the long source. '+filler.repeat(300))),[]);
 const missing=native(long);delete missing.messageID;
 assert.deepEqual(accepted(missing),[]);
 assert.deepEqual(fromPromptCandidates(native(long),scope),[]);
 assert.deepEqual(accepted(native(long)),accepted(native(long)));
 assert.deepEqual(accepted(native('{"source":"'+filler.repeat(70)+'"}')),[]);
});
test('narrative spans survive surrounding code without storing code segments as user decisions',()=>{
 const source=filler.repeat(22)+' const config = {\"token\":\"example\"}; '+
   filler.repeat(20)+'The project owner prefers continued source-bound memories. ';
 const spans=accepted(native(source));
 assert.ok(spans.length>0);
 assert.ok(spans.every(e=>!/[{}]/.test(e.excerpt)));
 assert.ok(spans.every(e=>e.source_refs[0].includes(':span:')));
});
test('long source span is a real native source handle and cannot become a model-invented statement',async()=>{
 await scratch(async root=>{
  const parts=accepted(native(long));
  const q=new CandidateQueue(root,scope.group);
  for(const e of parts)assert.equal((await q.stage(e)).status,'staged');
  for(const e of parts)assert.equal((await q.stage(e)).status,'duplicate');
  const rows=(await q.list()).items;
  const clusters=selectClusters(rows,{maxEvents:8});
  assert.equal(clusters.length,1);
  assert.equal(clusters[0].events.length,parts.length);
  assert.match(modelPrompt(clusters[0])[0].content,/omitted statements/);
  const target=clusters[0].events[0];
  const quote=target.excerpt.slice(0,74).trim();
  const proposal={decision:'EMIT',reason:'grounded source',facts:[{
    assertion:quote,kind:'observation',
    source_refs:[target.source_refs[0]],temporal_status:'observed'}]};
  assert.equal(validateModelDecision(proposal,clusters[0]).ok,true);
  assert.equal(validateModelDecision({...proposal,facts:[{
    ...proposal.facts[0],assertion:'The model may invent facts that were not in the cited source.'
  }]},clusters[0]).ok,false);
 });
});
test('native plugin stages all admitted long spans but no speculative or missing-result shell facts',()=>scratch(async root=>{
 const hooks={},toolHooks={};
 const ctx={directory:scope.workspace,options:{enabled:true,capture:true,
   group:scope.group,workspace:scope.workspace,project:scope.project,stateDir:root,
   endpoint:'http://127.0.0.1:1/mcp'},
  session:{hook:(name,cb)=>{(hooks[name]??=[]).push(cb);
    return {dispose:async()=>{}};}},
  tool:{hook:(name,cb)=>{(toolHooks[name]??=[]).push(cb);
    return {dispose:async()=>{}};}}};
 const stop=await plugin.setup(ctx),q=new CandidateQueue(root,scope.group);
 for(const cb of hooks.prompt)await cb(native(long));
 assert.equal((await q.status()).total,0);
 for(const cb of hooks.context)await cb({sessionID:'ses-native',system:[]});
 const source=accepted(native(long));
 for(const cb of toolHooks['execute.after'])await cb({
  sessionID:'ses-native',callID:'tool-test',tool:'shell',status:'completed',
  input:{command:'node --test source.test.mjs'},result:{output:{exit:0,output:'3 passed'}}});
 await stop();
 const rows=(await q.list()).items;
 assert.equal(rows.filter(e=>e.kind==='user_turn').length,source.length);
 const tool=rows.find(e=>e.kind==='tool_outcome');
 assert.ok(tool);
 assert.match(tool.excerpt,/3 passed/);
 assert.ok(tool.related_event_ids.includes(source[0].event_id));
 assert.equal(fromTool({sessionID:'ses-native',callID:'tool-empty',tool:'shell',
  status:'completed',input:{command:'node --test source.test.mjs'}},scope),null);
}));
