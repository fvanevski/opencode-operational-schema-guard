# Issue #93 — Central candidate B2.1 disposition

Binding inputs:
- Issue #93 as prospectively revised by operator (2026-11-14).
- Approved contract: docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md.
- Freeze evidence: 69014b739d490f8cb90bce86233edf3054673209.
- Current source: docs/issue-75/v2-candidate/semantic-recall.mjs.
- Synthetic positive regression: docs/issue-75/v2-candidate/semantic-recall.test.mjs.
- New focused tests: docs/issue-93/semantic-abstention.test.mjs.

## Independent evidence review

The immutable published baseline reports 18 development positives and
5 negatives, strict 13/18, semantic 15/18, zero strict-only losses, plus
a separately sealed 4+2 holdout. Graphiti and #92 ReviewStore were
snapshotted for a matched strict/semantic replay. Central directly read
all eight published evidence files and verified the evidence-only commit.
The private raw source/case/UUID data were NOT available to Central;
their independent host source adjudication, snapshot reuse and holdout
sealing must be reverified by the local qualification against fingerprints.

The original #81 baseline strict 12/16 and semantic 13/16 is HISTORICAL
and immutable; it has not been freshly reproduced and must not be
relabelled as this prospective baseline.

The source-level N01 path is real: native rank can qualify an otherwise
unanchored, lexical-unsupported fact and a one-fact cap did not itself
abstain. Central changed only that path, preserving the anchored lane,
the strict anchor and all source/remote/temporal/privacy checks in
Memory.search and its callers. An unsupported top native result no
longer precludes considering a lower-ranked fact with an independent
answer-type, matching issue identity or authenticated excerpt signal.
These signals are not calibrated probabilities or proof of semantic
truth; the frozen positive/negative comparison is the acceptance arbiter.

Central performed a V8 source-level smoke on the EXACT retrieved
relevance.mjs + updated semantic-recall.mjs functions: all five
sample checks passed, and syntax parsed. This is NOT native Node test
execution or real Graphiti acceptance. Local Build must execute
the actual new and coherent existing regression suites.

## Critical acceptance distinction

The correction is expected to suppress the unanchored France N01
single-fact injection, but the pre-change N02 off-topic case injected
FOUR facts. A four-fact output implies the current selector's anchored
lane was reached, and this commit intentionally does not modify that
lane. Therefore the approved NEGATIVE improvement criterion
(N01=abstain PLUS one additional predeclared off-topic negative
abstains) is NOT YET VERIFIED and may fail. Never call the candidate
accepted merely because France goes from 1 to 0.

If N02 continues to inject and no extra exact-source positive is
recovered, stop before opening the sealed holdout, model-answer run
or PR. Return privacy-safe exact feature-stage evidence for ONE
additional Central anchored-lane correction. Do not reselect or
refreeze the cohort, weaken no-positive-loss requirement or
invoke the holdout to tune a failing candidate.

A clean N05 false-verified negative requires trusted test-fixture
source-authority control even if the genuine host corpus currently
has only native-ID strong source receipts. Do not equate presence
of asserted-verified source text with an authorization violation.

## Source/budget invariants

- Zero strict-only losses AND zero loss of the current semantic
  15/18 source-exact development positives.
- No increase in N03 wrong-group-content or N05 false-verified
  injections; N04 secret remains zero. Cross-group *remote* leakage
  remains forbidden regardless of content relevance.
- <=5 selected facts, <=1400 selector JSON characters, actual
  native context callback p95 <=300ms on >=20 MIXED invocations,
  measured across all injected, empty, error and late outcomes.
- Real native-user message association, same-group persisted per-fact
  #92 source proof, separate search/episode-proof RTT, no EX/Graphiti
  mutation, no new daemon or competing interactive LLM workload.
- If development gate passes, evaluate the separately registered
  4+2 holdout exactly once, with no tuning on it; independently
  adjudicate at least one genuine answer-use case where the answer
  did not come from a test fixture/tool read.
- No PR or merge authorization in this disposition.
