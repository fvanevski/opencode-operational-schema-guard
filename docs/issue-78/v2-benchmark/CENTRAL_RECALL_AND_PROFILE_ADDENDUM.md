# Issue #81 — Central adjudication addendum, Nov 4 2026

This is additive analysis of the immutable `81-adjudicated-quality-v1` packet at `87bdc7320c2e291e55c882bef1b190b501644886`, **not a rewrite of the accepted observation hashes, labels, targets or Graphiti state**.

## Policy decision

The operator defined `chat-fast` as a **non-thinking** alias. The effective LiteLLM alias must use `enable_thinking: false`; curator calls with `model=chat-fast` must omit `reasoning_effort` altogether. For thinking tasks use a separate `chat-review` or `chat-audit` alias with thinking enabled and explicit effort if appropriate, including `low` for review. A curator-specific `max_tokens=768` option is independent of the switch. The current user-provided config matches this intent on disk, but running-proxy loaded-byte/epoch evidence remains host-bound.

The prior no-thinking benchmark succeeded under a different alias epoch. The later holdout initially failed when `chat-fast` had `enable_thinking:true` and client sent `reasoning_effort:none`. The prior evidence remains valid as historical testing; the new code prevents repeating that contradictory chat-fast request. Do not configure a global NInfer thinking flag, relax model-validator admission, or send explicit `reasoning_effort:none` through `chat-fast`.

## Published accounting correction

The post-exit holdout report incorrectly added reasoning tokens separately to completion tokens. The OpenAI-compatible response usage has completion **including** reasoning. Published fields: prompt 2,913; completion 1,677; reasoning subset 1,454; corrected **total 4,590**. Original `native-gap-analysis.md` wrote 6,044. That document is historical evidence and remains immutable; only use corrected totals for new comparisons.

## Recall closure blocker

The original, ratified scores **remain FAIL**: 27/37 = 73.0% development and 3/6 = 50.0% holdout candidate recall, below unchanged 85% threshold. Durable EMIT precision reported 9/9 and 1/1; this does not repair omissions. The 9-case holdout was already scored; any future source changes informed by its three misses must treat it as an exposed regression set, not an independent fresh holdout.

The 13 misses span tool/test outcomes, direct/historical context and conflict. The historical #79 native receipt demonstrates shell `result.output.exit` can be captured in stock V2. A categorical claim that stock V2 never supplies tool exit/output is unsupported. Root causes must be inspected **per frozen native event**; neither a positive label nor an absent candidate alone justifies widening source admission. Privacy/wrong-group and remote Graphiti no-replay invariants remain authoritative.

This addendum does not grant #81 acceptance, source merge, deployment or issue closure. One bounded offline/CPU diagnostic is the next gate before a consolidated Central adapter remediation or transparent below-target disposition.
