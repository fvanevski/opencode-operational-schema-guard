import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {auditExposed,D1_SOURCE_PINS,D2_SOURCE_PINS} from './adr-causal-audit.mjs';
import {createPrivateTraceCurator} from './adr-private-trace.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const baseline='c8eb5260f2b10832346234b1b5d0cf28302ffba8';
const candidate='a684667a6eefa2dc19f29755bed0c3048874721d';
const excerpt='The operator requires preserving the existing CLI interface during the median repair.';
const ref='opencode:s1:message:m1';
const e={event_id:'e'.repeat(64),source_refs:[ref],source_strength:'native-id',
  excerpt,evidence_class:'user-stated',kind:'prompt',observed_at:'2026-11-09T00:00:00Z',
  group:'g1',project:'p1',workspace:'/workspace/p1',session_id:'s1',state:'new'};
const cluster={id:'c'.repeat(64),group:'g1',project:'p1',workspace:'/workspace/p1',
  session_id:'s1',events:[e],source_event_ids:[e.event_id]};
const freeze={schema:'issue92-adr-prospective-freeze-v1',
  source_commits:{baseline,candidate},cases:[{id:'case1',cluster_id:cluster.id,
    targets:[{id:'target1',source_ref:ref,source_sha256:sha('native source'),
      valuable:true}]}]};
const makeRow=(overrides={})=>({target_id:'target1',model_visible:true,cluster,
  review_state:'approved',review_reason:'original source checked',
  model_fact_indices:[],independently_reviewed:true,terminals:[],
  model_raw_content:null,
  model_reply_sha256:typeof overrides.model_raw_content==='string'?
    sha(overrides.model_raw_content):null,...overrides});
const rawFreeze=JSON.stringify(freeze);
const makeBundle=rows=>({schema:'issue92-adr-exposed-causal-audit-v1',
  source_commits:{baseline,candidate},freeze_sha256:sha(rawFreeze),
  runs:[{trial:'t1',arm:'candidate',targets:rows}]});
const rawSkip=JSON.stringify({decision:'SKIP',utility_class:'transient_result',
  reason:'Model did not select a durable claim from this cluster',facts:[]});
const rawEmit=JSON.stringify({decision:'EMIT',utility_class:'durable_decision',
  reason:'This exact source expresses an enduring operator constraint',
  facts:[{assertion:excerpt,kind:'decision',utility_class:'durable_decision',
    source_refs:[ref],temporal_status:'observed'}]});
const terminal={uuid:'12345678-abcd-4abc-9abc-0123456789ab',source_ref:ref,
  original_source_supported:true,independently_reviewed:true,
  review_store:true,graphiti_mcp:true,falkordb:true,source_index:true};
const run=rows=>auditExposed(freeze,makeBundle(rows),rawFreeze);

test('missing raw response stays UNKNOWN, never "model discovered"',()=>{
 const a=run([makeRow()]);
 assert.equal(a.rows[0].stage,'RAW_MODEL_UNAVAILABLE');
 assert.equal(a.rows[0].evidence_tier,'review_state_only');
 assert.equal(a.disposition,'COMPLETE');
 assert.equal(JSON.stringify(a).includes(excerpt),false);
});
test('actual SKIP is an observed model decision, not proof of transient source',()=>{
 const a=run([makeRow({model_raw_content:rawSkip,review_state:'skipped'})]);
 assert.equal(a.rows[0].stage,'MODEL_SKIP');
 assert.equal(a.rows[0].model_decision,'SKIP');
 assert.equal(a.rows[0].fact_indices.length,0);
});
test('reviewer-linked exact source EMIT with terminal four-surface proof',()=>{
 const a=run([makeRow({model_raw_content:rawEmit,model_fact_indices:[0],
  review_state:'persisted',terminals:[terminal]})]);
 assert.equal(a.rows[0].stage,'REMOTE_TARGET_PRESERVED');
 assert.equal(a.rows[0].terminal_count,1);
});
test('source-backed EMIT without terminal proof is not retained',()=>{
 const a=run([makeRow({model_raw_content:rawEmit,model_fact_indices:[0]})]);
 assert.equal(a.rows[0].stage,'VALIDATED_NO_TERMINAL_PROOF');
 const bad=makeRow({model_raw_content:rawEmit,model_fact_indices:[0],
   terminals:[{...terminal,uuid:'a'.repeat(64)}]});
 assert.throws(()=>run([bad]),/unverified_terminal_proof/);
});
test('raw EMIT of another fact cannot receive frozen-target credit',()=>{
 const a=run([makeRow({model_raw_content:rawEmit})]);
 assert.equal(a.rows[0].stage,'MODEL_OTHER_FACT');
 const b=makeRow({model_raw_content:rawEmit,model_fact_indices:[2]});
 assert.throws(()=>run([b]),/fact_index_not_linked_to_frozen_source/);
});
test('missing source visibility and incomplete coverage are explicit',()=>{
 const a=run([makeRow({model_visible:false,cluster:null})]);
 assert.equal(a.rows[0].stage,'SOURCE_NOT_VISIBLE');
 assert.equal(run([]).disposition,'INCOMPLETE');
});
test('private raw response trace is once-only, mode 0600, gated by caller admission',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'adr92-causal-'));
 const old=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 let calls=0;
 try{
   const fn=createPrivateTraceCurator(async()=>{calls++;
     return {content:rawSkip,duration_ms:1}}, {directory:dir,
       promptBuilder:()=>[{role:'system',content:'Observed source policy'},
         {role:'user',content:'Observed source events'}]});
   delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
   await assert.rejects(fn(cluster,{}),/POST_EXIT_REQUIRED/);
   process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
   const result=await fn(cluster,{});
   assert.equal(result.content,rawSkip);
   const filepath=path.join(dir,cluster.id+'.json');
   const x=JSON.parse(await readFile(filepath,'utf8'));
   assert.equal(x.model_reply_sha256,sha(rawSkip));
   assert.equal((await stat(filepath)).mode&0o777,0o600);
   assert.equal(calls,1);
   await assert.rejects(fn(cluster,{}),/TRACE_ALREADY_EXISTS/);
   assert.equal(calls,1);
 }finally{
   if(old===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
   else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=old;
   await rm(dir,{recursive:true,force:true});
 }
});

