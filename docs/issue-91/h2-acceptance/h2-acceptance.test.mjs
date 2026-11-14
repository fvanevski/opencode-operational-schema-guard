import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateRatification,scoreOutcomes,wilson95} from './h2-acceptance.mjs';
const h=x=>createHash('sha256').update(x).digest('hex');
const sha='a'.repeat(64);
const ids=Array.from({length:30},(_,i)=>'i92-h2-'+String(i+1).padStart(2,'0'));
function ratification(){
 return {schema:'issue92-h2-ai-ratification-v1',corpus_sha256:sha,freeze_manifest_sha256:'b'.repeat(64),
 model_policy_sha256:sha,original_frozen_at:'2026-11-08T20:00:00Z',ratified_at:'2026-11-08T20:10:00Z',
 reviewer:{kind:'independent_ai',identity:'OpenCode reviewer',outputs_blinded:true,read_original_sources:true,used_private_source_access:true},
 label_changes:[],cases:ids.map((id,i)=>({id,family:['tdarr','firecrawl','guard81'][i%3],
 source_sha256:h(id),valuable:i<19,original_provisional_valuable:i<19,should_persist:i<19,
 source_authority:i<5?'user-directive':'source-corroborated',
 reason:'Independently source-checked durable value of case '+id,
 independent_of_exposed:true,reviewed_before_model_output:true}))};
}
const u=(n)=>n.toString(16).padStart(8,'0')+'-abcd-4abc-8def-0123456789ab';
function fact(i, arm, lowValue=false){return {remote_episode_uuid:u(i+(arm==='baseline'?100:300)),
 record_id:h(arm+i),case_ids:[ids[i]],source_excerpt_sha256:h(ids[i]),
 remote_proof:{episode:true,group:true,source_index:true,content:true},
 grounded:true,useful:!lowValue,redundant:lowValue,
 privacy_issue:false,authority_issue:false,fabricated_source:false,
 review_rationale:'Independent corroboration against original source and remote episode '+i};}
