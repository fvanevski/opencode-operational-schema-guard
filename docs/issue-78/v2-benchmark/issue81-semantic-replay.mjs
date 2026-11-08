/** Read-only, host-bound strict-vs-semantic Graphiti replay. Never drains or writes. */
import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { GraphitiMcp, Journal, Memory } from '../../issue-75/v2-candidate/memory-core.mjs';
import { sourcedEpisodeResolver } from '../v2-curator/sourced-recall.mjs';
import { curatedRecallRetriever } from '../v2-curator/curated-recall-candidates.mjs';

function args(argv) {
  const out = {};
  for (let i=0;i<argv.length;i+=2) {
    const key=argv[i];
    if (!/^--(?:endpoint|group|state-dir|workspace|project|query)$/.test(key) ||
        typeof argv[i+1]!=='string' || out[key]) throw Error('invalid or repeated option '+key);
    out[key]=argv[i+1];
  }
  for(const key of ['--endpoint','--group','--state-dir','--workspace','--project','--query'])
    if(!out[key])throw Error('missing '+key);
  return out;
}
const hash=s=>createHash('sha256').update(s).digest('hex');
async function main() {
  const o=args(process.argv.slice(2));
  const group=o['--group'],root=o['--state-dir'];
  const workspace=o['--workspace'],project=o['--project'],query=o['--query'];
  if(!path.isAbsolute(root)||!path.isAbsolute(workspace)||
     !/^[A-Za-z0-9_.-]{1,100}$/.test(group)||
     !/^[A-Za-z0-9_.-]{1,100}$/.test(project))
    throw Error('invalid source/group/workspace binding');
  // Journal.pages() calls mkdir(recursive); insist the existing directory is
  // present first so the diagnostic cannot provision a new production root.
  const j=await stat(path.join(root,group));
  if(!j.isDirectory())throw Error('existing group journal is not a directory');
  const indexDir=path.join(root,'curation-v1',group);
  if(!(await stat(indexDir)).isDirectory())throw Error('existing curated state missing');
  const output={kind:'shadow-replay-not-native-hook',
    group,workspace,project,query_sha256:hash(query),search_depth:24,
    context_wait_ms:'NOT_MEASURED',modes:{}};
  for(const mode of ['strict','semantic']){
    const graphiti=new GraphitiMcp(o['--endpoint']);
    const memory=new Memory({
      journal:new Journal(root,group),graphiti,group,recallPolicy:mode,
      extraSourceResolver:ids=>sourcedEpisodeResolver(root,group,workspace,project,ids),
      curatedCandidateRetriever:curatedRecallRetriever(root,group,workspace,project)
    });
    const start=performance.now();
    const facts=await memory.search(query);
    output.modes[mode]={elapsed_ms_shadow:Math.round((performance.now()-start)*1000)/1000,
      count:facts.length,
      source_fingerprints:facts.map(x=>({
        fact_sha256:hash(x.fact),source_sha256:hash(x.source),
        evidence_class:x.evidenceClass,temporal:x.temporal
      }))};
  }
  process.stdout.write(JSON.stringify(output,null,2)+'\n');
}
main().catch(err=>{
  process.stderr.write('SHADOW_REPLAY_ERROR '+(err?.message||String(err))+'\n');
  process.exitCode=1;
});
