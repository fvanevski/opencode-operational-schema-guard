# Issue #81: Bounded recall correction, Central source stage

This is the cohesive source stage for a single Issue #81 follow-on PR, after
PR #88 and the 9/16 exposed post-fix regression. It does **not** rescore or
modify the immutable 8/16 and 9/16 measurements. Ratified targets remain
candidate recall >=0.85, grounded durable precision >=0.90, semantic
source-correct recall >=13/16, zero wrong-group/secret/false-verified
observations, and measured native context-hook p95 <=300 ms.

## Production changes

- Keep the existing hard Issue #N and numeric identity fences, source/group
  resolver checks, one-fact automatic injection, and 300 ms context allowance.
- Support a product name ending in `DB` when its shortened stem appears as an
  exact component of a structured config identifier; do not treat ordinary
  prose or a different product as a matching alias.
- A missing short uppercase contextual acronym is admissible only with two
  exact shared opaque query/fact identifiers and the existing topical floor.
  This is *not* an unrestricted majority-of-names gate.
- Request at most 24 Graphiti facts and apply the same bound in the memory
  resolver, candidate selector and optional reranker. Continue to reject
  unsourced, wrong-group and unconfirmed episode rows.

## Mandatory local validation: one bounded campaign

1. Fetch the exact staged branch head before local object/worktree proof.
   Verify current central stage and review the complete code/test diff.
2. Run focused Node tests covering `relevance.test.mjs`,
   `relevance-priority-regression.test.mjs`,
   `relevance-observation-replay.test.mjs`,
   `memory-core.test.mjs`, `plugin-behavior.test.mjs`, and source resolver
   and cutover tests affected by the expanded episode-anchor bound.
   Also run root `npm run check` and `npm test` as required by current
   repo gate. Capture true exit codes.
3. CPU/read-only Graphiti `search_memory_facts` at exact group
   `development-knowledge` for S03/S05/S07/S10/S13. Compare depths 12 and
   24 (using each frozen query exactly). Report episode and fact UUIDs
   including expected anchors, ordinal positions, returned group and
   per-call elapsed time. This is a *current snapshot*, not historical.
4. Run a **noninvasive private selector replay** over 24-result source-resolved
   candidates with the staged module for all 16 positives and four negative
   controls. Report source-correct counts (diagnostic, exposed, not the final
   acceptance) and false admissions. Do not use test-specific injection or
   rewrite frozen expected refs/labels.
5. Correct the N04 private observer's trace scope so it attributes only
   `trace_id == native_session` within the original case window. Cross-check
   all 20 original session IDs, preserve S12's one-block erratum, and publish
   an additive source-linked correction, not overwritten scores.
6. The 24-depth path must satisfy group/source/authority guards, no new unsafe
   negative injections, and measurable context-hook timing. The startup-to-
   model-request 1.938s p95 does **not** measure the context hook. If the
   required exact-hook timing is not instrumented, report UNVERIFIED and
   prepare only bounded reversible private instrumentation, not a weaker
   proxy criterion.
7. For GPU/model-backed native acceptance, exit the Build harness before
   acquiring the canonical shared OpenViking EX lease. Test a fresh client,
   fresh native session, actual assembled model-request GHDEV block and
   OpenViking coexistence only after source is independently reviewed and
   deployed through the authorized merge/release process.

## Stop / escalation

The 12→24 expansion is a **hypothesis**, not a verified recovery of the five
retrieval misses. If expected facts are absent even at 24 or the request
consistently misses the native 300 ms deadline, return exact failures and
alternatives to Central; do not silently raise caps further, bypass source
checks, weaken tests, add a second model or promote unreviewed code.

No new storage system, service, group migration, production Graphiti mutation,
or separate PR for each failed benchmark case. Precision's 126 human verdicts
remain an independent operator task and may proceed in parallel.
