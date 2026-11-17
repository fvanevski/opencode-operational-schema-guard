#!/usr/bin/env node
/*
 * GHDEV #101 C6.3: temporary, loopback-only provider-request observer.
 * Forward HTTP/1.1 requests unchanged to the existing loopback provider route.
 * Never record prompt bodies, request headers, credentials or response content.
 * An assertion is meaningful only when it is tied to an unpredictable challenge
 * in the native user request and the two completed markers in model-input roles.
 * This is NOT a security gateway. Run only during a bounded operator-supervised
 * diagnostic; restore the original provider route afterwards.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const GRAPHITI = ['[GHDEV_GRAPHITI_CONTEXT]', '[/GHDEV_GRAPHITI_CONTEXT]'];
const VIKING = ['<openviking-context>', '</openviking-context>'];
const LIMIT = 16 * 1024 * 1024;

function textParts(value) {
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];
  return value.flatMap(part => {
    if (typeof part === 'string') return [part];
    if (part && typeof part === 'object' && typeof part.text === 'string') return [part.text];
    return [];
  });
}

function completedSpan(value, [start, end]) {
  const a = value.indexOf(start);
  if (a < 0) return null;
  const b = value.indexOf(end, a + start.length);
  if (b <= a + start.length) return null;
  return {start_offset: a, end_offset: b, nonempty: true};
}

/** Pure structural marker inspection. Does not return any prompt text. */
export function inspectRequestBody(body, challenge) {
  let parsed;
  try { parsed = JSON.parse(body.toString('utf8')); }
  catch { return {json_valid:false, qualifying:false, reason:'invalid_json'}; }
  const messages = Array.isArray(parsed?.messages) ? parsed.messages : null;
  if (!messages) return {json_valid:true, qualifying:false, reason:'no_messages'};
  const inputRoles = new Set(['system','developer']);
  const evidence = [];
  let userChallenge = false;
  let userMarkerEcho = false;
  for (let i=0;i<messages.length;i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== 'object') continue;
    const role = String(msg.role || 'unknown');
    const content = textParts(msg.content).join('\n');
    if (role === 'user') {
      if (content.includes(challenge)) userChallenge = true;
      if (content.includes(GRAPHITI[0]) || content.includes(VIKING[0])) userMarkerEcho = true;
    }
    if (!inputRoles.has(role)) continue;
    const graph = completedSpan(content, GRAPHITI);
    const viking = completedSpan(content, VIKING);
    if (graph || viking) evidence.push({message_index:i, role,
      graphiti_span:graph, openviking_span:viking});
  }
  const hasGraph = evidence.some(x => x.graphiti_span !== null);
  const hasViking = evidence.some(x => x.openviking_span !== null);
  return {json_valid:true,message_count:messages.length,
    challenge_present_in_user:userChallenge,user_marker_echo:userMarkerEcho,
    graphiti_complete_in_system:hasGraph,openviking_complete_in_system:hasViking,
    qualifying:userChallenge && hasGraph && hasViking && !userMarkerEcho,
    message_spans:evidence,
    reason:userChallenge && hasGraph && hasViking && !userMarkerEcho ? 'both_complete_in_model_input' : 'required_evidence_missing'};
}

function parseArgs(argv) {
  if (argv.includes('--help')) {
    process.stdout.write('node provider-marker-observer.mjs --port <port> --upstream http://127.0.0.1:8002 --receipt <new-private-file> --challenge-file <0600-file>\n');
    process.exit(0);
  }
  const p={};
  for(let i=0;i<argv.length;i+=2) {
    if (!argv[i]?.startsWith('--') || !argv[i+1]) throw Error('expected four paired arguments');
    p[argv[i].slice(2)] = argv[i+1];
  }
  if (Object.keys(p).length !== 4 || !['port','upstream','receipt','challenge-file'].every(k=>p[k])) throw Error('required --port --upstream --receipt --challenge-file');
  const port=Number(p.port);
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid listen port');
  const upstream=new URL(p.upstream);
  if(upstream.protocol!=='http:' || !['127.0.0.1','localhost'].includes(upstream.hostname) || (upstream.pathname!=='/' && upstream.pathname!=='') || upstream.search || upstream.hash)throw Error('upstream must be an HTTP loopback origin');
  const challengeStat=fs.statSync(p['challenge-file']);
  if(!challengeStat.isFile() || (challengeStat.mode & 0o077)!==0 || (process.getuid && challengeStat.uid!==process.getuid()))throw Error('challenge file must be private and owned by process user');
  const challenge=fs.readFileSync(p['challenge-file'],'utf8').trim();
  if(!/^GHDEV101C63_[a-f0-9]{32,64}$/.test(challenge))throw Error('challenge must have a high-entropy 128-bit-or-longer suffix');
  const parent=path.dirname(path.resolve(p.receipt));
  const parentStat=fs.statSync(parent);
  if (!parentStat.isDirectory()||(parentStat.mode&0o077)!==0 || (process.getuid && parentStat.uid!==process.getuid()))throw Error('receipt parent directory must be private and owned by process user');
  return {port,upstream,receipt:path.resolve(p.receipt),challenge};
}

