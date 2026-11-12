// S6 source-exact-complement EX-kernel driver: run the finite-batch treatment
// with --source-exact-complement on (implies claim-evidence -> resilient-discovery
// -> source-recovery -> recall -> finite-batch) on the fresh disposable 24-cluster
// S6 group graphiti-adr92-s6-exact-complement.
// Runs ONLY under an admitted EX lease carried by an inherited kernel flock
// descriptor (passed by the Python launcher via subprocess pass_fds).
// Usage: node s6-driver.mjs <state-root> <group>
import path from 'node:path';
import {writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const [root, group] = process.argv.slice(2);
if(!root || !group)
 throw new Error('usage: s6-driver.mjs <state-root> <group>');
if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted')
 throw new Error('DRIVER_REQUIRES_ADMITTED_LEASE');
// Source-binding guard: the loaded modules must come from the authenticated S6
// kickoff commit (9cf811e), not an old checkout or a transient patched file.
const REPO='/workspace/opencode-operational-schema-guard';
const PROV='/tmp/opencode/issue92-s6/s6-execution-provenance.json';
const guard=async()=>{
 let prov;
 try{prov=JSON.parse(await readFile(PROV,'utf8'));}
 catch(err){throw new Error('S6_SOURCE_BINDING_NO_PROVENANCE: '+err.message);}
 const head=prov.source_head,
  blobs=prov.source_blobs_at_head||{};
 const required=['finite-batch.mjs','claim-evidence.mjs','fact-review.mjs',
  'curator-cli.mjs','ex-admission-proof.mjs'];
 for(const n of required)if(!blobs[n])
  throw new Error('S6_SOURCE_BINDING_INCOMPLETE_PROVENANCE: '+n);
 const git=(args)=>execFileSync('git',['-C',REPO,...args],{encoding:'utf8'}).trim();
 const actualHead=git(['rev-parse','HEAD']);
 if(actualHead!==head)
  throw new Error('S6_SOURCE_BINDING_STALE_HEAD: repo='+actualHead+' expected='+head);
 const rel=(n)=>'docs/issue-78/v2-curator/'+n;
 for(const name of required){
  const committed=git(['rev-parse','HEAD:'+rel(name)]),
   ondisk=git(['hash-object',rel(name)]);
  if(committed!==blobs[name])
   throw new Error('S6_SOURCE_BINDING_STALE_BLOB: '+name+' committed='+committed+' expected='+blobs[name]);
  if(ondisk!==committed)
   throw new Error('S6_SOURCE_BINDING_WORKTREE_DRIFT: '+name+' disk='+ondisk+' committed='+committed);
 }
 return {repo_head:head,blobs};
};
const sourceBinding=await guard();
const mod = await import('/workspace/opencode-operational-schema-guard/docs/issue-78/v2-curator/finite-batch.mjs');
const {runAdmittedFiniteBatch} = mod;
const t0 = Date.now();
const result = await runAdmittedFiniteBatch({
  root,
  group,
  graphitiEndpoint: 'http://127.0.0.1:8766/mcp',
  modelEndpoint: 'http://127.0.0.1:8002/v1/chat/completions',
  modelId: 'chat-fast',
  modelOptions: {},
  maxClusters: 24,
  maxCandidates: 72,
  maxSeconds: 3600,
  noveltyPolicy: 'recall',
  replayOnly: false,
  sourceRecovery: true,
  resilientDiscovery: true,
  claimEvidence: true,
  sourceExactComplement: true,
});
result.driver = 's6-exact-complement-proof';
result.driver_elapsed_ms = Date.now() - t0;
result.source_binding = sourceBinding;
const out = JSON.stringify(result, null, 1);
process.stdout.write(out + '\n');
await writeFile(path.join(root, 's6-exact-complement-result.json'), out + '\n', {mode:0o600});
process.exit(result.status === 'unresolved' ? 3 : 0);
