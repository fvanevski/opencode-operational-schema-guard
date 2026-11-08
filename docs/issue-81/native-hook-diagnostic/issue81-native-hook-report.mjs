/** Summarize PRIVATE native callback timings. No raw prompts or model requests. */
import { readFileSync } from 'node:fs';

const [file, minimum = '20'] = process.argv.slice(2);
const min = Number(minimum);
if (!file || !Number.isInteger(min) || min < 1) {
  console.error('usage: node issue81-native-hook-report.mjs /private/context-hook.jsonl [minimum=20]');
  process.exit(2);
}
const input = readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
const rows = input.map((line, i) => {
  try { return JSON.parse(line); }
  catch { throw Error('Invalid JSONL record at line ' + (i + 1)); }
});
if (!rows.some(x => x.kind === 'setup' && x.registered_context_callbacks >= 1)) {
  throw Error('Missing instrumented stock-V2 Graphiti setup receipt');
}
const samples = rows.filter(x => x.kind === 'context');
for (const row of samples) {
  if (row.schema !== 'gh81.native-graphiti-context-hook.v1' ||
    !Number.isFinite(row.elapsed_ms) || row.elapsed_ms < 0 ||
    !Number.isInteger(row.seq) || !['returned', 'threw'].includes(row.outcome) ||
    typeof row.graphiti_block_after !== 'boolean') throw Error('Bad timing record');
}
function pct(values, q) {
  if (!values.length) return null;
  const a = [...values].sort((x, y) => x - y), at = (a.length - 1) * q;
  const l = Math.floor(at), h = Math.ceil(at);
  return Number((a[l] + (a[h] - a[l]) * (at - l)).toFixed(3));
}
const all = samples.map(x => x.elapsed_ms);
const injected = samples.filter(x => x.graphiti_block_after).map(x => x.elapsed_ms);
const without = samples.filter(x => !x.graphiti_block_after).map(x => x.elapsed_ms);
const threw = samples.filter(x => x.outcome === 'threw').length;
const out = {
  schema: 'gh81.native-graphiti-context-hook-summary.v1',
  method: 'process.hrtime.bigint immediately surrounding installed Graphiti context callback',
  n: all.length, injected_count: injected.length,
  no_injection_count: without.length, errors: threw,
  all: { p50_ms: pct(all, .5), p95_ms: pct(all, .95),
    max_ms: all.length ? Math.max(...all) : null, over_300_ms: all.filter(x => x > 300).length },
  injected: { n: injected.length, p50_ms: pct(injected, .5), p95_ms: pct(injected, .95) },
  no_injection: { n: without.length, p50_ms: pct(without, .5), p95_ms: pct(without, .95) },
  acceptance: all.length >= min && threw === 0 && pct(all, .95) <= 300
    ? 'PASS' : 'NOT_ESTABLISHED',
  interpretation: 'Callback execution duration, not Graphiti search wall or full multi-plugin context chain. All invocation outcomes included, never success-only.'
};
console.log(JSON.stringify(out, null, 2));
