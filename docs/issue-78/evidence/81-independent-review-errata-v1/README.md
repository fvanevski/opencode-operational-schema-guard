# Issue #81 independent-review errata: historical evidence provenance

This additive review notice does **not** change archived evidence bytes, source
identities, operator labels, thresholds, Graphiti episodes, or accepted scores.
It resolves two source/interpretation defects raised in the PR #83 conversation
at the older source commit `6186bbbc47394977a3b8f933289080a8a6c822b2`.

## A. Archived read-tool experiment is NOT executable production authority

`docs/issue-78/evidence/81-capture-closeout-v1/events.mjs` and its adjacent
`read-tool-closeout.test.mjs` reproduce an earlier, **rejected** proposed
`FILE_TOOLS += 'read'` experiment. The archived file is not the source
installed by the current candidate plugin. The adjacent test is expected to
pass **for that historical experimental copy**, where it incorrectly emits
`kind='file_change'` from a read-only `read` action. That passing test must
never be counted as validation of the current production adapter, nor used to
justify applying the rejected patch. This is an archived negative design
control, not an approved implementation.

Authoritative current implementation:
`docs/issue-78/v2-candidate/events.mjs`, which restricts file-change
classification to `edit`, `write` and `apply_patch`. Current
`docs/issue-78/v2-candidate/candidate.test.mjs` explicitly asserts that
`fromTool(read)` returns `null` while a real `write` reports
`file_change`. The governing rejection and rationale are documented in
`docs/issue-78/v2-benchmark/CENTRAL_CAPTURE_CLOSEOUT_DISPOSITION.md`.

A generic test sweep under `docs/issue-78` may exercise both test files.
Report which module each test imports; success of the archived sidecar test
is **not** evidence of accepted production read-tool behavior.

## B. Original prospective development per-case truth was not updated

`docs/issue-78/evidence/81-final-verification-v1/matrices.json` contains a
historical `prospective_dev_12.per_case` table whose `truth` fields are
the **original proposed labels**, despite the adjacent aggregate
`adjudicated_labels` reflecting the operator's amendment
`dev-p-read: true → false`. This table is **not** a fully operator-ratified
per-case truth vector. Retain the original bytes and provenance.

The resulting operator-adjudicated per-case truth for the 12 published case
IDs, derived from the unchanged selection flags plus the one explicitly
recorded amendment, is:

| Case | Selected | Original proposed truth | Adjudicated truth |
| --- | :---: | :---: | :---: |
| dev-p-chatter1 | true | false | false |
| dev-p-longdecision | true | true | true |
| dev-p-codeprose | true | true | true |
| dev-p-secretlate | false | false | false |
| dev-p-self | false | false | false |
| dev-p-shell | true | true | true |
| dev-p-read | true | true | **false** |
| dev-p-dup | true | false | false |
| dev-p-chatter2 | false | false | false |
| dev-p-historical | true | true | true |
| dev-p-superseded | true | true | true |
| dev-p-chatter3 | false | false | false |

Recomputed from the **published selection flags** and this operator
amendment: **TP=5, FP=3, TN=4, FN=0**, recall 5/5=1.00,
selected precision 5/8=0.625. This is a derived correction to the
historical report, not a newly signed worksheet and not an independent
native-session holdout.

## Current independent quality authority

The genuinely new 24-case cron cohort, preserved under
`docs/issue-78/evidence/81-independent-holdout-v1/`, is a **separate**
ratified benchmark from the older prospective data. The corrected post-exit
re-drain and human fact adjudication report candidate recall 14/14,
receipt-bound grounded precision 2/2 (small denominator), useful
persisted fraction 1/2, and no observed privacy/wrong-group failure.
Historical unsuccessful cohorts remain visible rather than overwritten.
Fresh installed-client semantic recall and interactive context latency are
still unverified until post-merge acceptance. These findings do not grant
merge or deployment authorization.
