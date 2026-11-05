import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import plugin from './plugin.mjs';
import {CandidateQueue} from './queue.mjs';

const scope={group:'assoc81',project:'fixture',workspace:'/workspace/issue81-association'};
const sessionID='ses-assoc';
const nativePrompt=(id,text)=>({sessionID,messageID:id,timestamp:'2026-11-04T17:00:00Z',prompt:{text}});
const user=id=>({role:'user',id,parts:[{type:'text',text:'Native user turn '+id}]});
const assistant=(id,text)=>({role:'assistant',id,parts:[{type:'text',text}]});
const tool=id=>({sessionID,callID:id,status:'completed',
  input:{command:'pytest -q'},result:{output:{exit:0,output:'5 passed'}}});
async function withHarness(run){
 const root=await mkdtemp(path.join(os.tmpdir(),'issue81-association-'));
 try{
  const sessions={},tools={};
  const ctx={directory:scope.workspace,
   options:{enabled:true,capture:true,...scope,stateDir:root,endpoint:'http://127.0.0.1:1/mcp'},
   session:{hook:(kind,cb)=>{(sessions[kind]??=[]).push(cb);return {dispose:async()=>{}};}},
   tool:{hook:(kind,cb)=>{(tools[kind]??=[]).push(cb);return {dispose:async()=>{}};}}};
  const stop=await plugin.setup(ctx);
  const call=async (arr,event)=>{for(const cb of arr||[])await cb(event);};
  const prompt=e=>call(sessions.prompt,e);
  const context=messages=>call(sessions.context,{sessionID,system:[],messages});
  const outcome=id=>call(tools['execute.after'],tool(id));
  try{await run({prompt,context,outcome,root});}
  finally{await stop();}
 }finally{await rm(root,{recursive:true,force:true});}
}
test('assistant history retains preceding admitted native user, not the later prompt; rejected prompt clears tool association',()=>withHarness(async({prompt,context,outcome,root})=>{
 const a=nativePrompt('msg-a','Fix the cron alias parser and preserve the existing public interface.');
 const b=nativePrompt('msg-b','Add and test wrap-around ranges while preserving earlier behavior.');
 const rejected=nativePrompt('msg-filtered','Thanks!');
 const c=nativePrompt('msg-c','Document the discovered implementation behavior and add a regression.');
 const assistantA=assistant('assist-a','The weekday alias implementation was corrected and tested against the new requirement.');
 const assistantB=assistant('assist-b','The wrap-around range test first failed, then passed after the implementation change.');
 const assistantFiltered=assistant('assist-filtered','The latest message was a courtesy acknowledgment, not a new development decision.');
 const assistantC=assistant('assist-c','The regression and implementation notes now document the accepted behavior and scope.');
 await prompt(a);
 await context([]);
 await outcome('call-a');
 await prompt(b);
 await context([user('msg-a'),assistantA]);
 await outcome('call-b');
 await prompt(rejected);
 await context([user('msg-a'),assistantA,user('msg-b'),assistantB]);
 await outcome('call-filtered');
 await prompt(c);
 await context([user('msg-b'),assistantB,user('msg-filtered'),assistantFiltered]);
 await outcome('call-c');
 await context([user('msg-c'),assistantC]);
 // Host queue flush occurs at stop; the callback writes are deliberately async.
 const q=new CandidateQueue(root,scope.group);
 await q.status(); // no authority asserted from this non-blocking snapshot
 // Explicitly wait for accepted per-source rows without creating another turn.
 const staged=async()=>{
  for(let n=0;n<100;n++){
   const rows=(await q.list()).items;
   if(rows.length>=10)return rows;
   await new Promise(resolve=>setTimeout(resolve,5));
  }
  throw Error('pending candidate writes did not finish');
 };
 const entries=await staged();
 const find=(kind,id)=>entries.find(e=>e.source_refs[0]==='opencode:'+sessionID+':'+kind+':'+id);
 const sourceA=find('message','msg-a'),sourceB=find('message','msg-b'),sourceC=find('message','msg-c');
 assert.ok(sourceA&&sourceB&&sourceC);
 assert.equal(find('message','msg-filtered'),undefined);
 assert.deepEqual(find('message','assist-a').related_event_ids,[sourceA.event_id]);
 assert.deepEqual(find('message','assist-b').related_event_ids,[sourceB.event_id]);
 assert.deepEqual(find('message','assist-filtered').related_event_ids,[]);
 assert.deepEqual(find('message','assist-c').related_event_ids,[sourceC.event_id]);
 assert.deepEqual(find('tool','call-a').related_event_ids,[sourceA.event_id]);
 assert.deepEqual(find('tool','call-b').related_event_ids,[sourceB.event_id]);
 assert.deepEqual(find('tool','call-filtered').related_event_ids,[]);
 assert.deepEqual(find('tool','call-c').related_event_ids,[sourceC.event_id]);
}));
test('a rejected prompt at the end of one pending batch does not borrow an earlier accepted anchor',()=>withHarness(async({prompt,context,outcome,root})=>{
 await prompt(nativePrompt('msg-accepted','Fix the parser and add the focused regression test.'));
 await prompt(nativePrompt('msg-rejected','Thanks!'));
 await context([]);
 await outcome('call-later');
 const q=new CandidateQueue(root,scope.group);
 const rows=await (async()=>{for(let n=0;n<100;n++){
  const found=(await q.list()).items;
  if(found.length>=2)return found;
  await new Promise(resolve=>setTimeout(resolve,5));
 }throw Error('pending candidate writes did not finish');})();
 const accepted=rows.find(e=>e.source_refs[0]==='opencode:'+sessionID+':message:msg-accepted');
 const later=rows.find(e=>e.source_refs[0]==='opencode:'+sessionID+':tool:call-later');
 assert.ok(accepted&&later);
 assert.equal(rows.some(e=>e.source_refs[0].endsWith(':msg-rejected')),false);
 assert.deepEqual(later.related_event_ids,[]);
}));
