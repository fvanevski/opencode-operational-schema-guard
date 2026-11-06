# Command-Shape Friction Ledger — Issue #81 native-source audit

Scope: this campaign's shell/tool invocations. No operational-guard
pre-execution rejections were encountered (the active `operational-schema-v2`
guard admitted every submitted command shape). Two minor agent-authored
interface/typo events occurred and were each recovered on the next attempt.

## Summary

- `encountered = yes`
- `commands_match_handoff = yes` (the handoff specified no `LITERAL COMMAND:`
  declarations; no handoff-specified literal shape was violated)
- `omitted_sensitive_values = no`

## Events

### Event 1 — `gh` JSON field-name interface discovery
- `scenario`: list PRs to confirm none are open / touching the branch
- `requested_shape`: `gh pr list --repo fvanevski/opencode-operational-schema-guard --state all --json number,title,headRef,baseRef,state`
- `effective_shape`: same (executed); `gh` reported `Unknown JSON field: "headRef"` (the CLI field is `headRefName`/`baseRefName`)
- `rewrite_provenance`: none (agent-authored field-name choice)
- `event_kind`: `interface_discovery`
- `execution_effect`: `executed_succeeded` (exit 0; the field-name error is a payload notice, not a non-zero exit)
- `correction_or_annotation`: re-issued with `--json number,state,headRefName,baseRefName,title`
- `replacement_shape`: `gh pr list ... --json number,state,headRefName,baseRefName,title`
- `recipe_reference`: none
- `resource_reference`: `gh pr list` (GitHub CLI)
- `contract_conflict`: no
- `durable_gap_candidate`: no

### Event 2 — Python one-liner typo
- `scenario`: survey event-kind / source-strength distribution across the 126 records
- `requested_shape`: a `python3 -c` one-liner containing an unbalanced parenthesis in a generator expression (`tot=sum(... for i in items)` missing a closing `)`)
- `effective_shape`: same; `SyntaxError: '(' was never closed`
- `rewrite_provenance`: none (agent-authored typo)
- `event_kind`: `execution_failure`
- `execution_effect`: `executed_failed`
- `correction_or_annotation`: re-issued the corrected one-liner (balanced parentheses); succeeded
- `replacement_shape`: corrected `python3 -c` one-liner
- `recipe_reference`: none
- `resource_reference`: `python3`
- `contract_conflict`: no
- `durable_gap_candidate`: no

## Notes

- No `rtk` wrapper was added to any handoff-specified or guard-sensitive command.
- No guard annotation required a reshaped retry.
- Both events are minor and were recovered on the immediately following attempt;
  neither altered a source identity, branch, worktree, or lifecycle boundary.
