# Issue #93 — Central B2.1 candidate qualification

Primary local agent: BUILD in a fresh isolated worktree.
This is ONE consolidated candidate qualification with a hard
development-gate stop. Do not create another PR or branch.

REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=93
BRANCH=issue/93
CENTRAL_CODE=docs/issue-75/v2-candidate/semantic-recall.mjs
CENTRAL_TESTS=docs/issue-93/semantic-abstention.test.mjs
GOVERNING_STANDARD=docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md
DECISION=docs/issue-93/CENTRAL_B2_CANDIDATE_DISPOSITION.md
FROZEN_EVIDENCE=docs/issue-93/evidence/prospective-freeze/
PRIVATE_SOURCE_PACKET=/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq
PUBLIC_EVIDENCE_ROOT=docs/issue-93/evidence/candidate-qualification

PRODUCTION_SELECTOR_MUTATION=forbidden
HISTORICAL_FINGERPRINTS=immutable
FROZEN_DEV_OR_HOLDOUT_MANIFEST_EDIT=forbidden
HOST_SOURCE_OR_CONFIG_WRITE=forbidden
GRAPHITI_OR_REVIEWSTORE_WRITE=forbidden
EX_ADMISSION_BYPASS=forbidden
NEW_SERVICE_OR_COMPETING_INFERENCE=forbidden
PR_CREATION=forbidden
ONE_SANITIZED_EVIDENCE_COMMIT=allowed_on_existing_issue_branch

## 0. Authenticate source and no-drift boundary

Fetch and authenticate the EXACT full remote issue/93 SHA specified
in kickoff, with current issue and approved acceptance. Verify the
only source change since the frozen baseline is the Central candidate
and the new regression. Preserve owner checkout via isolated worktree.
Read this document and Central disposition from that exact SHA,
plus source functions under docs/issue-75 and #92 resolver.

Verify the original PRIVATE development manifest SHA256
3e799c461080985324c58d487ec6327e7616436b546ee9aa2dce3a67251919db,
SEALED holdout SHA256
3f9eaebb6debe949bc9eb07eb777f2851b957adc1a8a3d94bccfcd27fa75c0c9,
and original matched source snapshot SHA256
dc597c690b0e8990b925b01467269f530d37dfb2dd7730663bdda46680e7231b.
Distinguish a raw source snapshot digest from an arbitrary manifest digest.
Prove source/selector identity and exact same snapshot reuse; if any
file/case/hash/source identity is missing or altered, stop as
BLOCKED_FROZEN_AUTHORITY. Never reselect or regenerate cases.

## 1. Validate Central source correction and native regressions

Run exact Node commands with actual exit codes and failures:
node --test docs/issue-93/semantic-abstention.test.mjs
node --test docs/issue-75/v2-candidate/semantic-recall.test.mjs
node --test docs/issue-75/v2-candidate/semantic-memory-integration.test.mjs
node --test docs/issue-93/native-source-context.test.mjs
node --test docs/issue-93/score-stage-ledger.test.mjs
plus the existing relevant relevance/memory/curator tests.
Use the repo's trusted Verify/CI shapes for relevant broader checks.
Do not mask exit failures or edit tests/source to get green.
Report if focused tests fail; within-scope private fixture diagnosis
is allowed; substantive repo fixes belong to Central.

## 2. Candidate versus FROZEN development baseline: first gate

Execute the ORIGINAL frozen 18+5 development cases only. Use the
original private query/source/source-proof manifests, the identical
read-only Graphiti search+same-group-membership source snapshot,
the same actual #92 ReviewStore source index and identical
source-adjudication labels. Do not inspect the 4+2 holdout yet.

Compare unchanged strict, unchanged pre-candidate semantic from
the authenticated freeze parent, and Central candidate from the
authenticated target using precisely matched snapshot inputs.
Report all case-level source-exact correctness in safe case IDs,
stages (remote raw top24/index rescue, source/UUID proof, final
candidate, chars), TP/FP/FN/abstentions and positive losses.

HARD DEVELOPMENT GATE:
- Preserve all 15/18 pre-candidate semantic source-exact positive
  cases and all independently strict-recovered positives, with
  zero strict-only losses and no paraphrase/temporal regression.
- France N01 -> ZERO injected facts (pre-candidate: one).
- Additional predeclared off-topic N02 -> ZERO injected facts
  (pre-candidate: four) for the approved negative-reduction route,
  unless the same candidate instead adds >=1 genuine source-exact
  positive without any positive losses. N03/N05 must not worsen;
  N04 remains zero. All hard source/group/privacy/remote/EX
  gates still pass.
