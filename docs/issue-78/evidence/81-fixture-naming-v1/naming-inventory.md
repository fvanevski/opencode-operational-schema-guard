# Graphiti fixture group inventory — Issue #81 (naming slice)

Read-only host inventory taken at source head `0e30106ced8da710b23b4e474b57f4e184752ce1`.
No data mutations. All paths under `<host-home>` are user-private state; no
credentials, native transcripts, or private Graphiti facts are published.

## Configured production/native identities

| Identity | Value | Evidence |
| --- | --- | --- |
| Production Graphiti group | `ghdev_gh_mcp` | native plugin `ghdev-graphiti-memory` options in `<host-home>/.config/opencode/opencode.json` (`group`, `endpoint`, `stateDir` `<host-home>/.local/state/ghdev-graphiti`) |
| Live Graphiti server | `http://127.0.0.1:8766/mcp` (FalkorDB `graphiti_live`, server `group_id: graphiti_live`) | `<workspace>/mcp_servers/graphiti/config/config.yaml`, running service |
| mcp-mux | `http://127.0.0.1:8012` | user systemd `mcp-mux.service` |
| Production episode receipts (local, historical DB generation) | 2 files in `<host-home>/.local/state/ghdev-graphiti/ghdev_gh_mcp/` | read-only file listing |
| Production remote baseline (current live DB) | 4 episodes | read-only group-scoped `get_episodes` readback |

`ghdev_gh_mcp` is **not** a fixture; it is preserved and never renamed.

## Machine group inventory

