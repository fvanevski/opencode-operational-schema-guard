/** Source-index candidate inventory; never authoritative without fresh remote membership. */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ReviewStore } from './core.mjs';
import { sourcedEpisodeResolver } from './sourced-recall.mjs';
import { safeText } from '../../issue-75/v2-candidate/memory-core.mjs';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export async function curatedRecallCandidates(root,group,workspace,project) {
  if(typeof root!=='string'||!path.isAbsolute(root)||
    typeof workspace!=='string'||!path.isAbsolute(workspace)||
    !/^[A-Za-z0-9_.-]{1,100}$/.test(group)||!project)return [];
  const store=new ReviewStore(root,group);
  const page=await store.list({limit:500});
  // Never silently sample a too-large record universe.
  if(page.has_more||!Array.isArray(page.items)||page.items.length>500)return [];
  const eligible=page.items.filter(r=>r.state==='persisted'&&r.group===group&&
    r.workspace===workspace&&r.project===project&&r.facts?.length===1&&
    UUID.test(r.remote_episode_uuid||''));
  const ids=[...new Set(eligible.map(r=>r.remote_episode_uuid))];
  if(ids.length>288)return [];
  const verified=await sourcedEpisodeResolver(root,group,workspace,project,ids);
  const byID=new Map(verified.map(x=>[x.remoteEpisodeUuid,x]));
  return eligible.flatMap(r=>{
    const s=byID.get(r.remote_episode_uuid),f=r.facts[0];
    if(!s||s.evidenceClass!==f.evidence_class)return [];
    const assertion=safeText(f.assertion,480);
    if(!assertion)return [];
    // The contextual phrase is an *admission hint*, not a separate fact.
    // It is taken only from an event with the exact assertion source ref.
    const refs=new Set(f.source_refs||[]);
    const excerpt=(r.events||[]).filter(e=>e.source_strength==='native-id'&&
      e.evidence_class===f.evidence_class&&e.source_refs?.some(ref=>refs.has(ref)))
      .map(e=>safeText(e.excerpt,500)).find(Boolean)||'';
    return [{fact:assertion,source:s.sourceRef,evidenceClass:s.evidenceClass,
      remoteEpisodeUuid:r.remote_episode_uuid,
      sourceContext:excerpt, temporal:/histor|superse|prior|past/i.test(f.temporal_status||'')
        ?'historical/superseded':'current state not independently verified',
      group, workspace,project}];
  });
}
