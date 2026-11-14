# Issue #92 H4 — extract-first candidate qualification: final result packet

Sanitized evidence commit (2 of 2) on `work/91-memory-utility-r1`. No private source
text, credentials, raw inference payloads, or sensitive episode content are included
in this directory; per-fact assertion text and rationales remain in the private
`/tmp/opencode/i92/h4/` artifacts.

## 1. Scope and identity

Qualify the extract-first candidate `e0360f0` against the accepted baseline `c8eb526`
on (a) a fresh development set (diagnostic, reported separately) and (b) one
prospective independent cluster-level holdout (acceptance), under the installed
post-exit EX gate, then score with the versioned scorers and publish this packet.

| identity | value |
|---|---|
| baseline source | `c8eb5260f2b10832346234b1b5d0cf28302ffba8` |
| candidate source | `e0360f03bbaf2d47f5ad167ff0c57c021cc12aed` (= H3 candidate `21556fa` + 4 extract-first prompt instructions in `core.mjs` `modelPrompt`) |
| scorer head | `86ce73ac522357a5918a9d3ca84c71ed944296c8` (pins `h4-coverage.mjs` EXPECTED_SOURCE candidate to `e0360f0`) |
| model alias / temperature | `chat-fast` / 0 |
| model policy digest | `39d8dd80b1427e1e24d52ece1ad30e1319869133201c8fba0c2c9c0caa2247a4` (byte-for-byte reuse of the H3 frozen `model_policy` object) |
| groups | r15 base-dev, r16 cand-dev, r17 base-prosp, r18 cand-prosp (`graphiti-curator-utility-{development,holdout}-rNN`); fresh disposable groups, H3 r11–r14 and all #81 groups untouched |
| EX gate | canonical post-exit EX gate; exactly-once native launchers; production `development-knowledge` group untouched |

## 2. Freeze, ratification, chronology

See `h4-freeze-receipt.json`. Both freezes + both AI ratifications were created at
`2026-11-09T05:19:10.847Z`, strictly before the first model start
(`2026-11-09T16:00:41Z`); both passed `H2_PREFLIGHT_PASS`. The receipt was committed
evidence-only after the campaign (disclosure, §8).

- Prospective: 26 cluster cases (one representative durable target per independent
  review cluster; session-level cluster keys), 24 valuable, 4 families
  (issue75 ×7, issue26 ×7, issue70 ×6, issue79_80 ×6), no overlap with exposed
  #81/H1/H2/H3 material. corpus `2f76a437…`, freeze manifest `010a9c62…`,
  ratification `584c7839…`.
- Development: 72 cases (34 exposed H2 dev + 38 H3 cohort), 49 valuable, 5 families
  (cronparse ×24, firecrawl ×10, hermes ×14, openviking ×10, plex ×14), 1 label
  change. corpus `0a34021c…`, freeze manifest `c6170f71…`, ratification `a5dc8fce…`.

## 3. Campaign execution

- Seeding: 72/72 (dev) and 26/26 (prospective) events per arm, zero invalid.
- First EX-gated drain (`i92h4-post-exit-run.sh`, 16:00:41Z–16:06:31Z, exit 0): all
  4 arms terminal, model inference ran, `model_errors=0`. Graphiti `:8766` was down
  during this drain, so EMIT records deferred `duplicate_check_unavailable` and 0
  episodes persisted remotely.
- Recovery: Graphiti restarted (stuck empty `graphiti_live` graph reset — zero
  episodes lost), 44 deferred records marked `reevaluate_requested`, re-modeled at
  temperature 0 (stable decisions), then `add_memory`-persisted. Recovery drain
  (`i92h4-recovery-run.sh`, ended 16:39:06Z, exit 0). A first recovery attempt
  exited 2 on the wrapper's `lock-timeout` cap (660 > 600); corrected to 600 before
  the successful attempt.
- Decision distributions (records): r15 20 EMIT / 3 DEFER; r16 5 EMIT / 10 DEFER /
  8 SKIP; r17 17 EMIT / 8 DEFER / 1 SKIP; r18 1 EMIT / 7 DEFER / 18 SKIP.

## 4. Terminal remote proof

