import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CandidateQueue} from '../issue-78/v2-candidate/queue.mjs';
import {ReviewStore} from '../issue-78/v2-curator/core.mjs';
import {sha} from '../issue-78/v2-candidate/events.mjs';
import {planSourceArchive,archiveOwnedSources} from './archive-owned.mjs';
const group='issue99-test';
async function sandbox(fn){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'issue99-arch-'));
 try{await fn(root);}finally{await fs.rm(root,{recursive:true,force:true});}
}
function event(root,n) {
 const project='project',session_id='session-1',workspace=root,sourceID='message-'+n;
 return {schema_version:1,event_id:sha([1,group,project,workspace,session_id,'user_turn',sourceID].join('\n')),
  group,project,workspace,session_id,state:'new',kind:'user_turn',evidence_class:'user-stated',
  source_strength:'native-id',source_refs:['opencode:'+session_id+':message:'+sourceID],
  cluster_key:sha(group+'\n'+session_id).slice(0,24),
  excerpt:'Implement safe durable archive admission in module '+n+'.',
  observed_at:'2026-11-16T00:00:00Z',related_event_ids:[]};
}
async function review(store,e,state,{id='a'.repeat(64),origin=id,uuid=null,reevaluate=false}={}) {
 await store.ensure();
 const v={id,origin_cluster_id:origin,group:e.group,project:e.project,workspace:e.workspace,
  session_id:e.session_id,events:[{...e}],source_event_ids:[e.event_id],state,revision:1,
  reevaluate_requested:reevaluate,remote_episode_uuid:uuid,
  created_at:'2026-11-16T00:00:00Z',updated_at:'2026-11-16T00:00:00Z'};
 await fs.writeFile(store.filename(id),JSON.stringify(v));
 if(uuid){
  const folder=path.join(store.dir,'_episode-index');await fs.mkdir(folder,{recursive:true});
  await fs.writeFile(path.join(folder,uuid+'.json'),JSON.stringify({id,remote_episode_uuid:uuid}));
 }
 return v;
}
test('archived source survives restart, remains deduplicated, and frees capacity',()=>sandbox(async root=>{
 const q=new CandidateQueue(root,group),r=new ReviewStore(root,group),e=event(root,'one');
 assert.equal((await q.stage(e)).status,'staged');await review(r,e,'skipped');
 const p=await archiveOwnedSources(q,r,{dryRun:true});
 assert.equal(p.eligible_total,1);assert.equal(p.archived,0);
 await assert.rejects(archiveOwnedSources(q,r,{expectedPlan:'0'.repeat(64)}),/ARCHIVE_PLAN_STALE/);
 assert.equal((await archiveOwnedSources(q,r,{expectedPlan:p.plan_sha256})).archived,1);
 const restarted=new CandidateQueue(root,group);
 assert.equal((await restarted.stage(e)).status,'duplicate');
 assert.equal((await restarted.get(e.event_id)).excerpt,e.excerpt);
 assert.equal((await restarted.status()).total,0);
 assert.equal((await restarted.status()).archived_total,1);
 assert.equal((await restarted.list({includeArchived:true})).total,1);
}));
test('crash between archive link and unlink safely converges',()=>sandbox(async root=>{
 const q=new CandidateQueue(root,group),r=new ReviewStore(root,group),e=event(root,'link');
 await q.stage(e);await review(r,e,'deferred');
 await fs.mkdir(q.archiveDir,{recursive:true});
 await fs.link(q.filename(e.event_id),q.archiveFilename(e.event_id));
 const bytes=await fs.readFile(q.filename(e.event_id));
 await assert.rejects(q.transition(e.event_id,'new','skipped'),/ARCHIVE_DUPLICATE_PENDING_RECOVERY/);
 assert.equal((await archiveOwnedSources(q,r)).archived,1);
 assert.deepEqual(await fs.readFile(q.archiveFilename(e.event_id)),bytes);
 assert.equal((await archiveOwnedSources(q,r)).archived,0);
}));
test('unowned, remote-uncertain, wrong-scope, bad index and re-evaluation are retained',()=>sandbox(async root=>{
 const q=new CandidateQueue(root,group),r=new ReviewStore(root,group);
 const [a,b,c,d,e]=['a','b','c','d','e'].map(n=>event(root,n));
 for(const x of [a,b,c,d,e])await q.stage(x);
 await review(r,b,'submission_unknown',{id:'b'.repeat(64)});
 const bad=await review(r,c,'skipped',{id:'c'.repeat(64)});
 bad.workspace='/wrong';await fs.writeFile(r.filename(bad.id),JSON.stringify(bad));
 await review(r,d,'persisted',{id:'d'.repeat(64),uuid:'12345678-1111-4111-a111-222222222222'});
 await fs.rm(path.join(r.dir,'_episode-index','12345678-1111-4111-a111-222222222222.json'));
 await review(r,e,'deferred',{id:'e'.repeat(64),reevaluate:true});
 const plan=await planSourceArchive(q,r);
 assert.equal(plan.eligible_total,0);assert.equal(plan.excluded.unowned,1);
 assert.equal(plan.excluded.scope_or_source_mismatch,1);
 assert.equal(plan.excluded.nonsettled_review,2);
 assert.equal(plan.excluded.missing_terminal_index,1);
 assert.equal((await q.status()).total,5);
}));
test('sibling review fact identities retain common origin and nonsettled sibling blocks',()=>sandbox(async root=>{
 const q=new CandidateQueue(root,group),r=new ReviewStore(root,group),e=event(root,'siblings');
 await q.stage(e);
 await review(r,e,'skipped',{id:'a'.repeat(64),origin:'f'.repeat(64)});
 const other=await review(r,e,'approved',{id:'b'.repeat(64),origin:'f'.repeat(64)});
 assert.equal((await planSourceArchive(q,r)).eligible_total,0);
 other.state='deferred';await fs.writeFile(r.filename(other.id),JSON.stringify(other));
 assert.equal((await archiveOwnedSources(q,r)).archived,1);
}));

