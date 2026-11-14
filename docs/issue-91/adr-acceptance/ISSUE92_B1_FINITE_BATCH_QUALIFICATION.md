# Issue #92 — B1 finite-batch representative selection: one consolidated exposed qualification

**Authority:** #92 and `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md`; detailed design in `docs/issue-91/adr-acceptance/ISSUE92_POST_D3_ORDER_NEUTRAL_REPRESENTATIVES.md`.
**Status:** Central-authored development-only implementation staged; native host tests and actual model/Graphiti behavior NOT YET QUALIFIED.
**Branch:** `work/91-memory-utility-r1`.
**Treatment sources:** matched old incremental D3 corrected arm `a19e82c7ab68e710339dfd8b4f1381c75b37e8a5`; new finite-batch source `8a112799a7a42b47c5a044d21aa11ef8ebe21b59`. Subsequent evidence/docs-only commits MUST retain the same implementation blobs.
**Original frozen exposed source:** private `/tmp/opencode/issue92-adr-qual/freeze.json` SHA-256 `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f`, 24 clusters / 16 valuable durable targets / 11 nonvaluable / one capture-ineligible privacy control. D3 historical evidence commit `944f720e60d4071e95b096f851c6c5bbbfeb1e68`. No new holdout or retroactive source/label changes.

## Central implementation and intended invariants

- **Opt-in only.** `curator-cli.mjs drain --finite-batch on --max-clusters 24 --max-candidates 48` selects `runAdmittedFiniteBatch` from `finite-batch.mjs`. Normal `drain`, `--fact-review on`, installed one-pass production, OpenViking and read callbacks retain their previous semantics.
- **Bounded private snapshot.** Authenticated native source queue events are selected through `selectClusters`; the finite cohort cannot silently truncate when the requested cluster bound is exceeded. Snapshot identity and exact queue event bytes are verified on restart; captured privacy/scope controls remain binding. The development group must be initially empty in ReviewStore and remote Graphiti, eliminating live old-record mutation during qualification.
- **Two independent model judgments.** Per-cluster source-first discovery proposes exact native source spans, then the standalone utility review assesses the quote's actual technical predicate and temporal/evidence class **with NO earlier same-batch facts**. It cannot treat a generic header as durable or assign `repetition_candidate` merely because an earlier weaker sibling happened to be admitted. Every proposal still passes unchanged `validateModelDecision`.
- **Joint semantic-family arbitration.** All independently utility-accepted candidates in the bounded cohort are sorted by stable identities, separated by identical group/project/workspace scopes and compared jointly in a final model call per scope. Strongly equivalent facts yield a chosen source-substantive representative; alternate candidates remain separately reviewable as DEFER, never silently discarded. Uncertain equivalence/representative quality DEFERs the family. A model label is not independent original-source entailment or an authority upgrade; operator adjudication still controls any possible replacement or supersession of an earlier terminal episode.
- **Persist plan before graph.** Snapshot, actual source prompts/replies and each pre-call intent are stored privately, atomically, write-once (0700 directory, 0600 file). Entire validated representative plan, candidate IDs, full independent review decisions and exact model-response digests are frozen before **any** approved ReviewStore record or Graphiti write intent. Distinct deterministic child identities use exact source refs and quote text, independent of arrival order; each persisted Graphiti episode contains exactly one source-validated fact. The existing `promoteOne` and `reconcile` enforce exact duplicate, real remote UUID/source proof, CAS and no-blind-replay.
- **Recovery.** Interrupted model-call intent without result is an UNKNOWN outcome, not a retry authorization. Existing complete response digests permit a model-free plan continuation; a plan and its call receipts must verify before any ReviewStore materialization. Ambiguous `add_memory` submission remains `submission_unknown` until positive remote readback; no automatic replay, deletion or reset.
- **Limits:** finite dev batch 1..24 clusters, 3..72 upper candidate bound (48 default), no silent partial cohort; operator may explicitly increase the candidate bound within the existing implementation contract if real accepted facts exceed 48. Models use the installed `chat-fast` policy. No daemon, ontology, datastore migration or generic multi-agent redesign.
- **Known limitation:** the arbiter makes a semantic utility/novelty judgment, not proof of exact semantic entailment. All independent source labels and source-supported meaning must be adjudicated against original evidence. The versioned development-only plan is deliberately one cohort per fresh disposable group, not a production rolling-window scheduler. Do not activate/roll out before later architecture acceptance.

