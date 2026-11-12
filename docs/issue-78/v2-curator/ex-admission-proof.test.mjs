import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {requireKernelExAdmission} from './ex-admission-proof.mjs';

const moduleUrl=new URL('./ex-admission-proof.mjs',import.meta.url).href;
const python=String.raw`
import os,json,fcntl,tempfile,subprocess
with tempfile.TemporaryDirectory(prefix='issue92-ex-') as d:
    p=os.path.join(d,'openviking-agent.lock')
    f=open(p,'a+')
    def check(mode):
        other=open(p,'a+')
        fd=other.fileno() if mode=='different_fd' else f.fileno()
        env=dict(os.environ,GHDEV_MEMORY_POST_EXIT_LEASE='admitted',
                 GHDEV_MEMORY_POST_EXIT_LOCK_FD=str(fd))
        parent='process.ppid+1' if mode=='wrong_parent' else 'process.ppid'
        code=('import {inspectInheritedFlock} from %s;'+
              'inspectInheritedFlock({lockPath:%s,fd:%d,holderPid:%s});') % (
               json.dumps(env['PROOF_MODULE_URL']),json.dumps(p),fd,parent)
        return subprocess.run(['node','--input-type=module','-e',code],
          env=env,pass_fds=(fd,),capture_output=True,text=True).returncode
    fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)
    results={'valid':check('valid'),'wrong_parent':check('wrong_parent'),
             'different_fd':check('different_fd')}
    fcntl.flock(f,fcntl.LOCK_UN)
    results['unlocked']=check('valid')
    print(json.dumps(results))
`;
test('ambient marker without locked descriptor fails closed',()=>{
 const prev=process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
 const fd=process.env.GHDEV_MEMORY_POST_EXIT_LOCK_FD;
 try{
  process.env.GHDEV_MEMORY_POST_EXIT_LEASE='admitted';
  delete process.env.GHDEV_MEMORY_POST_EXIT_LOCK_FD;
  assert.throws(()=>requireKernelExAdmission(),/missing_lock_fd/);
 }finally{
  if(prev===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LEASE;
  else process.env.GHDEV_MEMORY_POST_EXIT_LEASE=prev;
  if(fd===undefined)delete process.env.GHDEV_MEMORY_POST_EXIT_LOCK_FD;
  else process.env.GHDEV_MEMORY_POST_EXIT_LOCK_FD=fd;
 }
});
test('inherited flock accepts only held parent-owned open-file description',()=>{
 const run=spawnSync('python3',['-c',python],{
  encoding:'utf8',timeout:15000,
  env:{...process.env,PROOF_MODULE_URL:moduleUrl}
 });
 assert.equal(run.status,0,run.stderr);
 const results=JSON.parse(run.stdout.trim());
 assert.equal(results.valid,0);
 for(const key of ['wrong_parent','different_fd','unlocked'])
  assert.notEqual(results[key],0,key);
});
