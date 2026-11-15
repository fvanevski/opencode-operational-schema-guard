import test from 'node:test';
import assert from 'node:assert/strict';
import {lexicalSupport,answerTypeSupport} from '../issue-75/v2-candidate/relevance.mjs';
import {selectSemanticContext,preselectIndexedContext,strictControlAnchor} from '../issue-75/v2-candidate/semantic-recall.mjs';

const source='opencode:ses-issue93:message:msg-sourced';
const item=(fact,extras={})=>({
  fact,source,evidenceClass:'tool-reported',
  temporal:'current state not independently verified',
  recallOrigin:'graphiti',nativeRank:0,...extras
});

test('unanchored native rank alone cannot inject unrelated France context',()=>{
  const q='What is the capital of France?';
  const wrong=item('Graphiti search_memory_facts is a graph retrieval component.');
  assert.equal(lexicalSupport(q,wrong.fact).count,0);
  assert.equal(answerTypeSupport(q,wrong.fact),0);
  assert.deepEqual(selectSemanticContext(q,[wrong]),[]);
});

test('unanchored path abstains rather than leaking one of several unsupported hits',()=>{
  const q='What is the capital of France?';
  const hits=[
    item('Graphiti search_memory_facts is a graph retrieval component.',{nativeRank:0}),
    item('The cache service stores development facts.',{nativeRank:1}),
  ];
  assert.deepEqual(selectSemanticContext(q,hits),[]);
});

test('a lower semantic hit with independent answer-type evidence can survive prior-only top rank',()=>{
  const q='Why did the overnight workflow halt?';
  const noise=item('A database graph component contains several entries.',{nativeRank:0});
  const meaningful=item('Because an advisory lock remained held.',{nativeRank:2});
  assert.equal(lexicalSupport(q,meaningful.fact).count,0);
  assert.equal(answerTypeSupport(q,meaningful.fact),1);
  assert.deepEqual(selectSemanticContext(q,[noise,meaningful]).map(x=>x.fact),[meaningful.fact]);
});

test('a source-excerpt supported zero-overlap candidate remains eligible without exposing excerpt',()=>{
  const q='What caused the Meridian outage?';
  const excerpt='Meridian outage was traced to stalled indexing.';
  const fact='A queued migration had not completed.';
  const supported=item(fact,{sourceContext:excerpt,nativeRank:2});
  assert.equal(lexicalSupport(q,fact).count,0);
  assert.ok(lexicalSupport(q,excerpt).count>0);
  const found=selectSemanticContext(q,[supported]);
  assert.deepEqual(found.map(x=>x.fact),[fact]);
  assert.equal(JSON.stringify(found).includes(excerpt),false);
});

test('native rank, optional reranker score and source identity do not become automatic admission',()=>{
  const q='What is the capital of France?';
  const noSupport=item('A graph retrieval server was started.',{nativeRank:0,rerankScore:1});
  assert.deepEqual(selectSemanticContext(q,[noSupport]),[]);
  assert.deepEqual(selectSemanticContext(q,[{...noSupport,source:'fake:source'}]),[]);
});

test('anchored multi-fact selection is unchanged by unanchored single-fact fence',()=>{
  const q='What happened during the Graphiti recovery?';
  const a=item('Graphiti recovery succeeded after a restart.',{nativeRank:0});
  const b=item('Graphiti recovery tests passed after restart.',{nativeRank:1});
  const result=selectSemanticContext(q,[a,b]);
  assert.equal(result.length,2);
  assert.deepEqual(result.map(x=>x.fact),[a.fact,b.fact]);
});

test('a missing or unrelated baseline anchor cannot override an unanchored abstention',()=>{
  const q='What is the capital of France?';
  const noise=item('Graphiti search_memory_facts is a graph retrieval component.');
  const anchor=item('Graphiti search_memory_facts is a graph retrieval component.');
  assert.deepEqual(selectSemanticContext(q,[noise],{baselineAnchor:anchor}),[]);
});

test('issue #75 native paraphrase and soft issue identification remain eligible',()=>{
  const q='What storage or persistence problem did we encounter with FalkorDB during the memory-system cutover?';
  const target=item('FalkorDB AOF crash loop caused effects format v2/v3 incompatibility.');
  assert.deepEqual(selectSemanticContext(q,[target]).map(x=>x.fact),[target.fact]);
  const withoutIssue=item('FalkorDB AOF crash loop caused effects format incompatibility.');
  assert.deepEqual(selectSemanticContext('What went wrong with FalkorDB in Issue #81?',[withoutIssue]).map(x=>x.fact),[withoutIssue.fact]);
});


