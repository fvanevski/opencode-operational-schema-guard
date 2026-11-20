import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';

const script=path.resolve(import.meta.dirname, 'ingress_fence.mjs');
const jsonJournal=(state)=>({schema:'ghdev-idle-window-v1',state,attempt:'test'});
async function port(){const srv=net.createServer();srv.listen(0,'127.0.0.1');await once(srv,'listening');const p=srv.address().port;await new Promise(r=>srv.close(r));return p;}
function request(p,url='/ok'){return new Promise((res,rej)=>{
  http.get({hostname:'127.0.0.1',port:p,path:url},r=>{
    const body=[];r.on('data',x=>body.push(x));r.on('end',()=>res({code:r.statusCode,body:Buffer.concat(body).toString()}));
  }).on('error',rej)
})}
async function status(p){return JSON.parse((await request(p,'/__ghdev_ingress/status')).body)}
async function until(fn){for(let i=0;i<80;i++){try{if(await fn())return;}catch{}await delay(25)}throw Error('readiness timeout')}
async function atomicallyWrite(journal,state){const tmp=journal+'.new';await fs.writeFile(tmp,JSON.stringify(jsonJournal(state)),{mode:0o600});await fs.rename(tmp,journal)}

await test('fences new HTTP ingress before native quiescence while allowing prior in-flight completion',async t=>{
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'gh108-ingress-'));
  t.after(async()=>fs.rm(tmp,{recursive:true,force:true}));
  const journal=path.join(tmp,'journal.json');await atomicallyWrite(journal,'idle');
  const [front,backend]=await Promise.all([port(),port()]);
  const seen=[];let releaseSlow;
  const slow=new Promise(resolve=>releaseSlow=resolve);
  const backendServer=http.createServer(async(req,res)=>{
    seen.push(req.url);
    if(req.url==='/slow') await slow;
    res.end('ok '+req.url);
  });
  backendServer.listen(backend,'127.0.0.1');await once(backendServer,'listening');
  t.after(async()=>{releaseSlow();backendServer.closeAllConnections();await new Promise(r=>backendServer.close(r))});
  let child=spawn(process.execPath,[script],{env:{...process.env,GHDEV_WINDOW_JOURNAL:journal,GHDEV_INGRESS_PORT:String(front),GHDEV_BACKEND_PORT:String(backend)},stdio:'ignore'});
  t.after(async()=>{if(child&&!child.killed){child.kill('SIGTERM');await once(child,'exit').catch(()=>{})}});
  await until(async()=>(await status(front)).schema==='ghdev-ingress-fence-v1');
  assert.equal((await request(front,'/before')).code,200);
  const pending=request(front,'/slow');await until(async()=>(await status(front)).active===1);
  await atomicallyWrite(journal,'preparing');
  assert.equal((await status(front)).blocked,true);
  const denied=await request(front,'/after');assert.equal(denied.code,503);
  assert.deepEqual(seen,['/before','/slow']);
  releaseSlow();assert.equal((await pending).code,200);
  await until(async()=>(await status(front)).active===0);
  // Restart the ingress process during a fenced window: it must remain closed.
  child.kill('SIGTERM');await once(child,'exit');
  child=spawn(process.execPath,[script],{env:{...process.env,GHDEV_WINDOW_JOURNAL:journal,GHDEV_INGRESS_PORT:String(front),GHDEV_BACKEND_PORT:String(backend)},stdio:'ignore'});
  await until(async()=>(await status(front)).blocked===true);
  assert.equal((await request(front,'/restart')).code,503);
  await atomicallyWrite(journal,'idle');
  assert.equal((await request(front,'/after_resume')).code,200);
  assert.deepEqual(seen,['/before','/slow','/after_resume']);
  // Malformed journal is closed, not a permission to reopen.
  await fs.writeFile(journal,'{bad',{mode:0o600});
  assert.equal((await request(front,'/bad_journal')).code,503);
  await fs.rm(journal);
  assert.equal((await request(front,'/missing_journal')).code,503,
    'deleting the journal must never reopen ingress');
});


await test('aborted upstream SSE closes downstream and releases ingress activity', {timeout:5000}, async t=>{
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'gh108-sse-abort-'));
  t.after(async()=>fs.rm(tmp,{recursive:true,force:true}));
  const journal=path.join(tmp,'journal.json');
  await atomicallyWrite(journal,'idle');
  const [front,backend]=await Promise.all([port(),port()]);
  let upstreamStarted=false;
  const backendServer=http.createServer(async(req,res)=>{
    assert.equal(req.url,'/stream');
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});
    res.write('data: first-event\\n\\n');
    upstreamStarted=true;
    await delay(50);
    res.socket?.destroy(); // Real truncated chunked SSE, no terminating frame
  });
  backendServer.listen(backend,'127.0.0.1');
  await once(backendServer,'listening');
  t.after(async()=>{
    backendServer.closeAllConnections();
    await new Promise(resolve=>backendServer.close(resolve));
  });
  const proxy=spawn(process.execPath,[script],{
    env:{...process.env,GHDEV_WINDOW_JOURNAL:journal,
      GHDEV_INGRESS_PORT:String(front),GHDEV_BACKEND_PORT:String(backend)},
    stdio:'ignore'
  });
  t.after(async()=>{
    if(proxy.exitCode===null && proxy.signalCode===null){
      proxy.kill('SIGTERM');
      await once(proxy,'exit').catch(()=>{});
    }
  });
  await until(async()=>(await status(front)).schema==='ghdev-ingress-fence-v1');
  let gotEvent=false;
  let downstreamClosed=false;
  const client=http.get({hostname:'127.0.0.1',port:front,path:'/stream'},resp=>{
    resp.on('data',chunk=>{if(chunk.toString().includes('first-event'))gotEvent=true;});
    resp.on('error',()=>{}); // Aborted chunked response emits ECONNRESET
    resp.on('close',()=>{downstreamClosed=true;});
  });
  client.on('error',()=>{});
  t.after(()=>client.destroy());
  await until(()=>upstreamStarted && gotEvent);
  await until(()=>downstreamClosed);
  await until(async()=>(await status(front)).active===0);
  // Stale in-flight count must not indefinitely defer the coordinator.
  await atomicallyWrite(journal,'preparing');
  assert.deepEqual({blocked:(await status(front)).blocked,active:(await status(front)).active},
    {blocked:true,active:0});
});
