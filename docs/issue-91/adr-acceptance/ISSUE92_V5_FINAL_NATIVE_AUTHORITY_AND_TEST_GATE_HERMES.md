# Issue #92 — final native-source authority and test gate (one Hermes assignment)

REPO=fvanevski/opencode-operational-schema-guard
BRANCH=work/91-memory-utility-r1
REQUIRED_HEAD=5d8fdcf3aea63193a8b5b8f88148848944987c0d
PRIMARY_AGENT=Hermes / Build
PHASE=CPU_ONLY; LIVE_MODEL_INFERENCE=FORBIDDEN; GRAPHITI_WRITES=FORBIDDEN
SOURCE_GITHUB_WRITES=FORBIDDEN; ONE_SANITIZED_EVIDENCE_COMMIT=PERMITTED
NEW_PR=FORBIDDEN; MERGE=FORBIDDEN; PRODUCTION_ACTIVATION=FORBIDDEN; ISSUE_CLOSURE=FORBIDDEN

## Purpose

Resolve the ONLY two actionable blockers to the prepared v5 prospective run without another design or evaluation campaign: (1) four focused native tests were RED at the 11c37c6 source SHA, and (2) reported "shared-triple re-staging" may have replaced real native session identities. Central already fixed the stale TEST assertions and added a source-locator binding invariant under the exact REQUIRED_HEAD. The code is staged; Hermes performs native validation and read-only host evidence collection, not source implementation.

The original source manifest and cohort are pre-inference (no v5 Graphiti episodes, no v5 once-only marker, no v5 inference). Historical S1–S6, exposed-authored-r1, A3-v3/v4 and their markers/records/Graphiti episodes remain immutable. Existing Graphiti/OpenViking separation, claim/source-exact utility, balanced dedup, EX kernel-flock bridge, Hermes supervisor exemption, source-index/UUID proof and scorer are not to be redesigned. No prompt sweeps or changes to >=85/90/75 percentages / eight-fact floor.

## A. Native tests at exact Central HEAD

Authenticate the full HEAD and all modified blob SHAs. Preserve untracked host files. Run with ACTUAL exit codes:

node --check docs/issue-78/v2-candidate/events.mjs
node --check docs/issue-78/v2-candidate/long-prompt.test.mjs
node --check docs/issue-78/v2-curator/core.mjs
node --check docs/issue-78/v2-curator/finite-batch.test.mjs
node --check docs/issue-91/adr-acceptance/issue92-a3-native-source.mjs
node --check docs/issue-91/adr-acceptance/issue92-a3-acceptance.mjs
node --check docs/issue-91/adr-acceptance/issue92-a3-acceptance.test.mjs
node --test docs/issue-78/v2-candidate/long-prompt.test.mjs
node --test docs/issue-78/v2-candidate/candidate.test.mjs
node --test docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/claim-evidence.test.mjs
node --test docs/issue-91/adr-acceptance/issue92-a3-stage.test.mjs
node --test docs/issue-91/adr-acceptance/issue92-a3-acceptance.test.mjs
python3 docs/issue-78/v2-curator/test_ex_admitted_node_bridge.py
npm run check
npm test

One test-only fix: finite-batch plan items live in plan.items, not plan.cluster_outcomes[].facts. Three old long-prompt tests were aligned with the current, approved architecture: structured JSON/code is native evidence, not an automatic capture veto; independent durable-utility review controls graph promotion, and automatic EMIT requires the explicit utility class. The new prospective tests must reject a synthetic session_id that conflicts with the original native source_locator. DO NOT weaken production validators, skip tests or claim a focused RED suite passed because npm test passed. If any gate remains RED, return exact failing case and minimal source/test discrepancy for Central to repair; continue safe read-only identity verification in the same assignment.

## B. Verify prospective v5 ORIGINAL source authority, not just hashes

Preliminary v5 group graphiti-adr92-a3-prospective-v5; 20 case roster: 10 valuable + 10 controls. Published unexecuted manifest SHA256:
efa72509f0a74975e4d1f69695e9574009a8a9a95fc6b8dbe51c4eb95bd0124c
Published frozen label SHA256:
37976c72071a483b978a6c1bd64b2e7ca57b5e841ea80ea5f2a0e7a452cacadd