test('auditor rejects stale freeze bytes and raw model transcript digest changes',()=>{
 const b=makeBundle([makeRow()]);
 assert.throws(()=>auditExposed(freeze,b,JSON.stringify({...freeze,change:true})),
   /freeze_bytes_digest_mismatch/);
 const row=makeRow({model_raw_content:rawSkip,model_reply_sha256:sha('tampered')});
 assert.throws(()=>run([row]),/raw_model_digest_not_authenticated/);
});

test('D1 exposed comparison is pinned to previous and corrected model-tested SHAs',()=>{
 const bundle=makeBundle([makeRow({model_raw_content:rawSkip,review_state:'skipped'})]);
 bundle.schema='issue92-adr-exposed-d1-comparison-v1';
 bundle.comparison_sources={...D1_SOURCE_PINS};
 const original={...bundle.runs[0],trial:'d1'};
 bundle.runs=[
   {...original,arm:'previous',source_sha:D1_SOURCE_PINS.previous},
   {...original,arm:'corrected',source_sha:D1_SOURCE_PINS.corrected}
 ];
 const result=auditExposed(freeze,bundle,rawFreeze);
 assert.equal(result.schema,'issue92-adr-exposed-d1-result-v1');
 assert.equal(result.rows.length,2);
 assert.equal(result.disposition,'COMPLETE');
 assert.equal(result.comparison_sources.corrected,D1_SOURCE_PINS.corrected);
 bundle.runs[1].source_sha=D1_SOURCE_PINS.previous;
 assert.throws(()=>auditExposed(freeze,bundle,rawFreeze),
   /development_run_exact_source/);
 bundle.runs[1].source_sha=D1_SOURCE_PINS.corrected;
 bundle.comparison_sources.corrected='0'.repeat(40);
 assert.throws(()=>auditExposed(freeze,bundle,rawFreeze),
   /development_comparison_source_identity/);
});

test('D2 exposed two-stage comparison is source-pinned and does not rewrite D1',()=>{
 const bundle=makeBundle([makeRow({model_raw_content:rawSkip,review_state:'skipped'})]);
 bundle.schema='issue92-adr-exposed-d2-comparison-v1';
 bundle.comparison_sources={...D2_SOURCE_PINS};
 const common={...bundle.runs[0],trial:'d2'};
 bundle.runs=[
  {...common,arm:'previous',source_sha:D2_SOURCE_PINS.previous},
  {...common,arm:'two_stage',source_sha:D2_SOURCE_PINS.two_stage}
 ];
 const result=auditExposed(freeze,bundle,rawFreeze);
 assert.equal(result.schema,'issue92-adr-exposed-d2-result-v1');
 assert.equal(result.comparison_sources.two_stage,D2_SOURCE_PINS.two_stage);
 assert.equal(result.disposition,'COMPLETE');
 bundle.runs[1].source_sha=D1_SOURCE_PINS.corrected;
 assert.throws(()=>auditExposed(freeze,bundle,rawFreeze),
   /development_run_exact_source/);
});
