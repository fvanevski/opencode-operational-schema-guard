// #81 closeout: focused RED/GREEN for the read-only file-tool receipt gap.
// RED on unpatched source (read is not a recognized file tool -> null).
// GREEN after the minimal FILE_TOOLS patch (read becomes a scoped,
// content-free, tool-reported receipt like edit/write/apply_patch).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fromTool } from './events.mjs';

const scope = { project: 'gh_mcp', workspace: '/workspace/mcp_servers/gh_mcp', group: 'test_group' };
const base = { sessionID: 'ses-read', status: 'completed', callID: 'call-r1',
  result: { output: { exit: 0, output: 'file body, do not persist' } } };

test('read-only file tool receipts are scoped and content-free like other file tools', () => {
  const read = fromTool({ ...base, tool: 'read',
    input: { path: 'docs/reference.md' } }, scope);
  // RED on unpatched source: `read` falls through to the shell gate and
  // (having no command input) returns null. GREEN after the patch.
  assert.ok(read, 'read receipt must be staged as a scoped file tool');
  assert.equal(read.kind, 'file_change');
  assert.equal(read.evidence_class, 'tool-reported');
  assert.equal(read.source_refs[0], 'opencode:ses-read:tool:call-r1');
  assert.match(read.excerpt, /docs\/reference\.md/);
  assert.doesNotMatch(read.excerpt, /file body/);
  // safety invariants carry over
  assert.equal(fromTool({ ...base, tool: 'read', input: { path: '.env' } }, scope), null);
  assert.equal(fromTool({ ...base, tool: 'read', input: {} }, scope), null);
  assert.equal(fromTool({ ...base, tool: 'read', input: { path: '/tmp/outside.md' } }, scope), null);
  const err = fromTool({ ...base, status: 'error', callID: 'call-r2', tool: 'read',
    input: { path: 'docs/reference.md' } }, scope);
  assert.ok(err);
  assert.match(err.excerpt, /tool error/);
});
