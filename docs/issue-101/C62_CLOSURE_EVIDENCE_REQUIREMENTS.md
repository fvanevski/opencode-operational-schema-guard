# Issue #101 C6.2 — closure evidence standards (Central authority)

Status: targeted evidence supplement, **not** new sandbox implementation, deployment, CI, PR or requalification of #99/#100.
Accepted main: df703861714717b795465423939f4563cb3d08e6.
Accepted C6.1 source contract: issue/101-security-boundary@f65e2ea6f480a5fed51f0cce5511aff37bcbf128, tree 2ee0351c069d4ce337f2286f76aced188d80728d.
Accepted C6.1 host-attested service snapshot: shared ghdev-issue100b-final-opencode-serve.service, post-recheck invocation dc6a645c24c449238a186067942e9c3f, project sandbox installed; sandbox source Hamza-Abili/opencode-sandbox@61da67544e6645f029ae46751acc40784a3de528.
Original C6.1 sanitized archive SHA256 41c5a9edd9466bd83bb857251823b515ede08bad5c88b9e9ae9a9af1889b5fbc.

## Why this supplement exists

The original 6,013-byte C6.1 archive passed SHA256 and 19/19 member verification, but:
- the only captured OSB "ready" event was for /workspace/mcp_servers/gh_mcp. It contained a "sandboxed" event for /workspace/opencode-operational-schema-guard but no original project "ready" event or authenticated project-scoped plugin API response;
- evidence/dual-memory.json was a summary that **the model named** both Graphiti and OpenViking context markers, not a provider-bound request observation. A previously accepted C4/C5 private relay captured 145/237 provider requests with both markers, but those requests belong to their historical epoch and cannot be silently relabeled current C6.1 evidence;
- evidence/alt-exec-surface.json claimed remote-transport MCPs were "off-host" without demonstrating their host execution authority. An actual probe local host-subprocess bypass read a synthetic canary and was then disabled in generated config; its removal must be shown in the final exposed tool catalog and source configuration.

The primary evidence standard is **an observed interface record** rather than a self-reported Boolean, marker echo, static inventory narrative, or hash alone. Retain private primary originals securely; prepare redacted proof of decisive fields for Central. Digest verification proves bytes were packaged intact, not that a claim was true. Do not re-score the original C6.1 receipt or overwrite its frozen evidence.

## Exactly three evidence targets

### P1 — HOME vs project plugin instances and real tool enforcement

Observe the *same active shared service* with stable invocation ID or exact process start/epoch and the same effective plugin/config SHA. Use authenticated, supported V2 project-location request API and/or native client service-discovery. A bare HTTP 200, unauthenticated API response or CLI string containing a location is not sufficient.

Collect minimal original (sanitized) evidence for:
- no-location /home/filip sandbox instance refusing shell (and guarded files), plus emitted "blocked" reason or equivalent live response;
- explicit /workspace/opencode-operational-schema-guard project instance with upstream sandbox "ready", mode=enforce, toolGuard=enforce, network=deny, webfetch=deny, and Graphiti + OpenViking each loaded once **for this project scope**;
- one actual project-scoped sandboxed shell tool event, correlated to the project instance and current service epoch. Preserve already accepted synthetic denial and safe read/write results; no new canary campaign.

Prefer actual authenticated response excerpt, trace line, process journal excerpt, or tool-execution record; if the relevant "ready" trace was rotated, use another direct, corroborating observation rather than reconstructing a missing event. The state transition from previously accepted epoch dc6a... to a naturally changed current epoch is acceptable with explicit new identity, but stale observations may not be represented as same-epoch evidence. No service restart or config edits solely for this proof.

### P2 — Real one-request Graphiti + OpenViking provider binding

Evidence must come from the **provider request before the model generated its answer**, such as the previously qualified private observer, a provider request logger or equivalent already available supported request trace. Required correlations: one provider request identity (opaque/redacted ID and/or private full-body digest), one native session identity, timestamp, relevant workspace, same service epoch when applicable, and both context marker ranges or a deterministic parser verification over that **one** request body. The source must distinguish Graphiti source-qualified content from OpenViking session/experience content. Model text describing or echoing the marker strings is NOT valid evidence.

First try existing privately retained provider-bound evidence from the current post-sandbox setup. The old accepted C4/C5 145/237 count remains supporting historical evidence only. If there is no suitable current request, at most **one normal native, non-secret, source-relevant request** through the existing shared serve is allowed to obtain a new observation. Use the real project when it has eligible source-qualified facts; if not, a proven eligible neighboring repository on the same shared service/config epoch can demonstrate dual memory, provided location distinction and relevance are disclosed and P1 is independently proven for the required project. No fabricated facts, replay, forced ingestion or provider/model daemon changes.

