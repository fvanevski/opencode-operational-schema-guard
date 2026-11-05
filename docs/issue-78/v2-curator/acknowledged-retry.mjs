/** Operator-attested recovery of one acknowledged but orphaned Graphiti task.
 * Read-only assessment by default. A local CAS authorization is NOT the
 * remote retry; the admitted EX wrapper consumes it once in worker.mjs.
 * Neither Graphiti add_memory nor any replay is callable here.
 */
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {isFixtureGroup} from '../fixture-groups.mjs';
const HEX=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const digest=s=>createHash('sha256').update(s).digest('hex');
const allowedGroup=g=>g==='ghdev_gh_mcp'||isFixtureGroup(g,'recovery');
const remoteName=id=>'curated-v1:'+id;
async function reviews(store){
  const all=[];
  for(let offset=0;;offset+=500){
    const page=await store.list({limit:500,offset});
    all.push(...page.items);
    if(!page.has_more)break;
  }
  return all;
}
function evidenceShape(e){
  return e?.kind==='acknowledged_graphiti_orphaned_task'&&
    e?.identity_binding==='anonymous_group_fifo_inference'&&
    e?.acknowledged_submission===true&&
    e?.prior_process_retired===true&&
    e?.partial_effect_risk_acknowledged===true&&
    HEX.test(e.journal_sha256||'')&&
    HEX.test(e.diagnostic_manifest_sha256||'')&&
    typeof e.original_ack_at==='string'&&
    Number.isFinite(Date.parse(e.original_ack_at))&&
    Number.isSafeInteger(e.prior_backend_pid)&&e.prior_backend_pid>0&&
    Number.isSafeInteger(e.current_backend_pid)&&e.current_backend_pid>0&&
    e.prior_backend_pid!==e.current_backend_pid&&
    Number.isFinite(Date.parse(e.process_retired_at))&&
    Number.isFinite(Date.parse(e.observed_at));
}
export async function assessAcknowledgedRetry({store,graphiti,root,group,
  reviewId,expectedRevision,evidence,apply=false,attest=false,
  acknowledgePartialEffects=false,expectedRemoteSha=null}={}){
  if(!store||store.group!==group||!allowedGroup(group)||
    !HEX.test(reviewId||'')||!Number.isInteger(expectedRevision)||
    expectedRevision<1||typeof root!=='string'||!path.isAbsolute(root)||
    !evidenceShape(evidence))
    throw Error('ACKNOWLEDGED_RETRY_SCOPE_OR_EVIDENCE_INVALID');
  const record=await store.get(reviewId);
  if(!record||record.group!==group||record.state!=='queued'||
    record.remote_episode_uuid||record.revision!==expectedRevision||
    record.orphaned_retry_evidence||record.facts?.length!==1)
    throw Error('ACKNOWLEDGED_RETRY_STATE_OR_REVISION_STALE');
  const ack=record.audit?.filter(x=>x.action==='state'&&x.outcome==='queued')||[];
  const intent=record.audit?.filter(x=>x.action==='state'&&x.outcome==='submission_unknown')||[];
  if(ack.length!==1||intent.length!==1||ack[0].at!==evidence.original_ack_at||
    Date.parse(intent[0].at)>Date.parse(ack[0].at)||
    Date.parse(ack[0].at)>=Date.parse(evidence.process_retired_at)||
    Date.parse(evidence.process_retired_at)>Date.parse(evidence.observed_at))
    throw Error('ACKNOWLEDGED_RETRY_AUDIT_UNVERIFIABLE');
  const result=await graphiti.call('get_episodes',{
    group_ids:[group],max_episodes:1000});
  const entries=result?.episodes;
  if(!Array.isArray(entries)||entries.length>=1000||
    entries.some(x=>x?.group_id!==group||!UUID.test(x?.uuid||'')||
      typeof x?.name!=='string')||
    new Set(entries.map(x=>x.uuid)).size!==entries.length||
    new Set(entries.map(x=>x.name)).size!==entries.length)
    throw Error('ACKNOWLEDGED_RETRY_REMOTE_INVENTORY_UNVERIFIABLE');
  if(entries.some(x=>x.name===remoteName(reviewId)))
    throw Error('ACKNOWLEDGED_RETRY_REMOTE_TARGET_ALREADY_PRESENT');
  const byId=new Map(entries.map(x=>[x.uuid,x]));
  const all=await reviews(store);
  for(const other of all.filter(x=>x.state==='persisted')){
    const remote=byId.get(other.remote_episode_uuid);
    if(!remote||remote.name!==remoteName(other.id))
      throw Error('ACKNOWLEDGED_RETRY_PERSISTED_REMOTE_MISMATCH');
    const indexFile=path.join(root,'curation-v1',group,'_episode-index',
      other.remote_episode_uuid+'.json');
    let indexed;
    try{indexed=JSON.parse(await readFile(indexFile,'utf8'));}
    catch{throw Error('ACKNOWLEDGED_RETRY_PERSISTED_INDEX_UNAVAILABLE');}
    if(indexed.id!==other.id||indexed.remote_episode_uuid!==other.remote_episode_uuid)
      throw Error('ACKNOWLEDGED_RETRY_PERSISTED_INDEX_MISMATCH');
  }
  const fingerprint=digest(entries.map(x=>x.uuid+' '+x.name).sort().join('\n'));
  const plan={status:'DRY_RUN_READY',group,review_id:reviewId,
    revision:record.revision,original_ack_at:ack[0].at,
    remote_episode_count:entries.length,
    persisted_review_count:all.filter(x=>x.state==='persisted').length,
    remote_inventory_sha256:fingerprint,
    meaning:'ACKNOWLEDGED submission; operator authorizes ONE SECOND remote attempt',
    residual_risk:'Anonymous queue identity and unobserved partial graph effects'};
  if(!apply)return plan;
  if(attest!==true||acknowledgePartialEffects!==true||
    expectedRemoteSha!==fingerprint||
    !HEX.test(expectedRemoteSha||''))
    throw Error('EXPLICIT_ACKNOWLEDGED_RETRY_ATTESTATION_REQUIRED');
  const updated=await store.authorizeOrphanedRetry(reviewId,expectedRevision,{
    ...evidence,remote_inventory_sha256:fingerprint,
    operator_attested:true,partial_effect_risk_acknowledged:true
  });
  return {...plan,status:'ONE_ACKNOWLEDGED_RETRY_AUTHORIZED',
    new_revision:updated.revision,updated_state:updated.state,
    graphiti_write_performed:false};
}
