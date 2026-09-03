# Migration to operational-schema v5.23.2

v5.23.2 removes the historical fixed context-pressure regime and derives primary-agent context policy once from the merged live OpenCode configuration when the plugin initializes.

## Context-policy derivation

For each primary agent (`plan`, `build`, `review`, `research`), the plugin resolves `agent.<name>.model` or the global `model` fallback to the configured `provider/<model>` entry and validates positive integer `limit.context`, `limit.input`, and `limit.output` values.

The initialized guard then freezes:

```text
context warning = model.limit.input - compaction.reserved
emergency ceiling = model.limit.input
```

It also requires:

```text
model.limit.input + model.limit.output <= model.limit.context
compaction.reserved < model.limit.input
```

There are no operational-schema token constants corresponding to the former 150000 warning, 195000 emergency ceiling, or 180000 maximum accepted model input.

Configuration changes do not alter an already initialized plugin instance. Start a genuinely fresh OpenCode process to load changed model limits or compaction reserve values.

If the initialization snapshot cannot be read or validated, v5.23.2 does not throw out of the plugin entry point: OpenCode catches external-plugin initialization exceptions and can otherwise continue without that plugin. Instead the plugin returns an active guard carrying the initialization failure and rejects every subsequent tool invocation until the live configuration is corrected and a genuinely fresh OpenCode process is started.

## Configuration validation

The live-config contract no longer caps `model.limit.input` at 180000 or imposes a fixed minimum context size. Instead it requires positive coherent context/input/output/reserve values while retaining the existing plugin ordering, permissions, typed gateway, and atomic-install invariants.

Because the generated Build policy changes in v5.23.2, an existing live `opencode.json` must be staged with the current generated prompt before installation. Use the repository migration/config tooling, validate the complete candidate, install it with a backup, and prove the new configuration in a fresh process.

If model-profile generation is maintained outside this repository, make sure the staged live candidate already contains the intended current model limits. The operational-schema migration helper does not invent hardware/model context limits.

## Unchanged behavior

This patch does not alter:

- exact-head admission;
- repository-owned or gateway-owned assessment semantics;
- target lifecycle or owner reconciliation;
- child tool/generation budgets;
- mutation/review/Verify gates;
- assessment result schemas; or
- merged-main/gate evidence boundaries.
