// Issue #81 corrective evidence: replay the installed production recall logic
// (read-only) against the captured current Graphiti top-12 for nine frozen cases.
// Imports the actual installed module functions; no competing implementation.
import fs from 'node:fs';
import { safeText } from '/home/filip/.config/opencode/plugins/ghdev-graphiti-memory/docs/issue-75/v2-candidate/memory-core.mjs';
import { relevanceFilter, relevanceSignals } from '/home/filip/.config/opencode/plugins/ghdev-graphiti-memory/docs/issue-75/v2-candidate/relevance.mjs';
import { sourcedEpisodeResolver } from '/home/filip/.config/opencode/plugins/ghdev-graphiti-memory/docs/issue-78/v2-curator/sourced-recall.mjs';

const ROOT = '/home/filip/.local/state/ghdev-graphiti';
const GROUP = 'development-knowledge';
const WORKSPACE = '/workspace/mcp_servers/gh_mcp';
const PROJECT = 'gh_mcp';
const RANKER = null; // installed option: no rerankEndpoint => lexical/authority only

const raw = JSON.parse(fs.readFileSync('/tmp/opencode/issue81-corrective-evidence/private/raw/graphiti-probes-raw.json', 'utf8'));
const targets = JSON.parse(fs.readFileSync('/tmp/opencode/issue81-corrective-evidence/private/target-cases.json', 'utf8'));
const cases = [];
for (const [cid, c] of Object.entries(targets.positives)) cases.push({ cid, prompt: c.question, expected: c });
cases.push({ cid: 'N02', prompt: targets.N02.question, expected: targets.N02 });

const out = [];
for (const probe of raw) {
  const t = cases.find(c => c.cid === probe.case_id);
  if (!t) continue;
  const facts = probe.response?.result?.facts ?? [];
  const text = safeText(probe.prompt, 500);
  const wanted = new Set();
  for (const f of facts) for (const id of (Array.isArray(f?.episodes) ? f.episodes.slice(0, 12) : []))
    if (/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)) wanted.add(id);
  // Legacy journal (issue-75) at ROOT/GROUP is empty (0 rows) in production; verified separately.
  const byRemote = new Map();
  let extras = [];
  try { extras = await sourcedEpisodeResolver(ROOT, GROUP, WORKSPACE, PROJECT, [...wanted]); } catch { extras = []; }
  if (!Array.isArray(extras) || extras.length > 120) extras = [];
  const resolverEntries = [];
  for (const entry of extras) {
    if (entry?.status !== 'persisted' || entry.group !== GROUP ||
      !wanted.has(entry.remoteEpisodeUuid) || byRemote.has(entry.remoteEpisodeUuid) ||
      !['user-stated', 'tool-reported', 'assistant-reported'].includes(entry.evidenceClass) ||
      typeof entry.sourceRef !== 'string' || entry.sourceRef.length > 1200 ||
      !entry.sourceRef.startsWith('opencode:')) continue;
    byRemote.set(entry.remoteEpisodeUuid, entry);
    resolverEntries.push({ remoteEpisodeUuid: entry.remoteEpisodeUuid, sourceRef: entry.sourceRef, evidenceClass: entry.evidenceClass });
  }
  const candidates = [];
  const unique = new Set();
  for (const fact of facts) {
    if (fact.group_id && fact.group_id !== GROUP) continue;
    const assertion = safeText(fact.fact, 480);
    if (!assertion || unique.has(assertion.toLowerCase())) continue;
    const ids = Array.isArray(fact.episodes) ? fact.episodes : [];
    const resolvable = ids.slice(0, 12).map(id => byRemote.get(id)).find(Boolean);
    const entry = {
      fact_uuid: fact.uuid, name: fact.name, fact: assertion,
      episodes_first12: ids.slice(0, 12),
      resolvable_episode: resolvable ? resolvable.remoteEpisodeUuid : null,
      source_ref: resolvable ? resolvable.sourceRef : null,
      evidence_class: resolvable ? resolvable.evidenceClass : null,
      temporal: fact.invalid_at ? 'historical/superseded' : 'current state not independently verified',
      valid_at: fact.valid_at ?? null, invalid_at: fact.invalid_at ?? null,
    };
    if (!resolvable) { candidates.push({ ...entry, source_admitted: false }); continue; }
    unique.add(assertion.toLowerCase());
    candidates.push({ ...entry, source_admitted: true });
  }
  const ranked = await relevanceFilter(text, candidates.filter(c => c.source_admitted), RANKER);
  const budgeted = [];
  let budget = 1400;
  for (const e of ranked) {
    const cost = JSON.stringify(e).length;
    if (cost > budget) continue;
    budgeted.push(e); budget -= cost;
    if (budgeted.length >= 4) break;
  }
  const signalDetail = candidates.filter(c => c.source_admitted).map(c => {
    const s = relevanceSignals(text, c.fact, { hasRerankScore: false });
    return { fact_uuid: c.fact_uuid, fact: c.fact.slice(0, 120), eligible: s.eligible, priority: s.priority, overlap_count: s.overlap?.count ?? null, choiceOnly: s.choiceOnly };
  });
  out.push({
    case_id: probe.case_id,
    observed_at: probe.observed_at,
    prompt_sha256: undefined, // filled by shell step
    text_bounded: text.length,
    facts_returned: facts.length,
    wanted_episode_count: wanted.size,
    resolver_admitted: resolverEntries,
    candidates: candidates,
    signals: signalDetail,
    selected_facts: budgeted,
    expected_episode_in_top12: (t.expected.episode_uuid ? facts.some(f => (f.episodes || []).includes(t.expected.episode_uuid)) : null),
    expected_source_ref: t.expected.source_ref ?? null,
    expected_fact: t.expected.expected_fact ?? null,
  });
}
fs.writeFileSync('/tmp/opencode/issue81-corrective-evidence/private/recall-trace.json', JSON.stringify(out, null, 1));
console.log('cases traced:', out.length);
for (const c of out) {
  console.log(c.case_id, '| facts=', c.facts_returned, '| wanted=', c.wanted_episode_count,
    '| admitted=', c.resolver_admitted.length,
    '| selected=', c.selected_facts.map(f => f.fact.slice(0, 60)).join(' || ') || '(none)',
    '| expectedEpInTop12=', c.expected_episode_in_top12);
}
