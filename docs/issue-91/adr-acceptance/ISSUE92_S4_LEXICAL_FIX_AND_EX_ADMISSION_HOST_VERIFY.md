# Issue #92 — S4 lexical-veto correction and EX-admission host verification

**Status:** Central source/tests staged; **host native validation and canonical EX boundary audit required**. No further model/Graphiti campaign authorized by this document. This is the next focused integration step in the existing Issue #92 implementation branch, not a new PR, issue, rollout or prospective A3 cohort.

## Authority and exact identities

- Issue #92; governing `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md`.
- Original S4 execution head `37601461b21a9d5d5634ca5683db25479937f627`.
- Terminal S4 evidence commit `c79674fa4fb39d8002c0195c4892f51fa64c14f7`.
- **Central corrective head**: supplied in kickoff; authenticate from live branch before local object use.
- Unchanged exposed corpus: 24 native source clusters; 16 valuable targets, 11 nonvaluable controls. S1 7/16; S2 9/16; S3 9/16; S4 4/16 target slots (3 distinct valuable persisted episodes).
- S4 6 terminal episodes, 6 distinct positive remote UUIDs, reported no useful retrieval hits.
- Historical S4 exposed batch and group are **immutable evidence**. Do not replay, reset, clear, relabel, or treat source changes as retroactive validity.

## Central corrective source decision

The S4 `claimHasSourceVocabulary` 0.35 veto was a deterministic false-negative mechanism before independent source-support review. It was **not** itself evidence of semantic entailment. Central replaced this gate with `claimSourceVocabularyOverlap` diagnostic-only and added private plan-level `claim_diagnostics` (claim/evidence hashes + overlap) for support attempts. Every structurally valid native-source-backed proposal can now reach the independent support critic irrespective of lexical overlap. The source-exact 25–450-character quotation, strict source membership, offsets, evidence class, temporal status, privacy, per-fact ReviewStore/UUID and independent utility review remain unchanged. Normalized claims are still **not** written to Graphiti.

New regressions include an overlap **1/3** semantic near-miss reaching support, zero overlap being reviewed and declined, malformed/forged sources still blocked, no utility call or graph write after support refusal, plus existing S1–S4 identity and ambiguous-call no-replay controls. The correction does not assert that a low-overlap candidate is supportable or useful.

## Host primary agent and scope

```text
LOCAL_AGENT_PRIMARY=build
SOURCE_GITHUB_UPDATES=forbidden
LIVE_CONFIG_MUTATION=forbidden
PRODUCTION_GRAPHITI_WRITES=forbidden
MODEL_INFERENCE=forbidden
S4_FROZEN_BATCH_REPLAY=forbidden
NEW_EXPERIMENT=forbidden
EVIDENCE_OUTPUT=private_sanitized_handback
```

Use the OpenCode `build` harness because the native tests create temporary fixture state. Fetch the required exact branch SHA first, then prove clean checkout/source blobs. Keep unrelated untracked files. Do not modify canonical gate, tests or source. Collect bounded host-only read-only authority evidence and diagnostic artifacts in a private scratch directory (0700, files 0600).

### A — CPU native correctness

From authenticated repository root, preserve actual process return codes, counts and focused failure logs:

```bash
node --check docs/issue-78/v2-curator/claim-evidence.mjs
node --check docs/issue-78/v2-curator/claim-evidence.test.mjs
node --check docs/issue-78/v2-curator/finite-batch.mjs
node --check docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/claim-evidence.test.mjs
node --test docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/finite-batch-tuning.test.mjs
node --test docs/issue-78/v2-curator/fact-review.test.mjs
node --test docs/issue-78/v2-curator/curator.test.mjs
node --test docs/issue-78/v2-curator/issue92-source-fact.test.mjs
npm run check
npm test
```

Root `npm test` excludes some curator suites. Ensure the new diagnostic is measured, not used as a source authorization check, and failed independent support remains DEFER with zero writes. No test weakening or blanket skips. If a Central-authored source defect arises, return root cause + proposed diff, not a source GitHub mutation.

### B — Read-only S4 counterfactual

Using the **existing private** S4 snapshot and frozen discovery responses, do not call the model or `runAdmittedFiniteBatch`, including its `--replay-only` path (new prompts cannot satisfy the original frozen call hashes). Call the **pure current `validateClaimEvidenceDiscovery` function** on original response content and authenticated snapshot clusters, after separately proving original prompt/response digests and snapshot digest.

Classify every candidate into: original S4 result, new structural source-validation result, overlap score, eligible to reach support, or still invalid. Use the real `validateFactDiscovery` for the result, not only a quote-length proxy. Report exact counts of additionally eligible candidates and independently valuable **target references**, avoiding cross-candidate double count. This is counterfactual *eligibility*, not evidence that a new support/utility verdict would approve. Specifically inspect g1×2, g2, dj1×2, sp1/sp2/sp8, py2/py3 and controls. Recheck g4/sp9 quoted predicate gaps; do not override justified source denials.

### C — EX admission boundary evidence, no mutation

Read the current installed canonical OpenViking EX admission-holder source/config and the actual local S4 launcher/driver, plus process-classification rules and their current installed values. Supply bounded, source-authenticated excerpts and code paths for:
- how Python holds `/run/user/1000/openviking-agent.lock`;
- when/how the Node driver receives `GHDEV_MEMORY_POST_EXIT_LEASE=admitted`;
- whether a direct terminal invocation that manually supplies that value can call model/Graphiti **without any OS-level flock proof** (review source; DO NOT actually attempt inference);
- coverage of Hermes, OpenCode, Codex, other harnesses, and what independent vLLM/Graphiti client activity is or is not serialized;
- smallest viable production-compatible authority proof (e.g., proof of inherited gate-owned file descriptor or other kernel-backed check, if host implementation supports it), with threat and failure modes;
- preservation of EX gate scheduler, quiet grace, no unresolved submissions and one-fact remote non-replay.

The documented unauthorized preflight is `NOT_ADMITTED`: 46 model calls/7 Graphiti episodes, then reset and `clear_graph`. Current six-episode S4 run is separately logged as gate-admitted, but Hermes concurrent-consumer coverage is incomplete. Do not regard the mutable environment marker as itself proof of gate ownership. Read-only host inspection only; no systemd/lock/driver/gate edit, no `clear_graph` or smoke inference.

### D — Explicit chronology disagreement

The preceding S4 handback described a preflight batch prefix `e9fc47c2`; the later audit stated the preflight and final batch IDs differ. The repository computes `batch_id` deterministically from group plus sorted cluster IDs, so identical group/corpus identity can produce identical batch IDs across a state reset.

Recover what is actually supported by retained logs. If the preflight batch ID or original model-call evidence was deleted, state **UNVERIFIED**, and explicitly distinguish **batch ID** from **attempt identity**. Never infer execution separation merely from a batch hash. Do not invent missing preflight call files/UUIDs.

## Return one handback

Provide exact host/source/execution identities, native gates + actual exits, fully validated candidate eligibility delta (not just prior 27 proxy), separate per-target coverage vs per-episode identity, private source hashes, specific EX bypass mechanism and an actionable Central-owned authority/gate correction with known installed files/interfaces. Include S4 historical safety exception, missing preflight evidence, exact chronology uncertainty, relevant command-shape friction (GHDEV-10), and confirmation of **no model calls / graph writes / source mutations** during this host validation.

`RESULT=SOURCE_VERIFY_PASS_GATE_REMEDIATION_REQUIRED | SOURCE_REMEDIATION_REQUIRED | BLOCKED`.

No S4/S5 EX run, PR, merge, production activation, evidence rewrite or Issue #92 closure.
