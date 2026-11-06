import test from 'node:test';
import assert from 'node:assert/strict';
import { admitFact, lexicalSupport, relevanceSignals, relevanceFilter, localReranker, shortlistQualifiedCandidates, explainRelevanceAdmission, answerTypeSupport } from './relevance.mjs';
test('lexical floor rejects unrelated facts but admits direct multi-term evidence', async () => {
  assert.equal(admitFact('Which library is used for backlog dependency visualization?',
    'React Flow chosen for backlog dependency visualization'), true);
  assert.equal(admitFact('What is the weather in Tokyo?',
    'React Flow chosen for backlog dependency visualization'), false);
  assert.equal(admitFact('Does this repo use Vue for the dashboard?',
    'The backlog visualization uses React Flow'), false);
  assert.ok(lexicalSupport('The export quality gate', 'export quality gate').count >= 2);
});
test('reranker admits semantic paraphrase but rejects top-k unrelated material', async () => {
  const c = [{fact:'React Flow chosen for backlog dependency visualization'},
    {fact:'Archive exporter requires a VMAF quality gate before replacement'}];
  const ranker = async () => new Map([[0, .91],[1,.22]]);
  const selected = await relevanceFilter('What did we settle on for interactive issue map?', c, ranker);
  assert.deepEqual(selected, [c[0]]);
  // Raw cross-encoder scores are not calibrated relevance probabilities.
  const lowScore = await relevanceFilter('What did we settle on for interactive issue map?', c,
    async () => new Map([[0,.069],[1,.021]]));
  assert.deepEqual(lowScore, [c[0]]);
  const unsupported = await relevanceFilter('Does this repository use MongoDB for storage?', c,
    async () => new Map([[0,.91],[1,.88]]));
  assert.deepEqual(unsupported, []);
  const unrelatedDecision = [
    {fact:'PostgreSQL was selected for inventory transaction storage.'},
    {fact:'The product archive uses a quality gate for media exports.'},
  ];
  assert.deepEqual(await relevanceFilter('What did we settle on for retry backoff strategy?',
    unrelatedDecision, async () => new Map([[0,.015],[1,.012]])), []);
});
test('unavailable reranker fails closed to conservative CPU filter, not all top-k', async () => {
  const c = [{fact:'React Flow chosen for backlog dependency visualization'},
    {fact:'The weather in Tokyo is warm'}];
  assert.deepEqual(await relevanceFilter('backlog dependency visualization', c,
    async () => {throw new Error('timeout');}), [c[0]]);
});
test('generic historical vs current-choice evidence wins without project-specific names', async () => {
  const current = {fact:'PostgreSQL was selected for inventory transaction storage.'};
  const old = {fact:'SQLite was originally used for inventory transaction storage, then replaced by PostgreSQL.'};
  const items = [old, current];
  assert.deepEqual(await relevanceFilter('What did we settle on for inventory transaction storage?',
    items, async () => new Map([[0,.19],[1,.12]])), [current]);
  assert.deepEqual(await relevanceFilter('What was originally used for inventory transaction storage?',
    items, async () => new Map([[0,.24],[1,.25]])), [old]);
  assert.deepEqual(await relevanceFilter('What did we decide?', items,
    async () => new Map([[0,.9],[1,.8]])), []);
  assert.equal(relevanceSignals('Does this service use Redis for its cache?', current.fact).eligible, false);
  const causal = relevanceSignals('What must complete before the exporter swaps the media?',
    'The archive exporter depends on a quality gate before replacing the source.');
  assert.equal(causal.eligible, true);
  assert.equal(causal.priority, 0, 'Causal before is not a historical-state preference');
});
test('without an independent reranker, semantic-only choice retrieval abstains', async () => {
  const item = {fact:'PostgreSQL was chosen as the preferred transactional database.'};
  assert.deepEqual(await relevanceFilter('What did we settle on for the inventory indexing engine?', [item]), []);
  assert.deepEqual(await relevanceFilter('What is the weather?', [item],
    async () => new Map([[0,.99]])), []);
});
test('fresh Issue 75 closure question admits sourced closure fact but not another numbered issue', async () => {
  const query = 'What was our agreed evidence requirement before closing Issue #75?';
  const supported = { fact: 'Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.' };
  const wrongIssue = { fact: 'Issue 70 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.' };
  const unrelated = { fact: 'Unrelated deployment notes mention graph quality and a new scheduler.' };
  assert.ok(lexicalSupport(query, supported.fact).count >= 3,
    'closing/closes plus exact Issue 75 must be distinct lexical evidence');
  assert.equal(relevanceSignals(query, supported.fact).eligible, true);
  assert.equal(relevanceSignals(query, wrongIssue.fact).eligible, false,
    'numeric issue identifier is a mandatory hard qualifier');
  assert.deepEqual(await relevanceFilter(query, [wrongIssue, unrelated, supported]), [supported]);
  assert.deepEqual(await relevanceFilter(query, [wrongIssue, unrelated]), []);
});

