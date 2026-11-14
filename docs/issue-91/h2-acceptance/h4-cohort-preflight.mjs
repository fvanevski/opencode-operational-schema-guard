#!/usr/bin/env node
/** Pre-output: one independently sourced target per review cluster. */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const SHA=/^[a-f0-9]{64}$/;
const COMMIT=/^[a-f0-9]{40}$/;
const ID=/^[A-Za-z0-9_.:-]{3,150}$/;
const assert=(ok,why)=>{if(!ok)throw Error('H4_FREEZE_INVALID:'+why)};
const ts=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
export function validateProspectiveFreeze(f,expectedSource){
  assert(f?.schema==='issue92-h4-prospective-cluster-cohort-v1','schema');
  assert(COMMIT.test(expectedSource?.baseline||'')&&COMMIT.test(expectedSource?.candidate||''),'expected_source');
  assert(f.source_commits?.baseline===expectedSource.baseline&&
    f.source_commits?.candidate===expectedSource.candidate,'source_identity');
  assert(SHA.test(f.corpus_sha256||'')&&SHA.test(f.model_policy_sha256||''),'corpus_and_policy');
  assert(ts(f.frozen_at)&&f.model_output_observed===false,'pre_output_freeze');
  assert(Array.isArray(f.cases)&&f.cases.length>=20,'cluster_sample_minimum');
  const ids=new Set(),clusters=new Set(),families=new Set(),targets=new Set();
  let valuable=0;
  for(const c of f.cases){
    assert(c&&ID.test(c.id||'')&&!ids.has(c.id),'case_id');ids.add(c.id);
    assert(SHA.test(c.cluster_id||'')&&!clusters.has(c.cluster_id),'cluster_not_unique');
    clusters.add(c.cluster_id);
    assert(ID.test(c.family||'')&&ID.test(c.fact_family||''),'family_identity');
    families.add(c.family);
    assert(SHA.test(c.source_sha256||'')&&
      typeof c.source_ref==='string'&&c.source_ref.startsWith('opencode:')&&
      c.source_ref.length>20,'source_identity');
    assert(c.native_source_verified===true&&c.independent_of_exposed===true&&
      c.reviewed_before_model_output===true&&c.original_target_verified===true,
      'private_pre_output_attestation');
    assert(typeof c.valuable==='boolean','value_label');
    if(c.valuable){
      assert(SHA.test(c.target_excerpt_sha256||'')&&!targets.has(c.fact_family),
        'valuable_target_or_duplicate_family');
      targets.add(c.fact_family);valuable++;
    }else assert(c.target_excerpt_sha256===null,'negative_target_must_be_null');
  }
  assert(families.size>=3,'family_count');
  assert(valuable>=10,'valuable_target_count');
  return {status:'H4_PROSPECTIVE_FREEZE_PASS',cluster_cases:f.cases.length,
    valuable_targets:valuable,families:Object.fromEntries([...families].map(
      family=>[family,f.cases.filter(c=>c.family===family).length])),
    candidate_source_sha:f.source_commits.candidate,corpus_sha256:f.corpus_sha256};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const [action,path,baseline,candidate]=process.argv.slice(2);
    assert(action==='validate-freeze'&&path&&baseline&&candidate,'usage');
    const f=JSON.parse(readFileSync(path,'utf8'));
    console.log(JSON.stringify(validateProspectiveFreeze(f,{baseline,candidate}),null,2));
  }catch(e){console.error(e.message);process.exitCode=2;}
}
