# Issue #93 — one consolidated Codex-remediation requalification (local agent)

## Authority and scope

LOCAL_AGENT_PRIMARY=build
LOCAL_HARNESS=OpenCode Build, fresh session, isolated worktree
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=93
PR_NUMBER=96
BRANCH=issue/93
REQUIRED_REMOTE_HEAD=<exact full SHA from Central kickoff>
APPROVAL=docs/issue-93/APPROVED_CODEX_REMEDIATION_COMPARATOR_EXTENSION.md
ORIGINAL_APPROVAL=docs/issue-93/APPROVED_LIMITED_HOLDOUT_COMPARATOR_RECOVERY.md
ACCEPTANCE=docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md
HISTORICAL_EVIDENCE=docs/issue-93/evidence/final-comparator-qualification/
ORIGINAL_PRIVATE_PACKET=/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq
NEW_EVIDENCE_DIR=docs/issue-93/evidence/codex-remediation-qualification/

Conduct ONE consolidated finite requalification of the
already-completed Codex-driven strict-anchor correction.
This is NOT a new relevance development campaign.

Exact implementation to test:
\`d40506d15ed2ed2c2c08edcd64995182c197a6d8\`.
Original semantic:
\`69014b739d490f8cb90bce86233edf3054673209\`.
Original B2.2:
\`4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4\`.
Original PR reviewed head before fix:
\`fd81cd65c43c6e94502696c5cc3ffdc611046f8f\`.

Authority boundaries:
- No production/source/test/workflow/config modifications.
- No new candidate, branch, issue, PR or PR review/approval.
- No Graphiti/ReviewStore or historical/cohort mutations.
- No graph capture/add/delete and no new daemon.
- Do not run local interactive LLM/GPU inference in this
  Build session. Existing read-only Graphiti service
  sampling is permitted only when non-contending and safe.
- Owner checkout/untracked files preserved; use isolated
  worktree and authenticate actual source SHA.
- At most ONE sanitized evidence-only commit on EXISTING
  issue/93, non-force guarded parent/readback, including
  SHA256SUMS. Do not claim PR CI remains exact-head after
  committing evidence.
- If a real invariant fails, report the observed result,
  do NOT weaken assertions, change expected facts,
  suppress tests, modify relevance heuristics, or tune
  against the exposed holdout. Central owns any decision.

## A. CPU — exact-source and focused regressions

1. Verify remote PR #96 head and approval contract. Compare
   full source diff from pre-fix PR head to exact remediation
   commit: only semantic-recall.mjs + semantic-abstention.test.mjs.
   Independently read the Codex finding on PR #96 and
   verify fix provenance is external code-review induced,
   not selected by exposed holdout outcomes. Verify strict
   relevance.mjs and all caller source/group/remote/EX
   checks remain byte-identical.

2. Execute ACTUAL Node focused tests at the revised source:
   node --test docs/issue-93/semantic-abstention.test.mjs
   node --test docs/issue-93/native-source-context.test.mjs
   node --test docs/issue-93/score-stage-ledger.test.mjs
   Also run the existing relevant candidate/curator and
   source/privacy integration suites already defined in
   previous accepted host evidence (do not invent suite
   paths; inspect them). Capture true exit codes and
   failures, not grepped success strings. Run npm check
   and npm test only if a changed source or absent receipt
   demands it; current prior code head already has trusted
   \`repository-final-v1\` PASS (524/524). Focused Issue
   #93 tests are NOT in that trusted profile.

3. Independently execute the exact Codex counterexample in
   the actual, unmodified source at the exact SHA:
   query "What did we use originally, and what do we use now?"
   against sourced fact "Previously we used Redis; now we
   use PostgreSQL.", with unchanged strict anchor. Verify
   final native and remote-proven indexed lanes preserve
   the exact strict-qualified fact; without such an anchor
   and for N02 now-only noise, selection abstains. Verify
   fabricated, improperly sourced or out-of-pool anchors
   cannot bypass admission. No source-authority shortcuts.

## B. CPU — fixed development/approved retrospective holdout

4. Authenticate immutable private manifests and snapshot
   using the ORIGINAL \`freeze-manifest.mjs\` algorithm,
   sha256(UTF8(JSON.stringify(joined string))), in the
   original stored order:
     dev=3e799c461080985324c58d487ec6327e7616436b546ee9aa2dce3a67251919db
     holdout=3f9eaebb6debe949bc9eb07eb777f2851b957adc1a8a3d94bccfcd27fa75c0c9
     snapshot=dc597c690b0e8990b925b01467269f530d37dfb2dd7730663bdda46680e7231b
   Verify original same-group source/ReviewStore/remote
   episode authority and test runner/adapter identity.
   Do not mutate frozen inputs or reclassify their age.

5. Run one deterministic source-exact comparison on the
   predeclared development 18 positives / 5 negatives
   using unchanged strict, original semantic, original
   B2.2 and revised candidate on identical frozen input.
   Per-case output: exact expected source membership,
   positive support/strict-only regression, negative
   selected counts, source/group/temporal/evidence-class/
   privacy/EX controls; selector JSON budget and max
   selected count. Preserve baseline 13/18 strict and
   15/18 original semantic + B2.2 as historical *unless
   independently reproduced*. N01/N02 must abstain,
   N04 secret fence 0; N03/N05 not worse. No off-topic
   gain at the cost of verified positives.

6. Under the EXACT operator-approved method extension,
   run a **single** read-only, post-exposure replay of
   the same original holdout H01-H04/HN01-HN02 ONLY.
   Preserve recorded once-only B2.2 output and the
   retrospective ORIGINAL semantic comparator. Add the
   NEW fixed revision as a clearly different candidate
   column, with label
   \`POST_EXPOSURE_CODEX_REMEDIATION_EXCEPTION\`;
   never call it "untouched"/"once-only"/"new holdout".
   Positive source-exact support must be >= original
   semantic and original B2.2 for EACH positive, and no
   new off-topic/unsafe/secret injections may occur
   relative to those comparators. Source-identity and
   authorization fences must hold absolutely. Preserve
   the absolute original B2.2 1/4 + HN01=4 unchanged.
   If a threshold fails, STOP and hand back. Do not
   adjust the candidate or rerun alternative variants.

## C. Native context performance and answer proof applicability

7. Run the real installed/native read-only hook on the
   revised source with a representative >=20 mixed
   observation batch, including empty/error/late cases.
   Include ALL attempts in p95 <=300ms: show n, p50,
   p95, max, distribution; measure Graphiti search and
   get_episodes RTT separately. Prove source-attributed
   context attaches to the matching user message, with
   ≤5 facts and ≤1400 selector JSON chars, group/excerpt/
   privacy/EX boundaries. Use existing accepted #92
   service/ReviewStore state, no capture/writes. If the
   single-GPU local engine would be contended, defer the
   model-intensive part; do not run competing inference
   within the local agent.

8. Reuse the already independently adjudicated D12
   memory-off/on answer proof for B2.2 ONLY if a bounded
   CPU read-only exact-source bridge proves this specific
   D12 query/fact remains selected under the *revised*
   semantic selector, retains the identical source/ref
   and injected system-context semantics, and no changes
   exist in plugin/host/transport authorization that
   could invalidate the earlier causal attribution.
   This is not a fresh model inference PASS for the
   revised SHA. Report \`ANSWER_PROOF_REUSED_WITH_EXACT_BRIDGE\`
   with all assumptions. If bridge absent or D12 altered,
   return \`ANSWER_USE_REVISED_UNVERIFIED\` with ONE finite
   proposed post-exit operator-owned serial validation
   (no automatic GPU inference or second fact trial).
   Do not hide the earlier skill function being
   OFFERED_BUT_UNUSED; no tools invoked/results occurred.

## D. Completion handback

9. Check the latest PR/remote SHA before publication.
   Do not rewrite original historical evidence or the
   current approval. If all required controls PASS,
   publish ONE compact redacted evidence-only commit
   under NEW_EVIDENCE_DIR with a SHA256SUMS and full
   readback. Existing PR #96 auto-updates on the same
   issue branch. No PR creation, approval, merge,
   issue closure, or installed deployment.

Typed handback:
RESULT=REVISED_QUALIFICATION_PASS|REVISED_ANSWER_BRIDGE_UNVERIFIED|REVISED_COMPARATIVE_FAIL|BLOCKED_SOURCE_OR_PROVENANCE|NATIVE_PERFORMANCE_FAIL|PARTIAL|STALE
REQUIRED_REMOTE_HEAD_SHA=<full>
TESTED_REMEDIATION_SOURCE_SHA=<full>
FINAL_BRANCH_SHA=<full or unchanged>
APPROVAL_AUTHORITY=<path, SHA, readback>
PR_NUMBER=96
DIFF_PROTECTED_SURFACES=<exact file/blob SHAs>
FOCUSED_TESTS=<commands, counts, true exits>
CODEX_COUNTEREXAMPLE=<native/index/negative results>
FROZEN_IDENTITIES=<three full digests, method>
DEV_CASE_MATRIX=<strict/original_semantic/B2.2/revised>
HOLDOUT_CASE_MATRIX=<four positives+two negatives; postexposure label>
COMPARATIVE_DEV_GATE=<PASS/FAIL/UNVERIFIED>
COMPARATIVE_HOLDOUT_GATE=<PASS/FAIL/UNVERIFIED>
SOURCE_GROUP_REMOTE_TEMPORAL_PRIVACY_EX=<verified>
SELECTOR_JSON_BUDGET_AND_FACT_CAP=<actual>
NATIVE_HOOK_OBSERVATIONS=<all n, p50, p95, max, error/late/empty>
SEARCH_GET_EPISODES_RTT=<separate>
D12_ANSWER_PROOF_BRIDGE=<exact proof or unverified>
MODEL_ANSWER_BENEFIT_FOR_REVISED=<PASS_BY_EXACT_SOURCE_BRIDGE|UNVERIFIED>
CI_CURRENT_HEAD=<do not infer from earlier head>
EVIDENCE_COMMIT=<full SHA or none, exact files>
KNOWN_GAPS=<specific and bounded>
COMMAND_SHAPE_FRICTION=<GHDEV-10 canonical form with actual requested/effective commands, rewrite provenance, outcome, gap classification, omitted sensitive values>

No iterative tuning, alternate cohorts, model benchmark
campaigns or new PRs. Central independently reviews the
returned fixed-revision evidence and the NEW final head,
runs trusted exact-head Verify as needed, adjudicates
and resolves Codex thread, and only then considers a
formal independent PR approval. No merge authorization
is implied.
