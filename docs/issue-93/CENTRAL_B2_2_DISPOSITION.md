# Issue #93 — Central B2.2 candidate and N02 adjudication

AUTHORITY: Issue #93 approved prospective acceptance 2026-11-14;
docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md.
HISTORICAL #81 EVIDENCE: immutable, not re-run.

## Independent evidence review

GitHub readback verified handback commit
ac416a5becb680dc4259e67e93aa008cb7eee0b3, parent
e53dbbfd4b1ee153a0562547e03d0210aae57629; exactly seven
new evidence packet files under candidate-qualification, no
production source diff. The published PRIVATE-frozen cohort has
18 development positives, 5 negatives and an unrun sealed 4+2
holdout on snapshot fingerprint
dc597c690b0e8990b925b01467269f530d37dfb2dd7730663bdda46680e7231b.

Recorded: strict 13/18, baseline semantic 15/18, B2.1 semantic
15/18; no positive or strict-only losses. N01 France drops
from 1 injected fact to 0; N02 Tokyo-weather remains at 4.
N03=4, N04=0, N05=3 unchanged. N05 remains imperfectly isolated
as a FALSE-VERIFIED source-authority control in the live corpus,
not proven an authorization leak. Holdout and live/model validation
correctly did not run.

The published N02 diagnosis points to a sole stopword-class
overlap on 'now' in accepted #92 index-rescue narration. That
single match triggers the anchored <=5-fact presentation lane.
The local private temporary-patch test reportedly made N02
abstain without losing the known 15/18 positives. Central
independently confirmed the relevant source path and did not
gain access to private case bodies; current-score claims are
therefore HOST-REPORTED and must be re-verified exact-snapshot.

## Central correction and strict-control preservation

Central initially staged the 'now' correction in the shared
relevance.mjs COMMON stopword set, then identified that shared
relevance.mjs also controls the STRICT baseline and strict anchor.
That approach would not be byte-preserving of the strict benchmark
control. Central repaired the staging BEFORE host qualification:
the pre-candidate relevance.mjs source is RESTORED byte-identically
to ac416a5... (and to the earlier frozen baseline).

The final B2.2 candidate places a semanticLexicalSupport helper in
docs/issue-75/v2-candidate/semantic-recall.mjs, removing standalone
'now' from the QUERY only when calculating semantic-presentation
overlap/anchor/context/index-preselection. This keeps the
strict relevance.mjs, strictControlAnchor and all source/privacy/
group/remote/temporal/EX proof code unchanged.

docs/issue-93/semantic-abstention.test.mjs now includes 11 tests,
with synthetic N02-class now-only indexed/native distractions and
a legitimate 'right now' FalkorDB positive. Central read back
the exact source and used V8 source-level smoke: 7 selected
checks PASS, strict source exact byte match PASS. That is NOT
native Node test execution, not an original private N02 test,
and not current Graphiti/native/model acceptance.

## Candidate development hard gate (not yet accepted)

On the authentic unmodified 18+5 development cohort and the
IDENTICAL frozen Graphiti+ReviewStore snapshot:
- strict remains 13/18 source exact as an unmodified control;
- semantic retains all existing 15/18 source-exact positives,
  including every strict-recovered and paraphrase/temporal case;
- N01 and N02 both inject ZERO facts; N03/N05 do not worsen,
  N04 remains ZERO and all source/privacy/remote gates pass;
- <=5 facts and <=1400 selector JSON characters, with no
  sourceContext/UUID/private excerpt leakage.

Do not open the sealed 4+2 holdout until the development
gate passes. If it fails, return the exact material cause
for Central adjudication, without resampling or retuning.

When that gate passes, ONE holdout evaluation plus real native
client and independently attributable model-answer use are still
required, as is mixed >=20 native hook p95<=300ms, separate
search/proof timing, suitable trusted Verify and independent PR
review. Issue #94 owns final installed Graphiti+OpenViking
coexistence and scaling.

PR/MERGE/DEPLOYMENT AUTHORIZED: NO.
