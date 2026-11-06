import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { Journal, makeCandidate, selectUserDecision } from './memory-core.mjs';
import plugin, { promptText } from './plugin.mjs';

// Minimal mock MCP server: records which tools/call methods the plugin
// invokes so we can prove the active session performs NO Graphiti add_memory.
async function startMockMcp(searchFacts = []) {
  const calls = [];
  const searchQueries = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let msg;
      try { msg = JSON.parse(body); } catch { res.writeHead(400); return res.end(); }
      calls.push(msg.method === 'tools/call' ? 'tools/call:' + msg.params.name : msg.method);
      if (msg.method === 'tools/call' && msg.params.name === 'search_memory_facts')
        searchQueries.push(msg.params.arguments?.query);
      let result;
      if (msg.method === 'initialize') result = { capabilities: {} };
      else if (msg.method === 'tools/call') {
        if (msg.params.name === 'search_memory_facts')
          result = { structuredContent: { result: { facts: searchFacts } } };
        else result = { structuredContent: { result: {} } };
      } else result = {};
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  return { url: `http://127.0.0.1:${port}/mcp`, calls, searchQueries,
    close: () => new Promise((r) => server.close(r)) };
}
function makeCtx(options) {
  const hooks = { session: {}, tool: {} };
  const handle = { dispose: async () => {} };
  const ctx = {
    options,
    session: { hook: (name, cb) => { hooks.session[name] = cb; return handle; } },
    tool: { hook: (name, cb) => { hooks.tool[name] = cb; return handle; } },
  };
  return { ctx, hooks };
}
async function withPlugin(options, run, searchFacts = []) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gh75-plugin-'));
  options.stateDir = dir;
  const mcp = await startMockMcp(searchFacts);
  options.endpoint = mcp.url;
  const { ctx, hooks } = makeCtx(options);
  let cleanup;
  try {
    cleanup = await plugin.setup(ctx);
    await run({ ctx, hooks, mcp, dir });
  } finally {
    if (cleanup) await cleanup();
    await mcp.close();
    await rm(dir, { recursive: true, force: true });
  }
}
const DECISION = 'I prefer a small Graphiti integration with native hybrid search.';
const PASS_TOOL = { status: 'completed', tool: 'shell', sessionID: 's1',
  input: { command: 'pytest -q' },
  result: { output: { exit: 0, output: '12 passed in 0.4s' }, metadata: { exit: 0 } } };

test('active session stages a decision + passing tool result, never calls add_memory', async () => {
  await withPlugin({ enabled: true, capture: true, group: 'g_issue75_b75' }, async ({ hooks, mcp, dir }) => {
    // 1) A genuine user decision reaches an admitted prompt context.
    await hooks.session.prompt({ sessionID: 's1', prompt: { text: DECISION } });
    // 2) A completed, passing test tool outcome (real V2 nested receipt).
    await hooks.tool['execute.after'](PASS_TOOL);
    // 3) Context build injects (empty here) and flushes the pending decision.
    await hooks.session.context({ sessionID: 's1', system: [] });
    // No write path runs while the agent is active.
    assert.ok(!mcp.calls.includes('tools/call:add_memory'), 'active session must not call add_memory');
    assert.ok(mcp.calls.includes('tools/call:search_memory_facts'), 'context build performs a read-only search');
    const rows = (await new Journal(dir, 'g_issue75_b75').list());
    assert.equal(rows.length, 2, 'one decision + one tool outcome staged');
    const byKind = Object.fromEntries(rows.map((r) => [r.kind, r]));
    assert.equal(byKind.user_decision.evidenceClass, 'user-stated');
    assert.equal(byKind.test_outcome.evidenceClass, 'tool-reported');
    assert.match(byKind.user_decision.sourceRef, /^opencode:s1:/);
    assert.equal(rows.every((r) => r.status === 'pending'), true, 'all staged rows stay pending (no drain)');
  });
});