test('same-issue wrong-topic fact is not relevant just because issue and number match', async () => {
  const query = 'What was our agreed evidence requirement before closing Issue #75?';
  const wrongTopic = { fact: 'Issue 75 uses React Flow for backlog visualization.' };
  assert.equal(lexicalSupport(query, wrongTopic.fact).count, 2);
  assert.equal(relevanceSignals(query, wrongTopic.fact).eligible, false);
  assert.deepEqual(await relevanceFilter(query, [wrongTopic]), []);
  // Optional reranking cannot bypass the independent topical qualifier.
  assert.deepEqual(await relevanceFilter(query, [wrongTopic],
    async () => new Map([[0, 0.99]])), []);
  const choiceQuery = 'What did we decide was the evidence requirement before closing Issue #75?';
  const wrongChoice = { fact: 'Issue 75 selected React Flow for dashboard visualization.' };
  assert.deepEqual(await relevanceFilter(choiceQuery, [wrongChoice],
    async () => new Map([[0, 0.99]])), []);
  const historyQuery = 'What was previously agreed before closing Issue #75?';
  const wrongHistory = { fact: 'Issue 75 originally used React Flow for visualization.' };
  assert.deepEqual(await relevanceFilter(historyQuery, [wrongHistory]), []);
});
test('numeric issue references cannot be satisfied by unrelated pass counts', async () => {
  const query = 'What was our agreed evidence requirement before closing Issue #75?';
  const falseCollision = { fact: 'Issue 70 closes only after 75 passing tests.' };
  assert.equal(relevanceSignals(query, falseCollision.fact).eligible, false);
  assert.deepEqual(await relevanceFilter(query, [falseCollision]), []);
  const supported = { fact: 'Issue 75 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.' };
  assert.deepEqual(await relevanceFilter(query, [falseCollision, supported]), [supported]);
});
test('single-digit issue numbers retain exact issue-qualified scope', async () => {
  const query = 'What was our agreed evidence requirement before closing Issue #7?';
  const wrong = { fact: 'Issue 8 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.' };
  const supported = { fact: 'Issue 7 closes only after a fresh OpenCode session demonstrates source-attributed Graphiti persistence and recall.' };
  assert.equal(relevanceSignals(query, wrong.fact).eligible, false);
  assert.equal(relevanceSignals(query, supported.fact).eligible, true);
  assert.deepEqual(await relevanceFilter(query, [wrong, supported]), [supported]);
  assert.deepEqual(await relevanceFilter(query, [wrong]), []);
});

test('hyphenated issue references preserve exact scope and independent topic evidence', async () => {
  const query = 'What was our agreed evidence requirement before closing issue-7?';
  const wrong = { fact: 'Issue-8 closes only after an evidence review.' };
  const correct = { fact: 'Issue 7 closes only after an evidence review.' };
  assert.equal(relevanceSignals(query, wrong.fact).eligible, false);
  assert.deepEqual(await relevanceFilter(query, [wrong]), []);
  assert.equal(relevanceSignals(query, correct.fact).eligible, true);
  assert.deepEqual(await relevanceFilter(query, [wrong, correct]), [correct]);

  // Mixed issue spellings must be equivalent, even with proper-name casing.
  const capitalized = 'What was the evidence requirement for Issue-75?';
  const supported = { fact: 'Issue #75 closes after the required evidence is reviewed.' };
  const other = { fact: 'Issue-70 closes after the required evidence is reviewed.' };
  assert.equal(relevanceSignals(capitalized, supported.fact).eligible, true);
  assert.equal(relevanceSignals(capitalized, other.fact).eligible, false);
  assert.deepEqual(await relevanceFilter(capitalized, [other, supported]), [supported]);

  // Correct identifier alone does not authorize an unrelated observation.
  const offTopic = { fact: 'Issue-7 uses React Flow for the issue dashboard.' };
  assert.equal(relevanceSignals(query, offTopic.fact).eligible, false);
  assert.deepEqual(await relevanceFilter(query, [offTopic]), []);
});

