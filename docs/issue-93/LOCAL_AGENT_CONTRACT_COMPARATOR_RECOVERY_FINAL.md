# Issue #93 — one consolidated final B2.2 qualification

## Identity / authority

LOCAL_AGENT_PRIMARY=build
LOCAL_HARNESS=OpenCode Build, fresh session, isolated worktree
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=93
BRANCH=issue/93
REQUIRED_REMOTE_HEAD=<exact full SHA from Central kickoff>
ACCEPTANCE_AUTHORITY=docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md
AMENDMENT_AUTHORITY=docs/issue-93/APPROVED_LIMITED_HOLDOUT_COMPARATOR_RECOVERY.md
EXCEPTION_PROPOSAL=docs/issue-93/PROPOSED_LIMITED_HOLDOUT_COMPARATOR_RECOVERY.md
FROZEN_EVIDENCE=docs/issue-93/evidence/prospective-freeze/
DEVELOPMENT_AND_B22_EVIDENCE=docs/issue-93/evidence/b2-2-completion/
POST_EXPOSURE_DIAGNOSIS=docs/issue-93/evidence/holdout-adjudication/
HASH_ERRATUM=docs/issue-93/CENTRAL_SNAPSHOT_HASH_ERRATUM.md
PRIVATE_PACKET=/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq
EVIDENCE_OUTPUT=docs/issue-93/evidence/final-comparator-qualification/

This is ONE coherent campaign, not a new architectural slice.
Use exact immutable GitHub/repository inputs and private host
artifacts; no unbounded new discovery, repeated benchmark
campaign, new branch, new PR or production selector change.

Source/test/CI mutation=FORBIDDEN.
Graphiti/ReviewStore writes=FORBIDDEN.
Installed config/daemon mutation=FORBIDDEN.
Frozen cohort, source snapshot and historical output edit=FORBIDDEN.
EX/privacy/remote-group bypass=FORBIDDEN.
Model-running role: local host only, serial isolated GPU run.
Evidence publication: at most ONE sanitized evidence-only
commit on the existing issue/93 branch, non-force, exact-head
readback. Preserve owner checkout. No commit on main.
No PR creation, merge, deployment or issue closure.

## Stage A — frozen authority and corrected source hash (CPU)

1. Fetch remote issue/93 and authenticate EXACT 40-hex target
   before creating/using an isolated worktree. Read current
   issue/acceptance, both Central approval contracts,
   historical B2.2 source/test, real replay scripts and
   source-adjudication manifests. Prove commit DAG and that
   original semantic 69014b739d490f8cb90bce86233edf3054673209
   and candidate 4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4
   precede holdout exposure. Prove relevance.mjs strict
   source is unchanged in exact blobs.
2. Read ORIGINAL freeze-manifest.mjs (do not trust a
   retelling of its formula). Verify SHA256 digests:
      DEV=3e799c461080985324c58d487ec6327e7616436b546ee9aa2dce3a67251919db
      HOLDOUT=3f9eaebb6debe949bc9eb07eb777f2851b957adc1a8a3d94bccfcd27fa75c0c9
      SNAPSHOT=dc597c690b0e8990b925b01467269f530d37dfb2dd7730663bdda46680e7231b
   Recompute source fingerprint using the EXACT helper
   SHA256(JSON.stringify(joined-string)), not SHA256(raw
   joined text). Return full matching digests, exact
   algorithm, private file/object identities, source
   order/field handling and a non-sensitive reproducible
   calculation receipt. Do not publish underlying assertions,
   source refs, UUIDs or queries.
3. Prove the fixed cohort and comparator/candidate snapshots
   are unchanged and that no tuning or source substitution
   happened after original holdout exposure. Compare parent/
   candidate blobs, timestamps and full changed paths;
   document any authority gap. Any mismatch or insufficient
   provenance -> RESULT=BLOCKED_PROVENANCE. No hiding error.

## Stage B — approved one-time baseline recovery (CPU)

