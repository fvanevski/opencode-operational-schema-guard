# Issue #92 — One consolidated authored-source recovery and final prospective readiness campaign

REPO=fvanevski/opencode-operational-schema-guard
BRANCH=work/91-memory-utility-r1
START_SHA=provided in kickoff (authenticate full SHA)
PRIMARY_AGENT=Hermes / Build
SOURCE_GITHUB_WRITES=forbidden; EVIDENCE_GITHUB_WRITES=one sanitized commit permitted
PR_CREATION=forbidden; MERGE=forbidden; DEPLOYMENT=forbidden; ISSUE_CLOSURE=forbidden

## Goal and architecture

Advance #92 toward completion by correcting the two demonstrated mechanisms: (1) OpenViking-injected retrieval context was treated as part of a native user-stated source, and (2) rejection of an invented normalized claim could also block the exact quoted source from independent durable-utility review. Keep Graphiti as a source-supported development-knowledge graph beside OpenViking, not a second session store. Historical results, EX admission and user-facing operation stay intact. Do not create another model-serving, admission, scheduler, graph, privacy or retrieval architecture.

Central has staged all substantive source and regression changes in events.mjs, long-prompt.test.mjs, finite-batch.mjs, finite-batch.test.mjs and curator-cli.mjs. Do not delegate source design or prompt editing to a local model. Existing source-validation, separate utility, recall-conscious balanced semantic dedup, temporal evidence classes, three facts per cluster, one per episode, ReviewStore/CAS/UUID/source index and once-only graph writes remain authoritative.

The new mode source-quote-salvage is an explicit development opt-in requiring source-exact-complement. After a normalized claim fails source support, it can review its ALREADY authenticated original quote through a separate independent utility call, without approving or storing the unsupported paraphrase or revisiting an exact-quote utility rejection. Older frozen batches cannot adopt it. A complete literal openviking-context tagged retrieval block is excluded from new user-stated source text; authored text before or after it survives. The FULL ORIGINAL input still undergoes secret scanning before extraction. Incomplete tags do not become new user evidence.

Historical v3 and v4 prospective failures are permanent (both 7/10). A3-v4 batch 01b37e0598e5a231e25649637cce4d6304e79cd024ad0af5ce4b824a31f41c6f; 8 remotely persisted episodes, seven independently useful facts, zero reported breaches. Never re-run, rewrite or relabel past batches, move historical markers, clear old Graphiti groups or overwrite old source/label manifests.

## A. Authenticate and run native tests (CPU-only)

Fetch the exact kickoff commit, verify expected Git blobs and cleanly account for untracked host files. Run each as a real process, record exit/status and failures:
node --check docs/issue-78/v2-candidate/events.mjs
node --check docs/issue-78/v2-candidate/long-prompt.test.mjs
node --check docs/issue-78/v2-curator/finite-batch.mjs
node --check docs/issue-78/v2-curator/finite-batch.test.mjs
node --check docs/issue-78/v2-curator/curator-cli.mjs
node --test docs/issue-78/v2-candidate/long-prompt.test.mjs
node --test docs/issue-78/v2-candidate/candidate.test.mjs
node --test docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/claim-evidence.test.mjs
node --test docs/issue-78/v2-curator/ex-admission-proof.test.mjs
node --test docs/issue-91/adr-acceptance/issue92-a3-acceptance.test.mjs
python3 docs/issue-78/v2-curator/test_ex_admitted_node_bridge.py
npm run check
npm test

Specifically verify the four new source-wrapper tests and four new exact-quote salvage tests. Do not weaken, skip or reinterpret a failed source regression. If any substantive Central test/code defect is real, return exact focused reproduction and minimal proposed fix; stop before GPU/model/Graphiti inference. Host-only CLI path/permission/service startup mechanics are under Hermes autonomy.

## B. Fix the evidence interpretation, not the historical result (CPU-only)

Read original private A3-v4 native source, immutable plan/snapshot/model call receipts and ReviewStore for ONLY three missed targets: v4-04 FileFlows ABI, v4-06 ffdeps reference, v4-10 durable segment sealing. Record each first-loss stage and reason: candidate availability, model-visible AUTHORED source quote, claim-support denial, exact utility, or selection. Use the new authored-source sanitization to see whether the desired technical predicate was the user's actual authored statement or only an OpenViking memory echo. Do not count retrieved text as independent user authority or claim a model-selection bug where no authored predicate exists. Include bounded safe excerpts, source identity/hash and exact stage-reason codes, not raw session messages or model replies.

This is an exposed diagnostic, not a modification of v4 numerator/denominator.

## C. ONE short exposed functional qualification (GPU + live Graphiti)

After native gates PASS, create a single disposable private state and fresh EMPTY group graphiti-adr92-exposed-authored-r1. Use at most eight AUTHENTICATED already-exposed source clusters (three formerly missed v4 cases only where original authored source survives, plus a few known positive, duplicate and nonvaluable controls). Never write to v3/v4 or S1-S6 historical groups. Keep the original model chat-fast and current endpoint. One treatment, no prompt sweep:

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

