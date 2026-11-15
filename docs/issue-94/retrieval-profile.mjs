#!/usr/bin/env node
/** Issue #94: read-only, metadata-only C1 local-index profiler and disposable scaling control.
 * This tool does NOT measure native callbacks, remote Graphiti authority, or model utility.
 * Those require separately authenticated host observations and must not be inferred here.
 */
import {createHash} from 'node:crypto';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {ReviewStore} from '../issue-78/v2-curator/core.mjs';
import {curatedRecallCandidates} from '../issue-78/v2-curator/curated-recall-candidates.mjs';
import {safeText} from '../issue-75/v2-candidate/memory-core.mjs';

const HEX=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const CASE=/^[A-Za-z0-9_-]{1,48}$/;
const GROUP=/^[A-Za-z0-9_.-]{1,100}$/;
const REVIEW_SCAN_BOUND=4096;
const SYNTH_LIMIT=4200;
const ROUNDS=3;
const digest=x=>createHash('sha256').update(x).digest('hex');
const syntheticId=n=>n.toString(16).padStart(64,'0');
const syntheticUuid=n=>'aaaaaaaa-aaaa-4aaa-8aaa-'+n.toString(16).padStart(12,'0');

export function distribution(samples) {
  if(!Array.isArray(samples)||!samples.length||samples.some(x=>!Number.isFinite(x)||x<0))
    return null;
  const sorted=[...samples].sort((a,b)=>a-b);
  const at=p=>Number(sorted[Math.ceil(p*sorted.length)-1].toFixed(3));
  return {n:sorted.length,p50_ms:at(0.5),p95_ms:at(0.95),max_ms:at(1)};
}

async function namesIn(dir,regex) {
  try{return (await fs.readdir(dir)).filter(n=>regex.test(n)).sort();}
  catch(e){if(e.code==='ENOENT')return [];throw e;}
}

/** This is a bounded local metadata count; only existing review records are read. */
export async function inventory(root,group) {
  const store=new ReviewStore(root,group);
  const names=await namesIn(store.dir,/^[a-f0-9]{64}\.json$/);
  const states={},fanout=new Map();
  let persistedFacts=0,missingRemoteUuid=0,multiFactRecords=0;
  let invalidSourceIndexRecords=0;
  for(let i=0;i<names.length;i+=32){
    const rows=await Promise.all(names.slice(i,i+32).map(n=>store.get(n.slice(0,-5))));
    for(const row of rows){
      if(!row){invalidSourceIndexRecords++;continue;}
      states[row.state]=(states[row.state]||0)+1;
      if(row.state!=='persisted')continue;
      const facts=Array.isArray(row.facts)?row.facts:[];
      persistedFacts+=facts.length;
      if(facts.length!==1)multiFactRecords++;
      if(!UUID.test(row.remote_episode_uuid||''))missingRemoteUuid++;
      // #92 can persist multiple independent facts, each as one review/episode.
      // The immutable origin cluster groups their fanout for metadata only.
      const origin=typeof row.origin_cluster_id==='string'&&HEX.test(row.origin_cluster_id)
        ?row.origin_cluster_id:row.id;
      fanout.set(origin,(fanout.get(origin)||0)+1);
    }
  }
  const indexFiles=await namesIn(path.join(store.dir,'_episode-index'),
    /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.json$/i);
  const fanoutValues=[...fanout.values()];
  return {review_files:names.length,states,persisted_facts:persistedFacts,
    episode_index_files:indexFiles.length,persisted_missing_uuid:missingRemoteUuid,
    persisted_nonatomic_review_records:multiFactRecords,
    unique_persisted_origin_clusters:fanout.size,
    max_persisted_facts_per_origin:fanoutValues.length?Math.max(...fanoutValues):0,
    reviews_above_4096:names.length>REVIEW_SCAN_BOUND,
    source_index_health_not_verified:true};
}

