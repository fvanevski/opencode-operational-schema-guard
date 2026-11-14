import test from 'node:test';
import assert from 'node:assert/strict';
import {runProbe} from './efficiency-probe.mjs';
const id=n=>n.toString(16).padStart(64,'0');
const fact='The median defect was an incorrect middle index and the correction preserves the existing CLI.';
const event={event_id:id(99),group:'graphiti-curator-efficiency-r01',project:'bench',
 workspace:'/tmp/bench',session_id:'ses_test',kind:'user_turn',
 evidence_class:'user-stated',source_strength:'native-id',
 source_refs:['opencode:ses_test:message:msg_test'],
 observed_at:'2026-11-04T06:00:00Z',excerpt:fact};
const rec={id:id(1),origin:'curated',group:event.group,project:event.project,
 workspace:event.workspace,session_id:event.session_id,events:[event],
 source_event_ids:[event.event_id],decision:'EMIT',state:'persisted',
 facts:[{assertion:fact,source_refs:event.source_refs,kind:'implementation'}]};
test('EX-only probe never calls Graphiti, and validates source-backed result',async()=>{
 const prev=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 const args={root:'/tmp/bench',group:event.group,ids:[rec.id],
  endpoint:'http://127.0.0.1:8002/v1/chat/completions',model:'chat-fast',
  store:{get:async()=>rec}};
 try{
  await assert.rejects(runProbe(args),/EX_ADMISSION_REQUIRED/);
  process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
  await assert.rejects(runProbe({...args,group:'ghdev_gh_mcp'}),/DISPOSABLE_SCOPE_REQUIRED/);
  await assert.rejects(runProbe({...args,maxTokens:1600}),/BOUNDED_VARIANT_REQUIRED/);
  await assert.rejects(runProbe({...args,reasoningEffort:'none'}),/BOUNDED_VARIANT_REQUIRED/);
  await assert.rejects(runProbe({...args,reasoningEffort:'low'}),/BOUNDED_VARIANT_REQUIRED/);
  let calls=0;
  const out=await runProbe({...args,curate:async(_r,p)=>{
    calls++;assert.equal(p.reasoningEffort,null);assert.equal(p.maxTokens,768);
    return {content:JSON.stringify({decision:'EMIT',utility_class:'root_cause_fix',reason:'grounded',
      facts:[{assertion:fact,kind:'implementation',
        source_refs:event.source_refs,temporal_status:'observed'}]}),
      duration_ms:9,finish_reason:'stop',
      usage:{prompt_tokens:90,completion_tokens:20,reasoning_tokens:0}};
  }});
  assert.equal(calls,1);assert.equal(out.graphiti_calls,0);
  assert.equal(out.totals.prompt_tokens,90);
  assert.equal(out.totals.reasoning_reported,1);
  assert.equal(out.observations[0].valid,true);
  assert.equal(out.observations[0].exact_baseline_fact_match,true);
 }finally{
  if(prev===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=prev;
 }
});
test('backend HTTP rejection stays typed and cannot trigger Graphiti replay',async()=>{
 const prev=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 try{
  const out=await runProbe({root:'/tmp/bench',group:event.group,ids:[rec.id],
    store:{get:async()=>rec},curate:async()=>{throw Error('CURATOR_HTTP_400');}});
  assert.equal(out.status,'PARTIAL_OR_UNSUPPORTED');
  assert.equal(out.observations[0].error_code,'CURATOR_HTTP_400');
  assert.equal(out.graphiti_calls,0);
 }finally{
  if(prev===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=prev;
 }
});

test('old development group remains eligible for read-only probe after naming change',async()=>{
 const prior=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
 const group='cur81_dev_ce555621';
 const old={...rec,group,events:[{...event,group}]};
 try{
  const value=await runProbe({root:'/tmp/bench',group,ids:[rec.id],
   store:{get:async()=>old},curate:async()=>({
    content:JSON.stringify({decision:'DEFER',
     reason:'No independently useful persistent source assertion',facts:[]}),
    duration_ms:1,usage:{prompt_tokens:1,completion_tokens:1}})});
  assert.equal(value.group,group);
  assert.equal(value.totals.completed,1);
 }finally{
  if(prior===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=prior;
 }
});
