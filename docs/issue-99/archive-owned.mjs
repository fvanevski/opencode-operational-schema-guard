/** Issue #99. Authoritative ReviewStore ownership determines source archive eligibility. */
import {createHash} from 'node:crypto';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {sourceFingerprint} from '../issue-78/v2-candidate/queue.mjs';
const HEX=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SETTLED=new Set(['deferred','skipped','persisted']);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
async function reviewsAll(store) {
  const rows=[];
  for(let offset=0;;offset+=500) {
    const p=await store.list({offset,limit:500});
    if(!Array.isArray(p.items)||!Number.isSafeInteger(p.total)||
      p.total<rows.length+p.items.length||p.items.length>500)
      throw Error('ARCHIVE_BAD_REVIEW_PAGE');
    rows.push(...p.items);
    if(!p.has_more) {
      if(rows.length!==p.total)throw Error('ARCHIVE_REVIEW_PAGE_MISMATCH');
      return rows;
    }
    if(!p.items.length)throw Error('ARCHIVE_REVIEW_PAGE_STALLED');
  }
}
async function indexValid(store,r) {
  if(!UUID.test(r.remote_episode_uuid||''))return false;
  try {
    const v=JSON.parse(await fs.readFile(path.join(store.dir,'_episode-index',
      r.remote_episode_uuid+'.json'),'utf8'));
    return v?.id===r.id&&v?.remote_episode_uuid===r.remote_episode_uuid;
  } catch(e) {if(e.code==='ENOENT')return false;throw e;}
}
function sourceMatches(e,r,s) {
  return r.group===e.group&&r.project===e.project&&r.workspace===e.workspace&&
    r.session_id===e.session_id&&s?.event_id===e.event_id&&s.kind===e.kind&&
    s.evidence_class===e.evidence_class&&s.source_strength===e.source_strength&&
    s.excerpt===e.excerpt&&s.observed_at===e.observed_at&&
    same(s.source_refs,e.source_refs)&&same(s.related_event_ids,e.related_event_ids);
}
export async function planSourceArchive(queue,store,{limit=4000}={}) {
  if(queue.group!==store.group||!Number.isInteger(limit)||limit<0||limit>20000)
    throw Error('ARCHIVE_INVALID_SCOPE_OR_LIMIT');
  const pending=await queue.pendingIds();
  const excluded={unowned:0,cross_origin:0,scope_or_source_mismatch:0,
    nonsettled_review:0,missing_terminal_index:0};
  if(!pending.length)return {items:[],eligible_total:0,pending_total:0,
    excluded,plan_sha256:hash([])};
  const owner=new Map(),validIndex=new Map();
  for(const r of await reviewsAll(store)) {
    if(!HEX.test(r?.id||'')||r.group!==store.group||
       !HEX.test(r.origin_cluster_id||r.id)||
       !Array.isArray(r.source_event_ids)||!Array.isArray(r.events))
      throw Error('ARCHIVE_REVIEW_IDENTITY_CORRUPT');
    if(r.state==='persisted')validIndex.set(r.id,await indexValid(store,r));
    for(const id of r.source_event_ids) {
      if(!HEX.test(id))throw Error('ARCHIVE_SOURCE_REF_CORRUPT');
      const refs=owner.get(id)||[];
      refs.push({r,src:r.events.find(e=>e?.event_id===id)});
      owner.set(id,refs);
    }
  }
  const eligible=[];
  for(const id of pending) {
    const refs=owner.get(id);
    if(!refs?.length){excluded.unowned++;continue;}
    if(new Set(refs.map(x=>x.r.origin_cluster_id||x.r.id)).size!==1) {
      excluded.cross_origin++;continue;
    }
    if(refs.some(x=>!SETTLED.has(x.r.state)||x.r.reevaluate_requested===true)) {
      excluded.nonsettled_review++;continue;
    }
    if(refs.some(x=>x.r.state==='persisted'&&!validIndex.get(x.r.id))) {
      excluded.missing_terminal_index++;continue;
    }
    const e=await queue.get(id);
    if(!e||refs.some(x=>!sourceMatches(e,x.r,x.src))) {
      excluded.scope_or_source_mismatch++;continue;
    }
    eligible.push({id,fingerprint:sourceFingerprint(e),
      review_versions:refs.map(x=>[x.r.id,x.r.revision,x.r.state])
        .sort((a,b)=>a[0].localeCompare(b[0]))});
  }
  eligible.sort((a,b)=>a.id.localeCompare(b.id));
  return {items:eligible.slice(0,limit).map(x=>({id:x.id,fingerprint:x.fingerprint})),
    eligible_total:eligible.length,pending_total:pending.length,excluded,
    plan_sha256:hash(eligible)};
}
export async function archiveOwnedSources(queue,store,{limit=128,dryRun=false,expectedPlan=null}={}) {
  if(typeof dryRun!=='boolean')throw Error('ARCHIVE_INVALID_DRY_RUN');
  const plan=await planSourceArchive(queue,store,{limit});
  if(expectedPlan!==null&&plan.plan_sha256!==expectedPlan)throw Error('ARCHIVE_PLAN_STALE');
  if(dryRun)return {...plan,items:undefined,archived:0};
  let archived=0,already=0;
  for(let i=0;i<plan.items.length;i+=32) {
    const n=await queue.archiveSettledBatch(plan.items.slice(i,i+32));
    archived+=n.archived;already+=n.already_archived;
  }
  return {eligible_total:plan.eligible_total,pending_total:plan.pending_total,
    excluded:plan.excluded,plan_sha256:plan.plan_sha256,
    archived,already_archived:already,remaining_eligible:plan.eligible_total-archived-already};
}
