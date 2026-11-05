#!/usr/bin/env node
/**
 * #81: offline classification of frozen source cases omitted by #79 capture.
 * It executes the real immutable #75/#79 replay adapters, then reports only
 * coarse field-presence/gate evidence. It NEVER repairs cases or changes labels.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {replay} from './evaluate.mjs';
import {cleanExcerpt} from '../v2-candidate/events.mjs';

const fail=s=>{throw Error('CAPTURE_DIAG_INVALID:'+s);};
const sha=s=>createHash('sha256').update(s).digest('hex');
const sid=x=>typeof x==='string'&&/^[A-Za-z0-9_.:-]{1,160}$/.test(x);
const first=(object,fields)=>fields.map(k=>object?.[k]).find(x=>typeof x==='string'&&x.length>0)||'';
const hasString=x=>typeof x==='string'&&x.length>0;
const READ_ONLY_NOISE=/^(?:pwd|ls|cat|head|tail|grep|rg|find|wc|sed|awk)\b/i;
const TOOL_INTEREST=/\b(?:pytest|test|spec|build|compile|lint|format|check|error|fail|pass|exception|traceback|migration|npm|node|python|cargo|go|git|gh|patch|install|deploy|permission|config|service|docker|curl|timeout)\b/i;
const FILE_TOOLS=new Set(['edit','write','apply_patch']);
// A read-only tool operation does not establish a file mutation or a
// durable finding from file contents. Do not assign it file_change authority.
function metadata(x){
 const e=x.native_event||{},result=e.result;
 const cmd=e.input?.command??e.input?.cmd;
 const output=result?.output?.output??result?.output?.stdout??
   (typeof result?.output==='string'?result.output:result?.stdout);
 const exit=result?.exitCode??result?.exit_code??result?.code??
   result?.output?.exit??result?.metadata?.exit;
 return {
  native_session_present:sid(first(e,['sessionID','sessionId'])),
  native_time_present:Boolean(e.timestamp||e.time),
  prompt_text_present:hasString(e.prompt?.text),
  native_prompt_id_present:sid(first(e,['messageID','messageId','promptID','promptId'])||
    first(e.prompt,['messageID','messageId','id'])),
  native_call_id_present:sid(first(e,['callID','callId','id'])),
  tool_status_supported:['completed','error','failed'].includes(e.status),
  tool_name_present:hasString(e.tool),
  tool_name_is_file_operation:FILE_TOOLS.has(e.tool?.toLowerCase?.()),
  tool_name_is_read_only_file:e.tool?.toLowerCase?.()==='read',
  command_present:hasString(cmd),
  command_read_only_noise:hasString(cmd)&&READ_ONLY_NOISE.test(cmd),
  command_in_interest_set:hasString(cmd)&&TOOL_INTEREST.test(cmd),
  result_exit_present:exit!==undefined&&exit!==null,
  result_text_present:hasString(output),
  assistant_completed:e.status==='completed',
  assistant_role:e.role==='assistant',
  assistant_message_id_present:sid(first(e,['messageID','messageId','id'])),
  assistant_text_present:hasString(e.text)
 };
}
function reason(x,meta){
 const e=x.native_event;
 if(x.capture_admitted===false)return ['CAPTURE_NOT_ADMITTED','explicit_precondition'];
 if(x.scope&&!['group','project','workspace'].every(k=>x.scope[k]===x._targetScope[k]))
   return ['ORIGINAL_SOURCE_SCOPE_EXCLUDED','explicit_precondition'];
 if(!meta.native_session_present)return ['MISSING_NATIVE_SESSION_ID','explicit_precondition'];
 if(!meta.native_time_present)return ['MISSING_NATIVE_TIME','shape_indicator'];
 if(x.source_type==='prompt'){
  if(!meta.prompt_text_present)return ['MISSING_PROMPT_TEXT','explicit_precondition'];
  const excerpt=cleanExcerpt(e.prompt.text);
  if(!excerpt)return ['PROMPT_TEXT_SAFETY_OR_FORMAT_VETO','shape_indicator'];
  if(excerpt.length<24)return ['PROMPT_BELOW_LENGTH_FLOOR','explicit_precondition'];
  return ['OTHER_PROMPT_ADAPTER_GATE','unresolved'];
 }
 if(x.source_type==='tool'){
  if(!meta.tool_status_supported)return ['UNSUPPORTED_TOOL_STATUS','explicit_precondition'];
  if(!meta.native_call_id_present)return ['MISSING_NATIVE_CALL_ID','explicit_precondition'];
  if(meta.tool_name_is_file_operation)
    return ['FILE_PATH_OR_OPERATION_SAFETY_FILTER','needs_private_path_inspection'];
  if(meta.tool_name_is_read_only_file)
    return ['READ_ONLY_FILE_ACCESS_NOT_DURABLE_FACT','explicit_precondition'];
  if(!meta.command_present)return ['MISSING_SHELL_COMMAND','explicit_precondition'];
  if(meta.command_read_only_noise)
    return ['INTENTIONAL_READ_ONLY_COMMAND_FILTER','explicit_precondition'];
  if(!meta.command_in_interest_set)
    return ['COMMAND_NOT_IN_INTEREST_SET','explicit_precondition'];
  if(!meta.result_exit_present&&!meta.result_text_present)
    return ['TOOL_RESULT_EXIT_AND_TEXT_MISSING','shape_indicator'];
  return ['OTHER_TOOL_ADAPTER_GATE','unresolved'];
 }
 if(x.source_type==='assistant'){
  if(!meta.assistant_completed||!meta.assistant_role)
    return ['ASSISTANT_NOT_COMPLETED','explicit_precondition'];
  if(!meta.assistant_message_id_present)
    return ['MISSING_ASSISTANT_MESSAGE_ID','explicit_precondition'];
  if(!meta.assistant_text_present)return ['MISSING_ASSISTANT_TEXT','explicit_precondition'];
  return ['OTHER_ASSISTANT_ADAPTER_GATE','unresolved'];
 }
 return ['UNRECOGNIZED_SOURCE_TYPE','unresolved'];
}
export function diagnose(corpus,score,rawBytes){
 const report=score?.report;
 if(!report||score?.authority?.frozen_corpus_sha256!==sha(rawBytes)||
    report.case_count!==corpus.cases?.length||
    report.label_status!=='operator_adjudicated'||
    !Array.isArray(report.rows)||report.rows.length!==corpus.cases.length)
   fail('RATIFIED_REPORT_AND_CORPUS_IDENTITY_REQUIRED');
 const misses=[],falsePositives=[],byGate={},category={};
 for(let i=0;i<corpus.cases.length;i++){
  const c=corpus.cases[i],gold=report.rows[i];
  if(gold.id!==c.id||gold.category!==c.category||
     !['prompt','tool','assistant'].includes(c.source_type))fail('CASE_ROW_IDENTITY:'+i);
  const current=replay(c,corpus.scope);
  if(Boolean(current.baseline)!==gold.baseline_selected||
     Boolean(current.candidate)!==gold.candidate_selected)
    fail('REPLAY_MISMATCH:'+c.id);
  if(typeof gold.truth!=='boolean')fail('MISSING_ADJUDICATED_LABEL:'+c.id);
  if(gold.truth&&!current.candidate){
   const meta=metadata(c),[gate,certainty]=reason({...c,_targetScope:corpus.scope},meta);
   const row={case_id:c.id,category:c.category,source_type:c.source_type,
     reason_code:gate,certainty,field_presence:meta,raw_payload_in_output:false};
   misses.push(row);
   byGate[gate]=(byGate[gate]||0)+1;
   category[c.category]=(category[c.category]||0)+1;
  }
  if(!gold.truth&&current.candidate)
   falsePositives.push({case_id:c.id,category:c.category,source_type:c.source_type});
 }
 const positive=report.rows.filter(r=>r.truth).length;
 const captured=report.rows.filter(r=>r.truth&&r.candidate_selected).length;
 if(positive-captured!==misses.length)fail('MISSES_DO_NOT_BALANCE');
 return {schema_version:1,kind:'issue81-frozen-capture-miss-diagnosis',
  source_split:corpus.split,corpus_sha256:sha(rawBytes),
  ratified_report_verified:true,positive,captured,missed:misses.length,
  recall:positive?captured/positive:null,misses_by_gate:byGate,
  misses_by_category:category,misses,false_positives:falsePositives,
  no_source_text_exported:true,original_corpus_mutated:false,
  interpretation:'Reason codes identify known preconditions; shape indicators and unresolved gates require source-private inspection. No result is a captured/verified Graphiti fact.'};
}
const flag=(args,k)=>{const n=args.indexOf('--'+k);return n<0?null:args[n+1]||null;};
async function readAbsolute(args,k){
 const p=flag(args,k);
 if(!p||!path.isAbsolute(p))fail('ABSOLUTE_PATH_REQUIRED:'+k);
 return readFile(p,'utf8');
}
export async function main(args=process.argv.slice(2)){
 if(args[0]!=='diagnose')fail('DIAGNOSE_COMMAND_REQUIRED');
 const raw=await readAbsolute(args,'corpus'),
  expected=flag(args,'expected-corpus-sha256');
 if(!/^[a-f0-9]{64}$/.test(expected||'')||sha(raw)!==expected)
  fail('FROZEN_SHA_MISMATCH');
 const score=JSON.parse(await readAbsolute(args,'score'));
 const out=flag(args,'out');
 if(!out||!path.isAbsolute(out))fail('ABSOLUTE_OUTPUT_REQUIRED');
 const result=diagnose(JSON.parse(raw),score,raw);
 await writeFile(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({status:'DIAGNOSTIC_ONLY',output:out,
  missed:result.missed,by_gate:result.misses_by_gate,
  no_mutations:true}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
 await main();
