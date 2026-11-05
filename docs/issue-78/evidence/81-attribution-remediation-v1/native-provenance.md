# Native host provenance qualification — Issue #81 (Phase 4)

Adapter/provenance qualification against the preserved native stock-V2.2.5
evidence. **Not** a new live inference run, not a new blind holdout, no model
calls, no Graphiti writes.

## Real-native evidence boundary

| Item | Value |
| --- | --- |
| Campaign | `ISSUE81_INDEPENDENT_HOLDOUT` |
| Cohort | `cron-acceptance` |
| Native session | `ses_e577a8c27ffeixiiSob1B8tbFo` |
| Live capture group | `cur81_native_8cd61d76` (project `cronparse`) |
| Preserved staged events | 48 candidate events under `<host-home>/.local/state/ghdev-graphiti-issue81/holdout81-64d32eb7/state/ghdev-graphiti/candidate-events-v1/cur81_native_8cd61d76/` (read-only; untouched) |
| Timeline | 2026-11-04 21:44:41 – 21:48:41 UTC; 5 admitted native prompts, 21 assistant turns, 22 tool/file outcomes |

The preserved staged events retain native source-envelope identities
(`opencode:<session>:message:<nativeID>` / `opencode:<session>:tool:<callID>`),
`source_strength: native-id`, evidence classes, and the **pre-correction**
`related_event_ids`.

## Defect directly observable in the preserved native evidence

Three completed assistant turns are anchored to the **later** prompt that
triggered their context build (the Issue #81 defect), not to their preceding
admitted native user message:

| Assistant native ID | Preserved (pre-correction) anchor | Correct preceding admitted user anchor |
| --- | --- | --- |
| `msg_1a8861df3001t92aE1lCFaUiiy` | `d0be2557…` (prompt #2, wrap-around) | `31b2d772…` (prompt #1, cron parser) |
| `msg_1a886f5fe0019eJPOV72584jMI` | `de99f94e…` (prompt #3, out-of-range) | `d0be2557…` (prompt #2) |
| `msg_1a887d4d3001vF2wCZVcQmRkaN` | `557fb336…` (prompt #5, PROJECT_NOTES) | `aa0d7d5f…` (prompt #4, weekday-7 probe) |

Tool outcomes in the preserved evidence already anchor to the most recent
admitted prompt of their window (behavior the correction retains).

## Bounded disposable CPU-only replay (corrected adapter)

One replay of the observed prompt/context/tool-hook sequence was executed
against the corrected `plugin.mjs` (HEAD `8dcdf199…`) with a disposable
`CandidateQueue` state dir (fresh temp root, removed after the run):

- Real native prompt texts and message IDs, real assistant turn IDs, and a
  representative real shell tool outcome per prompt window (real call IDs,
  reconstructed `node --test test/` commands/outputs consistent with the
  preserved excerpts).
- Context builds were reconstructed in conversation order: each completed
  assistant turn appears **after** the user message of the turn it completed.

Results (all assertions PASS, exit 0; 15 staged entries):

1. **Envelope identity**: recomputed event IDs for all 5 native user turns
   equal the preserved staged event IDs exactly (`31b2d772…`, `d0be2557…`,
   `de99f94e…`, `aa0d7d5f…`, `557fb336…`), with `source_strength: native-id`
   and `evidence_class: user-stated` — source identity unchanged by the
   correction.
2. **Cross-turn fix**: each of the three completed assistant turns above now
   carries exactly the preceding admitted native user event; no assistant turn
   carries its later triggering prompt.
3. **Regression**: the turn-3 completion turn
   (`msg_1a887473f001yAzzgJE1Df3eU1`) keeps its preceding admitted anchor
   `de99f94e…` (old and new behavior agree), and all six window tool outcomes
   anchor to their window's most recent admitted prompt, matching the
   preserved pre-correction tool anchors.

## Accurately reported limitations

- The historical dump does **not** preserve the exact per-context-build message
  arrays; the replay reconstructs a faithful bounded ordering from staged-event
  timestamps (assistant completions staged in the same second as the
  following prompt were first visible in that build). Mid-turn assistant
  messages (e.g. `msg_1a885db00001…`) are not replayed; they do not affect
  cross-turn relationships and are covered by the focused hook regressions.
- File-tool input payloads (filePath/content) are not preserved in the dump;
  representative shell outcomes were used for tool anchoring. File-tool
  staging behavior is covered by the focused `candidate`/`adjudicate` tests.
- Where hook-level data was absent, the focused association tests carry the
  behavior (per contract), not this replay.

No production Graphiti, the real capture group, any installed OpenCode plugin,
or the existing EX gate was modified.
