#!/usr/bin/env node
/**
 * GHDEV #101 C6.3: schema/consistency gate for host-observed model tool inventory.
 * This cannot independently prove model exposure or server implementation.
 * Hosts must supply primary endpoint/tools-list + runtime source evidence.
 * An MCP's local/remote transport never proves confinement.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const CAP = new Set(['shell','code','filesystem_read','filesystem_write','arbitrary_fetch',
  'bounded_api','metadata','reasoning']);
const GATE = new Set(['kernel_sandbox','v2_tool_guard','server_enforced_allowlist','verified_bounded_api',
  'no_execution_surface','disabled','none','unverified']);
const HOST = new Set(['protected_host','different_host','unknown']);
const PLANE = new Set(['builtin','mcp','subagent','plugin']);
const STATUS = new Set(['active','disabled','failed','uninitialized']);
const refs = x=>Array.isArray(x)&&x.length>0&&x.every(v=>typeof v==='string'&&
  v.length>0&&v.length<240&&/^[a-zA-Z0-9._/:#-]+$/.test(v)&&!v.includes('..'));
const hex=(x,n)=>typeof x==='string'&&new RegExp(`^[0-9a-f]{${n}}$`).test(x);

export function evaluateInventory(report) {
  const problems=[];
  const fail=(where,why)=>problems.push(`${where}: ${why}`);
  if(!report||typeof report!=='object'||Array.isArray(report)) return {result:'FAIL',problems:['receipt: object required']};
  if(report.schema!=='ghdev101-c63-tool-inventory-v1') fail('schema','unexpected');
  if(!hex(report.config_sha256,64))fail('config_sha256','expected 64 hex');
  if(typeof report.service_epoch!=='string'||report.service_epoch.length<6)fail('service_epoch','missing');
  if(report.catalog_complete!==true)fail('catalog_complete','cannot assert complete inventory');
  if(!refs(report.primary_catalog_refs))fail('primary_catalog_refs','missing primary runtime catalog proof');
  if(!Array.isArray(report.tools)||!report.tools.length)fail('tools','nonempty array required');
  const known=new Set(), checked=[];
  for(const [idx,t] of (Array.isArray(report.tools)?report.tools:[]).entries()) {
    const at=`tools[${idx}]`;
    if(!t||typeof t!=='object'||Array.isArray(t)){fail(at,'invalid');continue;}
    if(typeof t.id!=='string'||!t.id||t.id.length>160){fail(at,'tool id missing');continue;}
    if(known.has(t.id))fail(at,'duplicate tool id');known.add(t.id);
    if(!PLANE.has(t.plane))fail(at,'unknown exposure plane');
    if(!STATUS.has(t.runtime_status))fail(at,'unknown runtime status');
    if(typeof t.model_exposed!=='boolean')fail(at,'model_exposed not established');
    if(!HOST.has(t.execution_host))fail(at,'execution host unknown category');
    if(!CAP.has(t.capability))fail(at,'capability not classified');
    if(!GATE.has(t.boundary))fail(at,'boundary unknown category');
    if(!refs(t.catalog_evidence_refs))fail(at,'missing actual model-visible tool proof');
    const live=t.runtime_status==='active' && t.model_exposed===true;
    if(!live){
      if(t.runtime_status==='active' && t.boundary==='disabled')fail(at,'active tool cannot be disabled');
      checked.push({id:t.id,active_exposed:false,decision:'out_of_scope_non_exposed'});
      continue;
    }
    if(t.execution_host==='unknown') fail(at,'host execution authority unresolved');
    if(!refs(t.implementation_evidence_refs))fail(at,'missing implementation/capability evidence');
    let decision='review';
    const highRisk=['shell','code','filesystem_read','filesystem_write'].includes(t.capability);
    if(highRisk){
      const v2File = t.plane==='builtin' && ['filesystem_read','filesystem_write'].includes(t.capability) && t.boundary==='v2_tool_guard' && t.in_process_enforced===true;
      const kernel = t.boundary==='kernel_sandbox' && t.isolation_enforced===true;
      if(!v2File && !kernel)
        fail(at,'host-capable command/filesystem tool lacks the applicable verified guard');
      if(t.plane==='mcp' && t.boundary==='v2_tool_guard')
        fail(at,'OpenCode V2 file guard is not automatically applied to MCP tools');
      if(t.plane==='mcp' && t.runtime_status==='active' && t.boundary==='kernel_sandbox' && !refs(t.isolation_evidence_refs))
        fail(at,'MCP executes outside OpenCode shell by default; prove independently sandboxed process');
      decision='sandbox_required';
    }else if(t.capability==='arbitrary_fetch'){
      if(t.execution_host==='protected_host' && t.boundary!=='server_enforced_allowlist' && t.boundary!=='verified_bounded_api')
        fail(at,'on-host fetch requires source-proven URL/protocol/SSRF constraints');
      if(t.boundary==='verified_bounded_api' && t.arbitrary_local_url_access!==false)
        fail(at,'bounded fetch must disallow loopback/file/private address fetches or demonstrate equivalent isolation');
      decision='fetch_constraints_required';
    }else if(t.capability==='bounded_api'||t.capability==='metadata'||t.capability==='reasoning'){
      if(!['verified_bounded_api','no_execution_surface'].includes(t.boundary))
        fail(at,'claimed bounded API requires source+schema backed constraints');
      decision='bounded_api_required';
    }
    checked.push({id:t.id,active_exposed:true,decision});
  }
  // Important distinction: passing here means claims and sources are supplied,
  // not that the pointed-to primary evidence actually demonstrates a boundary.
  return {result:problems.length?'FAIL':'REVIEW_READY',problems,
    active_exposed:checked.filter(x=>x.active_exposed).length,checked,
    limitation:'requires Central source/schema review; no automatic proof of host isolation'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.argv.length!==3)throw Error('usage: node mcp-capability-gate.mjs <sanitized-inventory.json>');
    const result=evaluateInventory(JSON.parse(readFileSync(process.argv[2],'utf8')));
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if(result.result!=='REVIEW_READY')process.exitCode=1;
  }catch(e){process.stderr.write('inventory refused: '+String(e.message)+'\n');process.exitCode=2;}
}
