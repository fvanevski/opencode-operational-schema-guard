#!/usr/bin/env node
/** Operator read-only preflight for empty development-knowledge namespace. */
import path from 'node:path';
import {GraphitiMcp} from '../../issue-75/v2-candidate/memory-core.mjs';
import {inspectFreshProductionGroup,PRODUCTION_GROUP} from './production-cutover.mjs';
const args=process.argv.slice(2);
const get=k=>{const i=args.indexOf('--'+k);return i<0?'':args[i+1]||'';};
const group=get('group'),root=get('state-dir'),endpoint=get('endpoint');
if(group!==PRODUCTION_GROUP||!path.isAbsolute(root)||
 !/^http:\/\/(?:127\.0\.0\.1|localhost):\d{2,5}\/mcp\/?$/.test(endpoint)||
 args.length!==6||args.includes('--apply'))
 throw Error('CUTOVER_READ_ONLY_USAGE_INVALID');
console.log(JSON.stringify(await inspectFreshProductionGroup({
 root,group,graphiti:new GraphitiMcp(endpoint,{timeoutMs:12000})
}),null,2));
