# A3 post-exit reconciliation — Issue #92 A1–A3 consolidated evidence update

Supersedes the `a3_post_exit: prepared_not_run` entries in `scorecard.json` of this
packet. This is the read-only evidence and adjudication campaign for the corrected
post-exit run (`A3_RUNNER_EXIT=0`), executed after the reviewed evidence head
`23718d0acfafa6f603b393eca0102fcc01fe9472` (which carries the corrected
`set -Eeuo pipefail` runner `a3-post-exit-run.sh` and `CENTRAL_REVIEW.md`).

No model calls, drain/reconcile writes, Graphiti extraction, queue resets, retry
authorization, service changes, or destructive cleanup were performed in this
reconciliation. All statements below are read-only inspections of the native
post-exit log, local review stores, private frozen corpora, and live Graphiti
terminal readback.

## 1. Identities

| Item | Value |
|---|---|
| Repo / branch | `fvanevski/opencode-operational-schema-guard` / `work/91-memory-utility-r1` |
| Source baseline | `c8eb5260f2b10832346234b1b5d0cf28302ffba8` (== `origin/main`) |
| Source candidate | `270848aa108df22b9d12738cc6f4903ec45da9c1` |
| Reviewed evidence head (parent of this commit) | `23718d0acfafa6f603b393eca0102fcc01fe9472` (== remote branch head pre-commit) |
| Prior evidence-only commit | `fa685f95710271230a80d1d468bc033d6667311a` |
| Baseline `curator-cli.mjs` blob (worktree-pinned) | `16c7ac905a3cfd4ee31245b8ce4a8dce0ed14440` |
| Candidate `curator-cli.mjs` blob (worktree-pinned) | `0d75f2335cf4606799a4bddf8be0686e389466ca` |
| Private gh_mcp holdout corpus SHA-256 | `b81d446201545142d69691fc20c87312986f648ba2cc1691e0de0c4f26657d54` (verified on host) |
| Private #81 cronparse corpus SHA-256 | `524de3ff36877442c6dc4e75edf5da9f317ba1c2e25e267b117233514e425863` (verified on host) |
| Private fact-level adjudication (host, mode 600) | `/home/filip/.local/state/ghdev-graphiti-issue92/private/issue92-a3-post-exit-adjudication.json`, SHA-256 `a9009dcc1a853b1ac2987a0f9cc995f6f827b39466022bd41e9981f0540c11c4` |
| Runner (reviewed, exact blob at `23718d0`) | `docs/issue-91/evidence/92-a1-a3-first-campaign/a3-post-exit-run.sh` (SHA-256 `64c596401e59c5aa67e4e1911e8e8c1b06dd36b58aa468be5e45ad7af8b0a352` per `manifest.json`) |
| Native post-exit log (private) | `/tmp/opencode/issue92-a1-a3/a3-post-exit.log` (mtime 2026-11-08 12:56:59 local) |
| Model policy | alias `chat-fast`, endpoint `http://127.0.0.1:8002/v1/chat/completions`, temperature 0, `json_object`, no reasoning override, max_tokens 1600 (frozen in `a3-two-arm-config.json`) |

Worktree preflight of the reviewed runner verified `baseline` == `c8eb5260…` and
`candidate` == `270848a…` before any arm ran (the runner aborts on mismatch; all
four arms ran, so the preflight passed).

## 2. Four-arm status (native `a3-post-exit.log`)

All four arms ran sequentially under their own genuine EX admission
("EX admission proven; invoking candidate drain with lock retained"), each with
`exit=0`.

| arm | group | code | drain passes | curated | deferred | model_attempts | model_calls | model_errors | queued | approved | persisted | terminal status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| base-dev | `graphiti-curator-utility-development-r01` | baseline | 1 | 3 | 3 | 3 | 0 | 3 | 0 | 0 | 0 | `review_required` |
| cand-dev | `graphiti-curator-utility-development-r02` | candidate | 1 | 3 | 3 | 3 | 0 | 3 | 0 | 0 | 0 | `review_required` |
| base-holdout | `graphiti-curator-utility-holdout-r03` | baseline | 3 (6+6+5) | 17 | 17 | 17 | 0 | 17 | 0 | 0 | 0 | `review_required` |
| cand-holdout | `graphiti-curator-utility-holdout-r04` | candidate | 3 (6+6+5) | 17 | 17 | 17 | 0 | 17 | 0 | 0 | 0 | `review_required` |
| **total** | — | — | 8 | **40** | **40** | **40** | **0** | **40** | **0** | **0** | **0** | — |

- **Decisions**: all 40 curation records `state=deferred`, `decision=DEFER`,
  `reason=curator_unavailable_or_invalid`, `facts=[]`, `remote_episode_uuid=null`,
  `revision=1`, `origin=curated` (verified across all 40 review-store files).
