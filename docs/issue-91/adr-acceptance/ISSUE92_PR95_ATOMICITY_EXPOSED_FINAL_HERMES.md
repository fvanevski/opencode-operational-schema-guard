# Issue #92 / PR #95 — final atomicity qualification and next untouched freeze

REPO_ID=fvanevski/opencode-operational-schema-guard
PR_NUMBER=95
BRANCH=issue/92-v7c-accepted
REQUIRED_HEAD=use full Central kickoff SHA
PRIMARY_AGENT=OpenCode Build (Hermes Build acceptable)
SOURCE_EDITS=forbidden; SOURCE_GITHUB_WRITES=forbidden
EVIDENCE_COMMIT=at most ONE sanitized non-force commit
NEW_PR=forbidden; MERGE=forbidden; PROD_DEPLOY=forbidden; ISSUE_CLOSE=forbidden
HISTORICAL_INFERENCE_REPLAY=forbidden
EXECUTION_PHASES=A:CPU B:one EX-admitted exposed functional probe C:CPU prospective source freeze if B qualifies
EVIDENCE_ROOT=docs/issue-91/evidence/92-pr95-atomicity-final

## Governing authority and what Central has implemented

Issue #92 high-recall developer-memory ADR: exact authenticated native source is authoritative only for WHAT was stated and WHEN; Graphiti persists one useful, separately reviewed atomic predicate per episode, not assistant inference or OpenViking continuity echoes. Separate claim-support and utility passes preserve source/temporal classes, privacy, ReviewStore CAS, and positive Graphiti UUID/source-index proof. Model inference/write eligibility stays behind the existing inherited kernel FLOCK EX post-exit gate, one immutable intent, reconcile-only unknown outcomes. Historical v7c 9/10 PASS remains immutable and is NOT a fresh prospective result for this new source treatment.

The independent PR review identified two source/privacy defects and one atomicity defect. Central has now committed all corrections and focused regressions to the EXISTING PR #95 branch:
- events.mjs: literal contiguous source quotes and exact original UTF-16 offsets after context removal; natural-language credential-value veto with documented removal status ('API key was removed') retained;
- final finite-batch source_quote_salvage mode: independent utility must explicitly attest that a COMPLETE quote has exactly one independent technical predicate with rationale. Missing/multiple decisions go to DEFER, not Graphiti; source-quote complement may discover smaller independently sourced spans. The attestation includes an immutable assertion SHA256 in the plan. The active/plan atomicity_review_v1 identity prevents retrofitting/reinterpreting old frozen inference receipts;
- claim-evidence and fact-review models receive the atomicity instruction; the validator requires atomicity only for the final opt-in mode (legacy tests/records unchanged);
- GitHub Actions CI now actually runs docs/issue-78 native capture/curator and docs/issue-91 A3 tests, in addition to npm root tests.

Exact-head GitHub Actions at pre-contract source HEAD 8f85ee64a108d9f32cb8e6bc320e1ad8ecf6703d: run 43481444760 PASS, root 524/0, native candidate+long prompt 31/0, curator 97/0, A3 19/0 (671 total PASS). Do not duplicate entire root suite on the host.

Actual private v7c host state was located under ~/.local/state/ghdev-graphiti-issue92/, NOT previous contract's stale /tmp path. Do not treat named paths as truth: identify immutable old cohort files by SHA256 and original native message identity; if files moved, locate without changing them. Original frozen v7c corpus sha256 9356e663092df3a82b6b549e5d2c6208ff19a429205502388ba7d41b207af691; label sha256 401e57abae879653b2c37dff9173e3ba43a8f8b02e052ee87cbf319b954ecfc0. v7-v08 native message msg_160509336001zc8AM5tccpDCaM has TWO independent clauses (Tdarr server/node v3; Context7/Firecrawl tool-use instruction). Historical single episode UUID f699fd62-c952-49aa-a79c-4ff5428402d5 wrongly bundled these; do not modify/delete that historical episode or its reviewed record.

