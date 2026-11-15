# Issue #93 — Central adjudication of B2.2 holdout report

AUTHORITY=Issue #93 as operator-amended 2026-11-14;
docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md;
exact source SHA 4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4;
published handback SHA 68bd9ac49d953ccf1557d263c1ba0be7f9e4ff84.

DISPOSITION=DEVELOPMENT_PASS__HOLDOUT_OUTCOME_OBSERVED__PAIRED_COMPARATOR_MISSING
ISSUE_93=OPEN
PR_MERGE_DEPLOY_CLOSURE=NOT_AUTHORIZED
NEW_SELECTOR_TUNING_ON_EXPOSED_HOLDOUT=FORBIDDEN

## Verified immutable GitHub state

The expected evidence commit is on issue/93 with the correct parent
4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4. The full diff
contains only eight new evidence files under
docs/issue-93/evidence/b2-2-completion. No selector, CI,
Graphiti, persisted ReviewStore, installed config or historical
scorecard changes were in that evidence commit.

The host reports exact private dev/holdout/source-snapshot hash
readbacks; Central inspected the SANITIZED reports, not the private
raw source, native runtime or manifest files themselves.

## Evidence-supported results

Development on the original frozen 18-positive/5-negative cohort:
strict=13/18 source exact, previous semantic=15/18,
B2.2=15/18, no source-exact/strict-only losses;
N01=N02=N04 zero; N03/N05 no worse; selector <=5 and <=1400
reported. This satisfies the development-only gate on
host-reported evidence.

Holdout (original 4 positives/2 negatives) was opened ONCE:
B2.2 presented correct source for H01 only (1/4),
missed H02/H03/H04 and injected four development facts
for off-topic HN01; HN02 secret abstained.

The operator-approved holdout criterion is COMPARATIVE:
"require nonnegative source-exact useful support and no new
unsafe/off-topic injection compared with current semantic".
The published holdout-result.json reports a strict Boolean
and B2.2 Boolean for each positive, plus B2.2 negative counts,
but DOES NOT state ORIGINAL current-semantic outcomes for
H01-H04 or HN01/HN02. Therefore:
- absolute B2.2 holdout scores 1/4 and HN01=4 are established;
- a POSITIVE LOSS versus current semantic is UNVERIFIED;
- a NEW off-topic injection versus current semantic is UNVERIFIED;
- HOLDOUT_FAILED is the agent's reported disposition, but a
  final adjudicated comparative PASS/FAIL cannot be derived
  from the published matrices alone.

Missing comparator evidence is NOT permission to call the
holdout successful. Do not reinterpret the approved comparator
as an absolute 4/4 recall threshold OR silently relax controls.
Do not retune on the exposed queries. An already-used holdout
cannot later be called untouched again.

Native real-route evidence: n=20 p95=299.77ms, max=300.273ms,
14 injected/2 empty/2 error/2 late as reported. The criterion
is p95<=300ms ACROSS ALL calls, so max>300ms is not by itself
a p95 failure; no slow call was to be discarded. This is
small-sample HOST evidence, not proof of complete new-client
OpenCode model-answer utility. Search/get_episodes RTT are
separate. Answer attribution remains UNVERIFIED because the
no-memory control also accessed the credited git fact through
another source channel.

Native Node and project checks are reported passed at source
4bc169cc...; repeating identical checks alone does not repair
the missing holdout comparator or answer attribution.

## Required finite reconciliation

First read the already-existing PRIVATE, once-only holdout
execution results for the ORIGINAL, unchanged semantic
comparator at 69014b739d490f8cb90bce86233edf3054673209
(and strict baseline); report case-level source-exact
positive outcome and model-facing negative fact counts
with the SAME frozen snapshot and truth digests.
If the comparator was not actually executed/retained, say so.
A post-exposure reconstruction can establish historical
candidate-relative arithmetic but is not a NEW untouched
holdout run and must be explicitly marked post-hoc; do not
re-certify it as pre-exposure evaluation.

For H02/H03/H04, distinguish missing expected fact at raw
search/index/remote proof from semantic selection or budget
omission without using case text/labels to tune. For HN01,
distinguish current-semantic baseline injected count from
B2.2 count. Preserve exact same-group/receipt/secret constraints.

If the candidate is NONNEGATIVE against the original
semantic holdout on every predeclared positive and negative,
the holdout's comparison may be supportable (subject to
method/timestamp authenticity). Independent clean answer-use
and full native acceptance remain pending.

If it truly regresses, or the originally required comparator
cannot be proven, issue #93 remains BLOCKED at that gate.
A successor candidate needs independent development evidence,
and a NEW prospectively sealed untouched holdout would require
explicit operator approval to supersede the exposed holdout.
Never quietly replace this failed or incomplete test by
changing the existing frozen manifests, adjudications or
historical outcomes. Preserve the original result as exposed
diagnostic evidence.

No PR, merge, deployment or issue closure is authorized.
