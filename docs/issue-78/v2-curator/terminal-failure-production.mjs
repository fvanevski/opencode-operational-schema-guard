/** Incident-specific production disposition: no remote writes, no retry authority.
 * The old development graph is deliberately NOT migrated into development-knowledge.
 * A bounded anonymous FIFO log + positive neighboring receipts are required.
 */
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const HEX=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const LEGACY_GROUP='ghdev_gh_mcp';
const sha256=x=>createHash('sha256').update(x).digest('hex');
const nameOf=id=>'curated-v1:'+id;
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const QUEUE_START=' - INFO - Processing episode None for group ';
const QUEUE_OK=' - INFO - Successfully processed episode None for group ';
const QUEUE_FAIL=' - ERROR - Failed to process episode None for group ';

async function allRecords(store){
  const out=[];
  for(let offset=0;;offset+=500){
    const page=await store.list({limit:500,offset});
    out.push(...page.items);
    if(!page.has_more)break;
  }
  return out;
}
function queuedAt(r){
  const events=r.audit?.filter(a=>a.action==='state'&&a.outcome==='queued')||[];
  if(events.length!==1||!iso(events[0].at))throw Error('TERMINAL_ACK_AUDIT_UNVERIFIABLE');
  return events[0].at;
}
/** Extract only the exact group's queue-service lifecycle, preserving raw line order. */
export function verifySixTaskJournal(raw,group,startAt,endAt,failedAt){
  if(group!==LEGACY_GROUP||typeof raw!=='string'||raw.length>4_000_000||
    !iso(startAt)||!iso(endAt)||!iso(failedAt)||
    Date.parse(endAt)-Date.parse(startAt)>1_800_000||
    Date.parse(endAt)<=Date.parse(startAt))
    throw Error('TERMINAL_JOURNAL_SCOPE_INVALID');
  const events=[];
  for(const line of raw.split(/\r?\n/)){
    if(!line.includes('services.queue_service')||!line.includes('for group '+group))continue;
    let kind=null;
    if(line.includes(QUEUE_START+group))kind='start';
    else if(line.includes(QUEUE_OK+group))kind='success';
    else if(line.includes(QUEUE_FAIL+group+': Expecting value: line 1 column 1 (char 0)'))
      kind='failure';
    if(!kind)continue;
    const stamp=/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d))/.exec(line);
    if(!stamp)throw Error('TERMINAL_JOURNAL_TIMESTAMP_UNVERIFIABLE');
    const when=Date.parse(stamp[1]);
    if(!Number.isFinite(when))throw Error('TERMINAL_JOURNAL_TIMESTAMP_UNVERIFIABLE');
    if(when>=Date.parse(startAt)&&when<=Date.parse(endAt))
      events.push({kind,at:new Date(when).toISOString()});
  }
  if(events.length!==12)throw Error('TERMINAL_JOURNAL_EXPECTED_SIX_COMPLETE_TASKS');
  for(let i=0;i<6;i++){
    const start=events[2*i],end=events[2*i+1];
    if(start.kind!=='start'||end.kind!==(i===4?'failure':'success')||
      Date.parse(start.at)>Date.parse(end.at)||
      (i>0&&Date.parse(events[2*i-1].at)>Date.parse(start.at)))
      throw Error('TERMINAL_FIFO_LIFECYCLE_UNVERIFIABLE');
  }
  if(Math.abs(Date.parse(events[9].at)-Date.parse(failedAt))>1000)
    throw Error('TERMINAL_FAILURE_TIMESTAMP_MISMATCH');
  return {task_count:6,failed_position:5,success_count:5,
    failed_at:events[9].at,last_success_at:events[11].at};
}
function validateEvidence(e,reviewId){
  if(!e||e.kind!=='graphiti_async_processing_failure'||
    e.identity_binding!=='anonymous_group_fifo_inference'||
    e.error_code!=='graphiti_json_decode_error'||
    !HEX.test(e.journal_sha256||'')||
    !iso(e.failed_at)||!iso(e.window_start_at)||!iso(e.window_end_at)||
    !Array.isArray(e.ordered_review_ids)||e.ordered_review_ids.length!==6||
    new Set(e.ordered_review_ids).size!==6||
    !e.ordered_review_ids.every(x=>HEX.test(x))||
    e.ordered_review_ids[4]!==reviewId||
    !HEX.test(e.success_review_id||'')||
    e.success_review_id!==e.ordered_review_ids[5]||
    !UUID.test(e.other_success_episode_uuid||'')||
    e.source_event_count!==8||
    e.serial_fifo_verified!==true||
    e.other_group_interleaving_excluded!==true||
    typeof e.reason!=='string'||e.reason.trim()!==e.reason||
    e.reason.length<12||e.reason.length>300)
    throw Error('TERMINAL_PRODUCTION_EVIDENCE_INVALID');
}
export async function assessProductionTerminalFailure({
  store,graphiti,root,group,reviewId,expectedRevision,evidence,journal,
  apply=false,acknowledgeFifo=false,acknowledgePartialEffects=false,
  expectedRemoteSha=null
}={}){
  if(group!==LEGACY_GROUP||store?.group!==group||typeof root!=='string'||
    !path.isAbsolute(root)||!HEX.test(reviewId||'')||
    !Number.isInteger(expectedRevision)||expectedRevision<1)
    throw Error('TERMINAL_PRODUCTION_SCOPE_INVALID');
  validateEvidence(evidence,reviewId);
  if(typeof journal!=='string'||sha256(journal)!==evidence.journal_sha256)
    throw Error('TERMINAL_JOURNAL_DIGEST_MISMATCH');
  const timeline=verifySixTaskJournal(journal,group,
    evidence.window_start_at,evidence.window_end_at,evidence.failed_at);
  const records=await allRecords(store),byId=new Map(records.map(r=>[r.id,r]));
  const target=byId.get(reviewId),neighbor=byId.get(evidence.success_review_id);
  if(!target||target.group!==group||target.state!=='queued'||
    target.revision!==expectedRevision||target.remote_episode_uuid||
    target.facts?.length!==1||target.source_event_ids?.length!==evidence.source_event_count||
    target.orphaned_retry_evidence)
    throw Error('TERMINAL_TARGET_STATE_OR_REVISION_STALE');
  if(!neighbor||neighbor.group!==group||neighbor.state!=='persisted'||
    neighbor.remote_episode_uuid!==evidence.other_success_episode_uuid)
    throw Error('TERMINAL_NEIGHBOR_NOT_POSITIVELY_PERSISTED');
  const ordered=evidence.ordered_review_ids.map(id=>byId.get(id));
  if(ordered.some((r,i)=>!r||r.group!==group||r.facts?.length!==1||
    (i===4?r.state!=='queued':r.state!=='persisted')))
    throw Error('TERMINAL_SIX_REVIEW_STATES_UNVERIFIABLE');
  const ackTimes=ordered.map(r=>Date.parse(queuedAt(r)));
  if(ackTimes.some((n,i)=>i>0&&n<=ackTimes[i-1])||
    ackTimes[5]-ackTimes[0]>2000||
    Math.abs(ackTimes[0]-Date.parse(evidence.window_start_at))>5000)
    throw Error('TERMINAL_ACK_FIFO_CORRESPONDENCE_UNVERIFIABLE');
  const remote=await graphiti.call('get_episodes',{group_ids:[group],max_episodes:1000});
  const rows=remote?.episodes;
  if(!Array.isArray(rows)||rows.length>=1000||
    rows.some(e=>e?.group_id!==group||!UUID.test(e?.uuid||'')||
      typeof e?.name!=='string'||!e.name.trim())||
    new Set(rows.map(e=>e.uuid)).size!==rows.length||
    new Set(rows.map(e=>e.name)).size!==rows.length)
    throw Error('TERMINAL_REMOTE_INVENTORY_UNVERIFIABLE');
  if(rows.some(e=>e.name===nameOf(reviewId)))
    throw Error('TERMINAL_TARGET_REMOTE_EPISODE_PRESENT');
  const remoteByUUID=new Map(rows.map(e=>[e.uuid,e]));
  for(const r of records.filter(x=>x.state==='persisted')){
    const row=remoteByUUID.get(r.remote_episode_uuid);
    if(!row||row.name!==nameOf(r.id))
      throw Error('TERMINAL_PERSISTED_EPISODE_MISMATCH');
    const indexFile=path.join(root,'curation-v1',group,'_episode-index',
      r.remote_episode_uuid+'.json');
    let index;
    try{index=JSON.parse(await readFile(indexFile,'utf8'));}
    catch{throw Error('TERMINAL_PERSISTED_SOURCE_INDEX_UNAVAILABLE');}
    if(index.id!==r.id||index.remote_episode_uuid!==r.remote_episode_uuid)
      throw Error('TERMINAL_PERSISTED_SOURCE_INDEX_MISMATCH');
  }
  const fingerprint=sha256(rows.map(e=>e.uuid+' '+e.name).sort().join('\n'));
  const plan={status:'TERMINAL_FAILURE_DRY_RUN_READY',group,review_id:reviewId,
    revision:expectedRevision,source_event_count:target.source_event_ids.length,
    remote_episode_count:rows.length,remote_inventory_sha256:fingerprint,
    journal_sha256:evidence.journal_sha256,
    persisted_review_count:records.filter(x=>x.state==='persisted').length,
    fifo:timeline,
    identity_binding:'anonymous_group_fifo_inference',
    partial_graph_effect_risk:'NOT_EXCLUDED',
    graphiti_write_performed:false};
  if(!apply)return plan;
  if(!acknowledgeFifo||!acknowledgePartialEffects||
    !HEX.test(expectedRemoteSha||'')||expectedRemoteSha!==fingerprint)
    throw Error('TERMINAL_PRODUCTION_OPERATOR_ATTESTATION_REQUIRED');
  const after=await store.markExtractionFailure(reviewId,expectedRevision,{
    kind:evidence.kind,identity_binding:evidence.identity_binding,
    operator_attested:true,journal_sha256:evidence.journal_sha256,
    other_success_episode_uuid:evidence.other_success_episode_uuid,
    observed_at:timeline.failed_at,error_code:evidence.error_code,
    reason:evidence.reason
  });
  if(after.state!=='failed_extraction'||after.revision!==expectedRevision+1||
    after.remote_episode_uuid||after.source_event_ids?.join(',')!==
      target.source_event_ids.join(','))
    throw Error('TERMINAL_PRODUCTION_POST_CAS_INVARIANT_BROKEN');
  return {...plan,status:'TERMINAL_FAILURE_RECORDED',
    new_revision:after.revision,updated_state:after.state,
    graphiti_write_performed:false};
}