test('JSON-encoded V2 prompt wire is decoded for capture and retrieval', async () => {
  assert.equal(promptText(JSON.stringify(DECISION)), DECISION);
  assert.equal(promptText(DECISION), DECISION);
  assert.equal(promptText('"bad-unterminated'), '');
  assert.equal(promptText(JSON.stringify({text:DECISION})), '');
  await withPlugin({ enabled:true, capture:true, group:'g_issue75_b75' }, async ({ hooks, dir, mcp }) => {
    await hooks.session.prompt({ sessionID:'s4', prompt:{ text:JSON.stringify(DECISION) } });
    await hooks.session.context({ sessionID:'s4', system:[] });
    const rows = await new Journal(dir, 'g_issue75_b75').list();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].assertion, DECISION);
    assert.deepEqual(mcp.searchQueries, [DECISION], 'retrieval uses decoded prompt, not transport JSON');
  });
});
test('real prompt/context path injects only source-linked persisted closure memory', async () => {
  const query = 'What was our agreed evidence requirement before closing Issue #75?';
  const decision = 'For this workflow, we decided that Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.';
  const fact = 'Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.';
  const remote = '81dd997d-4ff5-4e94-9bf7-4ca087e1c5a4';
  await withPlugin({ enabled: true, capture: true, group: 'ghdev_gh_mcp' },
    async ({ hooks, mcp, dir }) => {
      const journal = new Journal(dir, 'ghdev_gh_mcp');
      const candidate = makeCandidate('ghdev_gh_mcp', selectUserDecision(decision),
        { sessionID: 's-fresh', time: '2026-11-03T01:07:32Z' });
      assert.ok(candidate);
      assert.equal(await journal.stage(candidate), true);
      assert.equal(await journal.update(candidate.uuid, 'pending', 'persisted',
        { remoteEpisodeUuid: remote }), true);
      await hooks.session.prompt({ sessionID: 's-fresh', prompt: { text: query } });
      const system = [{ type: 'text', text: '[preexisting OpenViking context]' }];
      await hooks.session.context({ sessionID: 's-fresh', system });
      const injected = system.filter(part => part.type === 'text' &&
        part.text.startsWith('[GHDEV_GRAPHITI_CONTEXT]'));
      assert.equal(injected.length, 1, 'public context hook must inject the sourced fact');
      assert.match(injected[0].text, /Issue 75 closes only after/);
      assert.match(injected[0].text, /user-stated/);
      assert.match(injected[0].text, /current state not independently verified/);
      assert.match(injected[0].text, new RegExp(candidate.sourceRef));
      assert.ok(system.some(part => part.text.includes('OpenViking')),
        'existing context must remain intact');
      assert.ok(!mcp.calls.includes('tools/call:add_memory'),
        'interactive recall cannot run extraction');
    },
    [{ fact, group_id: 'ghdev_gh_mcp', episodes: [remote] }]);
});

test('secrets/private markers are excluded from capture', async () => {
  await withPlugin({ enabled: true, capture: true, group: 'g_issue75_b75' }, async ({ hooks, dir, mcp }) => {
    await hooks.session.prompt({ sessionID: 's2', prompt: { text: 'I decided to send password=supersecret123 to the log.' } });
    await hooks.session.context({ sessionID: 's2', system: [] });
    assert.equal((await new Journal(dir, 'g_issue75_b75').list()).length, 0, 'secret-laden decision not staged');
    assert.ok(!mcp.calls.includes('tools/call:add_memory'));
  });
});

test('opt-out (capture=false) registers hooks but stages nothing', async () => {
  await withPlugin({ enabled: true, capture: false, group: 'g_issue75_b75' }, async ({ hooks, dir, mcp }) => {
    await hooks.session.prompt({ sessionID: 's3', prompt: { text: DECISION } });
    await hooks.tool['execute.after'](PASS_TOOL);
    await hooks.session.context({ sessionID: 's3', system: [] });
    assert.equal((await new Journal(dir, 'g_issue75_b75').list()).length, 0, 'no capture when opted out');
    assert.ok(!mcp.calls.includes('tools/call:add_memory'));
  });
});

test('disabled plugin registers no hooks and performs no work', async () => {
  await withPlugin({ enabled: false, group: 'g_issue75_b75' }, async ({ hooks }) => {
    assert.equal(hooks.session.prompt, undefined, 'no prompt hook when disabled');
    assert.equal(hooks.tool['execute.after'], undefined, 'no tool hook when disabled');
  });
});