test('right now is not an independent topical anchor for indexed narration',()=>{
  const q='What is the weather in Tokyo right now?';
  const indexed=[
    item('Now I can see the memory graph entries.',{
      recallOrigin:'index',nativeRank:undefined,
      sourceContext:'Now the local knowledge collection was listed.'}),
    item('Now clear: the validation queue can be drained.',{
      recallOrigin:'index',nativeRank:undefined}),
    item('Now passes: the workspace snapshot has been checked.',{
      recallOrigin:'index',nativeRank:undefined}),
    item('Now responds: the development graph endpoint is ready.',{
      recallOrigin:'index',nativeRank:undefined})
  ];
  for (const candidate of indexed) {
    assert.equal(lexicalSupport(q,candidate.fact).count,1,
      'the strict baseline still sees now as a lexical token');
    if(candidate.sourceContext)
      assert.equal(lexicalSupport(q,candidate.sourceContext).count,1,
        'shared strict lexical scoring is unchanged');
  }
  assert.deepEqual(preselectIndexedContext(q,indexed),[],
    'index rescue should not use now as a weak lexical bridge');
  assert.deepEqual(selectSemanticContext(q,indexed),[]);
});

test('high native rank cannot reintroduce now-only unrelated observations',()=>{
  const q='What is the weather in Tokyo right now?';
  const hits=[
    item('Now I can see the development graph state.',{nativeRank:0}),
    item('Now passes: graph readback validation.',{nativeRank:1}),
    item('Now the project memory service is ready.',{nativeRank:2})
  ];
  assert.deepEqual(selectSemanticContext(q,hits),[],
    'the prior-only unanchored lane must abstain even with multiple native hits');
});

test('right now does not suppress an independently topical development answer',()=>{
  const q='What is the FalkorDB recovery status right now?';
  const fact='FalkorDB recovery completed after the storage repair.';
  assert.ok(lexicalSupport(q,fact).count>=2,
    'FalkorDB and recovery remain meaningful topic anchors');
  assert.deepEqual(selectSemanticContext(q,[item(fact)]).map(x=>x.fact),[fact]);
});

test('historical now comparison preserves independently qualified strict anchor in native lane',async()=>{
  const q='What did we use originally, and what do we use now?';
  const historical=item('Previously we used Redis; now we use PostgreSQL.',{
    temporal:'historical/superseded'});
  const anchor=await strictControlAnchor(q,[historical],[]);
  assert.ok(anchor,'unchanged strict policy must qualify the temporal comparison');
  assert.equal(lexicalSupport(q,historical.fact).count,1,'now is the only lexical overlap');
  assert.deepEqual(selectSemanticContext(q,[historical],{baselineAnchor:anchor}).map(x=>x.fact),
    [historical.fact],'semantic selection must retain the same verified strict fact');
});

test('historical now comparison retains remote-proven indexed strict anchor',async()=>{
  const q='What did we use originally, and what do we use now?';
  const historical=item('Previously we used Redis; now we use PostgreSQL.',{
    recallOrigin:'index',nativeRank:undefined,temporal:'historical/superseded'});
  assert.deepEqual(preselectIndexedContext(q,[historical]).map(x=>x.fact),[historical.fact]);
  const anchor=await strictControlAnchor(q,[],[historical]);
  assert.ok(anchor);
  assert.deepEqual(selectSemanticContext(q,[historical],{baselineAnchor:anchor}).map(x=>x.fact),
    [historical.fact]);
});

test('unqualified and out-of-pool anchors cannot reintroduce now-only injections',async()=>{
  const q='What is the weather in Tokyo right now?';
  const noise=item('Now I can see the development graph state.');
  assert.equal(await strictControlAnchor(q,[noise],[]),null);
  assert.deepEqual(selectSemanticContext(q,[noise],{baselineAnchor:noise}),[],
    'unqualified caller-supplied anchor must not bypass strict admission');

  const historyQuery='What did we use originally, and what do we use now?';
  const historical=item('Previously we used Redis; now we use PostgreSQL.',{nativeRank:1});
  const missing=await strictControlAnchor(historyQuery,[historical],[]);
  assert.ok(missing);
  assert.deepEqual(selectSemanticContext(historyQuery,[noise],{baselineAnchor:missing}),[],
    'a strict-qualified fact absent from the verified candidate pool cannot be imported');
});
