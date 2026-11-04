import test from 'node:test';
import assert from 'node:assert/strict';
import {addReadOnlyGraph} from './graph-preview.mjs';
const uuid='cead04bc-3546-4ba7-8df3-e1b306c38cbd';
const a='0e4bdc3e-812b-4665-a1c4-f946c0c0cf83';
const b='036918fa-d0ca-40ab-bd8d-19eb8c7c79af';
const base={nodes:[{id:'episode'}],edges:[],note:'Source association only.'};
test('confirmed extraction adds real entity and relationship edges without fake nodes',()=>{
 const input={status:'verified_readback',node_count:2,edge_count:1,linked_edge_count:1,
  unlinked_edge_count:0,nodes:[{uuid:a,name:'Median',labels:[]},{uuid:b,name:'CLI',labels:[]}],
  edges:[{uuid,fact:'Median preserves CLI compatibility',source_node_uuid:a,target_node_uuid:b}]};
 const view=addReadOnlyGraph(base,input);
 assert.equal(view.remote_graph.status,'verified_readback');
 assert.ok(view.nodes.find(n=>n.id==='entity-'+a));
 assert.ok(view.edges.find(e=>e.id==='fact-link-'+uuid &&
   e.source==='entity-'+a&&e.target==='entity-'+b));
 assert.equal(view.edges.filter(e=>e.id.startsWith('fact-link-')).length,1);
});
test('unlinked edges remain real remote fact nodes, with no fabricated endpoints',()=>{
 const view=addReadOnlyGraph(base,{status:'verified_readback',node_count:0,
  edge_count:1,linked_edge_count:0,unlinked_edge_count:1,nodes:[],
  edges:[{uuid,fact:'Claim without returned endpoints',source_node_uuid:a,target_node_uuid:b}]});
 assert.ok(view.nodes.find(n=>n.id==='edge-'+uuid));
 assert.ok(!view.edges.some(e=>e.id.startsWith('fact-link-')));
});
test('no remote graph overlay unless exact positive readback is confirmed',()=>{
 const view=addReadOnlyGraph(base,{status:'remote_identity_not_confirmed'});
 assert.equal(view.nodes.length,1);assert.equal(view.edges.length,0);
 assert.equal(view.remote_graph.status,'remote_identity_not_confirmed');
 assert.throws(()=>addReadOnlyGraph({nodes:[],edges:[],note:''},{
   status:'verified_readback',nodes:[],edges:[],node_count:0,edge_count:0}),/unconfirmed/);
});
