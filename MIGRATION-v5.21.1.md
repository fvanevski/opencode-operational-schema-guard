# operational-schema v5.21.1 remediation

This patch release addresses faults reproduced from OpenCode session
`ses_fa5cfcb3affePpQ2s59tOlbzEt` without relaxing stale authority, review, or
Verify gates.

- Temporary evidence redirection under `/tmp` is content-neutral and no longer
  fabricates a workspace edit or blocks a publish after current gates.
- Exact-head target recovery preserves the owner checkout and directs PR host
  evidence to the typed local assessment gateway; caller-owned validation may
  use one explicit disposable worktree plus a separate proof.
- Every bounded Task packet receives a compact type-specific shell/result
  contract when it fits, while invalid or unsafe packets remain rejected.
- Trace remediation audits classify both publish-block word orders, structured
  missing-result markers, and structured capability occurrence counts.
- Config migration places `system-message-compat-v1` after all explicitly
  configured plugins.

Migration remains stage-first: run package checks and tests, migrate and
validate a candidate config, create new persistent backups, replace the plugin
tree, install the config through `install-live-config.mjs`, then prove staged
and live trees byte-for-byte identical.
