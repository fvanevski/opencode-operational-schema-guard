# Issue #75 — authorized inference maintenance-window continuation

**Governing status:** Active, supersedes the BLOCKED execution disposition in `DIRECT_HARNESS_BLOCKER_ADJUDICATION_20261102.md` **only with respect to temporary competing-client quiescence**. Root-cause evidence and all data protections remain in force.

**Authorization:** The user explicitly approved a bounded maintenance window permitting the local agent to *temporarily quiesce the specifically identified competing inference clients*, subject to preflight verification, rollback and service restoration, while preserving the OpenViking gate and protected data. This authorization does not approve permanent production configuration changes, blanket stopping of unrelated services, security/gate bypass, modifying persisted memories, GitHub writes, or promoting an experimental extractor.

<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=75
BRANCH=issue/75
REQUIRED_START_HEAD=exact SHA pinned in Central kickoff
CONTROLLER=one verified Codex CLI direct or Antigravity direct agent
APP_SERVER_SUPERVISION=passive-only-if-present
MECHANICAL_REMEDIATION=not-authorized
LOCAL_SUBSYSTEM_REMEDIATION=allowed
REMOTE_UPDATE=forbidden
CREATE_PR=no
MERGE=no
PRODUCTION_PROMOTION=no
MAINTENANCE_WINDOW=authorized-by-user
ALLOW_TEMPORARY_CLIENT_QUIESCENCE=yes-subject-to-preflight-and-rollback
ALLOW_PRODUCTION_CONFIG_EDIT=no
ALLOW_GATE_CONFIG_OR_SOURCE_EDIT=no
ALLOW_PERSISTED_GRAPH_MUTATION=disposable-new-group-only
ALLOW_REPLAY_OF_PRIOR_EPISODES=no
PRIMARY_HOST_EXECUTION=continuous-autonomous-investigation
CENTRAL_REVIEW=mandatory-after-handback

## Objective

Use the newly authorized **reversible maintenance window** to establish an actual exclusive ninfer inference interval, resolve the remaining Graphiti empty-extraction defect if feasible, and demonstrate one new genuine source-attributed memory that becomes a materialized indexed graph edge and is recalled in a fresh process. Return ONE consolidated handback. Do not repeatedly request the operator to execute diagnostic commands.

This is a continuation of the current direct-CLI host campaign, not another broad initiative or an excuse to tune relevance again. Read the entire existing `DIRECT_CLI_HOST_REMEDIATION_CONTRACT.md`, `DIRECT_HARNESS_BLOCKER_ADJUDICATION_20261102.md`, `PRAGMATIC_RETRIEVAL_DISPOSITION.md`, Issue #75, and relevant candidate source/tests. This contract supersedes the older prohibition on a maintenance window only to the narrow extent expressly authorized here. All remaining hard boundaries stand.

## Accepted observations, without inventing new proof

Previous direct-CLI campaign reported BLOCKED before GPU experiments because noncooperating production Graphiti and other inference clients could not be proven to honor the shared EX lock; the controller's actual model endpoint was unverified. Its 19 JS, six Python and ten mocked extraction tests reportedly passed, but complete host artifacts have NOT been inspected by Central. Source code was not modified. Host-only artifacts:

- `/tmp/opencode/issue75-direct/campaign-mRAN53f8/HANDBACK.md`
- `/tmp/opencode/issue75-direct/campaign-mRAN53f8/SOURCE.diff`
- `/tmp/opencode/issue75-direct/campaign-mRAN53f8/REGRESSION_RESULTS.json`
- `/tmp/opencode/issue75-direct/campaign-mRAN53f8/EVIDENCE_MANIFEST.json`

