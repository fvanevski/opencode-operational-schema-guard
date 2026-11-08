#!/usr/bin/env node
/**
 * Issue #81: fingerprint-only source-exact comparison of pre-existing paired
 * strict/semantic shadow-replay outputs against externally frozen labels.
 * Offline. Does not retrieve sources, judge relevance, create Graphiti state,
 * or upgrade source-match into human precision/native acceptance.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HEX = /^[0-9a-f]{64}$/;
const ROLES = new Set(['positive','negative']);
const MODES = ['strict','semantic'];
const CLASSES = new Set(['user-stated','tool-reported','assistant-reported']);
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
function requireThat(ok, why) { if (!ok) throw Error('SCORECARD_INVALID:' + why); }
function validCase(c) {
  requireThat(isObject(c) && typeof c.case_id === 'string' && /^[SN]\d{2}$/.test(c.case_id), 'case_id');
  requireThat(ROLES.has(c.role) && HEX.test(c.query_sha256 || ''), 'case_role_or_query');
  if (c.role === 'positive') {
    requireThat(c.case_id.startsWith('S') && HEX.test(c.expected_source_sha256 || ''), 'positive_source');
  } else {
    requireThat(c.case_id.startsWith('N') && c.expected_source_sha256 == null, 'negative_source');
  }
  requireThat(c.tags == null || Array.isArray(c.tags) && c.tags.every(x => typeof x === 'string' && /^[a-z][a-z0-9_-]{0,40}$/.test(x)), 'tags');
}
function validReplay(p, manifest, c) {
  requireThat(isObject(p) && p.kind === 'shadow-replay-not-native-hook', 'replay_kind');
  requireThat(p.group === manifest.group && p.workspace === manifest.workspace && p.project === manifest.project, 'source_scope');
  requireThat(p.query_sha256 === c.query_sha256 && p.search_depth === 24, 'replay_query_or_depth');
  requireThat(p.context_wait_ms === 'NOT_MEASURED', 'shadow_not_native');
  requireThat(isObject(p.modes), 'modes');
  for (const mode of MODES) {
    const m = p.modes[mode];
    requireThat(isObject(m) && Number.isInteger(m.count) && m.count >= 0 && m.count <= 5 && Array.isArray(m.source_fingerprints) && m.source_fingerprints.length === m.count, 'mode_count_' + mode);
    requireThat(typeof m.elapsed_ms_shadow === 'number' && Number.isFinite(m.elapsed_ms_shadow) && m.elapsed_ms_shadow >= 0, 'mode_timing_' + mode);
    for (const item of m.source_fingerprints) {
      requireThat(isObject(item) && HEX.test(item.fact_sha256 || '') && HEX.test(item.source_sha256 || '') && CLASSES.has(item.evidence_class) && typeof item.temporal === 'string' && item.temporal.length > 0, 'mode_fingerprint_' + mode);
    }
  }
}
const rate = (n, d) => d ? Number((n / d).toFixed(6)) : null;
function quantile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.ceil(p * sorted.length) - 1].toFixed(3));
}
export function scoreSemanticReplays(manifest, batch) {
  requireThat(isObject(manifest) && manifest.schema === 'issue81-frozen-source-scorecard.v1', 'manifest_schema');
  requireThat(HEX.test(manifest.frozen_roster_sha256 || '') && typeof manifest.group === 'string' && manifest.group.length > 0 && typeof manifest.workspace === 'string' && path.isAbsolute(manifest.workspace) && typeof manifest.project === 'string' && manifest.project.length > 0, 'roster_identity_scope');
  requireThat(Array.isArray(manifest.cases) && manifest.cases.length > 0 && manifest.cases.length <= 64, 'manifest_case_count');
  requireThat(isObject(batch) && batch.schema === 'issue81-shadow-replay-batch.v1' && Array.isArray(batch.cases), 'batch_schema');
  const expected = new Map(), observed = new Map();
  for (const c of manifest.cases) { validCase(c); requireThat(!expected.has(c.case_id), 'duplicate_manifest_case'); expected.set(c.case_id, c); }
  for (const r of batch.cases) {
    requireThat(isObject(r) && typeof r.case_id === 'string' && isObject(r.replay) && !observed.has(r.case_id), 'batch_entry');
    requireThat(expected.has(r.case_id), 'unregistered_case'); observed.set(r.case_id, r.replay);
  }
  requireThat(expected.size === observed.size, 'incomplete_batch');
  const rows=[];
  for (const c of manifest.cases) {
    const p=observed.get(c.case_id);
    validReplay(p,manifest,c);
    const row={case_id:c.case_id,role:c.role,tags:c.tags || [],query_sha256:c.query_sha256,
      expected_source_sha256:c.role==='positive'?c.expected_source_sha256:null,modes:{}};
    for (const mode of MODES) {
      const m=p.modes[mode], sources=m.source_fingerprints.map(x=>x.source_sha256);
      const ix=c.role==='positive'?sources.indexOf(c.expected_source_sha256):-1;
      row.modes[mode]={presented_count:m.count,expected_source_in_context:c.role==='positive'?ix!==-1:null,
        expected_source_at_first:c.role==='positive'?ix===0:null,
        expected_source_rank:c.role==='positive'&&ix!==-1?ix+1:null,
        source_sha256:sources, fact_sha256:m.source_fingerprints.map(x=>x.fact_sha256),
        evidence_class:m.source_fingerprints.map(x=>x.evidence_class),
        temporal:m.source_fingerprints.map(x=>x.temporal),elapsed_ms_shadow:m.elapsed_ms_shadow};
    }
    row.source_exact_regression = c.role==='positive' && row.modes.strict.expected_source_in_context && !row.modes.semantic.expected_source_in_context;
    rows.push(row);
  }
  const positives=rows.filter(x=>x.role==='positive'),negatives=rows.filter(x=>x.role==='negative');
  const stats={};
  for (const mode of MODES) {
    const matched=positives.filter(x=>x.modes[mode].expected_source_in_context).length;
    const atFirst=positives.filter(x=>x.modes[mode].expected_source_at_first).length;
    const nonemptyNeg=negatives.filter(x=>x.modes[mode].presented_count>0).length;
    const timings=rows.map(x=>x.modes[mode].elapsed_ms_shadow);
    stats[mode]={positive_source_exact_count:matched,positive_count:positives.length,positive_source_exact_rate:rate(matched,positives.length),
      positive_expected_at_first_count:atFirst,negative_nonempty_count:nonemptyNeg,negative_count:negatives.length,
      negative_presented_observation_count:negatives.reduce((n,x)=>n+x.modes[mode].presented_count,0),
      total_presented_observation_count:rows.reduce((n,x)=>n+x.modes[mode].presented_count,0),
      shadow_latency_n:timings.length,shadow_latency_p50_ms:quantile(timings,.5),shadow_latency_p95_ms:quantile(timings,.95),
      shadow_latency_max_ms:Number(Math.max(...timings).toFixed(3))};
  }
  return {schema:'issue81-semantic-source-scorecard.v1',evidence_class:'FINGERPRINT_ONLY_SHADOW_REPLAY_NOT_NATIVE_ACCEPTANCE',
    frozen_roster_sha256:manifest.frozen_roster_sha256,group:manifest.group,workspace:manifest.workspace,project:manifest.project,
    case_count:rows.length,positive_count:positives.length,negative_count:negatives.length,
    paired_comparison:stats,regressed_strict_source_cases:rows.filter(x=>x.source_exact_regression).map(x=>x.case_id),
    rows, restrictions:{human_precision:'UNVERIFIED_NOT_MEASURED',fact_usefulness:'UNVERIFIED_NOT_MEASURED',
      source_membership:'PROVEN_ONLY_BY_UPSTREAM_REPLAY_NOT_BY_THIS_SCORER',
      negative_privacy_or_group_authority:'REQUIRES_SEPARATE_SOURCE_PROOF',
      native_context_hook_p95:'NOT_MEASURED',native_assembled_model_request:'NOT_OBSERVED',
      answer_utility:'NOT_MEASURED'}};
}
async function main(argv) {
  requireThat(argv.length===4 && argv[0]==='--manifest' && argv[2]==='--batch', 'usage: --manifest PRIVATE_JSON --batch PRIVATE_JSON');
  const manifest=JSON.parse(await readFile(argv[1],'utf8'));
  const batch=JSON.parse(await readFile(argv[3],'utf8'));
  process.stdout.write(JSON.stringify(scoreSemanticReplays(manifest,batch),null,2)+'\n');
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(e=>{process.stderr.write((e?.message||String(e))+'\n');process.exitCode=2;});
}
