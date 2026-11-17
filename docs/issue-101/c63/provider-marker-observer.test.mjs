import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {inspectRequestBody,makeServer} from './provider-marker-observer.mjs';
const nonce='GHDEV101C63_'+'a'.repeat(32);
const g='[GHDEV_GRAPHITI_CONTEXT]src opencode:x[/GHDEV_GRAPHITI_CONTEXT]';
const o='<openviking-context>session evidence</openviking-context>';
const body=(messages)=>Buffer.from(JSON.stringify({model:'chat',stream:true,messages}));
const ok=[{role:'system',content:'header '+g+' and '+o},{role:'user',content:'why? '+nonce}];
test('two completed markers in provider system input + challenge qualify without text persistence',()=>{
 const r=inspectRequestBody(body(ok),nonce);
 assert.equal(r.qualifying,true);assert.equal(r.graphiti_complete_in_system,true);
 assert.equal(r.openviking_complete_in_system,true);assert.equal(r.message_spans[0].role,'system');
 assert.equal(JSON.stringify(r).includes('src opencode'),false);
 assert.equal(JSON.stringify(r).includes(nonce),false);
});
test('reject missing or partial markers',()=>{
 for(const msgs of [[{role:'system',content:g},{role:'user',content:nonce}],
  [{role:'system',content:g+'<openviking-context>'},{role:'user',content:nonce}],
  [{role:'system',content:g+o},{role:'user',content:'no challenge'}]]){
   assert.equal(inspectRequestBody(body(msgs),nonce).qualifying,false);
 }
});
test('reject model echo or user-spoofed system markers',()=>{
 for(const messages of [
  [{role:'assistant',content:g+o},{role:'user',content:nonce}],
  [{role:'user',content:g+o+nonce}],
  [{role:'system',content:g+o},{role:'user',content:g+nonce}]])
  assert.equal(inspectRequestBody(body(messages),nonce).qualifying,false);
});
test('support multimodal text parts without recording image/object bodies',()=>{
 const msgs=[{role:'developer',content:[{type:'text',text:g},{type:'text',text:o}]},
  {role:'user',content:[{type:'text',text:nonce},{type:'image_url',image_url:{url:'data:private'}}]}];
 const r=inspectRequestBody(body(msgs),nonce);
 assert.equal(r.qualifying,true); assert.equal(JSON.stringify(r).includes('data:private'),false);
});
test('invalid JSON/no messages cannot qualify',()=>{
 assert.equal(inspectRequestBody(Buffer.from('{'),nonce).qualifying,false);
 assert.equal(inspectRequestBody(Buffer.from('{}'),nonce).reason,'no_messages');
});
const listen=(s)=>new Promise((resolve,reject)=>s.listen(0,'127.0.0.1',()=>resolve(s.address().port)).once('error',reject));
const close=s=>new Promise(resolve=>s.close(resolve));
test('actual HTTP proxy forwards body/response stream intact but retains only safe record',async()=>{
 const payload=body(ok);
 let seen=null;
 const upstream=http.createServer(async(req,res)=>{
  const chunks=[];for await(const c of req)chunks.push(c);
  seen=Buffer.concat(chunks);
  res.writeHead(200,{'content-type':'text/event-stream'});
  res.write('data: {"content":"secret response"}\n\n');res.end('data: [DONE]\n\n');
 });
 const up=await listen(upstream);
 const records=[];
 const observer=makeServer({upstream:new URL('http://127.0.0.1:'+up),challenge:nonce,writeRecord:x=>records.push(x)});
 const port=await listen(observer);
 try {
  const res=await fetch('http://127.0.0.1:'+port+'/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json'},body:payload});
  assert.equal(res.status,200);assert.match(await res.text(),/\[DONE\]/);
  assert.equal(seen.compare(payload),0);
  assert.equal(records.length,1);
  assert.equal(records[0].qualifying,true);
  assert.equal(records[0].upstream_status,200);
  assert.equal(JSON.stringify(records).includes('secret response'),false);
  assert.equal(JSON.stringify(records).includes('src opencode:x'),false);
 }finally{await close(observer);await close(upstream);}
});