Read the exact private 0600 manifest bytes and 20 original native records. Verify for EVERY case:
* Original authoritative OpenCode native DB/session/message ID, project, workspace, observed timestamp and original full message text SHA256. Do not accept a self-declared or regenerated synthetic session as authority.
* Exact source_locator == opencode:<original-session-id>:message:<original-message-id>. The frozen roster/source hash must agree with this string. The source-stage code now enforces this at commit-level.
* The source-authored statement itself (not OpenViking retrieval text) entails each valuable predicate. Provide ONE bounded SAFE 25–450 char ORIGINAL excerpt for each valuable case and a compact control rationale, plus case IDs, source/ref digest, temporal status and original-excerpt hash. Original secrets / env values stay private.
* A new message ID alone does not establish a novel predicate. Check factual/semantic overlap with all available v2/v3/v4/B3/previous exposed sources, marking unavailable H2-H4 original bytes UNVERIFIED rather than inventing proof.
* Preserve reported or proposed status; do not score a statement that a setting "may live" somewhere as a VERIFIED path. Do not persist secret values or sensitive file contents. No need for production-grade bureaucracy.

Specifically inspect the previous HOST workaround: 20 native events in 17 sessions reportedly became three model clusters by "shared-triple re-staging." The AUTHENTICATED native session IDs MUST NOT be altered to force smaller cluster count. The prospective finite-batch limit is maxClusters=24 and already covers 17 natural clusters. Count natural clusters under real session IDs and compare with the staged receipt, source_ref, source_event_ids and Graphiti source-index expectations. If original source identity was changed, DO NOT run the existing synthetic queue, and DO NOT "fix" it by re-signing synthetic IDs. Preserve that invalid pre-inference state as private historical evidence, and rebuild from the unchanged authoritative original message bytes in a clean private state using Central issue92-a3-stage.mjs; if roster/labels/IDs must change, freeze a complete new manifest/label digest before inference. A fresh group v6 is permissible if a v5 identity was exposed/occupied; no old group clear or deletion. Use real original IDs and source refs, not flattened session identities.

## C. Prepare single actual prospective run, no inference yet

After A/B pass, stage with the corrected native source builder. Preserve 20 cases with natural source identities, full-input privacy scanning, native multi-span capture, original time/project/workspace and existing one-fact-per-episode contract. One cluster per natural scope/session; 17 clusters are within the 24 maximum if no more than 24 after full-span splitting. Use a new 0700 private state if any prior v5 staging is suspect. Check remote group still EMPTY, no once-only marker, no unknown remote operation. Record actual 20 case->native-source-ref mapping, stage receipt digest and queue readback; real EX positive/negative preflight without model inference. Host launcher must authenticate all execution-source blobs against 5d8fdcf3aea63193a8b5b8f88148848944987c0d (not naively require current evidence-only descendant HEAD), Hermes exempt remains, and once-only marker must be state-scoped (no v3/v4 shared marker collision). Prepare 8-arg source/fact scorer; it MUST fail closed at pre-inference insufficient_review_samples.

Use a single prepared treatment:
--finite-batch on --novelty-policy recall --source-recovery on
--resilient-discovery on --claim-evidence on --source-exact-complement on
--source-quote-salvage on --balanced-dedup on
--max-clusters 24 --max-candidates 72 --max-seconds 3600
Existing chat-fast / model params; no additional admission gates, prompts or serving changes.

Final prospective thresholds UNCHANGED: >=9/10 independent valuable hits, >=90% grounded precision, >=75% useful among grounded and >=8 independent useful persisted facts, zero authority/privacy/EX/false-verification/wrong-group breaches, positive exact UUID/source-index reconciliation and Wilson 95% intervals. No historical replay.

## D. ONE sanitized evidence return

Publish at most ONE evidence-only non-force commit to existing branch under docs/issue-91/evidence/92-v5-native-authority-final/ and verify remote ref/tree/blobs. Include:
- tested full source SHA and exact native exits (focused + root);
- 20-row SAFE original-source quote/hash roster with 10 valuable and 10 controls; original native ID vs staged ID match;
- natural cluster count and provenance of any old shared-triple workaround;
- accepted v5 source/label SHA or a new fully frozen pre-inference version;
- privacy/temporal/rule compliance, 0 remote episodes and 0 inference;
- existing EX launch command, source/blob proof, once-only strategy, preflight and scorer readiness.

RESULT=FINAL_V5_NATIVE_AUTHORITY_READY | SOURCE_REMEDIATION_REQUIRED | COHORT_NOT_RATIFIABLE | BLOCKED

Do not create a PR, merge, deploy or close Issue #92. Central reviews the 20-row SOURCE-backed evidence once and authorizes the already-prepared ONE prospective run if valid. No further host setup campaign should be necessary.
