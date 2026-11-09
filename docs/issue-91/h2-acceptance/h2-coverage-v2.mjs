#!/usr/bin/env node
/** Issue #92: fact-supported coverage, version 2. The historical H2 scorer stays
 * immutable: published H2 outcomes retain their own frozen scoring identity.
 * Host adjudication supplies exact source/text attestations; this module checks
 * their completeness and relationships but never substitutes for live reads.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateRatification,scoreOutcomes} from './h2-acceptance.mjs';
const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARMS=['baseline','candidate'];
// H3 source identity is frozen before the first model run. Do not silently
// admit another candidate head simply because the historical v1 scorer did.
const H3_SOURCE=Object.freeze({
  baseline:'c8eb5260f2b10832346234b1b5d0cf28302ffba8',
  candidate:'21556fa39c7520cede0e53c6012cbf67f6ea3ed3'
});
const HISTORICAL_H2_CANDIDATE='270848aa108df22b9d12738cc6f4903ec45da9c1';
const DECISIONS=['EMIT','SKIP','DEFER','MERGE','SUPERSEDE_PROPOSED'];
const assert=(ok,why)=>{if(!ok)throw Error('COVERAGE_V2_INVALID:'+why);};
const ratio=(n,d)=>d?Number((n/d).toFixed(6)):null;
const hash=s=>createHash('sha256').update(s).digest('hex');
const rationale=s=>typeof s==='string'&&s.trim().length>=20&&s.length<=600;
const positiveSourceRef=s=>typeof s==='string'&&s.startsWith('opencode:')&&s.length>20;
/** Neither cluster membership nor within-arm model choice is proof that a fact
 * supports a specific valuable case. Every credited case has to carry its own
 * original-source exact-assertion readback attestation and source identity.
 */
