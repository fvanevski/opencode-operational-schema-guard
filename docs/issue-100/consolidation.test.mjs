import test from 'node:test';
import assert from 'node:assert/strict';
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
