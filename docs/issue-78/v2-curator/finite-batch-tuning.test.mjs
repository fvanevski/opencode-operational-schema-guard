import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {validateFiniteBatchTuning,loadFiniteBatchTuning,
 stageModelSettings,tunedMessages,tuningIdentity,tuningSummary,
 TUNING_SCHEMA} from './finite-batch-tuning.mjs';
import {curateCluster} from './model.mjs';

const config={schema:TUNING_SCHEMA,stages:{
 discovery:{model:'chat-fast',temperature:0.2,max_tokens:1024,
  timeout_ms:60000,prompt_guidance:'Prioritize specific source-stated constraints.'},
 utility:{model:'chat-review',reasoning_effort:'medium',
  max_tokens:3072,temperature:0,timeout_ms:120000,
  prompt_guidance:'Prefer recall of reported technical defects.'}
}};
test('bounded per-stage profiles resolve independent model, reasoning, token and prompt controls',()=>{
 const parsed=validateFiniteBatchTuning(config);
 const discovery=stageModelSettings('discovery',{modelId:'chat-fast'},parsed);
 const utility=stageModelSettings('utility',{modelId:'chat-fast'},parsed);
 assert.equal(discovery.model,'chat-fast');
 assert.equal(discovery.options.temperature,0.2);
 assert.equal(discovery.options.maxTokens,1024);
 assert.equal(discovery.options.reasoningEffort,null);
 assert.equal(utility.model,'chat-review');
 assert.equal(utility.options.reasoningEffort,'medium');
 assert.equal(utility.options.maxTokens,3072);
 assert.equal(utility.options.timeoutMs,120000);
 assert.notEqual(discovery.request_sha256,utility.request_sha256);
 const base=[{role:'system',content:'Extract facts from source'},
  {role:'user',content:'{"evidence":[]}'}];
 const tuned=tunedMessages(base,utility);
 assert.equal(tuned[1],base[1]);
 assert.ok(tuned[0].content.includes('Prefer recall of reported technical defects.'));
 assert.ok(tuned[0].content.includes('cannot override authenticated-source'));
 assert.deepEqual(tunedMessages(base,stageModelSettings('arbitration',
  {modelId:'chat-fast'},parsed)),base);
});
test('default profile maintains exact existing prompt and zero-temperature non-reasoning policy',()=>{
 const base=[{role:'system',content:'unchanged'},{role:'user',content:'{}'}];
 const stage=stageModelSettings('discovery',{modelId:'chat-fast'},null);
 assert.deepEqual(tunedMessages(base,stage),base);
 assert.deepEqual(stage.options,{maxTokens:1600,timeoutMs:90000,
  temperature:0,reasoningEffort:null});
 assert.equal(tuningIdentity(null),tuningIdentity({schema:TUNING_SCHEMA,stages:{}}));
});
test('schema rejects unknown fields, out-of-range resource knobs and incompatible thinking aliases',()=>{
 const bad=[
  {schema:TUNING_SCHEMA,stages:{utility:{unsafe_disable_source_validation:true}}},
  {schema:TUNING_SCHEMA,stages:{collection:{temperature:0.1}}},
  {schema:TUNING_SCHEMA,stages:{utility:{max_tokens:10000}}},
  {schema:TUNING_SCHEMA,stages:{utility:{temperature:2}}},
  {schema:TUNING_SCHEMA,stages:{utility:{timeout_ms:300000}}},
  {schema:TUNING_SCHEMA,stages:{utility:{prompt_guidance:'x'.repeat(1601)}}}
 ];
 for(const v of bad)assert.throws(()=>validateFiniteBatchTuning(v),/ISSUE92_TUNING_/);
 assert.throws(()=>stageModelSettings('utility',{modelId:'chat-fast'},
  {schema:TUNING_SCHEMA,stages:{utility:{reasoning_effort:'high'}}}),
  /REASONING_MODEL_INCOMPATIBLE/);
 assert.equal(stageModelSettings('utility',{modelId:'chat-review'},
  {schema:TUNING_SCHEMA,stages:{utility:{reasoning_effort:'off'}}})
  .options.reasoningEffort,null);
});
test('private tuning file loader is bounded, explicit and reporting excludes guidance text',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'issue92-tuning-'));
 try{
  const filename=path.join(root,'tuning.json');
  await writeFile(filename,JSON.stringify(config),{mode:0o600});
  assert.deepEqual(await loadFiniteBatchTuning(filename),
   validateFiniteBatchTuning(config));
  const summary=tuningSummary(config);
  assert.equal(summary.profile_sha256,tuningIdentity(config));
  assert.equal(JSON.stringify(summary).includes('Prefer recall of reported'),false);
  assert.match(summary.stages.utility.prompt_guidance_sha256,/^[0-9a-f]{64}$/);
  await assert.rejects(loadFiniteBatchTuning('relative.json'),/ABSOLUTE_CONFIG_PATH/);
  await writeFile(filename,'x'.repeat(8200));
  await assert.rejects(loadFiniteBatchTuning(filename),/CONFIG_FILE_SIZE/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('loopback inference respects opt-in temperature and increased thinking budget',async()=>{
 const prior=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 let requests=[];
 try{
  const messages=[{role:'system',content:'Review cited fact'},
   {role:'user',content:'{"source":"example"}'}];
  const fetchImpl=async(_url,opts)=>{
   requests.push(JSON.parse(opts.body));
   return {ok:true,json:async()=>({choices:[{message:{content:'{"ok":true}'},
    finish_reason:'stop'}],usage:{prompt_tokens:12,completion_tokens:10}})};
  };
  const base={endpoint:'http://127.0.0.1:8002/v1/chat/completions',
   model:'chat-review',promptMessages:messages,fetchImpl};
  await curateCluster({}, {...base,temperature:0.35,maxTokens:3072,
   reasoningEffort:'medium'});
  assert.equal(requests[0].temperature,0.35);
  assert.equal(requests[0].max_tokens,3072);
  assert.equal(requests[0].reasoning_effort,'medium');
  await assert.rejects(curateCluster({}, {...base,maxTokens:8192}),
   /Invalid model completion budget/);
  await assert.rejects(curateCluster({}, {...base,temperature:-0.1}),
   /Invalid model temperature/);
  assert.equal(requests.length,1);
 }finally{
  if(prior===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=prior;
 }
});
