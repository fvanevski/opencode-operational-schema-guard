import test from 'node:test';
import assert from 'node:assert/strict';
import {modelPolicy} from './model-policy.mjs';

test('unset and unrelated environment preserves exact old curator wire defaults',()=>{
 assert.deepEqual(modelPolicy({}),{});
 assert.deepEqual(modelPolicy({LOCAL_CURATOR_MODEL:'chat-fast',LOCAL_CURATOR_URL:'http://127.0.0.1:8002/v1/chat/completions'}),{});
});
test('chat-fast owns non-thinking; optional output cap does not send reasoning effort',()=>{
 assert.deepEqual(modelPolicy({LOCAL_CURATOR_MODEL:'chat-fast',
  GHDEV_CURATOR_MAX_TOKENS:'768'}),{maxTokens:768});
 assert.throws(()=>modelPolicy({LOCAL_CURATOR_MODEL:'chat-fast',
  GHDEV_CURATOR_REASONING_EFFORT:'none'}),/CHAT_FAST_NO_REASONING_OVERRIDE/);
 assert.throws(()=>modelPolicy({LOCAL_CURATOR_MODEL:'chat-fast',
  GHDEV_CURATOR_REASONING_EFFORT:'low'}),/CHAT_FAST_NO_REASONING_OVERRIDE/);
 assert.deepEqual(modelPolicy({LOCAL_CURATOR_MODEL:'chat-review',
  GHDEV_CURATOR_REASONING_EFFORT:'low'}),{reasoningEffort:'low'});
 assert.deepEqual(modelPolicy({LOCAL_CURATOR_MODEL:'chat-audit',
  GHDEV_CURATOR_REASONING_EFFORT:'medium'}),{reasoningEffort:'medium'});
 assert.throws(()=>modelPolicy({LOCAL_CURATOR_MODEL:'chat',
  GHDEV_CURATOR_REASONING_EFFORT:'low'}),/THINKING_PROFILE_REQUIRED/);
 assert.throws(()=>modelPolicy({GHDEV_CURATOR_REASONING_EFFORT:'low'}),
  /THINKING_PROFILE_REQUIRED/);
 for(const budget of ['0','-1','255','1601','2.5','NaN','1e3','Infinity']){
  assert.throws(()=>modelPolicy({GHDEV_CURATOR_MAX_TOKENS:budget}),/INVALID_BUDGET/);
 }
 for(const effort of ['none','minimal','invalid','NONE']){
  assert.throws(()=>modelPolicy({LOCAL_CURATOR_MODEL:'chat-review',
   GHDEV_CURATOR_REASONING_EFFORT:effort}),/INVALID_EFFORT/);
 }
});
