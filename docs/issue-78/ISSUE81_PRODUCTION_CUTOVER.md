# Issue #81 — Graphiti extraction policy and fresh production namespace

## Operator decision

Canonical production Graphiti group: **development-knowledge**.
The old **ghdev_gh_mcp** FalkorDB graph and local review/queue/index
records are development data, not durable production knowledge. There is
**no migration or data-retention requirement** for this old namespace.
Graphiti maps group IDs to real graph storage; a display alias or string
replace does not migrate storage.

The old curator is holding EX for one known failed old-group episode
(fb4042ad...). Since the entire old group will be retired, terminal
adjudication of that individual review is NO LONGER A CUTOVER GATE.
Disable new old-group capture; retire the old canonical wrapper via
normal systemd user-service stop so it releases its own EX lock.
Do not unlink an owned lock, replay the task, or try to drain hundreds
of disposable development candidates. Capture bounded failure
evidence and unit/process identity for diagnostic value only.

## Graphiti-only output budget correction

The host evidence ties Graphiti OpenAIGenericClient → LiteLLM:8002
→ NInfer:8001 (Qwen3.8-27B) to output_limit at 8,192/16,384 tokens
with JSON decode errors. max_tokens includes reasoning plus final content.
This is NOT the GHDEV_CURATOR_MAX_TOKENS option in model-policy.mjs.

Implement a *dedicated Graphiti extraction route*, not a global NInfer
default change or a new model/server. Inspect effective host Graphiti
request, LiteLLM alias and actual NInfer request; Graphiti sends explicit
max_tokens per call, so NInfer's --default-max-tokens alone cannot fix it.

Preferred: per-request Qwen thinking OFF (e.g. reasoning_effort:none)
and max_tokens 8,192. If this option does not traverse LiteLLM, use a
verified per-request thinking_budget 2,048 with total max_tokens 8,192.
Increase to 16,384 only if observed structured JSON needs it.
NInfer thinking-close control tokens count against max_tokens and
do not guarantee a nonempty answer. Never silently change ordinary
chat-client thinking behavior. Use existing config/alias mechanism,
not an unreviewed upstream monkeypatch.

Validate at the effective NInfer request: thinking policy, nonempty
structured final content, valid JSON/schema, stop/stop_token finish,
grounded extraction of named components/edges, and acceptable latency
on representative sanitized Issue #81 inputs. Preserve frozen rubric;
do not bypass output-limit failures or Graphiti's EX admission.

## New empty namespace

The source includes a read-only preflight:

 node docs/issue-78/v2-curator/production-cutover-cli.mjs \
   --group development-knowledge \
   --state-dir /home/filip/.local/state/ghdev-graphiti \
   --endpoint http://127.0.0.1:8766/mcp

Require FRESH_PRODUCTION_EPISODES_EMPTY, empty/absent paths:
state-root/development-knowledge, candidate-events-v1/development-knowledge,
curation-v1/development-knowledge. Independently query FalkorDB read-only
for graph-name absence or zero nodes/edges; zero Graphiti episodes alone
does not establish an empty graph.

With old capture off and old wrapper stopped/EX released, change all
live producers/consumers coherently: stock V2 plugin group option,
post-exit wrapper --group/service, candidate/review/index paths,
status/portal default and native recall group filters. Keep the accepted
EX scheduler/service topology, source attribution, fixture groups and
historical benchmark identities unchanged. Test the new system on an
actual source-grounded episode through EX-held post-exit ingestion,
then assert Graphiti UUID, source index, true fresh OpenCode session
context injection, wrong-group exclusion and concurrent OpenViking.

Retain a reversible snapshot of the exact live config and unit definition.
Old graph contents need not be backed up. Do not delete the old
FalkorDB graph before successful new-group acceptance: it remains
an exact rollback target until cutover is confirmed. After success,
delete only enumerated old group resources with checked names, never
use a wildcard or implicit cross-group cleanup. New graph state must
not be deleted by rollback.

PR #84's sentence-initial recall correction remains independent and
requires integration against the then-current main before final Issue #81
fresh-session acceptance. No extra feature PR, new queue platform,
model replacement or broad naming refactor is authorized by this slice.
