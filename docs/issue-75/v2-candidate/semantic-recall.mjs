/** Semantic-first presentation policy. Inputs have ALREADY passed the caller's
 * source, group, remote episode and privacy validation. Native Graphiti rank
 * is retrieval evidence, not a calibrated probability or authority label.
 * The original strict relevance.mjs remains an unchanged benchmark control. */
import { lexicalSupport, answerTypeSupport, toolQuestionEcho } from './relevance.mjs';

const SOURCE = /^opencode:[^\s]+:(?:message|tool):/;
const EVIDENCE = new Set(['user-stated', 'tool-reported', 'assistant-reported']);
const ISSUE = /\bissues?\s*[-#]?\s*(\d+)\b/gi;
const TOKENS = text => new Set(String(text).toLowerCase().match(/[a-z0-9]{3,}/g) || []);
function issueIds(text) { return new Set([...String(text).matchAll(ISSUE)].map(x => x[1].replace(/^0+(?=\d)/, ''))); }
function identitySignal(query, fact) {
  const requested = issueIds(query), observed = issueIds(fact);
  if (!requested.size) return 0;
  if ([...requested].some(id => observed.has(id))) return 0.8;
  return observed.size ? -1.1 : -0.25; // absence is not a contradiction
}
function rankSignal(query, item) {
  const overlap = lexicalSupport(query, item.fact);
  const contextual = typeof item.sourceContext === 'string'
    ? lexicalSupport(query, item.sourceContext) : {count:0};
  const native = item.recallOrigin === 'graphiti' && Number.isInteger(item.nativeRank)
    && item.nativeRank >= 0 && item.nativeRank < 24;
  // A top native semantic hit remains eligible despite zero/one lexical match.
  // Indexed-only candidates have no semantic rank, so must earn ranking support
  // from their assertion or authenticated source excerpt before remote proof.
  const prior = native ? 2 / (1 + item.nativeRank * 0.42) : 0;
  const score = prior + Math.min(overlap.count, 5) * 0.48 +
    overlap.score * 0.75 + Math.min(contextual.count, 3) * 0.12 +
    answerTypeSupport(query, item.fact) * 0.5 + identitySignal(query, item.fact);
  return { score, overlap:overlap.count, native };
}
function valid(item, query) {
  return item && typeof item.fact === 'string' && item.fact.trim().length >= 4 &&
    typeof item.source === 'string' && SOURCE.test(item.source) &&
    EVIDENCE.has(item.evidenceClass) && !toolQuestionEcho(query, item);
}
/** Query-local shortlist for source-index records which lack native semantic
 * rank. This is NOT source authorization: caller still proves remote UUID
 * membership before adding any selected indexed fact to the model context. */
export function preselectIndexedContext(query, rows, {limit=24}={}) {
  if (!Array.isArray(rows) || !Number.isInteger(limit) || limit<1 || limit>24) return [];
  return rows.map((item,index) => ({item,index}))
    .filter(x => valid(x.item,query))
    .map(x => ({...x, signal:rankSignal(query,x.item)}))
    .filter(x => x.signal.overlap>0 ||
      (typeof x.item.sourceContext==='string' &&
       lexicalSupport(query,x.item.sourceContext).count>0))
    .sort((a,b)=>b.signal.score-a.signal.score || a.index-b.index)
    .slice(0,limit).map(x=>x.item);
}
/** Diversify confirmed candidates and enforce the model-facing character
 * budget. Exact identifiers are ranking/disambiguation signals, not vetoes.
 * No sourceContext, group ID, episode ID or internal score leaks to the model. */
export function selectSemanticContext(query, items, {maxSelected=5,maxChars=1400}={}) {
  if (typeof query!=='string' || !Array.isArray(items) ||
      !Number.isInteger(maxSelected) || maxSelected<1 || maxSelected>5 ||
      !Number.isInteger(maxChars) || maxChars<100 || maxChars>8000) return [];
  const ranked=items.map((item,index)=>({item,index}))
    .filter(x=>valid(x.item,query))
    .map(x=>({...x, signal:rankSignal(query,x.item)}))
    .filter(x=>x.signal.native || x.signal.overlap>0 ||
      (typeof x.item.sourceContext==='string' &&
       lexicalSupport(query,x.item.sourceContext).count>0))
    .sort((a,b)=>b.signal.score-a.signal.score || a.index-b.index);
  if (!ranked.length) return [];
  const anchored=ranked.some(x=>x.signal.overlap>0);
  const cap=anchored?maxSelected:Math.min(maxSelected,1);
  const best=ranked[0].signal.score;
  const selected=[], fingerprints=[], seen=new Set();
  let budget=maxChars;
  for (const {item,signal} of ranked) {
    if (selected.length>=cap) break;
    // A relative score threshold controls low-quality context expansion, but
    // never suppresses the highest ranked confirmed observation by itself.
    if (selected.length && signal.score < Math.max(0.15,best*0.33)) break;
    const normalized=item.fact.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    if (seen.has(normalized)) continue;
    const fingerprint=TOKENS(normalized);
    const nearDuplicate=fingerprints.some(other=>{
      const intersection=[...fingerprint].filter(x=>other.has(x)).length;
      return intersection/Math.max(1,new Set([...fingerprint,...other]).size)>=0.8;
    });
    if (nearDuplicate) continue;
    const publicFact={fact:item.fact,source:item.source,evidenceClass:item.evidenceClass,
      temporal:item.temporal || 'current state not independently verified'};
    if (item.validAt != null) publicFact.validAt=item.validAt;
    if (item.invalidAt != null) publicFact.invalidAt=item.invalidAt;
    const cost=JSON.stringify(publicFact).length;
    if (cost>budget) continue;
    selected.push(publicFact); seen.add(normalized); fingerprints.push(fingerprint);
    budget-=cost;
  }
  return selected;
}
