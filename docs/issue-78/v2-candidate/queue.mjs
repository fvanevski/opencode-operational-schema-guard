/** Private source-event queue, isolated from the existing Graphiti episode journal. */
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { cleanExcerpt, sha } from './events.mjs';

const SAFE_GROUP = /^[A-Za-z0-9_.-]{1,100}$/;
const VALID_ID = /^[a-f0-9]{64}$/;
const STATES = ['new', 'reserved', 'deferred', 'skipped', 'approved', 'submission_unknown', 'queued', 'persisted'];
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
  async _locked(operation) {
    const run = async () => {
      await this.init();
      const lock = path.join(this.dir, '.queue.lock');
      let acquired = false;
      for (let i = 0; i < 8; i++) {
        try { await fs.mkdir(lock, { mode: 0o700 }); acquired = true; break; }
        catch (e) {
          if (e.code !== 'EEXIST') throw e;
          await new Promise(resolve => setTimeout(resolve, 10 + i * 5));
        }
      }
      if (!acquired) throw Error('candidate_queue_busy: inspect lock owner before recovery');
      try { return await operation(); }
      finally { await fs.rmdir(lock); }
    };
    const result = this.tail.then(run, run);
    this.tail = result.catch(() => {});
    return result;
  }
  async _names() {
    try { return (await fs.readdir(this.dir)).filter(x => /^[a-f0-9]{64}\.json$/.test(x)); }
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
      'assistant_context_truncated', 'capture_backpressure'].includes(reason))
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
      event.cluster_key !== sha(this.group + '\\n' + event.session_id).slice(0, 24) ||
      event.event_id !== sha([1, this.group, event.project, event.workspace,
        event.session_id, event.kind, sourceID].join('\\n')))
      return { status: 'invalid' };
    return this._locked(async () => {
      const dest = this.filename(event.event_id);
      try { await fs.access(dest); return { status: 'duplicate', event_id: event.event_id }; }
      catch (e) { if (e.code !== 'ENOENT') throw e; }
      if ((await this._names()).length >= this.maxItems) {
        await this._bump('queue_full');
        return { status: 'queue_full', event_id: event.event_id };
      }
      const created = await createAtomic(dest, event);
      return { status: created ? 'staged' : 'duplicate', event_id: event.event_id };
    });
  }
  async get(id) {
    try {
      const value = JSON.parse(await fs.readFile(this.filename(id), 'utf8'));
      if (value?.event_id !== id || value.group !== this.group || value.schema_version !== 1)
        throw Error('Queue identity mismatch: ' + id);
      return value;
    } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  }
  async transition(id, expected, next) {
    if (!STATES.includes(expected) || !STATES.includes(next) ||
      !TRANSITIONS[expected].includes(next)) throw Error('Invalid queue state transition');
    return this._locked(async () => {
      const prior = await this.get(id);
      if (!prior || prior.state !== expected) return false;
      await replaceAtomic(this.filename(id), { ...prior, state: next,
        updated_at: new Date().toISOString() });
      return true;
    });
  }
  async list({ offset = 0, limit = 100, states = null } = {}) {
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) ||
      limit < 1 || limit > 500 || (states && !states.every(s => STATES.includes(s))))
      throw Error('Invalid bounded queue list request');
    // Inspection must not create or chmod a new state directory.
    const names = (await this._names()).sort();
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
    for (const name of await this._names()) {
      const row = await this.get(name.slice(0, -5));
      if (row) {
        if (!STATES.includes(row.state)) throw Error('Unknown candidate state: ' + row.event_id);
        counts[row.state]++;
      }
    }
    let drops = {}, last_drop_reason = null;
    try {
      const meta = JSON.parse(await fs.readFile(path.join(this.dir, '_status.json'), 'utf8'));
      drops = meta.drops || {}; last_drop_reason = meta.last_drop_reason || null;
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { schema_version: 1, group: this.group, total, capacity: this.maxItems,
      counts, drops, last_drop_reason, full: total >= this.maxItems };
  }
  // No automatic GC: source evidence or previously persisted Graphiti episodes
  // must never be silently deleted to make room. Stage 2 owns audited archival.
}
