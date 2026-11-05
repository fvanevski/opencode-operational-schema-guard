# Issue #81 — Central disposition of closeout evidence (2026-11-04)

Source of this adjudication: immutable, source-bound [`81-capture-closeout-v1`](../evidence/81-capture-closeout-v1/root-cause-report.md), tested at `036017058a0abdbfc20dde1fd076926ce8ef6d4f`, evidence-only commit `a30758c8784b95e07655f59c0c6f1226d79ce1d9`. This decision is **not** a claim that a retested recall threshold passed or that fresh installed-session acceptance occurred.

## Verdict on the proposed read-tool source patch

**REJECT** the proposed `FILE_TOOLS += 'read'` production patch and its focused assertion `kind === 'file_change'`. The existing set is explicitly a set of **file-mutating tools** (`edit`, `write`, `apply_patch`). Its `fromFileTool` adapter emits `kind: 'file_change'` with `evidence_class: 'tool-reported'`. A read-only `read` tool does not change a file. The proposed patch would falsely label a read as a change, while its content-free excerpt has no extracted useful finding from the document. This is source/authority inflation, even when no actual file bytes are persisted and the path is private-fenced. The lone reported holdout event is independently outside the frozen workspace fence; the patch **does not increase its frozen recall**, even on the agent's own replay.

**Central correction:** keep the actual #79 production adapter and queue semantics unchanged. `diagnose-capture.mjs` now reports `READ_ONLY_FILE_ACCESS_NOT_DURABLE_FACT` for this excluded named tool; new tests ensure a read-only event does not become `file_change`, while an actual scoped `write` still does. This updates diagnosis and source contract, **not** the original frozen corpus, human labels, benchmark scores or past evidence.

A future product requirement to remember *document-reading activity* would require an independent `file_read` evidence kind, bounded path-only semantics, a relevance/filtering policy and compatible queue/model/review consumers. No such new feature is necessary to meet the current issue and it is not authorized as a one-line change.

## Host persistence versus installed capture

Six `tool=shell` cases in the #81 frozen SQLite-derived corpus have `result` entirely absent. The current `fromTool` intentionally refuses a completed shell event with no exit status or relevant result output. Recovering those six facts from this frozen corpus would require **inventing missing source** and is prohibited.

The accepted [#79 native qualification](../evidence/79-capture-complete-v1/handback.md) separately demonstrated that stock V2.2.5 `execute.after` **does** expose `result.output.exit` and `result.output.output` in the *live event*. The current [#79 plugin](../v2-candidate/plugin.mjs) binds `ctx.tool.hook('execute.after')` and immediately stages the resulting `fromTool` event in the private queue, rather than depending on a later SQLite transcript export. The frozen SQLite omission is a limitation of **post-hoc corpus source acquisition**, not established evidence of a defect in this installed live capture path. Do **not** modify OpenCode's SQLite persistence or the EX gate to repair the retrospective benchmark.

At the later merged-main fresh V2 acceptance, test **actual live** shell fail→fix→pass events using the installed source, with explicit source identity and raw-hook versus queued-event readback. This evidence can establish current product behavior, but cannot retrospectively change the human-ratified frozen benchmark or turn the exposed holdout into a new blind holdout.

## Prompt safety and coverage

Four long prompts were rejected by the existing 1100-character whole-text bounded capture policy; two injected-context/SELF-marked prompts were rejected to avoid self-ingestion or unsupported user authority. Keep these accepted guardrails intact for this slice. Do not mask the deficit by labelling long unexamined text as an extractive source, raising the 1100-character cap without testing downstream privacy/queue/LLM limits, or admitting SELF-marked content. A genuinely necessary large-prompt summarization policy would be a separate specified design change with whole-raw-prompt secret/SELF scanning, strict source scope/identity and bounded output; it is **not** a safe automatic threshold adjustment.

## Quality and merge decision

Original predeclared target: `candidate_recall >= 0.85`. Ratified frozen results remain:
- development: 27/37 (0.7297) **FAIL**;
- holdout: 3/6 (0.5000) **FAIL**, now an *exposed regression set*;
- remote verified human-grounded fact precision: 9/9 development, 1/1 holdout (small samples);
- installed natural fresh-session recall and context latency: **UNVERIFIED**.

The 6 missing shell-result fields, 4 oversized prompts, 2 SELF prompts, and 1 read-only tool exclusion explain all 13 misses. This is a **diagnostic closure**, not benchmark success and not authorization to lower target thresholds. Report failure prominently in the eventual **single** #81 PR. Source and offline diagnosis alone do not justify a new GPU/Graphiti campaign; perform production-live source observation and fresh-native memory recall at the established **post-merge** gate only after exact-head independent review, trusted CI, authorization and reversible deployment.

## Token and inference-profile authority

The original holdout curator reporting error is corrected additively: 2913 prompt + 1677 completion (including 1454 reasoning) = **4590 total**; never add reasoning a second time. Graphiti's separate extraction-model inference consumption remains **UNVERIFIED**.

Operator intent: `chat-fast` is always **non-thinking** (`enable_thinking=false` on loaded LiteLLM alias), and clients omit `reasoning_effort`; an optional `max_tokens` limit is independent. Thinking requests use `chat-review` or `chat-audit`, not a request-time thinking override on `chat-fast`. Local host verified the loaded alias config and CPU preflight; this is not an unqualified guarantee about other future proxy epochs.

## Remaining verification

Central has staged diagnostic and focused regression updates after the last local 68/68 run. **Those updated tests are not yet host-executed**. They require a single exact-head focused check before PR review readiness; no evidence from `036017058...` proves they passed on the later head. The single PR must independently pass the repository's trusted exact-head CI/review gates; no PR or issue closure is implied here.
