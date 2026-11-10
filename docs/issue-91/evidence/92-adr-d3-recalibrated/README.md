# Issue #92 — D3 recalibrated two-stage development qualification (Phase A result)

**Kind:** sanitized, evidence-only, public.
**Authority:** `docs/issue-91/adr-acceptance/ISSUE92_ADR_D3_RECALIBRATED_QUALIFICATION.md` (D3 contract) at starting head `bcca58324aab70d3e2fabbf2b08bcff1deb588de`.
**Branch:** `work/91-memory-utility-r1`.
**Typed result:** `BLOCKED` (`BLOCKED_SOURCE_DEFECT` — Phase A native gate red at the corrected treatment pin; Phase B model campaign not run).

## Campaign identity

| Field | Value |
| --- | --- |
| Starting GitHub head (admitted) | `bcca58324aab70d3e2fabbf2b08bcff1deb588de` |
| d3:previous treatment pin | `50db627850c28f2ce31a68f547f91f51ee3e43b0` (fact-review.mjs blob `b91a09c444dced446ad7eb51e37682451b2cb28a`) |
| d3:corrected treatment pin | `a19e82c7ab68e710339dfd8b4f1381c75b37e8a5` (fact-review.mjs blob `0131c5f03b3d524517a7ee7d488c4754839f175f`, identical at HEAD) |
| D3 scorer (adr-causal-audit.mjs @ HEAD) sha256 | `12f4f62b29e4efd9b54aecc5b6060ac69a03ff4a25574e41802445c25ffd399c` |
| Private trace wrapper (adr-private-trace.mjs @ HEAD) sha256 | `f4ef907957179fe1c5e863509b35d62f289f5fae44245ab4318ebced75d6d213` (unchanged from D2) |
| Original frozen exposed corpus | `/tmp` private `freeze.json`, sha256 `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f` (24 clusters / 16 valuable / 11 nonvaluable + 1 capture-ineligible privacy control), verified before campaign, unmodified |
| Treatment source scope | a19e82c confined to `docs/issue-78/v2-curator/fact-review.mjs` (+56/-22) and `fact-review.test.mjs` (+42); `core.mjs`, `worker.mjs`, `model.mjs`, `model-policy.mjs`, `curator-cli.mjs` and all `docs/issue-75` Graphiti source invariant between the pins |

## Phase A — native regression suite (mandated commands, producer exits)

Run in the checked-out repository workdir at the admitted head; producer exit codes captured individually (no pipe masking):

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| 1 | `node --check docs/issue-78/v2-curator/fact-review.mjs` | 0 | pass |
| 2 | `node --check docs/issue-78/v2-curator/model.mjs` | 0 | pass |
| 3 | `node --check docs/issue-78/v2-curator/worker.mjs` | 0 | pass |
| 4 | `node --check docs/issue-91/adr-acceptance/adr-causal-audit.mjs` | 0 | pass |
| 5 | `node --check docs/issue-91/adr-acceptance/adr-private-trace.mjs` | 0 | pass |
| 6 | `node --test docs/issue-78/v2-curator/fact-review.test.mjs` | **1** | **13/14 pass, 1 fail** |
| 7 | `node --test docs/issue-78/v2-curator/curator.test.mjs` | 0 | 36/36 pass |
| 8 | `node --test docs/issue-78/v2-curator/issue92-source-fact.test.mjs` | 0 | 5/5 pass |
| 9 | `node --test docs/issue-91/adr-acceptance/adr-causal-audit.test.mjs` | 0 | 14/14 pass |
| 10 | `npm run check` | 0 | pass |
| 11 | `npm test` | 0 | 524 pass, 0 fail (`OPERATIONAL_PLUGIN_TEST_RESULT: PASS`) |

Machine-readable exits: `d3-native-test-results.json` (this directory).

## BLOCKED_SOURCE_DEFECT — bounded corrective diagnosis

**Failing test:** `fact-screen judges the exact persisted source quote, not unrelated cluster context`
(`docs/issue-78/v2-curator/fact-review.test.mjs`, test at line 41, assertion at line 52):

```js
assert.match(msgs[0].content, /source_excerpt|exact quoted assertion|exact quoted/);
```

