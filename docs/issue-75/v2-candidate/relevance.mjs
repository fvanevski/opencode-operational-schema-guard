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
/** Predeclared floor prevents low-relevance top-k being treated as evidence.
 * Lack of a functioning reranker -> lexical-only conservative admission.
 * Do not silently lower the floor to improve one benchmark. */
export async function relevanceFilter(query, candidates, ranker = null, { threshold = 0.70 } = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const bounded = candidates.slice(0, 12);
  let scores = null;
  if (ranker) {
    try { scores = await ranker(query, bounded); }
    catch { scores = null; }
  }
  const ranked = [];
  for (let i = 0; i < bounded.length; i++) {
    const item = bounded[i];
    const lexical = lexicalSupport(query, item.fact);
    const score = scores instanceof Map ? scores.get(i) : undefined;
    const accepted = typeof score === 'number' ? score >= threshold : admitFact(query, item.fact);
    if (accepted) ranked.push({ item, score: typeof score === 'number' ? score : lexical.score, index: i });
  }
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.map(x => x.item);
}