function outcome(r,{candidateFacts=17,baselineFacts=19,lowBaseline=2}={}){
 const mk=(arm,count,low=0)=>({cases:ids.map(id=>({id,captured:true,decision:'EMIT'})),
 facts:Array.from({length:count},(_,i)=>fact(i,arm,i>=count-low))});
 return {schema:'issue92-h2-paired-outcomes-v1',corpus_sha256:r.corpus_sha256,
 ratification_sha256:h(JSON.stringify(r)),source_commits:{baseline:'c8eb5260f2b10832346234b1b5d0cf28302ffba8',candidate:'270848aa108df22b9d12738cc6f4903ec45da9c1'},
 model_policy_sha256:sha,model_alias:'chat-fast',first_model_started_at:'2026-11-08T20:12:00Z',
 source_unchanged:true,production_unchanged:true,execution:{ex_admitted:true,model_policy_same_across_arms:true,
 all_arms_terminal:true,unresolved_remote:0,model_errors:{baseline:0,candidate:0}},arms:{baseline:mk('baseline',baselineFacts,lowBaseline),candidate:mk('candidate',candidateFacts)}};
}
const analyze=(r,opts)=>{const o=outcome(r,opts);return scoreOutcomes(r,JSON.stringify(r),o,JSON.stringify(o));};
test('requires 30-case 3-family prospective AI adjudication',()=>{
 const r=ratification();const s=validateRatification(r);
 assert.equal(s.useful,19);assert.equal(s.case_count,30);assert.equal(Object.keys(s.families).length,3);
});
test('requires complete label-change ledger',()=>{
  const r=ratification();r.cases[0].valuable=false;
  assert.throws(()=>validateRatification(r),/label_change_ledger/);
  r.label_changes.push({id:r.cases[0].id,from_valuable:true,to_valuable:false,reason:'Direct source audit disproves prospective value'});
  assert.equal(validateRatification(r).useful,18);
});
test('requires valid AI reviewer identity and private original source read',()=>{
 const r=ratification();r.reviewer.outputs_blinded=false;assert.throws(()=>validateRatification(r),/reviewer_independence/);
});
test('rejects exposed family and duplicate source-case IDs',()=>{
 const r=ratification();r.cases[0].independent_of_exposed=false;
 assert.throws(()=>validateRatification(r),/case_exposed/);
 r.cases[0].independent_of_exposed=true;r.cases[1].id=r.cases[0].id;
 assert.throws(()=>validateRatification(r),/duplicate_case/);
});
test('rejects only two holdout families',()=>{
 const r=ratification();r.cases.forEach(x=>x.family=x.family==='guard81'?'firecrawl':x.family);
 assert.throws(()=>validateRatification(r),/less_than_three/);
});
test('qualifying run distinguishes conditional success and uncertainty',()=>{
 const s=analyze(ratification());
 assert.equal(s.arms.baseline.persisted,19);assert.equal(s.arms.candidate.persisted,17);
 assert.equal(s.arms.baseline.low_value,2);assert.equal(s.arms.candidate.low_value,0);
 assert.equal(s.arms.candidate.retained_valuable_cases,17);
 assert.equal(s.gates.sample,'PASS');assert.equal(s.gates.usefulness,'PASS');
 assert.equal(s.gates.valuable_persisted_case_coverage,'PASS');
 assert.equal(s.gates.selectivity,'PASS');
 assert.equal(s.overall,'PASS');
});
test('eight-fact minimum is candidate-only and pooled result cannot pass',()=>{
 const s=analyze(ratification(),{candidateFacts:5,baselineFacts:19});
 assert.equal(s.gates.sample,'INSUFFICIENT_SAMPLE');
 assert.equal(s.gates.usefulness,'INSUFFICIENT_SAMPLE');
 assert.equal(s.overall,'INSUFFICIENT_SAMPLE');
});
test('missing remote source index fails rather than counting persisted',()=>{
 const r=ratification(),o=outcome(r);o.arms.candidate.facts[0].remote_proof.source_index=false;
 assert.throws(()=>scoreOutcomes(r,JSON.stringify(r),o,JSON.stringify(o)),/unverified_remote_persistence/);
});
test('rejects missing EX admission or model errors',()=>{
 const r=ratification(),o=outcome(r);o.execution.ex_admitted=false;
 assert.throws(()=>scoreOutcomes(r,JSON.stringify(r),o,JSON.stringify(o)),/execution_not_final/);
 const p=outcome(r);p.execution.model_errors.candidate=1;
 assert.throws(()=>scoreOutcomes(r,JSON.stringify(r),p,JSON.stringify(p)),/model_errors_present/);
});
test('missing case or unblinded evaluation fails',()=>{
 const r=ratification(),o=outcome(r);o.arms.baseline.cases.pop();
 assert.throws(()=>scoreOutcomes(r,JSON.stringify(r),o,JSON.stringify(o)),/case_ids_mismatch/);
 const p=outcome(r);p.first_model_started_at=r.ratified_at;
 assert.throws(()=>scoreOutcomes(r,JSON.stringify(r),p,JSON.stringify(p)),/before_ratification/);
});
test('baseline useful cases lost by candidate are flagged explicitly',()=>{
 const r=ratification();const s=analyze(r,{candidateFacts:8,baselineFacts:19});
 assert.equal(s.missed_baseline_useful_cases.length,9);
 assert.equal(s.gates.baseline_useful_preservation,'FAIL');
});
test('facts must be independently grounded before useful',()=>{
 const r=ratification(),o=outcome(r);o.arms.candidate.facts[0].grounded=false;
 assert.throws(()=>scoreOutcomes(r,JSON.stringify(r),o,JSON.stringify(o)),/useful_not_grounded/);
});
test('Wilson intervals explicit, undefined zero denominator',()=>{
 assert.equal(wilson95(0,0),null);
 assert.deepEqual(wilson95(10,10),[0.722467,1]);
});
