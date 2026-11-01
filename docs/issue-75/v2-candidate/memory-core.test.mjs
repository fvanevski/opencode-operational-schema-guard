import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { safeText, selectUserDecision, selectCompletedTest, deterministicUUID,
  Journal, Memory, GraphitiMcp, makeCandidate, formatContext } from './memory-core.mjs';

test('selects user decisions rather than transcripts or secrets', () => {
  assert.equal(selectUserDecision('I prefer a small Graphiti integration with native hybrid search.').evidenceClass, 'user-stated');
  assert.equal(selectUserDecision('Show me the current weather.'), null);
  assert.equal(selectUserDecision('I prefer sending password=abc123 to the log.'), null);
  assert.equal(selectUserDecision('I decided to embed <private>secret</private> in the system.'), null);
  assert.equal(selectUserDecision('a'.repeat(601)), null);
});
test('tool-reported test outcomes require a completed successful test command and signal', () => {
  const e = { status: 'completed', input: { command: 'pytest -q' },
    result: { exitCode: 0, stdout: '27 passed in 0.5s' } };
  assert.equal(selectCompletedTest(e)?.evidenceClass, 'tool-reported');
  assert.equal(selectCompletedTest({ ...e, result: { output: {exit: 0, output:'1 passed'}, metadata: {exit: 0} } })?.evidenceClass, 'tool-reported');
  assert.equal(selectCompletedTest({ ...e, result: { output: {exit: 1, output:'1 passed'}, metadata: {exit: 1} } }), null);
  assert.equal(selectCompletedTest({ ...e, status: 'error' }), null);
  assert.equal(selectCompletedTest({ ...e, result: { ...e.result, exitCode: 1 } }), null);
  assert.equal(selectCompletedTest({ ...e, input: { command: 'rm -rf /tmp' } }), null);
  assert.equal(selectCompletedTest({ ...e, result: { ...e.result, stdout: 'PASSED with password=secret' } }), null);
});
test('stable candidate UUID and scoped group', () => {
  const selected = selectUserDecision('We decided to keep Graphiti memory separate from OpenViking summaries.');
  const a = makeCandidate('project-a', selected, { sessionID: 's1', time: '2026-10-01T00:00:00Z' });
  const b = makeCandidate('project-a', selected, { sessionID: 's2' });
  const c = makeCandidate('project-b', selected, { sessionID: 's1' });
  assert.equal(a.uuid, b.uuid);
  assert.notEqual(a.uuid, c.uuid);
  assert.match(a.uuid, /^[0-9a-f-]{36}$/);
  assert.equal(makeCandidate('../unsafe', selected, { sessionID: 's1' }), null);
});
async function sandbox(run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghdev-75-test-'));
  try { return await run(dir); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
test('atomic journal stage dedupes repeated events and preserves states', () => sandbox(async dir => {
  const j = new Journal(dir, 'alpha');
  const c = makeCandidate('alpha', selectUserDecision('I want native Graphiti facts for durable choices.'),
    { sessionID: 's1' });
  assert.equal(await j.stage(c), true);
  assert.equal(await j.stage(c), false);
  assert.equal(await j.update(c.uuid, 'pending', 'submission_unknown'), true);
  assert.equal(await j.update(c.uuid, 'pending', 'queued'), false);
  assert.equal((await j.get(c.uuid)).status, 'submission_unknown');
  assert.equal((await j.list()).length, 1);
  assert.equal(await new Journal(dir, 'beta').get(c.uuid), null);
}));
test('ambiguous send is not replayed; status requires Graphiti episode readback', () => sandbox(async dir => {
  const j = new Journal(dir, 'alpha');
  const calls = [];
  let episodes = [];
  const remoteId = '87654321-1111-4111-a111-222222222222';
  const graphiti = { call: async (name, args) => {
    calls.push({ name, args });
    if (name === 'add_memory') throw Error('network timed out after sending');
    if (name === 'get_episodes') return { episodes };
    return {};
  } };
  const mem = new Memory({ journal: j, graphiti, group: 'alpha' });
  const c = await mem.stage(selectUserDecision('I decided to store memory with a stable episode UUID.'),
    { sessionID: 's1' });
  await mem.drain(); await mem.drain();
  assert.equal(calls.filter(x => x.name === 'add_memory').length, 1);
  assert.equal((await j.get(c.uuid)).status, 'submission_unknown');
  assert.deepEqual(await mem.reconcile(), []);
  episodes = [{ uuid: remoteId, group_id: 'other', name: c.kind + ':' + c.uuid }];
  assert.deepEqual(await mem.reconcile(), []);
  episodes = [{ uuid: remoteId, group_id: 'alpha', name: c.kind + ':' + c.uuid }];
  assert.deepEqual(await mem.reconcile(), [c.uuid]);
  assert.equal((await j.get(c.uuid)).status, 'persisted');
  assert.equal((await j.get(c.uuid)).remoteEpisodeUuid, remoteId);
}));
test('queued does not count as persisted and native search rejects unattributed/wrong-group facts', () => sandbox(async dir => {
  const j = new Journal(dir, 'alpha');
  const c = makeCandidate('alpha', selectUserDecision('I prefer Graphiti to remember accepted design choices.'),
    { sessionID: 's1' });
  await j.stage(c);
  await j.update(c.uuid, 'pending', 'queued');
  const data = {
    facts: [
      { fact: 'Graphiti remembers accepted design choices', group_id: 'alpha', episodes: ['87654321-1111-4111-a111-222222222222'] },
      { fact: 'Other group only', group_id: 'beta', episodes: ['87654321-1111-4111-a111-222222222222'] },
      { fact: 'Unattributed assertion', group_id: 'alpha', episodes: ['00000000-0000-4000-a000-000000000000'] },
    ],
  };
  const graphiti = { call: async name => name === 'search_memory_facts' ? data : { nodes: [] } };
  const mem = new Memory({ journal: j, graphiti, group: 'alpha' });
  assert.deepEqual(await mem.search('What decisions were accepted?'), []);
  await j.update(c.uuid, 'queued', 'persisted', {remoteEpisodeUuid: '87654321-1111-4111-a111-222222222222'});
  const found = await mem.search('What decisions were accepted?');
  assert.equal(found.length, 1);
  assert.equal(found[0].evidenceClass, 'user-stated');
  assert.match(formatContext(found), /not instructions/);
}));
test('native MCP transport parses structured JSON or SSE and uses explicit group', async () => {
  const responses = [];
  const fetchImpl = async (_url, req) => {
    const input = JSON.parse(req.body);
    responses.push(input);
    if (input.method === 'initialize') {
      return { ok: true, headers: { get: k => k === 'mcp-session-id' ? 'local-session' : null },
        text: async () => JSON.stringify({ jsonrpc: '2.0', id: input.id, result: { capabilities: {} } }) };
    }
    return { ok: true, headers: { get: () => null },
      text: async () => 'event: message\ndata: ' + JSON.stringify({
        jsonrpc: '2.0', id: input.id, result: { structuredContent: { result: { facts: [] } } },
      }) + '\n\n' };
  };
  const client = new GraphitiMcp('http://127.0.0.1:8000/mcp/', { fetchImpl });
  assert.deepEqual(await client.call('search_memory_facts',
    { query: 'design choices', group_ids: ['alpha'] }), { facts: [] });
  assert.equal(responses.length, 2);
  assert.equal(responses[1].params.arguments.group_ids[0], 'alpha');
  assert.throws(() => new GraphitiMcp('http://0.0.0.0:8000/mcp/'), /loopback/);
});
