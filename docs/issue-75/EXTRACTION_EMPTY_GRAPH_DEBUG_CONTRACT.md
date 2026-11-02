# Issue #75 — Graphiti empty-materialization root-cause qualification

## Invocation and authority

<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
LOCAL_AGENT_PRIMARY=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=75
REQUIRED_HEAD_SHA=pinned in the accompanying Central kickoff; verify current refs/heads/issue/75 matches before starting
HISTORICAL_TESTED_HEAD_SHA=00917eab02f4a6a13dfd456796093d835b19d808
WORK_SCOPE=one bounded host-runtime Graphiti extraction/materialization diagnosis and repair
LOCAL_SUBSYSTEM_REMEDIATION=allowed
SUBSYSTEM_SCOPE=disposable Graphiti MCP worker, its disposable LiteLLM extraction alias/config, installed pinned Graphiti structured-output adapter inspected in read-only mode, private test journal/graph group, scratch probes and candidate tests
PROTECTED_SURFACES=shared Graphiti :8766, production LiteLLM :8002 and chat model profile, ninfer :8001 runtime config, FalkorDB existing groups/episode rows, OpenViking gate and SH/EX lock policy, installed stock OpenCode/plugin, tracked issue branch
ROLLBACK_REQUIRED=yes
CENTRAL_REVIEW_REQUIRED=yes
REMOTE_UPDATE=forbidden
CREATE_PR=no
MERGE=no
PRODUCTION_PROMOTION=no
INDEPENDENT_PR_REVIEW=forbidden

### Accepted input evidence (do not repeat operator readbacks)

