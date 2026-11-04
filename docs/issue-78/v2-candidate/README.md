# Roadmap #78, Stage #79: broad source-event capture (isolated working candidate)

This directory is a **Central-authored candidate with bounded local stock-V2.2.5 qualification**, not a fully accepted or deployed implementation. It is **not** the
installed stock OpenCode plugin and is not authorization to activate production
Graphiti capture. Working branch: issue/79 (also reserved for Stage #80 so
we can produce one integrated PR). This is the first cohesive implementation
unit, not a final #79 acceptance certificate.

## Architecture and interfaces

- events.mjs: bounded source-attributed v1 envelopes. Event identity derives
  from native message/tool occurrence identity and scope; it is separate from
  legacy assertion-derived Graphiti episode identity. If a native prompt ID is
  absent, a *weak labelled* session+content fallback coalesces identical prompts
  within that session. Stage #79 host qualification must resolve whether the
  current V2 public event actually exposes a stronger stable ID; do not claim
  full identical-prompt coverage until then. No excerpt is independently verified.
- queue.mjs: separate private per-group file-per-event store, atomic exclusive
  writes, lock-serialized capacity/CAS transitions, 4000-entry default cap,
  durable queue_full drop counters, restart-safe duplicate IDs, bounded pages
  and inspectable statuses. CLI inspection does not create/chmod state. No automatic GC/deletion: future curator/archival
  must retain source provenance and preserve older Graphiti episodes.
  Corrupt records and uncertain lock ownership are visible failures.
- plugin.mjs: keeps Issue #75's approved read-only recall path but disables its
  old heuristic capture *only inside this isolated new plugin*. It captures
  real admitted user prompts via prompt/context, completed significant tool
  receipts through execute.after and retains queue content through compaction.
  Completed assistant turns are observed **post-completion** through the
  authenticated stock-V2 context surface (a message present in a later context
  build has finished; stable native `msg_` IDs; text parts only, reasoning
  excluded) and staged via `fromFinishedTurn`. The stock V2.2.5 plugin bus
  does not deliver `message.updated` or `session.idle` events to plugins, so
  no speculative finished-turn hook is registered. A single-turn session has
  no subsequent context build, so its final assistant turn remains uncaptured.
- fromFinishedTurn: normalized completed assistant turns labelled
  assistant-reported; host-qualified using subsequent stock-V2.2.5 context.
- candidate-cli.mjs: offline read-only status/list of Stage #79 records.
  It cannot submit to Graphiti or approve inferred facts.

The queue is a source-evidence staging area, **not** a second Graphiti database
or a transcript archive. There is no model, worker, scheduler, Graphiti write,
GitHub mutation, or OpenViking change on the interactive capture path. Existing
Issue #75 journal, persisted episodes, recall filter and opt-out remain intact.

## CPU-only checks

From this directory:

    node --check events.mjs
    node --check queue.mjs
    node --check plugin.mjs
    node --check candidate-cli.mjs
    node --test candidate.test.mjs
    node pilot-evaluate.mjs

Also run the Issue #75 focused regressions from its directory:

    node --test memory-core.test.mjs plugin-behavior.test.mjs relevance.test.mjs

The pilot is intentionally frozen *synthetic design evidence*, not a claim about
actual host event recall. Report every pilot case and baseline-vs-broad selector
difference without altering labels after reading the result. The local Build
campaign must separately collect a small sanitized real stock-V2 completed-turn
and tool sample, classify exclusions/coverage and compare the two capture paths
on that same sample. Freeze that host sample before tuning adapter behavior.
Never promote low-precision candidate count to curated Graphiti precision.

## OpenCode V2 host qualification target

Use the current installed stock V2 public interface. The Issue #75 baseline shapes and post-completion assistant observation via
subsequent stock-V2 context were qualified in a disposable native campaign.
The binding, regression tests and sanitized shape results are included below
and in `../evidence/79-native-v2-20261103/`. Do not extrapolate these bounded
V2.2.5 findings to other hooks, versions or final-turn delivery.

