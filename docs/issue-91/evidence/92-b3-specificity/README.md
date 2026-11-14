# Issue #92 — B3 specificity-aware semantic-family qualification: one consolidated two-arm run (final result)

**Kind:** sanitized, evidence-only, public.
**Authority:** `docs/issue-91/adr-acceptance/ISSUE92_B3_SPECIFICITY_QUALIFICATION.md` (B3 contract).
**Branch:** `work/91-memory-utility-r1`.
**Typed result:** `ISSUE92_B3_RESULT` = **`BLOCKED`** (typed blocker `B3_SPECIFICITY_SHAPE_MISMATCH`) — the B3 independent specificity counter-review **failed closed** (`SPECIFICITY_UNVERIFIED_NO_GRAPH_WRITES`) on a model-output shape mismatch at the first multi-member family, before any ReviewStore/Graphiti write. The B2 duplicate-reduction benefit is preserved (the `b3:previous` arm settles with 0 singletons and 0 nonvaluable persistence), but the B3 retention-recovery mechanism is **not demonstrated** on this run, so the campaign is blocked from a valid B3 adjudication pending a bounded Central shape-robustness correction.

## Campaign identity

| Field | Value |
| --- | --- |
| Required starting head | `53ec4607aea0fadbeba5488fd2ebc3d5c7882673` |
| b3:previous treatment pin | `f51ca861c05f03bac2d86051a7bb339fe2fb5d05` (B2-corrected project-scoped arbiter) |
| b3:specificity treatment pin | `672cd08fd05db092ff919ec7b247339d094b62b1` (B3 + independent specificity counter-review) |
| `finite-batch.mjs` blob previous | `2f87ed5efa828e0eb389f5f7c8e42653d9a2c46b` |
| `finite-batch.mjs` blob specificity / HEAD | `bcd1d0a2d6f96a7bccbe8cd5947d53e4b0f1fad3` |
| Historical frozen corpus SHA-256 | `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f` (**original freeze byte unavailable**; lost across a reboot before B2) |
| Reconstructed cohort SHA-256 | `ebac7052065766eb8d1ef464142ea63dc3052d52deb36424492ebc477fdd3508` (24/24 message texts byte-match native `opencode.db` records) |
| Invariant blobs (unchanged) | core `5b1d33ef`, worker `503bf766`, fact-review `0131c5f0`, model `99cb39a7`, model-policy `866b369b`, queue `b4e2df18`, curator-cli `3b1bcd7a` |

Only `finite-batch.mjs` changed production semantics since the B2 pin; the B3 change is the independent source-quoted specificity counter-review (`specificityPrompt` / `validateSpecificityFamilies` + one extra model call per high-certainty multi-member provisional family). Opt-in via `--finite-batch on`; installed production and the one-pass default curator are unchanged.

## Native gate (CPU, at 53ec460 — all producer exits 0)

`node --check` ×5; focused suites finite-batch **25/25**, fact-review 14/14, curator 36/36, issue92-source-fact 5/5, adr-causal-audit 14/14; `npm run check` rc=0; `npm test` rc=0 (524 pass). The new 25-case finite-batch suite covers the supported specificity quote, multi-representative result, uncertain-case deferral and ambiguous-specificity no-replay.

## Frozen corpus

24 clusters / 24 eligible sources / 16 valuable targets / 11 nonvaluable controls / 1 capture-ineligible privacy control (`opencode:ses_e767fc4cbffe9zB9WHpLF4PLBe:message:ctrl`). The original private freeze byte was lost to a host reboot; the 24-source corpus is the same native reconstruction used in B2 (`/tmp/opencode/b2-sources.json`), re-authenticated read-only against `opencode.db` (identity + timestamp + exact text, 24/24). **No byte-level claim is made for the historical freeze SHA-256** — it is recorded, not re-verified.

| Family | Sources | Distinct workspaces |
| --- | --- | --- |
| swebench-sphinx | 9 | 8 |
| swebench-django | 8 | 8 |
| swebench-pylint | 3 | 3 |
| graphiti-mcp | 4 | 1 |

