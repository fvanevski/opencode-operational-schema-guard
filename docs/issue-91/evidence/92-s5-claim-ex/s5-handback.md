# Issue #92 — Consolidated S5 completion campaign — HANDBACK

PRIMARY_AGENT=Hermes / Build
REPO_ID=fvanevski/opencode-operational-schema-guard
BRANCH=work/91-memory-utility-r1
RESULT=FUNCTIONAL_REMEDIATION_REQUIRED

## 1. Exact SHAs
- Source execution SHA (S5 treatment ran at): `640f4a9a40b33d3efd230ff2c228bb4c5470f14e`
  (all S5 source blobs verified at this HEAD before the admitted run:
   finite-batch.mjs 02709b96, claim-evidence.mjs 10454460, fact-review.mjs 20da07bc,
   curator-cli.mjs 9e77394b, ex-admission-proof.mjs e63b8a36, ex_admitted_node_bridge.py 004188b1)
- Evidence-publication SHA: 72278c72afdc0c051b5775d95e3362eb182d4611 (evidence-only, 12 files under docs/issue-91/evidence/92-s5-claim-ex/)
- Remote authenticated: origin/work/91-memory-utility-r1 == 640f4a9a40b33d3efd230ff2c228bb4c5470f14e (fetched at kickoff)

## 2. Native regression (real exits)
- node --check x8 (finite-batch, claim-evidence, fact-review, curator-cli, ex-admission-proof, core, worker, finite-batch-tuning): all rc=0
- python3 -m py_compile (ex_admitted_node_bridge.py, test_ex_admitted_node_bridge.py): rc=0
- python3 test_ex_admitted_node_bridge.py: PASS
- node --test x8 suites (ex-admission-proof, claim-evidence, finite-batch, finite-batch-tuning, fact-review, curator, issue92-source-fact, adr-causal-audit): 137/137 pass, 0 fail
- npm run check: rc=0
- npm test: 524/524 PASS
- Working tree clean vs HEAD 640f4a9a (only untracked __pycache__ + pre-existing artifacts)

## 3. Kernel admission positive + negative proof (real canonical lock /run/user/1000/openviking-agent.lock)
- POSITIVE: run_admitted_node passes the locked descriptor to a direct Node child (pass_fds); requireKernelExAdmission() accepts it (inherited fdinfo FLOCK, holder PID == parent) -> "ADMITTED", rc=0
- NEG marker-only: GHDEV_MEMORY_POST_EXIT_LEASE=admitted, no LOCK_FD env -> DENIED:EX_KERNEL_ADMISSION_REQUIRED:missing_lock_fd, rc=1 (fails before any model/state/Graphiti activity)
- NEG non-inherited fd: LOCK_FD=3 not passed to child -> DENIED:EX_KERNEL_ADMISSION_REQUIRED:wrong_inode, rc=1
- Marker-only DRIVER preflight: node s5-driver.mjs with lease set but no flock -> throws at verified() (finite-batch.mjs:493) EX_KERNEL_ADMISSION_REQUIRED before any batch dir created

## 4. Hermes-supervised EX admission chronology
- Hermes is the supervisor; NOT added to the gate's blocking harness process list (process_names=[codex,opencode,agy,opencode-desktop])
- Attempt 1 (proc_c788d5830df9): EX_FLOCK_ACQUIRED -> scheduler-busy (transient Graphiti extraction) -> FAIL_CLOSED (no mutation)
- Attempt 2 (proc_f2cb4b0a910c): EX_FLOCK_ACQUIRED -> scheduler-busy -> FAIL_CLOSED
- Launcher hardening: bounded 180s admission-wait (transient busy waited out), final post-30s-grace observation fail-closed
- Attempt 3 (proc_9d471e4687a0): 05:19:10 EX_FLOCK_ACQUIRED -> ADMISSION_WAIT (transient) -> 05:19:15 QUIET_GRACE 30s -> 05:19:45 EX_ADMISSION_PROVEN -> JOB_START -> driver ran 79 model calls (discovery 35, support 34, utility 10) -> 9 approved, 9 queued -> rc=3 (unresolved) -> launcher post-run NoneType crash (recovered; driver had written result)
- Terminal reconcile (proc_f2d5f99f80f5): 05:30 EX_FLOCK_ACQUIRED -> QUIET_GRACE -> reconcile-only settled 9 queued -> persisted, 0 unresolved, status=settled

## 5. Full 16+11 source-grounded S5 scorecard
- 9 persisted facts (9 distinct valid UUIDs), 20 deferred, 79 model calls, 0 model errors
- VALUABLE (16): S5 covered 6 = sp1, sp2, dj1(add_filter_lazy_string_typeerror + lazy_proxy_string_concat), dj2, py1
- LOST vs S2/S3 9/16 baseline (delta -3): sp8 (sphinx_14182_rst_header_rows), py2 (pylint_6386_verbose_flag_negative), py3 (pylint_verbose_v_arg_expected); all 6 graphiti (g1-g4) remain lost
- LOSS STAGES: py3 = claim_support_missing_predicate (surfaced, deferred); py2 = discovery/surface loss (0 candidates); sp8 = discovery/surface loss (dict-param dominated sphinx candidates)
- NONVALUABLE (11): 10 correctly not persisted (duplicate-reduction preserved); 1 false positive (astropy QTable units fact from a swebench-sphinx source, not a valuable target)
- DISTINCT DURABLE FACTS: 8 of the 9 persisted facts map to 6 valuable targets; 1 is a nonvaluable false positive. Episode count (9) NOT substituted for useful knowledge.
- RESULT: S5 = 6/16 valuable, SUBSTANTIVELY BELOW the S2/S3 9/16 baseline -> per contract, no arbitrary prompt sweeps; return this loss-stage analysis (FUNCTIONAL_REMEDIATION_REQUIRED)

