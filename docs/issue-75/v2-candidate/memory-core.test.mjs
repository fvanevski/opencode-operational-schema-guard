import test from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import path from 'node:path';
import { safeText, selectUserDecision, selectCompletedTest, deterministicUUID,
  Journal, Memory, GraphitiMcp, makeCandidate, formatContext } from './memory-core.mjs';

test('selects user decisions rather than transcripts or secrets', () => {
  assert.equal(selectUserDecision('I prefer a small Graphiti integration with native hybrid search.').evidenceClass, 'user-stated');
  assert.equal(selectUserDecision('Show me the current weather.'), null);
  assert.equal(selectUserDecision('I prefer sending password=abc123 to the log.'), null);
  assert.equal(selectUserDecision('I decided to embed <private>secret</private> in the system.'), null);
  assert.equal(selectUserDecision('a'.repeat(601)), null);
});
test('tool-reported test outcomes require a completed successful test command and signal', () => {
  const e = { status: 'completed', input: { command: 'pytest -q' },
    result: { exitCode: 0, stdout: '27 passed in 0.5s' } };
  assert.equal(selectCompletedTest(e)?.evidenceClass, 'tool-reported');
  assert.equal(selectCompletedTest({ ...e, input: {command:'rtk pytest -q'} })?.evidenceClass, 'tool-reported');
  assert.equal(selectCompletedTest({ ...e, input: {command:'rtk bash -c echo'} }), null);
  assert.equal(selectCompletedTest({ ...e, input: {command:'rtk rm -rf /tmp/foo'} }), null);
  assert.equal(selectCompletedTest({ ...e, result: { output: {exit: 0, output:'1 passed'}, metadata: {exit: 0} } })?.evidenceClass, 'tool-reported');
  assert.equal(selectCompletedTest({ ...e, result: { output: {exit: 1, output:'1 passed'}, metadata: {exit: 1} } }), null);
  assert.equal(selectCompletedTest({ ...e, status: 'error' }), null);
  assert.equal(selectCompletedTest({ ...e, result: { ...e.result, exitCode: 1 } }), null);
  assert.equal(selectCompletedTest({ ...e, input: { command: 'rm -rf /tmp' } }), null);
  assert.equal(selectCompletedTest({ ...e, result: { ...e.result, stdout: 'PASSED with password=secret' } }), null);
});
test('stable candidate UUID and scoped group', () => {
  const selected = selectUserDecision('We decided to keep Graphiti memory separate from OpenViking summaries.');
  const a = makeCandidate('project-a', selected, { sessionID: 's1', time: '2026-10-01T00:00:00Z' });
  const b = makeCandidate('project-a', selected, { sessionID: 's2' });
  const c = makeCandidate('project-b', selected, { sessionID: 's1' });
  assert.equal(a.uuid, b.uuid);
  assert.notEqual(a.uuid, c.uuid);
  assert.match(a.uuid, /^[0-9a-f-]{36}$/);
  assert.equal(makeCandidate('../unsafe', selected, { sessionID: 's1' }), null);
});
async function sandbox(run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghdev-75-test-'));
  try { return await run(dir); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
test('legacy CLI reconcile-only reports pending without submitting under retained EX', () => sandbox(async dir => {
 const j=new Journal(dir,'alpha');
 const candidate=makeCandidate('alpha',selectUserDecision(
   'I want source-grounded Graphiti memories without an interactive model call.'),
   {sessionID:'ses_legacy_pending'});
 assert.equal(await j.stage(candidate),true);
 const args=[new URL('./memory-cli.mjs',import.meta.url).pathname,
   'reconcile-only','--group','alpha','--state-dir',dir,
   '--endpoint','http://127.0.0.1:8766/mcp'];
 let run=spawnSync(process.execPath,args,{encoding:'utf8',timeout:10000,
   env:{...process.env,GHDEV_MEMORY_POST_EXIT_LEASE:'admitted'}});
 assert.equal(run.status,4,run.stderr);
 assert.equal(JSON.parse(run.stdout).status,'work_remaining');
 assert.equal((await j.get(candidate.uuid)).status,'pending');
 run=spawnSync(process.execPath,args,{encoding:'utf8',timeout:10000,
   env:{...process.env,GHDEV_MEMORY_POST_EXIT_LEASE:''}});
 assert.notEqual(run.status,0);
 assert.match(run.stderr,/EX_POST_EXIT_ADMISSION_REQUIRED/);
}));
test('atomic journal stage dedupes repeated events and preserves states', () => sandbox(async dir => {
  const j = new Journal(dir, 'alpha');
  const c = makeCandidate('alpha', selectUserDecision('I want native Graphiti facts for durable choices.'),
    { sessionID: 's1' });
  assert.equal(await j.stage(c), true);
  assert.equal(await j.stage(c), false);
  assert.equal(await j.update(c.uuid, 'pending', 'submission_unknown'), true);
  assert.equal(await j.update(c.uuid, 'pending', 'queued'), false);
  assert.equal((await j.get(c.uuid)).status, 'submission_unknown');
  assert.equal((await j.list()).length, 1);
  assert.equal(await new Journal(dir, 'beta').get(c.uuid), null);
}));
test('legacy journal pages preserve all 501+ rows and admission-safe drain/reconcile', () => sandbox(async dir => {
  const j = new Journal(dir, 'alpha');
  const rows = [];
  for (let i = 0; i < 501; i++) {
    const c = makeCandidate('alpha', {
      kind: 'user_decision', evidenceClass: 'user-stated',
      assertion: 'Use the durable selection config for module ' + i + ' while preserving compatibility.'
    }, { sessionID: 's-' + i });
    rows.push(c);
  }
  assert.equal((await Promise.all(rows.map(x => j.stage(x)))).every(Boolean),true);
  await assert.rejects(j.list(), /use pages/);
  let count = 0, chunks = 0;
  for await (const page of j.pages({ pageSize: 64 })) {
    assert.ok(page.length <= 64);
    count += page.length; chunks++;
  }
  assert.equal(count,501);
  assert.ok(chunks > 1);
  await assert.rejects(async () => { for await (const page of j.pages({pageSize:501})) {} },
    /pageSize/);
  const calls = [];
  const graphiti = { call: async (name,args) => {
    calls.push({name,args});
    if (name === 'get_episodes') return {episodes:[]};
    if (name === 'add_memory') return {};
    return {facts:[]};
  }};
  const mem = new Memory({ journal:j, graphiti, group:'alpha' });
  assert.equal((await mem.drain()).length,1);
  assert.equal(calls.filter(x=>x.name==='add_memory').length,1);
  assert.deepEqual(await mem.reconcile(),[]);
  let queued = 0;
  for await (const page of j.pages()) queued += page.filter(r=>r.status==='queued').length;
  assert.equal(queued,1);
  assert.equal((await j.list(600)).length,501);
}));
test('ambiguous send is not replayed; status requires Graphiti episode readback', () => sandbox(async dir => {
  const j = new Journal(dir, 'alpha');
  const calls = [];
  let episodes = [];
  const remoteId = '87654321-1111-4111-a111-222222222222';
  const graphiti = { call: async (name, args) => {
    calls.push({ name, args });
    if (name === 'add_memory') throw Error('network timed out after sending');
    if (name === 'get_episodes') return { episodes };
    return {};
  } };
  const mem = new Memory({ journal: j, graphiti, group: 'alpha' });
  const c = await mem.stage(selectUserDecision('I decided to store memory with a stable episode UUID.'),
    { sessionID: 's1' });
  await mem.drain(); await mem.drain();
  const addCalls = calls.filter(x => x.name === 'add_memory');
  assert.equal(addCalls.length, 1);
  assert.match(addCalls[0].args.custom_extraction_instructions || '', /software|pipeline|service|artifact/i);
  assert.match(addCalls[0].args.custom_extraction_instructions || '', /Do NOT extract.*Source reference|opencode:/i);
  assert.equal((await j.get(c.uuid)).status, 'submission_unknown');
  assert.deepEqual(await mem.reconcile(), []);
  episodes = [{ uuid: remoteId, group_id: 'other', name: c.kind + ':' + c.uuid }];
  assert.deepEqual(await mem.reconcile(), []);
  episodes = [{ uuid: remoteId, group_id: 'alpha', name: c.kind + ':' + c.uuid }];
  assert.deepEqual(await mem.reconcile(), [c.uuid]);
  assert.equal((await j.get(c.uuid)).status, 'persisted');
  assert.equal((await j.get(c.uuid)).remoteEpisodeUuid, remoteId);
}));
test('queued does not count as persisted and native search rejects unattributed/wrong-group facts', () => sandbox(async dir => {
  const j = new Journal(dir, 'alpha');
  const c = makeCandidate('alpha', selectUserDecision('I prefer Graphiti to remember accepted design choices.'),
    { sessionID: 's1' });
  await j.stage(c);
  await j.update(c.uuid, 'pending', 'queued');
  const data = {
    facts: [
      { fact: 'Graphiti remembers accepted design choices', group_id: 'alpha', episodes: ['87654321-1111-4111-a111-222222222222'] },
      { fact: 'Other group only', group_id: 'beta', episodes: ['87654321-1111-4111-a111-222222222222'] },
      { fact: 'Unattributed assertion', group_id: 'alpha', episodes: ['00000000-0000-4000-a000-000000000000'] },
    ],
  };
  const graphiti = { call: async name => name === 'search_memory_facts' ? data : { nodes: [] } };
  const mem = new Memory({ journal: j, graphiti, group: 'alpha' });
  assert.deepEqual(await mem.search('Which accepted design choices were recorded?'), []);
  await j.update(c.uuid, 'queued', 'persisted', {remoteEpisodeUuid: '87654321-1111-4111-a111-222222222222'});
  const found = await mem.search('Which accepted design choices were recorded?');
  assert.equal(found.length, 1);
  assert.equal(found[0].evidenceClass, 'user-stated');
  assert.equal(found[0].source, c.sourceRef);
  assert.match(formatContext(found), /not instructions/);
}));
test('native MCP transport parses structured JSON or SSE and uses explicit group', async () => {
  const responses = [];
  const fetchImpl = async (_url, req) => {
    const input = JSON.parse(req.body);
    responses.push(input);
    if (input.method === 'initialize') {
      return { ok: true, headers: { get: k => k === 'mcp-session-id' ? 'local-session' : null },
        text: async () => JSON.stringify({ jsonrpc: '2.0', id: input.id, result: { capabilities: {} } }) };
    }
    return { ok: true, headers: { get: () => null },
      text: async () => 'event: message\ndata: ' + JSON.stringify({
        jsonrpc: '2.0', id: input.id, result: { structuredContent: { result: { facts: [] } } },
      }) + '\n\n' };
  };
  const client = new GraphitiMcp('http://127.0.0.1:8000/mcp/', { fetchImpl });
  assert.deepEqual(await client.call('search_memory_facts',
    { query: 'design choices', group_ids: ['alpha'] }), { facts: [] });
  assert.equal(responses.length, 2);
  assert.equal(responses[1].params.arguments.group_ids[0], 'alpha');
  assert.throws(() => new GraphitiMcp('http://0.0.0.0:8000/mcp/'), /loopback/);
});


test('native sourced recall may use facts 13-24 but not an out-of-bound remote result', () => sandbox(async dir => {
  const ids = Array.from({length: 25}, (_,i) =>
    '60000000-0000-4000-8000-' + String(i).padStart(12, '0'));
  const facts = ids.map((id,i) => ({
    fact: i===18 ? 'The Parquet archive retention pipeline stores verified manifests.' :
      'An unrelated weather observation at sample index ' + i + '.',
    group_id: 'alpha', episodes: [id],
  }));
  const calls = [], resolverRequests=[];
  const graphiti = { call: async (name, args) => {
    calls.push({name,args});
    if (name !== 'search_memory_facts') throw Error('unexpected Graphiti tool: '+name);
    return {facts};
  }};
  const resolver = async idsArg => {
    resolverRequests.push([...idsArg]);
    return idsArg.map(id=>({
      status:'persisted', group:'alpha', remoteEpisodeUuid:id,
      sourceRef:'opencode:ses-bounded:message:msg-'+id.slice(-12),
      evidenceClass:'tool-reported',
    }));
  };
  const mem = new Memory({journal:new Journal(dir,'alpha'),graphiti,group:'alpha',
    extraSourceResolver:resolver});
  const result = await mem.search('Which Parquet archive retention pipeline stores verified manifests?');
  assert.equal(calls.length,1);
  assert.equal(calls[0].args.max_facts,24,'Graphiti request must match candidate admission bound');
  assert.deepEqual(calls[0].args.group_ids,['alpha']);
  assert.equal(resolverRequests[0].length,24,'remote over-return must be bounded locally');
  assert.equal(resolverRequests[0].includes(ids[24]),false);
  assert.equal(result.length,1);
  assert.equal(result[0].source,
    'opencode:ses-bounded:message:msg-'+ids[18].slice(-12));
  assert.equal(result[0].evidenceClass,'tool-reported');
}));


test('source-correct fact at Graphiti result position 19 survives the 24-candidate bound when index route is also enabled', () => sandbox(async dir => {
  const ids=Array.from({length:25},(_,i)=>
    '70000000-0000-4000-8000-'+String(i).padStart(12,'0'));
  const facts=ids.map((id,i)=>({fact:i===18
    ?'The Parquet archive retention pipeline stores verified manifests.'
    :'An unrelated weather observation '+i+' in an unrelated region.',
    group_id:'alpha',episodes:[id]}));
  const allowed=ids[18],seen=[];
  const graphiti={call:async(name,args)=>{
    seen.push(name);
    if(name==='search_memory_facts')return {facts};
    if(name==='get_episodes')return {episodes:ids.slice(0,24).map(uuid=>({uuid,group_id:'alpha'}))};
    throw Error('unexpected call');
  }};
  const extraSourceResolver=async idsArg=>idsArg.map(id=>({status:'persisted',
    group:'alpha',remoteEpisodeUuid:id,
    sourceRef:'opencode:ses-test:message:msg-'+id.slice(-12),
    evidenceClass:'tool-reported'}));
  const mem=new Memory({journal:new Journal(dir,'alpha'),graphiti,group:'alpha',
    extraSourceResolver,curatedCandidateRetriever:async()=>[]});
  const result=await mem.search('Which Parquet archive retention pipeline stores verified manifests?');
  assert.equal(result.length,1);
  assert.equal(result[0].source,'opencode:ses-test:message:msg-'+allowed.slice(-12));
  assert.deepEqual(seen,['search_memory_facts'],
    'an empty positive curation inventory must not trigger optional remote proof');
}));


test('independent reranker retains bounded semantic-choice admission when no index is installed', () => sandbox(async dir => {
  const ids=['70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002'];
  const facts=[
    {fact:'React Flow chosen for backlog dependency visualization',group_id:'alpha',episodes:[ids[0]]},
    {fact:'Archive exporter requires a VMAF quality gate before replacement',group_id:'alpha',episodes:[ids[1]]},
  ];
  const graphiti={call:async(name)=>{
    assert.equal(name,'search_memory_facts');
    return {facts};
  }};
  const resolver=async idsArg=>idsArg.map(id=>({status:'persisted',group:'alpha',
    remoteEpisodeUuid:id,sourceRef:'opencode:ses-rerank:message:msg-'+id.slice(-12),
    evidenceClass:'tool-reported'}));
  const ranker=async (_q,items)=>{
    assert.equal(items.length,2,'all semantically scored Graphiti candidates retained');
    return new Map([[0,.91],[1,.22]]);
  };
  const mem=new Memory({journal:new Journal(dir,'alpha'),graphiti,group:'alpha',
    extraSourceResolver:resolver,ranker});
  const found=await mem.search('What did we settle on for interactive issue map?');
  assert.equal(found.length,1);
  assert.equal(found[0].fact,'React Flow chosen for backlog dependency visualization');
}));


test('shared Graphiti MCP client serializes overlapping native searches, not only calls within each search',async()=>{
  const client=new GraphitiMcp('http://127.0.0.1:8766/mcp');
  client.ensure=async()=>{};
  let active=0,maxActive=0,seen=[];
  client.rpc=async (method,params)=>{
    assert.equal(method,'tools/call');
    active++;
    maxActive=Math.max(maxActive,active);
    seen.push(params.name);
    try{
      await new Promise(resolve=>setTimeout(resolve,4));
      return {structuredContent:{result:params.name==='search_memory_facts'
        ?{facts:[]}:{episodes:[]}}};
    }finally{active--;}
  };
  // Both queries must have a qualifying indexed candidate to require an
  // episode-proof call; empty inventories now deliberately skip that call.
  const row={group:'alpha',
    remoteEpisodeUuid:'70000000-0000-4000-8000-000000000001',
    fact:'The Graphiti storage archive retention pipeline was configured active.',
    source:'opencode:ses-queue:message:msg-1',evidenceClass:'tool-reported'};
  const mem=new Memory({journal:{pages:async function*(){}},graphiti:client,
    group:'alpha',curatedCandidateRetriever:async()=>[row]});
  const [a,b]=await Promise.all([
    mem.search('Which archive retention pipeline is active?'),
    mem.search('Which Graphiti storage pipeline was configured?')
  ]);
  assert.deepEqual(a,[]);
  assert.deepEqual(b,[]);
  assert.equal(maxActive,1,'overlapping native prompt searches must not overlap MCP calls');
  assert.deepEqual(seen,['search_memory_facts','search_memory_facts','get_episodes','get_episodes'],
    'all remote requests must be serialized in FIFO call order');
});
test('failed shared Graphiti MCP call releases the queue without retry or unsafe fallback',async()=>{
  const client=new GraphitiMcp('http://127.0.0.1:8766/mcp');
  client.ensure=async()=>{};
  let active=0,maxActive=0,started=[];
  client.rpc=async (_method,params)=>{
    active++;
    maxActive=Math.max(active,maxActive);
    started.push(params.name);
    try {
      await new Promise(resolve=>setTimeout(resolve,2));
      if(params.name==='get_episodes')throw Error('remote transport outage');
      return {structuredContent:{result:{facts:[]}}};
    }finally {active--;}
  };
  const outcomes=await Promise.allSettled([
    client.call('search_memory_facts',{query:'one',group_ids:['alpha'],max_facts:24}),
    client.call('get_episodes',{group_ids:['alpha'],max_episodes:1000}),
    client.call('search_memory_facts',{query:'two',group_ids:['alpha'],max_facts:24}),
  ]);
  assert.deepEqual(outcomes.map(x=>x.status),['fulfilled','rejected','fulfilled']);
  assert.deepEqual(started,['search_memory_facts','get_episodes','search_memory_facts']);
  assert.equal(maxActive,1);
});


test('early curated retriever rejection is safely handled during a slower Graphiti search',()=> sandbox(async dir=>{
  const graphiti={call:async name=>{
    assert.equal(name,'search_memory_facts');
    await new Promise(resolve=>setTimeout(resolve,65));
    return {facts:[]};
  }};
  const mem=new Memory({journal:new Journal(dir,'alpha'),graphiti,group:'alpha',
    curatedCandidateRetriever:()=>Promise.reject(Error('corrupt local curation JSON'))});
  assert.deepEqual(await mem.search('Which archive retention service was configured?'),[]);
  // Node's default strict unhandled-rejection policy would fail this test
  // before search settles if the local rejection were handled only afterward.
}));
test('slow optional proof cannot delay an otherwise sourced legacy result',()=> sandbox(async dir=>{
  const id='70000000-0000-4000-8000-000000000101',names=[];
  const query='Which Parquet archive retention pipeline stores verified manifests?';
  const graphiti={call:async name=>{
    names.push(name);
    if(name==='search_memory_facts')return {facts:[{
      group_id:'alpha',episodes:[id],
      fact:'The Parquet archive retention pipeline stores verified manifests.'
    }]};
    if(name==='get_episodes'){
      await new Promise(resolve=>setTimeout(resolve,410));
      throw Error('optional proof transport timeout');
    }
    throw Error('unexpected Graphiti call');
  }};
  const extraSourceResolver=async ids=>ids.map(remoteEpisodeUuid=>({
    status:'persisted',group:'alpha',remoteEpisodeUuid,
    sourceRef:'opencode:ses-legacy:message:msg-101',evidenceClass:'tool-reported'}));
  const indexRows=[{fact:'The Parquet archive retention pipeline stores verified manifests.',
    group:'alpha',remoteEpisodeUuid:id,
    source:'opencode:ses-index:message:msg-102',evidenceClass:'tool-reported'}];
  const mem=new Memory({journal:new Journal(dir,'alpha'),graphiti,group:'alpha',
    extraSourceResolver,curatedCandidateRetriever:async()=>indexRows});
  const start=performance.now();
  const result=await mem.search(query);
  const elapsed=performance.now()-start;
  assert.equal(result.length,1);
  assert.equal(result[0].source,'opencode:ses-legacy:message:msg-101');
  assert.ok(elapsed<270,'legacy result must not wait for 410ms optional remote proof: '+elapsed);
  assert.deepEqual(names,['search_memory_facts','get_episodes']);
}));
test('optional remote proof is skipped when curated source inventory has no qualifying facts',()=>sandbox(async dir=>{
  const ids=['70000000-0000-4000-8000-000000000101'],called=[];
  const graphiti={call:async name=>{
    called.push(name);
    if(name==='search_memory_facts')return {facts:[{group_id:'alpha',episodes:ids,
      fact:'The Parquet archive retention pipeline stores verified manifests.'}]};
    throw Error('get_episodes must not be called with no qualifying index');
  }};
  const resolver=async idsArg=>idsArg.map(remoteEpisodeUuid=>({status:'persisted',
    group:'alpha',remoteEpisodeUuid,sourceRef:'opencode:ses-skip:message:msg-101',
    evidenceClass:'tool-reported'}));
  const mem=new Memory({journal:new Journal(dir,'alpha'),graphiti,group:'alpha',
    extraSourceResolver:resolver,curatedCandidateRetriever:async()=>[]});
  const items=await mem.search('Which Parquet archive retention pipeline stores verified manifests?');
  assert.equal(items.length,1);
  assert.deepEqual(called,['search_memory_facts']);
}));
test('reranker scores all 24 Graphiti facts before merging 12 indexed facts, only once',()=>sandbox(async dir=>{
  const ids=Array.from({length:24},(_,i)=>
    '70000000-0000-4000-8000-'+String(200+i).padStart(12,'0'));
  const indexedIDs=Array.from({length:12},(_,i)=>
    '70000000-0000-4000-8000-'+String(400+i).padStart(12,'0'));
  const target=ids[18],seen=[];
  const graphiti={call:async name=>{
    seen.push(name);
    if(name==='search_memory_facts')return {facts:ids.map((id,i)=>({
      fact:i===18?'React Flow chosen for backlog dependency visualization':
        'An unrelated weather observation '+i,
      group_id:'alpha',episodes:[id]
    }))};
    if(name==='get_episodes')return {episodes:indexedIDs.map(uuid=>({uuid,group_id:'alpha'}))};
    throw Error('unexpected tool');
  }};
  const resolver=async idsArg=>idsArg.map(remoteEpisodeUuid=>({status:'persisted',
    group:'alpha',remoteEpisodeUuid,
    sourceRef:'opencode:ses-graph:message:msg-'+remoteEpisodeUuid.slice(-12),
    evidenceClass:'tool-reported'}));
  const indexRows=indexedIDs.map((id,i)=>({
    group:'alpha',remoteEpisodeUuid:id,
    fact:'The interactive issue map uses a workspace graph to render dependency items '+i,
    source:'opencode:ses-index:message:msg-'+id.slice(-12),
    evidenceClass:'tool-reported',sourceContext:'An interactive issue map is shown on the workspace.'
  }));
  let rankerCalls=0;
  const ranker=async(_q,items)=>{
    rankerCalls++;
    assert.equal(items.length,24,'remote fact 19 must reach the reranker');
    assert.equal(items[18].fact,'React Flow chosen for backlog dependency visualization');
    return new Map(items.map((_,i)=>[i,i===18?.94:.03]));
  };
  const mem=new Memory({journal:new Journal(dir,'alpha'),graphiti,group:'alpha',
    extraSourceResolver:resolver,curatedCandidateRetriever:async()=>indexRows,ranker});
  const found=await mem.search('What did we settle on for interactive issue map?');
  assert.equal(rankerCalls,1,'do not issue a second expensive reranker call');
  assert.equal(found.length,1);
  assert.equal(found[0].source,'opencode:ses-graph:message:msg-'+target.slice(-12));
  assert.deepEqual(seen,['search_memory_facts','get_episodes']);
}));
