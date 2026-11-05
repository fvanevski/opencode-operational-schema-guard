#!/usr/bin/env node
/** Issue #81: admitted read-only model efficiency probe, never writes to Graphiti. */
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ReviewStore,validateModelDecision} from './core.mjs';
import {curateCluster} from './model.mjs';
import {isFixtureGroup} from '../fixture-groups.mjs';
const fail=x=>{throw Error('PROBE_'+x);};
const digest=x=>createHash('sha256').update(x).digest('hex');
const HEX=/^[a-f0-9]{64}$/;
export async function runProbe({root,group,ids,endpoint,model,apiKey='local',
  reasoningEffort=null,maxTokens=768,store=null,curate=curateCluster}={}){
  if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted')fail('EX_ADMISSION_REQUIRED');
  if(!(isFixtureGroup(group,'efficiency')||
       /^cur81_dev_[a-f0-9]{8}$/.test(group||''))||
     typeof root!=='string'||!path.isAbsolute(root))fail('DISPOSABLE_SCOPE_REQUIRED');
  if(!Array.isArray(ids)||ids.length<1||ids.length>5||
     new Set(ids).size!==ids.length||ids.some(id=>!HEX.test(id)))
    fail('EXPLICIT_BOUNDED_CASES_REQUIRED');
  // chat-fast is a non-thinking alias; no explicit reasoning parameter is sent.
  // A thinking variant needs an explicitly selected reasoning-capable alias.
  if((reasoningEffort!==null&&
     (!['chat-review','chat-audit'].includes(model)||
      !['low','medium','high','xhigh'].includes(reasoningEffort)))||
     !Number.isInteger(maxTokens)||maxTokens<256||maxTokens>1024)
    fail('BOUNDED_VARIANT_REQUIRED');
  store??=new ReviewStore(root,group);
  const observations=[],totals={attempts:0,completed:0,errors:0,
    prompt_tokens:0,completion_tokens:0,reasoning_tokens:0,
    reasoning_reported:0,model_ms:0,output_limit_hits:0};
  for(const id of ids){
    const record=await store.get(id);
    if(!record||record.origin!=='curated'||record.group!==group||
       !Array.isArray(record.events)||!record.events.length||
       record.source_event_ids?.length!==record.events.length)
      fail('MISSING_CURATED_SOURCE_RECORD:'+id);
    const baseline={decision:record.decision,state:record.state,
      fact_hashes:(record.facts||[]).map(f=>digest(f.assertion)).sort()};
    totals.attempts++;
    try{
      const response=await curate(record,{endpoint,model,apiKey,
        reasoningEffort,maxTokens});
      totals.completed++;
      totals.model_ms+=response.duration_ms||0;
      if(Number.isSafeInteger(response.usage?.prompt_tokens))
        totals.prompt_tokens+=response.usage.prompt_tokens;
      if(Number.isSafeInteger(response.usage?.completion_tokens))
        totals.completion_tokens+=response.usage.completion_tokens;
      if(Number.isSafeInteger(response.usage?.reasoning_tokens)){
        totals.reasoning_reported++;
        totals.reasoning_tokens+=response.usage.reasoning_tokens;
      }
      if(['length','max_tokens'].includes(response.finish_reason))
        totals.output_limit_hits++;
      const result=validateModelDecision(response.content,record);
      const factHashes=(result.facts||[]).map(f=>digest(f.assertion)).sort();
      observations.push({id,status:'completed',baseline,
        decision:result.decision,valid:result.ok,
        invalid_reason:result.ok?null:result.reason,
        fact_hashes:factHashes,exact_baseline_fact_match:
          JSON.stringify(factHashes)===JSON.stringify(baseline.fact_hashes),
        usage:response.usage,finish_reason:response.finish_reason,
        output_chars:response.output_chars,model_ms:response.duration_ms});
    }catch(e){
      totals.errors++;
      observations.push({id,status:'error',baseline,
        error_code:/^CURATOR_HTTP_[0-9]{3}$/.test(e?.message||'')?
          e.message:'PROBE_MODEL_REQUEST_UNVERIFIED'});
    }
  }
  return {schema_version:1,kind:'issue81-admitted-model-only-efficiency-probe',
    status:totals.errors?'PARTIAL_OR_UNSUPPORTED':'MODEL_PROBE_COMPLETE',
    group,variant:{reasoning_effort:reasoningEffort,max_tokens:maxTokens},
    totals,observations,graphiti_calls:0,source_changes:0,
    caveat:'Read-only new model calls; inspect actual proxy reasoning and validate decisions before changing defaults.'};
}
const arg=(a,k)=>{const i=a.indexOf('--'+k);return i<0?null:a[i+1]||null;};
export async function main(args=process.argv.slice(2),env=process.env){
  // The canonical Python EX gate wrapper invokes the drain command.
  if(args[0]!=='drain')fail('DRAIN_COMMAND_REQUIRED');
  const ids=String(env.GHDEV_CURATOR_PROBE_IDS||'').split(',').filter(Boolean);
  const report=await runProbe({
    root:arg(args,'state-dir'),group:arg(args,'group'),ids,
    endpoint:env.LOCAL_CURATOR_URL,model:env.LOCAL_CURATOR_MODEL,
    apiKey:env.LOCAL_CURATOR_API_KEY||'local',
    reasoningEffort:env.GHDEV_CURATOR_PROBE_EFFORT||null,
    maxTokens:Number(env.GHDEV_CURATOR_PROBE_MAX_TOKENS||768)});
  const output=JSON.stringify(report,null,2)+'\n';
  const dest=env.GHDEV_CURATOR_PROBE_OUTPUT;
  if(!dest||!path.isAbsolute(dest))fail('PRIVATE_OUTPUT_PATH_REQUIRED');
  await writeFile(dest,output,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({status:report.status,output:dest,
    attempts:report.totals.attempts,completed:report.totals.completed,
    graphiti_calls:0,no_remote_write:true}));
}
// The wrapper may retain EX on a non-3 child error. No Graphiti writes are
// possible here: report any probe failure explicitly and return exit 0 to
// release EX rather than fabricate a successful memory drain.
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{await main();}
  catch(e){
    console.error(JSON.stringify({status:'PROBE_BLOCKED',
      error_code:String(e?.message||'').startsWith('PROBE_')?
        String(e.message).slice(0,100):'PROBE_SETUP_OR_OUTPUT_ERROR',
      graphiti_calls:0,no_remote_write:true}));
  }
}
