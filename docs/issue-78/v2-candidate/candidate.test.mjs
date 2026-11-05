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
test('native edit/write/apply_patch receipts are scoped, content-free and tool-reported', () => {
  const base = { sessionID:'ses-files', status:'completed', callID:'call-42',
    result: { output: { exit:0, output:'updated file contents, do not persist this' } } };
  const edit = fromTool({ ...base, tool:'edit',
    input: { filePath:scope.workspace + '/src/core.mjs',
      oldString:'old state', newString:'new state' } }, scope);
  const write = fromTool({ ...base, callID:'call-43', tool:'write',
    input: { path:'docs/design.md', content:'design details are not stored' } }, scope);
  const patch = fromTool({ ...base, callID:'call-44', tool:'apply_patch',
    input: { patch:'*** Begin Patch\n*** Update File: src/core.mjs\n@@\n- old\n+ new\n*** End Patch' } }, scope);
  assert.ok(edit && write && patch);
  assert.equal(edit.kind, 'file_change');
  assert.equal(edit.evidence_class, 'tool-reported');
  assert.equal(edit.source_refs[0], 'opencode:ses-files:tool:call-42');
  assert.match(edit.excerpt, /src\/core\.mjs/);
  assert.doesNotMatch(edit.excerpt, /new state|updated file contents/);
  assert.match(write.excerpt, /docs\/design\.md/);
  assert.match(patch.excerpt, /src\/core\.mjs/);
  assert.equal(fromTool({ ...base, tool:'edit', input:{filePath:'/tmp/outside.mjs'} }, scope), null);
  assert.equal(fromTool({ ...base, tool:'write', input:{filePath:'.env',content:'normal'} }, scope), null);
  assert.equal(fromTool({ ...base, tool:'write', input:{filePath:'src/auth.js',content:'password=example'} }, scope), null);
  assert.equal(fromTool({ ...base, tool:'apply_patch', input:{patch:'*** Begin Patch\n*** Update File: ../../etc/hosts\n*** End Patch'} }, scope), null);
  assert.equal(fromTool({ ...base, callID:undefined, tool:'edit', input:{filePath:'src/a.js'} }, scope), null);
  const failure = fromTool({ ...base, status:'error', callID:'call-45',
    tool:'edit', input:{filePath:'src/core.mjs'} }, scope);
  assert.ok(failure);
  assert.match(failure.excerpt, /tool error/);
});
test('read-only file access does not assert a file change or durable source fact',()=>{
 const base={sessionID:'ses-read',callID:'call-read',tool:'read',status:'completed',
  input:{path:scope.workspace+'/docs/reference.md'},
  result:{output:{exit:0,output:'A file was read; its contents are not a change.'}}};
 assert.equal(fromTool(base,scope),null);
 // The preexisting mutation-only adapter remains available and distinct.
 const write=fromTool({...base,callID:'call-write',tool:'write',
  input:{path:scope.workspace+'/docs/reference.md',content:'Updated documentation.'}},scope);
 assert.ok(write);
 assert.equal(write.kind,'file_change');
 assert.equal(write.evidence_class,'tool-reported');
 assert.doesNotMatch(write.excerpt,/Updated documentation/);
});
test('long assistant text uses bounded whole-message privacy scan before truncation', () => {
  const base = { sessionID:'ses-1', messageID:'msg-long',role:'assistant',status:'completed' };
  const text = 'Identified a reproducible parser failure and fixed the module: ' +
    'A'.repeat(2500);
  const accepted = fromFinishedTurn({...base,text}, scope);
  assert.ok(accepted);
  assert.ok(accepted.excerpt.length <= 1100);
  assert.match(accepted.excerpt, /truncated/);
  assert.equal(fromFinishedTurn({...base, text:text+' password=secret123'}, scope), null);
  assert.equal(fromFinishedTurn({...base, text:'A'.repeat(16001)}, scope), null);
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
test('durable decline counters survive reopening; source identity and kind cannot be forged', () => sandbox(async root => {
  const q = new CandidateQueue(root, scope.group);
  const source = fromPrompt(prompt('Fix the schema decoder and preserve the CLI behavior.'),
    scope, { admitted:true });
  assert.equal((await q.stage({ ...source, event_id:'a'.repeat(64) })).status,'invalid');
  assert.equal((await q.stage({ ...source, evidence_class:'tool-reported' })).status,'invalid');
  assert.equal((await q.stage({ ...source, kind:'tool_outcome' })).status,'invalid');
  assert.equal((await q.stage({ ...source, source_refs:['opencode:ses-1:message:msg-2'] })).status,'invalid');
  const write = fromTool({ sessionID:'ses-1',callID:'call-99',tool:'write',
    status:'completed',input:{filePath:'src/index.mjs'},result:{} }, scope);
  assert.equal((await q.stage(write)).status,'staged');
  await q.recordDrop('pending_prompt_overflow');
  const restarted = new CandidateQueue(root,scope.group);
  assert.equal((await restarted.status()).drops.pending_prompt_overflow,1);
  await assert.rejects(q.recordDrop('untrusted_reason'),/Invalid candidate drop/);
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
test('finished-turn: completed assistant turns bind through the authenticated context surface, deduped by native message ID', () => sandbox(async root => {
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
  const assistantMsg = { id: 'msg-done-1', role: 'assistant',
    parts: [{ type: 'reasoning', text: 'internal deliberation must stay out of the excerpt' },
            { type: 'text', text: 'The stale cache was invalidating the selector; the fix preserves the CLI and the failing test now passes.' }] };
  const userMsg = { id: 'msg-u-1', role: 'user', parts: [{ type: 'text', text: 'fix it' }] };
  for (const cb of session.context) await cb({ sessionID: 'ses-1', system: [],
    messages: [userMsg, assistantMsg] });
  for (const cb of session.context) await cb({ sessionID: 'ses-1', system: [],
    messages: [userMsg, assistantMsg] });
  await stop();
  const q = new CandidateQueue(root, scope.group);
  const entries = await q.list();
  assert.equal(entries.total, 1);
  const ev = entries.items[0];
  assert.equal(ev.kind, 'assistant_turn');
  assert.equal(ev.evidence_class, 'assistant-reported');
  assert.equal(ev.source_strength, 'native-id');
  assert.equal(ev.source_refs[0], 'opencode:ses-1:message:msg-done-1');
  assert.match(ev.excerpt, /invalidating the selector/);
  assert.equal(ev.excerpt.includes('internal deliberation'), false, 'reasoning parts are excluded');
}));
test('admitted user prompts link later tool and assistant events without upgrading authority', () => sandbox(async root => {
  const sessions = {}, tools = {};
  const ctx = { directory:scope.workspace,
    options: {enabled:true,capture:true,group:scope.group,project:scope.project,
      workspace:scope.workspace,stateDir:root,endpoint:'http://127.0.0.1:1/mcp'},
    session:{hook:(name,cb)=>{(sessions[name] ||= []).push(cb);return {dispose:async()=>{}};}},
    tool:{hook:(name,cb)=>{(tools[name] ||= []).push(cb);return {dispose:async()=>{}};}} };
  const stop=await plugin.setup(ctx);
  const original=prompt('Fix the option validation bug while preserving the existing CLI interface.');
  for(const cb of sessions.prompt) await cb(original);
  for(const cb of sessions.context) await cb({sessionID:'ses-1',system:[]});
  for(const cb of tools['execute.after']) await cb(tool('call-work','1 failed during validation',1));
  for(const cb of sessions.context) await cb({sessionID:'ses-1',system:[],
    messages:[{id:'msg-1',role:'user',parts:[{type:'text',text:original.prompt.text}]},
      {id:'msg-complete',role:'assistant',parts:[{type:'text',
      text:'The input schema rejected a valid setting; I corrected validation and the focused test now passes.'}]}]});
  await stop();
  const all=(await new CandidateQueue(root,scope.group).list()).items;
  const user=all.find(x=>x.kind==='user_turn');
  const receipt=all.find(x=>x.kind==='tool_outcome');
  const assistant=all.find(x=>x.kind==='assistant_turn');
  assert.ok(user && receipt && assistant);
  assert.ok(receipt.related_event_ids.includes(user.event_id));
  assert.ok(assistant.related_event_ids.includes(user.event_id));
  assert.equal(receipt.evidence_class,'tool-reported');
  assert.equal(assistant.evidence_class,'assistant-reported');
}));
test('finished-turn: ID-less, short, and secret-bearing assistant messages are not staged', () => sandbox(async root => {
  const session = {}, toolHooks = {};
  const ctx = {
    directory: scope.workspace,
    options: { enabled: true, capture: true, group: scope.group,
      project: scope.project, workspace: scope.workspace, stateDir: root,
      endpoint: 'http://127.0.0.1:1/mcp' },
    session: { hook: (name, cb) => { (session[name] ||= []).push(cb); return {dispose: async()=>{}}; } },
    tool: { hook: (name, cb) => { (toolHooks[name] ||= []).push(cb); return {dispose: async()=>{}}; } },
  };
  const stop = await plugin.setup(ctx);
  for (const cb of session.context) await cb({ sessionID: 'ses-2', system: [], messages: [
    { role: 'assistant', parts: [{ type: 'text', text: 'A completed assistant turn that is long enough to be a candidate.' }] },
    { id: 'msg-short', role: 'assistant', parts: [{ type: 'text', text: 'ok' }] },
    { id: 'msg-secret', role: 'assistant', parts: [{ type: 'text', text: 'I set password=secret123 for the endpoint so the integration can authenticate against the gateway now.' }] },
  ]});
  await stop();
  const q = new CandidateQueue(root, scope.group);
  assert.equal((await q.status()).total, 0);
}));
