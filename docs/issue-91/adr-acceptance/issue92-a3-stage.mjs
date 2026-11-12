#!/usr/bin/env node
/** CPU-only prospective staging from an authenticated frozen native manifest.
 * Does not infer, call Graphiti, alter the frozen manifest or rewrite events.
 * Usage: node issue92-a3-stage.mjs ROSTER.json MANIFEST.json STATE_ROOT
 */
import {createHash} from 'node:crypto';
import {readFile,stat,mkdir,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {CandidateQueue} from '../../issue-78/v2-candidate/queue.mjs';
import {prepareProspectiveEvents} from './issue92-a3-native-source.mjs';
const [rosterPath,manifestPath,root]=process.argv.slice(2);
const die=s=>{throw Error('A3_STAGE_BLOCKED:'+s);};
if(!rosterPath||!manifestPath||!root||!path.isAbsolute(root)||
 !path.isAbsolute(rosterPath)||!path.isAbsolute(manifestPath))
 die('absolute_roster_manifest_and_state_required');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const [rbytes,mbytes]=await Promise.all([readFile(rosterPath),readFile(manifestPath)]);
const roster=JSON.parse(rbytes.toString('utf8'));
if(sha(mbytes)!==roster.private_manifest_sha256)
 die('manifest_bytes_not_frozen_digest');
const privateMode=(await stat(manifestPath)).mode&0o777;
if((privateMode&0o077)!==0)die('private_manifest_permissions');
const manifest=JSON.parse(mbytes.toString('utf8'));
const prepared=prepareProspectiveEvents(manifest,roster);
const group=roster.group;
if(group!=='graphiti-adr92-a3-prospective-v2')
 die('unapproved_group');
const queueRoot=path.join(root,'candidate-events-v1',group);
const receipt=path.join(root,'a3-v2-staged.json');
try{
 const prior=await stat(receipt).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));
 if(prior)die('frozen_stage_already_exists');
 const existing=await readdir(queueRoot).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e));
 if(existing.length)die('queue_not_empty');
}catch(e){throw e;}
await mkdir(root,{recursive:true,mode:0o700});
const queue=new CandidateQueue(root,group);
for(const event of prepared.events){
 const status=await queue.stage(event);
 if(status.status!=='staged')die('unexpected_queue_stage_'+status.status);
}
const stage={schema:'issue92-a3-staged-v2',group,
 manifest_sha256:roster.private_manifest_sha256,
 label_freeze_sha256:roster.label_freeze_sha256,
 stage_source:'native_fromPromptCandidates_full_input_privacy_checked',
 events:prepared.stageRows,case_event_counts:prepared.caseEventCounts,
 case_count:20,events_staged:prepared.events.length};
await writeFile(receipt,JSON.stringify(stage,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({status:'A3_SOURCE_STAGED_CPU_ONLY',group,
 case_count:20,events_staged:stage.events_staged,
 manifest_sha256:stage.manifest_sha256,
 label_freeze_sha256:stage.label_freeze_sha256,receipt},null,2));
