# Issue #81 — benchmark plan (first integrated qualification campaign)

## Scope and authority

- Repo `fvanevski/opencode-operational-schema-guard`, branch `issue/81` at `7922f31bdba125bac5a5f8a1380386ea15adda54` (base `main@d7c32f503eaa4cf4c52bb055b434e0ac71b76f45`, verified ancestor).
- Work: disposable detached worktree `/tmp/opencode/issue81-qual/campaign-ce555621/worktree` (token `ce555621`), created with `git worktree add --detach`; developer worktrees untouched.
- Benchmark root: `docs/issue-78/v2-benchmark/` (evaluator `evaluate.mjs`, targets `targets.proposed.json`).
- Target gate status: `central_proposal` (SHA-256 `17ffb60515f5f96f2d546fd3abf951d0bc008325e38d83145ec4f75a8c76f049`). Thresholds were **not** edited by this campaign; the proposal is unratified and no holdout scoring is claimed against it.

## Corpora (frozen BEFORE any model evaluation / tuning / scoring)

External SHA-256 pinning recorded in `/tmp/opencode/issue81-qual/corpus/corpus-pin.json` (pinned 2026-11-04T03:35:57.961Z, before the development scoring run):

| split | file (external) | cases | SHA-256 | label_status |
|---|---|---|---|---|
| development | `/tmp/opencode/issue81-qual/corpus/development.json` | 57 | `22ae11e64a7a9c443d6f13a79c363115a28b43a27620e5383449bfe32d9fb5b4` | `provisional` |
| holdout (sealed) | `/tmp/opencode/issue81-qual/corpus/holdout.json` | 9 | `f904411e51d0bd9674b7f756f3df5bf44452ca8f63362d75102ceb9df677fce4` | `provisional`, **NOT SCORED** |

- Scope (both splits): `group=cur81_dev`, `project=qualified_project`, `workspace=/tmp/opencode` (disposable campaign scope; never the production `ghdev_gh_mcp` group).
- Split rule: non-overlapping **session/cluster** split. Development uses 20 native sessions + 3 synthetic/supplemental control sessions; the sealed holdout uses 4 native sessions with **zero session overlap** with development (verified). Holdout was not fed through the model, selector scoring, or Graphiti in this campaign.

## Provenance and evidence classes

- Native events from the real stock-V2 session SQLite store (read-only), with actual native `sessionID`/`messageID`/timestamp identities and native event IDs.
- `evidence_class` per case: `actual_live_native` (35 dev cases), `reconstructed_fixture` (3; documented day `2026-11-03T23:00:00.000Z`), `reconstructed_from_sanitized_receipt` (19; the accepted #79 frozen samples `host-sample-frozen.json` / `supp-sample-frozen.json` reused **only as historical development controls** with their original labels, plus `pilot-cases.json` synthetic controls which were never a human holdout).
- Host build note (recorded, not invented): in this host build native shell tool parts persist `state.output=null`, so shell stdout/exit-code observations are **omitted** from the corpus rather than reconstructed. Assistant turn status is derived from native `session_message` `type=assistant` + `time.completed`.
- Private raw transcripts are not exported; corpus cases carry excerpts only where the evaluator's replay requires them.

## Category coverage (development, 57 cases)

| category | dev | holdout |
|---|---|---|
| direct (explicit high-value) | 11 | 2 |
| implicit (decision/architecture, #75-missed style) | 12 | 2 |
| error_fix (fail→fix→test) | 8 | 1 |
| tool | 0 (native tool events folded into clusters) | 1 |
| chatter (low-value negative) | 5 | 2 |
| duplicate (repetitive negative) | 7 | 1 |
| privacy (dummy synthetic payload) | 4 | 0 |
| wrong_group | 2 | 0 |
| conflict (contradictory observations) | 2 | 0 |
| negative_finding | 1 | 0 |

Multi-event clusters: the median and sum error→fix→test chains (7 and 4 dev cases respectively) plus implicit decision clusters form ≥4 meaningful multi-event evidence clusters; the implicit cluster contains a source-supported discovery that the #75 baseline selector misses (see `development-results.json` rows `dev-median-*`, `dev-sum-*`).

## Labels and ratification status

- All case labels are **provisional** (`label_status=provisional`); proposed event/fact labels carry case IDs and source anchors in the corpus files.
- **No human-adjudicated holdout is claimed.** Only the operator can ratify labels/thresholds; the sealed holdout stays unscored until then.
- Incomplete labels remain marked UNVERIFIED in the results; target gate stays `central_proposal`.

## Methodology (thresholds unchanged)

1. `node --check evaluate.mjs` + `node --test evaluate.test.mjs` (6/6 pass after the bench-only `source.patch` gate-ordering fix, returned in this packet, not pushed).
2. Development split scored with the unchanged #75 baseline selector and #79 broad-capture logic on identical inputs (gold_complete=true): aggregates, confusion matrices, denominators and category stratification in `development-results.json`.
3. Privacy/wrong-group guardrails: zero selected privacy/wrong-group cases in the dev split.
4. Model curation + Graphiti: real local LLM (`chat-fast` → Qwen3.8-27B NVFP4 via litellm :8002 → ninfer :8001) through the accepted #80 `model.mjs`/`ReviewStore`/`CandidateQueue`/`curator-cli` path under the accepted Python EX gate, disposable group `cur81_dev_ce555621`; post-exit continuation armed (see `curator-results.json`, `graphiti-readback.json`).
5. No threshold, validator, lexical/extractive, prompt, or frozen-label adjustment was made to force any outcome.
