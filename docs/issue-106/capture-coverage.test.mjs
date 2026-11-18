import test from 'node:test';
import assert from 'node:assert/strict';
import {compareFrozen,FROZEN_CASES,SCOPE} from './compare.mjs';
import {fromPromptCandidates,fromTool} from '../issue-78/v2-candidate/events.mjs';
import {selectClusters} from '../issue-78/v2-curator/core.mjs';
test('#106 frozen source opportunities compare baseline and candidate at unchanged inputs',()=>{
  const [base,next]=compareFrozen();
  assert.equal(base.variant,'baseline');
  assert.equal(next.variant,'candidate');
  assert.deepEqual(base.cases.map(c=>c.id),next.cases.map(c=>c.id));
  assert.equal(base.totals.opportunities,next.totals.opportunities);
  assert.equal(base.totals.invalid_cases_rejected,2);
  assert.equal(next.totals.invalid_cases_rejected,2);
  assert.ok(next.cases.every(c=>c.offsets_valid));
  assert.ok(next.totals.model_visible_opportunities>=base.totals.model_visible_opportunities);
  assert.ok(next.totals.model_visible_opportunities>base.totals.model_visible_opportunities,
    'frozen synthetic candidate must recover at least one distinct safe opportunity');
  assert.equal(base.source_grouping.clusters,1);
  assert.equal(next.source_grouping.clusters,4);
  assert.equal(base.source_grouping.model_fact_slots_upper_bound,3);
  assert.equal(next.source_grouping.model_fact_slots_upper_bound,4);
});
test('#106 native long spans preserve original offsets; no secret or injected context admitted',()=>{
  const c=FROZEN_CASES.find(x=>x.id==='long_middle');
  const e=fromPromptCandidates({sessionID:'ses_a',messageID:'msg_a',
    prompt:{text:c.original}},SCOPE,{admitted:true});
  assert.ok(e.length>0&&e.length<=6);
  assert.equal(new Set(e.map(x=>x.event_id)).size,e.length);
  for(const s of e){
    const m=/:span:(\d+)$/.exec(s.source_refs[0]);assert.ok(m);
    assert.equal(c.original.slice(Number(m[1]),Number(m[1])+s.excerpt.length),s.excerpt);
    assert.equal(s.source_strength,'native-id');
  }
  for(const bad of FROZEN_CASES.filter(x=>!x.valid))
    assert.deepEqual(fromPromptCandidates({sessionID:'ses_a',messageID:'bad_'+bad.id,
      prompt:{text:bad.original}},SCOPE,{admitted:true}),[]);
});
test('#106 one native message keeps its spans together and two native messages cannot steal budgets',()=>{
  const p=FROZEN_CASES.find(x=>x.id==='long_middle');
  const make=(id)=>fromPromptCandidates({sessionID:'ses_b',messageID:id,
    prompt:{text:p.original}},SCOPE,{admitted:true});
  const a=make('msg_a'),b=make('msg_b');
  const groups=selectClusters([...a,...b],{sourceMessageIsolation:true});
  assert.equal(groups.length,2);
  assert.deepEqual(groups.map(x=>x.events.length),[a.length,b.length]);
  assert.deepEqual(groups.map(x=>x.source_event_ids.sort()),
    [a.map(x=>x.event_id).sort(),b.map(x=>x.event_id).sort()]);
});
test('#106 tool coverage retains an actionable failure behind a routine PASS marker',()=>{
  const output=[
    'PASS initial smoke check',
    'ERROR: parser compatibility contract rejected the configured token',
    'routine middle result row',
    'ordinary progress row',
    'final diagnostic review notes'
  ].join('\n');
  const native={sessionID:'ses_tool',callID:'call_tool',tool:'shell',status:'failed',
    input:{command:'node run-compat-check.mjs'},result:{output:{exit:1,output}}};
  const legacy=fromTool(native,SCOPE,{lineSelection:'markers'});
  const covered=fromTool(native,SCOPE,{lineSelection:'coverage'});
  assert.ok(legacy?.excerpt.includes('ERROR: parser compatibility contract'));
  assert.ok(covered?.excerpt.includes('[2] ERROR: parser compatibility contract'));
  assert.ok(covered?.excerpt.includes('[3] routine middle result row'));
  assert.ok(covered?.excerpt.includes('[5] final diagnostic review notes'));
  assert.ok(!covered.excerpt.includes('[1] PASS initial smoke check'));
  assert.deepEqual(covered.source_refs,legacy.source_refs);
  assert.equal(covered.source_strength,'native-id');
});
test('#106 weak fallback is isolated without becoming a native authenticated message',()=>{
  const text='The source author requires a bounded parser validation contract.';
  const fallback=fromPromptCandidates({sessionID:'ses_c',prompt:{text}},SCOPE,{admitted:true});
  const native=fromPromptCandidates({sessionID:'ses_c',messageID:'m_native',
    prompt:{text:'The runtime must preserve exact native source provenance.'}},
    SCOPE,{admitted:true});
  assert.equal(fallback.length,1);
  assert.equal(fallback[0].source_strength,'session-scoped-fallback');
  const groups=selectClusters([...fallback,...native],{sourceMessageIsolation:true});
  assert.equal(groups.length,2);
  assert.equal(groups.flatMap(g=>g.events).find(e=>e.event_id===fallback[0].event_id)
    .source_strength,'session-scoped-fallback');
});
