import test from 'node:test';
import assert from 'node:assert/strict';
import {plan} from './stage-holdout.mjs';
const group='cur81_holdout_01a2b3c4';
const base={group:'cur81_dev',project:'qualified_project',workspace:'/tmp/opencode'};
const prompt=(id,text,extra={})=>({id,source_type:'prompt',category:'implicit',
 source_locator:'private:'+id,native_event:{sessionID:'ses123',messageID:'msg'+id,
 timestamp:'2026-11-04T00:00:00Z',prompt:{text}},label:{valuable:true},...extra});
const c={schema_version:1,split:'holdout',label_status:'operator_adjudicated',
 adjudicated_by:'human',scope:base,cases:[
 prompt('a','I prefer a bounded Graphiti source index for all future memory assertions.',{scope:base}),
 prompt('b','Thanks', {category:'chatter',label:{valuable:false}}),
 prompt('c','I prefer to reuse the existing model admission policy.',{
  scope:{...base,group:'other_group'}})
]};
test('stages qualified source once, excludes chatter and wrong group',()=>{
 const p=plan(c,group);
 assert.equal(p.selected.length,1);
 assert.equal(p.excluded.length,2);
 assert.equal(p.selected[0].event.group,group);
 assert.equal(p.selected[0].event.source_strength,'native-id');
});
test('pre-ratified long native prompt stages every bounded span in a fresh holdout group',()=>{
 const longer=('Preserve native source boundaries and ensure citations remain valid. ').repeat(110);
 const testCorpus={...c,cases:[prompt('long',longer)]};
 const planned=plan(testCorpus,group);
 assert.ok(planned.selected.length>1&&planned.selected.length<=6);
 assert.equal(new Set(planned.selected.map(x=>x.event.event_id)).size,planned.selected.length);
 assert.ok(planned.selected.every(x=>x.id==='long'&&
   x.event.source_refs[0].includes(':span:')&&x.event.group===group));
});
test('rejects production group and weak fallback identifiers',()=>{
 assert.throws(()=>plan(c,'ghdev_gh_mcp'),/HOLDOUT_SCOPE_REQUIRED/);
 const x={...c,cases:[prompt('x','I prefer to keep this Graphiti review policy.',{
   native_event:{sessionID:'ses123',timestamp:'2026-11-04T00:00:00Z',
    prompt:{text:'I prefer to keep this Graphiti review policy.'}}})]};
 assert.throws(()=>plan(x,group),/NO_NATIVE_CANDIDATES/);
});
