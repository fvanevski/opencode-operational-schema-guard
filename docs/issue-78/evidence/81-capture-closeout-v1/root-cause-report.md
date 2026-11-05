# Issue #81 — consolidated capture-miss root-cause report (closeout v1)

Exact-head source: `036017058a0abdbfc20dde1fd076926ce8ef6d4f` (branch `issue/81`).
Diagnostic: `docs/issue-78/v2-benchmark/diagnose-capture.mjs` run once per split against the
original frozen corpora (dev SHA256 `22ae11e6…fb5b4`, 57 cases; holdout SHA256 `f904411e…fce4`, 9 cases)
and the published adjudicated scores. No source, label, target, Graphiti or model state was mutated.

## 1. Reproduction

All 13 adjudicated misses (10 development + 3 holdout) were reproduced exactly by the offline
diagnostic on the exact head:

| split | positive | captured | missed | recall | threshold |
|---|---|---|---|---|---|
| development | 37 | 27 | 10 | 0.7297 | ≥0.85 FAIL |
| holdout (exposed regression set) | 6 | 3 | 3 | 0.5000 | ≥0.85 FAIL |

Gate distribution: `TOOL_RESULT_EXIT_AND_TEXT_MISSING` ×6 (5 dev + 1 ho),
`PROMPT_TEXT_SAFETY_OR_FORMAT_VETO` ×6 (5 dev + 1 ho), `MISSING_SHELL_COMMAND` ×1 (ho).

## 2. Per-group root causes (13/13 classified)

### 2.1 Missing native data — shell result not persisted (6 cases)

Cases: `dev-median-testfail`, `dev-median-testpass`, `dev-sum-test`, `dev-c81-fetch`,
`dev-c80-survey` (dev); `ho-prime-test` (ho).

- Native event shape: `tool=shell`, `status=completed`, valid `callID`, `input.command` present,
  but the `result` field is **entirely absent** from the frozen native record.
- Corpus provenance states `native_shell_output_persisted: false`, and each case note reads
  "native shell stdout/exit not persisted in this host build".
- The adapter invariant is correct and fail-closed: a *completed* tool event with no result
  payload and no exit code has no independently verifiable outcome, so `fromTool` returns null
  (`if (!evidence && exit === undefined && event.status === 'completed') return null;`).
  This is not an adapter defect; the source data the gate checks is genuinely absent.
- Contrast: the selected `dev79-*` tool cases in the same corpus *do* carry
  `result.output.{exit,output}` and are captured, confirming the adapter stages result-bearing
  shell outcomes whenever the native record contains them.

**Classification: missing native data (host persistence gap), not an adapter defect.**

### 2.2 Intentional prompt safety/length filters (6 cases)

Cases: `dev-c81-prompt`, `dev-c80-prompt`, `dev-c75-prompt`, `ho-gui-prompt` (length);
`dev-dup-b75-1`, `dev-conflict-keep` (SELF marker).

- 4 long-prompt cases: `prompt.text` is present (raw lengths 3693–11452 chars) but the
  whitespace-condensed length (3659–11443) exceeds the deliberate 1100-char bounded-excerpt
  floor of `cleanExcerpt`. This is the documented size/privacy bound: prompts are vetted
  whole and rejected, never truncated (unlike assistant text, which gets a bounded
  truncation receipt).
- 2 SELF-marker cases: the prompt text matches the `SELF` regex (agent-injected
  memory-context markers such as `[OPENVIKING_CONTEXT]` / `Source reference: opencode:`).
  A prompt dominated by the agent's own injected context is not a user-stated statement;
  the veto is the intended safety behavior.

**Classification: deliberate safety/formatting exclusions (design tradeoff), not defects.**
Recovering these requires a provenance/privacy policy decision (e.g. bounded prompt
truncation or a higher floor), not an adapter code fix.

### 2.3 Adapter gap — read-only file tool not recognized (1 case)

Case: `ho-gui-read` (ho).

- Native event: `tool=read`, `input={path}`, `status=completed`, valid `callID`.
- `read` is not in `FILE_TOOLS = {edit, write, apply_patch}`, so the event falls through to
  the shell-command gate and is rejected (`MISSING_SHELL_COMMAND`). The adapter stages
  scoped, content-free receipts for `write`/`edit`/`apply_patch` (e.g. the captured
  `ho-prime-write`) but silently drops read-only file tools — a genuine, minimal adapter
  coverage defect.
