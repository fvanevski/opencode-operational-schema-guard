# Issue #92 H3 — Final sanitized result packet (evidence-only, commit 2 of 2)

Self-contained, sanitized H3 result: freeze lineage, private-digest locators,
remote terminal receipts (no raw excerpts), complete paired v2 scorecard,
causal analysis, model-policy consistency, limitations, exact source
identities. Companion machine files: `h3-paired-scorecard.json` (native v2
scorer stdout, byte-exact) and `h3-remote-receipts.json` (23 remote receipts,
digests only).

## 1. Identities

| Item | Value |
|---|---|
| Repo / branch | `fvanevski/opencode-operational-schema-guard` / `work/91-memory-utility-r1` |
| Required evidence head (this commit's parent) | `846e1ba1739be352413bc42b535f4b226af9b045` (remote readback verified) |
| Evidence commit 1 of 2 (H3 freeze receipt) | `2c188a3` (`docs/issue-91/evidence/92-h3-freeze-receipt/`) |
| Source baseline | `c8eb5260f2b10832346234b1b5d0cf28302ffba8` |
| Source candidate | `21556fa39c7520cede0e53c6012cbf67f6ea3ed3` |
| H3 holdout corpus SHA-256 | `08b821199a1018ba43128783ecdad60b382877882dec284829cf6fd42774b47e` |
| H3 development corpus SHA-256 | `6e3475ad0bb4eff52a44d25b417b8c6bb5b1f3ca9fdf38d6f0b7a54beafa2ca5` |
| H3 freeze manifest SHA-256 | `70915d5040610102e4bacdc7db8d7b5320346a66d0286d9d8c193ead79104ee4` |
| AI ratification SHA-256 | `0fbd7ed20fed9ad58b1ad6715156a562fba13263efccb1f2a313e29d0b5c7a7a` |
| Model policy SHA-256 | `39d8dd80b1427e1e24d52ece1ad30e1319869133201c8fba0c2c9c0caa2247a4` |
| Paired outcomes artifact SHA-256 (host, mode 0600) | `f8e4246ebaa859fd163bbfce6fbb1c90db53131dfefe7c106abfc9de354835bf` |
| Native v2 scorecard SHA-256 | `5f26ae1c65fb6e666d5ae8096031576683e81a59af34547fdb9b1c89075971ef` |
| Post-exit status JSON SHA-256 | `05c182f245817303321ecbe0d3ee50a58c9a8edfd8db85d53b05d72f909e0494` |
| Post-exit full log SHA-256 | `910b1315a8d16065e7349b3876abf8940fc81445dc995d4fd41871da13ec6f89` |
| Blinded packet / judgments (host, mode 0600) | `e536dd00…a936` / `b009d9d7…8546` |
| Fact-support projection SHA-256 | `f85ba06defe9d05c0fe65198c3bdbefed87fd28284191d826a2af3d1fbc75ae2` |
| Reconciliation report SHA-256 | `875ecf9378be8566791eed200bfb8ed84c6b801989d44832d3dc8b54321a4602` |
| Scorer (frozen at `846e1ba`) | `docs/issue-91/h2-acceptance/h2-coverage-v2.mjs`, blob `7818bd7a…539`, SHA-256 `c16b7211…2ded` |

Frozen chronology: corpus freeze `2026-11-09T02:28:59.169Z` → AI ratification
`2026-11-09T02:28:59.170Z` → first model activity `2026-11-09T02:32:59Z`
(post-exit window `02:32:59Z`–`02:37:22Z`, runner exit 0). Model exposure
strictly post-ratification.

## 2. Post-exit run (native, single reviewed runner)

- Runner: `i92h3-post-exit-run.sh` (host), a mechanical variant of the
  centrally reviewed `docs/issue-91/h2-acceptance/h2-post-exit-run-reviewed.sh`
  (deltas: candidate SHA pin `270848aa`→`21556fa`, group defaults r11–r14,
  seed counts dev 34 / holdout 38), invoked exactly once by the condition-based
  one-shot launcher after interactive harness exit; genuine EX admission per
  arm (4× "EX admission proven; invoking candidate drain with lock retained");
  all four arms `exit=0`.
- Arms/groups: baseline dev `…development-r11`, candidate dev `…development-r12`,
  baseline holdout `…holdout-r13`, candidate holdout `…holdout-r14` (fresh unused
  groups).
- Model calls: **46 total** (9+9+14+14 across ten drain/reconcile receipts),
  **0 model errors**, alias `chat-fast` @ `127.0.0.1:8002`, identical frozen
  policy for all arms.
- Local terminal states (review store, NOT remote persistence): r11 8 persisted
  + 1 DEFER; r12 3 persisted + 4 SKIP + 2 DEFER; r13 10 persisted + 4 DEFER;
  r14 2 persisted + 4 SKIP + 8 DEFER. Late-positive Graphiti reconciliation
  completed under retained EX admission (incomplete→settled drains, no blind
  second launch); `unresolved=0` in every final reconcile receipt.

## 3. Terminal remote evidence (independent dual-route readback)

Two independent routes plus the local episode index agree on all **23**
persisted records (8 base-dev + 3 cand-dev + 10 base-holdout + 2 cand-holdout):

- **Graphiti MCP** `get_episodes` per group (FalkorDB backend) and **raw
  FalkorDB** `GRAPH.QUERY` per-group graphs (`redis://127.0.0.1:6382`):
  Episodic node counts 8/3/10/2; each of the 23 UUIDs exists as an `Episodic`
  node in exactly its group graph with `name` (`curated-v1:<record_id>`),
  `source_description` (`source-grounded curator | <record_id>`) and content
  readback; content structure verified (one fact per episode; cited source
  refs ⊆ curation-record events; scope group embedded in content).
- **Reconciliation** (`h3-reconcile`, read-only): local curation record ↔
  `_episode-index` ↔ remote episode — `ALL_OK=true`, 0 problems across 23
  records; 0 cross-group UUID collisions; 0 duplicate curation names; no
  extra remote episodes. Full per-record receipts in `h3-remote-receipts.json`.
- **ACK/local distinction**: the 23 local-only curation records (1 r11 DEFER,
  6 r12 SKIP/DEFER, 4 r13 DEFER, 12 r14 SKIP/DEFER) have
  `remote_episode_uuid=null` and no remote Episodic node; only the 23
  `state=persisted` records are credited.
- **Production `development-knowledge` unchanged**: 355 episodic nodes, 0
  episodes created after `2026-11-08T18:00Z` (pre-campaign baseline identical).
  Zero campaign writes to production.

## 4. Blinded AI fact adjudication (user-authorized)

- Method: each of the 23 persisted facts (12 holdout: 10 baseline + 2
  candidate; 11 development: 8 r11 + 3 r12) was judged from the **blinded
  packet** (arm letters A/B/C/D; unblinding key stored separately) against the
  **original private source text** — 38/38 holdout cohort texts re-read from
  `opencode.db` (SHA-256-verified against `native_event.text_sha256`), 34
  development corpus texts, 5 pruned cronparse sources verified against the
  frozen seed excerpts (excerpt SHA-256 recorded), 1 whitespace-normalized
  match — **before** viewing arm identity or the curator's decision.
- Grounding: **23/23 grounded** — 17 exact-contiguous in the live
  `opencode.db` source, 5 frozen native-capture excerpts (source pruned from
  the live DB; SHA-recorded), 1 whitespace-normalized contiguous
  (`b43602f3…`: source newlines vs assertion spaces, content identical after
  normalization).
- Verdicts: 23/23 grounded; **21 useful / 2 low-value** (the 2 low-value are
  development-arm one-off fragments: a research-run schema-validation failure
  and a `LOCAL_VERIFY_RESULT` status line; 0 in the scored holdout arms);
  0 privacy, 0 authority, 0 fabricated-source, 0 redundant. The Prowlarr-key
  secret fact follows the H2 precedent (scored privacy=0 in the H2
  scorecard). Cross-arm content-identical re-persistences (firecrawl
  contract, receipt-503 root cause, mixed-deployment inventory) are not
  within-arm redundancy.
- Ratification preserved unchanged at run time: 38 cases / 29 valuable /
  3 families (hermes 14, openviking 10, plex 14); 1 pre-output label change
  (i92h3-21 valuable→not valuable, ledger-verified; no post-output
  relabeling).

## 5. Paired scorecard v2 (deterministic, `h2-coverage-v2.mjs score-v2`, exit 0)

`node docs/issue-91/h2-acceptance/h2-coverage-v2.mjs score-v2 <ratification> <outcomes>`
→ native stdout byte-exact in `h3-paired-scorecard.json`.

| metric | baseline (r13) | candidate (r14) |
|---|---|---|
| persisted facts | 10 | 2 |
| grounded | 10 | 2 |
| useful (among grounded) | 10 (1.0) | 2 (1.0) |
| low-value | 0 | 0 |
| redundant | 0 | 0 |
| privacy / authority / fabricated | 0 / 0 / 0 | 0 / 0 / 0 |
| valuable cases ingested (v2 capture) | 29/29 (1.0) | 29/29 (1.0) |
| curator-selected valuable cases | 24/29 (0.827586) | 4/29 (0.137931) |
| valuable cases retained (v2 fact-supported, case-source-verified) | 10/29 (0.344828) | 2/29 (0.068966) |
| useful-among-grounded Wilson 95% | [0.722467, 1] | [0.34238, 1] |
| grounded Wilson 95% | [0.722467, 1] | [0.34238, 1] |
| case decisions | 29 EMIT / 9 DEFER | 6 EMIT / 16 SKIP / 16 DEFER |
| cluster decisions | 10 EMIT / 4 DEFER | 2 EMIT / 4 SKIP / 8 DEFER |

Development arms (cronparse/firecrawl, exposed, development-only; reported,
not scored — their case IDs are not in the 38-case ratification): baseline
r11 persisted 8 (6 useful / 2 low-value), candidate r12 persisted 3
(3 useful / 0 low-value). Candidate total 5 persisted facts (3 dev + 2
holdout).

**Missed baseline-useful cases (candidate lost, 8):** `i92h3-08-4e1273e1`,
`i92h3-11-3f023200`, `i92h3-12-4048303f`, `i92h3-13-9d8e062f`,
`i92h3-18-3da24a46`, `i92h3-23-d96fa55a`, `i92h3-25-59ad201a`,
`i92h3-29-6089a360`.

### Gates (frozen pre-registered rules, v2)

| gate | result | rationale |
|---|---|---|
| `sample` | **INSUFFICIENT_SAMPLE** | candidate grounded facts 2 < 8 floor |
| `usefulness` (≥0.75 useful among grounded) | **INSUFFICIENT_SAMPLE** | floor unmet; observed 1.0 but Wilson 95% lower bound 0.34238 < 0.75 |
| `groundedness` (≥0.90) | **PASS** | 2/2 = 1.0 |
| `valuable_capture` (≥0.85) | **PASS** | 29/29 ingested = 1.0 |
| `valuable_persisted_case_coverage` (≥0.85) | **FAIL** | 2/29 = 0.068966 |
| `selectivity` (low-value reduction) | **FAIL** | candidate 0 is not < baseline 0 (both arms persisted only useful facts) |
| `baseline_useful_preservation` | **FAIL** | 8 missed |
| `privacy_source_authority` | **PASS** | 0 issues |
| `redundancy_nonregression` | **PASS** | 0/2 vs 0/10 |

**Overall: `INSUFFICIENT_SAMPLE`.**

## 6. Failure-mechanism analysis (no threshold was moved)

1. **Sample floor (structural, frozen):** the candidate persisted 2 holdout
   facts (< 8). The floor is a pre-registered receipt-backed minimum; it
   cannot pass for this run. No pooling of development facts (their case IDs
   are not in the 38-case ratification).
2. **Under-selection (model selection divergence, not a validator defect):**
   the candidate curator EMITted 2/14 clusters (14%), SKIPped 4 (29%) and
   DEFERred 8 (57%), versus baseline 10/14 (71%). At case level 6 EMIT /
   16 SKIP / 16 DEFER → 4/29 valuable curator-selected. The 8 missed
   baseline-retained valuable cases sit in 8 distinct clusters: 3 SKIPped
   clusters (`86866da0…` 6 cases, `ab417129…` 5 cases, `6d11e712…` 4 cases —
   13 valuable) and 5 DEFERred clusters (`a350279b…`, `eb64de74…`,
   `dcaf454c…`, `cdd9f39e…`, `caab0047…` — 7 valuable). The 2 retained cases
   are exactly the 2 EMITted clusters' directly-verified facts
   (high precision, low recall).
3. **Extractive one-fact-cluster limitation (contributing):** one persisted
   episode carries one fact per session cluster, so case coverage is bounded
   by fact count (2 facts ≈ ≤6 cases); this structurally caps the 0.85
   coverage gate at this sample size.
4. **Firecrawl regression pair (H2 `i92h2-15`/`i92h2-16`):** the H2 candidate
   SKIPped both while the baseline EMITted them. In H3 the same firecrawl
   preflight-contract session (`ses_f5c633bb…`, dev case `i92h2-14` family)
   was re-persisted by **both** development arms — candidate r12 EMITted
   fact `b4e8e5de…` and baseline r11 EMITted content-identical
   `d9f6e6e0…`. The durable schema-validation contract negative therefore
   survived at the development level on the candidate side; the firecrawl
   family is not part of the H3 38-case holdout ratification, so the pair is
   reported here, not in the scored denominators.
5. **Validator behavior:** correct fail-closed behavior —
   `INSUFFICIENT_SAMPLE` emitted exactly as the frozen v2 rules specify; no
   defect demonstrated. `CENTRAL_SEMANTIC_REMEDIATION_REQUIRED=none` (no
   source patch proven necessary; changing the candidate utility gate's
   SKIP aggressiveness would be a semantic decision for Central, not a bug
   fix).

## 7. Model-policy consistency (H2 vs H3)

- H2 policy digest `30806d64f7d6174d73342ead8021fb09e8a56d606aa6cb3eb890aa0220521501`
  (H2 ratification) vs H3 digest
  `39d8dd80b1427e1e24d52ece1ad30e1319869133201c8fba0c2c9c0caa2247a4` (H3
  ratification). Both are `sha256` of the compact `JSON.stringify` of the
  frozen `model_policy` object.
- The **only** differing field is `identity_note` (a provenance annotation
  recording `270848a` vs `21556fa`). Swapping `identity_note` between the two
  objects swaps the digests exactly — the difference is
  **serialization/provenance identity, not a real settings difference**.
- All functional fields are identical: endpoint `127.0.0.1:8002`, alias
  `chat-fast`, temperature 0, max_tokens 1600, `json_object`, reasoning
  effort null, timeout 90000 ms. The frozen `docs/issue-78/v2-curator/model.mjs`
  source blob is byte-identical at `21556fa` and `270848a`
  (blob `c47edc138981e9dc74f6d5728330f88d8ceeab99`), corroborating the
  identity note's byte-identical claim.
- `execution.model_policy_same_across_arms=true` in the H3 outcomes is
  therefore valid (both H3 arms used the identical frozen policy).

## 8. Limitations

1. Candidate sample below the 8-grounded-fact floor → utility gate
   `INSUFFICIENT_SAMPLE`; observed 2/2 useful is not certifiable at 95%.
2. Candidate under-capture (4/29 valuable selected, 2/29 retained) →
   coverage/preservation gates FAIL on the frozen thresholds.
3. Development arms use the exposed #81 cronparse/firecrawl corpus
   (development-only by design); they are reported but excluded from scored
   denominators.
4. Episode content digests are published in lieu of raw private excerpts;
   private bytes remain host-side (mode 0600 locators in §1).
5. One development fact (`b43602f3…`) is grounded with whitespace
   normalization (source newlines vs assertion spaces); documented in §4.
6. This H3 result is a local evidence-only publication on
   `work/91-memory-utility-r1`; the v2 scorecard (exit 0, `gates_complete`)
   is the acceptance artifact for the campaign.

## 9. Friction (summary; canonical block in the handback)

`encountered=yes` — three evidence-side interface issues, all recovered
without touching acceptance-bearing command shapes: (1) redis-cli
numbered-list parsing for the FalkorDB readback required two parser fixes
(nested blocks + UTF-8 `\xNN` decoding); (2) an inverted string-join bug in
`h3-source-verify.mjs` (recovered and re-verified); (3) `_episode-index`
files are keyed by episode UUID, not record id (discovered during
reconciliation). No guard rejections; the native runner and the v2 scorer
ran in native shape with preserved exit statuses.
