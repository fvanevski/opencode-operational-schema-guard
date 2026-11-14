# Issue #92 — final recall-recovery qualification and fresh prospective freeze

## Control and mission

REPO=fvanevski/opencode-operational-schema-guard
BRANCH=work/91-memory-utility-r1
REQUIRED_HEAD=replace with exact kickoff SHA from Central
PRIMARY_AGENT=Hermes / Build on Garuda Linux
CPU_TASKS=source authentication, full native regressions, immutable v5 read-only audit, new prospective freeze/scorer/launcher setup
GPU_TASKS=ONE exposed functional run against prior v5 missed facts, admitted via existing EX bridge
SOURCE_GITHUB_WRITES=forbidden
EVIDENCE_GITHUB_WRITES=at most ONE sanitized commit
PR=forbidden; MERGE=forbidden; PROD_ACTIVATION=forbidden; ISSUE_CLOSE=forbidden
UNTTOUCHED_PROSPECTIVE_INFERENCE=forbidden until one Central source-label approval
HISTORICAL_V5_REPLAY=forbidden

This is **one consolidated last-mile issue #92 slice**. Central already implemented the substantive change in finite-batch.mjs plus targeted tests. Build must not design another prompt, gate, model-serving integration, RAG system, daemon, CLI option, or ingestion framework. Preserve all original v3/v4/v5 cohorts, labels, Graphiti groups, failed acceptance scorecards, immutable model intents and markers. No S7 exploration.

### Architecture: why these changes

The approved ADR-91 makes Graphiti a source-grounded development knowledge graph alongside OpenViking's context/experience store. Full native-source privacy/provenance, independent semantic support, independent fact utility, temporal evidence class, one atomic fact per Graphiti episode, ReviewStore/CAS/UUID/source index and Hermes-exempt canonical post-exit EX kernel-flock admission continue unchanged.

Frozen v5 acceptance FAIL (7/10 valuable; 7 independently useful; 7/7 grounded/useful; zero observed breaches). Immutable v5 read-only diagnosis isolated:
* v-05: genuine 69-char user-reported LiteLLM startup dependency, exact source authenticated but claim-support reply malformed/invalid.
* v-10: genuine 498-char OpenCode DB prune/SQLite procedure, exact source authenticated but no proposal extracted by source discovery/utility.
* v-04: one-off commit/push PR task, defensibly borderline; no scope change.

Central code now broadens the EXISTING source-quote-salvage opt-in:
1. An INVALID independent normalized claim-support response can never authorize the claim, but an independently source-validated original quotation may still undergo a separate source-exact utility review; only its exact quote may persist.
2. When normalized discovery AND source-exact complement extracted no valid source fact at all, offer at most THREE bounded CONTIGUOUS source quotes (up to 450 UTF-16 units each) from authenticated native events for the EXISTING independent exact-source utility reviewer. No model paraphrase is used as fact; original text/privacy/temporal authority remain. An explicit utility REJECT never becomes Graphiti knowledge.
3. All existing model call/EX once-only guards, cardinality limits and historical frozen batch identity stay in place.

This is not a deterministic rule that all config keys or SQL commands must be stored. The independent utility reviewer remains responsible for durable value. No automatic raw log archive.

## A. Native verification on EXACT source HEAD (CPU-only)

Authenticate current exact full HEAD/modified Git blobs, preserve other host files, and execute with actual exit codes:
node --check docs/issue-78/v2-curator/finite-batch.mjs
node --check docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/claim-evidence.test.mjs
node --test docs/issue-78/v2-candidate/long-prompt.test.mjs
node --test docs/issue-91/adr-acceptance/issue92-a3-stage.test.mjs
node --test docs/issue-91/adr-acceptance/issue92-a3-acceptance.test.mjs
python3 docs/issue-78/v2-curator/test_ex_admitted_node_bridge.py
npm run check
npm test

Focused new regression cases specifically prove short explicit dependency with malformed claim-support reply; dense SQLite command with 0 discovery/complement proposals; and rejected status chatter. Also inspect that existing claim-support invalid/unsupported and source-specificity regression behavior remains. Native red is real evidence: stop before any new inference and return exact test/trace + minimal proposed Central correction. Never weaken tests, fake a PASS or silently change source/semantic expectations. Host-bound permissions/launcher/provenance adaptations are within Build autonomy.

## B. ONE exposed, short integration (GPU + model + Graphiti)

After A passes, run at most ONE admitted source-bound exposed qualification in a fresh disposable EMPTY group (e.g. graphiti-adr92-exposed-final-recall-r1) with 3–5 immutable prior native source cases: v5-v-05 and v5-v-10 (two specific targets of fix), one prior persisted positive, one true nonvaluable control, optionally v5-v-04 as nonmandatory borderline. Use original authenticated OpenCode full texts and real native session/message/project/workspace identity, no synthetic shared session, original-source privacy scan, and bounded multi-span capture. This is EXPOSED diagnostic only; do NOT reuse historical v5 group or count its outcome as prospective acceptance.

