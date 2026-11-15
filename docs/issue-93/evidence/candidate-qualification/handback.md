# Issue #93 — B2 candidate qualification handback

One consolidated candidate qualification on the authenticated target. The
Central semantic-abstention candidate suppresses France (N01) but NOT the second
predeclared off-topic (N02); the development gate FAILS at N02. Per the approved
acceptance, the sealed holdout and the live model-answer campaign are NOT run.

```
RESULT=DEV_FAILED_N02
CANDIDATE_SOURCE_SHA=e53dbbfd4b1ee153a0562547e03d0210aae57629
PREVIOUS_SOURCE_SHA=69014b739d490f8cb90bce86233edf3054673209
FROZEN_SNAPSHOT_SHA256=dc597c690b0e8990… (verified STABLE; dev 3e799c46… / holdout 3f9eaebb… digests re-verified)
ONLY_SOURCE_CHANGE=semantic-recall.mjs (the candidate) + semantic-abstention.test.mjs (regression) since the freeze; no other production, privacy, group, temporal, source, Graphiti, CI, or config change
STRICT=13/18 (unchanged)
PREVIOUS_SEMANTIC=15/18
CANDIDATE=15/18
POSITIVE_LOSSES=none
STRICT_ONLY_LOSSES=none
NEW_SOURCE_EXACT_POSITIVES=none
N01=0 (pre-candidate 1; ABSTAIN met)
N02=4 (pre-candidate 4; NOT ZERO)
N04=0 (zero met)
N03=4 (not worsened; met)
N05=3 (not worsened; met)
N02_CAUSE=weak single-token anchoring: the high-frequency token 'now' (in 'right now') is ABSENT from the COMMON stopword set (relevance.mjs:3), so the #92 index-rescue narration facts get a 1-token overlap that flips selectSemanticContext `anchored=true` and enables the 5-fact anchored lane; the candidate only gates the unanchored cap=1 path, so it does not touch N02
CENTRAL_NEXT_FIX=add the high-frequency narration token 'now' to the COMMON stopword set in docs/issue-75/v2-candidate/relevance.mjs line 3 (one-token, source-safe, no new LLM path); verified to make N02 abstain (0 facts) while preserving N01 abstention, the 15/18 positives, and the issue-75 zero-overlap paraphrase. Robust class-level alternative: require >=2 distinct meaningful-token overlap to anchor (line 109). Re-stage ONE new candidate on this branch.
SELECTOR_BUDGET=<=5 facts, <=1400 chars (observed max 5 facts; within budget)
HOLDOUT=NOT_RUN (dev gate failed; sealed 3f9eaebb… untouched)
NATIVE=NOT_RUN
MODEL_ANSWER=NOT_EVALUATED
MODEL_CONTENTION_OK=NOT_REQUIRED
EVIDENCE_PUBLICATION=PASS
EVIDENCE_COMMIT_SHA=<full SHA of the evidence-only candidate-qualification commit on issue/93; reported in returned handback>
PRIVATE_COHORT_LOCATION=/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq (dev/holdout cohorts, source-snapshot, candidate-result, n02-diag; raw queries/facts/UUIDs local only)
KNOWN_GAPS=N02 off-topic injection (addressed by CENTRAL_NEXT_FIX, not yet staged); N05 false-verified control not cleanly isolated (native-id-only pool); D02/D05/D15 remain semantic FN; sealed holdout + native-hook + model-answer deferred until the dev gate passes on a re-staged candidate.
```

## COMMAND_SHAPE_FRICTION (GHDEV-10 canonical)

```
encountered=yes
events:
  - scenario=inline_node_script
    requested_shape=node -e '<sanitized inline script>'
    effective_shape=same-as-requested
    rewrite_provenance=none
    event_kind=guard_annotation
    execution_effect=executed_succeeded
    correction_or_annotation=Host guard flagged inline -e/-c scripts and a recursive-delete for approval (auto-approved by a saved 'always' approval); no rewrite. Recurring across frozen-hash verification, tree extraction, and the N02 diagnosis.
    replacement_shape=none
    recipe_reference=none
    resource_reference=none
    contract_conflict=no
    durable_gap_candidate=no
omitted_sensitive_values=no
```
