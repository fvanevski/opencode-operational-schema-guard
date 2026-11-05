import test from 'node:test';
import assert from 'node:assert/strict';
import {renderUnits} from './render-qualification.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const service='ExecStart=@@CURATOR_CLI@@ --group @@GROUP@@ @@GRAPHITI_MCP_LOOPBACK@@\n';
const pathUnit='PathModified=@@CANDIDATE_GROUP_DIRECTORY@@\nPathModified=@@REVIEW_GROUP_DIRECTORY@@\nUnit=@@SERVICE_UNIT_NAME@@\n';
const keys=['CANDIDATE_GROUP_DIRECTORY','REVIEW_GROUP_DIRECTORY','SERVICE_UNIT_NAME',
 'PRIVATE_ENV_FILE','PYTHON_EXEC','POST_EXIT_GATE_WRAPPER',
 'INSTALLED_GATE_SOURCE','INSTALLED_GATE_CONFIG','CURATOR_CLI',
 'GROUP','PRIVATE_STATE_DIR','GRAPHITI_MCP_LOOPBACK'];
const v=Object.fromEntries(keys.map(k=>[k,'value-'+k]));
test('disposable path watcher covers both capture and portal-review transitions',()=>{
 const out=renderUnits({service,path:pathUnit},v);
 assert.match(out.pathUnit,/PathModified=value-CANDIDATE_GROUP_DIRECTORY/);
 assert.match(out.pathUnit,/PathModified=value-REVIEW_GROUP_DIRECTORY/);
 assert.match(out.pathUnit,/Unit=value-SERVICE_UNIT_NAME/);
 assert.match(out.service,/value-CURATOR_CLI/);
 assert.ok(!out.service.includes('@@'));
});
test('systemd rendering rejects unknown placeholders and injection of control lines',()=>{
 assert.throws(()=>renderUnits({service:'@@ARBITRARY@@',path:pathUnit},v),/Unknown/);
 assert.throws(()=>renderUnits({service,path:pathUnit},{...v,GROUP:'bad\nExecStart=anything'}),/invalid/);
});

test('renderer CLI admits paired named recovery group, keeps legacy, rejects mismatched or production groups',()=>{
 const program=fileURLToPath(new URL('./render-qualification.mjs',import.meta.url));
 const call=(group,unit)=>spawnSync(process.execPath,[program,
  '--worktree','/tmp/issue81-naming-unavailable-worktree',
  '--state-dir','/tmp/issue81-naming-unavailable-state',
  '--output-dir','/tmp/issue81-naming-unavailable-output',
  '--private-env-file','/tmp/issue81-naming-unavailable-env',
  '--gate-source','/tmp/issue81-naming-unavailable-gate',
  '--gate-config','/tmp/issue81-naming-unavailable-config',
  '--python','/usr/bin/python3',
  '--endpoint','http://127.0.0.1:8766/mcp',
  '--group',group,'--unit',unit],{encoding:'utf8'});
 for(const [group,unit] of [
  ['graphiti-curator-recovery-r01','ghdev-curator-recovery-r01'],
  ['cur80_qual01','ghdev-curator80-qual01']]){
  const r=call(group,unit);
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/ENOENT/,'accepted identity reaches deliberate missing-path check');
  assert.doesNotMatch(r.stderr,/Matching disposable recovery/);
 }
 for(const [group,unit] of [
  ['graphiti-curator-recovery-r01','ghdev-curator-recovery-r02'],
  ['graphiti-cron-holdout-r01','ghdev-cron-holdout-r01'],
  ['ghdev_gh_mcp','ghdev-curator80-qual01']]){
  const r=call(group,unit);
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/Matching disposable recovery group and unit required/);
 }
});
