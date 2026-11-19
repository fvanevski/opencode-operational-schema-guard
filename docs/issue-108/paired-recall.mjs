/** Issue #108: read-only, paired direct Memory.search comparator.
 * Private freeze contains source text; report deliberately does not.
 * This is NOT native context-hook, model-bound, remote-authority, or answer-quality proof.
 */
import {createHash} from 'node:crypto';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GraphitiMcp,Journal,Memory,formatContext,safeText} from '../issue-75/v2-candidate/memory-core.mjs';
import {curatedRecallRetriever} from '../issue-78/v2-curator/curated-recall-candidates.mjs';
import {sourcedEpisodeResolver} from '../issue-78/v2-curator/sourced-recall.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const key=(source,fact)=>hash(source+'\u0000'+fact);
const idPattern=/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/;
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const pct=(nums,p)=>nums.length?([...nums].sort((a,b)=>a-b)[Math.ceil(nums.length*p)-1]):null;
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const OPTIONAL_SETTLE_MS=1500;

/** Preserve Journal.pages read semantics without its directory-creating init(). */
export function readOnlyJournal(directory,group,{onPage=()=>{}}={}) {
  const original=new Journal(directory,group);
  return {pages:async function*({pageSize=128}={}) {
    assert(Number.isInteger(pageSize)&&pageSize>=1&&pageSize<=500,
      'Journal pageSize must be 1..500');
    // ENOENT is an explicit diagnostic failure, never permission to initialize.
    const names=(await readdir(original.dir)).filter(n=>/^[0-9a-f-]{36}\.json$/.test(n)).sort();
    for(let offset=0;offset<names.length;offset+=pageSize) {
      const rows=[];
      for(const name of names.slice(offset,offset+pageSize)) {
        const value=await original.get(name.slice(0,-5));
        if(value)rows.push(value);
      }
      onPage(rows);
      yield rows;
    }
  }};
}

/** Observe completion of optional work, including rejection after Memory.search returns. */
export function trackOptionalWork(trace,work) {
  const task=Promise.resolve(work);
  trace.pendingOptional++;
  trace.optionalTasks.push(task.then(
    ()=>{trace.pendingOptional--;},
    ()=>{trace.pendingOptional--;}));
  return task;
}
async function awaitOptionalWork(trace,budgetMs) {
  if(!trace.optionalTasks.length)return true;
  let timer;
  try {
    return await Promise.race([
      Promise.all(trace.optionalTasks).then(()=>true),
      new Promise(resolve=>{timer=setTimeout(()=>resolve(false),budgetMs);})
    ]);
  } finally {clearTimeout(timer);}
}

export function validateFreeze(freeze){
  assert(object(freeze)&&freeze.schema==='ghdev-108-freeze-v1','bad freeze schema');
  assert(idPattern.test(freeze.group||'')&&typeof freeze.workspace==='string'&&
    path.isAbsolute(freeze.workspace)&&idPattern.test(freeze.project||''),'bad scope');
  assert(Array.isArray(freeze.cases)&&freeze.cases.length>=1&&freeze.cases.length<=24,'bad case count');
  assert(typeof freeze.source_adjudication==='string'&&freeze.source_adjudication.length>=12,
    'independent source adjudication required');
  const ids=new Set();
  for(const c of freeze.cases){
    assert(object(c)&&idPattern.test(c.id||'')&&!ids.has(c.id),'duplicate/invalid case');
    ids.add(c.id);
    assert(typeof c.query==='string'&&safeText(c.query,500)===c.query&&c.query.length>=10,
      'invalid or private query');
    assert(['source-exact','paraphrase','temporal','related-defect','ambiguous-source','off-topic','negative-control']
      .includes(c.cohort),'unknown cohort');
    assert(Array.isArray(c.expected)&&Array.isArray(c.forbidden),'missing adjudication');
    const factIDs=new Set(),seenKeys=new Set();
    for(const t of [...c.expected,...c.forbidden]){
      assert(object(t)&&idPattern.test(t.id||'')&&!factIDs.has(t.id),'bad truth label');
      factIDs.add(t.id);
      assert(typeof t.source==='string'&&t.source.startsWith('opencode:')&&
        typeof t.fact==='string'&&safeText(t.fact,480)===t.fact,
        'truth must be exact source-qualified original fact');
      assert(!seenKeys.has(key(t.source,t.fact)),'ambiguous same fact across labels');
      seenKeys.add(key(t.source,t.fact));
    }
  }
  return freeze;
}

