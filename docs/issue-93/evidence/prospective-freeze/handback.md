# Issue #93 — approved prospective freeze and matched baseline handback

One cohesive, candidate-blind freeze of a source-adjudicated development/holdout
cohort, a matched strict-vs-semantic baseline on an identical frozen snapshot,
and a specific Central selector correction contract. Source and inference kept
distinct. Not a historical #81 re-pass; not final acceptance.

```
RESULT=FROZEN_BASELINE_COMPLETE
TARGET_SOURCE_SHA=68eaf2400194eb19a3803984bc2c7eb43fbf8e82
OWNER_CHECKOUT_PRESERVED=yes (owner /workspace/opencode-operational-schema-guard untouched; all work in isolated worktree /workspace/opencode-issue93-build)
SOURCE_AND_HOST_IDENTITIES=repo tree @ 68eaf24 (selector source unchanged from bfa6cbe); installed plugin local.ghdev-graphiti-memory (issue-78/v2-candidate + issue-75/v2-candidate baseline); Graphiti MCP 127.0.0.1:8766/mcp; group development-knowledge; workspace /workspace/mcp_servers/gh_mcp; project gh_mcp; #92 ReviewStore /home/filip/.local/state/ghdev-graphiti/curation-v1/development-knowledge (read-only)
SNAPSHOT_FINGERPRINT=dc597c690b0e8990… (355 proven facts, 355 same-group episodes, not truncated); captured 2026-11-15T02:40:40Z; drift status STABLE (no Graphiti/ReviewStore/source drift during the campaign; all scored comparisons ran on this frozen snapshot)
DEVELOPMENT_COHORT=prospective-dev-93-20261115; positives=18 (>=16), negatives=5 (>=4); digest 3e799c4610809853…; kinds direct/cause/decision/paraphrase/temporal
SEALED_HOLDOUT=prospective-holdout-93-20261115; positives=4, negatives=2; digest 3f9eaebb6debe949…; status SEALED_NOT_RUN (queries registered, not run, raw cases not provided to Central)
SOURCE_ADJUDICATION=each positive independently source-adjudicated to an exact persisted #92 fact (assertion + opencode: source ref + evidence class + temporal status) with a fresh same-group remote-episode-UUID proof (355/355 proven in get_episodes). Unresolved: N05 false-verified control not cleanly isolated (pool has only native-id strong sources); D02/D05/D15 remain semantic FN (index rescue injected other facts, not the target).
STRICT_BASELINE=TP=13, FN=5, source-exact 13/18; not-recovered D01,D02,D05,D06,D15; abstain=0
SEMANTIC_BASELINE=TP=15, FN=3, source-exact 15/18; not-recovered D02,D05,D15; abstain=0
STRICT_ONLY_LOSSES=none
OFFTOPIC_FRANCE=present: 1 fact injected (pre-change 496-char class), budget <=1400 chars / <=5 facts; root cause VERIFIED (unanchored cap=1 admits the top native-rank-prior fact with zero lexical overlap)
OTHER_NEGATIVES=N02 offtopic 4 injected; N03 wrong-group-content 4 injected (content intent, not a cross-group remote leak); N04 secret 0 (privacy fence short-circuit, correct); N05 false-verified 3 injected (residual: not isolated, see SOURCE_ADJUDICATION)
INDEX_RESCUE=raw-top24-absent registered D02,D03,D11,D14,D15,D17 (target absent from the 24-fact search pool but present in the #92 source index); recovered via index rescue D03,D11,D14,D17; not recovered D02,D15 (proof stage: fresh same-group get_episodes membership)
B2_ROOT_CAUSE=one narrow root cause: selectSemanticContext admits a single native-only fact (cap=1, unanchored) via the native-rank prior with no lexical/answer-type/identity/source-excerpt support
CENTRAL_CHANGE_CONTRACT=semantic-recall.mjs selectSemanticContext: in the unanchored cap=1 path, admit the single fact only if answerTypeSupport>0 OR identitySignal>0 OR sourceContext overlap>0, else abstain; regressions: issue-75 zero-overlap paraphrase retained, 15/18 semantic positives retained, N01 abstains, N04 unchanged, zero strict-only losses, anchored multi-fact branch unchanged (see central-change-contract.json)
OLD_ISSUE81=fingerprint 47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652 immutable; 12/16 strict and 13/16 semantic are archival, not newly passed
EVIDENCE_PUBLICATION=PASS
EVIDENCE_COMMIT_SHA=<full SHA of the evidence-only prospective-freeze commit on issue/93; reported in returned handback>
PRIVATE_COHORT_LOCATION=/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq (dev-cohort.json, holdout-cohort.json, source-snapshot.json, baseline2-result.json; raw queries/facts/UUIDs local only)
KNOWN_GAPS=N05 false-verified control not cleanly isolated (native-id-only pool); D02/D05/D15 semantic FN (index rescue did not recover the exact target); holdout SEALED_NOT_RUN (evaluated once at candidate qualification, not now); no competing-inference model answer (native answer support deferred to the separate candidate qualification).
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
    correction_or_annotation=Host guard flagged inline -e/-c scripts for approval (auto-approved by a saved 'always' approval); no rewrite. Recurring across snapshot capture, cohort selection, baseline inspection, and manifest hashing.
    replacement_shape=none
    recipe_reference=none
    resource_reference=none
    contract_conflict=no
    durable_gap_candidate=no
omitted_sensitive_values=no
```
