import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareWorksheet,prepareTargets,score,digest} from './adjudicate.mjs';
const scope={group:'cur81_dev',project:'qualified_project',workspace:'/tmp/opencode'};
const c={schema_version:1,split:'holdout',label_status:'provisional',scope,
 cases:[{id:'case-1',source_type:'prompt',category:'direct',
  source_locator:'sanitized:unit:1',
  native_event:{sessionID:'ses_unit',messageID:'msg_unit',
    timestamp:'2026-11-04T00:00:00Z',
    prompt:{text:'The architecture must preserve the existing Graphiti storage and review controls.'}},
  label:{valuable:false}}]};
const p={schema_version:1,status:'central_proposal',thresholds:{
 candidate_recall_min:.85,durable_grounded_precision_min:.9,
 semantic_recall_min:.8,context_p95_ms_max:300,post_exit_p95_seconds_max:900}};
const C=JSON.stringify(c),P=JSON.stringify(p);
function setup(){
 const a=prepareWorksheet(c,digest(C));
 a.status='OPERATOR_RATIFIED';a.adjudicated_by='human_judge';
 a.adjudicated_at='2026-11-04T11:00:00Z';
 a.operator_confirmation='I reviewed the frozen evidence and adjudicated these labels myself.';
 a.case_labels[0].valuable=true;a.case_labels[0].source_checked=true;
 const t=prepareTargets(p,digest(P));
 t.status='OPERATOR_RATIFIED';t.ratified_by='human_judge';
 t.ratified_at='2026-11-04T10:00:00Z';
 t.operator_confirmation='I ratify the original proposed thresholds before holdout scoring.';
 return {a,t};
}
const invoke=(a,t,overrides={})=>{
 const A=JSON.stringify(a),T=JSON.stringify(t);
 return score({corpusBytes:C,expectedCorpusSha:digest(C),adjudicationBytes:A,
   expectedAdjudicationSha:digest(A),proposalBytes:P,expectedProposalSha:digest(P),
   ratificationBytes:T,expectedRatificationSha:digest(T),...overrides});
};
test('worksheets preserve provisional source while requiring an actual operator',()=>{
 const a=prepareWorksheet(c,digest(C));
 assert.equal(a.case_labels[0].proposed_valuable,false);
 assert.equal(a.case_labels[0].valuable,null);
 assert.equal(a.status,'DRAFT_UNRATIFIED');
 assert.equal(a.fact_verdicts.length,0);
 const t=prepareTargets(p,digest(P));
 assert.equal(t.status,'DRAFT_UNRATIFIED');
 assert.throws(()=>invoke(a,t),/not_ratified/);
});
test('scores separately ratified source without changing frozen bytes',()=>{
 const {a,t}=setup();
 const original=C;
 const result=invoke(a,t);
 assert.equal(result.authority.source_bytes_unchanged,true);
 assert.equal(result.authority.case_label_changes_from_provisional,1);
 assert.equal(result.report.split,'holdout');
 assert.equal(result.report.label_status,'operator_adjudicated');
 assert.equal(result.report.baseline.tp,1);
 assert.equal(result.report.target_status,'operator_ratified');
 assert.equal(C,original);
});
test('refuses hash substitution, incomplete labels and source mismatch',()=>{
 const {a,t}=setup();
 assert.throws(()=>invoke(a,t,{expectedCorpusSha:'0'.repeat(64)}),/corpus_sha256_mismatch/);
 a.case_labels[0].source_checked=false;
 assert.throws(()=>invoke(a,t),/case_label_invalid/);
 a.case_labels[0].source_checked=true;a.case_labels[0].source_locator='different';
 assert.throws(()=>invoke(a,t),/source_label_binding/);
});
test('fact review is mandatory for every observed assertion and exact source',()=>{
 const d={...c,split:'development'};
 const raw=JSON.stringify(d);
 const {t}=setup();
 const obs={schema_version:1,records:[{
  cluster_id:'a'.repeat(64),source_case_ids:['case-1'],
  decision:'EMIT',origin:'model',reason:'grounded',
  facts:[{assertion:'A source text',source_refs:['opencode:ses_unit:message:msg_unit']}]}]};
 const a=prepareWorksheet(d,digest(raw),obs);
 assert.equal(a.fact_verdicts.length,1);
 a.status='OPERATOR_RATIFIED';a.adjudicated_by='human_judge';
 a.adjudicated_at='2026-11-04T11:00:00Z';
 a.operator_confirmation='I reviewed the frozen evidence and adjudicated these labels myself.';
 a.case_labels[0].valuable=true;a.case_labels[0].source_checked=true;
 const A=JSON.stringify(a),T=JSON.stringify(t);
 assert.throws(()=>score({corpusBytes:raw,expectedCorpusSha:digest(raw),
  adjudicationBytes:A,expectedAdjudicationSha:digest(A),
  proposalBytes:P,expectedProposalSha:digest(P),
  ratificationBytes:T,expectedRatificationSha:digest(T),
  observationsBytes:JSON.stringify(obs)}),/fact_verdict_invalid/);
});
