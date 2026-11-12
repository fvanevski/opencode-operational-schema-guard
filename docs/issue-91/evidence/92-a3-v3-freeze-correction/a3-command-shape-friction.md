# GHDEV-10 — command-shape friction log (A3 v3 freeze correction)

## 1. Central `issue92-a3-stage.mjs` hard-pins the group name to `graphiti-adr92-a3-prospective-v2`
- The authoritative staging tool rejects any roster whose `group` is not exactly
  `graphiti-adr92-a3-prospective-v2`. Because the repository source must not be modified, the
  v3 cohort keeps that stable group name (it is a fresh, 0-episode, unused Graphiti group) and
  uses a **fresh state root** (`state-v3`). "Fresh group" is satisfied by the group being unused,
  not by a renamed group.

## 2. v3 staging produced 26 spans, not 43
- v2's 43-span count came from 6 long PR/issue handoff sources (each up to 6 spans). v3 replaced
  5 of those with shorter self-contained design-decision/constraint sources (issue75 close
  constraint, release-gate decision, fsm81 design decisions), so v3 stages 26 spans from 20
  cases (multi-span: i92-v3-03=4, i92-v3-08/09/10=2 each). The lower count is the expected effect
  of the source-label correction, not a staging regression.

## 3. Privacy exclusion of one strong candidate
- `msg_1a800f4c…` (fsm81 local graph endpoint auth) is a strong stated fact but its full native
  text embeds `api_key=*** The whole-input native privacy check
  (`fromPromptCandidates`) vetoes it, so it was excluded in favour of the privacy-clean
  `msg_1a801a723001…` (fsm81 export-format serialization decision). This is the intended
  whole-input privacy semantic.

## 4. Scorer pre-inference contract (fails closed, by design)
- Running `issue92-a3-score.mjs` pre-inference first throws
  `A3_ACCEPTANCE_UNVERIFIED:independent_pre_inference_ratification` (the authority audit's
  `first_model_intent_at`/receipt are post-inference). With a valid (future) `first_model_intent_at`
  it proceeds and throws `insufficient_review_samples` (no fact adjudications yet). Both are the
  correct pre-inference state: the input contract is validated and the scorer requires independent
  post-inference judgments — it does not emit a simulated PASS.

## 5. Host driver binding advanced to the current verified head
- The v2 host provenance was pinned to `0a009e8`. The current verified head is `4041256` (evidence
  only; execution-source blobs unchanged). The host provenance + launcher were advanced to
  `4041256`; all 7 execution-source blobs verified on-disk == committed == provenance. No
  repository source/test change.
