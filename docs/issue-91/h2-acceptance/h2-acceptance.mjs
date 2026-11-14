#!/usr/bin/env node
/** Issue #92 H2: deterministic, receipt-bound scorecard. No model or Graphiti access.
 * The host adapter owns source/episode verification; this script refuses to
 * promote missing receipts and keeps baseline/candidate denominators separate.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const SHA=/^[a-f0-9]{64}$/;
const COMMIT=/^[a-f0-9]{40}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID=/^[A-Za-z0-9_.:-]{3,150}$/;
const ARMS=['baseline','candidate'];
const DECISIONS=new Set(['EMIT','SKIP','DEFER','MERGE','SUPERSEDE_PROPOSED']);
const AUTHORITIES=new Set(['user-directive','tool-observed','source-corroborated','assistant-unverified','unknown']);
const HEX40={baseline:'c8eb5260f2b10832346234b1b5d0cf28302ffba8',candidate:'270848aa108df22b9d12738cc6f4903ec45da9c1'};
const assert=(condition,message)=>{if(!condition)throw Error('H2_INVALID:'+message)};
const time=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const digest=s=>createHash('sha256').update(s).digest('hex');
const ratio=(n,d)=>d?Number((n/d).toFixed(6)):null;
export function wilson95(n,d) {
  if(d===0)return null;
  const z=1.959963984540054, p=n/d, denom=1+z*z/d;
  const center=(p+z*z/(2*d))/denom;
  const half=z*Math.sqrt(p*(1-p)/d+z*z/(4*d*d))/denom;
  return [Number(Math.max(0,center-half).toFixed(6)),Number(Math.min(1,center+half).toFixed(6))];
}
function unique(arr,what){const s=new Set(arr);assert(s.size===arr.length,'duplicate_'+what);return s;}
function sameIds(a,b,what){
  const x=unique(a,what+'_given'),y=unique(b,what+'_expected');
  assert(x.size===y.size&&[...x].every(id=>y.has(id)),what+'_mismatch');
}
export function validateRatification(r) {
  assert(r?.schema==='issue92-h2-ai-ratification-v1','ratification_schema');
  assert(SHA.test(r.corpus_sha256||'')&&SHA.test(r.freeze_manifest_sha256||'')&&
    SHA.test(r.model_policy_sha256||''),'cohort_hashes');
  assert(time(r.original_frozen_at)&&time(r.ratified_at),'ratification_times');
  assert(Date.parse(r.ratified_at)>=Date.parse(r.original_frozen_at),'ratification_before_original_freeze');
  assert(r.reviewer?.kind==='independent_ai'&&typeof r.reviewer.identity==='string'&&r.reviewer.identity.length>=3,'ai_reviewer_identity');
  assert(r.reviewer.outputs_blinded===true&&r.reviewer.read_original_sources===true,'reviewer_independence');
  assert(r.reviewer.used_private_source_access===true,'original_source_access');
  assert(Array.isArray(r.cases),'cases');
  assert(r.cases.length>=20,'case_count_lt_20');
  const familyMap=new Map(),cases=new Map();let useful=0;
  for(const c of r.cases) {
    assert(ID.test(c.id||'')&&ID.test(c.family||''),'case_identity');
    assert(!cases.has(c.id),'duplicate_case_id');
    assert(SHA.test(c.source_sha256||''),'case_source_hash');
    assert(typeof c.valuable==='boolean'&&typeof c.original_provisional_valuable==='boolean'&&
      typeof c.should_persist==='boolean','case_labels');
    assert(AUTHORITIES.has(c.source_authority),'authority_label');
    assert(typeof c.reason==='string'&&c.reason.trim().length>=15&&c.reason.length<=500,'case_rationale');
    assert(c.independent_of_exposed===true,'case_exposed_or_overlap_unverified');
    assert(c.reviewed_before_model_output===true,'case_output_exposure');
    if(c.valuable)useful++;
    familyMap.set(c.family,(familyMap.get(c.family)||0)+1);cases.set(c.id,c);
  }
  assert(familyMap.size>=3,'holdout_less_than_three_families');
  assert(useful>=10,'fewer_than_ten_useful_cases');
  // Frozen labels may change upon AI review. That is allowed only before the
  // first model run and must leave an exact original->ratified change ledger.
  assert(Array.isArray(r.label_changes),'label_changes_missing');
  for(const x of r.label_changes) {
    assert(cases.has(x.id)&&typeof x.from_valuable==='boolean'&&
      typeof x.to_valuable==='boolean'&&x.from_valuable!==x.to_valuable&&
      typeof x.reason==='string'&&x.reason.length>=15,'label_change_invalid');
  }
  unique(r.label_changes.map(x=>x.id),'label_changes');
  const actualChanges=[...cases.values()].filter(c=>c.valuable!==c.original_provisional_valuable);
  sameIds(r.label_changes.map(x=>x.id),actualChanges.map(x=>x.id),'label_change_ledger');
  for(const change of r.label_changes){
    const c=cases.get(change.id);
    assert(change.from_valuable===c.original_provisional_valuable&&change.to_valuable===c.valuable,
      'label_change_values');
  }
  return {cases,case_count:r.cases.length,useful,families:Object.fromEntries(familyMap)};
}
export function scoreOutcomes(r, rawRatification, outcomes,rawOutcomes) {
  const {cases,case_count,useful,families}=validateRatification(r);
  assert(outcomes?.schema==='issue92-h2-paired-outcomes-v1','outcomes_schema');
  assert(outcomes.corpus_sha256===r.corpus_sha256,'corpus_mismatch');
  assert(outcomes.ratification_sha256===digest(rawRatification),'ratification_sha_mismatch');
  assert(outcomes.source_commits?.baseline===HEX40.baseline&&outcomes.source_commits?.candidate===HEX40.candidate,'source_sha_mismatch');
  assert(time(outcomes.first_model_started_at),'model_start_missing');
  assert(Date.parse(outcomes.first_model_started_at)>Date.parse(r.ratified_at),'model_started_before_ratification');
  assert(outcomes.model_policy_sha256===r.model_policy_sha256,'model_policy_hash_drift');
  assert(outcomes.execution?.ex_admitted===true&&outcomes.execution?.model_policy_same_across_arms===true&&
    outcomes.execution?.all_arms_terminal===true&&outcomes.execution?.unresolved_remote===0,
    'execution_not_final_or_unadmitted');
  assert(outcomes.execution.model_errors?.baseline===0&&outcomes.execution.model_errors?.candidate===0,
    'model_errors_present');
  assert(outcomes.model_alias==='chat-fast','model_alias_drift');
  assert(outcomes.source_unchanged===true&&outcomes.production_unchanged===true,'production_or_source_changed');
  const rows={};
  for(const arm of ARMS) {
    const a=outcomes.arms?.[arm];assert(a&&Array.isArray(a.cases)&&Array.isArray(a.facts),'arm_missing_'+arm);
    sameIds(a.cases.map(c=>c.id),[...cases.keys()],arm+'_case_ids');
    const keyed=new Map();
    for(const row of a.cases) {
      assert(typeof row.captured==='boolean'&&DECISIONS.has(row.decision),'decision_or_capture_'+arm);
      keyed.set(row.id,row);
    }
    const ids=new Set(),records=new Set();
    for(const f of a.facts) {
      assert(UUID.test(f.remote_episode_uuid||'')&&SHA.test(f.record_id||''),'uuid_or_record_'+arm);
      assert(!ids.has(f.remote_episode_uuid)&&!records.has(f.record_id),'duplicate_remote_receipt_'+arm);
      ids.add(f.remote_episode_uuid);records.add(f.record_id);
      assert(Array.isArray(f.case_ids)&&f.case_ids.length>0,'fact_case_ids');
      unique(f.case_ids,'fact_case_ids');
      for(const id of f.case_ids)assert(cases.has(id)&&keyed.get(id).captured,'fact_without_source_or_capture_'+arm);
      assert(f.remote_proof?.episode===true&&f.remote_proof?.group===true&&
        f.remote_proof?.source_index===true&&f.remote_proof?.content===true,'unverified_remote_persistence_'+arm);
      assert(SHA.test(f.source_excerpt_sha256||''),'fact_source_hash');
      for(const field of ['grounded','useful','redundant','privacy_issue','authority_issue','fabricated_source'])
        assert(typeof f[field]==='boolean','missing_fact_verdict_'+field);
      assert(!(f.useful&&!f.grounded),'useful_not_grounded');
      assert(typeof f.review_rationale==='string'&&f.review_rationale.trim().length>=15,'fact_review_rationale');
    }
    rows[arm]={cases:keyed,facts:a.facts};
  }
  const summary={schema:'issue92-h2-scorecard-v1',cohort_sha256:r.corpus_sha256,
    ratification_sha256:digest(rawRatification),outcomes_sha256:digest(rawOutcomes),
    case_count,valuable_cases:useful,families,source_commits:outcomes.source_commits,
    arms:{},missed_baseline_useful_cases:[],gates:{}};
  const retained={};
  for(const arm of ARMS) {
    const {facts,cases:armCases}=rows[arm];
    const groundedFacts=facts.filter(x=>x.grounded);
    const usefulFacts=groundedFacts.filter(x=>x.useful);
    const lowValueFacts=facts.filter(x=>!x.useful);
    const usefulCases=new Set(usefulFacts.flatMap(x=>x.case_ids).filter(id=>cases.get(id).valuable));
    retained[arm]=usefulCases;
    const capturedUseful=[...cases.values()].filter(c=>c.valuable&&armCases.get(c.id).captured).length;
    summary.arms[arm]={persisted:facts.length,grounded:groundedFacts.length,useful:usefulFacts.length,
      low_value:lowValueFacts.length,redundant:facts.filter(x=>x.redundant).length,
      privacy: facts.filter(x=>x.privacy_issue).length,
      source_authority: facts.filter(x=>x.authority_issue).length,
      fabricated: facts.filter(x=>x.fabricated_source).length,
      captured_valuable_cases:capturedUseful,retained_valuable_cases:usefulCases.size,
      missing_valuable_case_ids:[...cases.values()].filter(c=>c.valuable&&!usefulCases.has(c.id)).map(c=>c.id),
      model_decisions:Object.fromEntries([...DECISIONS].map(d=>[d,[...armCases.values()].filter(c=>c.decision===d).length])),
      rates:{useful_among_grounded:ratio(usefulFacts.length,groundedFacts.length),
        usefulness_wilson95:wilson95(usefulFacts.length,groundedFacts.length),
        grounded_among_persisted:ratio(groundedFacts.length,facts.length),
        grounded_wilson95:wilson95(groundedFacts.length,facts.length),
        low_value_among_persisted:ratio(lowValueFacts.length,facts.length),
        valuable_capture:ratio(capturedUseful,useful),
        valuable_persisted_case_coverage:ratio(usefulCases.size,useful)}};
  }
  summary.missed_baseline_useful_cases=[...retained.baseline].filter(id=>!retained.candidate.has(id));
  const b=summary.arms.baseline,c=summary.arms.candidate;
  const privacyTotal=Object.values(summary.arms).reduce((n,a)=>n+a.privacy+a.source_authority+a.fabricated,0);
  const selectivity=b.persisted===0 ? c.low_value===0 :
    c.low_value<b.low_value&&c.rates.low_value_among_persisted<b.rates.low_value_among_persisted;
  summary.gates={
    sample:c.grounded>=8?'PASS':'INSUFFICIENT_SAMPLE',
    usefulness:c.grounded>=8&&c.rates.useful_among_grounded>=0.75?'PASS':c.grounded>=8?'FAIL':'INSUFFICIENT_SAMPLE',
    groundedness:c.persisted===0?'INCONCLUSIVE':c.rates.grounded_among_persisted>=0.90?'PASS':'FAIL',
    valuable_capture:c.rates.valuable_capture>=0.85?'PASS':'FAIL',
    valuable_persisted_case_coverage:c.rates.valuable_persisted_case_coverage>=0.85?'PASS':'FAIL',
    selectivity:selectivity?'PASS':'FAIL',
    baseline_useful_preservation:summary.missed_baseline_useful_cases.length===0?'PASS':'FAIL',
    privacy_source_authority:privacyTotal===0?'PASS':'FAIL'
  };
  summary.overall=Object.values(summary.gates).every(x=>x==='PASS')?'PASS':
    Object.values(summary.gates).includes('INSUFFICIENT_SAMPLE')?'INSUFFICIENT_SAMPLE':'FAIL_OR_INCONCLUSIVE';
  return summary;
}
function main() {
  const [action,ratificationPath,outcomesPath]=process.argv.slice(2);
  assert(['preflight','score'].includes(action),'usage_action');
  assert(ratificationPath,'usage_ratification_path');
  const original=readFileSync(ratificationPath,'utf8');
  const r=JSON.parse(original);
  const p=validateRatification(r);
  if(action==='preflight'){
    assert(!outcomesPath,'preflight_must_not_consume_outcomes');
    console.log(JSON.stringify({status:'H2_PREFLIGHT_PASS',ratification_sha256:digest(original),
      original_corpus_sha256:r.corpus_sha256, cases:p.case_count,valuable:p.useful,families:p.families},null,2));
  }else{
    assert(outcomesPath,'missing_outcomes');
    const raw=readFileSync(outcomesPath,'utf8');
    console.log(JSON.stringify(scoreOutcomes(r,original,JSON.parse(raw),raw),null,2));
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{main();}catch(e){console.error(e.message);process.exitCode=2;}
}
