<<< LOCAL_AGENT_CONTRACT_BEGIN >>>

# GHDEV #101 — C6.4 final P3 MCP boundary review and closure handback

HARNESS=Hermes (fresh session, independent host supervisor)
HOST=Garuda Linux, CPU-only; NO model inference unless native project registry cannot be resolved without one benign query
REPO=fvanevski/opencode-operational-schema-guard
ISSUE=101; PARENT=98
BRANCH=issue/101-security-boundary
EXPECTED_C64_SHA=<immutable full Git commit supplied at kickoff; prove branch ref>
EXPECTED_TREE=<immutable full tree supplied at kickoff>
ACCEPTED_MAIN=df703861714717b795465423939f4563cb3d08e6
CONTROLLING=docs/issue-101/c64/C64_P3_FINAL_BOUNDARY_ARCHITECTURE.md
CENTRAL_VERIFIER=docs/issue-101/c64/p3-evidence-preflight.mjs
PREVIOUS_EVIDENCE=ghdev101-c63-evidence-20261117T225720Z.tar.gz SHA256 ddeaf00826c93c6a77bbf7583edaaed74b63fe247f04152e3b7d65fc24d6dee1

MISSION: One P3-only source-backed per-tool exposure/authorization check, with at most narrow effective model-tool permission restrictions and one evidence packet. C6.3 P2 provider-bound dual memory (27/27 qualifying), original provider route and location-scoped sandbox are already accepted. Do not repeat them.

## Phase A — exact source and runtime authentication

- Fetch and prove target branch HEAD, commit/tree, accepted main and dirty-state isolation before any `cat-file`/worktree assumption. Use a detached collision-safe worktree, do not modify operator checkout. Read this contract, architecture and centrally authored verifier/tests; do not reload archived GHDEV recipe or modify the locked skill.
- Run `node --check` and `node --test docs/issue-101/c64/*.test.mjs` plus one negative regression using the sanitized prior C6.3 archive (its empty catalogs must FAIL). Preserve actual producer exits.
- Snapshot current actual `ghdev-issue100b-final-opencode-serve.service`, invocation/PID, effective config SHA, restored baseURL to LiteLLM 127.0.0.1:8002, project path `/workspace/opencode-operational-schema-guard`, original bwrap/toolGuard, current Graphiti/OpenViking plugin count, EX/curator AS OBSERVED. Avoid credential values. No repeat service stop if no rule change is needed.

## Phase B — full live project-scoped MCP authority inventory

- Use authenticated *project-scoped* OpenCode V2 status (never a `/home/filip` no-location status as project proof). Collect currently initialized MCP connections AND actual `tools/list` on every connected endpoint via the supported already installed client/API. Capture all tool names and sanitized `inputSchema` property names/types, plus descriptions when safe. For current baseline expect Caveman, Context7, Firecrawl, Graphiti and OpenViking; include any newly connected service and STOP if unrecognized executable server cannot be classified. Do not invent empty `tools` arrays to represent unavailable introspection; missing capability is a blocker to report.
- Collect actual effective model-reachable tool names in this project and subagents/Code Mode nested groups, correlated to current service epoch/config. Do not assume prior C4/C5 static `tools[]` still complete. An underlying MCP action reachable through `execute` is still model-exposed even if absent from the provider top-level native array. Record effective V2 per-tool permission evaluation/denials from installed version rather than interpreting generic config alone.
- For each discovered tool, map normalized model action (`<server>_<tool>`), actual schema, runtime host authority, on-host/remote transport, source digest, effective permission and source-exact constraint. Populate the centrally specified `p3-closure.json`, SHA256-pinned primary records and decisions. Simple classification and evidence extraction are allowed; do not design new security architecture.

## Phase C — three focused authorization boundaries

1. Graphiti: Current exposed `clear_graph`, `delete_episode`, `delete_entity_edge` have destructive effects; default to narrowly denying model access to these tools using actual V2 ordered permissions while retaining Graphiti read tools and trusted post-exit Graphiti worker. Evaluate `add_memory`, `add_triplet`, `build_communities`, `summarize_saga` against the issue's non-interactive-write rule. Verify **effective denial** by source-backed policy evaluation and non-mutating runtime evidence; never execute graph deletion or create test graph episodes. Don't rewrite Graphiti worker or server.
2. OpenViking: Inspect authenticated read-only registrations in both `viking://~/tools` and `viking://agent/tools` including registered tool counts and live mounts, without revealing stored headers. Resolve what `invoke_mcp_tool` can dispatch on this actual host. If registry/mount authority cannot be proven bounded, narrowly deny model use of `openviking_invoke_mcp_tool` (and any equivalent indirect invocation path) in effective V2 permissions while preserving normal OpenViking context. No physical delete/change to OpenViking resources or gateway registry.
3. Firecrawl: Inspect installed `firecrawl-mcp` version/commit and backing Firecrawl fetch engine/proxy paths for `scrape`, `search.scrapeOptions`, `agent`, URLs/actions. Prove private+loopback+metadata IP denial, DNS/redirect revalidation, scheme restrictions and JS/browser action confinement **at the real fetch boundary** or effective independent network isolation; HTTP(s) syntax alone is insufficient. If absent/unverifiable, selectively deny model-exposed unsafe URL/action-fetch operations and preserve bounded search/docs capabilities where source-supported. Don't send a request to real internal/metadata/credential services; source inspection and existing safe fixtures suffice.

