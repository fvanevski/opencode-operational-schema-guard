import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { proposalFromCompletedRead, createReadSourceProducer } from "../read-source-producer.mjs"
import { createCaptureObserver } from "../candidate-capture.mjs"
const git = (repo,...args) => execFileSync("git",["-C",repo,...args],{encoding:"utf8"}).trim()
function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),"issue70-read-producer-"))
  t.after(()=>rmSync(root,{recursive:true,force:true}))
  git(root,"init","-q");git(root,"config","user.name","Fixture")
  git(root,"config","user.email","fixture@example.invalid")
  const dir=join(root,"docs","memory-records","ghdev")
  mkdirSync(dir,{recursive:true})
  const path=join(dir,"decision.json")
  const record={schema_version:1,workspace_id:root,group_id:"ghdev_gh_mcp",
    category:"verified_architecture_fact",episode_body:"The gate owns durable memory work.",
    reference_time:"2026-10-31T21:41:00Z"}
  writeFileSync(path,JSON.stringify(record)+"\n")
  git(root,"add",".");git(root,"commit","-qm","approved fact")
  const source={enabled:true,source_type:"git-record-v1",
    production_activation:true,repository:root,trusted_ref:git(root,"symbolic-ref","HEAD"),
    source_prefix:"docs/memory-records/ghdev",workspaces:[root],
    groups:["ghdev_gh_mcp"],categories:["verified_architecture_fact"]}
  const sourcePath=join(root,"source-policy.json");writeFileSync(sourcePath,JSON.stringify(source))
  const capture={enabled:true,revision:"r1",workspaces:[root],
    groups:["ghdev_gh_mcp"],categories:["verified_architecture_fact"],tools:["read"]}
  const event={tool:"read",status:"completed",sessionID:"s",messageID:"m",id:"t",
    input:{path},result:{metadata:{}}}
  return {root,path,record,capture,sourcePath,event}
}
test("successful stock-V2 local read nominates only matching Git source",async t=>{
  const f=fixture(t)
  const p=await proposalFromCompletedRead(f.event,{workspaceID:f.root,
    capturePolicy:f.capture,sourcePolicyPath:f.sourcePath})
  assert.equal(p.group_id,"ghdev_gh_mcp")
  assert.equal(p.fact_ref,"git:"+git(f.root,"rev-parse","HEAD")+
    ":docs/memory-records/ghdev/decision.json")
})
test("authenticated completed hook uses executed=false and delivers once",async t=>{
  const f=fixture(t),sent=[]
  const observer=createCaptureObserver({workspaceID:f.root,policyPath:"fixture",
    policyLoader:()=>f.capture,url:"http://127.0.0.1:1",token:"fixture-token",
    enqueue:async c=>{sent.push(c);return true}})
  const producer=createReadSourceProducer({workspaceID:f.root,
    capturePolicyPath:"fixture",sourcePolicyPath:f.sourcePath,
    observer,policyLoader:()=>f.capture})
  producer.before(f.event)
  producer.after({...f.event,executed:false})
  await producer.flush();await observer.flush()
  assert.equal(sent.length,1)
  assert.equal(sent[0].source.tool_event_id,"t")
  assert.equal(sent[0].source.message_id,"m")
})
test("failed, orphaned and mismatched hook calls fail closed",async t=>{
  const f=fixture(t),sent=[]
  const observer={fromCompletedHook:()=>sent.push(1)}
  const producer=createReadSourceProducer({workspaceID:f.root,
    capturePolicyPath:"fixture",sourcePolicyPath:f.sourcePath,
    observer,policyLoader:()=>f.capture})
  producer.after(f.event)
  producer.before(f.event);producer.after({...f.event,status:"error"})
  producer.before(f.event);producer.after({...f.event,messageID:"other"})
  await producer.flush()
  assert.equal(sent.length,0)
})
test("dirty source, partial reads, disabled policy and untrusted workspace fail closed",async t=>{
  const f=fixture(t)
  const args={workspaceID:f.root,capturePolicy:f.capture,sourcePolicyPath:f.sourcePath}
  assert.equal(await proposalFromCompletedRead({...f.event,input:{...f.event.input,limit:1}},args),null)
  assert.equal(await proposalFromCompletedRead(f.event,{...args,workspaceID:"/other"}),null)
  assert.equal(await proposalFromCompletedRead(f.event,{...args,capturePolicy:{...f.capture,enabled:false}}),null)
  writeFileSync(f.path,readFileSync(f.path,"utf8").replace("durable","transient"))
  assert.equal(await proposalFromCompletedRead(f.event,args),null)
})
test("native completed read requires a result and rejects explicit errors/truncation",async t=>{
  const f=fixture(t),args={workspaceID:f.root,capturePolicy:f.capture,sourcePolicyPath:f.sourcePath}
  assert.equal(await proposalFromCompletedRead({...f.event,result:null},args),null)
  assert.equal(await proposalFromCompletedRead({...f.event,result:{isError:true}},args),null)
  assert.equal(await proposalFromCompletedRead({...f.event,result:{metadata:{truncated:true}}},args),null)
  assert.equal(await proposalFromCompletedRead({...f.event,input:{filePath:f.path}},args),null)
  assert.ok(await proposalFromCompletedRead({...f.event,result:{metadata:{}}},args))
})
test("secret-bearing Git record never nominates",async t=>{
  const f=fixture(t),args={workspaceID:f.root,capturePolicy:f.capture,sourcePolicyPath:f.sourcePath}
  writeFileSync(f.path,JSON.stringify({...f.record,episode_body:"password=not allowed"}))
  git(f.root,"add",".");git(f.root,"commit","-qm","sensitive record")
  assert.equal(await proposalFromCompletedRead(f.event,args),null)
})

test("overlong or excessively multiline records cannot rely on unreported display completeness",async t=>{
  const f=fixture(t),args={workspaceID:f.root,capturePolicy:f.capture,sourcePolicyPath:f.sourcePath}
  writeFileSync(f.path,JSON.stringify({...f.record,episode_body:"safe ".repeat(1800)}))
  git(f.root,"add",".");git(f.root,"commit","-qm","oversized record")
  assert.equal(await proposalFromCompletedRead(f.event,args),null)
  writeFileSync(f.path,JSON.stringify({...f.record,episode_body:"safe\n".repeat(210)}))
  git(f.root,"add",".");git(f.root,"commit","-qm","multiline record")
  assert.equal(await proposalFromCompletedRead(f.event,args),null)
})

test("disposable gate source policy is accepted only without production activation",async t=>{
  const f=fixture(t)
  const record={...f.record,group_id:"issue70_read_producer"}
  writeFileSync(f.path,JSON.stringify(record))
  git(f.root,"add",".");git(f.root,"commit","-qm","disposable qualified record")
  const source=JSON.parse(readFileSync(f.sourcePath,"utf8"))
  source.groups=["issue70_read_producer"]
  source.production_activation=false
  writeFileSync(f.sourcePath,JSON.stringify(source))
  const capture={...f.capture,groups:["issue70_read_producer"]}
  const args={workspaceID:f.root,capturePolicy:capture,sourcePolicyPath:f.sourcePath}
  const approved=await proposalFromCompletedRead(f.event,args)
  assert.equal(approved?.group_id,"issue70_read_producer")
  source.production_activation=true
  writeFileSync(f.sourcePath,JSON.stringify(source))
  assert.equal(await proposalFromCompletedRead(f.event,args),null)
})
