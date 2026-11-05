# Issue #81 — inference-profile authority verification (closeout v1)

Operator-authoritative policy (2026-11-04, per `CENTRAL_RECALL_AND_PROFILE_ADDENDUM.md` and
`NEXT_CAPTURE_CLOSEOUT.md` §A): `chat-fast` is the **non-thinking** alias — effective LiteLLM
alias must set `extra_body.enable_thinking=false`, and the curator MUST NOT attach
`reasoning_effort` (including `none`); output `max_tokens` may be bounded explicitly.
Thinking tasks use separate `chat-review` / `chat-audit` aliases with thinking enabled and
permitted `reasoning_effort` (including `low` for review). No global NInfer thinking flag.

## 1. Effective alias evidence (two separate evidence surfaces, both checked)

### 1a. On-disk config (host file)

- Path: `~/.config/litellm/config.yaml`
- SHA-256: `df5b90fac70606e54acc061796bf8f57e2a899528384371dcdbb918f23a85e8d`
- mtime: `1793812879` (2026-11-04 17:21:19 UTC)
- `chat-fast`: `extra_body.enable_thinking=false`, `max_tokens=8192`, no `reasoning_effort`,
  `drop_params=false` (global `litellm_settings`).
- `chat-review`: `enable_thinking=true`, `thinking_budget=8192`, `reasoning_effort=medium`,
  `allowed_openai_params=[reasoning_effort]`, `max_tokens=16384`.
- `chat-audit`: `enable_thinking=true`, `thinking_budget=16384`, `reasoning_effort=xhigh`,
  `allowed_openai_params=[reasoning_effort]`, `max_tokens=32768`.

### 1b. Live service loaded-config readback

- LiteLLM proxy: pid `828118`, command
  `litellm --config ~/.config/litellm/config.yaml --host 0.0.0.0 --port 8002`,
  process start `2026-11-04 09:21:22 local` (= 17:21:22 UTC), i.e. 3 s after the config file
  mtime — the running service loaded the current on-disk file (loaded-config epoch proven).
- Read-only `GET 127.0.0.1:8002/model/info` (running proxy) returned loaded parameters that
  exactly match the on-disk file:
  - `chat-fast` → `{model: openai/chat, api_base: http://127.0.0.1:8001/v1, max_tokens: 8192,
    extra_body: {enable_thinking: false}}` — **no `reasoning_effort`, no
    `allowed_openai_params`**.
  - `chat-review` → `{enabled thinking, thinking_budget 8192, reasoning_effort medium,
    max_tokens 16384, allowed_openai_params [reasoning_effort]}`.
  - `chat-audit` → `{enabled thinking, thinking_budget 16384, reasoning_effort xhigh,
    max_tokens 32768, allowed_openai_params [reasoning_effort]}`.
- NInfer backend: pid `2298046` (running since 2026-11-03), `--model-id chat --port 8001
  --thinking-budget 16384 --preserve-thinking`. The NInfer `--thinking-budget` flag is a
  capacity bound, not a global enable-thinking switch; per-request `enable_thinking` from the
  alias controls behavior. No NInfer boot flags were changed.

**Result: the on-disk file and the loaded service configuration agree and match the
operator-authoritative policy. No alias correction was required (no production mutation).**
The file and the loaded service are recorded as separate evidence per the closeout contract.

## 2. Staged model-policy / CLI preflight (CPU-only, exact head, disposable clean env)

`node docs/issue-78/v2-curator/curator-cli.mjs validate-config` (env: `env -i PATH HOME` +
the named variables only; no GPU, no live client):

| # | env | expected | observed | exit |
|---|---|---|---|---|
| T1 | `LOCAL_CURATOR_MODEL=chat-fast` (no effort) | empty options, default behavior | `{"modelOptions":{},"default_behavior":true}` | 0 |
| T2 | `chat-fast` + `GHDEV_CURATOR_MAX_TOKENS=768` | maxTokens only | `{"modelOptions":{"maxTokens":768}}` | 0 |
| T3 | `chat-fast` + `GHDEV_CURATOR_REASONING_EFFORT=none` | fail **before inference** | `Error: CURATOR_POLICY_CHAT_FAST_NO_REASONING_OVERRIDE` | 1 |
| T4 | `chat-review` + `GHDEV_CURATOR_REASONING_EFFORT=low` | allowed | `{"modelOptions":{"reasoningEffort":"low"}}` | 0 |
| T5 | `chat-audit` + `GHDEV_CURATOR_REASONING_EFFORT=medium` | allowed | `{"modelOptions":{"reasoningEffort":"medium"}}` | 0 |

T3 is the default-vs-effort conflict test: any `reasoning_effort` (including `none`) through
`chat-fast` is rejected pre-inference; thinking effort is only admitted on
`chat-review`/`chat-audit` with `low|medium|high|xhigh`; `max_tokens` (256–1600 safe-int) is
independently configurable on any alias.

## 3. Verdict

- `CHAT_FAST_POLICY=NONTHINKING_OWNER_CONFIRMED` (live readback matches operator authority;
  no drift, no reload needed).
- `CHAT_FAST_REQUEST_FIELDS`: no `reasoning_effort`; bounded `max_tokens` (8192 on the alias,
  768 via curator option when set); effective readback as in §1b.
- `THINKING_ALIASES`: `chat-review` (effort medium default, low permitted) and `chat-audit`
  (effort xhigh default) preflight evidence as in §2 T4/T5.
- No raw credentials, API keys or env values are reproduced in this document.