test('full 501-item cap reclaims owned sources and admits another event',()=>sandbox(async root=>{
 const q=new CandidateQueue(root,group,{maxItems:501}),r=new ReviewStore(root,group);
 const sources=Array.from({length:501},(_,i)=>event(root,'bulk'+i));
 for(const e of sources)assert.equal((await q.stage(e)).status,'staged');
 const next=event(root,'after');
 assert.equal((await q.stage(next)).status,'queue_full');
 for(let i=0;i<sources.length;i++)
   await review(r,sources[i],'skipped',{id:i.toString(16).padStart(64,'0')});
 const p=await archiveOwnedSources(q,r,{dryRun:true,limit:501});
 assert.equal(p.eligible_total,501);
 assert.equal((await archiveOwnedSources(q,r,{limit:501,expectedPlan:p.plan_sha256})).archived,501);
 assert.equal((await q.stage(next)).status,'staged');
 const s=await q.status();
 assert.equal(s.total,1);assert.equal(s.archived_total,501);
 assert.equal(s.retained_total,502);assert.equal(s.drops.queue_full,1);
 assert.equal(s.oldest_pending_at,next.observed_at);
 assert.equal((await q.list({includeArchived:true})).total,502);
}));
test('persisted positive UUID and index authorize source archival',()=>sandbox(async root=>{
 const q=new CandidateQueue(root,group),r=new ReviewStore(root,group),e=event(root,'uuid');
 await q.stage(e);
 await review(r,e,'persisted',{uuid:'12345678-1111-4111-a111-222222222222'});
 assert.equal((await archiveOwnedSources(q,r)).archived,1);
 assert.equal((await q.stage(e)).status,'duplicate');
}));
test('archive collision mismatch cannot remove original evidence',()=>sandbox(async root=>{
 const q=new CandidateQueue(root,group),r=new ReviewStore(root,group),e=event(root,'collision');
 await q.stage(e);await review(r,e,'skipped');
 await fs.mkdir(q.archiveDir,{recursive:true});
 await fs.writeFile(q.archiveFilename(e.event_id),
   JSON.stringify({...e,excerpt:'corrupted archive'}));
 await assert.rejects(archiveOwnedSources(q,r),/ARCHIVE_COLLISION_CONTENT_MISMATCH/);
 assert.equal((await q.get(e.event_id)).excerpt,e.excerpt);
 assert.equal((await q.status()).total,1);
}));
test('review CAS before queue state transition converges without duplicate curation',()=>sandbox(async root=>{
 const q=new CandidateQueue(root,group),r=new ReviewStore(root,group),e=event(root,'cas');
 await q.stage(e);await review(r,e,'skipped');
 assert.equal((await q.get(e.event_id)).state,'new');
 assert.equal((await archiveOwnedSources(q,r)).archived,1);
 assert.equal((await q.stage(e)).status,'duplicate');
 assert.equal((await q.get(e.event_id)).state,'new');
}));
