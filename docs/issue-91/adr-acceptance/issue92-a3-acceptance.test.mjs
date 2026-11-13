import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {scoreProspective} from './issue92-a3-acceptance.mjs';
import {prepareProspectiveEvents} from './issue92-a3-native-source.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const GROUP='graphiti-adr92-a3-prospective-v2';
const SRC='A native developer report identifies a definite API incompatibility requiring review.';
const uuid=i=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0');
function fixture({persisted=10,longSource=false}={}){
 const cases=[],original=[];
 for(let i=0;i<20;i++){
  const id='case-'+i,session='session'+i,message='message'+i,
   source='opencode:'+session+':message:'+message;
  let body=i===0&&longSource?
   'Detailed technical context with source evidence. '.repeat(30)+
   'Final technical requirement: preserve every original source span in review.':SRC+' Case '+i+'.';
  const valuable=i<10,predicate=valuable?'api_incompatibility_'+i:'routine_control_'+i;
  cases.push({id,native_event_text_sha256:sha(body),source_locator_sha256:sha(source),
   observed_at:'2026-11-10T14:00:00Z',
   label:{valuable,prospective:true,predicate}});
  original.push({id,session_id:session,message_id:message,source_locator:source,
   project:'repo92',workspace:'/workspace/repo92',
   native_event:body,observed_at:'2026-11-10T14:00:00Z',
   label:{valuable,predicate}});
 }
 const manifest={case_count:20,cases:original};
 const roster={schema_version:1,case_count:20,valuable:10,nonvaluable_controls:10,
  group:GROUP,private_manifest_sha256:sha('frozen original corpus'),
  label_freeze_sha256:sha('predeclared labels'),cases};
 const raw=prepareProspectiveEvents(manifest,roster);
 const stage={schema:'issue92-a3-staged-v2',group:GROUP,
  manifest_sha256:roster.private_manifest_sha256,events:raw.stageRows};
 const records=[],adjudications=[],remoteIds=[];
 for(let i=0;i<persisted;i++){
  // Nine independently valuable cases and one deliberately nonvaluable control.
  const caseIndex=i===9?10:i;
  const entry=raw.events.find(e=>e.session_id==='session'+caseIndex);
  assert.ok(entry);
  const id=sha('review'+i),quote=entry.excerpt.slice(0,Math.min(150,entry.excerpt.length));
  const review={id,state:'persisted',group:GROUP,
   remote_episode_uuid:uuid(i),source_event_ids:[entry.event_id],
   events:[{event_id:entry.event_id,source_refs:entry.source_refs,
    excerpt:entry.excerpt}],
   facts:[{assertion:quote,source_refs:entry.source_refs,
    evidence_span:{source_ref:entry.source_refs[0],start:0,end:quote.length}}]};
  records.push(review);remoteIds.push(uuid(i));
  const valuable=caseIndex<10;
  adjudications.push({record_id:id,remote_episode_uuid:uuid(i),
   source_case_id:'case-'+caseIndex,source_excerpt_sha256:sha(entry.excerpt),
   target_case_ids:valuable?['case-'+caseIndex]:[],adjudicator:'independent-operator',
   rationale:'Direct source quotation independently reviewed with original context.',
   grounded:true,useful:valuable,duplicate_of:null,privacy_ok:true,authority_ok:true,
   temporal_ok:true,evidence_class_ok:true,correct_group:true,no_false_verified:true});
 }
 const ratification={schema:'issue92-a3-ratification-v1',
  manifest_sha256:roster.private_manifest_sha256,
  label_freeze_sha256:roster.label_freeze_sha256,group:GROUP,
  independent_reviewer:'independent-operator',
  completed_at:'2026-11-10T17:00:00Z',
  cases:cases.map(c=>({case_id:c.id,source_sha256:c.native_event_text_sha256,
   predicate:c.label.predicate,valuable:c.label.valuable,original_source_reviewed:true,
   temporal_scope_reviewed:true,privacy_reviewed:true,label_confirmed:true}))};
 const remote={group:GROUP,source_index_intact:true,
  readback_after_persistence:true,remote_episode_uuids:remoteIds};
 const authority={schema:'issue92-a3-authority-audit-v1',group:GROUP,
  ex_lock_valid:true,no_model_replay:true,no_unauthorized_graphiti_writes:true,
  no_privacy_breach:true,no_wrong_group:true,no_false_verified_claims:true,
  raw_native_opportunities_verified:true,raw_native_opportunity_denominator:1113,
  first_model_intent_at:'2026-11-10T18:00:00Z',
  first_model_intent_receipt_sha256:sha('actual immutable initial intent')};
 return {manifest,roster,stage,records,adjudications,ratification,remote,authority,raw};
}
const run=f=>scoreProspective(f);
test('native source identity and all 20 labels are preserved',()=>{
 const f=fixture();assert.equal(f.raw.caseEventCounts['case-0'],1);
 assert.equal(f.raw.events.length,20);
 assert.equal(f.raw.stageRows.length,20);
 assert.equal(f.raw.stageRows[0].source_ref,'opencode:session0:message:message0');
});
test('long native text keeps later source opportunities, not only first 1090 chars',()=>{
 const f=fixture({persisted:0,longSource:true});
 assert.ok(f.raw.events.length>20);
 const excerpts=f.raw.events.filter(e=>e.session_id==='session0').map(e=>e.excerpt);
 assert.ok(excerpts.some(s=>s.includes('Final technical requirement')));
});
test('privacy marker in omitted tail vetoes entire native source before staging',()=>{
 const f=fixture({persisted:0});
 f.manifest.cases[1].native_event='Valid beginning with technical predicates. '.repeat(35)+
   ' api_key=NOT_FOR_PERSISTENCE';
 f.roster.cases[1].native_event_text_sha256=sha(f.manifest.cases[1].native_event);
 assert.throws(()=>prepareProspectiveEvents(f.manifest,f.roster),
  /capture_privacy_or_bounds/);
});
test('9 of 10 truly useful grounded facts pass even with grounded nonvaluable control',()=>{
 const f=fixture();const r=run(f);
 assert.equal(r.stats.valuable_hits,9);
 assert.equal(r.stats.nonvaluable_persisted_cases,1);
 assert.equal(r.stats.independent_useful_facts,9);
 assert.equal(r.stats.grounded_facts,10);
 assert.equal(r.intervals95.grounded_precision.point,1);
 assert.equal(r.intervals95.useful_among_grounded.point,.9);
 assert.equal(r.pass,true);
});
test('session-matched but source-mismatched facts never earn target credit',()=>{
 const f=fixture();f.adjudications[0].source_case_id='case-1';
 assert.throws(()=>run(f),/adjudication_not_bound/);
});
test('operator-pending source labels cannot produce prospective PASS',()=>{
 const f=fixture();
 f.ratification.cases[0].label_confirmed=false;
 assert.throws(()=>run(f),/unratified_case/);
});
test('ratification cannot occur after first model intent',()=>{
 const f=fixture();
 f.ratification.completed_at='2026-11-10T19:00:00Z';
 assert.throws(()=>run(f),/independent_pre_inference_ratification/);
});
test('missing independent fact judgments cannot silently become precision',()=>{
 const f=fixture();f.adjudications.pop();
 assert.throws(()=>run(f),/incomplete_independent_fact_adjudication/);
});
test('false unsupported grounding prevents pass despite persistence',()=>{
 const f=fixture();
 f.adjudications[0].grounded=false;f.adjudications[0].useful=false;
 f.adjudications[0].target_case_ids=[];
 const r=run(f);assert.equal(r.pass,false);
 assert.equal(r.stats.valuable_hits,8);
 assert.equal(r.intervals95.grounded_precision.point,.9);
});
test('remote membership and original quote must be positively authenticated',()=>{
 const f=fixture();
 f.remote.remote_episode_uuids.pop();
 assert.throws(()=>run(f),/remote_membership_or_source_index/);
 const g=fixture();g.records[0].facts[0].assertion='Not an original source quotation of an identified fact.';
 assert.throws(()=>run(g),/fact_quotation_not_authentic/);
});
test('authority breach is a hard failure independently of numeric targets',()=>{
 const f=fixture();f.adjudications[0].privacy_ok=false;
 assert.equal(run(f).pass,false);
 assert.equal(run(f).stats.authority_breaches,1);
});
test('duplicate episodes do not inflate independently useful-fact floor',()=>{
 const f=fixture();for(let i=1;i<4;i++){
  f.adjudications[i].duplicate_of=f.adjudications[0].record_id;
  f.adjudications[i].target_case_ids=[];
 }
 const r=run(f);assert.equal(r.stats.independent_useful_facts,6);
 assert.equal(r.pass,false);
});