**Qualified November 3, 2026 on disposable stock V2.2.5 native sessions:**
`session.prompt` has `{sessionID, messageID, prompt{text,files,agents,skills},
delivery}`; `session.context` has `{sessionID, system[], messages[]}`;
`tool.execute.after` has `{sessionID, tool, callID, status, input,
result{output{exit,output},...}}`; `session.compaction` fires for manual
compaction. The plugin bus delivered `session.execution.started|succeeded|
failed|interrupted`, `session.step.*`, `session.tool.*`, `session.compaction.*`,
`session.usage.updated` and related events, but no `message.updated`,
`message.part.updated` or `session.idle`. `ctx.session.get` yielded session
metadata, not messages. The authenticated completed-assistant observation is
prior messages in the *next* context build, with stable native IDs and text
parts; it is not a direct final-turn completion callback. This is scoped host
evidence, not a claim of whole operational-schema qualification.

Use an isolated *capture-only* config/group/state root and preserve provider
mapping and existing plugin order/recall/permissions. Do not replace the live
seven-entry production config, install this plugin globally, drain legacy
pending rows, or start model-backed extraction. Baseline #75 continued recall
remains under its own isolation checks, with no production change.

## Next phase and stop

Stage #80 uses these envelopes for cluster curation, validated proposal
decisions, post-exit shared-admission Graphiti promotion and a scoped operator
portal. #81 supplies the frozen integrated benchmark and fresh-process proof.
Keep work on **issue/79** and reuse one eventual PR for #79+#80 where practical.

Stop and return to Central only on material source/API incompatibility,
privacy/data-loss risk, protected-live-state mutation, or architectural decision.
Otherwise complete the scoped host qualification, tests, pilot and evidence in
one Build campaign. Exact-head tests/host runs are not yet asserted here.

## Capture completion unit (next integrated #79 Build qualification)

The current working-branch source includes Central-authored extensions beyond
the first qualified stock V2.2.5 pilot. **These extensions are staged source,
not yet host-test PASS or accepted production behavior.**

- `events.mjs` now accepts native `edit`, `write` and `apply_patch`
  execute.after receipts with stable `callID`, bounded workspace-relative
  file-path handles and **tool-reported** status. It never stores replacement
  text, source patches, stdout, or an unproven `verified` label. Inputs with
  secret-like paths, out-of-workspace paths, oversized patches or known private
  content are excluded. Actual tool names/field shapes need native confirmation.
- Long completed assistant text up to 16,000 characters is privacy-scanned
  **before** extraction, then bounded to a <=1,100-character excerpt and a
  truncation marker. Larger/private/self-generated text is discarded.
  The plugin keeps a bounded process-local de-duplication hint (64 sessions,
  256 assistant message IDs per session), processes up to 512 recent context
  messages and records over-cap/drop reasons durably. The queue remains the
  restart-safe occurrence deduplication authority.
- Admitted user message event IDs are attached as nearby task/turn
  `related_event_ids` to later tool and completed-assistant source events
  in the same session. Links are sequencing hints, not independent proof of
  code correctness or causal attribution.
- `queue.mjs` now checks event identity hashes against the provided native
  source-handle fields, scope, kind and evidence class before accepting a
  record. This detects malformed/faked envelope fields; it is **not** a
  cryptographic attestation of the original OpenCode runtime.
- Existing `docs/issue-75/v2-candidate/memory-core.mjs` gains bounded
  `Journal.pages()`, and its current drain/reconcile/search consumers as
  well as `memory-cli.mjs` use paged reads. The old `Journal.list()` hard
  cap remains a backward-compatible safety bound for callers that explicitly
  use that whole-journal method; the active consumers no longer fail at the
  501st record. Records are never silently dropped or archived. The
  Graphiti recent-`get_episodes` 100-record window is still a **Stage #80**
  reconciliation concern; no remote-write replay policy changed.
- `pilot-real-replay.mjs` evaluates the previously frozen eight-case
  sanitized host sample without altering labels or claiming that a synthetic
  reconstruction replaces live native event receipts.

**Qualification authority:** `LOCAL_AGENT_CONTRACT_CAPTURE_COMPLETE.md`
defines the single bounded Build campaign. Host native tool-shape correction,
CPU regression repair, and an evidence-only GitHub packet are in scope.
No production activation, separate PR, Graphiti `add_memory` or model-curator
integration is authorized. Final last-reply capture where no subsequent context
exists is a documented API limitation, not a reason to invent a bus hook.
