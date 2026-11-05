# Operator fact adjudication — corrected re-drain (2 persisted model facts)

**Group:** `cur81_holdout_cc5349fc` · **Packet:** `81-independent-holdout-v1-redrain-addendum`

The operator reviewed the two persisted assertions with their original source
excerpts, provenance, and evidence-class distinctions, and the consolidated
private operator fact-review packet. Result: **ratify with one amendment**
(FACT 1 `useful` amended `true → false`).

## FACT 1 — cluster `1fdf0eed…`, fact index 0 (persisted, receipt-bound)

- **Assertion (verbatim):** `tool exit 0; command: cd <host-home>/.local/state/ghdev-graphiti-issue81/holdout81-64d32eb7/cronparse && node --test test/; output: ℹ pass 19 ℹ fail 0`
- **Kind / authority:** `test_result` · **tool-reported** (the assertion *is* a native tool-outcome excerpt)
- **Source binding:** native `…:tool:call_65fb90d3952b50de` (observed 2026-11-04T21:45:23.442Z); episode `d4b8fff6-e89f-40c4-a81b-f3c2bf7723a1`
- **Final verdicts:** `grounded=true`, **`useful=false` (amended)**, `authority_correct=true`, `scope_correct=true`
- **Rationale:** faithful reproduction of the native tool result, correctly
  attributed to a tool-reported source. It is an **intermediate** verification
  result, not the fixture's final state (the same session subsequently reached
  22 passing tests). It remains historically accurate and useful as evidence
  supporting the red→green development sequence, but is **not** an
  independently useful durable memory fact representing the current project
  state. The existing Graphiti episode is **not** deleted or rewritten; the
  usefulness failure is recorded in the benchmark only.

## FACT 2 — cluster `8915afb0…`, fact index 0 (persisted, receipt-bound)

- **Assertion (verbatim):** `Confirmed: the implementation **already** handles it. parse("0 0 * * 7") → [0], and isMatch matches a Sunday but not a Monday. No implementation change needed.`
- **Kind / authority:** `architecture` · **assistant-reported**
- **Source binding:** native `…:message:msg_1a887bf73001vdljsbBh16k0UW` (observed 2026-11-04T21:47:11.094Z); episode `56b75c2c-e2f8-404f-baed-531ef76ce260`
- **Final verdicts:** `grounded=true`, `useful=true`, `authority_correct=true`, `scope_correct=true`
- **Rationale:** faithful reproduction of the cited assistant message; a
  meaningful implementation finding including the negative finding that a
  proposed change was unnecessary. `authority_correct=true` means the
  assertion is accurately attributed to the **assistant-reported** class —
  it does **not** upgrade the assistant report into an independently
  tool-verified implementation fact. That distinction is preserved in Graphiti
  retrieval, benchmark evidence, and any subsequent user-facing memory context.

## Deferred cluster — `9036df0a…`

The model's `DEFER` decision and reason `model_assertion_not_source_extract`
are accepted. No durable fact was emitted. The cluster is **not** included in
the durable-precision denominator, no fact verdict is invented for it, and no
further model attempt is initiated.

## Operator confirmation (verbatim)

> "I reviewed the frozen evidence and adjudicated these labels myself."

The 24 previously ratified source-case labels are reaffirmed **without
alteration** (`case_label_changes_from_provisional = 0`); the target proposal
and its signed ratification are unchanged.

## Worksheet digest chain (private; digests only)

| Artifact | SHA-256 |
|---|---|
| Frozen corrected corpus (unchanged) | `524de3ff36877442c6dc4e75edf5da9f317ba1c2e25e267b117233514e425863` |
| Signed case worksheet (14/10, unchanged) | `f6241a46ce66f2d3d29b1eb4f81f31cb498472c6d03db5b65307cfc8f9ceddb1` |
| Historical zero-fact signed worksheet (preserved) | `19f21b9db8e2a2ebda7a76f9d300bf1b35093d286c745a8c0a36ebcde587d59b` |
| New fact-level draft (`DRAFT_UNRATIFIED`, 2 slots, preserved) | `79068b04ca34bcd947c54b90414b0168c1acd430b979b706274800bf5d407eaf` |
| **Signed fact worksheet (this adjudication, `OPERATOR_RATIFIED`)** | `26c7692ddb32b8483e80c43f5cd9b93d2977d7a06e6cdaca4e581bd43095c98c` |
| Receipt-bound group observations (2 persisted + 1 deferred) | `ab66cdbe76fce2dede447b847b49157830ec74d212ed29e914714850b09b5ca3` |
| Pre-receipt observations (historical, preserved) | `6a4799c5d45f900b864da1b1734a55b20e8296f36a0335138f7cfee425b73cee` |
| Original target proposal (unchanged) | `17ffb60515f5f96f2d546fd3abf951d0bc008325e38d83145ec4f75a8c76f049` |
| Signed target ratification (unchanged) | `3e9581114047ac7416f6014a0dd6a57304dc5e5784efe39b176ced61fbb8626a` |
| **Final frozen score (this addendum)** | `c0fcb59982fdbc1f327ec2d4dd2ee0bea9c5a5b395fc225374f53a00e645b823` |
| Pre-receipt score (historical, preserved) | `9d923eea6624a999e302f844dba7315556b1a1250faa935aad725d1d41ea5e39` |

Case-ID + `source_locator` arrays in the signed worksheet are byte-identical
against the historical signed worksheet (24/24 rows, same corpus binding); the
original signed case labels are carried unchanged. The two fact-verdict slots
bind to the receipt-bound observations by `assertion_sha256` + `source_refs`.