See `h4-remote-receipts.json`. Persisted episodes: r15=20, r16=5, r17=17, r18=1
(43 total). Reconciliation against raw FalkorDB (`Episodic` nodes, per-UUID field
readback) verified name, assertion content, source references, scope group, and
episode index for every record: **ALL_OK=true**, 0 problem rows, 0 extra remote
episodes. MCP `get_episodes` readback: r17=17, r18=1.

## 5. Blinded fact adjudication

See `h4-adjudication-summary.json`. All 43 facts judged from the blinded packet
(arm identity withheld) before unblinding: grounded 43/43 (33 exact-contiguous, 5
markup-only non-contiguous with all components verified present in the live source,
5 pruned cronparse messages grounded in the frozen seeded-event excerpts), useful
32/43 (one-off test-result/status fragments judged low-value per the H2/H3
precedent), redundant 2 (within-arm repeats in the baseline prospective arm),
privacy 0 (Prowlarr-key fact follows the H2/H3 secret-location precedent),
authority 0, fabricated 0. Prospective target support: 15/18
(baseline 14/17; the 3 unsupported facts persist a pytest result or a
strict-start-mismatch status that does not preserve their cluster's pre-frozen
durable target; candidate 1/1).

## 6. Scores

See `h4-prospective-scorecard.json` (v3, acceptance) and `h4-dev-scorecard.json`
(v2, development diagnostic).

### Prospective (acceptance) — overall `INSUFFICIENT_SAMPLE`

| gate | result |
|---|---|
| sample / usefulness | `INSUFFICIENT_SAMPLE` (candidate grounded facts = 1 < 8) |
| groundedness | PASS (1.0 both arms) |
| valuable_capture | PASS (24/24 valuable ingested, both arms) |
| valuable_persisted_case_coverage | **FAIL** (candidate 1/24 = 0.0417 < 0.85; baseline 8/24 = 0.3333) |
| selectivity | PASS (candidate low-value 0 < baseline 9; rate 0.0 ≤ 0.529) |
| baseline_useful_preservation | **FAIL** (7 of 8 baseline-useful valuable cases not retained by the candidate) |
| privacy_source_authority | PASS |
| redundancy_nonregression | PASS (candidate 0 ≤ baseline 2) |
| valuable_selection | **FAIL** (candidate curator-selected 1/24 = 0.0417 < 0.85) |

### Development (diagnostic) — overall `INSUFFICIENT_SAMPLE`

Gates: groundedness PASS, valuable_capture PASS (44/49 = 0.898), selectivity PASS,
redundancy PASS, privacy PASS; valuable_persisted_case_coverage FAIL
(candidate 5/49 = 0.102; baseline 17/49 = 0.347), baseline_useful_preservation FAIL
(13 baseline-useful cases missed by the candidate), sample/usefulness
`INSUFFICIENT_SAMPLE` (candidate grounded = 5 < 8).

### Causal diagnosis (source-backed)

The extract-first instructions rank a *single eligible durable excerpt* and grant a
positive EMIT preference only for independently exact, attributable, safe durable
spans. The candidate applies that bar strictly and suppresses EMIT: prospectively
18/26 clusters SKIP, 7 DEFER, 1 EMIT (vs baseline 17 EMIT / 8 DEFER / 1 SKIP);
development 5 EMIT / 10 DEFER / 8 SKIP (vs 20 EMIT / 3 DEFER). Where the baseline
EMITs a representative fact from a cluster, the candidate usually finds the durable
span non-exact (paraphrased, multi-part, or status-flavored) and SKIPs or DEFERs
the whole cluster. Consequences:

- **valuable_persisted_case_coverage / valuable_selection FAIL**: with one
  persisted cluster-level fact per EMIT, 1 EMIT yields at most 1/24 retained
  valuable target. The candidate's extreme selectivity is the direct cause.
- **baseline_useful_preservation FAIL**: the candidate's single retained
  prospective target (native file-tool `path` contract) is the only baseline-useful
  case it also retains; 7 baseline-useful cases are lost.
- No grounding, privacy, authority, fabrication, or redundancy regression: the
  candidate's 1 persisted fact is grounded/useful/target-supported with zero
  low-value, zero redundant, zero privacy/authority/fabricated.
- The `INSUFFICIENT_SAMPLE` overall reflects the pre-registered candidate-grounded
  sample floor (≥8); the campaign consumed the untouched holdout exactly once, so
  the truthful result stands without extension.

