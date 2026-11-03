# Reported local Build handback: Issue #79 native capture pilot

**Source of statements:** sanitized local-agent handback received November 3,
2026. This is not independently replayed Central host validation.
`RESULT=PASS` for the assigned pilot, with the open acceptance gaps in
the companion README.

```text
REPO=fvanevski/opencode-operational-schema-guard
START_SHA=32767d5e2a507c1b0a6b3f17378f087495ac2e91
END_LOCAL_SHA=32767d5e2a507c1b0a6b3f17378f087495ac2e91
HOST_OPENCODE_VERSION=2.2.5
SOURCE_DIFF_SHA256=c19681e429477705d9438b1a04a9908ffef4cd3baf61d59938703447aa6b3e25
SOURCE_DIFF_SIZE_BYTES=10719
CPU_CANDIDATE_TESTS=11/11
CPU_ISSUE75_TESTS=24/24
CPU_SYNTAX_CHECKS=4/4
SYNTHETIC_PILOT=10 cases, 6 valuable; baseline 2/6, candidate 6/6; 0 noisy
REAL_FROZEN_PILOT=8 cases, 7 valuable; baseline 0/7, candidate 7/7; 1 noisy
NATIVE_MESSAGE_ID=present
FINISHED_TURN_HOOK=qualified via later context observation
PRODUCTION_MUTATION=none
GITHUB_MUTATION=none
```

## Reported runtime receipts

- Prompt surface: `{sessionID, messageID, prompt{text,files,agents,skills},
  metadata, delivery}`; context: `{sessionID, system[], messages[]}`;
  compaction: `{sessionID}`.
- Tool surface: `{sessionID, tool, callID, status, input,
  result{output{exit,output},content,metadata}}`.
- Bus: `session.execution.started|succeeded|failed|interrupted`,
  `session.step.*`, `session.tool.*`, `session.compaction.started|delta`,
  `session.usage.updated`, `session.inbox.*`, `shell.*`.
  The 188+ observed events in four sessions did not deliver
  `message.updated`, `message.part.updated` or `session.idle`.
- Native session metadata APIs did not expose a complete history.
  Completed assistant text was observed in a subsequent context build.
- Scratch sessions: `ses_79native02/03/04`, `ses_79cand01/02`,
  `ses_79probe01`, `ses_79two`, `ses_79pilot01/10/11/20`,
  `ses_79ft01`, `ses_79neg01`, `ses_79optout01`.
  Reported 2026-11-03 17:24–17:46 UTC; no raw transcripts staged.
- Restart, three compactions, group isolation, secret exclusion, opt-out,
  repeated event delivery and queue overflow passed. Reported native queue:
  eight `new` events in capture group, zero in opt-out group, zero drops.
- No GitHub or OpenViking mutation reported; candidate Graphiti endpoint
  deliberately pointed to a dead loopback address. No post-exit ingestion.

## Reported known gaps

1. A last assistant message with no later context build is not captured.
2. Native `edit`/`write` tool receipts lack a shell-command field and
   are excluded by the current tool adapter.
3. Existing Issue #75 test-pass selector misses `node --test` output such
   as `ℹ pass 1`.
4. Completion observation has one-context-build latency.
5. V2.2.5 loader needs real package directories; symlinked entry silently
   fails, unlike a real-file copy.
6. `ctx.session.list()` returned a wrapper rather than an array.

## COMMAND_SHAPE_FRICTION

```text
encountered=yes
events:
  - scenario=disposable-session-id
    requested_shape=opencode run --session ghdev79-native-01
    effective_shape=executed; rejected: Expected a string starting with 'ses'
    rewrite_provenance=none
    event_kind=interface_discovery
    execution_effect=executed_failed
    correction_or_annotation=session IDs must use ses prefix
    replacement_shape=opencode run --session ses_79native01
    recipe_reference=none
    resource_reference=stock OpenCode 2.2.5
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=plugin-package-shape
    requested_shape=config plugins[] with file URL to .mjs entries
    effective_shape=warnings: configured plugin path must be a directory; plugins absent
    rewrite_provenance=none
    event_kind=interface_discovery
    execution_effect=executed_succeeded
    correction_or_annotation=package directory with package.json and entry required
    replacement_shape=file URL to real package directories
    recipe_reference=none
    resource_reference=stock OpenCode 2.2.5 plugin loader
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=symlinked-plugin-entry
    requested_shape=plugin package entry symlink to repository .mjs
    effective_shape=entry silently not loaded
    rewrite_provenance=none
    event_kind=runtime_misbinding
    execution_effect=executed_succeeded
    correction_or_annotation=byte-identical copy with real entry file succeeded
    replacement_shape=private real-file package copy
    recipe_reference=none
    resource_reference=stock OpenCode 2.2.5 plugin loader
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=probe-syntax-defect
    requested_shape=run disposable probe plugin v3
    effective_shape=failed to load plugin: Expected ';' but found ')'
    rewrite_provenance=none
    event_kind=execution_failure
    execution_effect=executed_failed
    correction_or_annotation=agent-introduced probe syntax corrected
    replacement_shape=none; corrected probe bytes
    recipe_reference=none
    resource_reference=disposable host probe
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=disposable-cleanup
    requested_shape=recursive deletion of agent-owned scratch and compound run+cleanup
    effective_shape=permission.rejected by host guard
    rewrite_provenance=none
    event_kind=pre_execution_rejection
    execution_effect=not_executed
    correction_or_annotation=used bounded find -delete and explicit file removals
    replacement_shape=find -delete; rm -f scoped explicit files
    recipe_reference=none
    resource_reference=disposable host scratch directory
    contract_conflict=no
    durable_gap_candidate=no
omitted_sensitive_values=yes
```

All commands and paths in this publication are **sanitized shapes**, not
literal replay scripts. The source handback recorded
`omitted_sensitive_values=no` for its own original entries; this public
copy intentionally redacts local paths and therefore says yes.