Existing current treatment, only new source HEAD:
--finite-batch on
--novelty-policy recall
--source-recovery on
--resilient-discovery on
--claim-evidence on
--source-exact-complement on
--source-quote-salvage on
--balanced-dedup on
--max-clusters 8
--max-candidates 24
--max-seconds 1800
model: existing local chat-fast, unchanged tuning.

Run under canonical inherited-kernel-FLOCK EX bridge, normal quiet-grace, idle and unresolved checks, Hermes supervisory exemption, one immutable model intent, state-scoped once-only marker. A busy refusal before first inference may retry; after first intent never rerun inference. Graphiti queued/ambiguous writes go reconcile-only to remote UUID/source-index. Do NOT clear any group or move historical markers. Check duplicate/false positive control and exact-source temporal/verified-vs-reported authority. Record all stage reasons including quoteSalvageOutcome and sourceOnlyOutcome, per-target original source and quote. If the exposed treatment fails to recover v-05 or v-10, diagnose using its fixed source/utility evidence and return in the same packet; no prompt sweep or automatic second run.

## C. Prepare ONE untouched prospective cohort in SAME campaign (CPU-only)

In parallel with B's host work, freeze ONE new authentic naturally occurring post-exit OpenCode 20-case cohort with 10 independently source-supported valuable developer facts and 10 representative nonvaluable controls. Do not simply reuse previously exposed v2/v3/v4/v5/B3/H2–H4 facts, their technical predicates, source IDs or verbatim text. Earlier cohorts are exposed. H2–H4 original byte-level provenance may be UNVERIFIED if unavailable; use actual obtainable native/digest evidence, not a new arbitrary hard stop.

Valuable examples can be specific user-reported startup dependencies, operational requirements, maintenance procedures, source-quoted technical constraints, negative findings, and observed bugs. A question, speculative location or retrieved OpenViking memory echo is not a durable observed fact. Label factual status as reported, proposed, observed or verified only as original native source warrants. Do not fabricate or pad with synthetic cases or choose only trivially easy cases.

Ratify each original native source from opencode.db (actual native session ID + message ID + exact source locator, project, directory, observed timestamp, full original text SHA, 25–450-char safe verbatim quote for valuable cases, control rationale). Original bytes/ratification + source/label freeze private 0600 before ANY model intent. Use Central corrected native staging and real natural clusters within existing 24-cluster bound; if more, choose another appropriate normal cohort with a separate freeze rather than rewriting session provenance. Preserve original full-input privacy checks, meaningful capture denominator and drop reasons.

Use genuinely fresh private 0700 state and an EMPTY prospective Graphiti group named graphiti-adr92-a3-prospective-v6 if available; never clear older groups. Prepare existing driver/launcher with full source-blob evidence, canonical EX positive+negative preflight and state-specific once-only marker, no re-inference, reconcile-only, source-aware scorer. Prospective scorer must fail closed before results. Treatment uses same flags as B and 24/72/3600 limits.

**Do NOT execute the new prospective inference in this handoff.** Central must independently ratify the 20-case untouched freeze and exposed B observations in one review. This is a single final readiness return, not authorization to start a new endless setup campaign.

Acceptance thresholds UNCHANGED: >=9/10 valuable target coverage, >=90% grounded precision, >=75% useful among grounded, >=8 distinct independently useful facts, zero authority/privacy/EX/wrong-group/false-verification breaches, positive terminal remote UUID/source-index reconciliation and Wilson 95% intervals. No post-hoc label changes.

## D. ONE sanitized evidence publication and final return

Publish at most ONE evidence-only commit on the existing branch under docs/issue-91/evidence/92-final-recall-recovery/. Authenticate remote exact ref, tree and blobs. Keep private full texts, raw model replies, secrets, logs, model prompts and native database off GitHub. No source writes, new PR, merge, activation, closure or v5 reinterpretation.

Return a SINGLE terminal packet:
RESULT=READY_FOR_V6_FINAL_PROSPECTIVE_APPROVAL | SOURCE_REMEDIATION_REQUIRED | COHORT_NOT_RATIFIABLE | BLOCKED
SOURCE_SHA=<tested exact full 40-hex HEAD>
EVIDENCE_SHA=<sanitized published full HEAD>
TESTS=<all native focused/broad exits>
EXPOSED_GROUP=<new empty-group proof, one-execution/EX/UUID evidence>
V5_RECOVERY=<v-05 and v-10 exact source/utility outcomes, no false-positive control, no replay>
V6_FREEZE=<20 authenticated native cases, 10 safe valuable quotes+10 negative reasons, exact manifest and label hashes, natural cluster count>
V6_LAUNCH_READY=<group empty, state-scoped once-only, source blob identity, scorer fails closed, exact command>
HISTORICAL_INVARIANTS=<v3/v4/v5 unchanged>
GHDEV10_FRICTION=<actual material command friction only>

If native and exposed gates meet the new mechanism and source/label freeze is sound, Central should authorize the already prepared single v6 prospective inference at the NEXT turn. If it passes unchanged gates, proceed directly to one cohesive #92 PR and trusted independent exact-head review/CI/merge and issue closure. Avoid A4/S7 side investigations or more incremental handoffs.
