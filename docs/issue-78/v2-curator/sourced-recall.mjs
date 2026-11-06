/** O(1) read-only confirmation of curated Graphiti episode sources for native recall. */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ReviewStore } from './core.mjs';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const CLASSES=new Set(['user-stated','tool-reported','assistant-reported']);
// 24 returned facts, at most 12 remote episode anchors each.
// The caller still confirms exact group/project/workspace and persisted status.
const MAX_AUTOMATIC_EPISODE_ANCHORS = 24 * 12;
export async function sourcedEpisodeResolver(root,group,workspace,project,ids) {
  const wanted=new Set((Array.isArray(ids)?ids:[]).filter(id=>
    typeof id==='string'&&UUID.test(id)).slice(0,MAX_AUTOMATIC_EPISODE_ANCHORS));
  if(!wanted.size)return [];
  const store=new ReviewStore(root,group),result=[];
  for(const uuid of wanted){
    let index;
    try {
      index=JSON.parse(await fs.readFile(path.join(store.dir,'_episode-index',uuid+'.json'),'utf8'));
    } catch(e){if(e.code==='ENOENT')continue;throw e;}
    if(index.remote_episode_uuid!==uuid||!(/^[a-f0-9]{64}$/).test(index.id||''))continue;
    const r=await store.get(index.id);
    if(!r||r.state!=='persisted'||r.remote_episode_uuid!==uuid||
      r.group!==group||r.project!==project||r.workspace!==workspace||
      r.facts?.length!==1)continue;
    const fact=r.facts[0];
    if(!CLASSES.has(fact.evidence_class)||!Array.isArray(fact.source_refs)||
      !fact.source_refs.length||fact.source_refs.length>8||
      !fact.source_refs.every(ref=>r.events.some(e=>
        e.source_refs.includes(ref)&&e.evidence_class===fact.evidence_class &&
        e.source_strength==='native-id')))continue;
    result.push({status:'persisted',group,remoteEpisodeUuid:uuid,
      sourceRef:fact.source_refs.join(', '),evidenceClass:fact.evidence_class});
  }
  return result;
}
