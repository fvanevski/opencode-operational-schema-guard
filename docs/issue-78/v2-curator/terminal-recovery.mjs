/** Read-only remote + authoritative group-journal assessment, with explicit
 * opt-in local-state repair. No Graphiti writes, inference, gate bypass or replay.
 * Anonymous Graphiti queue log identity remains inferential, never verified.
 */
import {createHash} from 'node:crypto';
import {CandidateQueue} from '../v2-candidate/queue.mjs';
import {positiveEpisode} from './worker.mjs';
import {sourcedEpisodeResolver} from './sourced-recall.mjs';
const HEX=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const GROUP=/^cur80_[a-z0-9_-]{3,60}$/;
const digest=s=>createHash('sha256').update(s).digest('hex');
function timeOf(line){
 const date=/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[-+]\d\d:\d\d))/.exec(line);
 if(!date||!Number.isFinite(Date.parse(date[1])))
  throw Error('QUEUE_LOG_TIME_UNVERIFIABLE');
 return date[1];
}
export function assessQueueLog(journal,group){
 if(!GROUP.test(group||'')||typeof journal!=='string'||journal.length>2_000_000)
  throw Error('INVALID_QUEUE_LOG_INPUT');
 const messages=journal.split(/\r?\n/).filter(line=>line.includes('services.queue_service')&&
   line.includes(group)&&line.includes('for group '+group));
 const tasks=[];
 for(const line of messages){
  let action;
  if(line.includes(' - INFO - Processing episode None for group '+group))action='start';
  else if(line.includes(' - ERROR - Failed to process episode None for group '+group+': Expecting value: line 1 column 1 (char 0)'))action='failed';
  else if(line.includes(' - INFO - Successfully processed episode None for group '+group))action='succeeded';
  else continue;
  tasks.push({action,at:timeOf(line)});
 }
 if(tasks.length!==4||tasks.map(x=>x.action).join(',')!=='start,failed,start,succeeded'||
   tasks.some((x,i)=>i&&Date.parse(x.at)<Date.parse(tasks[i-1].at)))
  throw Error('GROUP_QUEUE_TERMINAL_SEQUENCE_NOT_PROVEN');
 const filtered=messages.join('\n')+'\n';
 return {source:'mcp-mux.service/graphiti/services.queue_service',
   journal_sha256:digest(filtered),
   processing_starts:2,processing_failures:1,processing_successes:1,
   failed_at:tasks[1].at,succeeded_at:tasks[3].at,
   identity_binding:'anonymous_group_fifo_inference',
   note:'Graphiti log uses episode None; attribution to each review is a chronological inference, not a direct episode identifier.'};
}
function queuedAt(record){
 const event=record.audit?.find(x=>x.action==='state'&&x.outcome==='queued');
 if(!event||!Number.isFinite(Date.parse(event.at)))throw Error('QUEUED_AUDIT_REQUIRED');
 return Date.parse(event.at);
}
export async function assessOperatorRecovery({store,queue,graphiti,root,group,failedId,
  successId,successUUID,failedRevision,successRevision,journal,apply=false,
  acknowledgeAnonymousOrder=false}={}){
 if(!store||store.group!==group||!queue||!graphiti||!GROUP.test(group||'')||
   !HEX.test(failedId||'')||!HEX.test(successId||'')||failedId===successId||
   !UUID.test(successUUID||'')||
   !Number.isInteger(failedRevision)||!Number.isInteger(successRevision)||
   typeof root!=='string'||!root.startsWith('/'))
  throw Error('INVALID_OPERATOR_RECOVERY_SCOPE');
 const proof=assessQueueLog(journal,group);
 const all=await store.list({limit:500});
 if(all.total!==2||all.items.some(x=>!([failedId,successId].includes(x.id))))
  throw Error('DISPOSABLE_GROUP_EXCLUSIVITY_NOT_PROVEN');
 const failed=await store.get(failedId),success=await store.get(successId);
 if(!failed||!success||failed.group!==group||success.group!==group||
   failed.origin!=='qualification_operator_seed'||success.origin!=='curated'||
   failed.state!=='queued'||success.state!=='queued'||
   failed.revision!==failedRevision||success.revision!==successRevision||
   failed.remote_episode_uuid||success.remote_episode_uuid||
   failed.facts?.length!==1||success.facts?.length!==1||
   failed.source_event_ids?.length<1||success.source_event_ids?.length<1||
   queuedAt(failed)>queuedAt(success))
  throw Error('QUALIFICATION_REVIEW_IDENTITIES_OR_REVISIONS_NOT_PROVEN');
 const q=await queue.status();
 if(q.counts.new||q.counts.reserved||q.counts.submission_unknown||q.counts.queued)
  throw Error('CANDIDATE_QUEUE_NOT_QUIESCENT');
 const readback=await graphiti.call('get_episodes',{group_ids:[group],max_episodes:1000});
 if(!Array.isArray(readback?.episodes))throw Error('GRAPHITI_EPISODE_READBACK_UNAVAILABLE');
 const scoped=readback.episodes.filter(x=>x?.group_id===group);
 if(scoped.length!==1||positiveEpisode(failed,scoped)!==null||
   positiveEpisode(success,scoped)!==successUUID)
  throw Error('REMOTE_GROUP_IDENTITY_UNEXPECTED');
 const plan={status:'READY_FOR_OPERATOR_ATTESTATION',group,
   failed_review_id:failedId,failed_revision:failed.revision,
   successful_review_id:successId,successful_revision:success.revision,
   remote_episode_uuid:successUUID,queue_proof:proof,
   assurance:'anonymous FIFO correspondence inferred, not episode-UUID-proven; remote partial effects of failed task not excluded',
   remote_call_contract:'read-only get_episodes, no model, no Graphiti add_memory'};
 if(!apply)return plan;
 if(acknowledgeAnonymousOrder!==true)
  throw Error('OPERATOR_ACK_ANONYMOUS_ORDER_REQUIRED');
 // Transition independently proven remote success FIRST. It is a safe
 // partial recovery even if the following operator failure CAS is stale.
 const persisted=await store.advance(successId,'queued','persisted',
   {remote_episode_uuid:successUUID});
 if(!persisted)throw Error('SUCCESS_CAS_FAILED');
 const indexed=await sourcedEpisodeResolver(root,group,success.workspace,
   success.project,[successUUID]);
 if(indexed.length!==1||indexed[0].evidenceClass!==success.facts[0].evidence_class)
  throw Error('SUCCESS_SOURCE_INDEX_NOT_CONFIRMED');
 const failureEvidence={
   kind:'graphiti_async_processing_failure',
   identity_binding:'anonymous_group_fifo_inference',
   operator_attested:true,observed_at:proof.failed_at,
   journal_sha256:proof.journal_sha256,
   other_success_episode_uuid:successUUID,
   error_code:'graphiti_json_decode_error',
   reason:'FIFO first task failed JSON decode; second succeeded with uniquely confirmed remote UUID. No replay authorized.'
 };
 const recorded=await store.markExtractionFailure(failedId,failedRevision,failureEvidence);
 return {...plan,status:'RECOVERED_WITH_ATTESTED_FAILURE',
   successful_review_state:(await store.get(successId)).state,
   failed_review_state:recorded.state,success_source_index_confirmed:true,
   note:'Failure disposition preserves sources; no Graphiti mutation and no replay.'};
}