- **Model-call totals**: 40 attempts, **0 successful calls**, 40 errors. No model
  JSON was accepted in any arm, so no EMIT/SKIP/DEFER model decisions and no
  persisted facts exist anywhere.
- **Holdout late-reconciliation**: each holdout arm ran two `reconcile-only`
  passes (`review_count` 6→12, `queue_new` 14→7, `reconciled_persisted=0`,
  `unresolved=0`, `status=work_remaining`) with `LATE_RECONCILIATION_LOCAL_WORK`
  resumption under the retained EX; the third drain pass then curated the final 5
  candidates per arm, leaving the queue empty (`queued=0`) with 17 deferred
  candidates per holdout arm.
- **Incomplete/deferred work**: 40/40 candidates remain `deferred`
  (operator adjudication + model re-attempt pending). No unresolved remote Graphiti
  work (`unresolved=0` in all reconcile-only receipts).

### Root cause of the 40 model errors (host, read-only diagnosis)

The litellm proxy (port 8002) was restarted at 12:37 local, minutes before the
drain window (12:54:58–12:56:59 local), and `/v1/models` returns HTTP 500 both
during (inferred from the uniform `model_errors`) and after the window (verified
live during this reconciliation). Every model attempt therefore failed and the
curator **fail-closed** exactly per contract (`curator_unavailable_or_invalid`
DEFER, no forced EMIT). This is a host availability fault, **not** a
source-semantic defect of the candidate; `CENTRAL_SEMANTIC_REMEDIATION_REQUIRED=none`
for this outcome.

## 3. Terminal UUID / group / source-index proof (independent remote readback)

Two independent routes agree (a Graphiti MCP readback and a raw FalkorDB
readback of the per-group graphs at `redis://127.0.0.1:6382`):