- **Second, independent blocker (scope fence):** the frozen corpus declares a sanitized
  qualification scope (`workspace=/tmp/opencode`), while the native `read` path resolves to
  the real host worktree (`/workspace/opencode-issue80-terminal-recovery/...`). Even with
  the read-tool fix, `scopedFile` rejects the path as outside the declared scope. This is a
  provenance/scope-alignment decision, not an adapter matter.

**Verified counterfactual (patched-source replay in the disposable worktree):**
- Patch `FILE_TOOLS += 'read'` under the frozen scope → `ho-gui-read` still not selected
  (scope fence); dev/ho recall unchanged (27/37, 3/6).
- Same patch with the scope workspace aligned to the native path root → `ho-gui-read` is
  staged as a `file_change` / `tool-reported` receipt
  ("tool completed: read reported file operation on <relative> (not independently verified)"),
  holdout recall becomes 4/6 = 0.667.

## 3. Reconciliation with the #79 native shell-result evidence

The prior accepted #79 native pilot (`79-native-v2-20261103/host-sample-frozen.json`) captured
real stock-V2 tool outcomes with exit and output text
("tool exit 1; command: node --test score3.test.js; output: ℹ pass 0 ℹ fail 1 …").
That demonstrates stock V2 **can** expose shell exit/output when a live capture path observes
the result. The frozen #81 corpus was instead built from the **persisted** OpenCode V2 session
SQLite store, whose provenance records `native_shell_output_persisted: false`. Both facts are
true simultaneously:

- stock V2 exposes shell exit/output (proven by the #79 pilot) — the universal claim
  "stock V2 never supplies tool exit/output" is **unsupported and rejected**;
- this host's persisted session store omits shell results — which is exactly what the six
  2.1 cases show.

The #79 evidence and the current misses are therefore consistent: the misses are a
host-persistence gap in the source records, not a native event-shape limitation.

## 4. Consolidated remedy proposal (one coherent fix, not 13 microtasks)

1. **Adapter (defensible, minimal, proposed in `source.patch`):** add `read` to `FILE_TOOLS`
   in `docs/issue-78/v2-candidate/events.mjs` (one line). Read receipts reuse the existing
   `fromFileTool` scoped, content-free, tool-reported path (private-path fence, no file
   contents persisted). Focused RED/GREEN test: `read-tool-closeout.test.mjs`
   (RED exit=1 unpatched; GREEN exit=0 patched; full 68-test regression suite stays green).
2. **Host persistence (out of adapter scope):** persist shell `result.output.{exit,output}`
   in the native session store (or capture live, as the #79 pilot did) to recover the six
   2.1 cases. Production/host change; not part of this evidence packet.
3. **Prompt policy (operator/Central decision):** decide whether long prompts get bounded
   truncation (or a higher floor) and whether SELF-marked prompts stay vetoed. This is a
   provenance/privacy tradeoff; no code fix is implied by this packet.
4. **Scope alignment (operator/Central decision):** if `ho-gui-read` is to count, the
   qualification scope workspace must be aligned to the native event's real path; the frozen
   corpus bytes and labels must stay unchanged.

## 5. Regression mapping

- `source.patch` (read-tool) is covered by `read-tool-closeout.test.mjs` (scoped/content-free
  invariants, private-path veto, out-of-workspace veto, error-status receipt) and by the
  unchanged 68-test suite at exact head (all green post-patch).
- No change is proposed to prompt gates, result gates, dedup, privacy fences, queue, curator
  policy or efficiency probe; those suites (68 tests) pass unmodified at exact head.

## 6. Counterfactual coverage (not a PASS)

| scenario | development | holdout |
|---|---|---|
| baseline (frozen, current) | 27/37 = 0.730 FAIL | 3/6 = 0.500 FAIL |
| + read-tool patch only | 27/37 (unchanged) | 3/6 (unchanged; scope-fenced) |
| + read-tool patch + scope alignment | 27/37 = 0.730 | 4/6 = 0.667 |
| + host shell-result persistence | 32/37 = 0.865 (meets ≥0.85) | 5/6 = 0.833 |
| + prompt policy relength | 37/37 | 6/6 |

Numerator/denominator are the unchanged ratified positive labels; every row is a
counterfactual until the corresponding source/host/policy change is implemented and tested.
The inherent tradeoff: the two SELF-marker cases are intentionally unavailable unless the
safety veto is relaxed, which is a provenance-standard change this packet does not make.