## 6. Terminal ReviewStore / Graphiti UUID / source-index proof (4-surface)
- ReviewStore: 29 records (20 deferred, 9 persisted); 9 distinct valid UUIDs; each source-bound (source_event_ids present)
- Graphiti MCP get_episodes: 9 episodes in graphiti-adr92-s5-claim-ex-proof
- UUID exact match: True (store set == remote set; 0 missing either way)
- Source-index intact: true
- (raw FalkorDB readback agreed with the MCP readback in the A1/A3 packet; S5 store+MCP two routes agree)

## 7. Graph extraction + retrieval-quality findings
- search_memory_facts: USEFUL (returns real grounded facts, e.g. "django__django-13794 is part of swebench-django project" with source/target node UUIDs)
- search_nodes: USEFUL (returns project entities with content summaries, e.g. swebench-sphinx dict-param bug)
- get_episode_entities (per-episode provenance): SPARSE/zero-hit (empty nodes+edges for the specific persisted episodes queried)
- VERDICT: retrieval is useful at the fact/project level; per-episode entity graphs are thin. The 9 episodes overstate useful knowledge (membership-level extraction, not rich per-episode entity-relationship extraction).

## 8. A1 raw-native capture opportunity measurements
- 14/14 cron capture control: re-affirmed from frozen verified scorecard (tp=14, fn=0, recall=1.0, Wilson95 precision 0.4295-0.8027; baseline 0/14, unverified=false). Issue81 holdout state present on host.
- webvtt: tp=10, fp=9, tn=1, fn=0 (precision 0.5263, Wilson95 0.3171-0.7267)
- Post-exit review coverage: 40/40 candidates deferred (operator adjudication pending), 0 unresolved; each arm under genuine EX admission
- Root cause of the 40 historical model errors: litellm proxy (8002) restart -> /v1/models HTTP 500 -> fail-closed DEFER (host fault, not source defect)

## 9. Proposed prospective A3 freeze (no inference executed)
- New nonoverlapping family: gh_mcp-development-v2 (no session_id/message_id overlap with S5 corpus ebac7052 or the A1/A3 gh_mcp 20-case holdout)
- New unused group: graphiti-adr92-a3-prospective-v2 (verified 0 episodes)
- 20 cases (10 valuable, 10 nonvaluable controls), raw opportunity denominator frozen at freeze time
- Scoring rules: >=85% prospective independent valuable coverage, >=90% grounded precision, >=75% useful among grounded over >=8 independent persisted facts, zero unauthorized source/privacy/group/false-verification events, Wilson 95% reporting
- Inference gate: NO prospective model inference executed; runs only after Central reviews the S5 exposed outcome (6/16) and approves the prospective freeze

## 10. Historical-state nonmutation + non-replay proof
- S1-S4 groups untouched (no reset/deletion/historical score change); S5 used a fresh group + fresh 0700 state (/tmp/opencode/issue92-s5/state/s5) + the original 24-cluster corpus (ebac7052) + original 16/11 denominators
- The S5 driver is no-replay: the marker-only preflight and the rc=3 reconcile resumed from frozen state (no model re-call on reconcile-only); the once-only .s5-ran marker was not re-armed
- The two pre-admission scheduler-busy fail-closes and the post-run NoneType crash caused no state mutation and no blind resubmission

## 11. GHDEV-10 command-shape friction (full, incl. safety)
- Inherited S4 events: graphiti_group_probe (interface_discovery), mcp_stale_session_404 (runtime_misbinding), driver_preflight_partial_inference (successful_recovery)
- S5 events:
  1. graphiti_endpoint_managed_route (interface_discovery): 8766 standalone MCP down; mcp-mux managed route 127.0.0.1:8012/graphiti is stable -> recovered
  2. scheduler_auto_metric_transient_busy (runtime_misbinding): gate 'auto' counts materializing/paused -> transient Graphiti extraction made scheduler look busy -> bounded admission-wait added -> recovered
  3. bridge_stdout_not_captured (runtime_misbinding): run_admitted_node inherits stdout (proc.stdout None) -> launcher NoneType crash after driver success -> guarded + relied on written result -> recovered
- SAFETY INCIDENTS: none. No forced EMIT, no destructive cleanup, no S1-S4 mutation, no model call before a proven EX admission in the final admitted run.

## 12. Boundary
- This is the only continuation boundary: Central reviews the S5 exposed outcome (6/16, below 9/16 baseline) and approves/rejects the prospective A3 freeze. The eventual Issue #92 implementation is one cohesive PR following Central acceptance + independent review (no separate experimental PR opened here).
- No production deployment, no merge, no Issue #92 closure, no silent acceptance-standard change, no historical campaign mutation.
