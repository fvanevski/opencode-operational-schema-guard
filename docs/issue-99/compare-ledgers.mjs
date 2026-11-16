#!/usr/bin/env node
/** Synthetic files/archive/SQLite comparison. Never point this at live state. */
import {promises as fs} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
const id=n=>createHash('sha256').update('synthetic-'+n).digest('hex');
const payload=n=>JSON.stringify({event_id:id(n),state:'new',group:'fixture',
  excerpt:'Entirely synthetic bounded source content for the disposal-only comparison.'});
function option(name,def,min,max){
  const i=process.argv.indexOf('--'+name);
  if(i<0)return def;
  const v=Number(process.argv[i+1]);
  if(!Number.isInteger(v)||v<min||v>max)throw Error('INVALID_'+name);
  return v;
}
function summary(values){
  const a=values.slice().sort((x,y)=>x-y);
  const at=p=>a[Math.max(0,Math.ceil(a.length*p)-1)]||0;
  return {n:a.length,p50_ms:+at(.5).toFixed(4),p95_ms:+at(.95).toFixed(4),
    max_ms:+at(1).toFixed(4)};
}
async function exists(p){
  try{await fs.access(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}
}
async function files(root,n,burst,retained,archive){
  const pending=path.join(root,'pending'),history=path.join(root,'history');
  await fs.mkdir(pending,{recursive:true,mode:0o700});
  if(archive)await fs.mkdir(history);
  const elapsed=[];let accepted=0,dropped=0;
  async function admit(i) {
    const start=performance.now(),name=id(i)+'.json';
    if(await exists(path.join(pending,name))||(archive&&await exists(path.join(history,name))))
      return 'duplicate';
    if((await fs.readdir(pending)).length>=n){
      dropped++;elapsed.push(performance.now()-start);return 'queue_full';
    }
    const f=await fs.open(path.join(pending,name),'wx',0o600);
    try{await f.writeFile(payload(i));await f.sync();}finally{await f.close();}
    accepted++;elapsed.push(performance.now()-start);return 'staged';
  }
  for(let i=0;i<n;i++)await admit(i);
  if(archive)for(let i=0;i<retained;i++)await fs.rename(
    path.join(pending,id(i)+'.json'),path.join(history,id(i)+'.json'));
  for(let i=n;i<n+burst;i++)await admit(i);
  return {accepted,dropped,duplicate_after_archival:await admit(0),
    history_findable:await exists(path.join(archive?history:pending,id(0)+'.json')),
    actionable_files:(await fs.readdir(pending)).length,archive_files:archive?
      (await fs.readdir(history)).length:0,admission:summary(elapsed)};
}
async function sqlite(root,n,burst,retained) {
  const {DatabaseSync}=await import('node:sqlite');
  await fs.mkdir(root,{recursive:true,mode:0o700});
  const db=new DatabaseSync(path.join(root,'evidence.sqlite'));
  try{
    db.exec("PRAGMA journal_mode=WAL;PRAGMA synchronous=FULL;CREATE TABLE evidence(id TEXT PRIMARY KEY, status TEXT NOT NULL, payload TEXT NOT NULL);CREATE INDEX evidence_status ON evidence(status);");
    const existsRow=db.prepare('SELECT status FROM evidence WHERE id=?');
    const pending=db.prepare("SELECT count(*) AS n FROM evidence WHERE status='active'");
    const insert=db.prepare("INSERT INTO evidence VALUES (?,'active',?)");
    const transition=db.prepare("UPDATE evidence SET status='archive' WHERE id=?");
    let accepted=0,dropped=0;const elapsed=[];
    function admit(i){
      const start=performance.now();
      db.exec('BEGIN IMMEDIATE');
      try{
        if(existsRow.get(id(i))){db.exec('ROLLBACK');return 'duplicate';}
        if(pending.get().n>=n){db.exec('ROLLBACK');dropped++;elapsed.push(performance.now()-start);return 'queue_full';}
        insert.run(id(i),payload(i));db.exec('COMMIT');
        accepted++;elapsed.push(performance.now()-start);return 'staged';
      }catch(e){db.exec('ROLLBACK');throw e;}
    }
    for(let i=0;i<n;i++)admit(i);
    db.exec('BEGIN IMMEDIATE');
    for(let i=0;i<retained;i++)transition.run(id(i));
    db.exec('COMMIT');
    for(let i=n;i<n+burst;i++)admit(i);
    db.exec('BEGIN IMMEDIATE');transition.run(id(retained));db.exec('ROLLBACK');
    return {accepted,dropped,duplicate_after_archival:admit(0),
      history_findable:existsRow.get(id(0))?.status==='archive',
      actionable_files:pending.get().n,
      archive_files:db.prepare("SELECT count(*) AS n FROM evidence WHERE status='archive'").get().n,
      rollback_preserves_active:existsRow.get(id(retained))?.status==='active',
      admission:summary(elapsed)};
  }finally{db.close();}
}
async function size(dir){
  let total=0;
  for(const x of await fs.readdir(dir,{withFileTypes:true})){
    const p=path.join(dir,x.name);
    if(x.isDirectory())total+=await size(p);
    else if(x.isFile())total+=(await fs.stat(p)).size;
  }
  return total;
}
async function main(){
  const n=option('records',4000,501,12000);
  const burst=option('burst',1000,1,5000);
  const percent=option('archive-percent',75,1,95);
  const retained=Math.floor(n*percent/100);
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'issue99-synthetic-'));
  try{
    const result={schema:'issue99-comparator-v1',records:n,burst,archive_percent:percent,
      synthetic_only:true,comparators:{}};
    for(const [key,method] of [
      ['retained_json',root=>files(root,n,burst,retained,false)],
      ['archive_json',root=>files(root,n,burst,retained,true)],
      ['sqlite_transactional',root=>sqlite(root,n,burst,retained)]]) {
      const root=path.join(tmp,key),start=performance.now();
      try{result.comparators[key]=await method(root);}
      catch(e){result.comparators[key]={blocked:e.code||e.message};}
      result.comparators[key].elapsed_ms=+(performance.now()-start).toFixed(2);
      result.comparators[key].bytes=await size(root).catch(()=>null);
    }
    result.limitations=[
      'Synthetic single-process screening: no actual review/episode/index migration or EX service',
      'Archive prototype does not fsync directory renames; file and SQLite crash semantics differ',
      'No concurrent producer, kill -9, power-loss or completed factual-source provenance proof',
      'Node built-in SQLite availability and speed are host/runtime dependent'
    ];
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
  }finally{await fs.rm(tmp,{recursive:true,force:false});}
}
main().catch(e=>{console.error(JSON.stringify({status:'BLOCKED',code:e.code||e.message}));process.exitCode=2;});
