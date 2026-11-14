# Issue #92 — B1 finite-batch representative selection: one consolidated exposed qualification (final result)

**Kind:** sanitized, evidence-only, public.
**Authority:** `docs/issue-91/adr-acceptance/ISSUE92_B1_FINITE_BATCH_QUALIFICATION.md` (B1 contract).
**Branch:** `work/91-memory-utility-r1`.
**Typed result:** `REMEDIATION_REQUIRED` — material valuable-retention improvement (2/16 → 8/16) with all hard invariants preserved, but duplicate/low-value persistence is **not** bounded: all 11 nonvaluable duplicate-family controls persisted in the finite-batch arm because the joint representative arbitration's scope partition is too fine to ever compare them.

## Campaign identity

| Field | Value |
| --- | --- |
| Starting GitHub head | `4322fd8f94bc9300133437527f45647a6eb11449` |
| b1:previous treatment pin | `a19e82c7ab68e710339dfd8b4f1381c75b37e8a5` (D3 corrected two-stage, `factReview=true`) |
| b1:finite_batch treatment pin | `8a112799a7a42b47c5a044d21aa11ef8ebe21b59` (`runAdmittedFiniteBatch`, `--finite-batch on --max-clusters 24 --max-candidates 48`) |
| Invariant blobs (unchanged across both pins) | `core.mjs` `5b1d33ef`, `worker.mjs` `503bf766`, `fact-review.mjs` `0131c5f0`, `model.mjs` `99cb39a7`, `model-policy.mjs` `866b369b` |
| Intentional B1 modifications only | new `finite-batch.mjs` + `finite-batch.test.mjs`, `curator-cli.mjs` opt-in, one mechanical `/i` regex fix in `fact-review.test.mjs` |
| Original frozen exposed corpus | private `freeze.json`, sha256 `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f` (24 clusters / 16 valuable / 11 nonvaluable / 1 capture-ineligible privacy control), unmodified |
| Model profile | `chat-fast` (temp 0, max_tokens 1600, `json_object`, 90 s), both arms; no third arm |
| Disposable groups | `graphiti-adr92-b1-previous`, `graphiti-adr92-b1-finite-batch` — fresh, started at 0 episodes; production `development-knowledge` and all D1/D2/D3 groups untouched (355/2/15/14/0/0/4 before and after) |

## Phase A — native verification at `4322fd8` (all producer exits 0)

`node --check` × 5 → 0; `node --test` focused suites → finite-batch 14/14, fact-review 14/14, curator 36/36, issue92-source-fact 5/5, adr-causal-audit 14/14 (all exit 0); `npm run check` → 0; `npm test` → 524/524 `OPERATIONAL_PLUGIN_TEST_RESULT: PASS`. Machine-readable: `b1-native-test-results.json` (this directory). No mechanical fixture/command defect required a source repair.

## Phase B — paired disposable staging

Both arms staged the exact 24 eligible native source events from the frozen corpus (0 duplicates, 0 problems) into fresh 0700 ReviewStore roots under private `b1r/state/{previous,finite-batch}`; disposable worktrees pinned at the exact treatment SHAs; the capture-ineligible `:ctrl` privacy control excluded from both queues.

## Phase C — exactly-once EX-gated execution (post-exit)

Canonical post-exit drain wrapper: real harness exit (`2026-11-10T17:27:34Z`, no interactive harness process), 15 s quiet grace, production-drain serialization (drain exited `17:28:19Z` before campaign start), scheduler-idle; `GHDEV_MEMORY_POST_EXIT_LEASE=admitted` retained through terminal reconciliation of both arms; flock held on the canonical lock; exactly-once via `.b1-ran` marker. No model inference ran from the interactive session; each arm wrapper exited 0 exactly once; no favorable-output reruns.

- **b1:previous** — 4 incremental drain rounds (6 clusters each), terminal `review_required`: 4 persisted, 20 deferred (19 `independent_fact_review_required` + 1 `invalid_fact_fields`).
- **b1:finite_batch** — one batch (`d4c22a73…`, snapshot `9f5021ac…`): 24 candidates → 19 approved / 5 `not_substantive` deferred, 67 model calls (24 discovery + 24 utility + 19 arbitration), 0 errors; 19 writes queued pre-graph; `reconcile-only` 11+8+0 → `settled` with positive remote readback.

The new batch worker's private `model-calls` trace is complete: **67 intents + 67 results, zero unpaired** — no unknown model-call outcome, no ambiguous `add_memory` submission, no blind replay. The durable pre-persistence plan (`plan.json` + `snapshot.json`) was frozen before any Graphiti write; all 19 persisted episodes carry `remote_episode_uuid`.

