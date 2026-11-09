#!/usr/bin/env node
/** Issue #92: offline, read-only forensic classifier for EXPOSED cases.
 * Never treats prospective scorer's "discovered" boolean as model evidence.
 * Never interprets token overlap or model self-attestation as semantic support.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateModelDecision} from '../../issue-78/v2-curator/core.mjs';

const SHA=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const H=s=>createHash('sha256').update(s).digest('hex');
const req=(v,reason)=>{if(!v)throw Error('ADR92_CAUSAL_INVALID:'+reason)};
const stages=[
 'SOURCE_NOT_VISIBLE','RAW_MODEL_UNAVAILABLE','MODEL_SKIP','MODEL_DEFER',
 'MODEL_OTHER_FACT','MODEL_INVALID_PROPOSAL','VALIDATOR_REJECTED',
 'VALIDATED_NO_TERMINAL_PROOF','REMOTE_TARGET_PRESERVED','REVIEW_ONLY_PROPOSAL'
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
export function auditExposed(freeze,bundle,rawFreeze){
 req(typeof rawFreeze==='string'&&H(rawFreeze)===bundle?.freeze_sha256,
   'freeze_bytes_digest_mismatch');
 req(freeze?.schema==='issue92-adr-prospective-freeze-v1'&&
   bundle?.schema==='issue92-adr-exposed-causal-audit-v1'&&
   bundle.freeze_sha256&&SHA.test(bundle.freeze_sha256)&&
   bundle.source_commits?.baseline===freeze.source_commits?.baseline&&
   bundle.source_commits?.candidate===freeze.source_commits?.candidate,
   'immutable_campaign_identity');
 req(Array.isArray(bundle.runs)&&bundle.runs.length>=1&&
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
     const outcome=classify(row,target);
     rows.push({trial:run.trial,arm:run.arm,...outcome});
     counts[outcome.stage]++;
   }
   const missing=[...byTarget.values()].filter(t=>t.valuable&&!seen.has(t.id))
      .map(t=>t.id).sort();
   summaries.push({trial:run.trial,arm:run.arm,reviewed_targets:seen.size,
     missing_valuable_targets:missing,complete:missing.length===0,counts});
 }
 return {schema:'issue92-adr-exposed-causal-result-v1',
   source_commits:{...bundle.source_commits},freeze_sha256:bundle.freeze_sha256,
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
