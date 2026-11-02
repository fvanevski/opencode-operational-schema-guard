# Issue #75 — Direct Codex CLI / Antigravity integrated host-remediation handoff

## Authority and execution model

<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=75
BRANCH=issue/75
REQUIRED_SOURCE_HEAD=operator-pinned exact SHA from accompanying kickoff
LAST_HOST_QUALIFIED_IMPLEMENTATION_SHA=00917eab02f4a6a13dfd456796093d835b19d808
PRIMARY_HARNESS=codex-cli-direct
ALTERNATE_HARNESS=antigravity-cli-direct-if-verified
OPENCODE=host-launched-test-subject-not-primary-agent
LOCAL_SUBSYSTEM_REMEDIATION=allowed
SUBSYSTEM_SCOPE=Graphiti V2 memory capture/extraction, isolated Graphiti MCP+LiteLLM/LLM profile, test groups and journals, focused candidate-source patch prepared locally
HOST_AUTONOMY=one_contiguous_diagnostic_and_correction_campaign
REMOTE_UPDATE=forbidden
CREATE_PR=no
MERGE=no
PRODUCTION_PROMOTION=no
CENTRAL_SEMANTIC_REVIEW=required

**Mission:** Resolve Issue #75's genuine persisted-but-factless Graphiti
memory defect end to end, and return one complete handback to Central.
The direct Codex/Antigravity harness is the controller of iterative
host diagnosis. It may launch **fresh stock V2 OpenCode processes** as
test subjects and execute Graphiti LLM extraction during its own
session, provided real inference exclusion is maintained. It should
not repeatedly stop to ask Central to generate individual command
snippets or narrow micro-handoffs.

## Accepted evidence and why the prior campaign stopped

