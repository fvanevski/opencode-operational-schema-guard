/** #107 B1 opt-in pure paired qualification, no datastore/network writes.
 * The caller supplies an already EX-admitted local model callback. Raw source
 * text, proposals and model payloads are NEVER included in the returned report.
 */
import {createHash} from 'node:crypto';
import {cleanExcerpt} from '../issue-78/v2-candidate/events.mjs';
import {originalToolOutputSpan} from '../issue-78/v2-curator/core.mjs';
import {autonomousPrompt,completeSourceTokenSpan,
  validateAutonomousDecision} from '../issue-100/autonomous-policy.mjs';
import {compactAutonomousPrompt,validateCompactDecision} from './protocol.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const SAFE_ID=/^[A-Za-z0-9_.-]{1,80}$/;
const EXPLORATORY=new Set(['synthetic','historical_exposed','fresh_private']);
const GRADES=new Set(['useful','excluded']);
const variants=['baseline','compact'];
function quotedSource(source,quote) {
  if(typeof quote!=='string'||quote.length<25||quote.length>450||
    quote.trim()!==quote||cleanExcerpt(quote,450)!==quote)return false;
  if(source?.kind==='tool_outcome'){
    for(const f of source.source_fragments||[]){
      const part=source.excerpt.slice(f.start,f.end),i=part.indexOf(quote);
      if(i<0)continue;
      const start=f.start+i,end=start+quote.length;
      if(originalToolOutputSpan(source,start,end)&&
        completeSourceTokenSpan(source.excerpt,start,end))return true;
    }
    return false;
  }
  const i=source?.excerpt?.indexOf(quote)??-1;
  return i>=0&&completeSourceTokenSpan(source.excerpt,i,i+quote.length);
}
/** Validate all human grades BEFORE any model attempt. Grades concern future
 * usefulness, not independent truth. No claim that old cases are a holdout.
 */
