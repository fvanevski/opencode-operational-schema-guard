import test from 'node:test';
import assert from 'node:assert/strict';
import { admitFact, lexicalSupport, relevanceSignals, relevanceFilter, localReranker } from './relevance.mjs';
test('lexical floor rejects unrelated facts but admits direct multi-term evidence', async () => {
  assert.equal(admitFact('Which library is used for backlog dependency visualization?',
    'React Flow chosen for backlog dependency visualization'), true);
  assert.equal(admitFact('What is the weather in Tokyo?',
    'React Flow chosen for backlog dependency visualization'), false);
  assert.equal(admitFact('Does this repo use Vue for the dashboard?',
    'The backlog visualization uses React Flow'), false);
  assert.ok(lexicalSupport('The export quality gate', 'export quality gate').count >= 2);
});
test('reranker admits semantic paraphrase but rejects top-k unrelated material', async () => {
  const c = [{fact:'React Flow chosen for backlog dependency visualization'},
    {fact:'Archive exporter requires a VMAF quality gate before replacement'}];
  const ranker = async () => new Map([[0, .91],[1,.22]]);
  const selected = await relevanceFilter('What did we settle on for interactive issue map?', c, ranker);
  assert.deepEqual(selected, [c[0]]);
  // Raw cross-encoder scores are not calibrated relevance probabilities.
  const lowScore = await relevanceFilter('What did we settle on for interactive issue map?', c,
    async () => new Map([[0,.069],[1,.021]]));
  assert.deepEqual(lowScore, [c[0]]);
  const unsupported = await relevanceFilter('Does this repository use MongoDB for storage?', c,
    async () => new Map([[0,.91],[1,.88]]));
  assert.deepEqual(unsupported, []);
  const unrelatedDecision = [
    {fact:'PostgreSQL was selected for inventory transaction storage.'},
    {fact:'The product archive uses a quality gate for media exports.'},
  ];
  assert.deepEqual(await relevanceFilter('What did we settle on for retry backoff strategy?',
    unrelatedDecision, async () => new Map([[0,.015],[1,.012]])), []);
});
test('unavailable reranker fails closed to conservative CPU filter, not all top-k', async () => {
  const c = [{fact:'React Flow chosen for backlog dependency visualization'},
    {fact:'The weather in Tokyo is warm'}];
  assert.deepEqual(await relevanceFilter('backlog dependency visualization', c,
    async () => {throw new Error('timeout');}), [c[0]]);
});
test('generic historical vs current-choice evidence wins without project-specific names', async () => {
  const current = {fact:'PostgreSQL was selected for inventory transaction storage.'};
  const old = {fact:'SQLite was originally used for inventory transaction storage, then replaced by PostgreSQL.'};
  const items = [old, current];
  assert.deepEqual(await relevanceFilter('What did we settle on for inventory transaction storage?',
    items, async () => new Map([[0,.19],[1,.12]])), [current]);
  assert.deepEqual(await relevanceFilter('What was originally used for inventory transaction storage?',
    items, async () => new Map([[0,.24],[1,.25]])), [old]);
  assert.deepEqual(await relevanceFilter('What did we decide?', items,
    async () => new Map([[0,.9],[1,.8]])), []);
  assert.equal(relevanceSignals('Does this service use Redis for its cache?', current.fact).eligible, false);
  const causal = relevanceSignals('What must complete before the exporter swaps the media?',
    'The archive exporter depends on a quality gate before replacing the source.');
  assert.equal(causal.eligible, true);
  assert.equal(causal.priority, 0, 'Causal before is not a historical-state preference');
});
test('without an independent reranker, semantic-only choice retrieval abstains', async () => {
  const item = {fact:'PostgreSQL was chosen as the preferred transactional database.'};
  assert.deepEqual(await relevanceFilter('What did we settle on for the inventory indexing engine?', [item]), []);
  assert.deepEqual(await relevanceFilter('What is the weather?', [item],
    async () => new Map([[0,.99]])), []);
});
test('fresh Issue 75 closure question admits sourced closure fact but not another numbered issue', async () => {
  const query = 'What was our agreed evidence requirement before closing Issue #75?';
  const supported = { fact: 'Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.' };
  const wrongIssue = { fact: 'Issue 70 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.' };
  const unrelated = { fact: 'Unrelated deployment notes mention graph quality and a new scheduler.' };
  assert.ok(lexicalSupport(query, supported.fact).count >= 3,
    'closing/closes plus exact Issue 75 must be distinct lexical evidence');
  assert.equal(relevanceSignals(query, supported.fact).eligible, true);
  assert.equal(relevanceSignals(query, wrongIssue.fact).eligible, false,
    'numeric issue identifier is a mandatory hard qualifier');
  assert.deepEqual(await relevanceFilter(query, [wrongIssue, unrelated, supported]), [supported]);
  assert.deepEqual(await relevanceFilter(query, [wrongIssue, unrelated]), []);
});

