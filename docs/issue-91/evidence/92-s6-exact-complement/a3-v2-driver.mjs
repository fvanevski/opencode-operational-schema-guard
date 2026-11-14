// A3 v2 prospective EX-kernel driver (PREPARED - runs only under admitted EX
// lease + A3_CENTRAL_APPROVED). Runs the S6 source-exact-complement treatment on
// the fresh A3 group with the 20-case v2 cohort. Usage: node a3-v2-driver.mjs <state-root> <group>
import path from 'node:path';
import {writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const [root, group] = process.argv.slice(2);
if(!root || !group) throw new Error('usage: a3-v2-driver.mjs <state-root> <group>');
if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted') throw new Error('DRIVER_REQUIRES_ADMITTED_LEASE');
const REPO='/workspace/opencode-operational-schema-guard';
const PROV='/tmp/opencode/issue92-s6/s6-execution-provenance.json';
const prov=JSON.parse(await readFile(PROV,'utf8'));
const head=prov.source_head, blobs=prov.source_blobs_at_head||{};
const required=['finite-batch.mjs','claim-evidence.mjs','fact-review.mjs','curator-cli.mjs','ex-admission-proof.mjs'];
for(const n of required) if(!blobs[n]) throw new Error('A3_SOURCE_BINDING_INCOMPLETE: '+n);
const git=(a)=>execFileSync('git',['-C',REPO,...a],{encoding:'utf8'}).trim();
if(git(['rev-parse','HEAD'])!==head) throw new Error('A3_SOURCE_BINDING_STALE_HEAD');
const rel=(n)=>'docs/issue-78/v2-curator/'+n;
for(const name of required){
  const committed=git(['rev-parse','HEAD:'+rel(name)]), ondisk=git(['hash-object',rel(name)]);
  if(committed!==blobs[name]||ondisk!==committed) throw new Error('A3_SOURCE_BINDING_DRIFT: '+name);
}
const mod=await import(REPO+'/docs/issue-78/v2-curator/finite-batch.mjs');
const {runAdmittedFiniteBatch}=mod;
const t0=Date.now();
const result=await runAdmittedFiniteBatch({
  root, group, graphitiEndpoint:'http://127.0.0.1:8766/mcp',
  modelEndpoint:'http://127.0.0.1:8002/v1/chat/completions', modelId:'chat-fast',
  modelOptions:{}, maxClusters:24, maxCandidates:72, maxSeconds:3600, noveltyPolicy:'recall',
  replayOnly:false, sourceRecovery:true, resilientDiscovery:true, claimEvidence:true, sourceExactComplement:true});
result.driver='a3-v2-prospective'; result.driver_elapsed_ms=Date.now()-t0;
result.source_binding={repo_head:head,blobs};
const out=JSON.stringify(result,null,1);
process.stdout.write(out+'\n');
await writeFile(path.join(root,'a3-v2-result.json'),out+'\n',{mode:0o600});
process.exit(result.status==='unresolved'?3:0);
