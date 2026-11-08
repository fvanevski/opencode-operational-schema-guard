import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
const script = new URL('./issue81-native-hook-report.mjs', import.meta.url).pathname;
test('percentiles include no-injection and over-budget callbacks',()=>{
  const root=mkdtempSync(path.join(tmpdir(),'gh81-hook-summary-'));
  try {
    const file=path.join(root,'times.jsonl');
    const entries=[
      {kind:'setup',registered_context_callbacks:2},
      {kind:'context',seq:1,elapsed_ms:120,outcome:'returned',graphiti_block_after:true},
      {kind:'context',seq:2,elapsed_ms:280,outcome:'returned',graphiti_block_after:false},
      {kind:'context',seq:3,elapsed_ms:330,outcome:'returned',graphiti_block_after:true},
    ].map(x=>({schema:'gh81.native-graphiti-context-hook.v1',...x}));
    writeFileSync(file,entries.map(JSON.stringify).join('\n')+'\n');
    const out=spawnSync(process.execPath,[script,file,'3'],{encoding:'utf8'});
    assert.equal(out.status,0,out.stderr);
    const result=JSON.parse(out.stdout);
    assert.equal(result.n,3);
    assert.equal(result.injected_count,2);
    assert.equal(result.no_injection_count,1);
    assert.equal(result.all.over_300_ms,1);
    assert.equal(result.acceptance,'NOT_ESTABLISHED');
  }finally{rmSync(root,{recursive:true,force:true});}
});