4. FIRST inspect previously captured original once-only holdout
   artifacts, scripts, post-exposure diagnostic and original
   semantic source; do not rerun the exposed cases as a new
   holdout. Keep PRE_EXPOSURE_ORIGINAL_SEMANTIC_COMPARATOR=false.
   Use the existing read-only diagnostic replay as evidence,
   not as a newly untouched test. If evidence needs calculation,
   use strictly the same authenticated, already-exposed fixed
   4+2 cases and same frozen transport; no selector change,
   case change, new search, new source or cohort expansion.
5. Independently source-adjudicate the registered expected
   fact and remote same-group UUID membership from original
   #92 source/ReviewStore and get_episodes receipts.
   Authenticate the replay adapter and identical search,
   index and remote membership inputs. Check exact B2.2
   replay against its once-only recorded outputs. Compare
   original semantic comparator to B2.2 CASE-BY-CASE:
     H01-H04 each original source-exact TP vs B2.2 TP,
     HN01/HN02 original vs B2.2 selected fact counts,
     source/group/privacy/temporal/EX negative controls.
   Provenance must make this comparison valid under the
   EXPLICIT one-time operator-approved method exception.
6. Require no lost original-semantic positives and no new
   unsafe/off-topic injections (not an absolute 4/4 target).
   Preserve absolute B2.2 1/4 positive and HN01=4 facts
   even if relative comparator gate passes. Mark
   POST_EXPOSURE_COMPARATOR_APPROVED_EXCEPTION, not
   PRE_EXPOSURE_PAIRED_TEST. Fail closed on ambiguous
   source/runner provenance or mismatch. If stage A/B fails,
   STOP BEFORE GPU stage and hand back precise blocker,
   without retuning the exposed holdout.

## Stage C — real native utility and single-GPU answer proof

Only after A+B PASS. Existing B2.2 host proof reports:
20 native hook calls, p95=299.77ms, max=300.273ms,
14 injected / 2 empty / 2 error / 2 late;
search p95=159.31ms and get_episodes p95=45.67ms.
The native hook's p95 gate is <=300ms, not max<=300ms.
Do not discard late calls or change metric definition.
Read exact historical source/receipts and determine whether
they remain authentic for B2.2; only rerun missing coverage.

7. For the model-answer case, select a real accepted #92
   development fact not recoverable from git history or
   alternate tools, and not previously seeded into the model
   session or control prompt. Adjudicate answer/source receipt
   privately BEFORE the two runs. Use fresh separate OpenCode
   process/session and isolated single-plugin config, with
   read-only Graphiti route, capture=false, correct project,
   workspace/group. Inspect actual effective config to
   verify NO tools, no competing plugins, no implicit
   git/history fallback or other answer channels.
8. Run memory-disabled baseline THEN memory-enabled treatment
   SERIAL on the existing single GPU model, no concurrent
   inference, no new model server or service. Keep prompts,
   model/settings, tools and environment matched except
   memory enablement. Prove system-context source attribution
   exists in the ACTUAL assembled model request and source
   excerpt/UUID/group/secret data are absent. Independently
   judge the sourced answer vs control and expected source,
   with no credited fact from fixtures, git/API/search,
   startup context or session memory.
9. If such a clean test cannot run in the active harness,
   produce exactly ONE bounded READY_FOR_FINAL_OPERATOR_RUN
   invocation that explicitly gates disabled tools/plugins
   and attribution; never claim PASS. If the controlled
   answer does not show a clean additional memory benefit,
   report ANSWER_USE_UNVERIFIED/FAIL with evidence. Do not
   change question/source or run repeated trials to chase
   a positive result.
10. Confirm source-authority and privacy negative controls,
    no false-verified authority upgrade, remote/group/EX/
    rollover/temporal gates, <=5 facts and <=1400 *SELECTOR
    JSON* chars, not sys_chars. For native performance use
    >=20 mixed hook observations including empty/error/late,
    p95<=300ms, with separate search/proof RTT and context
    assembled into model inputs. Document sample size and
    near-threshold limitations.

