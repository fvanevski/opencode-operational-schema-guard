import test from "node:test"
import assert from "node:assert/strict"
import { createGraphitiRecall, graphIntentQuery, formatGraphitiFacts } from "../graphiti-recall.mjs"

const gitSource = "git:" + "a".repeat(40) + ":memory-facts/decision.json"
const item = {group_id:"grp",fact:"System A replaced Redis with NATS.",
              source_ref:gitSource,validation_status:"not_required",exclusive:false}

test("skips ordinary broad per-turn text", () => {
  assert.equal(graphIntentQuery("hello"),null)
  assert.equal(graphIntentQuery("what is the current state of System A?"),"what is the current state of System A?")
  assert.equal(graphIntentQuery("Authorization: Bearer secret"),null)
})

test("no policy, no request, no recall", async () => {
  let calls=0
  const recall = createGraphitiRecall({workspaceID:"/work",url:"http://127.0.0.1:9091",token:"local",
    policyLoader:()=>null,fetcher:async()=>{calls++}})
  assert.equal(await recall("what changed in system A?"),"")
  assert.equal(calls,0)
})

test("workspace group isolation and bounded verified-source formatting", async () => {
  let request
  const recall=createGraphitiRecall({workspaceID:"/work",url:"http://127.0.0.1:9091",token:"local",
    policyLoader:()=>({enabled:true,groups_by_workspace:{"/work":"grp"},max_items:3,max_chars:600}),
    fetcher:async (url,opts)=>{
      request=JSON.parse(opts.body)
      return {status:200,json:async()=>({group_id:"grp",facts:[item,
        {...item,group_id:"other",fact:"Wrong workspace"},
        {...item,source_ref:"untrusted:unknown",fact:"No citation"}]})}
    }
  })
  const value=await recall("What changed in System A?")
  assert.equal(request.group_id,"grp")
  assert.ok(value.includes("System A replaced Redis"))
  assert.ok(!value.includes("Wrong workspace"))
  assert.ok(!value.includes("No citation"))
})

test("exclusive conflicted state never asserted as verified", () => {
  const t=formatGraphitiFacts([{...item,exclusive:true,validation_status:"INCONSISTENT"}],{groupID:"grp"})
  assert.match(t,/CURRENT STATE UNVERIFIED/)
  assert.equal(formatGraphitiFacts([{...item,exclusive:true,validation_status:"unknown"}],{groupID:"grp"}),"")
})

test("deduplicates prior OpenViking context, bounds entries and filters tokens", () => {
  assert.equal(formatGraphitiFacts([item],{groupID:"grp",existing:[item.fact]}),"")
  const text=formatGraphitiFacts([item,{...item,fact:"password=secret"}],{groupID:"grp",maxItems:1})
  assert.ok(!text.includes("password=secret"))
  assert.equal(text.split("\n").length,2)
})
