# Issue #92 — B2 project-scoped semantic-family arbitration: one consolidated two-arm qualification (final result)

**Kind:** sanitized, evidence-only, public.
**Authority:** `docs/issue-91/adr-acceptance/ISSUE92_B2_PROJECT_SCOPE_ARBITRATION.md` (B2 contract).
**Branch:** `work/91-memory-utility-r1`.
**Typed result:** `ISSUE92_B2_RESULT` = **`REMEDIATION_REQUIRED`** — the B2 project-scope correction **removes the vacuous 17-singleton arbitration** and **materially reduces duplicate/nonvaluable persistence** (18 → 4 persisted, all valuable) by genuine same-project cross-workspace family comparison, **but** the overbroad project-scope family-equivalence judgment **collapses 4 valuable cross-workspace variants**, regressing valuable retention from **8/16 (B1) → 5/16 (B2-corrected)**.

## Campaign identity

| Field | Value |
| --- | --- |
| Required starting head | `3b5ce41776424c0786e10f2eebf1b5b195eecd4b` |
| b2:previous treatment pin | `8a112799a7a42b47c5a044d21aa11ef8ebe21b59` (`partitionKey` = `[group,project,workspace]`) |
| b2:corrected treatment pin | `f51ca861c05f03bac2d86051a7bb339fe2fb5d05` (`partitionKey` = `[group,project]`) |
| `finite-batch.mjs` blob previous | `561b97d9f23875869b87ad768d894b72340ef4ce` |
| `finite-batch.mjs` blob corrected / HEAD | `2f87ed5efa828e0eb389f5f7c8e42653d9a2c46b` |
| Original frozen corpus SHA-256 | `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f` |
| Invariant blobs (unchanged) | core `5b1d33ef`, worker `503bf766`, fact-review `0131c5f0`, model `99cb39a7`, model-policy `866b369b`, queue `b4e2df18`, curator-cli `3b1bcd7a` |

Only `finite-batch.mjs` changed production semantics between the treatment pins (the `partitionKey` relaxation from `[group,project,workspace]` to `[group,project]`). All other curator/queue/model/Graphiti-client blobs are byte-identical.

## Frozen corpus

24 clusters / 24 eligible sources / 16 valuable targets / 11 nonvaluable controls / 1 capture-ineligible privacy control (`opencode:ses_e767fc4cbffe9zB9WHpLF4PLBe:message:ctrl`). The original private freeze byte was lost to a host reboot; the 24-source corpus was **natively recovered from `opencode.db`** (`session_v2` + `session_message`) and re-staged with identical source context (all 19 B1-persisted source refs byte-match).

| Family | Sources | Distinct workspaces |
| --- | --- | --- |
| swebench-sphinx | 9 | 8 |
| swebench-django | 8 | 8 |
| swebench-pylint | 3 | 3 |
| graphiti-mcp | 4 | 1 |

The required identity check passes: sphinx/django/pylint siblings share the same authenticated `group+project` but have **different** `workspace` (not fabricated).

## EX admission

Canonical `openviking-commit-gate` EX flock, held through model + Graphiti terminal readback + reconcile. Real harness-exit, 30s quiet grace, scheduler-idle (`running=0 waiting=0`), production-drain serialization. The first launcher (PID 467786) `FAIL_CLOSED` at `00:41:56Z` on the 3600s bounded harness-wait (the session was left open); it failed in Phase 1 **before** EX lock, so no partial work. Re-armed with an 86400s bound (PID 1108140) and settled:

- `HARNESS_EXITED` 2026-11-11T01:30:08Z → `EX_FLOCK_ACQUIRED` 01:30:36Z → quiet grace 30s → `EX_ADMISSION_PROVEN` 01:31:06Z → `CAMPAIGN_SETTLED` 01:32:41Z.

## Arms (model profile: `chat-fast`, temperature 0, max_tokens 1600, json_object, 90s)