export function makeServer({upstream,challenge,writeRecord}) {
  const server=http.createServer((req,res)=>{
    if(req.url==='/__ghdev_observer_health' && req.method==='GET') {
      res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
      res.end('{"status":"ready","scope":"loopback_observer"}');return;
    }
    const id=crypto.randomUUID();
    const started=new Date().toISOString();
    const requestBuffers=[];
    let bytes=0, overLimit=false, ended=false, logged=false, responseStatus=null;
    const requestPath=new URL(req.url||'/',upstream).pathname;
    const candidate=req.method==='POST' && /\/(chat\/completions|responses)$/.test(requestPath);
    req.on('data',chunk=>{
      bytes+=chunk.length;
      if(candidate && !overLimit) {
        if(bytes<=LIMIT)requestBuffers.push(Buffer.from(chunk));
        else {overLimit=true;requestBuffers.length=0;}
      }
    });
    const headers={...req.headers,host:upstream.host};
    delete headers.connection;delete headers['proxy-connection'];delete headers['proxy-authorization'];
    const uReq=http.request({hostname:upstream.hostname,port:upstream.port||80,
      method:req.method,path:req.url,headers,agent:false},uRes=>{
      responseStatus=uRes.statusCode;
      const rh={...uRes.headers};delete rh.connection;delete rh['transfer-encoding'];
      // When upstream has no content-length, Node chooses chunked transfer.
      res.writeHead(uRes.statusCode||502,rh);
      uRes.pipe(res);
      uRes.on('error',()=>res.destroy());
    });
    const record=()=>{
      if(logged || !candidate)return;
      logged=true;
      let evidence=overLimit?{qualifying:false,reason:'exceeds_memory_cap'}:
        ended?inspectRequestBody(Buffer.concat(requestBuffers),challenge):{qualifying:false,reason:'incomplete_request'};
      writeRecord({event:'provider_request',schema:'ghdev101-c63-provider-v1',
        request_id:id,started_utc:started,finished_utc:new Date().toISOString(),
        method:req.method,path:requestPath,request_bytes:bytes,
        upstream_status:responseStatus, ...evidence});
    };
    req.on('end',()=>{ended=true;});
    req.on('error',()=>{uReq.destroy();});
    res.on('finish',record);
    res.on('close',record);
    uReq.on('error',()=>{
      if(!res.headersSent){res.writeHead(502,{'content-type':'text/plain'});res.end('upstream unavailable');}
      else res.destroy();
    });
    req.pipe(uReq);
  });
  server.requestTimeout=120_000;
  server.headersTimeout=30_000;
  server.keepAliveTimeout=7_000;
  return server;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try {
    const p=parseArgs(process.argv.slice(2));
    const mode=(fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|(fs.constants.O_NOFOLLOW||0));
    const fd=fs.openSync(p.receipt,mode,0o600);
    const writeRecord=r=>fs.writeSync(fd,JSON.stringify(r)+'\n');
    const srv=makeServer({...p,writeRecord});
    srv.listen(p.port,'127.0.0.1',()=>{
      writeRecord({event:'observer_started',schema:'ghdev101-c63-provider-v1',
        started_utc:new Date().toISOString(),pid:process.pid,
        listen_host:'127.0.0.1',listen_port:p.port,upstream_host:p.upstream.host,
        note:'no prompts, credentials, request headers or responses retained'});
      process.stdout.write('provider observer ready on loopback\n');
    });
    const stop=()=>srv.close(()=>{fs.closeSync(fd);process.exit(0);});
    process.on('SIGINT',stop);process.on('SIGTERM',stop);
  } catch(error){
    // Never print argument values (could contain private host paths).
    process.stderr.write('provider observer refused startup: '+String(error.message||'invalid configuration').replace(/\/\S+/g,'<path>')+'\n');
    process.exitCode=2;
  }
}
