# Issue #92 — D3 recalibrated two-stage development qualification (final result)

**Kind:** sanitized, evidence-only, public.
**Authority:** `docs/issue-91/adr-acceptance/ISSUE92_ADR_D3_RECALIBRATED_QUALIFICATION.md` (D3 contract).
**Branch:** `work/91-memory-utility-r1`.
**Typed result:** `REMEDIATION_REQUIRED` (campaign complete; corrected arm recovered 2/16 valuable-target terminal retention with bounded duplicate persistence; 14/16 valuable targets still lost, dominant loss stage = independent reviewer).

## Campaign identity

| Field | Value |
| --- | --- |
| Starting GitHub head (admitted, bare `git rev-parse HEAD`) | `2bda5ab4268c2184835d7e82ecda26ece6408cd0` |
| d3:previous treatment pin | `50db627850c28f2ce31a68f547f91f51ee3e43b0` (fact-review.mjs blob `b91a09c444dced446ad7eb51e37682451b2cb28a`) |
| d3:corrected treatment pin | `a19e82c7ab68e710339dfd8b4f1381c75b37e8a5` (fact-review.mjs blob `0131c5f03b3d524517a7ee7d488c4754839f175f`) |
| Scorer (adr-causal-audit.mjs @ head) sha256 | `12f4f62b29e4efd9b54aecc5b6060ac69a03ff4a25574e41802445c25ffd399c` |
| Private trace wrapper (adr-private-trace.mjs) sha256 | `f4ef907957179fe1c5e863509b35d62f289f5fae44245ab4318ebced75d6d213` (unchanged from D2) |
| Original frozen exposed corpus | private `freeze.json`, sha256 `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f` (24 clusters / 16 valuable / 11 nonvaluable + 1 capture-ineligible privacy control), unmodified |
| Treatment source scope | a19e82c confined to `docs/issue-78/v2-curator/fact-review.mjs` + regression tests + diagnostics; `core.mjs`, `worker.mjs`, `model.mjs`, `model-policy.mjs`, `curator-cli.mjs` and all Graphiti source invariant between the pins |
| Model profile | `chat-fast`, temp 0, max_tokens 1600, JSON output, 90 s timeout; both arms two-stage `factReview=true`; distinct 0600 discovery/review traces + call-intents per arm |

## Phase A — native regression suite at `2bda5ab` (all producer exits 0)

The one previously blocking gate is green: Central's repair at `2bda5ab`
(`test(issue-92): retain quoted-assertion check across reviewer prompt
capitalization`) made `fact-review.test.mjs` pass 14/14 (was 13/14 at `bcca583`,
`BLOCKED_SOURCE_DEFECT`).

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| 1–5 | `node --check` (fact-review / model / worker / adr-causal-audit / adr-private-trace) | 0 | pass |
| 6 | `node --test docs/issue-78/v2-curator/fact-review.test.mjs` | 0 | **14/14 pass** |
| 7 | `node --test docs/issue-78/v2-curator/curator.test.mjs` | 0 | 36/36 pass |
| 8 | `node --test docs/issue-78/v2-curator/issue92-source-fact.test.mjs` | 0 | 5/5 pass |
| 9 | `node --test docs/issue-91/adr-acceptance/adr-causal-audit.test.mjs` | 0 | 14/14 pass |
| 10 | `npm run check` | 0 | pass |
| 11 | `npm test` | 0 | 524 pass, 0 fail (`OPERATIONAL_PLUGIN_TEST_RESULT: PASS`) |

Machine-readable exits: `d3-native-test-results.json` (this directory).
Scorer historical-preservation check: rerun of the D3 scorer on the private D2
bundle is **byte-identical** to the published D2 result (`COMPLETE`; previous
arm 2/16 `REMOTE_TARGET_PRESERVED`, two-stage arm 5 `DISCOVERY_VALIDATOR_REJECTED` +
11 `REVIEW_DEFER`) — the frozen-old-validator-for-`d3:previous` /
corrected-validator-for-`d3:corrected` wiring is proven without touching D2 history.

## Phase B — matched two-stage EX campaign (post-exit, exactly-once)

Ran under the canonical EX post-exit wrapper after interactive harness exit
(02:27:38Z → 02:31:13Z UTC, 2026-11-10); both arms `graphiti-adr92-d3-previous`
and `graphiti-adr92-d3-corrected` started from 0 episodes in fresh disposable
groups; 24/24 eligible sources staged per arm (privacy `:ctrl` source
excluded); 0 model calls and 0 Graphiti writes from the interactive harness.

| | d3:previous | d3:corrected |
| --- | --- | --- |
| Wrapper exit | 0 | 0 |
| Model calls (discovery+review) | 47 | 45 |
| prompt / completion tokens | 34222 / 3752 | 47457 / 3919 |
| Trace files (discovery / review) | 24 / 23 | 24 / 21 |
| Unfinished call-intents | 0 | 0 |
| Review records | 24 deferred | 20 deferred, 4 persisted |
| Episodes persisted | 0 | 4 (all four-surface proven) |

### Scorer (D3 result v1, producer exit 0, disposition COMPLETE)

