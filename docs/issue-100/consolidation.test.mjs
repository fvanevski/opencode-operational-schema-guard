import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ReviewStore} from '../issue-78/v2-curator/core.mjs';
import {sourcedEpisodeResolver} from '../issue-78/v2-curator/sourced-recall.mjs';
import {validateAutonomousDecision} from './autonomous-policy.mjs';
import {consolidationTrigger,selectConsolidationPairs,consolidationPrompt,validateConsolidationDecision} from './consolidation.mjs';
const event=(id,phrase,at)=>({
  event_id:id.repeat(64),source_refs:['opencode:ses_100:message:msg_'+id],
  source_strength:'native-id',evidence_class:'user-stated',observed_at:at,
  excerpt:phrase,related_event_ids:[]
});
function record(id,phrase,at,status='provisional_retention'){
  const e=event(id,phrase,at);
  return {id:id.repeat(64),group:'development-knowledge',project:'repo',
    workspace:'/workspace/repo',origin_cluster_id:id.repeat(64),
    source_event_ids:[e.event_id],events:[e],created_at:at,
    state:'persisted',remote_episode_uuid:id.repeat(8)+'-aaaa-bbbb-cccc-'+id.repeat(12),
    facts:[{assertion:phrase,evidence_class:'user-stated',source_refs:e.source_refs,
      observed_at:at,temporal_status:'observed'}],
    retention:{status,revision:1,source_span:{source_ref:e.source_refs[0],start:0,end:phrase.length}}
  };
}
const older=()=>record('a','The cache episode revision is invalid after the database schema changes.','2026-11-16T09:00:00Z');
const newer=()=>record('b','The database cache episode revision requires a new source mapping after schema changes.','2026-11-16T10:00:00Z','established_retention');
test('new independent related persisted source selects only one bounded provisional target',()=>{
  const old=older(), next=newer();
  const items=selectConsolidationPairs([old,next],{limit:2});
  assert.equal(items.length,1);
  assert.equal(items[0].trigger.target_id,old.id);
  assert.equal(items[0].trigger.new_episode_uuid,next.remote_episode_uuid);
  assert.match(consolidationPrompt(items[0])[0].content,/UNTRUSTED DATA/);
});
test('invalid, same-origin, stale and unrelated sources do not schedule an AI pass',()=>{
  const old=older(),next=newer();
  assert.equal(consolidationTrigger(old,{...next,origin_cluster_id:old.origin_cluster_id}),null);
  assert.equal(consolidationTrigger(old,{...next,state:'submission_unknown'}),null);
  assert.equal(consolidationTrigger(old,{...next,created_at:'2026-11-16T08:00:00Z'}),null);
  assert.equal(consolidationTrigger(old,{...next,facts:[{...next.facts[0],observed_at:old.facts[0].observed_at}]}),null);
  assert.equal(consolidationTrigger({...old,retention:{...old.retention,status:'established_retention'}},next),null);
  assert.equal(consolidationTrigger(old,{...next,facts:[{...next.facts[0],assertion:'A wholly separate subject from any other library entirely.'}]}),null);
});
test('model response is a retention recommendation, never a remote mutation',()=>{
  const pair=selectConsolidationPairs([older(),newer()])[0];
  const val=validateConsolidationDecision({trigger_id:pair.trigger.id,
    decision:'logical_retire',reason:'Later source makes the older mapping obsolete'},pair);
  assert.deepEqual({ok:val.ok,decision:val.decision},{ok:true,decision:'logical_retire'});
  assert.equal(validateConsolidationDecision('{bad',pair).ok,false);
  assert.equal(validateConsolidationDecision({trigger_id:'wrong',decision:'promote_retention',reason:'Enough context'},pair).ok,false);
});

test('retention CAS, historical identity, logical exclusion and rollback',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ghdev100-cons-'));
  const beforeLease=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
  try{
    const s=new ReviewStore(root,'development-knowledge');
    async function persisted(id,phrase,time,status,uuid){
      const e=event(id,phrase,time);
      const cluster={id:id.repeat(64),group:'development-knowledge',
        project:'repo',workspace:'/workspace/repo',
        session_id:'ses_100',source_event_ids:[e.event_id],events:[e]};
      const proposal=validateAutonomousDecision({decision:'EMIT',
        reason:'One source-supported observation',
        facts:[{kind:'architecture',temporal_status:'observed',
          source_refs:e.source_refs,evidence_span:{source_ref:e.source_refs[0],
            start:0,end:phrase.length},retention_status:status,
          utility_class:'stable_architecture',
          utility_reason:'Source-grounded technical fact to retain'}]},cluster);
      assert.equal(proposal.ok,true);
      const first=(await s.create(cluster,proposal)).record;
      assert.equal(await s.advance(first.id,'approved','submission_unknown',
        {expected_revision:first.revision}),true);
      await s.advance(first.id,'submission_unknown','queued');
      await s.advance(first.id,'queued','persisted',{remote_episode_uuid:uuid});
      return s.get(first.id);
    }
    const old=await persisted('a',
      'The cache episode revision is invalid after the database schema changes.',
      '2026-11-16T09:00:00Z','provisional_retention',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    const next=await persisted('b',
      'The database cache episode revision requires a new source mapping after schema changes.',
      '2026-11-16T10:00:00Z','established_retention',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    assert.equal((await sourcedEpisodeResolver(root,old.group,
      old.workspace,old.project,[old.remote_episode_uuid])).length,1);
    const pair=selectConsolidationPairs([old,next])[0];
    assert.ok(pair);
    const validated=validateConsolidationDecision({
      trigger_id:pair.trigger.id,decision:'logical_retire',
      reason:'Superseded for current retention by newer source mapping'},pair);
    const result=await s.applyRetentionConsolidation(old.id,old.revision,
      pair.trigger,validated);
    assert.equal(result.status,'applied');
    const changed=await s.get(old.id);
    assert.equal(changed.retention.status,'logically_retired');
    assert.deepEqual(await sourcedEpisodeResolver(root,old.group,
      old.workspace,old.project,[old.remote_episode_uuid]),[]);
    assert.equal(changed.remote_episode_uuid,old.remote_episode_uuid);
    assert.deepEqual(changed.facts,old.facts);
    assert.deepEqual(changed.events,old.events);
    assert.equal((await s.applyRetentionConsolidation(old.id,old.revision,
      pair.trigger,validated)).status,'stale');
    assert.equal((await s.rollbackRetentionConsolidation(old.id,changed.revision)).status,'rolled_back');
    const restored=await s.get(old.id);
    assert.equal(restored.retention.status,'provisional_retention');
    assert.equal((await sourcedEpisodeResolver(root,old.group,
      old.workspace,old.project,[old.remote_episode_uuid])).length,1);
    assert.equal(restored.remote_episode_uuid,old.remote_episode_uuid);
    assert.equal(consolidationTrigger(restored,next),null);
  } finally {
    if(beforeLease===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
    else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=beforeLease;
    await fs.rm(root,{recursive:true,force:true});
  }
});
