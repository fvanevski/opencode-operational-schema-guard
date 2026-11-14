import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateProspectiveFreeze} from './h4-cohort-preflight.mjs';
const h=s=>createHash('sha256').update(s).digest('hex');
const expected={baseline:'c8eb5260f2b10832346234b1b5d0cf28302ffba8',candidate:'e0360f03bbaf2d47f5ad167ff0c57c021cc12aed'};
const freeze=()=>({
 schema:'issue92-h4-prospective-cluster-cohort-v1',source_commits:{...expected},
 corpus_sha256:h('corpus'),model_policy_sha256:h('model'),
 frozen_at:'2026-11-09T03:00:00Z',model_output_observed:false,
 cases:Array.from({length:21},(_,i)=>({id:'case-'+i,cluster_id:h('cluster'+i),
 family:['hermes','openviking','plex'][i%3],fact_family:'root-cause-'+i,
 source_sha256:h('source'+i),source_ref:'opencode:ses_test:message:msg_'+i,
 native_source_verified:true,independent_of_exposed:true,
 reviewed_before_model_output:true,original_target_verified:true,
 valuable:i<12,target_excerpt_sha256:i<12?h('target'+i):null}))
});
test('positive pre-output cohort at independent cluster grain',()=>{
 const s=validateProspectiveFreeze(freeze(),expected);
 assert.equal(s.cluster_cases,21);assert.equal(s.valuable_targets,12);
 assert.equal(Object.keys(s.families).length,3);
});
test('rejects event-level case duplication inside one cluster',()=>{
 const f=freeze();f.cases[1].cluster_id=f.cases[0].cluster_id;
 assert.throws(()=>validateProspectiveFreeze(f,expected),/cluster_not_unique/);
});
test('rejects repeated durable fact family despite distinct source ids',()=>{
 const f=freeze();f.cases[1].fact_family=f.cases[0].fact_family;
 assert.throws(()=>validateProspectiveFreeze(f,expected),/duplicate_family/);
});
test('rejects exposed source, missed original-source proof and output-first freeze',()=>{
 const f=freeze();f.cases[0].independent_of_exposed=false;
 assert.throws(()=>validateProspectiveFreeze(f,expected),/private_pre_output_attestation/);
 const g=freeze();g.cases[0].original_target_verified=false;
 assert.throws(()=>validateProspectiveFreeze(g,expected),/private_pre_output_attestation/);
 const e=freeze();e.model_output_observed=true;
 assert.throws(()=>validateProspectiveFreeze(e,expected),/pre_output_freeze/);
});
test('rejects candidate SHA drift and insufficient family/target/sample counts',()=>{
 const f=freeze();f.source_commits.candidate='0'.repeat(40);
 assert.throws(()=>validateProspectiveFreeze(f,expected),/source_identity/);
 const g=freeze();g.cases=g.cases.slice(0,19);
 assert.throws(()=>validateProspectiveFreeze(g,expected),/cluster_sample_minimum/);
 const j=freeze();j.cases=j.cases.map((c,i)=>({...c,valuable:i<9,target_excerpt_sha256:i<9?h('target'+i):null}));
 assert.throws(()=>validateProspectiveFreeze(j,expected),/valuable_target_count/);
 const k=freeze();k.cases=k.cases.map(c=>({...c,family:'one'}));
 assert.throws(()=>validateProspectiveFreeze(k,expected),/family_count/);
});
