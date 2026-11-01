#!/usr/bin/env node
/** Freeze cases in benchmark-cases.json. Results are evidence inputs, not generated claims. */
import fs from 'node:fs';
const [, , baselineFile, candidateFile] = process.argv;
if (!baselineFile || !candidateFile) {
  console.error('Usage: node benchmark-evaluate.mjs baseline-results.json candidate-results.json');
  process.exit(2);
}
const spec = JSON.parse(fs.readFileSync(new URL('./benchmark-cases.json', import.meta.url)));
const expected = new Map(spec.queries.map(x => [x.id, new Set(x.expected)]));
function evaluate(file) {
  const input = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(input.results) || input.results.length !== expected.size) throw Error('Result set must cover every frozen case');
  const ids = new Set();
  let tp = 0, fp = 0, fn = 0, caseCovered = 0, wrongGroup = 0, timeouts = 0, chars = 0;
  const latency = [];
  for (const r of input.results) {
    if (!expected.has(r.id) || ids.has(r.id) || !Array.isArray(r.returned)) throw Error('Unexpected/repeated case: ' + r.id);
    ids.add(r.id);
    const truth = expected.get(r.id);
    const found = new Set(r.returned);
    for (const fact of found) {
      if (!spec.seeds.some(x => x.id === fact)) throw Error('Unknown fact label: ' + fact);
      if (truth.has(fact)) tp++; else fp++;
    }
    for (const fact of truth) if (!found.has(fact)) fn++;
    if (truth.size ? [...truth].some(x => found.has(x)) : found.size === 0) caseCovered++;
    if (r.id === 'wrong-group' && found.size) wrongGroup += found.size;
    if (r.timed_out) timeouts++;
    if (!Number.isFinite(r.latency_ms) || r.latency_ms < 0) throw Error('Invalid latency_ms for ' + r.id);
    if (!Number.isInteger(r.context_chars) || r.context_chars < 0) throw Error('Invalid context_chars for ' + r.id);
    latency.push(r.latency_ms);
    chars += r.context_chars;
  }
  latency.sort((a, b) => a - b);
  const percentile = p => latency[Math.max(0, Math.ceil(p * latency.length) - 1)] ?? 0;
  return { label: input.label || file, covered_cases: caseCovered,
    precision: tp + fp ? tp / (tp + fp) : 1,
    recall: tp + fn ? tp / (tp + fn) : 1,
    true_positive: tp, false_positive: fp, false_negative: fn,
    wrong_group: wrongGroup, timeouts, context_chars_total: chars,
    p50_ms: percentile(0.5), p95_ms: percentile(0.95) };
}
const baseline = evaluate(baselineFile);
const candidate = evaluate(candidateFile);
console.log(JSON.stringify({ baseline, candidate,
  delta_covered_cases: candidate.covered_cases - baseline.covered_cases,
  delta_recall: candidate.recall - baseline.recall }, null, 2));
