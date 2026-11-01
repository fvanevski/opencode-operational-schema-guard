import test from 'node:test';
import assert from 'node:assert/strict';
import { admitFact, lexicalSupport, relevanceFilter, localReranker } from './relevance.mjs';
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
  const weak = await relevanceFilter('What did we settle on for interactive issue map?', c, async () => new Map([[0,.69],[1,.68]]));
  assert.deepEqual(weak, []);
});
test('unavailable reranker fails closed to conservative CPU filter, not all top-k', async () => {
  const c = [{fact:'React Flow chosen for backlog dependency visualization'},
    {fact:'The weather in Tokyo is warm'}];
  assert.deepEqual(await relevanceFilter('backlog dependency visualization', c,
    async () => {throw new Error('timeout');}), [c[0]]);
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