/** Actual, unmodified query-local source-scan/shortlist/index-join path. */
export async function profileQueries({root,group,workspace,project,cases,rounds=ROUNDS}) {
  if(!Array.isArray(cases)||!cases.length||cases.length>24||
    !Number.isInteger(rounds)||rounds<1||rounds>10)throw Error('BAD_CASE_BOUND');
  const used=new Set(),observations=[];
  for(const item of cases){
    if(!item||!CASE.test(item.id||'')||used.has(item.id)||typeof item.query!=='string')
      throw Error('INVALID_CASE_ID_OR_QUERY');
    used.add(item.id);
    const query=safeText(item.query,500);
    if(!query||query!==item.query||query.length<10){
      observations.push({id:item.id,status:'REJECTED_BY_QUERY_FENCE',iterations:0});
      continue;
    }
    const attempts=[],counts=[];
    for(let i=0;i<rounds;i++){
      const t0=performance.now();
      const rows=await curatedRecallCandidates(root,group,workspace,project,query,'semantic');
      attempts.push(performance.now()-t0);
      counts.push(rows.length);
    }
    observations.push({id:item.id,status:'READ_ONLY_LOCAL_PROFILE',
      iterations:rounds,cold_ms:Number(attempts[0].toFixed(3)),
      warm:distribution(attempts.slice(1)),all:distribution(attempts),
      source_qualified_shortlist_counts:counts,
      remote_membership_proven:false,model_injection_proven:false});
  }
  return observations;
}

const SYNTH_GROUP='issue94_synthetic';
const SYNTH_WORKSPACE='/tmp/issue94_synthetic_workspace';
const SYNTH_PROJECT='issue94-synthetic-project';
const SYNTH_QUERY='Which PostgreSQL database stores durable archive state?';
const SYNTH_FACT='PostgreSQL database stores durable archive state.';
export async function makeSyntheticReviews(root,count){
  if(!Number.isInteger(count)||count<1||count>SYNTH_LIMIT)throw Error('BAD_SYNTH_SIZE');
  const dir=path.join(root,'curation-v1',SYNTH_GROUP);
  await fs.mkdir(path.join(dir,'_episode-index'),{recursive:true,mode:0o700});
  for(let start=1;start<=count;start+=40){
    const writes=[];
    for(let n=start;n<=Math.min(count,start+39);n++){
      const id=syntheticId(n),uuid=syntheticUuid(n),persisted=n===count||n%5!==0;
      const fact=n===count?SYNTH_FACT:'Synthetic unrelated compilation inventory entry '+n+'.';
      const ref='opencode:ses_issue94_synthetic:message:msg_issue94_synthetic';
      const rec={id,origin_cluster_id:syntheticId(Math.floor((n-1)/3)+1),
        group:SYNTH_GROUP,project:SYNTH_PROJECT,workspace:SYNTH_WORKSPACE,
        state:persisted?'persisted':'deferred',
        remote_episode_uuid:persisted?uuid:null,
        facts:persisted?[{assertion:fact,source_refs:[ref],
          evidence_class:'tool-reported',temporal_status:'observed'}]:[],
        events:persisted?[{source_strength:'native-id',source_refs:[ref],
          evidence_class:'tool-reported',excerpt:fact}]:[]};
      writes.push(fs.writeFile(path.join(dir,id+'.json'),JSON.stringify(rec),{flag:'wx',mode:0o600}));
      if(persisted)writes.push(fs.writeFile(path.join(dir,'_episode-index',uuid+'.json'),
        JSON.stringify({id,remote_episode_uuid:uuid}),{flag:'wx',mode:0o600}));
    }
    await Promise.all(writes);
  }
  return {root,group:SYNTH_GROUP,workspace:SYNTH_WORKSPACE,project:SYNTH_PROJECT,
    targetUuid:syntheticUuid(count)};
}

