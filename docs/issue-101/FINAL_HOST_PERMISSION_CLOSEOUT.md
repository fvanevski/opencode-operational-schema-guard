# GHDEV #101 — Final host permission closeout and closure packet

Status: Central-owned decision and one terminal Hermes handoff. This is NOT another exploratory implementation slice or a new acceptance campaign. The objective is to complete #101 using existing accepted evidence, make at most one necessary OpenCode V2 permission correction, and hand the finished gate to Central for final independent disposition.

## Source and accepted evidence

- Repository: fvanevski/opencode-operational-schema-guard
- Exact working branch before this final closeout: issue/101-security-boundary at 1dec58ffd7a2068dd73c6382fc82114f0466498f (tree 63760c74454da7cf0f02b13efb13c1e1cc183015).
- Accepted merged main: df703861714717b795465423939f4563cb3d08e6; #99 and #100 CLOSED; #101 and parent #98 OPEN.
- #101 C6.3: accepted post-sandbox provider-bound Graphiti/OpenViking coexistence (27/27 qualifying structural observer requests); original provider route restored, observer stopped.
- #101 C6.4: accepted host-attested project-scoped bwrap+V2 tool guard, Graphiti mutation restrictions, Firecrawl scrape/search/agent restrictions, 51 project-scoped MCP catalog tools, disabled probe, empty OpenViking second-tier MCP registries and viable rollback. Preflight REVIEW_READY is only evidence consistency, not runtime security certification.
- C6.4 final host observation: OpenViking add_resource appears as model-exposed, while the same host report describes an openviking_* deny with selective allows. The actual effective permission after all matching rules is NOT proved in the upload. Its input schema accepts an externally provided path/resource and the upstream fetch/network behavior has not been qualified. This is the ONLY remaining known model-security closeout question; do not infer the result from catalog presence alone.

## Central architectural decision

No OpenViking fetcher rewrite, network scanner, new middleware, daemon, graph migration, replay, provider observer, new corpus benchmark, new issue, or per-tool PR. Either prove add_resource is already **effectively denied** for all relevant model agents, or apply the minimal OpenCode V2 model-tool deny. Retain operator/trusted-service resource ingestion, ordinary read/search/recall, Graphiti curator and EX/quiet-grace semantics.

Use the installed OpenCode V2 ordered permission mechanism. An MCP tool action is the normalized <server>_<tool>, here openviking_add_resource, with resource "*" and effect "deny". Last matching rule wins, so a deny preceding a later allow is insufficient. Check the actual final effective rules for build, research, and every additional currently model-reachable agent/subagent that can invoke this MCP capability. Code Mode and subagent paths must not bypass the origin tool's effective permission. Prefer the supported base/generated profile process rather than mutating generated opencode.json independently. Preserve all non-permission provider, sandbox, Graphiti/OV, MCP, queue, EX, model and authentication settings.

The correct acceptance standard is **effective model-call prevention**, not full external analysis of OpenViking's HTTP/Git/SSH fetch backend after the model invocation is denied. This is a proportionate scope reduction and does not relax the hard credential/host-tool boundary.

If an agent currently cannot invoke add_resource, do not insert a redundant permission just to create a diff. If access is permitted, add the narrow rule in the appropriate ordered agent permissions, avoiding global OpenViking disable or broad openviking_* denial unless already qualified. The installed working rules, not an aspirational snippet, determine the placement.

## Complete terminal handoff (Hermes, independent host supervisor)

HARNESS=Hermes, fresh session, independent HOST_SUPERVISOR; normal host CPU evidence + optional single benign native project check after changed service epoch.
ISSUE=101; PARENT=98.
BRANCH=issue/101-security-boundary.
TARGET_SHA=<the exact commit from Central kickoff, must fetch and prove>.
TARGET_TREE=<exact commit tree from Central kickoff>.
MAIN_BASE=df703861714717b795465423939f4563cb3d08e6.

### A. Authenticate once; reuse prior proof

1. Fetch the exact branch, prove SHA/tree and create a collision-safe clean detached worktree only if necessary. Read this controlling document at TARGET_SHA; consult prior C6.4 material only for concrete observed rule/scope detail. No unrelated history crawling.
2. Snapshot the running shared-service epoch, generated profile config SHA, effective build/research/other agent permission arrays, full current source of those specific rules, project-scoped model reachable add_resource action, sandbox and provider identity. Do not read credentials, edit application DB or repeat MCP catalog enumeration. Use already accepted C6.4 evidence for all other tools unless new concrete contradicting evidence appears.
3. Evaluate the LAST matching rule for openviking_add_resource (resource "*") for every model-reachable agent and any applicable session/global overlays. Verify native decision from authenticated installed OpenCode 2.3.0 interfaces if available, or reconstruct exactly from loaded source+ordered rules and cross-check a supported read-only permission test. Do not invoke add_resource itself or use a sensitive target. A tool may appear in the catalog but still have an effective deny.
4. If already DENIED for all reachable agents: record exact evidence and go directly to section C. No config edit/restart.

### B. One narrowly scoped host correction only if required

