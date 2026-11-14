# Issue #92 — balanced recall and completion campaign (Hermes / Build)

## Outcome, evidence authority, and scope

Complete one substantial continuation addressing the **observed** prospective A3 deficiencies, not an open-ended sequence of source/prompt campaigns. Central has staged an opt-in balanced duplicate review using the existing source-quoted semantic family and specificity reviewers. The code change is deliberately conservative about **suppressing valid source-backed facts**, not about requiring extra admission ceremonies. It does not by itself establish recovery of any missed valuable target.

Repository: fvanevski/opencode-operational-schema-guard
Branch: work/91-memory-utility-r1
Starting SHA: full 40-hex kickoff SHA; fetch and authenticate before using local objects.
Controlling issue: #92 and ADR-91-2026-11-09. Primary local agent: Hermes acting as Build.
EVIDENCE_REMOTE_UPDATE=allowed (one sanitized evidence-only publication this checkpoint)
SOURCE_REMOTE_UPDATE=forbidden; SEMANTIC_REMEDIATION=forbidden
MECHANICAL_REMEDIATION=allowed only for genuinely semantics-preserving native safe fixes
EVIDENCE_ROOT=docs/issue-91/evidence/92-balanced-completion/
EVIDENCE_PACKET_REQUIRED=yes
NEW_PR=forbidden; MERGE=forbidden; ISSUE_CLOSE=forbidden; INSTALLED_ACTIVATION=forbidden

The canonical EX flock, inherited descriptor proof, scheduler idle, configured non-Hermes blocking harnesses, quiet grace and unresolved-work check are already accepted and **MUST NOT be redesigned**. Hermes remains an intentionally exempt orchestrating harness. A3 v3 is settled, failed, and IMMUTABLE. No deletion, state reset, relabel, old-model-call replay, old-group writes or post-hoc criterion changes. Preserve S1–S6 and all A3 groups.

## Central implementation to verify

Files: docs/issue-78/v2-curator/{finite-batch.mjs,curator-cli.mjs,finite-batch.test.mjs}.

Use --novelty-policy recall --balanced-dedup on ONLY for new test cohorts. The legacy recall policy stays unchanged when this opt-in flag is absent. The new flag is frozen in the batch's active pointer and plan. The existing group/project partition and deterministic original-source/utility gates remain authority. For partitions with potential repeated technical predicates, the existing representative reviewer identifies candidate equivalence families; high-certainty multi-member families undergo the existing **independent exact source-quoted specificity review**. Only its positive verified semantic equivalence can suppress a repetition. Distinct facts, uncertain families, malformed/incomplete reviewer responses and unverifiable quotations retain the original source-validated facts. Do not require extra local authorization tokens, external approvals or broad model-tuning to use this mode.

New unit regressions prove (a) true equivalent quotes => one durable fact, (b) uncertain families => both retained, (c) malformed first-stage classification => both retained, (d) source-quote counter-review invalid => both retained and (e) mode cannot retrofit a frozen prior batch. Source-exact and normalized-claim distinction, support critic, utility review, 3-fact/cluster ceiling, ReviewStore/CAS, positive UUID/source-index, unknown-result no-replay, and kernel EX proof are unchanged.

## A — Native correctness and bounded integration

Authenticate all Central-staged source/test blob SHAs from GitHub, verify worktree status without cleaning unrelated files, run actual native producer commands and record exits:

node --check docs/issue-78/v2-curator/finite-batch.mjs
node --check docs/issue-78/v2-curator/curator-cli.mjs
node --check docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/claim-evidence.test.mjs
node --test docs/issue-78/v2-curator/ex-admission-proof.test.mjs
node --test docs/issue-91/adr-acceptance/issue92-a3-acceptance.test.mjs
python3 docs/issue-78/v2-curator/test_ex_admitted_node_bridge.py
npm run check
npm test

Also perform one quick mock-only cross-project/coexisting-same-project test using existing test harnesses if the focused suite does not establish that genuinely distinct predicates retain separate records; do not manufacture a green result. Routine host process/path/permission/script adaptation is authorized; substantive repo source-control or test semantics are Central-owned. If a source regression is RED, collect the exact failing invariant and proposed minimal diff and stop before new model inference. No blanket skips, softened tests, alternative judge definitions, or gate bypass.

## B — One CPU-only root-cause audit of the FAILED prospective A3

Use original immutable v3 manifest, 20 labels, stage receipt, source execution SHA, _active.json, snapshot.json, plan.json, private model-call intent/results, ReviewStore records and terminal Graphiti UUID mapping. Do NOT call the model. Match actual frozen source event references, content hashes and offsets to the 3 **missing original target IDs**: v3-02 (b75-journal), v3-05 (release quality-gate), v3-07 (fsm81 log rotation). For each, report EXACT first demonstrated loss stage:
- available full native source / candidate queue / selected cluster;
- discovery passes and separate complement proposal (including candidate count and exact source span hashes);
- invalid source/quote or actual independent source-support verdict;
- independent utility and defer reason;
- semantic selection and ReviewStore / missing remote identity.

Report whether the relevant original-source predicate was actually in a model-visible span. Distinguish "not surfaced" from "source invalid" and "source-supported but utility rejected". Extract bounded, SAFE technical quotes and redacted response reason codes, NEVER dump raw model replies/whole sessions or secrets to GitHub. Do not infer a code defect merely from missing Graphiti output. Where a model simply declined a valid source fact, identify it as model-selection false negative, not proof that the source validator failed.

