# Rollback inventory (installed plugin/config vs merged-main)

Merged-main reference: `origin/main` = `ef1d62de1942061bb4441fc3606996a6faa7d327`
(= the stage base commit). The issue branch adds only
`docs/issue-75/v2-candidate/plugin.mjs` (fix) +
`docs/issue-75/v2-candidate/plugin-behavior.test.mjs` (tests) +
the integrated-acceptance contract doc.

## Installed plugin bytes (`/home/filip/.config/opencode/plugins/ghdev-graphiti-memory`)

| File (repo-relative) | Installed SHA-256 | Matches |
|---|---|---|
| `docs/issue-78/v2-candidate/plugin.mjs` (entry) | `e54884baacc44f383ae7ee24e17f8036b3fa85fee60ae11fa436dd2afc5b0758` | merged-main AND branch (unchanged on branch) |
| `docs/issue-78/v2-candidate/events.mjs` | `55fcd330692c8934f67e780b03e74a47d16f24c20042769124620e36cd6a572e` | merged-main |
| `docs/issue-78/v2-candidate/queue.mjs` | `dbe6d324ddc412a51bcf1e991caeba01ea072b53f420a795610391320890e7ef` | merged-main |
| `docs/issue-75/v2-candidate/plugin.mjs` | `1c76f36eebb6df0477d4a1f5ae92bd2b85d0ac4fe9831f4712c73edf2af1b954` | merged-main (NOT the branch fix `7550f0b6…`) |
| `docs/issue-75/v2-candidate/memory-core.mjs` | `eac9d21ead6470dd13a38e8e50adc34925d673f5549c25256f9aa77dd6db71c0` | merged-main |
| `docs/issue-75/v2-candidate/relevance.mjs` | `8db952332db85831ef947f3ac6cef6b96921af314d55e8d14dae70ab5f62da06` | merged-main |
| `docs/issue-78/v2-curator/sourced-recall.mjs` | `2fb468541b99b427b9d5fa25c5ebcc2d246acd684a35d28a686a50aeb1bab22c` | merged-main |
| `docs/issue-78/v2-curator/model.mjs` | `e37bc7f3f63edba7aa433b0d7ef5422d83404df0881ee906da841a58d9534707` | merged-main |
| `docs/issue-78/v2-curator/model-policy.mjs` | `a71d48c67eb663a002ee6ab7c76ee4e4d7d74cb4d5155b58657fed5f4c3a2797` | merged-main |
| `docs/issue-78/v2-curator/worker.mjs` | `47a6dd15659682cfaed05355d1649efc0640d9bd82d5e65f9a06af16a99eab23` | merged-main |
| `package.json` | `4538c5b3aacbad6dec0f5b8ec89788c7755c16f4d7b6eacf230e15250b82dd0e` | entry `./docs/issue-78/v2-candidate/plugin.mjs` |

The **branch fix is not activated** in the shared production service
(installed issue-75 baseline = merged-main bytes), as required. The
disposable probe loaded the branch bytes from the isolated worktree only.

## Config rollback state

- Live: `/home/filip/.config/opencode/opencode.json`
  SHA-256 `ea7653be3a21451da75cbd65741d0d2f4f7be54cba052552fb20798b0978744f`
  — graphiti plugin options: `group=development-knowledge` (approved
  production group), `capture=true`, endpoint `127.0.0.1:8766/mcp`,
  stateDir `/home/filip/.local/state/ghdev-graphiti`.
- Rollback snapshot (pre-cutover legacy group):
  `/home/filip/.config/opencode/opencode.json.bak-2026-11-05T20-35-issue81-cutover`
  SHA-256 `9b8f4312d92508264556fd58f3d36b1e557ff4e57a658024f8b101ae88346035`
  — identical structure and plugin order; graphiti `group=ghdev_gh_mcp`.
- Plugin order (live, preserved): operational-schema-v2, openviking-v2,
  rtk, compaction-reasoning-trim, superpowers, system-message-compat,
  ghdev-graphiti-memory (last, with options).

## Curator env

- `/home/filip/.local/state/ghdev-graphiti/curator.env`:
  `LOCAL_CURATOR_URL=http://127.0.0.1:8002/v1/chat/completions`,
  `LOCAL_CURATOR_MODEL=chat-fast`, private API key pointer (value
  redacted). Historical fix recorded in Stage H packet (original
  `41840c38…` preserved / fixed `265a1dbe…`).
