import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA,SOURCE,UPSTREAM,CONTROLS,evaluate} from './security-boundary-evaluator.mjs';

const good = () => ({
  schema:SCHEMA,source_sha:SOURCE,config_sha256:'a'.repeat(64),
  sandbox:{upstream_sha:UPSTREAM,backend:'bubblewrap',mode:'enforce',file_guard:'enforce',
    unsafe_fallback:false,ambient_host_env_visible:false,host_secret_dir_mounted:false,
    untrusted_policy_cannot_widen:true},
  location_scope:{server_mode:'shared_service',home_directory:'/home/filip',
    project_directory:'/workspace/opencode-operational-schema-guard',
    home_instance:'fail_closed',home_tools_denied:true,
    project_instance:'ready',project_tools_sandboxed:true,
    same_service_epoch:true,fresh_project_client_session:true,
    project_request_location_authenticated:true,original_home_xdg_preserved:true,
    no_direct_application_db_edits:true,
    home_evidence_ref:'evidence/home.json',project_evidence_ref:'evidence/project.json',
    native_evidence_ref:'evidence/native.json'},
  tool_inventory:{complete:true,uncontained_execution_tools:[]},
  production:{graphiti_registered_once:true,openviking_registered_once:true,
    legacy_uuids_preserved:true,ex_gate_preserved:true,normal_service_healthy:true,
    rollback_retained:true,diagnostics_removed:true},
  controls:Object.fromEntries(Object.entries(CONTROLS).map(([key,goal])=>[key,{
    tool:key.startsWith('shell_')?'shell':'read',
    outcome:goal==='allow'?'executed_safely':goal==='source_test_or_deny'?'source_test_verified':'denied_by_boundary',
    evidence_ref:'evidence/' + key + '.json',secret_value_observed:false
  }])),real_secret_values_in_artifact:false,campaign_failure_or_rollback_unresolved:false
});

test('complete, deny-backed receipt passes',()=>assert.equal(evaluate(good()).result,'PASS'));
for(const [name,mutate] of Object.entries({
  'home falsely ready':x=>x.location_scope.home_instance='ready',
  'home model tools exposed':x=>x.location_scope.home_tools_denied=false,
  'project sandbox not ready':x=>x.location_scope.project_instance='blocked',
  'missing project client':x=>x.location_scope.fresh_project_client_session=false,
  'separate service epochs':x=>x.location_scope.same_service_epoch=false,
  'missing authenticated location':x=>x.location_scope.project_request_location_authenticated=false,
  'relocated XDG':x=>x.location_scope.original_home_xdg_preserved=false,
  'application DB injection':x=>x.location_scope.no_direct_application_db_edits=false,
  'missing project evidence':x=>delete x.location_scope.project_evidence_ref,
  'not a real sandbox':x=>x.sandbox.backend='permissions_only',
  'permissive fallback':x=>x.sandbox.unsafe_fallback=true,
  'missing fallback status':x=>delete x.sandbox.unsafe_fallback,
  'unreviewed substitute':x=>x.sandbox.upstream_sha='first_party_verified_alternative',
  'unknown rollback status':x=>delete x.campaign_failure_or_rollback_unresolved,
  'canary printed':x=>{x.controls.shell_canary_file.outcome='model_refused';},
  'tool read succeeded':x=>{x.controls.file_tool_canary_file.outcome='executed_safely';},
  'secret surfaced':x=>{x.controls.shell_canary_file.secret_value_observed=true;},
  'uncontained MCP':x=>x.tool_inventory.uncontained_execution_tools.push('mcp_shell'),
  'missing alternate path':x=>delete x.controls.alternate_execution_surface,
  'not restored':x=>x.production.diagnostics_removed=false,
  'unverified denial':x=>x.controls.subagent_secret_path.outcome='not_tested',
  'unclear tool catalog':x=>{x.tool_inventory.complete=false;x.controls.subagent_secret_path.outcome='not_exposed_verified'},
  'ref not sanitized':x=>x.controls.shell_canary_file.evidence_ref='secret=CANARYKEY',
  'changed merged source':x=>x.source_sha='b'.repeat(40),
  'secrets in packet':x=>x.real_secret_values_in_artifact=true,
})) {
  test('fail closed: ' + name,()=>{const x=good();mutate(x);assert.equal(evaluate(x).result,'FAIL')});
}
