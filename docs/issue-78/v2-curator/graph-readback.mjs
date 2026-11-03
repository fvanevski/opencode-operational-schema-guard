#!/usr/bin/env node
/** Read-only bounded episode/entity/edge probe for host qualification. */
import path from 'node:path';
import {ReviewStore} from './core.mjs';
import {inspectEpisodeGraph} from './graph-evidence.mjs';
const args=process.argv.slice(2);
function get(k){const i=args.indexOf('--'+k);return i<0?'':args[i+1]||'';}
const group=get('group'),root=get('state-dir'),id=get('cluster'),
  endpoint=get('endpoint');
if(!group||!id||!path.isAbsolute(root)||!endpoint)throw Error(
 'Usage: node graph-readback.mjs --group GROUP --cluster HEX --state-dir ABS --endpoint http://127.0.0.1:PORT/mcp');
const record=await inspectEpisodeGraph({store:new ReviewStore(root,group),root,group,
  clusterId:id,endpoint});
console.log(JSON.stringify(record,null,2));
if(record.status!=='verified_readback')process.exitCode=2;
