# Issue #93 — B2.2 completion-bound validation

Primary role: BUILD. One consolidated local campaign with a
development-gate stop, then conditional once-only sealed holdout,
real native-client answer utility, and exact-head verification.
No branch proliferation or repeated benchmark discovery.

REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=93
BRANCH=issue/93
CURRENT_CANDIDATE=semantic-recall.mjs semantic-only now handling
CENTRAL_DISPOSITION=docs/issue-93/CENTRAL_B2_2_DISPOSITION.md
APPROVED_ACCEPTANCE=docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md
FROZEN_EVIDENCE=docs/issue-93/evidence/prospective-freeze/
FAILED_B2_1_EVIDENCE=docs/issue-93/evidence/candidate-qualification/
PRIVATE_COHORT_ROOT=/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq
EVIDENCE_ROOT=docs/issue-93/evidence/b2-2-completion

EVIDENCE_REMOTE_UPDATE=allowed  # at most one sanitized, non-force commit
SOURCE_REMOTE_UPDATE=forbidden
MECHANICAL_REMEDIATION=forbidden
PRODUCTION_CONFIG_CHANGE=forbidden
GRAPHITI_REVIEWSTORE_WRITE=forbidden
HISTORICAL_OR_FROZEN_TRUTH_EDIT=forbidden
EX_LEASE_OR_GATE_BYPASS=forbidden
PR_CREATION=forbidden
NEW_BRANCH=forbidden

## 1. Source identity, frozen inputs, tests

Fetch and authenticate the FULL 40-hex issue/93 source commit from
the kickoff, using an isolated worktree and preserving the owner's
checkout. Read the current issue, approved criteria, Central
disposition, exact changed code and new regression tests.

Confirm shared docs/issue-75/v2-candidate/relevance.mjs is
BYTE-IDENTICAL to the original pre-candidate version at
ac416a5becb680dc4259e67e93aa008cb7eee0b3;
do not compare against intermediate first-attempt 3380baa.
The B2.2 source change is semantic presentation-local only.

Privately re-verify the EXACT predeclared SHA256:
DEV_MANIFEST=3e799c461080985324c58d487ec6327e7616436b546ee9aa2dce3a67251919db
SEALED_HOLDOUT=3f9eaebb6debe949bc9eb07eb777f2851b957adc1a8a3d94bccfcd27fa75c0c9
SOURCE_SNAPSHOT=dc597c690b0e8990b925b01467269f530d37dfb2dd7730663bdda46680e7231b

All raw inputs, adjudications, source identities and exact graph
records remain private. Any missing/mismatched digest, source
authenticity defect or snapshot drift is a material BLOCKED state.
Never recreate, re-label, retune or substitute frozen cases.

Run actual Node focused suites with true exit codes, including:
- docs/issue-93/semantic-abstention.test.mjs (now 11 tests)
- docs/issue-75/v2-candidate/relevance.test.mjs
- docs/issue-75/v2-candidate/semantic-recall.test.mjs
- docs/issue-75/v2-candidate/semantic-memory-integration.test.mjs
- docs/issue-78/v2-curator/curated-recall-candidates.test.mjs
- docs/issue-93/native-source-context.test.mjs
- docs/issue-93/score-stage-ledger.test.mjs
- other relevant memory-core, relevance-priority and replay tests

Run repo-defined project Verify/check/complete test profiles from
the exact candidate and retain actual receipts. Use existing
trusted Actions evidence if it genuinely covers an equivalent
candidate exact SHA; do not rerun identical work as ritual.
Do not bypass tests, alter controls or silently fix source.

## 2. Same-snapshot prospective development gate

With the original private source-verified 18-positive/5-negative
development cohort, run unchanged strict, unchanged former
semantic baseline (69014b7), earlier B2.1 (e53dbbf), and
the Central B2.2 candidate on IDENTICAL frozen Graphiti search,
#92 ReviewStore/index and same-group remote membership.
Reuse the private adapter; do not regenerate Graphiti candidates,
move the cohort, or update Graphiti. Record case-level expected
source exactness, stage loss, selected count, selector JSON
charge and private query/source identity proof.

GATE:
1) Strict control remains 13/18, protected source unchanged.
2) All 15/18 semantic source-exact positives from baseline and
   earlier B2.1 remain, including each strict-only and genuine
   paraphrase/temporal case; zero new source-exact loss.
3) N01 France ZERO; N02 predeclared Tokyo-weather ZERO. Keep
   N03 wrong-group-content and N05 false-verified source
   controls no WORSE; N04 secret fence ZERO.
4) <=1400 selected JSON chars, <=5 facts, no untrusted or
   cross-group remote source, private sourceContext leak,
   authority upgrade, false verified status or EX violation.
5) Report positive TP/FN, negatives FP/abstention, candidate
   change vs BOTH initial baseline and B2.1; explain any
   surprising strict or source-index behavior.

If ANY development gate fails, stop before HOLDOUT or GPU model
work, report a minimal source-backed failure trace and hand back
to Central. Do not make production modifications or run tuning
campaigns. No need for a new agent branch/PR.

