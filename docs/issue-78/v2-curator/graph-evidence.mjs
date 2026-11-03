/** Read-only, group/source-confirmed Graphiti entity/relationship evidence.
 * No graph writes, model inference, or source promotion. The endpoint is
 * inspected only after a persisted review and exact native source index.
 */
import { GraphitiMcp } from '../../issue-75/v2-candidate/memory-core.mjs';
import { cleanExcerpt } from '../v2-candidate/events.mjs';
import { sourcedEpisodeResolver } from './sourced-recall.mjs';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const HEX=/^[a-f0-9]{64}$/;
const SAFE=/^[A-Za-z0-9_.-]{1,100}$/;
const safe=(value,max=240)=>typeof value==='string'?cleanExcerpt(value,max):'';
function checkScope(item,group,kind){
  // UUID-targeted MCP operations can be insufficiently scoped in some
  // backends. Never display a graph object whose group cannot be proven.
  if(item?.group_id!==group)throw Error('GRAPH_'+kind+'_GROUP_NOT_PROVEN');
  if(!UUID.test(item?.uuid||''))throw Error('GRAPH_'+kind+'_UUID_INVALID');
}
function nodeSummary(n){
  return {uuid:n.uuid,group_id:n.group_id,name:safe(n.name,160),
    summary:safe(n.summary,400),
    labels:Array.isArray(n.labels)?n.labels.filter(x=>typeof x==='string')
      .map(x=>safe(x,60)).filter(Boolean).slice(0,8):[]};
}
function edgeSummary(e){
  return {uuid:e.uuid,group_id:e.group_id,
    fact:safe(e.fact,360),source_node_uuid:UUID.test(e.source_node_uuid||'')?e.source_node_uuid:null,
    target_node_uuid:UUID.test(e.target_node_uuid||'')?e.target_node_uuid:null,
    valid_at:typeof e.valid_at==='string'?e.valid_at:null,
    invalid_at:typeof e.invalid_at==='string'?e.invalid_at:null,
    episodes:Array.isArray(e.episodes)?e.episodes.filter(x=>UUID.test(x)).slice(0,15):[]};
}
export async function inspectEpisodeGraph({store,root,group,clusterId,graphiti,
  endpoint,maxEpisodes=1000,maxNodes=80,maxEdges=100}={}){
  if(!store||!SAFE.test(group||'')||store.group!==group||
    !HEX.test(clusterId||'')||typeof root!=='string'||
    !Number.isInteger(maxEpisodes)||maxEpisodes<1||maxEpisodes>1000)
    throw Error('GRAPH_INSPECTION_SCOPE_INVALID');
  const record=await store.get(clusterId);
  if(!record||record.group!==group)return {status:'review_not_found'};
  if(record.state!=='persisted'||!UUID.test(record.remote_episode_uuid||''))
    return {status:'not_persisted'};
  if(record.facts?.length!==1)return {status:'source_mapping_unavailable'};
  const uuid=record.remote_episode_uuid;
  const indexed=await sourcedEpisodeResolver(root,group,record.workspace,record.project,[uuid]);
  if(indexed.length!==1||indexed[0].remoteEpisodeUuid!==uuid)
    return {status:'source_mapping_unavailable'};
  if(!graphiti)graphiti=new GraphitiMcp(endpoint,{timeoutMs:12000});
  const result=await graphiti.call('get_episodes',{group_ids:[group],max_episodes:maxEpisodes});
  if(!Array.isArray(result?.episodes))throw Error('GRAPH_REMOTE_EPISODES_UNAVAILABLE');
  const matches=result.episodes.filter(e=>
    e?.group_id===group&&e?.uuid===uuid&&e?.name==='curated-v1:'+clusterId);
  if(matches.length!==1)return {status:'remote_identity_not_confirmed',
    remote_episode_uuid:uuid};
  const raw=await graphiti.call('get_episode_entities',{
    group_id:group,episode_uuids:[uuid]});
  if(!Array.isArray(raw?.nodes)||!Array.isArray(raw?.edges))
    throw Error('GRAPH_EPISODE_ENTITIES_UNAVAILABLE');
  if(raw.nodes.length>maxNodes||raw.edges.length>maxEdges)
    throw Error('GRAPH_RESPONSE_OVER_BOUND');
  for(const n of raw.nodes)checkScope(n,group,'NODE');
  for(const e of raw.edges)checkScope(e,group,'EDGE');
  const nodes=raw.nodes.map(nodeSummary);
  const edges=raw.edges.map(edgeSummary);
  const ids=new Set(nodes.map(n=>n.uuid));
  const linked_edges=edges.filter(e=>ids.has(e.source_node_uuid)&&ids.has(e.target_node_uuid));
  const unlinked_edges=edges.filter(e=>!ids.has(e.source_node_uuid)||!ids.has(e.target_node_uuid));
  return {status:'verified_readback',group,remote_episode_uuid:uuid,
    source_ref:indexed[0].sourceRef,evidence_class:indexed[0].evidenceClass,
    nodes,edges,node_count:nodes.length,edge_count:edges.length,
    linked_edge_count:linked_edges.length,unlinked_edge_count:unlinked_edges.length,
    provenance_note:'Graphiti returned these objects for the confirmed episode. Extracted graph claims are not independently fact-verified.'};
}
