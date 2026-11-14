// Host-local A3 EX-kernel driver (bound to authenticated source head 0a009e8).
// Runs the S6 source-exact-complement treatment on the fresh A3 group with the
// 20-case v2 cohort (43 native spans). Usage: node a3-host-driver.mjs <state-root> <group>
// Only runs under an admitted EX lease (GHDEV_MEMORY_POST_EXIT_LEASE=admitted).
import path from 'node:path';
import {writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const [root, group] = process.argv.slice(2);
if(!root || !group) throw new Error('usage: a3-host-driver.mjs <state-root> <group>');
if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted') throw new Error('DRIVER_REQUIRES_ADMITTED_LEASE');
const REPO='/workspace/opencode-operational-schema-guard';
const PROV='/tmp/opencode/issue92-a3/a3-host-provenance.json';
const prov=JSON.parse(await readFile(PROV,'utf8'));
const head=prov.source_head, blobs=prov.source_blobs_at_head;
const required=['finite-batch.mjs','claim-evidence.mjs','fact-review.mjs','curator-cli.mjs','ex-admission-proof.mjs','queue.mjs','events.mjs'];
for(const n of required) if(!blobs[n]) throw new Error('A3_HOST_SOURCE_BINDING_INCOMPLETE: '+n);
const git=(a)=>execFileSync('git',['-C',REPO,...a],{encoding:'utf8'}).trim();
if(git(['rev-parse','HEAD'])!==head) throw new Error('A3_HOST_SOURCE_BINDING_STALE_HEAD');
const relmap={
 'finite-batch.mjs':'docs/issue-78/v2-curator/finite-batch.mjs','claim-evidence.mjs':'docs/issue-78/v2-curator/claim-evidence.mjs',
 'fact-review.mjs':'docs/issue-78/v2-curator/fact-review.mjs','curator-cli.mjs':'docs/issue-78/v2-curator/curator-cli.mjs',
 'ex-admission-proof.mjs':'docs/issue-78/v2-curator/ex-admission-proof.mjs',
 'queue.mjs':'docs/issue-78/v2-candidate/queue.mjs','events.mjs':'docs/issue-78/v2-candidate/events.mjs'};
for(const name of required){
  const committed=git(['rev-parse','HEAD:'+relmap[name]]), ondisk=git(['hash-object',relmap[name]]);
  if(committed!==blobs[name]||ondisk!==committed) throw new Error('A3_HOST_SOURCE_BINDING_DRIFT: '+name);
}
const mod=await import(REPO+'/docs/issue-78/v2-curator/finite-batch.mjs');
const {runAdmittedFiniteBatch}=mod;
const t0=Date.now();
const result=await runAdmittedFiniteBatch({
  root, group, graphitiEndpoint:'http://127.0.0.1:8766/mcp',
  modelEndpoint:'http://127.0.0.1:8002/v1/chat/completions', modelId:'chat-fast',
  modelOptions:{}, maxClusters:24, maxCandidates:72, maxSeconds:3600, noveltyPolicy:'recall',
  replayOnly:false, sourceRecovery:true, resilientDiscovery:true, claimEvidence:true, sourceExactComplement:true});
result.driver='a3-host-prospective'; result.driver_elapsed_ms=Date.now()-t0;
result.source_binding={repo_head:head,blobs};
const out=JSON.stringify(result,null,1);
process.stdout.write(out+'\n');
await writeFile(path.join(root,'a3-host-result.json'),out+'\n',{mode:0o600});
process.exit(result.status==='unresolved'?3:0);
