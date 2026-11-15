# Issue #93 — approved prospective freeze and matched baseline

Authority: Issue #93 prospectively revised by operator on 2026-11-14;
docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md. The Issue #81 historical
baseline and source-exact labels are IMMUTABLE and are NOT fresh acceptance.

ROLE=build
REPO=fvanevski/opencode-operational-schema-guard
ISSUE=93
BRANCH=issue/93
GOAL=one cohesive, candidate-blind freeze of a source-adjudicated
development/holdout cohort, matched strict-vs-semantic baseline, and a
specific Central selector correction contract.

REPO_PRODUCTION_SOURCE_CHANGE=forbidden
HISTORICAL_EVIDENCE_CHANGE=forbidden
ISSUE_OR_PR_MUTATION=forbidden
GRAPHITI_OR_REVIEWSTORE_WRITE=forbidden
LIVE_PLUGIN_CONFIG_CHANGE=forbidden
GPU_INTERACTIVE_MODEL=forbidden
EX_LEASE_DISTURBANCE=forbidden
HOST_PRIVATE_DIAGNOSTIC_SCRATCH=allowed
PUBLIC_EVIDENCE=at_most_one_sanitized_commit_to_existing_issue_branch
PUBLIC_EVIDENCE_ROOT=docs/issue-93/evidence/prospective-freeze

## A. Authenticate, scope and freeze the source authority

1. Fetch and authenticate the EXACT issue/93 branch head from the
kickoff. Keep the owner checkout untouched, create an isolated worktree
after fetch and full object proof, and read current #93, ADR-91, approved
acceptance, the source selector/strict controls, #92 curator resolver
and the prior 807255a source-bound evidence. Do not invoke historical
V1 lifecycle controls or change live installation.

2. Prove the current Graphiti endpoint/group, absolute workspace and
project, ReviewStore one-fact persisted receipts, source-native-ID
support, episode index and same-group positive remote UUID membership.
Capture a stable read-only source snapshot identity and exact repo
source hashes privately. Never substitute unproven Graphiti hits for
trusted per-fact source authority. Abort scored comparisons if the
underlying graph/ReviewStore or source snapshot drifts.

## B. Freeze the prospective cohorts BEFORE score inspection

3. Independently source-adjudicate at least 16 POSITIVE development
questions with exact expected fact/source identity, evidence class,
temporal status, authorized scope, and persisted remote UUID proof.
Include direct, paraphrase, indirect, decision, failure/cause/fix,
historical/superseded and multi-fact cases. Register at least two
genuine raw-top24-absent cases that can use source-qualified #92
index retrieval, if such cases exist in the current source pool.
Do NOT invent the raw-pool miss condition. If insufficient qualified
examples exist, return a typed cohort-coverage gap.

4. Predeclare at least four NEGATIVES for off-topic (include the
already observed France case), wrong-group CONTENT intent, secret
privacy and false-verified/source authority. Prefer one additional
distinct off-topic question to support the approved elimination
criterion without replacing the required control classes. Distinguish
content irrelevance from actual cross-group remote leaks.

5. Separately register an untouched HOLDOUT: at least 4 positive and
2 negative cases, including paraphrase and historical reasoning.
Freeze the holdout BEFORE Central changes any selector code, but DO
NOT run its queries against the selector, look at its outcomes or
provide its raw cases to Central before candidate qualification.
Treat the holdout as SEALED_NOT_RUN.

6. Store all raw queries, exact expected assertions/source references,
ReviewStore IDs, remote UUIDs, full source adjudication and query
snapshots exclusively in collision-safe PRIVATE scratch. Publish only
safe case tags and SHA256 fingerprints, denominators and source scope.
Freeze separate immutable canonical manifest SHA256 values for
development and holdout, plus a fixed source snapshot fingerprint and
freeze timestamp, before running baseline evaluation. Verify hashes
after writing. Never refreeze or change truth labels in response to
selector results. Do not reuse the issue-75 synthetic 5+2 set as a
new untouched cohort, nor call this a new Issue #81 benchmark.

## C. One current baseline and failure stage diagnosis

7. Run UNMODIFIED strict and UNMODIFIED current semantic modes on
IDENTICAL privately captured Graphiti search-result and source-index
snapshots, plus identical remotely proved same-group episode membership.
Do not compare separate live remote search results as if they were a
controlled same-snapshot pair. The existing Issue #81 replay/scorer
utilities under docs/issue-78/v2-benchmark can be adapted in
PRIVATE scratch to this prospective case roster, with a distinct
Issue #93 prospective cohort identity and no historical edits.
Never re-label the old strict 12/16 or semantic 13/16 score as current.

