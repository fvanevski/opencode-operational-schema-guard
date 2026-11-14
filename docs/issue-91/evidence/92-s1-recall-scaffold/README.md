# Issue #92 — S1 configurable recall-first development-memory scaffold qualification

**Kind:** sanitized, evidence-only, public.
**Authority:** `docs/issue-91/adr-acceptance/ISSUE92_S1_RECALL_SCAFFOLD_QUALIFICATION.md` (S1 contract); `docs/issue-91/adr-acceptance/ISSUE92_RECALL_FIRST_POLICY_AND_FROZEN_RECOVERY.md` (recall correction).
**Branch:** `work/91-memory-utility-r1`.
**Required starting head:** `26e6d25c3b8d56251eab55d58eae8aa838016778`.

**Typed result:** `ISSUE92_S1_SCAFFOLD_RESULT` = **`FUNCTIONAL_SCAFFOLD`** — the native, configurable, source-grounded, post-exit Graphiti pipeline and recovery behavior work end-to-end. This is a **scaffold** milestone, not prospective acceptance: it does **not** assert the later ≥85% utility objective, zero duplicates, retrieval usefulness, or production readiness.

## What was qualified

1. **Recall-first default persistence** without semantic-novelty vetoes (`--novelty-policy recall`): source-validated, independently utility-approved facts persist; semantic equivalence/novelty is advisory, not a promotion gate.
2. **Per-stage model controls** (alias, reasoning-effort, temperature, completion-budget, timeout, prompt-guidance) via the optional private `issue92-finite-batch-tuning-v1` profile, bound to an **immutable tuning-profile hash** and a **per-stage model-request SHA-256**. Changing a parameter or guidance changes the request identity, so a mismatched frozen response can never be silently reused.
3. **Fail-closed `--replay-only on`**: any unrecorded model call fails closed. Used to recover the frozen B3 specificity cohort with **zero new inference**.
4. **Per-stage measured metrics**: call counts, token categories (prompt/completion/reasoning/cached), reported-field counts and latency, where the backend supplied them.

## Native gate (CPU, at 26e6d25 — all producer exits 0, first run)

`node --check` ×6; focused suites finite-batch-tuning **5/5**, finite-batch **34/34**, fact-review 14/14, curator 36/36, issue92-source-fact 5/5, adr-causal-audit 14/14; `npm run check` rc=0; `npm test` rc=0 (**524/524**, `OPERATIONAL_PLUGIN_TEST_RESULT: PASS`). The root `npm test` excludes the focused curator suites; all were run explicitly. **No mechanical host/import/fixture repair was required.**

`validate-tuning` on the example profile: rc=0, prints only configuration metadata + prompt hashes (`profile_sha256=7bd3a2d3…266e7`). Fingerprint verified: a stage-param or guidance perturbation changes the per-stage `request_sha256`. The old default remains non-reasoning, temperature 0, 1600 completion tokens, recall-first.

## Phase B — frozen B3 recovery (zero new inference)

The original B3 specificity disposable state/group (`graphiti-adr92-b3-specificity`) was authenticated read-only: **48/48** model intent/result pairs intact (24 discovery / 22 utility / 1 arbitration / 1 specificity), prompt+reply SHA-256 valid, legacy (no `request_sha256`); **no `plan.json`** (no frozen promotion plan); **24/24** native source refs re-authenticated in `opencode.db` `session_message` (id+session+type=user) with excerpt bytes matching native text (normalized); group had **0** episodes. The original prospective freeze byte is **unavailable** (lost to a host reboot) — the native source identity is independently verified, not the historical SHA-256.

Under `--finite-batch on --novelty-policy recall --replay-only on` with the original `chat-fast` identity and **no** tuning file, the recall plan was derived from the 46 frozen discovery/utility responses with **zero new model calls** (all 48 model-call files unchanged, mtime pre-EX-window). The obsolete arbitration/specificity responses are retained as forensic evidence, not promotion gates. Result: **25 candidates → 18 approved/persisted, 7 deferred** (`review_required`), 18 distinct terminal episode UUIDs verified across ReviewStore, episode-index, Graphiti MCP `get_episodes` and raw FalkorDB.

## Phase C — one bounded fresh tuning smoke

A fresh disposable group (`graphiti-adr92-s1-smoke`) staged **3 pre-registered** native sources (2 Graphiti technical constraints + 1 ordinary source-supported finding, all previously exposed in B1/B2/B3; identities committed to the preflight ledger before any model execution). `chat-review` + `reasoning_effort: medium` was prefilled as supported (HTTP 200, 16 reasoning tokens), so the **staged example profile** was run once (no fallback, no sweep). Result: **5 fresh model calls** (3 discovery chat-fast + 2 utility chat-review-medium), **1 persisted** episode (a source-supported Graphiti decoding-preset constraint, recorded as a fragmentary low-value yield), **2341 provider-reported reasoning tokens** on the utility stage, and per-stage request-identity digests matching an independent recomputation.

Both jobs ran inside **one canonical post-exit EX window** (real harness exit → 30 s quiet grace → scheduler-idle → production-drain serialization → canonical flock held through model + Graphiti terminal readback). A new once-only marker (`.s1-ran`) was used; the B3 launcher marker was not re-armed.

## 16 valuable / 11 nonvaluable scoring (recovered B3 population)

- **Retained valuable families:** django add-filter/lazy-string (dj1/dj1b/dj2), sphinx dict(str,str) param rendering (sp1/sp2), pylint verbose-arg (py1; py2/py3 partial) — now persisted with recall-first duplication.
- **Still lost:** the 6 graphiti valuable targets (g1–g4 + 2) and the 2 sphinx rst-header-row targets (sp8/sp9) produced **0** source-supported episodes in this cohort (consistent with the B3 `graphiti_unresolved_losses`).
- **Nonvaluable controls:** the django lazy-string repetitions (dj3–dj8) and sphinx repetitions (sp6/sp7) are now persisted as sibling-cluster duplicates — the **expected, reported** recall-first tradeoff (repetition inflation), not a scaffold defect. A duplicate is not a hard S1 FAIL.

## Crash / no-replay and production separation

Recovery: zero new inference; frozen intents/results intact; Graphiti writes reconciled positively (rc 3→0), no blind re-submission. Smoke: 5 model-call intents carry per-stage `request_sha256`+`prompt_sha256`; no ambiguous-submission replay. Production `development-knowledge` stayed at **355** episodes (latest 2026-11-08, before the S1 window); all 19 S1 disposable episodes are timestamped inside the EX window (2026-11-11T03:18:35Z..03:19:46Z).

## Disposition

**`FUNCTIONAL_SCAFFOLD`.** Native gates, configurable model/prompt controls, response/policy identity, inferred-or-frozen Graphiti write/readback and hard source safety work end-to-end.

**Next engineering slice (after S1 functional proof):** incremental refinements to discovery/utility prompts for the g1–g4 / sp8 / sp9 high-recall false negatives at the source-candidate stage, plus later read/retrieval evaluation. No new novelty hard-veto campaign.

## Files

- `s1-final-evidence.json` — machine-readable sanitized evidence (this directory).
- `COMMAND_SHAPE_FRICTION.md` — full GHDEV command-shape friction ledger.

Raw private evidence (not published): `/tmp/opencode/issue92-adr-qual/b3r/state/specificity/` and `/tmp/opencode/issue92-s1/state/` (0700/0600 ReviewStore, queue, frozen snapshot, model-call intents/results, plans, receipts, launcher log, state ledger).
