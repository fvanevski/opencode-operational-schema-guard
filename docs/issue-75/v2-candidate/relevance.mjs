/** Strict, bounded automatic-injection admission. On-demand Graphiti search
 * may return a broader set. This module never calls the extraction LLM. */
const COMMON = new Set('a an and are as at be been by can did do does for from has have how i in is it its of on or our should that the their them these this to was were what when where which who why will with we you your used use repo project please current does'.split(' '));
// Keep exact numeric identifiers (e.g. Issue #75) and match common e-dropping
// gerunds (closing/close, using/use) without treating a generated suffix form
// as a second independent query term. Do not turn fuzzy stems into authority.
function tokenGroups(value) {
  const groups = new Map();
  // Give Issue-75, Issue #75 and Issue 75 the same lexical identity.
  // The mandatory exact-ID check below still controls scope separately.
  const raw = String(value || '').toLowerCase()
    .replace(ISSUE_REFERENCE, (_match, id) => 'issue ' + id)
    .match(/[a-z0-9][a-z0-9-]{2,}|\b\d{2,}\b/g) || [];
  for (const word of raw) {
    const stem = word.replace(/(?:ing|ed|s)$/,'');
    if ((stem.length < 3 && !/^\d{2,}$/.test(stem)) || COMMON.has(stem)) continue;
    if (!groups.has(stem)) groups.set(stem, new Set());
    groups.get(stem).add(stem);
    if (word.endsWith('ing') && /^[a-z]+$/.test(word))
      groups.get(stem).add(stem + 'e');
  }
  return groups;
}
const words = value => [...tokenGroups(value).keys()];
export function lexicalSupport(query, fact) {
  const q = tokenGroups(query), f = new Set([...tokenGroups(fact).values()]
    .flatMap(forms => [...forms]));
  if (!q.size) return { count: 0, score: 0 };
  const matches = [...q.values()]
    .filter(forms => [...forms].some(term => f.has(term))).length;
  return { count: matches, score: matches / q.size };
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
    if (!Array.isArray(candidates) || candidates.length > MAX_AUTOMATIC_CANDIDATES) throw new Error('Rerank candidate bound exceeded');
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
// "original media" names a source file, not a historical decision.
const HISTORICAL_STATEMENT = /\b(?:originally|previously|prior to|formerly|used to|replac(?:e|ed) (?:by|with)|switched (?:from|to))\b/i;
const INTENT_TERMS = new Set('settle decided decide chosen choose select selected pick picked agreed prefer preferred original originally before previous previously formerly historical history earlier first'.split(' '));
// The same syntax drives identity extraction, removal from topic terms, and
// exemption from named-entity matching. Otherwise Issue-7 vs Issue 7 can
// either evade the scope guard or be rejected despite an exact ID match.
const ISSUE_REFERENCE = /\bissues?\s*[-#]?\s*(\d+)\b/gi;
const SENTENCE_INTERROGATIVES = new Set(
  ['What', 'When', 'Where', 'Who', 'Why', 'Which', 'How']);
// Bound the candidate set identically in Graphiti search and both selector
// paths. The 300 ms native context allowance remains the controlling timeout.
const MAX_AUTOMATIC_CANDIDATES = 24;
// An opaque identifier shared by query and fact can qualify a contextual
// acronym (e.g. an interface name), but never a different named product.
// This is not a substitute for the issue/number identity fences below.
function opaqueIdentifiers(text) {
  return new Set(String(text).toLowerCase()
    .match(/\b[a-z][a-z0-9]*(?:[_-][a-z0-9]+)+\b/g) || []);
}
function satisfiesNamedTerms(query, fact, names, overlap) {
  const content = fact.toLowerCase();
  const identifierParts = new Set([...opaqueIdentifiers(fact)]
    .flatMap(id => id.split(/[_-]/)));
  const missing = names.filter(name => {
    if (content.includes(name)) return false;
    // A product's *DB suffix may be abbreviated in a structured
    // environment/config identifier: FalkorDB -> GRAPHITI_FALKOR_PORT.
    // Requiring an identifier component avoids ordinary-word false aliases.
    if (name.endsWith('db') && name.length >= 7 &&
        identifierParts.has(name.slice(0, -2))) return false;
    return true;
  });
  if (!missing.length) return true;
  if (names.length !== 1 || missing.length !== 1 ||
      !/^[a-z]{2,4}$/.test(missing[0]) ||
      !new RegExp('\\b' + missing[0].toUpperCase() + '\\b').test(query))
    return false;
  const identifiers = opaqueIdentifiers(fact);
  const shared = [...opaqueIdentifiers(query)].filter(id => identifiers.has(id));
  // Never waive an acronym based on generic topic tokens alone. Two shared
  // exact opaque identifiers plus the normal topical threshold are required.
  return shared.length >= 2 && overlap.count >= 2 && overlap.score >= 0.30;
}
function namedQueryTerms(query) {
  // Preserve proper-name constraints, but issue labels have their own exact
  // scope check and must not become spelling-dependent proper names.
  // A question word capitalized solely because it begins a later sentence
  // is not a named entity (e.g. "...? When ..."). Do NOT exempt other
  // sentence-initial names or relax issue/number/topic evidence fences.
  const text = stripIssueReferences(query);
  return [...text.matchAll(/\b[A-Z][A-Za-z0-9_-]{2,}\b/g)]
    .filter(match => match.index !== 0 && !['Our', 'We', 'The'].includes(match[0]) &&
      !(SENTENCE_INTERROGATIVES.has(match[0]) &&
        /[.!?]\s+$/.test(text.slice(0, match.index))))
    .map(match => match[0].toLowerCase());
}
function issueReferences(value) {
  // Match Issue #7, Issue 7 and issue-7 identically. Bare numbers (pass
  // counts, versions) cannot satisfy a requested issue identity.
  return new Set([...String(value).matchAll(ISSUE_REFERENCE)]
    .map(match => match[1].replace(/^0+(?=\d)/, '')));
}
function stripIssueReferences(value) {
  return String(value).replace(ISSUE_REFERENCE, ' ');
}
export function relevanceSignals(query, fact, { hasRerankScore = false } = {}) {
  const content = safeFact(fact);
  const overlap = lexicalSupport(query, content);
  const names = namedQueryTerms(query);
  // Match Issue #N against the fact's Issue #N reference, never against
  // incidental counts (e.g. "Issue 70 had 75 passing tests").
  const requestedIssues = issueReferences(query);
  const factIssues = issueReferences(content);
  // Preserve the earlier general two-or-more digit qualifier, while the
  // issue-specific check also covers one-digit issue numbers.
  const requestedNumbers = new Set(String(query).match(/\b\d{2,}\b/g) || []);
  const factNumbers = new Set(content.match(/\b\d{2,}\b/g) || []);
  if (!content || !satisfiesNamedTerms(query, content, names, overlap) ||
      [...requestedIssues].some(id => !factIssues.has(id)) ||
      [...requestedNumbers].some(number => !factNumbers.has(number)))
    return { eligible: false, priority: 0, overlap };
  // Issue identity is one strong qualifier, not the whole relevance signal.
  // An explicit Issue #N query requires at least one OTHER topical match.
  // Apply this to every admission path, including history and reranker.
  const independentTopic = !requestedIssues.size ||
    lexicalSupport(stripIssueReferences(query), stripIssueReferences(content)).count >= 1;
  const historical = HISTORICAL_INTENT.test(query) && HISTORICAL_STATEMENT.test(content);
  const directDecision = DECISION_INTENT.test(query) &&
    DIRECT_DECISION.test(content) && !HISTORICAL_STATEMENT.test(content);
  const topicTerms = words(query).filter(term => !INTENT_TERMS.has(term));
  const topical = overlap.count >= 2 && independentTopic;
  // Temporal queries can reference a historical record without the same
  // words (e.g. original toolkit vs formerly used UI library).
  const qualifiedHistory = historical && overlap.count >= 1 && independentTopic;
  // A weak paraphrase may have no literal overlap. Only the independent
  // reranker may support a direct-choice candidate in that case; never
  // fabricate a "semantic match" from regexes alone. An explicitly named
  // Issue #N still requires independent topic evidence.
  const qualifiedChoice = directDecision && hasRerankScore &&
    topicTerms.length >= 2 && independentTopic;
  return { eligible: topical || qualifiedHistory || qualifiedChoice,
    choiceOnly: qualifiedChoice && !topical && !qualifiedHistory,
    priority: historical || directDecision ? 1 : 0, overlap };
}
function safeFact(value) { return typeof value === 'string' ? value.trim() : ''; }
// A response-type distinction, not a named benchmark/episode preference.
// Do not prefer a fact about routing when the question asks for a port, or
// a bare state/count over a mechanism when the question asks "why".
export function answerTypeSupport(query,fact) {
  const q=String(query),f=String(fact);
  if(/\b(?:which|what)\s+(?:\w+\s+){0,2}port\b|\bon which .*port\b|\bport\s+(?:does|is)\b/i.test(q))
    return /\bport\b|\b\d{4,5}\b/i.test(f) ? 1:0;
  if(/^\s*why\b/i.test(q))
    return /\b(?:because|due to|via|per-group|clone[sd]?|routes?|maps?|so that|rather than|instead of|configured to)\b/i.test(f) ? 1:0;
  // When asked what a source-control change *did*, prefer a description
  // of the modification to an operational record that merely mentions the
  // commit. This is a response-type signal only: it cannot admit a fact that
  // fails the existing source, identity or topical gates.
  const effectQuery=/\b(?:what|which|how)\b.{0,160}\b(?:commit|revision|patch|changeset)\b.{0,160}\b(?:chang(?:e|ed|es)|modif(?:y|ied)|fix(?:es|ed)?|updat(?:e|ed)|add(?:ed)?|remov(?:e|ed))\b|\b(?:what|which|how)\b.{0,160}\b(?:chang(?:e|ed|es)|modif(?:y|ied)|fix(?:es|ed)?|updat(?:e|ed))\b.{0,160}\b(?:commit|revision|patch|changeset)\b/i;
  if(effectQuery.test(q)) {
    // A Git command may contain global -C directory options. Its output can
    // echo an accurate subject, but the command record is not itself evidence
    // describing what that commit changed. Check this *before* change verbs
    // such as "add" or quoted subject lines.
    const gitOperation=/\bgit\s+(?:-C\s+(?:"[^"\r\n]+"|'[^'\r\n]+'|\S+)\s+)*(?:worktree|checkout|rev-parse|switch|fetch|clone|status)\b/i;
    const isProcedure=gitOperation.test(f) ||
      /\bworktree\s+(?:add|setup|creation|checkout|remove|prune|list|move|repair)\b/i.test(f) ||
      /\bchecking\s+out\s+(?:a\s+)?(?:commit|revision)\b/i.test(f);
    // Conventional short-SHA-prefixed subjects describe the commit itself,
    // including subjects whose imperative verb is outside the ordinary
    // change-verb lexicon ("reject", "guard", "prevent", etc.).
    const commitSubject=/\b[0-9a-f]{7,40}\s+(?:feat|fix|test|docs|refactor|perf|ci|build|chore|revert|style)(?:\([^) \r\n]{1,80}\))?!?:\s+\S/i;
    const describesChange=commitSubject.test(f) ||
      /\b(?:fix(?:es|ed)?|chang(?:e|ed|es)|modif(?:y|ied)|updat(?:e|ed)|add(?:ed)?|remov(?:e|ed)|refactor(?:s|ed)?|correct(?:s|ed)?|introduc(?:e|ed|es)|replac(?:e|ed|es)|commit[- ]subject|commit message)\b/i.test(f);
    return describesChange && !isProcedure ? 1 : 0;
  }
  return 0;
}
function linkedSourceSignals(query,item,hasRerankScore) {
  const direct=relevanceSignals(query,item.fact,{hasRerankScore});
  if(direct.eligible||typeof item.sourceContext!=='string')return direct;
  // Do not allow a companion excerpt to satisfy a missing exact Issue or
  // numeric identity in the assertion itself.
  const requestedIssues=issueReferences(query),factIssues=issueReferences(item.fact);
  const nums=String(query).match(/\b\d{2,}\b/g)||[];
  if([...requestedIssues].some(id=>!factIssues.has(id))||
    nums.some(n=>!new Set(item.fact.match(/\b\d{2,}\b/g)||[]).has(n))||
    lexicalSupport(query,item.fact).count<2)return direct;
  const linked=safeFact(item.sourceContext);
  if(!linked||linked.length>500)return direct;
  const contextual=relevanceSignals(query,item.fact+' '+linked,{hasRerankScore});
  return contextual.eligible
    ?{...contextual,overlap:direct.overlap,sourceContextQualified:true}
    :direct;
}
/**
 * Exact-source candidate shortlist for an already authorized retrieval set.
 * This is a query-dependent bound, never an authority upgrade. Evaluate the
 * same mandatory Issue, numeric, named-entity and topical fences before
 * imposing the 24-candidate model-facing bound. Source/group/remote checks
 * belong to the caller, before entries arrive here.
 */
export function shortlistQualifiedCandidates(query, candidates, { limit = 24 } = {}) {
  if (!Array.isArray(candidates) || !Number.isInteger(limit) ||
      limit < 1 || limit > MAX_AUTOMATIC_CANDIDATES) return [];
  const qualified = [];
  for (let index = 0; index < candidates.length; index++) {
    const item = candidates[index];
    if (!item || typeof item.fact !== 'string') continue;
    const signals = linkedSourceSignals(query, item, false);
    if (!signals.eligible || signals.choiceOnly) continue;
    // Source excerpts only disambiguate an exact lexical tie. They never
    // overrule missing numeric/Issue identities or create an injected fact.
    const context = typeof item.sourceContext === 'string' ? item.sourceContext : '';
    const linked = context ? lexicalSupport(query, context) : {count:0,score:0};
    qualified.push({ item, index, priority: signals.priority,
      answerType:answerTypeSupport(query,item.fact), overlap:signals.overlap,
      sourceContextOverlap:linked });
  }
  qualified.sort((a,b) =>
    b.priority-a.priority || b.answerType-a.answerType ||
    b.overlap.count-a.overlap.count || b.overlap.score-a.overlap.score ||
    b.sourceContextOverlap.count-a.sourceContextOverlap.count ||
    b.sourceContextOverlap.score-a.sourceContextOverlap.score ||
    a.index-b.index);
  return qualified.slice(0,limit).map(x=>x.item);
}
/**
 * Diagnostic only: explain actual automatic-recall admission gates.
 * Mirrors relevanceSignals/linkedSourceSignals, does not modify selection.
 * Output contains only booleans/counts/reason codes, no private source text.
 */
export function explainRelevanceAdmission(query,item,{hasRerankScore=false}={}) {
  if(typeof query!=='string'||!item||typeof item.fact!=='string')
    return {admitted:false,reason:'INVALID_INPUT'};
  const direct=relevanceSignals(query,item.fact,{hasRerankScore});
  const linked=typeof item.sourceContext==='string'&&item.sourceContext.length>0
    ?safeFact(item.sourceContext):'';
  const analysis=(text)=>{
    const overlap=lexicalSupport(query,text);
    const names=namedQueryTerms(query);
    const namedMatch=satisfiesNamedTerms(query,text,names,overlap);
    const requestedIssues=issueReferences(query),factIssues=issueReferences(text);
    const issueMatch=[...requestedIssues].every(id=>factIssues.has(id));
    const qNumbers=new Set(query.match(/\b\d{2,}\b/g)||[]);
    const fNumbers=new Set(text.match(/\b\d{2,}\b/g)||[]);
    const numericMatch=[...qNumbers].every(n=>fNumbers.has(n));
    const independentTopic=!requestedIssues.size||
      lexicalSupport(stripIssueReferences(query),stripIssueReferences(text)).count>=1;
    const historical=HISTORICAL_INTENT.test(query)&&HISTORICAL_STATEMENT.test(text);
    const directDecision=DECISION_INTENT.test(query)&&DIRECT_DECISION.test(text)&&
      !HISTORICAL_STATEMENT.test(text);
    const topical=overlap.count>=2&&independentTopic;
    const qualifiedHistory=historical&&overlap.count>=1&&independentTopic;
    const choice=directDecision&&hasRerankScore&&
      words(query).filter(term=>!INTENT_TERMS.has(term)).length>=2&&independentTopic;
    const failures=[];
    if(!text)failures.push('EMPTY_ASSERTION');
    if(!namedMatch)failures.push('NAMED_IDENTITY');
    if(!issueMatch)failures.push('ISSUE_IDENTITY');
    if(!numericMatch)failures.push('NUMERIC_IDENTITY');
    if(!independentTopic)failures.push('INDEPENDENT_TOPIC');
    if(!topical&&!qualifiedHistory&&!choice)failures.push('NO_SUPPORTED_ADMISSION_PATH');
    return {overlap,requestedNamedCount:names.length,namedMatch,
      issueMatch,numericMatch,independentTopic,topical,qualifiedHistory,
      choice,eligible:relevanceSignals(query,text,{hasRerankScore}).eligible,
      failures};
  };
  const contextual=linked?analysis(item.fact+' '+linked):null;
  const effective=linkedSourceSignals(query,item,hasRerankScore);
  const fact=analysis(item.fact);
  const directOverlap=lexicalSupport(query,item.fact);
  const linkedFallbackBlocked=Boolean(linked)&&!direct.eligible&&(
    [...issueReferences(query)].some(id=>!issueReferences(item.fact).has(id))||
    (query.match(/\b\d{2,}\b/g)||[]).some(n=>
      !(item.fact.match(/\b\d{2,}\b/g)||[]).includes(n))||
    directOverlap.count<2);
  return {admitted:effective.eligible,linkedUsed:Boolean(effective.sourceContextQualified),
    direct:fact,linked:contextual,linkedFallbackBlocked,
    scoreFloor034Applied:false,sourceContextRequiredNativeSourceAuthority:true};
}
// Common admission/ranking path for the final one-fact selector and the
// optional pre-merge reranker. Keep all original provenance-independent
// guards, semantic-choice background test and 24-document reranker limit.
async function rankedCandidates(query, candidates, ranker = null, cachedScores = null,
  cachedBackground = null) {
  if (!Array.isArray(candidates) || !candidates.length)
    return { ranked: [], scoreByItem: new Map() };
  const bounded = candidates.slice(0, MAX_AUTOMATIC_CANDIDATES);
  let scores = null;
  if (cachedScores instanceof Map) {
    scores = new Map();
    for (let i = 0; i < bounded.length; i++) {
      if (cachedScores.has(bounded[i])) scores.set(i, cachedScores.get(bounded[i]));
    }
  } else if (ranker) {
    try {
      const response = await ranker(query, bounded);
      if (response instanceof Map) scores = response;
    } catch { /* Degrade to lexical evidence only, never unfiltered top-k. */ }
  }
  const scoreByItem = new Map();
  for (let i = 0; i < bounded.length; i++) {
    const score = scores?.get(i);
    if (typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1)
      scoreByItem.set(bounded[i], score);
  }
  const otherScores = bounded.map((item, i) => {
    const score = scoreByItem.get(item);
    return !DIRECT_DECISION.test(item.fact) && !HISTORICAL_STATEMENT.test(item.fact) &&
      typeof score === 'number' ? score : null;
  }).filter(score => score !== null);
  const background = cachedBackground !== null ? cachedBackground :
    (otherScores.length ? Math.max(...otherScores) : null);
  const admitted = [];
  for (let i = 0; i < bounded.length; i++) {
    const item = bounded[i], score = scoreByItem.get(item);
    const validScore = scoreByItem.has(item);
    const signals = linkedSourceSignals(query, item, validScore);
    if (!signals.eligible) continue;
    if (signals.choiceOnly && (background === null || !validScore || score <= 2 * background))
      continue;
    admitted.push({ item, index: i, priority: signals.priority,
      answerType: answerTypeSupport(query,item.fact),
      rankScore: validScore ? score : null, lexical: signals.overlap });
  }
  admitted.sort((a, b) => b.priority - a.priority ||
    b.answerType - a.answerType ||
    (a.rankScore !== null && b.rankScore !== null ? b.rankScore - a.rankScore : 0) ||
    b.lexical.count - a.lexical.count || b.lexical.score - a.lexical.score ||
    a.index - b.index);
  return { ranked: admitted.map(x=>x.item), scoreByItem, background };
}
/**
 * Rerank the complete 24-fact Graphiti pool before any shared candidate
 * merge. Returned scores are bound to the original candidate objects and
 * reused by the final selector, so no second HTTP reranker call is needed.
 * This does not authorize any fact that fails normal relevance admission.
 */
export async function rankQualifiedForMerge(query, candidates, ranker) {
  return rankedCandidates(query,candidates,ranker);
}
export async function relevanceFilter(query, candidates, ranker = null,
  { maxSelected = 1, cachedScores = null, cachedBackground = null } = {}) {
  if (!Array.isArray(candidates) || !candidates.length || !Number.isInteger(maxSelected) ||
      maxSelected < 1 || maxSelected > 4) return [];
  const { ranked } = await rankedCandidates(query,candidates,ranker,cachedScores,cachedBackground);
  return ranked.slice(0,maxSelected);
}
