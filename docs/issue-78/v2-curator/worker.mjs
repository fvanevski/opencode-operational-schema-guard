/** Issue #80: one-shot Graphiti curator, only under the existing EX/quiet-grace gate. */
import { CandidateQueue } from '../v2-candidate/queue.mjs';
import { GraphitiMcp, EXTRACTION_INSTRUCTIONS } from '../../issue-75/v2-candidate/memory-core.mjs';
import { ReviewStore, selectClusters, validateDecision, validateModelDecision, normalizedAssertion } from './core.mjs';
import { curateCluster } from './model.mjs';
const validUUID=s=>typeof s==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(s);
const nameOf=r=>'curated-v1:'+r.id;
async function allRecords(store){
  const out=[];
  for(let offset=0;;offset+=500){
    const page=await store.list({limit:500,offset});
    out.push(...page.items);
    if(!page.has_more)break;
  }
  return out;
}
const admitted=()=>{if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted')
  throw Error('EX_POST_EXIT_ADMISSION_REQUIRED');};
export function episodeBody(record){
  if(record.state!=='approved'&&record.state!=='submission_unknown'&&record.state!=='queued')
    throw Error('Not approved');
  if(!record.facts?.length||record.facts.length>3)throw Error('Invalid approved record');
  return record.facts.map((f,i)=>[
    'Fact '+(i+1)+': '+f.assertion,
    '[Evidence class: '+f.evidence_class+'; Kind: '+f.kind+
    '; Temporal: '+f.temporal_status+'; Observed: '+f.observed_at+']',
    '[Source references: '+f.source_refs.join(', ')+
    '; Scope group: '+record.group+'; Project: '+record.project+']'
  ].join('\n')).join('\n\n');
}
export function positiveEpisode(record, episodes){
  if(!Array.isArray(episodes))throw Error('GRAPHITI_EPISODES_UNAVAILABLE');
  const matches=episodes.filter(e=>e?.group_id===record.group&&e?.name===nameOf(record)&&validUUID(e?.uuid));
  if(matches.length>1)throw Error('DUPLICATE_REMOTE_EPISODE_IDENTITY');
  return matches.length?matches[0].uuid:null;
}
export async function reconcile(store,graphiti,{maxEpisodes=1000}={}){
  admitted();
  const records=(await allRecords(store)).filter(r=>
    ['queued','submission_unknown','retry_authorized'].includes(r.state));
  if(!records.length)return {persisted:0,unresolved:0};
  const reply=await graphiti.call('get_episodes',{group_ids:[store.group],max_episodes:maxEpisodes});
  if(!Array.isArray(reply?.episodes))throw Error('GRAPHITI_EPISODES_UNAVAILABLE');
  let persisted=0,unresolved=0;
  for(const r of records){
    const uuid=positiveEpisode(r,reply.episodes);
    if(uuid){
      if(await store.advance(r.id,r.state,'persisted',{remote_episode_uuid:uuid}))persisted++;
    }else if(r.state!=='retry_authorized')unresolved++;
    // A retry authorization without a remote episode is *eligible local
    // work*, not a pending remote submission. The wrapper must dispatch the
    // EX-admitted one-use attempt, not wait indefinitely for a first try.
  }
  // Recent-window absence never proves non-submission. Do not replay.
  return {persisted,unresolved};
}
async function duplicateState(record,store,graphiti) {
  // Cheap local semantic identity and confirmed remote factual equality.
  const listed=await allRecords(store);
  const ours=new Set(record.facts.map(f=>normalizedAssertion(f.assertion)));
  for(const other of listed){
    if(other.id===record.id||!['persisted','queued','submission_unknown','failed_extraction','retry_authorized'].includes(other.state))continue;
    for(const f of other.facts||[])if(ours.has(normalizedAssertion(f.assertion)))
      return other.state==='failed_extraction'?'LOCAL_PRIOR_FAILED_EXTRACTION_NO_REPLAY':'LOCAL_REPEATED_ASSERTION';
  }
  for(const f of record.facts){
    const matches=await graphiti.call('search_memory_facts',{query:f.assertion,
      group_ids:[record.group],max_facts:12});
    if(!Array.isArray(matches?.facts))throw Error('GRAPHITI_SIMILARITY_UNAVAILABLE');
    for(const hit of matches.facts){
      if(hit.group_id && hit.group_id!==record.group)continue;
      if(normalizedAssertion(hit.fact||'')===normalizedAssertion(f.assertion))
        return 'REMOTE_EXACT_DUPLICATE';
    }
  }
  return null;
}
async function deferValidatedSnapshot(store,record,reason){
  const changed=await store.advance(record.id,'approved','deferred',{
    reason,expected_revision:record.revision});
  return changed?{status:'deferred',reason}:{status:'concurrent_transition'};
}
export async function promoteOne(store,record,graphiti){
  admitted();
  const retry=record.state==='retry_authorized';
  if(record.state!=='approved'&&!retry)return {status:'not_approved'};
  const check=validateDecision({decision:'EMIT',reason:record.reason,
    facts:record.facts},record);
  // A single episode can contain extracted facts with different supporting
  // source classes. Until per-fact remote identities are implemented, keep
  // multi-fact output in operator review instead of misattributing recall.
  if(check.ok&&record.facts.length!==1){
    return retry?{status:'recovery_preflight_blocked',reason:'multi_fact_requires_split'}:
      deferValidatedSnapshot(store,record,'multi_fact_requires_split');
  }
  if(!check.ok){
    return retry?{status:'recovery_preflight_blocked',reason:'validation:'+check.reason}:
      deferValidatedSnapshot(store,record,'validation:'+check.reason);
  }
  let duplicate;
  try{duplicate=await duplicateState(record,store,graphiti);}
  catch(e){
    return retry?{status:'recovery_preflight_blocked',reason:'duplicate_check_unavailable'}:
      deferValidatedSnapshot(store,record,'duplicate_check_unavailable');
  }
  if(duplicate){
    return retry?{status:'recovery_preflight_blocked',reason:duplicate}:
      deferValidatedSnapshot(store,record,duplicate);
  }
  // Verify the positive readback protocol *before* any remote write intent.
  // An incompatible list shape must not first surface after add_memory,
  // when the accepted EX wrapper would have to hold the lease unresolved.
  try {
    const episodes=await graphiti.call('get_episodes',{
      group_ids:[record.group],max_episodes:1000});
    if(!Array.isArray(episodes?.episodes))
      throw Error('GRAPHITI_EPISODES_UNAVAILABLE');
    if(retry){
      const rows=episodes.episodes;
      if(rows.length>=1000||
        rows.some(e=>e?.group_id!==record.group||
          !validUUID(e?.uuid)||typeof e?.name!=='string'||!e.name.trim())||
        new Set(rows.map(e=>e.uuid)).size!==rows.length||
        new Set(rows.map(e=>e.name)).size!==rows.length||
        rows.some(e=>e.name===nameOf(record)))
        throw Error('ACKNOWLEDGED_RETRY_REMOTE_NOT_UNIQUE_OR_ABSENT');
    }
  } catch {
    return retry?{status:'recovery_preflight_blocked',reason:'graphiti_readback_preflight_unavailable'}:
      deferValidatedSnapshot(store,record,'graphiti_readback_preflight_unavailable');
  }
  // Every authorized attempt stages durable intent BEFORE the remote call.
  // The single retry is consumed by this transition; timeout/crash forbids
  // further automatic retries, even if no remote episode can be read back.
  if(!await store.advance(record.id,record.state,'submission_unknown',
    {expected_revision:record.revision}))
    return {status:'concurrent_transition'};
  const args={group_id:record.group,name:nameOf(record),episode_body:episodeBody({
    ...record,state:'submission_unknown'}),source:'text',
    source_description:'source-grounded curator | '+record.id,
    reference_time:record.facts[0].observed_at,
    custom_extraction_instructions:EXTRACTION_INSTRUCTIONS};
  try{
    await graphiti.call('add_memory',args);
    await store.advance(record.id,'submission_unknown','queued');
    return {status:'queued'};
  }catch{
    return {status:'submission_unknown'};
  }
}
// Aggregate usage without logging any source excerpt or model response.
export function tallyModelUsage(stats,reply){
  stats.model_calls++;
  if(Number.isFinite(reply.duration_ms)&&reply.duration_ms>=0)
    stats.model_ms+=reply.duration_ms;
  const u=reply.usage;
  if(u&&Number.isSafeInteger(u.prompt_tokens)&&u.prompt_tokens>=0&&
    Number.isSafeInteger(u.completion_tokens)&&u.completion_tokens>=0){
    stats.usage_reported_calls++;
    stats.prompt_tokens+=u.prompt_tokens;
    stats.completion_tokens+=u.completion_tokens;
  }
  if(Number.isSafeInteger(u?.reasoning_tokens)&&u.reasoning_tokens>=0){
    stats.reasoning_reported_calls++;
    stats.reasoning_tokens+=u.reasoning_tokens;
  }
  if(reply.finish_reason==='length'||reply.finish_reason==='max_tokens')
    stats.length_limited_responses++;
}
export async function runAdmitted({root,group,modelEndpoint,modelId,apiKey='local',
  graphitiEndpoint,queue,store,graphiti,curate=curateCluster,
  modelOptions={},maxClusters=6,maxSeconds=600}={}){
  admitted();
  if(!Number.isInteger(maxClusters)||maxClusters<1||maxClusters>12)throw Error('Invalid cluster bound');
  const deadline=Date.now()+maxSeconds*1000;
  queue??=new CandidateQueue(root,group);
  store??=new ReviewStore(root,group);
  graphiti??=new GraphitiMcp(graphitiEndpoint,{timeoutMs:12000});
  const stats={curated:0,deferred:0,skipped:0,approved:0,queued:0,
    persisted:0,unresolved:0,model_attempts:0,model_calls:0,
    model_errors:0,model_ms:0,prompt_tokens:0,completion_tokens:0,
    usage_reported_calls:0,reasoning_tokens:0,reasoning_reported_calls:0,
    length_limited_responses:0};
  // Resolve any old ambiguous/queued write before accepting more work.
  let result=await reconcile(store,graphiti);
  stats.persisted+=result.persisted;stats.unresolved=result.unresolved;
  if(result.unresolved)return {...stats,status:'unresolved'};
  // Explicit operator re-evaluation is processed by the same admitted
  // worker, not a browser-triggered LLM call. Missing model defers visibly.
  const redo=(await allRecords(store)).filter(x=>
    x.state==='deferred'&&x.reevaluate_requested);
  for(const prior of redo.slice(0,maxClusters)){
    if(Date.now()>deadline-5000)break;
    let response;
    stats.model_attempts++;
    try{const reply=await curate(prior,{endpoint:modelEndpoint,model:modelId,apiKey,
      ...modelOptions});
      response=validateModelDecision(reply.content,prior);
      tallyModelUsage(stats,reply);
    }catch{
      stats.model_errors++;
      response={decision:'DEFER',reason:'curator_unavailable_on_reevaluation',facts:[]};
    }
    const updated=await store.reviseDeferred(prior.id,prior.revision,response);
    if(updated){
      stats.curated++;
      if(updated.state==='deferred')stats.deferred++;
      if(updated.state==='approved')stats.approved++;
      if(updated.state==='skipped')stats.skipped++;
    }
  }
  // A crash between durable review creation and its source-event transitions
  // can leave a strict SUBSET of the same cluster in 'new'. Claim every
  // existing review's source membership BEFORE constructing new cluster IDs,
  // or that subset will hash to a different ID and be curated twice.
  const ownedSources=new Map();
  for(const prior of await allRecords(store)){
    for(const id of prior.source_event_ids||[]){
      if(ownedSources.has(id)&&ownedSources.get(id)!==prior.id)
        throw Error('SOURCE_EVENT_IN_MULTIPLE_REVIEWS');
      ownedSources.set(id,prior.id);
      const row=await queue.get(id);
      if(!row)continue; // An older review may predate this queue instance.
      if(prior.state==='deferred'||prior.state==='skipped'){
        const terminal=prior.state;
        if(row.state==='new'||row.state==='reserved')
          await queue.transition(id,row.state,terminal);
      }else if(['approved','submission_unknown','queued','persisted',
        'failed_extraction','retry_authorized'].includes(prior.state)){
        if(row.state==='new')await queue.transition(id,'new','reserved');
        else if(row.state==='deferred')
          await queue.transition(id,'deferred','reserved');
        await queue.transition(id,'reserved','approved');
      }
    }
  }
  const list=await queue.list({limit:500,states:['new']});
  const clusters=selectClusters(list.items,{maxClusters});
  for(const cluster of clusters){
    if(Date.now()>deadline-5000)break;
    const existing=await store.get(cluster.id);
    if(existing){
      // Crash after durable review creation but before all source transitions:
      // converge the source queue without recalling the model or replaying writes.
      for(const e of cluster.events){
        const state=existing.state==='skipped'?'skipped':
          existing.state==='deferred'?'deferred':'reserved';
        if(state==='reserved'){
          if(await queue.transition(e.event_id,'new','reserved'))
            await queue.transition(e.event_id,'reserved','approved');
        }else await queue.transition(e.event_id,'new',state);
      }
      continue;
    }
    let proposal;
    stats.model_attempts++;
    try{
      const reply=await curate(cluster,{endpoint:modelEndpoint,model:modelId,apiKey,
        ...modelOptions});
      proposal=validateModelDecision(reply.content,cluster);
      tallyModelUsage(stats,reply);
    }catch(e){
      stats.model_errors++;
      proposal={ok:false,decision:'DEFER',facts:[],
        reason:'curator_unavailable_or_invalid'};
    }
    const stored=await store.create(cluster,proposal);
    if(!stored.created)continue;
    stats.curated++;
    if(stored.record.state==='deferred')stats.deferred++;
    if(stored.record.state==='skipped')stats.skipped++;
    if(stored.record.state==='approved')stats.approved++;
    // Every candidate event is still available with immutable source ID.
    // Reservation happens only after the durable review entry exists.
    for(const e of cluster.events){
      const to=stored.record.state==='skipped'?'skipped':
        stored.record.state==='deferred'?'deferred':'reserved';
      if(to==='reserved'){
        if(await queue.transition(e.event_id,'new','reserved'))
          await queue.transition(e.event_id,'reserved','approved');
      }else await queue.transition(e.event_id,'new',to);
    }
  }
  const after=await allRecords(store);
  // The durable review record is authoritative. Restore source-queue
  // admission after operator re-evaluation or a crash between review CAS
  // and individual source transitions. Never replay a Graphiti write.
  for(const entry of after.filter(x=>['approved','submission_unknown','queued','persisted','retry_authorized'].includes(x.state))){
    for(const id of entry.source_event_ids){
      if(!await queue.transition(id,'new','reserved'))
        await queue.transition(id,'deferred','reserved');
      await queue.transition(id,'reserved','approved');
    }
  }
  let recoveryBlocked=false;
  // Process specifically authorized retries first; never grant retry
  // authority implicitly to ordinary approved/queued records.
  const promotable=[
    ...after.filter(x=>x.state==='retry_authorized'),
    ...after.filter(x=>x.state==='approved')
  ];
  for(const entry of promotable){
    if(Date.now()>deadline-5000)break;
    const wrote=await promoteOne(store,entry,graphiti);
    if(wrote.status==='recovery_preflight_blocked'){
      recoveryBlocked=true;break;
    }
    if(wrote.status==='queued')stats.queued++;
    if(wrote.status==='submission_unknown')stats.unresolved++;
    if(wrote.status==='deferred')stats.deferred++;
    if(wrote.status==='submission_unknown')break;
  }
  // Graphiti add_memory ACK only queues asynchronous extraction. Poll while
  // holding the existing EX admission; NEVER call add_memory again on timeout.
  result=await reconcile(store,graphiti);
  stats.persisted+=result.persisted;
  while(result.unresolved&&Date.now()<deadline-5000){
    await new Promise(resolve=>setTimeout(resolve,2500));
    result=await reconcile(store,graphiti);
    stats.persisted+=result.persisted;
  }
  stats.unresolved=result.unresolved+(recoveryBlocked?1:0);
  // A deadline/max-clusters bound may leave approved reviews or candidate
  // source work behind after the remote episode has settled. Do not report a
  // terminal drain to the EX wrapper while eligible work remains.
  const queueLeft=await queue.status();
  const pendingReviews=(await allRecords(store)).some(r=>
    ['approved','retry_authorized'].includes(r.state)||(r.state==='deferred'&&r.reevaluate_requested));
  const localWork=pendingReviews||queueLeft.counts.new>0||
    queueLeft.counts.reserved>0;
  return {...stats,status:stats.unresolved?'unresolved':
    localWork?'incomplete':stats.deferred?'review_required':'settled'};
}
