/** Pure graph-view assembly: never infer Graphiti edges from visual layout. */
const safeLabel=s=>typeof s==='string'?s.slice(0,180):'';
export function addReadOnlyGraph(base,inspection){
 const status=inspection?.status||'not_configured';
 const existing=base.nodes||[],links=base.edges||[];
 const response={...base,nodes:[...existing],edges:[...links],
   remote_graph:{status,node_count:0,edge_count:0,linked_edge_count:0,
     unlinked_edge_count:0,source:'read_only_get_episode_entities'}};
 if(status!=='verified_readback'){
   response.note=base.note+' Remote graph: '+status+'.';
   return response;
 }
 if(!existing.some(n=>n.id==='episode'))
   throw Error('Real graph cannot attach to an unconfirmed episode');
 const nodes=inspection.nodes||[],edges=inspection.edges||[];
 response.remote_graph={status,
   node_count:inspection.node_count,edge_count:inspection.edge_count,
   linked_edge_count:inspection.linked_edge_count,
   unlinked_edge_count:inspection.unlinked_edge_count,
   source:'read_only_get_episode_entities'};
 const nodeIDs=new Set(nodes.map(n=>n.uuid));
 nodes.forEach((n,i)=>{
   const id='entity-'+n.uuid;
   response.nodes.push({id,type:'default',className:'review-entity',position:{
     x:1090+(i%3)*285,y:60+Math.floor(i/3)*140},
     data:{label:safeLabel(n.name)||'Unlabelled graph entity',
       remote_uuid:n.uuid,summary:n.summary,
       authority:'Graphiti extracted entity; not independently verified',
       status:'remote extraction; '+(n.labels||[]).join(', ')}});
   response.edges.push({id:'entity-link-'+n.uuid,source:'episode',target:id,
     label:'extracted from',data:{type:'episode_provenance'}});
 });
 edges.forEach((e,i)=>{
   const source='entity-'+e.source_node_uuid,target='entity-'+e.target_node_uuid;
   if(nodeIDs.has(e.source_node_uuid)&&nodeIDs.has(e.target_node_uuid)){
     response.edges.push({id:'fact-link-'+e.uuid,source,target,
       label:safeLabel(e.fact)||'Graphiti relationship',
       data:{type:'graphiti_extracted_relationship',remote_uuid:e.uuid}});
   }else{
     const id='edge-'+e.uuid;
     response.nodes.push({id,type:'default',className:'review-relation',
       position:{x:1100+(i%3)*280,y:580+Math.floor(i/3)*120},
       data:{label:safeLabel(e.fact)||'Graphiti edge (details unavailable)',
         remote_uuid:e.uuid,
         status:'Real remote edge; endpoints not returned. No endpoints invented.'}});
     response.edges.push({id:'orphan-provenance-'+e.uuid,source:'episode',target:id,
       label:'episode edge',data:{type:'provenance_only'}});
   }
 });
 response.note=base.note+' Verified remote graph readback: '+nodes.length+
   ' entities, '+edges.length+' edges; extracted claims are not independently fact-verified.';
 return response;
}