If no first-order provider trace can be obtained without changing production plugin/config/service or exposing private prompts, return P2=UNVERIFIED with the exact missing instrumentation and stop this evidence target. Do not claim PASS from old historical cohorts or a model answer. A privacy-preserving digest **alone** is not proof of marker occurrence; provide a defensible redacted original event/excerpt with marker positions or a bounded verification routine and original trace retained privately.

### P3 — Post-narrowing model-accessible executable tool inventory

From the final **effective project-scoped runtime**, collect the actual model tool registry and connected MCP tool catalog, not just configured names. After MCP initialization settles according to observed actual status (not an arbitrary fixed sleep), reconcile every model-reachable tool able to execute host shell, arbitrary code, filesystem reads, file searches, network fetch or local subprocess commands.

For each relevant tool record: tool ID, provider/plugin, whether actually model exposed, transport (in-process/local subprocess/stdio/HTTP/WebSocket), endpoint classification (loopback, LAN, public, etc.), **execution authority on the protected host** (same user/host, separate host, third-party remote, or unknown), effective protection (bwrap, V2 file guard, tool disabled/not exposed, constrained API, or uncontained), and evidence source. A network transport is NOT itself proof of off-host execution.

Specifically verify local MCP probe is absent from *active model exposure* after its removal, and distinguish gitnexus/serena failed startup from genuinely callable executors. Subagent inherits project location only if original tool/runtime evidence supports that inheritance. A read-only source/config/process inspection is appropriate; do not rediscover the previous canary via a risky unguarded tool.

Outcome is PASS only when all *known active host-capable execution surfaces* have containment or are not exposed. The scope excludes hypothetical malicious installed server plugins as already disclosed in the C6 architecture; acknowledge any unknown tool classes. A confirmed model-reachable, host-capable uncontained executor is BLOCKED, not something to mask with broader permissions.

## Efficient execution and permitted repair

This is one bounded **CPU-only evidence** campaign. No PR, GitHub edits, repo edits, plugin installation/upgrade, new daemon, new observer requiring service restart, generated config modification, HOME/XDG change, application SQLite DML, credential rotation, Graphiti/EX/curator write, queue drain, synthetic full cohort, new canary campaign, skill modification or general service troubleshooting.

One existing supported benign project-native request is allowed if P2 lacks current data. Read-only non-secret process/status, source, config and supported API inspection are allowed. A short private local analysis script to extract/redact existing observational data is allowed, under private scratch. Resolve ordinary read-only CLI syntax, API shape, logging, source lookup, tool enumeration and packaging issues autonomously. Do not turn a missing observer or unsupported API into another production integration attempt. No new OpenCode service or project record may be synthesized.

Preserve privacy: do not copy or attach raw provider requests, auth headers, credentials, actual service passwords, password hashes (including hashes of short secrets), secret-bearing prompts, actual canary values, or full env dumps. Keep the original observations private in 0700 workspace, artifacts 0600. The shareable packet should contain sanitized short original evidence records, with origin/epoch/request/session linkage and public-safe stable digest of a **high-entropy opaque record ID** only when safe. Avoid low-entropy hashes entirely.

## One small source-backed handback packet

Recommended allowlist (omit unsupported entries with explicit reason, do not fabricate):
- identity.json: exact main/C6.1 branch/service epoch/installed plugin identity/config digest and scope;
- p1-location.json: sanitized original HOME/project status or trace excerpts + provenance and critical flags, with direct source reference;
- p2-provider.json: sanitized first-order pre-response provider request evidence, correlation ID, marker occurrence positions, native session/workspace and source-qualification note; distinguish historical reuse;
- p3-tool-inventory.json: final model-exposed tools and MCP authority classification, configuration-vs-active distinction and evidence;
- nonmutation.json: before/after effective service/config/Git/tool state, prohibited operations absent, previous probe restriction still effective;
- evidence-manifest.json: file bytes/sha256/observation authority, exclusions/limitations and full member inventory.

Use one private allowlisted .tar.gz. Verify member digests, no symlinks/duplicates/traversal/absolute entries and exact manifest set; disclose archive SHA256, bytes and count. Host handback should include PASS/UNVERIFIED/BLOCKED per P1–P3 plus primary evidence method, not merely overall PASS.

## Central gate after handback

Central independently inspects the attached packet and current authoritative GitHub/main/source/review/CI state. If P1–P3 are evidenced, C6.1 can move from qualified host-attested success to independent #101 closure review. If P2 remains UNVERIFIED due to absent supported read-only observer, Central decides whether that instrument gap is a material closure blocker or can be met by already accepted source/config-equivalent earlier evidence. Hermes must not decide this by treating a model summary or status as a substitute.

Issue #101 and parent #98 remain OPEN pending Central closure decisions. No PR is required for this evidence-only supplement.