**Root cause (source, not host):** Central's corrective commit `a19e82c` rewrote the
`factReviewPrompt` system prompt (new wording: "REVIEW EACH QUOTED ASSERTION independently",
"THIS EXACT quoted assertion", "source excerpts") and added three new prompt-wording tests,
but left this pre-existing assertion pinning the *old* prompt wording. The old prompt
contained the lowercase phrase "the exact quoted assertion" (which matched the regex);
the corrected prompt contains only "EXACT quoted assertion" (uppercase) and "source excerpts"
(no underscore), so the case-sensitive assertion no longer matches.

**Discriminating baseline:** the identical test file at the d3:previous pin `50db627` passes
10/10 (producer exit 0). At the d3:corrected pin `a19e82c` (and at HEAD `bcca583`) it is
13/14 with exactly this one failure. The defect was introduced by `a19e82c`, is
deterministic (static case-sensitive regex over a static prompt string; Node v26), and
affects only that one prompt-wording assertion — the new a19e82c tests (long-reason
non-veto, bounded EOF pointer recovery, new reviewer-credit wording) all pass.

**Bounded corrective action (for Central, not performed by this campaign):** update the
single stale assertion at `fact-review.test.mjs:52` to the corrected prompt wording in a new
commit on `work/91-memory-utility-r1`, re-admit D3 at the new starting head, and re-run the
full D3 campaign per the contract. Per the D3 contract this campaign did **not** replace the
treatment source, weaken the test, run the model campaign against a locally uncommitted
patch, or change the scorer source pins.

## Phase B — model campaign: NOT run

Because the Phase A native gate is red at the corrected treatment pin, the one paired
EX-admitted two-arm development comparison (24 clusters × 2 arms, `chat-fast` temp 0,
max_tokens 1600, JSON output, 90 s timeout, separate discovery/reviewer 0600 traces) was
not started. Consequences recorded in `d3-receipt.json`:

- Model calls/tokens: 0 (no model, no Graphiti writes from this campaign).
- Two-arm stage-level scorecards, 16 valuable-target and 11 nonvaluable-target adjudications,
  and exact remote UUID evidence: N/A this round (campaign not started; no favorable-output
  rerun substituted).
- No `d3-state` ReviewStore roots, no `d3-traces` directories, and no
  `graphiti-adr92-d3-*` Graphiti groups were created (0 episodes in both prospective groups).

## Scorer historical-preservation check (passed)

`node docs/issue-91/adr-acceptance/adr-causal-audit.mjs analyze <frozen freeze.json> <private D2 bundle>`
(exit 0) on the D3 scorer at HEAD reproduced the published D2 result
byte-identically (`issue92-adr-exposed-d2-result-v1`, disposition `COMPLETE`,
`identical_to_published_D2_result: true`): D2 previous arm 2/16 `REMOTE_TARGET_PRESERVED`,
two-stage arm `DISCOVERY_VALIDATOR_REJECTED`=5 + `REVIEW_DEFER`=11. The D3 scorer's
frozen-old-validator-for-`d3:previous` / corrected-validator-for-`d3:corrected` wiring is
therefore proven without touching the D2 history.

## Controls (all verified read-only)

- **Production nonmutation:** `development-knowledge` group: 355 episodes, newest
  `created_at` `2026-11-08T03:57:03.076489+00:00` — identical to the D2 receipt baseline
  ("newest episode 2026-11-08T03:57:03Z"); zero new production episodes since D2.
- **Historical groups unchanged:** `graphiti-adr92-d1-previous` 2 episodes,
  `graphiti-adr92-d1-corrected` 15 episodes, `graphiti-adr92-d2-previous` 14 episodes,
  `graphiti-adr92-d2-two-stage` 0 episodes — all equal to the published D1/D2 counts.
- **Installed production source unchanged:** the installed plugin's `v2-curator` directory
  contains no `fact-review.mjs` (one-pass installed default intact; the two-stage opt-in
  exists only in the disposable campaign worktrees).
- **Privacy control:** the capture-ineligible `:ctrl` source was never staged (no D3 queue
  roots exist), so it entered no queue and no prompt in either arm; no trace files exist.
- **EX discipline:** no model call and no Graphiti write was issued from the interactive
  harness in this campaign; all Graphiti access above was read-only `get_episodes`.

## Disposition

`BLOCKED` (`BLOCKED_SOURCE_DEFECT`). No new holdout was run, no model prompts were tuned
locally, no gates were weakened, no favorable-output rerun was performed, and no PR was
created. When Central lands the one-line test repair and re-stages the corrected source,
D3 re-admits at the new starting head and this same contract re-runs end-to-end.
