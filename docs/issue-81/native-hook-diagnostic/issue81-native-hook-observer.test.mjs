import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync,
  rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const observerFile = new URL('./issue81-native-hook-observer.mjs', import.meta.url);
const fixture = callback => async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'gh81-observer-test-'));
  chmodSync(root, 0o700);
  const target = path.join(root, 'docs/issue-78/v2-candidate/plugin.mjs');
  const report = path.join(root, 'hook.jsonl');
  mkdirSync(path.dirname(target), {recursive:true});
  writeFileSync(target, [
    "export default {",
    " id: 'local.ghdev-graphiti-memory-candidate-v1',",
    " async setup(ctx) {",
    " await ctx.session.hook('prompt', () => {});",
    " await ctx.session.hook('context', async event => {",
    " await new Promise(resolve => setTimeout(resolve, 2));",
    " if (event.throwError) throw Error('known test failure');",
    " event.system.push({type:'text',text:'[GHDEV_GRAPHITI_CONTEXT]\\nTEST-SECRET\\n[/GHDEV_GRAPHITI_CONTEXT]'});",
    " });",
    " await ctx.session.hook('context', () => {});",
    " return () => {};",
    " }};",
  ].join('\n'));
  const saved = [process.env.GH81_TARGET_PLUGIN,process.env.GH81_TIMING_FILE];
  process.env.GH81_TARGET_PLUGIN=target;
  process.env.GH81_TIMING_FILE=report;
  try {await callback({report});}
  finally {
    if(saved[0]===undefined)delete process.env.GH81_TARGET_PLUGIN;
    else process.env.GH81_TARGET_PLUGIN=saved[0];
    if(saved[1]===undefined)delete process.env.GH81_TIMING_FILE;
    else process.env.GH81_TIMING_FILE=saved[1];
    rmSync(root,{recursive:true,force:true});
  }
};
test('measures delegated native callback without logging prompt or source text',fixture(async({report})=>{
  const observer=(await import(observerFile.href)).default,handlers=[];
  const cleanup=await observer.setup({session:{hook:async(kind,handler)=>{
    handlers.push({kind,handler});return {dispose(){}};
  }}});
  assert.equal(handlers.filter(x=>x.kind==='context').length,2);
  const ev={sessionID:'SECRET-SESSION-ID',system:[]};
  await handlers.find(x=>x.kind==='context').handler(ev);
  assert.equal(ev.system.length,1);
  await cleanup();
  const trace=readFileSync(report,'utf8');
  const rows=trace.trim().split('\n').map(JSON.parse);
  assert.equal(rows.find(x=>x.kind==='setup').registered_context_callbacks,2);
  const span=rows.find(x=>x.kind==='context');
  assert.equal(span.outcome,'returned');
  assert.ok(span.elapsed_ms>=1);
  assert.equal(span.graphiti_block_after,true);
  assert.ok(!trace.includes('TEST-SECRET')&&!trace.includes('SECRET-SESSION-ID'));
}));
test('propagates callback failures and refuses to overwrite existing trace',fixture(async({report})=>{
  const observer=(await import(observerFile.href)).default,handlers=[];
  const ctx={session:{hook:(kind,handler)=>{handlers.push({kind,handler});return {dispose(){}};}}};
  const cleanup=await observer.setup(ctx);
  await assert.rejects(handlers.find(x=>x.kind==='context').handler({system:[],throwError:true}),/known test failure/);
  await cleanup();
  assert.match(readFileSync(report,'utf8'),/"outcome":"threw"/);
  await assert.rejects(observer.setup(ctx),/EEXIST/);
  assert.ok(existsSync(report));
}));
