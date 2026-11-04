# Issue #80 closure-v1 — COMMAND_SHAPE_FRICTION (canonical ledger)

```text
encountered=yes
events:
  - scenario=disposable_scratch_reset_1
    requested_shape="rm -rf /tmp/opencode/issue80-headcheck && mkdir -p /tmp/opencode/issue80-headcheck (compound reset of RED/GREEN scratch)"
    effective_shape=not_executed
    rewrite_provenance=none
    event_kind=pre_execution_rejection
    execution_effect=not_executed
    correction_or_annotation="host shell guard rejected the broad `rm -rf ... && mkdir -p ...` compound in the scratch area; recovered by pointing the RED/GREEN scratch at the existing /tmp/opencode/issue80-headcheck tree (files already present) instead of deleting and recreating"
    replacement_shape="reuse existing scratch dir; overwrite only the specific core/test files via `git show HEAD:...`"
    recipe_reference=none
    resource_reference=/tmp/opencode/issue80-headcheck (disposable scratch)
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=edit_tool_whitespace_mismatch
    requested_shape="edit tool oldString anchor for core.mjs / terminal-recovery.mjs / terminal-recovery-cli.mjs"
    effective_shape=executed_failed (exact-text anchor did not match due to surrounding whitespace/indent drift)
    rewrite_provenance=none
    event_kind=execution_failure
    execution_effect=recovered_after_retry
    correction_or_annotation="several edit-tool anchors failed on whitespace/indent mismatch; resolved by a python `str.replace` on the exact file bytes (and re-reading the target region first). No product semantics changed beyond the intended delta."
    replacement_shape="python in-place replace against the exact current bytes, then re-verify with node --check"
    recipe_reference=none
    resource_reference=docs/issue-78/v2-curator/{core,terminal-recovery,terminal-recovery-cli}.mjs
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=zsh_history_multibyte_awk
    requested_shape="awk parse of zsh_history to locate the 15:34:05 staging command shape"
    effective_shape=executed_warned (awk multibyte/charset warning; unreliable on the history bytes)
    rewrite_provenance=none
    event_kind=interface_discovery
    execution_effect=recovered_after_retry
    correction_or_annotation="awk emitted a multibyte charset warning and gave an unreliable line split; switched to a python parser over the history file to extract the exact `node -e ReviewStore.advance(...)` staging command shape. The authoritative staging command was then confirmed from the OpenCode session DB tool call (call_dee51a26f72ecd5b), not from the history parse alone."
    replacement_shape="python read/parse of the history + session-DB tool-call record as the authoritative source"
    recipe_reference=none
    resource_reference=zsh history + OpenCode session DB (ses_e5c40c49effedpeZU74h4Tlmxr)
    contract_conflict=no
    durable_gap_candidate=no
omitted_sensitive_values=yes
```

Notes: all events are agent-authored scratch/command-shape issues in this
closure session; none touched repository source semantics, protected live
state, or acceptance assertions. `omitted_sensitive_values=yes`: the
`LOCAL_CURATOR_*` values in the 0600 `curator.env` are deliberately excluded
(values live only in the 0600 host env file).