test('native freeze refuses relabeling an original message into a shared synthetic session',()=>{
 const f=fixture({persisted:0});
 f.manifest.cases[0].session_id='shared_cluster_session';
 assert.throws(()=>prepareProspectiveEvents(f.manifest,f.roster),
  /native_session_message_locator_mismatch/);
});
test('A3 scorer rejects synthetic staged session even if original locator hash survives',()=>{
 const f=fixture();
 f.stage.events[0].session_id='shared_cluster_session';
 assert.throws(()=>run(f),/stage_native_locator_identity_mismatch/);
});

test('A3 original-source staging preserves split native fragment offsets and full message digest',()=>{
 const f=fixture({persisted:0});
 const native='The cache must reject stale writes.\r\n'+
  '<openviking-context>remembered assistant analysis</openviking-context>\n'+
  'The revision counter must be checked before a writer advances.';
 f.manifest.cases[0].native_event=native;
 f.roster.cases[0].native_event_text_sha256=sha(native);
 const result=prepareProspectiveEvents(f.manifest,f.roster);
 const rows=result.stageRows.filter(r=>r.case_id==='case-0');
 const events=result.events.filter(e=>e.session_id==='session0');
 assert.equal(rows.length,2);
 assert.equal(events.length,2);
 for(let i=0;i<rows.length;i++){
  const start=Number(/:span:(\d+)$/.exec(rows[i].source_ref)?.[1]);
  assert.equal(native.slice(start,start+events[i].excerpt.length),events[i].excerpt);
  assert.equal(rows[i].native_event_text_sha256,sha(native));
  assert.equal(rows[i].excerpt_sha256,sha(events[i].excerpt));
  assert.equal(rows[i].source_ref,events[i].source_refs[0]);
  assert.ok(!events[i].excerpt.includes('remembered assistant analysis'));
 }
});
test('A3 source freeze fails closed on natural-language secrets despite long source staging',()=>{
 const f=fixture({persisted:0});
 const raw='The architecture requires authenticated source spans. '.repeat(25)+
  'The Graphiti password is DEMO_VALUE_DO_NOT_USE';
 f.manifest.cases[0].native_event=raw;
 f.roster.cases[0].native_event_text_sha256=sha(raw);
 assert.throws(()=>prepareProspectiveEvents(f.manifest,f.roster),
  /capture_privacy_or_bounds_case-0/);
});
