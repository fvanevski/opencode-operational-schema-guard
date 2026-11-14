# Issue #92 ADR — One prospective two-trial qualification contract

**Status:** Central-authored prospective acceptance design, NOT a passed campaign.
**Approved architecture:** \`docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md\`.
**Baseline implementation:** \`c8eb5260f2b10832346234b1b5d0cf28302ffba8\`.
**Candidate implementation:** \`a684667a6eefa2dc19f29755bed0c3048874721d\` (includes the source-span trim and single-fact utility-label fixes).
**Historical control:** #81 14/14 remains independently historical. H2/H3/H4 and prior ADR exposed r05–r08 are *development-only and immutable*, never new holdout data.
**Scoring source:** \`docs/issue-91/adr-acceptance/{adr-target-score,adr-evaluate}.mjs\` in the newly staged scoring branch. This code is *not* the model-tested candidate.

## What this slice tests

Graphiti is a source-backed, temporally and project/repo scoped **development-knowledge graph**, complementing OpenViking's session/experience/resource continuity, not duplicating session transcripts or arbitrary output logs. Test whether the ADR pipeline improves actual retained useful development **targets**, not only recall of the already-staged queue or high precision from emitting nothing.

Keep source opportunity capture, model-visible capture, fact discovery, utility selection, deterministic validation, positive remote persistence, groundedness, usefulness, within-arm redundancy, privacy/authority, and downstream retrieval suitability in separate ledgers. An individual cluster can have multiple valuable distinct targets; each credited target must have **its own independent source-supported proof mapping**, without automatically crediting all members of a cluster. One atomic persisted fact per Graphiti episode. Up to **three** automatically emitted facts per cluster is a qualified development bound, not a permanent architecture mandate.

The scorer is a *structural validator of supplied independent evidence attestations*. It cannot itself access native SQLite source bytes, Graphiti MCP, FalkorDB, the host EX gate, or independently establish truth. Those host reads plus blinded adjudication are mandatory. No retrospective H2–H4 score repairs are authorized.

## Preregistered sample and trials

Only after exact-source tests and exposed-case readiness:

- One **new**, independent, naturally sourced **20–40 review-cluster** cohort, at least **three task families** and **ten valuable distinct durable targets**; prefer 24–40 clusters if the host corpus supports them without synthetic repetitions or cherry-picking.
- Freeze original native source opportunities *before candidate-stage filtering*, including both eligible and privacy/scope-rejected controls, source identities, hashes, family, independent source verification and an honest safety reason for ineligible material.
- Within each cluster, independently identify **all actual representative candidate durable targets**, including multiple separate facts. Each target has its own original source ref, hash, assertion/evidence hash, original-source and blinded utility adjudication. Negative/transient targets remain part of the freeze as nonvaluable controls. No model-produced target labels or source reclassification.
- Verify the automatic three-fact-per-cluster upper bound leaves >=85% *theoretical* valuable-target capacity on this representative cohort; if it does not, STOP and report the structural conflict. **Do not replace clusters just to make acceptance easier.**
- Freeze \`schema=issue92-adr-prospective-freeze-v1\`, \`source_commits\` exact identities, \`model_policy_sha256\`, \`corpus_sha256\`, \`frozen_at\`, \`ratified_at\`, \`first_model_observed=false\`, \`trials=["t1","t2"]\`, \`cases[]\` before any new inference. The frozen target labels are immutable.
- Publish **one sanitized freeze-receipt evidence commit and verify its GitHub readback before any model output**; private source/target texts stay 0600 on host. Do not leak transcript or secret examples.
- Two independently evaluated matched trials **t1 and t2**, each containing baseline and candidate arms, fixed in advance. Four fresh disposable source/review/Graphiti groups overall. Same raw source opportunities and eligible controls, same clustering and frozen model alias/policy, changed candidate implementation only. No favorable trial substitution, no pooling across trials to satisfy sample minimum, no extension after output.

Model stochasticity is an *observed variable*, not an excuse to switch model or demand impossible bitwise determinism. Retain the actual local \`chat-fast\` settings unless a source-backed incompatible backend problem requires Central review. Report each trial's independent outcome and uncertainty. Two trials may differ; never pick the better one.

## Gate and scoring contract

Run from scoring HEAD after native Node tests:

\`node docs/issue-91/adr-acceptance/adr-evaluate.mjs preflight <PRIVATE_FREEZE_JSON>\`

After the EX-gated four arms are terminal, source and remote readbacks are complete and independent blinded fact/target reviews are frozen:

\`node docs/issue-91/adr-acceptance/adr-evaluate.mjs score <PRIVATE_FREEZE_JSON> <PRIVATE_T1_OUTCOMES_JSON> <PRIVATE_T2_OUTCOMES_JSON>\`

Each \`issue92-adr-trial-outcomes-v1\` file binds:
- the **SHA-256 of the exact private freeze bytes** in \`freeze_sha256\`;
- actual baseline/candidate source commits, frozen policy digest, trial name and first model timestamp;
- EX admission, no active interactive harness, same-arm policy, all terminal statuses, zero unresolved remote submissions, production unchanged;
- **every** frozen raw source opportunity's admitted/visible/drop reason;
- **every** frozen target's independently adjudicated discovery, selection, deterministic validation, actual remote persistence and explicit reason; and
- **every** remotely persisted episode's true UUID, original source handle, exact assertion SHA, grounded/useful/redundancy/privacy/authority/fabrication adjudication, and positive readbacks from ReviewStore, Graphiti MCP, raw FalkorDB and source index.

The scorer requires independent source-supported target matching to grant a durable-value retention credit. An episode with another useful but unrelated claim in the same cluster does not automatically preserve the frozen target. There is a hard upper bound of three actual episodes per frozen cluster.

The retained project acceptance targets remain:
- >=85% high-value source capture, >=85% valuable-target selection and >=85% *fact-supported durable-target retention*, separately measured;
- >=90% grounded precision;
- >=75% useful among grounded persisted with >=8 independently grounded candidate facts **in each trial**, not pooled;
- no loss of baseline-retained useful valuable targets;
- less low-value persistence, or non-inferiority when baseline low-value persistence is zero;
- no within-arm redundancy regression; zero privacy, fabricated-source, source-authority and EX violations; no unresolved Graphiti submissions.

Each pre-registered trial must meet its own gates. Do not convert a missing sample into PASS. The evaluator returns \`INSUFFICIENT_SAMPLE\` where applicable, while separately disclosing any definite failures. Preserve all metric denominators, per-trial target IDs, Wilson uncertainty, and source-specific causes of misses.

## Operator/process boundary

Interactive OpenCode must **never** perform model or Graphiti writes. Inspect the installed canonical post-exit gate, not only the inherited \`GHDEV_MEMORY_POST_EXIT_LEASE=admitted\` marker. An env marker alone is *not* evidence of no active harness, lock ownership, quiet grace or legitimate exclusive admission. The launcher must wait for the harness to exit, prove actual canonical EX eligibility, and then run a **single exactly-once four-arm campaign**, using existing no-replay reconciliation and stop-on-unresolved semantics. If host tool rules require launching an already-armed one-shot before TUI exit, do that and then exit; report the authenticated launcher outcome on return. Never manually set a lease marker to bypass the gate.

A Graphiti outage is diagnostic; preserve ambiguous writes and do not blindly replay. Safe service repair may be done within scope only when no unresolved remote submission is concealed. Do not reset production or already seeded groups. Keep \`development-knowledge\` and all historic groups unchanged. Real source/Graphiti reads must use the actual native API, record the source and runtime identity, and retain private evidence for Central if further review is needed.

## Independent review and disposition

Before result scoring, independently blind the model arm and curator utility class while assessing the exact raw native text, fact assertion, evidence class, temporal status, domain/repo scope and future development utility. A user statement/assistant hypothesis is not promoted to an independently verified fix merely because its quote is exact. A model's paraphrase remains \`review_only_unverified\` unless separately proven and approved by Central. Check source ranges after trim and 25–450-char bounds against the actual candidate excerpt. Confirm actual UUID format; if any published ID is privacy-redacted to a digest, label it \`uuid_sha256\`, not \`uuid\`.

Do a **small, bounded fresh-session retrieval spot-check** that Graphiti answers project-knowledge queries with traceable facts and does not inject irrelevant session narrative; record OpenViking coexistence when accessible. Do not expand into #93's ranking or #94's full installed deployment.

Compare prior exposed #81/H2/H3/H4 findings to the new prospective results only as *context*, not alternate scored observations. If a source/validator/scorer defect or capture flaw is exposed before freeze, resolve it centrally or via explicitly authorized semantics-preserving mechanical repair, rerun native checks and use the then-current **exact source pin** with Central approval. Do not silently move the source pin, revise frozen targets, vary execution policy, or alter the acceptance gates after first model output.

## Publication and completion

One sanitized final evidence-only commit on the existing \`work/91-memory-utility-r1\` branch, exact-head CAS, no force push. The freeze evidence commit is separate because its chronology must precede model inference. No PR, merge, issue closure or production activation.

Return the two scorer outputs and their SHA-256 digests, per-arm raw eligible/visible captures, per-target discovery/selection/retention, positive per-fact remote receipts, all individual gates and uncertainty, missed targets by first loss stage, resource/review costs, correctness controls, native suite exits, source and production identities, unchanged historical records, limitations, command-shape friction and one concrete next action.

**Stop boundaries:** exact source mismatch, invalid preflight or structural feasibility, unsatisfied hard source/privacy contract, active harness/incomplete EX admission, unknown remote submission, or semantic scorer/runtime defect that prevents truthful qualification. Do all other safe diagnostic work in the same consolidated assignment; no repeated exploratory handoffs.