Routine effective permission-rule narrowing is allowed **only** for a demonstrated model-reachable high-risk path. Record initial config SHA and private 0600 rollback before change, make minimal generated-profile-supported edits (without altering any model/provider/sandbox/Graphiti/OV source), and use at most one safe service reload/restart plus one rollback restart if needed. If multiple needed denials are discovered in this same phase, apply them as ONE coherent permission patch and verify the final project registry in the same service epoch. Resolve routine non-semantic CLI/read-only format issues independently. Do not start a new bypass-testing campaign or repeatedly edit policy by trial and error.

## Phase D — authoritative evidence and one handback

- Build one private 0700-root evidence packet satisfying the staged `p3-evidence-preflight.mjs` schema, with real `tools/list` nonempty and exact hashes, effective project-specific model registry, OpenViking registry evidence for both scopes, Firecrawl installed-source/readback constraints, Graphiti effective policy, and all discovered tool decisions. Save source/host records with exact installed path+SHA and sanitized excerpts; preserve private originals. Run preflight and report REVIEW_READY/FAIL + exact producer exit and count; never call it independent security PASS.
- Confirm original or narrowly amended configuration, normal authenticated project-native OpenCode, HOME fail-closed, repo ready, Graphiti+OpenViking context and prior UUIDs intact, EX lock/curator non-regressed and ordinary provider route (no observer). P2 from C6.3 is reused, not recreated. Restore pre-patch config on service regression; never leave production degraded.
- Attach ONE allowlisted digest-verified sanitized archive with p3-closure.json, primary records, evidence digest manifest and nonmutation/reload proof. Exclude real credentials/password hashes, original provider bodies, active canary strings, full environment, sensitive upstream MCP auth headers, sensitive source payloads. No GitHub evidence upload.
- State only source-supported conclusions: don't infer network transport implies off-host, service trust implies capability confinement, or an empty `tools/list` proves no capability. If a tool cannot be classified/contained, return BLOCKED and exact narrow follow-up; do not weaken the verifier, regenerate missing facts, broaden network/mount access, or change trusted tests.

AUTHORIZATION: READ current live interfaces and exact installed source, authenticated read-only MCP/OV registry, direct original tool schemas, service/config/EX status; WRITE private scratch/report; OPTIONAL one reversible permissions-only model-tool narrowing and controlled service restart. NOT AUTHORIZED: GitHub writes/PR/merge/issue-close, repository code/test edits, custom security middleware, service database DML, HOME/XDG relocation, new model/Graphiti daemon, new provider observer, full Graphiti ingestion, destructive/secret-path tool calls, global Hermes configuration or locked skill changes, removing entire useful MCP services without specific necessity.

## Typed handback

RESULT=PASS|BLOCKED|FAIL_ROLLED_BACK|PARTIAL
MAIN_SHA=<full SHA>
TARGET_SHA=<full SHA>
TARGET_TREE=<full SHA>
CENTRAL_TESTS=<exact syntax/unit/negative regression producer exits and counts>
SERVICE_BEFORE_AFTER=<actual pid/invocation/config digests; no restart if unchanged>
PROJECT_LOCATION_AUTHENTICATED=PASS|FAIL
MCP_CONNECTED_CATALOGS=<server: tools/list tool count, primary ref, SHA, model exposed count>
MODEL_REGISTRY_COMPLETE=PASS|FAIL (including Code Mode and subagents)
GRAPHITI_MUTATOR_BOUNDARY=DENIED|SOURCE_BOUNDED|BLOCKED (+ affected tools and effective proof)
OPENVIKING_UPSTREAM_REGISTRY=<user count/account count/mount count or exact limitation>
OPENVIKING_INDIRECT_INVOCATION=DENIED|VERIFIED_BOUNDED|BLOCKED
FIRECRAWL_FETCH_BOUNDARY=SOURCE_VERIFIED|DENIED|BLOCKED (+ redirects/private IP/JS proof)
OTHER_EXECUTION_TOOLS=<per-tool evidence and residuals>
P3_PREFLIGHT=REVIEW_READY|FAIL (+ actual exit and diagnostics)
P3_ACTIVE_UNCONTAINED_MODEL_EXECUTORS=<0|specific names>
CONFIG_CHANGES=<none or exact narrow ordered permission actions + readback>
PRODUCTION_NONREGRESSION=PASS|FAIL
P2_PROVIDER_BOUND_DUAL_MEMORY=REUSED_C63_PASS (no new observer)
EVIDENCE_ARCHIVE=<private path/bytes/full sha256/member count/check>
EVIDENCE_PRIVACY=PASS|FAIL
COMMAND_SHAPE_FRICTION=<only material sanitized diagnosed differences>
PROPOSED_SKILL_EDITS=<recommendations only, no writes>
CENTRAL_GATE_RECOMMENDATION=READY|BLOCKED (with concrete reason)

STOP after one combined P3 campaign and archive. #101/#98 issue closure and any coherent PR remain Central-owned.

<<< LOCAL_AGENT_CONTRACT_END >>>
