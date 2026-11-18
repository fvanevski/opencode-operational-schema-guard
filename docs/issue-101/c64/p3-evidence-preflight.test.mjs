import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {evaluate,sha256} from './p3-evidence-preflight.mjs';
const PROJECT='/workspace/opencode-operational-schema-guard', EPOCH='pid-3246083:invocation-abc';
const SRC='a'.repeat(40);
const servers=['caveman','context7','firecrawl','graphiti','openviking'];
const toolNames={
  caveman:['caveman_stats'],context7:['query-docs'],firecrawl:['firecrawl_scrape'],
  graphiti:['clear_graph'],openviking:['invoke_mcp_tool']
};
function fixture() {
  const root=mkdtempSync(join(tmpdir(),'ghdev101-c64-'));
  const base={origin:'host-observation',service_epoch:EPOCH,project_location:PROJECT};
  const refs={};
  const put=(key,name,obj)=>{const bytes=Buffer.from(JSON.stringify({...base,...obj}));const path=name+'.json';writeFileSync(join(root,path),bytes);const ref={path,sha256:sha256(bytes)};refs[key]=ref;return ref;};
  const tools=servers.flatMap(server=>toolNames[server].map(tool=>({name:`${server}_${tool}`.replace(/[^A-Za-z0-9_-]/g,'_'),origin:'mcp',server,tool,access_mode:'direct'})));
  const evidence={
    mcp_state:put('state','state',{servers:servers.map(name=>({name,status:'connected'})).concat([{name:'probe',status:'disabled'}])}),
    model_registry:put('model','model',{tools})
  };
  const catalogs={},decisions={};
  for(const server of servers){
    catalogs[server]=put('cat-'+server,'cat-'+server,{server,tools:toolNames[server].map(name=>({name,inputSchema:{type:'object',properties:{}}}))});
    for(const name of toolNames[server]){
      const id=server+'.'+name;
      const decision={model_exposed:true,disposition:'bounded'};
      if (['firecrawl','graphiti','openviking'].includes(server)) {
        decision.primary_proof=put('risk-'+id,'risk-'+id,{proof_type:'source_readback',implementation_sha:SRC,actual_constraint:'source-authenticated bounded API',source_location:'installed/server/module.py:fn'});
      }
      decisions[id]=decision;
    }
  }
  const special_controls={};
  special_controls.openviking_upstream_gateway={covers:['openviking.invoke_mcp_tool'],outcome:'no_registered_upstreams',primary_proof:put('ov','ov',{proof_type:'registry_empty',user_count:0,account_count:0,mounts_checked:true,unsafe_mounted_tools_count:0})};
  special_controls.firecrawl_network_fetch={covers:['firecrawl.firecrawl_scrape'],outcome:'verified_bounded',primary_proof:put('fc','fc',{proof_type:'source_readback',private_ip_and_loopback_blocked:true,redirect_targets_revalidated:true,scheme_restricted:true,browser_actions_constrained:true})};
  special_controls.graphiti_destructive_mutations={covers:['graphiti.clear_graph'],outcome:'denied_effective',primary_proof:put('gr','gr',{proof_type:'policy_denial',denial_confirmed:true})};
  const packet={schema:'ghdev101-c64-p3-v1',service_epoch:EPOCH,project_location:PROJECT,
    config_sha256:'b'.repeat(64),evidence,catalogs,decisions,special_controls};
  return {root,packet,put,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
function check(modify){const f=fixture();try{modify(f);return evaluate(f.root,f.packet);}finally{f.cleanup();}}
test('all direct, nonempty per-server catalogs with source+policy proofs are REVIEW_READY only',()=>assert.equal(check(()=>{}).result,'REVIEW_READY'));
test('empty tools/list, even if named in inventory, fails',()=>{
  const out=check(f=>{f.packet.catalogs.firecrawl=f.put('empty','empty',{server:'firecrawl',tools:[]});});assert.match(out.problems.join('\n'),/empty tools\/list/);
});
test('missing referenced OpenViking catalog fails',()=>{
  const out=check(f=>{f.packet.catalogs.openviking={path:'missing.json',sha256:'f'.repeat(64)};});assert.equal(out.result,'FAIL');
});
test('HOME-scoped /api/mcp record cannot prove repository',()=>{
  const out=check(f=>{f.packet.evidence.mcp_state=f.put('home','home',{project_location:'/home/filip',servers:servers.map(name=>({name,status:'connected'}))});});assert.match(out.problems.join('\n'),/epoch\/location mismatch/);
});
test('changed digest is rejected',()=>{
  const out=check(f=>{f.packet.evidence.model_registry.sha256='0'.repeat(64);});assert.match(out.problems.join('\n'),/SHA256 mismatch/);
});
test('missing tool declaration is rejected',()=>{
  const out=check(f=>{delete f.packet.decisions['graphiti.clear_graph'];});assert.match(out.problems.join('\n'),/missing classification/);
});
test('discovered executable MCP cannot disappear from model registry claims',()=>{
  const out=check(f=>{f.packet.decisions['graphiti.clear_graph'].model_exposed=false;});assert.match(out.problems.join('\n'),/reported non-exposed but present/);
});
test('disabled probe but actually connected fails',()=>{
  const out=check(f=>{f.packet.evidence.mcp_state=f.put('activeprobe','activeprobe',{servers:servers.map(name=>({name,status:'connected'})).concat([{name:'probe',status:'connected'}])});});assert.match(out.problems.join('\n'),/probe exposed/);
});
test('mcp cannot claim a bounded dangerous tool without readback',()=>{
  const out=check(f=>{f.packet.decisions['openviking.invoke_mcp_tool'].primary_proof=f.put('fake','fake',{proof_type:'policy_denial',implementation_sha:SRC,actual_constraint:'none'});});assert.match(out.problems.join('\n'),/bounded operation needs actual implementation proof/);
});
test('indirect MCP gateway cannot be claimed empty with account scope unobserved',()=>{
  const out=check(f=>{f.packet.special_controls.openviking_upstream_gateway.primary_proof=f.put('ovpartial','ovpartial',{proof_type:'registry_empty',user_count:0});});assert.match(out.problems.join('\n'),/both scopes/);
});
test('URL syntax alone fails SSRF+redirect gate',()=>{
  const out=check(f=>{f.packet.special_controls.firecrawl_network_fetch.primary_proof=f.put('fcweak','fcweak',{proof_type:'source_readback',scheme_restricted:true,private_ip_and_loopback_blocked:false,redirect_targets_revalidated:false,browser_actions_constrained:false});});assert.match(out.problems.join('\n'),/SSRF and browser actions incomplete/);
});
test('Graphiti deletion control cannot be claimed denied without actual deny receipt',()=>{
  const out=check(f=>{f.packet.special_controls.graphiti_destructive_mutations.primary_proof=f.put('grweak','grweak',{proof_type:'policy_denial',denial_confirmed:false});});assert.match(out.problems.join('\n'),/unproven effective model denial/);
});
test('symlink evidence is rejected',()=>{
 const out=check(f=>{symlinkSync(join(f.root,'state.json'),join(f.root,'alias.json'));f.packet.evidence.mcp_state={path:'alias.json',sha256:f.packet.evidence.mcp_state.sha256};});assert.match(out.problems.join('\n'),/symlink evidence forbidden/);
});
test('path traversal and absent SHA are rejected',()=>{
 const out=check(f=>{f.packet.evidence.mcp_state={path:'../secret.json',sha256:'f'.repeat(64)};});assert.match(out.problems.join('\n'),/missing path or full SHA256/);
});
test('the prior C6.3 empty-catalog layout cannot be promoted by supplying reference strings',()=>{
 const out=check(f=>{for(const name of ['firecrawl','context7','graphiti']) f.packet.catalogs[name]=f.put('bad-'+name,'bad-'+name,{server:name,transport:'remote',tools:[]});});assert.equal(out.result,'FAIL');
});

test('indirect OpenViking unsafe mounted tools are not invisible',()=>{
 const out=check(f=>{f.packet.special_controls.openviking_upstream_gateway.primary_proof=f.put('ovmount','ovmount',{proof_type:'registry_empty',user_count:0,account_count:0,mounts_checked:true,unsafe_mounted_tools_count:1});});assert.match(out.problems.join('\n'),/unsafe mounts/);
});
test('a model tool registry claim lacking actual code-mode/direct reachability metadata fails',()=>{
 const out=check(f=>{f.packet.evidence.model_registry=f.put('modelweak','modelweak',{tools:servers.flatMap(server=>toolNames[server].map(tool=>({name:`${server}_${tool}`.replace(/[^A-Za-z0-9_-]/g,'_'),origin:'mcp',server,tool}))) });});assert.match(out.problems.join('\n'),/reported exposed but absent/);
});
test('a special control that omits a currently exposed destructive tool is rejected',()=>{
 const out=check(f=>{f.packet.special_controls.graphiti_destructive_mutations.covers=[];});assert.match(out.problems.join('\n'),/missing affected tool/);
});
test('source readback without installed path or symbol is not sufficient',()=>{
 const out=check(f=>{f.packet.decisions['graphiti.clear_graph'].primary_proof=f.put('missing-location','missing-location',{proof_type:'source_readback',implementation_sha:SRC,actual_constraint:'claims sandboxed'});});assert.match(out.problems.join('\n'),/source location absent/);
});