1. If any active agent effectively ALLOWS add_resource, prepare a private mode-0600 rollback of current base/generated config, actual loaded service invocation and expected SHA values. Capture the original rule order and all agent identities before editing.
2. Make one coherent, smallest-supported permissions-only change through the existing profile generator: for each affected agent, insert an explicit final effective rule {action:"openviking_add_resource",resource:"*",effect:"deny"} after conflicting earlier generic allows. Preserve unrelated settings byte-equivalently at the semantic/config-object level; normal generator formatting differences alone are not failures.
3. Perform the existing safe service-reload/restart exactly once if needed, respecting EX/curator admission and established auth/service lifecycle. One rollback restart only if a material regression requires restoration. Do not restart when there is no changed config.
4. Read the loaded project-scoped effective agent rules in the final service epoch. Verify add_resource DENIED for all model-reachable agents including relevant Code Mode/subagent paths, and that ordinary OpenViking read/search/session context and Graphiti retrieval still work. This can be proven with valid native policy/readback plus one non-secret benign query if fresh native functionality needs demonstration. Do NOT issue a real add_resource call, remote URL probe or graph write. Verify HOME fail-closed, project sandbox READY, provider 127.0.0.1:8002/v1 unchanged, observer absent, Graphiti/OV once each, EX/curator not regressed, and original UUIDs/records retained as previously qualified.
5. If the supported config cannot restrict a model-reachable add_resource action, report the exact installed permission contract defect and restore the qualified baseline. No improvised middleware or source-level patch.

### C. Terminal evidence and handback

Produce ONE small sanitized, digest-verified archive containing (a) exact current source/branch/main IDs; (b) pre/post config and service identities, or unchanged identity; (c) actual effective per-agent V2 rules and last-match evaluation for add_resource; (d) Code Mode/subagent invocation coverage; (e) scoped non-regression and rollback evidence; and (f) an evidence manifest. Reuse existing C6.1–C6.4 archive hashes for earlier criteria rather than copying old data or repeating tests/metrics. Never include credentials, raw model/provider requests, canary strings, secret-bearing paths or full environment dumps. Publish nothing to GitHub.

Return:
RESULT=PASS|BLOCKED|FAIL_ROLLED_BACK
MAIN_SHA=<full>
TARGET_SHA=<full>
TARGET_TREE=<full>
SERVICE_BEFORE_AFTER=<epoch, config SHA, restart yes/no>
OPENVIKING_ADD_RESOURCE_BEFORE=<effective ordered decision by agent>
OPENVIKING_ADD_RESOURCE_AFTER=<DENIED for every relevant model agent; primary proof>
CODE_MODE_SUBAGENT_COVERAGE=<exact supported identity/evidence>
CONFIG_MUTATION=<none or exact rule diff>
NORMAL_MODEL_AND_MEMORY_FUNCTION=PASS|FAIL|UNVERIFIED (minimal check; no broad benchmark)
HOST_BOUNDARY_NONREGRESSION=PASS|FAIL
PROVIDER_ROUTE_AND_OBSERVER=RESTORED_AND_ABSENT|FAIL
EX_CURATOR_NONREGRESSION=PASS|FAIL
PREVIOUS_EVIDENCE_REUSED=<C6.1-C6.4 exact identities and no new scoring>
EVIDENCE_ARCHIVE_REQUIRED=yes
EVIDENCE_ARCHIVE_STATUS=READY|BLOCKED
EVIDENCE_ARCHIVE_PATH=<actual private path or none>
EVIDENCE_ARCHIVE_SHA256=<full hex or none>
EVIDENCE_ARCHIVE_BYTES=<count or none>
EVIDENCE_PRIVACY=PASS|FAIL
COMMAND_SHAPE_FRICTION=<typed relevant events or none, include successful command-shape recoveries>
PROPOSED_SKILL_EDITS=<proposal only, no changes>
ISSUE_101_CLOSURE_RECOMMENDATION=READY|BLOCKED (precise reason)

Stop with the complete evidence packet in this one handback. The locked Hermes GHDEV skill, Hermes global config, GitHub source, branches, PRs and issue trackers remain unchanged by the agent. Do not silently re-open accepted C1–C6 controls or manufacture new criteria. Central owns independent final review and one coherent PR/merge if needed, then #101 closure; #98 remains a separate parent gate.

## Final Central gate principle

At return, Central checks current exact GitHub source, accepted C1–C5 + C6.1–C6.4 receipts, the narrow last-rule permission outcome, final production non-regression and any single consolidated PR/merged-main requirements. **Do not require another whole-tool inventory, another provider capture, a new fixed question cohort, another security scanner or unrelated service remediation absent a concrete material regression.** Accepted scorecards are not upgraded to stronger statistical claims. A few host-attested effects and limited-sample estimates remain explicitly qualified, not indefinite blockers.

A permission-only host change does not invalidate accepted Graphiti data/retrieval, provider-bound memory proof, real-hook timing or prior deterministic CI when the relevant source/runtime inputs remain unchanged; only recheck the modified permission/public-use boundary and the final loaded service. If all hard objectives are met, finish #101 rather than launching an additional C6 sub-slice. Consolidate the already staged docs/evidence-checker files into at most one ordinary PR if repository closure requires it; do not create a PR purely for a host-only permission tweak.
