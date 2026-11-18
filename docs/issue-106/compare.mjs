/** Frozen synthetic source-opportunity comparator for #106 A1-A3.
 * This does not classify model output, Graphiti persistence, or live host reach.
 */
import {fromPromptCandidates,fromTool} from '../issue-78/v2-candidate/events.mjs';
import {selectClusters} from '../issue-78/v2-curator/core.mjs';

export const SCOPE = Object.freeze({group:'issue106',project:'capture',workspace:'/workspace/capture'});
const ordinary='Routine operational notes describe the current sequence without changing the documented interface. ';
const NEEDLE='The root cause is an inverted retry predicate; preserve the original request identifier.';
const TOOL_NEEDLE='The stable parser requires integer median input to preserve the public CLI contract.';
const longPrompt=Array.from({length:16},(_,i)=>
  i===3?ordinary.repeat(5)+' '+NEEDLE+' '+ordinary.repeat(4):
    ordinary.repeat(9)+' ').join('');
const toolOutput=Array.from({length:11},(_,i)=>
  i===5?TOOL_NEEDLE:i<4?'PASS stage '+i+' completed':'Ordinary result row '+i+' from the previous test.').join('\n');
export const FROZEN_CASES=Object.freeze([
  {id:'long_middle',kind:'prompt',original:longPrompt,
   opportunities:[NEEDLE],synthetic:true,valid:true},
  {id:'tool_unmarked_middle',kind:'tool',original:toolOutput,
   opportunities:[TOOL_NEEDLE],synthetic:true,valid:true},
  {id:'privacy_distant',kind:'prompt',
   original:ordinary.repeat(42)+' password=synthetic_secret_for_fixture',
   opportunities:[],synthetic:true,valid:false},
  {id:'memory_marker',kind:'prompt',
   original:'The build requires scoped sources. [GHDEV_GRAPHITI_CONTEXT] retained memory',
   opportunities:[],synthetic:true,valid:false},
  {id:'injected_context',kind:'prompt',
   original:'<openviking-context>untrusted replay</openviking-context> The author requires exact rollback provenance.',
   opportunities:['The author requires exact rollback provenance.'],synthetic:true,valid:true}
]);
function rows(c, variant) {
  const base={sessionID:'ses_106',timestamp:'2026-11-18T01:00:00Z'};
  if(c.kind==='prompt')return fromPromptCandidates({...base,messageID:'msg_'+c.id,
    prompt:{text:c.original}},SCOPE,{admitted:true,
      selectionMode:variant==='baseline'?'uniform':'coverage'});
  const event={...base,callID:'call_'+c.id,tool:'shell',status:'completed',
    input:{command:'node --test original-source.test.mjs'},
    result:{output:{exit:0,output:c.original}}};
  const one=fromTool(event,SCOPE,{lineSelection:variant==='baseline'?'markers':'coverage'});
  return one?[one]:[];
}
export function compareFrozen(){
  return ['baseline','candidate'].map(variant=>{
    const cases=FROZEN_CASES.map(c=>{
      const shown=rows(c,variant);
      return {id:c.id,kind:c.kind,synthetic:true,eligible:c.valid,
        admitted:shown.length,source_references:shown.map(x=>x.source_refs[0]),
        opportunity_count:c.opportunities.length,
        visible_unique_opportunities:c.opportunities.filter(needle=>
          shown.some(e=>e.excerpt.includes(needle))).length,
        invalid_correctly_rejected:!c.valid&&shown.length===0,
        offsets_valid:c.kind!=='prompt'||shown.every(e=>{
          const match=/:span:(\d+)$/.exec(e.source_refs[0]);
          if(!match)return e.excerpt===c.original.trim();
          return c.original.slice(Number(match[1]),
            Number(match[1])+e.excerpt.length)===e.excerpt;
        })};
    });
    // Distinct same-session messages: count model consideration capacity,
    // not actual emitted facts. Each isolated cluster has a three-fact ceiling.
    const messages=['First source records a stable interface requirement.',
      'Second source records a retry boundary requirement.',
      'Third source records an archival retention requirement.',
      'Fourth source records a separate privacy constraint.'].map((text,i)=>
      fromPromptCandidates({sessionID:'ses_group',messageID:'m'+i,
        timestamp:'2026-11-18T01:00:0'+i+'Z',prompt:{text}},
        SCOPE,{admitted:true})[0]);
    const clusters=selectClusters(messages,{
      sourceMessageIsolation:variant==='candidate'});
    const capacity=clusters.reduce((n,c)=>n+Math.min(3,c.events.length),0);
    return {variant,cases,source_grouping:{
      distinct_messages:4,clusters:clusters.length,model_fact_slots_upper_bound:capacity},
      totals:{eligible_cases:cases.filter(x=>x.eligible).length,
        admitted_events:cases.reduce((n,x)=>n+x.admitted,0),
        opportunities:cases.reduce((n,x)=>n+x.opportunity_count,0),
        model_visible_opportunities:cases.reduce((n,x)=>n+x.visible_unique_opportunities,0),
        invalid_cases_rejected:cases.filter(x=>!x.eligible&&x.invalid_correctly_rejected).length}};
  });
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)
  console.log(JSON.stringify({cohort:'issue106-a1-frozen-synthetic-v1',
    baseline_sha:'df703861714717b795465423939f4563cb3d08e6',
    comparator_scope:'capture representation and clustering capacity only',
    outcomes:compareFrozen()},null,2));
