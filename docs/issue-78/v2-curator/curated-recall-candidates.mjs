/** Query-scoped source-index discovery; fresh remote Graphiti membership is still required. */
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { ReviewStore } from './core.mjs';
import { sourcedEpisodeResolver } from './sourced-recall.mjs';
import { safeText } from '../../issue-75/v2-candidate/memory-core.mjs';
import { shortlistQualifiedCandidates } from '../../issue-75/v2-candidate/relevance.mjs';
import { preselectIndexedContext } from '../../issue-75/v2-candidate/semantic-recall.mjs';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SOURCE=/^opencode:[^\s]+:(?:message|tool|user):/;
const CLASSES=new Set(['user-stated','tool-reported','assistant-reported']);
const PAGE=500, MAX_REVIEW_SCAN=4096, SHORTLIST=24, RESOLVER_BATCH=288;
const READ_BATCH=32, REVIEW_FILE=/^[a-f0-9]{64}\.json$/;

async function readBoundedInventory(store) {
  // ReviewStore.list() fully reads and parses the entire directory BEFORE
  // slicing a page. Repeating it multiplies interactive IO by page count.
  // Snapshot names once, then read each review at most once via the existing
  // identity/state-validating ReviewStore.get() method.
  let names;
  try { names=(await fs.readdir(store.dir)).filter(n=>REVIEW_FILE.test(n)).sort(); }
  catch(e){if(e?.code==='ENOENT')return [];throw e;}
  // Fail closed rather than silently omitting an unexamined section.
  if(names.length>MAX_REVIEW_SCAN)return [];
  const records=[];
  for(let offset=0;offset<names.length;offset+=READ_BATCH) {
    const batch=await Promise.all(names.slice(offset,offset+READ_BATCH)
      .map(name=>store.get(name.slice(0,-5))));
    records.push(...batch.filter(Boolean));
  }
  return records;
}

function provisional(r,group,workspace,project) {
  if(r?.state!=='persisted'||r.group!==group||r.workspace!==workspace||
     r.project!==project||r.facts?.length!==1||
     !UUID.test(r.remote_episode_uuid||''))return null;
  const f=r.facts[0];
  if(!CLASSES.has(f.evidence_class)||!Array.isArray(f.source_refs)||
     !f.source_refs.length||f.source_refs.length>8||
     !f.source_refs.every(ref=>typeof ref==='string'&&SOURCE.test(ref)))return null;
  const source=f.source_refs.join(', ');
  const fact=safeText(f.assertion,480);
  if(!fact||source.length>1200)return null;
  // Only native-ID event excerpts corroborating this exact assertion may rank
  // candidates. This preliminary rank does NOT authorize source persistence.
  const refs=new Set(f.source_refs);
  const sourceContext=(r.events||[]).filter(e=>e?.source_strength==='native-id'&&
    e.evidence_class===f.evidence_class&&Array.isArray(e.source_refs)&&
    e.source_refs.some(ref=>refs.has(ref)))
    .map(e=>safeText(e.excerpt,500)).find(Boolean)||'';
  return {fact,source,evidenceClass:f.evidence_class,
    remoteEpisodeUuid:r.remote_episode_uuid,sourceContext,
    temporal:/histor|superse|prior|past/i.test(f.temporal_status||'')
      ?'historical/superseded':'current state not independently verified',
    group,workspace,project};
}

/**
 * The old 288-episode whole-inventory veto caused an outage as soon as 299
 * durable episodes existed. Search ALL bounded review pages, shortlist only
 * query-relevant indexed observations, then authenticate their episode-index
 * sources. The caller independently proves current remote Graphiti membership.
 * An omitted query retains the bounded legacy inventory API for test/tools.
 */
export async function curatedRecallCandidates(root,group,workspace,project,
    query=null,recallPolicy='strict') {
  if(typeof root!=='string'||!path.isAbsolute(root)||
     typeof workspace!=='string'||!path.isAbsolute(workspace)||
     !/^[A-Za-z0-9_.-]{1,100}$/.test(group)||!project||
     (query!==null&&(typeof query!=='string'||safeText(query,500)!==query)))return [];
  const store=new ReviewStore(root,group);
  const all=await readBoundedInventory(store);
  const candidates=all.map(r=>provisional(r,group,workspace,project)).filter(Boolean);
  // When used by automatic recall, the query-dependent shortlist is the
  // bounded interface; NEVER discard the entire index because its history
  // grew beyond 288 source IDs or 500 review records.
  if(query===null&&candidates.length>PAGE)return [];
  // In semantic mode a single reserved strict winner may fail the source
  // index or fresh remote-membership check. Preserve independently ranked
  // strict fallbacks alongside semantic hits until AFTER that proof. Both
  // lanes remain bounded to 24; the combined pre-proof pool is <=48, and
  // neither lane grants source authority or expands model-facing context.
  let possible;
  if(query===null)possible=candidates;
  else if(recallPolicy==='semantic') {
    const strict=shortlistQualifiedCandidates(query,candidates,{limit:SHORTLIST});
    const semantic=preselectIndexedContext(query,candidates,{limit:SHORTLIST});
    const seen=new Set();
    possible=[];
    for(const row of [...strict,...semantic]) {
      if(seen.has(row.remoteEpisodeUuid))continue;
      seen.add(row.remoteEpisodeUuid);possible.push(row);
    }
  } else possible=shortlistQualifiedCandidates(query,candidates,{limit:SHORTLIST});
  if(!possible.length)return [];
  const ids=[...new Set(possible.map(r=>r.remoteEpisodeUuid))];
  const verified=[];
  for(let i=0;i<ids.length;i+=RESOLVER_BATCH)
    verified.push(...await sourcedEpisodeResolver(root,group,workspace,project,
      ids.slice(i,i+RESOLVER_BATCH)));
  const byID=new Map(verified.map(x=>[x.remoteEpisodeUuid,x]));
  return possible.flatMap(r=>{
    const s=byID.get(r.remoteEpisodeUuid);
    if(!s||s.evidenceClass!==r.evidenceClass)return [];
    // Never trust provisional source identity over the exact persisted index.
    return [{...r,source:s.sourceRef}];
  });
}

/** Shared query/policy adapter for both live stock-V2 and frozen shadow replay. */
export function curatedRecallRetriever(root,group,workspace,project) {
  return (query,policy)=>curatedRecallCandidates(root,group,workspace,project,query,policy);
}