export function freezeQualificationCases(cases){
  if(!Array.isArray(cases)||cases.length<1||cases.length>12)
    throw Error('B1_COHORT_BOUND');
  const snapshots=JSON.parse(JSON.stringify(cases));
  const ids=new Set();
  for(const c of snapshots){
    if(!SAFE_ID.test(c?.id||'')||ids.has(c.id)||
      !EXPLORATORY.has(c.cohort_origin)||!c.cluster||
      !Array.isArray(c.cluster.events)||c.cluster.events.length<1||
      c.cluster.events.length>8||!Array.isArray(c.opportunities)||
      c.opportunities.length>12)throw Error('B1_INVALID_FROZEN_CASE');
    ids.add(c.id);
    const cluster=c.cluster;
    if(!SAFE_ID.test(cluster.group||'')||
      typeof cluster.project!=='string'||typeof cluster.workspace!=='string'||
      !Array.isArray(cluster.source_event_ids)||
      cluster.source_event_ids.length!==cluster.events.length)
      throw Error('B1_INVALID_CLUSTER');
    const sources=new Map();
    for(const e of cluster.events){
      if(!e||e.group!==cluster.group||e.project!==cluster.project||
        e.workspace!==cluster.workspace||e.session_id!==cluster.session_id||
        !Array.isArray(e.source_refs)||e.source_refs.length!==1||
        typeof e.source_refs[0]!=='string'||sources.has(e.source_refs[0])||
        typeof e.excerpt!=='string'||cleanExcerpt(e.excerpt)!==e.excerpt||
        typeof e.source_strength!=='string')
        throw Error('B1_UNAUTHENTICATED_COHORT_SOURCE');
      sources.set(e.source_refs[0],e);
    }
    const grades=new Set();
    for(const o of c.opportunities){
      const source=sources.get(o?.source_ref);
      if(!source||!GRADES.has(o.grade)||!quotedSource(source,o.quote)||
        (o.grade==='useful'&&source.source_strength!=='native-id'))
        throw Error('B1_UNSUPPORTED_REFERENCE_GRADE');
      const id=o.source_ref+'\n'+o.quote;
      if(grades.has(id))throw Error('B1_DUPLICATE_REFERENCE_GRADE');
      grades.add(id);
    }
  }
  const json=JSON.stringify(snapshots);
  if(json.length>240000)throw Error('B1_FROZEN_COHORT_TOO_LARGE');
  return {cases:snapshots,freeze_sha256:sha(json)};
}
function summarizeResponse(raw,variant,c) {
  const checked=variant==='baseline'?
    validateAutonomousDecision(raw,c.cluster):
    validateCompactDecision(raw,c.cluster);
  const facts=checked.ok&&checked.decision==='EMIT'?checked.facts:[];
  const retained=new Set(facts.map(f=>f.source_refs[0]+'\n'+f.assertion));
  const useful=c.opportunities.filter(x=>x.grade==='useful');
  const excluded=c.opportunities.filter(x=>x.grade==='excluded');
  const usefulFound=useful.filter(x=>retained.has(x.source_ref+'\n'+x.quote)).length;
  return {decision:checked.decision,valid:checked.ok,retryable:checked.retryable===true,
    reason:checked.ok?null:checked.reason,
    retained:facts.length,
    established:(checked.fact_retentions||[]).filter(x=>x==='established_retention').length,
    provisional:(checked.fact_retentions||[]).filter(x=>x==='provisional_retention').length,
    useful_reference_matched:usefulFound,
    useful_reference_total:useful.length,
    excluded_reference_retained:excluded.filter(x=>
      retained.has(x.source_ref+'\n'+x.quote)).length,
    unadjudicated_retained:facts.length-usefulFound-
      excluded.filter(x=>retained.has(x.source_ref+'\n'+x.quote)).length,
    missed_useful_reference:useful.length-usefulFound,
    skipped_despite_useful_reference:checked.ok&&checked.decision==='SKIP'&&useful.length>0,
    blocked_siblings:(checked.blocked_candidates||[]).length,
    blocked_reasons:Object.fromEntries([...new Set((checked.blocked_candidates||[])
      .map(x=>x.reason))].map(reason=>[reason,
      checked.blocked_candidates.filter(x=>x.reason===reason).length])),
    skipped_siblings:checked.skipped_candidates||0};
}
const emptyTotals=()=>({attempted_calls:0,completed_calls:0,model_errors:0,
  prompt_tokens:0,completion_tokens:0,usage_reported_calls:0,
  model_ms:0,valid_decisions:0,technical_retries:0,
  accepted_facts:0,established:0,provisional:0,
  useful_reference_matched:0,useful_reference_total:0,
  missed_useful_reference:0,excluded_reference_retained:0,
  unadjudicated_retained:0,skipped_despite_useful_reference:0,
  blocked_siblings:0,skipped_siblings:0});