test('long auxiliary prompt cannot replace source-bound fresh native user recall', async () => {
  const query = 'What was our agreed evidence requirement before closing Issue #75?';
  const decision = 'We decided that Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.';
  const fact = 'Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.';
  const episode = '11111111-2222-4333-a444-555555555555';
  await withPlugin({ enabled:true, capture:false, group:'development-knowledge' },
    async ({ hooks, dir, mcp }) => {
      const row = makeCandidate('development-knowledge', selectUserDecision(decision),
        { sessionID:'s-aux', time:'2026-11-05T00:00:00Z' });
      assert.ok(row);
      const journal = new Journal(dir, 'development-knowledge');
      assert.equal(await journal.stage(row), true);
      assert.equal(await journal.update(row.uuid, 'pending', 'persisted',
        { remoteEpisodeUuid:episode }), true);
      await hooks.session.prompt({sessionID:'s-aux', messageID:'msg-real',
        prompt:{text:query}});
      await hooks.session.prompt({sessionID:'s-aux',
        prompt:{text:'Auxiliary title request '+ 'irrelevant '.repeat(70)}});
      const system = [{type:'text', text:'[preexisting OpenViking context]'}];
      const messages = [{role:'user', id:'msg-real', parts:[{type:'text',text:query}]}];
      await hooks.session.context({sessionID:'s-aux',messages,system});
      const memory = system.filter(p => p.text?.startsWith('[GHDEV_GRAPHITI_CONTEXT]'));
      assert.equal(memory.length,1);
      assert.match(memory[0].text,/source-attributed Graphiti persistence/);
      assert.match(memory[0].text,/source=opencode:s-aux:/);
      assert.ok(system.some(p => p.text.includes('OpenViking')));
      assert.deepEqual(mcp.searchQueries,[query],
        'overlong auxiliary text never starts a search or replaces user association');
      assert.equal(mcp.calls.includes('tools/call:add_memory'),false);
      await hooks.session.context({sessionID:'s-aux',messages,system});
      assert.equal(system.filter(p=>p.text?.startsWith('[GHDEV_GRAPHITI_CONTEXT]')).length,1,
        'repeated context builds remove prior Graphiti block before injecting');
    }, [{fact,group_id:'development-knowledge',episodes:[episode]}]);
});

test('interleaved short auxiliary prompts match the current native user, not session latest', async () => {
  const query='What was our agreed evidence requirement before closing Issue #75?';
  const fact='Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.';
  const decision='We decided that Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.';
  const episode='22222222-3333-4444-a555-666666666666';
  await withPlugin({enabled:true,capture:false,group:'development-knowledge'},
    async ({hooks,dir,mcp})=>{
      const journal=new Journal(dir,'development-knowledge');
      const row=makeCandidate('development-knowledge',selectUserDecision(decision),
        {sessionID:'s-short',time:'2026-11-05T00:00:00Z'});
      assert.ok(row);
      assert.equal(await journal.stage(row),true);
      assert.equal(await journal.update(row.uuid,'pending','persisted',
        {remoteEpisodeUuid:episode}),true);
      await hooks.session.prompt({sessionID:'s-short',messageID:'msg-user',
        prompt:{text:query}});
      await hooks.session.prompt({sessionID:'s-short',messageID:'msg-title',
        prompt:{text:'What title should describe this unrelated Tokyo weather report?'}});
      const messages=[{role:'user',id:'msg-user',parts:[{type:'text',text:query}]}];
      const system=[];
      await hooks.session.context({sessionID:'s-short',messages,system});
      assert.equal(system.filter(p=>p.text?.startsWith('[GHDEV_GRAPHITI_CONTEXT]')).length,1,
        'native user ID selects the correct prewarmed search, even after auxiliary search');
      assert.ok(mcp.searchQueries.includes(query));
      assert.ok(mcp.searchQueries.some(q=>q.includes('Tokyo weather')));
      const unknown=[{role:'user',id:'msg-unrelated',
        parts:[{type:'text',text:'What was a different user discussing?'}]}];
      const unrelatedSystem=[];
      await hooks.session.context({sessionID:'s-short',messages:unknown,system:unrelatedSystem});
      assert.equal(unrelatedSystem.some(p=>p.text?.startsWith('[GHDEV_GRAPHITI_CONTEXT]')),false,
        'no arbitrary reuse for an unbound user message');
      const ambiguousSystem=[];
      await hooks.session.context({sessionID:'s-short',system:ambiguousSystem});
      assert.equal(ambiguousSystem.some(p=>p.text?.startsWith('[GHDEV_GRAPHITI_CONTEXT]')),false,
        'legacy no-message path fails closed when two same-session prompts exist');
      assert.equal(mcp.calls.includes('tools/call:add_memory'),false);
    },[{fact,group_id:'development-knowledge',episodes:[episode]}]);
});

test('rejected long prompt without native message history fails closed instead of reusing stale context', async () => {
  const query='What was our agreed evidence requirement before closing Issue #75?';
  const fact='Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.';
  const decision='We decided that Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.';
  const episode='33333333-4444-4555-a666-777777777777';
  await withPlugin({enabled:true,capture:false,group:'development-knowledge'},
    async ({hooks,dir})=>{
      const journal=new Journal(dir,'development-knowledge');
      const row=makeCandidate('development-knowledge',selectUserDecision(decision),
        {sessionID:'s-no-native',time:'2026-11-05T00:00:00Z'});
      assert.ok(row);
      assert.equal(await journal.stage(row),true);
      assert.equal(await journal.update(row.uuid,'pending','persisted',
        {remoteEpisodeUuid:episode}),true);
      await hooks.session.prompt({sessionID:'s-no-native',prompt:{text:query}});
      await hooks.session.prompt({sessionID:'s-no-native',
        prompt:{text:'Another independent prompt '+ 'long content '.repeat(55)}});
      const system=[];
      await hooks.session.context({sessionID:'s-no-native',system});
      assert.equal(system.some(p=>p.text?.startsWith('[GHDEV_GRAPHITI_CONTEXT]')),false,
        'no native message identity: invalid later prompt forbids stale fallback');
    },[{fact,group_id:'development-knowledge',episodes:[episode]}]);
});