| graph (group) | Episodic | Entity | total nodes |
|---|---|---|---|
| `graphiti-curator-utility-development-r01` | 0 | 0 | 0 |
| `graphiti-curator-utility-development-r02` | 0 | 0 | 0 |
| `graphiti-curator-utility-holdout-r03` | 0 | 0 | 0 |
| `graphiti-curator-utility-holdout-r04` | 0 | 0 | 0 |
| `development-knowledge` (production) | 355 | 276 | (latest episode `2026-11-08T03:57:03Z`, pre-campaign) |
| `graphiti_live` (default) | 0 | 0 | 0 |
| `ghdev_gh_mcp` (legacy #81 group) | 0 | 0 | 0 |

- **Remote episode identity**: no persisted episode exists in any campaign fixture
  group; zero `remote_episode_uuid` values across all 40 local records, so there
  is no ACK or local `persisted` field to over-credit — terminal persistence is
  independently confirmed **absent**.
- **Fixture-group proof**: the four group-named graphs exist (registered) and are
  empty; no relabel of any existing remote group/episode occurred.
- **Source-index membership**: no campaign source is registered in any remote
  graph (fixture graphs contain 0 nodes of any label); the local review-store
  source index is empty for the campaign groups because no review reached
  `persisted`. Queued/ACK stages are not counted as persisted.

## 4. Paired baseline vs candidate persisted-fact matrices

Paired by original frozen source case (44 unique cases: 24 cronparse development
+ 20 gh_mcp holdout), development/holdout separation preserved:

| split | family | cases | valuable (frozen/provisional) | baseline persisted | candidate persisted |
|---|---|---|---|---|---|
| development | cronparse | 24 | 14 (frozen #81 labels) | 0 (grounded 0 / useful 0 / nonuseful 0 / redundant 0) | 0 (0/0/0/0) |
| holdout | gh_mcp | 20 | 10 (provisional, operator-pending) | 0 (0/0/0/0) | 0 (0/0/0/0) |

Per case (all 44): baseline `deferred/DEFER` and candidate `deferred/DEFER`
(identical terminal state; no arm diverged). Sample denominators: curated
candidates per arm-pair = 3 (dev) + 17 (holdout) = 20; 40 total across four arms.
Model configuration identity is independent per arm as frozen (`a3-two-arm-config.json`);
source identity is exact within each arm (group-specific `event_id`, shared source
handles), verified by the seed identity contract and the staged review records.

## 5. Utility / groundedness numerators, denominators, Wilson 95% intervals

| metric | numerator/denominator | estimate | Wilson 95% | disposition |
|---|---|---|---|---|
| useful among grounded-persisted (≥0.75 gate) | 0/0 | undefined | — | **INCONCLUSIVE**; floor of ≥8 receipt-backed grounded persisted facts unmet (0 < 8) → **INSUFFICIENT_SAMPLE** |
| source-grounded precision among persisted (≥0.90 gate) | 0/0 | undefined | — | **INCONCLUSIVE** (zero denominator; no fabrication observed because nothing persisted) |
| low-value persisted reduction | baseline 0, candidate 0 | — | — | baseline denominator zero → **non-inferiority** form; 0 vs 0, vacuously non-inferior, uninformative |
| high-value retention (≥0.85, frozen representative set) | 0/10 (holdout), 0/14 (dev) | 0.0 | — | **not met** for this cohort (diagnostic) |
| persisted-candidate fraction per arm (descriptive) | 0/20 | 0.0 | [0.0000, 0.1611] | descriptive only |
| persisted-candidate fraction overall (descriptive) | 0/40 | 0.0 | [0.0000, 0.0876] | descriptive only |
| CPU broad capture (inherited, deterministic; cron 14/22, webvtt 10/19, gh_mcp 10/20) | see `scorecard.json` | 0.583 / 0.526 / 0.500 | [0.4295, 0.8027] / [0.3171, 0.7267] / [0.2993, 0.7007]; recall 1.0 each | unchanged by this run |

No zero denominator is relabeled PASS.

## 6. Missed valuable cases

- **Holdout (gh_mcp, provisional labels)**: 10/10 — case IDs `i92-h-01-07b0fead` … `i92-h-10-1a03d6aa` (see `issue92-holdout-corpus-sanitized.json`); not persisted in **either** arm.
- **Development (cronparse, frozen #81 labels)**: 14/14 valuable cases not persisted in either arm.
- Cause is the shared host fault in §2 (model endpoint unavailable in both arms),
  so the miss list is a property of the *run*, not of the candidate policy. Exact
  staged excerpts for every case are in the private adjudication file (§7).

## 7. Operator adjudication (pending) — private fact-level record

- The frozen labels (10 valuable / 10 nonvaluable, `label_status: provisional`,
  `ratification: operator-pending`) and the chronology (freeze
  `2026-11-08T20:26:11Z` precedes any candidate model output) are **preserved
  unchanged**; no post-hoc relabeling was performed.
- Because no candidate fact was emitted, groundedness/usefulness of facts is
  **unadjudicated** (there is nothing to ground-check); the private adjudication
  file records, per case: exact staged excerpt, source locator, frozen label,
  state/decision, and a clearly marked **provisional** judgment (useful-case
  families would support a durable fact *if* a model EMIT had succeeded).
  Provisional judgments are **not** operator ratification.
- Private file (operator-inspectable, mode 600):
  `/home/filip/.local/state/ghdev-graphiti-issue92/private/issue92-a3-post-exit-adjudication.json`
  (SHA-256 `a9009dcc1a853b1ac2987a0f9cc995f6f827b39466022bd41e9981f0540c11c4`).
- **Three-task-family limitation (assessed, no retrospective reclassification)**:
  the pre-registered untouched holdout required ≥3 substantive task families; the
  gh_mcp holdout declares exactly one (`families: ["gh_mcp"]`; `combined_family_count: 3`
  counts development + holdout, which `CENTRAL_REVIEW.md` rules not equivalent).
  Per Central review, this cohort is therefore a **clearly-marked diagnostic**
  and the family-coverage gate is **INSUFFICIENT_COVERAGE**; it must not be
  certified as independent acceptance without a prospectively frozen multi-family
  roster established before outputs.

## 8. Pre-registered gate disposition

| gate | disposition |
|---|---|
| `GATE_UTILITY` (≥8 receipt-backed grounded persisted facts; ≥75% useful among grounded persisted) | **INSUFFICIENT_SAMPLE** (0 facts < 8) |
| `GATE_GROUNDEDNESS` (≥90% source-grounded precision among persisted) | **INCONCLUSIVE** (0/0) |
| low-value/redundant reduction | **non-inferior (vacuous)** — baseline 0, candidate 0 |
| useful-family preservation vs baseline | no baseline-family miss (baseline persisted nothing); absolute missed valuable = 24 (10 holdout + 14 dev) |
| high-value retention ≥85% (frozen representative set) | **not met** (0/10, 0/14) — diagnostic cohort |
| privacy / wrong-group / fabricated-source / EX-bypass | **PASS** (0 persisted facts; valid named fixture groups; EX retained per arm; zero production writes) |
| 3-task-family pre-registration | **INSUFFICIENT_COVERAGE** (1 family in untouched holdout; no reclassification) |
| `CANDIDATE_CAPTURE_CONTROL` (14/14 #81) | inherited PASS from `scorecard.json` (CPU re-run, candidate worktree, `tp=14 fn=0`) |

Overall: `ISSUE92_A1_A3_RESULT=PARTIAL` (A1/A2 complete and accepted-in-scope by
Central; A3 executed with fail-closed terminal state; utility/groundedness
gates `INSUFFICIENT_SAMPLE`/`INCONCLUSIVE`; cohort diagnostic per
`INSUFFICIENT_COVERAGE`).

## 9. Production `development-knowledge` no-side-effect verification

- Local production curation state
  (`/home/filip/.local/state/ghdev-graphiti/curation-v1/development-knowledge`):
  no file modified since **2026-11-07 19:57:07 local** (pre-campaign; matches the
  latest production episode `2026-11-08T03:57:03Z`).
- Remote `development-knowledge` graph: 355 episodic / 276 entity nodes, latest
  episode created pre-campaign; zero campaign writes.
- `ghdev_gh_mcp` and `graphiti_live` graphs: 0 nodes, unchanged.
- Services: Graphiti MCP (8766) and NInfer (8001) continuously running; litellm
  (8002) was restarted 12:37 local **before** the drain window (host-side, not a
  campaign mutation). The standing production post-exit drain watcher
  (`development-knowledge` group, separate state root
  `/home/filip/.local/state/ghdev-graphiti`) is infrastructure and was not
  touched by the campaign. No timers, scratch config, or service overrides were
  left modified; all campaign state is under `/tmp/opencode/issue92-a1-a3/`.

## 10. Limitations

1. **Zero persisted facts in every arm** — the model-backed comparison is
   vacuous this run; all utility/groundedness gates are
   `INSUFFICIENT_SAMPLE`/`INCONCLUSIVE` by the frozen rules (no manufactured
   EMIT, no holdout enlargement).
2. **Single task family in the untouched holdout** with operator-pending
   labels → diagnostic cohort only (`INSUFFICIENT_COVERAGE`); acceptance
   requires a prospectively frozen ≥3-family roster before outputs.
3. Model failure was a host availability fault (litellm 500); the drain
   fail-closed correctly, but no arm observed a successful model decision, so
   policy behavior under a healthy model remains unexercised post-exit.
4. The gh_mcp `native_event` reconstruction fidelity limit (from
   `limitations.md`) stands: `source_locator_sha256`/`native_event_text_sha256`
   bind original provenance; not a source-exactness limit for the capture path.
5. Trusted Actions `repository-final-v1` receipt remains `central_pending` at
   the final source head.

## 11. COMMAND_SHAPE_FRICTION (canonical, this reconciliation session)

```text
encountered=yes
events:
  - scenario=issue92-a3-reconciliation:plan-tail-read
    requested_shape=git show 23718d0…:docs/issue-91/ISSUE92_CURATOR_PLAN.md | tail -n +48
    effective_shape=rtk-truncated-display_then-same-content_via_sed_range
    rewrite_provenance=rtk_opencode_hook
    event_kind=harness_rewrite
    execution_effect=recovered_after_retry
    correction_or_annotation=display replaced remaining lines with a "see remaining" pointer; full tail recovered via sed -n range on the same git show
    replacement_shape=git show 23718d0…:<path> | sed -n '46,60p'
    recipe_reference=GHDEV-10 (rtk display-truncation advisory)
    resource_reference=docs/issue-91/ISSUE92_CURATOR_PLAN.md
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=issue92-a3-reconciliation:state-inventory
    requested_shape=find /tmp/opencode/issue92-a1-a3 -maxdepth 3 | sort | head -100
    effective_shape=executed_succeeded_display-truncated_by_tool
    rewrite_provenance=other_harness_hook
    event_kind=harness_rewrite
    execution_effect=recovered_after_retry
    correction_or_annotation=large output saved to side file; full inventory read natively from the saved file
    replacement_shape=read <saved full-output file>
    recipe_reference=none
    resource_reference=/tmp/opencode/issue92-a1-a3/state
    contract_conflict=no
    durable_gap_candidate=no
inherited_canonical_events: see friction.md of this packet (read-contract rtk truncation; zsh `===` glob; rm -rf denial → python rmtree; three seed-identity wiring fixes)
omitted_sensitive_values=yes
```

## 12. Recommended next action (one)

Restore a healthy `chat-fast` endpoint (litellm 8002 currently returns 500 on
`/v1/models`), then re-run the **same reviewed four-arm post-exit runner**
(`a3-post-exit-run.sh` at `23718d0`) under a fresh post-exit EX admission: the
40 deferred candidates are resumable (no queue reset, no persisted-write
replay), and a healthy model pass is what the `INSUFFICIENT_SAMPLE` gate
requires (≥8 receipt-backed grounded persisted facts) before operator fact
adjudication; keep the cohort marked **diagnostic** until a prospectively
frozen ≥3-family untouched holdout is established before any new outputs.
