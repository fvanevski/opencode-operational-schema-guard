#!/usr/bin/env node
/**
 * Read-only Issue #92 V9 lineage audit.
 * Consumes private frozen artifacts and emits NO source excerpts, prompts,
 * credentials, session IDs, workspaces, host paths, or complete UUIDs.
 * It does not score acceptance, alter state, infer, or call Graphiti.
 *
 * node issue92-v9-lineage-audit.mjs STATE_ROOT GROUP MANIFEST ROSTER STAGE
 *   RATIFICATION PUBLISHED_FREEZE_RECEIPT PUBLISHED_SCORECARD
 */
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const sha=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const digestBytes=x=>createHash('sha256').update(x).digest('hex');
const short=x=>typeof x==='string'?x.slice(0,12):null;
const safeGroup=x=>typeof x==='string'&&/^[a-zA-Z0-9_.-]{1,100}$/.test(x);

export function auditV9Lineage({
  manifest,manifestBytesSha256,roster,stage,ratification,
  freezeReceipt,scorecard,active,snapshot,plan,records=[]
}={}){
 const discrepancies=[],internal=[],report=(code)=>discrepancies.push(code);
 const check=(condition,code)=>{if(!condition)internal.push(code);};
 const group=roster?.group;
 // The plan itself does not carry a group field; bind it through the
 // digest-authenticated snapshot and each cluster's exact group identity.
 check(safeGroup(group)&&group===stage?.group&&group===snapshot?.group&&
  group===ratification?.group&&group===freezeReceipt?.group&&
  group===scorecard?.group&&group===active?.group&&
  Array.isArray(snapshot?.clusters)&&
  snapshot.clusters.every(c=>c.group===group),'GROUP_IDENTITY');
 const cases=Array.isArray(roster?.cases)?roster.cases:[];
 const rows=Array.isArray(stage?.events)?stage.events:[];
 const clusters=Array.isArray(snapshot?.clusters)?snapshot.clusters:[];
 const items=Array.isArray(plan?.items)?plan.items:[];
 const outcomes=Array.isArray(plan?.cluster_outcomes)?plan.cluster_outcomes:[];
 const callRefs=Array.isArray(plan?.calls)?plan.calls:[];
 check(cases.length===20&&roster?.valuable===10&&roster?.nonvaluable_controls===10,'ROSTER_CASE_COUNT');
 check(Array.isArray(manifest?.cases)&&manifest.cases.length===20,'MANIFEST_CASE_COUNT');
 check(rows.length>=20&&stage?.schema==='issue92-a3-staged-v2','STAGE_EVENTS');
 check(snapshot?.schema==='issue92-finite-batch-snapshot-v1','SNAPSHOT_SCHEMA');
 check(plan?.schema==='issue92-finite-batch-plan-v1','PLAN_SCHEMA');
 check(active?.batch_id===plan?.batch_id&&active?.snapshot_sha256===sha(snapshot)&&
   plan?.snapshot_sha256===sha(snapshot),'FROZEN_SNAPSHOT_IDENTITY');
 const frozenManifest=roster?.private_manifest_sha256;
 check(frozenManifest===manifestBytesSha256&&frozenManifest===stage?.manifest_sha256&&
   frozenManifest===ratification?.manifest_sha256&&frozenManifest===freezeReceipt?.manifest_sha256&&
   frozenManifest===scorecard?.frozen_manifest_sha256,'MANIFEST_DIGEST_BINDING');
 if(stage?.label_freeze_sha256!==roster?.label_freeze_sha256)
  report('STAGE_VS_ROSTER_LABEL_FREEZE');
 if(stage?.label_freeze_sha256!==freezeReceipt?.label_freeze_sha256)
  report('STAGE_VS_PUBLIC_FREEZE_LABEL_DIGEST');
 if(roster?.label_freeze_sha256!==ratification?.label_freeze_sha256)
  report('ROSTER_VS_RATIFICATION_LABEL_DIGEST');
 if(roster?.label_freeze_sha256!==scorecard?.label_freeze_sha256)
  report('ROSTER_VS_SCORECARD_LABEL_DIGEST');
 const caseById=new Map(cases.map(c=>[c.id,c]));
 check(caseById.size===20,'DUPLICATE_CASE_IDS');
 const stageByRef=new Map(),stageByEvent=new Map(),clusterByEvent=new Map();
 for(const row of rows){
  check(caseById.has(row.case_id),'STAGED_CASE_ABSENT_FROM_ROSTER');
  check(typeof row.source_ref==='string'&&!stageByRef.has(row.source_ref),
    'DUPLICATE_STAGED_SOURCE_REF');
  check(typeof row.event_id==='string'&&!stageByEvent.has(row.event_id),
    'DUPLICATE_STAGED_EVENT');
  stageByRef.set(row.source_ref,row);stageByEvent.set(row.event_id,row);
  if(row.native_event_text_sha256!==caseById.get(row.case_id)?.native_event_text_sha256)
   check(false,'STAGE_ORIGINAL_SOURCE_DIGEST');
 }
 const clusterMap=new Map();
 for(const c of clusters){
  check(typeof c.id==='string'&&!clusterMap.has(c.id),'DUPLICATE_CLUSTERS');
  clusterMap.set(c.id,c);
  check(Array.isArray(c.events)&&c.events.length>0,'EMPTY_CLUSTER');
  for(const event of c.events||[]){
   const row=stageByEvent.get(event.event_id);
   check(row?.source_ref===event.source_refs?.[0]&&
     event.session_id===row?.session_id&&event.session_id===c.session_id,
     'CLUSTER_STAGE_IDENTITY');
   check(!clusterByEvent.has(event.event_id),'EVENT_IN_MULTIPLE_CLUSTERS');
   clusterByEvent.set(event.event_id,c);
  }
 }
 check([...stageByEvent.keys()].every(id=>clusterByEvent.has(id))&&
   [...clusterByEvent.keys()].every(id=>stageByEvent.has(id)),'SNAPSHOT_STAGE_EVENT_SET');
 const distinctSessions=new Set(rows.map(x=>x.session_id)).size;
 check(clusters.length>=distinctSessions,'IMPOSSIBLE_DISTINCT_SESSIONS_VS_CLUSTERS');
 const itemMap=new Map(),itemsByCase=new Map(),recordById=new Map();
 for(const item of items){
  check(typeof item.id==='string'&&!itemMap.has(item.id),'DUPLICATE_PLAN_FACT');
  itemMap.set(item.id,item);
  const cluster=clusterMap.get(item.cluster_id);
  const ref=item.fact?.source_refs?.[0];
  const row=stageByRef.get(ref);
  check(Boolean(cluster&&row&&cluster.events.some(e=>e.source_refs?.[0]===ref)),
   'PLAN_ITEM_NOT_SOURCE_BOUND');
  if(row){
   if(!itemsByCase.has(row.case_id))itemsByCase.set(row.case_id,[]);
   itemsByCase.get(row.case_id).push(item);
  }
 }
 const planApproved=items.filter(x=>x.decision==='approved').length;
 const planDeferred=items.filter(x=>x.decision==='deferred').length;
 const approvedFromOutcomes=outcomes.reduce((a,x)=>a+(x.source_only_outcome?.approved||0),0);
 const sourceOnlyDeferred=outcomes.reduce((a,x)=>a+(x.source_only_outcome?.deferred||0),0);
 const sourceOnlyInvoked=outcomes.filter(x=>x.source_only_outcome?.mode).length;
 const siblingInvoked=outcomes.filter(x=>x.source_only_outcome?.mode==='unrepresented_sibling').length;
 check(outcomes.length===clusters.length,'CLUSTER_OUTCOME_COUNT');
 for(const rec of records){
  check(typeof rec.id==='string'&&!recordById.has(rec.id),'DUPLICATE_REVIEW_RECORD');
  recordById.set(rec.id,rec);
 }
 const persisted=[],persistedByCase=new Map();
 for(const rec of records.filter(x=>x.state==='persisted')){
  const fact=rec.facts?.[0],ref=fact?.source_refs?.[0],row=stageByRef.get(ref);
  const item=itemMap.get(rec.id);
  const cluster=item?clusterMap.get(item.cluster_id):null;
  const event=cluster?.events?.find(e=>e.source_refs?.[0]===ref);
  check(rec.facts?.length===1,'NON_ATOMIC_PERSISTED_RECORD');
  check(item?.decision==='approved'&&item?.fact?.assertion===fact?.assertion&&
    rec.origin_cluster_id===item?.cluster_id,'PERSISTED_WITHOUT_APPROVED_PLAN_ITEM');
  check(Boolean(row&&event&&typeof fact?.assertion==='string'&&
    event.excerpt.includes(fact.assertion)&&
    rec.source_event_ids?.includes(row.event_id)),
    'PERSISTED_FACT_SOURCE_NOT_AUTHENTICATED');
  check(typeof rec.remote_episode_uuid==='string'&&rec.remote_episode_uuid.length>=32,
    'PERSISTED_REMOTE_UUID_MISSING');
  const caseId=row?.case_id??null;
  if(caseId)persistedByCase.set(caseId,(persistedByCase.get(caseId)||0)+1);
  persisted.push({record_digest:short(sha(rec.id)),case_id:caseId,
   cluster_id:short(item?.cluster_id),fact_digest:short(sha(fact?.assertion??'')),
   source_ref_digest:short(sha(ref??'')),remote_uuid_digest:short(sha(rec.remote_episode_uuid??'')),
   temporal_status:fact?.temporal_status??null,
   utility_class:item?.utility_class??null,
   candidate_lane:'UNVERIFIED_WITHOUT_FROZEN_MODEL_REPLY_BINDING'});
 }
 check(persisted.length===scorecard?.stats?.persisted_episodes,'SCORECARD_EPISODE_COUNT');
 const sourcedValuable=new Set([...persistedByCase.keys()].filter(id=>caseById.get(id)?.label?.valuable===true));
 const scoredTargets=new Set(scorecard?.covered_target_ids||[]);
 if([...scoredTargets].some(id=>!sourcedValuable.has(id)))
  report('SCORECARD_TARGET_NOT_PRESENT_IN_PERSISTED_SOURCE_CASES');
 const casesReport=cases.map(c=>{
  const caseRows=rows.filter(x=>x.case_id===c.id);
  const ids=[...new Set(caseRows.map(x=>clusterByEvent.get(x.event_id)?.id).filter(Boolean))];
  const its=itemsByCase.get(c.id)||[];
  return {case_id:c.id,label_in_current_roster:c.label?.valuable===true?'valuable':'control',
   original_native_source_sha256:c.native_event_text_sha256,
   cluster_ids:ids.map(short),cluster_event_counts:ids.map(id=>clusterMap.get(id)?.events?.length),
   staged_event_count:caseRows.length,
   plan_items:its.length,approved_plan_items:its.filter(x=>x.decision==='approved').length,
   deferred_plan_items:its.filter(x=>x.decision==='deferred').length,
   persisted_episodes:persistedByCase.get(c.id)||0,
   review_reasons:[...new Set(its.map(x=>x.review_reason).filter(Boolean))].sort(),
   source_only_mode:ids.map(id=>outcomes.find(x=>x.cluster_id===id)?.source_only_outcome?.mode??null),
   discovery_candidate_count:'NOT_DERIVABLE_FROM_PLAN_ONLY'};
 });
 const stageCounts={};
 for(const call of callRefs)stageCounts[call.stage]=(stageCounts[call.stage]||0)+1;
 return {
  schema:'issue92-v9-read-only-lineage-audit-v1',group,
  identity:{manifest_sha256:frozenManifest,stage_label_freeze_sha256:stage?.label_freeze_sha256,
   scoring_roster_label_freeze_sha256:roster?.label_freeze_sha256,
   published_freeze_label_sha256:freezeReceipt?.label_freeze_sha256,
   published_score_label_sha256:scorecard?.label_freeze_sha256,
   ratification_label_sha256:ratification?.label_freeze_sha256},
  counts:{roster_cases:cases.length,staged_events:rows.length,
   distinct_staged_sessions:distinctSessions,clusters:clusters.length,
   multi_event_clusters:clusters.filter(c=>c.events?.length>1).length,
   plan_items:items.length,approved_plan_items:planApproved,deferred_plan_items:planDeferred,
   persisted_episodes:persisted.length,source_only_invocations:sourceOnlyInvoked,
   source_only_approved:approvedFromOutcomes,source_only_deferred:sourceOnlyDeferred,
   unrepresented_sibling_invocations:siblingInvoked,model_calls_by_stage:stageCounts},
  persisted,case_ledger:casesReport,scorecard_covered_target_ids:[...scoredTargets].sort(),
  lineage_discrepancies:discrepancies,internal_integrity_errors:[...new Set(internal)],
  caveats:['No runtime inference or Graphiti calls are made.',
   'Frozen source semantics and model candidate lanes require independent private adjudication.',
   'A post-staging roster mutation cannot be repaired by this audit.',
   'Case-source persistence is not synonymous with independently useful target coverage.']
 };
}
async function cli(){
 const args=process.argv.slice(2);
 if(args.length!==8)throw Error('USAGE: STATE_ROOT GROUP MANIFEST ROSTER STAGE RATIFICATION FREEZE_RECEIPT SCORECARD');
 const [root,group,manifestPath,rosterPath,stagePath,ratificationPath,
   freezePath,scorePath]=args;
 if(!path.isAbsolute(root)||!safeGroup(group)||args.slice(2).some(x=>!path.isAbsolute(x)))
  throw Error('ABSOLUTE_PATHS_AND_SAFE_GROUP_REQUIRED');
 const read=async p=>JSON.parse(await readFile(p,'utf8'));
 const [manifestBytes,roster,stage,ratification,freezeReceipt,scorecard]=await Promise.all([
  readFile(manifestPath),read(rosterPath),read(stagePath),read(ratificationPath),
  read(freezePath),read(scorePath)]);
 const folder=path.join(root,'issue92-finite-batches-v1',group);
 const active=await read(path.join(folder,'_active.json'));
 if(!/^[a-f0-9]{64}$/.test(active.batch_id))throw Error('INVALID_ACTIVE_BATCH_ID');
 const batch=path.join(folder,active.batch_id);
 const [snapshot,plan]=await Promise.all([read(path.join(batch,'snapshot.json')),
  read(path.join(batch,'plan.json'))]);
 const reviewDir=path.join(root,'curation-v1',group);
 const names=(await readdir(reviewDir)).filter(x=>/^[a-f0-9]{64}\.json$/.test(x));
 const records=await Promise.all(names.map(n=>read(path.join(reviewDir,n))));
 const report=auditV9Lineage({manifest:JSON.parse(manifestBytes.toString('utf8')),
  manifestBytesSha256:digestBytes(manifestBytes),roster,stage,ratification,
  freezeReceipt,scorecard,active,snapshot,plan,records});
 console.log(JSON.stringify(report,null,2));
 if(report.internal_integrity_errors.length||report.lineage_discrepancies.length)process.exitCode=2;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))
 cli().catch(e=>{console.error('V9_LINEAGE_AUDIT_FAILED:'+e.message);process.exitCode=2;});
