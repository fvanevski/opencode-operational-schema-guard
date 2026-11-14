# Issue #92 / PR #95 — V8d terminal first-loss forensics

REPO=fvanevski/opencode-operational-schema-guard
BRANCH=issue/92-v7c-accepted
REQUIRED_HEAD=<Central kickoff exact SHA>
BATCH_ID=6d7afb9de1f9f7e8c2af31022b0824b0a1762f48919672067856b49843a2b2b2
GROUP=graphiti-adr92-a3-prospective-v8
FROZEN_EXECUTION_HEAD=c402658e6b6d15174aa5b9234eda2471baf44472
TERMINAL_EVIDENCE_HEAD=530340929ef375e1a901c332c2710c7cb36c28dd
PRIMARY_AGENT=OpenCode Evidence / Hermes Evidence
ENVIRONMENT=CPU_ONLY + READ_ONLY Graphiti get_episodes
MODEL_INFERENCE=FORBIDDEN
GRAPHITI_WRITES=FORBIDDEN
SOURCE_TEST_SCORER_LABEL_EDITS=FORBIDDEN
NEW_COHORT=FORBIDDEN; REPLAY=FORBIDDEN
NEW_PR=FORBIDDEN; MERGE=FORBIDDEN; DEPLOY=FORBIDDEN; ISSUE_CLOSE=FORBIDDEN
ALLOWED_PUBLIC_WRITE=one optional sanitized evidence-only commit on existing PR

## Mission
Existing frozen V8d A3 terminal result is FAIL: 5/10 valuable recovered, 5/8 useful among grounded, 5 useful independent facts, 8/8 remote membership. Preserve the score, cohort, all model responses, EX/Graphiti state and all previous results unchanged. Find the FIRST actual loss for each originally frozen target from the completed call/plan/review records. Do not run the model again or invent a new corpus.

## A. Provenance
Safely fetch and verify REQUIRED_HEAD and exact production source ancestry; leave user checkout intact. Locate the existing private immutable V8d state via batch ID. Verify manifest SHA256 aa42941a2b040f941435021ddac6dcce911b838bf4f2f42238100b89abd05440; labels c9befd79c59e91bc48f0e1441766f79ad94bbb39dffb12ce33d176c02bb599c7; roster 3414d767c713c49425bff292820f21182b0a40e116850dc72f4d6e0e5ac2d809. Confirm one-shot marker, immutable plan/call-result hashes and original scorer FAIL without recalculating or changing labels.

## B. Ten-case first-loss ledger
For each v8d-v-01..10, join the original case event/source_ref to its cluster, all sibling case IDs, discovery (original/recovery/complement/source-only), source support, utility, atomicity/structural veto, arbitration, frozen plan decision, ReviewStore record, remote UUID and independent utility adjudication.

Classify exactly one FIRST_LOSS:
 NOT_DISCOVERED | UNSUPPORTED_SOURCE | CLAIM_SUPPORT | UTILITY_DEFER | ATOMICITY_VETO | CLUSTER_CAP_OR_FALLBACK | ARBITRATION | GRAPH_WRITE | PERSISTED_NOT_USEFUL | COVERED | UNVERIFIED.
Provide specific frozen receipt stage/call/plan ID or hash for each, not speculative causal narratives.

## C. v01/v07/c01 shared-session investigation
These three original messages share a native session. Current source selectClusters groups by session, finite-batch materializes each fact review with all cluster events/source_event_ids, and source-only fallback is restricted to approved.length===0 && entries.size===0. Inspect the REAL frozen cluster/calls to decide whether v07 was missed because of that fallback predicate, discovery, independent utility, cap, or other stage.

For the persisted v01 Plex record, compare:
 (1) fact.source_refs,
 (2) rec.events[].source_refs and source_event_ids,
 (3) persisted source-index owner,
 (4) actual Graphiti episode_body/source references, if readable.
Classify c01 CONTROL_FACT_PERSISTED only if the control is cited as a fact source or appears in the episode as such; otherwise REVIEW_CONTEXT_OVERINCLUSION if it is solely a sibling in review-record provenance. Mark unavailable evidence UNVERIFIED. No Graphiti writes or cleanup.

## D. Independent-usefulness discrepancy
For persisted-not-useful v04 (desired Tdarr network), v06 (post-restart MCP failure), and v08 (tentative pairing-loop defect), report immutable original source excerpt digest, evidence/temporal class, curator's utility class, separate adjudicator's specific written reason, and whether the reason confuses unverified deployment/root cause with possible durable value. Do NOT revise their scored verdicts.

Note the deterministic scorer contract mismatch: issue92-a3-acceptance.mjs counts a nonvaluable fact sourced from a control, but has no pass gate over nonvaluable_persisted_cases; its current test permits pass with one. Report this as validation-control discrepancy, not a modified standard.

## E. Once-only handback
One optional additive sanitized evidence-only README/JSON at docs/issue-91/evidence/92-pr95-v8d-first-loss/ on the existing branch, CAS/non-force with readback. No private prompt text, raw model replies, secrets, native DB exports or full logs.

RETURN ONCE:
RESULT=V8D_FIRST_LOSS_RESOLVED | EVIDENCE_INCOMPLETE | BLOCKED
SOURCE_HEAD=<exact read-only tested HEAD>
EVIDENCE_HEAD=<exact published SHA or no publication>
FROZEN_IDENTITIES=<hash/plan/call receipts>
CASE_LEDGER=<10 first-loss classifications + evidence handles>
V01_V07_C01=<fact-source vs review-context proof, remote readback>
UTILITY_AUTHORITY=<v04/v06/v08 exact adjudication reason classification>
SCORER_DISCREPANCY=<frozen rule-vs-test mismatch>
HISTORICAL_INTEGRITY=<unchanged>
CODE_EDITS=<none>
COMMAND_SHAPE_FRICTION=<actual only>
DECISION_BLOCKERS=<specific missing evidence>

Central owns code/test/validation-source remediation in this same PR after these existing-result diagnostics. No fresh prospective, repeat EX inference or new issues.