Prior live experiments (do NOT replay):
- Historical `g_issue75_test`: three healthy 2-node/1-edge seed episodes and five newer persisted 0-node/0-edge episodes.
- `g_issue75_remediation`: two clean relational controls in `json_schema` and `json_object`, each persisted but failed materialization and recall.
- Valid short `{"extracted_entities":[]}` and `{"edges":[]}` completions are evidence for the initial five; why the model returns no entities on clean controls is unresolved. A queued ACK, persisted episode node, or shell exit=0 from a cleanup script is not acceptance PASS.
- Relevant installed host from last verified campaign: graphiti-core 0.31.2, pinned Graphiti MCP, Qwen3.8-27B on single-serving ninfer `:8001`, production LiteLLM `:8002`, shared Graphiti `:8766`, independent embed/rerank `:8004`, FalkorDB `:6382`, and existing OpenViking lock/gate. **Treat these as historical leads; rediscover present process/service/config identity before any service action.**

## Phase A — authenticate source, ownership, tests and production clients (READ ONLY)

1. Authenticate the exact remote `issue/75` SHA and use an isolated caller-owned worktree. Do not reset, clean, stash or overwrite any of the earlier investigation worktrees. Validate installed direct controller binary/argv, current provider and *effective endpoint*, process tree, environment bindings, GPU use and whether a shim SH lease is held. The Codex App, if present, is a passive observer; one local controller is the only source writer and experiment orchestrator.
2. Inspect the four prior campaign artifacts directly, verify their manifest/files/hashes, and record changed/unmodified state, any evidence incompleteness and the documented `.pyc` preservation exception. Read actual installed gate/worker/controller source, current lock ownership and queue. Do not accidentally regenerate protected Python cache again merely for import-based inspection; if unavoidable, document exact file identities before and after.
3. Enumerate all routes capable of submitting to `:8001` (including direct local API, LiteLLM aliases, shared Graphiti worker and queued tasks, OpenCode/local coding agents, Open WebUI or other registered clients, any relevant HTTP proxy/network ingress). Tie every proposed pause to a real PID/container/unit/endpoint/connection and evidence of capacity to consume `:8001`. Do not equate "not currently connected" with inability to submit later. Look for unrecognized external ingress: unclassified clients are a STOP condition unless safely and reversibly excluded within this already authorized specific-client scope.
4. Identify existing active/waiting ninfer requests, process/shim gate owners, the Gate's pending work and health, and which client processes can produce new work. Check production workload impact and ensure no current task would be abandoned by pausing a client. Capture process/container/service status, relevant config hashes and recovery commands in a private, sanitized maintenance ledger. Save a baseline snapshot of protected graph groups/episode counts and gate health. Preflight all required rollback/restore actions **before pausing**.
5. CPU-only first: run the focused current-head Node/Python test suite if no exact equivalent already proved on the same source and runner, verify source/test integrity, inspect the actual Graphiti extractor/LLM caller and prompt-binding path and ensure candidate disposable configurations are syntactically valid. Do not start GPU-backed extraction during this phase.

## Phase B — controlled maintenance window (AUTHORIZED)

The user authorizes temporary interruption of **specifically identified competing local inference clients**. You may pause/stop and later restart the identified Graphiti/LiteLLM/other ingress client *only if* you have independently shown its identity, capacity to submit to `:8001`, idle/safe stoppability, expected user-visible impact, and a verified restoration procedure. Scope to the smallest necessary set. Prefer graceful service-manager/docker/podman pause/stop workflows over killing PIDs. Do not kill a live job or abruptly stop a shared service processing an unacknowledged graph episode. Do not restart or reconfigure the ninfer model server itself solely to create a test window.

**Protected even during the window:** Existing OpenViking gate source/config/service and lock inode, FalkorDB data and old graph groups/episodes, installed OpenCode host config/plugins, credentials, production model configuration and unrelated host services. The gate may remain running and waiting; do not disable, monkeypatch or loosen its admission. Preserve ordinary authentication, approval and shell policy.

