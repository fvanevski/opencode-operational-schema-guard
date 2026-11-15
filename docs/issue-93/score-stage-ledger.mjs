#!/usr/bin/env node
// Metadata-only issue #93 scorer. Never certifies source or remote authority.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export const SCHEMA='issue93.stage-ledger.v1';
export const STAGES=['graphiti','source_join','remote_proven','shortlist','strict','semantic','candidate','presented','answer_supported'];
const id=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
function invalid(reason){throw new Error('INVALID_LEDGER: '+reason);}
function labels(value,where){
  if(!Array.isArray(value)||value.length>48||
    value.some(v=>typeof v!=='string'||!id.test(v))||
    new Set(value).size!==value.length)invalid(where);
  return value;
}
function percentile(sorted,p){return sorted.length?sorted[Math.ceil(sorted.length*p)-1]:null;}
function measure(cases,stage){
  let tp=0,fp=0,fn=0,covered=0,negativeInjection=0;
  for(const c of cases){
    const expected=new Set(c.expected),found=new Set(c.stages[stage]);
    for(const label of found){if(expected.has(label))tp++;else fp++;}
    for(const label of expected)if(!found.has(label))fn++;
    if(c.kind==='positive'&&[...expected].some(x=>found.has(x)))covered++;
    if(c.kind==='negative'&&found.size)negativeInjection++;
  }
  return {tp,fp,fn,positive_case_coverage:covered,negative_injection_cases:negativeInjection};
}
export function scoreLedger(input){
  if(!input||input.schema!==SCHEMA||
    !['frozen','holdout','exposed','native'].includes(input.cohort)||
    !Array.isArray(input.cases)||input.cases.length<1||input.cases.length>96||
    !Array.isArray(input.callbacks)||input.callbacks.length>10000)
    invalid('schema/counts');
  const cases=[],seen=new Set();
  for(const row of input.cases){
    if(!row||typeof row.id!=='string'||!id.test(row.id)||seen.has(row.id)||
      !['positive','negative'].includes(row.kind)||!row.stages)
      invalid('case identity/kind');
    seen.add(row.id);
    const expected=labels(row.expected,row.id+'.expected'),stages={};
    if((row.kind==='positive')!==(expected.length>0))invalid('case truth');
    for(const stage of STAGES)stages[stage]=labels(row.stages[stage],row.id+'.'+stage);
    if(!Number.isInteger(row.context_chars)||row.context_chars<0||
      row.context_chars>1400||stages.presented.length>5||
      typeof row.on_time!=='boolean'||typeof row.associated!=='boolean'||
      !row.controls||!['secret','wrong_group','false_verified']
        .every(k=>typeof row.controls[k]==='boolean'))
      invalid('context and control fields');
    if((!row.on_time||!row.associated)&&stages.presented.length)
      invalid('unassociated or late injection');
    if(stages.answer_supported.some(x=>!stages.presented.includes(x)))
      invalid('answer use without presentation');
    cases.push({id:row.id,kind:row.kind,expected,stages,
      context_chars:row.context_chars,on_time:row.on_time,
      associated:row.associated,controls:row.controls});
  }
  const times=[];
  for(const [i,r] of input.callbacks.entries()){
    if(!r||typeof r.duration_ms!=='number'||!Number.isFinite(r.duration_ms)||
      r.duration_ms<0||typeof r.injected!=='boolean'||typeof r.error!=='boolean')
      invalid('callback '+i);
    times.push(r.duration_ms);
  }
  times.sort((a,b)=>a-b);
  const selections=Object.fromEntries(STAGES.map(s=>[s,measure(cases,s)]));
  const controls=Object.fromEntries(['secret','wrong_group','false_verified'].map(k=>
    [k,cases.filter(c=>c.controls[k]).map(c=>c.id)]));
  const latency={count:times.length,p50_ms:percentile(times,0.5),
    p95_ms:percentile(times,0.95),max_ms:times.at(-1)??null,
    no_injection:input.callbacks.filter(r=>!r.injected).length,
    errors:input.callbacks.filter(r=>r.error).length,
    over_300_ms:times.filter(x=>x>300).length};
  return {schema:'issue93.scorecard.v1',cohort:input.cohort,
    status:'MEASUREMENT_ONLY_REQUIRES_INDEPENDENT_SOURCE_AND_HOST_PROOF',
    cases:cases.length,
    positive_cases:cases.filter(c=>c.kind==='positive').length,
    negative_cases:cases.filter(c=>c.kind==='negative').length,
    selections,controls,
    strict_only_losses:cases.filter(c=>c.kind==='positive'&&c.expected.some(x=>
      c.stages.strict.includes(x)&&!c.stages.candidate.includes(x))).map(c=>c.id),
    omissions:cases.filter(c=>c.kind==='positive').map(c=>({id:c.id,
      missing_at:STAGES.filter(s=>!c.expected.some(x=>c.stages[s].includes(x)))})),
    native:{negative_presented:cases.filter(c=>c.kind==='negative'&&
        c.stages.presented.length).map(c=>c.id),
      on_time_associated_positive_cases:cases.filter(c=>c.kind==='positive'&&
        c.on_time&&c.associated).length,
      context_chars_total:cases.reduce((sum,c)=>sum+c.context_chars,0)},
    callback_latency:latency,
    candidate_vs_semantic:{
      positive_coverage_delta:selections.candidate.positive_case_coverage-
        selections.semantic.positive_case_coverage,
      negative_injection_delta:selections.candidate.negative_injection_cases-
        selections.semantic.negative_injection_cases},
    callback_p95_within_300ms:latency.p95_ms===null?'UNVERIFIED':latency.p95_ms<=300};
}
async function main(){
  const a=process.argv.slice(2);
  if(a.length!==4||a[0]!=='--input'||a[2]!=='--output'||
    !path.isAbsolute(a[1])||!path.isAbsolute(a[3])||a[1]===a[3])
    invalid('usage: --input ABS --output ABS');
  const raw=await readFile(a[1]);
  if(raw.length>1048576)invalid('input >1MiB');
  const result=scoreLedger(JSON.parse(raw.toString('utf8')));
  await writeFile(a[3],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('scorecard written, cases='+result.cases+', callbacks='+result.callback_latency.count);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(e=>{console.error(e.message);process.exitCode=1;});
