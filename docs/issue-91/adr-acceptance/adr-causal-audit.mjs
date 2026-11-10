#!/usr/bin/env node
/** Issue #92: offline, read-only forensic classifier for EXPOSED cases.
 * Never treats prospective scorer's "discovered" boolean as model evidence.
 * Never interprets token overlap or model self-attestation as semantic support.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateModelDecision} from '../../issue-78/v2-curator/core.mjs';
import {validateFactDiscovery,validateFactReview,filterFactProposal}
 from '../../issue-78/v2-curator/fact-review.mjs';

const SHA=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const H=s=>createHash('sha256').update(s).digest('hex');
const req=(v,reason)=>{if(!v)throw Error('ADR92_CAUSAL_INVALID:'+reason)};
export const D1_SOURCE_PINS=Object.freeze({
 previous:'a684667a6eefa2dc19f29755bed0c3048874721d',
 corrected:'e303a67786fd96491cbdab36790b81442c4340c6'
});
export const D2_SOURCE_PINS=Object.freeze({
 previous:'e303a67786fd96491cbdab36790b81442c4340c6',
 two_stage:'50db627850c28f2ce31a68f547f91f51ee3e43b0'
});
const stages=[
 'SOURCE_NOT_VISIBLE','RAW_MODEL_UNAVAILABLE','MODEL_SKIP','MODEL_DEFER',
 'MODEL_OTHER_FACT','MODEL_INVALID_PROPOSAL','VALIDATOR_REJECTED',
 'VALIDATED_NO_TERMINAL_PROOF','REMOTE_TARGET_PRESERVED','REVIEW_ONLY_PROPOSAL',
 'DISCOVERY_NO_CANDIDATE','DISCOVERY_VALIDATOR_REJECTED',
 'RAW_REVIEW_UNAVAILABLE','REVIEW_INVALID_RESPONSE','REVIEW_DEFER',
 'REVIEW_VALIDATOR_REJECTED','DISCOVERED_OTHER_FACT'
];
const validReviewState=new Set(['skipped','deferred','approved','queued','persisted',
 'submission_unknown','failed_extraction','retry_authorized','unknown']);
function classify(row,frozen){
 const result={target_id:row.target_id,case_id:frozen.case_id,
   source_ref_sha256:H(frozen.source_ref),stage:null,model_decision:null,
   validator_reason:null,review_state:row.review_state,model_reply_sha256:null,
   fact_indices:[],terminal_count:0,evidence_tier:null};
 req(typeof row.model_visible==='boolean'&&
   validReviewState.has(row.review_state)&&
   typeof row.review_reason==='string','source_visibility_or_review_state');
 req(Array.isArray(row.model_fact_indices)&&
   row.model_fact_indices.every(x=>Number.isSafeInteger(x)&&x>=0)&&
   new Set(row.model_fact_indices).size===row.model_fact_indices.length,
   'fact_index_shape');
 req(Array.isArray(row.terminals),'terminal_shape');
 const raw=row.model_raw_content;
 if(!row.model_visible){
   req(row.model_fact_indices.length===0&&row.terminals.length===0,
     'unseen_source_has_model_or_remote_credit');
   result.stage='SOURCE_NOT_VISIBLE';result.evidence_tier='captured_state';return result;
 }
 req(row.cluster&&row.cluster.id===frozen.cluster_id&&
   Array.isArray(row.cluster.events)&&
   row.cluster.events.some(e=>e.source_refs?.includes(frozen.source_ref)),
   'model_visible_source_not_in_actual_prompt');
 if(raw===null||raw===undefined){
   req(row.model_fact_indices.length===0,'unrecorded_model_fact_claim');
   result.stage='RAW_MODEL_UNAVAILABLE';
   result.evidence_tier='review_state_only';result.terminal_count=row.terminals.length;
   return result;
 }
 req(typeof raw==='string'&&raw.length>0&&raw.length<=12000,'raw_model_shape');
 result.model_reply_sha256=H(raw);
 req(row.model_reply_sha256===result.model_reply_sha256,
   'raw_model_digest_not_authenticated');
 let parsed;
 try{parsed=JSON.parse(raw);}catch{
   result.stage='MODEL_INVALID_PROPOSAL';result.validator_reason='invalid_model_json';
   result.evidence_tier='raw_model_response';return result;
 }
 req(parsed&&typeof parsed==='object'&&Array.isArray(parsed.facts),
   'raw_model_facts_shape');
 result.model_decision=parsed.decision??null;
 const check=validateModelDecision(parsed,row.cluster);
 result.validator_reason=check.ok?null:check.reason;
 // Fact indices are assigned by an independent original-source reviewer;
 // this code checks only source linkage and raw-model index identity.
 req(typeof row.independently_reviewed==='boolean'&&
   (row.model_fact_indices.length===0||row.independently_reviewed),
   'independent_review_required');
 for(const idx of row.model_fact_indices){
   const fact=parsed.facts[idx];
   req(fact&&Array.isArray(fact.source_refs)&&
     fact.source_refs.includes(frozen.source_ref),
     'fact_index_not_linked_to_frozen_source');
 }
 result.fact_indices=[...row.model_fact_indices];
 result.evidence_tier='raw_model_response_plus_independent_source_review';
 if(parsed.decision==='SKIP'){
   req(row.terminals.length===0,'skip_has_terminal_receipt');
   result.stage='MODEL_SKIP';return result;
 }
 if(parsed.decision==='DEFER'){
   req(row.terminals.length===0,'defer_has_terminal_receipt');
   result.stage='MODEL_DEFER';return result;
 }
 if(['MERGE','SUPERSEDE_PROPOSED'].includes(parsed.decision)){
   result.stage='REVIEW_ONLY_PROPOSAL';return result;
 }
 if(parsed.decision!=='EMIT'){
   result.stage='MODEL_INVALID_PROPOSAL';return result;
 }
 if(!row.model_fact_indices.length){result.stage='MODEL_OTHER_FACT';return result;}
 if(!check.ok){
   result.stage='VALIDATOR_REJECTED';return result;
 }
 const verified=row.terminals.filter(e=>e&&UUID.test(e.uuid||'')&&
   e.source_ref===frozen.source_ref&&e.original_source_supported===true&&
   e.independently_reviewed===true&&e.review_store===true&&
   e.graphiti_mcp===true&&e.falkordb===true&&e.source_index===true);
 req(verified.length===row.terminals.length,'unverified_terminal_proof');
 result.terminal_count=verified.length;
 result.stage=verified.length?'REMOTE_TARGET_PRESERVED':'VALIDATED_NO_TERMINAL_PROOF';
 return result;
}

/** D2 treats discovery and independent review as two distinct raw model calls.
 * A provisional source candidate is NOT yet a durable utility judgment.
 */
