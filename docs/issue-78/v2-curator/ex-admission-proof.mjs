/** Kernel-backed post-exit proof for Issue #92 claim/evidence runs.
 * Python launcher must hold the flock as the direct Node parent and pass its
 * locked descriptor via subprocess(pass_fds=(fd,)). Never acquire a lock here.
 */
import fs from 'node:fs';

const deny=code=>{throw Error('EX_KERNEL_ADMISSION_REQUIRED:'+code);};
export const canonicalExLockPath=()=>{
 if(process.platform!=='linux'||typeof process.getuid!=='function')
  deny('linux_required');
 return '/run/user/'+process.getuid()+'/openviking-agent.lock';
};
export function inspectInheritedFlock({lockPath,fd,holderPid=process.ppid}={}){
 if(process.platform!=='linux')deny('linux_required');
 if(typeof lockPath!=='string'||!lockPath.startsWith('/')||
  !Number.isSafeInteger(fd)||fd<3||fd>1024||
  !Number.isSafeInteger(holderPid)||holderPid<=1)
  deny('invalid_binding');
 let target,opened,info;
 try{
  target=fs.statSync(lockPath,{bigint:true});
  opened=fs.fstatSync(fd,{bigint:true});
  info=fs.readFileSync('/proc/self/fdinfo/'+fd,'utf8');
 }catch{deny('descriptor_unavailable');}
 if(!target.isFile()||!opened.isFile()||
  target.dev!==opened.dev||target.ino!==opened.ino)
  deny('wrong_inode');
 // Linux fdinfo "lock:" records belong to this exact open-file description.
 // A separately opened fd for the same inode has no matching record.
 const pattern=/^lock:\s*\d+:\s+FLOCK\s+ADVISORY\s+WRITE\s+(\d+)\s+[0-9a-fA-F]+:[0-9a-fA-F]+:(\d+)\s+0\s+EOF\s*$/gm;
 if(![...info.matchAll(pattern)].some(m=>
   Number(m[1])===holderPid&&BigInt(m[2])===opened.ino))
  deny('no_inherited_parent_flock');
 return true;
}
export function requireKernelExAdmission(){
 if(process.env.GHDEV_MEMORY_POST_EXIT_LEASE!=='admitted')
  deny('missing_lease');
 const raw=process.env.GHDEV_MEMORY_POST_EXIT_LOCK_FD;
 if(typeof raw!=='string'||!/^[0-9]{1,4}$/.test(raw))
  deny('missing_lock_fd');
 return inspectInheritedFlock({
  lockPath:canonicalExLockPath(),fd:Number(raw),holderPid:process.ppid
 });
}
