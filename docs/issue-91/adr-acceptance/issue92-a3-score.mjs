#!/usr/bin/env node
/** A3 post-run independent fact-level scoring.
 * This tool NEVER infers, changes source labels or calls Graphiti. It requires
 * COMPLETE ReviewStore, a positive remote receipt, independently ratified
 * frozen cases, and a per-persisted-fact original-source adjudication ledger.
 *
 * Usage: node issue92-a3-score.mjs ROSTER STAGED STATE_ROOT GROUP
 *         REMOTE_READBACK RATIFICATION FACT_ADJUDICATIONS AUTHORITY
 */
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {scoreProspective} from './issue92-a3-acceptance.mjs';
const args=process.argv.slice(2);
if(args.length!==8||args.some((x,i)=>i!==3&&!path.isAbsolute(x)))
 throw Error('A3_SCORE_REQUIRES_8_EXPLICIT_INPUTS');
const [rosterFile,stageFile,root,group,remoteFile,ratificationFile,
 adjudicationFile,authorityFile]=args;
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const [roster,stage,remote,ratification,adjudicationData,authority]=
 await Promise.all([rosterFile,stageFile,remoteFile,ratificationFile,
  adjudicationFile,authorityFile].map(json));
const dir=path.join(root,'curation-v1',group);
const names=(await readdir(dir)).filter(x=>/^[a-f0-9]{64}\.json$/.test(x)).sort();
const records=await Promise.all(names.map(n=>json(path.join(dir,n))));
const report=scoreProspective({roster,stage,records,remote,ratification,
 adjudications:Array.isArray(adjudicationData)?adjudicationData:
  adjudicationData?.facts,authority});
const target=path.join(root,'a3-v2-adjudicated-scorecard.json');
await mkdir(root,{recursive:true,mode:0o700});
await writeFile(target,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify(report,null,2));
process.exitCode=report.pass?0:3;
