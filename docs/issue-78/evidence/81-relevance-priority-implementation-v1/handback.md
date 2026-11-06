# Issue #81 — Relevance-Priority Implementation: Evidence Handback

**Campaign:** `ISSUE81_RELEVANCE_PRIORITY_IMPLEMENTATION_V1`
**Mode:** ISOLATED_HOST_INTEGRATION_PLUS_VALIDATION_PLUS_BOUNDED_EVIDENCE_WRITE
**Repo:** `fvanevski/opencode-operational-schema-guard` · branch `issue/81-relevance-priority`
**Date:** 2026-11-06 (UTC)

## RESULT: PASS (campaign gates); full Issue #81 acceptance remains open (see residual gates)

## 1. Source admission

- Origin: `https://github.com/fvanevski/opencode-operational-schema-guard.git` (matches REPO_ID).
- Remote working-branch ref `origin/issue/81-relevance-priority` head == **`ead09437f1207f31a183745a0f06da087ac0de83`** (STAGED_HEAD), verified after fetch.
- Staged commit parent == **`b39e1ff7d950075273fc2dab7206c5f8a17add70`** (merged main, "Fix native-user Graphiti recall association (#87)") — exact source base.
- Staged diff (3 files, within the allowed envelope):
  - `docs/issue-75/v2-candidate/relevance.mjs` — 1 line: `HISTORICAL_STATEMENT` regex loses the standalone `then` alternative.
  - `docs/issue-75/v2-candidate/relevance-priority-regression.test.mjs` — new 37-line regression test (no private prompt/holdout data embedded).
  - `docs/issue-78/evidence/81-relevance-priority-implementation-v1/LOCAL_AGENT_CONTRACT.md` — this contract (unchanged).
- No other source, test, config, CI or acceptance change. `memory-core.mjs` and `sourced-recall.mjs` are byte-identical between base and candidate (blobs `d35ae68a…` / `2762a987…`).

## 2. Isolated environment

- Candidate worktree: `/tmp/opencode/issue81-impl-ead09437` (detached @ `ead09437…`, clean).
- RED base snapshot: `/tmp/opencode/issue81-red-base-b39e1ff` (detached @ `b39e1ff…` + the staged regression test only).
- Primary checkout preserved (detached @ `3271a97…`, one pre-existing untracked session file untouched). No reset/rebase/clean/sync of the primary checkout.
- Node `v26.13.0`; repo scripts `test` = `node scripts/test-plugin.mjs`, `check` = 38-file `node --check` chain. No host plugin install.

## 3. Source identities

| File | Identity |
| --- | --- |
| candidate `relevance.mjs` | git blob `35747ac8474d78d05d18a00b3badefd0f9ee8c04`, SHA-256 `9767486ef71fa6cf88497a1af801540dc401550a0a472c98cef64f9b4b380100` |
| base `relevance.mjs` | SHA-256 `8db952332db85831ef947f3ac6cef6b96921af314d55e8d14dae70ab5f62da06` |
| regression test | git blob `82372049b7f83f64d41409e3e98fda1789104d61`, SHA-256 `398b74d52cd7d30c580410a60b42903e024a8f16f00db3337d5f62b5528a945c` |
| `LOCAL_AGENT_CONTRACT.md` | git blob `502e8cbd9d4546b700a8ee94d1eaad9ec1b82add` |

## 4. RED baseline (genuine regression)

Command (in the RED base snapshot): `node --test docs/issue-75/v2-candidate/relevance-priority-regression.test.mjs`
**Exit 1 — 3 tests, 1 pass, 2 fail.**

- FAIL `procedural then cannot outrank the more relevant old-to-new cutover` — the S06 procedural-`then` distractor scores `priority 1` where `0` is expected (pre-fix `HISTORICAL_STATEMENT` bare-`then` match).
- FAIL `standalone then does not trigger historical priority in unrelated prose` — `priority 1` where `0` expected.
- PASS `explicit replacement and previous-state markers retain historical priority` (the explicit markers were never broken).

No test was weakened; the failure details above are the actual producer output.

## 5. GREEN candidate checks (at `ead09437…`)

