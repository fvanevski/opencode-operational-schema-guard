import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {diagnose} from './diagnose-capture.mjs';
import {replay} from './evaluate.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const scope={group:'cur81_dev',project:'bench',workspace:'/tmp/bench'};
const timestamp='2026-11-04T18:00:00Z';
const prompt=(id,text)=>({id,source_type:'prompt',category:'direct',
 source_locator:'sanitized:test:'+id,
 native_event:{sessionID:'ses_case',messageID:'msg_'+id,timestamp,prompt:{text}},
 label:{valuable:true}});
const tool=(id,command,exit)=>({id,source_type:'tool',category:'error_fix',
 source_locator:'sanitized:test:'+id,
 native_event:{sessionID:'ses_case',callID:'call_'+id,timestamp,
   tool:'bash',status:'completed',input:{command},
   result:{output:exit===null?{}:{exit,output:'test passed'}}},
 label:{valuable:true}});
function setup(){
 const cases=[
  prompt('short','ok'),
  prompt('selected','I prefer to retain the existing source-indexed Graphiti API.'),
  tool('read','cat package.json',0),
  tool('missing','node --test worker.test.mjs',null),
  tool('pass','node --test worker.test.mjs',0),
  {...prompt('wrong','I prefer a safe architecture revision.'),
   scope:{...scope,group:'other'}}];
 const corpus={schema_version:1,split:'development',label_status:'provisional',
  scope,cases},raw=JSON.stringify(corpus);
 const rows=cases.map(c=>{const x=replay(c,scope);return {
  id:c.id,category:c.category,truth:true,
  baseline_selected:Boolean(x.baseline),candidate_selected:Boolean(x.candidate)};});
 const score={authority:{frozen_corpus_sha256:sha(raw)},
  report:{case_count:cases.length,label_status:'operator_adjudicated',rows}};
 return {corpus,raw,score};
}
test('classifies misses from actual adapter decisions, exports no source text',()=>{
 const {corpus,raw,score}=setup(),r=diagnose(corpus,score,raw);
 assert.equal(r.missed,4);
 assert.equal(r.misses.find(x=>x.case_id==='short').reason_code,'PROMPT_BELOW_LENGTH_FLOOR');
 assert.equal(r.misses.find(x=>x.case_id==='read').reason_code,'INTENTIONAL_READ_ONLY_COMMAND_FILTER');
 assert.equal(r.misses.find(x=>x.case_id==='missing').reason_code,'TOOL_RESULT_EXIT_AND_TEXT_MISSING');
 assert.equal(r.misses.find(x=>x.case_id==='wrong').reason_code,'ORIGINAL_SOURCE_SCOPE_EXCLUDED');
 assert.equal(r.misses_by_gate.INTENTIONAL_READ_ONLY_COMMAND_FILTER,1);
 const exported=JSON.stringify(r);
 assert.equal(exported.includes('cat package.json'),false);
 assert.equal(exported.includes('I prefer'),false);
 assert.equal(exported.includes('/tmp/bench'),false);
});
test('refuses wrong ratified identities, corrupted source and false adapter claims',()=>{
 const {corpus,raw,score}=setup();
 assert.throws(()=>diagnose(corpus,{...score,
  authority:{frozen_corpus_sha256:'0'.repeat(64)}},raw),/IDENTITY_REQUIRED/);
 const bad=JSON.parse(JSON.stringify(score));
 bad.report.rows[1].candidate_selected=false;
 assert.throws(()=>diagnose(corpus,bad,raw),/REPLAY_MISMATCH/);
 assert.throws(()=>diagnose({...corpus,cases:corpus.cases.slice(1)},score,raw),
  /IDENTITY_REQUIRED/);
});
