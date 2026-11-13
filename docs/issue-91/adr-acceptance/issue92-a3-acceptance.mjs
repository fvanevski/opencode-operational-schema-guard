/** Issue #92 prospective fact-level acceptance: no session-based credit.
 * This is a pure scorer. All evidence must be frozen and independently
 * adjudicated outside the model; absent evidence fails closed, never PASS.
 */
import {createHash} from 'node:crypto';

const sha=s=>createHash('sha256').update(String(s)).digest('hex');
const fail=reason=>{throw Error('A3_ACCEPTANCE_UNVERIFIED:'+reason);};
const unique=(a,label)=>{
 if(new Set(a).size!==a.length)fail('duplicate_'+label);
 return new Set(a);
};
const validHash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const validUuid=s=>typeof s==='string'&&
 /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(s);
export function wilson(successes,total,z=1.96){
 if(!Number.isSafeInteger(successes)||!Number.isSafeInteger(total)||
  successes<0||total<0||successes>total)fail('wilson_bounds');
 if(!total)return {point:null,lower:null,upper:null,n:0};
 const p=successes/total,d=1+z*z/total;
 const c=(p+z*z/(2*total))/d;
 const m=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;
 return {point:p,lower:Math.max(0,c-m),upper:Math.min(1,c+m),n:total};
}
const bool=(x,name)=>{if(typeof x!=='boolean')fail('missing_'+name);return x;};
/**
 * Inputs:
 * roster: sanitized frozen cases with label.valuable, source hashes
 * stage: case_id/event_id/source_ref map frozen before model calls
 * records: COMPLETE ReviewStore list, not just selected episodes
 * remote: positive current get_episodes receipt (UUID set and source index)
 * ratification: independent, pre-inference case label review and freeze
 * adjudications: one independent source/fact usefulness verdict per persisted
 * authority: externally witnessed non-source/privacy/EX/wrong-group events
 */
