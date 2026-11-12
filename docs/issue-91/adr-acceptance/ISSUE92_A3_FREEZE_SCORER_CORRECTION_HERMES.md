# Issue #92 — A3 prospective authority repair and final freeze ratification

## Disposition and immediate objective

S6 is **settled and published** under evidence commit 9c6126c331d43e4fbdecc5ba532a2b037e0de477. Its 8/16 valuable-target coverage remains below S2/S3's 9/16; do not retroactively call S6 a functional PASS. Nevertheless S6 demonstrated new source-backed recovery (sp8 and g2), exact-source/Graphiti atomic integrity and bounded contamination (2 controls), satisfying the ADR's qualitative exposed-demonstration requirements sufficiently to proceed with completing the *prospective admission infrastructure*. No S7 exposed inference or new prompt tuning is authorized.

The originally published A3 20-case v2 private freeze is NOT yet independently ratified: its public 20-row hash roster lists labels as operator-pending. The old published a3-v2-scorer.mjs is **not an acceptance authority**. It credits session matches and assumes persisted == grounded; this can fabricate high-value coverage and precision. Its old staging script slices long native prompts to a head window before performing capture-path whole-message privacy checks. Preserve those historical evidence artifacts untouched but supersede their execution and acceptance authority with the Central modules below.

PRIMARY_AGENT=Hermes/Build; BRANCH=work/91-memory-utility-r1; REQUIRED_HEAD=kickoff exact 40-char SHA; no GitHub source edits, PR, merge, installed activation or #92 close; one optional sanitized evidence-only commit after authenticated receipt. Hermes remains EX-supervisor, not a blocking harness, and may own host-local execution mechanics.

## Central code staged

- issue92-a3-native-source.mjs: native fromPromptCandidates source capture; authenticate original full-text/source digest, original source locator, label, time, native IDs and scope; preserve entire bounded source opportunity and all emitted spans; privacy scans entire text before segmentation.
- issue92-a3-stage.mjs: CPU-only absolute-path CLI; require private manifest raw bytes to match published SHA-256, 0600 private mode, original frozen labels/locators; reject an already-staged queue, freeze a case->source-ref/event-id/digest receipt; NO model/Graphiti call.
- issue92-a3-acceptance.mjs: pure, fail-closed fact-level independent prospective adjudication. Requires all 20 source+label ratifications pre-inference, exact event/quote provenance, one per-fact judgment, positive remote UUID set and source index, no unknown in-flight state, independently verified authority/privacy/no-replay, and per-target source support. A session match never earns target credit; persisted is not automatically grounded; duplicates don't count as independent useful facts. Report exact Wilson 95% intervals and >=85/90/75 threshold with >=8 independent useful facts.
- issue92-a3-score.mjs: read-only terminal scorer over complete ReviewStore + current positive remote readback + private ratification and fact adjudications. Returns 0 on measured PASS, 3 on measured FAIL, and throws for incomplete/unverified evidence. No prospective model calls or graph writes.
- issue92-a3-acceptance.test.mjs: synthetic cases for real controls, long-source tail preservation, whole-input privacy veto, session-only miscredit, missing/unratified labels, misbound source, unsupported facts, remote mismatch, duplicate inflation and authority breach.

## Task A: CPU-only proof at authenticated current HEAD

Fetch/fast-forward exact source SHA, preserve other untracked files. Run native producers with actual exits and full logs:
  node --check docs/issue-91/adr-acceptance/issue92-a3-native-source.mjs
  node --check docs/issue-91/adr-acceptance/issue92-a3-stage.mjs
  node --check docs/issue-91/adr-acceptance/issue92-a3-acceptance.mjs
  node --check docs/issue-91/adr-acceptance/issue92-a3-acceptance.test.mjs
  node --check docs/issue-91/adr-acceptance/issue92-a3-score.mjs
  node --test docs/issue-91/adr-acceptance/issue92-a3-acceptance.test.mjs
  node --test docs/issue-78/v2-curator/finite-batch.test.mjs
  node --test docs/issue-78/v2-curator/claim-evidence.test.mjs
  npm run check
  npm test

Do not patch tests, lower checks or reinterpret a failed producer as a PASS. If source code failure is genuine return minimal proposed Central diff and the exact failure evidence. May repair CPU environment/source path mechanics in host scripts only.

## Task B: original native-source freeze audit (NO A3 inference)

Private original manifest:
 /home/filip/.local/state/ghdev-graphiti-issue92/private/issue92-a3-v2-corpus.json