8. For each registered development positive: separately record
search result rank/absence at 24, #92 index retrieval, source journal
or ReviewStore mapping, fresh remote UUID proof, pre-proof shortlist,
strict-control anchor, semantic selection and model-facing inclusion.
Report source-exact strict/semantic TP, FP, FN, positive case coverage,
abstentions and strict-only losses. For negatives report all sourced
but irrelevant model-facing facts, same-group content intent and hard
authorization gates. Keep raw source facts private.

9. For the current France off-topic negative (previously injected 496
characters), identify whether the four-fact output followed actual
lexical overlap, answer type, native-rank prior, strict anchor or some
other real production path. Keep the valuable zero-overlap paraphrase
regression protected. Do not propose blanket lexical/Issue-ID vetoes,
invent score calibration or exercise candidate tuning on the holdout.
Diagnose at most one defensible minimal correction route for Central,
which can recover a source-exact omission OR suppress the authentic
off-topic injection without offsetting loss. If root cause is not
verifiable, report B2_CAUSE_UNVERIFIED, with bounded specific evidence.

## D. Stop, report and publication

10. Return the exact minimal CENTRAL implementation contract: affected
source functions, failing trace class, input/output expected behavior,
source-proof requirements, named regression controls, and an explicit
zero strict-only/semantic-positive loss requirement. Central owns code
and tests, and will stage ONE candidate on this existing branch.
Do not quietly implement substantive code as diagnostic adaptation.

11. Publish at most one metadata-only sanitized evidence commit to
docs/issue-93/evidence/prospective-freeze, with SHA256 manifest and
pre/post exact-head readback; no PR, branch split or force-push.
No raw source/excerpts, model prompts, credentials, UUID/source maps,
or unsealed holdout data in GitHub. If private cohort sealing fails,
report BLOCKED_PUBLICATION rather than weakening privacy.

12. Stop after the freeze and development-baseline diagnosis, or a
specific authority/snapshot blocker. DO NOT run the holdout, attempt
model inference while an interactive model occupies the single-GPU
service, run an EX-gated source write, or extend into Issue #94.
The eventual candidate/holdout/native-answer/CI execution will be
a separate consolidated qualification after Central implements
the measured selector correction.

## Required handback

RESULT=FROZEN_BASELINE_COMPLETE|BLOCKED_COHORT_AUTHORITY|SNAPSHOT_DRIFT|PARTIAL|STALE
TARGET_SOURCE_SHA=<full 40-char>
OWNER_CHECKOUT_PRESERVED=<yes/no>
SOURCE_AND_HOST_IDENTITIES=<repo tree, plugin, Graphiti, group/workspace/project>
SNAPSHOT_FINGERPRINT=<SHA256 and drift status>
DEVELOPMENT_COHORT=<new cohort ID, positives>=16, negatives>=4, digest>
SEALED_HOLDOUT=<different cohort ID, positives>=4, negatives>=2, digest, never run>
SOURCE_ADJUDICATION=<source-exact proof process and unresolved findings>
STRICT_BASELINE=<TP/FP/FN/abstain, source exact count and case IDs>
SEMANTIC_BASELINE=<TP/FP/FN/abstain, source exact count and case IDs>
STRICT_ONLY_LOSSES=<case IDs or none>
OFFTOPIC_FRANCE=<measured present/absent, item count, budget, root cause>
OTHER_NEGATIVES=<disjoint controls and measured outcomes>
INDEX_RESCUE=<registered positive IDs, raw pool absence, proof stage>
B2_ROOT_CAUSE=<one narrow root cause or UNVERIFIED>
CENTRAL_CHANGE_CONTRACT=<production source functions + exact regressions>
OLD_ISSUE81=<fingerprint immutable, not newly passed>
EVIDENCE_PUBLICATION=<PASS/BLOCKED/NOT_ATTEMPTED>
EVIDENCE_COMMIT_SHA=<full SHA or none>
PRIVATE_COHORT_LOCATION=<path only>
KNOWN_GAPS=<finite concrete blockers>
COMMAND_SHAPE_FRICTION=<complete canonical GHDEV-10 schema, include
guard_annotations and observed CLI arg_contract events>

Use bounded autonomous host-interface diagnostics, test fixture adapters,
private scratch scripts and safe read-only Graphiti investigations as needed.
Stop for material source authority disagreement, privacy drift, missing
validated source truths, frozen snapshot drift or prohibited mutation.
Do not require another Central handoff for ordinary within-scope failures.