Existing Hermes-supervised canonical EX flock, inherited locked FD, other blocking-harness idle checks, quiet grace, scheduler idle, unresolved-work check and no replay remain unchanged. Hermes itself is intentionally exempt. Pre-inference scheduler busy can be retried. Once an immutable intent exists, ambiguous outcomes must be preserved and settled through read-only positive Graphiti reconciliation, never blind repeated model/Graphiti submissions. Use a STATE-SCOPED once-only marker; do not move or rename v3/v4 markers.

Measure per-source authored fact discovery, normalized support, exact-quote salvage/utility, balanced dedup, useful fact counts, false positives, review burden, EX success, Graphiti UUID/source index, retrieval usefulness and total stage calls. Do not pretend this exposed check is a prospective PASS. If no eligible authored source remains for a historical target, record that result and do not fabricate one. If a material new production invariant fails, return source evidence for Central rather than beginning another open-ended trial.

## D. Final untouched prospective preparation in the SAME campaign (CPU-only)

Using current natural developer events, independently freeze one new 20-case cohort: 10 genuinely source-STATED development predicates and 10 reasonable nonvaluable controls. Must be new in native message identities, substantive text and underlying technical predicates relative to v2/v3/v4, B3, H2-H4 if available, and other exposed sources. In particular, do NOT reuse remembered text inside an injected OpenViking context as a valuable user assertion. H2-H4 private byte-level unavailability remains UNVERIFIED, not a new arbitrary veto. A directly stated proposed constraint is valuable without proof of implementation, but a question about a completed fix is not evidence of that fix.

Freeze before any prospective model intent: immutable 0600 private original-source manifest, independent source/label review, each stable native message ID, source/text digest, project/workspace/time, bounded verbatim quote (valuable) or compact reason (control), and temporal class. Derive new candidate events using Central full-input privacy scanning and bounded multi-span capture. Include raw-native opportunity denominator and typed hard-drop accounting. Do not cherry-pick fabricated synthetic facts or easy-only repeated positive statements.

Use a fresh private state and untouched group graphiti-adr92-a3-prospective-v5 if empty (or another new compliant identity if necessary). Never clear an existing group. Confirm zero prior Graphiti episodes, no marker, no unknown submission and 20 correctly source-staged cases. CPU-preflight the existing factual scorer/launcher under exact authenticated source blobs, using the same flags as C with production qualification bounds 24 clusters, 72 candidates, 3600 seconds. Correct the host-local stale evidence-descendant HEAD check with ancestor+blob authentication, not a disabled source check. Use a marker within the fresh state root to avoid the previous cross-cohort marker collision. Preserve old once-only historical receipts. No new gate machinery.

Prospective rules remain EXACTLY: >=9/10 independently valuable targets, >=90% grounded precision, >=75% useful among grounded with >=8 independently useful durable facts, zero privacy/EX/wrong-group/false-verification/authority breaches, full positive ReviewStore-to-Graphiti UUID/source-index proof, Wilson 95% intervals. The scorer must be ready but fail closed pre-inference. Do NOT start this prospective inference yet; Central must inspect the independent safe 20-case freeze and exposed result once. This should be the ONLY further prospective go/no-go handoff, with the launcher fully ready at handback.

## E. One return

Publish at most ONE sanitized evidence-only commit on the SAME branch in docs/issue-91/evidence/92-authored-source-recovery/. Exact remote ref/tree/blob readback required. Private raw text, user sessions, secrets, credentials, model replies and remote service logs stay on the 0700/0600 host. No source GitHub writes, PR, merge, production activation or issue closure.

Return a SINGLE packet:
RESULT=READY_FOR_FINAL_PROSPECTIVE_APPROVAL | SOURCE_REMEDIATION_REQUIRED | COHORT_NOT_RATIFIABLE | BLOCKED
SOURCE_HEAD=<full tested 40-char SHA>
EVIDENCE_HEAD=<full published SHA>
TESTS=<focused + broad native exit codes and counts>
V4_LOSS=<three cases, actual first-loss stage and authored vs retrieved source>
EXPOSED_PROOF=<one admitted run, stage counts, distinct useful facts, duplicate/grounding/remote/retrieval proof>
FRESH_COHORT=<20 independent source/label identifiers, private sha, safe evidence quotes, negative controls>
EMPTY_GROUP=<fresh name and positive zero-episode proof>
PREPARED_PROSPECTIVE=<exact command and immutable source/exemption/no-replay/scorer proof>
HISTORICAL_STATE=<unmodified old graph groups + markers + labels>
GHDEV10_FRICTION=<concrete command shape, effect, resolution>

If this evidence meets exposed mechanism and prospective freeze standards, Central should authorize its already-prepared single final run, then progress to ONE #92 PR and independent exact-head review/CI/merge and merged-main closure if it passes. No more incremental setup campaigns or side issues.
