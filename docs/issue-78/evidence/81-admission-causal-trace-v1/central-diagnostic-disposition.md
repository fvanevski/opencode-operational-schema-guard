# Central disposition — Issue #81 admission-cause and tie-break trace (PR #89)

Campaign `ISSUE81_ADMISSION_CAUSAL_TRACE_V1` · exact head `57d25648bb73f86de84009e3f4ead98897d29370` · controller base `9a27b73de882c0af6fec4d86de81945338611479` · evidence base `93ed977d5000f0caf02be1d01aa63ab4b1112635`

## 1. Causal findings (source-proven at the exact head)

1. **The 0.34 topical floor is NOT in the automatic-recall selector.** The staged automatic path is `Memory.search → shortlistQualifiedCandidates → linkedSourceSignals → relevanceSignals → relevanceFilter`. `relevanceSignals` requires `overlap.count >= 2` plus independent-topic, named, Issue and numeric fences; `admitFact()` (the only 0.34 consumer) is a separate on-demand helper and is not called by the selector. The staged diagnostic confirms `scoreFloor034Applied=false` for all four cases, and the prior packet's "below the 0.34 topical floor" classification of S03/S13 is therefore **refuted as a cause** (S03 direct score 0.222 and S05/S13 0.333 are all < 0.34 yet `topical=true`).
2. **S03 (082fe673, assistant-reported):** first actual rejection predicate **NAMED_IDENTITY**. The query requests two named terms; one is satisfied in the assertion+native-excerpt composite (product-qualified substring) and the second is absent from both. The multi-name case has no single-missing fallback, so the named fence fails in the direct AND the linked evaluation. Linked-fallback prerequisite met (direct count 2 >= 2, Issue/numeric identity present); the linked evaluation ran and still failed.
3. **S05 (1a20d974, assistant-reported):** first actual rejection predicate **NAMED_IDENTITY**. The single requested named term is absent from the assertion and from its native excerpt; the DB-suffix identifier alias rule does not apply (no matching identifier component) and the 2-4 char acronym fallback does not apply (term length). Direct 2/0.333, linked 3/0.500 — the prior packet's "named-term/independent-topic fence" is confirmed as specifically the **named-term** fence (independent-topic passed in both evaluations).
4. **S13 (009974d2, assistant-reported):** first actual rejection predicate **NAMED_IDENTITY**. The single requested named term is absent from the assertion and its native excerpt (the excerpt repeats the assertion sentence). The selected (wrong) candidate passes the named fence because its text contains the named term in a product-qualified form.
5. **S10 (0de3cdc8 vs c059ab8f, both tool-reported, same session):** **complete metric tie** — identical overlap (3/0.500), priority (0), answer-type (0) and source-context overlap (3/0.500) on both candidates. The stable tie-break is the input index, so the selection **flips when input order reverses** (shortlist observed-first → observed selected; expected-first → expected selected) → **INPUT_ORDER_AMBIGUITY**. Independently inspected, the stated propositions **are distinguishable**: the expected source states what commit 52863ae changed (commit-subject statement answering the question); the observed source is a worktree-setup command record that references the commit incidentally. Source-ref identity alone is not relevance evidence.
6. **Diagnostic integrity:** `explainRelevanceAdmission().admitted` equals shortlist membership for all 8 candidate objects (0 mismatches); the trace is pure (CPU-only, no remote calls, no mutation); output discloses no raw prompt/fact/excerpt/source-ref text.
7. **Staged-test outcome at the exact head:** the contract's focused suite is **23/24, exit 1**: one staged test (`issue81-admission-audit.test.mjs` "private and malformed sources...") expects the rejection message to match `/Invalid|Unsafe/` but the thrown message is `Missing/invalid source-bound expected candidate` (case-sensitive mismatch). The private-fact rejection behavior itself is correct; the defect is the staged test's regex, not the diagnostic. No production file is affected.

## 2. One bounded, generalizable correction proposal (Central's selector-policy scope)

**Tied to the first truly failed predicate (NAMED_IDENTITY in `satisfiesNamedTerms`):** make the named-term fence a *coverage* fence rather than an all-or-nothing one — when topical support is satisfied (`overlap.count >= 2` and independent topic) and at least one requested named term is present (assertion or native excerpt), admit the candidate even if a single additional named term is missing; for the multi-name case, extend the existing single-missing 2-4 char acronym fallback (currently active only when exactly one named term is requested) to the "all-but-one satisfied" situation. This is a fence-policy decision: no 0.34 floor change, no user-facing rename, no source-context authority upgrade (the excerpt remains an admission hint, and in all three cases the missing term is absent from the excerpt too), no threshold drift.

**Bounded secondary item (S10 tie-break, separate predicate):** add a deterministic, source-stable tie-break for complete metric ties (e.g., native event order / `valid_at` within the session, not input index order) so a complete tie no longer depends on candidate input order. Episode-UUID ordering is a stability device only, not a correctness proof.

**Required adversarial negative tests (both items):**
1. A fact that mentions only the missing named term (e.g., the acronym) without topical support must remain rejected.
2. A fact with topical support but no requested named term present must remain rejected (no coverage fence without at least one satisfied term).
3. Secret/wrong-group facts must remain excluded by their own fences after the relaxation (no new leak path).
4. Two complete-tie candidates from different sessions must select deterministically under any input order (tie-break stability test), and the S10 pair must select the commit-subject statement when the stable key orders it first.
5. The S06 historical/superseded preference and N02 frozen FAIL_INJECTED must remain unchanged (regression guards).

## 3. Readiness verdict

- **PR #89 remains NOT host-review-ready** at `57d25648`: exposed offline 12/16 vs the immutable 13/16 threshold. The causal proof is now exact: three residuals fail the **named-term fence** (not the 0.34 floor) and one is an **input-order complete tie** with a distinguishable proposition. The correction is a bounded Central selector-policy decision on the existing PR, not an agent rewrite.
- If the bounded named-term coverage fence (plus the S10 stable tie-break) reaches >= 13/16 with tests/fences green, `PR89_HOST_REVIEW_READY=yes` may be reported; native acceptance and deployment authorization remain separate.

## 4. Not done, per contract

No production source edit; no new full native/fresh-client/20-case offline replay (12/16 and 9/16 historical scores unchanged); no deploy, merge, new PR, Issue #81 closure, or frozen-result rewrite; implementation branch untouched (evidence published only on `issue/81-recall-acceptance`); PR #89 draft status preserved; adapter and raw private material kept host-private; `HOOK_P95=UNVERIFIED`; human precision `UNVERIFIED`.

## 5. Stop boundary observed

No hard-stop condition triggered: exact kickoff SHA authenticated (PR #89 head = 57d25648; evidence branch = 93ed977d); roster re-verified; all eight candidate records positively persisted with exact scope (group/workspace/project) and native-id source backing; diagnostic cross-check consistent (0 mismatches); one trace, one packet, no side campaigns.