In the same read-only pass, compare each of 5 adjudicated duplicate pairs to original quoted source identity, same underlying technical predicate and stable group/project. Record whether Central's new balanced option would have placed them in the same eligible family; this is a structural prediction, not an assertion of what the new model will decide. Do not label all same-case facts duplicates: the v3-08 independently distinct facts must remain separate.

Resolve the two recorded terminal evidence inconsistencies WITHOUT changing history:
(1) a3-v3-raw-opportunity.json states 1,113 "genuinely new" while its drop+admitted counters sum to 1,423. Report both actual populations, their defining SQL/source criteria and correct comparable numerator/denominator. Do not retroactively modify published scorecard.
(2) a3-execution-provenance.json batch_id 6287a0ee... differs from a3-handback.md batch_id 226621f6...; check immutable _active.json/snapshot/plan/model-call hashes and determine the actual batch and whether the mismatch is a transcription error. Preserve both historical fields.

Keep this audit bounded: THREE missed targets, FIVE repetitions, TWO provenance discrepancies. No unrelated investigations.

## C — Prepare the next truly untouched qualification in SAME Build campaign

Concurrently prepare a single NEW prospective native-event cohort from current natural developer activity; no cherry-picked synthetic tests, no recycling A3 v3 (now exposed), v2, B3, gh_mcp or known H2–H4. If H2–H4 original bytes are unavailable, prove available source IDs/digests, record exact remaining uncertainty and avoid unnecessary arbitrary blocks for an unavailable historical file.

Use the existing Central native full-input privacy and multi-span staging code; 10 independently defensible valuable source-stated predicates + 10 normal negative controls are sufficient if authentic. Keep original user-reported statuses and proposed vs observed decisions; do not count a question or unexecuted task as a completed outcome. Freeze source IDs, original complete message SHA256, source offsets, class/time/project, labels and negative controls BEFORE the new model sees them. Retain a 0600 private manifest, sanitized reviewer packet, unused fresh Graphiti group and immutable digest; do not mutate or clear an executed group. Complete proper native scope/capture raw opportunity denominator and typed privacy/size/relevance exclusions.

Prepare, source-authenticate and CPU-preflight the new **single-run** Hermes launcher and scorer, using the accepted EX bridge and --finite-batch on --novelty-policy recall --source-recovery on --resilient-discovery on --claim-evidence on --source-exact-complement on --balanced-dedup on; original chat-fast model settings, 24 clusters / 72 candidates / 3600 seconds. This does NOT grant permission to run the new inference until Central has accepted the fixed-source regression result and independent new source/label freeze, as required by the governing ADR. The authorization continuation should use this SAME prepared launcher, not create another setup campaign.

Keep prospective acceptance unchanged: >=85% independently valuable target coverage (>=9/10), >=90% grounded precision, >=75% useful among grounded with >=8 independent useful persisted facts, zero source/privacy/EX/wrong-group/false-verification breaches, complete positive remote ReviewStore/UUID mapping, meaningful extraction/retrieval readback and Wilson 95% uncertainty. A successful EX kernel or source validator is not a substitute for useful factual recall.

## D — One evidence return, one eventual PR

After CPU verification and prospectively honest new cohort freeze, create at most ONE sanitized evidence-only commit on the SAME branch under docs/issue-91/evidence/92-balanced-completion/. Source/test GitHub edits prohibited. Authenticate current remote head before non-force push and independently read back exact remote ref/tree/blobs. Keep original model replies, raw source transcripts, credentials, live service logs and private manifests in 0700/0600 private host storage; publish only bounded safe excerpts, IDs/digests, stage verdicts, confusion table, source/test exits, frozen cohort fingerprints and GHDEV-10 friction.

One handback:
RESULT=READY_FOR_ONE_FINAL_PROSPECTIVE | SOURCE_REMEDIATION_REQUIRED | COHORT_NOT_RATIFIABLE | BLOCKED
SOURCE_SHA=<full verified tested source SHA>
EVIDENCE_SHA=<full sanitized remote commit SHA or blocker>
TESTS=<all native exit codes/counts>
A3_LOSS_LEDGER=<v3-02/v3-05/v3-07 true first-loss stage, exact proof>
DUPLICATE_AUDIT=<five original pairs, balanced-mode applicability>
A1_DENOMINATORS=<raw vs qualified population accounting>
A3_BATCH_IDENTITY=<immutable actual batch ID and transcript mismatch>
NEW_FREEZE=<private immutable digest, predeclared predicates and 20-case sanitized hash roster>
NEW_GROUP=<genuinely empty>
RUN_PREPARED=<source exact SHA/EX positive/negative/once-only/scorer>
HERMES_EXEMPTION=preserved
COMMAND_SHAPE_FRICTION=<GHDEV-10 requested/effective/provenance/effect/repair>

If first-loss evidence identifies a material new Central-owned source defect, return it with exact source, reproduce test, minimal proposed remedy and all other completed evidence/next cohort preparation in the SAME handback; do not start a new experimental or patch side-campaign. If it instead shows stochastic selection omission without source defect, retain this direct evidence for Central's prospective readiness determination; no speculative prompt sweep. Do not add new PRs or change the issue's standards.

Goal: the next Central reply should adjudicate ONE completed diagnostic + frozen new cohort and, if justified, authorize its already-prepared single prospective qualification; following terminal acceptance should proceed to ONE #92 PR and closure.
