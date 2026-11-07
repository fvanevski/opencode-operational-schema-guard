import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreSemanticReplays } from './score-semantic-replay.mjs';
const h=x=>x.repeat(64),group='development-knowledge',workspace='/workspace/mcp_servers/gh_mcp',project='gh_mcp';
function manifest(){return {schema:'issue81-frozen-source-scorecard.v1',frozen_roster_sha256:h('f'),group,workspace,project,cases:[
  {case_id:'S08',role:'positive',query_sha256:h('8'),expected_source_sha256:h('a'),tags:['indirect','multi_event']},
  {case_id:'S06',role:'positive',query_sha256:h('6'),expected_source_sha256:h('b'),tags:['historical']},
  {case_id:'N01',role:'negative',query_sha256:h('1'),tags:['unrelated']} ]};}
function mode(sources,t=120){return {elapsed_ms_shadow:t,count:sources.length,source_fingerprints:sources.map((source_sha256,i)=>({fact_sha256:h(String(i)),source_sha256,evidence_class:'tool-reported',temporal:'current state not independently verified'}))};}
function replay(q,strict,semantic,t=120){return {kind:'shadow-replay-not-native-hook',group,workspace,project,query_sha256:h(q),search_depth:24,context_wait_ms:'NOT_MEASURED',modes:{strict:mode(strict,t+15),semantic:mode(semantic,t)}};}
function batch(){return {schema:'issue81-shadow-replay-batch.v1',cases:[
  {case_id:'S08',replay:replay('8',[h('a')],[h('a'),h('c')])},
  {case_id:'S06',replay:replay('6',[h('b')],[h('d')],125)},
  {case_id:'N01',replay:replay('1',[],[h('c')],130)}]};}
test('preserves full case denominators and never upgrades counts to source match',()=>{
 const x=scoreSemanticReplays(manifest(),batch());
 assert.equal(x.case_count,3);assert.equal(x.positive_count,2);
 assert.equal(x.paired_comparison.strict.positive_source_exact_count,2);
 assert.equal(x.paired_comparison.semantic.positive_source_exact_count,1);
 assert.deepEqual(x.regressed_strict_source_cases,['S06']);
 assert.equal(x.paired_comparison.semantic.negative_nonempty_count,1);
 assert.equal(x.restrictions.human_precision,'UNVERIFIED_NOT_MEASURED');
 assert.equal(x.restrictions.native_context_hook_p95,'NOT_MEASURED');
});
test('rejects dropped cases, duplicates, changed expected source and mismatched query',()=>{
 let b=batch();b.cases.pop();assert.throws(()=>scoreSemanticReplays(manifest(),b),/incomplete_batch/);
 b=batch();b.cases.push(b.cases[0]);assert.throws(()=>scoreSemanticReplays(manifest(),b),/batch_entry/);
 b=batch();b.cases[0].replay.query_sha256=h('9');assert.throws(()=>scoreSemanticReplays(manifest(),b),/replay_query_or_depth/);
});
test('rejects wrong group and malformed fingerprints instead of silently scoring',()=>{
 let b=batch();b.cases[0].replay.group='another-group';assert.throws(()=>scoreSemanticReplays(manifest(),b),/source_scope/);
 b=batch();b.cases[0].replay.modes.semantic.source_fingerprints[0].evidence_class='verified';
 assert.throws(()=>scoreSemanticReplays(manifest(),b),/mode_fingerprint/);
});
test('source drift is a reported miss, not a relabeled match',()=>{
 const m=manifest();m.cases[0].expected_source_sha256=h('e');
 const x=scoreSemanticReplays(m,batch());
 assert.equal(x.rows[0].modes.semantic.expected_source_in_context,false);
 assert.equal(x.paired_comparison.semantic.positive_source_exact_count,0);
});
