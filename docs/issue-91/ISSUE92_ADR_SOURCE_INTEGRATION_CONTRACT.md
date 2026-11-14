# Issue #92 — ADR implementation checkpoint: high-recall capture and per-fact curation

**Authority:** \`docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md\`.  
**Purpose:** executable implementation, not a change to frozen H2/H3/H4 evidence, acceptance rubric, or host installation.  
**Baseline:** \`main@c8eb5260f2b10832346234b1b5d0cf28302ffba8\`.  
**Rejected H4 candidate:** \`e0360f03bbaf2d47f5ad167ff0c57c021cc12aed\`.  
**Stage-1 candidate SOURCE:** commit \`e0841e96fe6e091c2d8284f7c1868d08b5a3ebd8\`.  
**Production:** DO NOT ACTIVATE until independent regression, security, replay and host EX qualification, and reviewed-source/CI gate.

## Changes implemented centrally

1. **High-recall interactive capture:** \`events.mjs\` no longer uses fixed read-only command-name or test/error keywords as hard exclusion criteria. Tool output markers may prioritize evidence excerpts but not suppress ordinary safe results. Authenticated \`read\` events are represented as content-free \`file_access\`, never a fictitious file modification. Safe structured/mixed JSON user prompts may be admitted; code braces are no longer an automatic relevance veto. Existing complete-message privacy/self-context checks, native IDs, source scopes, bounded windows, no missing-result fabrication and queue limits remain. \`plugin.mjs\` records aggregate prompt/tool admission filtering, without private event text.
2. **Source-range fact discovery:** The post-exit model may propose 1–3 independently useful atomic spans per review cluster. It can return \`evidence_span:{source_ref,start,end}\` instead of reproducing verbatim text. The deterministic validator alone computes the final 25–450 character exact assertion from the supplied normalized source excerpt, checks every source/authority/temporal/scope field, and rejects invented or out-of-range spans. Each proposed fact must independently carry a durable \`utility_class\`; the top-level class preserves old one-fact compatibility.
3. **Separate claim from evidence:** The model may attach a bounded \`normalized_claim\`; if different from the exact span it is stored privately as \`review_only_unverified\` metadata and NEVER treated as an automatically authorized graph claim. The automatic persisted assertion is the exact source span. Independent semantic entailment verification of normalized claims is **not implemented in this stage**, and must not be inferred from token similarity or model self-report.
4. **Bounded atomic fact identity:** For 2–3 validated facts, \`ReviewStore.createBundle\` freezes a private local manifest BEFORE generating separate deterministic child review IDs. \`restoreBundles\` reconstructs incomplete children without re-calling the model. Each child has one fact, its own operator-CAS review state, Graphiti episode name/UUID, positive source-index/remote reconciliation and non-replay behavior. Common source event IDs belong to the parent cluster; a sibling SKIP/DEFER may not override another persisted child. Historical one-fact records and old multi-fact mixed-episode refusal remain supported.
5. **Regression additions:** capture compatibility/security tests, offset/hallucination tests, per-fact durable classification, two actual mocked Graphiti episodes/indexes, and interrupted child-manifest recovery.

## Scope of this qualification

Run focused Node tests, relevant full repo check, and host-native source-opportunity capture audit. Use the **exposed** #81/H2/H3/H4 evidence to classify losses as raw data absent, adapter rejection, admitted but not discovered, model utility SKIP/DEFER, validator rejection, duplicate, remote write, or unsupported semantic inference. For post-exit local Qwen, use the installed exclusive EX gate and fresh disposable review/Graphiti groups, with genuine remote receipts. A CPU-only replay can precede model use. At least one representative mixed cluster should yield two useful facts with two *different* Graphiti UUIDs under the same original session/cluster, if the authenticated source permits it. Do not fabricate positive results or force a second fact.

Validate negatives: secret in the tail/JSON key, wrong group/workspace, injected OpenViking/Graphiti memory context, invalid offsets, source authority upgrade, ungrounded normalized claim, exact duplicate, crash after manifest-before-child, partial remote submission, local queued ambiguity, legacy one-fact records, and operator edit/CAS. Inspect the complete source -> queue -> model -> review -> remote episode stage ledger and count false negatives and low-value promotions independently.

**Readiness:** expose-case evidence must show meaningful recovery of missing knowledge (not simply more EMIT), no grounding/privacy/authority/regression, bounded model/queue/Graphiti cost and correct identity/recovery. If results are weak, complete a consolidated diagnosis rather than consume a new untouched cohort.

**Hard exclusions:** no PR/merge/issue closure; no production activation; no new independent holdout; no H2–H4 replay/rewrites; no Graphiti, OpenViking or inference-gate replacement; no ontology, extra daemon, datastore migration or unbounded multi-fact promotion; no unsupported normalized claims in automatic graph writes.

## Current limitations to be evaluated, not concealed

- An exact span in the supplied candidate event is authoritative **for wording and source**, not independently true of the system. Temporal/evidence class must remain attached.
- The private candidate queue still stores bounded safe excerpts, not a complete session journal. Missing native result data and privacy-rejected content remain unavailable. The capture audit must quantify these limitations rather than inventing recovered material.
- Three facts per cluster is a bounded **development qualification maximum**, not an independently established production optimum. Operator acceptance should consider observed cluster cardinality, memory quality, review load and EX/Graphiti throughput before enabling it in production.
- Local model output quality, true causal semantics and end-to-end review portal rendering of sibling facts are not established by source authoring alone. Test them.
- Historical H2/H3/H4 scorers and denominators remain unchanged. A new prospective multi-fact score design will require an independent pre-output decision and freeze after exposed-case readiness.

## Required handback

Return exact source and generated file hashes, native test exits/CI evidence, representative raw opportunity/admission/loss metrics, source-range and normalized-claim outcomes, per-fact ReviewStore and remote UUID/index proofs, no-replay/ambiguous submission tests, exposed H2–H4 per-cause recovery, sanitized utility/grounding/duplication/privacy results, operator-review load and resource use, unchanged production evidence, precise remaining blockers, and canonical GHDEV command-shape friction. No public raw transcript or credentials.


## Central follow-up after exposed integration readback

The exposed integration packet at \`9de7b08f3c421e4b4e5b33eeae7e17d52847359c\`
reported 55/55 focused, 524/524 broader local tests, grounded per-fact remote
episodes, and a source-range whitespace suppression defect. Central subsequently
changed only (1) deterministic normalization of a validated quoted span to
\`slice(start,end).trim()\`, with the 25..450-character validator unchanged, and
(2) single-fact persisted utility labeling to prioritize its already-validated
per-fact class over the cluster-wide class. Focused regressions cover both.

**Causal boundary:** a clean no-whitespace span was already accepted, and
the unmodified source also persisted the exposed s4 fact in one of four
development runs. Consequently the host paired runs do not isolate a statistical
treatment effect for \`.trim()\`; the deterministic before/after span-validation
probe is the narrow direct support. The repaired source requires fresh native
verification at its exact new HEAD. No claim of deterministic LLM replay or
new prospective acceptance is made by this addendum.