| Command | Exit | Result |
| --- | --- | --- |
| `node --check docs/issue-75/v2-candidate/relevance.mjs` | 0 | syntax OK |
| `node --check docs/issue-75/v2-candidate/relevance-priority-regression.test.mjs` | 0 | syntax OK |
| `node --test` relevance-priority-regression + relevance + relevance-observation-replay | 0 | **17/17 pass** (3 new regression tests + 12 recorded in-sample replay cases; in-sample only, not an independent holdout) |
| `node --test` memory-core + plugin-behavior + association + candidate + long-prompt | 0 | **44/44 pass** |
| `npm run check` | 0 | 38 plugin files syntax-clean |
| `npm test` | 0 | **506/506 pass**, `OPERATIONAL_PLUGIN_TEST_RESULT: PASS` |

All true producer exit statuses retained (no pipe-masked statuses in the recorded results).

## 6. Bounded read-only candidate replay

Full machine record: `candidate-replay.json`. Evidence classes labeled there.

- **S06 required positive: PASS.** Base selected the procedural git-`then` distractor `f1e47f17` (priority 1 via bare `then`); the candidate selects the correct cutover proposition `28893e36` ("group changed from 'ghdev_gh_mcp' to 'development-knowledge'", overlap 5) ahead of the distractor (overlap 3, now priority 0).
- **S13 abstention: PASS** — 0 selected, 11 admitted candidates rejected by the lexical floor, on the equivalent pinned snapshot (12-fact probe, 2026-11-06T16:22:19Z).
- **N02 grouping: PASS** — selection unchanged (`1afbcca0`: development-knowledge fact ABOUT the legacy `ghdev_gh_mcp` group); frozen negative unmodified.
- **N01/N03/N04 negative guards: PASS** — live read-only `search_memory_facts` (group `development-knowledge`, max_facts 12, at 2026-11-06T16:55:40Z; one call per case): candidate filter selects **0** for all three; base pipeline identical; prior frozen captures recorded 0 injections for all three. Prompts reconstructed from private raw traces (frozen prompt texts stay private, sha256-bound).
- **Unchanged cases:** S01, S03, S04, S05, S07, S10 selections identical base vs candidate.
- **Graph drift:** none observed — `development-knowledge` episode count 140 at replay time, matching the prior invariant.
- **In-sample caveat:** the replay reuses the pinned 9-case snapshot; it is not an independent holdout and is not a fresh installed-client acceptance. No new 20-case native campaign was run; no model answers.

## 7. Host changes

None. No production plugin install, no Graphiti writes, no service/configuration change, no new native sessions, no LLM answering. Read-only resolver against `/home/filip/.local/state/ghdev-graphiti` and read-only MCP `search_memory_facts` only.

## 8. Residual Issue #81 acceptance items (not closed by this campaign)

- Frozen native acceptance remains **8/16 FAIL** (threshold 13/16); N02 remains **FAIL_INJECTED**; human precision remains **UNVERIFIED**. This campaign demonstrates the S06 root-cause correction in the relevance layer only.
- `S03/S05/S07` semantic top-12 retrieval misses (embedding property) — not addressed by a relevance-layer fix.
- `S10` index-order tie-break and `S01/S03/S04` named-term literal fence remain distinct demonstrated defects.
- A fresh full native acceptance (or operator-adjudicated holdout) is required before Issue #81 can be accepted; `FULL_NATIVE_ACCEPTANCE_RERUN` is forbidden in this campaign.
- Trusted exact-head Verify receipt: **pending** — no trusted exact-head Verify profile is configured for this branch; reported rather than duplicated as a full-suite rerun.

## 9. Command-shape friction

`encountered=yes`, `commands_match_handoff=yes`. Four agent-authored/harness interface events (one self-masked producer status corrected by a status-preserving rerun; scratch-dir, Code Mode `require`, and JSON-shape discoveries) — full canonical fields in `command-shape-friction.json`. No contract conflict, no durable-gap candidate, no sensitive values in packet files.

## 10. Publication

- One evidence-only commit on `issue/81-relevance-priority`, parent `ead09437…`, containing only this evidence folder (packet files alongside the unchanged `LOCAL_AGENT_CONTRACT.md`).
- Push: single non-force push; remote readback recorded in `validation-results.json` update at push time.
- At most one draft PR to current `main`, linked to #81, if the publication interface permits.

## 11. What was explicitly NOT done

- No source/test semantic redesign (Central-owned), no frozen-acceptance revision, no merge, no issue closure, no Graphiti write, no production deployment, no new datasets, no 20-case native campaign, no force push, no primary-checkout mutation.