test('same-issue wrong-topic fact is not relevant just because issue and number match', async () => {
  const query = 'What was our agreed evidence requirement before closing Issue #75?';
  const wrongTopic = { fact: 'Issue 75 uses React Flow for backlog visualization.' };
  assert.equal(lexicalSupport(query, wrongTopic.fact).count, 2);
  assert.equal(relevanceSignals(query, wrongTopic.fact).eligible, false);
  assert.deepEqual(await relevanceFilter(query, [wrongTopic]), []);
  // Optional reranking cannot bypass the independent topical qualifier.
  assert.deepEqual(await relevanceFilter(query, [wrongTopic],
    async () => new Map([[0, 0.99]])), []);
  const choiceQuery = 'What did we decide was the evidence requirement before closing Issue #75?';
  const wrongChoice = { fact: 'Issue 75 selected React Flow for dashboard visualization.' };
  assert.deepEqual(await relevanceFilter(choiceQuery, [wrongChoice],
    async () => new Map([[0, 0.99]])), []);
  const historyQuery = 'What was previously agreed before closing Issue #75?';
  const wrongHistory = { fact: 'Issue 75 originally used React Flow for visualization.' };
  assert.deepEqual(await relevanceFilter(historyQuery, [wrongHistory]), []);
});
test('numeric issue references cannot be satisfied by unrelated pass counts', async () => {
  const query = 'What was our agreed evidence requirement before closing Issue #75?';
  const falseCollision = { fact: 'Issue 70 closes only after 75 passing tests.' };
  assert.equal(relevanceSignals(query, falseCollision.fact).eligible, false);
  assert.deepEqual(await relevanceFilter(query, [falseCollision]), []);
  const supported = { fact: 'Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.' };
  assert.deepEqual(await relevanceFilter(query, [falseCollision, supported]), [supported]);
});
test('single-digit issue numbers retain exact issue-qualified scope', async () => {
  const query = 'What was our agreed evidence requirement before closing Issue #7?';
  const wrong = { fact: 'Issue 8 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.' };
  const supported = { fact: 'Issue 7 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.' };
  assert.equal(relevanceSignals(query, wrong.fact).eligible, false);
  assert.equal(relevanceSignals(query, supported.fact).eligible, true);
  assert.deepEqual(await relevanceFilter(query, [wrong, supported]), [supported]);
  assert.deepEqual(await relevanceFilter(query, [wrong]), []);
});

test('hyphenated issue references preserve exact scope and independent topic evidence', async () => {
  const query = 'What was our agreed evidence requirement before closing issue-7?';
  const wrong = { fact: 'Issue-8 closes only after an evidence review.' };
  const correct = { fact: 'Issue 7 closes only after an evidence review.' };
  assert.equal(relevanceSignals(query, wrong.fact).eligible, false);
  assert.deepEqual(await relevanceFilter(query, [wrong]), []);
  assert.equal(relevanceSignals(query, correct.fact).eligible, true);
  assert.deepEqual(await relevanceFilter(query, [wrong, correct]), [correct]);

  // Mixed issue spellings must be equivalent, even with proper-name casing.
  const capitalized = 'What was the evidence requirement for Issue-75?';
  const supported = { fact: 'Issue #75 closes after the required evidence is reviewed.' };
  const other = { fact: 'Issue-70 closes after the required evidence is reviewed.' };
  assert.equal(relevanceSignals(capitalized, supported.fact).eligible, true);
  assert.equal(relevanceSignals(capitalized, other.fact).eligible, false);
  assert.deepEqual(await relevanceFilter(capitalized, [other, supported]), [supported]);

  // Correct identifier alone does not authorize an unrelated observation.
  const offTopic = { fact: 'Issue-7 uses React Flow for the issue dashboard.' };
  assert.equal(relevanceSignals(query, offTopic.fact).eligible, false);
  assert.deepEqual(await relevanceFilter(query, [offTopic]), []);
});

test('reranker uses loopback only, validates bounded score and request', async () => {
  let body;
  const scorer=localReranker('http://127.0.0.1:8004/v1/rerank',{
    fetchImpl: async (_url, opts) => {
      body = JSON.parse(opts.body);
      return {ok:true,json:async()=>({results:[{index:0,relevance_score:0.94}]})};
    }
  });
  const scores=await scorer('example',[{fact:'a sample memory'}]);
  assert.equal(scores.get(0),0.94);
  assert.equal(body.documents.length,1);
  assert.throws(()=>localReranker('http://0.0.0.0:8004/v1/rerank'),/loopback/);
});
