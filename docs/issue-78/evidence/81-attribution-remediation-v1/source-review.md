# Source & safety review — Issue #81 attribution remediation (Phase 6)

Bounded independent inspection of the exact Central diff
`941706acf155aa00502255c7ede97434e81170ba .. 8dcdf199c8b53d8e213c07427525cb0766f726ca`
(2 commits: `bbf03fb`, `8dcdf19`), limited to the implicated modules and their
directly adjacent consumers.

## Actual diff scope (verified, no drift)

Exactly the 5 intended files, 191 insertions / 27 deletions:

| File | Change |
| --- | --- |
| `docs/issue-78/v2-candidate/plugin.mjs` | +60 −23: `admittedNativePrompts` map; prompt-hook anchor termination; context-handler historical anchoring; batch flush re-ordered; bounded bookkeeping |
| `docs/issue-78/v2-candidate/association.test.mjs` | new (89 lines): genuine plugin-hook harness, 2 multi-turn regressions |
| `docs/issue-78/v2-candidate/candidate.test.mjs` | +2 −1: assistant context in the baseline regression now includes the admitted native user message |
| `docs/issue-78/v2-benchmark/evaluate.mjs` | +8 −3: `persistedMs` series; `tokens_total` null when unmeasured |
| `docs/issue-78/v2-benchmark/evaluate.test.mjs` | +32: telemetry test (missing usage unknown; persisted-only latency excludes DEFER) |

`events.mjs`, `queue.mjs`, the Issue #75 baseline plugin, and the curator modules
are untouched by the diff.

## Reviewed invariants (A–G) — all confirmed

- **A. Preceding admitted native user anchor.** Context handler walks the
  bounded recent context; each `user` message sets `historicalAnchor` from
  `admittedNativePrompts` (native ID → admitted event), and each completed
  `assistant` turn appends that anchor only. A later triggering prompt can no
  longer anchor an earlier assistant turn (old `lastAdmittedPrompt` behavior
  removed from the assistant path).
- **B. Rejected prompt terminates tool association.** `session.prompt` deletes
  `lastAdmittedPrompt[sessionID]` on entry, before the new prompt is admitted;
  a prompt rejected by safety filters therefore clears the previous tool anchor.
- **C. Batch ending in rejection.** Batch flush deletes the anchor before every
  observed prompt and re-sets it only when `fromPromptCandidates(..., {admitted:true})`
  yields sources; a trailing rejected prompt leaves the anchor cleared, so later
  tool outcomes stage with empty `related_event_ids`.
- **D. Missing native identity ⇒ omitted relationship.** `historicalAnchor` is
  null when the user message has no string native ID or its ID was never
  admitted; the assistant turn is enqueued without an anchor (omitted, never
  invented). The content-hash fallback is explicitly never mapped as a native
  ID (`source_strength === 'native-id'` + exact source-ref check).
- **E. Source IDs / evidence classes / labels / fences / privacy / SELF.**
  `events.mjs` unchanged: envelope identity, `native-id` vs
  `session-scoped-fallback` strength, evidence classes
  (`user-stated`/`tool-reported`/`assistant-reported`), group fencing,
  PRIVATE/SELF/CHATTER exclusions all intact.
- **F. Missing per-record token telemetry.** `tokens_total` is `null` (not 0)
  when no record carries both `prompt_tokens` and `completion_tokens`;
  `tokens` quantiles report `count: 0` with null p50/p95.
- **G. Persisted-only latency series.** New `post_exit_persisted_ms` quantiles
  collect `post_exit_ms` only for terminal-readback (persisted) records; the
  existing all-terminal `post_exit_ms` series and its acceptance gate
  (`targets.thresholds.post_exit_p95_seconds_max`) are unchanged.

## Safety inspection items

- **Process restart / compaction.** `compaction` clears pending batches;
  `admittedNativePrompts` (like `seenAssistant` and `lastAdmittedPrompt`) is a
  bounded process-local hint, cleared on `stop()`. After a restart, historical
  anchors fail closed (relationship omitted) until native prompts are
  re-admitted in a new process; the durable queue still owns cross-restart
  dedup. Recorded as a residual limitation, not a defect: under-association,
  never mis-association.
- **Source-event deduplication.** Durable queue `stage` → `duplicate` outcome
  plus the in-process `seenAssistant` fence; unchanged.
- **Bounded process-local memory.** `admittedNativePrompts` follows the
  existing bounds (`MAX_SESSIONS=64`, `MAX_SEEN_PER_SESSION=256`,
  `MAX_CONTEXT_MESSAGES=512`, `MAX_INFLIGHT=128`); no unbounded growth added.
- **Privacy / SELF.** Excerpt scanning unchanged (full-message scan before
  truncation); SELF marker and credential regexes unchanged.
- **Read-only file tools.** `edit`/`write`/`apply_patch` remain
  `tool-reported` file-change *observations* with "(not independently
  verified)" excerpts; never promoted to verified repository changes.
- **Distinct source identity vs inferred relationship.** Historical anchors
  require an authenticated, admitted native ID; session-scoped content-hash
  fallback sources are never promoted to historical anchors.
- **No new interactive model or Graphiti calls.** The diff adds only local
  Map/queue bookkeeping; `fetch` count in `plugin.mjs`, `events.mjs`,
  `queue.mjs` is 0; the baseline plugin wiring (`capture: false`,
  `sourcedEpisodeResolver`) is unchanged.
- **Issue #75 baseline behavior preserved.** Baseline plugin import, options
  and journal behavior unchanged; the baseline regression test
  (`admitted user prompts link later tool and assistant events...`) passes
  with the admitted user message now present in the assistant context.
- **Command contract.** `curator-cli.mjs status` / `list` remain read-only;
  `reconcile-only` remains a separate state-advancing command and was not
  invoked in this task (no manual EX fabrication).

## Residual limitations (not defects)

1. Cross-restart anchor loss (fail-closed omission) until prompts are
   re-admitted in the new process — inherent to bounded process-local hints.
2. Historical anchors depend on the native context build carrying the preceding
   user message's native ID; native producers that redeliver context without
   user message IDs yield omitted (not invented) relationships.
