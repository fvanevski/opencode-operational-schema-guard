#!/usr/bin/env node
/** Issue #81 three-path evaluator. Read-only: no network, model or Graphiti calls. */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {selectUserDecision,selectCompletedTest} from '../../issue-75/v2-candidate/memory-core.mjs';
import {fromPrompt,fromTool,fromFinishedTurn} from '../v2-candidate/events.mjs';
import {validateDecision,validateModelDecision} from '../v2-curator/core.mjs';

export const sha256=x=>createHash('sha256').update(x).digest('hex');
const FAIL=s=>{throw Error('INVALID_BENCHMARK:'+s);};
const TARGETS=['candidate_recall_min','durable_grounded_precision_min','semantic_recall_min'];
const CATEGORIES=new Set(['direct','implicit','error_fix','negative_finding','chatter','duplicate','privacy','wrong_group','conflict','historical']);
const pct=(a,b)=>b?a/b:null;
export function quantiles(data){
 const xs=data.filter(x=>Number.isFinite(x)&&x>=0).sort((a,b)=>a-b);
 return {count:xs.length,p50:xs.length?xs[Math.ceil(xs.length*.5)-1]:null,
   p95:xs.length?xs[Math.ceil(xs.length*.95)-1]:null};
}
export function confusion(rows,key){
 const x={tp:0,fp:0,tn:0,fn:0};
 for(const r of rows)if(typeof r.truth==='boolean'){
  x[r.truth?(r[key]?'tp':'fn'):(r[key]?'fp':'tn')]++;
 }
 return {...x,precision:pct(x.tp,x.tp+x.fp),recall:pct(x.tp,x.tp+x.fn)};
}
function assertCorpus(c){
 if(c?.schema_version!==1||!['development','holdout'].includes(c.split)||
   !['prior_accepted','provisional','operator_adjudicated'].includes(c.label_status))
  FAIL('corpus_metadata');
 if(!c.scope||!['group','project','workspace'].every(k=>typeof c.scope[k]==='string'&&c.scope[k]))
  FAIL('scope');
 if(!Array.isArray(c.cases)||!c.cases.length||c.cases.length>5000)FAIL('case_count');
 const ids=new Set();
 for(const x of c.cases){
  if(!/^[a-z0-9_.-]{1,80}$/i.test(x.id||'')||ids.has(x.id))FAIL('case_id');
  ids.add(x.id);
  if(!CATEGORIES.has(x.category)||!['prompt','tool','assistant'].includes(x.source_type)||
    typeof x.source_locator!=='string'||!x.source_locator||
    !x.native_event||typeof x.native_event.sessionID!=='string'||
    !(x.native_event.timestamp||x.native_event.time))FAIL('case_source:'+x.id);
  if(x.label!==null&&x.label!==undefined&&typeof x.label?.valuable!=='boolean')
    FAIL('truth_type:'+x.id);
  if(x.scope&&!['group','project','workspace'].every(k=>typeof x.scope[k]==='string'))
    FAIL('case_scope:'+x.id);
 }
 if(c.label_status==='operator_adjudicated'&&(!c.adjudicated_by||
   !c.cases.every(x=>typeof x.label?.valuable==='boolean')))
  FAIL('incomplete_human_adjudication');
}
function assertTargets(t,c){
 if(!t||t.schema_version!==1||!['central_proposal','operator_ratified'].includes(t.status))
  FAIL('target_authority');
 for(const k of TARGETS)if(!Number.isFinite(t.thresholds?.[k])||
   t.thresholds[k]<0||t.thresholds[k]>1)FAIL('target_'+k);
 if(!Number.isFinite(t.thresholds?.context_p95_ms_max)||
   !Number.isFinite(t.thresholds?.post_exit_p95_seconds_max))FAIL('latency_targets');
 if(c.split==='holdout'&&t.status!=='operator_ratified')FAIL('unratified_holdout_targets');
}
function replay(x,scope){
 const admitted=x.capture_admitted!==false&&
   (!x.scope||['group','project','workspace'].every(k=>x.scope[k]===scope[k]));
 const e=x.native_event;
 if(!admitted)return {baseline:false,candidate:null};
 if(x.source_type==='prompt')
  return {baseline:Boolean(selectUserDecision(e.prompt?.text)),
    candidate:fromPrompt(e,scope,{admitted:true})};
 if(x.source_type==='tool')
  return {baseline:Boolean(selectCompletedTest(e)),candidate:fromTool(e,scope)};
 return {baseline:false,candidate:fromFinishedTurn(e,scope)};
}
export function evaluate(corpus,{observations=null,targets=null,corpusBytes=null,
 targetsBytes=null,expectedCorpusSha=null,expectedTargetsSha=null}={}){
 assertCorpus(corpus);
 if(targets)assertTargets(targets,corpus);
 if(corpus.split==='holdout'){
  if(corpus.label_status!=='operator_adjudicated')FAIL('unadjudicated_holdout');
  if(!corpusBytes||!expectedCorpusSha||sha256(corpusBytes)!==expectedCorpusSha)
    FAIL('unverified_corpus_hash');
  if(!targetsBytes||!expectedTargetsSha||sha256(targetsBytes)!==expectedTargetsSha)
    FAIL('unverified_targets_hash');
  if(!targets)FAIL('holdout_targets_required');
 }
 const byCase=new Map(),rows=[],forbidden=[];
 for(const x of corpus.cases){
  const {baseline,candidate}=replay(x,corpus.scope);
  const row={id:x.id,category:x.category,truth:x.label?.valuable??null,
    baseline_selected:baseline,candidate_selected:Boolean(candidate),
    event_id:candidate?.event_id??null};
  rows.push(row);byCase.set(x.id,{row,candidate});
  if(candidate&&['privacy','wrong_group'].includes(x.category))forbidden.push(x.id);
 }
 const goldComplete=rows.every(r=>typeof r.truth==='boolean');
 let curated=null;
 if(observations){
  if(observations.schema_version!==1||!Array.isArray(observations.records))
    FAIL('observations_schema');
  const used=new Set(),decisions={},modelMs=[],postMs=[],tokenTotals=[],records=[];
  let nFacts=0,nJudged=0,nSupported=0,nUseful=0,invalid=0,wrongAuthority=0,wrongScope=0;
  for(const o of observations.records){
   if(!Array.isArray(o.source_case_ids)||!o.source_case_ids.length||
      o.source_case_ids.length>12||!Array.isArray(o.facts))FAIL('observation_shape');
   const events=[];
   for(const id of o.source_case_ids){
    if(used.has(id))FAIL('duplicate_observation_case:'+id);
    used.add(id);
    const found=byCase.get(id)?.candidate;
    if(!found)FAIL('missing_candidate:'+id);
    events.push(found);
   }
   if(new Set(events.map(e=>[e.group,e.project,e.workspace,e.session_id].join('|'))).size!==1)
    FAIL('cross_scope_cluster');
   const clusterId=sha256(events.map(e=>e.event_id).sort().join('\n'));
   if(o.cluster_id!==clusterId)FAIL('cluster_identity_mismatch');
   const e=events[0],cluster={id:clusterId,group:e.group,project:e.project,
     workspace:e.workspace,session_id:e.session_id,events,source_event_ids:events.map(e=>e.event_id)};
   const proposed={decision:o.decision,reason:o.reason,facts:o.facts};
   const validated=o.origin==='model'?validateModelDecision(proposed,cluster):
      validateDecision(proposed,cluster);
   if(!validated.ok)invalid++;
   decisions[o.decision]=(decisions[o.decision]||0)+1;
   if(Number.isFinite(o.model_ms))modelMs.push(o.model_ms);
   if(Number.isFinite(o.post_exit_ms))postMs.push(o.post_exit_ms);
   if(Number.isFinite(o.prompt_tokens)&&Number.isFinite(o.completion_tokens))
     tokenTotals.push(o.prompt_tokens+o.completion_tokens);
   for(let j=0;j<o.facts.length;j++){
    nFacts++;
    const v=o.fact_verdicts?.[j];
    if(!v||corpus.label_status!=='operator_adjudicated')continue;
    if(!['grounded','useful','authority_correct','scope_correct'].every(k=>typeof v[k]==='boolean')||
       typeof v.evaluator_id!=='string'||!v.evaluator_id)FAIL('unsubstantiated_fact_verdict');
    nJudged++;
    if(v.grounded&&v.authority_correct&&v.scope_correct)nSupported++;
    if(v.grounded&&v.authority_correct&&v.scope_correct&&v.useful)nUseful++;
    if(!v.authority_correct)wrongAuthority++;
    if(!v.scope_correct)wrongScope++;
   }
   records.push({cluster_id:clusterId,source_case_ids:o.source_case_ids,
     decision:o.decision,validation:validated.ok?'PASS':validated.reason,
     terminal_state:o.terminal_state||'UNVERIFIED'});
  }
  curated={record_count:records.length,decisions,invalid_model_or_source_decisions:invalid,
    facts_proposed:nFacts,facts_human_judged:nJudged,
    grounded_precision:nFacts===nJudged?pct(nSupported,nFacts):null,
    useful_facts:nFacts===nJudged?nUseful:null,
    false_authority:nFacts===nJudged?wrongAuthority:null,
    wrong_scope:nFacts===nJudged?wrongScope:null,
    model_ms:quantiles(modelMs),post_exit_ms:quantiles(postMs),
    tokens:quantiles(tokenTotals),tokens_total:tokenTotals.reduce((a,b)=>a+b,0),
    records};
 }
 const result={schema_version:1,kind:'issue81-three-path-comparison',
  corpus_sha256:corpusBytes?sha256(corpusBytes):null,
  targets_sha256:targetsBytes?sha256(targetsBytes):null,
  split:corpus.split,label_status:corpus.label_status,
  gold_complete:goldComplete,case_count:rows.length,
  baseline:goldComplete?confusion(rows,'baseline_selected'):null,
  broad_capture:goldComplete?confusion(rows,'candidate_selected'):null,
  curator:curated||{status:'UNVERIFIED_NO_MODEL_OBSERVATIONS'},
  privacy_or_wrong_group_selected:forbidden,
  rows, // IDs and flags only: never serialize raw source excerpts or credentials.
  notes:['A selected event is not a fact; emission is not independently fact-verified.',
   'Remote Graphiti and assembled fresh-client recall require distinct host receipts.']};
 if(targets){
  result.target_status=targets.status;
  result.targets={
   candidate_recall:result.broad_capture?.recall===null||!result.broad_capture?null:
       result.broad_capture.recall>=targets.thresholds.candidate_recall_min,
   grounded_precision:curated?.grounded_precision===null||!curated?null:
       curated.grounded_precision>=targets.thresholds.durable_grounded_precision_min,
   no_privacy_wrong_group:forbidden.length===0,
   no_false_authority:curated?.false_authority===null||!curated?null:curated.false_authority===0,
   no_wrong_scope:curated?.wrong_scope===null||!curated?null:curated.wrong_scope===0,
   semantic_recall:'UNVERIFIED_UNTIL_FRESH_CLIENT',
   context_latency:'UNVERIFIED_UNTIL_INSTALLED',
   post_exit_latency:curated?.post_exit_ms.count?curated.post_exit_ms.p95<=
     targets.thresholds.post_exit_p95_seconds_max*1000:null};
 }
 return result;
}
const arg=(args,k)=>{const i=args.indexOf('--'+k);return i<0?null:args[i+1]||null;};
export async function main(args=process.argv.slice(2)){
 const file=arg(args,'corpus'),out=arg(args,'out');
 if(!file||!path.isAbsolute(file))FAIL('corpus_absolute_path_required');
 const corpusBytes=await readFile(file,'utf8'),corpus=JSON.parse(corpusBytes);
 const observationsFile=arg(args,'observations'),targetsFile=arg(args,'targets');
 const observations=observationsFile?JSON.parse(await readFile(observationsFile,'utf8')):null;
 const targetsBytes=targetsFile?await readFile(targetsFile,'utf8'):null;
 const targets=targetsBytes?JSON.parse(targetsBytes):null;
 const report=evaluate(corpus,{observations,targets,corpusBytes,targetsBytes,
   expectedCorpusSha:arg(args,'expected-corpus-sha256'),
   expectedTargetsSha:arg(args,'expected-targets-sha256')});
 const output=JSON.stringify(report,null,2)+'\n';
 if(out){if(!path.isAbsolute(out))FAIL('out_absolute_path_required');
   await writeFile(out,output,{flag:'wx',mode:0o600});}
 else process.stdout.write(output);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
 await main();