## Stage D — exact-head gates and one handback

11. Compare complete changed-file surface from the admitted
    branch with base main; identify Central production
    selector diff, regressions and evidence-only commits.
    Reuse true-exit focused checks and npm check/test
    receipts at the identical production source where
    still applicable, but prove their authority and
    capture fresh validation if stale/required. Inspect
    current repo-defined trusted Verify profile/Actions
    requirements; do NOT self-label an untrusted local
    'npm test' run as complete trusted exact-head CI.
    No PR exists; formal independent PR review, final
    exact-head trusted Actions and merged-main gate
    necessarily remain Central-owned subsequent steps.
12. Publish at most ONE sanitized evidence-only commit
    under EVIDENCE_OUTPUT, with SHA256SUMS, full parent,
    changed-path completeness and remote ref readback.
    Retain original holdout/adjudication/error documents.
    No raw source/ref/UUID/private query/model prompt or
    unredacted logs in GitHub.

Typed return:
RESULT=COMPARATOR_PASS_ANSWER_PASS|COMPARATOR_PASS_ANSWER_UNVERIFIED|COMPARATOR_FAIL|BLOCKED_PROVENANCE|NATIVE_FAIL|READY_FOR_FINAL_OPERATOR_RUN|PARTIAL|STALE
REQUIRED_HEAD_SHA=<40 hex>
ACTUAL_TESTED_SOURCE_SHA=<40 hex>
OWNER_CHECKOUT_PRESERVED=<yes/no>
PR_STATUS=<none expected>
APPROVAL_CONTRACT_SHA_AND_PATH=<readback>
SOURCE_CODE_FIXED_BEFORE_HOLDOUT=<proof>
NO_POST_HOLDOUT_TUNING=<proof>
STRICT_SOURCE_UNCHANGED=<blob SHAs>
FROZEN_IDENTITIES=<full three exact hashes, method>
COMPARATOR_REPLAY_IDENTITY=<source snapshot + code + adapter>
ONCE_ONLY_RECORDED_B22=<4 positives, 2 negatives>
POST_EXPOSURE_SEMANTIC_COMPARATOR=<case matrix, explicitly labeled>
CANDIDATE_REPRODUCIBILITY=<exact same recorded output>
COMPARATIVE_HOLDOUT_GATE=<PASS/FAIL/UNVERIFIED and reason>
DEVELOPMENT_GATE=<unchanged authenticated scores>
SOURCE_AUTHORITY_REMOTE_EX_PRIVACY=<evidence/failures>
NATIVE_HOOK=<n,p50,p95,max,distribution,include late/error/empty>
SEARCH_VS_PROOF_RTT=<independent values>
MODEL_EFFECTIVE_CONFIG_AND_TOOLS=<no-tools no-alternate-channel proof>
ACTUAL_ASSEMBLED_MODEL_INPUT=<source attribution proof>
MODEL_ANSWER_BENEFIT=<PASS/FAIL/UNVERIFIED>
FOCUSED_CHECKS_AND_TRUSTED_VERIFY=<actual receipts and gaps>
EVIDENCE_COMMIT_SHA=<full SHA or none>
CHANGED_FILES_AND_PROTECTED_DIFF=<full>
KNOWN_GAPS=<specific>
COMMAND_SHAPE_FRICTION=<canonical GHDEV-10 schema incl.
requested_shape, effective_shape, rewrite_provenance,
event_kind, execution_effect, correction_or_annotation,
replacement_shape, recipe_reference, resource_reference,
contract_conflict, durable_gap_candidate,
omitted_sensitive_values>

Harness boundaries: private scratch scripts may be repaired
for evidence extraction only if content remains diagnostic,
source/rules/expected outputs are not changed and exact diff
is audited; no silent production edits. If source authority
or method fails, stop and return. Success here is HOST
qualification only, not PR review/merge/issue closure.
