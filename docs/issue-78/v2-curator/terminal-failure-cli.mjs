#!/usr/bin/env node
/** Fail-closed old-production-group terminal disposition. Never calls add_memory. */
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {ReviewStore} from './core.mjs';
import {GraphitiMcp} from '../../issue-75/v2-candidate/memory-core.mjs';
import {assessProductionTerminalFailure} from './terminal-failure-production.mjs';
const args=process.argv.slice(2);
const get=k=>{const i=args.indexOf('--'+k);return i<0?'':args[i+1]||'';};
const group=get('group'),root=get('state-dir'),endpoint=get('endpoint'),
  reviewId=get('review'),revision=Number(get('revision'));
const evidenceFile=get('evidence-file'),journalFile=get('journal-file');
const apply=args.includes('--apply');
if(group!=='ghdev_gh_mcp'||!path.isAbsolute(root)||!path.isAbsolute(evidenceFile)||
  !path.isAbsolute(journalFile)||!/^[a-f0-9]{64}$/.test(reviewId)||
  !Number.isInteger(revision)||revision<1||
  !/^http:\/\/(?:127\.0\.0\.1|localhost):\d{2,5}\/mcp\/?$/.test(endpoint)||
  (new Set(args.filter(x=>x.startsWith('--')))).size!==
    args.filter(x=>x.startsWith('--')).length)
  throw Error('TERMINAL_FAILURE_USAGE_INVALID');
const evidence=JSON.parse(await readFile(evidenceFile,'utf8'));
const journal=await readFile(journalFile,'utf8');
const result=await assessProductionTerminalFailure({
  store:new ReviewStore(root,group),graphiti:new GraphitiMcp(endpoint,{timeoutMs:12000}),
  root,group,reviewId,expectedRevision:revision,evidence,journal,apply,
  acknowledgeFifo:args.includes('--attest-anonymous-fifo'),
  acknowledgePartialEffects:args.includes('--ack-partial-effects'),
  expectedRemoteSha:get('expect-remote-sha')||null
});
console.log(JSON.stringify(result,null,2));
