/** Diagnostic only. Raw case input is private; output contains reason codes, not text. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {safeText} from '../../issue-75/v2-candidate/memory-core.mjs';
import {explainRelevanceAdmission,relevanceSignals,answerTypeSupport,
  shortlistQualifiedCandidates,relevanceFilter,lexicalSupport} from '../../issue-75/v2-candidate/relevance.mjs';

const HASH=x=>createHash('sha256').update(String(x)).digest('hex');
const CASES=new Set(['S03','S05','S10','S13']);
function assertCase(c) {
  if(!CASES.has(c?.case_id)||typeof c.question!=='string'||
    safeText(c.question,500)!==c.question||c.question.length<10)
    throw Error('Invalid or private query');
  for(const field of ['expected','observed']){
    const obj=c[field];
    if(!obj||typeof obj.fact!=='string'||safeText(obj.fact,480)!==obj.fact||
      typeof obj.source!=='string'||!obj.source.startsWith('opencode:')||
      obj.source.length>1200)
      throw Error('Missing/invalid source-bound '+field+' candidate');
    if(obj.sourceContext!==undefined&&
      safeText(obj.sourceContext,500)!==obj.sourceContext)
      throw Error('Unsafe source excerpt');
  }
}
function profile(query,item) {
  const d=explainRelevanceAdmission(query,item);
  const effective= d.linkedUsed ? d.linked:d.direct;
  return {admitted:d.admitted,linkedUsed:d.linkedUsed,linkedFallbackBlocked:d.linkedFallbackBlocked,
    direct:d.direct,linked:d.linked,
    effectivePriority: effective?.eligible ? relevanceSignals(
      query,d.linkedUsed?item.fact+' '+item.sourceContext:item.fact).priority : 0,
    answerType:answerTypeSupport(query,item.fact),
    sourceContextOverlap:item.sourceContext?lexicalSupport(query,item.sourceContext):null};
}
export async function auditCase(c) {
  assertCase(c);
  const q=c.question;
  const expected=profile(q,c.expected),observed=profile(q,c.observed);
  const pair=[c.observed,c.expected];
  const a=shortlistQualifiedCandidates(q,pair);
  const b=shortlistQualifiedCandidates(q,[...pair].reverse());
  const selectedA=await relevanceFilter(q,a);
  const selectedB=await relevanceFilter(q,b);
  const key=(x)=>x===c.expected?'expected':x===c.observed?'observed':'none';
  return {case_id:c.case_id,query_sha256:HASH(q),
    expected_source_sha256:HASH(c.expected.source),
    observed_source_sha256:HASH(c.observed.source),
    fact_text_exported:false,
    expected,observed,
    pairwise: {
      shortlist_observed_first:a.map(key),
      shortlist_expected_first:b.map(key),
      selected_observed_first:key(selectedA[0]),
      selected_expected_first:key(selectedB[0]),
      input_order_sensitive:key(selectedA[0])!==key(selectedB[0])
    },
    diagnostic_class:'PURE_SOURCE_BOUND_EVALUATION_NOT_NATIVE_ACCEPTANCE'};
}
async function main() {
  if(process.argv.length!==4||process.argv[2]!=='--input')
    throw Error('Usage: node issue81-admission-audit.mjs --input PRIVATE_JSON');
  const input=JSON.parse(await readFile(process.argv[3],'utf8'));
  if(!Array.isArray(input.cases)||input.cases.length!==4||
    input.cases.some(c=>!CASES.has(c.case_id))||
    new Set(input.cases.map(c=>c.case_id)).size!==4)
    throw Error('Expected exactly four distinct S03/S05/S10/S13 case records');
  const cases=[];
  for(const c of input.cases)cases.push(await auditCase(c));
  process.stdout.write(JSON.stringify({schema:'issue81-admission-audit.v1',
    disclaimer:'No behavioral changes. Not source authority or native acceptance.',
    cases},null,2)+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(e=>{process.stderr.write('AUDIT_BLOCKED: '+e.message+'\n');process.exitCode=2;});