## EX admission

Canonical `openviking-commit-gate` EX flock, held through model + Graphiti terminal readback + reconcile. Real harness exit, 30s quiet grace, scheduler-idle, canonical-Graphiti-unresolved check, production-drain serialization.

- **Run 1** (the campaign): `HARNESS_EXITED` 2026-11-11T02:05:43Z → `EX_FLOCK_ACQUIRED` 02:06:14Z → quiet grace 30s → `EX_ADMISSION_PROVEN` 02:06:44Z. `b3:previous` settled rc 3→0 (positive reconcile, no model replay). `b3:specificity` **failed closed** rc=1 at the first specificity counter-review (pre-patch launcher logged it as an unclassified `FAIL_CLOSED`).
- **Run 2** (bounded no-replay reconcile/re-derivation, not a favorable-output rerun): 02:15:04Z exit → 02:16:02Z admitted. `b3:previous` rc=0 reconcile-only; `b3:specificity` rc=1 deterministic re-derivation from the 48 frozen call pairs. **Zero new model calls, zero graph writes** (no model-call file newer than 02:07:40Z; group counts unchanged 4 / 0). The terminal record write hit a launcher `write_text(mode=…)` bug (fixed); `.b3-terminal` was recorded post-hoc with provenance.

## Arms (model profile: `chat-fast`, temperature 0, max_tokens 1600, json_object, 90s)

| | b3:previous (`f51ca861`) | b3:specificity (`672cd08`) |
|---|---|---|
| Group (fresh, empty) | `graphiti-adr92-b3-previous` | `graphiti-adr92-b3-specificity` |
| Partition | `[group,project]` | `[group,project]` |
| Status | `review_required` (settled) | **terminal halt** `SPECIFICITY_UNVERIFIED_NO_GRAPH_WRITES` |
| Candidates / approved / deferred | 30 / 4 / 26 | 22 accepted to arbitration / 0 materialized |
| Persisted | 4 | 0 |
| Families / pool sizes | 3 (8 + 9 + 3) | 1 provisional completed (django 8), 0 refined |
| Singleton pools | 0 | n/a (halt) |
| Model calls (disc/util/arb/specificity) | 51 (24/24/3/–) | 48 (24/22/1/1) |
| Model errors | 0 | 0 |
| Tokens (prompt+completion) | 48,266 + 4,258 | 44,427 + 4,247 |
| Deferred reasons | 14 alt_equiv, 10 not_substantive, 2 uncertain | n/a (no plan materialized) |
| Reconcile | rc 3→0 | deterministic no-replay re-derivation (0 new calls) |

Both arms ran `--finite-batch on --max-clusters 24 --max-candidates 48` in fresh disposable worktrees pinned at their treatment SHAs.

## The B3 failure (mechanism)

The B3 arm's first independent specificity counter-review (django 8-member high-certainty family, arbitration reply sha256 `f5eecfb7…`) returned a **flat single-family JSON shape** — top-level `"family":[0..7]` with sibling fields — instead of the required `"families":[{…}]` array. `validateSpecificityFamilies` rejected it (`specificity_invalid_arbitration_shape`; the `representative_quote` was also 234 chars, over the 220 cap), and the batch **halted before any ReviewStore materialization or Graphiti write**. This is the B3 source's designed fail-closed safety behavior (no unverified specificity verdict may authorize a write), reacting to a model-output shape mismatch — not an EX, no-replay, or terminal-ambiguity defect.

## Findings

1. **Duplicate reduction preserved.** The `b3:previous` arm (B2 source) settles with **3 genuine cross-workspace pools (8+9+3), 0 singletons, 0 nonvaluable persisted** (all 4 persisted episodes are valuable representatives). B2's core benefit is intact.
2. **Retention recovery not demonstrated.** The `b3:specificity` arm — the mechanism meant to recover the 4 B2-regressed valuable variants via the independent specificity counter-review — **failed closed before producing a refined partition** (0 persisted, no plan). The 4 regressed variants (`sphinx_ascii_rst_header_rows`, `django_add_filter_lazy_string_variant`, `pylint_6386_verbose_flag_negative`, `pylint_verbose_v_arg_expected`) remain deferred `alternative_equivalent_fact` / `uncertain_representative` in the `b3:previous` arm.
3. **Graphiti g1–g4 losses unchanged.** All 6 graphiti valuable targets produced 0 approvals in **both** arms (8 graphiti candidates, all `not_substantive`); these are the pre-existing discovery/utility losses outside this correction's objective.