| | b2:previous (`8a112799`) | b2:corrected (`f51ca861`) |
|---|---|---|
| Group (fresh, empty) | `graphiti-adr92-b2-previous` | `graphiti-adr92-b2-corrected` |
| Partition | `[group,project,workspace]` | `[group,project]` |
| Status | `review_required` | `review_required` |
| Candidates / approved / deferred | 25 / 18 / 7 | 26 / 4 / 22 |
| Persisted | 18 | 4 |
| Families / pool sizes | 18 (17×size-1 + 1×size-2) | 3 (8+8+3) |
| Singleton pools | 17 | 0 |
| Model calls (disc/util/arb) | 65 (24/23/18) | 50 (24/23/3) |
| Model errors | 0 | 0 |
| Tokens (prompt+completion) | 49,895 + 4,191 | 46,553 + 3,888 |
| Deferred reasons | 6 not_substantive, 1 alt_equiv | 15 alt_equiv, 7 not_substantive |
| Reconcile | rc 3→3→0 | rc 3→0 |

Both arms settled via **positive reconcile** of `queued`/`submission_unknown` review states under the retained EX (no model-call replay, no favorable-output sweep). Every model-call intent/result is frozen in private 0600 state.

## Findings

1. **Singleton arbitration removed.** The previous arm reproduces the B1 defect: 17 singleton pools (cross-workspace siblings never compared). The corrected arm forms **3 genuine cross-workspace families** (sphinx 8, django 8, pylint 3) with **0 singletons** — the B2 correction works as intended.
2. **Duplicate/nonvaluable persistence reduced.** B1 persisted 11/11 nonvaluable duplicates; B2-corrected persists **0 nonvaluable** (all 4 persisted episodes are valuable representatives).
3. **Valuable-retention regression.** B2-corrected retains **5/16** valuable targets (py1, dj1, sp1, sp2, sp8) vs B1's **8/16**. It **gained** `sphinx_dict_str_str_param_render_defect` (sp1) but **lost** 4 valuable cross-workspace variants — `sphinx_ascii_rst_header_rows`, `django_add_filter_lazy_string_variant`, `pylint_6386_verbose_flag_negative`, `pylint_verbose_v_arg_expected` — collapsed as `alternative_equivalent_fact` into a single representative.
4. **Graphiti g1–g4 losses unchanged.** All 6 graphiti valuable targets (single-workspace `graphiti-mcp`) produced 0 approvals in **both** arms (deferred `not_substantive`); these are the pre-existing discovery/utility losses the B2 source correction does not claim to fix.

## 4-surface proof

Every persisted fact verified across all four surfaces, with identical UUID sets:

| | ReviewStore `remote_episode_uuid` | Graphiti MCP `get_episodes` | Raw FalkorDB `Episodic` | Source binding |
|---|---|---|---|---|
| previous | 18 | 18 | 18 | intact |
| corrected | 4 | 4 | 4 | intact |

No `Source` graph nodes invented (source index lives in local ReviewStore). Privacy control `:message:ctrl` absent from staged events, model inputs, and ReviewStore (the ctrl session's eligible regular message was staged as a normal source).

## Production unchanged

All historical campaign groups unchanged vs baseline (d1 2/15, d2 14/0, d3 0/4, b1 4/19, t1 10/2, t2 9/3). `development-knowledge` moved 100 → 355 from the **active production drain** (which held the EX lock), not from B2 — B2 wrote only to its two b2 groups.

## Disposition

**`REMEDIATION_REQUIRED`.** The comparison is no longer vacuous and duplicate pollution is materially reduced, but the overbroad project-scope family-equivalence judgment collapses 4 valuable variants, regressing valuable retention 8/16 → 5/16.

**Minimal Central correction:** make the project-scope family-equivalence / representative-arbitration more conservative so cross-workspace variants stating **distinct** constraints are not collapsed into one representative — either allow multiple representatives per `[group,project]` family when a variant states a strictly new constraint (negative case, ascii-vs-rst, short-vs-long flag), or require a per-variant distinct-constraint justification before deferring as `alternative_equivalent_fact`. Target: restore toward ≥8/16 valuable retention without re-introducing the 11 nonvaluable duplicates.

This does **not** mean Issue #92 prospective acceptance (5/16 is far below the eventual ≥85% target).

## Files

- `b2-scorecard.json` — machine-readable sanitized scorecard (this directory).
- Raw private evidence (not published): `/tmp/opencode/issue92-adr-qual/b2r/state/{previous,corrected}/` — 0700/0600 ReviewStore, queue, frozen plans, model-call intents/results, episode index.