test('reranker uses loopback only, validates bounded score and request', async () => {
  let body;
  const scorer=localReranker('http://127.0.0.1:8004/v1/rerank',{
    fetchImpl: async (_url, opts) => {
      body = JSON.parse(opts.body);
      return {ok:true,json:async()=>({results:[{index:0,relevance_score:0.94}]})};
    }
  });
  const scores=await scorer('example',[{fact:'a sample memory'}]);
  assert.equal(scores.get(0),0.94);
  assert.equal(body.documents.length,1);
  assert.throws(()=>localReranker('http://0.0.0.0:8004/v1/rerank'),/loopback/);
});

test('fresh native recall: later-sentence question word is not a mandatory proper name', async () => {
  // Reproduces Issue #81 P1's admission root cause without publishing the
  // private operator-frozen query or modifying its acceptance labels.
  const query = 'What is the close criterion for Issue #75? When is fresh native recall required?';
  const correct = {fact:
    'Issue 75 closes only after a fresh native session demonstrates source-attributed Graphiti recall.'};
  const wrongIssue = {fact:
    'Issue 70 closes only after a fresh native session demonstrates source-attributed Graphiti recall.'};
  assert.ok(lexicalSupport(query, correct.fact).count >= 3);
  assert.equal(relevanceSignals(query, correct.fact).eligible, true,
    'sentence-initial When cannot block otherwise source- and topic-qualified evidence');
  assert.deepEqual(await relevanceFilter(query, [wrongIssue, correct]), [correct]);
  assert.equal(relevanceSignals(query, wrongIssue.fact).eligible, false,
    'numbered-issue identity remains mandatory');
});

test('fresh native recall: true named entities remain hard qualifiers after punctuation', async () => {
  const query = 'What was the conclusion? Graphiti required source-bound evidence.';
  const unrelated = {fact:'The accepted review used a source-bound evidence record.'};
  const named = {fact:'Graphiti required source-bound evidence for the accepted review.'};
  assert.equal(relevanceSignals(query, unrelated.fact).eligible, false,
    'a sentence-initial proper name must still be matched');
  assert.equal(relevanceSignals(query, named.fact).eligible, true);
  assert.deepEqual(await relevanceFilter(query, [unrelated,named]), [named]);
});


test('structured DB-name alias retains source topical and identity gates', async () => {
  const query = 'Which Graphiti group does the production recall service use, and on which FalkorDB port does it run?';
  const supported = {fact:'The environment variable GRAPHITI_RECALL_FALKOR_PORT is set to 6382.'};
  const distractor = {fact:'The unrelated Redis service runs on port 6382 in a different storage cluster.'};
  assert.equal(relevanceSignals(query, supported.fact).eligible, true,
    'FalkorDB may be named FALKOR inside a structured config identifier');
  assert.equal(relevanceSignals(query, distractor.fact).eligible, false);
  assert.deepEqual(await relevanceFilter(query, [distractor, supported]), [supported]);
  assert.equal(relevanceSignals('Which MongoDB port runs the Graphiti service?', supported.fact).eligible,
    false, 'an unrelated named product must not be admitted through a suffix alias');
  assert.equal(relevanceSignals('Which Graphiti FalkorDB port is configured?',
    'The ordinary Falkor team uses a separate Graphiti service port.').eligible, false,
    'ordinary prose containing the shortened name is not a structured alias');
});

