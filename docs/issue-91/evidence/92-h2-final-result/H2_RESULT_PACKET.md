# Issue #92 H2 — Final sanitized result packet (evidence-only, commit 2 of 2)

Self-contained, sanitized H2 result: freeze lineage, private-digest locators,
remote terminal receipts (no raw excerpts), complete paired scorecard,
failures, limitations, exact source identities. Companion machine files:
`h2-paired-scorecard.json` (native scorer stdout, byte-exact) and
`h2-remote-receipts.json` (22 remote receipts, digests only).

## 1. Identities

| Item | Value |
|---|---|
| Repo / branch | `fvanevski/opencode-operational-schema-guard` / `work/91-memory-utility-r1` |
| Required evidence head (this commit's parent) | `9e23df843eb1b4defa79da2ad21dd10c7d518e87` (remote readback verified) |
| Evidence commit 1 of 2 (freeze receipt) | `9e23df843eb1b4defa79da2ad21dd10c7d518e87` |
| Source baseline | `c8eb5260f2b10832346234b1b5d0cf28302ffba8` |
| Source candidate | `270848aa108df22b9d12738cc6f4903ec45da9c1` |
| H2 final corpus (re-frozen v2) SHA-256 | `63948f771f96632b0e8272736739e3a6fe97505431abcbda2356962d974efb36` |
| H2 freeze manifest v2 SHA-256 | `bdb180ac62534bc4ab706dd0179d7d7997478c520ba977e2f0cdc0394852a1e7` |
| AI ratification SHA-256 | `925a21dbeaebad47216b7cf438e6471fb70499668c72139f3c8a95c4a5271ad8` |
| Model policy SHA-256 | `30806d64f7d6174d73342ead8021fb09e8a56d606aa6cb3eb890aa0220521501` |
| Paired outcomes artifact SHA-256 (host, mode 0600) | `25e3d41ee0464eeb88d6ccbe677768938d7a26e7ea185e639c9fce38b6f79b9a` |
| Native scorecard SHA-256 | `373bf111d38c9e97ea29ce418d15ac3bc1c2dc189030c6c7568ee9253b5ffd4c` |
| Post-exit status JSON SHA-256 | `b462a3c4ac830eb8a23c0b0cd3e86591bb52374bf78ccfcf8bb20ab914254d8f` |
| Post-exit full log SHA-256 | `07edf9fa9e6c9ecb3eeaa53eab29d6a09f9d945198b9533dc83de7e86ea9e8ee` |
| Blinded adjudication set / judgments (host, mode 0600) | `6f654953…f95d12b` / `497c0987…f6118` |

Frozen chronology: corpus freeze `2026-11-09T01:08:11.317Z` → AI ratification
`2026-11-09T01:09:12.258Z` → first model activity `2026-11-09T01:29:21Z`
(post-exit window `01:28:49Z`–`01:33:18Z`). Model exposure strictly post-ratification.

## 2. Post-exit run (native, single reviewed runner)

- Runner: `docs/issue-91/h2-acceptance/h2-post-exit-run-reviewed.sh` at `9e23df8`,
  invoked exactly once by the condition-based one-shot launcher after interactive
  harness exit; genuine EX admission per arm ("EX admission proven; invoking
  candidate drain with lock retained"); all four arms `exit=0`
  (`H2_ALL_DRAIN_EXITS_ZERO`).
- Arms/groups: baseline dev `…development-r05`, candidate dev `…development-r06`,
  baseline holdout `…holdout-r09`, candidate holdout `…holdout-r10` (fresh unused
  groups; v1 r07/r08 sealed untouched).
- Model calls: 38 total (3+3+16+16 across three drain/reconcile passes on
  holdout), **0 model errors**, alias `chat-fast` @ `127.0.0.1:8002`, identical
  frozen policy for all arms (reasoning/max-tokens overrides explicitly unset by
  the runner).
- Local terminal states (review store, NOT remote persistence): r05 3/3
  persisted; r06 2 persisted + 1 DEFER (`model_assertion_not_source_extract`);
  r09 12 persisted + 4 DEFER; r10 5 persisted + 11 SKIP. All queues drained
  (`queued=0, new=0`), `unresolved=0` in every reconcile-only receipt.

## 3. Terminal remote evidence (independent dual-route readback)

Two independent routes agree on all **22** persisted records (3 base-dev + 2
cand-dev + 12 base-holdout + 5 cand-holdout):

- **Graphiti MCP** `get_episodes` per group (FalkorDB backend at `127.0.0.1:8766`):
  3/2/12/5 episodes, UUIDs, names (`curated-v1:<record_id>`), `source_description`
  (`source-grounded curator | <record_id>`) all match the local episode index.
- **Raw FalkorDB** `GRAPH.QUERY` per-group graphs (`redis://127.0.0.1:6382`):
  Episodic node counts 3/2/12/5; each of the 22 UUIDs exists as an `Episodic`
  node in exactly its group graph with `group_id`/`source`/`name` properties and
  content readback; content structure verified (one fact per episode; cited
  source refs ⊆ curation-record events; observed timestamps ∈ events).
- **Source-index membership**: per-group graph source registration present for
  every episode (`source='text'` + curation-bound `source_description`); no
  campaign source registered in any other graph.
- **Duplicate identity**: 0 cross-group UUID collisions; 0 duplicate curation
  names. Full per-record receipts in `h2-remote-receipts.json`.
- **ACK/local distinction**: the 16 local-only curation records (1 r06 DEFER,
  4 r09 DEFER, 11 r10 SKIP) have `remote_episode_uuid=null` and no remote
  Episodic node; only the 22 `state=persisted` records are credited.

**Production `development-knowledge` unchanged**: 355 episodic / 276 entity
nodes, latest episode `2026-11-08T03:57:03Z` (pre-campaign, identical to the
A3 baseline); local production curation state unmodified since
`2026-11-07 19:57:07` local. `ghdev_gh_mcp` and `graphiti_live` empty. Zero
campaign writes to production.

## 4. Blinded AI fact adjudication (user-authorized)

- Method: each of the 17 persisted holdout facts (12 baseline + 5 candidate;
  26 cited cases) was judged against the **original private source text**
  (cohort `native_event.text`; 8 staged-truncated cases recovered in full from
  `opencode.db` and sha-matched) **before** viewing arm identity or the
  curator's decision/util-class. All 30 cohort cases re-verified against
  `opencode.db` (ok=30, bad=0; no exposed-session overlap).
- Grounding: all 17 facts VERBATIM-grounded in the cited original sources
  (13 unique verbatim spans checked; 4 facts are content-identical
  re-persistences by the other arm: M==B, N==G, O≈I, Q==L).
- Verdicts: 17/17 grounded; **12 useful / 5 low-value** (baseline 7/5,
  candidate 5/0); 0 privacy, 0 authority, 0 fabricated-source issues.
  Low-value = one-off verification results / transient status fragments
  (facts A, C, D, J, K). Useful = durable procedure (B/M), negative result
  (E), env-scoping pitfall (F), role-scope architecture constraint (G/N),
  VRAM-floor behavior (H), latent ingress/adapter defect (I/O), Node 26
  `AbortSignal.timeout` API fact (L/Q), root-permission root-cause + fix (P).
- Ratification preserved unchanged: 30 cases / 19 valuable / 3 families,
  0 label changes; no post-output relabeling.

## 5. Paired scorecard (deterministic, `h2-acceptance.mjs score`, exit 0)

`node docs/issue-91/h2-acceptance/h2-acceptance.mjs score <ratification> <outcomes>`
→ native stdout byte-exact in `h2-paired-scorecard.json`.

| metric | baseline (r09) | candidate (r10) |
|---|---|---|
| persisted facts | 12 | 5 |
| grounded | 12 | 5 |
| useful (among grounded) | 7 (0.583333) | 5 (1.0) |
| low-value | 5 | 0 |
| redundant | 0 | 3 |
| privacy / authority / fabricated | 0 / 0 / 0 | 0 / 0 / 0 |
| valuable cases captured | 17/19 (0.894737) | 11/19 (0.578947) |
| valuable cases retained (useful∧grounded) | 13/19 (0.684211) | 11/19 (0.578947) |
| useful-among-grounded Wilson 95% | [0.319511, 0.806740] | [0.565518, 1.0] |
| grounded Wilson 95% | [0.757506, 1.0] | [0.565518, 1.0] |
| model decisions | 26 EMIT / 4 DEFER | 14 EMIT / 16 SKIP |

Development arms (cronparse, exposed, development-only; reported, not scored):
baseline r05 persisted 3, candidate r06 persisted 2 (+1 local DEFER).
Candidate total 7 persisted facts (2 dev + 5 holdout).

**Missed baseline-useful cases (candidate lost):** `i92h2-15-8f838410`,
`i92h2-16-0cae773f` — the baseline persisted the firecrawl research-run schema
validation failure as a useful negative result; the candidate SKIPped the same
source as "transient".

### Gates (frozen pre-registered rules)

| gate | result | rationale |
|---|---|---|
| `sample` | **INSUFFICIENT_SAMPLE** | candidate grounded facts 5 < 8 floor (7 < 8 incl. development) |
| `usefulness` (≥0.75 useful among grounded) | **INSUFFICIENT_SAMPLE** | floor unmet; observed 1.0 but Wilson 95% lower bound 0.565518 < 0.75 |
| `groundedness` (≥0.90) | **PASS** | 5/5 = 1.0 |
| `valuable_capture` (≥0.85) | **FAIL** | 11/19 = 0.578947 |
| `valuable_persisted_case_coverage` (≥0.85) | **FAIL** | 11/19 = 0.578947 |
| `selectivity` (low-value reduction) | **PASS** | candidate 0 < baseline 5; 0.0 < 0.416667 |
| `baseline_useful_preservation` | **FAIL** | 2 missed (15, 16) |
| `privacy_source_authority` | **PASS** | 0 issues |

**Overall: `INSUFFICIENT_SAMPLE`.**

## 6. Failure-mechanism analysis (no threshold was moved)

1. **Sample floor (structural, frozen):** the candidate persisted 5 holdout
   facts (< 8). The floor is a pre-registered receipt-backed minimum; it cannot
   pass for this run. No pooling of development facts (their case IDs are not
   in the 30-case ratification) and no H1 9/12 pooling.
2. **Under-capture (model selection divergence, not a validator defect):** the
   candidate SKIPped 16/30 cases, including 8 valuable cases (11, 12, 13, 15,
   16, 21, 25, 26) the baseline EMITted; its 5 persisted facts are 100% useful
   (high precision, low recall). The two missed valuable cases (15/16) are the
   same source content the baseline persisted as a useful negative result —
   a defensible-but-divergent model durability judgment on identical input,
   not an unsupported input and not a deterministic validator defect.
3. **Extractive one-fact-cluster limitation (contributing):** one persisted
   episode carries one fact per session cluster, so case coverage is bounded
   by fact count (5 facts ≈ ≤15 cases); this structurally caps the
   0.85 coverage gate at this sample size.
4. **Validator behavior:** correct fail-closed behavior — `INSUFFICIENT_SAMPLE`
   emitted exactly as the frozen rules specify; no defect demonstrated.
   `CENTRAL_SEMANTIC_REMEDIATION_REQUIRED=none` (no source patch proven
   necessary; a policy change to the candidate utility gate's SKIP
   aggressiveness would be a semantic decision for Central, not a bug fix).

## 7. Limitations

1. Candidate sample below the 8-grounded-fact floor → utility gate
   `INSUFFICIENT_SAMPLE`; observed 5/5 useful is not certifiable at 95%.
2. Candidate under-capture (11/19 valuable) → capture/coverage/preservation
   gates FAIL on the frozen thresholds.
3. Development arms use the exposed #81 cronparse corpus (development-only by
   design); they are reported but excluded from scored denominators.
4. Episode content digests are published in lieu of raw private excerpts;
   private bytes remain host-side (mode 0600 locators in §1).
5. Trusted Actions `repository-final-v1` receipt remains `central_pending` at
   the final source head.

## 8. Friction (summary; canonical block in the handback)

`encountered=yes` — one `execute`-tool interface discovery (OpenViking `read`
argument shape `uri`→`uris`), one transient display truncation of a long
read (recovered via the saved full-output file), no guard rejections, no
command-shape rewrites; all acceptance-bearing commands ran in native shape.
