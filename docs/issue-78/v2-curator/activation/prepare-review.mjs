#!/usr/bin/env node
/** Qualification-only DEFER from genuine captured candidate events, NOT a model decision. */
import path from 'node:path';
import {CandidateQueue} from '../../v2-candidate/queue.mjs';
import {ReviewStore,selectClusters} from '../core.mjs';
import {isFixtureGroup} from '../../fixture-groups.mjs';
export async function prepareReview({queue,store,minEvents=2}={}){
 if(!queue||!store||!Number.isInteger(minEvents)||minEvents<2||minEvents>8)
  throw Error('INVALID_PREP_ARGUMENTS');
 const page=await queue.list({limit:500,states:['new']});
 const clusters=selectClusters(page.items,{maxClusters:12,maxEvents:8});
 const chosen=clusters.find(c=>c.group===store.group&&c.events.length>=minEvents&&
  c.events.every(e=>e.source_strength==='native-id'&&e.group===store.group&&
   e.workspace===c.workspace&&e.project===c.project&&
   e.source_refs?.length===1&&e.source_refs[0].startsWith('opencode:')));
 if(!chosen)return {status:'NO_ELIGIBLE_REAL_CLUSTER',new_events:page.items.length};
 const result=await store.create(chosen,{decision:'DEFER',
  reason:'Qualification operator review of real captured events; no model claim',facts:[]},
  {origin:'qualification_operator_seed'});
 if(!result.created)return {status:'REVIEW_ALREADY_EXISTS',id:chosen.id};
 let moved=0;
 for(const e of chosen.events)if(await queue.transition(e.event_id,'new','deferred'))moved++;
 return {status:'PREPARED_REAL_SOURCE_REVIEW',group:store.group,id:chosen.id,
  events:chosen.events.length,transitioned:moved,source_event_ids:chosen.source_event_ids,
  origin:result.record.origin,revision:result.record.revision};
}
async function main(){
 const args=process.argv.slice(2);
 const get=k=>{const i=args.indexOf('--'+k);return i<0?'':args[i+1]||'';};
 const root=get('state-dir'),group=get('group');
 if(!path.isAbsolute(root)||!isFixtureGroup(group,'recovery',{allowLegacy:true}))
  throw Error('Use --state-dir ABS --group DESCRIPTIVE_RECOVERY_FIXTURE_OR_LEGACY_CUR80');
 const data=await prepareReview({queue:new CandidateQueue(root,group),
  store:new ReviewStore(root,group)});
 console.log(JSON.stringify(data,null,2));
 if(data.status!=='PREPARED_REAL_SOURCE_REVIEW')process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname)
 await main();
