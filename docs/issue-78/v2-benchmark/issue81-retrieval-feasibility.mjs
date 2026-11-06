#!/usr/bin/env node
/** Issue #81 read-only feasibility probe. Raw stdout is PRIVATE evidence. */
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { GraphitiMcp } from '../../issue-75/v2-candidate/memory-core.mjs';
import { relevanceFilter, relevanceSignals } from '../../issue-75/v2-candidate/relevance.mjs';
import { ReviewStore } from '../v2-curator/core.mjs';
import { sourcedEpisodeResolver } from '../v2-curator/sourced-recall.mjs';

const REQUIRED = ['input', 'root', 'group', 'workspace', 'project', 'endpoint'];
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const COMMON=new Set('how why what which where when does do did is are the a an in at for through on with this that each its it keep actually really from current was were use used runs and even though while your my our group data service server host changed'.split(' '));
function parseArgs(argv) {
  const obj={};
  if(argv.length%2)throw Error('Expected --key value pairs');
  for(let i=0;i<argv.length;i+=2){
    if(!argv[i].startsWith('--'))throw Error('Expected --key');
    obj[argv[i].slice(2)]=argv[i+1];
  }
  for(const key of REQUIRED)if(!obj[key])throw Error('Missing --'+key);
  if(!obj.root.startsWith('/')||!obj.workspace.startsWith('/'))throw Error('Absolute scope paths required');
  if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/mcp\/?$/.test(obj.endpoint))
    throw Error('Authenticated loopback Graphiti MCP URL required');
  return obj;
}
export function reducedQuery(text) {
  const tokens=String(text).match(/[a-z0-9][a-z0-9_-]{2,}/gi)||[];
  const kept=[];
  for(const token of tokens){
    const x=token.toLowerCase();
    if(!COMMON.has(x)&&!kept.includes(x))kept.push(x);
  }
  return kept.slice(0,18).join(' ');
}
async function curated(o) {
  const now=performance.now();
  const store=new ReviewStore(o.root,o.group);
  const page=await store.list({limit:500});
  if(page.has_more)throw Error('Curated review scan exceeds verified bound of 500');
  const records=page.items.filter(r=>r.state==='persisted'&&r.group===o.group&&
    r.workspace===o.workspace&&r.project===o.project&&
    UUID.test(r.remote_episode_uuid||'')&&r.facts?.length===1);
  const ids=[...new Set(records.map(r=>r.remote_episode_uuid))];
  if(ids.length>288)throw Error('Episode anchor bound exceeded');
  const mapped=await sourcedEpisodeResolver(o.root,o.group,o.workspace,o.project,ids);
  const byId=new Map(mapped.map(s=>[s.remoteEpisodeUuid,s]));
  const candidates=records.flatMap(r=>{
    const s=byId.get(r.remote_episode_uuid),f=r.facts[0];
    return s&&f.evidence_class===s.evidenceClass&&typeof f.assertion==='string'
      ?[{fact:f.assertion,source:s.sourceRef,evidenceClass:s.evidenceClass,
         episode_uuid:s.remoteEpisodeUuid,origin:'curated-positive-index'}]:[];
  });
  return {candidates,sourceMap:byId,record_count:page.total,
    verified_sources:mapped.length,elapsed_ms:performance.now()-now};
}
function rank(query,items) {
  return items.map(item=>({...item,signal:relevanceSignals(query,item.fact)}))
    .filter(x=>x.signal.eligible).sort((a,b)=>
      b.signal.priority-a.signal.priority||
      b.signal.overlap.count-a.signal.overlap.count||
      b.signal.overlap.score-a.signal.overlap.score||
      a.fact.localeCompare(b.fact))
    .map(({signal,...item})=>item);
}
async function graphiti(mcp,query,group,limit,map) {
  const begin=performance.now();
  const response=await mcp.call('search_memory_facts',{
    query,group_ids:[group],max_facts:limit});
  if(!Array.isArray(response?.facts))throw Error('Graphiti facts unavailable');
  const raw=response.facts;
  const selected=raw.flatMap(f=>{
    if(f.group_id&&f.group_id!==group||typeof f.fact!=='string')return [];
    const s=(Array.isArray(f.episodes)?f.episodes:[]).map(id=>map.get(id)).find(Boolean);
    return s?[{fact:f.fact,source:s.sourceRef,evidenceClass:s.evidenceClass,
      episode_uuid:s.remoteEpisodeUuid,origin:'Graphiti-source-index'}]:[];
  });
  return {raw_count:raw.length,episodes:raw.flatMap(f=>f.episodes||[]),
    candidates:selected,elapsed_ms:performance.now()-begin};
}
function distinct(items) {
  return items.filter((x,i)=>items.findIndex(y=>y.source===x.source&&y.fact===x.fact)===i);
}
async function choice(query,items,expected) {
  const selected=await relevanceFilter(query,items,null);
  return {source:selected[0]?.source||null,episode:selected[0]?.episode_uuid||null,
    expected_selected:expected?selected.some(x=>x.episode_uuid===expected):null,
    count:selected.length};
}
async function main() {
  const o=parseArgs(process.argv.slice(2));
  const input=JSON.parse(await readFile(o.input,'utf8'));
  if(!Array.isArray(input.cases)||!input.cases.length||input.cases.length>24)
    throw Error('Expected cases array of length 1..24');
  for(const c of input.cases)if(typeof c.case_id!=='string'||typeof c.question!=='string'||
    !c.question.trim()||c.question.length>500||
    c.expected_episode_uuid&&!UUID.test(c.expected_episode_uuid))
    throw Error('Invalid case');
  const local=await curated(o),mcp=new GraphitiMcp(o.endpoint),results=[];
  for(const c of input.cases){
    const original=await graphiti(mcp,c.question,o.group,24,local.sourceMap);
    const shortened=reducedQuery(c.question);
    const alt=shortened&&shortened!==c.question.toLowerCase()
      ?await graphiti(mcp,shortened,o.group,12,local.sourceMap):null;
    const localRanked=rank(c.question,local.candidates);
    const union=distinct([...original.candidates,...(alt?.candidates||[])]).slice(0,24);
    const blended=distinct([...original.candidates.slice(0,18),...localRanked.slice(0,6)]);
    const expected=c.expected_episode_uuid||null;
    results.push({case_id:c.case_id,expected_episode_uuid:expected,
      original_count:original.raw_count,original_ms:original.elapsed_ms,
      original_contains_expected:expected?original.episodes.includes(expected):null,
      alternate_query:shortened,alternate_count:alt?.raw_count??null,
      alternate_ms:alt?.elapsed_ms??null,
      alternate_contains_expected:expected&&alt?alt.episodes.includes(expected):null,
      local_contains_expected:expected?localRanked.some(x=>x.episode_uuid===expected):null,
      local_ranked_top8:localRanked.slice(0,8),
      original:await choice(c.question,original.candidates,expected),
      union:await choice(c.question,union,expected),
      local_only:await choice(c.question,localRanked.slice(0,24),expected),
      blended:await choice(c.question,blended,expected)});
  }
  process.stdout.write(JSON.stringify({schema:'issue81-readonly-probe.v1',
    evidence_class:'CURRENT_SNAPSHOT_DIAGNOSTIC_NOT_NATIVE_ACCEPTANCE',
    curator_records_scanned:local.record_count,curator_sources_verified:local.verified_sources,
    curator_scan_ms:local.elapsed_ms,scope:o.group,results},null,2)+'\n');
}
main().catch(error=>{process.stderr.write('PROBE_BLOCKED: '+error.message+'\n');process.exitCode=2;});
