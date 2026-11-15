# Issue #93 — one bounded holdout evidence reconciliation

ROLE=evidence (if prepared worktree and private files readable);
otherwise BUILD in a genuinely fresh session with READ-ONLY
scope due to stock-V2 filespace constraints. Do not broaden
permission controls simply for evidence collection.

GOAL=Resolve whether the published HOLDOUT_FAILED disposition
actually establishes regression against the authorized
unchanged CURRENT SEMANTIC comparator, without rereading
holdout queries to tune production code. Keep this one
consolidated finite evidence reconciliation; do not launch
another performance or model benchmark campaign.

REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=93
TARGET=issue/93 exact SHA from Central kickoff
CONTROL=docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md
DISPOSITION=docs/issue-93/CENTRAL_B2_2_HOLDOUT_ADJUDICATION.md
PR=forbidden
GRAPHITI_OR_REVIEWSTORE_WRITE=forbidden
SOURCE_TEST_CI_CONFIG_CHANGE=forbidden
HISTORICAL_FROZEN_MANIFEST_CHANGE=forbidden
NEW_HOLDOUT_CREATION=forbidden
MODEL_GPU_RUN=forbidden
EX_ADMISSION_CHANGE=forbidden
PRIVATE_RAW_PUBLICATION=forbidden
NEW_BRANCH=forbidden
PUBLIC_EVIDENCE_COMMIT=at_most_one_sanitized_existing_branch

## A. Authenticate and inspect archival evidence first

Authenticate the exact GitHub commit from the kickoff. Preserve
the owner checkout. Read the approved prospective standard,
published b2-2 completion packet and original prospective
freeze. Use the EXISTING local private packet at
/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq
ONLY if it still exists and matches its original immutable
source/dev/holdout SHA256 identities:
3e799c461080985324c58d487ec6327e7616436b546ee9aa2dce3a67251919db
3f9eaebb6debe949bc9eb07eb777f2851b957adc1a8a3d94bccfcd27fa75c0c9
dc597c690b0e8990b925b01467269f530d37dfb2dd7730663bdda46680e7231b.

Look in previously captured once-only result JSON, private
receipts/logs and paired snapshot adapter outputs for current
strict, original semantic at 69014b739d490f8cb90bce86233edf3054673209
and B2.2 at 4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4
on H01-H04 and HN01-HN02. Inspect pre-existing output
FIRST; never re-execute the holdout to make a PASS.

## B. Authorized comparison, not tuning

If the ORIGINAL holdout run already contains an unmodified
semantic comparator, report per-case Boolean exact expected
source membership for H01-H04, negative injected counts for
HN01/HN02, and strict/B2.2 results. Report also whether
these comparator outputs were generated in the once-only
run BEFORE unsealing/candidate inspection, with evidence.

If no original semantic comparator outputs exist:
- mark BASELINE_COMPARATOR_NOT_RECORDED;
- do not manufacture a timestamp or call a newly produced
  comparator result untouched.
- An OFFLINE read-only reconstruction from the already
  EXPOSED immutable source snapshot MAY be used solely to
  establish arithmetic, if the existing private adapter
  supports it without mutating cases/snapshot, but must
  be explicitly labeled POST_EXPOSURE_DIAGNOSTIC_NOT_HOLDOUT.
  The original qualification is not retroactively upgraded
  solely because of that reconstruction.
- Do not make a production-code change or choose thresholds
  based on exposed H-case observations.

For each positive report expected-source present/missing in
the ORIGINAL semantic vs B2.2. For negatives report SOURCE-
AUTHORIZED yet off-topic observations separately from any
privacy/wrong-group authority problem. A content-labeled
negative is not in itself an unauthorized source leak.
Provide a safe stage summary for each miss: remote search,
index/source resolver, per-fact membership, shortlist,
selection/budget, native association. Raw queries, facts,
UUID/source maps stay PRIVATE.

Do not replace "nonnegative relative to previous semantic"
with "all four positives must be recovered", and do not
infer a NEW negative injection without a baseline count.
If original comparator proof is absent or the candidate
truly regresses, classify the acceptance blocker precisely.
A successor candidate or fresh holdout requires Central
planning and, for a changed holdout standard, operator
approval. Do not initiate either on this handoff.

## C. Publication and handback

Evidence-only: no source edit, no tests altered, no GitHub
issue edit/PR, no extra tests run merely to make check green.
If an Evidence-role host sandbox lacks access to essential
private files, STOP with the exact path/permission; do not
bypass the role. A separately scoped fresh Build role is
allowed as an explicitly justified read-only fallback, with
no production writes and no owner-checkout changes.
Git setup for an Evidence role belongs to the operator.

Publish at most ONE sanitized evidence-only commit on
existing issue/93 under
docs/issue-93/evidence/holdout-adjudication/
with SHA256SUMS and full exact-head readback, but only
if genuinely useful, complete authority-safe new evidence
is available. No raw source, holdout queries, answers,
source UUID maps, private stage traces, or prompt material.

Return:
RESULT=COMPARATOR_RECOVERED_NONNEGATIVE|COMPARATOR_RECOVERED_REGRESSION|COMPARATOR_NOT_RECORDED|BLOCKED_PRIVATE_EVIDENCE|PARTIAL
TARGET_HEAD_SHA=<full>
FROZEN_MANIFEST_HASHES=<verified exact three digests>
HOLDOUT_ALREADY_EXPOSED=yes
PRE_EXPOSURE_ORIGINAL_SEMANTIC_COMPARATOR=<true/false/unverified>
HOLDOUT_POSITIVE_MATRIX=<H01-H04 strict/semantic/B2.2 source exact>
HOLDOUT_NEGATIVE_MATRIX=<HN01/HN02 semantic/B2.2 injection counts>
CANDIDATE_RELATIVE_LOSSES=<case IDs, not guessed>
CANDIDATE_NEW_NEGATIVE_INJECTIONS=<case IDs/count deltas>
STAGE_CLASSIFICATION=<safe miss/irrelevance categories>
SOURCE_REMOTE_EX_FENCES=<actual preserved proof>
POST_EXPOSURE_RECONSTRUCTION=<none or diagnostic-only>
APPROVED_COMPARATIVE_GATE=<PASS/FAIL/UNVERIFIED; evidence basis>
REMAINING_CLEAN_MODEL_USE=<UNVERIFIED; no GPU run>
PUBLIC_EVIDENCE_COMMIT_SHA=<full or none>
PROTECTED_DIFF=<none or permitted evidence>
KNOWN_GAPS=<finite remaining gates>
COMMAND_SHAPE_FRICTION=<canonical GHDEV-10, include actual approvals/denials>

The word PASS is not authorized if comparator evidence is
missing, post-exposure-only or source/manifest provenance
is invalid. Stop after a single bounded reconciliation.
