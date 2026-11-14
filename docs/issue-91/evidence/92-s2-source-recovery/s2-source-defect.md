# Issue #92 S2 — source-recovery defect and proposed patch

## Defect (real, S2 semantic source defect)

At source head `c4a804b8`, the new S2 source-recovery path in
`docs/issue-78/v2-curator/finite-batch.mjs` reads the exact source span of a
rejected quote to build the `previously_reviewed_spans` list for the second-pass
recovery discovery prompt:

```js
// finite-batch.mjs:654-659 (utility_non_substantive recovery trigger)
rejected=screen.review.map(d=>({
 source_ref:proposal.facts[d.index].source_refs[0],
 start:proposal.facts[d.index].evidence_span.start,   // <- evidence_span is undefined
 end:proposal.facts[d.index].evidence_span.end,
 reason_code:d.reason_code
}));
```

`proposal.facts[i]` is the output of `validateFactDiscovery` (fact-review.mjs).
That function builds each fact with an `evidence_span` (fact-review.mjs:94), but
then routes the facts through `validateModelDecision` → `validateDecision`
(core.mjs). `validateDecision` freezes each fact to a **fixed field set** that
omits `evidence_span`:

```js
// core.mjs:142-145
return Object.freeze({assertion:f.assertion,kind:f.kind,
  source_refs:[...f.source_refs],evidence_class:f.evidence_class,
  scope:{...},observed_at:f.observed_at,temporal_status:f.temporal_status});
```

So `proposal.facts[i].evidence_span` is always `undefined`, and the
`utility_non_substantive` recovery trigger throws
`TypeError: Cannot read properties of undefined (reading 'start')`.

### Scope of impact
- The `discovery_skip` recovery trigger (first discovery returned `candidates:[]`)
  does **not** build `rejected`, so it works at head.
- The `utility_non_substantive` recovery trigger (discovery found candidates but
  utility rejected all as `not_substantive`/`transient_execution`) **crashes** at
  head. This is exactly the weak-header-utility-rejection case S2 is designed to
  recover, so the defect compromises the source-recovery qualification.
- Two S2 regression tests fail at head (both hit the `utility_non_substantive`
  path); all other focused suites and the root `npm test` (524/524) pass.

### Proposed patch (additive, post-validation provenance)

Re-attach `evidence_span` to each `validateFactDiscovery` output fact after
validation, in `fact-review.mjs` `validateFactDiscovery`. It is provenance
(immutably tied to the authenticated source offsets), not a new validation input,
so it does not change the source-extraction gate. See
`s2-proposed-source-patch.diff`.

Validated: with the patch, `finite-batch.test.mjs` is 41/41 and `npm test` is
524/524 PASS; no other suite regressed and no assertion was weakened.

### Disposition
`REMEDIATION_REQUIRED`. The patch is a 1-file, 8-line additive change to
`fact-review.mjs` retained for Central adjudication. It is **not** committed to
source in this evidence-only campaign. The post-exit run at head will reproduce
the crash on any cluster that reaches the `utility_non_substantive` trigger;
applying the proposed patch before the run enables the full source-recovery
qualification.
