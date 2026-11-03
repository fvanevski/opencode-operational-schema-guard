#!/usr/bin/env node
/** Replay the already-frozen sanitized 2026-11-03 stock-V2 host sample.
 * No service, model, GitHub, or Graphiti access. Never edit sample labels.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fromPrompt, fromTool, fromFinishedTurn } from './events.mjs';
import { selectUserDecision, selectCompletedTest } from '../../issue-75/v2-candidate/memory-core.mjs';

const sample = JSON.parse(await readFile(new URL(
  '../evidence/79-native-v2-20261103/host-sample-frozen.json', import.meta.url), 'utf8'));
assert.equal(sample.cases.length, 8);
const scope = { group: 'pilot_79_native', project: 'gh_mcp',
  workspace: '/workspace/mcp_servers/gh_mcp' };
const results = sample.cases.map(c => {
  const sessionID = c.session;
  let baseline = false, candidate = false;
  if (c.source === 'user') {
    baseline = Boolean(selectUserDecision(c.text));
    candidate = Boolean(fromPrompt({ sessionID, messageID: c.sourceID,
      prompt: { text:c.text } }, scope, { admitted:true }));
  } else if (c.source === 'assistant') {
    candidate = Boolean(fromFinishedTurn({ sessionID, messageID:c.sourceID,
      role:'assistant', status:'completed', text:c.text }, scope));
  } else if (c.source === 'tool') {
    // Parse the frozen RECEIPT SUMMARY, not a private original stdout trace.
    const match = /^tool exit (\d+); command: (.+?); output: (.*)$/s.exec(c.text);
    assert.ok(match, 'Malformed frozen receipt: ' + c.id);
    const event = { sessionID, callID:c.sourceID, status:'completed',
      tool:'bash', input:{ command:match[2] }, result:{output:{
        exit:Number(match[1]), output:match[3] }} };
    baseline = Boolean(selectCompletedTest(event));
    candidate = Boolean(fromTool(event,scope));
  } else throw Error('Unknown frozen source: ' + c.id);
  return { id:c.id, source:c.source, valuable:c.valuable,
    baseline_selected:baseline, candidate_selected:candidate };
});
const important = results.filter(x=>x.valuable);
const score = key => ({ selected:results.filter(x=>x[key]).length,
  valuable_selected:important.filter(x=>x[key]).length,
  valuable_recall:important.filter(x=>x[key]).length/important.length,
  noisy_selected:results.filter(x=>!x.valuable && x[key]).length });
const out={kind:sample.kind,frozen_at:sample.frozen_at,
  total:results.length,valuable:important.length,
  baseline:score('baseline_selected'),candidate:score('candidate_selected'),
  rows:results};
assert.equal(important.length,7);
assert.equal(out.baseline.valuable_selected,0);
assert.equal(out.candidate.valuable_selected,7);
assert.equal(out.candidate.noisy_selected,1);
console.log(JSON.stringify(out,null,2));
