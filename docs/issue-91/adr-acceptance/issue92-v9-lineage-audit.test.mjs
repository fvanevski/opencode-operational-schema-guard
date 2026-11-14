import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditV9Lineage} from './issue92-v9-lineage-audit.mjs';
const sha=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
function fixture(){
 const group='graphiti-adr92-a3-prospective-v9',cases=[],stageRows=[],clusters=[];
 for(let i=0;i<20;i++){
  const id='v9-'+(i<10?'v':'c')+'-'+String((i%10)+1).padStart(2,'0');
  const session='session-'+(i===2?1:i),msg='msg-'+i;
  const ref='opencode:'+session+':message:'+msg;
  const excerpt='Native source text reports the operational requirement for part '+i+'.';
  const eventId=sha('event'+i),label={valuable:i<10,prospective:true,predicate:'p-'+i+'-technical-rule'};
  cases.push({id,label,observed_at:'2026-11-13T20:00:00Z',
   native_event_text_sha256:sha(excerpt),source_locator_sha256:sha(ref)});
  stageRows.push({case_id:id,source_ref:ref,event_id:eventId,session_id:session,
   message_id:msg,native_event_text_sha256:sha(excerpt),excerpt_sha256:sha(excerpt)});
  const event={event_id:eventId,source_refs:[ref],session_id:session,
   excerpt,state:'new',group,project:'repo',workspace:'/w'};
  if(i===2)clusters[1].events.push(event);
  else clusters.push({id:sha('cluster'+i),group,project:'repo',workspace:'/w',
   session_id:session,events:[event],source_event_ids:[eventId]});
 }
 clusters[1].source_event_ids=clusters[1].events.map(x=>x.event_id);
 const manifest={case_count:20,cases:[]};
 // The pure analyzer checks only manifest count; actual CLI separately checks bytes.
 manifest.cases=cases.map(x=>({id:x.id}));
 const manifestHash=sha(JSON.stringify(manifest)), labelHash=sha('original-labels');
 const roster={group,private_manifest_sha256:manifestHash,label_freeze_sha256:labelHash,
  valuable:10,nonvaluable_controls:10,cases};
 const stage={schema:'issue92-a3-staged-v2',group,manifest_sha256:manifestHash,
  label_freeze_sha256:labelHash,events:stageRows};
 const ratification={group,manifest_sha256:manifestHash,label_freeze_sha256:labelHash};
 const freezeReceipt={group,manifest_sha256:manifestHash,label_freeze_sha256:labelHash};
 const scorecard={group,frozen_manifest_sha256:manifestHash,label_freeze_sha256:labelHash,
  covered_target_ids:[cases[0].id],stats:{persisted_episodes:1}};
 const approvedCluster=clusters[0],approvedEvent=approvedCluster.events[0];
 const item={id:sha('approved-item'),decision:'approved',cluster_id:approvedCluster.id,
  fact:{source_refs:[approvedEvent.source_refs[0]],assertion:approvedEvent.excerpt},
  utility_class:'useful_negative'};
 const plan={schema:'issue92-finite-batch-plan-v1',batch_id:sha('batch'),
  snapshot_sha256:'',items:[item],
  cluster_outcomes:clusters.map(c=>({cluster_id:c.id,fact_ids:c.id===approvedCluster.id?[item.id]:[],
   source_only_outcome:null})),
  calls:[{stage:'discovery'},{stage:'support'},{stage:'utility'}]};
 const snapshot={schema:'issue92-finite-batch-snapshot-v1',group,clusters};
 plan.snapshot_sha256=sha(snapshot);
 const active={batch_id:plan.batch_id,snapshot_sha256:sha(snapshot),group};
 const records=[{id:item.id,state:'persisted',origin_cluster_id:approvedCluster.id,
  remote_episode_uuid:'00000000-0000-4000-8000-000000000001',
  source_event_ids:[approvedEvent.event_id],facts:[{source_refs:approvedEvent.source_refs,
   assertion:approvedEvent.excerpt,temporal_status:'observed'}]}];
 return {manifest,manifestBytesSha256:manifestHash,roster,stage,ratification,
  freezeReceipt,scorecard,active,snapshot,plan,records};
}
test('source and plan lineage resolves one source fact without session fiction',()=>{
 const r=auditV9Lineage(fixture());
 assert.deepEqual(r.internal_integrity_errors,[]);
 assert.deepEqual(r.lineage_discrepancies,[]);
 assert.equal(r.counts.staged_events,20);
 assert.equal(r.counts.distinct_staged_sessions,19);
 assert.equal(r.counts.clusters,19);
 assert.equal(r.counts.multi_event_clusters,1);
 assert.equal(r.counts.persisted_episodes,1);
 assert.equal(r.case_ledger[0].persisted_episodes,1);
 assert.equal(r.persisted[0].case_id,'v9-v-01');
 assert.equal(JSON.stringify(r).includes('Native source text'),false);
 assert.equal(JSON.stringify(r).includes('/w'),false);
});
test('post-staging roster hash mutation remains visible, never repaired',()=>{
 const f=fixture();f.roster.label_freeze_sha256=sha('changed');
 f.ratification.label_freeze_sha256=f.roster.label_freeze_sha256;
 f.scorecard.label_freeze_sha256=f.roster.label_freeze_sha256;
 const r=auditV9Lineage(f);
 assert.ok(r.lineage_discrepancies.includes('STAGE_VS_ROSTER_LABEL_FREEZE'));
 assert.ok(!r.lineage_discrepancies.includes('ROSTER_VS_RATIFICATION_LABEL_DIGEST'));
});
test('scored target lacking persisted source case is flagged',()=>{
 const f=fixture();f.scorecard.covered_target_ids=['v9-v-05'];
 const r=auditV9Lineage(f);
 assert.ok(r.lineage_discrepancies.includes(
  'SCORECARD_TARGET_NOT_PRESENT_IN_PERSISTED_SOURCE_CASES'));
});
test('impossible session/cluster claims are surfaced',()=>{
 const f=fixture();
 f.stage.events[2].session_id='invented-different-session';
 const r=auditV9Lineage(f);
 assert.ok(r.internal_integrity_errors.includes('IMPOSSIBLE_DISTINCT_SESSIONS_VS_CLUSTERS'));
 assert.ok(r.internal_integrity_errors.includes('CLUSTER_STAGE_IDENTITY'));
});
test('persisted record lacking approved identity cannot be called source-proven',()=>{
 const f=fixture();f.records[0].id=sha('different-review-id');
 const r=auditV9Lineage(f);
 assert.ok(r.internal_integrity_errors.includes('PERSISTED_WITHOUT_APPROVED_PLAN_ITEM'));
});
