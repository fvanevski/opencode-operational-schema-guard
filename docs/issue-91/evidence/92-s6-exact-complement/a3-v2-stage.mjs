// A3 v2 prospective staging: seed the 20-case gh_mcp-development-v2 cohort
// (10 valuable + 10 controls) from the PRIVATE case-level manifest into the
// fresh empty A3 group graphiti-adr92-a3-prospective-v2. CPU-only
// (CandidateQueue staging; no model calls, no Graphiti writes). Each event is
// bound to its original native session/message identity + source content digest.
import {createHash} from 'node:crypto';
import {CandidateQueue} from '/workspace/opencode-operational-schema-guard/docs/issue-78/v2-candidate/queue.mjs';
import {cleanExcerpt} from '/workspace/opencode-operational-schema-guard/docs/issue-78/v2-candidate/events.mjs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const sha=b=>createHash('sha256').update(b).digest('hex');
const ROOT='/tmp/opencode/issue92-s6/state/a3';
const GROUP='graphiti-adr92-a3-prospective-v2';
const PRIV='/home/filip/.local/state/ghdev-graphiti-issue92/private/issue92-a3-v2-corpus.json';

const manifest=JSON.parse(await readFile(PRIV,'utf8'));
if(manifest.case_count!==20||manifest.valuable!==10||manifest.nonvaluable_controls!==10)
 throw new Error('A3_V2_MANIFEST_SHAPE: expected 20 cases (10+10)');
function headExcerpt(text){
  const condensed=text.replace(/\s+/g,' ').trim();
  let head=condensed;
  if(head.length>1090){const cut=head.lastIndexOf(' ',1090);head=head.slice(0,cut>800?cut:1090);}
  return cleanExcerpt(head);
}
const queue=new CandidateQueue(ROOT,GROUP);
const events=[];
for(const c of manifest.cases){
  const excerpt=headExcerpt(c.native_event);
  if(!excerpt) throw new Error('EMPTY_EXCERPT '+c.message_id);
  const identity=[1,GROUP,c.project,c.workspace,c.session_id,'user_turn',c.message_id].join('\n');
  const event=Object.freeze({
   schema_version:1,event_id:sha(identity),session_id:c.session_id,project:c.project,
   workspace:c.workspace,group:GROUP,observed_at:c.observed_at,evidence_class:'user-stated',
   kind:'user_turn',source_refs:[c.source_locator],source_strength:'native-id',
   related_event_ids:[],cluster_key:sha(GROUP+'\n'+c.session_id).slice(0,24),excerpt,state:'new'});
  const r=await queue.stage(event);
  if(r.status!=='staged') throw new Error('STAGE_FAILED '+c.message_id+' '+r.status);
  events.push({case_id:c.id,session_id:c.session_id,message_id:c.message_id,
   source_locator:c.source_locator,source_digest:c.native_event_text_sha256,
   valuable:c.label.valuable,predicate:c.label.predicate,event_id:event.event_id,stage:r.status});
}
const status=await queue.status();
console.log('A3_V2_STAGING group='+GROUP,JSON.stringify(status));
await import('node:fs/promises').then(fs=>fs.writeFile(path.join(ROOT,'a3-v2-staged.json'),
 JSON.stringify({group:GROUP,root:ROOT,manifest_sha:manifest && 'a85941839f1f9dc7e04081829016aa3c38ef05e9a6f3c29ca58de8b53abbf5ca',events},null,1)+'\n',{mode:0o600}));
console.log('A3_V2_STAGING_DONE count='+events.length+' (PREP ONLY - no inference run)');
