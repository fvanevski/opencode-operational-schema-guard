/** Strict, bounded automatic-injection admission. On-demand Graphiti search
 * may return a broader set. This module never calls the extraction LLM. */
const COMMON = new Set('a an and are as at be been by can did do does for from has have how i in is it its of on or our should that the their them these this to was were what when where which who why will with we you your used use repo project please current does'.split(' '));
const words = value => [...new Set(String(value || '').toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || [])]
  .map(w => w.replace(/(?:ing|ed|s)$/,'')).filter(w => w.length > 2 && !COMMON.has(w));
export function lexicalSupport(query, fact) {
  const q = words(query), f = new Set(words(fact));
  if (!q.length) return { count: 0, score: 0 };
  const matches = q.filter(w => f.has(w)).length;
  return { count: matches, score: matches / q.length };
}
export function admitFact(query, fact) {
  const support = lexicalSupport(query, fact);
  return support.count >= 2 && support.score >= 0.34;
}
export function localReranker(url, { fetchImpl = fetch, timeoutMs = 160, model = 'rerank' } = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname))
    throw new Error('Reranker must use loopback HTTP');
  return async (query, candidates) => {
    if (!Array.isArray(candidates) || candidates.length > 12) throw new Error('Rerank candidate bound exceeded');
    const res = await fetchImpl(parsed.toString(), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ model, query, documents: candidates.map(x => x.fact), top_n: candidates.length }),
    });
    if (!res.ok) throw new Error('Reranker HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data.results)) throw new Error('Invalid reranker response');
    const out = new Map();
    for (const item of data.results) {
      const score = item.relevance_score ?? item.score;
      if (Number.isInteger(item.index) && item.index >= 0 && item.index < candidates.length &&
        typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1)
        out.set(item.index, score);
    }
    return out;
  };
}
/**
 * Retrieval scores from the pinned CPU cross-encoder rank *candidates*, and
 * are NOT calibrated relevance probabilities. The 2026-11-01 host evidence
 * has a supported paraphrase fact scoring 0.069 while a wrong-question
 * distractor scores 0.129: no universal absolute floor separates them.
 *
 * Automatic injection is intentionally stricter than on-demand search:
 *  - require topical evidence and explicit workspace/source qualification
 *    (the latter is enforced upstream in Memory.search);
 *  - use decision-vs-history cues to choose the right kind of observation;
 *  - inject at most one fact by default, rather than the whole native top-k;
 *  - abstain on unsupported topics, named entities and reranker outages.
 * Generic cues below describe temporal intent, not benchmark-specific facts.
 * These heuristics are provisional and require independent host holdout.
 */
const DECISION_INTENT = /\b(?:settle(?:d)? on|decid(?:e|ed)|chos(?:e|en)|choos(?:e|ing)|select(?:ed)?|pick(?:ed)?|agreed (?:to|on)|prefer(?:red)?)\b/i;
// "before" alone is not historical: "before the quality gate runs"
// expresses a dependency, not an earlier technology choice.
const HISTORICAL_INTENT = /\b(?:original(?:ly)?|previous(?:ly)?|prior|formerly|used to|histor(?:y|ical)|earlier|first|replaced|switched from)\b|\b(?:use|used|had|chosen)\s+before\b|\bbefore\s+(?:chang\w*|switch\w*|migrat\w*|replac\w*|adopt\w*)\b/i;
const DIRECT_DECISION = /\b(?:chos(?:e|en)|decid(?:e|ed)|select(?:ed)?|picked|settled|prefer(?:red)?|adopt(?:ed)?)\b/i;
const HISTORICAL_STATEMENT = /\b(?:original(?:ly)?|previous(?:ly)?|prior|formerly|used to|replac(?:e|ed) (?:by|with)|switched (?:from|to)|then)\b/i;
const INTENT_TERMS = new Set('settle decided decide chosen choose select selected pick picked agreed prefer preferred original originally before previous previously formerly historical history earlier first'.split(' '));
function namedQueryTerms(query) {
  // Keep mid-question proper names/acronyms as hard topic constraints. This
  // avoids asserting facts about named software absent from the local group.
  return [...String(query).matchAll(/\b[A-Z][A-Za-z0-9_-]{2,}\b/g)]
    .filter(match => match.index !== 0 && !['Our', 'We', 'The'].includes(match[0]))
    .map(match => match[0].toLowerCase());
}
export function relevanceSignals(query, fact, { hasRerankScore = false } = {}) {
  const content = safeFact(fact);
  const overlap = lexicalSupport(query, content);
  const names = namedQueryTerms(query);
  if (!content || names.some(name => !content.toLowerCase().includes(name)))
    return { eligible: false, priority: 0, overlap };
  const historical = HISTORICAL_INTENT.test(query) && HISTORICAL_STATEMENT.test(content);
  const directDecision = DECISION_INTENT.test(query) &&
    DIRECT_DECISION.test(content) && !HISTORICAL_STATEMENT.test(content);
  const topicTerms = words(query).filter(term => !INTENT_TERMS.has(term));
  const topical = overlap.count >= 2;
  // Temporal queries can reference a historical record without the same
  // words (e.g. original toolkit vs formerly used UI library).
  const qualifiedHistory = historical && overlap.count >= 1;
  // A weak paraphrase may have no literal overlap. Only the independent
  // reranker may support a direct-choice candidate in that case; never
  // fabricate a "semantic match" from regexes alone.
  const qualifiedChoice = directDecision && hasRerankScore && topicTerms.length >= 2;
  return { eligible: topical || qualifiedHistory || qualifiedChoice,
    priority: historical || directDecision ? 1 : 0, overlap };
}
function safeFact(value) { return typeof value === 'string' ? value.trim() : ''; }
export async function relevanceFilter(query, candidates, ranker = null, { maxSelected = 1 } = {}) {
  if (!Array.isArray(candidates) || !candidates.length || !Number.isInteger(maxSelected) ||
      maxSelected < 1 || maxSelected > 4) return [];
  const bounded = candidates.slice(0, 12);
  let scores = null;
  if (ranker) {
    try {
      const response = await ranker(query, bounded);
      if (response instanceof Map) scores = response;
    } catch { /* Degrade to lexical evidence only, not unfiltered top-k. */ }
  }
  const admitted = [];
  for (let i = 0; i < bounded.length; i++) {
    const item = bounded[i];
    const score = scores?.get(i);
    const validScore = typeof score === 'number' && Number.isFinite(score) &&
      score >= 0 && score <= 1;
    const signals = relevanceSignals(query, item.fact,
      { hasRerankScore: validScore });
    if (!signals.eligible) continue;
    admitted.push({ item, index: i, priority: signals.priority,
      rankScore: validScore ? score : null, lexical: signals.overlap });
  }
  admitted.sort((a, b) => b.priority - a.priority ||
    (a.rankScore !== null && b.rankScore !== null ? b.rankScore - a.rankScore : 0) ||
    b.lexical.count - a.lexical.count || b.lexical.score - a.lexical.score ||
    a.index - b.index);
  return admitted.slice(0, maxSelected).map(x => x.item);
}
