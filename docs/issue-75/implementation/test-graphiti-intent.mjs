import test from "node:test"
import assert from "node:assert/strict"
import {graphIntentQuery} from "./graphiti-intent.mjs"
test("implicit and historical questions do not require fixed keywords",()=>{
  for(const q of ["Why does the scheduler matter for Graphiti?",
                  "How would FalkorDB affect OpenCode?",
                  "What was Redis replaced with?",
                  "Does NATS use the same queue?"])
    assert.equal(graphIntentQuery(q),q)
})
test("ordinary relationship concepts are eligible",()=>{
  assert.equal(graphIntentQuery("Graphiti FalkorDB dependencies"),"Graphiti FalkorDB dependencies")
})
test("low-information and sensitive text rejected",()=>{
  assert.equal(graphIntentQuery("hello"),null)
  assert.equal(graphIntentQuery("what are you doing"),null)
  assert.equal(graphIntentQuery("password=secret, what changed?"),null)
})