export async function profileSynthetic(sizes=[512,4096,4097],rounds=ROUNDS){
  if(!Array.isArray(sizes)||!sizes.length||sizes.length>5||
    sizes.some(n=>!Number.isInteger(n)||n<1||n>SYNTH_LIMIT))throw Error('BAD_SYNTH_SIZES');
  const results=[];
  for(const size of sizes){
    const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'ghdev-issue94-'));
    try{
      const fixture=await makeSyntheticReviews(scratch,size);
      const observations=await profileQueries({...fixture,cases:[{id:'synthetic-target',query:SYNTH_QUERY}],rounds});
      const rows=await curatedRecallCandidates(scratch,SYNTH_GROUP,SYNTH_WORKSPACE,
        SYNTH_PROJECT,SYNTH_QUERY,'semantic');
      results.push({review_count:size,over_4096:size>REVIEW_SCAN_BOUND,
        expected_target_persisted:true,
        target_in_local_shortlist:rows.some(r=>r.remoteEpisodeUuid===fixture.targetUuid),
        source_only_not_remote_proof:true,
        samples:observations[0]});
    }finally{await fs.rm(scratch,{recursive:true,force:true});}
  }
  return results;
}

function readArgs(argv){
  const args={};
  for(let i=0;i<argv.length;i+=2){
    const key=argv[i];
    if(!key?.startsWith('--')||!argv[i+1]||argv[i+1].startsWith('--')||
      Object.hasOwn(args,key.slice(2)))throw Error('BAD_ARGUMENTS');
    args[key.slice(2)]=argv[i+1];
  }
  if(Object.keys(args).some(k=>!['mode','state-dir','group','workspace','project',
    'queries','output','sizes','rounds'].includes(k)))throw Error('UNKNOWN_ARGUMENT');
  return args;
}

export async function main(argv=process.argv.slice(2)){
  const arg=readArgs(argv),mode=arg.mode,output=arg.output;
  if(!['local','synthetic'].includes(mode)||!output||!path.isAbsolute(output))
    throw Error('MODE_AND_ABSOLUTE_PRIVATE_OUTPUT_REQUIRED');
  const rounds=arg.rounds===undefined?ROUNDS:Number(arg.rounds);
  if(!Number.isInteger(rounds)||rounds<1||rounds>10)throw Error('BAD_ROUNDS');
  let details;
  if(mode==='local'){
    if(!arg['state-dir']||!path.isAbsolute(arg['state-dir'])||
       !arg.workspace||!path.isAbsolute(arg.workspace)||
       !GROUP.test(arg.group||'')||!arg.project||!arg.queries||
       !path.isAbsolute(arg.queries))throw Error('LOCAL_ARGUMENTS_REQUIRED');
    const parsed=JSON.parse(await fs.readFile(arg.queries,'utf8'));
    if(!parsed||!Array.isArray(parsed.cases))throw Error('CASES_ARRAY_REQUIRED');
    details={inventory:await inventory(arg['state-dir'],arg.group),
      local_queries:await profileQueries({root:arg['state-dir'],group:arg.group,
        workspace:arg.workspace,project:arg.project,cases:parsed.cases,rounds})};
  }else{
    if(Object.keys(arg).some(k=>!['mode','output','sizes','rounds'].includes(k)))
      throw Error('SYNTHETIC_MODE_ARGUMENTS');
    const sizes=arg.sizes?arg.sizes.split(',').map(Number):[512,4096,4097];
    details={synthetic:await profileSynthetic(sizes,rounds)};
  }
  const report={schema_version:1,kind:'issue94-local-read-only-profile',
    mode,generated_at:new Date().toISOString(),node:process.versions.node,
    no_graphiti_mutations:true,no_live_store_mutations:true,
    remote_episode_authority_not_measured:true,
    native_callback_and_model_utility_not_measured:true,
    review_scan_ceiling:REVIEW_SCAN_BOUND,remote_episode_inventory_ceiling:1000,
    ...details};
  // No raw query text, raw review content, episode IDs, paths, or source refs.
  const handle=await fs.open(output,'wx',0o600);
  try{await handle.writeFile(JSON.stringify(report,null,2)+'\n');await handle.sync();}
  finally{await handle.close();}
  console.log(JSON.stringify({status:'PROFILE_WRITTEN',mode,
    sha256:digest(JSON.stringify(report)),output_written:true}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(e=>{console.error('ISSUE94_PROFILE_BLOCKED '+
    String(e?.message||'unexpected').slice(0,100));process.exitCode=2;});
}