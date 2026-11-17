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
const INDEX_FILE=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.json$/i;
const MAX_INDEX_SCAN=4096;

// Data-invalid review records are local omissions. IO and permission errors
// remain fatal and must not be misclassified as harmless corruption.
async function readReviewIfIntact(store,id) {
  try { return await store.get(id); }
  catch(e) {
    if(e instanceof SyntaxError || e?.message==='Corrupt review identity/state')
      return null;
    throw e;
  }
}

/**
 * Source-index discovery for normal query retrieval and large compatibility inventories.
 * The index is a source of candidate identities, NEVER a source authority:
 * each referenced review is re-read through ReviewStore.get(), and the
 * caller's sourcedEpisodeResolver plus fresh remote proof still apply.
 *
 * Persisted reviews without a matching episode index were already ineligible
 * for sourcedEpisodeResolver, so this path does not discard a formerly
 * source-proven candidate merely because unrelated deferred reviews grew.
 */
async function readIndexedInventory(store) {
  const dir=path.join(store.dir,'_episode-index');
  let names;
  try { names=(await fs.readdir(dir)).filter(n=>INDEX_FILE.test(n)).sort(); }
  catch(e){if(e?.code==='ENOENT')return [];throw e;}
  // Explicit fail-closed guard on actual indexed episodes, not total history.
  if(names.length>MAX_INDEX_SCAN)return [];
  const records=[],seen=new Set();
  for(let offset=0;offset<names.length;offset+=READ_BATCH) {
    const batch=await Promise.all(names.slice(offset,offset+READ_BATCH).map(async name=>{
      const uuid=name.slice(0,-5);
      let index;
      try { index=JSON.parse(await fs.readFile(path.join(dir,name),'utf8')); }
      catch(e){if(e?.code==='ENOENT'||e instanceof SyntaxError)return null;throw e;}
      if(index?.remote_episode_uuid!==uuid ||
         !REVIEW_FILE.test((index?.id||'')+'.json'))return null;
      // Damaged sibling reviews never black out other indexed facts.
      const review=await readReviewIfIntact(store,index.id);
      return review?.state==='persisted'&&review.remote_episode_uuid===uuid
        ?review:null;
    }));
    for(const review of batch) {
      if(!review||seen.has(review.id))continue;
      seen.add(review.id);records.push(review);
    }
  }
  return records;
}

async function readBoundedInventory(store) {
  // Query-free tools retain this historical bounded listing path.
  // The automatic query route does not enumerate the full review directory.
  let names;
  try { names=(await fs.readdir(store.dir)).filter(n=>REVIEW_FILE.test(n)).sort(); }
  catch(e){if(e?.code==='ENOENT')return [];throw e;}
  // A global review count includes deferred/skipped history. Once it exceeds
  // the bounded interactive scan, discover only persisted, indexed episodes
  // rather than blacking out every eligible curated fact.
  if(names.length>MAX_REVIEW_SCAN)return readIndexedInventory(store);
  const records=[];
  for(let offset=0;offset<names.length;offset+=READ_BATCH) {
    const batch=await Promise.all(names.slice(offset,offset+READ_BATCH)
      .map(name=>readReviewIfIntact(store,name.slice(0,-5))));
    records.push(...batch.filter(Boolean));
  }
  return records;
}

function provisional(r,group,workspace,project) {
  if(r?.state!=='persisted'||
     ['superseded','logically_retired'].includes(r.retention?.status)||
     r.group!==group||r.workspace!==workspace||
     r.project!==project||r.facts?.length!==1||
     !UUID.test(r.remote_episode_uuid||''))return null;
  // ReviewStore validates envelope identity/state, not nested content.
  if(!Array.isArray(r.events))return null;
  const f=r.facts[0];
  if(!f||typeof f!=='object')return null;
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
  const originalTemporal=f.temporal_status==='historical'?'historical/superseded':
    f.temporal_status==='proposed'?'proposed (not established)':
    f.temporal_status==='unknown'?'temporal standing unknown':
    'observed; current state not independently verified';
  // The actual model-facing consumer projects `temporal` but not
  // `retentionStatus`. Preserve BOTH original-source temporal standing and
  // the independent provisional-retention decision in that public field.
  return {fact,source,evidenceClass:f.evidence_class,
    remoteEpisodeUuid:r.remote_episode_uuid,sourceContext,
    temporal:r.retention?.status==='provisional_retention'?
      'provisional retention; '+originalTemporal:originalTemporal,
    ...(r.retention?.status?{retentionStatus:r.retention.status}:{}),
    group,workspace,project};
}

/**
 * The old 288-episode whole-inventory veto caused an outage as soon as 299
 * durable episodes existed. The automatic query path now enumerates
 * indexed reviews only, shortlists query-relevant observations, then authenticates their episode-index
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
  // Every injectible curated fact already requires an episode index.
  // Query-scoped retrieval must not scan unindexed deferred/skipped history.
  // Keep the old bounded no-query inventory for explicit compatibility tools.
  const all=query===null
    ?await readBoundedInventory(store):await readIndexedInventory(store);
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
    if(!s||s.evidenceClass!==r.evidenceClass||
       (s.retentionStatus&&s.retentionStatus!==r.retentionStatus))return [];
    // Never trust provisional source identity over the exact persisted index.
    return [{...r,source:s.sourceRef}];
  });
}

/** Shared query/policy adapter for both live stock-V2 and frozen shadow replay. */
export function curatedRecallRetriever(root,group,workspace,project) {
  return (query,policy)=>curatedRecallCandidates(root,group,workspace,project,query,policy);
}
