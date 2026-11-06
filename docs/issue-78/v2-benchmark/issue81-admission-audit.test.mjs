import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCase} from './issue81-admission-audit.mjs';

function make(fact,source='opencode:s0:message:m0',extra={}) {
  return {fact,source,...extra};
}
test('pure admission diagnostic reports ratio near one third without changing recall',async()=>{
  const q='Which alpha beta gamma delta epsilon zeta?';
  const result=await auditCase({case_id:'S03',question:q,
    expected:make('The alpha beta observation.'),
    observed:make('The gamma delta observation.','opencode:s1:message:m1')});
  assert.equal(result.expected.admitted,true);
  assert.equal(result.expected.direct.overlap.score,1/3);
  assert.equal(result.expected.direct.eligible,true);
  assert.equal(result.expected.direct.failures.length,0);
  assert.equal(JSON.stringify(result).includes('alpha beta'),false);
  assert.equal(JSON.stringify(result).includes('gamma delta'),false);
});
test('same-metric candidates expose input-order ambiguity without making a source claim',async()=>{
  const fact='The archive retention layer stores verified manifests.';
  const q='Which archive retention layer stores verified manifests?';
  const result=await auditCase({case_id:'S10',question:q,
    expected:make(fact,'opencode:a:tool:1'),
    observed:make(fact,'opencode:a:tool:2')});
  assert.equal(result.pairwise.input_order_sensitive,true);
  assert.equal(result.pairwise.selected_observed_first,'observed');
  assert.equal(result.pairwise.selected_expected_first,'expected');
});
test('private and malformed sources are not printable diagnostic evidence',async()=>{
  await assert.rejects(auditCase({case_id:'S05',question:'Which archive service runs?',
    expected:make('The token is api_key=abc.'),
    observed:make('The archive service runs.','opencode:s1:tool:m1')}),/Invalid|Unsafe/);
});