test('rejected replacement native ID tombstones only its own recall, including private edits', async () => {
  const query = 'What was our agreed evidence requirement before closing Issue #75?';
  const decision = 'We decided that Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.';
  const fact = 'Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.';
  const episode = '44444444-5555-4666-a777-888888888888';
  await withPlugin({ enabled: true, capture: false, group: 'development-knowledge' },
    async ({ hooks, dir, mcp }) => {
      const journal = new Journal(dir, 'development-knowledge');
      const row = makeCandidate('development-knowledge', selectUserDecision(decision),
        { sessionID: 's-edit', time: '2026-11-05T00:00:00Z' });
      assert.ok(row);
      assert.equal(await journal.stage(row), true);
      assert.equal(await journal.update(row.uuid, 'pending', 'persisted',
        { remoteEpisodeUuid: episode }), true);
      const userMessage = (id, text) => [{ role: 'user', id,
        parts: [{ type: 'text', text }] }];
      const blocks = system => system.filter(p => p.text?.startsWith('[GHDEV_GRAPHITI_CONTEXT]'));
      // A distinct same-session user prompt must survive another native ID's edit.
      await hooks.session.prompt({ sessionID: 's-edit', messageID: 'msg-other',
        prompt: { text: query } });
      for (const rejected of [
        '<private>Do not use or recall this message.</private>',
        'ok',
        'Long replacement ' + 'unrelated '.repeat(65),
        '"malformed-transport-string',
      ]) {
        await hooks.session.prompt({ sessionID: 's-edit', messageID: 'msg-edited',
          prompt: { text: query } });
        const accepted = [];
        await hooks.session.context({ sessionID: 's-edit',
          messages: userMessage('msg-edited', query), system: accepted });
        assert.equal(blocks(accepted).length, 1, 'accepted native message can recall');
        await hooks.session.prompt({ sessionID: 's-edit', messageID: 'msg-edited',
          prompt: { text: rejected } });
        const replacement = [{ type: 'text',
          text: '[GHDEV_GRAPHITI_CONTEXT]\nobsolete\n[/GHDEV_GRAPHITI_CONTEXT]' }];
        await hooks.session.context({ sessionID: 's-edit',
          messages: userMessage('msg-edited', rejected), system: replacement });
        assert.equal(blocks(replacement).length, 0,
          'rejected same-ID replacement must neither reuse nor retain stale recall');
        const other = [];
        await hooks.session.context({ sessionID: 's-edit',
          messages: userMessage('msg-other', query), system: other });
        assert.equal(blocks(other).length, 1,
          'a rejected edit must not invalidate a different native message');
      }
      assert.equal(mcp.searchQueries.length, 5,
        'only accepted searches run: one other and four edited prompts');
      assert.equal(mcp.calls.includes('tools/call:add_memory'), false);
    }, [{ fact, group_id: 'development-knowledge', episodes: [episode] }]);
});

test('rejected same-ID private edit clears pending capture but preserves other IDs', async () => {
  const decision = 'We decided to retain native source-attributed Graphiti recall only for accepted user content.';
  await withPlugin({ enabled: true, capture: true, group: 'development-knowledge' },
    async ({ hooks, dir, mcp }) => {
      await hooks.session.prompt({ sessionID: 's-capture-edit', messageID: 'msg-edited',
        prompt: { text: decision } });
      await hooks.session.prompt({ sessionID: 's-capture-edit', messageID: 'msg-edited',
        prompt: { text: '<private>Rejected replacement</private>' } });
      await hooks.session.context({ sessionID: 's-capture-edit',
        messages: [{ role: 'user', id: 'msg-edited' }], system: [] });
      assert.equal((await new Journal(dir, 'development-knowledge').list()).length, 0,
        'superseded private content must not stage an earlier pending decision');
      await hooks.session.prompt({ sessionID: 's-capture-edit', messageID: 'msg-other',
        prompt: { text: decision } });
      await hooks.session.prompt({ sessionID: 's-capture-edit', messageID: 'msg-aux',
        prompt: { text: 'ok' } });
      await hooks.session.context({ sessionID: 's-capture-edit',
        messages: [{ role: 'user', id: 'msg-other' }], system: [] });
      assert.equal((await new Journal(dir, 'development-knowledge').list()).length, 1,
        'rejection of another native ID must not discard a legitimate pending capture');
      assert.equal(mcp.calls.includes('tools/call:add_memory'), false);
    });
});
