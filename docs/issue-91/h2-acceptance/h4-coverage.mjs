#!/usr/bin/env node
/** Prospective cluster-target scoring. Exact candidate implementation pin is
 * distinct from later documentation/evidence commits. No model/Graphiti I/O.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {scoreFactCoverageV2} from './h2-coverage-v2.mjs';
import {validateProspectiveFreeze} from './h4-cohort-preflight.mjs';
export const EXPECTED_SOURCE=Object.freeze({
  baseline:'c8eb5260f2b10832346234b1b5d0cf28302ffba8',
  candidate:'e0360f03bbaf2d47f5ad167ff0c57c021cc12aed'
});
const assert=(ok,why)=>{if(!ok)throw Error('H4_SCORE_INVALID:'+why)};
export function scoreProspective(f,r,rawRatification,outcomes,rawOutcomes){
  validateProspectiveFreeze(f,EXPECTED_SOURCE);
  assert(f.corpus_sha256===r?.corpus_sha256&&
    f.model_policy_sha256===r?.model_policy_sha256,'frozen_corpus_or_policy_mismatch');
  assert(outcomes?.source_commits?.baseline===EXPECTED_SOURCE.baseline&&
    outcomes?.source_commits?.candidate===EXPECTED_SOURCE.candidate,
    'frozen_outcome_source_mismatch');
  assert(Array.isArray(r.cases)&&r.cases.length===f.cases.length,'ratified_case_count');
  const frozen=new Map(f.cases.map(c=>[c.id,c]));
  for(const c of r.cases){
    const original=frozen.get(c.id);
    assert(original&&c.cluster_id===original.cluster_id&&
      c.fact_family===original.fact_family&&
      c.source_sha256===original.source_sha256&&
      c.target_excerpt_sha256===original.target_excerpt_sha256&&
      c.valuable===original.valuable,'ratification_target_drift');
  }
  assert(Date.parse(r.ratified_at)>=Date.parse(f.frozen_at)&&
    Date.parse(outcomes.first_model_started_at)>Date.parse(r.ratified_at),
    'chronology');
  const scored=scoreFactCoverageV2(r,rawRatification,outcomes,rawOutcomes,{
    expectedSource:EXPECTED_SOURCE,prospectiveTargets:true});
  scored.prospective_source_commit=EXPECTED_SOURCE.candidate;
  scored.prospective_cluster_count=f.cases.length;
  scored.prospective_valuable_target_count=f.cases.filter(c=>c.valuable).length;
  return scored;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const [action,freezePath,ratificationPath,outcomesPath]=process.argv.slice(2);
    assert(action==='score'&&freezePath&&ratificationPath&&outcomesPath,'usage');
    const rawRatification=readFileSync(ratificationPath,'utf8');
    const rawOutcomes=readFileSync(outcomesPath,'utf8');
    const f=JSON.parse(readFileSync(freezePath,'utf8'));
    console.log(JSON.stringify(scoreProspective(f,JSON.parse(rawRatification),rawRatification,
      JSON.parse(rawOutcomes),rawOutcomes),null,2));
  }catch(e){console.error(e.message);process.exitCode=2;}
}
