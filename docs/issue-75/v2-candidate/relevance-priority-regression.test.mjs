import test from 'node:test';
import assert from 'node:assert/strict';
import { relevanceFilter, relevanceSignals } from './relevance.mjs';

// Bounded root-cause regression for the S06 priority inversion. No private
// prompt/holdout data is embedded here; the case is a general representative.
test('procedural then cannot outrank the more relevant old-to-new cutover', async () => {
  const query = 'Was there a previous indexing backend before the production cutover, and what changed?';
  const cutover = {
    fact: 'The indexing backend changed from SQLite to PostgreSQL during the production cutover.',
  };
  const procedural = {
    fact: 'The tooling fetched indexing PR history and then inspected the production cutover branch.',
  };
  const expected = relevanceSignals(query, cutover.fact);
  const distractor = relevanceSignals(query, procedural.fact);
  assert.equal(expected.eligible, true);
  assert.equal(distractor.eligible, true);
  assert.equal(distractor.priority, 0, 'Procedural sequencing alone is not historical-state evidence');
  assert.ok(expected.overlap.count > distractor.overlap.count);
  assert.deepEqual(await relevanceFilter(query, [procedural, cutover]), [cutover]);
});

test('explicit replacement and previous-state markers retain historical priority', async () => {
  const query = 'Which database was previously used before the migration?';
  const explicit = { fact: 'SQLite was originally used for this database, then replaced by PostgreSQL.' };
  const signals = relevanceSignals(query, explicit.fact);
  assert.equal(signals.eligible, true);
  assert.equal(signals.priority, 1);
  assert.deepEqual(await relevanceFilter(query, [explicit]), [explicit]);
});

test('standalone then does not trigger historical priority in unrelated prose', () => {
  const query = 'What was previously selected for the archive?';
  const procedural = 'A script opened the archive folder and then listed files.';
  assert.equal(relevanceSignals(query, procedural).priority, 0);
});