## Phase D — independent source-backed adjudication

**Valuable-target retention (16):** previous arm 2/16 (sp9, py2 — the D3 baseline); finite-batch arm **8/16** (sp2, sp8, sp9, py1, py2, py3, dj1, dj2; `django_lazy_proxy_string_concat`'s claim is additionally contained in the dj1 representative episode). Lost in the finite-batch arm at:
- **Source discovery** (claim not proposed): g1#1 py313-falkordb-smoke, g3#2 temporal-memory-live-test, sp1 defect span (boilerplate instruction span proposed instead).
- **Independent utility** (`not_substantive` on the proposed span): g1#2, g2 llm-param-readonly-audit, g3#1 live-mcp-no-openviking, g4 temporal-validation-skill, sp1.

**Nonvaluable controls (11):** previous arm persisted 2/11 (sp3, dj5); finite-batch arm persisted **11/11** — every Sphinx dict-param repetition (sp3–sp7) and Django lazy-string repetition (dj3–dj8) became a separate `root_cause_fix` episode.

**Root cause of the duplicate pollution (mechanism-level):** `partitionKey = [group, project, workspace]`. Every swebench repetition in the corpus comes from a *different* per-run workspace directory, so each of the 19 accepted candidates landed in its own scope: the plan contains **19 single-member families of 19** and the arbiter's joint comparison was structurally vacuous (each reply: `members:[0], representative:0, distinct_predicate`). Cross-session duplicate families were therefore never compared, and no representative/alternate split occurred.

**Order invariance:** candidate ids are `hash(issue92-finite-fact-v1 | cluster_id | source_ref | assertion)`, pools are sorted by id before arbitration and family ids hash the sorted pool — selection is order-neutral *within* a scope. Limitation: with all families single-member, in-scope order-invariance is vacuous in this corpus, and cross-scope order effects are undefined by design (no cross-scope comparison exists).

**Four-surface terminal proof (all 23 persisted episodes):**
- ReviewStore: 4 + 19 records with `remote_episode_uuid` and episode-index entries.
- Graphiti MCP `get_episodes` (`group_ids` ARRAY, `max_episodes=50`): 4 + 19; UUID sets byte-identical to the other surfaces.
- Raw FalkorDB `Episodic` (read-only `GRAPH.QUERY`): 4 + 19 nodes; UUID sets identical; episode content matches ReviewStore fact text (`Fact 1: …`).
- Source index: 0 `Source` nodes in both b1 groups **and** in production `development-knowledge` (deployment-level characteristic, `e.source_name` empty there too); source identity is carried by ReviewStore `source_refs`/`source_event_ids` and episode content.

**Privacy/authority invariants:** the `:ctrl` privacy ref is absent from queue inputs (both arms), all 67 finite-batch model-call intents/results, all 24+23 previous-arm traces, the snapshot, the plan, and persisted episode content; the g1 cluster carries only its eligible source. Production group and all historical groups unchanged (355/2/15/14/0/0/4 before = after). No PR, merge, closure, production activation, or new holdout.

**Model costs / operator burden:** 114 total calls (47 + 67), 0 errors, 98,361 prompt + 7,609 completion tokens; previous-arm latency 15,535 ms (finite-batch arm latency not tracked in batch output). Operator review backlog: previous 20 deferred, finite-batch 5 deferred (all retained as `review_only_unverified` claims, none silently discarded).

## Phase E — disposition and minimal Central remediation

`READY_FOR_NEW_PROSPECTIVE_DESIGN` is **not** met: bounded low-value duplicate persistence fails (11/11 nonvaluable persisted; 19 persisted episodes include 11 duplicates).

**Minimal Central source patch recommendation (not a parameter sweep):**
1. Coarsen `partitionKey` in `docs/issue-78/v2-curator/finite-batch.mjs` from `[group, project, workspace]` to `[group, project]` (or add a project-level cross-scope arbitration pass after the per-scope pass), so cross-session duplicate families are jointly compared; the arbiter then selects one source-substantive representative per family and keeps alternates as DEFER.
2. Secondary: tighten discovery span selection (the not_substantive losses are dominated by boilerplate instruction spans proposed in place of the source-stated technical claim — g1, g2, g3, g4, sp1).

**Not done:** no source remote update (no mechanical source repair was required); no PR/merge/closure; production curator not activated; no second prospective cohort.

Files in this directory: `b1-scorecard.json` (machine-readable adjudication), `b1-native-test-results.json` (Phase A exits + blob verification).
