# Central Correction Disposition — Issue #81

**Campaign:** ISSUE81_CORRECTIVE_EVIDENCE_V1
**Owner of any production change:** Central (this packet is decision evidence;
no production change is implemented or staged here).

## Single bounded recommendation

**`RELEVANCE_OR_RANKING_FIX_RECOMMENDED`**

### Violated invariant

For a query whose expected proposition is **present, source-admitted and
eligible** in the candidate set, the production selection must prefer it over a
weaker related proposition. The installed relevance layer
(`docs/issue-75/v2-candidate/relevance.mjs`) does not guarantee this:

1. **Priority cue over-match (demonstrated, S06).**
   `HISTORICAL_STATEMENT` (relevance.mjs:82) matches the bare word `then`
   (`\bthen\b`), granting `priority = 1` to a weakly related git-fetch fact
   (lexical overlap 3). The expected-proposition fact — "the graphiti group was
   changed from 'ghdev_gh_mcp' to 'development-knowledge'" (overlap 5, eligible,
   priority 0) — is present and eligible but **loses the sort**
   (relevance.mjs:184-187 sorts `priority` before `lexical.count`).
2. **Named-term literal fence (demonstrated, S01/S03/S04).**
   Named query terms are enforced by case-insensitive *substring* inclusion
   (relevance.mjs:124). Consequences observed:
   - S01: the expected-proposition fact ("GRAPHITI_RECALL_FALKOR_PORT is set to
     6382") is rejected because the query term `FalkorDB` does not occur as a
     substring (the fact carries `FALKOR_PORT` only).
   - S03: the closest equivalent ("the MCP server clones the driver per
     group_id to use per-group FalkorDB graphs") is rejected because the
     literal `graphiti` is absent from the fact.
   - S04: the most-equivalent candidate (overlap 6, "…while graphiti_live is
     empty") is rejected because the literal `mcp` is absent; the admitted
     alternative names `ghdev_gh_mcp` and is historical/superseded.
3. **Lexical floor abstention (demonstrated, S13).** With `ranker = null`
   (no `rerankEndpoint` in the installed options), a single-group overlap (< 2
   token groups) admits nothing: S13 injects nothing even though a valid
   source exists for the expected episode.

### Exact source file and function

`docs/issue-75/v2-candidate/relevance.mjs` — `relevanceSignals` (lines 112-149),
`HISTORICAL_STATEMENT` (line 82), the named-term fence (line 124), and the
`relevanceFilter` sort (lines 184-187). No retrieval-code change is
demonstrated necessary (`memory-core.mjs` search/join logic behaves as
designed in every case).

### Decisive case IDs

`S06` (ranking over-match), `S01`, `S03`, `S04` (named-term fence),
`S13` (floor abstention). `S10` (tie at overlap 3 resolved by index order) is
supporting evidence.

### Observed precondition / expected vs actual behavior

- **Precondition (observed):** current graph state
  (237 records / 140 persisted / 140 index; snapshot digest
  `75dc74af0815…`), installed source at `b39e1ff7`, no reranker configured.
- **Expected:** for S06 the cutover-proposition fact (present, eligible) is
  selected; for S01/S03/S04 the proposition-equivalent candidates are admitted;
  S13 abstains only when no candidate is genuinely topical.
- **Actual:** S06 selects the distractor; S01/S03/S04 reject the
  equivalent candidates and select weaker related facts (or a superseded one);
  S13 abstains with a valid source available for the expected episode.

### Minimal proposed implementation surface (for Central's choice)

- Tighten `HISTORICAL_STATEMENT` so bare `then` no longer confers priority
  (e.g. require a temporal phrase context), **and/or**
- change the final sort to `lexical`-dominant with `priority` as a tie-break
  when `ranker = null`, **and/or**
- relax the named-term fence to token-boundary matching (a term is satisfied
  when it occurs as a word/token, not only as a raw substring; the S03-type gap
  — a fact that omits the named term entirely — is a retrieval-coverage issue,
  not a fence bug, and is left to retrieval).

### Regression test design

1. **Unit (deterministic, no host):** fixed query
   "Was there a previous Graphiti group before the production cutover, and
   what changed?" with candidates [cutover fact (overlap ≥ 5, no temporal
   marker), distractor containing bare `then` (overlap ≤ 3)] → assert the
   cutover fact is selected. *Fails on the current source; must pass after
   the fix.*
2. **Unit:** a fact containing a named term at a token boundary
   (e.g. `graphiti_live` for query term `Graphiti`) is not rejected by the
   named-term fence.
3. **Replay (host):** re-run the nine-case bounded probe against the corrected
   build: S06 must select the cutover fact; S13 must continue to abstain (no
   new false positive); N01-N04 must show no injections beyond the documented
   N02 over-broad behavior.
- **Success:** all three pass; frozen N02 behavior unchanged.
- **Failure:** any frozen negative control (N01/N03/N04) gains a new injection,
  or S06 still selects the distractor.
- **Host-dependent proof still required:** the item-3 replay on the corrected
  build, and (only if alternative-source credit policy changes) a
  human-precision adjudication — currently `UNVERIFIED`.

## Secondary (non-blocking) recommendation

**`EVALUATION_DESIGN_REVIEW_RECOMMENDED`** — two evaluation-policy concerns,
for Central's evaluation-design decision (not a production code fix):

- **Evaluator exact-source overconstraint** (`S01,S03,S04,S05,S07,S10`): the
  frozen scorer counts a correct-proposition answer from a *different valid
  in-group source* as `INJECTED_WRONG_SOURCE`. Alternative-source credit
  should require independently established proposition equivalence, compatible
  temporal/scope interpretation, and genuine source authority — not topic
  relatedness.
- **Overbroad negative expectation** (`N02`): the frozen control treats a
  development-knowledge fact *about* the legacy `ghdev_gh_mcp` group as a scope
  leak. The evidence shows the injected fact is stored **under**
  `development-knowledge` (record `f9680d78…`, persisted) and **answers** the
  question; no cross-group retrieval occurred (all 12 returned facts carry
  `group_id = development-knowledge`). The expectation disallows useful
  same-group historical-topic recall rather than testing a privacy/scope
  invariant. The frozen control is **unmodified** in this packet.

## Frozen evaluation preserved

The frozen 8/16 semantic-recall result **remains FAIL** (threshold 13/16);
this packet changes no frozen holdout, threshold, or verdict. Human grounded
precision remains `UNVERIFIED`.
