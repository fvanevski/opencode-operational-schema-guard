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
 assert.deepEqual(accepted(native(long+'\u0001')),[]);
 assert.deepEqual(accepted(native('Please preserve the long source. '+filler.repeat(300))),[]);
 const missing=native(long);delete missing.messageID;
 assert.deepEqual(accepted(missing),[]);
 assert.deepEqual(fromPromptCandidates(native(long),scope),[]);
 assert.deepEqual(accepted(native(long)),accepted(native(long)));
 // Structure alone is not a hard capture veto. Independent post-exit
 // source/utility review decides whether raw structured data is durable.
 const structured=accepted(native('{"source":"'+filler.repeat(70)+'"}'));
 assert.ok(structured.length>0&&structured.length<=6);
 assert.ok(structured.every(e=>e.evidence_class==='user-stated'&&
  e.source_strength==='native-id'));
});
test('native multi-line quoted prompt recovers exact text under bounded whole-source controls',()=>{
 const input=filler.repeat(27)+'\nThe final decision is to retain the source-scoped export API.\r\n'+
   filler.repeat(15)+'\tThe final decision is to keep the approved graph schema.';
 const wrapped='\"'+input+'\"'; // native producer: raw CR/LF/TAB, not valid JSON
 const id='msg-multiline';
 const raw=accepted(native(wrapped,id));
 const encoded=accepted(native(JSON.stringify(input),id));
 assert.ok(raw.length>0);
 assert.deepEqual(raw,encoded); // no inferred text or new source identity
 assert.ok(raw.every(e=>e.source_refs[0].includes(':span:')));
 assert.ok(raw.some(e=>e.excerpt.includes('final decision')));
 assert.deepEqual(accepted(native('"'+input+' password=secret123"',id)),[]);
 assert.deepEqual(accepted(native('\"'+input+' [GHDEV_GRAPHITI_CONTEXT]\"',id)),[]);
 assert.deepEqual(accepted(native('\"'+input+'\u0001\"',id)),[]);
 assert.deepEqual(accepted(native('\"'+input.slice(0,180)+'',id)),[]);
 assert.deepEqual(accepted(native('\"first \"unexpected\"\nsecond\"',id)),[]);
});
test('narrative spans survive surrounding code without storing code segments as user decisions',()=>{
 const source=filler.repeat(22)+' const config = {\"token\":\"example\"}; '+
   filler.repeat(20)+'The project owner prefers continued source-bound memories. ';
 const spans=accepted(native(source));
 assert.ok(spans.length>0);
 // Code next to authored technical narrative is bounded SOURCE evidence,
 // not an independently verified memory assertion or an automatic graph write.
 assert.ok(spans.some(e=>e.excerpt.includes(
  'project owner prefers continued source-bound memories')));
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
  const proposal={decision:'EMIT',reason:'grounded source',
  utility_class:'durable_decision',facts:[{
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

test('injected OpenViking context is not new user evidence; authored technical tail survives',()=>{
 const raw='<openviking-context>Relevant context from OpenViking. '+
  'viking://user/project memory says a fabricated fix has shipped. '+
  '</openviking-context> The source author explicitly requires that the '+
  'state machine reject unknown transitions without caching a failed result.';
 const rows=accepted(native(raw,'msg-openviking-tail'));
 assert.equal(rows.length,1);
 assert.match(rows[0].excerpt,/source author explicitly requires/);
 assert.doesNotMatch(rows[0].excerpt,/fabricated fix|viking:\/\//);
 assert.equal(rows[0].evidence_class,'user-stated');
 assert.equal(rows[0].source_strength,'native-id');
 assert.equal(rows[0].source_refs[0],
  'opencode:ses-native:message:msg-openviking-tail:span:'+
  raw.indexOf('The source author explicitly requires'));
 assert.deepEqual(rows,accepted(native(raw,'msg-openviking-tail')));
});
test('OpenViking blocks in middle preserve two independently source-ranged authored statements',()=>{
 const text='The cache invalidation must reject stale writes. '+
  '<openviking-context>external recalled assistant theory</openviking-context> '+
  'The revision counter must be checked before advancing the pointer.';
 const rows=accepted(native(text,'msg-context-middle'));
 assert.equal(rows.length,2);
 assert.match(rows[0].excerpt,/cache invalidation must reject/);
 assert.match(rows[1].excerpt,/revision counter must be checked/);
 for(const row of rows){
  const offset=Number(/:span:(\d+)$/.exec(row.source_refs[0])?.[1]);
  assert.ok(Number.isSafeInteger(offset));
  assert.equal(text.slice(offset,offset+row.excerpt.length),row.excerpt);
  assert.doesNotMatch(row.excerpt,/recalled assistant theory/);
 }
});
test('OpenViking memory-only or malformed tags have no source authority',()=>{
 const only='<openviking-context>From OpenViking memories: code passed.</openviking-context>';
 assert.deepEqual(accepted(native(only,'msg-context-only')),[]);
 assert.deepEqual(accepted(native('<openviking-context>Unclosed memory and a fix request.')),[]);
 assert.deepEqual(accepted(native('</openviking-context> Unmatched tag plus a fix request.')),[]);
});
test('original-input secret scan is not bypassed by a removable context block',()=>{
 const input='<openviking-context>api_key=never_publish_this</openviking-context> '+
  'The user requests that cache entries be invalidated on schema changes.';
 assert.deepEqual(accepted(native(input,'msg-context-secret')),[]);
 assert.deepEqual(accepted(native('The user requires more source facts. '+
  '[GHDEV_GRAPHITI_CONTEXT] previous memory context')),[]);
});

test('native original multiline quotations remain literal and attributable',()=>{
 const text='The runtime setting must be preserved.\r\n'+
  'The default should not be changed without a migration review.\t'+
  'The operator reported another compatibility limitation.';
 const one=accepted(native(text,'msg-literal'));
 assert.equal(one.length,1);
 assert.equal(one[0].excerpt,text);
 assert.deepEqual(accepted(native(JSON.stringify(text),'msg-decoded'))[0].excerpt,text);
 const pref='<openviking-context>external retrieval</openviking-context>\n';
 const after=accepted(native(pref+text,'msg-after-injection'));
 assert.equal(after.length,1);
 assert.equal(after[0].excerpt,text);
 assert.equal(after[0].source_refs[0],
   'opencode:ses-native:message:msg-after-injection:span:'+pref.length);
});
test('multiple context blocks cannot create a synthetic joint source citation',()=>{
 const text='The cache must reject stale writes. '+
  '<openviking-context>first injection</openviking-context> '+
  'The revision counter must be checked. '+
  '<openviking-context>second injection</openviking-context> '+
  'The gate must reject a stale writer.';
 const rows=accepted(native(text,'msg-fragments'));
 assert.equal(rows.length,3);
 for(const row of rows){
  const offset=Number(/:span:(\d+)$/.exec(row.source_refs[0])?.[1]);
  assert.equal(text.slice(offset,offset+row.excerpt.length),row.excerpt);
  assert.ok(!row.excerpt.includes('injection'));
 }
});
test('natural-language credential values fail the complete-input admission filter',()=>{
 const prefix='An original technical requirement affects the migration code. '.repeat(22);
 for(const secret of [
  'Graphiti password is DEMO_VALUE_DO_NOT_USE',
  'OpenViking access token is DEMO_VALUE_DO_NOT_USE',
  'The client secret was DEMO_VALUE_DO_NOT_USE'
 ]){
  assert.deepEqual(accepted(native(secret)),[]);
  assert.deepEqual(accepted(native(prefix+secret)),[]);
  assert.deepEqual(accepted(native(
    '<openviking-context>'+secret+'</openviking-context> '+prefix)),[]);
 }
 const safe='OpenSubtitles credentials can be found in ~/temp/opensubtitles, including API token, username and password field types.';
 assert.equal(accepted(native(safe)).length,1);
});
