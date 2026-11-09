import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {scoreFactCoverageV2} from './h2-coverage-v2.mjs';
const h=s=>createHash('sha256').update(s).digest('hex');
const ids=Array.from({length:20},(_,i)=>'cohort-case-'+i);
const t='2026-11-08T20:00:00Z',later='2026-11-08T21:00:00Z';
const uuid=i=>'abcdefab-cdef-4abc-9abc-'+i.toString(16).padStart(12,'0');
const ref=id=>'opencode:ses_source:message:'+id;
const rat=()=>({
 schema:'issue92-h2-ai-ratification-v1',corpus_sha256:h('cohort'),freeze_manifest_sha256:h('freeze'),
 model_policy_sha256:h('model'),original_frozen_at:t,ratified_at:later,
 reviewer:{kind:'independent_ai',identity:'independent source reviewer',outputs_blinded:true,
 read_original_sources:true,used_private_source_access:true},label_changes:[],
 cases:ids.map((id,i)=>({id,family:['tdarr','firecrawl','guard81'][i%3],
 source_sha256:h(id),valuable:i<16,original_provisional_valuable:i<16,
 should_persist:i<16,source_authority:'tool-observed',
 reason:'Original source read confirms this criterion '+id,
 independent_of_exposed:true,reviewed_before_model_output:true}))
});
function mkFact(i,arm,useful=true){
 const id=ids[i],sha=h('assertion '+id);
 return {remote_episode_uuid:uuid(i+(arm==='baseline'?100:300)),record_id:h(arm+id),
 case_ids:[id],source_excerpt_sha256:sha,
 extracted_source_ref:ref(id),
 remote_proof:{episode:true,group:true,source_index:true,content:true,exact_source_ref:true},
 supported_cases:[{case_id:id,source_ref:ref(id),source_sha256:h(id),
 exact_assertion_sha256:sha,exact_assertion_in_original_source:true,
 reviewed_independently:true,rationale:'Exact assertion independently found in original source '+id}],
 grounded:true,useful,redundant:false,privacy_issue:false,authority_issue:false,
 fabricated_source:false,review_rationale:'Verified source plus exact remote episode content'};
}
function setup(){
 const r=rat(),mk=(arm,count,extraLow=0)=>({
   cases:ids.map(id=>({id,ingested:true,captured:true,decision:'EMIT'})),
   facts:ids.slice(0,count).map((_,i)=>mkFact(i,arm,i<count-extraLow)),
   cluster_decisions:{EMIT:count,SKIP:0,DEFER:0,MERGE:0,SUPERSEDE_PROPOSED:0}
 });
 const o={schema:'issue92-h2-paired-outcomes-v1',
 fact_coverage_version:'issue92-fact-support-v2',corpus_sha256:r.corpus_sha256,
 ratification_sha256:h(JSON.stringify(r)),
 source_commits:{baseline:'c8eb5260f2b10832346234b1b5d0cf28302ffba8',
 candidate:'270848aa108df22b9d12738cc6f4903ec45da9c1'},
 first_model_started_at:'2026-11-08T22:00:00Z',model_alias:'chat-fast',
 model_policy_sha256:r.model_policy_sha256,source_unchanged:true,production_unchanged:true,
 execution:{ex_admitted:true,model_policy_same_across_arms:true,
 all_arms_terminal:true,unresolved_remote:0,model_errors:{baseline:0,candidate:0}},
 source_cases:ids.map(id=>({id,source_ref:ref(id),source_sha256:h(id),original_source_verified:true})),
 arms:{baseline:mk('baseline',18,2),candidate:mk('candidate',16,0)}};
 return {r,o};
}
const score=(r,o)=>scoreFactCoverageV2(r,JSON.stringify(r),o,JSON.stringify(o));
test('qualifying fact-supported cohort passes independently of clustering',()=>{
 const {r,o}=setup(),s=score(r,o);
 assert.equal(s.schema,'issue92-fact-coverage-scorecard-v2');
 assert.equal(s.arms.candidate.retained_valuable_cases,16);
 assert.equal(s.arms.candidate.captured_valuable_cases,16);
 assert.equal(s.gates.valuable_persisted_case_coverage,'PASS');
 assert.equal(s.gates.baseline_useful_preservation,'PASS');
 assert.equal(s.gates.redundancy_nonregression,'PASS');
 assert.equal(s.overall,'PASS');
 assert.equal(s.arms.candidate.cluster_decisions.EMIT,16);
});
test('cluster membership alone cannot produce fact-supported case credit',()=>{
 const {r,o}=setup(),f=o.arms.candidate.facts[0];
 f.case_ids=[ids[0],ids[1],ids[2],ids[3]];
 // Same fact supports only case zero, despite four cluster members.
 const s=score(r,o);
 assert.equal(s.arms.candidate.retained_valuable_cases,16);
 assert.ok(s.arms.candidate.missing_valuable_case_ids.every(id=>!f.case_ids.includes(id)));
});
test('source ingestion is distinct from curator selection and persistence',()=>{
 const {r,o}=setup();
 o.arms.candidate.cases[0].captured=false;
 const s=score(r,o);
 assert.equal(s.arms.candidate.captured_valuable_cases,16);
 assert.equal(s.arms.candidate.curator_selected_valuable_cases,15);
});
test('a missing exact source attestation blocks unsupported promotion',()=>{
 const {r,o}=setup();
 delete o.arms.candidate.facts[0].supported_cases;
 assert.throws(()=>score(r,o),/supported_cases_missing/);
});
test('refuses unsupported cluster case credited as useful',()=>{
 const {r,o}=setup(),f=o.arms.candidate.facts[0];
 f.supported_cases[0].case_id=ids[2];
 assert.throws(()=>score(r,o),/support_not_in_fact/);
});
test('refuses unverified source hashes or mismatched excerpt hash',()=>{
 const {r,o}=setup();o.arms.candidate.facts[0].supported_cases[0].source_sha256=h('wrong');
 assert.throws(()=>score(r,o),/support_source_identity/);
 const x=setup();x.o.arms.candidate.facts[0].supported_cases[0].exact_assertion_sha256=h('wrong');
 assert.throws(()=>score(x.r,x.o),/support_not_fact_exact/);
});
test('refuses false positive support without independent exact-source check',()=>{
 const {r,o}=setup();o.arms.candidate.facts[0].supported_cases[0].exact_assertion_in_original_source=false;
 assert.throws(()=>score(r,o),/support_not_fact_exact/);
});
test('refuses case support outside frozen cluster',()=>{
 const {r,o}=setup();o.arms.candidate.facts[0].supported_cases[0].case_id='alien';
 assert.throws(()=>score(r,o),/support_not_in_fact/);
});
test('rejects missing remote source reference proof',()=>{
 const {r,o}=setup();o.arms.candidate.facts[0].remote_proof.exact_source_ref=false;
 assert.throws(()=>score(r,o),/extracted_ref_remote_proof/);
});
test('refuses cross-arm resemblance treated as within-arm redundancy',()=>{
 const {r,o}=setup(),f=o.arms.candidate.facts[0];f.redundant=true;
 f.redundancy_evidence={basis:'within_arm_repeat',other_record_id:h('baseline'+ids[0]),
 reason:'Looks similar to baseline, but that is a different isolated arm'};
 assert.throws(()=>score(r,o),/redundancy_not_within_arm_proven/);
});
test('flags genuine duplicate within candidate arm as redundancy regression',()=>{
 const {r,o}=setup(),f=o.arms.candidate.facts[0];f.redundant=true;
 f.redundancy_evidence={basis:'within_arm_repeat',other_record_id:o.arms.candidate.facts[1].record_id,
 reason:'Two candidate episodes repeat identical technical content'};
 const s=score(r,o);
 assert.equal(s.gates.redundancy_nonregression,'FAIL');
});
test('missed baseline-supported case fails retention even with perfect precision',()=>{
 const {r,o}=setup();o.arms.candidate.facts.pop();o.arms.candidate.cluster_decisions.EMIT=15;
 const s=score(r,o);
 assert.equal(s.gates.baseline_useful_preservation,'FAIL');
 assert.equal(s.gates.valuable_persisted_case_coverage,'PASS'); // 15/16 >= .85
});
test('duplicate support cases cannot double-count',()=>{
 const {r,o}=setup(),f=o.arms.candidate.facts[0];
 f.supported_cases.push({...f.supported_cases[0]});
 assert.throws(()=>score(r,o),/support_not_in_fact_or_duplicate/);
});
test('missing ingress evidence blocks high-value capture interpretation',()=>{
 const {r,o}=setup();delete o.arms.candidate.cases[0].ingested;
 assert.throws(()=>score(r,o),/ingestion_not_measured/);
});
