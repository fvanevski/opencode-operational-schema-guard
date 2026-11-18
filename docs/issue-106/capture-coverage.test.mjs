import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {compareFrozen,FROZEN_CASES,SCOPE} from './compare.mjs';
import {fromPromptCandidates,fromTool} from '../issue-78/v2-candidate/events.mjs';
import {selectClusters,ReviewStore,validateModelDecision,
  originalToolOutputSpan} from '../issue-78/v2-curator/core.mjs';
import {CandidateQueue,sourceFingerprint} from '../issue-78/v2-candidate/queue.mjs';
import {validateAutonomousDecision} from '../issue-100/autonomous-policy.mjs';
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
test('#106 source line labels preserve original positions across blank lines',()=>{
  const output='\nPASS smoke\n\nsecond\nthird\nfourth\n\nfifth';
  const event={sessionID:'ses_line',callID:'call_line',tool:'shell',status:'completed',
    input:{command:'node verify-lines.mjs'},result:{output:{exit:0,output}}};
  const covered=fromTool(event,SCOPE,{lineSelection:'coverage'});
  assert.ok(covered?.excerpt.includes('[2] PASS smoke | [5] third | [8] fifth'));
  assert.ok(!covered.excerpt.includes('[1] PASS smoke'));
});
test('#106 tool line clipping preserves complete source tokens',()=>{
  // At position 180 the original source is inside the word 'retrying'.
  const line='PASS '+'x'.repeat(171)+' retrying continues after the line budget';
  const output=[line,'ordinary row 2','middle source detail 3','row 4','tail source detail 5'].join('\n');
  const event={sessionID:'ses_clip',callID:'call_clip',tool:'shell',status:'completed',
    input:{command:'node verify-clipping.mjs'},result:{output:{exit:0,output}}};
  const covered=fromTool(event,SCOPE,{lineSelection:'coverage'});
  assert.ok(covered);
  assert.ok(covered.excerpt.includes('[1] PASS '+'x'.repeat(171)+' | [3]'));
  assert.ok(!covered.excerpt.includes('ret |'),
    'the text must never present a clipped word as a complete quoted token');
  assert.ok(covered.excerpt.includes('[5] tail source detail 5'));
  const unbroken='x'.repeat(220);
  const withoutBoundary=fromTool({...event,callID:'call_unbroken',
    result:{output:{exit:0,output:[unbroken,'row 2','middle source detail 3','row 4','tail source detail 5'].join('\n')}}},
    SCOPE,{lineSelection:'coverage'});
  assert.ok(withoutBoundary?.excerpt.includes('[3] middle source detail 3'));
  assert.ok(!withoutBoundary.excerpt.includes('[1] x'),
    'indivisible overlong tokens must not be represented by a fabricated prefix');
  const unicodeLine='PASS '+'x'.repeat(174)+'😀 followed by a diagnostic';
  const unicode=fromTool({...event,callID:'call_unicode',
    result:{output:{exit:0,output:[unicodeLine,'row 2','middle source detail 3','row 4','tail source detail 5'].join('\n')}}},
    SCOPE,{lineSelection:'coverage'});
  assert.ok(unicode);
  assert.ok(!unicode.excerpt.includes('\uD83D'),
    'a cut through a Unicode surrogate pair cannot enter the source excerpt');
});
test('#106 source-oriented isolation accepts colon-bearing authenticated session IDs',()=>{
  const sessionID='ses:valid';
  const native=fromPromptCandidates({sessionID,messageID:'native_msg',
    prompt:{text:'The public compatibility contract requires source-origin isolation.'}},
    SCOPE,{admitted:true});
  const tool=fromTool({sessionID,callID:'native_call',tool:'shell',status:'completed',
    input:{command:'node verify-source.mjs'},result:{output:{exit:0,output:'PASS source qualification'}}},SCOPE);
  assert.equal(native.length,1);
  assert.ok(tool);
  const clusters=selectClusters([...native,tool],{sourceMessageIsolation:true});
  assert.equal(clusters.length,2);
  assert.ok(clusters.flatMap(x=>x.events).every(x=>x.session_id===sessionID));
  assert.throws(()=>selectClusters([{...native[0],
    source_refs:['opencode:ses:valid:prompt:forged_native_source']}],
    {sourceMessageIsolation:true}),/source isolation strength\/handle mismatch/);
});
test('#106 cross-line synthetic tool quote cannot become authenticated fact',()=>{
  const output=[
    'PASS smoke',
    'ordinary stage two',
    'The parser requires UTF-8 input.',
    'ordinary stage four',
    'The client requires version two.'
  ].join('\r\n');
  const event=fromTool({sessionID:'ses_tool_auth',callID:'call_tool_auth',
    tool:'shell',status:'completed',input:{command:'node validate-input.mjs'},
    result:{output:{exit:0,output}}},SCOPE);
  assert.equal(event.kind,'tool_outcome');
  assert.equal(event.source_fragments.length,3);
  for(const fragment of event.source_fragments){
    assert.equal(event.excerpt.slice(fragment.start,fragment.end),
      output.slice(fragment.original_start,fragment.original_end));
  }
  const c=selectClusters([event],{sourceMessageIsolation:true})[0];
  const fact=quote=>({kind:'architecture',temporal_status:'observed',
    source_refs:event.source_refs,retention_status:'established_retention',
    utility_class:'stable_architecture',
    utility_reason:'Original source contains a reusable parser interface contract',
    evidence_quote:quote});
  const validQuote='The parser requires UTF-8 input.';
  const accepted=validateAutonomousDecision({decision:'EMIT',
    reason:'One original supported source statement',facts:[fact(validQuote)]},c);
  assert.equal(accepted.ok,true);
  assert.equal(accepted.facts.length,1);
  const recorded=accepted.fact_source_spans[0];
  assert.equal(output.slice(recorded.original_start,recorded.original_end),validQuote);
  assert.deepEqual(originalToolOutputSpan(event,recorded.start,recorded.end),
    {start:recorded.original_start,end:recorded.original_end});
  const composite='[3] '+validQuote+' | [5] The client requires version two.';
  assert.ok(event.excerpt.includes(composite));
  assert.equal(output.includes(composite),false);
  for(const forged of [
    {...fact(composite)},
    {...fact(validQuote),evidence_span:{source_ref:event.source_refs[0],
      start:event.excerpt.indexOf(composite),end:event.excerpt.indexOf(composite)+composite.length},
      evidence_quote:undefined},
    {...fact('tool exit 0; command: node validate-input.mjs')}
  ]){
    const result=validateAutonomousDecision({decision:'EMIT',
      reason:'Generated metadata cannot be source proof',facts:[forged]},c);
    assert.equal(result.ok,false);
    assert.equal(result.reason,'integrity_blocked');
    assert.equal(result.blocked_candidates[0].reason,'invalid_original_source_span');
  }
  const legacy=fromTool({sessionID:'ses_tool_legacy',callID:'call_tool_legacy',
    tool:'shell',status:'completed',input:{command:'node validate-input.mjs'},
    result:{output:{exit:0,output}}},SCOPE,{lineSelection:'markers'});
  assert.equal(legacy.source_fragments,undefined);
  const historical=selectClusters([legacy],{sourceMessageIsolation:true})[0];
  const blocked=validateAutonomousDecision({decision:'EMIT',
    reason:'Unattested historical output is not source evidence',
    facts:[{...fact(validQuote),source_refs:legacy.source_refs}]},historical);
  assert.equal(blocked.reason,'integrity_blocked');
});
test('#106 source fragments survive queue/archive fingerprint and durable review',async()=>{
  const output=['','PASS smoke','','The parser requires UTF-8 input.',
    'ordinary fourth','The client requires version two.'].join('\n');
  const event=fromTool({sessionID:'ses_map',callID:'call_map',tool:'shell',
    status:'completed',input:{command:'node validate-map.mjs'},
    result:{output:{exit:0,output}}},SCOPE);
  for(const f of event.source_fragments){
    assert.equal(event.excerpt.slice(f.start,f.end),
      output.slice(f.original_start,f.original_end));
  }
  assert.notEqual(sourceFingerprint(event),sourceFingerprint({
    ...event,source_fragments:undefined}));
  const root=await mkdtemp(path.join(os.tmpdir(),'issue106-tool-'));
  try{
    const q=new CandidateQueue(root,SCOPE.group);
    assert.equal((await q.stage(event)).status,'staged');
    const stored=await new CandidateQueue(root,SCOPE.group).get(event.event_id);
    assert.deepEqual(stored.source_fragments,event.source_fragments);
    assert.equal(sourceFingerprint(stored),sourceFingerprint(event));
    const c=selectClusters([stored],{sourceMessageIsolation:true})[0];
    const validated=validateAutonomousDecision({decision:'EMIT',
      reason:'One original tool-output contract',
      facts:[{kind:'architecture',temporal_status:'observed',
        source_refs:stored.source_refs,evidence_quote:'The parser requires UTF-8 input.',
        retention_status:'established_retention',utility_class:'stable_architecture',
        utility_reason:'Source-preserving tool output documents a durable contract'}]},c);
    assert.equal(validated.ok,true);
    assert.equal(validated.fact_source_spans.length,1);
    const created=await new ReviewStore(root,SCOPE.group).create(c,validated);
    assert.equal(created.record.state,'approved');
    assert.deepEqual(created.record.retention.source_span,validated.fact_source_spans[0]);
    assert.deepEqual(created.record.events[0].source_fragments,stored.source_fragments);
    const span=validated.fact_source_spans[0];
    assert.equal(output.slice(span.original_start,span.original_end),
      'The parser requires UTF-8 input.');
    const forged=validateModelDecision({decision:'EMIT',utility_class:'stable_architecture',
      reason:'Attempt to quote generated source labels',
      facts:[{kind:'architecture',temporal_status:'observed',
        source_refs:stored.source_refs,
        evidence_span:{source_ref:stored.source_refs[0],
          start:stored.excerpt.indexOf('[4]'),
          end:stored.excerpt.indexOf('[6]')+3}}]},c);
    assert.equal(forged.ok,false);
  }finally{await rm(root,{recursive:true,force:true});}
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
