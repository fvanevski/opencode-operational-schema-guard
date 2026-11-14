#!/usr/bin/env node
/** CPU-only, one-time V22 exposed-case smoke staging. Not prospective scoring. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fromPromptCandidates} from '../../issue-78/v2-candidate/events.mjs';
import {CandidateQueue} from '../../issue-78/v2-candidate/queue.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const fail=(reason)=>{throw Error('ISSUE92_EXPOSED_STAGE_BLOCKED:'+reason);};
const [manifestPath,rosterPath,root,group]=process.argv.slice(2);
const V22_MANIFEST_SHA='1e9f0bb550b67f40413470fe69521f5eb2e457c5590413650978141ac89d54a0';
const V22_LABEL_SHA='a13b52f539b561837ffa42ba430546967ab937b498e7fd8c31913d72a376e1ed';
const CASE_IDS=['v22-v-01','v22-v-02','v22-v-07','v22-v-10','v22-c-01','v22-c-02'];
if(![manifestPath,rosterPath,root].every(x=>typeof x==='string'&&path.isAbsolute(x))||
 !/^graphiti-adr92-exposed-v2-[a-z0-9-]{8,70}$/.test(group||''))
 fail('absolute_sources_root_and_new_exposed_group_required');
if(path.resolve(root)==='/'||root.includes('/state-v22'))fail('unsafe_state_root');
const [manifestBytes,rosterBytes]=await Promise.all([readFile(manifestPath),readFile(rosterPath)]);
if(sha(manifestBytes)!==V22_MANIFEST_SHA)fail('original_manifest_digest_mismatch');
for(const file of [manifestPath,rosterPath]){
 const st=await stat(file);if((st.mode&0o077)!==0)fail('private_file_permissions');
}
const manifest=JSON.parse(manifestBytes.toString('utf8')),
 roster=JSON.parse(rosterBytes.toString('utf8'));
if(manifest.case_count!==20||roster.case_count!==20||
 roster.group!=='graphiti-adr92-a3-prospective-v22'||
 roster.private_manifest_sha256!==V22_MANIFEST_SHA||
 roster.label_freeze_sha256!==V22_LABEL_SHA)fail('frozen_v22_identity_mismatch');
const native=new Map(manifest.cases.map(c=>[c.id,c]));
const frozen=new Map(roster.cases.map(c=>[c.id,c]));
if(native.size!==20||frozen.size!==20)fail('duplicate_original_source');
const receiptPath=path.join(root,'exposed-v2-stage-receipt.json');
try{await stat(receiptPath);fail('stage_receipt_already_exists');}
catch(e){if(e.code!=='ENOENT')throw e;}
try{await stat(path.join(root,'candidate-events-v1',group));fail('group_queue_already_exists');}
catch(e){if(e.code!=='ENOENT')throw e;}
try{await stat(path.join(root,'curation-v1',group));fail('group_review_store_already_exists');}
catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(root,{recursive:true,mode:0o700});
const q=new CandidateQueue(root,group);
let events=0;const rows=[];
for(const id of CASE_IDS){
 const c=native.get(id),f=frozen.get(id);
 if(!c||!f||sha(c.native_event)!==f.native_event_text_sha256||
    c.observed_at!==f.observed_at||
    c.source_locator!=='opencode:'+c.session_id+':message:'+c.message_id||
    sha(c.source_locator)!==f.source_locator_sha256||
    c.label?.valuable!==f.label?.valuable)fail('native_source_or_label_'+id);
 const scope={group,project:c.project,workspace:c.workspace};
 const captured=fromPromptCandidates({sessionID:c.session_id,messageID:c.message_id,
   prompt:{text:c.native_event},timestamp:c.observed_at},scope,{admitted:true});
 if(captured.length<1||captured.length>6)fail('capture_opportunity_'+id);
 for(const e of captured){
  if(e.source_strength!=='native-id'||
   !e.source_refs[0].startsWith(c.source_locator))fail('source_authority_'+id);
  const status=await q.stage(e);
  if(status.status!=='staged')fail('stage_'+id+'_'+status.status);
  events++;
 }
 rows.push({case_id:id,valuable:f.label.valuable,events:captured.length,
   source_text_sha256:f.native_event_text_sha256,
   source_locator_sha256:f.source_locator_sha256});
}
await writeFile(receiptPath,JSON.stringify({schema:'issue92-exposed-v2-stage-v1',
 group,source:'immutable-V22-exposed-native-messages',scoreable_prospective:false,
 source_code_policy:'new_exposed_group_and_source-exact-V2',manifest_sha256:V22_MANIFEST_SHA,
 label_sha256:V22_LABEL_SHA,case_count:CASE_IDS.length,event_count:events,
 cases:rows},null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({result:'EXPOSED_V2_STAGED_CPU_ONLY',group,cases:CASE_IDS.length,
 events,receipt:receiptPath}));
