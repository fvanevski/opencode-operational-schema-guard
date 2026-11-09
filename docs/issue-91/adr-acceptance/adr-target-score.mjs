/** Issue #92 ADR prospective evaluator. Pure, no I/O or Graphiti calls.
 * Structural evidence checks are not independent proof of source truth.
 * Frozen H2/H3/H4 scorecards are never consumed or rewritten.
 */
export const SOURCE_PINS=Object.freeze({
  baseline:'c8eb5260f2b10832346234b1b5d0cf28302ffba8',
  candidate:'a684667a6eefa2dc19f29755bed0c3048874721d'
});
const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const ID=/^[A-Za-z0-9_.:-]{3,160}$/;
const check=(ok,reason)=>{if(!ok)throw Error('ADR92_INVALID:'+reason)};
const hash=x=>typeof x==='string'&&SHA.test(x);
const date=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const ratio=(n,d)=>d===0?null:n/d;
const wilson=(n,d)=>{
 if(!d)return null;
 const z=1.96,p=n/d,a=1+z*z/d,mid=(p+z*z/(2*d))/a;
 const half=z*Math.sqrt((p*(1-p)+z*z/(4*d))/d)/a;
 return {lower:Math.max(0,mid-half),upper:Math.min(1,mid+half)};
};
const percentGate=(n,d,t)=>d>0&&n/d>=t?'PASS':'FAIL';
export function validateAdrFreeze(f){
 check(f?.schema==='issue92-adr-prospective-freeze-v1','schema');
 check(f?.source_commits?.baseline===SOURCE_PINS.baseline&&
   f.source_commits.candidate===SOURCE_PINS.candidate,'frozen_source_sha');
 check(hash(f.corpus_sha256)&&hash(f.model_policy_sha256)&&date(f.frozen_at)&&
   f.first_model_observed===false&&date(f.ratified_at)&&
   Date.parse(f.ratified_at)>=Date.parse(f.frozen_at),'frozen_identity_or_chronology');
 check(Array.isArray(f.trials)&&f.trials.length===2&&f.trials[0]==='t1'&&
   f.trials[1]==='t2','preregistered_two_trials');
 check(Array.isArray(f.cases)&&f.cases.length>=20,'cluster_count');
 const ids=new Set(),clusters=new Set(),families=new Set(),refs=new Map(),targets=new Map();
 let valuable=0,capacity=0;
 for(const c of f.cases){
   check(c&&ID.test(c.id||'')&&!ids.has(c.id)&&hash(c.cluster_id)&&
     !clusters.has(c.cluster_id)&&ID.test(c.family||'')&&
     c.independent_of_exposed===true&&c.native_verified===true,
     'case_identity_independence');
   ids.add(c.id);clusters.add(c.cluster_id);families.add(c.family);
   check(Array.isArray(c.sources)&&c.sources.length>=1&&
     Array.isArray(c.targets),'case_sources_targets');
   const within=new Set();
   for(const s of c.sources){
     check(s&&typeof s.ref==='string'&&s.ref.startsWith('opencode:')&&
       s.ref.length<=240&&hash(s.sha256)&&typeof s.eligible==='boolean'&&
       s.native_verified===true&&!refs.has(s.ref),'source_identity');
     if(!s.eligible)check(ID.test(s.safety_reason||''),'unsafe_reason');
     refs.set(s.ref,{...s,case_id:c.id});within.add(s.ref);
   }
   let localValuable=0;
   for(const t of c.targets){
     check(t&&ID.test(t.id||'')&&!targets.has(t.id)&&
       within.has(t.source_ref)&&hash(t.source_sha256)&&
       t.source_sha256===refs.get(t.source_ref).sha256&&
       hash(t.evidence_sha256)&&typeof t.valuable==='boolean'&&
       t.original_verified===true&&t.blind_ratified===true,
       'target_identity_or_pre_output_review');
     if(t.valuable){
       check(refs.get(t.source_ref).eligible,'valuable_target_unsafe_source');
       localValuable++;valuable++;
     }
     targets.set(t.id,{...t,case_id:c.id});
   }
   capacity+=Math.min(3,localValuable);
 }
 check(families.size>=3&&valuable>=10,'family_or_valuable_count');
 // Detect an impossible target metric before output, not by revising the
 // denominator after the model has seen it.
 check(capacity/valuable>=0.85,'structurally_infeasible_target_coverage');
 return {status:'ADR92_FREEZE_PASS',clusters:ids.size,families:families.size,
   eligible_sources:[...refs.values()].filter(s=>s.eligible).length,
   targets:targets.size,valuable_targets:valuable,
   max_supported_by_three_per_cluster:capacity,capacity_ceiling:capacity/valuable,
   trials:[...f.trials],source_commits:{...f.source_commits}};
}
function analyzeArm(f,arm,indices,trial){
 check(arm&&Array.isArray(arm.capture)&&Array.isArray(arm.targets)&&
   Array.isArray(arm.episodes),'arm_shape');
 const {refs,targets}=indices;
 check(arm.capture.length===refs.size&&arm.targets.length===targets.size,
   'complete_capture_and_target_ledger');
 const capture=new Map(),targetRows=new Map(),episodes=new Map();
 for(const c of arm.capture){
   check(c&&refs.has(c.ref)&&!capture.has(c.ref)&&
     typeof c.captured==='boolean'&&typeof c.model_visible==='boolean'&&
     (!c.model_visible||c.captured),'capture_identity');
   if(!refs.get(c.ref).eligible)check(!c.captured&&!c.model_visible,
     'unsafe_source_admitted');
   if(!c.captured)check(ID.test(c.drop_reason||''),'capture_drop_reason');
   capture.set(c.ref,c);
 }
 const group=arm.group_id;
 check(typeof group==='string'&&ID.test(group),'arm_group');
 const perClusterEpisodeCounts=new Map();
 for(const e of arm.episodes){
   check(e&&UUID.test(e.uuid||'')&&!episodes.has(e.uuid)&&
     e.group_id===group&&refs.has(e.source_ref)&&
     hash(e.assertion_sha256)&&typeof e.grounded==='boolean'&&
     typeof e.useful==='boolean'&&typeof e.redundant==='boolean'&&
     typeof e.privacy_issue==='boolean'&&typeof e.authority_issue==='boolean'&&
     typeof e.fabricated_source==='boolean'&&e.independently_reviewed===true,
     'episode_identity_or_review');
   check(e.remote_proof?.review_store===true&&e.remote_proof.graphiti_mcp===true&&
     e.remote_proof.falkordb===true&&e.remote_proof.source_index===true,
     'terminal_remote_proof');
   check(refs.get(e.source_ref).eligible,'episode_unsafe_source');
   const sourceCase=refs.get(e.source_ref).case_id;
   perClusterEpisodeCounts.set(sourceCase,(perClusterEpisodeCounts.get(sourceCase)||0)+1);
   check(perClusterEpisodeCounts.get(sourceCase)<=3,
     'more_than_three_episodes_in_cluster');
   episodes.set(e.uuid,e);
 }
 let discovered=0,selected=0,captured=0,retained=0;
 const credited=new Set(),selectedIds=new Set(),discoveredIds=new Set();
 for(const t of arm.targets){
   const frozen=targets.get(t.id);
   check(frozen&&!targetRows.has(t.id)&&typeof t.discovered==='boolean'&&
     typeof t.selected==='boolean'&&typeof t.validated==='boolean'&&
     typeof t.persisted==='boolean'&&ID.test(t.reason||''),'target_row');
   targetRows.set(t.id,t);
   const source=capture.get(frozen.source_ref);
   check(!t.discovered||source.model_visible,'discovery_without_capture');
   check(!t.selected||t.discovered,'selection_without_discovery');
   check(!t.validated||t.selected,'validation_without_selection');
   check(!t.persisted||t.validated,'persistence_without_validation');
   if(frozen.valuable){
     if(source.model_visible)captured++;
     if(t.discovered){discovered++;discoveredIds.add(t.id)}
     if(t.selected){selected++;selectedIds.add(t.id)}
   }
   if(t.persisted){
     const episode=episodes.get(t.episode_uuid);
     check(episode&&episode.source_ref===frozen.source_ref,'target_remote_identity');
     check(t.support&&t.support.original_source_sha256===frozen.source_sha256&&
       t.support.frozen_evidence_sha256===frozen.evidence_sha256&&
       t.support.assertion_sha256===episode.assertion_sha256&&
       t.support.reviewed_independently===true&&
       typeof t.support.target_supported==='boolean','target_support_proof');
     if(frozen.valuable&&t.support.target_supported&&episode.grounded&&episode.useful){
       credited.add(t.id);retained++;
     }
   }else check(t.episode_uuid===null||t.episode_uuid===undefined,
     'nonpersisted_episode_claim');
 }
 const all=[...episodes.values()];
 const grounded=all.filter(e=>e.grounded).length;
 const usefulGrounded=all.filter(e=>e.grounded&&e.useful).length;
 const lowValue=all.filter(e=>!e.useful).length;
 const redundant=all.filter(e=>e.redundant).length;
 const unsafe=all.filter(e=>e.privacy_issue||e.authority_issue||e.fabricated_source).length;
 const denom=[...targets.values()].filter(t=>t.valuable).length;
 const eligible=[...refs.values()].filter(s=>s.eligible).length;
 return {group_id:group,counts:{sources:eligible,source_captured:[...capture.entries()].filter(([id,c])=>refs.get(id).eligible&&c.captured).length,
   valuable_targets:denom,valuable_source_visible:captured,discovered,selected,
   retained,episodes:all.length,grounded,useful_grounded:usefulGrounded,low_value:lowValue,
   redundant,unsafe},
   rates:{raw_source_capture:ratio([...capture.entries()].filter(([id,c])=>refs.get(id).eligible&&c.captured).length,eligible),
     valuable_capture:ratio(captured,denom),discovery:ratio(discovered,denom),
     selection:ratio(selected,denom),retention:ratio(retained,denom),
     grounding:ratio(grounded,all.length),usefulness:ratio(usefulGrounded,grounded)},
   uncertainty:{retention_wilson95:wilson(retained,denom),grounding_wilson95:wilson(grounded,all.length)},
   credited_ids:[...credited].sort(),selected_ids:[...selectedIds].sort(),
   discovered_ids:[...discoveredIds].sort(),episode_uuids:[...episodes.keys()].sort()};
}
export function scoreAdrTrial(f,o){
 validateAdrFreeze(f);
 check(o?.schema==='issue92-adr-trial-outcomes-v1'&&
   f.trials.includes(o.trial)&&
   o.source_commits?.baseline===f.source_commits.baseline&&
   o.source_commits.candidate===f.source_commits.candidate&&
   o.model_policy_sha256===f.model_policy_sha256&&
   date(o.first_model_at)&&Date.parse(o.first_model_at)>Date.parse(f.ratified_at),
   'trial_identity_or_chronology');
 check(o.execution?.ex_admitted===true&&o.execution?.all_arms_terminal===true&&
   o.execution?.unresolved_remote===0&&
   o.execution?.production_unchanged===true&&
   o.execution?.model_policy_same_across_arms===true,
   'trial_execution_proof');
 const refs=new Map(),targets=new Map();
 for(const c of f.cases){
   for(const s of c.sources)refs.set(s.ref,s);
   for(const t of c.targets)targets.set(t.id,t);
 }
 const indices={refs,targets};
 const b=analyzeArm(f,o.arms?.baseline,indices,o.trial);
 const c=analyzeArm(f,o.arms?.candidate,indices,o.trial);
 check(b.group_id!==c.group_id,'arm_group_collision');
 check(!b.episode_uuids.some(id=>c.episode_uuids.includes(id)),'arm_episode_collision');
 const miss=b.credited_ids.filter(id=>!c.credited_ids.includes(id));
 const bg=b.counts,cg=c.counts;
 const gates={
   valuable_capture:percentGate(cg.valuable_source_visible,cg.valuable_targets,.85),
   valuable_selection:percentGate(cg.selected,cg.valuable_targets,.85),
   valuable_retention:percentGate(cg.retained,cg.valuable_targets,.85),
   baseline_useful_preservation:miss.length===0?'PASS':'FAIL',
   groundedness:percentGate(cg.grounded,cg.episodes,.90),
   sample:cg.grounded>=8?'PASS':'INSUFFICIENT_SAMPLE',
   usefulness:cg.grounded<8?'INSUFFICIENT_SAMPLE':
     percentGate(cg.useful_grounded,cg.grounded,.75),
   selectivity:bg.low_value===0?(cg.low_value===0?'PASS':'FAIL'):
     (cg.low_value<bg.low_value&&
       cg.low_value/Math.max(cg.episodes,1)<bg.low_value/Math.max(bg.episodes,1)?
       'PASS':'FAIL'),
   redundancy_nonregression:cg.redundant<=bg.redundant?'PASS':'FAIL',
   privacy_source_authority:(cg.unsafe===0&&bg.unsafe===0)?'PASS':'FAIL',
   ex_and_remote:'PASS'
 };
 const overall=Object.values(gates).includes('INSUFFICIENT_SAMPLE')?
   'INSUFFICIENT_SAMPLE':Object.values(gates).every(x=>x==='PASS')?'PASS':'FAIL';
 return {schema:'issue92-adr-target-scorecard-v1',trial:o.trial,overall,gates,
   arms:{baseline:b,candidate:c},baseline_valuable_targets_missed:miss,
   note:'Input receipts and source support are structural attestations; independently verify live sources and Graphiti before accepting.'};
}
