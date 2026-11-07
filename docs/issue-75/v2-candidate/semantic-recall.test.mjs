import test from 'node:test';
import assert from 'node:assert/strict';
import {preselectIndexedContext,selectSemanticContext,strictControlAnchor} from './semantic-recall.mjs';
const source='opencode:ses-example:message:msg-example';
const item=(fact,extra={})=>({fact,source,evidenceClass:'tool-reported',temporal:'current state not independently verified',
  recallOrigin:'graphiti',nativeRank:0,...extra});
test('first-ranked FalkorDB persistence paraphrase survives lexical rejection',()=>{
  const q='What storage or persistence problem did we encounter with FalkorDB during the memory-system cutover?';
  const target=item('FalkorDB AOF crash loop caused effects format v2/v3 incompatibility.');
  assert.deepEqual(selectSemanticContext(q,[target]).map(x=>x.fact),[target.fact]);
});
test('missing Issue ID no longer vetoes grounded operational context',()=>{
  const target=item('FalkorDB AOF crash loop caused effects format incompatibility.');
  assert.equal(selectSemanticContext('What went wrong with FalkorDB in Issue #81?',[target]).length,1);
});
test('conflicting Issue ID is penalized instead of falsely claiming a match',()=>{
  const q='What happened in Issue #81 to the storage subsystem?';
  const wrong=item('Issue #80 changed storage settings.',{nativeRank:0});
  const same=item('Issue #81 corrected storage settings.',{nativeRank:1});
  assert.equal(selectSemanticContext(q,[wrong,same])[0].fact,same.fact);
});
test('adaptive selection diversifies, deduplicates and preserves source identity',()=>{
  const q='What happened with FalkorDB storage and recovery?';
  const a=item('FalkorDB storage crashed after incompatible persistence settings.',{nativeRank:0});
  const b=item('FalkorDB recovery restored a compatible persistence configuration.',{nativeRank:2});
  const c=item('FalkorDB recovery tests passed after storage restart.',{nativeRank:3});
  const bad=item('FalkorDB secrets were logged.',{source:'fake:source'});
  const picked=selectSemanticContext(q,[a,a,b,c,bad]);
  assert.ok(picked.length>=2 && picked.length<=5);
  assert.equal(picked.filter(x=>x.fact===a.fact).length,1);
  assert.ok(picked.every(x=>x.source===source && !Object.hasOwn(x,'nativeRank')));
});
test('curated-only index preselection needs support before remote proof',()=>{
  const q='What happened with FalkorDB storage?';
  const relevant=item('FalkorDB AOF persistence was recovered.',{recallOrigin:'index',nativeRank:undefined});
  const irrelevant=item('Weather in Tokyo is warm.',{recallOrigin:'index',nativeRank:undefined});
  assert.deepEqual(preselectIndexedContext(q,[irrelevant,relevant]),[relevant]);
});
test('optional uncalibrated reranker can reorder without becoming admission authority',()=>{
  const q='What storage mechanism did we select?';
  const a=item('The storage choice was local files.',{nativeRank:0,rerankScore:0.05});
  const b=item('The storage choice was a durable graph.',{nativeRank:1,rerankScore:0.98});
  assert.equal(selectSemanticContext(q,[a,b])[0].fact,b.fact);
});
test('legacy user-decision provenance remains eligible',()=>{
  const q='What decision did we make about local Graphiti integration?';
  const x=item('We chose local Graphiti integration for recalled decisions.',{
    source:'opencode:ses-legacy:user:feedfacefeedface'});
  assert.equal(selectSemanticContext(q,[x]).length,1);
});
test('tool question echoes are not independent retrieval evidence',()=>{
  const q='What did commit a1b2c3d change in the Graphiti test suite?';
  const echo=item('Diagnostic: '+q+' expected answer is a change in suite.',{source:'opencode:s0:tool:call0'});
  assert.deepEqual(selectSemanticContext(q,[echo]),[]);
});
test('empty and untrusted candidates abstain',()=>{
  assert.deepEqual(selectSemanticContext('What did we change?',[]),[]);
  assert.deepEqual(selectSemanticContext('Did we choose Redis?',[
    item('Redis was chosen.',{source:'unattributed'})]),[]);
});
test('unanchored native result does not flood context',()=>{
  const q='What was our architecture choice?';
  assert.ok(selectSemanticContext(q,[
    item('The earlier decision used local vectors.',{nativeRank:0}),
    item('Another unrelated observation.',{nativeRank:1})]).length<=1);
});
test('source excerpts never leak into model-facing context',()=>{
  const q='What did FalkorDB use for persistence?';
  const x=item('FalkorDB used append-only snapshots for persistence.',{
    recallOrigin:'index',nativeRank:undefined,sourceContext:'PRIVATE_SOURCE_EXCERPT'});
  assert.equal(JSON.stringify(selectSemanticContext(q,[x])).includes('PRIVATE_SOURCE_EXCERPT'),false);
});
test('serialized context respects existing char budget',()=>{
  const q='How was FalkorDB database recovered?';
  const x=Array.from({length:10},(_,i)=>item('FalkorDB database recovery step '+i+' used operation '+'v'.repeat(80)+'.',{nativeRank:i}));
  const result=selectSemanticContext(q,x,{maxSelected:5,maxChars:350});
  assert.ok(result.length>0 && result.length<5);
  assert.ok(result.reduce((n,x)=>n+JSON.stringify(x).length,0)<=350);
});

test('semantic presentation retains a strictly relevant sourced control without vetoing other facts',async()=>{
  const q='Why was the archive database migration delayed during recovery?';
  const remote=Array.from({length:6},(_,i)=>item(
    'The archive database migration logged subsystem '+['workers','plugins','queues','cache','network','ports'][i]+
    ' during the operational window.',{nativeRank:i,source:'opencode:s0:message:m'+i}));
  const index=item('Archive database migration was delayed because recovery required schema repairs.',{
    source:'opencode:s0:message:index',recallOrigin:'index',nativeRank:undefined});
  const anchor=await strictControlAnchor(q,remote,[index]);
  assert.equal(anchor?.source,index.source,'the accepted strict-control fact must independently qualify');
  const chosen=selectSemanticContext(q,[...remote,index],{baselineAnchor:anchor});
  assert.equal(chosen[0]?.source,index.source,'control fact must survive rank pressure');
  assert.ok(chosen.length>1,'the control is an inclusion floor, not an exclusive filter');
  assert.ok(chosen.every(x=>!Object.hasOwn(x,'sourceContext')&&!Object.hasOwn(x,'nativeRank')));
});
test('baseline hint cannot inject untrusted or out-of-pool assertions',()=>{
  const q='How was archive storage recovered?';
  const trusted=item('Archive storage recovery used a repaired database.');
  const hinted=item('Archive storage recovery required unknown changes.',{
    source:'opencode:other:message:other'});
  const wrong={...hinted,source:'forged:record'};
  const picked=selectSemanticContext(q,[trusted],{baselineAnchor:hinted});
  assert.equal(picked.length,1);
  assert.equal(picked[0].fact,trusted.fact);
  assert.deepEqual(selectSemanticContext(q,[],{baselineAnchor:wrong}),[]);
});
