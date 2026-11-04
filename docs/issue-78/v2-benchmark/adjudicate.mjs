#!/usr/bin/env node
/** #81 private human-adjudication boundary. Offline only, no network or LLM. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {evaluate} from './evaluate.mjs';

export const digest=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('ADJUDICATION_INVALID:'+s);};
const HEX=/^[a-f0-9]{64}$/;
const has=x=>typeof x==='string'&&x.trim().length>0&&x.length<=300;
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const when=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const CFM='I reviewed the frozen evidence and adjudicated these labels myself.';
const TFM='I ratify the original proposed thresholds before holdout scoring.';
function checkHash(bytes,expected,kind){
 if(!HEX.test(expected||'')||digest(bytes)!==expected)fail(kind+'_sha256_mismatch');
}
function checkInputs(corpus,proposal){
 if(corpus?.schema_version!==1||!['development','holdout'].includes(corpus.split)||
    !Array.isArray(corpus.cases)||!corpus.cases.length)fail('frozen_corpus_shape');
 if(proposal?.schema_version!==1||proposal.status!=='central_proposal'||
    !obj(proposal.thresholds))fail('original_proposal_required');
}
export function prepareWorksheet(corpus,corpusSha,observations=null){
 if(!HEX.test(corpusSha||''))fail('pinned_corpus_required');
 if(corpus?.schema_version!==1||!['development','holdout'].includes(corpus.split)||
    !Array.isArray(corpus.cases)||!corpus.cases.length)fail('corpus_shape');
 if(observations&&(observations.schema_version!==1||
    !Array.isArray(observations.records)))fail('observations_shape');
 return {
  schema_version:1,kind:'issue81-operator-adjudication',
  status:'DRAFT_UNRATIFIED',split:corpus.split,corpus_sha256:corpusSha,
  adjudicated_by:null,adjudicated_at:null,operator_confirmation:null,
  // Private worksheet. Preserve frozen source bytes and provisional labels.
  case_labels:corpus.cases.map(x=>({
    id:x.id,source_locator:x.source_locator,category:x.category,
    proposed_valuable:x.label?.valuable??null,valuable:null,
    source_checked:false,reason:''})),
  fact_verdicts:(observations?.records||[]).flatMap(r=>
    (r.facts||[]).map((f,i)=>({
      cluster_id:r.cluster_id,fact_index:i,assertion_sha256:digest(f.assertion),
      source_refs:f.source_refs,source_checked:false,
      grounded:null,useful:null,authority_correct:null,scope_correct:null,
      evaluator_id:null,reason:''}))),
  instructions:'An actual human must review source/claim evidence, fill verdicts, and consciously attest. Build agents cannot ratify themselves. Private file: do not publish excerpts or credentials.'
 };
}
export function prepareTargets(proposal,proposalSha){
 if(proposal?.status!=='central_proposal'||!HEX.test(proposalSha||''))
   fail('proposal_identity');
 return {schema_version:1,kind:'issue81-target-ratification',
   status:'DRAFT_UNRATIFIED',proposal_sha256:proposalSha,ratified_by:null,
   ratified_at:null,operator_confirmation:null,
   note:'Original thresholds are fixed; only ratify or stop. Never revise after holdout.'};
}
export function score({
 corpusBytes,expectedCorpusSha,adjudicationBytes,expectedAdjudicationSha,
 proposalBytes,expectedProposalSha,ratificationBytes,expectedRatificationSha,
 observationsBytes=null
}={}){
 for(const [bytes,d,k] of [
  [corpusBytes,expectedCorpusSha,'corpus'],
  [adjudicationBytes,expectedAdjudicationSha,'adjudication'],
  [proposalBytes,expectedProposalSha,'proposal'],
  [ratificationBytes,expectedRatificationSha,'ratification']]){
  if(typeof bytes!=='string')fail(k+'_missing');
  checkHash(bytes,d,k);
 }
 const corpus=JSON.parse(corpusBytes),adjudication=JSON.parse(adjudicationBytes),
   proposal=JSON.parse(proposalBytes),ratification=JSON.parse(ratificationBytes);
 checkInputs(corpus,proposal);
 const operator=adjudication?.adjudicated_by;
 if(adjudication?.schema_version!==1||adjudication.kind!=='issue81-operator-adjudication'||
    adjudication.status!=='OPERATOR_RATIFIED'||adjudication.split!==corpus.split||
    adjudication.corpus_sha256!==expectedCorpusSha||!has(operator)||
    !when(adjudication.adjudicated_at)||adjudication.operator_confirmation!==CFM)
   fail('case_adjudication_not_ratified');
 if(ratification?.schema_version!==1||
    ratification.kind!=='issue81-target-ratification'||
    ratification.status!=='OPERATOR_RATIFIED'||
    ratification.proposal_sha256!==expectedProposalSha||
    !has(ratification.ratified_by)||!when(ratification.ratified_at)||
    ratification.operator_confirmation!==TFM)
   fail('targets_not_ratified');
 const labels=adjudication.case_labels;
 if(!Array.isArray(labels)||labels.length!==corpus.cases.length)
   fail('case_coverage_incomplete');
 const byId=new Map();
 for(const x of labels){
  if(!has(x.id)||byId.has(x.id)||typeof x.valuable!=='boolean'||
    x.source_checked!==true||!has(x.source_locator))
    fail('case_label_invalid');
  byId.set(x.id,x);
 }
 let changed=0;
 const cases=corpus.cases.map(c=>{
   const x=byId.get(c.id);
   if(!x||x.source_locator!==c.source_locator)fail('source_label_binding:'+c.id);
   if(typeof c.label?.valuable==='boolean'&&c.label.valuable!==x.valuable)changed++;
   return {...c,label:{valuable:x.valuable}};
 });
 const observations=observationsBytes===null?null:JSON.parse(observationsBytes);
 if(observations&&(observations.schema_version!==1||!Array.isArray(observations.records)))
   fail('observations_shape');
 const facts=(observations?.records||[]).flatMap(r=>(r.facts||[]).map((f,i)=>({
   key:r.cluster_id+':'+i,cluster_id:r.cluster_id,fact_index:i,
   assertion_sha256:digest(f.assertion),source_refs:f.source_refs
 })));
 const verdicts=adjudication.fact_verdicts;
 if(!Array.isArray(verdicts)||verdicts.length!==facts.length)
   fail('fact_coverage_incomplete');
 const byFact=new Map();
 for(const v of verdicts){
  const key=v.cluster_id+':'+v.fact_index;
  if(byFact.has(key)||v.source_checked!==true||v.evaluator_id!==operator||
     !['grounded','useful','authority_correct','scope_correct']
       .every(k=>typeof v[k]==='boolean')||
     !HEX.test(v.assertion_sha256||'')||!Array.isArray(v.source_refs))
    fail('fact_verdict_invalid');
  byFact.set(key,v);
 }
 for(const f of facts){
  const v=byFact.get(f.key);
  if(!v||v.assertion_sha256!==f.assertion_sha256||
     JSON.stringify(v.source_refs)!==JSON.stringify(f.source_refs))
    fail('fact_source_identity_mismatch');
 }
 const enriched=observations===null?null:{...observations,
   records:observations.records.map(r=>({...r,
     fact_verdicts:r.facts.map((_,i)=>{
       const v=byFact.get(r.cluster_id+':'+i);
       const {grounded,useful,authority_correct,scope_correct,evaluator_id}=v;
       return {grounded,useful,authority_correct,scope_correct,evaluator_id};
     })}))};
 const effectiveCorpus={...corpus,label_status:'operator_adjudicated',
   adjudicated_by:operator,cases};
 const effectiveTargets={...proposal,status:'operator_ratified',
   registration_note:proposal.registration_note,
   ratification:{ratified_by:ratification.ratified_by,
     ratified_at:ratification.ratified_at,
     source_proposal_sha256:expectedProposalSha}};
 const effectiveTargetsBytes=JSON.stringify(effectiveTargets);
 const report=evaluate(effectiveCorpus,{observations:enriched,targets:effectiveTargets,
   corpusBytes,expectedCorpusSha,targetsBytes:effectiveTargetsBytes,
   expectedTargetsSha:digest(effectiveTargetsBytes)});
 return {
   schema_version:1,kind:'issue81-adjudicated-score',
   authority:{frozen_corpus_sha256:expectedCorpusSha,
     adjudication_sha256:expectedAdjudicationSha,
     original_target_sha256:expectedProposalSha,
     target_ratification_sha256:expectedRatificationSha,
     observation_sha256:observationsBytes?digest(observationsBytes):null,
     case_label_changes_from_provisional:changed,
     source_bytes_unchanged:true,
     human_attestation_supplied:true},
   report};
}
const get=(args,k)=>{const i=args.indexOf('--'+k);return i<0?null:args[i+1]||null;};
const required=(args,k)=>{const v=get(args,k);if(!v)fail('missing_argument:'+k);return v;};
async function read(args,k){const p=required(args,k);if(!path.isAbsolute(p))fail('absolute_path_required:'+k);return readFile(p,'utf8');}
async function put(args,k,data){
 const p=required(args,k);
 if(!path.isAbsolute(p))fail('absolute_path_required:'+k);
 await writeFile(p,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
}
export async function cli(args=process.argv.slice(2)){
 const action=args[0];
 if(action==='prepare'){
  const corpusBytes=await read(args,'corpus'),
    corpusSha=required(args,'expected-corpus-sha256');
  checkHash(corpusBytes,corpusSha,'corpus');
  const obsPath=get(args,'observations');
  const obs=obsPath?JSON.parse(await read(args,'observations')):null;
  await put(args,'out',prepareWorksheet(JSON.parse(corpusBytes),corpusSha,obs));
  if(get(args,'target-out')){
   const proposalBytes=await read(args,'proposal'),
     proposalSha=required(args,'expected-proposal-sha256');
   checkHash(proposalBytes,proposalSha,'proposal');
   await put(args,'target-out',prepareTargets(JSON.parse(proposalBytes),proposalSha));
  }
 }else if(action==='score'){
  const v={
   corpusBytes:await read(args,'corpus'),
   expectedCorpusSha:required(args,'expected-corpus-sha256'),
   adjudicationBytes:await read(args,'adjudication'),
   expectedAdjudicationSha:required(args,'expected-adjudication-sha256'),
   proposalBytes:await read(args,'proposal'),
   expectedProposalSha:required(args,'expected-proposal-sha256'),
   ratificationBytes:await read(args,'target-ratification'),
   expectedRatificationSha:required(args,'expected-target-ratification-sha256'),
   observationsBytes:get(args,'observations')?await read(args,'observations'):null
  };
  await put(args,'out',score(v));
 }else fail('command_prepare_or_score_required');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
 await cli();