test('contextual acronyms require two opaque query identifiers and topical support', async () => {
  const query = 'Why does the production data physically live in the development-knowledge graph even though the MCP config points at graphiti_live?';
  const anchored = {fact:"A script queries the 'graphiti_live' graph filtered by group_id='development-knowledge'."};
  const underqualified = {fact:"The MCP service uses a general per-project configuration."};
  assert.equal(relevanceSignals(query, anchored.fact).eligible, true,
    'two exact identifiers can support a contextual initialism absent from the fact');
  assert.equal(relevanceSignals(query, underqualified.fact).eligible, false,
    'MCP alone does not establish the asked graph identity');
  assert.equal(relevanceSignals('Does MCP route through graphiti_live and development-knowledge?',
    'The HTTP service routes through graphiti_live only.').eligible, false,
    'an absent acronym cannot be waived with only one shared identifier');
  assert.equal(relevanceSignals('Why is the MCP service configured for Issue #81 with graphiti_live and development-knowledge?',
    'Issue 80 scripts query graphiti_live and development-knowledge with the expected group.').eligible,
    false, 'exact Issue #81 identity remains mandatory');
  assert.equal(relevanceSignals('How does Graphiti MCP isolate groups?',
    'The MCP server separates each group through a dedicated driver.').eligible, false,
    'a different named product is not waived by one acronym');
});

test('24-candidate selector admits a sourced relevant fact beyond the original top twelve', async () => {
  const items = Array.from({length:26}, (_,i) => ({
    fact:'Unrelated weather observation ' + i + ' outside the archive pipeline.',
  }));
  const supported = {fact:'The Parquet archive retention pipeline stores verified manifests.'};
  items[18] = supported;
  items[24] = {fact:'The Parquet archive retention pipeline stores verified manifests.'};
  const query = 'Which Parquet archive retention pipeline stores verified manifests?';
  assert.deepEqual(await relevanceFilter(query, items), [supported],
    'the supported candidate at index 18 must survive the widened bounded selection');
  let receivedCount = 0;
  const scorer = async (_query, candidates) => {
    receivedCount = candidates.length;
    return new Map([[18, 0.9]]);
  };
  assert.deepEqual(await relevanceFilter(query, items, scorer), [supported]);
  assert.equal(receivedCount, 24, 'optional reranker uses the same bounded candidate set');
  const rerank = localReranker('http://127.0.0.1:8004/v1/rerank',{
    fetchImpl: async (_url, options) => {
      assert.equal(JSON.parse(options.body).documents.length, 24);
      return {ok:true,json:async()=>({results:[{index:18,relevance_score:0.9}]})};
    }
  });
  assert.equal((await rerank(query, items.slice(0, 24))).get(18), 0.9);
  await assert.rejects(rerank(query, items), /candidate bound exceeded/);
});


test('qualified shortlist ranks eligibility before a 24-record bound and excludes unsafe aliases', async () => {
  const query='Which PostgreSQL archive retention pipeline stores verified manifests?';
  const entries=Array.from({length:32},(_,i)=>({fact:'An unrelated cloud weather observation '+i+'.'}));
  const correct={fact:'The PostgreSQL archive retention pipeline stores verified manifests.'};
  entries[27]=correct;
  const shortlist=shortlistQualifiedCandidates(query,entries);
  assert.deepEqual(shortlist,[correct]);
  assert.deepEqual(await relevanceFilter(query,shortlist),[correct]);
  assert.deepEqual(shortlistQualifiedCandidates('Which MongoDB archive retention pipeline stores verified manifests?',entries),[],
    'unrelated named product is not admitted into the eligible shortlist');
});
test('qualified shortlist resolves equal direct overlap using original source-context evidence only as a tie', () => {
  const query='What did commit 52863ae change in the Graphiti test suite?';
  const distractor={fact:'Commit 52863ae refers to the Graphiti test suite and its tests.',
    sourceContext:'The Graphiti test suite exists.'};
  const relevant={fact:'Commit 52863ae refers to the Graphiti test suite and its tests.',
    sourceContext:'The change in commit 52863ae fixes failure behavior in the Graphiti test suite.'};
  const ranked=shortlistQualifiedCandidates(query,[distractor,relevant]);
  assert.equal(ranked[0],relevant);
  assert.equal(ranked.length,2);
  assert.equal(relevanceSignals(query,'Issue #80 discusses the test suite.').eligible,false);
});


