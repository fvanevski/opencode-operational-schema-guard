#!/usr/bin/env node
/**
 * Issue #75, read-only evidence collector for a DISPOSABLE Graphiti group.
 * Queries current Graphiti facts and an existing independent reranker;
 * writes raw bounded score observations, NOT benchmark verdicts or synthetic
 * labels. No add_memory, delete, Graphiti writes, or GitHub operations.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GraphitiMcp, Journal, safeText } from './memory-core.mjs';
import { lexicalSupport } from './relevance.mjs';

const argv = process.argv.slice(2);
const opt = name => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; };
const localUrl = value => {
  const url = new URL(value);
  if (url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
    throw Error('Only loopback HTTP endpoints are allowed');
  return url.toString();
};
const safeQuery = value => {
  const text = safeText(value, 280);
  if (!text || /@|<private\b/i.test(text)) throw Error('Unsafe or empty query');
  return text;
};
const group = opt('group');
const stateDir = opt('state-dir');
const output = opt('output');
const graphitiUrl = opt('graphiti-endpoint');
const rerankUrl = opt('rerank-endpoint');
const holdoutFile = opt('holdout-file');
const expectedGroup = /^g_issue75_[a-zA-Z0-9_-]+$/;
if (!expectedGroup.test(group ?? '') || !path.isAbsolute(stateDir ?? '') ||
    !path.isAbsolute(output ?? '') || !graphitiUrl || !rerankUrl) {
  console.error('Usage: node collect-relevance-evidence.mjs --group g_issue75_test ' +
    '--state-dir /tmp/PRIVATE --graphiti-endpoint http://127.0.0.1:8766/mcp ' +
    '--rerank-endpoint http://127.0.0.1:8004/v1/rerank ' +
    '--output /tmp/issue75-rerank-observations.json [--holdout-file ABS_PATH]');
  process.exit(2);
}
if (holdoutFile && !path.isAbsolute(holdoutFile)) throw Error('Holdout path must be absolute');

const specPath = new URL('./benchmark-cases.json', import.meta.url);
const spec = JSON.parse(await readFile(specPath, 'utf8'));
const holdout = holdoutFile ? JSON.parse(await readFile(holdoutFile, 'utf8')) : null;
const holdoutQueries = holdout ? (Array.isArray(holdout) ? holdout : holdout.queries) : [];
if (!Array.isArray(holdoutQueries) || holdoutQueries.length > 20)
  throw Error('Holdout must provide 0-20 queries');

const queries = [
  ...spec.queries.map(q => ({ ...q, set: 'frozen' })),
  ...holdoutQueries.map(q => ({ ...q, set: 'holdout' })),
];
const ids = new Set();
for (const q of queries) {
  if (!/^[\w-]{2,60}$/.test(q.id ?? '') || ids.has(q.id) || q.group !== group)
    throw Error('Query must have unique ID and exact disposable group');
  ids.add(q.id);
  q.query = safeQuery(q.query);
}

const graphiti = new GraphitiMcp(localUrl(graphitiUrl), { timeoutMs: 3000 });
const rr = localUrl(rerankUrl);
const journal = new Journal(stateDir, group);
const rows = await journal.list();
const episodes = new Map(rows.filter(x => x.status === 'persisted' && x.remoteEpisodeUuid)
  .map(x => [x.remoteEpisodeUuid, { localId: x.uuid, kind: x.kind, sourceClass: x.evidenceClass }]));
const results = [];
for (const q of queries) {
  const t0 = performance.now();
  let raw;
  try {
    raw = await graphiti.call('search_memory_facts', {
      query: q.query, group_ids: [group], max_facts: 12,
    });
  } catch (e) {
    results.push({ case: q.id, set: q.set, query: q.query,
      error_class: 'graphiti_search', error: String(e.message).slice(0, 160) });
    continue;
  }
  const searchMs = Math.round((performance.now() - t0) * 1000) / 1000;
  if (!Array.isArray(raw?.facts)) throw Error('Unexpected Graphiti facts schema');
  let redacted = 0;
  const candidates = [];
  for (const f of raw.facts.slice(0, 12)) {
    const fact = safeText(f?.fact, 480);
    // Redact anything outside the bounded synthetic fact corpus.
    if (!fact || /@|(?:\/home\/|\/workspace\/|\/mnt\/|https?:\/\/)/i.test(fact)) {
      redacted++;
      continue;
    }
    const remote = Array.isArray(f.episodes) ? f.episodes.slice(0, 12) : [];
    const qualified = remote.map(id => episodes.get(id)).filter(Boolean);
    candidates.push({
      fact, returned_group: String(f.group_id ?? ''),
      graphiti_episode_ids: remote.filter(id => /^[0-9a-f-]{36}$/i.test(id)),
      matching_local_sources: qualified,
      lexical: lexicalSupport(q.query, fact),
    });
  }
  const t1 = performance.now();
  let rerank = { result_count: 0, error: null };
  try {
    const response = await fetch(rr, {
      method: 'POST',
      signal: AbortSignal.timeout(900),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'rerank', query: q.query,
        documents: candidates.map(x => x.fact), top_n: candidates.length }),
    });
    if (!response.ok) throw Error('reranker HTTP ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data.results)) throw Error('missing reranker results');
    const valid = new Set();
    for (const x of data.results) {
      if (!Number.isInteger(x.index) || x.index < 0 || x.index >= candidates.length ||
          valid.has(x.index)) continue;
      valid.add(x.index);
      const score = x.relevance_score ?? x.score;
      if (typeof score !== 'number' || !Number.isFinite(score)) continue;
      candidates[x.index].rerank_score = score;
      candidates[x.index].rerank_position = valid.size;
    }
    rerank.result_count = valid.size;
  } catch (e) {
    rerank.error = String(e.message).slice(0, 160);
  }
  const rerankMs = Math.round((performance.now() - t1) * 1000) / 1000;
  results.push({ case: q.id, set: q.set, query: q.query,
    expected_fixture_ids: q.set === 'frozen' ? q.expected : undefined,
    search_ms: searchMs, rerank_ms: rerankMs, redacted_count: redacted,
    raw_result_count: raw.facts.length, rerank, candidates });
}
const outputDoc = {
  schema: 'ghdev.issue75.reranker-observation.v1',
  captured_at: new Date().toISOString(),
  group, benchmark_version: spec.version,
  source: 'real native Graphiti search_memory_facts + existing loopback reranker',
  note: 'Raw scores are NOT probabilities and NOT calibrated relevance evidence; fact-ID adjudication is separate.',
  holdout: holdoutFile ? 'supplied' : 'not_supplied',
  journal_persisted_count: episodes.size, results,
};
await writeFile(output, JSON.stringify(outputDoc, null, 2) + '\n',
  { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({
  created: output, cases: results.length,
  search_errors: results.filter(x => x.error_class).length,
  rerank_errors: results.filter(x => x.rerank?.error).length,
  redacted: results.reduce((s, x) => s + (x.redacted_count ?? 0), 0),
}));
