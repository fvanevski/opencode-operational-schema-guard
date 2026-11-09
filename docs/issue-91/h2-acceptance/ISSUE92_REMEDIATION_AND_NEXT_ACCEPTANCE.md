# Issue #92 — bounded selection repair and source-supported coverage qualification

## Central implementation authority and intent

This Central-authored patch corrects two demonstrated evaluation problems without weakening source, safety or model-policy contracts:

1. Prompt selection is underspecified for **reusable negative technical findings**. The exposed H2 firecrawl schema-validation pair (\`i92h2-15\` / \`i92h2-16\`) was baseline-useful and candidate-SKIP, despite the pre-registered \`useful_negative\` class. Add explicit selection instructions only; do **not** weaken the exact extract validator, invent verification, force EMIT, or change Graphiti extraction.
2. The original H2 scorecard credited every **cluster member** when a single persisted fact was useful. New acceptance must measure **fact-supported original-source coverage**. Historical H2 scorer and published results stay immutable; use the independent \`h2-coverage-v2.mjs\` on the next prospective cohort.

The v2 CLI is:
\`\`\`bash
node docs/issue-91/h2-acceptance/h2-coverage-v2.mjs score-v2 \
  <private-ratification-json> <private-paired-outcomes-v2-json>
\`\`\`

Run \`node --check\` and \`node --test\` on both new and existing test files. The v2 tool reuses historical source/EX/receipt validation before imposing its tighter facts-to-original-source mapping. It does **not** contact Graphiti or independently inspect private source text: the host adapter and independent AI adjudicator must do that, preserving exact source hashes, source handles, fact assertion hashes and true remote proof. The v1 score command and sealed H1/H2 output must not be overwritten.

## New outcome additions (same outer \`issue92-h2-paired-outcomes-v1\` shape)

- \`fact_coverage_version: "issue92-fact-support-v2"\`.
- \`source_cases\`: exactly one per ratified case, with \`id,source_ref,source_sha256,original_source_verified:true\`. The ref/hash must come from original native \`opencode.db\` evidence, not model inference.
- Each arm case includes \`ingested:boolean\` from actual source-to-candidate-queue provenance, separate from existing \`captured:boolean\` which records curator decision/case selection. Never infer ingest from a persisted fact or use EMIT as ingress capture.
- Each arm includes \`cluster_decisions\` with counts of actual *review clusters* (EMIT/SKIP/DEFER/MERGE/SUPERSEDE_PROPOSED) verified against review storage. The scorer labels case-decision counts separately.
- Each persisted fact retains all v1 fields and adds \`extracted_source_ref\` (the sole source cited by the actual persisted assertion), \`remote_proof.exact_source_ref:true\` (positive raw remote readback) and \`supported_cases\`: per independently *fact-supported* case, \`case_id,source_ref,source_sha256,exact_assertion_sha256,exact_assertion_in_original_source:true,reviewed_independently:true,rationale\`. \`exact_assertion_sha256\` is the **exact assertion bytes** hash matching the fact's \`source_excerpt_sha256\`; verify the same assertion exists in each credited original case. A cluster member without that exact support gets **no retained credit**. A fact may legitimately support several cases only if the exact assertion is independently present in each original source; never credit merely because cases shared a session/cluster.
- \`redundancy_evidence\`: when \`redundant:true\`, record \`{basis:"within_arm_repeat",other_record_id:<same-arm-record-id>,reason:<bounded factual rationale>}\`. Cross-arm similarity is not redundancy. If \`redundant:false\`, omit this field.

The scorer preserves pre-registered numeric thresholds, now distinguishes ingress capture, curator selection, and fact-supported retention; also checks within-arm redundancy independently from low-value reduction. The historical H2 scorecard remains unchanged (and its former 11/19 cluster-retention must not be reused as fact-level truth).

## Local Build campaign — one cohesive assignment

1. Fetch exact Central-staged HEAD and read AGENTS.md + Issue #92 plan. Materialize the new source/test artifacts only after fetch. Execute focused source/scorer tests and relevant broader repository tests, preserving native producer evidence. If tests reveal a Central source semantics defect, stop with minimal reproducer; do not fix by weakening validation.
2. Reuse **exposed** H1/H2 source cases in a **development-only** quick local-model diagnostic qualification, under the native post-exit EX gate. Verify the candidate can distinguish the known firecrawl durable schema negative from ephemeral failures while retaining exact-source/authority controls. The previous H1/H2 receipts remain historical: never reprocess/rewrite their fixture Graphiti groups. Use fresh disposable development groups and source+model identity, and do not overfit a formerly untouched holdout.
3. Prepare **one new untouched multi-family prospective holdout**, drawn from genuinely different source/fact families, preferably 30–45 cases if available, with ≥20 independent cases, ≥3 families, ≥10 AI-ratified valuable cases and negative/privacy controls. A new cohort is necessary because H1/H2 are now exposed. Keep cohort size practical; do not manufacture low-value or force high-value to hit a target. Preserve the original rubric/thresholds and label all pre-output decisions with immutable hashes. User authorizes independent AI ratification instead of human review. Establish no overlap of native sessions/message/source **or fact/fix families** with exposed H1/H2/#81.
4. Before inference, create one small sanitized chronological freeze receipt by **one evidence-only exact-head CAS commit** on the existing branch. The new scorer and source candidate SHA stay fixed across all subsequent arms. Candidate version is the Central source patch commit; baseline remains the accepted \`main\` SHA. New campaign may compare baseline versus new candidate in a matched post-exit four-arm run; development diagnostics are reported separately. No PR, new issue, production activation, schema/service change, queue reset, or rewritten old results.
5. Prepare and execute one EX-admitted post-exit run after harness exit, with positive Graphiti receipts. If a single Build session cannot itself observe its post-exit run, hand back the one-shot action and continue in one final reconciliation pass once native output exists. Use genuine native lease/quiet grace/at-most-once and preserve remote ambiguity instead of replaying. A detached launcher must not mistake \`opencode serve --service\` for an interactive TUI: mirror the installed gate's effective process classifier or simply let the native EX admission govern.
6. Independently verify all persisted UUIDs against Graphiti MCP **and** raw FalkorDB (including content and source-index membership), and adjudicate their exact original-source assertions **blinded** to arm/utility class. Record source_case map, evidence for each supported case, grounded/useful/redundant/privacy verdicts, missed baseline-useful cases and all numeric gates with the versioned scorer. No retroactive ratification edits. Publish one sanitized final evidence-only commit and return complete typed handback.
7. If failure proves a new source semantic defect, give Central a precise source-excerpt-based root-cause proposal and failing regression (no uncontrolled local production patch). If actual result is insufficient/fails despite a correct process, report so; do not expand the revealed cohort or invent sample. Avoid extra handoff loops by completing safe evidence/diagnosis in the same campaign.

## Safety and implementation ownership

Central owns source semantics and scorer changes. Local Build owns host integration and evidence, restricted AI adjudication, disposable group setup and minor mechanical fixture/command repairs. It may correct routine environment faults inside this scope, not change the source-gate, privacy filter, model identity, scoring thresholds or production activation. Existing \`development-knowledge\` must remain untouched.

Use fresh exact-head source/worktree evidence, no force push, no PR or merge. Final issue acceptance is **not** automatic with a successful runner: all pre-registered gates and independent Central review apply. Preserve old #81 14/14 candidate capture control.

Required host result fields: exact HEAD/source SHA+blob IDs, test results, exposure hashes and independent labels, pre-output freeze chronology, EX/usage/remote terminal, case-specific support mapping, v2 scorecard + Wilson, diagnostic exposed-case outcomes, privacy/authority/legacy controls, every missed valuable source case and causal classification, no-side-effects, two evidence commits, and canonical GHDEV command-shape friction fields.