function fold(t,r,referenceTotal){
  t.attempted_calls++;
  // A failed/absent model answer must still count against the frozen denominator.
  t.useful_reference_total+=referenceTotal;
  if(r.model_error){t.model_errors++;t.missed_useful_reference+=referenceTotal;return;}
  t.completed_calls++;
  if(r.usage&&Number.isSafeInteger(r.usage.prompt_tokens)&&
    r.usage.prompt_tokens>=0&&Number.isSafeInteger(r.usage.completion_tokens)&&
    r.usage.completion_tokens>=0){
    t.usage_reported_calls++;t.prompt_tokens+=r.usage.prompt_tokens;
    t.completion_tokens+=r.usage.completion_tokens;
  }
  if(Number.isFinite(r.duration_ms)&&r.duration_ms>=0)t.model_ms+=r.duration_ms;
  const s=r.score;
  if(s.valid)t.valid_decisions++;
  if(s.retryable)t.technical_retries++;
  t.accepted_facts+=s.retained;t.established+=s.established;
  t.provisional+=s.provisional;
  t.useful_reference_matched+=s.useful_reference_matched;
  t.missed_useful_reference+=s.missed_useful_reference;
  t.excluded_reference_retained+=s.excluded_reference_retained;
  t.unadjudicated_retained+=s.unadjudicated_retained;
  t.skipped_despite_useful_reference+=Number(s.skipped_despite_useful_reference);
  t.blocked_siblings+=s.blocked_siblings;t.skipped_siblings+=s.skipped_siblings;
}
function rates(t){
  return {...t,model_calls_per_reference_matched:
    t.useful_reference_matched?t.attempted_calls/t.useful_reference_matched:null,
    tokens_per_reference_matched:
    t.useful_reference_matched&&t.usage_reported_calls===t.completed_calls&&
    t.completed_calls===t.attempted_calls?
      (t.prompt_tokens+t.completion_tokens)/t.useful_reference_matched:null};
}
/** Callbacks must be invoked only by the existing genuine EX lease owner.
 * A diagnostic marker alone is NOT a lease. There is no remote Graphiti call,
 * queue transition, ReviewStore mutation, persistence or automatic retry here.
 */
export async function runPairedQualification(cases,{curate,modelArgs={}}={}){
  if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted')
    throw Error('EX_POST_EXIT_ADMISSION_REQUIRED');
  if(typeof curate!=='function'||!modelArgs||typeof modelArgs!=='object'||
    Array.isArray(modelArgs)||modelArgs.promptMessages!==undefined)
    throw Error('B1_MODEL_CALLBACK_INVALID');
  const frozen=freezeQualificationCases(cases);
  const totals={baseline:emptyTotals(),compact:emptyTotals()},items=[];
  for(let i=0;i<frozen.cases.length;i++){
    const c=frozen.cases[i],out={id:c.id,cohort_origin:c.cohort_origin};
    // Alternating order limits trivial warm-cache/order advantage.
    const order=i%2?['compact','baseline']:variants;
    const payload={
      baseline:autonomousPrompt(c.cluster),
      compact:compactAutonomousPrompt(c.cluster)};
    if(payload.baseline[1].content!==payload.compact[1].content)
      throw Error('B1_SOURCE_PAYLOAD_MISMATCH');
    for(const v of order){
      let reply,model_error=false;
      try{
        reply=await curate(c.cluster,{...modelArgs,promptMessages:payload[v]});
        if(typeof reply?.content!=='string'||reply.content.length>12000)
          throw Error('B1_INVALID_MODEL_REPLY');
      }catch{model_error=true;}
      const score=model_error?null:summarizeResponse(reply.content,v,c);
      const observation={model_error,
        usage:reply?.usage??null,duration_ms:reply?.duration_ms??null,score};
      fold(totals[v],observation,c.opportunities.filter(x=>x.grade==='useful').length);
      out[v]=model_error?{model_error:true}:{
        ...score,model_error:false,
        prompt_tokens:Number.isSafeInteger(reply?.usage?.prompt_tokens)?
          reply.usage.prompt_tokens:null,
        completion_tokens:Number.isSafeInteger(reply?.usage?.completion_tokens)?
          reply.usage.completion_tokens:null,
        duration_ms:Number.isFinite(reply?.duration_ms)?reply.duration_ms:null};
    }
    items.push(out);
  }
  return {schema:'issue107-b1-paired-qualification-v1',
    freeze_sha256:frozen.freeze_sha256,
    cohort_count:frozen.cases.length,
    qualified_reference_count:frozen.cases.reduce((n,c)=>n+
      c.opportunities.filter(x=>x.grade==='useful').length,0),
    // Only normalized metrics and benign case IDs returned. Raw model content
    // and original source require separate host-private custody.
    cases:items,totals:Object.fromEntries(variants.map(v=>[v,rates(totals[v])]))};
}