## A. Native source verification (CPU-only, first gate)

Fetch and authenticate the exact current GitHub branch HEAD, prior D3 source and B1 new source. Read governing ADR, current #92, relevant AGENTS.md/GHDEV contracts, D3 handback, this contract, and `finite-batch.mjs`/`finite-batch.test.mjs`/`curator-cli.mjs`. Verify that the D3 preexisting `core.mjs`, `worker.mjs`, `fact-review.mjs`, `model.mjs`, `model-policy.mjs`, capture queue and Graphiti source-index blobs remain unchanged in the B1 source; only new finite-batch module, its tests and explicit CLI opt-in are intentional production-path modifications.

Run each command with its actual producer exit (do not pipe into tail/grep for proof):

```bash
node --check docs/issue-78/v2-curator/finite-batch.mjs
node --check docs/issue-78/v2-curator/finite-batch.test.mjs
node --check docs/issue-78/v2-curator/curator-cli.mjs
node --check docs/issue-78/v2-curator/fact-review.mjs
node --check docs/issue-78/v2-curator/worker.mjs
node --test docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/fact-review.test.mjs
node --test docs/issue-78/v2-curator/curator.test.mjs
node --test docs/issue-78/v2-curator/issue92-source-fact.test.mjs
node --test docs/issue-91/adr-acceptance/adr-causal-audit.test.mjs
npm run check
npm test
```

**Important:** `npm test` runs the root operational-plugin suites and does NOT run the issue-78 curator-specific test files; all explicit focused suites are mandatory. Central performed only V8 parsing and pure arbitration smoke tests, not native Node tests. If a test fails, independently locate source versus fixture/command defect. Resolve *mechanically obvious* test-message/casing/import/host issues directly, preserving the invariant. Do not weaken an assertion, modify target semantics, change model policy or push a substantive code change under a mechanical-fix label. A real code defect requires a precise Central handback, not a locally invented algorithm.

## B. One paired exposed B1 source/model qualification (GPU/EX/Graphiti)

Prepare the previously authenticated **exact 24-cluster** original source cohort in two fresh empty disposable groups and state roots:
- `b1:previous`: exact `a19e82c7...`, incremental `runAdmitted` with `factReview=true`.
- `b1:finite_batch`: exact `8a112799...`, `runAdmittedFiniteBatch` via `drain --finite-batch on --max-clusters 24 --max-candidates 48` (or a disposable one-shot adapter only if the existing EX wrapper cannot forward the new opt-in CLI argument without bypassing its authority).

Use unchanged `chat-fast` (temperature 0, max_tokens 1600, `json_object`, timeout 90s), identical native events/context/group/project/workspace/time and no additional model provider/third arm. The candidate arm must authenticate the exact same 24 clusters; if a cohort-limit or group-mapping discrepancy appears, correct the **disposable staging**, not source validation or frozen labels.

Use the accepted canonical EX post-exit wrapper: real harness exit, process classifier, quiet grace, flock held, production-drain serialization and scheduler-idle. Never set only an env marker as admission proof. Exactly one model attempt per permitted call; the new internal `model-calls` directory is the authoritative private call-intent/result trace. For the old arm, retain the original private discovery/reviewer tracers. Keep all source text and responses under private 0700/0600 paths; do not publish.

Both groups must start empty, and the normal `development-knowledge` production and all D1/D2/D3/historical groups must stay untouched. Run both arms once in a single EX admission sequence, retaining the lock through terminal reconciliation. No favorable-output reruns. Handle a recoverable host/service failure with the existing accepted safe service posture, but never replay ambiguous model/Graphiti calls. If a model call intent is unresolved, preserve it and return that exact stop reason; do not erase or circumvent the intent to keep the campaign running.

## C. Source-backed independent scoring and controls (CPU/read-only)