Prior candidate: \`docs/issue-75/v2-candidate/\` on GitHub branch
\`issue/75\`. The latest Central relevance disposition
\`docs/issue-75/PRAGMATIC_RETRIEVAL_DISPOSITION.md\` accepts
7/7 frozen, 5/5 old holdout, **9/12 independent holdout**, with
documented imperfections. **Do not reopen reranker calibration**.
Other accepted behavior: native OpenCode v2.2.5 capture, opt-in,
source-attributed journal, OpenViking coexistence, RTK-wrapped
test receipt, JSON-encoded \`prompt.text\`, and no Graphiti
\`add_memory\` while interactive OpenCode is active.

Known failing end-to-end run:
- A previous 5-record post-exit drain returned "settled" and all
  five remote episodes were present with correct group/name/UUID,
  but each has **0 nodes / 0 edges**; original 3 seeds each have
  **2 nodes / 1 edge**.
- Actual saved request/token evidence from Graphiti core 0.31.2
  with \`OpenAIGenericClient\`, ninfer Qwen3.8-27B,
  \`enable_thinking:false\`, \`structured_output_mode=json_schema\`
  contained valid \`{"extracted_entities":[]}\` and \`{"edges":[]}\`,
  short 6–10 token completions and \`finish_reason=stop_token\`.
  These are **valid empty model responses**, not a JSON parsing
  failure, HTTP failure, or output-token exhaustion.
- Content of the five records was substantially meta/procedural.
  However two subsequent clean relational decisions were
  independently staged in \`g_issue75_remediation\`:
  \`81c54716-73af-4ede-aa71-d7edae2e5697\` under
  \`json_schema\`, and
  \`a0c3c565-430b-4846-af64-a24266b0b2c9\` under
  \`json_object\`. The operator-run one-shot reported drain exit=0,
  materialization/readback exit=3 for **both**, and stopped.
  Therefore "the original statements were not graphable" is
  INSUFFICIENT as a global diagnosis; investigate why the new
  positive controls also fail. No source changes were published.
- Existing group \`g_issue75_test\` and its eight old records,
  as well as the two remediation attempts, must be preserved
  as forensic evidence. Do not replay, rewrite status, or
  delete/forget them to make a test pass.
- Last post-exit evidence bundle:
  \`/tmp/opencode/issue75-b75/final-qual/remediation/evidence-20261101T192051Z\`
  (14 artifacts with SHA256SUMS). Startup scripts in
  \`/tmp/opencode/issue75-b75/final-qual/remediation/\`.
  Full local paths and binaries are leads, NOT current authority.
  Read actual files, current service state and source before use.
- The post-exit launcher printed \`RESULT: NOT_MATERIALIZED\`,
  \`mode_used=json_schema->json_object\`, despite process rc=0
  for cleanup. Preserve this distinction: wrapper rc=0 !=
  acceptance PASS.

## Direct-harness bootstrap — explicit process identity

Launch ONE primary Codex CLI session from the **actual native binary**
through a resolved absolute executable path, **not** a PATH-priority
\`openviking-agent-run\` or \`openviking-agent-shims/*\` launcher.
Antigravity CLI is an alternative if installed and its native
binary/operation are positively identified. Do not infer the CLI
argument syntax or physical path from historical GHDEV-08: inspect
\`type -a\`, \`command -v\`, \`readlink -f\`, \`file\`, package
metadata and process argv. Check installed version, current hook/
plugin behavior, startup identity and effective environment.
Do not replace the user-installed shims or tamper with PATH
globally. Do not suppress normal Codex/Antigravity safety prompts.
Run from an isolated checkout at the verified branch head, and
keep all work, evidence and scratch paths separate from production.

**The direct launch is an execution-plane change, not permission to
disable a safety interlock.** Direct binary launch means no shim-held
SH \`flock\` lease for the agent lifecycle, but the installed
OpenViking gate may still classify active \`codex\`/\`agy\`
processes as harnesses. Do not call its standard post-exit
\`observation()\` and interpret \`harness_active\` as a defect.
Do not patch the gate's process classifier, config, lock path,
quiet grace or service to bypass that condition.

For any local ninfer-backed Graphiti/OpenCode inference while
the direct agent is active, explicitly establish a **bounded
experiment-level exclusive resource exclusion**:
1. Verify direct agent uses a remote/provider model, not the
   single local \`:8001\` inference engine; classify active
   OpenCode/Codex/AGY processes by actual argv and GPU endpoint,
   not by executable name alone.
2. Authenticate the existing shared lock path and current gate
   health/queue, installed scheduler metrics, model concurrency,
   active/waiting inference, and 30s quiet grace. Preserve the
   durable lock inode and all gate settings. Unavailable or
   contradictory indicators fail closed.
3. Acquire the SAME cooperative EX \`flock\` on the existing
   shared lock path **only around a bounded GPU-consuming test
   transaction** (direct agent stays outside the shim-held SH
   lifecycle lease). Require empty running/waiting and no
   competing local-GPU client across a quiet interval, then
   recheck inside EX before inference. Hold EX through the
   asynchronous Graphiti extraction and terminal readback or
   verified disposable-worker quiescence; never release on a
   mere \`add_memory\` ACK or episode-node presence. One
   inference-consuming transaction at a time.
4. While EX is held, the production OpenViking commit gate
   cannot acquire EX for its own writer. Keep diagnostic runs
   reasonably bounded, inspect gate backlog before and after,
   and release after each terminal transaction so production
   work is not starved. Coordinate with foreground user workloads;
   do not kill another process to obtain admission. If ordinary
   model request concurrency/queue state is ambiguous, stop
   GPU work and explain the blocker.
5. If the existing gate code prohibits manual EX ownership
   under the live deployment, or a verified production worker
   does not honor the same cooperative lock, STOP for a
   specific Central authority decision; do not substitute a
   fake environment variable, remove the lock file, disable
   the process scan, or run concurrent uncoordinated inference.
   Establish a safe **direct** test path, not a shadow
   scheduler or new permanent service.

An ephemeral host-local supervisor/command wrapper may implement
these checks when justified, but it must be auditable, scoped to
disposable test endpoints, without persistent privilege, and
must not alter production gate policy. If a test launches a
fresh local OpenCode process, explicitly verify its plugins/hooks
and isolate state, journal and target graph group; its LLM
requests must run serially with Graphiti extraction under the
same EX ownership. Do not create overlapping OpenCode and
Graphiti local requests on the single-serving GPU.

## Authorized host-mutable / read-only boundaries

Allowed writable surfaces:
- A NEW private worktree at the authenticated Issue #75 SHA
  (uncommitted candidate source/test changes within
  \`docs/issue-75/v2-candidate/\` only).
- New unique scratch root under \`/tmp/opencode/issue75-direct/\`
  and per-test disposable Graphiti group(s)/journal(s)
  (start with new names, never reuse the original forensic
  group; persist exact IDs).
- Disposable alternate LiteLLM/Graphiti config,
  helper scripts and localhost listeners within verified
  unused ports; bounded logging/shape-only traces and test
  fixtures without credentials.
- Non-production temporary adjustments to the installed
  Graphiti adapter/extraction path **only through isolated
  copies/configs**, including local testing of a justified
  parser, prompt, extraction model profile, generation
  parameters, fallback, or supported API contract.
- Focused source tests and regression documentation,
  local diffs prepared for Central, with rollback assets.

Protected surfaces: shared OpenCode configuration/plugins,
production Graphiti \`:8766\`, LiteLLM \`:8002\`, ninfer
\`:8001\` server config, FalkorDB production groups and
existing episodes, OpenViking daemon/commit gate/shims,
credentials, protected Git refs, other projects and their
data. Services may be inspected; no shared restart, config
write, data deletion, production graph migration, install
upgrade, gate weakening, force push or remote GitHub write.
Use existing shared FalkorDB only with a **new unique
group_id**; if database-wide isolation cannot be
demonstrated, use a disposable database instead.
No blind retry of unknown/persisted remote operations.

## Investigate, correct, validate — one integrated campaign

**1. Explore and establish reproducible source/host authority.**
Inspect the complete one-shot evidence bundle: per-attempt
journal, actual remote UUIDs, \`get_episode_entities\` with
\`episode_uuids\` AND \`group_id\`, materialization/readback
report, Graphiti worker and ninfer completions, \`json_schema\`
vs \`json_object\` effective settings, extracted JSON and
sampled request generation parameters. Verify full artifact
SHA256 coverage and no secret exposure before publication.
Use actual installed graphiti-core 0.31.2 and pinned MCP source,
not inferred upstream API behavior. Record exact HEAD,
runtime package versions, service process paths and config
hashes, and true executable path of direct harness.

**2. Diagnose beyond the known empty-array symptom.**
Compare positive-control prompt/model request and response
against a known healthy graph-forming historical seed.
Check entity extraction instructions, entity-type
descriptors, Graphiti's local text normalization,
request \`response_format\`, tool/function-call behavior,
structured-output schema coercion, Graphiti parsing and
node/edge write, and effective inference sampling parameters
(including engine defaults). Distinguish genuinely empty
model decisions from wrong extraction prompt binding, output
normalization, conflicting schema, overaggressive selection
or a model unable to do this extraction with the current
prompt/profile. Instrument only disposable workers and
redact/store traces privately.

The diagnostic is **not limited** to toggling structured-output
mode: both qualified configurations failed on clean relational
sentences. Examine model behavior under the same actual
extraction prompts, direct model API with the relevant schema,
and through Graphiti. A viable repair may be in the
disposable Graphiti integration, client configuration or
effective prompt; do not mutate production. If an alternate
already-installed local model must be compared as a bounded
diagnostic, record its exact identity and cost and treat
changing the production model as a separate Central decision,
not an automatic promotion.

**3. Make coherent bounded corrections in the disposable
subsystem.** Codex/AGY may autonomously implement, inspect
and iterate over local experimental adapters, configs,
Graphiti prompt/model parameter binding, and in-scope
candidate-source tests. Fix underlying contract violations,
not exceptions or tests. Do not hardcode test facts or inject
edges directly. Do not bypass Graphiti structured validation
or mislabel an unverified LLM inference as code-verified.
Central retains authority for repository semantic
integration and final production selection; return complete
candidate patches and rationale, not an unreviewed merge.

**4. Test in one local campaign.** CPU-only preflights
(static/lint/parser/unit tests) first, then actual live
Graphiti extraction under the bounded EX protocol above.
Use a fresh, human-understandable relational fact with
genuine \`user-stated\` or \`tool-reported\` provenance, not
the old five meta instructions. Verify
\`pending -> submission_unknown -> queued -> stored\`,
\`get_episodes\` group/name/remote UUID,
\`get_episode_entities\` >=2 entities and >=1 meaningful
edge (or a justified different minimum matching source
semantics), then a fresh independent process calls native
\`search_memory_facts\` AND the Issue #75
\`Memory.search\`/context formatter. Distinguish a
native Graphiti fact existing from the stricter relevance
gate admitting it. Use source and source-ref matching,
not a fact-string hardcoded match. Keep an independent
negative control for source/group isolation and secret
exclusion. If desired, run a fresh stock-V2 OpenCode
session with the candidate plugin, observe journal-only
capture during the session, release any local model request
before performing gated extraction, and confirm new
source-attributed recall afterward. Do **not** require
perfect reranker precision or repeat full 12-query
holdouts. Permit a small number of controlled iterations
as justified by observed defects; stop when functional
acceptance is satisfied.

**5. Preserve evidence and restore host.**
Keep the old \`g_issue75_test\` eight records and
\`g_issue75_remediation\` two failed materializations
unchanged. No bulk deletion. Cleanup only self-created
disposable workers/listeners/scratch data, preserving a
nonsecret evidence bundle and optional test graph for
Central's verification. Check shared models/Graphiti,
OpenViking gate health, queue and lock readiness, correct
cleanup and no effects on protected groups. Source code
patch must be a complete \`git diff --binary\` in a
cleanly identified worktree, with tests and exact hashes.
No commit/push/PR.

## Completion, escalation, handback

Pass if **one truly new** graphable source-attributed
event produces ≥1 meaningful indexed edge, is retrievable
by a fresh process, and the workflow shows no active
local-GPU contention or protected-state mutation.
A second test can qualify native V2 capture integration,
but do not turn functional success into an indefinite
sampling campaign.

A continuing in-scope failure is part of the **same**
campaign; do not bounce to Central for each model
parameter, Graphiti parser, endpoint or fixture change.
Escalate only if remediation requires a protected
production change, a substantive new architecture, a
different model not already authorized for diagnostic
comparison, a GPU isolation invariant cannot be
enforced, or the final proof demonstrably fails
after bounded correct attempts. If final state is
PARTIAL, deliver the best proven causal finding and
complete reversible patch/proposal with no invented PASS.

Typed handback:
\`\`\`text
RESULT=PASS|PARTIAL|BLOCKED|FAIL
HARNESS=<codex-cli-direct|antigravity-cli-direct>; EXECUTABLE=<resolved path>; SH_LEASE_HELD=no (measured)
SOURCE_HEAD_SHA=<40 hex>; SOURCE_DIFF=<paths/hash>; GITHUB_MUTATIONS=none
EXTRACTOR_ROOT_CAUSE=<actual request, parsed response, implicated installed code>
PREVIOUS_ATTEMPTS=<json_schema and json_object v0/v1 with graph counts, preserved>
HOST_CHANGES=<disposable config/module diffs, SHA256, rollback>
MODEL_IDENTITY=<exact model/backend/runtime, effective parameters>
GPU_EXCLUSION=<same lock/owner, concurrent request metrics, grace, admission/release proof>
INTEGRATION=<journal IDs, episode UUID, nodes, edges, fact and source, fresh Memory.search, OpenCode V2>
TESTS=<focused CPU + native process and Graphiti, exit codes>
PRODUCTION_NONREGRESSION=<no changes to production services/groups, OpenViking gate health, cleanup>
ARTIFACT_BUNDLE=<path, manifest hash and privacy inspection>
COMMAND_SHAPE_FRICTION=<observed command rewrites/denials with canonical GHDEV-10 fields>
OPEN_BLOCKERS=<none or exact authority/invariant blocker>
\`\`\`

No remote publication or production configuration promotion.
On success Central independently reviews the local patch,
runtime evidence, exact HEAD and one PR; it does not require
another reranker campaign or manually assembled operator
readbacks.
<<< LOCAL_AGENT_CONTRACT_END >>>
