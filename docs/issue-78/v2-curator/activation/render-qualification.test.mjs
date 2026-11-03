import test from 'node:test';
import assert from 'node:assert/strict';
import {renderUnits} from './render-qualification.mjs';
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