## 4-surface proof

Every persisted fact verified across all four surfaces, with identical UUID sets:

| | ReviewStore `remote_episode_uuid` | Graphiti MCP `get_episodes` | Raw FalkorDB `Episodic` | Source binding |
|---|---|---|---|---|
| b3:previous | 4 | 4 | 4 | intact (positive-reconcile audit: `submission_unknown → queued → persisted`) |
| b3:specificity | 0 | 0 | 0 | n/a (no writes) |

Persisted UUIDs (b3:previous): `ff97aeb9-d6d0-4844-94a1-7a4ed2b09dd1` (sp2), `4274be76-e75e-4e3f-ae33-f5ff351bc570` (py1), `b001f8ef-5e58-4225-85ef-78be7082f376` (dj1), `8e95af52-c2a5-4233-a2f9-ceb0b53f2c38` (sp8). No `Source` graph nodes invented (source index lives in local ReviewStore).

## Privacy & scope

Privacy control `:message:ctrl` absent from staged events, all 99 frozen model-call inputs/outputs (51 previous + 48 specificity), and both ReviewStores (0 occurrences); the ctrl session's eligible regular sibling `msg_189803b36001zxJWhWTzuYbfhZ` is staged as a normal graphiti-mcp source. Per-fact authorization (full native group/project/workspace/source_ref/evidence_class/observed_at/temporal_status) is unchanged; the specificity review adds source-quoted discrimination only.

## Production unchanged

All historical campaign groups unchanged vs baseline (d1 2/15, d2 14/0, d3 0/4, b1 4/19, t1 10/2, t2 9/3, b2 18/4). `development-knowledge` 355 → 355 (no production-drain drift in the window). B3 wrote only to `graphiti-adr92-b3-previous` (4 episodes); `graphiti-adr92-b3-specificity` stayed at 0. Attribution by group/UUID: all 4 new episode UUIDs belong to the b3:previous group.

## Disposition

**`BLOCKED`** (typed `B3_SPECIFICITY_SHAPE_MISMATCH`). The accepted B3 safety check failed on a model-output shape mismatch, so this campaign did not produce a valid, adjudicable B3 refined-family result. All hard safety invariants hold (no spurious writes, no-replay, privacy, scope, EX, production unchanged).

**Minimal Central correction:** make the B3 specificity counter-review robust to the model's single-family output shape — normalize a flat `{"family":[…],…}` object into the required `{"families":[{…}]}` partition before validation, and/or tighten the prompt so the array shape and the 15..220-char `representative_quote` bound are reliably met; on a failed/shape-mismatched specificity verdict, consider degrading the multi-member family to an operator-reviewable uncertain deferral (preserving B2's duplicate suppression) instead of aborting the whole batch before any write. Re-run the `b3:specificity` arm once under the canonical post-exit EX and adjudicate the refined families against the 16 valuable / 11 nonvaluable targets.

This is **not** prospective acceptance; the g1–g4 discovery/utility false negatives remain outstanding Central work.

## Files

- `b3-scorecard.json` — machine-readable sanitized scorecard (this directory).
- `model-call-digests-previous.json` / `model-call-digests-specificity.json` — stage counts + response SHA-256 digests (51 + 48 frozen call pairs, zero unpaired).
- Raw private evidence (not published): `/tmp/opencode/issue92-adr-qual/b3r/state/{previous,specificity}/` — 0700/0600 ReviewStore, queue, frozen snapshot, model-call intents/results, terminal record `.b3-terminal`, launcher log, state ledger.
