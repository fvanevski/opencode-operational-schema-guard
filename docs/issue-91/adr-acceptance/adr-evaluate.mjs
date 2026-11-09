#!/usr/bin/env node
/** Issue #92 ADR frozen two-trial evaluator. No runtime service interactions. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateAdrFreeze,scoreAdrTrial} from './adr-target-score.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
export function evaluateFiles(rawFreeze,rawTrials){
 const frozen=JSON.parse(rawFreeze),preflight=validateAdrFreeze(frozen);
 if(!Array.isArray(rawTrials)||rawTrials.length!==2)
   throw Error('ADR92_INVALID:two_trials_required');
 const freezeSha=sha(rawFreeze);
 const results=[],groups=new Set(),samples=new Set();
 for(let i=0;i<2;i++){
   const outcome=JSON.parse(rawTrials[i]);
   if(outcome.trial!==frozen.trials[i]||
      outcome.freeze_sha256!==freezeSha)
     throw Error('ADR92_INVALID:trial_or_frozen_digest');
   const score=scoreAdrTrial(frozen,outcome);
   for(const arm of ['baseline','candidate']){
     const group=score.arms[arm].group_id;
     if(groups.has(group))throw Error('ADR92_INVALID:group_reused_across_trials');
     groups.add(group);
   }
   samples.add(outcome.trial);results.push(score);
 }
 const outcomes=results.map(r=>r.overall);
 const overall=outcomes.includes('INSUFFICIENT_SAMPLE')?'INSUFFICIENT_SAMPLE':
   outcomes.every(s=>s==='PASS')?'PASS':'FAIL';
 return {schema:'issue92-adr-two-trial-scorecard-v1',overall,
   freeze_sha256:freezeSha,source_commits:preflight.source_commits,
   preflight,trial_scorecards:results,
   // No pooling of two model generations to manufacture an adequate sample
   // or to choose whichever trial recalled the most useful knowledge.
   note:'Each pre-registered trial must meet its own acceptance gates. Private source and live Graphiti attestations require separate independent verification.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
   const [action,...paths]=process.argv.slice(2);
   if(action==='preflight'&&paths.length===1){
     const raw=readFileSync(paths[0],'utf8');
     console.log(JSON.stringify({...validateAdrFreeze(JSON.parse(raw)),
       freeze_sha256:sha(raw)},null,2));
   }else if(action==='score'&&paths.length===3){
     console.log(JSON.stringify(evaluateFiles(readFileSync(paths[0],'utf8'),
       [readFileSync(paths[1],'utf8'),readFileSync(paths[2],'utf8')]),null,2));
   }else throw Error('Usage: preflight <freeze.json> | score <freeze.json> <trial1.json> <trial2.json>');
 }catch(e){console.error(String(e?.message||e));process.exitCode=2;}
}