export function scoreFactCoverageV2(r,rawRatification,outcomes,rawOutcomes,{
  expectedSource=H3_SOURCE, prospectiveTargets=false
}={}){
  assert(typeof prospectiveTargets==='boolean'&&
    /^[a-f0-9]{40}$/.test(expectedSource?.baseline||'')&&
    /^[a-f0-9]{40}$/.test(expectedSource?.candidate||''),'trusted_score_mode');
  const {cases,case_count,useful}=validateRatification(r);
  assert(outcomes?.fact_coverage_version==='issue92-fact-support-v2','schema');
  assert(outcomes.source_commits?.baseline===expectedSource.baseline&&
    outcomes.source_commits?.candidate===expectedSource.candidate,
    'h3_frozen_source_mismatch');
  // v1 is immutable and validates the H2 candidate identity. The v2 adapter
  // validates the exact H3 identity above, and maps *only that field* in an
  // in-memory view so the historical v1 structural/EX/receipt gates still run.
  // Raw outcomes bytes/hash and the returned actual source identities remain H3.
  const historicalValidationView={...outcomes,source_commits:{
    ...outcomes.source_commits,candidate:HISTORICAL_H2_CANDIDATE}};
  const legacy=scoreOutcomes(r,rawRatification,historicalValidationView,rawOutcomes);
  legacy.source_commits={...outcomes.source_commits};
  const sourceCases=new Map();
  assert(Array.isArray(outcomes.source_cases)&&outcomes.source_cases.length===case_count,
    'source_case_count');
  for(const c of outcomes.source_cases){
    assert(c&&cases.has(c.id)&&!sourceCases.has(c.id),'source_case_id');
    assert(c.source_sha256===cases.get(c.id).source_sha256,'source_case_hash');
    assert(positiveSourceRef(c.source_ref)&&c.original_source_verified===true,
      'source_case_unverified');
    if(prospectiveTargets){
      const frozen=cases.get(c.id);
      assert(typeof frozen.cluster_id==='string'&&SHA.test(frozen.cluster_id)&&
        c.cluster_id===frozen.cluster_id,'target_cluster_not_frozen');
      assert(typeof frozen.fact_family==='string'&&frozen.fact_family.length>=3&&
        c.fact_family===frozen.fact_family,'target_family_not_frozen');
      assert(frozen.target_excerpt_sha256===c.target_excerpt_sha256&&
        (frozen.valuable?SHA.test(c.target_excerpt_sha256||''):
          c.target_excerpt_sha256===null),'target_not_frozen');
      assert(c.original_target_verified===true,'target_original_unverified');
    }
    sourceCases.set(c.id,c);
  }
  const retained={};
  for(const arm of ARMS){
    const input=outcomes.arms[arm],summary=legacy.arms[arm];
    const caseRows=new Map(input.cases.map(x=>[x.id,x]));
    const factIds=new Set(input.facts.map(x=>x.record_id));
    const supported=new Set();
    let ingestedValuable=0,selectedValuable=0,unsupportedUseful=0,nonDurable=0;
    for(const c of cases.values()){
      const row=caseRows.get(c.id);
      assert(typeof row.ingested==='boolean','ingestion_not_measured_'+arm);
      assert(!row.captured||row.ingested,'curated_without_ingestion_'+arm);
      if(c.valuable&&row.ingested)ingestedValuable++;
      if(c.valuable&&row.captured)selectedValuable++;
    }
    for(const f of input.facts){
      assert(positiveSourceRef(f.extracted_source_ref)&&f.remote_proof?.exact_source_ref===true,
        'extracted_ref_remote_proof_'+arm);
      assert(Array.isArray(f.supported_cases),'supported_cases_missing_'+arm);
      const factCaseIds=new Set(f.case_ids),seen=new Set();
      let direct=false;
      for(const p of f.supported_cases){
        assert(p&&factCaseIds.has(p.case_id)&&!seen.has(p.case_id),
          'support_not_in_fact_or_duplicate_'+arm);
        seen.add(p.case_id);
        const source=sourceCases.get(p.case_id);
        assert(source&&p.source_ref===source.source_ref&&
          p.source_sha256===source.source_sha256,'support_source_identity_'+arm);
        assert(p.exact_assertion_sha256===f.source_excerpt_sha256&&SHA.test(p.exact_assertion_sha256||'')&&
          p.exact_assertion_in_original_source===true&&
          p.reviewed_independently===true&&rationale(p.rationale),
          'support_not_fact_exact_or_unreviewed_'+arm);
        if(p.source_ref===f.extracted_source_ref)direct=true;
        if(prospectiveTargets){
          assert(typeof p.target_supported==='boolean'&&
            p.target_excerpt_sha256===source.target_excerpt_sha256&&
            p.target_reviewed_independently===true&&rationale(p.target_rationale),
            'target_support_unreviewed_or_unfrozen_'+arm);
        }
        if(f.grounded&&f.useful&&cases.get(p.case_id).valuable&&
          (!prospectiveTargets||p.target_supported))supported.add(p.case_id);
      }
      assert(direct,'missing_direct_cited_case_'+arm);
      if(f.useful&&f.supported_cases.length===0)unsupportedUseful++;
      if(!f.useful)nonDurable++;
      if(f.redundant){
        const e=f.redundancy_evidence;
        assert(e?.basis==='within_arm_repeat'&&
          SHA.test(e.other_record_id||'')&&e.other_record_id!==f.record_id&&
          factIds.has(e.other_record_id)&&rationale(e.reason),
          'redundancy_not_within_arm_proven_'+arm);
      }else{
        assert(f.redundancy_evidence===undefined||f.redundancy_evidence===null,
          'false_redundancy_has_evidence_'+arm);
      }
    }
    assert(unsupportedUseful===0,'useful_fact_without_case_support_'+arm);
    retained[arm]=supported;
    const decisions=Object.fromEntries(DECISIONS.map(d=>[d,
      input.cases.filter(c=>c.decision===d).length]));
    assert(input.cluster_decisions&&DECISIONS.every(d=>
      Number.isInteger(input.cluster_decisions[d]??0)&&input.cluster_decisions[d]>=0),
      'cluster_decision_counts_'+arm);
    const clusters=Object.values(input.cluster_decisions).reduce((n,x)=>n+x,0);
    assert(clusters>0&&Number.isInteger(clusters),'cluster_decision_total_'+arm);
    delete summary.model_decisions;
    summary.case_decisions=decisions;
    summary.cluster_decisions=input.cluster_decisions;
    summary.captured_valuable_cases=ingestedValuable;
    summary.curator_selected_valuable_cases=selectedValuable;
    summary.retained_valuable_cases=supported.size;
    summary.missing_valuable_case_ids=[...cases.values()]
      .filter(c=>c.valuable&&!supported.has(c.id)).map(c=>c.id);
    summary.rates.valuable_capture=ratio(ingestedValuable,useful);
    summary.rates.curator_selected_valuable_cases=ratio(selectedValuable,useful);
    summary.rates.valuable_persisted_case_coverage=ratio(supported.size,useful);
    summary.fact_support_verified=true;
    summary.nonuseful_fact_count=nonDurable;
  }
  const b=legacy.arms.baseline,c=legacy.arms.candidate;
  legacy.missed_baseline_useful_cases=[...retained.baseline]
    .filter(id=>!retained.candidate.has(id));
  legacy.gates.valuable_capture=c.rates.valuable_capture>=0.85?'PASS':'FAIL';
  legacy.gates.valuable_persisted_case_coverage=
    c.rates.valuable_persisted_case_coverage>=0.85?'PASS':'FAIL';
  legacy.gates.baseline_useful_preservation=
    legacy.missed_baseline_useful_cases.length===0?'PASS':'FAIL';
  legacy.gates.redundancy_nonregression=
    c.redundant<=b.redundant&&
    (b.persisted===0?c.redundant===0:
      c.persisted===0?c.redundant===0:
        c.redundant/c.persisted <= b.redundant/b.persisted)?'PASS':'FAIL';
  // "selectivity" still assesses discarded low-value facts; redundancy is an
  // independent non-regression gate and cannot be disguised by useful==true.
  if(prospectiveTargets){
    // Pre-registered Issue #92: when baseline has zero low-value persistence,
    // require non-inferiority instead of an impossible strictly lower count.
    legacy.gates.selectivity=b.low_value===0?
      (c.low_value===0?'PASS':'FAIL'):
      (c.low_value<b.low_value&&
        c.rates.low_value_among_persisted<b.rates.low_value_among_persisted?
        'PASS':'FAIL');
    // Candidate queue ingress and semantic curator selection are distinct.
    legacy.gates.valuable_selection=c.rates.curator_selected_valuable_cases>=0.85?
      'PASS':'FAIL';
    legacy.score_method='prospective_target_supported_fact';
  }
  legacy.schema=prospectiveTargets?
    'issue92-fact-coverage-scorecard-v3':'issue92-fact-coverage-scorecard-v2';
  if(!prospectiveTargets)legacy.score_method='fact_supported_case_source_verified';
  legacy.gates_complete=true;
  legacy.overall=Object.values(legacy.gates).every(x=>x==='PASS')?'PASS':
    Object.values(legacy.gates).includes('INSUFFICIENT_SAMPLE')?'INSUFFICIENT_SAMPLE':
      'FAIL_OR_INCONCLUSIVE';
  return legacy;
}
function main(){
  const [action,ratificationPath,outcomesPath]=process.argv.slice(2);
  assert(action==='score-v2'&&ratificationPath&&outcomesPath,'usage_score-v2');
  const rawRatification=readFileSync(ratificationPath,'utf8');
  const rawOutcomes=readFileSync(outcomesPath,'utf8');
  console.log(JSON.stringify(scoreFactCoverageV2(JSON.parse(rawRatification),rawRatification,
    JSON.parse(rawOutcomes),rawOutcomes),null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{main();}catch(e){console.error(e.message);process.exitCode=2;}
}
