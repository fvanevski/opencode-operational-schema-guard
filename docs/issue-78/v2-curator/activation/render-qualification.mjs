#!/usr/bin/env node
/** Render disposable *user* systemd units only. No install, enable, or host service mutation. */
import {readFile,writeFile,mkdir,stat,chmod} from 'node:fs/promises';
import path from 'node:path';
import {fixtureUnitName,isFixtureGroup,validRecoveryBinding} from '../../fixture-groups.mjs';
const args=process.argv.slice(2);
const get=k=>{const i=args.indexOf('--'+k);return i<0?'':args[i+1]||'';};
export function renderUnits(templates,values){
 const required=['CANDIDATE_GROUP_DIRECTORY','REVIEW_GROUP_DIRECTORY',
   'SERVICE_UNIT_NAME','PRIVATE_ENV_FILE','PYTHON_EXEC','POST_EXIT_GATE_WRAPPER',
   'INSTALLED_GATE_SOURCE','INSTALLED_GATE_CONFIG','CURATOR_CLI','GROUP',
   'PRIVATE_STATE_DIR','GRAPHITI_MCP_LOOPBACK'];
 for(const key of required){
  if(typeof values[key]!=='string'||!values[key]||
     /[\r\n]/.test(values[key]))throw Error('Missing/invalid unit value '+key);
 }
 const render=template=>template.replace(/@@([A-Z_]+)@@/g,(_,key)=>{
  if(!required.includes(key))throw Error('Unknown unit placeholder '+key);
  return values[key];
 });
 const service=render(templates.service),pathUnit=render(templates.path);
 if(/@@[A-Z_]+@@/.test(service+pathUnit))throw Error('Unrendered placeholder');
 return {service,pathUnit};
}
export async function cli(){
 const worktree=get('worktree'),state=get('state-dir'),group=get('group'),
   output=get('output-dir'),env=get('private-env-file'),gate=get('gate-source'),
   config=get('gate-config'),endpoint=get('endpoint'),
   unit=get('unit')||(isFixtureGroup(group,'recovery')?
     fixtureUnitName(group):'ghdev-curator80-qual'),
   python=get('python')||'/usr/bin/python3';
 if(![worktree,state,output,env,gate,config,python].every(x=>path.isAbsolute(x)))
   throw Error('All local paths must be absolute');
 if(!validRecoveryBinding(group,unit))
   throw Error('Matching disposable recovery group and unit required');
 if(!/^http:\/\/(?:127\.0\.0\.1|localhost):[0-9]{2,5}\/mcp\/?$/.test(endpoint))
   throw Error('A loopback Graphiti MCP endpoint is required');
 if(!output.startsWith('/tmp/')&&!output.startsWith(process.env.HOME+'/'))
   throw Error('Output directory must be disposable /tmp or HOME');
 for(const p of [worktree,state,env,gate,config,python]){
  const s=await stat(p);if(!s)throw Error('Absent '+p);
 }
 const envstat=await stat(env);
 if(!envstat.isFile()||(envstat.mode&0o077)!==0)
   throw Error('Private env file must have mode 0600 or stricter');
 const cand=path.join(state,'candidate-events-v1',group);
 const review=path.join(state,'curation-v1',group);
 // Path watchers require the paths to exist before enablement; only private
 // disposable group directories are created, never any production location.
 await mkdir(cand,{recursive:true,mode:0o700});
 await mkdir(review,{recursive:true,mode:0o700});
 await chmod(cand,0o700);await chmod(review,0o700);
 const source=new URL('.',import.meta.url);
 const templates={
  service:await readFile(new URL('./ghdev-curator.service.in',source),'utf8'),
  path:await readFile(new URL('./ghdev-curator.path.in',source),'utf8')};
 const values={
   CANDIDATE_GROUP_DIRECTORY:cand,REVIEW_GROUP_DIRECTORY:review,
   SERVICE_UNIT_NAME:unit+'.service',PRIVATE_ENV_FILE:env,
   PYTHON_EXEC:python,POST_EXIT_GATE_WRAPPER:path.join(worktree,
     'docs/issue-75/v2-candidate/post-exit-drain.py'),
   INSTALLED_GATE_SOURCE:gate,INSTALLED_GATE_CONFIG:config,
   CURATOR_CLI:path.join(worktree,'docs/issue-78/v2-curator/curator-cli.mjs'),
   GROUP:group,PRIVATE_STATE_DIR:state,GRAPHITI_MCP_LOOPBACK:endpoint};
 const rendered=renderUnits(templates,values);
 await mkdir(output,{recursive:true,mode:0o700});
 const serviceFile=path.join(output,unit+'.service'),
   pathFile=path.join(output,unit+'.path');
 await writeFile(serviceFile,rendered.service,{flag:'wx',mode:0o600});
 await writeFile(pathFile,rendered.pathUnit,{flag:'wx',mode:0o600});
 console.log(JSON.stringify({result:'RENDERED_NOT_INSTALLED',
   service_file:serviceFile,path_file:pathFile,unit,group,
   watch_paths:[cand,review],worktree,
   environment_file:env.replace(/[^/]+$/,'<private-env>')},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname)
 await cli();
