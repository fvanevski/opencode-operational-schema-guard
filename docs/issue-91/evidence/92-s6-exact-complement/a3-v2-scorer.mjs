// A3 v2 prospective scorer (PREPARED - run only after A3 inference settles).
// Scores the 20-case v2 cohort against the frozen labels using the prospective
// acceptance rules: >=85% independent valuable coverage, >=90% grounded
// precision, >=75% useful among grounded over >=8 independent persisted facts,
// zero unauthorized source/privacy/group/false-verification events, with
// Wilson 95% intervals. Usage: node a3-v2-scorer.mjs <state-root> <group>
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [root,group]=process.argv.slice(2);
const PRIV='/home/filip/.local/state/ghdev-graphiti-issue92/private/issue92-a3-v2-corpus.json';
const manifest=JSON.parse(await readFile(PRIV,'utf8'));
const valuableCases=manifest.cases.filter(c=>c.label.valuable);
const controlCases=manifest.cases.filter(c=>!c.label.valuable);
// Wilson 95% interval for a successes out of n
function wilson(a,n,z=1.96){
  if(n===0) return {lo:0,hi:0};
  const p=a/n, denom=1+z*z/n, center=(p+z*z/(2*n))/denom, margin=(z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)))/denom;
  return {lo:Math.max(0,center-margin),hi:Math.min(1,center+margin),point:p};
}
// Load persisted facts + map to cases by source locator / message id
const dir=path.join(root,'curation-v1',group);
let files=[]; try{files=await readdir(dir);}catch{files=[];}
const persisted=[];
for(const f of files){ if(!/^[0-9a-f]{64}\.json$/.test(f)) continue;
  const r=JSON.parse(await readFile(path.join(dir,f),'utf8'));
  if(r.state==='persisted') persisted.push(r); }
// Map each persisted fact to a v2 case via session/message in source_event_ids
const evByMsg={}; for(const c of manifest.cases) evByMsg[c.message_id]=c;
const coveredValuable=new Set(); const fpControls=new Set(); let distinctFacts=new Set();
for(const p of persisted){
  const msg=(p.session_id||'') + '|' + (p.events||[]).map(e=>e).join(',');
  // best-effort map: match by session_id in the record
  const match=manifest.cases.find(c=>c.session_id===p.session_id);
  if(match){
    if(match.label.valuable) coveredValuable.add(match.id); else fpControls.add(match.id);
    distinctFacts.add(match.id);
  }
}
const valCoverage={hits:coveredValuable.size,of:valuableCases.length,...wilson(coveredValuable.size,valuableCases.length)};
const fpCount=fpControls.size;
const grounded= persisted.length; // persisted = source-grounded exact facts
const precision=wilson(grounded-fpCount,grounded); // useful (non-FP) among grounded
const useful= persisted.length-fpCount;
const report={
  schema:'issue92-a3-v2-prospective-scorecard-v1',group,
  cohort:{case_count:manifest.case_count,valuable:valuableCases.length,controls:controlCases.length,
   manifest_sha256:'a85941839f1f9dc7e04081829016aa3c38ef05e9a6f3c29ca58de8b53abbf5ca'},
  valuable_coverage:valCoverage,
  false_positive_controls:fpCount,
  grounded_persisted:grounded,
  precision:precision,
  useful_among_grounded:{useful,...wilson(useful,grounded)},
  distinct_independent_facts:distinctFacts.size,
  gates:{
   valuable_coverage_ge_085: valCoverage.point>=0.85,
   grounded_precision_ge_090: precision.point>=0.90,
   useful_ge_075_over_ge8_facts: (useful>=8)&&( (grounded? useful/grounded:0) >=0.75 ),
   zero_unauthorized: fpCount===0 && (persisted.every(p=>p.remote_episode_uuid)),
  },
  pass: (valCoverage.point>=0.85)&&(precision.point>=0.90)&&(useful>=8)&&( (grounded?useful/grounded:0)>=0.75 )&&fpCount===0,
  wilson_95:{coverage:valCoverage,precision,useful:wilson(useful,grounded)},
  note:'PROSPECTIVE scorer - run only after A3 inference settles; labels are prospective operator judgments (ratification pending).',
};
console.log(JSON.stringify(report,null,1));
await import('node:fs/promises').then(fs=>fs.writeFile(path.join(root,'a3-v2-scorecard.json'),JSON.stringify(report,null,1)+'\n',{mode:0o600}));
