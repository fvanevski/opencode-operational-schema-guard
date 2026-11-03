import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {fromPrompt,fromTool} from '../../v2-candidate/events.mjs';
import {CandidateQueue} from '../../v2-candidate/queue.mjs';
import {ReviewStore} from '../core.mjs';
import {prepareReview} from './prepare-review.mjs';
const group='cur80_reviewtest',scope={group,project:'reviewtest',workspace:'/workspace/reviewtest'};
test('qualification review preserves source identities and never impersonates local model',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'cur80-review-prep-'));
 try{
  const queue=new CandidateQueue(root,group),store=new ReviewStore(root,group);
  const p=fromPrompt({sessionID:'session_1',messageID:'message_1',
   prompt:{text:'Preserve median correctness and CLI compatibility during regression fixes.'},
   timestamp:'2026-11-03T18:00:00Z'},scope,{admitted:true});
  const t=fromTool({sessionID:'session_1',callID:'call_1',status:'completed',
   input:{command:'node --test median.test.mjs'},
   result:{output:{exit:1,output:'1 test fails; median mismatch'}},
   timestamp:'2026-11-03T18:01:00Z'},scope);
  assert.ok(p&&t);await queue.stage(p);await queue.stage(t);
  const result=await prepareReview({queue,store});
  assert.equal(result.status,'PREPARED_REAL_SOURCE_REVIEW');
  assert.equal(result.transitioned,2);
  const review=await store.get(result.id);
  assert.equal(review.origin,'qualification_operator_seed');
  assert.equal(review.audit[0].action,'qualification_operator_seed');
  assert.equal(review.state,'deferred');assert.equal(review.facts.length,0);
  assert.equal((await queue.status()).counts.deferred,2);
  assert.equal((await prepareReview({queue,store})).status,'NO_ELIGIBLE_REAL_CLUSTER');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('weak ID fallback is never promoted into a fake native source',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'cur80-review-weak-'));
 try{
  const queue=new CandidateQueue(root,group),store=new ReviewStore(root,group);
  const e=fromPrompt({sessionID:'session_2',
   prompt:{text:'Do not alter public CLI compatibility for median calculations.'},
   timestamp:'2026-11-03T18:00:00Z'},scope,{admitted:true});
  assert.equal(e.source_strength,'session-scoped-fallback');
  await queue.stage(e);
  assert.equal((await prepareReview({queue,store})).status,'NO_ELIGIBLE_REAL_CLUSTER');
  assert.equal((await queue.status()).counts.new,1);
 }finally{await rm(root,{recursive:true,force:true});}
});
