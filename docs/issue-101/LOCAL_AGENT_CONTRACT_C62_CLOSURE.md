<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
# GHDEV #101 — C6.2 final closure-evidence supplement (single Hermes host handoff)

HARNESS=Hermes fresh session, independently supervising the existing OpenCode service
ENVIRONMENT=CPU_ONLY with at most one ordinary project-bound model request if direct historical current evidence is absent
ROLE=read-only evidence collector and privacy-preserving packager, NOT production implementer
REPO=fvanevski/opencode-operational-schema-guard
ISSUE=101
PARENT=98
ACCEPTED_MAIN=df703861714717b795465423939f4563cb3d08e6
C61_BASE=f65e2ea6f480a5fed51f0cce5511aff37bcbf128
TARGET_BRANCH=issue/101-security-boundary
TARGET_SHA=<exact new Central staged SHA from kickoff; fetch/prove it>
CONTROLLING_DOC=docs/issue-101/C62_CLOSURE_EVIDENCE_REQUIREMENTS.md
C61_ARCHITECTURE=docs/issue-101/C6_LOCATION_SCOPED_RESOLUTION.md
PRIOR_ARCHIVE_SHA256=41c5a9edd9466bd83bb857251823b515ede08bad5c88b9e9ae9a9af1889b5fbc

MANDATE: Close evidence gaps P1 location-scoped plugin proof, P2 same-provider-request dual memory, P3 final tool registry and MCP host-execution classification. Reuse previous qualified #101 results and do not repeat broad controls. ONE campaign, ONE digest-verified private archive, ONE handback.

GATES / ACTION:
A. Authenticate exact GitHub target ref, accepted main, and controlling files from GitHub using read-only native gh/Git; fetch branch BEFORE local proof, create isolated clean detached worktree only if needed; no GitHub/PR mutation. Start a new Hermes session with locked opencode-ghdev-campaign v2. Read the controlling C62 document fully and C61 architecture as needed; avoid old skill recipe reload.
B. Read-only snapshot of currently running ghdev-issue100b-final-opencode-serve.service at 127.0.0.1:49374: actual invocation/PID, effective project config digest, OpenCode and pinned sandbox identity, Graphiti/OpenViking module identities, genuine project location; EX/curator state as observed, noting the known prior curator auto-restart. If service state has drifted, document exact drift; no repair/restart under this handoff.
C. P1: From authenticated project-location API/native client plus original OSB trace/journal/tool event, capture minimal direct evidence for HOME block and repo project-ready, real project sandboxed execution and Graphiti/OpenViking once each, correlate by same current service epoch. Treat HOME fail-closed as correct. Do not change HOME/XDG or fabricate DB sessions.
D. P2: Inspect private pre-existing qualified provider-side observer records. Find at most one actual provider-bound request **after sandbox promotion** with both marker blocks, session and service/config provenance, not the model's final answer. Generate redacted original event/excerpt with per-marker positions and safely identified request body, retaining confidential originals host-private. If no current suitable record, issue at most one normal, source-relevant native model request (from its correct project cwd, using existing model and EX lease), then use an already available supported provider request trace. The accepted C4/C5 145/237 historical observation is historical, not new C6.1 proof. If instrumentation would require production restart/config/plugin changes or expose secrets, report P2 UNVERIFIED with precise blocker; do not invent a workaround or widen scope.
E. P3: Enumerate final **model-exposed** actual tool IDs and initialized MCP registrations from appropriate project cwd and settled MCP status. Classify each executable/read-capable surface by transport, endpoint location, actual host execution authority, sandbox/policy/disabled containment and direct evidence. Confirm probe absent after disabled config; no probe canary re-execution. Inspect subagent boundary only with already accepted evidence. Do not conclude remote HTTP means off-host.
F. Build one sanitized archive of identity, P1/P2/P3 first-order receipts, nonmutation and manifest per C62 document; digest-check, traverse/type scan and credentials/short-password-hash exclusion. No private raw prompts/canaries/service secrets. Return all 3 statuses, evidence limitations, service and original config nonmutation, SHA256/bytes. Do not submit evidence to GitHub.

AUTHORITY: Read-only config/source/log/process/tool catalog and supported authenticated API observation; one normal harmless model request if P2 evidence missing; short private extraction/sanitization script and archive. Resolve reasonable command-shape errors and incomplete first-read evidence in the same handoff. No arbitrary time, tool-call or attempt quotas for read-only evidence; avoid loops once an interface is demonstrated unavailable.

PROHIBITED: GitHub writes, repo/source edits, new PR, service restart, sandbox/plugin reconfiguration, HOME/XDG changes, app SQLite DML, credential access/disclosure, network exposure changes, arbitrary local/remote code execution from model tools, memory/Graphiti/curator/EX write/drain, full model benchmark, new observer/reverse proxy, duplicate daemon, skill/curator edits. GHDEV skill locked; proposed changes in handback only.

STOP: confirmed model-reachable uncontained secret/file executor, production change needed to observe provider trace, service unexpectedly degraded, or unexpected scope-changing source/config drift. Return bounded blocker and retained host state instead of another C6 experiment. A historically true fact is not necessarily current-epoch evidence.

RETURN:
RESULT=EVIDENCE_READY|PARTIAL_UNVERIFIED|BLOCKED
MAIN_SHA=<exact current full SHA>
TARGET_SHA=<exact full SHA>
TARGET_TREE=<full tree>
SOURCE_VERIFICATION=<refs/provenance>
SERVICE_EPOCH=<invocation/PID/start>
CONFIG_IDENTITY=<digest/unchanged>
P1_LOCATION_PROOF=PASS|UNVERIFIED|FAIL (original observation source, both locations/epoch)
P2_PROVIDER_BOUND_DUAL_MEMORY=PASS|UNVERIFIED|FAIL (request/session/workspace/timestamp/proof, actual model-input vs model-echo)
P3_TOOL_INVENTORY=PASS|UNVERIFIED|BLOCKED (tools, transports, on-host authority, probe absent, unknowns)
P3_UNCONTAINED_ACTIVE_EXECUTORS=<zero or specific entries>
NEW_MODEL_REQUEST_COUNT=0|1
NONMUTATION=PASS|FAIL
PRIOR_C61_EVIDENCE_REUSED=<specific exact items; no false recertification>
EVIDENCE_ARCHIVE=<private absolute path, full sha256, bytes, files, verified yes/no>
EVIDENCE_PRIVACY=PASS|FAIL
COMMAND_SHAPE_FRICTION=<only material typed observations, sanitized>
PROPOSED_SKILL_EDITS=<none or recommendations only, no writes>
CENTRAL_GATE_RECOMMENDATION=READY|NEEDS_DECISION|BLOCKED (with exact reason)

STOP after returning packet. No #101 or #98 close, merge, branch edit or PR.
<<< LOCAL_AGENT_CONTRACT_END >>>
