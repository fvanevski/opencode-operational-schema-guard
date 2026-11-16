# Issue #100 B5 — Central review of the 2026-11-16 Hermes host handback

This report records **host-attested** evidence and Central's bounded source/evidence adjudication. It is not a substitute for the private original-source exhibit, live installed-service identity, or a completed independent exact-head review. The raw archive remains **private** and is not staged into this repository.

## Evidence identities

- Tested source: `6f0d2897ac3f49ac4effb8bd18b341070f13b8e6`, PR #103, main base `658c4c96abc392bf8a100c1afd1dcfacc3adf5b0`.
- Private attached archive (outside public Git): SHA-256 `368213f7f51957243cc5b011ed9c8b6ccc39fa085a08208056130f4a73a657ac`, 10,464 bytes. Independent archive readback shows 12 data members plus manifest, 12/12 correct member byte counts and SHA-256. The manifest's `manifest_sha256` hashes the JSON before its own hash field is added, not the final physical manifest bytes; that self-excluding representation matches. Its note saying "11 data members" is a harmless count typo.
- Ordinary trusted `node-contract` at the tested source and at later source heads has passed. **A later successful CI check does not retrospectively bind the host model run to source changes made after the tested SHA.**

## Host-run result (same-model disposable-group controls)

| Metric | Plain production-style policy | Opt-in AI-authoritative policy |
|---|---:|---:|
| Candidate source inputs | 9 | 9 |
| Source-supported persisted facts *reported by agent* | 4 | 10 |
| Deferred review decisions | 3 | 0 |
| Skipped decisions | 2 | 0 |
| Established/provisional final retained | not separately classified | 9 / 1 |
| Graphiti terminal UUID/index positive readback | 4 / 4 | 10 / 10 |
| Model calls | 9 | 10 |
| Prompt/completion tokens | 16,103 / 1,217 | 6,644 / 2,190 |
| Consolidation | none | 1 provisional -> established promotion |
| Final worker result | review_required | settled |

Reported model errors were zero **after** the missing model environment was corrected, not across all earlier failed attempts. The agent reports the canonical EX lock was released, production persisted-review/episode-index counts stayed at 566/355, the production curator remained plain, and there was no production-group Graphiti mutation. These runtime facts are *host attestation*, not independent current remote/host readback by Central.

The experiment was explicitly labelled `new_synthetic_prospective`; it is not an untouched natural production cohort or final answer-quality validation. The private evidence archive contains source hashes, case labels and aggregate results, but **no per-fact original quotation / model-selected assertion / plain disposition matrix**. Consequently the reported `false_negatives=0` and `source_supported_facts=10` cannot be independently adjudicated for semantic utility by Central on this artifact alone. They should remain **UNVERIFIED** for that claim while the measured selection/terminal counts remain valid host observations. The `assistant_reported_hypothesis` labelled case `msg_100_c05` is recorded as `user-stated` in the frozen cohort, so that host case does **not** establish assistant-reported source attribution. Other existing deterministic source-class tests remain relevant.

The archive was incrementally augmented: its `evaluation.json.limitations` and `source-contract.md` still describe model inference as deferred, and `ex-run.json.reason` and `graphiti-proof.json.note` retain pre-trial language despite later executed/terminal fields. Those are **stale narrative statements**, not proof that the positive run did not occur; rely on the later explicit run/receipt fields for the reported completed trial and ask for a corrected addendum rather than silently merging incompatible fields. Archive-count `archive_source_files=4863` is not a proven before/after match to the prior 4,002 scoped snapshot; do not elevate 566/355 stability into an all-file immutability claim.

## Independent source review: bounded fixes completed after model trial

The first negative attempt used an ad-hoc wrapper invocation without the installed `curator.env` provider variables. The model rejected all attempts, but the worker/CLI additionally **collapsed local retryable NEW sources into exit 3**, a code reserved for unresolved Graphiti submission. The Python EX wrapper then retained the shared lock and repeatedly attempted a model drain with no possibility of progress. That is a distinct recovery-state defect beyond the operator invocation error.

Central staged an **autonomous-only local technical-retry exit** and a post-exit wrapper read-only reconciliation before safely releasing EX while preserving NEW source work. Ambiguous remote submission still holds EX and still may not replay. Focused tests exercise the same failure without an authenticated model and both initial/late local retry paths. This remediation **invalidates the older host source SHA** as direct host evidence for the changed recovery boundary; a bounded disposable negative-path host check remains appropriate.

Two other source lifecycle findings were corrected: (1) human `ReviewStore.change` must clear the old AI retention/source-span assessment on edits or alternate dispositions; (2) provisional recall must preserve the original `observed/historical/proposed/unknown` temporal qualification in the actual model-facing `temporal` field, not substitute a generic provisional label. Focused regressions were added to the repository's normal curator CI profile.

## Decision and exact acceptance boundary

- **Accepted:** archive identity, bounded synthetic-cohort model/Graphiti host execution, terminal UUID/index and EX-path observations **at tested source**, relative persisted-count and token-comparison telemetry, and the first actual promotion as host-attested evidence.
- **Not yet independently established:** per-fact usefulness/false negatives; assistant-reported case in the actual host synthetic cohort; causal same-request native memory answer benefit; fresh source/config promoted host behavior; and negative recovery-path host proof for the subsequent fix.
- **Do not** request final PR approval, merge or issue closure based solely on this first model handback. Request at most one narrow supplemental **evidence-only** addendum: existing private synthetic original-source/selected-fact matrix with evidence class/temporal fields and baseline disposition, a bounded missing-model-configuration EX test on the exact new source head (no Graphiti writes), and source identity/readback. No repeat of the successful positive model trial unless the relevant source contract materially changed.
- After that addendum, Central completes exact-head semantic review and late Codex review as allowed by GHDEV-05, before merge/main Verify. Genuine post-merge fresh source/config activation and native source capture remain #100 closure prerequisites; #101 owns full integrated answer/context quality.
