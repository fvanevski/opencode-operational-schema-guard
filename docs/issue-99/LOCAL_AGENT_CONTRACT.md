# Issue #99 A1/A2: local Build evidence contract

Target repository fvanevski/opencode-operational-schema-guard; branch issue/99; verify the exact kickoff commit before execution. Primary local agent BUILD, CPU-only, one bounded campaign. The source/tests/architecture are Central-authored; do not invent a new design or move live state.

1. Authenticate a clean exact-commit checkout, using safe Build fetch/worktree preparation. Never reset, clean, rebase or force-update an unrelated or dirty checkout. Review issue #98/#99, nearest AGENTS, LIFECYCLE_ARCHITECTURE.md, queue.mjs, worker.mjs and ReviewStore source. Historical README acceptance is not present-day host identity.

2. Validate Central code: node --check docs/issue-99/audit-lifecycle.mjs; node --check docs/issue-99/compare-ledgers.mjs; node --test docs/issue-99/lifecycle.test.mjs. Record genuine exits and failures; do not adjust assertions, suppress gates or report PASS on test failure.

3. Execute two disposable synthetic workloads from the repo root (Node built-in SQLite is conditional):
   node docs/issue-99/compare-ledgers.mjs --records 4000 --burst 1000 --archive-percent 75
   node docs/issue-99/compare-ledgers.mjs --records 8000 --burst 2000 --archive-percent 75
The comparator owns a fresh unique temporary tree and deletes only its own data. Record host Node version, CPU, storage class, sample sizes, elapsed, percentiles, bytes, admission/drop and duplicate results. These are screening prototypes, not multi-process durable equivalence.

4. Host inspection READ ONLY: authenticate *current installed* native capture, queue root/group, loaded module/config, production curator CLI flags, EX wrapper, effective worker and identity/provenance. Use the actual group, not historical ghdev_gh_mcp by assumption. Run:
   node docs/issue-99/audit-lifecycle.mjs --state-dir <VERIFIED_ABSOLUTE_ROOT> --group <VERIFIED_GROUP>
Keep raw local state private; the script emits only metadata. Inspect status-to-review ownership, per-fact siblings, unowned approved/deferred sources, mismatch/corruption, actionable pending counts, indexed terminal UUIDs and remote ambiguity. A read-only Graphiti group/index count may corroborate terminal scope if actual installed interface is authenticated; do not call add_memory or model inference. Do not stage a new live source event merely to reproduce failure.

5. Recommend F (file archive), S (single SQLite), or UNRESOLVED from evidence, with cost/LOC/rollback/crash trade-offs and sources requiring quarantine or Central decision. Produce keep/simplify/replace/retire plus follow-on concrete A3 implementation invariants. The A3 architecture choice and semantic production edits belong to Central. Do not launch a new side-issue, source PR, daemon, portal cleanup, Graphiti replay, model tuning or curation reform.

Publication: EVIDENCE_PACKET_REQUIRED=yes; EVIDENCE_ROOT=docs/issue-99/evidence/<UNIQUE_RUN_ID>; EVIDENCE_REMOTE_UPDATE=allowed; SOURCE_REMOTE_UPDATE=forbidden; PR_CREATION=forbidden; LIVE_STATE_MUTATION=forbidden. Prepare one self-contained sanitized manifest with file SHA256/size, audit JSON, two comparator JSONs, selected design/tradeoffs, tests/exit receipts, omission log, source SHA, short installed contract (no secrets/paths) and complete COMMAND_SHAPE_FRICTION. Inspect every byte. Stage only new evidence-root files; after exact remote branch preflight, commit once and push non-force once with exact parent then read back remote SHA/paths. If unsafe, stale, denied or ambiguous, no blind retry: return EVIDENCE_PUBLICATION=BLOCKED with sanitized portable fallback. No raw requests, prompts, private traces, credentials, source excerpts, home paths or full config dumps to public GitHub.

Handback in conversation: RESULT=PASS|BLOCKED|FAIL; SOURCE_SHA full; EVIDENCE_COMMIT_SHA full or none; EVIDENCE_PUBLICATION=PASS|BLOCKED; evidence GitHub path/hash; complete source diff (expect none); test exits; two benchmarks with limitations; host queue/review/owner/episode counts; historical cumulative drops distinguished from new drops; ARCHITECTURE_RECOMMENDATION=F|S|UNRESOLVED; material risks and exact remote head.

Return canonical COMMAND_SHAPE_FRICTION:
  encountered=yes|no
  events=[] or entries each including scenario, requested_shape, effective_shape, rewrite_provenance, event_kind, execution_effect, correction_or_annotation, replacement_shape, recipe_reference, resource_reference, contract_conflict, durable_gap_candidate
  omitted_sensitive_values=yes|no
No change to tests/CI/source/EX/credentials. Stop on material corruption, identity conflict, unsafe public disclosure or missing host access; return bounded partial evidence rather than inventing recovery.
