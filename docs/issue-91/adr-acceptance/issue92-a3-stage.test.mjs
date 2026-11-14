import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync,statSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const sha=s=>createHash('sha256').update(s).digest('hex');
const script=fileURLToPath(new URL('./issue92-a3-stage.mjs',import.meta.url));
function withFixture(group,callback){
 const temp=mkdtempSync(path.join(os.tmpdir(),'issue92-prospective-stage-'));
 try{
  const native=[],cases=[];
  for(let i=0;i<20;i++){
   const session='session'+i,message='message'+i,id='case'+i;
   const text='Developer observed a specific versioned interface contract in the technical component for sample '+i+'.';
   const locator='opencode:'+session+':message:'+message;
   const valuable=i<10;
   const predicate=valuable?'interface_contract_'+i:'control_chatter_'+i;
   native.push({id,session_id:session,message_id:message,
    source_locator:locator,project:'repo92',workspace:'/workspace/repo92',
    native_event:text,observed_at:'2026-11-12T12:00:00Z',
    label:{valuable,predicate}});
   cases.push({id,native_event_text_sha256:sha(text),
    source_locator_sha256:sha(locator),
    observed_at:'2026-11-12T12:00:00Z',
    label:{valuable,prospective:true,predicate}});
  }
  const manifestBytes=JSON.stringify({case_count:20,cases:native})+'\n';
  const roster={schema_version:1,group,case_count:20,valuable:10,
   nonvaluable_controls:10,private_manifest_sha256:sha(manifestBytes),
   label_freeze_sha256:sha('separate pre-inference labels'),cases};
  const manifest=path.join(temp,'private-manifest.json');
  const rosterFile=path.join(temp,'roster.json');
  const root=path.join(temp,'state');
  writeFileSync(manifest,manifestBytes,{mode:0o600});
  writeFileSync(rosterFile,JSON.stringify(roster)+'\n',{mode:0o600});
  const run=()=>spawnSync(process.execPath,[script,rosterFile,manifest,root],
   {encoding:'utf8',timeout:20000});
  callback({run,root,roster,manifest});
 }finally{rmSync(temp,{recursive:true,force:true});}
}
test('frozen v4 sources stage into v4, never previously populated v2 identity',()=>{
 withFixture('graphiti-adr92-a3-prospective-v4',({run,root,roster})=>{
  const result=run();
  assert.equal(result.status,0,result.stderr);
  const summary=JSON.parse(result.stdout);
  assert.equal(summary.group,roster.group);
  assert.equal(summary.case_count,20);
  assert.equal(summary.events_staged,20);
  const receipt=path.join(root,'a3-v2-staged.json');
  const saved=JSON.parse(readFileSync(receipt,'utf8'));
  assert.equal(saved.group,roster.group);
  assert.equal(saved.events.length,20);
  assert.equal(saved.manifest_sha256,roster.private_manifest_sha256);
  assert.equal(saved.label_freeze_sha256,roster.label_freeze_sha256);
  assert.equal(statSync(receipt).mode&0o077,0);
  assert.equal(existsSync(path.join(root,
   'candidate-events-v1','graphiti-adr92-a3-prospective-v2')),false);
  const second=run();
  assert.notEqual(second.status,0);
  assert.match(second.stderr,/frozen_stage_already_exists/);
 });
});
test('historical v2 label remains a valid fresh, isolated group',()=>{
 withFixture('graphiti-adr92-a3-prospective-v2',({run})=>{
  const result=run();
  assert.equal(result.status,0,result.stderr);
 });
});
test('arbitrary groups and path traversal cannot be staged',()=>{
 for(const group of ['arbitrary-project','graphiti-adr92-a3-prospective-../../v4']){
  withFixture(group,({run,root})=>{
   const result=run();
   assert.notEqual(result.status,0,group);
   assert.equal(existsSync(path.join(root,'a3-v2-staged.json')),false);
  });
 }
});
