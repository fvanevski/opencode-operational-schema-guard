<<< LOCAL_AGENT_CONTRACT_BEGIN >>>

# GHDEV #101 — C6.3 final provider+MCP closure (one Hermes campaign)

HARNESS=Hermes fresh independent host-supervisor session, CPU-only except bounded ordinary native-model acceptance
REPO=fvanevski/opencode-operational-schema-guard
ISSUE=101
PARENT=98
BRANCH=issue/101-security-boundary
TARGET_HEAD=<Central provides exact full head after staging>
TARGET_TREE=<Central provides exact tree after staging>
ACCEPTED_MAIN=df703861714717b795465423939f4563cb3d08e6
CENTRAL_PLAN=docs/issue-101/c63/C63_OBSERVER_AND_MCP_ACCEPTANCE.md
CENTRAL_OBSERVER=docs/issue-101/c63/provider-marker-observer.mjs
CENTRAL_MCP_GATE=docs/issue-101/c63/mcp-capability-gate.mjs
PRIOR_P1_STATUS=PASS, accepted C6.2 project ready/home fail-closed in same epoch
PRIOR_P2_STATUS=UNVERIFIED, NInfer metadata-only
PRIOR_P3_STATUS=UNVERIFIED, MCP tools/list missing

MISSION: Achieve source-verifiable provider-input dual memory and actual model-exposed MCP capability classification on the **existing** working sandbox-enabled service. Reuse C6.1/C6.2 results, no broad requalification or new PR. Central has supplied all substantive source code and security acceptance policy; your role is host integration, one short reversible observer window, local source/endpoint qualification and one privacy-preserving evidence handback.

## First: source and safe preflight

- Read the locked compact GHDEV skill once; it is operator-maintained, never patch it or write self-improvement references. Read C63 plan and both tools/tests from exact HEAD. Authenticate main and branch/tree with GitHub (fetch before local proof) and create a clean detached worktree without touching the operator checkout. No repository or GitHub writes.
- Run `node --check` on both `.mjs` tools and `node --test docs/issue-101/c63/*.test.mjs` (14 focused tests currently verified centrally on Node 22.16.0). Verify observed producer exits, not pipeline status; read package source before running. Do not substitute a plugin/security library or write a new observer.
- Verify current native service invocation/port, actual effective OpenCode provider config and model route, service.json authentication path, sandbox loaded to real project location, Graphiti and OpenViking once each, `probe` still disabled, EX/curator status as observed (pre-existing curator auto-restart is not a new regression). Record exact main/source/config/services, current service epoch and existing launcher. Use canonical shared EX lock/gate; do not seize/replace it. Stop if production already unhealthy before work.
- Confirm existing LiteLLM upstream is really `127.0.0.1:8002` (or identify precise alternate loopback origin) and the existing provider expects HTTP/1.1 OpenAI-completions semantics. If compatibility conflicts materially, do not patch production or improvise another relay; return precise evidence to Central. Validate the central observer against disposable mock provider first, verify loopback-only listener, private `0700` scratch/`0600` files and clean start/shutdown before service changes.

## One reversible observation window

- Preserve a private byte-verified rollback of the exact **current** generated OpenCode config, provider baseURL, normal launcher and necessary authentication metadata without printing secrets. The previous C6.1 sandbox/config is the normal baseline; DO NOT restore a pre-sandbox C6 rollback file. Reuse existing safe systemd `serve --service` lifecycle and private credential loading. Do not change HOME/XDG, application SQLite, source memory modules, graph state, sandbox policy, model, LiteLLM/NInfer or unrelated MCP config.
- Start the central observer on `127.0.0.1:18791` forwarding to the verified original loopback provider endpoint; use a newly generated high-entropy challenge file and private new receipt path. Confirm health before switching the generated provider baseURL to observer. Preserve existing URL path prefix, model ID, tool-calling/streaming semantics, headers and auth.
- At an EX-safe idle boundary, apply the **one** reversible generated-config provider-route change and recreate the original service through its known-good launcher. No speculative restarts or new service topology. Do not leak generated service.json password via argv, environment dump or logs. Verify native authenticated project client, actual completion route and current sandbox+memory plugin registrations after promotion. If startup or provider call fails, rollback the exact old provider config and service and return `FAIL_ROLLED_BACK` with non-secret diagnostics.
- Run a fresh ordinary source-relevant OpenCode project-bound native session with a challenge in the user question (no marker names, no real secrets). Read central observer receipts directly; a qualifying record must have `challenge_present_in_user=true`, both `*_complete_in_system=true`, `user_marker_echo=false`, `qualifying=true` and an actual upstream success response, correlated with the new session and service epoch. A few natural source-relevant follow-up prompts within the same short window are allowed if model context is legitimately absent; do not force graph insertion or start a benchmark cohort. If no qualifying event appears despite eligible source, collect decisive evidence and stop rather than making up context.
- Once qualified or a material limit is reached, restore the **original** provider config/route, stop the observer, and recreate the original service (normal restart for rollback is part of the planned single temporary observation). Verify original config SHA restored, listener/auth/client, project sandbox ready, Graphiti/OV registered once, `probe` still disabled and normal EX/curator non-regression. Do not leave observer running. The observer's private receipt contains no prompt or credential body; inspect its logged fields before attaching it.

## In the SAME campaign: model-exposed MCP tool audit