export function scoreProspective({
 roster,stage,records,remote,ratification,adjudications,authority
}={}){
 if(roster?.schema_version!==1||roster.case_count!==20||
    !Array.isArray(roster.cases)||roster.cases.length!==20||
    roster.valuable!==10||roster.nonvaluable_controls!==10||
    !validHash(roster.private_manifest_sha256)||!validHash(roster.label_freeze_sha256))
  fail('frozen_roster_shape');
 const group=roster.group;
 if(typeof group!=='string'||!/^graphiti-adr92-a3-prospective-[A-Za-z0-9_-]+$/.test(group))
  fail('prospective_group');
 const cases=roster.cases;
 const ids=unique(cases.map(c=>c.id),'case_id');
 unique(cases.map(c=>c.native_event_text_sha256),'source_text_digest');
 const val=cases.filter(c=>c.label?.valuable===true);
 const controls=cases.filter(c=>c.label?.valuable===false);
 if(val.length!==10||controls.length!==10||
    cases.some(c=>!validHash(c.native_event_text_sha256)||
       !validHash(c.source_locator_sha256)||
       typeof c.observed_at!=='string'||!Number.isFinite(Date.parse(c.observed_at))||
       c.label?.prospective!==true||typeof c.label?.predicate!=='string'||
       c.label.predicate.length<8))
  fail('case_source_or_label');
 if(ratification?.schema!=='issue92-a3-ratification-v1'||
    ratification.manifest_sha256!==roster.private_manifest_sha256||
    ratification.label_freeze_sha256!==roster.label_freeze_sha256||
    ratification.group!==group||
    typeof ratification.independent_reviewer!=='string'||
    !ratification.independent_reviewer.trim()||
    !Array.isArray(ratification.cases)||ratification.cases.length!==20||
    typeof ratification.completed_at!=='string'||
    !Number.isFinite(Date.parse(ratification.completed_at))||
    typeof authority?.first_model_intent_at!=='string'||
    !Number.isFinite(Date.parse(authority.first_model_intent_at))||
    !validHash(authority?.first_model_intent_receipt_sha256)||
    Date.parse(ratification.completed_at)>=Date.parse(authority.first_model_intent_at))
  fail('independent_pre_inference_ratification');
 const ratIds=unique(ratification.cases.map(x=>x.case_id),'ratified_case');
 if([...ids].some(id=>!ratIds.has(id))||ratification.cases.some(x=>
    x.source_sha256!==cases.find(c=>c.id===x.case_id)?.native_event_text_sha256||
    x.predicate!==cases.find(c=>c.id===x.case_id)?.label.predicate||
    x.valuable!==cases.find(c=>c.id===x.case_id)?.label.valuable||
    x.original_source_reviewed!==true||x.temporal_scope_reviewed!==true||
    x.privacy_reviewed!==true||x.label_confirmed!==true))
  fail('unratified_case');
 if(stage?.schema!=='issue92-a3-staged-v2'||stage.group!==group||
    stage.manifest_sha256!==roster.private_manifest_sha256||
    !Array.isArray(stage.events)||stage.events.length<20)
  fail('staging_identity');
 const byEvent=new Map(),bySource=new Map(),stagedCases=new Set();
 for(const row of stage.events){
  if(!ids.has(row.case_id)||!validHash(row.event_id)||
     typeof row.source_ref!=='string'||!row.source_ref.startsWith('opencode:')||
     !validHash(row.native_event_text_sha256)||!validHash(row.excerpt_sha256))
   fail('stage_event_identity');
  const c=cases.find(x=>x.id===row.case_id);
  const originalLocator='opencode:'+row.session_id+':message:'+row.message_id;
  if(sha(originalLocator)!==c.source_locator_sha256||
     !(row.source_ref===originalLocator||
       row.source_ref.startsWith(originalLocator+':span:')))
   fail('stage_native_locator_identity_mismatch');
  if(row.native_event_text_sha256!==c.native_event_text_sha256||
     sha(row.source_ref)!==c.source_locator_sha256&&
      row.primary_source_locator_sha256!==c.source_locator_sha256)
   fail('stage_source_binding');
  if(byEvent.has(row.event_id)||bySource.has(row.source_ref))
   fail('duplicate_staged_event');
  byEvent.set(row.event_id,row);bySource.set(row.source_ref,row);
  stagedCases.add(row.case_id);
 }
 if(stagedCases.size!==20)fail('missing_staged_cases');
 if(!Array.isArray(records)||!Array.isArray(adjudications))
  fail('review_records_missing');
 unique(records.map(x=>x.id),'review_id');
 const persisted=records.filter(x=>x.state==='persisted');
 if(!persisted.length)fail('insufficient_review_samples');
 if(records.some(x=>x.group!==group||x.state==='submission_unknown'||
    x.state==='queued'||x.state==='approved'||x.state==='retry_authorized'))
  fail('review_not_terminal_or_wrong_group');
 const uuids=persisted.map(x=>x.remote_episode_uuid);
 if(uuids.some(x=>!validUuid(x)))fail('remote_uuid_invalid');
 unique(uuids,'review_uuid');
 if(remote?.group!==group||remote.source_index_intact!==true||
    !Array.isArray(remote.remote_episode_uuids)||
    !remote.readback_after_persistence||
    unique(remote.remote_episode_uuids,'remote_uuid').size!==uuids.length||
    uuids.some(id=>!remote.remote_episode_uuids.includes(id)))
  fail('remote_membership_or_source_index');
 if(authority?.schema!=='issue92-a3-authority-audit-v1'||
    authority.group!==group||authority.ex_lock_valid!==true||
    authority.no_model_replay!==true||authority.no_unauthorized_graphiti_writes!==true||
    authority.no_privacy_breach!==true||authority.no_wrong_group!==true||
    authority.no_false_verified_claims!==true||
    authority.raw_native_opportunities_verified!==true)
  fail('authority_audit_unverified');
 if(adjudications.length!==persisted.length)
  fail('incomplete_independent_fact_adjudication');
 const byAdjudication=new Map(adjudications.map(x=>[x.record_id,x]));
 unique(adjudications.map(x=>x.record_id),'fact_adjudication');
 if(byAdjudication.size!==persisted.length||
    persisted.some(x=>!byAdjudication.has(x.id)))
  fail('missing_fact_adjudication');
 const covered=new Set(), falsePositives=new Set(),accepted=new Set();
 let grounded=0,independentUseful=0,violations=0,duplicateCount=0;
 for(const rec of persisted){
  if(!Array.isArray(rec.facts)||rec.facts.length!==1||
     !Array.isArray(rec.events)||!Array.isArray(rec.source_event_ids))
   fail('review_not_atomic_or_source_bound');
  const fact=rec.facts[0],sourceRef=fact.source_refs?.[0];
  if(typeof sourceRef!=='string'||fact.source_refs.length!==1||
     typeof fact.assertion!=='string'||fact.assertion.length<25||fact.assertion.length>450)
   fail('fact_shape_or_source');
  const row=bySource.get(sourceRef);
  const event=rec.events.find(e=>e.source_refs?.includes(sourceRef));
  if(!row||!event||!rec.source_event_ids.includes(row.event_id)||
     !rec.source_event_ids.includes(event.event_id)||
     !event.excerpt.includes(fact.assertion)||
     sha(event.excerpt)!==row.excerpt_sha256)
   fail('fact_quotation_not_authentic');
  if(fact.evidence_span){
   const s=fact.evidence_span;
   if(s.source_ref!==sourceRef||!Number.isSafeInteger(s.start)||
      !Number.isSafeInteger(s.end)||s.start<0||s.end>s.start+450||
      event.excerpt.slice(s.start,s.end).trim()!==fact.assertion)
    fail('fact_offsets_invalid');
  }
  const a=byAdjudication.get(rec.id);
  if(a.remote_episode_uuid!==rec.remote_episode_uuid||
     a.source_case_id!==row.case_id||
     a.source_excerpt_sha256!==row.excerpt_sha256||
     !Array.isArray(a.target_case_ids)||
     typeof a.rationale!=='string'||a.rationale.trim().length<12||
     !a.adjudicator||typeof a.adjudicator!=='string')
   fail('adjudication_not_bound');
  const g=bool(a.grounded,'grounded');
  const useful=bool(a.useful,'useful');
  const safe=['privacy_ok','authority_ok','temporal_ok','evidence_class_ok',
   'correct_group','no_false_verified'];
  if(safe.some(k=>!bool(a[k],k)))violations++;
  const targets=unique(a.target_case_ids,'target_case_id');
  if([...targets].some(id=>!ids.has(id)||id!==row.case_id||
     cases.find(c=>c.id===id)?.label.valuable!==true))
   fail('unsupported_target_mapping');
  if(!g&&useful||!g&&targets.size)fail('unsupported_usefulness');
  if(g)grounded++;
  if(a.duplicate_of!==null&&a.duplicate_of!==undefined){
   if(typeof a.duplicate_of!=='string'||a.duplicate_of===rec.id||
      !byAdjudication.has(a.duplicate_of))fail('duplicate_reference');
   duplicateCount++;
  }
  if(useful&&!a.duplicate_of){
   independentUseful++;accepted.add(rec.id);
   for(const id of targets)covered.add(id);
  }
  if(!cases.find(c=>c.id===row.case_id).label.valuable)
   falsePositives.add(row.case_id);
 }
 const recall=wilson(covered.size,val.length);
 const precision=wilson(grounded,persisted.length);
 const useful=wilson(independentUseful,grounded);
 const gates={
  valuable_coverage:recall.point>=0.85,
  // The source of the persisted FACT, not mere review-context siblings,
  // determines whether a negative-control event polluted the graph.
  zero_control_fact_persistence:falsePositives.size===0,
  grounded_precision:precision.point>=0.9,
  useful_among_grounded:useful.point>=0.75&&independentUseful>=8,
  zero_authority_breaches:violations===0,
  terminal_source_integrity:true,
  independently_ratified_labels:true
 };
 return {schema:'issue92-a3-adjudicated-acceptance-v1',group,
  frozen_manifest_sha256:roster.private_manifest_sha256,
  label_freeze_sha256:roster.label_freeze_sha256,
  raw_opportunity_denominator:authority.raw_native_opportunity_denominator??null,
  stats:{valuable_hits:covered.size,valuable_of:val.length,
   nonvaluable_persisted_cases:falsePositives.size,persisted_episodes:persisted.length,
   grounded_facts:grounded,independent_useful_facts:independentUseful,
   duplicate_episodes:duplicateCount,authority_breaches:violations},
  intervals95:{valuable_coverage:recall,grounded_precision:precision,
   useful_among_grounded:useful},gates,
  pass:Object.values(gates).every(Boolean),
  covered_target_ids:[...covered].sort(),
  note:'Fact-level independent source adjudication; session/episode existence never earns target credit'};
}