Do NOT use `adr-causal-audit.mjs` unchanged as the B1 batch scorer: its D1/D2/D3 old source pins and single-cluster response schema do not represent joint batch arbitration. Produce one separate sanitized B1 scorecard tied to the two exact treatment SHAs, original freeze and per-stage raw private evidence.

For each of 16 original independently adjudicated valuable targets in each arm, record original native source visibility, precise proposed source span and technical predicate, independent utility response, preexisting-only or joint-batch novelty decision, per-fact review/CAS and actual four-surface terminal Graphiti proof. Distinguish **DISCOVERED_OTHER_FACT**, independent utility REVIEW, uncertain family, valid representative deferred as alternative, exact-source validation failure, unknown remote state and genuine supported retention. Do not credit a weak sibling as the valuable target merely because it shares a defect family. Record first meaningful loss stage with original-source reviewer evidence.

For each of the 11 nonvaluable control targets, independently detect persisted semantic repetition/boilerplate even where source text differs; verify the one excluded privacy source is absent from ALL queue inputs and model-call traces. Count duplicate-family representatives and same-group but distinct constraints separately. Verify every persisted episode has a real UUID across ReviewStore, Graphiti MCP `get_episodes` with `group_ids` ARRAY, raw FalkorDB `Episodic` and source index. No acceptance credit for receipt-only claims or source-unsupported quotes.

Report model call counts/tokens/latency, model errors, accepted/reviewed pool size, arbitration families, active plan and manifest digests, deferred operator-workload count, no-replay/EX behavior, Graphiti drain/reconcile status, source-authorization/privacy, production-state before/after and model nondeterminism. A cohort of zero or very few persisted facts remains `INSUFFICIENT_SAMPLE` for precision; do not claim a win from low graph node count.

## D. Disposition and one final publication

The purpose is **substantially improved source-supported valuable-target coverage while suppressing generic/duplicate Graphiti pollution**, including the original Sphinx and Django order-dependent families and the separate `not_substantive`/wrong-source-span losses. This is exposed development evidence, not independent acceptance. Do not invent a retrospective acceptance threshold or count every model EMIT as a useful persisted fact.

- `READY_FOR_NEW_PROSPECTIVE_DESIGN`: material value-retention improvement relative to D3's 2/16 baseline, independent original-source proof, bounded low-value duplicate persistence, no safety/EX/remote integrity regressions, and no obvious remaining order-dependent sibling displacement.
- `REMEDIATION_REQUIRED`: an actual source-backed mechanism still loses most durable targets, alternative family comparisons are unsupported, or false-positive/duplicate pollution remains material. Return the specific minimal Central source patch recommendation, not another generic model-parameter sweep.
- `BLOCKED`: tests/source identity, verified canonical EX admission, unrecoverable model-call intent or unresolved Graphiti write prevents a legitimate result.

Publish **one** sanitized evidence-only commit under `docs/issue-91/evidence/92-b1-finite-batch/`, exact-head non-force CAS, remote ref/commit/blob readback. No raw model output, unredacted native source text, credentials, personal host paths, or full service logs. No source remote updates unless a strictly mechanical fixture/command repair is explicitly identified and separately recorded. Do not create a PR, merge, issue closure, production activation, new holdout or additional benchmark campaign in this assignment.

Return one typed handback: `ISSUE92_B1_RESULT`, full starting/ending/treatment SHAs and source blobs, all native tests and original producer exits, frozen SHA, exact EX admission, model-call intent/result counts, source/durable plan digests, 16-target first-loss/retention table, 11 nonvaluable/privacy results, source meaning/repetition reviewer evidence, family representative/order-invariance assessment, actual Graphiti terminal UUIDs, model costs and review backlog, production unchanged, sanitized CAS evidence commit/readback, root cause/remediation if needed, and `COMMAND_SHAPE_FRICTION` with event, submitted/effective command and corrective disposition.

**Completion expectation:** one complete, moderately sized Build assignment. Complete ordinary host work end-to-end; do not split into multiple micro-handoffs. Only stop for a material source/safety/EX blocker. No second prospective cohort or PR yet.