Last host-qualified implementation source SHA:
\`00917eab02f4a6a13dfd456796093d835b19d808\`.
The exact handoff-document commit is a later branch head and is pinned
separately by the Central kickoff; do not confuse the two.
Current source and tests at \`docs/issue-75/v2-candidate/\`.
Issue #75 relevance policy was pragmatically accepted despite 9/12 on an
independent synthetic holdout; **no reranker campaign** is authorized.

The operator has already executed the gated post-exit drain: five distinct
new journal candidates were submitted and reconciled with remote episode UUIDs.
Journal statuses now read \`persisted\` (eight total including the prior three).
Do **not** rerun the drain, reset journal statuses, replay unknowns, delete
episodes or republish those five requests.

Read-only Graphiti \`get_episode_entities\` readback from shared :8766:
- Three PRIOR seed episodes: each has \`nodes=2, edges=1\` and
  searchable source-attributed facts.
- Five NEW episodes: each has \`nodes=0, edges=0\`, although
  \`get_episodes\` confirms their group/name/remote UUID.
- \`search_memory_facts\` returns the earlier three seed facts but the
  fresh-process recall checker returned \`ok=false\`, exit=3, for the
  five new episodes.
- The disposable :8003 LiteLLM and :8767 Graphiti worker were stopped
  and listeners confirmed closed. Production services remain running.

The disposable Graphiti worker log
\`/tmp/opencode/issue75-b75/final-qual/graphiti-disposable.log\`
showed \`LLM: openai / chat-extract\`, HTTP 200 for extraction-shaped
calls, and \`Successfully processed episode None\` for
\`g_issue75_test\`; no surfaced extraction error in the provided excerpt.
The paired ninfer completion records report \`enable_thinking:false\`,
\`finish_reason:stop_token\`, and approximately **6–10 completion
tokens per call** (alternating requested output 8192/16384).
The old \`thinking_budget 16384 > max_tokens 8192\` hypothesis does
**not explain these observed new responses**, because they stopped
without output-limit termination. Short valid empty JSON, schema
interpretation or model response formatting is plausible, NOT YET
VERIFIED. Inspect actual model output and pinned parsing before choosing
a remedy. The healthy prior seed result is a positive control, but may
have been produced with a different extraction profile.

Known host locations for discovery, authenticate before use:
- Previous worktree:
  \`/tmp/ghdev-issue75-holdout.3nXCtbz5/worktree\`
- Private diagnostic artifacts:
  \`/tmp/opencode/issue75-b75/final-qual/\`
- Scoped disposable group/journal (READ ONLY, do not mutate):
  \`g_issue75_test\` at \`/tmp/opencode/issue75-b75/state-b75\`
- Shared read-only Graphiti MCP \`http://127.0.0.1:8766/mcp\`
- Prior disposable worker \`:8767\`, alias \`:8003\`, both now stopped
- Ninfer telemetry \`/tmp/ninfer-dev-swift-k7.jsonl\`
- Existing OpenViking gate source/TOML:
  \`/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py\`
  and \`/home/filip/.config/openviking/commit-gate.toml\`
- Existing lock \`/run/user/1000/openviking-agent.lock\`.

### Goal and scope

Identify exactly why five newly stored Graphiti episodes have zero
associated nodes and edges, and, where a bounded host-side correction
can fix it, validate that **one newly captured test episode**
materializes at least one meaningful source-attributed graph fact and
can be recalled in a fresh process. Respect the installed stock V2
capture behavior and existing post-harness EX resource gate.

This is a single cohesive Build debugging campaign. Within the
named disposable subsystem you may conduct iterative tracing, narrow
instrumentation, isolated worker/config adjustments, and regression
tests **without returning to Central for every ordinary discovery**.
A model/framework adapter discrepancy inside that scope is valid
diagnostic work. Do not substitute a different model merely to
make the test green, turn off structured-output validation, hardcode
benchmark facts, inject synthetic edges directly, or change the
retrieval relevance selector to hide this failure.

### Execution plan and decision tree

**A. Identity, baselines and reproducible read-only inspection (CPU).**

Confirm fresh source HEAD/branch and relevant runtime versions. Read the
current \`memory-core.mjs\`, \`memory-cli.mjs\`,
\`post-exit-drain.py\`, plugin/test files, actual installed pinned
\`run_graphiti.py\`, queue service, extraction implementation and
structured-output wrappers, LiteLLM :8003 disposable config copies,
model/version/parameters, and Graphiti server \`get_episode_entities\`
implementation. Use semantic navigation (Serena) where it aids symbols
and callsites; Probe only for complementary extraction; native
Git/GitHub, installed Python code, live endpoint and filesystem are
authoritative for mutable state.

Authenticate prior readback by independent read-only episode/name,
source UUID, node/edge and group checks. Inspect the actual five
episode bodies *locally* to assess if there is extractable relational
content; do not publish private source text. Check whether the edge
attribution or \`get_episode_entities\` projection could omit existing
edges; use bounded read-only FalkorDB queries only if needed. Preserve
a baseline copy/hash for permitted scratch configs and exact identities
for all protected services/groups.

**B. Trace the complete extraction transaction, not HTTP status.**

Trace \`add_memory\` enqueue -> \`graphiti.add_episode\` ->
entity prompt/LLM invocation -> parsed entity objects -> edge
extraction -> graph write -> query. Determine whether:
(a) LLM actually returns empty structured arrays;
(b) response-format/json_schema support or LiteLLM extra_body/profile
interacts incorrectly with installed Graphiti Pydantic parsing;
(c) Graphiti silently falls back to valid empty collections;
(d) an entity/edge filter, group/source mismatch or graph write
drops materialized objects; or
(e) the episode text legitimately lacks extractable entities.

Correlate the ten short \`stop_token\` completions to actual
requests using timestamps, IDs and the *effective* prompt, schema and
parsed-result shape. Prefer existing durable logs; if the precise
payload is absent, add a **temporary redacted or shape-only** trace to
an isolated private worker, never to a production logging configuration.
Classify validity of returned JSON, number of entity/edge records,
validation exceptions, fallback behavior, and server-ack semantics.
Do not treat \`{"event":"settled"}\`, \`get_episodes\` or HTTP 200 as
proof that fact edges were indexed. Use a representative genuine
source-attributed statement as a positive control; if needed,
distinguish a genuinely factless episode from a formatting failure.

**C. Minimal isolated remediation and regression (CPU first).**

If the problem is prompt/schema/response parsing, apply the smallest
supported correction within disposable Graphiti configuration or a
local private adapter/wrapper. Inspect current installed source and
officially supported interfaces before changing modes such as
\`json_schema\` vs \`json_object\`. Preserve the normal
\`chat\` alias on :8002. Keep the single-serving model, native Graphiti
API, and source/evidence classes. Do not weaken safety/accuracy gates
or pretend model-generated relationships are authoritative code claims.

If the problem is upstream model behavior, distinguish a short empty
but valid response from malformed output, check request serialization,
supported extraction mode and schema constraints. Limit retries or
alternate settings to bounded, justified diagnostics; no large model
shopping/benchmark campaign. If solving it requires a substantive
production or repository architecture change, return the exact
counterexample and a proposed minimal patch to Central rather than
silently expanding scope.

Write focused regressions for the verified invariant in disposable
test code. Preserve and run existing candidate Node/Python tests
where touched, plus any relevant installed Graphiti parser/queue
tests. A source proposal affecting
\`docs/issue-75/v2-candidate/\` may be prepared as a **local diff
only**, with tests and hashes; do not commit/push without Central review.
Do not alter previously verified test expectations.

**D. One controlled GPU-backed check, only after the harness exits.**

The stock Build harness holds a shared lock and the existing gate
requires EX, no active agents, idle ninfer metrics and 30-second
quiet grace. During the active Build session, do not send
GPU-intensive inference or Graphiti ingestion to :8001 merely to
complete the test. Do not disable the gate or release the SH lease
manually. You may prepare/restart private service processes without
initiating model inference, if that is safe and proven.

Prefer a **verified already-supported native post-exit continuation
mechanism**, if it exists, that captures results autonomously.
Do not invent a persistent daemon, unbounded detached process,
new scheduler, or a shell script that bypasses the shared EX lock.
If no safe native continuation is available, prepare a SINGLE
self-contained, bounded one-shot operator launch that carries out
the disposable test, terminal materialization check, fresh-process
recall, log capture, cleanup, and stores a complete private evidence
bundle. The operator should not be asked to run diagnostic snippets
or manually assemble readbacks. Return
\`READY_FOR_OPERATOR_POST_EXIT\` only at this actual harness boundary,
with that one launch shape and artifact path. Reuse the existing
one-shot gate wrapper and its failure containment; under nonterminal
status, stop only the disposable worker before releasing EX, never
the shared :8766 worker.

Use a NEW separate temporary journal and group to test **one**
simple source-attributed factual/relational decision under the
corrected extractor. The five old episodes stay as-is: no resubmit,
delete/forget, journal status rewrite or destructive graph repair.
Permit one additional bounded diagnostic attempt only if the first
clearly identifies a within-scope fix; record every attempt and
its exact identity. Avoid parallel Graphiti workers doing inference.
A successful new test must read back a real remote episode UUID,
node/edge materialization, and a source-attributed fact from a
new independent process. If it produces only an episode node again,
retain the exact negative output and stop: no "green" from
queue success alone.

**E. Final state, evidence and handback.**

Restore/stop disposable :8003/:8767 workers and scratch processes
when safe; preserve necessary private artifacts, recorded SHA256
and reproducible setup. Authenticate shared :8001/:8002/:8004/:8766
and the OpenViking gate, existing groups, configs and original five
episodes remained unchanged. Do not run new model inference after
operator cleanup; no production promotion. Preserve failure state
for Central, including unresolved/uncertain remote outcomes.

Return one complete source-backed handback. The local agent owns the
host diagnostics; Central owns final architectural/semantic
adjudication, final source integration and PR/release decision.

### Success and stop conditions

PASS: Pin the cause with traceable installed-code/request/response
evidence; a bounded isolated correction is demonstrated; one **new**
episode has remote UUID, >=1 materialized meaningful edge, and a
fresh-process query retrieves that edge with correct source group and
attribution; no production mutation or model contention; CPU
regressions and rollback/cleanup pass.

PARTIAL: Causal mechanism bounded but no completed live materialization
yet, or an intentional non-graphable episode is proven without a
real positive control. Do not assert success on episode storage alone.

STOP_FOR_CENTRAL: A required correction changes production
LiteLLM/Graphiti service, shared database state beyond a disposable
group, gate/lock behavior, protected GitHub/source authority,
or adds unapproved model/services or changes memory semantics
substantially. Report the minimal reversible proposal with exact
dependencies. Do not ask for confirmation for routine scratch
configuration/debugging.

Do not recursively restart the entire Issue #75 campaign, reopen
the 7/7 or 9/12 retrieval benchmarks, or initiate multiple
micro-handoffs.

### Required typed handback

RESULT=PASS|PARTIAL|BLOCKED|READY_FOR_OPERATOR_POST_EXIT|FAIL
SOURCE_HEAD_SHA=<full SHA and final working tree state>
RUNTIME_IDENTITIES=<installed Graphiti core/server/adapter, Qwen/LiteLLM, service config hashes>
PRIOR_PROOF=<3 old 2-node/1-edge; 5 new 0/0; UUID/group source>
EXTRACTION_CAUSE=<code paths, request/response shape, actual parsed objects, confidence>
MODEL_EVIDENCE=<request IDs/timestamps, effective profile/structured mode, finish reason, completion tokens, source URLs or private artifact paths>
CHANGES=<paths, diff SHA256, exact bounded change and rollback; or none>
CPU_TESTS=<commands, exits, relevant regressions>
LIVE_TEST=<group, new episode ID, nodes, edges, fact source/readback, terminal status; or not run with explicit cause>
GATE=<SH/EX admission, running/waiting, grace, release safety>
PRODUCTION_SAFETY=<protected configs/services/groups unchanged, disposable cleanup>
REMAINING_BLOCKERS=<none or exact reproduction/needed authority>
EVIDENCE_BUNDLE=<private safe path + SHA256, relevant sanitized extract for Central>
COMMAND_SHAPE_FRICTION=<GHDEV-10 requested/effective shape, rewrite provenance, event kind and effect, or none>
HANDOFF_RENDER_PREFLIGHT=PASS|FAIL
<<< LOCAL_AGENT_CONTRACT_END >>>