1. Check that the direct controller does **not** use the same `:8001` endpoint as its own inference provider. If it does, do not assume it can retain control while running GPU experiments; establish an independently usable controller endpoint or stop and report the required specific change. Do not silently switch models/accounts or turn off security approval.
2. Prepare one maintenance supervisor/ledger with a **bounded stop/restore transaction** and a failsafe restore path; ensure the agent cannot be left unable to issue restore actions if the model test crashes. An ephemeral supervisor is allowed for process restoration and evidence capture; not a new persistent model scheduler. Verify that the supervisor and controller themselves do not submit to `:8001` outside the exclusive experiment.
3. Snapshot the identified client state, then gracefully quiesce only the required clients. Record exact commands, exit statuses and resulting PID/unit/container/port changes. Verify no remaining independently capable competing ingress routes. A zero active-request snapshot alone is insufficient. Keep the experimental Graphiti and LiteLLM listeners private, isolated and with no production clients routed through them.
4. Acquire the **same real cooperative EX lock** at the installed canonical lock path for each bounded experimental transaction. Verify existing gate ownership/health and scheduler running=0/waiting=0, observe the installed quiet-grace interval (historically 30s), then recheck inside EX. The automatic post-exit gate's active-harness process-name check is not proof of competing GPU work in a direct-controller maintenance window, but DO NOT change or spoof that classifier; explicitly distinguish gate's ordinary post-exit policy from this user-authorized experiment-level exclusion and prove that actual competing ingress is quiesced. If the lock is not acquired or any other client can submit new work, do not run inference.
5. Maintain EX plus actual ingress exclusion until Graphiti asynchronous queue has reached a terminal condition: verified remote episode identity **and** materialized edges/recall, or verified isolated-worker quiescence with preserved unresolved state. Do not release on a queued ACK or episode-node presence. No blind retries after an uncertain request. Keep the maintenance window bounded: target <=45 minutes of competing-client downtime, with a per-experiment timeout chosen from observed Graphiti latency; a documented short extension is allowed only if all clients remain safely isolated and restoration remains assured. If restoration cannot be guaranteed, STOP GPU testing and prioritize recovery.
6. Run a minimal, self-contained **isolated** Graphiti extraction diagnostic based on the installed same Qwen profile and actual requests, not a different remote model substituted to produce a superficial PASS. Investigate effective prompt/template, structured format, JSON parsing, generation and sampling parameters, and Graphiti node/edge materialization. The two clean relational controls already failed in both JSON modes; do not simply repeat that toggle. Make bounded disposable changes and repeat a small number of justified experiments within the same maintenance window. Preserve request/response metadata with privacy redaction, actual materialization counts, UUIDs and source anchors.
7. Keep all changes to disposable Graphiti/LiteLLM integration and test group/journal until Central semantic adjudication. Candidate production-source changes may be prepared as isolated working-tree diff plus regressions, not committed or deployed. No model/safety gating shortcuts, synthetic edge insertion or test weakening.

## Phase C — functional proof and restoration

1. Use a **new unique test group**, new journal and a genuine source-attributed explicit relational statement with a predicted nonempty entity/edge outcome; do not reuse any previously submitted body/ID. Verify stable local identity, `pending -> submission_unknown -> queued -> persisted`, unique correct remote UUID, `get_episode_entities` with scoped `episode_uuids` + `group_id`, meaningful >=1 extracted edge, and **fresh-process native search plus candidate `Memory.search` / context source attribution**. Separate persisted/materialized/recalled result fields in the evidence. Use a negative group/privacy check. If one clean new event passes, do not launch a prolonged benchmark campaign.
2. If live extraction remains empty, capture the actual output and precise remaining cause, classify BLOCKED/PARTIAL, avoid further unbounded attempts, and proceed to restoration. The test is not green merely because a wrapper exits 0 or Graphiti says "Successfully processed".
3. **Restore every temporarily quiesced client** to its documented prior enabled/running posture in a finally-style cleanup irrespective of experiment success. Before and after EX release, ensure isolated Graphiti extraction is terminal or its worker is demonstrably stopped; if not safe, maintain exclusion and execute a controlled recovery rather than unlock into unknown queued model work. Stop only self-created private listeners. Once safe, release EX and restore clients in a deterministic order. Confirm production LiteLLM/Graphiti, ninfer, OpenViking gate, FalkorDB and other affected clients are actually healthy and reachable as before (not merely systemd "active"), that no service was left disabled, and that known gate backlog is healthy/no lost tasks. Do not accidentally resume a previously blocked old ingestion by restarting a paused client; inspect pending work before choosing restoration behavior.
4. Compare protected config/source hashes, group/episode identity and journal state against preflight. Preserve the old five persisted-but-factless records and both previous failed clean-fact attempts. Record any non-reversible effect (including regenerated `.pyc`) and stop further changes if restoration reveals drift.
5. Produce one comprehensive machine-inspectable private evidence bundle with SHA256 manifest, sanitized logs, exact source diff, full test commands and exit codes, grouped Graphiti UUID/fact mappings, request/response structured-shape receipts, GPU concurrency snapshots/ingress inventories, maintenance ledger with stop/restart/rollback evidence, and service health readback. Do not publish private graph bodies, credentials, token traces or unfiltered logs to GitHub. Return the artifact paths; Central will review the exact source/diff after receiving inspectable evidence.