## A. Authenticate source and targeted host regression (CPU only)

Fetch REQUIRED_HEAD from origin. Preserve main checkout/untracked files; ff-only if clean, otherwise use disposable separate worktree. No reset, force push, stash, destructive cleanup. Validate actual full PR HEAD and key Git blobs, especially:
- events.mjs 041aab302264d080362c1039439a34f1f3fbf80c
- finite-batch.mjs f0c54e18e9e2832be17925d8b40f757b5bd9ddcc
- fact-review.mjs e4b13873b0e16c31fd0b063462b551c2e7a58d3d
- claim-evidence.mjs 3c29c4ff617682701e01fdfb46609e21a1892bd6
- finite-batch.test.mjs 739e01f4518f2197f2cf5bca9843993c41d468b7

If the kickoff HEAD changes because of this contract-only commit, those production/test blob IDs remain valid. Check actual PR head before publishing evidence. Run the focused Node suites only if needed to corroborate host version or troubleshoot; use the exact-head trusted GitHub CI for the complete 671 tests. A directly observed source-level failure outranks any green CI summary.

Confirm that "API key was removed" stages as a non-secret user-stated observation; "password is DEMO_VALUE_DO_NOT_USE" and analogous natural-language values do NOT stage; "credentials can be found at <location> with token/password field types" remains eligible without values. Confirm the exact native span offset/checking regression. No production patches locally. If these regress, STOP before GPU/model calls and return minimal failure.

## B. One exposed, newly admitted atomicity qualification (GPU + local model + disposable Graphiti only)

Goal: test the REAL current chat-fast utility reviewer on the exact historical v7-v08 multi-predicate source and a clearly atomic source, not merely mocks that declare the desired count. This is an EXPOSED qualification, not prospective acceptance.

Use original, native-authenticated v7-v08 from the frozen manifest, optionally the known atomic v7-v07 original, plus 1–2 representative nonvaluable controls. Do not synthesize or rewrite the source-bearing native message into a convenient prompt. Verify native source IDs/UTF-8 hashes, timestamp, project, workspace, group, full-input privacy. Stage into a fresh private 0700 state, new unique group e.g. graphiti-adr92-exposed-atomicity-r1 (only if empty and unused), source-native cluster IDs. Model chat-fast on http://127.0.0.1:8002. Use the current source_exact_complement + source_quote_salvage + claim_evidence + resilient_discovery + source_recovery + balanced_dedup + recall treatment, atomicity_review_v1 as required by production source. No prompt/model variant sweep.

Use existing canonical Python post-exit inherited-FLOCK/EX launcher and Node finite-batch driver, adapting only disposable host-local group/state and exact current SOURCE_HEAD/8 source blobs; never change EX proof or code semantics. Run at most ONE admitted model inference in this fresh group with <=6 natural clusters, <=18 candidates, <=1800s. Pre-inference ADMISSION_WAIT is retryable; after model intent, no repeat, even if the driver returns incomplete/unknown. Reconcile-only remote write uncertainty and preserve positive UUID proof. Do NOT write to historical v7c group or prod Graphiti group; no production activation.

Inspect EVERY produced utility review and accepted fact:
- The original FULL v7-v08 combined quote must not be persisted as one atomic fact. It may legitimately DEFER or be split into separately source-authenticated contiguous quotes, each with one predicate and independent useful review.
- For every accepted fact, independently confirm original source, meaning, source class and time, one-predicate semantic content, atomicity_review_v1 assertion-hash/rationale in frozen plan, correct-group ReviewStore→remote UUID/source-index proof.
- Missing atomicity attestation or two-predicate review MUST result in DEFER; no direct Graphiti write.
- A previously exposed clearly atomic useful fact should demonstrate the gate can ACCEPT when properly supported (avoid a degenerate all-DEFER "success"). Negative controls should stay out of Graphiti.
- Preserve secrets and source evidence; no claim that model's atomicity count is automatic truth. If it mistakenly accepts the bundled full v7-v08 assertion, report SOURCE_REMEDIATION_REQUIRED and DO NOT proceed to C. No second experimental variation.

