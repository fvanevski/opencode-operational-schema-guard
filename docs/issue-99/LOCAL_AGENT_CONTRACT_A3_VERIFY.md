# Issue #99 A3 — Hermes supervisor: integrated candidate validation and host triage

## Authority and scope
Repository fvanevski/opencode-operational-schema-guard. Working branch issue/99.
Central A3 source head: edc7e117bceeb90f171fcdc60994386a4b2cede3. The caller kickoff supplies the exact branch commit containing this file. Verify the remote and isolated worktree identities before running.
Primary executor: Hermes host supervisor, with its own normal host authority. Hermes is NOT an OpenCode process and is not excluded by the shared OpenCode commit-gate lease. Any OpenCode child, model/Graphiti process or post-exit curator it starts MUST obey the existing EX admission, quiet-grace and remote no-replay rules.
This is ONE CPU-first A3 candidate qualification campaign, not the final production A4 deployment.

## Allowed and forbidden
- Permitted: exact-branch fetch, clean isolated worktree, disposable state roots/fixtures, CPU tests, private host logs and read-only inspection of real production group, one sanitized evidence-only GitHub commit, non-force push/readback.
- Prohibited: production state migration/archival, production source/config replacement, service restart or EX reconfiguration, model/Graphiti writes to production, PR creation/merge, weakening tests, changing review/episode identities, remote replay, force push, repo-wide cleanup.
- A small obvious mechanical correction (typo, import path, command typo) may be made on the same branch only after actual failed-test evidence, targeted regression and complete patch/readback. Anything changing logic, data design, semantics or authority is Central-owned; report BLOCKED with precise evidence instead of improvising.

## Execution contract
1. Verify issue #98/#99 and AGENTS precedence. Fetch origin/issue/99, require exact supplied kickoff SHA, materialize a disposable clean worktree without touching an unrelated/dirty checkout. Confirm the current source files:
   docs/issue-78/v2-candidate/queue.mjs
   docs/issue-78/v2-curator/worker.mjs
   docs/issue-78/v2-curator/core.mjs
   docs/issue-99/archive-owned.mjs
   docs/issue-99/archive-cli.mjs
   docs/issue-99/archive.test.mjs
   docs/issue-99/audit-lifecycle.mjs
2. Run exact CPU tests from repository root with real exits and private complete logs:
   node --check docs/issue-78/v2-candidate/queue.mjs
   node --check docs/issue-78/v2-curator/worker.mjs
   node --check docs/issue-99/archive-owned.mjs
   node --check docs/issue-99/archive-cli.mjs
   node --test docs/issue-99/archive.test.mjs docs/issue-99/lifecycle.test.mjs
   node --test docs/issue-78/v2-candidate/candidate.test.mjs docs/issue-78/v2-curator/curator.test.mjs
   npm run check
   npm test
   Explain any pre-existing vs new failure; no false PASS.
3. Execute disposable-only archive plan/apply/restart/backup-restore:
   - Use a new isolated absolute state root and safe test group. Create genuine valid CandidateQueue and ReviewStore records, not hand-edited production data. To exercise CLI, run node docs/issue-99/archive-cli.mjs plan --state-dir ABS_DISPOSABLE --group TEST_GROUP --max-files 501 and use its exact plan_sha256 with apply --expected-plan HASH. No production-root apply.
   - Exercise real 501+burst, 4000+burst where practical; duplicate after archival, fresh admission after freeing capacity, restart and cold readback, review-ownership before queue transition, sibling origin, deferred/persisted/index/unknown distinctions, wrong-scope/unowned exclusions, content mismatch, archive dual-hardlink recovery. Preserve source byte digests, event IDs, review provenance and UUID/index identities. Distinguish simulated crash windows from real kill-9 / fsync / power-loss proof.
   - Snapshot a disposable root, apply, restore the snapshot into another disposable root and verify exact source/review/index inventory. Record backup scope, counts, bytes and hashes. No raw source excerpt leaves the host.
   - Record durations, disk/CPU impact, active/archive counts, oldest new/reserved, cumulative and NEW drops, sample denominators, lock contention and any fairness/backpressure caveats.
4. Production READ ONLY: authenticate the actual development-knowledge group, installed source/module/config identity, queue/review/index counts, EX wrapper and current curator unit. Diagnose the pre-existing ghdev-curator-prod.service activating/auto-restart exit-code 2 from private systemctl --user and journalctl --user evidence. Identify the specific failure command, error/exit and bounded remediation/rollback proposal, with redacted outputs only. Do not assume it is fixed and do not restart any production service. If live state is drifting, report current before/after and stop production assessment.
5. Produce one digest-valid sanitized evidence packet docs/issue-99/evidence/<unique-a3-run> with manifest/file SHA256, exact source, tests/exits, disposable archive/collision/crash/backup/restore evidence, host root-cause classification and limitations. Keep home paths, credentials, private inputs, env values, full logs/units and original excerpts PRIVATE.
   Evidence-only GitHub publication is allowed once on the same branch after non-force exact-head preflight. Read back commit/full SHA/file paths. If blocked or unsafe, return sanitized private handback; do not force/retry ambiguously.
6. Handback: RESULT PASS|BLOCKED|FAIL; source SHA and evidence commit SHA; full changed-file diff relative to kickoff (expected only evidence unless mechanical correction), host versions and actual command exits; synthetic denominators; source/review/index, duplicate/restart/no-replay results; service root cause with confirmed vs inferred distinction; A4 readiness and remaining risks.

COMMAND_SHAPE_FRICTION mandatory: encountered=yes|no; events=[] or bounded entries with scenario, requested_shape, effective_shape, rewrite_provenance, event_kind, execution_effect, correction_or_annotation, replacement_shape, recipe_reference, resource_reference, contract_conflict, durable_gap_candidate, omitted_sensitive_values; omitted_sensitive_values=yes|no.

A3 PASS is not permission to live-migrate. Central will independently examine source and evidence, obtain trusted exact-head PR Verify, review and merge, then issue a separate bounded A4 production activation contract. The post-merge A4 contract will allow Hermes to orchestrate service/client/process transitions without manual operator intervention, while preserving EX/no-replay.
