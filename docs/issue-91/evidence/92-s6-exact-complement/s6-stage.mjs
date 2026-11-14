// S6 source-exact-complement EX-kernel staging: seed the FULL 24 eligible
// source-cluster roster (verified original b2-sources.json identity) into the
// NEW empty disposable S6 group. CPU-only (CandidateQueue staging; no model
// calls, no Graphiti writes). Preserves original per-event project/workspace/
// source evidence and adopts the fresh S6 group identity through the authorized
// fixture constructors. Same 24-cluster population as S2/S3/S4/S5.
import {createHash} from 'node:crypto';
import {CandidateQueue} from '/workspace/opencode-operational-schema-guard/docs/issue-78/v2-candidate/queue.mjs';
import {cleanExcerpt} from '/workspace/opencode-operational-schema-guard/docs/issue-78/v2-candidate/events.mjs';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const sha=b=>createHash('sha256').update(b).digest('hex');
const CORPUS='/tmp/opencode/b2-sources.json';
const CORPUS_SHA='ebac7052065766eb8d1ef464142ea63dc3052d52deb36424492ebc477fdd3508';
const ROOT='/tmp/opencode/issue92-s6/state/s6';
const GROUP='graphiti-adr92-s6-exact-complement';

const raw=await readFile(CORPUS);
if(sha(raw)!==CORPUS_SHA)
 throw new Error('S6_CORPUS_DIGEST_MISMATCH: corpus identity changed; staging aborted');
const sources=JSON.parse(raw.toString('utf8'));
if(sources.length!==24) throw new Error('S6_CORPUS_SIZE_MISMATCH: '+sources.length);

function headExcerpt(text){
  const condensed=text.replace(/\s+/g,' ').trim();
  let head=condensed;
  if(head.length>1090){
   const cut=head.lastIndexOf(' ',1090);
   head=head.slice(0,cut>800?cut:1090);
  }
  return cleanExcerpt(head);
}
const queue=new CandidateQueue(ROOT,GROUP);
const events=[];
for(const s of sources){
 const excerpt=headExcerpt(s.text);
 if(!excerpt) throw new Error('EMPTY_EXCERPT '+s.message_id);
 const identity=[1,GROUP,s.project,s.workspace,s.session_id,'user_turn',s.message_id].join('\n');
 const event=Object.freeze({
  schema_version:1,
  event_id:sha(identity),
  session_id:s.session_id,
  project:s.project,
  workspace:s.workspace,
  group:GROUP,
  observed_at:s.created_iso,
  evidence_class:'user-stated',
  kind:'user_turn',
  source_refs:['opencode:'+s.session_id+':message:'+s.message_id],
  source_strength:'native-id',
  related_event_ids:[],
  cluster_key:sha(GROUP+'\n'+s.session_id).slice(0,24),
  excerpt,
  state:'new',
 });
 const r=await queue.stage(event);
 if(r.status!=='staged') throw new Error('STAGE_FAILED '+s.message_id+' '+r.status);
 events.push({group:GROUP,project:s.project,session_id:s.session_id,
  message_id:s.message_id,source_ref:event.source_refs[0],event_id:event.event_id,
  cluster_key:event.cluster_key,workspace:s.workspace,
  observed_at:event.observed_at,excerpt_len:excerpt.length,stage:r.status});
}
const status=await queue.status();
console.log('S6_STAGING group='+GROUP,JSON.stringify(status));
await writeFile(path.join(ROOT,'s6-staged-events.json'),
 JSON.stringify({group:GROUP,root:ROOT,corpus_sha256:CORPUS_SHA,events},null,1)+'\n',
 {mode:0o600});
console.log('S6_STAGING_DONE count='+events.length);
