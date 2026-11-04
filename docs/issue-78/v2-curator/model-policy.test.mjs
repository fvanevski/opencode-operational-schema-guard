import test from 'node:test';
import assert from 'node:assert/strict';
import {modelPolicy} from './model-policy.mjs';

test('unset and unrelated environment preserves exact old curator wire defaults',()=>{
 assert.deepEqual(modelPolicy({}),{});
 assert.deepEqual(modelPolicy({LOCAL_CURATOR_MODEL:'chat-fast',LOCAL_CURATOR_URL:'http://127.0.0.1:8002/v1/chat/completions'}),{});
});
test('reasoning and completion budget are curator-scoped opt-in only',()=>{
 assert.deepEqual(modelPolicy({GHDEV_CURATOR_REASONING_EFFORT:'none',
  GHDEV_CURATOR_MAX_TOKENS:'768'}),{reasoningEffort:'none',maxTokens:768});
 assert.deepEqual(modelPolicy({GHDEV_CURATOR_REASONING_EFFORT:'low'}),
  {reasoningEffort:'low'});
 for(const budget of ['0','-1','255','1601','2.5','NaN','1e3','Infinity']){
  assert.throws(()=>modelPolicy({GHDEV_CURATOR_MAX_TOKENS:budget}),/INVALID_BUDGET/);
 }
 for(const effort of ['high','medium','invalid','NONE']){
  assert.throws(()=>modelPolicy({GHDEV_CURATOR_REASONING_EFFORT:effort}),/INVALID_EFFORT/);
 }
});
