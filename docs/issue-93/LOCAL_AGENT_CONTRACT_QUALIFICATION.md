# Issue #93 — completion-bound source-backed qualification

Select local agent primary BUILD; use ONE consolidated host campaign,
not a new exploratory benchmark series. Central owns architecture,
substantive source, test design, acceptance criteria and PR review.

REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=93
BRANCH=issue/93
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed
EVIDENCE_ROOT=docs/issue-93/evidence/completion-bound-qualification
HOST_SCRATCH=private-disposable-only
GRAPHITI_WRITES=forbidden
LIVE_PLUGIN_CONFIG_WRITES=forbidden
HISTORICAL_SCORECARD_MUTATIONS=forbidden
PR_CREATION=forbidden
PARENT=91
FINAL_INSTALLED_ACCEPTANCE=94

A. Fetch origin/issue/93 and authenticate the exact SHA supplied by the
kickoff. Use an isolated worktree and preserve owner checkout. Inspect
current issue #93, ADR-91, the Central adjudication, current plugin.mjs,
memory-core.mjs, semantic-recall.mjs, sourced-recall.mjs,
curated-recall-candidates.mjs and current actual installed host interfaces.
Existing #81/93 evidence packets are immutable. No V1-only commands.

B. Run the new Central-authored regression exactly:
node --test docs/issue-93/native-source-context.test.mjs
Run the corrected score-stage-ledger suite once. Report actual Node version,
workdir, SHA, command, exit and individual failures. The new test uses the
real plugin hooks, but mock Graphiti transport with a temporary, valid #92
per-fact source/index record. It is deterministic PROOF_OF_WIRING ONLY.
Do not mislabel as live remote Graphiti or a real model answer. If fixture
logic needs repair, fix in PRIVATE scratch and return a targeted diff for
Central; do not change repo source, assertions or gates to get green.
Reuse the previous 98-test receipt unless new failures justify more tests.

C. Check ONE bounded scoped inventory of the accepted #92 ReviewStore,
one-fact persisted receipts and episode indexes on the real host. Confirm
actual group/workspace/project, source native-ID strength and evidence
class, source references, persisted status, reviewed identity, and positive
fresh SAME-GROUP Graphiti get_episodes UUID. Distinguish legacy
Issue-75 Journal from #92 ReviewStore. Inspect the actual isolated
V2 ctx.options binding for sourcedEpisodeResolver and
curatedCandidateRetriever. Do not fabricate or backfill either data store
from arbitrary Graphiti hits; do not change installed config. For the
raw-pool-absent S03/S05/S13 failure class, confirm whether a qualified
curated index path can supply a fact without relaxing authority.

D. If and ONLY IF an existing genuine, persisted, authorized per-fact
source record and current matching Graphiti episode are available,
exercise one isolated actual stock-V2 OpenCode client/process with the
real read-only source/Graphiti route. Prove plugin loaded, native
message-ID association, model-bound request inclusion of appropriate
source-attributed context, ≤5 facts, ≤1400 selector JSON chars, and
omission of sourceContext. Include a few predeclared related/paraphrased,
off-topic, temporal and secret/wrong-group controls on a fixed snapshot.
Measure ALL actual context-hook timings separately from Graphiti RTT,
including injected, empty, error and late. For model-answer use, inspect
one actual source-attributed answer independently; context inclusion
does not itself prove answer support. Never run competing interactive
or extraction inference on the single-GPU model service. If actual
external-process proof requires post-exit, return the minimal tested
authenticated operator invocation as READY_FOR_FINAL_OPERATOR_RUN.
Do not claim a mock ctx is a fresh external process.

E. If NO valid existing per-fact remote+source pair exists, stop the live
qualification as BLOCKED_SOURCE_BACKED_NATIVE. DO NOT create a remote
Graphiti episode, new daemon, source journal, review record, synthetic
live authority or historical replay. A disposable seeded Graphiti group
requires separate verified EX admission and explicit operator-approved
bounded data writes; this campaign gives no such permission. Return
precisely which real source/config/permission prerequisite is missing.
Do not repeat broad searches for the missing original #81 roster.
Historical 12/16, 13/16 remain provenance only.

F. Only propose a narrow B2 selector amendment if an actual
source-exact omission or N01/N02 distraction is measured against
an authentic matched case/snapshot, with zero strict-only losses and
no source, group, secret, temporal or EX regression. Do not implement
production selector change locally. With lost original raw #81 cases,
state B2=INSUFFICIENT_EVIDENCE and explicitly identify need for a
separately approved prospective substitution if that blocks issue
closure. Avoid arbitrary lexical hard veto or new LLM reranker.

G. Publish at most ONE metadata-only evidence commit under EVIDENCE_ROOT
on the existing issue branch with a SHA256 manifest and pre/post ref
readback. No force pushes, new branches or PRs. No raw queries, facts,
UUID/source maps, credentials, model prompts or sensitive host traces.
Private scratch files must be collision-safe and not overwritten.
Stop for material source-authority conflict, unapproved EX or actual
installed config drift; routine fixture diagnostics may continue.

Required typed handback:
RESULT=PASS_NATIVE_SOURCE_BOUND|MOCK_ONLY|READY_FOR_FINAL_OPERATOR_RUN|BLOCKED_SOURCE_BACKED_NATIVE|BLOCKED_ACCEPTANCE_STANDARD|PARTIAL|STALE
EXACT_SOURCE_SHA=<40-hex>
OWNER_CHECKOUT_PRESERVED=<yes/no>
NEW_NODE_TEST=<version, command, tests, fail, exit>
#92_REVIEWSTORE_PROOF=<scoped counts, validation, configuration>
REMOTE_SOURCE_UUID_PROOF=<yes/no/absent, same-group>
NATIVE_CLIENT_PROOF=<fresh external / isolated mock>
NATIVE_CONTEXT=<n,p50,p95,max,injected,empty,error,late>
SEARCH_RTT=<separate n,p50,p95,max>
MODEL_BOUND_CONTEXT=<on-time exact sourced facts and association>
ANSWER_SUPPORT=<independently evaluated or UNVERIFIED>
NEGATIVES=<wrong-group/secret/temporal/off-topic>
ORIGINAL_81=<historical fingerprint; current UNVERIFIED unless reproduced>
B2_DISPOSITION=<specific measured source contract or INSUFFICIENT_EVIDENCE>
PROTECTED_SURFACE_DIFF=<none or described>
EVIDENCE_COMMIT_SHA=<full SHA or none>
KNOWN_GAPS=<bounded concrete residuals>
COMMAND_SHAPE_FRICTION=<full GHDEV-10 canonical schema; guard annotations included>

Within-scope host adapter/fixture repairs in private scratch may be made
without another Central query. Substantive source and new acceptance
standards require Central/operator authority; do not bypass this boundary.