Expose stage-level verdicts (model output only as sanitized categorical fields, NOT full private responses), number of calls and writes, per-case approval/defer, positive UUIDs, no model replay, EX proof, and any risk discovered. Zero privacy/authority/wrong-group breaches required. This probe is admissible because it is fresh disposable exposed state, NOT replay of the historical v7c inference.

## C. Same-campaign CPU freeze of a fresh v8 prospective cohort, only if B qualifies

If B demonstrates correct rejection/splitting of the two-predicate historical quote, safe acceptance of a positive atomic fact, and no control pollution or authority breaches, prepare ONE fresh, untouched 20-case native cohort: 10 genuinely useful original-source technical predicates and 10 representative nonvaluable controls. No new prospective inference until Central ratifies the freeze. Avoid v2–v7, B3, all exposed source IDs/technical predicates and OpenViking echoes; original source text, real native session/message IDs, observed time, project/workspace, source locator SHA256, full UTF-8 digest, source-supported 25–450-char quote for each valuable fact. Fail closed on questions masquerading as answers, multi-predicate bundled labels, mere task instructions, stale/unverified claims marked verified, and credential-bearing source; preserve legitimate source-reported/historical facts when properly qualified. Do not cherry-pick only trivially easy facts to force a pass.

Freeze original complete 20-case manifest and independent 10+10 label roster privately (0600), preserve all native hashes and quotes, stage only after freeze in clean 0700 state using existing A3 native builder. New empty group graphiti-adr92-a3-prospective-v8, max 24 natural clusters/72 candidates/3600s, once-only marker absent, complete current 8 source-blob bindings and the new atomicity identity. Existing canonical scorer must fail closed pre-inference; EX positive/negative preflight must pass. NEVER execute v8 prospective in this assignment. Retain original historical v7c as immutable independent result.

If there are not 10 valid unused naturally occurring valuable predicates or the scorer/EX staging cannot be shown safe, return COHORT_NOT_RATIFIABLE; do not invent sources, relax eligibility or launch inference.

## D. Publish one sanitized evidence packet and hand back ONCE

Optional one non-force evidence-only commit in EVIDENCE_ROOT on existing PR branch, with a concise README and machine-readable summary. Never commit native message text, private manifest/roster, unredacted model prompts/replies, Graphiti credentials/host secrets, model service logs, full private state, sensitive user IDs or private home paths. Audit staged paths; read back exact new remote SHA and blobs. If remote moved/diverged, STOP publication and return exact drift; no force/rebase/duplicate commit.

Return:
RESULT=READY_FOR_V8_CENTRAL_RATIFICATION | SOURCE_REMEDIATION_REQUIRED | COHORT_NOT_RATIFIABLE | BLOCKED
SOURCE_HEAD=<exact tested source SHA>
EVIDENCE_HEAD=<full SHA or reason absent>
TRUSTED_CI=<exact-head workflow/checks>
CPU_BOUNDARY=<privacy + literal source/offset outcome>
EXPOSED_ATOMICITY=<original bundled v7-v08 verdict; individual atomic positive; controls; Plan certificate; model calls; remote proof>
EX_ADMISSION=<kernel fd, idle/quiet grace, once-only, reconcile result>
V8_FREEZE=<if prepared: complete 20 case IDs, original safe 10 quotations, 10 control reasons, manifest+label+staging sha256, empty group and executable launcher>
HISTORICAL_INTEGRITY=<frozen v7c and all earlier states unchanged>
LOCAL_CHANGES=<none semantic; report any host harness adaptations>
COMMAND_SHAPE_FRICTION=<actual events only>
DECISION_BLOCKERS=<specific and bounded>

No new issue/PR, merge, prod deployment, issue closure, broad refactor, model sweep, release gate bypass, or additional handoffs. Central will review live evidence and changed v8 source labels before authorizing any final prospective attempt.
