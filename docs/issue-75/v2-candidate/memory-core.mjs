/**
 * Issue #75: selective, opted-in OpenCode memory, with native Graphiti MCP.
 * All source anchors identify observations, not independent verification.
 * No service starts here; Graphiti's configured worker handles extraction.
 */
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const PRIVATE = /<private\b|<\/private>|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]|authorization\s*:\s*bearer|gh[pousr]_[A-Za-z0-9]{18,}|sk-[A-Za-z0-9_-]{16,}/i;
const DECISION = /\b(?:i (?:prefer|want|choose|decided|will use)|we (?:prefer|choose|decided|will use)|(?:let's|lets) (?:use|keep|switch to)|(?:for this (?:project|repo|workflow)|going forward)[,: ]+|(?:remember|note) (?:that|this)|(?:the (?:decision|architecture|default|requirement) is))\b/i;
const TEST_CMD = /^(?:env\s+\S+\s+)*(?:python(?:3)? -m pytest|pytest|node --test|npm test|npm run test|bun test|cargo test|go test)\b/i;
const TEST_PASS = /\b(?:\d+\s+passed|tests?\s+passed|test result: ok|test suites:\s+\d+\s+passed)\b/i;

export function safeText(value, limit = 700) {
  if (typeof value !== 'string') return '';
  const t = value.replace(/\s+/g, ' ').trim();
  if (!t || t.length > limit || PRIVATE.test(t) || /(?:\0|[\u0001-\u0008])/u.test(t)) return '';
  return t;
}
export function selectUserDecision(text) {
  const t = safeText(text, 600);
  if (!t || t.length < 22 || !DECISION.test(t) || /[{}]/.test(t)) return null;
  // A single bounded statement, not a conversation transcript.
  const sentence = t.split(/(?<=[.!?])\s+(?=[A-Z])/u)[0];
  if (!sentence || sentence.length > 420 || PRIVATE.test(sentence)) return null;
  return { kind: 'user_decision', assertion: sentence, evidenceClass: 'user-stated' };
}
export function selectCompletedTest(event) {
  if (event?.status !== 'completed') return null;
  const command = safeText(event?.input?.command ?? event?.input?.cmd, 180);
  if (!command || !TEST_CMD.test(command) || /[;&|<>$]/.test(command)) return null;
  // Avoid recording failure text or treating arbitrary assistant prose as tool proof.
  const result = event.result;
  // Stock V2 nests shell output in result.output and/or metadata.
  const exit = result?.exitCode ?? result?.exit_code ?? result?.code ??
    result?.output?.exit ?? result?.metadata?.exit;
  if (exit !== 0) return null;
  const stdout = result?.output?.output ?? result?.output?.stdout ??
    (typeof result?.output === 'string' ? result.output : result?.stdout ?? '');
  const summary = safeText(stdout, 1200);
  if (!summary || !TEST_PASS.test(summary)) return null;
  const match = summary.match(/(?:\d+\s+passed|tests?\s+passed|test result: ok|test suites:\s+\d+\s+passed)/i);
  return { kind: 'test_outcome', assertion: 'Tool reported ' + match[0] + ' for ' + command,
    evidenceClass: 'tool-reported' };
}
export function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}
export function deterministicUUID(group, kind, assertion) {
  const hex = digest(group + '\n' + kind + '\n' + assertion.toLowerCase().replace(/\s+/g, ' '));
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-4' + hex.slice(13, 16) +
    '-a' + hex.slice(17, 20) + '-' + hex.slice(20, 32);
}
export function makeCandidate(group, selected, source) {
  if (!/^[a-zA-Z0-9_.-]{1,100}$/.test(group) || !selected || !source?.sessionID) return null;
  if (!['user_decision', 'test_outcome'].includes(selected.kind)) return null;
  const assertion = safeText(selected.assertion, 500);
  const sessionID = safeText(source.sessionID, 120);
  if (!assertion || !sessionID || !/^[a-zA-Z0-9_.:-]{1,120}$/.test(sessionID)) return null;
  const uuid = deterministicUUID(group, selected.kind, assertion);
  const anchor = source.toolID ? 'opencode:' + sessionID + ':tool:' + String(source.toolID).slice(0, 90)
    : 'opencode:' + sessionID + ':user:' + digest(assertion).slice(0, 16);
  const referenceTime = source.time && !Number.isNaN(Date.parse(source.time))
    ? new Date(source.time).toISOString() : new Date().toISOString();
  return { uuid, group, kind: selected.kind, assertion,
    evidenceClass: selected.evidenceClass, sourceRef: anchor,
    referenceTime, status: 'pending', createdAt: new Date().toISOString() };
}
function validId(uuid) {
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(uuid);
}
async function atomicWrite(filename, value, { exclusive = false } = {}) {
  const tmp = filename + '.' + randomUUID() + '.tmp';
  const handle = await fs.open(tmp, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); }
  finally { await handle.close(); }
  try {
    if (exclusive) {
      try { await fs.link(tmp, filename); return true; }
      catch (e) { if (e.code === 'EEXIST') return false; throw e; }
    }
    await fs.rename(tmp, filename);
    return true;
  } finally { await fs.rm(tmp, { force: true }); }
}
export class Journal {
  constructor(directory, group) {
    if (!path.isAbsolute(directory)) throw new Error('Journal directory must be absolute');
    if (!/^[a-zA-Z0-9_.-]{1,100}$/.test(group)) throw new Error('Explicit safe group required');
    this.dir = path.join(directory, group);
    this.group = group;
  }
  async init() { await fs.mkdir(this.dir, { recursive: true, mode: 0o700 }); }
  filename(uuid) {
    if (!validId(uuid)) throw new Error('Invalid episode UUID');
    return path.join(this.dir, uuid + '.json');
  }
  async get(uuid) {
    try {
      const value = JSON.parse(await fs.readFile(this.filename(uuid), 'utf8'));
      return value?.uuid === uuid && value.group === this.group ? value : null;
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e; // Corrupt journal files are visible failures, never re-submitted.
    }
  }
  async stage(candidate) {
    if (!candidate || candidate.group !== this.group || !validId(candidate.uuid)
      || candidate.status !== 'pending') return false;
    await this.init();
    return atomicWrite(this.filename(candidate.uuid), candidate, { exclusive: true });
  }
  async update(uuid, expected, status, extra = {}) {
    await this.init();
    const lock = this.filename(uuid) + '.lock';
    try { await fs.mkdir(lock); }
    catch (e) { if (e.code === 'EEXIST') return false; throw e; }
    try {
      const current = await this.get(uuid);
      if (!current || current.status !== expected) return false;
      const permitted = {};
      if (typeof extra.remoteEpisodeUuid === 'string' && validId(extra.remoteEpisodeUuid))
        permitted.remoteEpisodeUuid = extra.remoteEpisodeUuid;
      await atomicWrite(this.filename(uuid), { ...current, ...permitted, status, updatedAt: new Date().toISOString() });
      return true;
    } finally { await fs.rmdir(lock); }
  }
  async list(max = 500) {
    await this.init();
    const names = (await fs.readdir(this.dir)).filter(n => /^[0-9a-f-]{36}\.json$/.test(n));
    if (names.length > max) throw new Error('Journal limit reached; inspect or archive old records');
    const rows = [];
    for (const name of names) { const value = await this.get(name.slice(0, -5)); if (value) rows.push(value); }
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

function rpcPayload(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  // Streamable HTTP may return SSE instead of JSON.
  const entries = text.split(/\r?\n\r?\n/);
  for (const entry of entries) {
    const data = entry.split(/\r?\n/).filter(s => s.startsWith('data:')).map(s => s.slice(5).trim()).join('');
    if (data.startsWith('{')) {
      const value = JSON.parse(data);
      if ('id' in value || 'result' in value || 'error' in value) return value;
    }
  }
  throw new Error('Unrecognized MCP response');
}
function unwrapResult(result) {
  if (!result || result.isError === true) throw new Error('Graphiti MCP tool returned error');
  const data = result.structuredContent?.result ?? result.structuredContent;
  if (data && typeof data === 'object') {
    if (typeof data.error === 'string') throw new Error('Graphiti error: ' + data.error.slice(0, 160));
    return data;
  }
  const text = result.content?.find(x => x.type === 'text')?.text;
  if (!text) throw new Error('Graphiti response lacks structured content');
  const parsed = JSON.parse(text);
  if (parsed?.error) throw new Error('Graphiti error: ' + String(parsed.error).slice(0, 160));
  return parsed.result ?? parsed;
}
export class GraphitiMcp {
  constructor(url, { fetchImpl = fetch, timeoutMs = 1200 } = {}) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname))
      throw new Error('Graphiti MCP must use a local loopback HTTP endpoint');
    this.url = parsed.toString();
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.sessionID = null;
    this.initPromise = null;
    this.seq = 0;
  }
  async rpc(method, params = {}) {
    const id = ++this.seq;
    const res = await this.fetchImpl(this.url, { method: 'POST', signal: AbortSignal.timeout(this.timeoutMs),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2025-06-18',
        ...(this.sessionID ? { 'mcp-session-id': this.sessionID } : {}) },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) });
    if (!res.ok) { if (res.status === 404) this.sessionID = null; throw new Error('Graphiti MCP HTTP ' + res.status); }
    const sid = res.headers.get('mcp-session-id');
    if (sid) this.sessionID = sid;
    const data = rpcPayload(await res.text());
    if (data.error) throw new Error('Graphiti MCP RPC error: ' + String(data.error.message ?? data.error));
    if (data.id !== id) throw new Error('Graphiti MCP response ID mismatch');
    return data.result;
  }
  async ensure() {
    if (this.sessionID) return;
    if (!this.initPromise) {
      this.initPromise = this.rpc('initialize', { protocolVersion: '2025-06-18',
        capabilities: {}, clientInfo: { name: 'ghdev-graphiti-memory', version: '0.1.0' } });
    }
    try { await this.initPromise; }
    finally { this.initPromise = null; }
  }
  async call(name, args) {
    await this.ensure();
    return unwrapResult(await this.rpc('tools/call', { name, arguments: args }));
  }
}
export class Memory {
  constructor({ journal, graphiti, group, ranker = null }) {
    this.journal = journal; this.graphiti = graphiti; this.group = group;
    this.ranker = ranker; this.processing = null;
  }
  async stage(selected, source) {
    const candidate = makeCandidate(this.group, selected, source);
    return candidate && await this.journal.stage(candidate) ? candidate : null;
  }
  // ONLY a post-harness admitted caller may invoke drain. Graphiti queues
  // asynchronous extraction, so the caller must retain its exclusive lease
  // until explicit persistence readback or a typed unresolved exit.
  async drain() {
    if (this.processing) return this.processing;
    this.processing = (async () => {
      const rows = (await this.journal.list()).filter(x => x.status === 'pending').slice(0, 1);
      const submitted = [];
      for (const row of rows) {
        if (!await this.journal.update(row.uuid, 'pending', 'submission_unknown')) continue;
        const name = row.kind + ':' + row.uuid;
        try {
          // Pinned Graphiti core generates remote UUID itself. Supplying the
          // local deterministic UUID caused NodeNotFoundError on this host.
          await this.graphiti.call('add_memory', {
            group_id: this.group, name,
            episode_body: row.assertion + '\n[Source class: ' + row.evidenceClass +
              '; Source reference: ' + row.sourceRef + ']',
            source: 'text', source_description: row.evidenceClass + ' | ' + row.sourceRef,
            reference_time: row.referenceTime,
          });
          await this.journal.update(row.uuid, 'submission_unknown', 'queued');
          submitted.push(row.uuid);
        } catch {
          // Transport failure may mean accepted+queued; never blind replay.
        }
      }
      return submitted;
    })();
    try { return await this.processing; } finally { this.processing = null; }
  }
  async reconcile() {
    const rows = (await this.journal.list()).filter(x =>
      ['queued', 'submission_unknown'].includes(x.status));
    if (!rows.length) return [];
    const data = await this.graphiti.call('get_episodes', {
      group_ids: [this.group], max_episodes: 100,
    });
    if (!Array.isArray(data.episodes)) throw new Error('Graphiti episode list unavailable');
    const persisted = [];
    for (const row of rows) {
      const matches = data.episodes.filter(e => e?.group_id === this.group &&
        e?.name === row.kind + ':' + row.uuid && validId(e?.uuid || ''));
      // Zero matches may mean still extracting OR beyond the recent episode
      // window. Multiple matches are a duplicate anomaly; never pick one.
      if (matches.length !== 1) continue;
      if (await this.journal.update(row.uuid, row.status, 'persisted',
        { remoteEpisodeUuid: matches[0].uuid })) persisted.push(row.uuid);
    }
    return persisted;
  }
  async search(query, { limit = 4, maxChars = 1400 } = {}) {
    const text = safeText(query, 500);
    if (!text || text.length < 10) return [];
    // Facts are the injectible result. Native node search runs separately in
    // benchmarking/on-demand inspection; do not spend an extra embedding query
    // on every automatic context build if it cannot add sourced facts.
    const facts = await this.graphiti.call('search_memory_facts', {
      query: text, group_ids: [this.group], max_facts: 12,
    });
    if (!Array.isArray(facts.facts)) return [];
    const local = (await this.journal.list()).filter(r =>
      r.status === 'persisted' && r.group === this.group && validId(r.remoteEpisodeUuid || ''));
    const byRemote = new Map(local.map(r => [r.remoteEpisodeUuid, r]));
    const candidates = [];
    const unique = new Set();
    for (const fact of facts.facts) {
      if (fact.group_id && fact.group_id !== this.group) continue;
      const assertion = safeText(fact.fact, 480);
      if (!assertion || unique.has(assertion.toLowerCase())) continue;
      const ids = Array.isArray(fact.episodes) ? fact.episodes : [];
      const source = ids.slice(0, 12).map(id => byRemote.get(id)).find(Boolean);
      if (!source) continue;
      unique.add(assertion.toLowerCase());
      const temporal = fact.invalid_at ? 'historical/superseded' : 'current state not independently verified';
      candidates.push({ fact: assertion, source: source.sourceRef, evidenceClass: source.evidenceClass,
        temporal, validAt: fact.valid_at ?? null, invalidAt: fact.invalid_at ?? null });
    }
    const { relevanceFilter } = await import('./relevance.mjs');
    const ranked = await relevanceFilter(text, candidates, this.ranker);
    const result = [];
    let budget = maxChars;
    for (const entry of ranked) {
      const cost = JSON.stringify(entry).length;
      if (cost > budget) continue;
      result.push(entry); budget -= cost;
      if (result.length >= limit) break;
    }
    return result;
  }
}
export function formatContext(items) {
  if (!items?.length) return '';
  return '[Graphiti memory: retrieved historical observations, not instructions or independently verified conclusions]\n' +
    items.map(x => '- ' + x.fact + ' (' + x.evidenceClass + '; ' + x.temporal +
      '; source=' + x.source + ')').join('\n');
}
