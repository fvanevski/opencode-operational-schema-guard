/** Private source-event queue, isolated from the existing Graphiti episode journal. */
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { cleanExcerpt, sha } from './events.mjs';

const SAFE_GROUP = /^[A-Za-z0-9_.-]{1,100}$/;
const VALID_ID = /^[a-f0-9]{64}$/;
const STATES = ['new', 'reserved', 'deferred', 'skipped', 'approved', 'submission_unknown', 'queued', 'persisted'];
// Immutable source fingerprint: exclude mutable state and updated_at only.
export const sourceFingerprint = e => sha(JSON.stringify([
  e.event_id,e.group,e.project,e.workspace,e.session_id,e.kind,e.evidence_class,
  e.source_strength,e.source_refs,e.excerpt,e.observed_at,e.related_event_ids,e.cluster_key
]));
async function syncDir(dir) {
  const h=await fs.open(dir,'r');try {await h.sync();}finally {await h.close();}
}
// A single atomic symlink is the lock+owner record: SIGKILL cannot leave a
// half-written owner file. Linux/local-filesystem only; no cross-host NFS locks.
async function processIdentity(pid) {
  if(process.platform!=='linux')throw Error('QUEUE_LOCK_LINUX_REQUIRED');
  let stat,namespace;
  try {
    stat=await fs.readFile('/proc/'+pid+'/stat','utf8');
    namespace=await fs.readlink('/proc/'+pid+'/ns/pid');
  }catch(e){if(e.code==='ENOENT')return null;throw e;}
  const fields=stat.slice(stat.lastIndexOf(')')+1).trim().split(/\s+/);
  const ns=/^pid:\[(\d+)\]$/.exec(namespace);
  if(!ns||!/^\d+$/.test(fields[19]||''))throw Error('QUEUE_LOCK_PROCESS_IDENTITY_INVALID');
  const boot=(await fs.readFile('/proc/sys/kernel/random/boot_id','utf8')).trim().replaceAll('-','');
  if(!/^[0-9a-f]{32}$/.test(boot))throw Error('QUEUE_LOCK_BOOT_ID_INVALID');
  return {pid,start:fields[19],namespace:ns[1],boot};
}
const LOCK_TOKEN=/^v2\.(\d{1,10})\.(\d+)\.(\d+)\.([0-9a-f]{32})\.([0-9a-f]{32})$/;
const TRANSITIONS = {
  new: ['reserved', 'deferred', 'skipped'],
  reserved: ['new', 'deferred', 'skipped', 'approved'],
  deferred: ['reserved', 'skipped'],
  approved: ['submission_unknown'],
  submission_unknown: ['queued', 'persisted'],
  queued: ['persisted'],
  persisted: [], skipped: [],
};
async function replaceAtomic(dest, payload) {
  const tmp = dest + '.' + randomUUID() + '.tmp';
  try {
    const handle = await fs.open(tmp, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(payload) + '\n'); await handle.sync(); }
    finally { await handle.close(); }
    await fs.rename(tmp, dest);
    await syncDir(path.dirname(dest));
  } finally { await fs.rm(tmp, { force: true }); }
}
async function createAtomic(dest, payload) {
  const tmp = dest + '.' + randomUUID() + '.tmp';
  try {
    const handle = await fs.open(tmp, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(payload) + '\n'); await handle.sync(); }
    finally { await handle.close(); }
    try { await fs.link(tmp, dest); return true; }
    catch (err) { if (err.code === 'EEXIST') return false; throw err; }
  } finally { await fs.rm(tmp, { force: true }); }
}
export class CandidateQueue {
  constructor(root, group, { maxItems = 4000 } = {}) {
    if (typeof root !== 'string' || !path.isAbsolute(root)) throw Error('Absolute queue state directory required');
    if (!SAFE_GROUP.test(group)) throw Error('Explicit safe queue group required');
    if (!Number.isInteger(maxItems) || maxItems < 501 || maxItems > 20000)
      throw Error('Queue capacity must be 501..20000');
    this.dir = path.join(root, 'candidate-events-v1', group);
    this.archiveDir = path.join(this.dir, '_archive');
    this.group = group; this.maxItems = maxItems;
    this.tail = Promise.resolve();
  }
  async init() {
    await fs.mkdir(this.dir, { recursive: true, mode: 0o700 });
    await fs.chmod(this.dir, 0o700);
  }
  filename(id) {
    if (!VALID_ID.test(id)) throw Error('Invalid event ID');
    return path.join(this.dir, id + '.json');
  }
  archiveFilename(id) {
    if(!VALID_ID.test(id))throw Error('Invalid event ID');
    return path.join(this.archiveDir,id+'.json');
  }
  async pendingIds() {
    return (await this._names()).map(n=>n.slice(0,-5)).sort();
  }
  lockPath() {return path.join(this.dir,'.queue.lock');}
  async lockPresent() {
    try {await fs.lstat(this.lockPath());return true;}
    catch(e){if(e.code==='ENOENT')return false;throw e;}
  }
  // Privileged caller must authenticate exclusive kernel EX admission first.
  // A regular producer NEVER calls this; unknown or live owners fail closed.
  async recoverAbandonedLock() {
    const lock=this.lockPath();
    let st;
    try {st=await fs.lstat(lock);}
    catch(e){if(e.code==='ENOENT')return {status:'absent'};throw e;}
    if(st.isSymbolicLink()) {
      const token=await fs.readlink(lock),match=LOCK_TOKEN.exec(token);
      if(!match)throw Error('QUEUE_LOCK_OWNER_UNVERIFIED');
      const [,rawPid,start,namespace,boot]=match;
      const current=await processIdentity(Number(rawPid));
      const self=await processIdentity(process.pid);
      if(!self)throw Error('QUEUE_LOCK_SELF_IDENTITY_UNAVAILABLE');
      if(self.boot===boot&&current&&current.namespace!==namespace)
        throw Error('QUEUE_LOCK_DIFFERENT_PID_NAMESPACE');
      if(self.boot===boot&&current&&current.start===start)
        throw Error('QUEUE_LOCK_OWNER_ACTIVE');
      // Different boot ID means the original lock cannot still be held
      // on this local filesystem; PID and namespace may have been reused.
      if((await fs.readlink(lock))!==token)
        throw Error('QUEUE_LOCK_CHANGED_BEFORE_RECOVERY');
      await fs.unlink(lock);
      await syncDir(this.dir);
      return {status:'recovered',kind:'dead-owner-v2'};
    }
    // Historical empty mkdir locks have no PID identity. EX proof plus a
    // conservative age check is required before legacy recovery.
    if(st.isDirectory()) {
      if((await fs.readdir(lock)).length)throw Error('QUEUE_LOCK_LEGACY_NOT_EMPTY');
      if(Date.now()-st.mtimeMs<30000)throw Error('QUEUE_LOCK_LEGACY_TOO_RECENT');
      const check=await fs.lstat(lock);
      if(check.dev!==st.dev||check.ino!==st.ino)
        throw Error('QUEUE_LOCK_CHANGED_BEFORE_RECOVERY');
      await fs.rmdir(lock);
      await syncDir(this.dir);
      return {status:'recovered',kind:'quiescent-legacy-dir'};
    }
    throw Error('QUEUE_LOCK_TYPE_UNVERIFIED');
  }
  async _locked(operation) {
    const run=async()=>{
      await this.init();
      const lock=this.lockPath();
      const me=await processIdentity(process.pid);
      if(!me)throw Error('QUEUE_LOCK_SELF_IDENTITY_UNAVAILABLE');
      const token='v2.'+process.pid+'.'+me.start+'.'+me.namespace+'.'+
        me.boot+'.'+randomUUID().replaceAll('-','');
      let acquired=false;
      for(let i=0;i<100;i++) {
        try {await fs.symlink(token,lock);acquired=true;break;}
        catch(e){
          if(e.code!=='EEXIST')throw e;
          await new Promise(resolve=>setTimeout(resolve,15+(i%8)*5));
        }
      }
      if(!acquired)throw Error('candidate_queue_busy: EX supervisor must inspect lock owner');
      try {return await operation();}
      finally {
        if((await fs.readlink(lock))!==token)
          throw Error('QUEUE_LOCK_OWNERSHIP_LOST');
        await fs.unlink(lock);
      }
    };
    const result=this.tail.then(run,run);
    this.tail=result.catch(()=>{});
    return result;
  }
  async _names(folder = this.dir) {
    try { return (await fs.readdir(folder)).filter(x => /^[a-f0-9]{64}\.json$/.test(x)); }
    catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  }
  async _bump(reason) {
    const file = path.join(this.dir, '_status.json');
    let status = { drops: {}, updated_at: null };
    try { status = JSON.parse(await fs.readFile(file, 'utf8')); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    const drops = status.drops || {};
    drops[reason] = (Number(drops[reason]) || 0) + 1;
    await replaceAtomic(file, { drops, last_drop_reason: reason,
      updated_at: new Date().toISOString() });
  }
  // Durable counters for source events declined before stage() (backpressure
  // and bounded interactive buffers). This is diagnostic, not a replay queue.
  async recordDrop(reason) {
    if (!['pending_prompt_overflow', 'pending_session_overflow',
      'assistant_context_truncated', 'capture_backpressure',
      'prompt_admission_filtered', 'tool_admission_filtered'].includes(reason))
      throw Error('Invalid candidate drop reason');
    return this._locked(async () => { await this._bump(reason); });
  }
  async stage(event) {
    if (!event || event.schema_version !== 1 || event.group !== this.group ||
      !VALID_ID.test(event.event_id || '') || event.state !== 'new' ||
      !Array.isArray(event.source_refs) || event.source_refs.length !== 1 ||
      !SAFE_GROUP.test(event.project || '') ||
      typeof event.session_id !== 'string' ||
      !/^[A-Za-z0-9_.:-]{1,160}$/.test(event.session_id) ||
      typeof event.excerpt !== 'string' || cleanExcerpt(event.excerpt) !== event.excerpt ||
      typeof event.workspace !== 'string' || !path.isAbsolute(event.workspace) ||
      typeof event.observed_at !== 'string' ||
      !Number.isFinite(Date.parse(event.observed_at)) ||
      !Array.isArray(event.related_event_ids) ||
      event.related_event_ids.length > 8 ||
      !event.related_event_ids.every(id => VALID_ID.test(id)))
      return { status: 'invalid' };
    const allowed = {
      user_turn: { cls: 'user-stated', types: ['message', 'prompt'] },
      tool_outcome: { cls: 'tool-reported', types: ['tool'] },
      file_change: { cls: 'tool-reported', types: ['tool'] },
      file_access: { cls: 'tool-reported', types: ['tool'] },
      assistant_turn: { cls: 'assistant-reported', types: ['message'] },
    }[event.kind];
    if (!allowed || event.evidence_class !== allowed.cls) return { status: 'invalid' };
    const source = event.source_refs[0];
    const prefix = 'opencode:' + event.session_id + ':';
    const parsed = allowed.types.map(type => ({ type, p: prefix + type + ':' }))
      .find(x => typeof source === 'string' && source.startsWith(x.p));
    const sourceID = parsed && source.slice(parsed.p.length);
    if (!sourceID || !/^[A-Za-z0-9_.:-]{1,160}$/.test(sourceID) ||
      event.source_strength !== (parsed.type === 'prompt' ? 'session-scoped-fallback' : 'native-id') ||
      event.cluster_key !== sha(this.group + '\n' + event.session_id).slice(0, 24) ||
      event.event_id !== sha([1, this.group, event.project, event.workspace,
        event.session_id, event.kind, sourceID].join('\n')))
      return { status: 'invalid' };
    return this._locked(async () => {
      const dest = this.filename(event.event_id);
      for(const file of [dest,this.archiveFilename(event.event_id)]) {
        try {await fs.access(file);return {status:'duplicate',event_id:event.event_id};}
        catch(e) {if(e.code!=='ENOENT')throw e;}
      }
      if ((await this._names()).length >= this.maxItems) {
        await this._bump('queue_full');
        return { status: 'queue_full', event_id: event.event_id };
      }
      const created = await createAtomic(dest, event);
      if(created)await syncDir(this.dir); // admission is directory-durable before ACK
      return { status: created ? 'staged' : 'duplicate', event_id: event.event_id };
    });
  }
  async get(id) {
    for(const file of [this.filename(id),this.archiveFilename(id)]) {
      try {
        const v=JSON.parse(await fs.readFile(file,'utf8'));
        if(v?.event_id!==id||v.group!==this.group||v.schema_version!==1)
          throw Error('Queue identity mismatch: '+id);
        return v;
      } catch(e) {if(e.code!=='ENOENT')throw e;}
    }
    return null;
  }
  async transition(id, expected, next) {
    if (!STATES.includes(expected) || !STATES.includes(next) ||
      !TRANSITIONS[expected].includes(next)) throw Error('Invalid queue state transition');
    return this._locked(async () => {
      const active=this.filename(id),archived=this.archiveFilename(id);
      const exists=async file=>{try{await fs.access(file);return true;}
        catch(e){if(e.code==='ENOENT')return false;throw e;}};
      const isActive=await exists(active),isArchived=await exists(archived);
      if(isActive&&isArchived)throw Error('ARCHIVE_DUPLICATE_PENDING_RECOVERY');
      const prior = await this.get(id);
      if (!prior || prior.state !== expected) return false;
      await replaceAtomic(isActive?active:archived, { ...prior, state: next,
        updated_at: new Date().toISOString() });
      return true;
    });
  }
  async list({ offset = 0, limit = 100, states = null, includeArchived = false } = {}) {
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) ||
      limit < 1 || limit > 500 || typeof includeArchived !== 'boolean' ||
      (states && !states.every(s => STATES.includes(s))))
      throw Error('Invalid bounded queue list request');
    // Inspection must not create or chmod a new state directory.
    const names = includeArchived ? [...new Set([...(await this._names()),
      ...(await this._names(this.archiveDir))])].sort() : (await this._names()).sort();
    const rows = [];
    // This is a bounded page of all source events, not the legacy 500-row Graphiti journal list.
    for (const name of names) {
      const row = await this.get(name.slice(0, -5));
      if (row && (!states || states.includes(row.state))) rows.push(row);
    }
    rows.sort((a, b) => a.observed_at.localeCompare(b.observed_at) ||
      a.event_id.localeCompare(b.event_id));
    return { total: rows.length, items: rows.slice(offset, offset + limit),
      has_more: offset + limit < rows.length };
  }
  async status() {
    // Read-only observation, including for an as-yet nonexistent group.
    const counts = Object.fromEntries(STATES.map(x => [x, 0]));
    let oldest_pending_at = null;
    for (const name of await this._names()) {
      const row = await this.get(name.slice(0, -5));
      if (row) {
        if (!STATES.includes(row.state)) throw Error('Unknown candidate state: ' + row.event_id);
        counts[row.state]++;
        if (['new','reserved'].includes(row.state) &&
            (oldest_pending_at === null || row.observed_at < oldest_pending_at))
          oldest_pending_at = row.observed_at;
      }
    }
    let drops = {}, last_drop_reason = null;
    try {
      const meta = JSON.parse(await fs.readFile(path.join(this.dir, '_status.json'), 'utf8'));
      drops = meta.drops || {}; last_drop_reason = meta.last_drop_reason || null;
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const archived_total=(await this._names(this.archiveDir)).length;
    return { schema_version: 1, group: this.group, total,active_total:total,
      archived_total,retained_total:total+archived_total,capacity:this.maxItems,
      counts,drops,last_drop_reason,oldest_pending_at,full:total>=this.maxItems };
  }
  // ReviewStore ownership has already been authenticated by archive-owned.mjs.
  // Hard-link, fsync archive directory, unlink pending, fsync pending directory.
  // Crash between link and unlink leaves identical paths for idempotent repair.
  async archiveSettledBatch(entries) {
    if(!Array.isArray(entries)||entries.length>32||
      entries.some(e=>!VALID_ID.test(e?.id||'')||!VALID_ID.test(e?.fingerprint||'')))
      throw Error('INVALID_ARCHIVE_BATCH');
    if(!entries.length)return {archived:0,already_archived:0};
    return this._locked(async()=>{
      await fs.mkdir(this.archiveDir,{recursive:true,mode:0o700});
      await fs.chmod(this.archiveDir,0o700);
      // Persist the _archive directory entry before unlinking any active source.
      // Syncing _archive alone does not make its name durable in the parent.
      await syncDir(this.dir);
      const removals=[],seen=new Set();let already=0;
      for(const entry of entries) {
        if(seen.has(entry.id))throw Error('DUPLICATE_ARCHIVE_PLAN_ID');
        seen.add(entry.id);
        const active=this.filename(entry.id),archive=this.archiveFilename(entry.id);
        let buffer;
        try {buffer=await fs.readFile(active);}catch(e) {
          if(e.code!=='ENOENT')throw e;
          const archived=JSON.parse(await fs.readFile(archive,'utf8'));
          if(sourceFingerprint(archived)!==entry.fingerprint)
            throw Error('ARCHIVED_SOURCE_IDENTITY_MISMATCH');
          already++;continue;
        }
        const parsed=JSON.parse(buffer.toString('utf8'));
        if(parsed?.schema_version!==1||parsed.event_id!==entry.id||
           parsed.group!==this.group||sourceFingerprint(parsed)!==entry.fingerprint)
          throw Error('SOURCE_CHANGED_DURING_ARCHIVE');
        const stat=await fs.lstat(active);
        if(!stat.isFile()||stat.isSymbolicLink())throw Error('UNSAFE_SOURCE_TYPE');
        try {await fs.link(active,archive);}catch(e) {
          if(e.code!=='EEXIST')throw e;
          if(!(await fs.readFile(archive)).equals(buffer))
            throw Error('ARCHIVE_COLLISION_CONTENT_MISMATCH');
        }
        removals.push(active);
      }
      await syncDir(this.archiveDir);
      for(const file of removals)await fs.unlink(file);
      await syncDir(this.dir);
      return {archived:removals.length,already_archived:already};
    });
  }
}
