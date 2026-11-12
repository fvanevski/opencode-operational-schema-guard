# Issue #92 — S6 exposed + A3 freeze · consolidated handback

`RESULT=FUNCTIONAL_REMEDIATION_REQUIRED` (A3 prospective cohort frozen and ready for Central review)

PRIMARY_AGENT=Hermes (build) · REPO=fvanevski/opencode-operational-schema-guard
BRANCH=work/91-memory-utility-r1 · source head `9cf811ef875efbf97b78d9d500aac1b31be88567`
Evidence-only commit: this directory `docs/issue-91/evidence/92-s6-exact-complement/`
(single sanitized commit on the working branch; no PR, no merge, no #92 closure).

## 1. Source + evidence commits
- Authenticated source HEAD (local == remote == required): `9cf811ef875efbf97b78d9d500aac1b31be88567`
- S6 source binding (per-file blob SHAs at HEAD): `s6-execution-provenance.json`
  (finite-batch.mjs `90c3a8c2…`, ex_admitted_node_bridge.py `004188b1…`, queue.mjs, events.mjs,
  memory-core.mjs, claim-evidence.mjs, fact-review.mjs, curator-cli.mjs, ex-admission-proof.mjs).
- Independent GitHub-API readback of the 5 key blob SHAs matched the remote at the source head.
- Evidence commit SHA: the single sanitized commit that adds this directory (readback
  verified against the remote ref tip after push).

## 2. Native tests + actual exits
- `node --check` on 5 S6 files (finite-batch, finite-batch.test, curator-cli, claim-evidence,
  ex-admission-proof): all exit 0.
- `node --test` on 8 test files: **141 tests, 0 fail** (incl. 4 S6 complement proofs:
  no-bypass, no-retrofit, no-revival, shared-ceiling, EX-admission gating).
- Python EX bridge test (`test_ex_admitted_node_bridge.py`): OK.
- `npm run check`: exit 0. `npm test`: **524 tests, 0 fail**, `OPERATIONAL_PLUGIN_TEST_RESULT: PASS`.

## 3. EX positive/negative admission
- Positive: inherited kernel fd via `pass_fds` → `admitted` (bridge `004188b1…`).
- Negative marker-only → `missing_lock_fd` (fails closed before any state).
- Negative non-inherited → `wrong_inode`.
- `ex-kernel-proof-output.txt` records the three outcomes.

## 4. S6 model-call identities + terminal Graphiti UUID reconciliation
- batch_id `598d07029de5fde83a012286bc20d92025dc73e7a9472743d67a05197f7efda7`,
  snapshot_sha256 `b4dadef2…`, tuning_sha256 `8d671d06…` (no tuning file for S6).
- 123 model calls (discovery 61 / support 36 / utility 26), 0 model errors, replay_only=false,
  source_recovery=true, source_exact_complement=true.
- 19 persisted (claim lane 10 + complement lane 9), 31 deferred, **0 unresolved**.
- Terminal 4-surface reconcile (`s6-reconcile-receipt.json`): 19 store UUIDs == 19 remote
  episodes, **uuid_exact_match=true**, remote-missing-from-store 0, store-missing-from-remote 0,
  source index intact. Independent readback in `s6-graphiti-readback.json`.
- Settled on launcher attempt 5 (bounded reconcile-only `rc=3` → `rc=0`); `s6-launcher.log` +
  `s6-attempt-receipt.json`.

## 5. Full 16 valuable / 11 control scorecard (`s6-scorecard.json`)
- Valuable coverage **8/16** (S5 6/16; S2/S3 baseline 9/16). Recovered S5 regression `sp8`
  (sphinx_14182_rst_header_rows) + new `g2` (graphiti llm-param). NOT recovered `py2`
  (6386 flag-negative), `py3` (v-arg). 5 graphiti + 1 rst sub-predicates remain unsurfaced
  (discovery/surface loss). First-loss mechanisms recorded in the scorecard.
- 11 controls: 2 nonvaluable persisted (1 astropy QTable units FP carried from S5; 1 django
  task-boilerplate) = mild graph pollution; 9 correctly retained as deferred.
- 19 episodes = **8 distinct useful valuable facts** + 2 nonvaluable + 9 duplicate episodes
  (same predicate re-surfaced across sibling messages). Episode count not substituted for
  useful knowledge.

## 6. Independently distinct persisted durable-fact count
- **8** distinct useful valuable facts persisted in the S6 group (of 19 episodes).

## 7. A1 current raw-native opportunity + admission (`s6-a1-raw-native.json`)
- Source: current live `/home/filip/.local/share/opencode/opencode.db` (v2 schema).
- **1,423** raw user turns (754 sessions) → typed drops size=44, privacy=279, chatter=67 →
  **1,033 admitted** (admission rate **0.726**).

## 8. Auditable A3 prospective roster + label-freeze digest
- Cohort `gh_mcp-development-v2` frozen as a **genuine replacement** of 20 native events
  (10 valuable + 10 controls), all nonoverlapping with the B3 24-cluster and the gh_mcp
  20-case corpora (session overlap 0, message overlap 0; 20 distinct native message ids).
- Raw denominator: 1,113 genuinely-new native user turns (619 distinct sessions) outside
  B3+gh_mcp.
- Private manifest (with native event text): `/home/filip/.local/state/ghdev-graphiti-issue92/private/issue92-a3-v2-corpus.json`
  SHA256 `a85941839f1f9dc7e04081829016aa3c38ef05e9a6f3c29ca58de8b53abbf5ca`.
- Sanitized roster + **label-freeze digest `bdfb7c6c7c025c572ba899094b94d1388c425e59189e395b38f5469968da3a58`**
  (`a3-v2-sanitized-roster.json`); nonoverlap proof embedded.
- A3 group `graphiti-adr92-a3-prospective-v2` empty (0 episodes); A3 EX launcher / driver /
  scorer / staging prepared and preflighted (`a3-v2-*.mjs`, `a3-v2-ex-launcher.py`), **not run**
  (gated on `A3_CENTRAL_APPROVED=1` after Central approves the exposed result + frozen cohort).
- Prospective acceptance rules preserved in `a3-v2-scorer.mjs`: ≥85% valuable recall,
  ≥90% grounded precision, ≥75% useful-grounded over ≥8 independent persisted facts,
  zero authority breaches, Wilson 95% intervals.

## 9. Retrieval + extraction quality
- `search_memory_facts` USEFUL (django lazy-string TypeError fact returned grounded, with
  source/target node UUIDs + episode). `search_nodes` USEFUL (sphinx node summary).
  `get_episode_entities` SPARSE (0 nodes/edges for persisted episodes). Substantive fact
  edges exist (HAS_BUG_IN django → TypeError); per-episode entity graphs are thin.
  Verdict: retrieval useful at fact/project level; 19 episodes overstate useful knowledge.

## 10. Historical-state + no-replay verification
- S1–S5 groups untouched; no reset/deletion; S5 group `graphiti-adr92-s5-claim-ex-proof` and
  historical scorecards unchanged. S6 used a fresh group + fresh 0700 state
  (`/tmp/opencode/issue92-s6/state/s6`) + original 24-cluster corpus
  (SHA `ebac7052…`) + original 16/11 denominators. Once-only marker + attempt receipt prevent
  replay; no frozen calls replayed; no ambiguous Graphiti writes.

## 11. GHDEV-10 command-shape friction
- Full log in `s6-command-shape-friction.md`: (1) `status:"empty"` → queue must be staged
  before the driver; (2) reconcile probe lost stdout through the EX bridge → file-based
  readback; (3) A3 v2 cohort selected by truncated message-id → prefix-resolution to full
  native ids; (4) `rm -rf` consent gating → split into check + `mkdir` + targeted `rm -f`;
  (5) EX admission bounded retries (settled on attempt 5).

## Disposition
- S6 source-exact-complement EX-kernel integration works end-to-end; exposed valuable
  coverage 8/16 is 1 below the 9/16 S2/S3 baseline (recovers sp8, +g2; py2/py3 not recovered;
  2 mild FPs). Per contract, the precise first-loss mechanisms are returned; **no automatic
  second exposed campaign**. A3 v2 cohort is frozen and auditable; A3 inference is gated on
  Central approval of the exposed result + the frozen cohort.
