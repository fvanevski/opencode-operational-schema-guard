# Issue #81 — Risks and Unmet Gates (81-recall-remediation-v1)

## Unmet gates (honest, not waived)

1. **candidate_recall (staged source) = 0.8333 < 0.85 → FAIL.** Sole cause: `dev-p-codeprose` (multi-line native prompt) lost by the staged `promptText()` (defect #2). The bounded repair (scratch-evalfix) closes it to 1.0000. **This is the blocking gate.** It is not waived; it is met only under the bounded repair, which is a candidate-adapter diff awaiting Central.
2. **durable_grounded_precision (≥0.90) = UNVERIFIED.** Requires the post-exit model drain + independent operator fact verdicts. The drain is armed and completes post-exit.
3. **semantic_recall (≥0.80) = UNVERIFIED_UNTIL_FRESH_CLIENT.** Requires a genuinely new installed native session with the merged main candidate — a separate post-merge evidence gate (not this campaign).
4. **post_exit_p95_seconds (≤900) = UNVERIFIED.** Finalized by the post-exit drain readback.
5. **Human ratification = PENDING.** Operator packet 1 is READY_FOR_OPERATOR_REVIEW; no AI-invented verdicts. Packet 2 (fact-level) is pending the drain.

## Residual risks

- **Defect #2 is a substantive candidate-adapter change.** It is demonstrated and bounded (minimal diff + focused regression) but **not** merged; the staged source at `7b7d626` still loses multi-line long prompts. Until Central lands the repair, the candidate's real-native recall on multi-line messages is capped at 0.8333 on this dev roster.
- **Defect #1 (evaluate qualification-group identity)** affects multi-group qualification receipts; bounded repair verified on scratch.
- **Residual-suite fixture repair:** `81-capture-closeout-v1/events.mjs` was a missing disposable fixture (snapshot of staged `events.mjs` with `read` in `FILE_TOOLS`). Repaired locally; the 47/47 pass is a **repaired disposable fixture**, not the frozen committed suite — the qualification identity is recorded.
- **Independent holdout is small (5 cases, 4 valuable).** It is blind and non-overlapping with the dev group and the prior exposed holdout, but a small denominator makes recall sensitive to single cases. The contract requires a *representative* roster; this is a cohesive continuation, and a larger prospective holdout can be added if Central requires it.
- **Post-exit drain is single-shot and bounded.** No second always-on retry loop; an ambiguous remote Graphiti write retains EX (no blind replay). If the drain is unresolved at readback, it is reported as unresolved, not forced to PASS.

## What is explicitly NOT done

- No new PR, no merge of #83, no change to production aliases/Graphiti/EX, no close of #81/#78.
- No production `ghdev_gh_mcp` mutation (4-episode baseline intact).
- No second implementation PR; the two defects are supplied as a minimal complete diff + focused regression to Central.
- No blind reuse of the prior exposed 9-case holdout.
- No `reasoning_effort` on `chat-fast`; no LiteLLM/NInfer mutation.

## Final installed merged-main fresh-client acceptance

Remains a **separate required post-merge evidence gate**. An isolated pre-merge native-client probe (this campaign) is helpful but not a substitute.
