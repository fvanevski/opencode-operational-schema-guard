import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateInventory} from './mcp-capability-gate.mjs';
const valid=()=>({schema:'ghdev101-c63-tool-inventory-v1',config_sha256:'a'.repeat(64),service_epoch:'pid-12345',catalog_complete:true,
 primary_catalog_refs:['private/catalog-observation.json'], tools:[
 {id:'builtin.shell',plane:'builtin',runtime_status:'active',model_exposed:true,execution_host:'protected_host',capability:'shell',boundary:'kernel_sandbox',isolation_enforced:true,catalog_evidence_refs:['private/native-tool-list.json'],implementation_evidence_refs:['private/shell-guard.json']},
 {id:'mcp.graphiti.search_facts',plane:'mcp',runtime_status:'active',model_exposed:true,execution_host:'protected_host',capability:'bounded_api',boundary:'verified_bounded_api',catalog_evidence_refs:['private/mcp-graphiti-tools.json'],implementation_evidence_refs:['private/graphiti-source.json']},
 {id:'mcp.probe',plane:'mcp',runtime_status:'disabled',model_exposed:false,execution_host:'protected_host',capability:'shell',boundary:'disabled',catalog_evidence_refs:['private/mcp-live.json']}
 ]});
test('valid classified inventory is REVIEW_READY, never an independent PASS',()=>{
 const r=evaluateInventory(valid());assert.equal(r.result,'REVIEW_READY');assert.equal(r.active_exposed,2);
});
test('uncontained MCP exec is rejected',()=>{
 const v=valid();v.tools.push({id:'mcp.exec',plane:'mcp',runtime_status:'active',model_exposed:true,execution_host:'protected_host',capability:'shell',boundary:'none',catalog_evidence_refs:['a'],implementation_evidence_refs:['b']});
 assert.equal(evaluateInventory(v).result,'FAIL');
});
test('MCP bwrap assertion requires proof of separate process isolation',()=>{
 const v=valid();v.tools[0].plane='mcp';assert.equal(evaluateInventory(v).result,'FAIL');
 v.tools[0].isolation_evidence_refs=['private/mcp-bwrap.json'];assert.equal(evaluateInventory(v).result,'REVIEW_READY');
});
test('host arbitrary-fetch no SSRF constraints rejected',()=>{
 const v=valid();v.tools[1].capability='arbitrary_fetch';assert.equal(evaluateInventory(v).result,'FAIL');
 v.tools[1].arbitrary_local_url_access=false;assert.equal(evaluateInventory(v).result,'REVIEW_READY');
});
test('missing actual tool catalog is not pass',()=>{
 const v=valid();v.catalog_complete=false;assert.equal(evaluateInventory(v).result,'FAIL');
});
test('unknown host authority is not pass',()=>{
 const v=valid();v.tools[1].execution_host='unknown';assert.equal(evaluateInventory(v).result,'FAIL');
});
test('duplicate tools and missing implementation evidence rejected',()=>{
 const v=valid();v.tools.push({...v.tools[1]});delete v.tools[1].implementation_evidence_refs;
 assert.equal(evaluateInventory(v).result,'FAIL');
});

test('built-in V2 file guard is accepted only for built-in file tools',()=>{
 const v=valid();v.tools[0].capability='filesystem_read';v.tools[0].boundary='v2_tool_guard';v.tools[0].in_process_enforced=true;delete v.tools[0].isolation_enforced;
 assert.equal(evaluateInventory(v).result,'REVIEW_READY');
 v.tools[0].plane='mcp';assert.equal(evaluateInventory(v).result,'FAIL');
});