function newTrace(){return {rpc:{},rpc_errors:{},rpc_chars:{},rpc_ms:{},curated_count:0,curated_errors:0,resolver_errors:0,
  curated_ms:0,legacy_pages:0,legacy_records:0,source_resolved:0,
  pendingOptional:0,optionalTasks:[],
  remote_list_count:null,remote_list_complete:null,native_fact_count:0,
  indexed_exact_keys:new Set(),indexed_uuid_by_key:new Map(),native_fact_hashes:new Set(),
  resolver_source_hashes:new Set(),remote_uuids:new Set(),curated_remote_keys:new Set()};}

function instrument(freeze,config,policy,trace){
  const client=new GraphitiMcp(config.endpoint);
  const graphiti={call:async(name,args,opts)=>{
    if(!['get_episodes','search_memory_facts'].includes(name))throw Error('read-only tool boundary');
    assert(Array.isArray(args?.group_ids)&&args.group_ids.length===1&&
      args.group_ids[0]===freeze.group,'wrong Graphiti query group');
    const started=performance.now();
    trace.rpc[name]=(trace.rpc[name]||0)+1;
    try{
      const v=await client.call(name,args,opts);
      trace.rpc_chars[name]=(trace.rpc_chars[name]||0)+JSON.stringify(v??null).length;
      if(name==='search_memory_facts'){
        const rows=Array.isArray(v?.facts)?v.facts:[];
        trace.native_fact_count+=rows.length;
        for(const row of rows)if(typeof row?.fact==='string')trace.native_fact_hashes.add(hash(row.fact));
      }
      if(name==='get_episodes'){
        const rows=Array.isArray(v?.episodes)?v.episodes:null;
        trace.remote_list_count=rows?.length??null;
        trace.remote_list_complete=Boolean(rows&&rows.length<1000&&
          rows.every(x=>x?.group_id===freeze.group&&uuid.test(x.uuid||'')));
        if(trace.remote_list_complete)for(const x of rows)trace.remote_uuids.add(x.uuid);
      }
      return v;
    }catch(e){trace.rpc_errors[name]=(trace.rpc_errors[name]||0)+1;throw e;
    }finally{trace.rpc_ms[name]=(trace.rpc_ms[name]||0)+performance.now()-started;}
  }};
  const journal=readOnlyJournal(config.journalDir,freeze.group,{
    onPage:page=>{trace.legacy_pages++;trace.legacy_records+=page.length;}
  });
  const baseRetriever=curatedRecallRetriever(config.reviewRoot,freeze.group,
    freeze.workspace,freeze.project);
  const curatedCandidateRetriever=(query,selectedPolicy)=>{
    const task=(async()=>{
      const started=performance.now();
      try{
        const rows=await baseRetriever(query,selectedPolicy);
        trace.curated_count+=rows.length;
        for(const row of rows)if(typeof row?.fact==='string'&&typeof row?.source==='string')
          {const k=key(row.source,row.fact);trace.indexed_exact_keys.add(k);
            if(typeof row.remoteEpisodeUuid==='string')trace.indexed_uuid_by_key.set(k,row.remoteEpisodeUuid);}
        return rows;
      }catch(e){trace.curated_errors++;throw e;
      }finally{trace.curated_ms+=performance.now()-started;}
    })();
    return trackOptionalWork(trace,task);
  };
  const extraSourceResolver=async(ids)=>{
    try {
      const rows=await sourcedEpisodeResolver(config.reviewRoot,freeze.group,
        freeze.workspace,freeze.project,ids);
      trace.source_resolved+=rows.length;
      for(const row of rows)if(row?.sourceRef)trace.resolver_source_hashes.add(hash(row.sourceRef));
      return rows;
    } catch(e){trace.resolver_errors++;throw e;}
  };
  return new Memory({journal,graphiti,group:freeze.group,curatedCandidateRetriever,
    extraSourceResolver,recallPolicy:policy,ranker:null});
}

