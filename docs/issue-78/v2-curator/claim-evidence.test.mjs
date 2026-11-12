import test from 'node:test';
import assert from 'node:assert/strict';
import {fromPrompt} from '../v2-candidate/events.mjs';
import {selectClusters} from './core.mjs';
import {claimEvidenceDiscoveryPrompt,validateClaimEvidenceDiscovery,
 claimSupportPrompt,validateClaimSupport,supportedClaimProposal,
 claimUtilityPrompt,claimSourceVocabularyOverlap} from './claim-evidence.mjs';

const scope={group:'issue92claims',project:'project92',workspace:'/workspace/project92'};
const evidence='Graphiti MCP get_episodes requires group_ids to be an array to return the requested group episodes.';
const claim='Graphiti MCP episode lookup requires an array-valued group_ids argument.';
const src=()=>fromPrompt({sessionID:'session92',messageID:'message92',
 prompt:{text:evidence},timestamp:'2026-11-11T12:00:00Z'},
 scope,{admitted:true});
const cluster=()=>selectClusters([src()])[0];
const proposal=c=>{
 const e=c.events[0];
 return {reason:'source technical predicate',candidates:[{
  kind:'dependency',temporal_status:'observed',source_ref:e.source_refs[0],
  start:0,end:e.excerpt.length,normalized_claim:claim
 }]};
};
test('S4 discovery keeps normalized proposal distinct from authenticated exact quote',()=>{
 const c=cluster(),p=validateClaimEvidenceDiscovery(proposal(c),c);
 assert.equal(p.ok,true);assert.equal(p.facts.length,1);
 assert.equal(p.facts[0].assertion,c.events[0].excerpt);
 assert.equal(p.claims[0].claim,claim);
 assert.notEqual(p.claims[0].claim,p.facts[0].assertion);
 assert.deepEqual(p.claims[0].evidence_span,{source_ref:c.events[0].source_refs[0],
  start:0,end:c.events[0].excerpt.length});
 const prompt=claimEvidenceDiscoveryPrompt(c);
 assert.match(prompt[0].content,/normalized_claim/);
 assert.match(prompt[0].content,/never a verified fix/i);
});
test('S4 malformed source attribution, span and claim fields cannot become facts',()=>{
 const c=cluster(),e=c.events[0],valid=proposal(c);
 const rejected=[
  {...valid.candidates[0],source_ref:'opencode:forged'},
  {...valid.candidates[0],end:e.excerpt.length+200},
  {...valid.candidates[0],normalized_claim:'too short'}
 ];
 for(const bad of rejected){
  const p=validateClaimEvidenceDiscovery({reason:'bad',candidates:[bad]},c);
  assert.equal(p.ok,false);assert.deepEqual(p.facts,[]);
  assert.equal(p.invalid_candidates.length,1);
 }
 const mixed=validateClaimEvidenceDiscovery({reason:'mixed',candidates:[
  valid.candidates[0],rejected[0]]},c);
 assert.equal(mixed.ok,true);assert.equal(mixed.facts.length,1);
 assert.equal(mixed.invalid_candidates[0].index,1);
});
test('S4 lexical near miss reaches independent support and remains rejectable',()=>{
 const c=cluster(),e=c.events[0],candidate={
  ...proposal(c).candidates[0],normalized_claim:'Graphiti implements caching.'
 };
 const p=validateClaimEvidenceDiscovery({reason:'unverified paraphrase',
  candidates:[candidate]},c);
 assert.equal(p.ok,true);
 assert.equal(p.facts.length,1);
 assert.equal(p.facts[0].assertion,e.excerpt);
 assert.equal(p.claims[0].source_vocabulary_overlap,1/3);
 assert.equal(claimSourceVocabularyOverlap(candidate.normalized_claim,e.excerpt),1/3);
 const support=claimSupportPrompt(c,p);
 assert.equal(JSON.parse(support[1].content).candidates[0].normalized_claim,
  candidate.normalized_claim);
 const verdict=validateClaimSupport({decisions:[{
  index:0,disposition:'REVIEW',reason_code:'missing_predicate'}]},p);
 assert.equal(verdict.ok,true);
 assert.equal(supportedClaimProposal(p,verdict).proposal.ok,false);
});
test('S4 lexical zero overlap remains a diagnostic, not semantic authorization',()=>{
 const c=cluster(),candidate={...proposal(c).candidates[0],
  normalized_claim:'Successful deployment finished without any production incidents.'};
 const p=validateClaimEvidenceDiscovery({reason:'unsupported claim',
  candidates:[candidate]},c);
 assert.equal(p.ok,true);
 assert.equal(p.claims[0].source_vocabulary_overlap,0);
 assert.equal(p.invalid_candidates.length,0);
 const verdict=validateClaimSupport({decisions:[{
  index:0,disposition:'REVIEW',reason_code:'unsupported_inference'}]},p);
 assert.equal(verdict.ok,true);
 assert.equal(supportedClaimProposal(p,verdict).proposal.facts.length,0);
});
test('S4 independent source critic must return exact support quote and preserve source class',()=>{
 const c=cluster(),p=validateClaimEvidenceDiscovery(proposal(c),c);
 const prompt=claimSupportPrompt(c,p);
 const inp=JSON.parse(prompt[1].content);
 assert.equal(inp.candidates[0].normalized_claim,claim);
 assert.equal(inp.candidates[0].exact_evidence_quote,c.events[0].excerpt);
 const supported={decisions:[{index:0,disposition:'SUPPORTED',
  reason_code:'supported_as_reported',supporting_phrase:p.facts[0].assertion}]};
 const check=validateClaimSupport(supported,p);
 assert.equal(check.ok,true);assert.equal(check.supported.length,1);
 const joined=supportedClaimProposal(p,check);
 assert.equal(joined.proposal.facts[0].assertion,c.events[0].excerpt);
 assert.equal(joined.proposal.claims[0].claim,claim);
 const utility=claimUtilityPrompt(c,joined.proposal);
 assert.equal(JSON.parse(utility[1].content).candidates[0].source_supported_claim,claim);
 for(const invalid of [
  {decisions:[{...supported.decisions[0],supporting_phrase:'Fabricated support outside the quote'}]},
  {decisions:[{...supported.decisions[0],reason_code:'supported_as_observed'}]},
  {decisions:[{...supported.decisions[0],index:1}]},
  {decisions:[{index:0,disposition:'SUPPORTED',reason_code:'unknown',
   supporting_phrase:p.facts[0].assertion}]}
 ])assert.equal(validateClaimSupport(invalid,p).ok,false);
});
test('S4 unsupported/ambiguous claims remain deferred before utility or remote writes',()=>{
 const c=cluster(),p=validateClaimEvidenceDiscovery(proposal(c),c);
 const verdict=validateClaimSupport({decisions:[{index:0,
  disposition:'REVIEW',reason_code:'unsupported_inference'}]},p);
 assert.equal(verdict.ok,true);assert.equal(verdict.supported.length,0);
 const result=supportedClaimProposal(p,verdict);
 assert.equal(result.proposal.ok,false);
 assert.equal(result.deferred[0].reason,'unsupported_inference');
});
