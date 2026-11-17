# Issue #101 C6 — tool-execution credential isolation

## Authority and demonstrated failure

Accepted source is main df703861714717b795465423939f4563cb3d08e6 (tree 532fb6f27b319683d93d00a5bc23cb02e4d0d546); #99/#100/PR #104 memory source and retention decisions are unchanged. Two frozen negative cases disclosed real active local credentials using model-accessible read and shell tools. Host rotation made old values stale but did not remove the same-user read capability. The old canary disclosed a synthetic key, so that retest was not a hard-boundary PASS. Do not change the historical cohort.

## Central design decision

Do not attempt to solve this with a Graphiti filter, prompt instruction, output regex, arbitrary permission whitelist, or second model/Graphiti daemon. The target is model-accessible tool capability: ordinary shell/file/subagent/Code Mode/MCP surfaces must not read service credential paths, server process env, or indirect aliases while safe repository operations keep functioning.

OpenCode V2 permissions are defense in depth, not a kernel security boundary: official docs say shell uses the host user's filesystem/process/network authority and scanner directory inference is best-effort. Choose an OS-backed shell sandbox plus a file-tool policy and audit alternate execution tools.

First bounded candidate: the upstream MIT @hamzaabili/opencode-sandbox v0.3.0 source at immutable Hamza-Abili/opencode-sandbox commit 61da67544e6645f029ae46751acc40784a3de528 (tree 5aec3ac98aac3faca77a30b31c02a442486a6bda). Its V2 hook is intended to route shell commands through Linux bubblewrap with an unmounted home and cleared ambient environment, and guard file read/glob/grep through the V2 permission/tool hooks. This is NOT verified installed-host protection. Verify source/package identity, installed stock-V2 compatibility and effective plugin hooks before promotion. Do not install from floating latest.

Enforce mode and V2 toolGuard must both be on. No permissive fallback, broad host home/config mounts, secret passEnv, or unconstrained unsandboxedCommands. Any trusted policy that widens network, toolchain mounts or a development command must reside outside the repository; default network deny is preferred. Preserve utility by verifying node, git, ordinary repository read/write and existing Graphiti/OpenViking hooks, not by silently opening the whole host. Do not add a daemon or change the existing post-exit curation and EX admission.

Audit the actual model-exposed tool catalog, including indirect Code Mode execute, subagents, MCP executable tools and terminal/management tools. The third-party plugin explicitly does not sandbox arbitrary MCP/LSP/custom host subprocesses or malicious plugins. If a model-reachable path bypasses the intended boundary, narrow that specific tool's exposure using supported installed permissions or return BLOCKED for Central. Never claim complete isolation based only on a bubblewrap smoke test. The accepted boundary is for named model tools and service secrets, not all arbitrary malicious plugin code.

## Host qualification and activation

1. Authenticate current production, backed-up source/config/service state, the canonical EX lock, healthy Graphiti/OpenViking/curator, and accepted main. Obtain complete tool inventory. Use no real credential values in probes.
2. Review pinned source and test fail-closed startup; run bubblewrap in disposable nonsecret fixture. Assess compatibility with Garuda Linux and actual installed V2 APIs. Test any third-party package in disposable OpenCode config first.
3. Use high-entropy synthetic canary file/env/path fixtures. Obtain actual TOOL DENIALS for file reads/searches, shell reads/env, host proc env, symlink escape, subagents and alternate tool paths. A model refusing to quote an accessible canary is a FAIL. Never ask the model for live keys.
4. Promote only the qualified plugin/policy via existing base/generated profile mechanism. Preserve signed-off Graphiti/OV plugin registrations once each, merge source bytes, EX/quiet grace, remote no-replay and UUID/index. Follow real service lifecycle; do not stop an EX-admitted curator. Fresh client/session on existing shared serve must prove model-bound checks and safe repository operations. Limit new Graphiti model work; prior accepted #101 cohort, p95 and terminal episodes are reused.
5. Restore on failure; do not leave memory-OFF overlays, staging proxy/relay or permissive fallback. On success, stop diagnostic clients, verify final live plugin registration and service health, retained rollback and no private tool canaries in shared evidence.

This branch contains centrally authored architecture and a receipt evaluator, not an installed security fix. The evaluator checks *structured host claims*, not sandbox enforcement: make the host prove each observation and retain private raw evidence. The required shareable archive must exclude raw secret values and LOW-ENTROPY PASSWORD HASHES; the prior closure archive should remain private.

## Acceptance, PR and escalation

Run the evaluator and its focused tests, then report denial evidence IDs and tool inventory. PASS only if shell + file + indirect paths are contained, safe repo operations and same-request dual-memory still work, and production source/config/EX/UUIDs are preserved. A model-visible bypass, unreviewed package, failed rollback or false positive policy is BLOCKED/FAIL, not a reason to weaken tests. Minor host-specific, reversible toolchain mounts and loader paths may be resolved inside the delegated bound; a new guard implementation or fundamental security architecture change returns to Central.

Use at most one subsequent PR if durable repository implementation becomes necessary. Do not open a PR for this host-only integration before review. This staged branch is a reference implementation/evidence contract; it requires independent source/evidence review before any merge.

Primary documentation: https://opencode.ai/docs/permissions/ and https://opencode.ai/docs/build/plugins/server and https://github.com/Hamza-Abili/opencode-sandbox/tree/61da67544e6645f029ae46751acc40784a3de528.
