#!/usr/bin/env node
/** Loopback-only HTTP ingress fence for OpenCode service maintenance windows.
 *
 * The existing OpenCode server runs on a private loopback backend port. Its
 * canonical client port is owned by this transparent proxy. The authoritative
 * owner-only journal (updated atomically by idle_window.py) is read BEFORE
 * admitting each connection. An admitted request is counted until its response
 * closes; a WebSocket upgrade stays counted until its socket closes. No
 * new application HTTP activity enters after the journal leaves `idle`.
 *
 * This process does not own the inference SH/EX lock, call a model, read user
 * content, or modify native application state. Systemd supervises it.
 */
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';

const journal = process.env.GHDEV_WINDOW_JOURNAL;
const listenPort = Number(process.env.GHDEV_INGRESS_PORT || '49374');
const backendPort = Number(process.env.GHDEV_BACKEND_PORT || '49375');
const schema = 'ghdev-idle-window-v1';
if (!journal || !Number.isSafeInteger(listenPort) || !Number.isSafeInteger(backendPort) ||
  listenPort <= 0 || backendPort <= 0 || listenPort === backendPort) {
  throw Error('Invalid ingress fence configuration');
}
let active = 0;
const blocked = () => {
  try {
    const info = fs.lstatSync(journal, {throwIfNoEntry:true});
    if (info.isSymbolicLink() || !info.isFile() || info.uid !== process.getuid() || (info.mode & 0o077)) {
      return {blocked:true, reason:'unsafe_journal'};
    }
    const value = JSON.parse(fs.readFileSync(journal, 'utf8'));
    if (value?.schema !== schema || value?.state !== 'idle') return {blocked:true, reason:'maintenance'};
    return {blocked:false, reason:'idle'};
  } catch (err) {
    if (err?.code === 'ENOENT') return {blocked:true, reason:'missing_journal'};
    return {blocked:true, reason:'journal_unreadable'};
  }
};
const forbidden = (resOrSocket) => {
  const body='Temporary maintenance: retry after service resumes\n';
  if (typeof resOrSocket.writeHead === 'function') {
    resOrSocket.writeHead(503, {'Retry-After':'10','Content-Type':'text/plain','Connection':'close'});
    resOrSocket.end(body);
  } else {
    resOrSocket.end('HTTP/1.1 503 Service Unavailable\r\nRetry-After: 10\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  }
};
const internal = '/__ghdev_ingress/status';
const server = http.createServer((req, res) => {
  if (req.url === internal) {
    res.setHeader('Content-Type','application/json');
    res.setHeader('Cache-Control','no-store');
    res.end(JSON.stringify({schema:'ghdev-ingress-fence-v1',pid:process.pid,active,...blocked()}));
    return;
  }
  // Synchronous check and increment on the single-threaded event loop close
  // the admission race with the coordinator's atomic journal replacement.
  if (blocked().blocked) {forbidden(res);return;}
  active++;
  let completed=false;
  const done=()=>{if (!completed) {completed=true;active--;}};
  let remoteResponse;
  const upstream = http.request({hostname:'127.0.0.1',port:backendPort,
      method:req.method,path:req.url,headers:req.headers,agent:false}, upstreamRes => {
    remoteResponse = upstreamRes;
    // A backend crash/aborted SSE stream does not automatically end the
    // downstream ServerResponse when IncomingMessage.pipe() is unpiped.
    // Preserve the admission count until the downstream socket is closed,
    // then force that closure on incomplete/erroring upstream responses.
    const abortDownstream = () => {
      if (!res.destroyed && !res.writableEnded) res.destroy();
    };
    upstreamRes.once('aborted', abortDownstream);
    upstreamRes.once('error', abortDownstream);
    upstreamRes.once('close', () => {
      if (!upstreamRes.complete) abortDownstream();
    });
    if (res.destroyed) {upstreamRes.destroy(); return;}
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });
  // Client disconnection during a healthy SSE response is independent of an
  // upstream abort. Destroy both sides of the upstream stream on downstream
  // close so no orphaned backend subscriptions survive a client disconnect.
  // This is also invoked on normal completed responses; destroy is idempotent.
  res.once('close', () => {
    done();
    upstream.destroy();
    remoteResponse?.destroy();
  });
  upstream.once('error',()=>{
    if (res.destroyed || res.writableEnded) return;
    if (res.headersSent) {res.destroy(); return;}
    res.writeHead(502,{'Content-Type':'text/plain'});
    res.end('Backend unavailable\n');
  });
  req.once('aborted',()=>upstream.destroy());
  req.pipe(upstream);
});
server.on('upgrade',(req, socket, head)=>{
  // Node hands an upgraded socket over to the application and may detach its
  // HTTP error listener. A client TCP reset must close this tunnel, not crash
  // the entire ingress fence via an unhandled ECONNRESET.
  socket.on('error',()=>socket.destroy());
  if (blocked().blocked) {forbidden(socket);return;}
  active++;
  let completed=false;
  const done=()=>{if(!completed){completed=true;active--;}};
  socket.once('close',done);
  const upstream=net.connect({host:'127.0.0.1',port:backendPort});
  upstream.once('connect',()=>{
    const headers=req.rawHeaders.reduce((out,val,i)=>{
      if(i%2===0)out.push(`${val}: ${req.rawHeaders[i+1]}\r\n`);
      return out;
    },[]).join('');
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${headers}\r\n`);
    if (head?.length) upstream.write(head);
    socket.pipe(upstream);upstream.pipe(socket);
  });
  upstream.once('error',()=>socket.destroy());
  upstream.once('close',()=>socket.destroy());
  socket.once('close',()=>upstream.destroy());
});
server.on('clientError',(_err,socket)=>socket.destroy());
server.listen(listenPort,'127.0.0.1');