function classify(c,items,trace){
  const truth=new Map([...c.expected.map(x=>[key(x.source,x.fact),{id:x.id,kind:'expected'}]),
    ...c.forbidden.map(x=>[key(x.source,x.fact),{id:x.id,kind:'forbidden'}])]);
  const found=new Set(),forbidden=[],unknown=[];
  for(const item of items){
    const k=key(item.source,item.fact),t=truth.get(k);
    if(t){if(t.kind==='forbidden')forbidden.push(t.id);else found.add(t.id);}
    else unknown.push(k.slice(0,16));
  }
  const stages={};
  for(const item of c.expected){
    const k=key(item.source,item.fact);
    stages[item.id]={
      native_fact_text_seen:trace.native_fact_hashes.has(hash(item.fact)),
      curated_source_candidate_seen:trace.indexed_exact_keys.has(k),
      curated_fresh_remote_membership_seen:trace.remote_list_complete===true&&
        trace.remote_uuids.has(trace.indexed_uuid_by_key.get(k)),
      native_source_resolver_seen:trace.resolver_source_hashes.has(hash(item.source)),
      final_selected:found.has(item.id)
    };
  }
  return {selected:[...found].sort(),missed:c.expected.filter(x=>!found.has(x.id)).map(x=>x.id),
    forbidden_selected:forbidden.sort(),unknown_selected_digests:unknown,
    stages};
}

/** Inject a mock makeMemory ONLY for deterministic tests. Real CLI uses actual classes. */
export async function runPairedRecall(freeze,config,{rounds=2,makeMemory=instrument,
    optionalSettleMs=OPTIONAL_SETTLE_MS}={}){
  validateFreeze(freeze);
  assert(Number.isInteger(rounds)&&rounds>=1&&rounds<=3,'bad rounds');
  assert(Number.isInteger(optionalSettleMs)&&optionalSettleMs>=1&&
    optionalSettleMs<=5000,'bad optional settle budget');
  const observations=[];
  for(let round=0;round<rounds;round++)for(let i=0;i<freeze.cases.length;i++){
    const c=freeze.cases[i],order=(round+i)%2?['semantic','strict']:['strict','semantic'];
    for(const policy of order){
      const trace=newTrace();const mem=makeMemory(freeze,config,policy,trace);
      const start=performance.now();let selected=[],error=null;
      try{selected=await mem.search(c.query,{limit:5,maxChars:1400});}
      catch(e){error=e?.name==='AbortError'?'AbortError':'SearchError';}
      const elapsed=Math.round((performance.now()-start)*100)/100;
      assert(Array.isArray(selected)&&selected.length<=5,'selection bound violated');
      // Snapshot stage reach AT the search-return boundary. Work that completes
      // afterward may contribute failure counters, never retroactive recall.
      const facts=classify(c,selected,trace);
      const optionalStarted=performance.now();
      const optionalComplete=await awaitOptionalWork(trace,optionalSettleMs);
      const optionalWaitMs=Math.round((performance.now()-optionalStarted)*100)/100;
      observations.push({case_id:c.id,cohort:c.cohort,round:round+1,
        order:order.join('/'),policy,search_ms:elapsed,selected_count:selected.length,
        context_chars:formatContext(selected).length,error,
        ...facts,
        trace:{rpc:trace.rpc,rpc_errors:trace.rpc_errors,
          rpc_decoded_json_chars:trace.rpc_chars,
          rpc_ms:trace.rpc_ms,curated_candidate_count:trace.curated_count,
          curated_ms:Math.round(trace.curated_ms*100)/100,
          curated_errors:trace.curated_errors,resolver_errors:trace.resolver_errors,
          optional_work_complete:optionalComplete&&trace.pendingOptional===0,
          optional_work_pending:trace.pendingOptional,
          optional_settle_wait_ms:optionalWaitMs,
          legacy_pages:trace.legacy_pages,legacy_records:trace.legacy_records,
          source_resolved_count:trace.source_resolved,
          native_fact_count:trace.native_fact_count,
          remote_list_count:trace.remote_list_count,
          remote_list_complete:trace.remote_list_complete}});
    }
  }
  return {schema:'ghdev-108-recall-report-v1',
    evidence_class:'direct Memory.search shadow only; NOT native context-hook or provider-bound proof',
    source_adjudication_digest:hash(freeze.source_adjudication),
    source_freeze_digest:config.freezeDigest||null,
    source_revision:config.sourceRevision||null,
    scope_digest:hash([freeze.group,freeze.project,freeze.workspace].join('\u0000')),
    rounds,case_count:freeze.cases.length,observations,
    aggregate:summarize(observations)};
}