| Stage | d3:previous | d3:corrected |
| --- | --- | --- |
| `REMOTE_TARGET_PRESERVED` | 0 | **2** |
| `REVIEW_DEFER` | 10 | 11 |
| `DISCOVERY_VALIDATOR_REJECTED` | 1 (`adr92-g2`, reason 317 chars > 300 under the frozen D2 validator) | 0 valuable (3 nonvaluable: `adr92-dj4` kind=`constraint` not in allowed set; `adr92-dj7` 518 chars, `adr92-dj8` 509 chars > 450 span bound) |
| `DISCOVERED_OTHER_FACT` | 5 | 3 |

`DISCOVERED_OTHER_FACT` = adjudication label: the arm's candidates for that
case were source-linked but did not express the target claim itself
(`adr92-g1` ×2, `adr92-g4` both arms; `adr92-dj1` previous arm only — its
previous-arm candidate quoted task boilerplate, while the corrected-arm
candidate quoted the actual defect).

## Per-arm target summaries

**d3:previous (0/16 valuable retained):** every valuable target lost at the
independent reviewer (20 `not_substantive`, 1 `source_ambiguous`, 2
`review_uncertain` across the arm's 23 review calls) or at the frozen D2
discovery validator (g2). No episodes persisted.

**d3:corrected (2/16 valuable retained):**
- Retained (independently source-supported, four-surface proven —
  ReviewStore + Graphiti MCP + raw FalkorDB + source index):
  - `sphinx_ascii_rst_header_rows` → episode `c0ed4542-43bc-434b-b42f-d24d0c17b8f4` (quoted span states "Please support header rows in RestructuredText output" + example)
  - `pylint_6386_verbose_flag_negative` → episode `880e3102-af52-48da-8a46-0c54f60c3260` (quoted span states the `verbose` option argument defect)
- Nonvaluable persisted (bounded, duplicate-family representatives):
  - `sphinx_param_dict_render_repetition` (adr92-sp3) → `793d2ac9-34ec-46d5-8d8f-509f636011ca`
  - `django_lazy_string_repetition3` (adr92-dj5) → `3d931557-6d5c-492a-bc36-a956d080c5a1`
- Remaining 14 valuable targets: reviewer `REVIEW` (7 `repetition_candidate`,
  6 `not_substantive`, 1 `review_uncertain` among valuable-case decisions) or
  candidate-not-target-claim (3).

**Order-dependent repetition anchoring (first-loss diagnosis):** within one
drain pass the reviewer's prior-facts window only contains episodes persisted
*so far* in that group. The nonvaluable sibling of a defect family
(`sp3`, `dj5`) was ACCEPTed first and anchored the family, so the valuable
siblings (`sp1`, `dj1`) were then REVIEWed as `repetition_candidate`. The
duplicate gate is behaving as designed, but its anchoring is
order-dependent, which systematically loses valuable targets that share an
underlying meaning with a nonvaluable sibling.

## Controls (all verified read-only, pre- and post-campaign)

- **Production nonmutation:** `development-knowledge` 355 episodes before and
  after, newest `2026-11-08T03:57:03.076489Z` — identical to the D2 baseline.
- **Historical groups unchanged:** `graphiti-adr92-d1-previous` 2,
  `graphiti-adr92-d1-corrected` 15, `graphiti-adr92-d2-previous` 14,
  `graphiti-adr92-d2-two-stage` 0.
- **Installed production source unchanged:** the installed plugin's
  `v2-curator` directory contains no `fact-review.mjs` (one-pass installed
  default intact; the two-stage opt-in exists only in the disposable campaign
  worktrees).
- **Privacy control:** the capture-ineligible `:ctrl` source
  (case `adr92-g1`, `out_of_scope_workspace`) was never staged: 0 queue events
  and 0 trace source-ref hashes reference it in either arm.
- **EX discipline:** no model call or Graphiti write was issued from the
  interactive harness; all model/Graphiti work ran under the canonical EX
  post-exit lease; exactly-once 0600 traces with matching call-intents; no
  `submission_unknown` states (no ambiguous remote attempts, no replay).

## Disposition

`REMEDIATION_REQUIRED`. The corrected treatment materially reduces
low-value persistence (0 boilerplate episodes; 2 nonvaluable duplicate-family
representatives) and recovers 2 independently source-supported valuable
retentions from the D2 two-stage 0/16, with all hard gates intact. But
14/16 valuable targets are still lost and the dominant loss stage is the
independent reviewer (order-dependent `repetition_candidate` anchoring plus
`not_substantive` over-deferral). A handful of favorable model decisions is
not adequate per the contract. No D4 or other unplanned model sweep was
launched.

**Bounded corrective direction for Central (one diagnosis, no local semantic
redesign performed):** make the reviewer's duplicate judgment
corpus/family-aware rather than anchored to whatever sibling was persisted
earlier in the same drain pass (e.g. stable canonical-form dedup, or
representative selection that prefers the most source-stated claim of the
family), so a nonvaluable sibling cannot displace its valuable sibling.

## Files in this directory

- `README.md` — this report
- `d3-receipt.json` — machine-readable campaign receipt
- `d3-native-test-results.json` — Phase A producer exits (supersedes the Phase-A-only capture)
- `d3-causal-result.json` — D3 scorer result (`issue92-adr-exposed-d3-result-v1`)
- `d3-terminal-evidence.json` — sanitized four-surface terminal proof + model costs
