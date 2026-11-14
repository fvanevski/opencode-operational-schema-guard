/** Rebuild prospective source opportunities using the real A1 native
 * capture semantics. Do NOT truncate a native user turn to its first 1090
 * characters, skip full-input privacy checking, or invent a source handle.
 */
import {createHash} from 'node:crypto';
import {fromPromptCandidates} from '../../issue-78/v2-candidate/events.mjs';

const sha=s=>createHash('sha256').update(String(s)).digest('hex');
const assert=(ok,reason)=>{if(!ok)throw Error('A3_NATIVE_SOURCE_UNVERIFIED:'+reason);};
export function prepareProspectiveEvents(manifest,roster){
 assert(manifest?.case_count===20&&Array.isArray(manifest.cases)&&
  manifest.cases.length===20,'manifest_shape');
 assert(roster?.case_count===20&&Array.isArray(roster.cases)&&
  roster.cases.length===20&&roster.valuable===10&&roster.nonvaluable_controls===10,
  'roster_shape');
 assert(manifest.cases.length===roster.cases.length,'case_count');
 const sourceById=new Map(roster.cases.map(x=>[x.id,x]));
 assert(sourceById.size===20,'duplicate_roster_case');
 const seen=new Set(),events=[],stageRows=[],caseEventCounts=new Map();
 for(const c of manifest.cases){
  const frozen=sourceById.get(c.id);
  assert(Boolean(frozen)&&!seen.has(c.id),'unknown_or_duplicate_case');seen.add(c.id);
  assert(typeof c.native_event==='string'&&
   sha(c.native_event)===frozen.native_event_text_sha256,
   'native_text_digest_'+c.id);
  assert(typeof c.session_id==='string'&&typeof c.message_id==='string'&&
   typeof c.source_locator==='string'&&
   sha(c.source_locator)===frozen.source_locator_sha256,
   'original_locator_digest_'+c.id);
  // A source-locator hash does not authorize replacing native session/message
  // identity with a synthetic shared session to reduce cluster count.
  const expectedLocator='opencode:'+c.session_id+':message:'+c.message_id;
  assert(c.source_locator===expectedLocator,
   'native_session_message_locator_mismatch_'+c.id);
  assert(c.label?.valuable===frozen.label?.valuable&&
   c.label?.predicate===frozen.label?.predicate&&
   c.observed_at===frozen.observed_at,'label_or_timestamp_drift_'+c.id);
  assert(typeof c.project==='string'&&typeof c.workspace==='string',
   'scope_missing_'+c.id);
  const scope={group:roster.group,project:c.project,workspace:c.workspace};
  const produced=fromPromptCandidates({sessionID:c.session_id,
   messageID:c.message_id,prompt:{text:c.native_event},
   timestamp:c.observed_at},scope,{admitted:true});
  assert(produced.length>=1&&produced.length<=6,'capture_privacy_or_bounds_'+c.id);
  for(const event of produced){
   assert(event.source_strength==='native-id'&&
    event.evidence_class==='user-stated'&&event.group===roster.group&&
    event.session_id===c.session_id&&
    (event.source_refs[0]===expectedLocator||
     event.source_refs[0].startsWith(expectedLocator+':span:')),
    'source_authority_'+c.id);
   const row={case_id:c.id,event_id:event.event_id,
    source_ref:event.source_refs[0],
    excerpt_sha256:sha(event.excerpt),
    native_event_text_sha256:frozen.native_event_text_sha256,
    primary_source_locator_sha256:frozen.source_locator_sha256,
    session_id:c.session_id,message_id:c.message_id};
   if(stageRows.some(x=>x.event_id===row.event_id||
    x.source_ref===row.source_ref))assert(false,'reused_native_span');
   events.push(event);stageRows.push(row);
  }
  caseEventCounts.set(c.id,produced.length);
 }
 assert(seen.size===20&&caseEventCounts.size===20,'missing_native_cases');
 return {events,stageRows,caseEventCounts:Object.fromEntries(caseEventCounts)};
}
