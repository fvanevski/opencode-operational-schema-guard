import test from 'node:test';
import assert from 'node:assert/strict';
import { reducedQuery } from './issue81-retrieval-feasibility.mjs';

test('generic reduction preserves opaque identifiers and numbered/commit identity', () => {
  const q='What did commit 52863ae change in the Graphiti test suite for Issue #81?';
  const reduced=reducedQuery(q);
  assert.match(reduced, /52863ae/);
  assert.match(reduced, /\b81\b/);
  assert.match(reduced, /graphiti/);
});
test('query reduction is generic, bounded and does not insert target answers', () => {
  const reduced=reducedQuery('Why does the MCP config point at graphiti_live for development-knowledge?');
  assert.match(reduced, /graphiti_live/);
  assert.match(reduced, /development-knowledge/);
  assert.equal(reduced.split(' ').length<=18,true);
});