- Show selector JSON <=1400 and <=5 facts, separately from
  rendered system-context bytes. No score-label leakage.

If development gate FAILS, especially N02 still injects,
DO NOT run holdout or live model-answer campaign. Diagnose
N02's actual feature/path difference from N01: query/fact
lexical token groups, overlap, strict anchor, native rank,
answer-type support, source excerpt overlap, issued-ID signals
and reason an otherwise irrelevant anchored branch injects.
Keep raw queries/source private; return a concrete bounded
CENTRAL_NEXT_FIX requirement and source-safe evidence.
Do not implement another production source change locally.
One evidence commit is enough; don't launch more campaigns.

## 3. CONDITIONAL final qualification only after development PASS

Only after the preceding development gate passes, release the
previously SEALED 4-positive/2-negative holdout ONCE without
candidate tuning. Compare strict/current semantic/candidate on
identical source proof. Require no source-exact positive loss,
no new sensitive/off-topic negative injection, and explicit
untouched holdout source adjudication.

Then on an isolated read-only V2 native-client binding prove
actual same-client native-user context association and at
least one source-attributed context assembled into a real model
request. Measure >=20 true plugin context-hook invocations,
include injected, empty, errors and late outcomes, p95<=300ms,
separately measure search RTT and get_episodes proof RTT,
and ensure <=1400 selector JSON chars and <=5 facts. Preserve
EX, stage, remote source and secret fences.

For answer benefit, obtain at least one CLEAN model answer
independently evaluated as using a genuinely injected fact,
not a test fixture read, tool lookup, or preloaded answer.
Do not start a second model that contends for the active
single-GPU interactive runtime. If genuine fresh-process
attribution needs a post-agent run, return one bounded
operator command as READY_FOR_FINAL_OPERATOR_RUN rather
than asserting PASS or doing hidden background work.
Do not create daemon, EX write or installed config mutation.

Relevant broad tests, project trusted Verify/CI checks and
exact-head independent PR review remain required before
PR/merge, not implied by any single local scorecard.

## 4. Evidence handback / publication

Publish at most ONE new sanitized evidence-only commit under
PUBLIC_EVIDENCE_ROOT and only on existing issue/93 branch.
Use collision-safe private scratch, immutable manifest hashes,
exact target, Git ref readback, SHA256SUMS. No raw fact/query/
source text, private UUID mapping, model request or private
holdout case body publicly. No changes to production source,
historical evidence, frozen private manifests or live Graphiti.

Return typed block:
RESULT=DEV_PASS_HOLDOUT_PASS|DEV_FAILED_N02|DEV_FAILED_POSITIVE|DEV_FAILED_OTHER|READY_FOR_FINAL_OPERATOR_RUN|BLOCKED_FROZEN_AUTHORITY|BLOCKED_NATIVE|PARTIAL|STALE
TARGET_SOURCE_SHA=<40 hex>
OWNER_CHECKOUT_PRESERVED=<yes/no>
FROZEN_MANIFEST_AND_SNAPSHOT_HASHES=<exact checked hashes>
FOCUSED_AND_BROAD_NODE_TESTS=<commands, passes/fails/exits>
DEVELOPMENT_STRICT=<source-exact counts, case IDs>
DEVELOPMENT_PREVIOUS_SEMANTIC=<counts, negatives>
DEVELOPMENT_CANDIDATE=<TP/FP/FN/abstention, positive losses>
N01_FRANCE=<pre vs candidate count; stage/cost>
N02_OFFTOPIC=<pre vs candidate count; feature/path root cause>
N03_N04_N05=<candidate vs baseline hard/soft negative>
INDEX_RESCUE=<raw top24 vs index and proof case IDs>
SEALED_HOLDOUT=<NOT_RUN or once-only result and manifest hash>
NATIVE_HOOK=<n,p50,p95,max,injected,empty,error,late>
SEARCH_AND_PROOF_RTT=<separate RTT and allowance>
ACTUAL_MODEL_REQUEST_AND_ANSWER_SUPPORT=<verified use or UNVERIFIED>
PR_AND_CI_STATUS=<no PR; any actually executed check>
B2_RESULT=<qualifies / specific bounded Central amendment needed>
PROTECTED_SURFACE_DIFF=<none or exact incident>
EVIDENCE_COMMIT_SHA=<full SHA or none>
PRIVATE_EVIDENCE_LOCATION=<path only>
KNOWN_GAPS=<specific blocker list>
COMMAND_SHAPE_FRICTION=<complete canonical GHDEV-10 block>

Routine bounded host diagnostic and private script repair are
authorized without follow-up. If a source-fenced or original
cohort requirement conflicts with this test, stop and return
the exact conflict; do not silently relax acceptance.
