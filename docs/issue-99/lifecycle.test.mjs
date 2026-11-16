import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize} from './audit-lifecycle.mjs';
const id=n=>n.toString(16).padStart(64,'0');
const e=(n,state='new')=>({event_id:id(n),state,group:'fixture',project:'p',workspace:'/tmp/p'});
const r=(n,source,state='persisted',origin=n)=>({id:id(n),origin_cluster_id:id(origin),
  source_event_ids:[id(source)],state,group:'fixture',project:'p',workspace:'/tmp/p',
  remote_episode_uuid:'11111111-1111-1111-1111-111111111111'});
test('sibling fact reviews use one origin without false cross-ownership',()=>{
  const s=summarize([e(1,'approved'),e(2)], [r(3,1,'persisted',8),r(4,1,'deferred',8)]);
  assert.equal(s.multiple_origin_source_ids,0);
  assert.equal(s.owned_source_files,1);
  assert.equal(s.actionable_source_files,1);
});
test('conflicting ownership, wrong scope, missing source remain visible',()=>{
  const s=summarize([e(1,'approved'),e(2,'approved')],
    [r(3,1),{...r(4,1),workspace:'/tmp/other'},r(5,9)]);
  assert.equal(s.multiple_origin_source_ids,1);
  assert.equal(s.wrong_scope_source_ids,1);
  assert.equal(s.review_references_absent_source,1);
  assert.equal(s.unowned_nonactionable_files,1);
});
test('ambiguous remote submissions are not terminal proof',()=>{
  const s=summarize([e(1,'approved')],[r(3,1,'submission_unknown')]);
  assert.equal(s.ambiguous_review_files,1);
  assert.equal(s.persisted_reviews_with_uuid,0);
});