function classifyTwoStage(row,frozen){
 const result={target_id:row.target_id,case_id:frozen.case_id,
   source_ref_sha256:H(frozen.source_ref),stage:null,model_decision:'TWO_STAGE',
   validator_reason:null,review_state:row.review_state,
   discovery_reply_sha256:null,review_reply_sha256:null,
   fact_indices:[],terminal_count:0,evidence_tier:null};
 req(typeof row.model_visible==='boolean'&&validReviewState.has(row.review_state)&&
   typeof row.review_reason==='string'&&Array.isArray(row.model_fact_indices)&&
   Array.isArray(row.terminals),'d2_row_shape');
 req(new Set(row.model_fact_indices).size===row.model_fact_indices.length&&
   row.model_fact_indices.every(x=>Number.isSafeInteger(x)&&x>=0),
   'd2_fact_index_shape');
 if(!row.model_visible){
   req(row.terminals.length===0&&row.model_fact_indices.length===0,
     'd2_unseen_has_model_or_remote_credit');
   result.stage='SOURCE_NOT_VISIBLE';result.evidence_tier='captured_state';return result;
 }
 req(row.cluster?.id===frozen.cluster_id&&
   row.cluster?.events?.some(e=>e.source_refs?.includes(frozen.source_ref)),
   'd2_source_not_in_actual_prompt');
 const discovery=row.discovery_raw_content;
 if(discovery===null||discovery===undefined){
   req(row.model_fact_indices.length===0,'d2_missing_discovery_claim');
   result.stage='RAW_MODEL_UNAVAILABLE';result.evidence_tier='review_state_only';
   return result;
 }
 req(typeof discovery==='string'&&discovery.length>0&&discovery.length<=12000&&
   row.discovery_reply_sha256===H(discovery),'d2_discovery_digest');
 result.discovery_reply_sha256=H(discovery);
 const p=validateFactDiscovery(discovery,row.cluster);
 result.validator_reason=p.ok?null:p.reason;
 result.evidence_tier='raw_discovery_and_original_source';
 if(!p.ok){result.stage='DISCOVERY_VALIDATOR_REJECTED';return result;}
 if(p.decision==='SKIP'){
   req(row.model_fact_indices.length===0&&row.terminals.length===0,
     'd2_skip_has_target_or_terminal');
   result.stage='DISCOVERY_NO_CANDIDATE';return result;
 }
 req(p.decision==='EMIT','d2_discovery_unexpected_decision');
 req(row.independently_reviewed===true||row.model_fact_indices.length===0,
   'd2_source_adjudication_missing');
 for(const idx of row.model_fact_indices)
   req(p.facts[idx]?.source_refs?.includes(frozen.source_ref),
     'd2_source_target_index_mismatch');
 result.fact_indices=[...row.model_fact_indices];
 const reviewRaw=row.review_raw_content;
 if(reviewRaw===null||reviewRaw===undefined){
   result.stage='RAW_REVIEW_UNAVAILABLE';return result;
 }
 req(typeof reviewRaw==='string'&&reviewRaw.length>0&&reviewRaw.length<=12000&&
   row.review_reply_sha256===H(reviewRaw),'d2_review_digest');
 result.review_reply_sha256=H(reviewRaw);
 const decision=validateFactReview(reviewRaw,p);
 if(!decision.ok){
   result.stage='REVIEW_INVALID_RESPONSE';result.validator_reason=decision.reason;
   return result;
 }
 if(row.model_fact_indices.length===0){
   result.stage='DISCOVERED_OTHER_FACT';return result;
 }
 const matched=decision.accepted.filter(x=>row.model_fact_indices.includes(x.index));
 if(!matched.length){
   req(row.terminals.length===0,'d2_reviewed_target_has_terminal');
   result.stage='REVIEW_DEFER';return result;
 }
 const checked=validateModelDecision(filterFactProposal(p,decision),row.cluster);
 if(!checked.ok){
   result.stage='REVIEW_VALIDATOR_REJECTED';result.validator_reason=checked.reason;
   return result;
 }
 const verified=row.terminals.filter(e=>e&&UUID.test(e.uuid||'')&&
   e.source_ref===frozen.source_ref&&e.original_source_supported===true&&
   e.independently_reviewed===true&&e.review_store===true&&
   e.graphiti_mcp===true&&e.falkordb===true&&e.source_index===true);
 req(verified.length===row.terminals.length,'d2_unverified_terminal_proof');
 result.terminal_count=verified.length;
 result.stage=verified.length?'REMOTE_TARGET_PRESERVED':'VALIDATED_NO_TERMINAL_PROOF';
 result.evidence_tier='source_discovery_review_and_remote';
 return result;
}
export function auditExposed(freeze,bundle,rawFreeze){
 const d1=bundle?.schema==='issue92-adr-exposed-d1-comparison-v1';
 const d2=bundle?.schema==='issue92-adr-exposed-d2-comparison-v1';
 const development=d1||d2;
 const pins=d1?D1_SOURCE_PINS:d2?D2_SOURCE_PINS:null;
 const name=d1?'d1':'d2';
 if(development)
   req(Object.keys(pins).every(key=>bundle.comparison_sources?.[key]===pins[key]),
     'development_comparison_source_identity');
 req(typeof rawFreeze==='string'&&H(rawFreeze)===bundle?.freeze_sha256,
   'freeze_bytes_digest_mismatch');
 req(freeze?.schema==='issue92-adr-prospective-freeze-v1'&&
   (bundle?.schema==='issue92-adr-exposed-causal-audit-v1'||development)&&
   bundle.freeze_sha256&&SHA.test(bundle.freeze_sha256)&&
   bundle.source_commits?.baseline===freeze.source_commits?.baseline&&
   bundle.source_commits?.candidate===freeze.source_commits?.candidate,
   'immutable_campaign_identity');
 req(Array.isArray(bundle.runs)&&
   (development?bundle.runs.length===2:bundle.runs.length>=1)&&
   Array.isArray(freeze.cases),'runs_and_cases');
 const byTarget=new Map();
 for(const c of freeze.cases){
   req(typeof c.id==='string'&&typeof c.cluster_id==='string','frozen_cluster_id');
   for(const t of c.targets||[]){
     req(!byTarget.has(t.id),'duplicate_frozen_target');
     byTarget.set(t.id,{...t,case_id:c.id,cluster_id:c.cluster_id});
   }
 }
 const rows=[],summaries=[],seenRuns=new Set();
 for(const run of bundle.runs){
   if(development)
     req(run.trial===name&&
       Object.hasOwn(pins,run.arm)&&
       run.source_sha===pins[run.arm]&&
       Array.isArray(run.targets),'development_run_exact_source');
   else
     req(typeof run.trial==='string'&&/^(?:t1|t2|d[0-9]{1,2})$/.test(run.trial)&&
       ['baseline','candidate'].includes(run.arm)&&
       Array.isArray(run.targets),'run_identity');
   const key=run.trial+':'+run.arm;
   req(!seenRuns.has(key),'duplicate_run');seenRuns.add(key);
   const seen=new Set(),counts=Object.fromEntries(stages.map(x=>[x,0]));
   for(const row of run.targets){
     const target=byTarget.get(row.target_id);
     req(target&&target.valuable===true&&!seen.has(row.target_id),
       'target_not_frozen_valuable_or_duplicate');
     seen.add(row.target_id);
     const outcome=d2&&run.arm==='two_stage'?
       classifyTwoStage(row,target):classify(row,target);
     rows.push({trial:run.trial,arm:run.arm,...outcome});
     counts[outcome.stage]++;
   }
   const missing=[...byTarget.values()].filter(t=>t.valuable&&!seen.has(t.id))
      .map(t=>t.id).sort();
   summaries.push({trial:run.trial,arm:run.arm,reviewed_targets:seen.size,
     missing_valuable_targets:missing,complete:missing.length===0,counts});
 }
 if(development)
   req(Object.keys(pins).every(arm=>seenRuns.has(name+':'+arm)),
     'development_run_pair_incomplete');
 return {schema:d2?'issue92-adr-exposed-d2-result-v1':
     d1?'issue92-adr-exposed-d1-result-v1':'issue92-adr-exposed-causal-result-v1',
   source_commits:{...bundle.source_commits},
   ...(development?{comparison_sources:{...pins}}:{}),
   freeze_sha256:bundle.freeze_sha256,
   disposition:summaries.every(s=>s.complete)?'COMPLETE':'INCOMPLETE',
   summaries,rows,
   note:'No claim that model recognized a SKIPped target. Missing raw model trace is unknown, never credited as discovered. Semantic target matching and actual source/Graphiti receipts require separate independent host verification.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
   const [action,freezePath,inputPath]=process.argv.slice(2);
   req(action==='analyze'&&freezePath&&inputPath,'usage_analyze_freeze_and_private_bundle');
   const rawFreeze=readFileSync(freezePath,'utf8');
   const result=auditExposed(JSON.parse(rawFreeze),
     JSON.parse(readFileSync(inputPath,'utf8')),rawFreeze);
   console.log(JSON.stringify(result,null,2));
 }catch(e){console.error(e?.message||String(e));process.exitCode=2;}
}