- Inspect actual project-scoped OpenCode tool catalog and connected MCP `tools/list` (not just config or `mcp list` server names). Read tool names and schemas and bounded server implementation or endpoint authority. For each actively model-exposed tool that can touch host files, execute code/shell/processes, or fetch arbitrary network/local URLs, classify real location, transport and effective containment. A same-host HTTPS MCP is still a same-host service; a trusted server name is not an execution boundary. This work is CPU-only and requires no graph/model writes.
- The central `mcp-capability-gate.mjs` checks the sanitized inventory schema (see `.test.mjs`) and refuses missing active tools or assumed containment. Populate the report from actual tool catalog and host implementation evidence. A `REVIEW_READY` result is NOT automatic P3 PASS: return primary tool/source evidence for Central to inspect. Confirm disabled `probe` absent and failed `gitnexus`/`serena` not callable. Do not re-run the prior secret bypass test or ask any model for real credentials.
- If a concrete OPTIONAL model-visible host command/file bypass exists, narrowly disable only that optional exposure through supported generated config under the same staged rollback discipline, then re-read effective registry and rerun the checker. This is authorized incidental capability narrowing, not an invitation to redesign MCP or disable needed memory services. Stop and escalate if remediation needs substantive source/API redesign or degrades core Graphiti/OV utility.

## Authority and stop conditions

ALLOWED: exact ref validation, disposable CPU tests/fixtures, authenticated live readback, bounded local `tools/list` and MCP source audit, short private scripts for redaction, temporary central observer launch, one provider-route promotion and restoration with normally-required two service lifecycle events, a few genuine source-relevant native model prompts, private evidence archive, narrowly reversible disabling of an actually exposed OPTIONAL unsafe tool after direct evidence. Ordinary read-only diagnosis and incidental host compatibility within this subsystem are in scope; keep one coherent campaign rather than micro-handoffs.

FORBIDDEN: GitHub/PR writes, repo source edits, new observer code/proxy implementation, persistent logging, raw provider body retention, full env/secret/hash dumps, changing current model/GPU services, broad service relaunch loops, HOME/XDG relocation, OpenCode app-DB writes, source/Graphiti/EX curation/deletion/replay, general security redesign, making all MCPs disabled for an easy PASS, unlocking/editing GHDEV skill, unsafe sandbox fallback, third-party feature campaign. Stop on unsupported runtime integration, inability to safely restore, source-level security gap, unresolved host-executable model tool or unauthorized secret exposure. Do not equate provider marker proof with general model answer correctness.

## Handback: one manifest-verified packet

Return actual test producer exits and counts, current main/branch SHA and tree, tool source hashes, service/config before/temporary/after, observer PID/port/status/shutdown, a private sanitized actual provider request observation (challenge-linked, message roles + marker spans, provider successful status, native session and same epoch), actual MCP tool names/schemas/capability classifications, `mcp-capability-gate` result, zero-or-enumerated unresolved executors, final normal provider route and service health, rollback identity, any optional tool narrowing, privacy, command-shape friction and all limitations. Supply one allowlisted `.tar.gz` of private sanitized JSON/JSONL evidence with individual SHA256 manifest verification, archive SHA256/bytes/member-count and no unsafe paths. Archive original provider request bodies NONE (observer never writes them); originals stay only transient in process memory. Do not publish the packet to GitHub.

RESULT=PASS|FAIL_ROLLED_BACK|BLOCKED|PARTIAL
MAIN_SHA=<full 40hex>
TARGET_SHA=<full 40hex>
TARGET_TREE=<full 40hex>
CENTRAL_TESTS=<node --check and node --test; exits/counts>
OBSERVATION_TOOL_SHA256=<two central files>
BASELINE_CONFIG_SHA256=<full>
TEMP_CONFIG_SHA256=<full>
FINAL_CONFIG_SHA256=<full>
SERVICE_EPOCHS=<before/temp/after; actual PID/start/invocation>
PROVIDER_ROUTE_RESTORED=PASS|FAIL
OBSERVER_STOPPED=PASS|FAIL
P2_PROVIDER_BOUND_DUAL_MEMORY=PASS|FAIL|UNVERIFIED
P2_NATIVE_SESSION_AND_REQUEST=<workspace, session, challenge_present, marker positions, status and evidence ref>
P3_TOOL_CATALOG_COMPLETE=yes|no
P3_MCP_GATE=REVIEW_READY|FAIL
P3_ACTIVE_UNCONTAINED_HOST_EXECUTORS=<zero or details>
P3_RUNTIME_STATUS=<protected/not_exposed/unresolved by tool>
P3_PRIMARY_SOURCE_EVIDENCE=<relevant source/provenance refs>
CORE_GRAPHITI_OPENVIKING=PASS|FAIL
HOME_PROJECT_SANDBOX_NONREGRESSION=PASS|FAIL
EX_CURATOR_NONREGRESSION=PASS|FAIL|UNVERIFIED
CONFIG_OR_TOOL_NARROWING=<none or exact optional tool(s) + evidence>
NONMUTATION_OUTSIDE_SCOPE=PASS|FAIL
EVIDENCE_ARCHIVE=<verified private path, SHA256, bytes, members>
EVIDENCE_PRIVACY=PASS|FAIL
COMMAND_SHAPE_FRICTION=<only material diagnosed shapes>
PROPOSED_SKILL_EDITS=<none or evidence-backed proposal; no writes>
CENTRAL_FINAL_GATE_READY=yes|no (reason)

Stop after final restored-service proof and one packet. Leave #101 and parent #98 open for Central's independent gate and separate parent adjudication.

<<< LOCAL_AGENT_CONTRACT_END >>>
