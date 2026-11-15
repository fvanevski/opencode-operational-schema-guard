# Issue #93 — PROPOSED one-time holdout comparator recovery

Status: **PROPOSED / NOT APPROVED / NON-AUTHORITATIVE**.
No criteria are amended by this file. Approval must be explicit
and confined to the comparison method below. Issue #93 remains OPEN.

Governing authority:
docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md.
Published evidence:
docs/issue-93/evidence/b2-2-completion/holdout-result.json,
docs/issue-93/evidence/holdout-adjudication/diagnostic.json,
docs/issue-93/CENTRAL_SNAPSHOT_HASH_ERRATUM.md.

## Why an operator decision is necessary

The original prospective 4-positive/2-negative holdout was sealed
before Central's B2.2 selector change and B2.2 evaluated it ONCE
after the frozen development gate passed. However, the operator-
approved requirement was a PAIRED nonnegative comparison against
the unchanged current semantic baseline at commit
69014b739d490f8cb90bce86233edf3054673209. The once-only
runner captured strict and B2.2 outputs, but not original semantic.

A read-only POST-EXPOSURE diagnostic later ran that exact baseline
on the exposed holdout. It reported:
- H01 baseline=true / B2.2=true;
- H02/H03/H04 baseline=false / B2.2=false;
- HN01 off-topic baseline=4 / B2.2=4;
- HN02 privacy baseline=0 / B2.2=0.

Therefore no relative losses or newly introduced negative injections
were OBSERVED, but the comparison was not contemporaneous with the
candidate qualification. The unchanged B2.2 candidate was already
frozen and no selector tuning on holdout was performed.

The previously claimed source-fingerprint discrepancy was a
JSON.stringify hashing-method error, corrected in
CENTRAL_SNAPSHOT_HASH_ERRATUM.md; this is still a host-reported
local reproduction until an exact sanitized receipt is included
in qualification evidence.

## Proposed one-time amendment — controlled retrospective comparator

Authorize the following LIMITED METHOD EXCEPTION for #93 B2.2
only, **without** changing the meaning of nonnegative utility,
without selecting a new cohort, and without altering historical
or published evaluation outputs:

1. Accept a post-exposure deterministic replay of the ORIGINAL
   comparator as a valid paired HOLDOUT BASELINE only if independent
   source review verifies that comparator implementation at exact
   SHA 69014b739d490f8cb90bce86233edf3054673209 was fixed
   before the holdout was opened; B2.2 source at
   4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4 was fixed
   before the holdout was opened; no code/threshold/query/source/
   cohort changes were made in response to holdout outcomes.
2. Require private SHA256 readback of frozen dev, holdout and
   original source-snapshot using the EXACT freeze-manifest
   JSON.stringify method, with an independently inspectable,
   sanitized reproduction receipt.
3. Authenticate matching query digests, expected source/fact
   labels, #92 persisted receipt/index, remote membership,
   search transport, replay adapter, same-group/workspace/
   project and temporal adjudication for comparator and candidate.
   Require exact candidate-output reproduction on the original
   holdout; source drift or post-exposure data substitution FAILS.
4. Preserve the original once-only holdout record with
   PRE_EXPOSURE_ORIGINAL_SEMANTIC_COMPARATOR=false and the
   separate retrospective diagnostic with an explicit
   POST_EXPOSURE_COMPARATOR label. Do NOT claim the original
   runner performed a paired comparison.
5. Grant only the ability to adjudicate the COMPARATIVE HOLDOUT
   requirement if, upon independent verification, every positive
   case is nonnegative, no new unsafe/off-topic negatives occur,
   and all source/privacy/EX gates remain satisfied.
   Do not upgrade insufficient evidence into PASS. Do not
   apply the exception to any future cohort or issue.
6. Independently verify the clean, no-tools, non-git-history
   model-answer-use criterion and actual native context
   association; do not treat prior history/tool-assisted
   answers as clean evidence. Source/scope/temporal controls,
   <=1400 selector JSON chars, <=5 facts, and the p95<=300ms
   native hook criterion over mixed calls remain UNCHANGED.
   The reported n=20 p95=299.77ms is near the threshold and
   merits carefully characterized evidence, not rounding
   away slower outcomes.
7. Before review/merge, require focused + trusted broader
   exact-head CI, independent PR review, and merged-main gates
   under the unchanged project workflow.

No new candidate, tune-on-holdout, Graphiti write, extra model
daemon, branch proliferation, or production config mutation
is justified by this exception.

## Alternatives and decision

**APPROVE LIMITED COMPARATOR RECOVERY:** Central explicitly
revises the Issue #93 acceptance authority to permit this
SINGLE controlled post-exposure baseline comparison, then
stages ONE consolidated read-only local qualification covering
identity/replay proof, a clean native model-answer test (serial
single-GPU, no-tools), and remaining safety/CI evidence.

**DECLINE:** The holdout remains methodologically unverified;
Central can instead propose a separately preregistered fresh
untouched holdout as an explicit replacement, including
fixed paired strict/semantic/candidate instrumentation.
The exposed original holdout remains archived diagnostic
evidence and cannot be relabeled untouched. Approval of
such a new holdout requires a separate operator decision.

Regardless of choice, the holdout's ABSOLUTE B2.2 usefulness
remains 1/4 positive source-exact and HN01 off-topic=4;
nonnegative relative performance is not a claim of high
absolute usefulness. The independently attributable answer-
support gate is not yet satisfied.

OPERATOR_APPROVAL=NOT_RECEIVED
PR_MERGE_DEPLOYMENT_CLOSURE=NOT_AUTHORIZED