| CURRENT_MACHINE_ID | ACTUAL_PURPOSE | FUTURE_CANONICAL_NAME_OR_RETAINED_ID | PRODUCERS | CONSUMERS | ACTION | EVIDENCE |
| --- | --- | --- | --- | --- | --- | --- |
| `ghdev_gh_mcp` | Production memory group (live OpenCode sessions) | RETAIN `ghdev_gh_mcp` | native plugin capture (admitted sessions) | native drain gate, curator, portal | RETAIN (production) | plugin options; 2 local receipts; 4 remote episodes |
| `cur80_disposable` | Curator disposable qualification (issue 80) | RETAIN `cur80_disposable` (legacy label: "Curator disposable qualification") | issue-80 native capture (disposable) | issue-80 closure80 drain; queue 3 events; 1 remote episode | RETAIN WITH DESCRIPTIVE READ-ONLY LABEL | `<host-home>/.local/state/ghdev-graphiti-issue80/candidate-events-v1/cur80_disposable`; `_episode-index` 1 entry |
| `cur80_qual01` | Curator qualification run 01 (issue 80 closure) | RETAIN `cur80_qual01` (legacy label: "Curator qualification run 01") | issue-80 closure native capture | unit `ghdev-curator80-qual01` (failed, inactive); queue 13 events; 1 remote episode | RETAIN WITH DESCRIPTIVE READ-ONLY LABEL | `closure80-qual/candidate-events-v1/cur80_qual01`; unit `ExecStart --group cur80_qual01`; remote UUID `26299f65…` (matches terminal-recovery test fixture) |
| `cur80_qual02` | Curator qualification run 02 (issue 80 closure, second cohort) | RETAIN `cur80_qual02` (legacy label: "Curator qualification run 02") | issue-80 closure second cohort | scratch unit `ghdev-curator80-qual02` (not installed); 1 remote episode | RETAIN WITH DESCRIPTIVE READ-ONLY LABEL | `closure80-qual02/curation-v1/cur80_qual02`; `_episode-index` 1 entry; remote readback 1 episode |
| `cur81_dev` | Frozen development-corpus source scope (issue 81) | RETAIN `cur81_dev` (legacy label: "Frozen development-corpus source scope") | frozen corpus bytes (local) | `evaluate.mjs`/`adjudicate.mjs` scoring; 0 remote episodes (corpus is local-only) | RETAIN WITH DESCRIPTIVE READ-ONLY LABEL | frozen corpus digests (524de3ff…); remote readback 0 episodes |
| `cur81_dev_ce555621` | Curated-memory development cohort (issue 81) | RETAIN `cur81_dev_ce555621` (legacy label: "Curated-memory development cohort") | issue-81 dev cohort native capture | qual81 queue 33 events; curation 9 episodes; remote 9 episodes | RETAIN WITH DESCRIPTIVE READ-ONLY LABEL | `<host-home>/.local/state/ghdev-graphiti-issue81/qual81/…`; `_episode-index` 9 entries; remote readback 9 |
| `cur81_native_a1f3c9d7` | WebVTT diagnostic native capture (issue 81 terminal campaign) | RETAIN `cur81_native_a1f3c9d7` (legacy label: "WebVTT native diagnostic capture") | `terminal81-a1f3c9` native capture (`native-config.json`) | unit `ghdev-curator81t-qual` (inactive); queue 96 events; remote 12 episodes | RETAIN WITH DESCRIPTIVE READ-ONLY LABEL | `/tmp/opencode/issue81-qual/terminal81-a1f3c9/state/…`; unit `ExecStart --group cur81_native_a1f3c9d7`; remote readback 12 |
| `cur81_native_8cd61d76` | Cron acceptance native capture (issue 81) | RETAIN `cur81_native_8cd61d76` (legacy label: "Cron native acceptance capture") | campaign `64d32eb7` cron native capture (`config-cron`) | campaign state; queue 48 events; 0 remote episodes (staged only) | RETAIN WITH DESCRIPTIVE READ-ONLY LABEL | `holdout81-64d32eb7/state/ghdev-graphiti/candidate-events-v1/cur81_native_8cd61d76`; `config-cron/opencode/opencode.json`; remote readback 0 |
| `cur81_holdout_cc5349fc` | Cron acceptance holdout (issue 81) | RETAIN `cur81_holdout_cc5349fc` (legacy label: "Cron acceptance holdout") | sealed holdout staging (staged from `cur81_dev` scope) | unit `ghdev81-holdout-cc5349fc` (inactive); queue 22 events; curation 2 episodes; remote 2 episodes | RETAIN WITH DESCRIPTIVE READ-ONLY LABEL | `holdout81-64d32eb7/state/ghdev-graphiti/…`; unit `ExecStart --group cur81_holdout_cc5349fc`; remote UUIDs `56b75c2c…`, `d4b8fff6…` (verified) |
| `cur81_holdout_4c3ab514` | Issue-81 sealed-holdout drain instance (disposable single oneshot; separate sealed cohort from `cc5349fc`) | RETAIN `cur81_holdout_4c3ab514` (purpose from unit description; **not in the naming ledger catalog** — unlisted historical) | sealed-holdout campaign `33059a10` | unit `ghdev-cur81-holdout-4c3ab514` (service inactive, path **active**); queue 5 events; 1 remote episode | RETAIN (unlisted legacy; no fabricated purpose beyond observed unit description) | `holdout81-4c3ab514/…`; unit description "Issue #81 sealed-holdout admitted post-exit curator drain"; remote UUID `69fde784…` |
| `cur81_native_af8e7d67` | WebVTT workspace native capture, campaign `64d32eb7` (unlisted) | RETAIN `cur81_native_af8e7d67` (**unclassified** — observed state only: webvtt workspace capture staging) | `config/opencode/opencode.json` (campaign `64d32eb7`) | queue 38 events; 0 remote episodes | RETAIN WITH DESCRIPTIVE READ-ONLY LABEL (purpose not independently verified) | `holdout81-64d32eb7/state/ghdev-graphiti/candidate-events-v1/cur81_native_af8e7d67`; `config/opencode/opencode.json` |
| `cur81_native_b9ef56e8` | cronparse workspace native capture, campaign `64d32eb7` (unlisted) | RETAIN `cur81_native_b9ef56e8` (**unclassified** — observed state only: 2 staged `user_turn` events, cronparse workspace) | campaign `64d32eb7` capture | queue 2 events; 0 remote episodes | RETAIN WITH DESCRIPTIVE READ-ONLY LABEL (purpose not independently verified) | `…/candidate-events-v1/cur81_native_b9ef56e8` (event `project=cronparse`); remote readback 0 |
| `cur81_native_holdout_a1f3c9` | Terminal-campaign native holdout capture (unlisted; 6-hex suffix) | RETAIN `cur81_native_holdout_a1f3c9` (**unclassified** — observed state only: 66 staged events) | `native-config-holdout.json` (terminal campaign) | queue 66 events; 0 remote episodes | RETAIN WITH DESCRIPTIVE READ-ONLY LABEL (purpose not independently verified) | `/tmp/opencode/issue81-qual/terminal81-a1f3c9/state/…`; `native-config-holdout.json` |
| `cur81_native_p81a1f3c9` | Terminal-campaign p81-variant native capture (unlisted) | RETAIN `cur81_native_p81a1f3c9` (**unclassified** — observed state only: 14 staged events) | `native-config-p81.json` (terminal campaign) | queue 14 events; 0 remote episodes | RETAIN WITH DESCRIPTIVE READ-ONLY LABEL (purpose not independently verified) | `/tmp/opencode/issue81-qual/terminal81-a1f3c9/state/…`; `native-config-p81.json` |
| `cur81_native_diaga6a4da` | WebVTT diagnostic config group (dedicated empty diag state root; unlisted) | RETAIN `cur81_native_diaga6a4da` (**unclassified** — config-bound only, no queue data) | `config-diag/opencode/opencode.json` (campaign `64d32eb7`) | `state/ghdev-graphiti-diag` (empty) | RETAIN (no data to migrate) | `config-diag/opencode/opencode.json` |
| `cur81_lifecycle` | Portal lifecycle scratch group (unlisted) | RETAIN `cur81_lifecycle` (**unclassified** — observed state only: empty curation dir under a /tmp portal lifecycle scratch) | portal lifecycle scratch | `/tmp/opencode/issue81-qual/cur81/portal/lifecycle/curation-v1/cur81_lifecycle`; 0 remote episodes | RETAIN (no data to migrate) | path listing; remote readback 0 |

