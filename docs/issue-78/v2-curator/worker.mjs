/** Issue #80: one-shot Graphiti curator, only under the existing EX/quiet-grace gate. */
import { CandidateQueue } from '../v2-candidate/queue.mjs';
import { GraphitiMcp, EXTRACTION_INSTRUCTIONS } from '../../issue-75/v2-candidate/memory-core.mjs';
import { ReviewStore, selectClusters, validateDecision, normalizedAssertion } from './core.mjs';
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
  const records=(await allRecords(store)).filter(r=>['queued','submission_unknown'].includes(r.state));
  if(!records.length)return {persisted:0,unresolved:0};
  const reply=await graphiti.call('get_episodes',{group_ids:[store.group],max_episodes:maxEpisodes});
  if(!Array.isArray(reply?.episodes))throw Error('GRAPHITI_EPISODES_UNAVAILABLE');
  let persisted=0,unresolved=0;
  for(const r of records){
    const uuid=positiveEpisode(r,reply.episodes);
    if(uuid){
      if(await store.advance(r.id,r.state,'persisted',{remote_episode_uuid:uuid}))persisted++;
    }else unresolved++;
  }
  // Recent-window absence never proves non-submission. Do not replay.
  return {persisted,unresolved};
}
async function duplicateState(record,store,graphiti) {
  // Cheap local semantic identity and confirmed remote factual equality.
  const listed=await allRecords(store);
  const ours=new Set(record.facts.map(f=>normalizedAssertion(f.assertion)));
  for(const other of listed){
    if(other.id===record.id||!['persisted','queued','submission_unknown'].includes(other.state))continue;
    for(const f of other.facts||[])if(ours.has(normalizedAssertion(f.assertion)))return 'LOCAL_REPEATED_ASSERTION';
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
export async function promoteOne(store,record,graphiti){
  admitted();
  if(record.state!=='approved')return {status:'not_approved'};
  const check=validateDecision({decision:'EMIT',reason:record.reason,
    facts:record.facts},record);
  if(!check.ok){
    await store.advance(record.id,'approved','deferred',{reason:'validation:'+check.reason});
    return {status:'deferred',reason:'validation'};
  }
  let duplicate;
  try{duplicate=await duplicateState(record,store,graphiti);}
  catch(e){
    await store.advance(record.id,'approved','deferred',{reason:'duplicate_check_unavailable'});
    return {status:'deferred',reason:'duplicate_check_unavailable'};
  }
  if(duplicate){
    await store.advance(record.id,'approved','deferred',{reason:duplicate});
    return {status:'deferred',reason:duplicate};
  }
  // Write-intent is durable BEFORE the first remote call: timeout may mean
  // accepted+queued. A retry must reconcile, never call add_memory again.
  if(!await store.advance(record.id,'approved','submission_unknown'))
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
export async function runAdmitted({root,group,modelEndpoint,modelId,apiKey='local',
  graphitiEndpoint,queue,store,graphiti,curate=curateCluster,
  maxClusters=6,maxSeconds=600}={}){
  admitted();
  if(!Number.isInteger(maxClusters)||maxClusters<1||maxClusters>12)throw Error('Invalid cluster bound');
  const deadline=Date.now()+maxSeconds*1000;
  queue??=new CandidateQueue(root,group);
  store??=new ReviewStore(root,group);
  graphiti??=new GraphitiMcp(graphitiEndpoint,{timeoutMs:12000});
  const stats={curated:0,deferred:0,skipped:0,approved:0,queued:0,
    persisted:0,unresolved:0,model_calls:0,model_ms:0};
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
    try{const reply=await curate(prior,{endpoint:modelEndpoint,model:modelId,apiKey});
      response=validateDecision(reply.content,prior);
      stats.model_calls++;stats.model_ms+=reply.duration_ms||0;
    }catch{response={decision:'DEFER',reason:'curator_unavailable_on_reevaluation',facts:[]};}
    const updated=await store.reviseDeferred(prior.id,prior.revision,response);
    if(updated){
      stats.curated++;
      if(updated.state==='deferred')stats.deferred++;
      if(updated.state==='approved')stats.approved++;
      if(updated.state==='skipped')stats.skipped++;
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
    try{
      const reply=await curate(cluster,{endpoint:modelEndpoint,model:modelId,apiKey});
      proposal=validateDecision(reply.content,cluster);
      stats.model_calls++;stats.model_ms+=reply.duration_ms||0;
    }catch(e){
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
  for(const entry of after.filter(x=>x.state==='approved')){
    if(Date.now()>deadline-5000)break;
    const wrote=await promoteOne(store,entry,graphiti);
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
  stats.unresolved=result.unresolved;
  return {...stats,status:result.unresolved?'unresolved':'settled'};
}