export function summarize(rows){
  const summary={};
  for(const policy of ['strict','semantic']){
    const subset=rows.filter(x=>x.policy===policy);
    const times=subset.map(x=>x.search_ms),selected=new Set(),found=new Set(),missed=new Set();
    for(const row of subset){
      for(const id of row.selected)found.add(`${row.case_id}:${id}`);
      for(const id of row.missed)missed.add(`${row.case_id}:${id}`);
      for(const id of row.selected)selected.add(`${row.case_id}:${id}`);
    }
    const incomplete=subset.filter(x=>x.trace.optional_work_complete===false).length;
    const observedOptionalErrors=subset.reduce((n,x)=>n+
      Object.values(x.trace.rpc_errors||{}).reduce((a,b)=>a+b,0)+
      (x.trace.curated_errors||0)+(x.trace.resolver_errors||0),0);
    summary[policy]={n:subset.length,search_p50_ms:pct(times,.5),
      search_p95_ms:pct(times,.95),search_max_ms:times.length?Math.max(...times):null,
      cases_with_expected_hit:new Set(subset.filter(x=>x.selected.length).map(x=>x.case_id)).size,
      matched_expected_case_fact_pairs:found.size,
      missed_expected_case_fact_pairs_after_selection:missed.size,
      forbidden_selected:subset.reduce((n,x)=>n+x.forbidden_selected.length,0),
      unadjudicated_selection:subset.reduce((n,x)=>n+x.unknown_selected_digests.length,0),
      search_errors:subset.filter(x=>x.error).length,
      swallowed_optional_errors:incomplete?null:observedOptionalErrors,
      observed_swallowed_optional_errors_lower_bound:observedOptionalErrors,
      optional_work_incomplete_observations:incomplete,
      decoded_rpc_json_chars:subset.reduce((n,x)=>n+Object.values(x.trace.rpc_decoded_json_chars).reduce((a,b)=>a+b,0),0),
      rpc_calls:subset.reduce((n,x)=>n+Object.values(x.trace.rpc).reduce((a,b)=>a+b,0),0)};
  }
  summary.meaning='search timings exclude post-search optional settlement; incomplete optional work has null definitive error count; decoded JSON chars, not network bytes; missing facts may have been omitted at an earlier source stage';
  return summary;
}

async function main(){
  const argv=process.argv.slice(2),opt=x=>{let i=argv.indexOf('--'+x);return i<0?null:argv[i+1]};
  const freezeFile=opt('freeze'),out=opt('out'),config={journalDir:opt('journal-dir'),
    reviewRoot:opt('review-root'),endpoint:opt('graphiti-endpoint'),sourceRevision:opt('source-revision')};
  const rounds=Number(opt('rounds')||2);
  if(![freezeFile,out,config.journalDir,config.reviewRoot].every(x=>x&&path.isAbsolute(x))||
      !/^https?:\/\/127\.0\.0\.1:\d+\/mcp\/?$/.test(config.endpoint||'')||
      !/^[a-f0-9]{40}$/.test(config.sourceRevision||'')){
    console.error('Usage: node paired-recall.mjs --freeze ABS --out ABS --journal-dir ABS '+
      '--review-root ABS --graphiti-endpoint http://127.0.0.1:8766/mcp '+
      '--source-revision 40HEX [--rounds 1..3]');process.exitCode=2;return;
  }
  const raw=await readFile(freezeFile),freeze=JSON.parse(raw.toString('utf8'));
  config.freezeDigest=hash(raw);
  const report=await runPairedRecall(freeze,config,{rounds});
  await writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({report:out,freeze_sha256:config.freezeDigest,
    observations:report.observations.length,aggregate:report.aggregate}));
}
if(process.argv[1]&&import.meta.url===new URL('file://'+path.resolve(process.argv[1])).href)
  main().catch(()=>{console.error('Read-only paired comparator FAILED; inspect private host logs');process.exitCode=1;});
