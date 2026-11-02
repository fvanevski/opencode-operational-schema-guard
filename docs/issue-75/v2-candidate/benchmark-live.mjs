#!/usr/bin/env node
/**
 * Issue #75: live, READ-ONLY, source-attributed test runner.
 * Runs the actual Memory.search path on a disposable group, without
 * Graphiti writes, seed publishing, or LLM extraction. The fixture
 * source-map is a benchmark measurement adapter, not production logic.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { GraphitiMcp, Journal, Memory, formatContext } from './memory-core.mjs';
import { localReranker } from './relevance.mjs';

const args = process.argv.slice(2);
function opt(name) {
  const i = args.indexOf('--' + name);
  return i < 0 ? undefined : args[i + 1];
}
const group = opt('group');
const stateDir = opt('state-dir');
const endpoint = opt('graphiti-endpoint');
const rerankEndpoint = opt('rerank-endpoint');
const mapFile = opt('source-map');
const output = opt('output');
const holdoutFile = opt('holdout-file');
if (!/^g_issue75_[\w-]+$/.test(group || '') ||
  ![stateDir, mapFile, output].every(p => p && path.isAbsolute(p)) ||
  !endpoint || !rerankEndpoint) {
  console.error('Usage: node benchmark-live.mjs --group g_issue75_test ' +
    '--state-dir ABS --source-map ABS --graphiti-endpoint LOOPBACK ' +
    '--rerank-endpoint LOOPBACK --output ABS [--holdout-file ABS]');
  process.exit(2);
}
const spec = JSON.parse(await readFile(new URL('./benchmark-cases.json', import.meta.url), 'utf8'));
const holdout = holdoutFile ? JSON.parse(await readFile(holdoutFile, 'utf8')) : null;
const querySets = [{ name: 'frozen', queries: spec.queries }];
if (holdout) querySets.push({ name: 'holdout', queries: holdout.queries });
const map = JSON.parse(await readFile(mapFile, 'utf8'));
if (map.group !== group || !map.local_journal_uuid_to_seed ||
  typeof map.local_journal_uuid_to_seed !== 'object')
  throw Error('Source map must be explicitly bound to disposable group');
const seedNames = new Set(spec.seeds.map(s => s.id));
const journal = new Journal(stateDir, group);
const persisted = (await journal.list()).filter(x => x.status === 'persisted');
const byAnchor = new Map();
for (const row of persisted) {
  const seed = map.local_journal_uuid_to_seed[row.uuid];
  if (seed !== undefined) {
    if (!seedNames.has(seed) || !row.remoteEpisodeUuid)
      throw Error('Source map references invalid seed or non-persisted UUID');
    if (byAnchor.has(row.sourceRef)) throw Error('Duplicate source anchor in test map');
    byAnchor.set(row.sourceRef, seed);
  }
}
if (!byAnchor.size) throw Error('No source-map entries match persisted local journal');
const client = new GraphitiMcp(endpoint, { timeoutMs: 1500 });
const ranker = localReranker(rerankEndpoint, { timeoutMs: 160 });
const mem = new Memory({ journal, graphiti: client, group, ranker });
for (const set of querySets) {
  if (!Array.isArray(set.queries) || set.queries.length > 25)
    throw Error('Malformed query set');
  const results = [];
  for (const q of set.queries) {
    if (q.group !== group || !/^[\w-]{2,80}$/.test(q.id) ||
        typeof q.query !== 'string' || q.query.length > 300)
      throw Error('Unsafe or wrong-group benchmark query');
    const start = performance.now();
    let facts = [], error = null;
    try { facts = await mem.search(q.query, { limit: 1, maxChars: 1400 }); }
    catch (e) { error = String(e.message).slice(0, 180); }
    const returned = [];
    for (const f of facts) {
      const id = byAnchor.get(f.source);
      if (!id) throw Error('Unknown source in bench result: do not fabricate label');
      if (!returned.includes(id)) returned.push(id);
    }
    results.push({
      id: q.id, returned, latency_ms: Math.round(performance.now()-start),
      context_chars: formatContext(facts).length,
      timed_out: Boolean(error && /timeout|abort/i.test(error)),
      ...(error ? { error } : {}),
    });
  }
  const filename = set.name === 'frozen' ? output :
    output.replace(/\.json$/i, '') + '-holdout.json';
  await writeFile(filename, JSON.stringify({
    label: 'actual Memory.search with pinned Graphiti and independent CPU reranker (' + set.name + ')',
    group, source_map: path.basename(mapFile), results,
  }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ set: set.name, file: filename,
    cases: results.length, timeouts: results.filter(x => x.timed_out).length,
    unknown_errors: results.filter(x => x.error && !x.timed_out).length }));
}
