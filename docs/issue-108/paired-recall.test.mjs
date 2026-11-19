import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFreeze,runPairedRecall,summarize} from './paired-recall.mjs';

const source='opencode:ses_mock:user:msg_1';
const fact='The reviewed migration uses the safe local rollback controller.';
const freeze=()=>({schema:'ghdev-108-freeze-v1',group:'development-knowledge',
  workspace:'/workspace/project',project:'project',
  source_adjudication:'Independent original-source check completed before retrieval.',
  cases:[{id:'source-exact',cohort:'source-exact',
    query:'Which controller handles the migration rollback?',
    expected:[{id:'fact-a',source,fact}],forbidden:[]},
    {id:'off-topic',cohort:'off-topic',query:'What is the weather in Tokyo?',
    expected:[],forbidden:[]} ]});
const mock=(_freeze,_config,policy,trace)=>({search:async(query,options)=>{
  assert.deepEqual(options,{limit:5,maxChars:1400});
  trace.rpc.search_memory_facts=1;
  trace.rpc_chars.search_memory_facts=100;
  trace.native_fact_hashes.add('not-source-proof');
  if(query.includes('rollback')&&policy==='semantic')return [{fact,source,
    evidenceClass:'user-stated',temporal:'historical'}];
  return [];
}});

test('paired comparator uses identical frozen queries, counterbalanced policy order and no raw source export',async()=>{
  const original=freeze(),json=JSON.stringify(original);
  const report=await runPairedRecall(original,{sourceRevision:'a'.repeat(40)},
    {rounds:2,makeMemory:mock});
  assert.equal(JSON.stringify(original),json,'freeze is not mutated');
  assert.equal(report.observations.length,8);
  assert.deepEqual(report.observations.slice(0,4).map(x=>x.policy),
    ['strict','semantic','semantic','strict']);
  assert.equal(report.aggregate.semantic.matched_expected_case_fact_pairs,1);
  assert.equal(report.aggregate.strict.matched_expected_case_fact_pairs,0);
  assert.equal(report.aggregate.semantic.forbidden_selected,0);
  const encoded=JSON.stringify(report);
  assert.ok(!encoded.includes(source));
  assert.ok(!encoded.includes(fact));
  assert.ok(!encoded.includes('Which controller'));
  assert.match(report.aggregate.meaning,/not hook p95/);
});

test('truth schema fails closed for privacy-tainted queries, duplicate labels, and weak source',()=>{
  const f=freeze();validateFreeze(f);
  f.cases[0].query='Use password=abc123 for project';
  assert.throws(()=>validateFreeze(f),/private query/);
  f.cases[0].query='Which controller handles the migration rollback?';
  f.cases[0].forbidden=[{id:'fact-b',source,fact}];
  assert.throws(()=>validateFreeze(f),/ambiguous same fact/);
  f.cases[0].forbidden=[];
  f.cases[0].expected[0].source='untrusted:source';
  assert.throws(()=>validateFreeze(f),/exact source-qualified/);
});

test('unlabelled observations are not silently counted as wrong group or safe',async()=>{
  const rep=await runPairedRecall(freeze(),{}, {rounds:1,makeMemory:()=>({
    search:async()=>[{source:'opencode:ses_unknown:user:msg_1',
      fact:'An unreviewed assertion.',evidenceClass:'user-stated'}]
  })});
  assert.equal(rep.aggregate.semantic.unadjudicated_selection,2);
  assert.equal(rep.aggregate.strict.unadjudicated_selection,2);
  assert.equal(rep.aggregate.semantic.matched_expected_case_fact_pairs,0);
  assert.equal(rep.observations[0].unknown_selected_digests[0].length,16);
});

test('native search timing and callback timing are never conflated',()=>{
  const summary=summarize([{policy:'strict',search_ms:25,selected:['f'],missed:[],
    case_id:'q',error:null,forbidden_selected:[],unknown_selected_digests:[],
    trace:{rpc:{search_memory_facts:1},rpc_decoded_json_chars:{search_memory_facts:41}}}]);
  assert.equal(summary.strict.search_p95_ms,25);
  assert.equal(summary.strict.rpc_calls,1);
  assert.equal(summary.semantic.n,0);
  assert.equal(summary.semantic.search_p95_ms,null);
});

test('out-of-range rounds and corrupted source truth stop without result',async()=>{
  await assert.rejects(runPairedRecall(freeze(),{}, {rounds:0,makeMemory:mock}),/bad rounds/);
  await assert.rejects(runPairedRecall(freeze(),{}, {rounds:4,makeMemory:mock}),/bad rounds/);
  const f=freeze();f.cases.push({...f.cases[0]});
  await assert.rejects(runPairedRecall(f,{}, {rounds:1,makeMemory:mock}),/duplicate\/invalid/);
});
