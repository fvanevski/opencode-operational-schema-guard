# Issue #81 — Operator Adjudication (sanitized) (81-operator-adjudication-v1)

Sanitized. Private source text and operator signatures stay on the host (`operator-adjudication-worksheet.md`).
This file carries the operator's policy, the per-fact dispositions, and the exact-source verification results.

## Operator durable-memory policy (sanitized)

Preserve information likely to improve subsequent work: explicit user architectural decisions & API
requirements; changes/supersessions; source-grounded durable implementation facts; important unresolved
defects/constraints with established factual status. Routine intermediate test counts, transient failures,
redundant assistant progress reports, and speculative diagnoses stay in the evidence history, not as
independently recalled durable facts. A successful test result is valid historical evidence but not
necessarily valuable long-term memory. These are **retrospective quality labels** on already-persisted
facts; they do not alter the historical model decision records, delete episodes, or imply the original model
DEFERred them. Any graph cleanup would be a separate authorized action.

## Per-fact dispositions (operator) + exact-source verification

All 13 persisted facts were re-verified against the EXACT native source event (full excerpt, not the truncated
quotation). Grounding / authority / scope / durable-usefulness are reported as separate fields.

| Fact | Cohort (group / project) | Grounding (exact source) | Authority | Scope | Durable usefulness (operator) |
|---|---|---|---|---|---|
| F1 | dev `cur81_native_a1f3c9d7` / fsm81 | YES (verbatim) | user-stated | fsm81 | **TRUE** |
| F2 | dev `cur81_native_a1f3c9d7` / fsm81 | YES (verbatim) | user-stated | fsm81 | **TRUE** |
| F3 | dev `cur81_native_a1f3c9d7` / fsm81 | YES (verbatim) | user-stated | fsm81 | **TRUE** |
| F4 | dev `cur81_native_a1f3c9d7` / fsm81 | YES (verbatim) | user-stated | fsm81 | **TRUE** |
| F5 | dev `cur81_native_a1f3c9d7` / fsm81 | YES (verbatim) | user-stated | fsm81 | **TRUE** |
| F6 | dev `cur81_native_a1f3c9d7` / fsm81 | YES (verbatim tool output; exit 0) | tool-reported (observed) | fsm81 | **FALSE** |
| F7 | dev `cur81_native_a1f3c9d7` / fsm81 | YES (verbatim tool output; exit 0, pass 10) | tool-reported (observed) | fsm81 | **FALSE** |
| F8 | dev `cur81_native_a1f3c9d7` / fsm81 | YES (verbatim tool output; exit 1, pass 9; superseded) | tool-reported (observed) | fsm81 | **FALSE** |
| F9 | dev `cur81_native_a1f3c9d7` / fsm81 | YES (verbatim prefix) | assistant-reported (not independent proof) | fsm81 | **FALSE** |
| F10 | dev `cur81_native_a1f3c9d7` / fsm81 | YES (verbatim tool output; exit 0, pass 5 fail 0) | tool-reported (observed) | fsm81 | **FALSE** |
| F11 | dev `cur81_native_a1f3c9d7` / fsm81 | YES (verbatim prefix) | user-stated | fsm81 | **TRUE** |
| F12 | dev `cur81_native_a1f3c9d7` / fsm81 | YES (verbatim; **corroborated** by current `fsm.test.js`: `rmSync(tmpDir,…)` now in an `after()` hook) | assistant-reported (diagnosis; corroborated, not independently code-verified) | fsm81 | **FALSE** |
| F13 | earlier `cur81_holdout_4c3ab514` / qualified_project | YES (verbatim prefix) | assistant-reported (NOT independently code-verified) | qualified_project (**earlier cohort**) | **TRUE (conditional)** |

### Verification results (separate findings)

- **Grounding (exact source):** **13/13 YES.** Every assertion is a verbatim substring/prefix of the cited
  native source event; **no assertion contains a proposition absent from its cited span**.
- **Authority correctness:** **13/13** (user-stated F1–F5,F11; tool-reported F6–F8,F10; assistant-reported
  F9,F12,F13). No assistant-reported fact is classified as independently verified.
- **Scope correctness:** **13/13** (12 dev facts → fsm81; F13 → qualified_project, earlier cohort).
- **Durable usefulness (operator policy):** **7/13 TRUE** (F1–F5, F11, F13-conditional) · **6/13 FALSE**
  (F6–F10, F12). This is a **separate finding** from grounded precision.
- **F12 source-file check:** performed — the current `native-ws/fsm81/fsm.test.js` places
  `rmSync(tmpDir, { recursive: true, force: true })` inside an `after(() => { … })` hook, corroborating that a
  top-level `rmSync(tmpDir)` previously existed and was a real (now-resolved) issue. Authority stays
  `assistant-reported` (corroborated, not independent code verification); durable usefulness stays **FALSE**.
- **No grounding/authority field is marked UNVERIFIED** for the 13 persisted facts (sufficient exact-source
  evidence exists). The new prospective holdout's durable-fact precision is UNVERIFIED for a distinct reason:
  it has **0** persisted facts (not drained).

## Durable-usefulness metric (separate from grounded precision)

- **Durable-useful facts: 7/13** (F1–F5, F11, F13-conditional), conditional on the exact-source confirmation
  now performed. The 6 non-useful facts (F6–F10, F12) remain in the grounded-precision denominator; they are
  simply not preferred as durable memories.

**The ≥0.90 grounded-precision gate is NOT declared passed.** It is conditionally met (measured 13/13 = 1.0000)
pending (a) operator sign-off on the 13 fact verdicts, (b) packet-1 source-case ratification, and (c) the
remote receipt bindings (verified: 12 dev + 1 earlier-cohort episode UUIDs match the live Graphiti).
