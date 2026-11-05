#!/usr/bin/env node
/** Personal loopback review API. No browser-triggered Graphiti/LLM or gate actions. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { CandidateQueue } from '../v2-candidate/queue.mjs';
import {describeFixtureGroup} from '../fixture-groups.mjs';
import { ReviewStore } from './core.mjs';
import { inspectEpisodeGraph } from './graph-evidence.mjs';
import { addReadOnlyGraph } from './graph-preview.mjs';

const args=process.argv.slice(2);
const opt=k=>{let i=args.indexOf('--'+k);return i<0?'':args[i+1]||'';};
const group=opt('group');
const root=opt('state-dir')||path.join(process.env.XDG_STATE_HOME||
  path.join(os.homedir(),'.local','state'),'ghdev-graphiti');
const tokenFile=opt('token-file');
const dist=opt('dist');
const graphitiEndpoint=opt('graphiti-endpoint');
const port=Number(opt('port')||'8820');
if(!group||!tokenFile||!dist||!Number.isInteger(port)||port<1024||port>65535)
  throw Error('Usage: node portal-server.mjs --group SAFE --state-dir ABS --token-file ABS --dist BUILT_DIST [--port 8820]');
if(!path.isAbsolute(root)||!path.isAbsolute(dist)||!path.isAbsolute(tokenFile))
  throw Error('Absolute paths required');
const tokenStat=await stat(tokenFile);
if(!tokenStat.isFile()||(tokenStat.mode&0o077)!==0)
  throw Error('Token file must be a private regular 0600 file');
const secret=(await readFile(tokenFile,'utf8')).trim();
if(secret.length<32||secret.length>256)throw Error('Invalid token file');
const store=new ReviewStore(root,group);
const queue=new CandidateQueue(root,group);
const allowedOrigin='http://127.0.0.1:'+port;
const corsHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
function authorized(req){
  const actual=req.headers['x-review-token'];
  if(typeof actual!=='string')return false;
  const a=Buffer.from(actual),b=Buffer.from(secret);
  return a.length===b.length&&timingSafeEqual(a,b);
}
function respond(res,status,data){
  res.writeHead(status,{...corsHeaders,'Content-Type':'application/json; charset=utf-8'});
  res.end(JSON.stringify(data));
}
async function body(req){
  let value='',bytes=0;
  for await(const chunk of req){
    bytes+=chunk.length;if(bytes>16000)throw Error('REQUEST_TOO_LARGE');
    value+=chunk;
  }
  return JSON.parse(value);
}
function graphPreview(record){
  const nodes=[],edges=[];
  for(let i=0;i<record.events.length;i++){
    const e=record.events[i];
    nodes.push({id:'src-'+e.event_id,type:'default',className:'review-source',data:{
      label:e.kind,excerpt:e.excerpt,source:e.source_refs[0],
      authority:e.evidence_class,status:'source observation'},
      position:{x:35,y:55+i*112}});
  }
  for(let i=0;i<record.facts.length;i++){
    const f=record.facts[i],fid='proposal-'+i;
    nodes.push({id:fid,type:'default',className:'review-proposal',data:{
      label:f.assertion,authority:f.evidence_class,
      status:record.state==='persisted'?'source-linked persisted episode':
        'proposed, unverified',time:f.observed_at,temporal:f.temporal_status},
      position:{x:430,y:65+i*145}});
    for(const ref of f.source_refs){
      const e=record.events.find(e=>e.source_refs.includes(ref));
      if(e)edges.push({id:'source-'+e.event_id+'-'+fid,
        source:'src-'+e.event_id,target:fid,label:'supports proposal',
        animated:record.state!=='persisted',data:{type:'provenance'}});
    }
  }
  if(record.state==='persisted'&&record.remote_episode_uuid){
    nodes.push({id:'episode',type:'default',className:'review-episode',data:{
      label:'Persisted Graphiti episode',source:record.remote_episode_uuid,
      status:'remote episode readback confirmed'},position:{x:800,y:90}});
    for(let i=0;i<record.facts.length;i++)edges.push({id:'remote-'+i,
      source:'proposal-'+i,target:'episode',label:'persisted in episode',
      data:{type:'persisted episode association'}});
  }
  // Does not claim extracted Graphiti entity/relationship edges were read.
  return {nodes,edges,scope:{group:record.group,project:record.project},
    note:'Source/proposal/confirmed-episode associations only. This is not an assertion of extracted Graphiti entity edges.'};
}
const staticContentTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try {
  const parsed=new URL(req.url||'/',allowedOrigin);
  if(req.headers.origin&&req.headers.origin!==allowedOrigin)
    return respond(res,403,{error:'ORIGIN_REJECTED'});
  if(parsed.pathname.startsWith('/api/')){
    if(!authorized(req))return respond(res,401,{error:'UNAUTHORIZED'});
    if(req.method==='GET'&&parsed.pathname==='/api/status'){
      const counts={};let total=0;
      const evidenceClasses=new Set(),eventKinds=new Set();
      for(let offset=0;;offset+=500){
        const page=await store.list({limit:500,offset});
        for(const e of page.items){
          counts[e.state]=(counts[e.state]||0)+1;
          for(const event of e.events){
            evidenceClasses.add(event.evidence_class);
            eventKinds.add(event.kind);
          }
        }
        total=page.total;if(!page.has_more)break;
      }
      return respond(res,200,{scope:group,fixture:describeFixtureGroup(group),review_count:total,
        review_counts:counts,evidence_classes:[...evidenceClasses].sort(),
        event_kinds:[...eventKinds].sort(),candidate_queue:await queue.status()});
    }
    if(req.method==='GET'&&parsed.pathname==='/api/clusters'){
      const offset=Number(parsed.searchParams.get('offset')||0);
      const limit=Number(parsed.searchParams.get('limit')||100);
      if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||
        limit<1||limit>500)return respond(res,400,{error:'INVALID_PAGE'});
      const filter={
        state:parsed.searchParams.get('state')||'all',
        search:parsed.searchParams.get('search')||'',
        evidenceClass:parsed.searchParams.get('evidence_class')||'all',
        eventKind:parsed.searchParams.get('event_kind')||'all',
        ageDays:parsed.searchParams.get('age_days')||'all'
      };
      let results;
      try{results=await store.list({limit,offset,filter});}
      catch{return respond(res,400,{error:'INVALID_REVIEW_FILTER'});}
      return respond(res,200,{total:results.total,offset,limit,
        has_more:results.has_more,
        items:results.items.map(x=>({
          id:x.id,state:x.state,project:x.project,session_id:x.session_id,
          event_count:x.events.length,reason:x.reason,decision:x.decision,
          revision:x.revision,updated_at:x.updated_at,remote_episode_uuid:x.remote_episode_uuid,
          group:x.group,origin:x.origin||'curated',
          evidence_classes:[...new Set(x.events.map(e=>e.evidence_class))],
          event_kinds:[...new Set(x.events.map(e=>e.kind))],
          last_observed_at:x.events.map(e=>e.observed_at).sort().at(-1)||null
        }))});
    }
    const m=/^\/api\/clusters\/([a-f0-9]{64})(?:\/(preview|review))?$/.exec(parsed.pathname);
    if(m){
      const record=await store.get(m[1]);
      if(!record)return respond(res,404,{error:'NOT_FOUND'});
      if(req.method==='GET'&&!m[2])return respond(res,200,record);
      if(req.method==='GET'&&m[2]==='preview'){
        const base=graphPreview(record);
        let inspection={status:'not_configured'};
        if(graphitiEndpoint&&record.state==='persisted'){
          try{inspection=await inspectEpisodeGraph({store,root,group,
            clusterId:record.id,endpoint:graphitiEndpoint});}
          catch{inspection={status:'graph_readback_unavailable'};}
        }else if(graphitiEndpoint)inspection={status:'not_persisted'};
        return respond(res,200,addReadOnlyGraph(base,inspection));
      }
      if(req.method==='POST'&&m[2]==='review'){
        if(req.headers.origin!==allowedOrigin||
          req.headers['content-type']?.split(';')[0]!=='application/json')
          return respond(res,403,{error:'POST_ORIGIN_OR_CONTENT_TYPE'});
        const input=await body(req);
        if(!Number.isInteger(input.revision))
          return respond(res,400,{error:'REVISION_REQUIRED'});
        try{
          const updated=await store.change(m[1],input.revision,input.action,
            {reason:input.reason??'',facts:input.facts??null});
          return respond(res,200,{id:updated.id,state:updated.state,
            revision:updated.revision,decision:updated.decision});
        }catch(e){
          const code=String(e.message).startsWith('STALE')?409:400;
          return respond(res,code,{error:String(e.message).slice(0,180)});
        }
      }
    }
    return respond(res,404,{error:'API_ROUTE_NOT_FOUND'});
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return respond(res,405,{error:'METHOD_DENIED'});
  const file=parsed.pathname==='/'?'index.html':
    /^\/assets\/[A-Za-z0-9_.-]+$/.test(parsed.pathname)?parsed.pathname.slice(1):null;
  if(!file)return respond(res,404,{error:'NOT_FOUND'});
  const filepath=path.resolve(dist,file);
  if(!filepath.startsWith(path.resolve(dist)+path.sep))return respond(res,404,{error:'NOT_FOUND'});
  const data=await readFile(filepath);
  const headers={...corsHeaders,
    'Content-Type':staticContentTypes[path.extname(filepath)]||'application/octet-stream'};
  res.writeHead(200,headers);if(req.method==='HEAD')res.end();else res.end(data);
 }catch(e){respond(res,500,{error:'PORTAL_READ_OR_VALIDATION_FAILURE'});}
});
server.listen(port,'127.0.0.1',()=>process.stdout.write('review portal bound to '+allowedOrigin+'\n'));