## 7. Source and production state

- `source_unchanged`: both worktrees verified at the exact SHAs before each drain;
  no source edits during inference.
- `production_unchanged`: `development-knowledge` group untouched; the only
  service-side mutation was the Graphiti `:8766` restart and reset of the stuck
  empty `graphiti_live` graph (0 episodes) during recovery.

## 8. Disclosures and limitations

1. **Development card identity**: the dev `score-v2` scorer is pinned to the H3
   source identity (candidate `21556fa`); the dev candidate arm executed under
   `e0360f0` (21556fa + the extract-first prompt patch). The dev card is a
   development-only readiness diagnostic, not the acceptance score; the acceptance
   identity is `e0360f0` via the prospective v3 card.
2. **Freeze receipt timing**: the freeze/ratification artifacts predate the first
   model start (chronology in §2); the receipt commit itself was made after the
   campaign as an evidence-only commit.
3. **12 uningested development cases**: dev cases with tool-call source refs
   (`:tool:call_…`) cannot be ingested by native message capture; they carry
   `ingested=false`, `captured=false`, `decision=DEFER` (not-processed) in both
   dev arms — an arm-matched ingress limitation, not a candidate regression.
4. **5 pruned cronparse messages**: live opencode.db rows pruned; assertions
   grounded in the frozen seeded-event excerpts captured at seed time (excerpt
   SHA-256s recorded in the private packet; the `msg_…lOwT3` excerpt SHA matches
   the H3 frozen map).
5. **Sample floor**: candidate grounded facts (1 prospective, 5 dev) are below the
   ≥8 sample floor, so `sample`/`usefulness` report `INSUFFICIENT_SAMPLE`; the
   coverage/selection/preservation failures above are computed and stand.

## 9. COMMAND_SHAPE_FRICTION

`encountered=yes`. `COMMANDS_MATCH_HANDOFF=yes` (the handoff-specified scorer
commands were executed verbatim; drain commands were the prepared exactly-once
launchers per contract).

| # | event | class | attribution | outcome |
|---|---|---|---|---|
| 1 | `rm -rf` of a state dir rejected by shell permission; preserved via `mv` aside | pre_execution_rejection | agent command | fixed |
| 2 | seeder emitted invalid session-level cluster keys; seeder contract fixed, re-seed | interface_discovery | agent tool | fixed (re-seed clean) |
| 3 | recovery `lock-timeout=660` rejected (wrapper cap 600) | interface_discovery | agent command | fixed to 600, re-launch exit 0 |
| 4 | FalkorDB episode label `episode` vs actual `Episodic` (Graphiti 0.31.2) | interface_discovery | host/tool | corrected query |
| 5 | FalkorDB query cache keyed by query text; no `CACHE OFF` command in this build | interface_discovery | host/tool | fresh query strings forced fresh execution |
| 6 | reconciler footer-parsing bug (multi-line cache footer captured in field values) | masked_producer_failure | agent tool | fixed, ALL_OK=true |
| 7 | packet builder missing `readdirSync` import | interface_discovery | agent tool | fixed |
| 8 | outcomes builder: UUID regex, `extracted_source_ref` selection, redundancy canonical mapping, `DEFER` slot for uningested cases | interface_discovery | agent tool | fixed; both scorers exit 0 |
| 9 | zsh shell scanner rejected command-substitution one-liners; checks moved to script files | interface_discovery | harness | transparent |

No guard rejections on admission-bearing commands.

## 10. Result

The extract-first candidate is **selective and clean but over-suppressive** on the
untouched prospective holdout: zero grounding/privacy/authority/fabrication/
redundancy regressions, valuable_capture 24/24, but only 1/24 valuable targets
persisted (coverage 0.0417, selection 0.0417, 7 baseline-useful cases missed).
The truthful pre-registered result is `INSUFFICIENT_SAMPLE` overall with
`valuable_persisted_case_coverage`, `valuable_selection`, and
`baseline_useful_preservation` FAIL. The development diagnostic shows the same
direction (5/49 coverage). Per the contract, the revealed holdout is not extended;
the source-backed causal diagnosis (extract-first EMIT suppression) is the
return to Central for the next decision.