test('diagnostic proves 0.34 admitFact floor is not an automatic-recall selector gate', async () => {
  const query='Which alpha beta gamma delta epsilon zeta?';
  const fact='The alpha beta observation.';
  const signal=relevanceSignals(query,fact);
  assert.equal(signal.overlap.count,2);
  assert.ok(signal.overlap.score<0.34);
  assert.equal(admitFact(query,fact),false,'on-demand public helper still applies 0.34');
  assert.equal(signal.eligible,true,'automatic recall permits independently topical two-term support');
  assert.equal(explainRelevanceAdmission(query,{fact}).admitted,true);
  assert.equal(explainRelevanceAdmission(query,{fact}).scoreFloor034Applied,false);
});
test('diagnostic exposes named/issue/numeric failure without emitting source content', () => {
  const named=explainRelevanceAdmission('Which MongoDB archive storage is configured?',{
    fact:'The PostgreSQL archive storage is configured.'});
  assert.equal(named.admitted,false);
  assert.ok(named.direct.failures.includes('NAMED_IDENTITY'));
  const issue=explainRelevanceAdmission('Which change in Issue #81 affects Graphiti tests?',{
    fact:'Issue 80 changed Graphiti tests.'});
  assert.ok(issue.direct.failures.includes('ISSUE_IDENTITY'));
  const num=explainRelevanceAdmission('What changed in pipeline 6382?',{
    fact:'Pipeline 6383 changed the service.'});
  assert.ok(num.direct.failures.includes('NUMERIC_IDENTITY'));
  assert.equal(JSON.stringify(named).includes('PostgreSQL'),false);
  assert.equal(JSON.stringify(named).includes('MongoDB'),false);
});
test('diagnostic labels linked source-context gating without changing production recall', async () => {
  const q='How does the Graphiti MCP service isolate each group driver?';
  const item={fact:'Each group driver clones an isolated workspace graph.',
    sourceContext:'The Graphiti MCP service uses the group driver in this implementation.'};
  assert.equal(relevanceSignals(q,item.fact).eligible,false);
  const d=explainRelevanceAdmission(q,item);
  assert.equal(d.admitted,true);
  assert.equal(d.linkedUsed,true);
  assert.equal(d.direct.namedMatch,false);
  assert.equal(d.linked.namedMatch,true);
  assert.deepEqual(await relevanceFilter(q,[item]),[item]);
  assert.equal(JSON.stringify(d).includes('workspace graph'),false);
});


test('commit-effect questions prefer source-described changes over incidental worktree commands',async()=>{
  const query='What did commit abcdef12 change in the Graphiti test suite?';
  const setup={fact:'Commit abcdef12 ran Graphiti test suite worktree setup.'};
  const change={fact:'Commit abcdef12 fixed Graphiti test suite coverage.'};
  assert.equal(relevanceSignals(query,setup.fact).eligible,true);
  assert.equal(relevanceSignals(query,change.fact).eligible,true);
  assert.equal(answerTypeSupport(query,setup.fact),0);
  assert.equal(answerTypeSupport(query,change.fact),1);
  assert.deepEqual(await relevanceFilter(query,[setup,change]),[change]);
  assert.deepEqual(await relevanceFilter(query,[change,setup]),[change]);
  assert.deepEqual(shortlistQualifiedCandidates(query,[setup,change]),[change,setup]);
});
test('commit-effect preference cannot waive wrong entity, Issue or numeric scope',async()=>{
  const query='What did commit abcdef12 change in MongoDB tests for Issue #81?';
  const wrongEntity={fact:'Commit abcdef12 fixed PostgreSQL tests for Issue 81.'};
  const wrongIssue={fact:'Commit abcdef12 fixed MongoDB tests for Issue 80.'};
  const good={fact:'Commit abcdef12 fixed MongoDB tests for Issue 81.'};
  assert.deepEqual(await relevanceFilter(query,[wrongEntity,wrongIssue,good]),[good]);
  assert.deepEqual(shortlistQualifiedCandidates(query,[wrongEntity,wrongIssue,good]),[good]);
});
test('commit-effect preference does not mistake worktree commands with incidental change words for commit effects',async()=>{
  const query='What did commit abcdef12 change in the Graphiti test suite?';
  const setup={fact:'Git worktree add abcdef12 for Graphiti test suite; changed checkout directory.'};
  assert.equal(answerTypeSupport(query,setup.fact),0);
  assert.deepEqual(await relevanceFilter(query,[setup]),[setup],
    'allowed source remains eligible, only answer-type ranking changes');
  assert.equal(answerTypeSupport('Which commit abcdef12 should I checkout?', 
    'Commit abcdef12 fixed Graphiti tests.'),0,'unrelated commit questions get no effect bonus');
});