## Hard stop / authority boundaries

- Unknown/uncontrollable inference ingress, concurrent local GPU work, gate ambiguity, unbounded asynchronous Graphiti work, unsafe rollback or an active user production job => **do not execute GPU extraction**.
- A required broad firewall/network rule, ninfer serving configuration modification, changes to gate/locking source, production graph mutation, model installation or major service architecture change requires a **new separate authorization**; it is not implied by temporary competing-client quiescence.
- Only explicitly identified and safely stoppable inference clients may be interrupted, and only temporarily. No direct destructive graph operations, global Docker/systemctl sweep, force-unlock, killing unrelated processes, removing auth or disabling logging.
- If the model still consistently returns valid empty structured entities on clean new sentences after bounded correct diagnostics, preserve exact evidence and propose the minimal remaining extractor remedy. Do not change to a different model without Central adjudication.

## Required consolidated typed handback

```text
RESULT=PASS|PARTIAL|BLOCKED|FAIL
SOURCE_HEAD_SHA=<full SHA>; FINAL_SOURCE_DIFF=<path and sha256 or none>
CONTROLLER=<native binary, argv, model-provider endpoint, SH/EX lease proof>
PRIOR_ARTIFACTS=<four prior files, manifest verification, completeness>
PRE_WINDOW=<process/service/client ingress inventory, exact state/config hashes>
AUTHORIZED_PAUSES=<each specifically identified client, reason, stop and restore commands>
EXCLUSION=<lock file/inode, owner, request metrics, quiet grace, ingress blocking proof>
TESTS=<Node/Python/mock/focused Graphiti tests, exact exits>
EXTRACTION=<actual request/model/sampling/response format, parsed entities/edges>
LIVE_MATERIALIZATION=<new local ID, group, remote episode UUID, nodes/edges and source fact>
FRESH_RECALL=<native search and Memory.search/context with source attribution>
POST_WINDOW=<service/client restart readback, health, gate backlog, protected group/config invariants>
ROLLBACK=<all changes reverted or exact blocker with residual state>
EVIDENCE_BUNDLE=<private absolute path, SHA256SUMS, privacy check>
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events=[each event with scenario, requested_shape, effective_shape, rewrite_provenance, event_kind, execution_effect, correction_or_annotation, replacement_shape, recipe_reference, resource_reference, contract_conflict, durable_gap_candidate]
  omitted_sensitive_values=<yes|no>
OPEN_BLOCKERS=<none or exact evidence and required authority>
```

Use full current GHDEV-10 command-shape fields; events=[] when none, and report rewrites and refusals even if later recovered. Report source authority separately from host observations and inferences. **One handback only.** Central owns independent review, GitHub integration and any PR/merge decision.
<<< LOCAL_AGENT_CONTRACT_END >>>
