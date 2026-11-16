#!/usr/bin/env node
/** Issue #99: read-only metadata inventory. No excerpts, model replies or Graphiti writes. */
import {createHash} from 'node:crypto';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CandidateQueue} from '../issue-78/v2-candidate/queue.mjs';
import {ReviewStore} from '../issue-78/v2-curator/core.mjs';
const HEX=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const digest=s=>createHash('sha256').update(s).digest('hex');
const increment=(object,key)=>{object[key]=(object[key]||0)+1;};
async function pages(store) {
  const rows=[];
  for(let offset=0;;offset+=500) {
    const p=await store.list({offset,limit:500});
    if(!Array.isArray(p.items)||!Number.isSafeInteger(p.total)||
       p.total<rows.length+p.items.length||p.items.length>500)throw Error('INVALID_PAGE');
    rows.push(...p.items);
    if(!p.has_more){
      if(rows.length!==p.total)throw Error('PAGINATION_MISMATCH');
      return rows;
    }
    if(!p.items.length||offset>500000)throw Error('PAGINATION_STALLED');
  }
}
export function summarize(events,reviews) {
  const sources=new Map(),ownership=new Map(),queue_states={},review_states={};
  const seenReviews=new Set();
  for(const e of events){
    if(!HEX.test(e?.event_id||'')||sources.has(e.event_id))throw Error('BAD_EVENT_ID');
    sources.set(e.event_id,e);increment(queue_states,e.state);
  }
  let ambiguousReviews=0,persistedUUID=0,persistedNoUUID=0;
  for(const r of reviews){
    if(!HEX.test(r?.id||'')||seenReviews.has(r.id))throw Error('BAD_REVIEW_ID');
    seenReviews.add(r.id);increment(review_states,r.state);
    if(r.state==='persisted') {
      if(UUID.test(r.remote_episode_uuid||''))persistedUUID++;else persistedNoUUID++;
    }
    if(['submission_unknown','queued','retry_authorized','failed_extraction'].includes(r.state))ambiguousReviews++;
    if(!Array.isArray(r.source_event_ids))throw Error('BAD_REVIEW_SOURCE_LIST');
    for(const sourceId of r.source_event_ids){
      if(!HEX.test(sourceId))throw Error('BAD_REVIEW_SOURCE_ID');
      if(!ownership.has(sourceId))ownership.set(sourceId,[]);
      ownership.get(sourceId).push({origin:r.origin_cluster_id||r.id,
        review:r.id,state:r.state,group:r.group,project:r.project,workspace:r.workspace});
    }
  }
  const owned={},unowned={};
  let unownedNonactionable=0,wrongScope=0,crossOrigin=0,ambiguousSources=0,archiveCandidates=0;
  for(const e of events){
    const owners=ownership.get(e.event_id)||[];
    if(!owners.length){
      increment(unowned,e.state);
      if(!['new','reserved'].includes(e.state))unownedNonactionable++;
      continue;
    }
    increment(owned,e.state);
    const multi=new Set(owners.map(x=>x.origin)).size>1;
    const wrong=owners.some(x=>x.group!==e.group||x.project!==e.project||x.workspace!==e.workspace);
    if(multi)crossOrigin++;
    if(wrong)wrongScope++;
    if(owners.some(x=>['submission_unknown','queued','failed_extraction','retry_authorized'].includes(x.state)))ambiguousSources++;
    if(!multi&&!wrong&&!['new','reserved'].includes(e.state))archiveCandidates++;
  }
  return {
    schema:'issue99-lifecycle-audit-v1',source_files:events.length,review_files:reviews.length,
    queue_states,review_states,owned_states:owned,unowned_states:unowned,
    actionable_source_files:(queue_states.new||0)+(queue_states.reserved||0),
    owned_source_files:events.length-Object.values(unowned).reduce((a,b)=>a+b,0),
    review_references_absent_source:[...ownership.keys()].filter(id=>!sources.has(id)).length,
    unowned_nonactionable_files:unownedNonactionable,wrong_scope_source_ids:wrongScope,
    multiple_origin_source_ids:crossOrigin,ambiguous_review_files:ambiguousReviews,
    ambiguous_owned_source_ids:ambiguousSources,
    candidate_archivable_source_files_not_authorized:archiveCandidates,
    persisted_reviews_with_uuid:persistedUUID,persisted_reviews_without_uuid:persistedNoUUID,
    source_identity_sha256:digest([...sources.keys()].sort().join('\n')),
    review_identity_sha256:digest([...seenReviews].sort().join('\n')),
    archive_is_not_remote_settlement:true
  };
}
function arg(name) {
  const i=process.argv.indexOf('--'+name);
  if(i<0||!process.argv[i+1])throw Error('MISSING_'+name.toUpperCase().replaceAll('-','_'));
  return process.argv[i+1];
}
async function main(){
  const root=arg('state-dir'),group=arg('group');
  if(!path.isAbsolute(root))throw Error('ROOT_MUST_BE_ABSOLUTE');
  const queue=new CandidateQueue(root,group),store=new ReviewStore(root,group);
  const [events,reviews,status]=await Promise.all([pages(queue),pages(store),queue.status()]);
  if(events.length!==status.total)throw Error('STATUS_COUNT_MISMATCH');
  const s=summarize(events,reviews);
  let good=0,missing=0,bad=0;
  for(const r of reviews.filter(x=>x.state==='persisted')){
    if(!UUID.test(r.remote_episode_uuid||'')){bad++;continue;}
    try{
      const index=JSON.parse(await fs.readFile(path.join(store.dir,'_episode-index',r.remote_episode_uuid+'.json'),'utf8'));
      if(index?.id===r.id&&index?.remote_episode_uuid===r.remote_episode_uuid)good++;else bad++;
    }catch(e){if(e.code==='ENOENT')missing++;else bad++;}
  }
  const result={...s,group,capacity:status.capacity,full:status.full,
    cumulative_drops:status.drops,index_valid:good,index_missing:missing,index_bad:bad,
    live_graphiti_checked:false,private_content_exported:false};
  process.stdout.write(JSON.stringify({...result,
    payload_sha256:digest(JSON.stringify(result))},null,2)+'\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))
  main().catch(e=>{console.error(JSON.stringify({status:'BLOCKED',code:e.message}));process.exitCode=2;});
