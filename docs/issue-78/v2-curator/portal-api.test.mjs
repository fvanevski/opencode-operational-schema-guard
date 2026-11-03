import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, chmod, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import os from 'node:os';
import { ReviewStore, selectClusters } from './core.mjs';
import { fromPrompt } from '../v2-candidate/events.mjs';

const getFreePort=()=>new Promise((resolve,reject)=>{
  const server=net.createServer();
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{
    const port=server.address().port;
    server.close(()=>resolve(port));
  });
});
test('loopback API requires token, exact origin, source-bound review and revision CAS',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'curator80-api-'));
 let child;
 try{
  const token='testtoken-abcdefghijklmnopqrstuvwxyz0123456789';
  const tokenFile=path.join(root,'token');
  await writeFile(tokenFile,token,{mode:0o600});
  await chmod(tokenFile,0o600);
  const dist=path.join(root,'dist');await mkdir(dist);
  await writeFile(path.join(dist,'index.html'),'<html><title>private review</title></html>');
  const group='api80';
  const event=fromPrompt({sessionID:'ses_api',messageID:'msg_api',
    prompt:{text:'Fix median invalidation and preserve the CLI interface with a regression test.'},
    timestamp:'2026-11-03T18:00:00.000Z'},
    {group,workspace:'/workspace/gh_mcp',project:'gh_mcp'},{admitted:true});
  const cluster=selectClusters([event,event].map((e,i)=>({...e,event_id:i?e.event_id:e.event_id})),{maxEvents:8})[0];
  assert.ok(cluster);
  const store=new ReviewStore(root,group);
  await store.create(cluster,{decision:'DEFER',reason:'Requires operator review',facts:[]});
  const port=await getFreePort(),origin='http://127.0.0.1:'+port;
  child=spawn(process.execPath,[new URL('./portal-server.mjs',import.meta.url).pathname,
    '--group',group,'--state-dir',root,'--token-file',tokenFile,
    '--dist',dist,'--port',String(port)],{stdio:['ignore','pipe','pipe']});
  let up=false;
  for(let i=0;i<50;i++){
    if(child.exitCode!==null)break;
    try{await fetch(origin+'/');up=true;break;}catch{}
    await new Promise(res=>setTimeout(res,60));
  }
  assert.equal(up,true,'isolated portal started');
  let resp=await fetch(origin+'/api/clusters');
  assert.equal(resp.status,401);
  resp=await fetch(origin+'/api/clusters',{headers:{'x-review-token':token,'Origin':'http://evil.invalid'}});
  assert.equal(resp.status,403);
  resp=await fetch(origin+'/api/clusters',{headers:{'x-review-token':token}});
  assert.equal(resp.status,200);
  assert.equal((await resp.json()).items.length,1);
  const url=origin+'/api/clusters/'+cluster.id+'/review';
  resp=await fetch(url,{method:'POST',headers:{'x-review-token':token,
    'Origin':'http://evil.invalid','Content-Type':'application/json'},
    body:JSON.stringify({action:'discard',revision:1,reason:'Not useful'})});
  assert.equal(resp.status,403);
  resp=await fetch(url,{method:'POST',headers:{'x-review-token':token,
    'Origin':origin,'Content-Type':'application/json'},
    body:JSON.stringify({action:'discard',revision:1,reason:'Not useful'})});
  assert.equal(resp.status,200);
  assert.equal((await store.get(cluster.id)).state,'skipped');
  resp=await fetch(url,{method:'POST',headers:{'x-review-token':token,
    'Origin':origin,'Content-Type':'application/json'},
    body:JSON.stringify({action:'discard',revision:1,reason:'Not useful'})});
  assert.equal(resp.status,409);
  resp=await fetch(origin+'/api/clusters/'+cluster.id+'/preview',
    {headers:{'x-review-token':token}});
  assert.equal(resp.status,200);
  const preview=await resp.json();
  assert.ok(preview.nodes.length>=1);
  assert.equal(preview.nodes.some(n=>n.id==='episode'),false);
 }finally{
  if(child&&child.exitCode===null){
    const exited=new Promise(resolve=>child.once('exit',resolve));
    child.kill('SIGTERM');await exited;
  }
  await rm(root,{recursive:true,force:true});
 }
});
