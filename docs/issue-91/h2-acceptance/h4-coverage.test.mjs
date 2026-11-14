import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {scoreProspective,EXPECTED_SOURCE} from './h4-coverage.mjs';
const h=s=>createHash('sha256').update(s).digest('hex');
const ids=Array.from({length:20},(_,i)=>'case-'+i);
const uuid=i=>'abcdefab-cdef-4abc-9abc-'+i.toString(16).padStart(12,'0');
const ref=id=>'opencode:ses_src:message:msg_'+id;
const fixture=()=>{
 const cases=ids.map((id,i)=>({id,family:['hermes','openviking','plex'][i%3],
  fact_family:'factfam-'+i,cluster_id:h('cluster'+id),source_sha256:h('source'+id),
  source_ref:ref(id),valuable:i<16,target_excerpt_sha256:i<16?h('target'+id):null,
  native_source_verified:true,independent_of_exposed:true,
  reviewed_before_model_output:true,original_target_verified:true}));
 const freeze={schema:'issue92-h4-prospective-cluster-cohort-v1',source_commits:{...EXPECTED_SOURCE},
  corpus_sha256:h('corpus'),model_policy_sha256:h('model'),
  frozen_at:'2026-11-09T03:00:00Z',model_output_observed:false,cases};
 const rat={schema:'issue92-h2-ai-ratification-v1',corpus_sha256:freeze.corpus_sha256,
  freeze_manifest_sha256:h('freeze'),model_policy_sha256:freeze.model_policy_sha256,
  original_frozen_at:freeze.frozen_at,ratified_at:'2026-11-09T03:01:00Z',
  reviewer:{kind:'independent_ai',identity:'independent source reviewer',
   outputs_blinded:true,read_original_sources:true,used_private_source_access:true},
  label_changes:[],cases:cases.map(c=>({id:c.id,family:c.family,
   fact_family:c.fact_family,cluster_id:c.cluster_id,source_sha256:c.source_sha256,
   target_excerpt_sha256:c.target_excerpt_sha256,valuable:c.valuable,
   original_provisional_valuable:c.valuable,should_persist:c.valuable,
   source_authority:'tool-observed',
   reason:'Independent private-source adjudication supports this target',
   independent_of_exposed:true,reviewed_before_model_output:true}))};
 const mk=(arm,count,low=0)=>({
  cases:cases.map((c,i)=>({id:c.id,ingested:true,captured:i<count,
    decision:i<count?'EMIT':'DEFER'})),
  cluster_decisions:{EMIT:count,SKIP:0,DEFER:20-count,MERGE:0,SUPERSEDE_PROPOSED:0},
  facts:ids.slice(0,count).map((id,i)=>({
   remote_episode_uuid:uuid(i+(arm==='baseline'?100:300)),record_id:h(arm+id),
   case_ids:[id],source_excerpt_sha256:h('assertion'+id),extracted_source_ref:ref(id),
   remote_proof:{episode:true,group:true,source_index:true,content:true,exact_source_ref:true},
   supported_cases:[{case_id:id,source_ref:ref(id),source_sha256:h('source'+id),
    exact_assertion_sha256:h('assertion'+id),exact_assertion_in_original_source:true,
    reviewed_independently:true,rationale:'Exact persisted statement independently verified in native source',
    target_excerpt_sha256:cases[i].target_excerpt_sha256,
    target_supported:i<count-low,target_reviewed_independently:true,
    target_rationale:'Native original source independently supports pre-frozen durable target'}],
   grounded:true,useful:i<count-low,redundant:false,
   privacy_issue:false,authority_issue:false,fabricated_source:false,
   review_rationale:'Independent technical utility and source readback reviewed'
  }))
 });
 const outcomes={schema:'issue92-h2-paired-outcomes-v1',fact_coverage_version:'issue92-fact-support-v2',
  corpus_sha256:freeze.corpus_sha256,ratification_sha256:h(JSON.stringify(rat)),
  source_commits:{...EXPECTED_SOURCE},model_policy_sha256:freeze.model_policy_sha256,
  model_alias:'chat-fast',first_model_started_at:'2026-11-09T04:00:00Z',
  source_unchanged:true,production_unchanged:true,
  execution:{ex_admitted:true,model_policy_same_across_arms:true,
   all_arms_terminal:true,unresolved_remote:0,model_errors:{baseline:0,candidate:0}},
  source_cases:cases.map(c=>({id:c.id,source_ref:c.source_ref,source_sha256:c.source_sha256,
   original_source_verified:true,cluster_id:c.cluster_id,fact_family:c.fact_family,
   target_excerpt_sha256:c.target_excerpt_sha256,original_target_verified:true})),
  arms:{baseline:mk('baseline',18,2),candidate:mk('candidate',16,0)}};
 return {freeze,rat,outcomes};
};
const score=f=>scoreProspective(f.freeze,f.rat,JSON.stringify(f.rat),
  f.outcomes,JSON.stringify(f.outcomes));
test('prospective fact-target score keeps baseline/candidate source pins and all gates',()=>{
 const s=score(fixture());
 assert.equal(s.schema,'issue92-fact-coverage-scorecard-v3');
 assert.equal(s.source_commits.candidate,EXPECTED_SOURCE.candidate);
 assert.equal(s.gates.sample,'PASS');
 assert.equal(s.gates.selectivity,'PASS');
 assert.equal(s.gates.valuable_selection,'PASS');
 assert.equal(s.gates.valuable_persisted_case_coverage,'PASS');
 assert.equal(s.gates.baseline_useful_preservation,'PASS');
 assert.equal(s.overall,'PASS');
});
test('zero low-value baseline uses noninferiority, not strict improvement',()=>{
 const f=fixture();
 for(const fact of f.outcomes.arms.baseline.facts){
   fact.useful=true;
   fact.supported_cases[0].target_supported=true;
 }
 const s=score(f);
 assert.equal(s.gates.selectivity,'PASS');
 assert.equal(s.gates.baseline_useful_preservation,'PASS'); // both arms retain all frozen valuable targets
});
test('rejects post-output changes to frozen target and source pin',()=>{
 const f=fixture();f.rat.cases[0].target_excerpt_sha256=h('changed');
 assert.throws(()=>score(f),/ratification_target_drift/);
 const g=fixture();g.outcomes.source_commits.candidate='0'.repeat(40);
 assert.throws(()=>score(g),/frozen_outcome_source_mismatch/);
});
test('a useful fact from a cluster does not automatically satisfy its frozen target',()=>{
 const f=fixture();f.outcomes.arms.candidate.facts[0].supported_cases[0].target_supported=false;
 const s=score(f);
 assert.equal(s.arms.candidate.retained_valuable_cases,15);
 assert.equal(s.gates.baseline_useful_preservation,'FAIL');
});