test('commit subject impact beats git -C worktree setup even if output echoes the subject',async()=>{
  const q='What did commit a1b2c3d change in the Graphiti test suite?';
  const subject={fact:'a1b2c3d test(graphiti): reject stale Graphiti test suite results'};
  const worktree={fact:'git -C /workspace/graphiti worktree add /tmp/candidate a1b2c3d; git -C /workspace/graphiti rev-parse HEAD; status: a1b2c3d test(graphiti): reject stale Graphiti test suite results'};
  assert.equal(relevanceSignals(q,subject.fact).eligible,true);
  assert.equal(relevanceSignals(q,worktree.fact).eligible,true);
  assert.equal(answerTypeSupport(q,subject.fact),1);
  assert.equal(answerTypeSupport(q,worktree.fact),0);
  for(const pair of [[subject,worktree],[worktree,subject]]){
    assert.deepEqual(await relevanceFilter(q,pair),[subject]);
    assert.equal(shortlistQualifiedCandidates(q,pair)[0],subject);
  }
});
test('git -C option and quoted-path procedure variants never gain commit-effect bonus',()=>{
  const q='What did commit a1b2c3d change in the Graphiti test suite?';
  const procedures=[
    'git -C "/work/dir with spaces" worktree add /tmp/new a1b2c3d; a1b2c3d test(graphiti): reject obsolete test suite failures',
    "git -C '/work/dir with spaces' checkout a1b2c3d; a1b2c3d test(graphiti): reject obsolete test suite failures",
    'git -C /work/graphiti rev-parse a1b2c3d; a1b2c3d test(graphiti): reject obsolete test suite failures',
    'git -C /work/graphiti status; commit a1b2c3d changed Graphiti test suite state',
    'worktree add /tmp/new a1b2c3d; commit a1b2c3d changed Graphiti test suite state',
  ];
  for(const fact of procedures)
    assert.equal(answerTypeSupport(q,fact),0,fact);
});
test('generic conventional commit-subject formats score without a fixed change-verb dictionary',()=>{
  const q='What did commit a1b2c3d change in the Graphiti test suite?';
  const subjects=[
    'a1b2c3d test(graphiti): reject stale Graphiti test suite cases',
    'a1b2c3d fix: guard Graphiti test suite state',
    'a1b2c3d refactor(graphiti)!: prevent Graphiti test suite stale selection',
    'Commit a1b2c3d modified Graphiti test suite coverage',
  ];
  for(const fact of subjects)
    assert.equal(answerTypeSupport(q,fact),1,fact);
  assert.equal(answerTypeSupport('Should I checkout commit a1b2c3d?',
    'a1b2c3d test(graphiti): reject stale Graphiti test suite cases'),0);
});
test('commit subject preference does not waive named product, issue, numeric or unrelated-topic fences',async()=>{
  const q='What did commit a1b2c3d change for Graphiti in Issue #81?';
  const good={fact:'a1b2c3d test(graphiti): reject stale Graphiti Issue 81 cases'};
  const wrongName={fact:'a1b2c3d test(mongodb): reject stale MongoDB Issue 81 cases'};
  const wrongIssue={fact:'a1b2c3d test(graphiti): reject stale Graphiti Issue 80 cases'};
  const unrelated={fact:'a1b2c3d chore(website): reject stale webapp Issue 81 links'};
  assert.deepEqual(await relevanceFilter(q,[wrongName,wrongIssue,unrelated,good]),[good]);
  assert.deepEqual(shortlistQualifiedCandidates(q,[wrongName,wrongIssue,unrelated,good]),[good]);
});
