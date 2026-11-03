/** Read-only mapping of confirmed curated episodes into existing native recall. */
import { ReviewStore } from './core.mjs';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const CLASSES=new Set(['user-stated','tool-reported','assistant-reported']);
export async function sourcedEpisodeResolver(root,group,workspace,project,ids) {
  const wanted=new Set((Array.isArray(ids)?ids:[]).filter(id=>
    typeof id==='string'&&UUID.test(id)).slice(0,120));
  if(!wanted.size)return [];
  const store=new ReviewStore(root,group),result=[];
  for(let offset=0;;offset+=500){
    const page=await store.list({limit:500,offset});
    for(const r of page.items){
      if(r.state!=='persisted'||r.group!==group||r.project!==project||
        r.workspace!==workspace||!wanted.has(r.remote_episode_uuid)||
        r.facts?.length!==1)continue;
      const fact=r.facts[0];
      if(!CLASSES.has(fact.evidence_class)||!Array.isArray(fact.source_refs)||
        !fact.source_refs.length||fact.source_refs.length>8||
        !fact.source_refs.every(ref=>r.events.some(e=>
          e.source_refs.includes(ref)&&e.evidence_class===fact.evidence_class &&
          e.source_strength==='native-id')))continue;
      result.push({status:'persisted',group,remoteEpisodeUuid:r.remote_episode_uuid,
        sourceRef:fact.source_refs.join(', '),evidenceClass:fact.evidence_class});
    }
    if(!page.has_more)break;
  }
  return result;
}