Published frozen SHA256:
 a85941839f1f9dc7e04081829016aa3c38ef05e9a6f3c29ca58de8b53abbf5ca
Published label digest:
 bdfb7c6c7c025c572ba899094b94d1388c425e59189e395b38f5469968da3a58
Group: graphiti-adr92-a3-prospective-v2 (MUST still be empty: 0 remote episodes).

Verify full private file bytes equal manifest digest, source/label values match the 20 immutable public roster rows, native current DB session/message IDs and exact original message-text hashes/time/project/workspace match (allow archived DB material only with original identity proof). This is 10 valuable and 10 controls. Recheck real nonoverlap against original B3, former gh_mcp holdout AND H2–H4 where source identities/digests can be inspected. Do not infer nonoverlap from a new family name or a session-only check.

For every valuable source, prepare ONE safe short bounded original-source quote (original 25..450 characters or equivalent predicate-exact private source citation) proving why the independently adjudicated predicate is technical and durable; for negative controls a short safe reason and hash. Preserve user-stated/reporting uncertainty. Never print credentials, secrets, entire messages, source-private file contents or raw logs to GitHub. Supply sanitized 20-case case-id/predicate/scope/source-digest/short-safe-quote review packet in the handback for Central inspection.

Independently ratify every valuable and control label **before the first A3 model intent** and freeze that ratification with an immutable 0600 receipt. Source/label ratification cannot be moved post-output. Preserve the original roster digest; label changes require a new complete pre-inference freeze and Central review, not silent repairs.

## Task C: fix the host prospective preparation (no Graphiti inference)

The 20-case original frozen cohort is retained. Prefer a new private A3 state root if any earlier CPU-only staging left files, while keeping the frozen remote A3 group/name unchanged and empty; never reset/clear an executed group.

Use repository-staged issue92-a3-stage.mjs, not the old evidence-only a3-v2-stage.mjs, to stage all real native source opportunities with source-derived event IDs and full-text privacy semantics. Confirm fresh stage receipt schema issue92-a3-staged-v2 and case->source-ref/event-id identities. If private digest, privacy scan or long-message span semantics fail, STOP and identify the original-source/label mismatch. Do not fabricate new source text, truncate to make a private input eligible, or edit the original frozen private manifest to satisfy the validator.

Adapt only the HOST-LOCAL A3 driver/launcher source-binding and state root to the new authenticated SOURCE HEAD (the historical evidence-only driver is pinned to 640f4a9a and must not run unchanged). Retain canonical EX lock bridge proof, Hermes harness exemption, once-only call intents, bounded positive Graphiti reconciliation, no replay and all S6 substantive source/utility options. The real model and Graphiti may only run after Central prospective approval. Prepare a host-local EX preflight that NEGATIVELY proves marker-only launch cannot call model/Graphiti; no live inference.

Do not use old published a3-v2-scorer.mjs as the acceptance gate. Prepare authority/readback/adjudication inputs for the new Central scorer, with private 0600 receipt schema. Any missing independent fact judgment is a block to PASS, not an implicit rejection or acceptance. The positive remote readback must be performed AFTER actual inference and include original source-index integrity; not a guessed/empty receipt.

## One consolidated return and Central decision

RESULT=A3_FREEZE_RATIFIABLE | SOURCE_REMEDIATION_REQUIRED | FREEZE_INVALID
SOURCE_HEAD=<authenticated 40 SHA>
NATIVE_TESTS=<individual actual exits/counts>
PRIVATE_MANIFEST_SHA256=<exact full hash>
LABEL_DIGEST=<exact full hash, frozen before model>
SOURCE_VALIDATION=<20/20 original native IDs, content, time, workspace, privacy>
SOURCE_EVENT_STAGING=<source-derived event count, case/offset map>
EXPOSED_DISPOSITION=<S6 8/16, no new exposed inference>
SANITIZED_CENTRAL_RATIFICATION=<10 bounded source-backed predicates, 10 controls>
NONOVERLAP=<source/digest crosschecks and any unverified historical sets>
A3_GROUP=<still 0 remote episodes>
A3_EXECUTION_PREPARED=<exact host-only command and source head, NO inference yet>
A3_SCORER_READY=<new scorer, test results, independent fact-ledger contract>
COMMAND_SHAPE_FRICTION=<all GHDEV-10 fields>

Do not create another experimental PR. Central reviews the returned source/label sample and approves or rejects A3 measurement. If approved, Hermes can execute the already prepared launcher without another source-development or setup handoff, and Central can independently review the terminal prospective scorecard for the ONE Issue #92 PR.
