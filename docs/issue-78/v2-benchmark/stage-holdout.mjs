#!/usr/bin/env node
/** Stage ONLY already ratified holdout source events into a NEW disposable local queue. */
import {readFile,writeFile,stat,access} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CandidateQueue} from '../v2-candidate/queue.mjs';
import {replay} from './evaluate.mjs';
import {bindAdjudication,digest} from './adjudicate.mjs';

const deny=s=>{throw Error('HOLDOUT_STAGE_DENIED:'+s);};
export function plan(corpus,group){
 if(corpus?.split!=='holdout'||corpus?.scope?.group!=='cur81_dev'||
    !/^cur81_holdout_[a-f0-9]{8}$/.test(group||''))
   deny('HOLDOUT_SCOPE_REQUIRED');
 const target={...corpus.scope,group};
 const selected=[],excluded=[];
 for(const c of corpus.cases){
  // Same real selector/adapters as the quality comparator; preserve per-case
  // wrong-group and opt-out vetoes, never reconstruct a weak native identity.
  const candidate=replay(c,target).candidate;
  if(!candidate){
   excluded.push({id:c.id,reason:'not_selected_or_scope_excluded'});
  }else if(candidate.source_strength!=='native-id'){
   excluded.push({id:c.id,reason:'weak_source_identity'});
  }else{
   selected.push({id:c.id,event:candidate});
  }
 }
 if(!selected.length)deny('NO_NATIVE_CANDIDATES');
 const ids=selected.map(x=>x.event.event_id);
 if(new Set(ids).size!==ids.length)deny('DUPLICATE_NATIVE_EVENT_IDENTITIES');
 return {group,target,selected,excluded};
}
const flag=(a,k)=>{const i=a.indexOf('--'+k);return i<0?null:a[i+1]||null;};
const need=(a,k)=>{const v=flag(a,k);if(!v)deny('MISSING_'+k);return v;};
const abs=(a,k)=>{const v=need(a,k);if(!path.isAbsolute(v))deny('ABSOLUTE_'+k);return v;};
export async function main(args=process.argv.slice(2)){
 if(args[0]!=='stage')deny('STAGE_COMMAND_REQUIRED');
 const frozen=await readFile(abs(args,'corpus'),'utf8'),
   labels=await readFile(abs(args,'adjudication'),'utf8'),
   proposal=await readFile(abs(args,'proposal'),'utf8'),
   ratification=await readFile(abs(args,'target-ratification'),'utf8');
 const binding=bindAdjudication({
   corpusBytes:frozen,expectedCorpusSha:need(args,'expected-corpus-sha256'),
   adjudicationBytes:labels,expectedAdjudicationSha:need(args,'expected-adjudication-sha256'),
   proposalBytes:proposal,expectedProposalSha:need(args,'expected-proposal-sha256'),
   ratificationBytes:ratification,expectedRatificationSha:need(args,'expected-target-ratification-sha256')
 });
 const group=need(args,'group'),p=plan(binding.effectiveCorpus,group);
 const state=abs(args,'state-dir'),out=abs(args,'out');
 const status=await stat(state);
 if(!status.isDirectory()||(status.mode&0o077)!==0)deny('PRIVATE_STATE_ROOT_REQUIRED');
 // Absent group paths are mandatory. Existing/partial groups are not silently
 // reset, replayed or merged into a different benchmark cohort.
 for(const dir of ['candidate-events-v1','curation-v1']){
  try{await access(path.join(state,dir,group));deny('GROUP_ALREADY_PRESENT');}
  catch(e){if(e?.code!=='ENOENT')throw e;}
 }
 try{await access(out);deny('OUTPUT_ALREADY_PRESENT');}
 catch(e){if(e?.code!=='ENOENT')throw e;}
 const q=new CandidateQueue(state,group);
 const committed=[];
 for(const x of p.selected){
  const result=await q.stage(x.event);
  if(result.status!=='staged')deny('QUEUE_STAGE_FAILED:'+x.id+':'+result.status);
  committed.push({case_id:x.id,event_id:x.event.event_id,kind:x.event.kind});
 }
 const receipt={
  schema_version:1,kind:'issue81-holdout-stage',
  state:'STAGED_NOT_CURATED',group,
  frozen_corpus_sha256:binding.authority.frozen_corpus_sha256,
  adjudication_sha256:binding.authority.adjudication_sha256,
  target_ratification_sha256:binding.authority.target_ratification_sha256,
  queued_count:committed.length,events:committed,excluded:p.excluded,
  queue_status:await q.status(),
  caveat:'Local staging only. No LLM, Graphiti write or holdout scoring. Post-exit curator must use canonical EX gate.'};
 await writeFile(out,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
 return receipt;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
 await main();
