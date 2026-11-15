import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA,STAGES,scoreLedger} from './score-stage-ledger.mjs';
const stages=(values={})=>Object.fromEntries(STAGES.map(s=>[s,values[s]||[]]));
const controls={secret:false,wrong_group:false,false_verified:false};
const yes={id:'S03',kind:'positive',expected:['target'],stages:stages({
  graphiti:['target'],source_join:['target'],remote_proven:['target'],
  shortlist:['target'],candidate:['target'],presented:['target'],
  answer_supported:['target']}),context_chars:210,on_time:true,associated:true,controls};
const no={id:'N02',kind:'negative',expected:[],stages:stages({
  graphiti:['distractor'],source_join:['distractor'],remote_proven:['distractor'],
  shortlist:['distractor'],semantic:['distractor']}),
  context_chars:0,on_time:true,associated:true,controls};
const input=(cases=[yes,no],callbacks=[
  {duration_ms:15,injected:true,error:false,observation_kind:'native-context-hook'},
  {duration_ms:301,injected:false,error:true,observation_kind:'native-context-hook'},
])=>({schema:SCHEMA,cohort:'frozen',cases,callbacks});
test('separately scores recovered sources and negative abstention',()=>{
  const r=scoreLedger(input());
  assert.equal(r.selections.candidate.tp,1);
  assert.equal(r.candidate_vs_semantic.positive_coverage_delta,1);
  assert.equal(r.candidate_vs_semantic.negative_injection_delta,-1);
  assert.equal(r.status,'MEASUREMENT_ONLY_REQUIRES_INDEPENDENT_SOURCE_AND_HOST_PROOF');
});
test('p95 includes no-injection and error callbacks',()=>{
  const r=scoreLedger(input());
  assert.equal(r.callback_latency.p95_ms,301);
  assert.equal(r.callback_latency.errors,1);
  assert.equal(r.callback_latency.no_injection,1);
  assert.equal(r.callback_p95_within_300ms,false);
});
test('strict-only losses are explicit',()=>{
  const c={...yes,stages:stages({strict:['target']}),
    context_chars:0};
  assert.deepEqual(scoreLedger(input([c],[])).strict_only_losses,['S03']);
});
test('rejects raw identifiers, overbudget contexts and fabricated answer use',()=>{
  assert.throws(()=>scoreLedger(input([{...yes,expected:['opencode:source']}])) ,/INVALID_LEDGER/);
  assert.throws(()=>scoreLedger(input([{...yes,budget_chars:1401}])),/INVALID_LEDGER/);
  assert.throws(()=>scoreLedger(input([{...yes,on_time:false}])),/INVALID_LEDGER/);
  assert.throws(()=>scoreLedger(input([{...yes,stages:stages({answer_supported:['target']})}])),/INVALID_LEDGER/);
});
test('rendered chars and selector budget are different measurements',()=>{
  const result=scoreLedger(input([{...yes,context_chars:1500,budget_chars:1370}],[]));
  assert.deepEqual(result.native.rendered_over_1400_cases,['S03']);
  assert.deepEqual(result.native.missing_budget_measurement_cases,[]);
});
test('search RTT cannot masquerade as native context-hook evidence',()=>{
  const rows=[
    {duration_ms:156,injected:true,error:false,observation_kind:'graphiti-search-rtt'},
    {duration_ms:157,injected:true,error:false,observation_kind:'graphiti-search-rtt'},
  ];
  const result=scoreLedger(input([yes],rows));
  assert.equal(result.callback_latency.count,0);
  assert.equal(result.graphiti_search_latency.p95_ms,157);
  assert.equal(result.callback_p95_within_300ms,'UNVERIFIED');
});
test('unlabeled legacy samples do not certify native hook latency',()=>{
  const result=scoreLedger(input([yes],[{duration_ms:10,injected:true,error:false}]));
  assert.equal(result.callback_latency.count,0);
  assert.equal(result.unclassified_timing.count,1);
  assert.equal(result.callback_p95_within_300ms,'UNVERIFIED');
});
test('mixed observations cannot dilute a slow native hook',()=>{
  const result=scoreLedger(input([yes],[
    {duration_ms:20,injected:true,error:false,observation_kind:'graphiti-search-rtt'},
    {duration_ms:312,injected:false,error:false,observation_kind:'native-context-hook'},
  ]));
  assert.equal(result.callback_latency.p95_ms,312);
  assert.equal(result.callback_p95_within_300ms,false);
});
test('rejects unrecognized latency provenance kinds',()=>{
  assert.throws(()=>scoreLedger(input([yes],[
    {duration_ms:10,injected:true,error:false,observation_kind:'simulated-native'}])),/INVALID_LEDGER/);
});
test('no callbacks is UNVERIFIED',()=>{
  assert.equal(scoreLedger(input([yes],[])).callback_p95_within_300ms,'UNVERIFIED');
});
