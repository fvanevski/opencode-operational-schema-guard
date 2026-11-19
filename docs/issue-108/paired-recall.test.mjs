import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,stat,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {validateFreeze,runPairedRecall,summarize,readOnlyJournal,trackOptionalWork}
  from './paired-recall.mjs';

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

test('diagnostic journal cannot create a missing root and preserves read-only page semantics',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'issue108-journal-'));
  try {
    const missing=path.join(root,'missing');
    await assert.rejects(async()=>{for await(const _ of
      readOnlyJournal(missing,'development-knowledge').pages()){}}, {code:'ENOENT'});
    await assert.rejects(stat(missing),{code:'ENOENT'});
    const existing=path.join(root,'existing'),group='development-knowledge';
    const dir=path.join(existing,group);
    await mkdir(dir,{recursive:true});
    const uuid='01234567-89ab-cdef-0123-456789abcdef';
    await writeFile(path.join(dir,uuid+'.json'),JSON.stringify({uuid,group,status:'persisted'}));
    await writeFile(path.join(dir,'not-an-episode.json'),'ignored');
    const pages=[];
    for await(const page of readOnlyJournal(existing,group).pages({pageSize:1}))pages.push(page);
    assert.equal(pages.length,1);
    assert.deepEqual(pages[0].map(row=>row.uuid),[uuid]);
    await assert.rejects(async()=>{for await(const _ of
      readOnlyJournal(existing,group).pages({pageSize:501})){}},/pageSize/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('post-search settlement records delayed optional errors without inflating search latency',async()=>{
  const f=freeze();f.cases=[f.cases[0]];
  const report=await runPairedRecall(f,{}, {rounds:1,optionalSettleMs:1000,
    makeMemory:(_freeze,_config,_policy,trace)=>({search:async()=>{
      const late=new Promise((_,reject)=>setTimeout(()=>{
        trace.curated_errors++;
        reject(Error('late optional curated lookup failed'));
      },120));
      trackOptionalWork(trace,late);
      return [];
    }})});
  assert.equal(report.observations.length,2);
  for(const row of report.observations){
    assert.equal(row.trace.optional_work_complete,true);
    assert.equal(row.trace.optional_work_pending,0);
    assert.equal(row.trace.curated_errors,1);
    assert.ok(row.search_ms<120,'search time must exclude the later completion');
    assert.ok(row.trace.optional_settle_wait_ms>0);
  }
  for(const policy of ['strict','semantic']){
    assert.equal(report.aggregate[policy].swallowed_optional_errors,1);
    assert.equal(report.aggregate[policy].optional_work_incomplete_observations,0);
  }
});

test('post-return indexed evidence cannot retroactively change search-stage reach',async()=>{
  const f=freeze();f.cases=[f.cases[0]];
  const sourceKey=createHash('sha256').update(source+String.fromCharCode(0)+fact).digest('hex');
  const report=await runPairedRecall(f,{}, {rounds:1,optionalSettleMs:1000,
    makeMemory:(_freeze,_config,_policy,trace)=>({search:async()=>{
      const late=new Promise(resolve=>setTimeout(()=>{
        trace.indexed_exact_keys.add(sourceKey);
        resolve();
      },100));
      trackOptionalWork(trace,late);
      return [];
    }})});
  for(const row of report.observations){
    assert.equal(row.trace.optional_work_complete,true);
    assert.equal(row.stages['fact-a'].curated_source_candidate_seen,false);
  }
});

test('unresolved optional work makes error totals explicitly incomplete',async()=>{
  const f=freeze();f.cases=[f.cases[0]];
  const report=await runPairedRecall(f,{}, {rounds:1,optionalSettleMs:5,
    makeMemory:(_freeze,_config,_policy,trace)=>({search:async()=>{
      trackOptionalWork(trace,new Promise(()=>{}));
      return [];
    }})});
  for(const row of report.observations){
    assert.equal(row.trace.optional_work_complete,false);
    assert.equal(row.trace.optional_work_pending,1);
  }
  for(const policy of ['strict','semantic']){
    assert.equal(report.aggregate[policy].swallowed_optional_errors,null);
    assert.equal(report.aggregate[policy].observed_swallowed_optional_errors_lower_bound,0);
    assert.equal(report.aggregate[policy].optional_work_incomplete_observations,1);
  }
});
