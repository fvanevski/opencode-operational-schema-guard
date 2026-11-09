import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {SOURCE_PINS,validateAdrFreeze,scoreAdrTrial} from './adr-target-score.mjs';
const h=s=>createHash('sha256').update(s).digest('hex');
const uuid=i=>'aaaaaaaa-bbbb-4ccc-8ddd-'+String(i).padStart(12,'0');
function fixture(){
 const cases=Array.from({length:20},(_,i)=>({
   id:'case_'+i,cluster_id:h('cluster:'+i),family:['hermes','plex','openviking'][i%3],
   independent_of_exposed:true,native_verified:true,
   sources:[{ref:'opencode:ses_'+i+':message:msg_'+i,sha256:h('source:'+i),
     eligible:true,native_verified:true}],
   targets:[{id:'target_'+i,source_ref:'opencode:ses_'+i+':message:msg_'+i,
     source_sha256:h('source:'+i),evidence_sha256:h('target:'+i),
     valuable:i<16,original_verified:true,blind_ratified:true}]
 }));
 const f={schema:'issue92-adr-prospective-freeze-v1',
   source_commits:{...SOURCE_PINS},corpus_sha256:h('corpus'),
   model_policy_sha256:h('model'),frozen_at:'2026-11-09T08:00:00Z',
   first_model_observed:false,trials:['t1','t2'],cases};
 const arm=(name,num,low=0)=>{
   const subset=new Set(cases.slice(0,num).map(c=>c.targets[0].id));
   return {group_id:'new_group_'+name,
     capture:cases.map(c=>({ref:c.sources[0].ref,captured:true,model_visible:true,
       drop_reason:null})),
     targets:cases.map((c,i)=>({
       id:c.targets[0].id,discovered:subset.has(c.targets[0].id),
       selected:subset.has(c.targets[0].id),
       validated:subset.has(c.targets[0].id),
       persisted:subset.has(c.targets[0].id),
       reason:'independent_result',
       episode_uuid:subset.has(c.targets[0].id)?uuid(i+(name==='baseline'?100:300)):null,
       ...(subset.has(c.targets[0].id)?{support:{
         original_source_sha256:c.sources[0].sha256,
         frozen_evidence_sha256:c.targets[0].evidence_sha256,
         assertion_sha256:h('assertion:'+i),reviewed_independently:true,
         target_supported:true}}:{})
     })),
     episodes:cases.slice(0,num).map((c,i)=>({
       uuid:uuid(i+(name==='baseline'?100:300)),group_id:'new_group_'+name,
       source_ref:c.sources[0].ref,assertion_sha256:h('assertion:'+i),
       grounded:true,useful:i<num-low,redundant:false,
       privacy_issue:false,authority_issue:false,fabricated_source:false,
       independently_reviewed:true,
       remote_proof:{review_store:true,graphiti_mcp:true,falkordb:true,source_index:true}
     }))};
 };
 const o={schema:'issue92-adr-trial-outcomes-v1',trial:'t1',
   source_commits:{...SOURCE_PINS},model_policy_sha256:f.model_policy_sha256,
   first_model_at:'2026-11-09T08:01:00Z',
   execution:{ex_admitted:true,all_arms_terminal:true,unresolved_remote:0,
     production_unchanged:true,model_policy_same_across_arms:true},
   arms:{baseline:arm('baseline',14,2),candidate:arm('candidate',16)}};
 return {f,o};
}
test('frozen multi-target cohort and passing receipt-backed trial',()=>{
 const {f,o}=fixture();assert.equal(validateAdrFreeze(f).status,'ADR92_FREEZE_PASS');
 const card=scoreAdrTrial(f,o);assert.equal(card.overall,'PASS');
 assert.equal(card.arms.candidate.counts.retained,16);
 assert.equal(card.gates.selectivity,'PASS');
});
test('a second durable target in one cluster requires its own source-supported episode',()=>{
 const {f,o}=fixture();const c=f.cases[0];c.targets.push({...c.targets[0],
   id:'target_extra',evidence_sha256:h('target-extra')});
 for(const name of ['baseline','candidate']){
   const a=o.arms[name];a.targets.push({id:'target_extra',
     discovered:false,selected:false,validated:false,persisted:false,
     reason:'not_discovered',episode_uuid:null});
 }
 const x=scoreAdrTrial(f,o);
 assert.equal(x.arms.candidate.counts.valuable_targets,17);
 assert.equal(x.arms.candidate.counts.retained,16);
 assert.equal(x.gates.baseline_useful_preservation,'PASS');
});
test('unsafe capture and unsupported target membership fail closed',()=>{
 const {f,o}=fixture();f.cases[0].sources[0].eligible=false;
 assert.throws(()=>validateAdrFreeze(f),/valuable_target_unsafe_source/);
 const q=fixture();q.o.arms.candidate.targets[0].support.target_supported=false;
 const v=scoreAdrTrial(q.f,q.o);
 assert.equal(v.gates.valuable_retention,'PASS'); // 15/16 still exceeds 85%
 assert.equal(v.arms.candidate.counts.retained,15);
});
test('remote receipt must have actual UUID and four positive independent readbacks',()=>{
 const {f,o}=fixture();o.arms.candidate.episodes[0].uuid='a'.repeat(64);
 assert.throws(()=>scoreAdrTrial(f,o),/episode_identity_or_review/);
 const q=fixture();q.o.arms.candidate.episodes[0].remote_proof.falkordb=false;
 assert.throws(()=>scoreAdrTrial(q.f,q.o),/terminal_remote_proof/);
});
test('cannot credit cluster member without independent source/model visibility',()=>{
 const {f,o}=fixture();o.arms.candidate.capture[0].model_visible=false;
 assert.throws(()=>scoreAdrTrial(f,o),/discovery_without_capture/);
 const q=fixture();q.o.arms.candidate.targets[0].support.frozen_evidence_sha256=h('wrong');
 assert.throws(()=>scoreAdrTrial(q.f,q.o),/target_support_proof/);
});
test('noninferiority with zero baseline low-value and insufficient sample remains explicit',()=>{
 const {f,o}=fixture();o.arms.baseline.episodes.forEach(e=>e.useful=true);
 const x=scoreAdrTrial(f,o);assert.equal(x.gates.selectivity,'PASS');
 const q=fixture();q.o.arms.candidate.episodes=q.o.arms.candidate.episodes.slice(0,1);
 q.o.arms.candidate.targets.forEach((t,i)=>{if(i>=1){t.persisted=false;t.validated=false;
   t.selected=false;t.discovered=false;t.episode_uuid=null;delete t.support;}});
 const y=scoreAdrTrial(q.f,q.o);assert.equal(y.overall,'INSUFFICIENT_SAMPLE');
});
