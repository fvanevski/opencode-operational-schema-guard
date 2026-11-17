# GHDEV #101 C6.1 — location-scoped shared-service reconciliation

Status: CENTRAL ARCHITECTURE, pending real-host qualification. Supplements SECURITY_BOUNDARY_ARCHITECTURE.md. Supersedes any implication that a no-location HOME plugin failure means repository plugin failure.

## Verified source and root cause

In OpenCode V2, serve --service intentionally changes cwd to the operator HOME. A request without an explicit location constructs a HOME-scoped plugin instance; a request with an explicit project location can construct an independent plugin instance in the same shared service. OpenCode official plugin documentation states that ctx.location describes the location of that particular plugin instance, not every session. Upstream anomalyco/opencode issue #60004 reproduces this and records an OpenCode maintainer confirming the HOME location is intentional.

Pinned third-party @hamzaabili/opencode-sandbox v0.3.0, upstream commit 61da67544e6645f029ae46751acc40784a3de528, correctly rejects HOME as a writable workspace in src/paths.ts and installs enforce-mode refusal hooks in src/app.ts. A locationless /api/plugin query can thus report HOME blocked even when the real repository location could run successfully. Whether it does run successfully on this host is UNVERIFIED pending a live, authenticated, same-service comparison.

References:
- https://opencode.ai/docs/build/plugins/server/
- https://github.com/anomalyco/opencode/issues/60004
- https://github.com/Hamza-Abili/opencode-sandbox/tree/61da67544e6645f029ae46751acc40784a3de528

## Chosen minimal resolution

No OpenCode runtime source modification, upstream sandbox patch, HOME/XDG relocation, database insertion, alternate long-running server, memory plugin refactor, or new Graphiti model daemon.

Preserve original working service identity and real host HOME/XDG, base/generated profile mechanism, existing accepted merged memory source, existing loaded Graphiti/OpenViking, local provider, EX gate, native state and current service password. Keep the pinned sandbox enforce + toolGuard policy, with no host home/config mount and no weak fallback.

Verify TWO different location requests within the SAME running production serve epoch:
1. HOME/no-location: expected home plugin instance may be fail-closed; this is CORRECT so long as no model tools can access host-home secrets.
2. Real project: explicit authenticated location /workspace/opencode-operational-schema-guard. Required opencode-sandbox READY (wrapper and V2 file guard), Graphiti and OpenViking each active once, plus native fresh repository client/session proof.

Do not equate a 200 HTTP status or plugin ID alone with actual V2 hook enforcement. Obtain host-attested tool denials on high-entropy synthetic canaries and safe project tool success. Home and project must be observed with the same server epoch; if a project request alone does not activate the project location, drive the supported normal native client in that directory, not synthetic SQLite rows.

After verifying the existing package's pinned source and prior successful bubblewrap smoke, use one reversible production plugin-registration promotion via the already working service launcher, with one rollback on material failure. A HOME blocked instance is NOT a reason to restart again. Ensure automatic curator EX idleness is observed and not bypassed; do not launch a drain or replay.

The project tool inventory must separate tools exposed to OpenCode's model from Hermes terminal/execute_code tools. For any real OpenCode model-exposed alternate executable path, prove it is denied/contained, not merely untested. An arbitrary malicious host plugin remains outside the claimed boundary. Do not run a broad penetration-test campaign after the explicit controls pass.

## Evidence and acceptance

Use the centrally staged security-boundary-evaluator.mjs schema ghdev101-tool-boundary-v2, which now requires location_scope with independent HOME blocked and project READY evidence, same service epoch, real fresh project client/session, preservation of original HOME/XDG, and no direct application database writes. This evaluator validates structured claims, not underlying truth: retain private supporting reads and logs, sanitized with no real credentials/password hashes.

Reuse accepted #101 cohort, hook timing (n=270), terminal UUID membership (nine new UUIDs), and prior merged CI. Only run new native checks invalidated by sandbox configuration: shell/file secrets denied, safe repo reads/writes, Graphiti+OpenViking same-request model input, service/client/plugin status, historical data and EX non-regression.

Promote successful config and leave active; otherwise restore pre-promotion config and original working service. Do not edit application-owned SQLite. Return one archive + typed handback. New code is permitted ONLY after Central sees concrete project-scoped failure proving this source-level strategy insufficient.

## Scope and governance

User restored the service and removed the three fabricated C6 project/session/directory records. These corrections are accepted as host-attested and are not to be repeated. The compact opencode-ghdev-campaign skill is operator-locked; Hermes must report suggestions without using skill_manage, write_file or terminal to modify its skill. Automatic review nudge interval is zero, global skill writes require approval, and curator consolidation remains enabled by user choice.

No PR now. Retain issue #101 and parent #98 open until Central reviews C6 host evidence and the independent final gate.
