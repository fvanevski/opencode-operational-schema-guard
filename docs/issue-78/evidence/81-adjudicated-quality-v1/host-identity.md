# Issue #81 — Host Identity (sanitized)

Anonymized; no host usernames or credential values are published.

## Runtime topology (loopback)

| Component | Bind | Role |
|---|---|---|
| LiteLLM proxy | 127.0.0.1:8002 | OpenAI-compatible front; `drop_params=false`, 4 model aliases (chat / chat-fast / chat-review / chat-audit) |
| NInfer engine | 127.0.0.1:8001 | Single `--model-id chat` engine behind all 4 aliases |
| Graphiti MCP | 127.0.0.1:8766 | Read/write Graphiti knowledge graph (MCP) |
| OpenViking commit gate | 127.0.0.1:1933/1934 | Canonical EX admission + shared flock + quiet grace |

## Services (user systemd, disposable scope)

- `ghdev-cur81-holdout-4c3ab514.service` — single non-retrying oneshot (`Restart=no`), canonical Python EX wrapper (`post-exit-drain.py`) + worktree `curator-cli.mjs drain`, `--max-seconds 600`, `--lock-timeout 120`, `EnvironmentFile` = private `curator.env`.
- `ghdev-cur81-holdout-4c3ab514.path` — path trigger on the disposable group's `candidate-events-v1` / `curation-v1` dirs.
- Shared retained services (not stopped, not owned by this campaign): LiteLLM, NInfer, Graphiti MCP, OpenViking commit-gate.

## State roots (private)

- `~/.local/state/ghdev-graphiti-issue81/holdout81-4c3ab514/` (0700): `curator.env` (0600), `candidate-events-v1/cur81_holdout_4c3ab514` (5 staged events), `curation-v1/cur81_holdout_4c3ab514` (3 review records).
- `~/.local/state/ghdev-graphiti-issue81/qual81/` (0700, prior dev campaign, retained): `probe-out.json`, `usage.jsonl` (13 entries), dev curation + episode index.

## Model binding

- Provider: LiteLLM (8002) → NInfer (8001) `chat` engine.
- Curator model: `chat-fast`.
- Holdout drain policy: unchanged default (no `reasoning_effort` override, `max_tokens=1600`) after the provider `enable_thinking` change made the opt-in `none/768` request conflict.

## Production invariance

`ghdev_gh_mcp` = 4 episodes and `cur81_dev_ce555621` = 9 episodes — both unchanged by the holdout campaign. No production group, episode, EX gate, LLM server, or PR was mutated.
