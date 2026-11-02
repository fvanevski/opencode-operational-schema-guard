/**
 * RETROSPECTIVE source-backed replay. These published observations were
 * available when the policy was designed. This catches regressions but is
 * NOT an independent unseen holdout and cannot establish generalization.
 * No live service or model is called.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relevanceFilter } from './relevance.mjs';

const base = new URL('../evidence/', import.meta.url);
const observed = JSON.parse(readFileSync(new URL('20261101-reranker-observations.json', base), 'utf8'));
const frozen = JSON.parse(readFileSync(new URL('./benchmark-cases.json', import.meta.url), 'utf8'));
const holdout = JSON.parse(readFileSync(new URL('20261101-holdout-queries.json', base), 'utf8'));
const expected = new Map([...frozen.queries, ...holdout.queries].map(q => [q.id, q.expected]));
// Maps host-observed, journal-attributed remote episode sources to the
// immutable three synthetic seed facts. Test-only mapping; never imported
// into production selection. No fact-string match used by the policy.
const seededSources = new Map([
  ['a4e1b76c-a01f-4990-a18f-83b5524e8638', 'f1'],
  ['2b43b66c-5840-4af4-a8f3-cc31cbf38fc9', 'f2'],
  ['6cf87bac-1506-44cd-a43a-b92c4ab648e4', 'f3'],
]);
test('12 recorded cases replay with exact expected source identity; IN-SAMPLE ONLY', async () => {
  assert.equal(observed.schema, 'ghdev.issue75.reranker-observation.v1');
  assert.equal(observed.group, 'g_issue75_test');
  assert.equal(observed.results.length, 12);
  let correct = 0, tp = 0, fp = 0, fn = 0;
  for (const q of observed.results) {
    const truth = expected.get(q.case);
    assert.ok(truth, 'Unexpected case ' + q.case);
    assert.equal(q.rerank?.error, null);
    const items = q.candidates.map(x => ({ fact: x.fact }));
    const scores = new Map(q.candidates.map((x, i) => [i, x.rerank_score]));
    const found = await relevanceFilter(q.query, items, async () => scores);
    const returned = found.map(item => {
      const idx = items.indexOf(item);
      assert.ok(idx >= 0);
      const src = q.candidates[idx].matching_local_sources;
      assert.equal(src.length, 1, 'Unattributed or ambiguous synthetic source');
      return seededSources.get(src[0].localId);
    });
    assert.ok(returned.every(Boolean), 'Unknown published source identity');
    if (JSON.stringify(returned) === JSON.stringify(truth)) correct++;
    for (const id of returned) truth.includes(id) ? tp++ : fp++;
    for (const id of truth) if (!returned.includes(id)) fn++;
  }
  assert.equal(correct, observed.results.length,
    'Any changed selection requires re-examination of frozen/holdout facts');
  assert.deepEqual({ tp, fp, fn }, { tp: 8, fp: 0, fn: 0 });
});
