import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { Journal } from './memory-core.mjs';
import plugin from './plugin.mjs';

// Minimal mock MCP server: records which tools/call methods the plugin
// invokes so we can prove the active session performs NO Graphiti add_memory.
async function startMockMcp() {
  const calls = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let msg;
      try { msg = JSON.parse(body); } catch { res.writeHead(400); return res.end(); }
      calls.push(msg.method === 'tools/call' ? 'tools/call:' + msg.params.name : msg.method);
      let result;
      if (msg.method === 'initialize') result = { capabilities: {} };
      else if (msg.method === 'tools/call') {
        if (msg.params.name === 'search_memory_facts')
          result = { structuredContent: { result: { facts: [] } } };
        else result = { structuredContent: { result: {} } };
      } else result = {};
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  return { url: `http://127.0.0.1:${port}/mcp`, calls, close: () => new Promise((r) => server.close(r)) };
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
async function withPlugin(options, run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gh75-plugin-'));
  options.stateDir = dir;
  const mcp = await startMockMcp();
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