## 3. CONDITIONAL holdout and native utility

ONLY AFTER development passes, unseal and evaluate the original
predeclared 4-positive/2-negative holdout ONCE on identical
strict/semantic/B2.2 source snapshot. Do not tune the candidate
using holdout; require no source-exact positive loss and no
new unsafe/off-topic negatives. Record outcome safely by case ID
and exact manifest hash.

Then qualify the installed SOURCE-BACKED V2 plugin with real
read-only Graphiti + persisted #92 ReviewStore, matched group,
project/workspace and native message IDs. Require at least one
real plugin context actually assembled into a model request;
a mock host ctx alone is NOT equivalent. Prove real source
attribution, private excerpt omission, temporal status, and
remote same-group membership.

Collect >=20 true native context-hook durations across a mixed
sample including no-injection, error, late and injected outcomes
if any occur; report p50/p95/max and all outcomes without
discarding slow/empty cases. Required p95<=300ms, <=1400 selector
JSON chars, <=5 facts, and separate search_memory_facts RTT and
get_episodes proof RTT (70ms optional enrichment window).
Never conflate assembled-context length with selector budget.

For answer-use, choose one genuinely sourced, nontrivial
development fact from accepted #92 proof. In ONE QUIET,
isolated fresh OpenCode/model context, demonstrate source
context in the ACTUAL assembled model input. Obtain an answer
attributable to that injection without allowing the model to
read a test fixture, issue code, artifact or equivalent tool
result for the credited fact. A useful control is a serial
memory-disabled no-tools query with the same prompt/model,
followed by memory-enabled no-tools query and private
source-exact adjudication. Do not claim causal proof if model
prior knowledge or another channel could supply the fact.
Never run two GPU-inference models concurrently, require a new
daemon, mutate live plugin config or write Graphiti.

When a post-exit fresh process is necessary, return ONE
specific operator-owned READY_FOR_FINAL_OPERATOR_RUN command
with frozen test prerequisites rather than misleading PASS.
The host may perform safe in-scope read-only diagnostics and
private scratch adapters autonomously.

A clean false-verified authority fence must also be tested
with a deterministic independently weak-source fixture; the
live N05 negative alone remains ambiguous because its stored
records use native-id source strength. Do not claim source
authorization failure from mere false-verification prose.
Do not silently waive any hard gate.

## 4. Completion, evidence and handback

After required checks, publish AT MOST ONE sanitized evidence-only
commit to the SAME branch under EVIDENCE_ROOT with SHA256SUMS
and exact parent/head readback, never a second PR/branch.
No raw user/agent query, fact, excerpt, source ref/UUID map,
model prompt/answer or secret in GitHub. Do not modify source
or tests on the host; Central owns substantive remediation.

Return:
RESULT=DEV_PASS_HOLDOUT_PASS_NATIVE_PASS|DEV_FAILED|HOLDOUT_FAILED|NATIVE_FAILED|READY_FOR_FINAL_OPERATOR_RUN|BLOCKED_FROZEN_AUTHORITY|STALE|PARTIAL
TARGET_SOURCE_SHA=<full 40-hex>
OWNER_CHECKOUT_PRESERVED=<yes/no>
CHANGED_PATHS_PROOF=<strict-control identity, exact Central diff>
FROZEN_MANIFEST_AND_SNAPSHOT_HASHES=<exact readback>
FOCUSED_TESTS=<commands, tests, exit>
PROJECT_GATES=<check, test, trusted verify, exact identity>
STRICT_AND_PREVIOUS_SEMANTIC=<source-exact, hard negatives>
CANDIDATE_DEVELOPMENT=<18-positive/5-negative cases, TP/FN, losses>
N01_N02=<pre/after injections and stage proof>
N03_N04_N05=<source-vs-relevance distinction, hard fences>
INDEX_RESCUE=<original 6 raw-top24 absent, recovered cases>
HOLDOUT=<never run or single sealed 4/2 outcome>
NATIVE_CONTEXT=<actual matched assembled model input proof>
NATIVE_TIMING=<n,p50,p95,max,injected,empty,error,late>
SEARCH_AND_GET_EPISODES_RTT=<separate evidence>
SOURCE_PRIVACY_EX=<negative controls and state>
ANSWER_SUPPORT=<independent use, UNVERIFIED or operator run needed>
PR_STATUS=<none; exact-head review not started>
EVIDENCE_COMMIT_SHA=<full 40-hex or none>
PROTECTED_SURFACE_DIFF=<none or exact unexpected>
PRIVATE_PACKET_LOCATION=<path only>
KNOWN_GAPS=<specific material remaining>
COMMAND_SHAPE_FRICTION=<full canonical GHDEV-10 schema; record
guard approvals and argument contracts, no disguised rewrites>

If all acceptance evidence passes, STOP and return for
Central independent exact-head PR review preparation. Final
installed Graphiti+OpenViking coexistence belongs to #94.