## Fixture units (user systemd, read-only state)

| Unit | State | Bound group | Binding evidence |
| --- | --- | --- | --- |
| `ghdev-cur81-holdout-4c3ab514.service/.path` | service inactive; **path active/enabled** | `cur81_holdout_4c3ab514` | `ExecStart … --group cur81_holdout_4c3ab514 --state-dir <host-home>/.local/state/ghdev-graphiti-issue81/holdout81-4c3ab514` |
| `ghdev-curator80-qual01.service/.path` | service **failed**; path inactive | `cur80_qual01` | `ExecStart … --group cur80_qual01 --state-dir <host-home>/.local/state/ghdev-graphiti-issue80/closure80-qual` |
| `ghdev-curator81t-qual.service/.path` | inactive (enabled) | `cur81_native_a1f3c9d7` | `ExecStart … --group cur81_native_a1f3c9d7 --state-dir /tmp/opencode/issue81-qual/terminal81-a1f3c9/state` |
| `ghdev81-holdout-cc5349fc.service/.path` | inactive | `cur81_holdout_cc5349fc` | `ExecStart … --group cur81_holdout_cc5349fc --state-dir <host-home>/.local/state/ghdev-graphiti-issue81/holdout81-64d32eb7/state/ghdev-graphiti` |

Unit `EnvironmentFile` paths exist and are private (0600); credential contents not exposed.
No new units were installed, enabled, started, or relabelled by this slice.

## New descriptive IDs (this slice)

`graphiti-<domain>-<purpose>-rNN` is the canonical form for NEW disposable
fixtures. No host state directory carries a `graphiti-*` group yet; all six
example IDs (`graphiti-cron-capture-r01`, `graphiti-cron-development-r01`,
`graphiti-cron-holdout-r01`, `graphiti-webvtt-diagnostic-r01`,
`graphiti-curator-efficiency-r01`, `graphiti-curator-recovery-r01`) were
verified **absent** from every existing state root before the disposable
integration test wrote scratch state (see `validation.md`).

## Nonmutation statement

This slice performed read-only inventory plus one new write-once score file
(`final-score-naming-v1.json`, byte-identical to the prior accepted score) in
the campaign private directory. No group was renamed, cloned, deleted,
restaged, or relabelled; no Graphiti episode was created, changed, or
removed; the production group and all historical groups are untouched.
