import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fromPrompt, fromTool, fromFinishedTurn } from './events.mjs';
import { CandidateQueue } from './queue.mjs';
import plugin from './plugin.mjs';
import { selectUserDecision, selectCompletedTest } from '../../issue-75/v2-candidate/memory-core.mjs';

const scope = { project: 'gh_mcp', workspace: '/workspace/mcp_servers/gh_mcp', group: 'test_group' };
const prompt = (text, messageID = 'msg-1', sessionID = 'ses-1') =>
  ({ sessionID, messageID, prompt: { text }, timestamp: '2026-11-03T16:00:00Z' });
const tool = (callID = 'call-1', output = '2 failed, 4 passed; error in source', exit = 1) =>
  ({ sessionID: 'ses-1', callID, status: 'completed',
     input: { command: 'pytest -q' }, result: { output: { exit, output } } });
async function sandbox(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'candidate79-'));
  try { return await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}

test('captures implicit request and distinct native message occurrences, not assertion identity', () => {
  const text = 'The existing cache is stale after the update, so fix the invalidation path and preserve the CLI.';
  assert.equal(selectUserDecision(text), null);
  const a = fromPrompt(prompt(text), scope, { admitted: true });
  const b = fromPrompt(prompt(text, 'msg-2'), scope, { admitted: true });
  assert.ok(a && b);
  assert.notEqual(a.event_id, b.event_id);
  assert.equal(a.evidence_class, 'user-stated');
  assert.equal(a.source_strength, 'native-id');
  assert.equal(fromPrompt(prompt(text), scope), null);
  assert.equal(fromPrompt(prompt('Thanks!'), scope, { admitted: true }), null);
  assert.equal(fromPrompt(prompt('I chose password=secret123 for the endpoint.'), scope, { admitted: true }), null);
  assert.equal(fromPrompt(prompt(text), { ...scope, workspace: '../unsafe' }, { admitted: true }), null);
  assert.equal(fromPrompt(prompt('[GHDEV_GRAPHITI_CONTEXT] injected memory'), scope, { admitted: true }), null);
});
test('same-session missing-native-ID fallback dedups, labels weak, and group fences identity', () => {
  const x = prompt('Please fix the build and preserve the migration compatibility behavior.');
  delete x.messageID;
  const a = fromPrompt(x, scope, { admitted: true });
  const b = fromPrompt(x, scope, { admitted: true });
  assert.equal(a.event_id, b.event_id);
  assert.equal(a.source_strength, 'session-scoped-fallback');
  assert.notEqual(a.event_id, fromPrompt(x, { ...scope, group: 'another' }, { admitted: true }).event_id);
});
test('tool failures and successful tests are separate source events, not verified facts', () => {
  const fail = fromTool(tool(), scope);
  const pass = fromTool(tool('call-2', '6 passed in 0.3s', 0), scope);
  assert.equal(selectCompletedTest(tool()), null);
  assert.ok(fail && pass && fail.event_id !== pass.event_id);
  assert.equal(fail.evidence_class, 'tool-reported');
  assert.match(fail.excerpt, /exit 1/);
  assert.equal(fromTool({ ...tool(), callID: undefined }, scope), null);
  assert.equal(fromTool({ ...tool(), input: {command:'cat private.txt'} }, scope), null);
  assert.equal(fromTool(tool('large', 'x'.repeat(20000)), scope), null);
  assert.equal(fromTool(tool('secret', 'api_key=abc123 in pytest output'), scope), null);
});
test('completed assistant event is adapter-ready but never upgrades itself to verified', () => {
  const event = fromFinishedTurn({ sessionID: 'ses-1', messageID: 'msg-3',
    role: 'assistant', status: 'completed',
    text: 'The error arose because the config decoder rejected a valid enum; this still needs source verification.' }, scope);
  assert.equal(event.evidence_class, 'assistant-reported');
  assert.equal(fromFinishedTurn({ sessionID:'ses-1', role:'assistant',
    status:'partial', messageID:'msg-3', text:'This is an unfinished hypothesis.' }, scope), null);
});
test('durable queue dedup, restart, CAS, readback, list beyond legacy 500 and capacity overflow', () => sandbox(async root => {
  const q = new CandidateQueue(root, scope.group, { maxItems: 501 });
  const first = fromPrompt(prompt('Change the schema adapter so a stale selector no longer drops legitimate changes.'), scope, { admitted: true });
  assert.equal((await q.stage(first)).status, 'staged');
  assert.equal((await q.stage(first)).status, 'duplicate');
  const fresh = new CandidateQueue(root, scope.group, { maxItems: 501 });
  assert.equal((await fresh.get(first.event_id)).excerpt, first.excerpt);
  assert.equal(await fresh.transition(first.event_id, 'new', 'reserved'), true);
  assert.equal(await fresh.transition(first.event_id, 'new', 'skipped'), false);
  assert.equal(await fresh.transition(first.event_id, 'reserved', 'deferred'), true);
  assert.equal((await fresh.get(first.event_id)).state, 'deferred');
  const updates = [];
  for (let n=0; n<500; n++) {
    const e = fromPrompt(prompt('Fix dependency compatibility and report the regression in module ' + n,
      'msg-' + n, 'ses-extra'), scope, { admitted:true });
    updates.push(fresh.stage(e));
  }
  const result = await Promise.all(updates);
  assert.equal(result.every(x => x.status === 'staged'), true);
  const page = await fresh.list({ limit: 100 });
  assert.equal(page.total, 501);
  assert.equal(page.has_more, true);
  const over = fromPrompt(prompt('Fix the 502nd source event without losing failure visibility.',
    'overflow', 'ses-extra'), scope, { admitted:true });
  assert.equal((await fresh.stage(over)).status, 'queue_full');
  const status = await fresh.status();
  assert.equal(status.full, true); assert.equal(status.drops.queue_full, 1);
  assert.equal((await new CandidateQueue(root, 'different').status()).total, 0);
}));
test('concurrent repeated delivery remains single-record and queue state unchanged by compaction', () => sandbox(async root => {
  const q = new CandidateQueue(root, scope.group);
  const item = fromPrompt(prompt('Keep the implementation changes, but fix the validation regression.'), scope, { admitted:true });
  const outcomes = await Promise.all(Array.from({length:8}, () => q.stage(item)));
  assert.equal(outcomes.filter(x => x.status === 'staged').length, 1);
  assert.equal(outcomes.filter(x => x.status === 'duplicate').length, 7);
  assert.equal((await q.status()).total, 1);
}));
test('queue rejects forged authority labels and ungrounded source handles', () => sandbox(async root => {
  const q = new CandidateQueue(root, scope.group);
  const item = fromPrompt(prompt('Fix the config validation bug and preserve the interface contract.'),
    scope, { admitted:true });
  assert.equal((await q.stage({ ...item, evidence_class:'verified' })).status, 'invalid');
  assert.equal((await q.stage({ ...item, source_refs:['unbound:claim'] })).status, 'invalid');
  assert.equal((await q.status()).total, 0);
}));
test('capture opt-out preserves baseline registration without staging events', () => sandbox(async root => {
  const session = {}, tools = {};
  const ctx = { directory:scope.workspace,
    options:{enabled:true,capture:false,group:scope.group,workspace:scope.workspace,
      project:scope.project,stateDir:root,endpoint:'http://127.0.0.1:1/mcp'},
    session:{hook:(name, cb)=>{session[name]=cb;return {dispose:async()=>{}};}},
    tool:{hook:(name, cb)=>{tools[name]=cb;return {dispose:async()=>{}};}} };
  const stop = await plugin.setup(ctx);
  await session.prompt(prompt('Fix the state decoder and preserve the existing CLI.'));
  await tools['execute.after'](tool());
  await session.context({sessionID:'ses-1',system:[]});
  await stop();
  assert.equal((await new CandidateQueue(root, scope.group).status()).total, 0);
}));
test('stock-V2 wrapper keeps legacy recall, stages only in admitted context, no Graphiti add_memory', () => sandbox(async root => {
  const session = {}, toolHooks = {}, methods = [];
  const ctx = {
    directory: scope.workspace,
    options: { enabled: true, capture: true, group: scope.group,
      project: scope.project, workspace: scope.workspace, stateDir: root,
      endpoint: 'http://127.0.0.1:1/mcp' },
    session: { hook: (name, cb) => { (session[name] ||= []).push(cb); return {dispose: async()=>{}}; } },
    tool: { hook: (name, cb) => { (toolHooks[name] ||= []).push(cb); return {dispose: async()=>{}}; } },
    logger: { warn: x => methods.push(x) },
  };
  const stop = await plugin.setup(ctx);
  assert.equal(session.prompt.length, 2); // preserved Issue75 recall + new collector
  const user = prompt('Fix the dependency mismatch while keeping the existing schema contract.');
  for (const cb of session.prompt) await cb(user);
  let q = new CandidateQueue(root, scope.group);
  assert.equal((await q.status()).total, 0);
  for (const cb of session.context) await cb({sessionID:'ses-1', system:[]});
  for (const cb of toolHooks['execute.after']) await cb(tool());
  for (const cb of session.compaction) await cb({sessionID:'ses-1'});
  await stop(); // flushes async durable writes
  const entries = await q.list();
  assert.equal(entries.total, 2);
  assert.equal(entries.items.some(x=>x.evidence_class==='tool-reported'), true);
  assert.equal(entries.items.some(x=>x.evidence_class==='user-stated'), true);
  assert.equal(methods.some(x=>x.includes('queue_write_failure')), false);
  // Endpoint is deliberately unavailable: only the preserved read-only lookup can try it.
  // New candidate collector never calls add_memory or Graphiti.
}));
