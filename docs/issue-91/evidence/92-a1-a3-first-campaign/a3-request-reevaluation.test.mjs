import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyFailedReview} from './a3-request-reevaluation.mjs';
const id='a'.repeat(64);
const original = () => ({id, state:'deferred',decision:'DEFER',origin:'curated',facts:[],
  remote_episode_uuid:null,source_event_ids:['source1'],revision:1,reevaluate_requested:false,
  reason:'curator_unavailable_or_invalid',audit:[{action:'curated',outcome:'deferred'}]});
test('only unsent initial model failures are eligible',()=>assert.equal(classifyFailedReview(original()),'fresh'));
test('repeat invocation recognizes correctly audited prior marker',()=>{
  const r=original();r.reevaluate_requested=true;r.revision=2;
  r.reason='Retry after confirmed local model endpoint recovery';r.audit.push({action:'reevaluate',outcome:'deferred'});
  assert.equal(classifyFailedReview(r),'previously_marked');
});
for(const [field,value] of [
  ['state','queued'],['state','approved'],['reason','review_required'],
  ['reevaluate_requested',true],['revision',2],['remote_episode_uuid','remote-id'],
  ['facts',[{assertion:'x'}]],['origin','qualification_operator_seed']]){
  test('blocks unexpected '+field,()=>{const r=original();r[field]=value;assert.throws(()=>classifyFailedReview(r))});
}
test('rejects reset/retry evidence and nonempty audit',()=>{
 const r=original();r.audit.push({action:'operator_retry'});assert.throws(()=>classifyFailedReview(r));
});
