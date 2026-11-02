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
});
test('without an independent reranker, semantic-only choice retrieval abstains', async () => {
  const item = {fact:'PostgreSQL was chosen as the preferred transactional database.'};
  assert.deepEqual(await relevanceFilter('What did we settle on for the inventory indexing engine?', [item]), []);
  assert.deepEqual(await relevanceFilter('What is the weather?', [item],
    async () => new Map([[0,.99]])), []);
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
