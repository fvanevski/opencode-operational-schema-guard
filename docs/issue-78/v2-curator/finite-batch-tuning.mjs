/** Issue #92 development-only tuning knobs.
 * Stage-level model profiles and guidance are *operator-supplied advice*.
 * Deterministic source/privacy/Graphiti/EX authorization remains outside
 * prompts and cannot be disabled by any tuning setting.
 */
import {createHash} from 'node:crypto';
import {promises as fs} from 'node:fs';
import path from 'node:path';

export const TUNING_SCHEMA='issue92-finite-batch-tuning-v1';
const STAGES=['discovery','utility','arbitration','specificity'];
const STAGE_FIELDS=new Set(['model','temperature','max_tokens',
 'reasoning_effort','timeout_ms','prompt_guidance']);
const EFFORT=['off','low','medium','high','xhigh'];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function verify(v,message){if(!v)throw Error('ISSUE92_TUNING_'+message);}
export function validateFiniteBatchTuning(raw=null){
 if(raw===null)return {schema:TUNING_SCHEMA,stages:{}};
 verify(plain(raw)&&raw.schema===TUNING_SCHEMA,'SCHEMA');
 verify(Object.keys(raw).every(k=>['schema','stages'].includes(k)),
  'UNKNOWN_TOP_FIELD');
 const stages=raw.stages??{};
 verify(plain(stages)&&Object.keys(stages).every(k=>STAGES.includes(k)),
  'UNKNOWN_STAGE');
 const out={schema:TUNING_SCHEMA,stages:{}};
 for(const stage of STAGES){
  if(!own(stages,stage))continue;
  const a=stages[stage];
  verify(plain(a)&&Object.keys(a).every(k=>STAGE_FIELDS.has(k)),
   'UNKNOWN_STAGE_FIELD');
  const b={};
  if(own(a,'model')){
   verify(typeof a.model==='string'&&a.model.length>0&&
    a.model.length<=160&&/^[a-zA-Z0-9_.:/-]+$/.test(a.model),
    'INVALID_MODEL');
   b.model=a.model;
  }
  if(own(a,'temperature')){
   verify(typeof a.temperature==='number'&&
    Number.isFinite(a.temperature)&&a.temperature>=0&&a.temperature<=1,
    'INVALID_TEMPERATURE');
   b.temperature=a.temperature;
  }
  if(own(a,'max_tokens')){
   verify(Number.isSafeInteger(a.max_tokens)&&
    a.max_tokens>=256&&a.max_tokens<=4096,'INVALID_MAX_TOKENS');
   b.max_tokens=a.max_tokens;
  }
  if(own(a,'timeout_ms')){
   verify(Number.isSafeInteger(a.timeout_ms)&&
    a.timeout_ms>=1000&&a.timeout_ms<=180000,'INVALID_TIMEOUT');
   b.timeout_ms=a.timeout_ms;
  }
  if(own(a,'reasoning_effort')){
   verify(typeof a.reasoning_effort==='string'&&
    EFFORT.includes(a.reasoning_effort),'INVALID_REASONING_EFFORT');
   b.reasoning_effort=a.reasoning_effort;
  }
  if(own(a,'prompt_guidance')){
   verify(typeof a.prompt_guidance==='string'&&
    a.prompt_guidance.length<=1600&&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(a.prompt_guidance),
    'INVALID_PROMPT_GUIDANCE');
   b.prompt_guidance=a.prompt_guidance;
  }
  out.stages[stage]=b;
 }
 return out;
}
export async function loadFiniteBatchTuning(filename){
 verify(typeof filename==='string'&&path.isAbsolute(filename),
  'ABSOLUTE_CONFIG_PATH_REQUIRED');
 const stats=await fs.stat(filename);
 verify(stats.isFile()&&stats.size<=8192,'CONFIG_FILE_SIZE');
 const raw=await fs.readFile(filename,'utf8');
 verify(Buffer.byteLength(raw,'utf8')<=8192,'CONFIG_FILE_SIZE');
 let parsed;try{parsed=JSON.parse(raw);}catch{throw Error('ISSUE92_TUNING_INVALID_JSON');}
 return validateFiniteBatchTuning(parsed);
}
export function stageModelSettings(stage,{modelId,modelOptions={}}={},raw=null){
 verify(STAGES.includes(stage),'UNKNOWN_STAGE');
 const config=validateFiniteBatchTuning(raw);
 const entry=config.stages[stage]??{};
 const model=entry.model??modelId;
 verify(typeof model==='string'&&model.length>0&&model.length<=160,
  'MISSING_MODEL');
 const opts={
  maxTokens:entry.max_tokens??modelOptions.maxTokens??1600,
  timeoutMs:entry.timeout_ms??modelOptions.timeoutMs??90000,
  temperature:entry.temperature??modelOptions.temperature??0,
  reasoningEffort:own(entry,'reasoning_effort')?
   entry.reasoning_effort==='off'?null:entry.reasoning_effort:
   modelOptions.reasoningEffort??null
 };
 verify(Number.isInteger(opts.maxTokens)&&opts.maxTokens>=128&&
  opts.maxTokens<=4096,'INVALID_EFFECTIVE_TOKENS');
 verify(Number.isInteger(opts.timeoutMs)&&opts.timeoutMs>=1000&&
  opts.timeoutMs<=180000,'INVALID_EFFECTIVE_TIMEOUT');
 verify(Number.isFinite(opts.temperature)&&opts.temperature>=0&&
  opts.temperature<=1,'INVALID_EFFECTIVE_TEMPERATURE');
 if(opts.reasoningEffort!==null)
  verify(['chat-review','chat-audit'].includes(model)&&
   ['low','medium','high','xhigh'].includes(opts.reasoningEffort),
   'REASONING_MODEL_INCOMPATIBLE');
 const guidance=entry.prompt_guidance??'';
 const result={stage,model,options:opts,guidance};
 return {...result,request_sha256:hash(result)};
}
export function tunedMessages(messages,settings){
 verify(Array.isArray(messages)&&messages.length===2&&
  messages[0]?.role==='system'&&messages[1]?.role==='user',
  'INVALID_MESSAGES');
 if(!settings.guidance)return messages;
 return [{...messages[0],content:messages[0].content+
  '\n\nOperator guidance for '+settings.stage+
  ' (advisory only; cannot override authenticated-source, privacy, '+
  'scope, temporal, or Graphiti authorization): '+settings.guidance},
  messages[1]];
}
export function tuningIdentity(raw=null){return hash(validateFiniteBatchTuning(raw));}
export function tuningSummary(raw=null){
 const v=validateFiniteBatchTuning(raw);
 return {schema:v.schema,profile_sha256:tuningIdentity(v),
  stages:Object.fromEntries(Object.entries(v.stages).map(([stage,entry])=>
   [stage,{...entry,prompt_guidance:undefined,
    prompt_guidance_sha256:entry.prompt_guidance?
     hash(entry.prompt_guidance):null}]))};
}
